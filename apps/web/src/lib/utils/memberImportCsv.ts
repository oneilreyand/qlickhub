import { MEMBER_IMPORT_MAX_ROWS, type MemberImportRowInput } from '@qlick/contracts';

/**
 * MEMBER-ACCESS-HUB P4: turns CSV text into raw import rows. Columns: email, workspace, role,
 * spesialisasi (header optional, Indonesian or English names). Comma is the delimiter; a file
 * whose first line has semicolons but no commas (Excel with Indonesian locale) uses `;`.
 * Validation of values happens on the server.
 */
export interface ParsedMemberCsv {
  rows: MemberImportRowInput[];
  error: string | null;
}

const HEADER: Record<string, keyof MemberImportRowInput> = {
  email: 'email',
  'e-mail': 'email',
  surel: 'email',
  workspace: 'workspace',
  'ruang kerja': 'workspace',
  role: 'role',
  peran: 'role',
  spesialisasi: 'specialties',
  specialties: 'specialties',
  specialty: 'specialties',
};

const ORDER: (keyof MemberImportRowInput)[] = ['email', 'workspace', 'role', 'specialties'];

function splitRecords(text: string, delimiter: string): string[][] {
  const records: string[][] = [];
  let field = '';
  let record: string[] = [];
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === delimiter) {
      record.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      record.push(field);
      records.push(record);
      record = [];
      field = '';
    } else field += char;
  }
  record.push(field);
  records.push(record);
  return records.filter((r) => r.some((value) => value.trim() !== ''));
}

export function parseMemberImportCsv(text: string): ParsedMemberCsv {
  const clean = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? '';
  const delimiter = !firstLine.includes(',') && firstLine.includes(';') ? ';' : ',';
  const records = splitRecords(clean, delimiter);
  if (records.length === 0) return { rows: [], error: 'File CSV kosong.' };

  const header = records[0].map((value) => HEADER[value.trim().toLowerCase()]);
  const hasHeader = header.some(Boolean);
  if (
    hasHeader &&
    (!header.includes('email') || !header.includes('workspace') || !header.includes('role'))
  ) {
    return { rows: [], error: 'Header wajib memuat kolom email, workspace, dan role.' };
  }
  const columns = hasHeader ? header : ORDER;
  const body = hasHeader ? records.slice(1) : records;
  if (body.length === 0) return { rows: [], error: 'Tidak ada baris data di bawah header.' };
  if (body.length > MEMBER_IMPORT_MAX_ROWS) {
    return {
      rows: [],
      error: `Maksimal ${MEMBER_IMPORT_MAX_ROWS} baris per impor; file ini berisi ${body.length}.`,
    };
  }

  const rows = body.map((record) => {
    const row: MemberImportRowInput = { email: '', workspace: '', role: '', specialties: '' };
    columns.forEach((column, index) => {
      if (column) row[column] = (record[index] ?? '').trim();
    });
    return row;
  });
  return { rows, error: null };
}

export const MEMBER_IMPORT_CSV_EXAMPLE =
  'email,workspace,role,spesialisasi\nrina@perusahaan.com,Acme Core,qa,\nbudi@perusahaan.com,acme-core,dev,frontend;backend\n';
