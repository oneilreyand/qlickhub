import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  evaluateChanges,
  findPlaceholders,
  parseStageTracker,
  validateQuickCard,
  validateStageTracker,
} from './checkSdlc.mjs';
import { scaffoldFeature, scaffoldQuick } from './sdlcNew.mjs';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function tracker(statuses, approvers = []) {
  const names = [
    'Problem',
    'Opsi Solusi',
    'PRD',
    'Breakdown',
    'Build',
    'Test & Review',
    'Release & Close',
  ];
  const files = [
    'problem.md',
    'solution.md',
    'product.md',
    'breakdown.md',
    'phases/',
    'testing.md',
    'release.md',
  ];
  const rows = names.map(
    (name, stage) =>
      `| ${stage} ${name} | [doc](${files[stage]}) | ${statuses[stage] ?? 'Belum mulai'} | G${stage} | ${approvers[stage] ?? '—'} | |`,
  );
  return `# X\n\n## Stage Tracker\n\n| Tahap | Dokumen | Status | Gerbang | Disetujui oleh / tanggal | Catatan |\n| --- | --- | --- | --- | --- | --- |\n${rows.join('\n')}\n\n## 1. Tujuan dan Pengguna\n`;
}

const cleanDoc = '# Doc\n\n**Status:** Disetujui\n\nIsi final.\n';
const read = (docs) => (file) => docs[file] ?? null;

test('findPlaceholders ignores code and finds template markers', () => {
  assert.deepEqual(findPlaceholders('ok `<code>` ```\n<x>\n```'), []);
  assert.deepEqual(findPlaceholders('Owner TBD <nama> [FEATURE-ID] YYYY-MM-DD').length, 4);
});

test('feature template tracker has all seven stages and passes as Draft', () => {
  const readme = fs.readFileSync(
    path.join(repositoryRoot, 'docs/features/_template/README.md'),
    'utf8',
  );
  assert.equal(parseStageTracker(readme).length, 7);
  assert.deepEqual(
    validateStageTracker(
      readme,
      () => null,
      () => [],
      'tpl',
    ),
    [],
  );
});

test('approved stage needs approver, earlier approvals, one Status, and no placeholders', () => {
  const errors = validateStageTracker(
    tracker(['Disetujui', 'Draft', 'Disetujui'], ['PO 2026-10-13', '—', '—']),
    read({ 'problem.md': '**Status:** Draft | Disetujui\n<masalah>', 'product.md': cleanDoc }),
    () => [],
    'docs/features/X',
  );
  assert.ok(errors.some((e) => e.includes('stage 2 PRD is Disetujui but records no approver')));
  assert.ok(errors.some((e) => e.includes('earlier stage 1 is "Draft"')));
  assert.ok(errors.some((e) => e.includes('problem.md must state one Status')));
  assert.ok(errors.some((e) => e.includes('problem.md still has placeholders')));
});

test('fully approved tracker with clean documents passes', () => {
  const statuses = ['Selesai', 'Selesai', 'Disetujui', 'Disetujui'];
  const approvers = ['PO 2026-10-13', 'Owner 2026-10-13', 'PO 2026-10-13', 'Owner 2026-10-13'];
  const docs = {
    'problem.md': cleanDoc,
    'solution.md': cleanDoc,
    'product.md': cleanDoc,
    'breakdown.md': cleanDoc,
  };
  assert.deepEqual(
    validateStageTracker(tracker(statuses, approvers), read(docs), () => [], 'F'),
    [],
  );
});

test('missing tracker and unknown status are rejected', () => {
  assert.match(
    validateStageTracker('# x', read({}), () => [], 'F')[0],
    /missing the "## Stage Tracker"/,
  );
  assert.ok(
    validateStageTracker(tracker(['Done']), read({}), () => [], 'F').some((e) =>
      e.includes('unsupported status'),
    ),
  );
});

const quick = (status, wra = 2, approver = 'Owner, 2026-10-13, chat') =>
  `# QUICK — FIX-1 judul\n\n**Status:** ${status}\n**WRA:** ${wra}/16 — lokal\n\n## Problem\nx\n## Perubahan\nx\n## Acceptance Criteria → bukti\nx\n## Approval Window\nx\n\n**Disetujui:** ${approver}\n\n## Hasil\nx\n`;

