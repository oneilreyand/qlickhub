import assert from 'node:assert';
import { describe, test } from 'node:test';
import {
  assertCanCreateQaSignOff,
  assertCanCreateReleaseDecision,
  assertIndependentReleaseDecision,
} from '../releaseDecisionPolicy.js';

describe('Release Decision policy', () => {
  test('allows only QA assurance roles to create QA Sign-off', () => {
    for (const role of ['owner', 'admin', 'qa'] as const) {
      assert.doesNotThrow(() => assertCanCreateQaSignOff(role));
    }
    for (const role of ['po', 'dev'] as const) {
      assert.throws(() => assertCanCreateQaSignOff(role), /FORBIDDEN/);
    }
  });

  test('allows only product decision roles to create Release Decisions', () => {
    for (const role of ['owner', 'admin', 'po'] as const) {
      assert.doesNotThrow(() => assertCanCreateReleaseDecision(role));
    }
    for (const role of ['qa', 'dev'] as const) {
      assert.throws(() => assertCanCreateReleaseDecision(role), /FORBIDDEN/);
    }
  });

  test('prevents the QA signer from deciding the same release', () => {
    assert.throws(() => assertIndependentReleaseDecision('actor-a', 'actor-a'), /FORBIDDEN/);
    assert.doesNotThrow(() => assertIndependentReleaseDecision('actor-b', 'actor-a'));
  });
});
