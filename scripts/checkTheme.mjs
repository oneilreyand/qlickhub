import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '..');
const sourceDirectories = ['apps/web/src/components', 'apps/web/src/pages'];

const visualUtility =
  /\b(?:bg|text|border|ring|outline|fill|stroke)-(?:\[#[\da-fA-F]{3,8}\]|(?:stone|slate|zinc|neutral|gray|emerald|amber|rose|blue|sky|indigo|violet)-\d{2,3}|white|black)\b/;
const themeStrategy =
  /(?:\bdark:|\b(?:bg|text|border|ring|outline|fill|stroke)-(?:canvas|surface(?:-elevated)?|foreground|muted-foreground|border)\b)/;
const invariantMedia = /theme-check:\s*invariant-media\s*[—-]\s*\S+/;
const darkApplicationSurface = /\bbg-(?:\[#(?:141413|151a20)\]|(?:stone|slate|zinc)-(?:8|9)00)\b/;
const unconditionalBrandDarkSurface = /\bbg-\[#(?:141413|151a20)\](?!\/)/;
const staticClassName = /\bclassName\s*=\s*["']([^"']*)["']/g;

function collectTsxFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return entry.name === '__tests__' ? [] : collectTsxFiles(entryPath);
    }
    return entry.isFile() && entry.name.endsWith('.tsx') ? [entryPath] : [];
  });
}

export function evaluateThemeSource(relativePath, source) {
  if (!visualUtility.test(source)) return [];

  const hasInvariantMediaReason = invariantMedia.test(source);
  const hasThemeStrategy = themeStrategy.test(source);
  const violations = [];

  if (!hasThemeStrategy && !hasInvariantMediaReason) {
    violations.push(
      `${relativePath}: visual module needs semantic theme tokens or a paired dark: treatment.`,
    );
  }

  if (darkApplicationSurface.test(source) && !hasThemeStrategy && !hasInvariantMediaReason) {
    violations.push(
      `${relativePath}: unconditional dark application surface needs a Light/Dark counterpart.`,
    );
  }

  for (const match of source.matchAll(staticClassName)) {
    const classNames = match[1];
    if (
      unconditionalBrandDarkSurface.test(classNames) &&
      !classNames.includes('dark:') &&
      !hasInvariantMediaReason
    ) {
      violations.push(
        `${relativePath}: unconditional dark application surface in this className needs a Light/Dark counterpart.`,
      );
    }
  }

  return violations;
}

export function checkThemeCoverage(rootDirectory = repositoryRoot) {
  return sourceDirectories.flatMap((relativeDirectory) => {
    const directory = path.join(rootDirectory, relativeDirectory);
    return collectTsxFiles(directory).flatMap((file) => {
      const relativePath = path.relative(rootDirectory, file);
      return evaluateThemeSource(relativePath, fs.readFileSync(file, 'utf8'));
    });
  });
}

function main() {
  const violations = checkThemeCoverage();
  if (violations.length === 0) {
    console.log('Theme coverage check passed.');
    return;
  }

  console.error('Theme coverage check failed:');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exitCode = 1;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (fileURLToPath(import.meta.url) === invokedPath) main();
