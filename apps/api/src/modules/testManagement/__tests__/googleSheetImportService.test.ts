import assert from 'node:assert';
import { afterEach, describe, test } from 'node:test';
import { googleSheetImportService, parseGoogleSheetUrl } from '../googleSheetImportService.js';

const ID = '1glJJic3K0pCb_e1nX91bXk14M7VoQ5yKZWKv8g0M6bk';
const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function csvResponse(body: string, contentType = 'text/csv; charset=utf-8') {
  return new Response(body, { status: 200, headers: { 'content-type': contentType } });
}

describe('parseGoogleSheetUrl', () => {
  test('reads the spreadsheet id and the tab gid from the link', () => {
    assert.deepStrictEqual(
      parseGoogleSheetUrl(`https://docs.google.com/spreadsheets/d/${ID}/edit?gid=1234#gid=1234`),
      { spreadsheetId: ID, gid: '1234' },
    );
    assert.deepStrictEqual(
      parseGoogleSheetUrl(`https://docs.google.com/spreadsheets/d/${ID}/edit#gid=55`),
      { spreadsheetId: ID, gid: '55' },
    );
    assert.strictEqual(
      parseGoogleSheetUrl(`https://docs.google.com/spreadsheets/d/${ID}/edit`).gid,
      '0',
    );
  });

  test('rejects other hosts, other schemes, and non-spreadsheet links', () => {
    for (const bad of [
      'not a url',
      `http://docs.google.com/spreadsheets/d/${ID}/edit`,
      `https://evil.example.com/spreadsheets/d/${ID}/edit`,
      'https://docs.google.com/document/d/abc/edit',
      `https://docs.google.com.evil.example/spreadsheets/d/${ID}/edit`,
    ]) {
      assert.throws(() => parseGoogleSheetUrl(bad), /BAD_REQUEST/, bad);
    }
  });
});

describe('googleSheetImportService.fetchCsv', () => {
  test('downloads the CSV export of the chosen tab', async () => {
    let requested = '';
    globalThis.fetch = (async (input: URL | string) => {
      requested = String(input);
      return csvResponse('a,b\n1,2\n');
    }) as typeof fetch;
    const file = await googleSheetImportService.fetchCsv(
      `https://docs.google.com/spreadsheets/d/${ID}/edit#gid=77`,
    );
    assert.ok(
      requested.startsWith(`https://docs.google.com/spreadsheets/d/${ID}/export?format=csv`),
    );
    assert.ok(requested.includes('gid=77'));
    assert.strictEqual(file.sheetGid, '77');
    assert.strictEqual(file.fileContent, 'a,b\n1,2\n');
  });

  test('follows a Google redirect but refuses a redirect to another host', async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      if (calls === 1) {
        return new Response(null, {
          status: 307,
          headers: { location: 'https://doc-0k-sheets.googleusercontent.com/export/x' },
        });
      }
      return csvResponse('a\n1\n');
    }) as typeof fetch;
    const ok = await googleSheetImportService.fetchCsv(
      `https://docs.google.com/spreadsheets/d/${ID}/edit`,
    );
    assert.strictEqual(ok.fileContent, 'a\n1\n');

    globalThis.fetch = (async () =>
      new Response(null, {
        status: 302,
        headers: { location: 'http://169.254.169.254/latest/meta-data' },
      })) as typeof fetch;
    await assert.rejects(
      googleSheetImportService.fetchCsv(`https://docs.google.com/spreadsheets/d/${ID}/edit`),
      /tidak diizinkan/,
    );
  });

  test('explains how to share a sheet that returns a login page', async () => {
    globalThis.fetch = (async () => csvResponse('<html>login</html>', 'text/html')) as typeof fetch;
    await assert.rejects(
      googleSheetImportService.fetchCsv(`https://docs.google.com/spreadsheets/d/${ID}/edit`),
      /Siapa saja yang memiliki link/,
    );
  });
});
