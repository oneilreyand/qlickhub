import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// SDLC gate enforcement (ADR-030, SDLC-002). Static rules run inside `docs:check`;
// change rules run in CI with `--base <ref>`.

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const RUNTIME_PREFIXES = ['apps/', 'packages/', 'api/', 'database/'];
export const STAGE_NAMES = [
  'Problem',
  'Opsi Solusi',
  'PRD',
  'Breakdown',
  'Build',
  'Test & Review',
  'Release & Close',
];
export const STAGE_STATUSES = new Set([
  'Belum mulai',
  'Draft',
  'Menunggu persetujuan',
  'Disetujui',
  'Blocked',
  'Selesai',
]);
const APPROVED = new Set(['Disetujui', 'Selesai']);
export const QUICK_STATUSES = new Set([
  'Draft',
  'Menunggu persetujuan',
  'Disetujui',
  'Selesai',
  'Blocked',
]);
export const QUICK_HEADINGS = [
  '## Problem',
  '## Perubahan',
  '## Acceptance Criteria → bukti',
  '## Approval Window',
  '## Hasil',
];
const LEGACY_NAVIGATION_FILES = new Set([
  'README.md',
  'FEATURE_TEMPLATE.md',
  'FEATURE_CATALOG.md',
  'ROLE_FLOWS.md',
]);
const EMPTY_APPROVER = /^(?:|—|-|–|TBD)$/;

function stripCode(markdown) {
  return markdown.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
}

export function findPlaceholders(markdown) {
  const text = stripCode(markdown);
  const found = new Set();
  for (const pattern of [
    /\bTBD\b/g,
    /YYYY-MM-DD/g,
    /\[FEATURE-ID\]/g,
    /<(?!!--|https?:|\/)[^<>\n]{1,80}>/g,
  ]) {
    for (const match of text.matchAll(pattern)) found.add(match[0]);
  }
  return [...found];
}

function statusOf(markdown) {
  return markdown.match(/^\*\*Status:\*\*\s*(.+?)\s*$/m)?.[1] ?? null;
}

function tableCells(line) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

export function parseStageTracker(readme) {
  const start = readme.indexOf('## Stage Tracker');
  if (start === -1) return null;
  const rest = readme.slice(start + '## Stage Tracker'.length);
  const end = rest.search(/^## /m);
  const section = end === -1 ? rest : rest.slice(0, end);
  const rows = [];
  for (const line of section.split('\n')) {
    const cells = tableCells(line);
    const match = cells[0]?.match(/^(\d)\s+(.+)$/);
    if (!line.trim().startsWith('|') || !match) continue;
    const links = [...(cells[1] ?? '').matchAll(/\]\(([^)]+)\)/g)].map((item) => item[1]);
    rows.push({
      stage: Number(match[1]),
      name: match[2],
      links,
      status: cells[2] ?? '',
      approver: cells[4] ?? '',
    });
  }
  return rows;
}

/**
 * Validates a folder Feature Card's Stage Tracker and approved stage documents.
 * `readFile(relativePath)` returns file content or null; `listMarkdown(relativeDir)`
 * returns markdown file names in a sub-directory of the card.
 */
export function validateStageTracker(readme, readFile, listMarkdown, relativeDirectory) {
  const errors = [];
  const rows = parseStageTracker(readme);
  if (!rows) {
    return [`${relativeDirectory}/README.md is missing the "## Stage Tracker" section.`];
  }
  const byStage = new Map();
  for (const row of rows) {
    if (byStage.has(row.stage)) {
      errors.push(`${relativeDirectory}/README.md repeats Stage Tracker stage ${row.stage}.`);
    }
    byStage.set(row.stage, row);
  }
  STAGE_NAMES.forEach((name, stage) => {
    if (!byStage.has(stage)) {
      errors.push(
        `${relativeDirectory}/README.md Stage Tracker is missing stage ${stage} ${name}.`,
      );
    }
  });

  for (const row of rows) {
    const label = `${relativeDirectory}/README.md stage ${row.stage} ${row.name}`;
    if (!STAGE_STATUSES.has(row.status)) {
      errors.push(`${label} has unsupported status "${row.status}".`);
      continue;
    }
    if (!APPROVED.has(row.status)) continue;

    if (EMPTY_APPROVER.test(row.approver)) {
      errors.push(`${label} is ${row.status} but records no approver/date.`);
    }
    for (let earlier = 0; earlier < row.stage; earlier += 1) {
      const previous = byStage.get(earlier);
      if (previous && !APPROVED.has(previous.status)) {
        errors.push(
          `${label} is ${row.status} while earlier stage ${earlier} is "${previous.status}".`,
        );
      }
    }

    const target = row.links[0];
    if (!target) continue;
    const documents = target.endsWith('/')
      ? listMarkdown(target.replace(/\/$/, '')).map((name) => `${target}${name}`)
      : [target];
    if (target.endsWith('/') && documents.length === 0) {
      errors.push(`${label} is ${row.status} but ${target} contains no document.`);
    }
    for (const document of documents) {
      const content = readFile(document);
      if (content === null) continue; // broken links are reported by docs:check
      const status = statusOf(content);
      if (!status || status.includes('|')) {
        errors.push(
          `${relativeDirectory}/${document} must state one Status once stage ${row.stage} is ${row.status}.`,
        );
      }
      const placeholders = findPlaceholders(content);
      if (placeholders.length > 0) {
        errors.push(
          `${relativeDirectory}/${document} still has placeholders (${placeholders.slice(0, 3).join(', ')}) but stage ${row.stage} is ${row.status}.`,
        );
      }
    }
  }
  return errors;
}

