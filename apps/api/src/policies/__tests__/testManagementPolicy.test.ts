import assert from 'node:assert';
import { describe, test } from 'node:test';
import {
  assertCanAddTestResultEvidence,
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

  test('allows only QA to execute runs and keeps governance roles read-only', () => {
    assert.doesNotThrow(() => assertCanExecuteTestRun('qa'));
    for (const role of ['owner', 'admin', 'po', 'dev'] as const) {
      assert.throws(() => assertCanExecuteTestRun(role), /Only QA Engineer members/);
      assert.throws(() => assertCanAddTestResultEvidence(role), /Only QA Engineer members/);
    }
    assert.doesNotThrow(() => assertCanAddTestResultEvidence('qa'));
  });

  test('allows only QA to create draft candidates', () => {
    assert.doesNotThrow(() => assertCanCreateTestCase('qa'));
    for (const role of ['owner', 'admin', 'po', 'dev'] as const) {
      assert.throws(() => assertCanCreateTestCase(role), /Only QA Engineer members/);
    }
  });

  test('allows QA to activate only a draft whose scope the service has proven', () => {
    assert.doesNotThrow(() => assertCanUpdateTestCase('po', 'active', 'active'));
    assert.doesNotThrow(() => assertCanUpdateTestCase('admin', 'active', 'archived'));
    assert.doesNotThrow(() => assertCanUpdateTestCase('owner', 'in_review', 'active'));
    assert.doesNotThrow(() => assertCanUpdateTestCase('po', 'in_review', 'draft'));
    assert.doesNotThrow(() => assertCanUpdateTestCase('qa', 'draft', 'draft'));
    assert.doesNotThrow(() => assertCanUpdateTestCase('qa', 'draft', 'in_review'));
    assert.doesNotThrow(() => assertCanUpdateTestCase('qa', 'draft', 'active', false, true));
    assert.throws(
      () => assertCanUpdateTestCase('qa', 'draft', 'active'),
      /proven scope of their assigned QA Subtask/,
    );
    assert.throws(
      () => assertCanUpdateTestCase('qa', 'active', 'active'),
      /QA can edit draft Test Cases/,
    );
    assert.doesNotThrow(() => assertCanUpdateTestCase('po', 'draft', 'active'));
    assert.doesNotThrow(() => assertCanUpdateTestCase('po', 'active', 'draft'));
    assert.throws(
      () => assertCanUpdateTestCase('owner', 'archived', 'active'),
      /Invalid Test Case lifecycle transition/,
    );
    assert.throws(
      () => assertCanUpdateTestCase('dev', 'draft', 'draft'),
      /QA can edit draft Test Cases/,
    );
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