test('quick card rules: headings, WRA limit, approver and placeholders when approved', () => {
  assert.deepEqual(validateQuickCard(quick('Disetujui'), 'q.md'), []);
  assert.ok(
    validateQuickCard(quick('Disetujui', 2, '—'), 'q.md').some((e) => e.includes('no approver')),
  );
  assert.ok(validateQuickCard(quick('Draft', 7), 'q.md').some((e) => e.includes('allows 0–4')));
  assert.ok(
    validateQuickCard(quick('Selesai', 2, '<nama>'), 'q.md').some((e) =>
      e.includes('placeholders'),
    ),
  );
  assert.ok(
    validateQuickCard('**Status:** Draft', 'q.md').some((e) => e.includes('missing heading')),
  );
});

test('runtime change without an SDLC record fails; docs-only change passes', () => {
  assert.equal(
    evaluateChanges([{ status: 'M', file: 'docs/4_AGENT_DEV_GUIDELINES.md' }], read({})).errors
      .length,
    0,
  );
  const { errors } = evaluateChanges([{ status: 'M', file: 'apps/api/src/app.ts' }], read({}));
  assert.match(errors[0], /without an approved SDLC record/);
});

test('runtime change is authorized by an approved Breakdown or approved quick card only', () => {
  const approved = tracker(
    ['Selesai', 'Selesai', 'Selesai', 'Disetujui'],
    ['a', 'b', 'c', 'Owner 2026-10-13'],
  );
  const draft = tracker(['Selesai', 'Selesai', 'Selesai', 'Menunggu persetujuan'], ['a', 'b', 'c']);
  const change = (file) => [
    { status: 'M', file: 'apps/web/src/x.tsx' },
    { status: 'M', file },
  ];

  assert.deepEqual(
    evaluateChanges(
      change('docs/features/LEADER-HUB/breakdown.md'),
      read({ 'docs/features/LEADER-HUB/README.md': approved }),
    ).errors,
    [],
  );
  assert.equal(
    evaluateChanges(
      change('docs/features/LEADER-HUB/breakdown.md'),
      read({ 'docs/features/LEADER-HUB/README.md': draft }),
    ).errors.length,
    1,
  );
  assert.deepEqual(
    evaluateChanges(
      change('docs/plans/quick/FIX-1.md'),
      read({ 'docs/plans/quick/FIX-1.md': quick('Disetujui') }),
    ).errors,
    [],
  );
  assert.equal(
    evaluateChanges(
      change('docs/plans/quick/FIX-1.md'),
      read({ 'docs/plans/quick/FIX-1.md': quick('Draft') }),
    ).errors.length,
    1,
  );
});

test('a new single-file Feature Card is rejected', () => {
  const { errors } = evaluateChanges(
    [{ status: 'A', file: 'docs/features/NEW_THING.md' }],
    read({}),
  );
  assert.match(errors[0], /single-file Feature Card/);
  assert.deepEqual(
    evaluateChanges([{ status: 'M', file: 'docs/features/FEATURE_CATALOG.md' }], read({})).errors,
    [],
  );
});

test('scaffolds create a valid Draft feature folder and quick card', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sdlc-'));
  fs.cpSync(
    path.join(repositoryRoot, 'docs/features/_template'),
    path.join(root, 'docs/features/_template'),
    { recursive: true },
  );
  fs.mkdirSync(path.join(root, 'docs/plans'), { recursive: true });
  fs.copyFileSync(
    path.join(repositoryRoot, 'docs/plans/QUICK_CARD_TEMPLATE.md'),
    path.join(root, 'docs/plans/QUICK_CARD_TEMPLATE.md'),
  );

  scaffoldFeature('DEMO-1', root);
  const readme = fs.readFileSync(path.join(root, 'docs/features/DEMO-1/README.md'), 'utf8');
  assert.match(readme, /^# DEMO-1 — Feature Overview/);
  assert.equal(parseStageTracker(readme).length, 7);
  assert.throws(() => scaffoldFeature('DEMO-1', root), /already exists/);

  scaffoldQuick('FIX-9', root);
  const card = fs.readFileSync(path.join(root, 'docs/plans/quick/FIX-9.md'), 'utf8');
  assert.match(card, /^# QUICK — FIX-9/);
  assert.deepEqual(validateQuickCard(card, 'FIX-9.md'), [], 'a fresh Draft quick card is valid');
  const submitted = card.replace('**Status:** Draft', '**Status:** Menunggu persetujuan');
  assert.ok(validateQuickCard(submitted, 'FIX-9.md').some((e) => e.includes('WRA')));
});
