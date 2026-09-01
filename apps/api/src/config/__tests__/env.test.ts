import assert from 'node:assert';
import { describe, test } from 'node:test';
import { normalizeEnvironmentInput, parseEnvironment } from '../env.js';

describe('Environment validation', () => {
  test('trims the attachment storage provider before validation', () => {
    const input = {
      ATTACHMENT_STORAGE_PROVIDER: 'google_drive\n',
      DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/qa_management_test',
    };

    const normalized = normalizeEnvironmentInput(input);

    assert.strictEqual(normalized.ATTACHMENT_STORAGE_PROVIDER, 'google_drive');
    assert.strictEqual(input.ATTACHMENT_STORAGE_PROVIDER, 'google_drive\n');
  });

  test('parses valid DATABASE_POOL_MAX in development', () => {
    const config = parseEnvironment({
      NODE_ENV: 'development',
      DATABASE_POOL_MAX: '15',
      DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/qa_management_dev',
    });

    assert.strictEqual(config.DATABASE_POOL_MAX, 15);
  });

  test('leaves DATABASE_POOL_MAX as undefined when omitted or empty', () => {
    const omittedConfig = parseEnvironment({
      NODE_ENV: 'development',
      DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/qa_management_dev',
    });
    assert.strictEqual(omittedConfig.DATABASE_POOL_MAX, undefined);

    const emptyConfig = parseEnvironment({
      NODE_ENV: 'development',
      DATABASE_POOL_MAX: '',
      DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/qa_management_dev',
    });
    assert.strictEqual(emptyConfig.DATABASE_POOL_MAX, undefined);
  });

  test('rejects DATABASE_POOL_MAX below 1', () => {
    assert.throws(
      () =>
        parseEnvironment({
          NODE_ENV: 'development',
          DATABASE_POOL_MAX: '0',
          DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/qa_management_dev',
        }),
      /Invalid environment variables for API/,
    );
  });

  test('rejects DATABASE_POOL_MAX above 50', () => {
    assert.throws(
      () =>
        parseEnvironment({
          NODE_ENV: 'development',
          DATABASE_POOL_MAX: '51',
          DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/qa_management_dev',
        }),
      /Invalid environment variables for API/,
    );
  });

  test('rejects non-integer DATABASE_POOL_MAX', () => {
    assert.throws(
      () =>
        parseEnvironment({
          NODE_ENV: 'development',
          DATABASE_POOL_MAX: 'invalid-number',
          DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/qa_management_dev',
        }),
      /Invalid environment variables for API/,
    );
  });
});
