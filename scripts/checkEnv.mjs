import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const repositoryRoot = process.cwd();
const backendPath = path.join(repositoryRoot, '.env');
const frontendCandidates = [
  path.join(repositoryRoot, 'apps/web/.env.local'),
  path.join(repositoryRoot, 'apps/web/.env'),
];

const errors = [];
const warnings = [];

const parseEnvFile = (filePath) => {
  if (!existsSync(filePath)) return null;

  const values = new Map();
  const duplicates = new Set();

  for (const rawLine of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separatorIndex = line.indexOf('=');
    if (separatorIndex <= 0) continue;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;

    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }

    if (values.has(key)) duplicates.add(key);
    values.set(key, value);
  }

  return { values, duplicates };
};

const requireKeys = (label, parsed, keys) => {
  for (const key of keys) {
    if (!parsed.values.get(key)) errors.push(`${label}: missing ${key}`);
  }
};

const validatePostgresUrl = (label, value) => {
  if (!value) return;
  try {
    const url = new URL(value);
    if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
      errors.push(`${label}: must use postgres:// or postgresql://`);
    }
    if (!url.hostname || !url.pathname.slice(1)) {
      errors.push(`${label}: incomplete PostgreSQL URI`);
    }
    if (!url.password) errors.push(`${label}: database password is missing`);
  } catch {
    errors.push(`${label}: invalid PostgreSQL URI`);
  }
};

const backend = parseEnvFile(backendPath);
if (!backend) {
  errors.push('backend: .env is missing');
} else {
  requireKeys('backend', backend, [
    'NODE_ENV',
    'PORT',
    'DATABASE_URL',
    'DATABASE_SSL',
    'JWT_ACCESS_SECRET',
    'JWT_ISSUER',
    'JWT_AUDIENCE',
    'JWT_ACCESS_TTL_MINUTES',
    'CORS_ORIGIN',
    'COOKIE_SAME_SITE',
    'ATTACHMENT_STORAGE_PROVIDER',
  ]);

  validatePostgresUrl('DATABASE_URL', backend.values.get('DATABASE_URL'));
  validatePostgresUrl('MIGRATION_DATABASE_URL', backend.values.get('MIGRATION_DATABASE_URL'));
  validatePostgresUrl('PRODUCTION_DATABASE_URL', backend.values.get('PRODUCTION_DATABASE_URL'));
  validatePostgresUrl('TEST_DATABASE_URL', backend.values.get('TEST_DATABASE_URL'));

  if ((backend.values.get('JWT_ACCESS_SECRET') || '').length < 32) {
    errors.push('backend: JWT_ACCESS_SECRET must contain at least 32 characters');
  }
  if (
    backend.values.get('NODE_ENV') === 'production' &&
    backend.values.get('DATABASE_SSL') !== 'true'
  ) {
    errors.push('backend: DATABASE_SSL=true is required in production');
  }
  if (backend.values.has('DATABASE_POOL_MAX')) {
    const poolMaxRaw = backend.values.get('DATABASE_POOL_MAX');
    if (poolMaxRaw !== '') {
      const poolMax = Number.parseInt(poolMaxRaw, 10);
      if (
        Number.isNaN(poolMax) ||
        poolMax < 1 ||
        poolMax > 50 ||
        String(poolMax) !== poolMaxRaw.trim()
      ) {
        errors.push('backend: DATABASE_POOL_MAX must be an integer between 1 and 50');
      }
    }
  }
  if ((backend.values.get('CORS_ORIGIN') || '').split(',').some((value) => value.trim() === '*')) {
    errors.push('backend: CORS_ORIGIN must not contain a wildcard');
  }
  for (const key of backend.values.keys()) {
    if (key.startsWith('VITE_')) {
      errors.push(`backend: browser variable ${key} belongs in apps/web/.env.local`);
    }
  }
  for (const key of backend.duplicates) errors.push(`backend: duplicate key ${key}`);

  if (backend.values.has('SUPABASE_URL') || backend.values.has('SUPABASE_PUBLISHABLE_KEY')) {
    warnings.push('backend: unused Supabase Data API variables remain configured');
  }
}

const frontendPath = frontendCandidates.find((candidate) => existsSync(candidate));
const frontend = frontendPath ? parseEnvFile(frontendPath) : null;
if (!frontend) {
  errors.push('frontend: apps/web/.env.local is missing');
} else {
  requireKeys('frontend', frontend, ['VITE_API_URL']);
  const frontendApiUrl = frontend.values.get('VITE_API_URL') || '';
  const isRootRelativeUrl = frontendApiUrl.startsWith('/') && !frontendApiUrl.startsWith('//');
  if (!isRootRelativeUrl) {
    try {
      new URL(frontendApiUrl);
    } catch {
      errors.push('frontend: VITE_API_URL must be an absolute URL or a root-relative path');
    }
  }

  const forbiddenFrontendKey =
    /(DATABASE|PASSWORD|PRIVATE_KEY|SERVICE_ROLE|JWT_.*SECRET|SECRET_KEY)/i;
  for (const key of frontend.values.keys()) {
    if (!key.startsWith('VITE_')) {
      errors.push(`frontend: ${key} must use the VITE_ prefix or move to backend`);
    }
    if (forbiddenFrontendKey.test(key)) {
      errors.push(`frontend: secret-like variable ${key} is forbidden`);
    }
  }
  for (const key of frontend.duplicates) errors.push(`frontend: duplicate key ${key}`);
}

for (const warning of warnings) console.warn(`WARN ${warning}`);
for (const error of errors) console.error(`ERROR ${error}`);

if (errors.length > 0) {
  console.error(
    `Environment validation failed (${errors.length} error(s), ${warnings.length} warning(s)).`,
  );
  process.exit(1);
}

console.log(
  `Environment validation passed (${warnings.length} warning(s)); no values were printed.`,
);
