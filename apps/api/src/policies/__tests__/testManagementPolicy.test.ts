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

  test('allows QA to create draft/in_review but restricts active publishing to planners', () => {
    assert.doesNotThrow(() => assertCanCreateTestCase('qa', 'draft'));
    assert.doesNotThrow(() => assertCanCreateTestCase('qa', 'in_review'));
    assert.throws(
      () => assertCanCreateTestCase('qa', 'active'),
      /QA can only create draft or in-review/,
    );
    assert.throws(
      () => assertCanCreateTestCase('qa', 'archived'),
      /QA can only create draft or in-review/,
    );
    assert.doesNotThrow(() => assertCanCreateTestCase('po', 'active'));
    assert.doesNotThrow(() => assertCanCreateTestCase('admin', 'active'));
    assert.doesNotThrow(() => assertCanCreateTestCase('owner', 'active'));
    assert.throws(
      () => assertCanCreateTestCase('dev', 'draft'),
      /Only QA, Product Owner, Admin, or Owner/,
    );
  });

  test('enforces that QA cannot edit active/archived test cases or publish them', () => {
    assert.doesNotThrow(() => assertCanUpdateTestCase('qa', 'draft', 'in_review'));
    assert.doesNotThrow(() => assertCanUpdateTestCase('qa', 'in_review', 'draft'));
    assert.throws(
      () => assertCanUpdateTestCase('qa', 'draft', 'active'),
      /Only Product Owner, Admin, or Owner/,
    );
    assert.throws(
      () => assertCanUpdateTestCase('qa', 'active', 'active'),
      /QA cannot edit published active/,
    );
    assert.throws(
      () => assertCanUpdateTestCase('qa', 'archived', 'draft'),
      /QA cannot edit published active/,
    );
    assert.doesNotThrow(() => assertCanUpdateTestCase('po', 'active', 'archived'));
    assert.doesNotThrow(() => assertCanUpdateTestCase('admin', 'active', 'draft'));
  });

  test('enforces that QA can only import in create_only mode while planners can use update mode', () => {
    assert.doesNotThrow(() => assertCanImportTestCases('qa', 'create_only'));
    assert.throws(
      () => assertCanImportTestCases('qa', 'update'),
      /QA members cannot use update mode/,
    );
    assert.doesNotThrow(() => assertCanImportTestCases('po', 'update'));
    assert.doesNotThrow(() => assertCanImportTestCases('admin', 'update'));
    assert.doesNotThrow(() => assertCanImportTestCases('owner', 'update'));
    assert.throws(
      () => assertCanImportTestCases('dev', 'create_only'),
      /You do not have permission/,
    );
  });
});
