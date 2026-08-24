import { createHash } from 'node:crypto';
import { inflateRawSync } from 'node:zlib';

export interface ParsedSpreadsheetRow {
  rowNumber: number;
  data: Record<string, string>;
}

/**
 * Standard RFC 4180 CSV parser supporting quoted values, embedded newlines, and escaped quotes.
 */
export function parseCsvContent(content: string): ParsedSpreadsheetRow[] {
  const cleanContent = content.replace(/^\uFEFF/, ''); // strip BOM
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuote = false;

  for (let i = 0; i < cleanContent.length; i++) {
    const char = cleanContent[i];
    const nextChar = cleanContent[i + 1];

    if (insideQuote) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"';
          i++; // skip escaped quote
        } else {
          insideQuote = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        insideQuote = true;
      } else if (char === ',') {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (char === '\r') {
        if (nextChar === '\n') i++;
        currentRow.push(currentField.trim());
        currentField = '';
        if (currentRow.some((field) => field.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
      } else if (char === '\n') {
        currentRow.push(currentField.trim());
        currentField = '';
        if (currentRow.some((field) => field.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
      } else {
        currentField += char;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((field) => field.length > 0)) {
      rows.push(currentRow);
    }
  }

  if (rows.length < 2) return [];

  const headers = rows[0].map((h) => normalizeHeader(h));
  const parsedRows: ParsedSpreadsheetRow[] = [];

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    const data: Record<string, string> = {};
    let hasAnyValue = false;
    for (let colIndex = 0; colIndex < headers.length; colIndex++) {
      const header = headers[colIndex];
      const value = row[colIndex] || '';
      if (value.length > 0) hasAnyValue = true;
      data[header] = value;
    }
    if (hasAnyValue) {
      parsedRows.push({
        rowNumber: rowIndex + 1, // 1-indexed (row 1 is header)
        data,
      });
    }
  }

  return parsedRows;
}

/**
 * Lightweight ZIP / XLSX extractor for reading shared strings and worksheet xml.
 */
function unzipBuffer(buffer: Buffer): Map<string, Buffer> {
  const files = new Map<string, Buffer>();
  let offset = 0;

  while (offset < buffer.length - 4) {
    const signature = buffer.readUInt32LE(offset);
    if (signature !== 0x04034b50) {
      break;
    }

    const compressionMethod = buffer.readUInt16LE(offset + 8);
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const fileNameLength = buffer.readUInt16LE(offset + 26);
    const extraFieldLength = buffer.readUInt16LE(offset + 28);

    const fileName = buffer.toString('utf8', offset + 30, offset + 30 + fileNameLength);
    const fileDataOffset = offset + 30 + fileNameLength + extraFieldLength;
    const compressedData = buffer.subarray(fileDataOffset, fileDataOffset + compressedSize);

    let fileContent: Buffer;
    if (compressionMethod === 0) {
      fileContent = compressedData;
    } else if (compressionMethod === 8) {
      try {
        fileContent = inflateRawSync(compressedData);
      } catch {
        fileContent = Buffer.alloc(0);
      }
    } else {
      fileContent = Buffer.alloc(0);
    }

    files.set(fileName, fileContent);
    offset = fileDataOffset + compressedSize;
  }

  return files;
}

/**
 * Parse an XLSX file buffer into spreadsheet rows.
 */
export function parseXlsxContent(buffer: Buffer): ParsedSpreadsheetRow[] {
  try {
    const files = unzipBuffer(buffer);
    const sharedStringsXml = files.get('xl/sharedStrings.xml')?.toString('utf8') || '';
    const sheet1Xml =
      files.get('xl/worksheets/sheet1.xml')?.toString('utf8') ||
      files.get('xl/worksheets/sheet.xml')?.toString('utf8') ||
      '';

    if (!sheet1Xml) {
      // Fallback: If not standard XLSX, try parsing as UTF-8 CSV
      return parseCsvContent(buffer.toString('utf8'));
    }

    // Extract shared strings
    const sharedStrings: string[] = [];
    const siRegex = /<si>(.*?)<\/si>/gs;
    let siMatch: RegExpExecArray | null;
    while ((siMatch = siRegex.exec(sharedStringsXml)) !== null) {
      const textMatches = siMatch[1].match(/<t(?:\s+[^>]*)?>(.*?)<\/t>/gs) || [];
      const text = textMatches
        .map((t) => t.replace(/<[^>]+>/g, ''))
        .join('')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");
      sharedStrings.push(text);
    }

    // Extract sheet rows
    const rowRegex = /<row\s+r="(\d+)"[^>]*>(.*?)<\/row>/gs;
    const rawRows: { rowNum: number; cells: Record<string, string> }[] = [];
    let rowMatch: RegExpExecArray | null;

    while ((rowMatch = rowRegex.exec(sheet1Xml)) !== null) {
      const rowNum = parseInt(rowMatch[1], 10);
      const rowContent = rowMatch[2];
      const cells: Record<string, string> = {};

      const cellRegex =
        /<c\s+r="([A-Z]+)\d+"(?:[^>]*?t="([a-z]+)")?[^>]*>(?:<v>(.*?)<\/v>|<is><t>(.*?)<\/t><\/is>)?<\/c>/gs;
      let cellMatch: RegExpExecArray | null;

      while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
        const colLetter = cellMatch[1];
        const cellType = cellMatch[2];
        const rawValue = cellMatch[3] !== undefined ? cellMatch[3] : cellMatch[4] || '';

        let value = rawValue;
        if (cellType === 's') {
          const stringIndex = parseInt(rawValue, 10);
          value = sharedStrings[stringIndex] || '';
        }
        cells[colLetter] = value.trim();
      }

      rawRows.push({ rowNum, cells });
    }

    if (rawRows.length < 2) return [];

    // Header row is row 1
    const headerRow = rawRows[0];
    const colToHeader: Record<string, string> = {};
    for (const [col, headerVal] of Object.entries(headerRow.cells)) {
      colToHeader[col] = normalizeHeader(headerVal);
    }

    const parsedRows: ParsedSpreadsheetRow[] = [];
    for (let i = 1; i < rawRows.length; i++) {
      const { rowNum, cells } = rawRows[i];
      const data: Record<string, string> = {};
      let hasAnyValue = false;
      for (const [col, headerName] of Object.entries(colToHeader)) {
        const val = cells[col] || '';
        if (val.length > 0) hasAnyValue = true;
        data[headerName] = val;
      }
      if (hasAnyValue) {
        parsedRows.push({
          rowNumber: rowNum,
          data,
        });
      }
    }

    return parsedRows;
  } catch {
    // Fallback to CSV parse if error occurs
    return parseCsvContent(buffer.toString('utf8'));
  }
}

export function computeContentHash(content: string | Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}

function normalizeHeader(raw: string): string {
  const clean = raw
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');

  if (
    clean.includes('case_id') ||
    clean.includes('test_id') ||
    clean === 'id' ||
    clean.includes('external')
  ) {
    return 'external_reference';
  }
  if (clean.includes('title') || clean.includes('name') || clean.includes('summary')) {
    return 'title';
  }
  if (clean.includes('req') || clean.includes('requirement')) {
    return 'requirement_code';
  }
  if (clean.includes('step') || clean.includes('description') || clean.includes('procedure')) {
    return 'steps';
  }
  if (clean.includes('expected') || clean.includes('result')) {
    return 'expected_result';
  }
  if (clean.includes('data')) {
    return 'test_data';
  }
  if (clean.includes('priority')) {
    return 'priority';
  }
  if (clean.includes('scenario') || clean.includes('kind') || clean.includes('positive')) {
    return 'scenario_kind';
  }
  if (clean.includes('type')) {
    return 'test_type';
  }
  if (clean.includes('precondition')) {
    return 'preconditions';
  }

  return clean;
}
