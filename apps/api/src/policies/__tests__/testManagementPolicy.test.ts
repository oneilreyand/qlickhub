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

  test('allows planners to create test cases but restricts QA and Dev', () => {
    assert.doesNotThrow(() => assertCanCreateTestCase('po'));
    assert.doesNotThrow(() => assertCanCreateTestCase('admin'));
    assert.doesNotThrow(() => assertCanCreateTestCase('owner'));
    assert.throws(
      () => assertCanCreateTestCase('qa'),
      /Only Product Owner, Admin, or Owner members/,
    );
    assert.throws(
      () => assertCanCreateTestCase('dev'),
      /Only Product Owner, Admin, or Owner members/,
    );
  });

  test('allows planners to update test cases but restricts QA and Dev', () => {
    assert.doesNotThrow(() => assertCanUpdateTestCase('po'));
    assert.doesNotThrow(() => assertCanUpdateTestCase('admin'));
    assert.doesNotThrow(() => assertCanUpdateTestCase('owner'));
    assert.throws(
      () => assertCanUpdateTestCase('qa'),
      /Only Product Owner, Admin, or Owner members/,
    );
    assert.throws(
      () => assertCanUpdateTestCase('dev'),
      /Only Product Owner, Admin, or Owner members/,
    );
  });

  test('allows planners to import test cases but restricts QA and Dev', () => {
    assert.doesNotThrow(() => assertCanImportTestCases('po'));
    assert.doesNotThrow(() => assertCanImportTestCases('admin'));
    assert.doesNotThrow(() => assertCanImportTestCases('owner'));
    assert.throws(
      () => assertCanImportTestCases('qa'),
      /Only Product Owner, Admin, or Owner members/,
    );
    assert.throws(
      () => assertCanImportTestCases('dev'),
      /Only Product Owner, Admin, or Owner members/,
    );
  });
});
