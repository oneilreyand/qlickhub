import assert from 'node:assert';
import { describe, test } from 'node:test';
import { assertCanDeleteAttachment } from '../attachmentPolicy.js';

describe('attachment deletion policy', () => {
  test('allows planners and the original uploader to delete ordinary attachments', () => {
    for (const role of ['owner', 'admin', 'po'] as const) {
      assert.doesNotThrow(() =>
        assertCanDeleteAttachment(role, `${role}-actor`, {
          uploaderId: 'another-user',
          category: 'general',
          isLinkedToTestResult: false,
        }),
      );
    }

    assert.doesNotThrow(() =>
      assertCanDeleteAttachment('qa', 'qa-uploader', {
        uploaderId: 'qa-uploader',
        category: 'product_media',
        isLinkedToTestResult: false,
      }),
    );
  });

  test('blocks a non-planner from deleting another uploader ordinary attachment', () => {
    for (const role of ['qa', 'dev'] as const) {
      assert.throws(
        () =>
          assertCanDeleteAttachment(role, `${role}-actor`, {
            uploaderId: 'another-user',
            category: 'general',
            isLinkedToTestResult: false,
          }),
        /FORBIDDEN:/,
      );
    }
  });

  test('blocks QA evidence and Test Result-linked attachments for every role', () => {
    for (const role of ['owner', 'admin', 'po', 'qa', 'dev'] as const) {
      assert.throws(
        () =>
          assertCanDeleteAttachment(role, `${role}-actor`, {
            uploaderId: `${role}-actor`,
            category: 'qa_evidence',
            isLinkedToTestResult: false,
          }),
        /CONFLICT: Formal QA evidence is immutable/,
      );

      assert.throws(
        () =>
          assertCanDeleteAttachment(role, `${role}-actor`, {
            uploaderId: `${role}-actor`,
            category: 'general',
            isLinkedToTestResult: true,
          }),
        /CONFLICT: Formal QA evidence is immutable/,
      );
    }
  });
});
