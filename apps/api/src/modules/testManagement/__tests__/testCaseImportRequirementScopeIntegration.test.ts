import assert from 'node:assert';
import { test, describe, before, after } from 'node:test';
import { taskService } from '../../tasks/taskService.js';
import { testCaseImportService } from '../testCaseImportService.js';
import { TaskModel } from '../../../db/models/task.js';
import { WorkFolderModel } from '../../../db/models/workFolder.js';
import { WorkspaceModel } from '../../../db/models/workspace.js';
import { WorkspaceMemberModel } from '../../../db/models/workspaceMember.js';
import { UserModel } from '../../../db/models/user.js';
import { RequirementModel } from '../../../db/models/requirement.js';
import { TaskRequirementModel } from '../../../db/models/taskRequirement.js';
import { TestCaseModel } from '../../../db/models/testCase.js';
import { CreateTaskSchema } from '@qlick/contracts';

describe('Spreadsheet import scope and team format (P4c-3)', () => {
  const stamp = Date.now();
  let owner: UserModel;
  let po: UserModel;
  let qa: UserModel;
  let otherQa: UserModel;
  let workspace: WorkspaceModel;
  let qaSubtask: TaskModel;
  let linkedCode: string;
  let unlinkedCode: string;

  const mkUser = (key: string, role: 'admin' | 'po' | 'qa') =>
    UserModel.create({
      email: `p4c3-${key}-${stamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: `P4c3 ${key}`,
      role,
    });

  before(async () => {
    owner = await mkUser('owner', 'admin');
    po = await mkUser('po', 'po');
    qa = await mkUser('qa', 'qa');
    otherQa = await mkUser('other-qa', 'qa');
    workspace = await WorkspaceModel.create({
      name: 'P4c3 Workspace',
      slug: `p4c3-ws-${stamp}`,
      ownerId: owner.id,
    });
    for (const [user, role] of [
      [owner, 'owner'],
      [po, 'po'],
      [qa, 'qa'],
      [otherQa, 'qa'],
    ] as const) {
      await WorkspaceMemberModel.create({ workspaceId: workspace.id, userId: user.id, role });
    }
    const folder = await WorkFolderModel.create({
      workspaceId: workspace.id,
      name: 'P4c3',
      position: 0,
      createdBy: owner.id,
    });
    const feature = await taskService.createTask(
      po.id,
      CreateTaskSchema.parse({
        workspaceId: workspace.id,
        folderId: folder.id,
        title: 'P4c3 Feature',
        status: 'in_progress',
        priority: 'high',
      }),
    );
    linkedCode = `REQ-P4C3-${stamp}`;
    unlinkedCode = `REQ-P4C3-X-${stamp}`;
    const linked = await RequirementModel.create({
      workspaceId: workspace.id,
      code: linkedCode,
      title: 'Linked requirement',
      status: 'active',
      createdBy: po.id,
    });
    await RequirementModel.create({
      workspaceId: workspace.id,
      code: unlinkedCode,
      title: 'Active but not linked to this Feature',
      status: 'active',
      createdBy: po.id,
    });
    await TaskRequirementModel.create({
      workspaceId: workspace.id,
      taskId: feature.id,
      requirementId: linked.id,
      linkedBy: po.id,
    });
    const created = await taskService.createTask(
      po.id,
      CreateTaskSchema.parse({
        workspaceId: workspace.id,
        parentTaskId: feature.id,
        deliveryArea: 'qa',
        title: 'P4c3 QA subtask',
        assigneeId: qa.id,
        requirementIds: [linked.id],
      }),
    );
    qaSubtask = (await TaskModel.findByPk(created.id))!;
  });

  after(async () => {
    await TestCaseModel.destroy({ where: { workspaceId: workspace.id }, force: true });
    await TaskRequirementModel.destroy({ where: { workspaceId: workspace.id }, force: true });
    await TaskModel.destroy({ where: { workspaceId: workspace.id }, force: true });
    await RequirementModel.destroy({ where: { workspaceId: workspace.id }, force: true });
    await WorkFolderModel.destroy({ where: { workspaceId: workspace.id }, force: true });
    await WorkspaceMemberModel.destroy({ where: { workspaceId: workspace.id } });
    await WorkspaceModel.destroy({ where: { id: workspace.id }, force: true });
    for (const user of [owner, po, qa, otherQa]) {
      await UserModel.destroy({ where: { id: user.id }, force: true });
    }
  });

  const teamCsv = () =>
    [
      'Test Case ID,Test Title,Requirement ID,Description (Langkah Uji),Expected Result,Test Data,Priority,Type,Status,Evidance,Notes,Sprint,Date',
      `TC-P4C3-1,Jadwal baru tampil,${linkedCode},"1. Login\n2. Buat jadwal",Nama tampil,,Critical,Positive,Pass,a.mov,,S1,2026-02-03`,
      `TC-P4C3-2,Zoom nama jadwal,${linkedCode},"1. Zoom in",Nama penuh,,Medium,UI,Pass,b.mov,,S1,2026-02-03`,
      `TC-P4C3-3,Requirement lain,${unlinkedCode},"1. Buka",Ok,,High,Negative,Pass,,,S1,2026-02-03`,
      'TC-P4C3-4,Requirement tidak ada,REQ-NOPE,"1. Buka",Ok,,High,Edge,Pass,,,S1,2026-02-03',
    ].join('\n');

  test('previews the team format: normalizes values and rejects Requirements outside the Feature', async () => {
    const preview = await testCaseImportService.previewImport(
      workspace.id,
      qa.id,
      'team.csv',
      Buffer.from(teamCsv(), 'utf8'),
      'text/csv',
      undefined,
      undefined,
      qaSubtask.id,
    );
    assert.strictEqual(preview.totalRows, 4);
    assert.strictEqual(preview.validRows, 2);
    assert.strictEqual(preview.invalidRows, 2);
    assert.deepStrictEqual(preview.unmappedHeaders, []);
    assert.deepStrictEqual(preview.ignoredHeaders, [
      'Status',
      'Evidance',
      'Notes',
      'Sprint',
      'Date',
    ]);
    assert.deepStrictEqual(preview.allowedRequirementCodes, [linkedCode]);

    const [first, second, third, fourth] = preview.rows;
    assert.strictEqual(first.priority, 'high');
    assert.strictEqual(first.scenarioKind, 'positive');
    assert.deepStrictEqual(first.steps, ['Login', 'Buat jadwal']);
    assert.strictEqual(second.testType, 'manual');
    assert.strictEqual(third.isValid, false);
    assert.ok(third.validationErrors.some((e) => e.includes('tidak ditautkan ke Feature ini')));
    assert.strictEqual(fourth.isValid, false);
    assert.ok(fourth.validationErrors.some((e) => e.includes('REQ-NOPE')));
  });

  test('commits only the valid rows as active Test Cases and leaves the rest for the QA to fix', async () => {
    const preview = await testCaseImportService.previewImport(
      workspace.id,
      qa.id,
      'team.csv',
      Buffer.from(teamCsv(), 'utf8'),
      'text/csv',
      undefined,
      undefined,
      qaSubtask.id,
    );
    const result = await testCaseImportService.commitImport(qa.id, {
      workspaceId: workspace.id,
      importSessionId: preview.importSessionId,
      contentHash: preview.contentHash,
      mode: 'create_only',
      qaSubtaskId: qaSubtask.id,
    });
    assert.strictEqual(result.createdRows, 2);
    assert.strictEqual(result.failedRows, 2);

    const created = await TestCaseModel.findAll({ where: { workspaceId: workspace.id } });
    assert.deepStrictEqual(created.map((tc) => tc.externalReference).sort(), [
      'TC-P4C3-1',
      'TC-P4C3-2',
    ]);
    assert.ok(created.every((tc) => tc.status === 'active'));
  });

  test('lets the QA correct rejected rows to a valid Requirement, then commits them', async () => {
    const preview = await testCaseImportService.previewImport(
      workspace.id,
      qa.id,
      'team.csv',
      Buffer.from(teamCsv(), 'utf8'),
      'text/csv',
      undefined,
      undefined,
      qaSubtask.id,
    );
    await assert.rejects(
      testCaseImportService.updateStagedRowRequirement(workspace.id, qa.id, {
        importSessionId: preview.importSessionId,
        requirementCode: unlinkedCode,
        sourceRowNumbers: [4],
        qaSubtaskId: qaSubtask.id,
      }),
      /tidak ditautkan ke Feature ini/,
    );
    await assert.rejects(
      testCaseImportService.updateStagedRowRequirement(workspace.id, otherQa.id, {
        importSessionId: preview.importSessionId,
        requirementCode: linkedCode,
        sourceRowNumbers: [4],
      }),
      /FORBIDDEN/,
    );

    const rejectedRows = preview.rows.filter((row) => !row.isValid).map((r) => r.sourceRowNumber);
    const fixed = await testCaseImportService.updateStagedRowRequirement(workspace.id, qa.id, {
      importSessionId: preview.importSessionId,
      requirementCode: linkedCode.toLowerCase(),
      sourceRowNumbers: rejectedRows,
      qaSubtaskId: qaSubtask.id,
    });
    assert.strictEqual(fixed.validRows, 4);
    assert.strictEqual(fixed.invalidRows, 0);
    assert.ok(fixed.rows.every((row) => row.requirementCode === linkedCode && row.isValid));

    const result = await testCaseImportService.commitImport(qa.id, {
      workspaceId: workspace.id,
      importSessionId: preview.importSessionId,
      contentHash: preview.contentHash,
      mode: 'create_only',
      qaSubtaskId: qaSubtask.id,
    });
    // TC-P4C3-1/2 sudah dibuat test sebelumnya, jadi dilewati sebagai duplikat (create_only).
    assert.strictEqual(result.failedRows, 0);
    assert.strictEqual(result.createdRows + result.skippedRows, 4);
    const corrected = await TestCaseModel.findAll({
      where: { workspaceId: workspace.id, externalReference: ['TC-P4C3-3', 'TC-P4C3-4'] },
    });
    assert.strictEqual(corrected.length, 2);
    assert.ok(corrected.every((tc) => tc.status === 'active'));
  });

  test('rejects a QA who is not assigned to the subtask', async () => {
    await assert.rejects(
      testCaseImportService.previewImport(
        workspace.id,
        otherQa.id,
        'team.csv',
        Buffer.from(teamCsv(), 'utf8'),
        'text/csv',
        undefined,
        undefined,
        qaSubtask.id,
      ),
      /FORBIDDEN/,
    );
  });
});
