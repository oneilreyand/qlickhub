import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const patternsFile = path.join(repositoryRoot, 'quality', 'tier2-paths.txt');

export function parsePatterns(text) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));
}

export function globToRegExp(glob) {
  let source = '';
  for (let index = 0; index < glob.length; index += 1) {
    const character = glob[index];
    if (character === '*' && glob[index + 1] === '*') {
      const followedBySlash = glob[index + 2] === '/';
      source += followedBySlash ? '(?:.*/)?' : '.*';
      index += followedBySlash ? 2 : 1;
    } else if (character === '*') {
      source += '[^/]*';
    } else if (character === '?') {
      source += '[^/]';
    } else {
      source += character.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
  }
  return new RegExp(`^${source}$`);
}

export function matchTier2(changedFiles, patterns) {
  const expressions = patterns.map((pattern) => ({ pattern, expression: globToRegExp(pattern) }));
  return changedFiles
    .map((file) => ({ file, match: expressions.find(({ expression }) => expression.test(file)) }))
    .filter(({ match }) => match)
    .map(({ file, match }) => ({ file, pattern: match.pattern }));
}

export function evaluateTier({ changedFiles, patterns, approved }) {
  const matches = matchTier2(changedFiles, patterns);
  if (matches.length === 0) return { tier: 1, pass: true, matches };
  return { tier: 2, pass: approved, matches };
}

function changedFilesFromGit(base) {
  // --no-renames lists both the old and the new path, so renaming or deleting a Tier 2 file counts.
  const range = base ? [base, 'HEAD'] : ['HEAD^1', 'HEAD'];
  return execFileSync('git', ['diff', '--name-only', '--no-renames', ...range], {
    cwd: repositoryRoot,
    encoding: 'utf8',
  })
    .split('\n')
    .map((file) => file.trim())
    .filter(Boolean);
}

function parseArguments(argv) {
  const options = { base: undefined, approved: false };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--base') options.base = argv[++index];
    if (argv[index] === '--approved') options.approved = argv[++index] === 'true';
  }
  return options;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const options = parseArguments(process.argv.slice(2));
  const patterns = parsePatterns(fs.readFileSync(patternsFile, 'utf8'));
  const result = evaluateTier({
    changedFiles: changedFilesFromGit(options.base),
    patterns,
    approved: options.approved,
  });
  if (result.tier === 1) {
    console.log('Tier 1: no Tier 2 path changed. Auto-merge may proceed after required checks.');
  } else {
    console.log(`Tier 2: ${result.matches.length} file(s) need the owner-approved label:`);
    for (const { file, pattern } of result.matches) console.log(`- ${file} (matches ${pattern})`);
    if (result.pass) {
      console.log('owner-approved label present for the current commits.');
    } else {
      console.error(
        'Missing owner-approved label for the current commits. Ask the Owner to review.',
      );
      process.exitCode = 1;
    }
  }
}
