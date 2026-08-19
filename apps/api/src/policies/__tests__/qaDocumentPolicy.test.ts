import assert from 'node:assert';
import { describe, test } from 'node:test';
import {
  assertCanCreateQaDocument,
  assertCanManageProductBrief,
  assertCanLinkQaDocument,
} from '../qaDocumentPolicy.js';

describe('QA Document Policy Unit Tests', () => {
  const qaActorId = '00000000-0000-4000-8000-000000000001';
  const otherActorId = '00000000-0000-4000-8000-000000000002';

  test('allows QA, Admin, and Owner to create or edit QA documents', () => {
    assert.doesNotThrow(() => assertCanCreateQaDocument('owner'));
    assert.doesNotThrow(() => assertCanCreateQaDocument('admin'));
    assert.doesNotThrow(() => assertCanCreateQaDocument('qa'));
  });

  test('blocks PO and Dev from creating or editing QA documents', () => {
    assert.throws(
      () => assertCanCreateQaDocument('po'),
      /Only QA Engineer, Admin, or Owner members can create or edit QA documents/
    );
    assert.throws(
      () => assertCanCreateQaDocument('dev'),
      /Only QA Engineer, Admin, or Owner members can create or edit QA documents/
    );
  });

  test('allows PO, Admin, and Owner to manage Product Brief', () => {
    assert.doesNotThrow(() => assertCanManageProductBrief('owner'));
    assert.doesNotThrow(() => assertCanManageProductBrief('admin'));
    assert.doesNotThrow(() => assertCanManageProductBrief('po'));
    assert.throws(() => assertCanManageProductBrief('qa'), /Only Product Owner, Admin, or Owner/);
    assert.throws(() => assertCanManageProductBrief('dev'), /Only Product Owner, Admin, or Owner/);
  });

  test('enforces QA document task linking authorization', () => {
    const parentTask = { parentTaskId: null, assigneeId: null };
    const subtask = { parentTaskId: 'parent-1', assigneeId: qaActorId };

    // Owner and Admin can link to anything
    assert.doesNotThrow(() => assertCanLinkQaDocument('owner', qaActorId, parentTask));
    assert.doesNotThrow(() => assertCanLinkQaDocument('admin', qaActorId, parentTask));

    // QA can link to parent task and subtask
    assert.doesNotThrow(() => assertCanLinkQaDocument('qa', qaActorId, parentTask));
    assert.doesNotThrow(() => assertCanLinkQaDocument('qa', qaActorId, subtask));

    // PO and Dev are blocked from linking QA documents
    assert.throws(
      () => assertCanLinkQaDocument('po', qaActorId, parentTask),
      /Only QA Engineer, Admin, or Owner/
    );
    assert.throws(
      () => assertCanLinkQaDocument('dev', otherActorId, parentTask),
      /Only QA Engineer, Admin, or Owner/
    );
  });
});
