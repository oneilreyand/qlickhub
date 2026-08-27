import assert from 'node:assert';
import { test, describe } from 'node:test';
import {
  DateStringSchema,
  TaskDatePresetSchema,
  TaskDateFilterSchema,
  ProblemDetailSchema,
  CreateFolderSchema,
  UpdateFolderSchema,
  MoveFolderSchema,
  ArchiveFolderSchema,
  FolderSchema,
  FolderTreeResponseSchema,
  TaskSchema,
  TaskAttachmentSchema,
  RequirementSchema,
  CreateRequirementSchema,
  UpdateRequirementSchema,
  AcceptanceCriterionSchema,
  CreateAcceptanceCriterionSchema,
  UpdateAcceptanceCriterionSchema,
  RequirementDetailResponseSchema,
  RequirementResponseSchema,
  TaskRequirementLinkSchema,
  BulkCorrectTaskRequirementsSchema,
  QaDocumentSchema,
  CreateQaDocumentSchema,
  QaDocumentVersionSchema,
  UpsertProductBriefSchema,
  ProductBriefSchema,
  RequirementTestCaseSchema,
  CreateRequirementTestCaseSchema,
  WorkspaceTraceabilitySummarySchema,
  ParentTaskDeliveryTraceSchema,
  TaskStatusSchema,
  TaskPrioritySchema,
  CreateTaskSchema,
  UpdateTaskSchema,
  MoveTaskSchema,
  CompleteTaskSchema,
  TaskListQuerySchema,
  WorkspaceSchema,
  CreateWorkspaceSchema,
  UpdateWorkspaceSchema,
  AddWorkspaceMemberSchema,
  UpdateMemberRoleSchema,
  RegisterFcmTokenSchema,
  UnregisterFcmTokenSchema,
  PushNotificationPayloadSchema,
  InAppNotificationSchema,
  ListNotificationsQuerySchema,
  ListNotificationsResponseSchema,
  UserSchema,
  CompleteOnboardingResponseSchema,
  CreateTestCaseSchema,
  CreateTestRunSchema,
  CreateTestResultSchema,
  TaskTestExecutionWorkspaceSchema,
  BugSchema,
  BugWithContextSchema,
  CreateBugSchema,
  UpdateBugSchema,
  CreateQaSignOffSchema,
  CreateReleaseDecisionSchema,
  QaSignOffSchema,
  ReleaseDecisionSchema,
  ReadinessSnapshotV2Schema,
  FeatureReleaseRecordsSchema,
  ListWorkspaceReleaseReadinessQuerySchema,
  WorkspaceReleaseReadinessSchema,
  RoleAwareWorkQueueSchema,
  WorkspaceActivityListResponseSchema,
  CreateEvidenceLinkInputSchema,
  TestResultEvidenceLinkSchema,
  TestCaseImportDryRunRowSchema,
  TestCaseImportPreviewResponseSchema,
  CommitTestCaseImportSchema,
} from './index.js';

