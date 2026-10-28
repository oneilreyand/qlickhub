import assert from 'node:assert';
import { test, describe, before, after } from 'node:test';
import { taskService } from '../taskService.js';
import { taskAcceptanceCheckService } from '../taskAcceptanceCheckService.js';
import { TaskModel } from '../../../db/models/task.js';
import { WorkFolderModel } from '../../../db/models/workFolder.js';
import { WorkspaceModel } from '../../../db/models/workspace.js';
import { WorkspaceMemberModel } from '../../../db/models/workspaceMember.js';
import { UserModel } from '../../../db/models/user.js';
import { RequirementModel } from '../../../db/models/requirement.js';
import { TaskRequirementModel } from '../../../db/models/taskRequirement.js';
import { AcceptanceCriterionModel } from '../../../db/models/acceptanceCriterion.js';
import { SubtaskAcceptanceCheckModel } from '../../../db/models/subtaskAcceptanceCheck.js';
import { CreateTaskSchema } from '@qlick/contracts';

describe('Subtask Acceptance Criterion self-checks (P2c, AC-2.11)', () => {
  const stamp = Date.now();
  let owner: UserModel;
  let po: UserModel;
  let dev: UserModel;
  let otherDev: UserModel;
  let qa: UserModel;
  let workspace: WorkspaceModel;
  let subtask: TaskModel;
  let parent: TaskModel;
  let criterionA: AcceptanceCriterionModel;
  let criterionB: AcceptanceCriterionModel;
  let unlinkedCriterion: AcceptanceCriterionModel;

  const mkUser = (key: string, role: 'admin' | 'po' | 'dev' | 'qa') =>
    UserModel.create({
      email: `p2c-${key}-${stamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: `P2c ${key}`,
      role,
    });

  before(async () => {
    owner = await mkUser('owner', 'admin');
    po = await mkUser('po', 'po');
    dev = await mkUser('dev', 'dev');
    otherDev = await mkUser('other-dev', 'dev');
    qa = await mkUser('qa', 'qa');
    workspace = await WorkspaceModel.create({
      name: 'P2c Workspace',
      slug: `p2c-ws-${stamp}`,
      ownerId: owner.id,
    });
    for (const [user, role] of [
      [owner, 'owner'],
      [po, 'po'],
      [dev, 'dev'],
      [otherDev, 'dev'],
      [qa, 'qa'],
    ] as const) {
      await WorkspaceMemberModel.create({ workspaceId: workspace.id, userId: user.id, role });
    }
    const folder = await WorkFolderModel.create({
      workspaceId: workspace.id,
      name: 'P2c',
      position: 0,
      createdBy: owner.id,
    });
    const createdParent = await taskService.createTask(
      po.id,
      CreateTaskSchema.parse({
        workspaceId: workspace.id,
        folderId: folder.id,
        title: 'P2c Feature',
        status: 'in_progress',
        priority: 'high',
      }),
    );
    parent = (await TaskModel.findByPk(createdParent.id))!;

    const requirement = await RequirementModel.create({
      workspaceId: workspace.id,
      code: `REQ-P2C-${stamp}`,
      title: 'Requirement with two criteria',
      status: 'active',
      createdBy: po.id,
    });
    const otherRequirement = await RequirementModel.create({
      workspaceId: workspace.id,
      code: `REQ-P2C-X-${stamp}`,
      title: 'Requirement not linked to the subtask',
      status: 'active',
      createdBy: po.id,
    });
    await TaskRequirementModel.create({
      workspaceId: workspace.id,
      taskId: parent.id,
      requirementId: requirement.id,
      linkedBy: po.id,
    });
    const mkCriterion = (requirementId: string, sequence: number) =>
      AcceptanceCriterionModel.create({
        workspaceId: workspace.id,
        requirementId,
        sequence,
        text: `Kriteria ${sequence}`,
        status: 'active',
        createdBy: po.id,
      });
    criterionA = await mkCriterion(requirement.id, 1);
    criterionB = await mkCriterion(requirement.id, 2);
    unlinkedCriterion = await mkCriterion(otherRequirement.id, 1);

    const created = await taskService.createTask(
      po.id,
      CreateTaskSchema.parse({
        workspaceId: workspace.id,
        parentTaskId: parent.id,
        deliveryArea: 'frontend',
        title: 'P2c Dev subtask',
        assigneeId: dev.id,
        requirementIds: [requirement.id],
      }),
    );
    subtask = (await TaskModel.findByPk(created.id))!;
  });

  after(async () => {
    await SubtaskAcceptanceCheckModel.destroy({ where: { workspaceId: workspace.id } });
    await AcceptanceCriterionModel.destroy({ where: { workspaceId: workspace.id }, force: true });
    await TaskRequirementModel.destroy({ where: { workspaceId: workspace.id }, force: true });
    await TaskModel.destroy({ where: { workspaceId: workspace.id }, force: true });
    await RequirementModel.destroy({ where: { workspaceId: workspace.id }, force: true });
    await WorkFolderModel.destroy({ where: { workspaceId: workspace.id }, force: true });
    await WorkspaceMemberModel.destroy({ where: { workspaceId: workspace.id }, force: true });
    await WorkspaceModel.destroy({ where: { id: workspace.id }, force: true });
    for (const user of [owner, po, dev, otherDev, qa]) {
      await UserModel.destroy({ where: { id: user.id }, force: true });
    }
  });

  test('assignee checks and unchecks a criterion; checks persist and are readable by QA', async () => {
    const after1 = await taskAcceptanceCheckService.setChecked(
      dev.id,
      workspace.id,
      subtask.id,
      criterionA.id,
      true,
    );
    assert.deepStrictEqual(
      after1.checks.map((check) => check.acceptanceCriterionId),
      [criterionA.id],
    );
    assert.strictEqual(after1.checks[0].checkedBy, dev.id);

    // Idempotent: checking twice keeps one row.
    await taskAcceptanceCheckService.setChecked(
      dev.id,
      workspace.id,
      subtask.id,
      criterionA.id,
      true,
    );
    await taskAcceptanceCheckService.setChecked(
      dev.id,
      workspace.id,
      subtask.id,
      criterionB.id,
      true,
    );

    const seenByQa = await taskAcceptanceCheckService.list(qa.id, workspace.id, subtask.id);
    assert.strictEqual(seenByQa.checks.length, 2);

    const after2 = await taskAcceptanceCheckService.setChecked(
      dev.id,
      workspace.id,
      subtask.id,
      criterionA.id,
      false,
    );
    assert.deepStrictEqual(
      after2.checks.map((check) => check.acceptanceCriterionId),
      [criterionB.id],
    );
  });

  test('rejects other developers, QA, and criteria that are not linked to the subtask', async () => {
    await assert.rejects(
      taskAcceptanceCheckService.setChecked(
        otherDev.id,
        workspace.id,
        subtask.id,
        criterionA.id,
        true,
      ),
      /FORBIDDEN/,
    );
    await assert.rejects(
      taskAcceptanceCheckService.setChecked(qa.id, workspace.id, subtask.id, criterionA.id, true),
      /FORBIDDEN/,
    );
    await assert.rejects(
      taskAcceptanceCheckService.setChecked(
        dev.id,
        workspace.id,
        subtask.id,
        unlinkedCriterion.id,
        true,
      ),
      /NOT_FOUND/,
    );
  });

  test('owner may check on behalf, and a Feature (not a subtask) is rejected', async () => {
    const result = await taskAcceptanceCheckService.setChecked(
      owner.id,
      workspace.id,
      subtask.id,
      criterionA.id,
      true,
    );
    assert.ok(result.checks.some((check) => check.acceptanceCriterionId === criterionA.id));
    await assert.rejects(
      taskAcceptanceCheckService.list(owner.id, workspace.id, parent.id),
      /BAD_REQUEST/,
    );
  });
});
