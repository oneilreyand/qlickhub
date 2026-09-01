import assert from 'node:assert';
import { describe, test } from 'node:test';
import {
  assertCanCancelQaSignOff,
  assertCanCancelReleaseDecision,
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

  test('enforces QA Sign-off cancellation permissions per D3', () => {
    // Owner and Admin can cancel any sign-off
    assert.doesNotThrow(() => assertCanCancelQaSignOff('owner', 'actor-owner', 'actor-signer'));
    assert.doesNotThrow(() => assertCanCancelQaSignOff('admin', 'actor-admin', 'actor-signer'));

    // Original QA signer can cancel their own sign-off
    assert.doesNotThrow(() => assertCanCancelQaSignOff('qa', 'actor-signer', 'actor-signer'));

    // Other QA cannot cancel another QA signer's sign-off
    assert.throws(
      () => assertCanCancelQaSignOff('qa', 'actor-other-qa', 'actor-signer'),
      /FORBIDDEN: A QA member cannot cancel another QA member’s sign-off/,
    );

    // PO and Dev cannot cancel QA sign-offs
    assert.throws(
      () => assertCanCancelQaSignOff('po', 'actor-po', 'actor-signer'),
      /FORBIDDEN: Only the original QA signer, Owner, or Admin can cancel a QA Sign-off/,
    );
    assert.throws(
      () => assertCanCancelQaSignOff('dev', 'actor-dev', 'actor-signer'),
      /FORBIDDEN: Only the original QA signer, Owner, or Admin can cancel a QA Sign-off/,
    );
  });

  test('enforces Release Decision cancellation permissions per D4', () => {
    // Owner, Admin, and PO can cancel Release Decisions
    assert.doesNotThrow(() => assertCanCancelReleaseDecision('owner'));
    assert.doesNotThrow(() => assertCanCancelReleaseDecision('admin'));
    assert.doesNotThrow(() => assertCanCancelReleaseDecision('po'));

    // QA and Dev cannot cancel Release Decisions
    assert.throws(
      () => assertCanCancelReleaseDecision('qa'),
      /FORBIDDEN: Only the Product Owner, Owner, or Admin can cancel a Release Decision/,
    );
    assert.throws(
      () => assertCanCancelReleaseDecision('dev'),
      /FORBIDDEN: Only the Product Owner, Owner, or Admin can cancel a Release Decision/,
    );
  });
});
