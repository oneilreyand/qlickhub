import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

// Browser smoke test for the portal states (AC-4.1, AC-4.3, AC-4.4). Skipped when Playwright or a
// browser is unavailable. DOCSYS_CHROMIUM=<path> selects a browser binary. Set DOCSYS_SCREENSHOTS=<dir> to keep screenshots as evidence.
const here = path.dirname(fileURLToPath(import.meta.url));
const cli = path.join(here, '..', 'cli.mjs');
const fixture = path.join(here, 'fixtures', 'mini');

let chromium = null;
try {
  ({ chromium } = await import('playwright'));
} catch {
  chromium = null;
}

async function launch() {
  try {
    // DOCSYS_CHROMIUM lets a machine point at an installed browser when Playwright's own is missing.
    const executablePath = process.env.DOCSYS_CHROMIUM || undefined;
    return await chromium.launch({ executablePath });
  } catch {
    return null;
  }
}

function tempProject(dataContent) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'docsys-portal-'));
  fs.writeFileSync(
    path.join(root, 'docsys.config.json'),
    JSON.stringify({ output: 'out', adapters: [] }),
  );
  if (dataContent !== undefined) {
    fs.mkdirSync(path.join(root, 'out'));
    fs.writeFileSync(path.join(root, 'out', 'docs-data.json'), dataContent);
  }
  return root;
}

function serve(root, port) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli, 'portal', '--root', root, '--port', String(port)], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stdout.on('data', (chunk) => {
      if (String(chunk).includes('portal berjalan')) resolve(child);
    });
    child.on('error', reject);
    setTimeout(() => reject(new Error('portal did not start')), 5000);
  });
}

async function withPage(root, port, run) {
  const server = await serve(root, port);
  const browser = await launch();
  try {
    if (!browser) return 'no-browser';
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(`http://localhost:${port}/`);
    await run(page);
    return 'ran';
  } finally {
    await browser?.close();
    server.kill();
  }
}

async function shot(page, name) {
  if (!process.env.DOCSYS_SCREENSHOTS) return;
  fs.mkdirSync(process.env.DOCSYS_SCREENSHOTS, { recursive: true });
  await page.screenshot({
    path: path.join(process.env.DOCSYS_SCREENSHOTS, `${name}.png`),
    fullPage: true,
  });
}

test(
  'AC-4.3: missing data shows the empty state with the extract command',
  { skip: !chromium },
  async (t) => {
    const result = await withPage(tempProject(), 4391, async (page) => {
      await page.getByRole('heading', { name: 'Data portal belum dibuat' }).waitFor();
      assert.ok((await page.textContent('main')).includes('npm run docs:extract'));
      await shot(page, 'state-empty');
    });
    if (result === 'no-browser') t.skip('browser unavailable');
  },
);

test(
  'AC-4.4: broken data and wrong schemaVersion show the error state',
  { skip: !chromium },
  async (t) => {
    const broken = await withPage(tempProject('{ not json'), 4392, async (page) => {
      await page.getByRole('heading', { name: 'Data portal tidak bisa dibaca' }).waitFor();
      await shot(page, 'state-error');
    });
    if (broken === 'no-browser') return t.skip('browser unavailable');
    await withPage(
      tempProject(JSON.stringify({ meta: { schemaVersion: 99 } })),
      4393,
      async (page) => {
        await page.getByRole('heading', { name: 'Format data tidak cocok' }).waitFor();
        assert.ok((await page.textContent('main')).includes('schemaVersion 99'));
      },
    );
  },
);

test('AC-4.1: home and feature pages render extracted data', { skip: !chromium }, async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'docsys-portal-'));
  fs.cpSync(fixture, root, { recursive: true });
  const config = JSON.parse(fs.readFileSync(path.join(root, 'docsys.config.json'), 'utf8'));
  fs.writeFileSync(
    path.join(root, 'docsys.config.json'),
    JSON.stringify({ ...config, output: 'out' }),
  );
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli, 'extract', '--root', root], { stdio: 'ignore' });
    child.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`extract exited ${code}`)),
    );
  });
  const result = await withPage(root, 4394, async (page) => {
    await page.getByRole('heading', { name: 'Mini Dev Portal' }).waitFor();
    assert.ok((await page.textContent('main')).includes('Stack yang digunakan'));
    await shot(page, 'home');
    await page.getByRole('link', { name: 'Fitur & Kontrak API' }).click();
    await page.getByRole('heading', { name: 'Items' }).waitFor();
    await shot(page, 'home-feature');
    await page.getByRole('link', { name: /Endpoint \(3\)/ }).click();
    await page.locator('td', { hasText: '/v1/items/:itemId' }).first().waitFor();
    await page.getByRole('link', { name: /Semua endpoint/ }).click();
    await page.locator('input[data-filter="rows"]').waitFor();
    assert.equal(await page.locator('tbody tr').count(), 5);
    await page.fill('input[data-filter="rows"]', 'health');
    assert.equal(await page.locator('tbody tr:visible').count(), 2);
  });
  if (result === 'no-browser') t.skip('browser unavailable');
});
