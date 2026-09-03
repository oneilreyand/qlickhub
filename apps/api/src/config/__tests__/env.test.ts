import assert from 'node:assert';
import { test } from 'node:test';
import { normalizeEnvironmentInput, parseEnvironment } from '../env.js';

test('trims the attachment storage provider before validation', () => {
  const input = {
    ATTACHMENT_STORAGE_PROVIDER: 'google_drive\n',
    DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/qa_management_test',
  };

  const normalized = normalizeEnvironmentInput(input);

  assert.strictEqual(normalized.ATTACHMENT_STORAGE_PROVIDER, 'google_drive');
  assert.strictEqual(input.ATTACHMENT_STORAGE_PROVIDER, 'google_drive\n');
});

const validProductionEnvironment = (overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv => ({
  NODE_ENV: 'production',
  DATABASE_URL: 'postgres://postgres:postgres@example.com:5432/qlickhub',
  DATABASE_SSL: 'true',
  JWT_ACCESS_SECRET: 'production-jwt-secret-with-at-least-32-characters',
  CORS_ORIGIN: 'https://qlickhub.example.com',
  APP_URL: 'https://qlickhub.example.com',
  SMTP_USER: 'mailer@example.com',
  SMTP_PASS: 'test-only-smtp-password',
  ATTACHMENT_STORAGE_PROVIDER: 'local',
  LINK_PREVIEW_RATE_LIMIT_STORE: 'upstash',
  UPSTASH_REDIS_REST_URL: 'https://example.upstash.io',
  UPSTASH_REDIS_REST_TOKEN: 'test-only-upstash-token',
  RATE_LIMIT_KEY_SECRET: 'test-only-rate-limit-key-secret-32-chars',
  ...overrides,
});

test('defaults link-preview rate limiting to memory outside production', () => {
  const parsed = parseEnvironment({ NODE_ENV: 'test' });

  assert.strictEqual(parsed.LINK_PREVIEW_RATE_LIMIT_STORE, 'memory');
});

test('requires the distributed Upstash store and credentials in production', () => {
  const parsed = parseEnvironment(validProductionEnvironment());

  assert.strictEqual(parsed.LINK_PREVIEW_RATE_LIMIT_STORE, 'upstash');
  assert.strictEqual(parsed.UPSTASH_REDIS_REST_URL, 'https://example.upstash.io');

  assert.throws(
    () => parseEnvironment(validProductionEnvironment({ LINK_PREVIEW_RATE_LIMIT_STORE: 'memory' })),
    /LINK_PREVIEW_RATE_LIMIT_STORE=upstash is required in production and Vercel Preview/,
  );

  assert.throws(
    () => parseEnvironment(validProductionEnvironment({ UPSTASH_REDIS_REST_TOKEN: undefined })),
    /UPSTASH_REDIS_REST_TOKEN must be configured/,
  );
});

test('requires and defaults to Upstash for Vercel Preview', () => {
  const previewEnvironment: NodeJS.ProcessEnv = {
    NODE_ENV: 'development',
    VERCEL_ENV: 'preview',
    UPSTASH_REDIS_REST_URL: 'https://example.upstash.io',
    UPSTASH_REDIS_REST_TOKEN: 'test-only-upstash-token',
    RATE_LIMIT_KEY_SECRET: 'test-only-rate-limit-key-secret-32-chars',
  };

  const parsed = parseEnvironment(previewEnvironment);
  assert.strictEqual(parsed.LINK_PREVIEW_RATE_LIMIT_STORE, 'upstash');

  assert.throws(
    () =>
      parseEnvironment({
        ...previewEnvironment,
        LINK_PREVIEW_RATE_LIMIT_STORE: 'memory',
      }),
    /LINK_PREVIEW_RATE_LIMIT_STORE=upstash is required in production and Vercel Preview/,
  );
});
