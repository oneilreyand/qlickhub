import fs from 'node:fs';
import path from 'node:path';

const SKIP_DIRECTORIES = new Set(['node_modules', '.git', 'dist', 'coverage', '.docsys']);

/** Converts a small glob (`**`, `*`, `?`) into a RegExp matched against a POSIX relative path. */
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

function walk(directory, root, out) {
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (SKIP_DIRECTORIES.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute, root, out);
    else if (entry.isFile()) out.push(path.relative(root, absolute).split(path.sep).join('/'));
  }
}

/**
 * Lists files under `root` matching any include glob and no exclude glob.
 * Results are POSIX relative paths, sorted for deterministic output.
 */
export function findFiles(root, include, exclude = []) {
  const includes = [].concat(include).map(globToRegExp);
  const excludes = [].concat(exclude).map(globToRegExp);
  const staticPrefix = (glob) => glob.split(/[*?]/)[0].replace(/[^/]*$/, '');
  const bases = [...new Set([].concat(include).map(staticPrefix))];
  const all = new Set();
  for (const base of bases) {
    const found = [];
    walk(path.join(root, base), root, found);
    for (const file of found) all.add(file);
  }
  return [...all]
    .filter((file) => includes.some((re) => re.test(file)))
    .filter((file) => !excludes.some((re) => re.test(file)))
    .sort();
}

export function readText(root, relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

export function exists(root, relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

export function readJson(root, relativePath) {
  return JSON.parse(readText(root, relativePath));
}

/** Sorts an array of objects by the given keys, returning a new array. */
export function sortBy(items, ...keys) {
  return [...items].sort((a, b) => {
    for (const key of keys) {
      const left = String(a[key] ?? '');
      const right = String(b[key] ?? '');
      if (left < right) return -1;
      if (left > right) return 1;
    }
    return 0;
  });
}
