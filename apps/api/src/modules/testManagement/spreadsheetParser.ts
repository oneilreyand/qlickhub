import { createHash } from 'node:crypto';
import { inflateRawSync } from 'node:zlib';
import { MAX_IMPORT_ROWS } from '@qlick/contracts';

export interface ParsedSpreadsheetRow {
  rowNumber: number;
  data: Record<string, string>;
}

/**
 * Standard RFC 4180 CSV parser supporting quoted values, embedded newlines, and escaped quotes.
 */
export function parseCsvContent(
  content: string,
  columnMapping?: Record<string, string>,
): ParsedSpreadsheetRow[] {
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

  const rawHeaders = rows[0];
  const headers = rawHeaders.map((h) => resolveHeader(h, columnMapping));
  const parsedRows: ParsedSpreadsheetRow[] = [];

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
    if (parsedRows.length >= MAX_IMPORT_ROWS) {
      throw new Error(`BAD_REQUEST: Spreadsheet exceeds maximum limit of ${MAX_IMPORT_ROWS} rows.`);
    }

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
 * Discover available sheet names in an XLSX file.
 */
export function getSpreadsheetSheets(buffer: Buffer, mimeType = ''): string[] {
  if (
    mimeType.includes('csv') ||
    (!mimeType.includes('spreadsheet') &&
      !mimeType.includes('excel') &&
      !mimeType.includes('openxmlformats'))
  ) {
    // Check if buffer looks like zip
    if (buffer.length < 4 || buffer.readUInt32LE(0) !== 0x04034b50) {
      return ['Sheet1'];
    }
  }

  try {
    const files = unzipBuffer(buffer);
    const workbookXml = files.get('xl/workbook.xml')?.toString('utf8') || '';
    if (!workbookXml) return ['Sheet1'];

    const sheetNames: string[] = [];
    const sheetRegex = /<sheet\s+[^>]*name="([^"]+)"[^>]*>/g;
    let match: RegExpExecArray | null;
    while ((match = sheetRegex.exec(workbookXml)) !== null) {
      sheetNames.push(match[1]);
    }

    return sheetNames.length > 0 ? sheetNames : ['Sheet1'];
  } catch {
    return ['Sheet1'];
  }
}

/**
 * Parse an XLSX file buffer into spreadsheet rows with sheet selection and column mapping.
 */
export function parseXlsxContent(
  buffer: Buffer,
  selectedSheetName?: string,
  columnMapping?: Record<string, string>,
): ParsedSpreadsheetRow[] {
  try {
    const files = unzipBuffer(buffer);
    const sharedStringsXml = files.get('xl/sharedStrings.xml')?.toString('utf8') || '';
    const workbookXml = files.get('xl/workbook.xml')?.toString('utf8') || '';
    const relsXml = files.get('xl/_rels/workbook.xml.rels')?.toString('utf8') || '';

    // Determine target worksheet xml file
    let targetWorksheetPath = 'xl/worksheets/sheet1.xml';

    if (selectedSheetName && workbookXml) {
      const sheetRegex = new RegExp(
        `<sheet\\s+[^>]*name="${selectedSheetName}"[^>]*r:id="([^"]+)"`,
        'i',
      );
      const sheetMatch = sheetRegex.exec(workbookXml);
      if (sheetMatch && relsXml) {
        const rId = sheetMatch[1];
        const relRegex = new RegExp(`<Relationship\\s+[^>]*Id="${rId}"[^>]*Target="([^"]+)"`, 'i');
        const relMatch = relRegex.exec(relsXml);
        if (relMatch) {
          const target = relMatch[1];
          targetWorksheetPath = target.startsWith('worksheets/')
            ? `xl/${target}`
            : target.startsWith('xl/')
              ? target
              : `xl/worksheets/${target}`;
        }
      }
    }

    let worksheetXml = files.get(targetWorksheetPath)?.toString('utf8') || '';
    if (!worksheetXml) {
      worksheetXml =
        files.get('xl/worksheets/sheet1.xml')?.toString('utf8') ||
        files.get('xl/worksheets/sheet.xml')?.toString('utf8') ||
        '';
    }

    if (!worksheetXml) {
      return parseCsvContent(buffer.toString('utf8'), columnMapping);
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

    while ((rowMatch = rowRegex.exec(worksheetXml)) !== null) {
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
      colToHeader[col] = resolveHeader(headerVal, columnMapping);
    }

    const parsedRows: ParsedSpreadsheetRow[] = [];
    for (let i = 1; i < rawRows.length; i++) {
      if (parsedRows.length >= MAX_IMPORT_ROWS) {
        throw new Error(
          `BAD_REQUEST: Spreadsheet exceeds maximum limit of ${MAX_IMPORT_ROWS} rows.`,
        );
      }

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
  } catch (err: any) {
    if (err.message?.includes('exceeds maximum limit')) {
      throw err;
    }
    return parseCsvContent(buffer.toString('utf8'), columnMapping);
  }
}

export function computeContentHash(content: string | Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}

function resolveHeader(raw: string, columnMapping?: Record<string, string>): string {
  const trimmed = raw.trim();
  if (columnMapping && columnMapping[trimmed]) {
    return columnMapping[trimmed];
  }
  return normalizeHeader(trimmed);
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
