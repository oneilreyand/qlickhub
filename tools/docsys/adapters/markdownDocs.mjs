import path from 'node:path';
import { exists, findFiles, readText, sortBy } from '../core/files.mjs';

export function tableCells(line) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

const isSeparator = (line) => /^\|\s*:?-{3,}/.test(line.trim());

export function headerField(markdown, label) {
  const match = markdown.match(new RegExp(`^(?:-\\s+)?\\*\\*${label}:\\*\\*\\s*(.+?)\\s*$`, 'm'));
  return match ? match[1] : null;
}

export function firstHeading(markdown) {
  return markdown.match(/^#\s+(.+?)\s*$/m)?.[1] ?? null;
}

const stripMarkdown = (text) =>
  text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[`*_]/g, '')
    .trim();
const linkTarget = (text) => text.match(/\]\(([^)#]+)/)?.[1] ?? null;
const policyIds = (text) => [...new Set(text.match(/\b[A-Z]{2,12}-\d{3}\b/g) ?? [])].sort();

/** Rows of every Markdown table that follows `## <heading>` sections; returns {section, cells}. */
export function sectionTables(markdown) {
  const rows = [];
  let section = null;
  let header = null;
  for (const line of markdown.split('\n')) {
    const heading = line.match(/^##\s+(.+?)\s*$/);
    if (heading) {
      section = heading[1];
      header = null;
      continue;
    }
    if (!line.trim().startsWith('|')) {
      header = null;
      continue;
    }
    if (isSeparator(line)) continue;
    const cells = tableCells(line);
    if (!header) header = cells;
    else rows.push({ section, header, cells });
  }
  return rows;
}

function parseCatalog(root, file) {
  if (!file || !exists(root, file)) return new Map();
  const directory = path.posix.dirname(file);
  const entries = new Map();
  for (const row of sectionTables(readText(root, file))) {
    const target = linkTarget(row.cells[0]);
    if (!target) continue;
    const resolved = path.posix.normalize(path.posix.join(directory, target));
    entries.set(resolved, {
      area: row.section?.replace(/^\d+\.\s*/, '') ?? null,
      readers: row.cells[1] ?? null,
      purpose: row.cells[2] ?? null,
      catalogStatus: row.cells[3] ?? null,
    });
  }
  return entries;
}

export function parseStageTracker(markdown) {
  const lines = markdown.split('\n');
  const start = lines.findIndex((line) => /^##\s+Stage Tracker/.test(line));
  if (start < 0) return [];
  const stages = [];
  for (const line of lines.slice(start + 1)) {
    if (/^##\s/.test(line)) break;
    if (!line.trim().startsWith('|') || isSeparator(line)) continue;
    const cells = tableCells(line);
    if (cells[0] === 'Tahap') continue;
    stages.push({
      stage: stripMarkdown(cells[0]),
      documents: stripMarkdown(cells[1] ?? ''),
      status: cells[2] ?? null,
      gate: cells[3] ?? null,
      approvedBy: cells[4] && !/^(?:—|-|–)$/.test(cells[4]) ? cells[4] : null,
      note: cells[5] || null,
    });
  }
  return stages;
}

function features(root, settings) {
  const catalog = parseCatalog(root, settings.catalog);
  const navigation = new Set(settings.navigationFiles ?? []);
  const result = [];

  for (const file of findFiles(root, `${settings.dir}/*.md`)) {
    if (navigation.has(path.posix.basename(file))) continue;
    const markdown = readText(root, file);
    const id = path.posix.basename(file, '.md');
    const heading = firstHeading(markdown) ?? id;
    // Legacy cards often start with their own ID ("FEATURE-ID — Title"); keep only the title.
    const idPrefix = id.replaceAll('_', '-');
    const title = heading.startsWith(`${idPrefix} `)
      ? heading.slice(idPrefix.length).replace(/^\s*[—–-]?\s*/, '') || heading
      : heading;
    result.push({
      id,
      kind: 'card',
      title,
      file,
      sourceFiles: [file],
      status: headerField(markdown, 'Status'),
      owner: headerField(markdown, 'Owner'),
      policies: policyIds(headerField(markdown, 'Applicable Policy IDs') ?? ''),
      stages: [],
      ...(catalog.get(file) ?? { area: null, readers: null, purpose: null, catalogStatus: null }),
    });
  }

  for (const readme of findFiles(root, `${settings.dir}/*/README.md`)) {
    const directory = path.posix.dirname(readme);
    const id = path.posix.basename(directory);
    if ((settings.ignoreFolders ?? []).includes(id)) continue;
    const markdown = readText(root, readme);
    const title = (firstHeading(markdown) ?? id).replace(/\s+—\s+Feature Overview$/, '');
    result.push({
      id,
      kind: 'folder',
      title,
      file: readme,
      sourceFiles: findFiles(root, `${directory}/**/*.md`),
      status: headerField(markdown, 'Status'),
      owner: headerField(markdown, 'Owner'),
      policies: policyIds(headerField(markdown, 'Applicable Policy IDs') ?? ''),
      stages: parseStageTracker(markdown),
      ...(catalog.get(readme) ?? { area: null, readers: null, purpose: null, catalogStatus: null }),
    });
  }
  return sortBy(result, 'id');
}

function policies(root, file) {
  if (!file || !exists(root, file)) return [];
  return sectionTables(readText(root, file))
    .filter((row) => /^[A-Z]{2,12}-\d{3}$/.test(row.cells[0]))
    .map((row) => ({
      id: row.cells[0],
      area: row.section,
      summary: stripMarkdown(row.cells[1] ?? ''),
      canonical: stripMarkdown(row.cells[2] ?? ''),
    }));
}

function adrs(root, glob) {
  return findFiles(root, glob)
    .map((file) => {
      const markdown = readText(root, file);
      const heading = firstHeading(markdown) ?? '';
      const match = heading.match(/^(ADR-\d+)\s*(?::|—|–|-)\s*(.+)$/);
      return {
        id: match?.[1] ?? path.posix.basename(file, '.md'),
        title: match?.[2] ?? heading,
        status:
          stripMarkdown(headerField(markdown, 'Status') ?? '')
            .split(/\s+—\s+/)[0]
            .trim() || null,
        date: headerField(markdown, 'Date'),
        file,
      };
    })
    .filter((adr) => /^ADR-\d+$/.test(adr.id));
}

const LAYER_VALUES = new Set(['Todo', 'In progress', 'Done', 'N/A']);

export function parseLayer(text) {
  const match = text.match(/Layer:\s*PRD=([^,]+),\s*BE=([^,]+),\s*FE=([^,.\n]+)/);
  if (!match) return null;
  const [prd, be, fe] = match.slice(1).map((value) => value.trim());
  return { prd, be, fe, valid: [prd, be, fe].every((value) => LAYER_VALUES.has(value)) };
}

/** Open items under `## <section>` of a TODO file; an item may continue on indented lines. */
export function todoItems(markdown, section = 'Active work') {
  const lines = markdown.split('\n');
  const start = lines.findIndex((line) => line.trim() === `## ${section}`);
  if (start < 0) return [];
  const blocks = [];
  for (const line of lines.slice(start + 1)) {
    if (/^##\s/.test(line)) break;
    if (/^- \[[ x]\]/.test(line)) blocks.push(line);
    else if (blocks.length && /^\s{2,}\S/.test(line))
      blocks[blocks.length - 1] += `\n${line.trim()}`;
  }
  return blocks.map((block) => {
    const head = block.match(
      /^- \[([ x])\] \*\*(.+?)\*\* \((.+?)\) — \*\*([A-Z0-9][A-Z0-9-]+):\s*(.+?)\*\*([\s\S]*)$/,
    );
    if (!head) return { id: null, raw: block.slice(0, 200), parsed: false };
    const [, checked, status, ownerText, id, title, rest] = head;
    return {
      id,
      title: title.replace(/\.$/, ''),
      status,
      done: checked === 'x',
      owner: ownerText.split(/\s+—\s+/)[0].trim(),
      since: ownerText.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? null,
      policies: policyIds(rest.match(/Policies:([^\n]*)/)?.[1] ?? ''),
      blocker: rest.match(/Blocker:\s*([^\n]+)/)?.[1]?.trim() ?? null,
      layer: parseLayer(block),
      summary: stripMarkdown(rest).replace(/\s+/g, ' ').slice(0, 280),
      parsed: true,
    };
  });
}

/** `## Role` headings in a role-flow document. */
function roleFlows(root, file) {
  if (!file || !exists(root, file)) return [];
  return [...readText(root, file).matchAll(/^##\s+(.+?)\s*$/gm)]
    .map((match) => match[1])
    .filter((heading) => !/^Saat |^Cara |^Pilih /.test(heading));
}

/** UX matrix table rows: | Role | Alur | criterion… |. Missing file → null source. */
function uxMatrix(root, file, criteria) {
  if (!file || !exists(root, file)) return { source: null, criteria, rows: [] };
  const rows = sectionTables(readText(root, file))
    .filter((row) => row.header[0] === 'Role' && row.header[1] === 'Alur')
    .map((row) => ({
      role: stripMarkdown(row.cells[0]),
      flow: stripMarkdown(row.cells[1]),
      scores: Object.fromEntries(
        row.header.slice(2).map((name, index) => [name, stripMarkdown(row.cells[index + 2] ?? '')]),
      ),
    }));
  return { source: file, criteria, rows };
}

/**
 * config.markdown = {
 *   features: { dir, catalog, navigationFiles, ignoreFolders },
 *   policies: "docs/POLICY_REGISTRY.md", adrs: "docs/adr/ADR-*.md",
 *   todo: { file, section }, roleFlows: "...", uxMatrix: { file, criteria: [...] }
 * }
 */
export const markdownDocsAdapter = {
  id: 'markdown',
  extract({ root, config }) {
    const settings = config.markdown ?? {};
    const todoFile = settings.todo?.file;
    const todo =
      todoFile && exists(root, todoFile)
        ? todoItems(readText(root, todoFile), settings.todo.section)
        : [];
    const warnings = todo
      .filter((item) => !item.parsed)
      .map((item) => ({
        adapter: 'markdown',
        file: todoFile,
        reason: `todo-unparsed:${item.raw.slice(0, 60)}`,
      }));
    return {
      features: settings.features ? features(root, settings.features) : [],
      policies: policies(root, settings.policies),
      adrs: settings.adrs ? adrs(root, settings.adrs) : [],
      todo: todo.filter((item) => item.parsed),
      uxMatrix: {
        roles: roleFlows(root, settings.roleFlows),
        ...uxMatrix(root, settings.uxMatrix?.file, settings.uxMatrix?.criteria ?? []),
      },
      warnings,
    };
  },
};