export function validateQuickCard(content, relativeFile) {
  const errors = [];
  for (const heading of QUICK_HEADINGS) {
    if (!content.includes(heading)) errors.push(`${relativeFile} is missing heading: ${heading}`);
  }
  const status = statusOf(content);
  if (!status || !QUICK_STATUSES.has(status)) {
    errors.push(`${relativeFile} must state one Status: ${[...QUICK_STATUSES].join(', ')}.`);
  }
  const wra = content.match(/^\*\*WRA:\*\*\s*(\d+)\s*\/\s*16/m);
  if (!wra) {
    if (status !== 'Draft') errors.push(`${relativeFile} must state "**WRA:** <n>/16".`);
  } else if (Number(wra[1]) > 4) {
    errors.push(
      `${relativeFile} has WRA ${wra[1]}/16; the Quick path allows 0–4. Use a Feature folder.`,
    );
  }
  if (status && APPROVED.has(status)) {
    const approver = content.match(/^\*\*Disetujui:\*\*\s*(.*)$/m)?.[1]?.trim() ?? '';
    if (EMPTY_APPROVER.test(approver)) {
      errors.push(`${relativeFile} is ${status} but "**Disetujui:**" records no approver/date.`);
    }
    const placeholders = findPlaceholders(content);
    if (placeholders.length > 0) {
      errors.push(
        `${relativeFile} is ${status} but still has placeholders (${placeholders.slice(0, 3).join(', ')}).`,
      );
    }
  }
  return errors;
}

export function isRuntimePath(file) {
  return RUNTIME_PREFIXES.some((prefix) => file.startsWith(prefix));
}

export function featureIdOf(file) {
  const match = file.match(/^docs\/features\/([^/]+)\/.+/);
  return match && match[1] !== '_template' ? match[1] : null;
}

export function isQuickCard(file) {
  return /^docs\/plans\/quick\/[^/]+\.md$/.test(file) && !file.endsWith('/README.md');
}

/**
 * Change rules. `changes` is [{ status: 'A'|'M'|'D'|..., file }].
 * `readFile(repoRelativePath)` returns content at HEAD or null.
 */
export function evaluateChanges(changes, readFile) {
  const errors = [];
  const present = changes.filter((change) => change.status !== 'D');

  for (const { status, file } of present) {
    const legacy = file.match(/^docs\/features\/([^/]+\.md)$/);
    if (status === 'A' && legacy && !LEGACY_NAVIGATION_FILES.has(legacy[1])) {
      errors.push(
        `${file} adds a single-file Feature Card; new Features use docs/features/<FEATURE-ID>/ from the folder template (SDLC-002).`,
      );
    }
  }

  const runtimeFiles = present.map((change) => change.file).filter(isRuntimePath);
  if (runtimeFiles.length === 0) return { errors, runtimeFiles, authorizedBy: [] };

  const featureIds = [
    ...new Set(present.map((change) => featureIdOf(change.file)).filter(Boolean)),
  ];
  const quickCards = present.map((change) => change.file).filter(isQuickCard);
  const authorizedBy = [];

  for (const id of featureIds) {
    const readme = readFile(`docs/features/${id}/README.md`);
    const rows = readme ? parseStageTracker(readme) : null;
    const breakdown = rows?.find((row) => row.stage === 3);
    if (breakdown && APPROVED.has(breakdown.status) && !EMPTY_APPROVER.test(breakdown.approver)) {
      authorizedBy.push(`docs/features/${id}`);
    }
  }
  for (const file of quickCards) {
    const content = readFile(file);
    if (content && validateQuickCard(content, file).length === 0) {
      const status = statusOf(content);
      if (APPROVED.has(status)) authorizedBy.push(file);
    }
  }

  if (authorizedBy.length === 0) {
    errors.push(
      [
        `Runtime code changed (${runtimeFiles.slice(0, 5).join(', ')}${runtimeFiles.length > 5 ? ', …' : ''}) without an approved SDLC record (SDLC-002).`,
        'Update a Feature folder docs/features/<FEATURE-ID>/ whose Stage Tracker stage 3 Breakdown is Disetujui/Selesai with approver/date,',
        'or a Quick Card docs/plans/quick/<TASK-ID>.md with Status Disetujui/Selesai, WRA ≤ 4/16, approver/date, and no placeholders.',
        'Scaffold with: npm run sdlc:new -- feature <FEATURE-ID>  |  npm run sdlc:new -- quick <TASK-ID>',
      ].join('\n  '),
    );
  }
  return { errors, runtimeFiles, authorizedBy };
}

function git(args) {
  return execFileSync('git', args, { cwd: repositoryRoot, encoding: 'utf8' });
}

function changedFiles(base) {
  return git(['diff', '--name-status', '--no-renames', `${base}..HEAD`])
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [status, file] = line.split('\t');
      return { status: status[0], file };
    });
}

function readAtWorktree(relativeFile) {
  const absolute = path.join(repositoryRoot, relativeFile);
  return fs.existsSync(absolute) ? fs.readFileSync(absolute, 'utf8') : null;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const baseIndex = process.argv.indexOf('--base');
  const base = baseIndex === -1 ? '' : (process.argv[baseIndex + 1] ?? '');
  if (!base || /^0+$/.test(base)) {
    console.log('SDLC check skipped: no base commit to compare against.');
  } else {
    const { errors, runtimeFiles, authorizedBy } = evaluateChanges(
      changedFiles(base),
      readAtWorktree,
    );
    if (errors.length > 0) {
      console.error(`SDLC check failed with ${errors.length} error(s):`);
      for (const error of errors) console.error(`- ${error}`);
      process.exitCode = 1;
    } else if (runtimeFiles.length === 0) {
      console.log('SDLC check passed: no runtime code changed.');
    } else {
      console.log(`SDLC check passed: runtime change authorized by ${authorizedBy.join(', ')}.`);
    }
  }
}
