import assert from 'node:assert';
import { describe, test } from 'node:test';
import { assertCanWriteFeatureSpec } from '../featureSpecPolicy.js';

describe('Feature Spec write policy (AC-5.7)', () => {
  test('allows Owner, Admin, and PO', () => {
    for (const role of ['owner', 'admin', 'po'] as const) {
      assert.doesNotThrow(() => assertCanWriteFeatureSpec(role));
    }
  });

  test('rejects Developer and QA with FORBIDDEN', () => {
    for (const role of ['dev', 'qa'] as const) {
      assert.throws(() => assertCanWriteFeatureSpec(role), /^Error: FORBIDDEN:/);
    }
  });
});
