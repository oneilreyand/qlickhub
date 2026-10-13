import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Scaffolds SDLC records (SDLC-002):
//   npm run sdlc:new -- feature <FEATURE-ID>
//   npm run sdlc:new -- quick <TASK-ID>

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ID_PATTERN = /^[A-Z0-9][A-Z0-9-]{1,63}$/;

function today() {
  return new Date().toISOString().slice(0, 10);
}

function copyDirectory(source, target, transform) {
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const to = path.join(target, entry.name);
    if (entry.isDirectory()) copyDirectory(from, to, transform);
    else fs.writeFileSync(to, transform(fs.readFileSync(from, 'utf8')));
  }
}

export function scaffoldFeature(id, root = repositoryRoot) {
  const target = path.join(root, 'docs/features', id);
  if (fs.existsSync(target)) throw new Error(`docs/features/${id} already exists.`);
  copyDirectory(path.join(root, 'docs/features/_template'), target, (content) =>
    content
      .replaceAll('[FEATURE-ID]', id)
      .replace('**Last reviewed:** YYYY-MM-DD', `**Last reviewed:** ${today()}`),
  );
  return `docs/features/${id}`;
}

export function scaffoldQuick(id, root = repositoryRoot) {
  const target = path.join(root, 'docs/plans/quick', `${id}.md`);
  if (fs.existsSync(target)) throw new Error(`docs/plans/quick/${id}.md already exists.`);
  const template = fs.readFileSync(path.join(root, 'docs/plans/QUICK_CARD_TEMPLATE.md'), 'utf8');
  const body = template.split('```md\n')[1]?.split('\n```')[0];
  if (!body) throw new Error('Quick Card template block not found.');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${body.replaceAll('<TASK-ID>', id)}\n`);
  return `docs/plans/quick/${id}.md`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [kind, id] = process.argv.slice(2);
  try {
    if (!ID_PATTERN.test(id ?? '')) {
      throw new Error('ID must be UPPER-CASE letters, digits, and dashes, e.g. LEADER-HUB.');
    }
    if (kind === 'feature') console.log(`Created ${scaffoldFeature(id)}`);
    else if (kind === 'quick') console.log(`Created ${scaffoldQuick(id)}`);
    else throw new Error('Usage: npm run sdlc:new -- <feature|quick> <ID>');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
