/**
 * Mengambil satu tab Google Sheets sebagai CSV lewat alamat ekspor resmi Google.
 * Hanya untuk spreadsheet dengan akses "siapa saja yang memiliki link" (Pelihat).
 *
 * Pengamanan: hanya host docs.google.com dan googleusercontent.com yang boleh diakses, redirect
 * diperiksa satu per satu, ada batas waktu, dan ukuran respons dibatasi.
 */
const SHEET_URL_PATTERN = /^\/spreadsheets\/d\/([A-Za-z0-9_-]{20,100})(?:\/|$)/;
const MAX_REDIRECTS = 3;
const FETCH_TIMEOUT_MS = 10_000;
const MAX_CSV_BYTES = 2 * 1024 * 1024;

export interface GoogleSheetCsv {
  fileName: string;
  fileContent: string;
  sheetGid: string;
}

export interface ParsedGoogleSheetUrl {
  spreadsheetId: string;
  gid: string;
}

function isAllowedHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === 'docs.google.com' ||
    host === 'googleusercontent.com' ||
    host.endsWith('.googleusercontent.com')
  );
}

export function parseGoogleSheetUrl(raw: string): ParsedGoogleSheetUrl {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new Error('BAD_REQUEST: Tautan Google Sheets tidak valid.');
  }
  if (url.protocol !== 'https:' || url.hostname.toLowerCase() !== 'docs.google.com') {
    throw new Error('BAD_REQUEST: Hanya tautan Google Sheets (docs.google.com) yang didukung.');
  }
  const match = SHEET_URL_PATTERN.exec(url.pathname);
  if (!match) {
    throw new Error('BAD_REQUEST: Tautan bukan spreadsheet Google Sheets.');
  }
  const gidFromHash = /(?:^|[#&])gid=(\d{1,12})/.exec(url.hash)?.[1];
  const gid = url.searchParams.get('gid') || gidFromHash || '0';
  if (!/^\d{1,12}$/.test(gid)) {
    throw new Error('BAD_REQUEST: Tautan tab Google Sheets tidak valid.');
  }
  return { spreadsheetId: match[1], gid };
}

async function readLimitedText(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return response.text();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_CSV_BYTES) {
      await reader.cancel();
      throw new Error('BAD_REQUEST: Spreadsheet terlalu besar untuk diimpor.');
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
}

export const googleSheetImportService = {
  async fetchCsv(rawUrl: string): Promise<GoogleSheetCsv> {
    const { spreadsheetId, gid } = parseGoogleSheetUrl(rawUrl);
    let target = new URL(
      `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`,
    );

    for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
      if (target.protocol !== 'https:' || !isAllowedHost(target.hostname)) {
        throw new Error('BAD_REQUEST: Tautan diarahkan ke alamat yang tidak diizinkan.');
      }
      let response: Response;
      try {
        response = await fetch(target, {
          redirect: 'manual',
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
          headers: { Accept: 'text/csv' },
        });
      } catch {
        throw new Error(
          'BAD_REQUEST: Google Sheets tidak dapat dihubungi. Coba lagi sebentar lagi.',
        );
      }

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location) break;
        target = new URL(location, target);
        continue;
      }
      if (!response.ok) {
        throw new Error(
          'BAD_REQUEST: Spreadsheet tidak dapat dibaca. Atur akses bagikan ke "Siapa saja yang memiliki link" sebagai Pelihat.',
        );
      }
      const contentType = (response.headers.get('content-type') || '').toLowerCase();
      if (!contentType.includes('text/csv') && !contentType.includes('text/plain')) {
        // Halaman login Google dikembalikan untuk sheet yang tidak dibagikan.
        throw new Error(
          'BAD_REQUEST: Spreadsheet tidak dapat dibaca. Atur akses bagikan ke "Siapa saja yang memiliki link" sebagai Pelihat.',
        );
      }
      const fileContent = await readLimitedText(response);
      if (!fileContent.trim()) {
        throw new Error('BAD_REQUEST: Tab spreadsheet kosong.');
      }
      return { fileName: `google-sheet-${gid}.csv`, fileContent, sheetGid: gid };
    }
    throw new Error('BAD_REQUEST: Terlalu banyak pengalihan saat membuka spreadsheet.');
  },
};
