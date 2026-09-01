import assert from 'node:assert';
import { test } from 'node:test';
import { normalizeEnvironmentInput } from '../env.js';

test('trims the attachment storage provider before validation', () => {
  const input = {
    ATTACHMENT_STORAGE_PROVIDER: 'google_drive\n',
    DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/qa_management_test',
  };

  const normalized = normalizeEnvironmentInput(input);

  assert.strictEqual(normalized.ATTACHMENT_STORAGE_PROVIDER, 'google_drive');
  assert.strictEqual(input.ATTACHMENT_STORAGE_PROVIDER, 'google_drive\n');
});
