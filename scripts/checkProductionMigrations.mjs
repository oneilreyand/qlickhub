import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ADR-039: merge to `main` deploys Production automatically, while Production migrations are run
// manually by the Owner. This check reads the latest applied migration from the public Production
// health endpoint (no database credential in CI) and fails when the checked-out tree contains
// canonical migrations that Production has not applied yet.

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DEFAULT_HEALTH_URL = 'https://qlickhub.vercel.app/v1/health';
export const MIGRATIONS_DIR = 'apps/api/src/db/migrations';
const MIGRATION_FILE = /^\d{14}-[a-z0-9-]+\.c?js$/;

/** Canonical migration file names in timestamp order. */
export function listMigrations(directory = path.join(repositoryRoot, MIGRATIONS_DIR)) {
  return fs
    .readdirSync(directory)
    .filter((name) => MIGRATION_FILE.test(name))
    .sort();
}

/** Migrations newer than the latest applied one. Names sort by their 14-digit timestamp prefix. */
export function findPending(migrations, latestApplied) {
  if (!latestApplied) return [...migrations];
  return migrations.filter((name) => name > latestApplied);
}

/**
 * Returns `{ outcome, pending, latest, message }` where outcome is `ok`, `pending`, or
 * `unverified` (Production unreachable or not yet reporting migration status).
 */
export async function evaluate({ migrations, healthUrl, fetchImpl = fetch, timeoutMs = 10000 }) {
  let body;
  try {
    const response = await fetchImpl(healthUrl, { signal: AbortSignal.timeout(timeoutMs) });
    body = await response.json();
  } catch (error) {
    return {
      outcome: 'unverified',
      pending: [],
      latest: null,
      message: `Production health could not be read (${error instanceof Error ? error.name : 'error'}).`,
    };
  }
  const latest = body?.database?.migrations?.latest;
  if (typeof latest !== 'string' || !MIGRATION_FILE.test(latest)) {
    return {
      outcome: 'unverified',
      pending: [],
      latest: null,
      message: 'Production health does not report migration status yet.',
    };
  }
  const pending = findPending(migrations, latest);
  return {
    outcome: pending.length > 0 ? 'pending' : 'ok',
    pending,
    latest,
    message:
      pending.length > 0
        ? `Production has applied up to ${latest}; ${pending.length} migration(s) are not applied yet.`
        : `Production is up to date (${latest}).`,
  };
}

async function main() {
  const healthUrl = process.env.PRODUCTION_HEALTH_URL || DEFAULT_HEALTH_URL;
  const result = await evaluate({ migrations: listMigrations(), healthUrl });
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  const summary = [];
  if (result.outcome === 'pending') {
    const list = result.pending.join(' ');
    console.log(
      `::error title=Migrasi Production belum dijalankan::${result.message} Jalankan di Production sebelum merge (docs/DEPLOYMENT_AND_ENVIRONMENTS.md §6), lalu jalankan ulang CI: ${list}`,
    );
    summary.push('### Migrasi belum ada di Production — jalankan sebelum merge', '');
    summary.push(`Production terakhir: \`${result.latest}\``, '');
    for (const name of result.pending) summary.push(`- \`${name}\``);
    summary.push(
      '',
      'Merge ke `main` otomatis deploy Production. Langkah: docs/DEPLOYMENT_AND_ENVIRONMENTS.md §6.',
    );
  } else if (result.outcome === 'unverified') {
    console.log(`::warning title=Status migrasi Production tidak terverifikasi::${result.message}`);
    summary.push('### Status migrasi Production tidak terverifikasi', '', result.message);
  } else {
    console.log(result.message);
  }
  if (summaryPath && summary.length > 0) fs.appendFileSync(summaryPath, `${summary.join('\n')}\n`);
  process.exitCode = result.outcome === 'pending' ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
