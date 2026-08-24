import assert from 'node:assert';
import { describe, test } from 'node:test';
import {
  assertCanCreateTestCase,
  assertCanExecuteTestRun,
  assertCanImportTestCases,
  assertCanManageTestCaseDefinition,
  assertCanReadTestManagement,
  assertCanUpdateTestCase,
} from '../testManagementPolicy.js';

describe('Test Management Policy Unit Tests', () => {
  test('allows every active workspace role to read persisted test history', () => {
    for (const role of ['owner', 'admin', 'po', 'qa', 'dev'] as const) {
      assert.doesNotThrow(() => assertCanReadTestManagement(role));
    }
  });

  test('keeps published Test Case governance with planners while QA draft authority is scoped separately', () => {
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

  test('allows QA to create draft candidates while Dev remains restricted', () => {
    assert.doesNotThrow(() => assertCanCreateTestCase('po'));
    assert.doesNotThrow(() => assertCanCreateTestCase('admin'));
    assert.doesNotThrow(() => assertCanCreateTestCase('owner'));
    assert.doesNotThrow(() => assertCanCreateTestCase('qa'));
    assert.throws(
      () => assertCanCreateTestCase('dev'),
      /Only QA, Product Owner, Admin, or Owner members/,
    );
  });

  test('allows QA to edit drafts and submit review, but not change published cases', () => {
    assert.doesNotThrow(() => assertCanUpdateTestCase('po', 'active', 'active'));
    assert.doesNotThrow(() => assertCanUpdateTestCase('admin', 'active', 'archived'));
    assert.doesNotThrow(() => assertCanUpdateTestCase('owner', 'in_review', 'active'));
    assert.doesNotThrow(() => assertCanUpdateTestCase('qa', 'draft', 'draft'));
    assert.doesNotThrow(() => assertCanUpdateTestCase('qa', 'draft', 'in_review'));
    assert.throws(() => assertCanUpdateTestCase('qa', 'draft', 'active'), /QA can edit only draft/);
    assert.throws(
      () => assertCanUpdateTestCase('qa', 'active', 'active'),
      /QA can edit only draft/,
    );
    assert.throws(
      () => assertCanUpdateTestCase('po', 'draft', 'active'),
      /Invalid Test Case lifecycle transition/,
    );
    assert.throws(
      () => assertCanUpdateTestCase('owner', 'archived', 'active'),
      /Invalid Test Case lifecycle transition/,
    );
    assert.throws(() => assertCanUpdateTestCase('dev', 'draft', 'draft'), /QA can edit only draft/);
  });

  test('allows QA create-only imports but keeps update import planner-only', () => {
    assert.doesNotThrow(() => assertCanImportTestCases('po'));
    assert.doesNotThrow(() => assertCanImportTestCases('admin'));
    assert.doesNotThrow(() => assertCanImportTestCases('owner'));
    assert.doesNotThrow(() => assertCanImportTestCases('qa'));
    assert.throws(() => assertCanImportTestCases('qa', 'update'), /update import is planner-only/);
    assert.throws(() => assertCanImportTestCases('dev'), /update import is planner-only/);
  });
});
