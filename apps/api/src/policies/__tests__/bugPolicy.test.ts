import assert from 'node:assert';
import { describe, test } from 'node:test';
import type { UpdateBugInput } from '@qlick/contracts';
import {
  assertBugStatusTransition,
  assertCanCreateBug,
  assertCanReadBug,
  assertCanUpdateBug,
} from '../bugPolicy.js';

const assignedInput: UpdateBugInput = {
  workspaceId: '10000000-0000-4000-8000-000000000001',
  bugId: '10000000-0000-4000-8000-000000000002',
  status: 'in_progress',
};

describe('Bug policy', () => {
  test('allows only Owner, Admin, and QA to open Bugs', () => {
    for (const role of ['owner', 'admin', 'qa'] as const) {
      assert.doesNotThrow(() => assertCanCreateBug(role));
    }
    for (const role of ['po', 'dev'] as const) {
      assert.throws(() => assertCanCreateBug(role), /FORBIDDEN/);
    }
  });

  test('keeps Developer read and mutation access limited to assigned Bugs', () => {
    assert.doesNotThrow(() => assertCanReadBug('dev', 'dev-1', 'dev-1'));
    assert.throws(() => assertCanReadBug('dev', 'dev-1', 'dev-2'), /assigned/);
    assert.doesNotThrow(() => assertCanUpdateBug('dev', 'dev-1', 'dev-1', assignedInput));
    assert.throws(
      () => assertCanUpdateBug('dev', 'dev-1', 'dev-1', { ...assignedInput, severity: 'critical' }),
      /status and resolution notes/,
    );
    assert.throws(() => assertCanUpdateBug('dev', 'dev-1', 'dev-2', assignedInput), /assigned/);
  });

  test('enforces Developer work and independent QA verification transitions', () => {
    assert.doesNotThrow(() => assertBugStatusTransition('dev', 'open', 'in_progress'));
    assert.doesNotThrow(() => assertBugStatusTransition('dev', 'in_progress', 'resolved'));
    assert.throws(() => assertBugStatusTransition('dev', 'resolved', 'verified'), /FORBIDDEN/);
    assert.doesNotThrow(() => assertBugStatusTransition('qa', 'resolved', 'verified'));
    assert.doesNotThrow(() => assertBugStatusTransition('qa', 'verified', 'reopened'));
    assert.throws(() => assertBugStatusTransition('qa', 'open', 'resolved'), /FORBIDDEN/);
    assert.throws(() => assertBugStatusTransition('po', 'resolved', 'verified'), /read-only/);
  });
});
