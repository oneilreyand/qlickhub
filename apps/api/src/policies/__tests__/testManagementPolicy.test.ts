import assert from 'node:assert';
import { describe, test } from 'node:test';
import {
  assertCanExecuteTestRun,
  assertCanManageTestCaseDefinition,
  assertCanReadTestManagement,
} from '../testManagementPolicy.js';

describe('Test Management Policy Unit Tests', () => {
  test('allows every active workspace role to read persisted test history', () => {
    for (const role of ['owner', 'admin', 'po', 'qa', 'dev'] as const) {
      assert.doesNotThrow(() => assertCanReadTestManagement(role));
    }
  });

  test('allows planners to manage definitions while the QA linking decision remains pending', () => {
    assert.doesNotThrow(() => assertCanManageTestCaseDefinition('owner'));
    assert.doesNotThrow(() => assertCanManageTestCaseDefinition('admin'));
    assert.doesNotThrow(() => assertCanManageTestCaseDefinition('po'));
    assert.throws(
      () => assertCanManageTestCaseDefinition('qa'),
      /Only Product Owner, Admin, or Owner members/,
    );
    assert.throws(
      () => assertCanManageTestCaseDefinition('dev'),
      /Only Product Owner, Admin, or Owner members/,
    );
  });

  test('allows QA and administrators to execute runs but keeps Product and Dev read-only', () => {
    assert.doesNotThrow(() => assertCanExecuteTestRun('owner'));
    assert.doesNotThrow(() => assertCanExecuteTestRun('admin'));
    assert.doesNotThrow(() => assertCanExecuteTestRun('qa'));
    assert.throws(() => assertCanExecuteTestRun('po'), /Only QA Engineer, Admin, or Owner/);
    assert.throws(() => assertCanExecuteTestRun('dev'), /Only QA Engineer, Admin, or Owner/);
  });
});
