import assert from 'node:assert/strict';
import test from 'node:test';

import { inspectEnvExample, listEnvExamples } from './checkEnvExamples.mjs';

const reasons = (content) => inspectEnvExample(content).map((finding) => finding.reason);

test('accepts placeholders and local development URLs', () => {
  const content = [
    'DATABASE_URL=postgres://postgres:postgres@localhost:5432/qa_management_dev',
    'DATABASE_URL=postgres://postgres.YOUR_PROJECT_REF:YOUR_STRONG_PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres',
    'JWT_ACCESS_SECRET=replace-with-a-random-secret-at-least-32-characters-long',
    'JWT_ACCESS_SECRET=local-development-secret-key-min-32-chars-for-dev',
    'SMTP_PASS=replace-with-smtp-app-password',
    'VITE_FIREBASE_API_KEY=your-firebase-api-key',
    '# MIGRATION_DATABASE_URL=<session-pooler-uri>',
    'GEMINI_MODEL=gemini-2.5-flash',
  ].join('\n');
  assert.deepEqual(inspectEnvExample(content), []);
});

test('rejects a remote database URL with a real-looking password, even when commented', () => {
  assert.equal(
    reasons(
      'DATABASE_URL=postgresql://postgres.abcd:S3cr3tPw@aws-0.pooler.supabase.com:5432/postgres',
    ).length,
    1,
  );
  assert.equal(
    reasons(
      '# MIGRATION_DATABASE_URL=postgresql://postgres.abcd:S3cr3tPw@db.example.co:5432/postgres',
    ).length,
    1,
  );
});

test('rejects secret-named variables with non-placeholder values', () => {
  assert.match(reasons('SMTP_PASS=hunter2hunter2')[0], /secret-named/);
  assert.match(reasons('GEMINI_API_KEY=abc123def456')[0], /secret-named/);
  assert.deepEqual(reasons('SMTP_PASS='), []);
});

test('rejects known token formats anywhere and never echoes values', () => {
  const key = `AIza${'A'.repeat(35)}`;
  const findings = inspectEnvExample(`# VITE_FIREBASE_API_KEY=${key}`);
  assert.equal(findings.length, 1);
  assert.match(findings[0].reason, /Google API key/);
  assert.ok(!JSON.stringify(findings).includes(key));
});

test('repository example files pass', () => {
  const files = listEnvExamples();
  assert.ok(files.includes('.env.production.example'));
  assert.ok(files.some((file) => file.startsWith('apps/web/')));
});