describe('Contracts Validation Suite', () => {
  describe('Workspace Contracts', () => {
    test('validates valid workspace creation', () => {
      const input = { name: '  Engineering QA  ', description: 'QA Hub' };
      const parsed = CreateWorkspaceSchema.parse(input);
      assert.strictEqual(parsed.name, 'Engineering QA');
    });

    test('rejects invalid workspace creation input', () => {
      assert.throws(() => CreateWorkspaceSchema.parse({ name: 'A' }));
      assert.throws(() => CreateWorkspaceSchema.parse({ name: '' }));
    });

    test('validates workspace member addition', () => {
      const input = { email: 'qa@company.com', role: 'qa' };
      const parsed = AddWorkspaceMemberSchema.parse(input);
      assert.strictEqual(parsed.email, 'qa@company.com');
      assert.strictEqual(parsed.role, 'qa');
      assert.deepStrictEqual(parsed.specialties, []);
    });

    test('requires persisted specialties for a new Developer membership', () => {
      const parsed = AddWorkspaceMemberSchema.parse({
        email: 'dev@company.com',
        role: 'dev',
        specialties: ['frontend', 'mobile'],
      });
      assert.deepStrictEqual(parsed.specialties, ['frontend', 'mobile']);

      assert.throws(() =>
        AddWorkspaceMemberSchema.parse({ email: 'dev@company.com', role: 'dev' }),
      );
      assert.throws(() =>
        AddWorkspaceMemberSchema.parse({
          email: 'qa@company.com',
          role: 'qa',
          specialties: ['backend'],
        }),
      );

      const updated = UpdateMemberRoleSchema.parse({ role: 'dev', specialties: ['fullstack'] });
      assert.deepStrictEqual(updated.specialties, ['fullstack']);
    });

    test('does not allow assigning or changing to the owner role outside an ownership transfer', () => {
      assert.throws(() =>
        AddWorkspaceMemberSchema.parse({ email: 'owner@company.com', role: 'owner' }),
      );
      assert.throws(() => UpdateMemberRoleSchema.parse({ role: 'owner' }));
    });
  });

  describe('Folder Contracts', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';

    test('validates valid folder creation (Level 1 and Level 2)', () => {
      const level1 = CreateFolderSchema.parse({
        workspaceId: validUuid,
        name: ' Release 2026.1 ',
      });
      assert.strictEqual(level1.name, 'Release 2026.1');
      assert.strictEqual(level1.parentFolderId, undefined);

      const level2 = CreateFolderSchema.parse({
        workspaceId: validUuid,
        parentFolderId: validUuid,
        name: 'Feature A',
        position: 1,
      });
      assert.strictEqual(level2.parentFolderId, validUuid);
    });

    test('rejects invalid folder input (invalid UUID, empty name)', () => {
      assert.throws(() =>
        CreateFolderSchema.parse({ workspaceId: 'invalid-uuid', name: 'Folder' }),
      );
      assert.throws(() => CreateFolderSchema.parse({ workspaceId: validUuid, name: '   ' }));
    });

    test('validates folder tree structure', () => {
      const tree = FolderTreeResponseSchema.parse({
        workspaceId: validUuid,
        folders: [
          {
            id: validUuid,
            workspaceId: validUuid,
            name: 'Release 2026.1',
            position: 0,
            createdBy: validUuid,
            createdAt: '2026-08-13T10:00:00Z',
            updatedAt: '2026-08-13T10:00:00Z',
            children: [
              {
                id: '223e4567-e89b-12d3-a456-426614174001',
                workspaceId: validUuid,
                parentFolderId: validUuid,
                name: 'Feature A',
                position: 0,
                createdBy: validUuid,
                createdAt: '2026-08-13T10:00:00Z',
                updatedAt: '2026-08-13T10:00:00Z',
              },
            ],
          },
        ],
      });
      assert.strictEqual(tree.folders.length, 1);
      assert.strictEqual(tree.folders[0].children?.length, 1);
    });
  });

  describe('Date & Filter Contracts', () => {
    test('validates correct YYYY-MM-DD date strings', () => {
      assert.strictEqual(DateStringSchema.parse('2026-08-13'), '2026-08-13');
      assert.strictEqual(DateStringSchema.parse('2026-02-28'), '2026-02-28');
    });

    test('rejects invalid date formats or calendar dates', () => {
      assert.throws(() => DateStringSchema.parse('13-08-2026'));
      assert.throws(() => DateStringSchema.parse('2026/08/13'));
      assert.throws(() => DateStringSchema.parse('2026-02-31')); // invalid date
      assert.throws(() => DateStringSchema.parse('not-a-date'));
    });

    test('validates date presets', () => {
      assert.strictEqual(TaskDatePresetSchema.parse('today'), 'today');
      assert.strictEqual(TaskDatePresetSchema.parse('this_week'), 'this_week');
      assert.strictEqual(TaskDatePresetSchema.parse('this_month'), 'this_month');
      assert.strictEqual(TaskDatePresetSchema.parse('overdue'), 'overdue');
      assert.throws(() => TaskDatePresetSchema.parse('next_year'));
    });

    test('validates valid task date filter combinations', () => {
      const validPreset = TaskDateFilterSchema.parse({ datePreset: 'today' });
      assert.strictEqual(validPreset.datePreset, 'today');

      const validRange = TaskDateFilterSchema.parse({
        startDate: '2026-08-01',
        endDate: '2026-08-31',
      });
      assert.strictEqual(validRange.startDate, '2026-08-01');
    });

    test('rejects invalid date filter combinations', () => {
      // Combining datePreset with startDate/endDate
      assert.throws(() =>
        TaskDateFilterSchema.parse({
          datePreset: 'today',
          startDate: '2026-08-01',
        }),
      );

      // startDate after endDate
      assert.throws(() =>
        TaskDateFilterSchema.parse({
          startDate: '2026-08-31',
          endDate: '2026-08-01',
        }),
      );
    });
  });

  describe('Task Contracts', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';

    test('validates valid task creation', () => {
      const task = CreateTaskSchema.parse({
        workspaceId: validUuid,
        folderId: validUuid,
        title: ' Setup E2E Test Suite ',
        priority: 'high',
        startDate: '2026-08-10',
        dueDate: '2026-08-20',
      });
      assert.strictEqual(task.title, 'Setup E2E Test Suite');
      assert.strictEqual(task.status, 'todo');
      assert.strictEqual(task.priority, 'high');
    });

    test('rejects task creation with startDate > dueDate', () => {
      assert.throws(() =>
        CreateTaskSchema.parse({
          workspaceId: validUuid,
          title: 'Invalid Task',
          startDate: '2026-08-20',
          dueDate: '2026-08-10',
        }),
      );
    });

    test('validates TaskListQuery parameters & filter combinations', () => {
      const query = TaskListQuerySchema.parse({
        workspaceId: validUuid,
        datePreset: 'this_week',
        unfiledOnly: 'true',
        includeDescendants: 'true',
        page: '2',
        limit: '20',
      });
      assert.strictEqual(query.datePreset, 'this_week');
      assert.strictEqual(query.unfiledOnly, true);
      assert.strictEqual(query.includeDescendants, true);
      assert.strictEqual(query.page, 2);
      assert.strictEqual(query.limit, 20);
    });

    test('rejects TaskListQuery with incompatible date filters', () => {
      assert.throws(() =>
        TaskListQuerySchema.parse({
          workspaceId: validUuid,
          datePreset: 'today',
          endDate: '2026-08-15',
        }),
      );
    });

    test('validates subtask creation input rules (deliveryArea required for subtask, disallowed for parent)', () => {
      const subtaskInput = CreateTaskSchema.parse({
        workspaceId: validUuid,
        parentTaskId: validUuid,
        deliveryArea: 'frontend',
        assigneeId: validUuid,
        title: 'Build FE login component',
      });
      assert.strictEqual(subtaskInput.parentTaskId, validUuid);
      assert.strictEqual(subtaskInput.deliveryArea, 'frontend');
      assert.strictEqual(subtaskInput.assigneeId, validUuid);

      // Subtask without deliveryArea
      assert.throws(() =>
        CreateTaskSchema.parse({
          workspaceId: validUuid,
          parentTaskId: validUuid,
          assigneeId: validUuid,
          title: 'Subtask without area',
        }),
      );

      // Parent task with deliveryArea
      assert.throws(() =>
        CreateTaskSchema.parse({
          workspaceId: validUuid,
          deliveryArea: 'qa',
          title: 'Parent with area',
        }),
      );
    });

    test('requires an auditable reason for assignment mismatch overrides', () => {
      assert.throws(() =>
        CreateTaskSchema.parse({
          workspaceId: validUuid,
          parentTaskId: validUuid,
          deliveryArea: 'mobile',
          title: 'Temporary cross-area assignment',
          allowRoleMismatch: true,
        }),
      );

      const parsed = CreateTaskSchema.parse({
        workspaceId: validUuid,
        parentTaskId: validUuid,
        deliveryArea: 'mobile',
        title: 'Temporary cross-area assignment',
        allowRoleMismatch: true,
        roleMismatchReason: 'Mobile engineer is temporarily unavailable.',
      });
      assert.strictEqual(parsed.allowRoleMismatch, true);
    });
  });

  describe('Attachment Contracts', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';

    test('validates valid task attachment metadata', () => {
      const validAttachment = TaskAttachmentSchema.parse({
        id: validUuid,
        workspaceId: validUuid,
        taskId: validUuid,
        fileName: 'screenshot_evidence.png',
        fileSize: 1048576,
        mimeType: 'image/png',
        storageProvider: 'google_drive',
        category: 'product_media',
        caption: 'Payment summary on the checkout screen',
        uploaderId: validUuid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      assert.strictEqual(validAttachment.fileName, 'screenshot_evidence.png');
      assert.strictEqual(validAttachment.fileSize, 1048576);
      assert.strictEqual(validAttachment.mimeType, 'image/png');
      assert.strictEqual(validAttachment.storageProvider, 'google_drive');
      assert.strictEqual(validAttachment.category, 'product_media');
    });

    test('rejects task attachment metadata with invalid fileSize or empty fileName', () => {
      assert.throws(() =>
        TaskAttachmentSchema.parse({
          id: validUuid,
          workspaceId: validUuid,
          taskId: validUuid,
          fileName: '',
          fileSize: -10,
          mimeType: 'image/png',
          uploaderId: validUuid,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      );
    });
  });

  describe('Requirement Contracts', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';

    test('validates valid requirement creation and requirement object', () => {
      const reqInput = CreateRequirementSchema.parse({
        workspaceId: validUuid,
        code: 'REQ-101',
        title: 'User Authentication Flow',
        description: 'Detailed spec for OAuth2 login',
      });
      assert.strictEqual(reqInput.code, 'REQ-101');

      const reqObj = RequirementSchema.parse({
        id: validUuid,
        workspaceId: validUuid,
        code: 'REQ-101',
        title: 'User Authentication Flow',
        createdBy: validUuid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      assert.strictEqual(reqObj.status, 'active');
    });

    test('validates UpdateRequirementSchema with partial updates and null resets', () => {
      const update1 = UpdateRequirementSchema.parse({
        title: 'Updated Flow Title',
        description: null,
        url: null,
        status: 'deprecated',
      });
      assert.strictEqual(update1.title, 'Updated Flow Title');
      assert.strictEqual(update1.description, null);
      assert.strictEqual(update1.url, null);
      assert.strictEqual(update1.status, 'deprecated');

      const update2 = UpdateRequirementSchema.parse({
        url: 'https://www.figma.com/file/123/Flow',
      });
      assert.strictEqual(update2.url, 'https://www.figma.com/file/123/Flow');
    });

    test('rejects invalid UpdateRequirementSchema payloads', () => {
      // Empty payload
      assert.throws(() => UpdateRequirementSchema.parse({}));

      // Invalid URL
      assert.throws(() =>
        UpdateRequirementSchema.parse({
          url: 'not-a-valid-url',
        }),
      );

      // Unknown or immutable fields due to .strict()
      assert.throws(() =>
        UpdateRequirementSchema.parse({
          title: 'Valid Title',
          workspaceId: validUuid,
        } as any),
      );

      assert.throws(() =>
        UpdateRequirementSchema.parse({
          title: 'Valid Title',
          createdBy: validUuid,
        } as any),
      );
    });

    test('validates RequirementDetailResponseSchema structure with linked tasks', () => {
      const criterionId = '123e4567-e89b-12d3-a456-426614174001';
      const detail = RequirementDetailResponseSchema.parse({
        requirement: {
          id: validUuid,
          workspaceId: validUuid,
          code: 'REQ-202',
          title: 'Cart Calculation Spec',
          status: 'active',
          createdBy: validUuid,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        linkedTasks: [
          {
            taskId: validUuid,
            title: 'Implement Cart UI',
            status: 'in_progress',
            deliveryArea: 'frontend',
          },
        ],
        acceptanceCriteria: [
          {
            id: criterionId,
            workspaceId: validUuid,
            requirementId: validUuid,
            sequence: 1,
            code: 'AC-1',
            text: 'The order total includes the active promotion exactly once.',
            status: 'active',
            createdBy: validUuid,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      });
      assert.strictEqual(detail.requirement.code, 'REQ-202');
      assert.strictEqual(detail.linkedTasks.length, 1);
      assert.strictEqual(detail.linkedTasks[0].deliveryArea, 'frontend');
      assert.strictEqual(detail.acceptanceCriteria[0].id, criterionId);
      assert.strictEqual(detail.acceptanceCriteria[0].code, 'AC-1');
    });

    test('validates stable Acceptance Criterion create, update, and response contracts', () => {
      const criterionId = '123e4567-e89b-12d3-a456-426614174002';
      const create = CreateAcceptanceCriterionSchema.parse({
        workspaceId: validUuid,
        requirementId: validUuid,
        sequence: 2,
        text: '  A failed payment keeps the selected payment method.  ',
      });
      assert.strictEqual(create.sequence, 2);
      assert.strictEqual(create.text, 'A failed payment keeps the selected payment method.');

      const update = UpdateAcceptanceCriterionSchema.parse({
        sequence: 3,
        status: 'deprecated',
      });
      assert.strictEqual(update.sequence, 3);
      assert.strictEqual(update.status, 'deprecated');

      const criterion = AcceptanceCriterionSchema.parse({
        id: criterionId,
        workspaceId: validUuid,
        requirementId: validUuid,
        sequence: 3,
        code: 'AC-3',
        text: 'A failed payment keeps the selected payment method.',
        status: 'deprecated',
        createdBy: validUuid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      assert.strictEqual(criterion.id, criterionId);

      assert.throws(() => UpdateAcceptanceCriterionSchema.parse({}));
      assert.throws(() =>
        CreateAcceptanceCriterionSchema.parse({
          workspaceId: validUuid,
          requirementId: validUuid,
          sequence: 0,
          text: 'Invalid sequence',
        }),
      );
      assert.throws(() =>
        AcceptanceCriterionSchema.parse({
          ...criterion,
          code: 'CRITERION-3',
        }),
      );
    });

    test('validates task requirement link structure', () => {
      const link = TaskRequirementLinkSchema.parse({
        id: validUuid,
        workspaceId: validUuid,
        taskId: validUuid,
        requirementId: validUuid,
        linkedBy: validUuid,
        createdAt: new Date().toISOString(),
      });
      assert.strictEqual(link.taskId, validUuid);
    });

    test('limits bulk Requirement correction to distinct, explicitly scoped Requirements', () => {
      const correction = BulkCorrectTaskRequirementsSchema.parse({
        workspaceId: validUuid,
        requirementIds: [validUuid, '123e4567-e89b-12d3-a456-426614174001'],
        action: 'deprecate',
      });
      assert.strictEqual(correction.action, 'deprecate');
      assert.strictEqual(correction.requirementIds.length, 2);

      assert.throws(() =>
        BulkCorrectTaskRequirementsSchema.parse({
          workspaceId: validUuid,
          requirementIds: [validUuid, validUuid],
          action: 'unlink',
        }),
      );
    });
  });

  describe('QA Document Contracts', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';

    test('validates QA document creation and versioning schemas', () => {
      const createInput = CreateQaDocumentSchema.parse({
        workspaceId: validUuid,
        title: 'Master Test Strategy 2026',
        docType: 'test_strategy',
        contentMarkdown: '# Master Test Strategy\n\n- Scope: Frontend & API',
      });
      assert.strictEqual(createInput.docType, 'test_strategy');

      const doc = QaDocumentSchema.parse({
        id: validUuid,
        workspaceId: validUuid,
        title: 'Master Test Strategy 2026',
        docType: 'test_strategy',
        currentVersion: 1,
        createdBy: validUuid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      assert.strictEqual(doc.currentVersion, 1);

      // Explicitly check QaDocType enum contracts
      assert.throws(() =>
        CreateQaDocumentSchema.parse({
          workspaceId: validUuid,
          title: 'Test Cases Doc',
          docType: 'test_cases',
          contentMarkdown: '# Cases',
        }),
      );
      assert.throws(() =>
        CreateQaDocumentSchema.parse({
          workspaceId: validUuid,
          title: 'Signoff Doc',
          docType: 'qa_signoff',
          contentMarkdown: '# Signoff',
        }),
      );

      const ver = QaDocumentVersionSchema.parse({
        id: validUuid,
        workspaceId: validUuid,
        documentId: validUuid,
        version: 2,
        title: 'Master Test Strategy 2026 - Rev 2',
        contentMarkdown: '# Rev 2',
        changelog: 'Updated API coverage',
        createdBy: validUuid,
        createdAt: new Date().toISOString(),
      });
      assert.strictEqual(ver.version, 2);
    });

    test('validates a Product Brief with separate scope and acceptance snapshots', () => {
      const input = UpsertProductBriefSchema.parse({
        workspaceId: validUuid,
        taskId: validUuid,
        title: 'Checkout Product Brief',
        contentMarkdown: '## Goal\nReduce checkout abandonment.',
        inScope: [{ text: 'Saved payment methods', position: 0 }],
        outScope: [{ text: 'Native mobile checkout', position: 0 }],
        acceptanceCriteria: [
          { text: 'A user can review payment details before confirmation.', position: 0 },
        ],
      });
      assert.strictEqual(input.status, 'draft');
      assert.strictEqual(input.inScope.length, 1);
      assert.strictEqual(input.acceptanceCriteria.length, 1);

      const brief = ProductBriefSchema.parse({
        document: {
          id: validUuid,
          workspaceId: validUuid,
          title: 'Checkout Product Brief',
          docType: 'product_brief',
          status: 'in_review',
          ownerId: validUuid,
          currentVersion: 1,
          createdBy: validUuid,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        currentVersion: {
          id: validUuid,
          workspaceId: validUuid,
          documentId: validUuid,
          version: 1,
          title: 'Checkout Product Brief',
          contentMarkdown: '## Goal',
          inScope: [{ id: validUuid, text: 'Saved payment methods', position: 0 }],
          outScope: [{ id: validUuid, text: 'Native mobile checkout', position: 0 }],
          acceptanceCriteria: [
            {
              id: validUuid,
              text: 'A user can review payment details before confirmation.',
              position: 0,
            },
          ],
          createdBy: validUuid,
          createdAt: new Date().toISOString(),
        },
      });
      assert.strictEqual(brief.document.docType, 'product_brief');
      assert.strictEqual(brief.currentVersion.acceptanceCriteria.length, 1);
    });
  });

  describe('Traceability & QA Test Case Contracts', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';

    test('validates Requirement Test Case and Traceability summary schemas', () => {
      const tcInput = CreateRequirementTestCaseSchema.parse({
        workspaceId: validUuid,
        requirementId: validUuid,
        title: 'Verify OAuth2 JWT token expiration',
        testType: 'e2e',
        status: 'passed',
      });
      assert.strictEqual(tcInput.status, 'passed');

      const summary = WorkspaceTraceabilitySummarySchema.parse({
        totalRequirements: 5,
        coveredRequirements: 4,
        uncoveredRequirements: 1,
        totalTasks: 10,
        totalTestCases: 8,
        passRatePercent: 87.5,
        matrix: [],
      });
      assert.strictEqual(summary.passRatePercent, 87.5);
    });

    test('separates parent Task structural coverage from Test Case execution metrics', () => {
      const featureTaskId = '123e4567-e89b-12d3-a456-426614174010';
      const subtaskId = '123e4567-e89b-12d3-a456-426614174011';
      const requirementId = '123e4567-e89b-12d3-a456-426614174012';
      const criterionId = '123e4567-e89b-12d3-a456-426614174013';
      const testCaseId = '123e4567-e89b-12d3-a456-426614174014';
      const timestamp = new Date().toISOString();
      const featureTask = {
        id: featureTaskId,
        workspaceId: validUuid,
        title: 'Returning Customer Checkout',
        status: 'in_progress',
        priority: 'high',
        reporterId: validUuid,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      const implementingSubtask = {
        ...featureTask,
        id: subtaskId,
        parentTaskId: featureTaskId,
        deliveryArea: 'backend',
        title: 'Persist selected payment method',
      };

      const trace = ParentTaskDeliveryTraceSchema.parse({
        workspaceId: validUuid,
        requestedTaskId: subtaskId,
        featureTask,
        featureSubtasks: [implementingSubtask],
        unlinkedSubtasks: [],
        testCaseLinkBasis: 'legacy_requirement',
        acceptanceCriterionCoverageAvailable: false,
        structural: {
          totalRequirements: 1,
          totalFeatureSubtasks: 1,
          linkedImplementingSubtasks: 1,
          unlinkedSubtasks: 0,
          requirementsWithImplementingSubtasks: 1,
          requirementsWithTestCases: 1,
          fullyCoveredRequirements: 1,
          missingImplementationRequirements: 0,
          missingTestCaseRequirements: 0,
          coveragePercent: 100,
        },
        execution: {
          totalTestCases: 2,
          executedTestCases: 1,
          passedTestCases: 1,
          failedTestCases: 0,
          pendingTestCases: 1,
          skippedTestCases: 0,
          passRatePercent: 100,
        },
        requirements: [
          {
            requirement: {
              id: requirementId,
              workspaceId: validUuid,
              code: 'REQ-CHECKOUT',
              title: 'Saved payment checkout',
              status: 'active',
              createdBy: validUuid,
              createdAt: timestamp,
              updatedAt: timestamp,
            },
            acceptanceCriteria: [
              {
                id: criterionId,
                workspaceId: validUuid,
                requirementId,
                sequence: 1,
                code: 'AC-1',
                text: 'A returning customer can select a saved payment method.',
                status: 'active',
                createdBy: validUuid,
                createdAt: timestamp,
                updatedAt: timestamp,
              },
            ],
            implementingSubtasks: [implementingSubtask],
            testCases: [
              {
                id: testCaseId,
                workspaceId: validUuid,
                requirementId,
                title: 'Saved payment method is recorded',
                testType: 'integration',
                status: 'passed',
                createdBy: validUuid,
                createdAt: timestamp,
                updatedAt: timestamp,
              },
              {
                id: '123e4567-e89b-12d3-a456-426614174015',
                workspaceId: validUuid,
                requirementId,
                title: 'Payment failure preserves the selected method',
                testType: 'e2e',
                status: 'pending',
                createdBy: validUuid,
                createdAt: timestamp,
                updatedAt: timestamp,
              },
            ],
            testCaseLinkBasis: 'legacy_requirement',
            acceptanceCriterionCoverageAvailable: false,
            structuralStatus: 'complete',
            executionStatus: 'incomplete',
            totalAcceptanceCriteria: 1,
            totalImplementingSubtasks: 1,
            totalTestCases: 2,
            executedTestCases: 1,
            passedTestCases: 1,
            failedTestCases: 0,
            pendingTestCases: 1,
            skippedTestCases: 0,
          },
        ],
      });

      assert.strictEqual(trace.requestedTaskId, subtaskId);
      assert.strictEqual(trace.structural.coveragePercent, 100);
      assert.strictEqual(trace.execution.passRatePercent, 100);
      assert.strictEqual(trace.requirements[0].acceptanceCriterionCoverageAvailable, false);
    });
  });

  describe('Canonical Test Management Contracts', () => {
    const workspaceId = '123e4567-e89b-12d3-a456-426614174000';
    const testCaseId = '123e4567-e89b-12d3-a456-426614174001';
    const runId = '123e4567-e89b-12d3-a456-426614174002';
    const requirementA = '123e4567-e89b-12d3-a456-426614174003';
    const requirementB = '123e4567-e89b-12d3-a456-426614174004';

    test('validates a reusable Test Case linked to multiple Requirements', () => {
      const input = CreateTestCaseSchema.parse({
        workspaceId,
        title: 'Verify saved card checkout',
        testType: 'e2e',
        steps: ['Open checkout', 'Select a saved card', 'Confirm payment'],
        requirementIds: [requirementA, requirementB],
      });

      assert.deepStrictEqual(input.requirementIds, [requirementA, requirementB]);
      assert.strictEqual(input.testType, 'e2e');
    });

    test('keeps Test Run metadata separate from its immutable Result', () => {
      const run = CreateTestRunSchema.parse({
        workspaceId,
        testCaseId,
        build: 'checkout-web-2026.08.21.1',
        environment: 'staging',
      });
      const result = CreateTestResultSchema.parse({
        workspaceId,
        testCaseId,
        testRunId: runId,
        status: 'failed',
        actualResult: 'Payment API returned 500.',
        evidenceAttachmentIds: [],
      });

      assert.strictEqual(run.build, 'checkout-web-2026.08.21.1');
      assert.strictEqual(result.status, 'failed');
      assert.deepStrictEqual(result.evidenceAttachmentIds, []);
    });

    test('validates the task-scoped persisted Test execution read model', () => {
      const timestamp = '2026-08-22T08:00:00.000Z';
      const readModel = TaskTestExecutionWorkspaceSchema.parse({
        workspaceId,
        requestedTaskId: requirementA,
        featureTaskId: requirementB,
        executions: [
          {
            testCase: {
              id: testCaseId,
              workspaceId,
              externalReference: 'TC-001',
              title: 'Verify saved card checkout',
              description: null,
              testType: 'e2e',
              priority: 'medium',
              status: 'active',
              preconditions: null,
              steps: ['Open checkout'],
              expectedResult: 'Checkout opens.',
              testData: null,
              scenarioKind: 'positive',
              source: 'native',
              requirementIds: [requirementA],
              createdBy: requirementB,
              createdAt: timestamp,
              updatedAt: timestamp,
            },
            latestRun: {
              id: runId,
              workspaceId,
              testCaseId,
              build: 'checkout-web-2026.08.22.1',
              environment: 'staging',
              status: 'in_progress',
              executorId: requirementB,
              startedAt: timestamp,
              completedAt: null,
              result: null,
              createdAt: timestamp,
            },
            testRuns: [
              {
                id: runId,
                workspaceId,
                testCaseId,
                build: 'checkout-web-2026.08.22.1',
                environment: 'staging',
                status: 'in_progress',
                executorId: requirementB,
                startedAt: timestamp,
                completedAt: null,
                result: null,
                createdAt: timestamp,
              },
            ],
          },
        ],
      });

      assert.strictEqual(readModel.executions[0].latestRun?.id, runId);
      assert.strictEqual(readModel.executions[0].testRuns.length, 1);
    });

    test('validates external evidence link schemas and provider normalization', () => {
      const input = CreateEvidenceLinkInputSchema.parse({
        url: 'https://drive.google.com/file/d/12345/view',
        label: 'Checkout video recording',
      });
      assert.strictEqual(input.url, 'https://drive.google.com/file/d/12345/view');
      assert.strictEqual(input.label, 'Checkout video recording');

      // Rejects insecure HTTP and dangerous protocols
      assert.throws(() =>
        CreateEvidenceLinkInputSchema.parse({
          url: 'http://drive.google.com/file/d/12345/view',
        }),
      );
      assert.throws(() =>
        CreateEvidenceLinkInputSchema.parse({
          url: 'javascript:alert(1)',
        }),
      );
      assert.throws(() =>
        CreateEvidenceLinkInputSchema.parse({
          url: 'file:///etc/passwd',
        }),
      );
      assert.throws(() =>
        CreateEvidenceLinkInputSchema.parse({
          url: 'data:text/html,<script>alert(1)</script>',
        }),
      );

      const evidenceLink = TestResultEvidenceLinkSchema.parse({
        id: '123e4567-e89b-12d3-a456-426614174099',
        workspaceId,
        testResultId: runId,
        url: 'https://drive.google.com/file/d/12345/view',
        provider: 'google_drive',
        mediaKind: 'video',
        label: 'Checkout video',
        addedBy: requirementB,
        addedAt: '2026-08-24T10:00:00.000Z',
        normalizedUrl: 'https://drive.google.com/file/d/12345/preview',
        previewStatus: 'ready',
      });
      assert.strictEqual(evidenceLink.provider, 'google_drive');
      assert.strictEqual(evidenceLink.mediaKind, 'video');
    });

    test('validates spreadsheet import preview, dry run, and commit contracts', () => {
      const sessionId = '123e4567-e89b-12d3-a456-426614174098';
      const expiresAt = new Date(Date.now() + 3600000).toISOString();
      const dryRunRow = TestCaseImportDryRunRowSchema.parse({
        sourceRowNumber: 2,
        externalReference: 'TC-101',
        title: 'Verify coupon code discount',
        requirementCode: 'REQ-001',
        resolvedRequirementId: requirementA,
        testType: 'manual',
        priority: 'high',
        scenarioKind: 'positive',
        preconditions: 'User is on cart page',
        steps: ['Enter coupon SAVE10', 'Click apply'],
        expectedResult: 'Cart total decreases by 10%',
        testData: 'SAVE10',
        status: 'draft',
        isValid: true,
        validationErrors: [],
        isDuplicate: false,
      });
      assert.strictEqual(dryRunRow.externalReference, 'TC-101');
      assert.strictEqual(dryRunRow.isValid, true);

      const preview = TestCaseImportPreviewResponseSchema.parse({
        importSessionId: sessionId,
        fileName: 'test_cases_template.xlsx',
        contentHash: 'a'.repeat(64),
        templateVersion: '1.0',
        totalRows: 1,
        validRows: 1,
        invalidRows: 0,
        duplicateRows: 0,
        availableSheets: ['Sheet1', 'Regression'],
        selectedSheet: 'Sheet1',
        expiresAt,
        rows: [dryRunRow],
      });
      assert.strictEqual(preview.totalRows, 1);
      assert.strictEqual(preview.importSessionId, sessionId);
      assert.strictEqual(preview.availableSheets.length, 2);

      const commit = CommitTestCaseImportSchema.parse({
        workspaceId,
        importSessionId: sessionId,
        contentHash: 'a'.repeat(64),
        mode: 'create_only',
        sheetName: 'Sheet1',
        columnMapping: { Title: 'title' },
      });
      assert.strictEqual(commit.mode, 'create_only');
      assert.strictEqual(commit.importSessionId, sessionId);
    });
  });

  describe('First-class Bug Contracts', () => {
    const workspaceId = '223e4567-e89b-42d3-a456-426614174000';
    const featureTaskId = '223e4567-e89b-42d3-a456-426614174001';
    const requirementId = '223e4567-e89b-42d3-a456-426614174002';
    const testResultId = '223e4567-e89b-42d3-a456-426614174003';
    const assigneeId = '223e4567-e89b-42d3-a456-426614174004';
    const bugId = '223e4567-e89b-42d3-a456-426614174005';

    test('validates Bug trace identity and reproduction input', () => {
      const input = CreateBugSchema.parse({
        workspaceId,
        featureTaskId,
        requirementId,
        testResultId,
        assigneeId,
        title: 'Checkout request returns 500',
        severity: 'critical',
        reproductionDetails: 'Submit checkout with a saved card on staging.',
      });
      assert.strictEqual(input.severity, 'critical');
      assert.strictEqual(input.testResultId, testResultId);

      const bug = BugSchema.parse({
        id: bugId,
        ...input,
        status: 'open',
        resolutionNotes: null,
        createdBy: assigneeId,
        resolvedAt: null,
        verifiedAt: null,
        createdAt: '2026-08-22T08:00:00.000Z',
        updatedAt: '2026-08-22T08:00:00.000Z',
      });
      assert.strictEqual(bug.featureTaskId, featureTaskId);
    });

    test('requires at least one field for Bug updates', () => {
      assert.throws(() => UpdateBugSchema.parse({ workspaceId, bugId }));
      const update = UpdateBugSchema.parse({
        workspaceId,
        bugId,
        status: 'resolved',
        resolutionNotes: 'Fixed the request mapping.',
      });
      assert.strictEqual(update.status, 'resolved');
    });

    test('validates the persisted Bug context needed by Task Hub and My Tasks', () => {
      const contextualBug = BugWithContextSchema.parse({
        id: bugId,
        workspaceId,
        featureTaskId,
        requirementId,
        testResultId,
        assigneeId,
        title: 'Checkout request returns 500',
        severity: 'critical',
        status: 'resolved',
        reproductionDetails: 'Submit checkout with a saved card on staging.',
        resolutionNotes: 'Corrected the payment mapping.',
        createdBy: assigneeId,
        resolvedAt: '2026-08-22T09:00:00.000Z',
        verifiedAt: null,
        createdAt: '2026-08-22T08:00:00.000Z',
        updatedAt: '2026-08-22T09:00:00.000Z',
        featureTask: { id: featureTaskId, title: 'Returning Customer Checkout' },
        requirement: { id: requirementId, code: 'REQ-CHECKOUT', title: 'Saved card payment' },
        assignee: { id: assigneeId, name: 'Checkout Developer', email: 'dev@example.com' },
        originatingTestResult: {
          id: testResultId,
          status: 'failed',
          actualResult: 'Checkout API returned 500.',
          executedAt: '2026-08-22T08:00:00.000Z',
          testRun: {
            id: '223e4567-e89b-42d3-a456-426614174006',
            testCaseId: '223e4567-e89b-42d3-a456-426614174007',
            build: 'checkout-web-2026.08.22.1',
            environment: 'staging',
          },
        },
      });

      assert.strictEqual(contextualBug.requirement.code, 'REQ-CHECKOUT');
      assert.strictEqual(contextualBug.originatingTestResult.testRun.environment, 'staging');
    });
  });

  describe('QA Sign-off and Release Decision Contracts', () => {
    const workspaceId = '123e4567-e89b-42d3-a456-426614174000';
    const featureTaskId = '223e4567-e89b-42d3-a456-426614174001';
    const qaSignOffId = '223e4567-e89b-42d3-a456-426614174002';
    const qaUserId = '223e4567-e89b-42d3-a456-426614174003';
    const poUserId = '223e4567-e89b-42d3-a456-426614174004';
    const capturedAt = '2026-08-22T10:00:00.000Z';
    const readinessSnapshot = {
      schemaVersion: 1 as const,
      capturedAt,
      featureTask: {
        id: featureTaskId,
        title: 'Returning Customer Checkout',
        status: 'in_review' as const,
        updatedAt: capturedAt,
      },
      subtasks: { total: 3, completed: 3 },
      requirements: { total: 2 },
      testExecution: {
        totalTestCases: 4,
        passed: 4,
        failed: 0,
        blocked: 0,
        skipped: 0,
        unexecuted: 0,
      },
      bugs: {
        total: 1,
        open: 0,
        inProgress: 0,
        resolved: 0,
        verified: 1,
        reopened: 0,
        criticalOrHighUnverified: 0,
      },
      qaSignOff: null,
    };

    const readinessSnapshotV2 = {
      ...readinessSnapshot,
      schemaVersion: 2 as const,
      development: { total: 2, completed: 2 },
      requirements: { total: 2, coveredByActiveTestCases: 2 },
      qaSignOff: {
        id: qaSignOffId,
        decision: 'approved' as const,
        signedBy: qaUserId,
        signedAt: capturedAt,
      },
      evaluation: {
        ready: true,
        failedGateCodes: [],
        gates: [
          {
            code: 'requirement_coverage' as const,
            label: 'Requirement coverage',
            status: 'passed' as const,
            reason: 'All requirements are covered.',
          },
          {
            code: 'latest_test_results' as const,
            label: 'Latest Test Run results',
            status: 'passed' as const,
            reason: 'All latest results passed.',
          },
          {
            code: 'critical_high_bugs' as const,
            label: 'Critical/High bugs',
            status: 'passed' as const,
            reason: 'No release-blocking bugs remain.',
          },
          {
            code: 'development_completion' as const,
            label: 'Development completion',
            status: 'passed' as const,
            reason: 'All development work is complete.',
          },
          {
            code: 'qa_sign_off' as const,
            label: 'QA Sign-off',
            status: 'passed' as const,
            reason: 'QA approved the release.',
          },
        ],
      },
    };

    test('validates append-only QA certification with a server snapshot', () => {
      const input = CreateQaSignOffSchema.parse({
        workspaceId,
        featureTaskId,
        decision: 'approved',
        notes: 'Regression suite passed on staging.',
      });
      assert.strictEqual(input.decision, 'approved');

      const signOff = QaSignOffSchema.parse({
        id: qaSignOffId,
        ...input,
        readinessSnapshot,
        signedBy: qaUserId,
        signedAt: capturedAt,
      });
      assert.strictEqual(signOff.readinessSnapshot.testExecution.passed, 4);
    });

    test('validates release decisions and restricts override reasons to approvals', () => {
      const input = CreateReleaseDecisionSchema.parse({
        workspaceId,
        featureTaskId,
        qaSignOffId,
        decision: 'approved',
        notes: 'Approved for production rollout.',
        overrideReason: null,
      });

      const releaseDecision = ReleaseDecisionSchema.parse({
        id: '223e4567-e89b-42d3-a456-426614174005',
        ...input,
        readinessSnapshot: {
          ...readinessSnapshot,
          qaSignOff: {
            id: qaSignOffId,
            decision: 'approved',
            signedBy: qaUserId,
            signedAt: capturedAt,
          },
        },
        decidedBy: poUserId,
        decidedAt: capturedAt,
      });
      assert.strictEqual(releaseDecision.qaSignOffId, qaSignOffId);

      assert.throws(() =>
        CreateReleaseDecisionSchema.parse({
          workspaceId,
          featureTaskId,
          qaSignOffId,
          decision: 'rejected',
          overrideReason: 'Not applicable to rejection.',
        }),
      );
    });

    test('validates deterministic readiness snapshot v2 while retaining snapshot v1 compatibility', () => {
      const parsedV2 = ReadinessSnapshotV2Schema.parse(readinessSnapshotV2);
      assert.strictEqual(parsedV2.evaluation.ready, true);
      assert.deepStrictEqual(
        parsedV2.evaluation.gates.map((gate) => gate.code),
        [
          'requirement_coverage',
          'latest_test_results',
          'critical_high_bugs',
          'development_completion',
          'qa_sign_off',
        ],
      );

      const records = FeatureReleaseRecordsSchema.parse({
        workspaceId,
        featureTaskId,
        currentReadinessSnapshot: readinessSnapshotV2,
        qaSignOffs: [],
        releaseDecisions: [],
      });
      assert.strictEqual(records.currentReadinessSnapshot.schemaVersion, 2);

      const legacy = QaSignOffSchema.parse({
        id: qaSignOffId,
        workspaceId,
        featureTaskId,
        decision: 'approved',
        notes: null,
        readinessSnapshot,
        signedBy: qaUserId,
        signedAt: capturedAt,
      });
      assert.strictEqual(legacy.readinessSnapshot.schemaVersion, 1);
    });

    test('validates a bounded Workspace readiness batch from the shared snapshot contract', () => {
      const query = ListWorkspaceReleaseReadinessQuerySchema.parse({
        workspaceId,
        featureTaskIds: [featureTaskId],
      });
      const batch = WorkspaceReleaseReadinessSchema.parse({
        workspaceId,
        items: [{ featureTaskId, currentReadinessSnapshot: readinessSnapshotV2 }],
      });

      assert.deepStrictEqual(query.featureTaskIds, [featureTaskId]);
      assert.strictEqual(batch.items[0].currentReadinessSnapshot.evaluation.ready, true);
      assert.throws(() =>
        ListWorkspaceReleaseReadinessQuerySchema.parse({
          workspaceId,
          featureTaskIds: [],
        }),
      );
    });

    test('validates a role-aware queue with an explicit reason and next action', () => {
      const queue = RoleAwareWorkQueueSchema.parse({
        workspaceId,
        actorId: poUserId,
        membershipRole: 'po',
        queueRole: 'planner',
        generatedAt: capturedAt,
        buckets: [
          {
            code: 'po_requirement_work',
            label: 'Requirement work',
            total: 1,
            items: [
              {
                id: `po_requirement_work:feature:${featureTaskId}`,
                bucketCode: 'po_requirement_work',
                subjectType: 'feature',
                subjectId: featureTaskId,
                featureTaskId,
                title: 'Returning Customer Checkout',
                reason: 'No Requirement is linked to this Feature or its subtasks.',
                nextAction: { code: 'add_requirement', label: 'Add Requirement' },
                status: 'in_progress',
                priority: 'high',
                dueDate: null,
                sourceUpdatedAt: capturedAt,
              },
            ],
          },
          { code: 'po_release_decision', label: 'Release decisions', total: 0, items: [] },
          { code: 'po_timeline_work', label: 'Timeline work', total: 0, items: [] },
        ],
      });

      assert.strictEqual(queue.buckets[0].items[0].nextAction.code, 'add_requirement');
      assert.throws(() =>
        RoleAwareWorkQueueSchema.parse({
          ...queue,
          buckets: queue.buckets.slice(0, 2),
        }),
      );
    });
  });

  describe('RFC 9457 ProblemDetail Contracts', () => {
    test('validates compliant problem detail error payload', () => {
      const error = ProblemDetailSchema.parse({
        type: 'https://api.qa-hub.com/errors/validation-failed',
        title: 'Validation Failed',
        status: 400,
        detail: 'The provided task parameters are invalid.',
        code: 'VALIDATION_ERROR',
        errors: [
          {
            field: 'dueDate',
            message: 'startDate cannot be after dueDate',
          },
        ],
      });
      assert.strictEqual(error.status, 400);
      assert.strictEqual(error.errors?.length, 1);
    });

    test('rejects problem detail with invalid status code', () => {
      assert.throws(() =>
        ProblemDetailSchema.parse({
          type: 'error',
          title: 'Error',
          status: 99,
        }),
      );
    });
  });

  describe('Notification & FCM Contracts', () => {
    test('validates FCM token registration and unregistration schemas', () => {
      const reg = RegisterFcmTokenSchema.parse({
        token: 'fcm-device-token-12345',
        deviceInfo: 'Chrome on MacOS',
      });
      assert.strictEqual(reg.token, 'fcm-device-token-12345');
      assert.strictEqual(reg.deviceInfo, 'Chrome on MacOS');

      const unreg = UnregisterFcmTokenSchema.parse({
        token: 'fcm-device-token-12345',
      });
      assert.strictEqual(unreg.token, 'fcm-device-token-12345');
    });

    test('rejects empty FCM token', () => {
      assert.throws(() => RegisterFcmTokenSchema.parse({ token: '' }));
      assert.throws(() => UnregisterFcmTokenSchema.parse({ token: '   ' }));
    });

    test('validates push notification payload schema', () => {
      const payload = PushNotificationPayloadSchema.parse({
        title: 'Tugas Baru Ditugaskan',
        body: 'Anda telah ditugaskan pada tugas baru.',
        data: {
          taskId: '123e4567-e89b-12d3-a456-426614174000',
          type: 'assignment',
        },
      });
      assert.strictEqual(payload.title, 'Tugas Baru Ditugaskan');
      assert.strictEqual(payload.data?.type, 'assignment');
    });

    test('validates InAppNotificationSchema and ListNotificationsResponseSchema', () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      const notif = InAppNotificationSchema.parse({
        id: validUuid,
        userId: validUuid,
        workspaceId: validUuid,
        taskId: validUuid,
        actorId: validUuid,
        actorName: 'Product Owner',
        type: 'assignment',
        title: 'Tugas Baru Ditugaskan',
        message: 'PO menugaskan Anda pada tugas FE',
        isRead: false,
        createdAt: '2026-08-19T10:00:00.000Z',
      });
      assert.strictEqual(notif.title, 'Tugas Baru Ditugaskan');
      assert.strictEqual(notif.isRead, false);
      assert.strictEqual(notif.type, 'assignment');

      const bugNotif = InAppNotificationSchema.parse({
        id: validUuid,
        userId: validUuid,
        workspaceId: validUuid,
        taskId: validUuid,
        actorId: validUuid,
        actorName: 'QA Tester',
        type: 'bug_created',
        title: 'Bug Baru Dilaporkan',
        message: 'QA melaporkan bug pada tugas FE',
        isRead: false,
        createdAt: '2026-08-24T10:00:00.000Z',
      });
      assert.strictEqual(bugNotif.type, 'bug_created');

      const response = ListNotificationsResponseSchema.parse({
        notifications: [notif, bugNotif],
        unreadCount: 2,
        totalCount: 2,
      });
      assert.strictEqual(response.unreadCount, 2);
      assert.strictEqual(response.notifications.length, 2);
    });

    test('validates ListNotificationsQuerySchema transformations', () => {
      const query = ListNotificationsQuerySchema.parse({
        unreadOnly: 'true',
        limit: '50',
        offset: '10',
      });
      assert.strictEqual(query.unreadOnly, true);
      assert.strictEqual(query.limit, 50);
      assert.strictEqual(query.offset, 10);
    });
  });

  describe('Workspace Activity Explorer Contracts', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';

    test('validates WorkspaceActivityListResponseSchema with multiple entity types', () => {
      const sample = WorkspaceActivityListResponseSchema.parse({
        activities: [
          {
            id: validUuid,
            workspaceId: validUuid,
            entityType: 'bug',
            entityId: validUuid,
            entityTitle: 'BUG-101 Crash on submit',
            actorId: validUuid,
            actorName: 'QA Engineer',
            action: 'bug.created',
            metadataJson: { severity: 'critical' },
            createdAt: '2026-08-24T10:00:00.000Z',
          },
          {
            id: validUuid,
            workspaceId: validUuid,
            entityType: 'folder',
            entityId: validUuid,
            entityTitle: 'Sprint 24',
            actorId: validUuid,
            actorName: 'Admin',
            action: 'folder.created',
            metadataJson: null,
            createdAt: '2026-08-24T10:05:00.000Z',
          },
        ],
        total: 2,
        page: 1,
        limit: 50,
      });
      assert.strictEqual(sample.activities.length, 2);
      assert.strictEqual(sample.activities[0].entityType, 'bug');
      assert.strictEqual(sample.activities[1].entityType, 'folder');
    });
  });

  describe('User & Onboarding Contracts', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';

    test('validates UserSchema with and without onboardingCompletedAt', () => {
      const userWithoutOnboarding = UserSchema.parse({
        id: validUuid,
        email: 'dev@company.com',
        name: 'Dev User',
        role: 'dev',
        createdAt: '2026-08-19T10:00:00.000Z',
        updatedAt: '2026-08-19T10:00:00.000Z',
      });
      assert.strictEqual(userWithoutOnboarding.onboardingCompletedAt, undefined);

      const userWithOnboarding = UserSchema.parse({
        id: validUuid,
        email: 'po@company.com',
        name: 'PO User',
        role: 'po',
        onboardingCompletedAt: '2026-08-19T12:00:00.000Z',
        createdAt: '2026-08-19T10:00:00.000Z',
        updatedAt: '2026-08-19T12:00:00.000Z',
      });
      assert.strictEqual(userWithOnboarding.onboardingCompletedAt, '2026-08-19T12:00:00.000Z');
    });

    test('validates CompleteOnboardingResponseSchema', () => {
      const res = CompleteOnboardingResponseSchema.parse({
        success: true,
        onboardingCompletedAt: '2026-08-19T12:30:00.000Z',
      });
      assert.strictEqual(res.success, true);
      assert.strictEqual(res.onboardingCompletedAt, '2026-08-19T12:30:00.000Z');
    });
  });
});
