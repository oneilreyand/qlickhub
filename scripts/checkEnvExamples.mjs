import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Rejects real-looking secrets in committed `.env*.example` files. Example files are templates:
// every secret must be a visible placeholder, and remote database URLs must not carry a password.

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const PLACEHOLDER =
  /your|replace|example|changeme|change-me|placeholder|local-development|dummy|<[^>]*>|x{4,}/i;
const SECRET_KEY = /(SECRET|PASS(WORD)?|TOKEN|API_KEY|PRIVATE_KEY|SERVICE_ACCOUNT|CREDENTIALS)/;
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', 'postgres', 'db']);
const KNOWN_TOKENS = [
  [/AIza[0-9A-Za-z_-]{35}/, 'Google API key'],
  [/\bsk-[A-Za-z0-9_-]{20,}/, 'API secret key (sk-…)'],
  [/\bgh[pousr]_[A-Za-z0-9]{30,}/, 'GitHub token'],
  [/\bxox[abpr]-[A-Za-z0-9-]{10,}/, 'Slack token'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'private key'],
  [/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, 'JWT'],
];

function unquote(value) {
  const trimmed = value.trim();
  if (trimmed.length >= 2 && /^(['"]).*\1$/.test(trimmed)) return trimmed.slice(1, -1);
  return trimmed;
}

function databaseUrlProblem(value) {
  const match = value.match(/\bpostgres(?:ql)?:\/\/([^:@/\s]+):([^@\s]+)@([^:/?\s]+)/);
  if (!match) return null;
  const [, , password, host] = match;
  if (LOCAL_HOSTS.has(host.toLowerCase())) return null;
  if (PLACEHOLDER.test(password)) return null;
  return `remote database URL for host "${host}" contains a non-placeholder password`;
}

/** Returns findings as `{ line, key, reason }`; values are never echoed. */
export function inspectEnvExample(content) {
  const findings = [];
  content.split(/\r?\n/).forEach((rawLine, index) => {
    const line = index + 1;
    const commented = /^\s*#/.test(rawLine);
    const body = rawLine.replace(/^\s*#\s?/, '');
    const separator = body.indexOf('=');
    const key = separator > 0 ? body.slice(0, separator).trim() : '';
    const isAssignment = /^[A-Za-z_][A-Za-z0-9_]*$/.test(key);
    const value = isAssignment ? unquote(body.slice(separator + 1)) : body;

    for (const [pattern, label] of KNOWN_TOKENS) {
      if (pattern.test(value)) findings.push({ line, key, reason: `looks like a real ${label}` });
    }
    const urlProblem = databaseUrlProblem(value);
    if (urlProblem) findings.push({ line, key, reason: urlProblem });

    if (!commented && isAssignment && SECRET_KEY.test(key) && value && !PLACEHOLDER.test(value)) {
      findings.push({ line, key, reason: 'secret-named variable has a non-placeholder value' });
    }
  });
  return findings;
}

export function listEnvExamples(root = repositoryRoot) {
  const files = [];
  const visit = (relativeDirectory) => {
    for (const entry of fs.readdirSync(path.join(root, relativeDirectory), {
      withFileTypes: true,
    })) {
      const relative = path.join(relativeDirectory, entry.name);
      if (entry.isDirectory()) {
        if (relativeDirectory === 'apps' || relativeDirectory === 'packages') visit(relative);
      } else if (/^\.env.*\.example$/.test(entry.name)) {
        files.push(relative);
      }
    }
  };
  visit('.');
  for (const directory of ['apps', 'packages']) {
    if (fs.existsSync(path.join(root, directory))) visit(directory);
  }
  return [...new Set(files.map((file) => path.normalize(file)))].sort();
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = [];
  const files = listEnvExamples();
  for (const file of files) {
    const findings = inspectEnvExample(fs.readFileSync(path.join(repositoryRoot, file), 'utf8'));
    for (const finding of findings) {
      errors.push(`${file}:${finding.line} ${finding.key || '(line)'} — ${finding.reason}`);
    }
  }
  if (errors.length > 0) {
    console.error(`Env example check failed with ${errors.length} finding(s) (values hidden):`);
    for (const error of errors) console.error(`- ${error}`);
    console.error(
      'Example files must hold placeholders only. Keep real values in Vercel or an ignored .env, and rotate any value that was exposed.',
    );
    process.exitCode = 1;
  } else {
    console.log(`Env example check passed: ${files.length} file(s) hold placeholders only.`);
  }
}
