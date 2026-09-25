import assert from 'node:assert';
import { after, before, describe, test } from 'node:test';
import type { Server } from 'node:http';
import { createApp } from '../../../app.js';
import { sequelize } from '../../../db/sequelize.js';
import {
  TaskModel,
  UserModel,
  WorkspaceMemberModel,
  WorkspaceMemberSpecialtyModel,
  WorkspaceModel,
} from '../../../db/models/index.js';
import { accessTokenCookieName, signToken } from '../../auth/jwt.js';
import { sessionManager } from '../../auth/sessionManager.js';
import type {
  AssignmentConflictPreviewResponse,
  TeamCapacityTimelineResponse,
} from '@qlick/contracts';

describe('Capacity & Workload Conflict API Integration (AUTH-011, FLOW-007)', () => {
  let server: Server;
  let baseUrl: string;
  let ownerUser: UserModel;
  let poUser: UserModel;
  let devUser: UserModel;
  let devUser2: UserModel;
  let qaUser: UserModel;
  let outsiderUser: UserModel;

  let workspaceA: WorkspaceModel;
  let workspaceB: WorkspaceModel;

  let rootTaskA: TaskModel;
  let rootTaskB: TaskModel;

  let subtaskExistingA1: TaskModel;
  let subtaskExistingA2: TaskModel;
  let subtaskDoneA: TaskModel;
  let subtaskUnscheduledA: TaskModel;
  let subtaskOtherWsB: TaskModel;

  let poCookie: string;
  let devCookie: string;
  let qaCookie: string;
  let outsiderCookie: string;

  async function authCookie(user: UserModel): Promise<string> {
    const sessionId = await sessionManager.createSession(
      user.id,
      'CapacityIntegration',
      '127.0.0.1',
    );
    const token = signToken({ userId: user.id, email: user.email, role: user.role, sessionId });
    return `${accessTokenCookieName}=${token}`;
  }

  before(async () => {
    await sequelize.authenticate();
    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address();
        if (typeof address === 'object' && address) {
          baseUrl = `http://localhost:${address.port}/v1`;
        }
        resolve();
      });
    });

    const stamp = Date.now();

    // 1. Create Users
    ownerUser = await UserModel.create({
      email: `cap_owner_${stamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Capacity Owner',
      role: 'owner',
    });
    poUser = await UserModel.create({
      email: `cap_po_${stamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Capacity PO',
      role: 'po',
    });
    devUser = await UserModel.create({
      email: `cap_dev_${stamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Capacity Dev 1',
      role: 'dev',
    });
    devUser2 = await UserModel.create({
      email: `cap_dev2_${stamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Capacity Dev 2',
      role: 'dev',
    });
    qaUser = await UserModel.create({
      email: `cap_qa_${stamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Capacity QA',
      role: 'qa',
    });
    outsiderUser = await UserModel.create({
      email: `cap_outsider_${stamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Capacity Outsider',
      role: 'dev',
    });

    // 2. Create Workspaces
    workspaceA = await WorkspaceModel.create({
      name: `Workspace Alpha ${stamp}`,
      slug: `workspace-alpha-${stamp}`,
      ownerId: ownerUser.id,
    });
    workspaceB = await WorkspaceModel.create({
      name: `Workspace Beta ${stamp}`,
      slug: `workspace-beta-${stamp}`,
      ownerId: ownerUser.id,
    });

    // 3. Workspace Memberships
    // Workspace A: ownerUser (owner), poUser (po), devUser (dev), devUser2 (dev), qaUser (qa)
    const membersA = await WorkspaceMemberModel.bulkCreate([
      { workspaceId: workspaceA.id, userId: ownerUser.id, role: 'owner' },
      { workspaceId: workspaceA.id, userId: poUser.id, role: 'po' },
      { workspaceId: workspaceA.id, userId: devUser.id, role: 'dev' },
      { workspaceId: workspaceA.id, userId: devUser2.id, role: 'dev' },
      { workspaceId: workspaceA.id, userId: qaUser.id, role: 'qa' },
    ]);

    const devMemberA = membersA.find((m) => m.userId === devUser.id)!;
    const dev2MemberA = membersA.find((m) => m.userId === devUser2.id)!;
    await WorkspaceMemberSpecialtyModel.bulkCreate([
      {
        workspaceId: workspaceA.id,
        workspaceMemberId: devMemberA.id,
        specialty: 'frontend',
        createdBy: ownerUser.id,
      },
      {
        workspaceId: workspaceA.id,
        workspaceMemberId: dev2MemberA.id,
        specialty: 'backend',
        createdBy: ownerUser.id,
      },
    ]);

    // Workspace B: ownerUser (owner), devUser (dev)
    // NOTE: poUser is NOT a member of Workspace B!
    const membersB = await WorkspaceMemberModel.bulkCreate([
      { workspaceId: workspaceB.id, userId: ownerUser.id, role: 'owner' },
      { workspaceId: workspaceB.id, userId: devUser.id, role: 'dev' },
    ]);
    const devMemberB = membersB.find((m) => m.userId === devUser.id)!;
    await WorkspaceMemberSpecialtyModel.create({
      workspaceId: workspaceB.id,
      workspaceMemberId: devMemberB.id,
      specialty: 'frontend',
      createdBy: ownerUser.id,
    });

    // 4. Create Root Features
    rootTaskA = await TaskModel.create({
      workspaceId: workspaceA.id,
      title: 'Root Feature Alpha',
      status: 'in_progress',
      priority: 'high',
      reporterId: poUser.id,
    });

    rootTaskB = await TaskModel.create({
      workspaceId: workspaceB.id,
      title: 'Confidential Root Feature Beta',
      status: 'in_progress',
      priority: 'high',
      reporterId: ownerUser.id,
    });

    // 5. Create Subtasks for devUser:
    // a. Subtask in Workspace A: 2026-10-10 to 2026-10-15 (active, in_progress)
    subtaskExistingA1 = await TaskModel.create({
      workspaceId: workspaceA.id,
      parentTaskId: rootTaskA.id,
      title: 'Active FE Subtask A1',
      deliveryArea: 'frontend',
      status: 'in_progress',
      priority: 'high',
      assigneeId: devUser.id,
      reporterId: poUser.id,
      startDate: '2026-10-10',
      dueDate: '2026-10-15',
    });

    // b. Subtask in Workspace A: 2026-10-20 to 2026-10-25 (active, todo)
    subtaskExistingA2 = await TaskModel.create({
      workspaceId: workspaceA.id,
      parentTaskId: rootTaskA.id,
      title: 'Active FE Subtask A2',
      deliveryArea: 'frontend',
      status: 'todo',
      priority: 'medium',
      assigneeId: devUser.id,
      reporterId: poUser.id,
      startDate: '2026-10-20',
      dueDate: '2026-10-25',
    });

    // c. Subtask in Workspace A: 2026-10-12 to 2026-10-14, but status 'done' (MUST BE IGNORED)
    subtaskDoneA = await TaskModel.create({
      workspaceId: workspaceA.id,
      parentTaskId: rootTaskA.id,
      title: 'Completed Subtask A',
      deliveryArea: 'frontend',
      status: 'done',
      priority: 'medium',
      assigneeId: devUser.id,
      reporterId: poUser.id,
      startDate: '2026-10-12',
      dueDate: '2026-10-14',
    });

    // d. Subtask in Workspace A: Active but unscheduled (startDate null, dueDate null)
    subtaskUnscheduledA = await TaskModel.create({
      workspaceId: workspaceA.id,
      parentTaskId: rootTaskA.id,
      title: 'Unscheduled Work A',
      deliveryArea: 'frontend',
      status: 'todo',
      priority: 'low',
      assigneeId: devUser.id,
      reporterId: poUser.id,
      startDate: null,
      dueDate: null,
    });

    // e. Subtask in Workspace B: 2026-10-14 to 2026-10-18 (active, in_progress)
    subtaskOtherWsB = await TaskModel.create({
      workspaceId: workspaceB.id,
      parentTaskId: rootTaskB.id,
      title: 'Top Secret Beta Subtask',
      deliveryArea: 'frontend',
      status: 'in_progress',
      priority: 'urgent',
      assigneeId: devUser.id,
      reporterId: ownerUser.id,
      startDate: '2026-10-14',
      dueDate: '2026-10-18',
    });

    poCookie = await authCookie(poUser);
    devCookie = await authCookie(devUser);
    qaCookie = await authCookie(qaUser);
    outsiderCookie = await authCookie(outsiderUser);
  });

  after(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  test('POST /capacity/assignment-preview: calculates inclusive overlap and reports unscheduled workload', async () => {
    // Candidate date range: 2026-10-13 to 2026-10-16
    // Should overlap with:
    // - subtaskExistingA1 (2026-10-10 to 2026-10-15) because 10-10 <= 10-16 and 10-15 >= 10-13
    // - subtaskOtherWsB (2026-10-14 to 2026-10-18) because 10-14 <= 10-16 and 10-18 >= 10-13
    // Should NOT overlap with:
    // - subtaskExistingA2 (2026-10-20 to 2026-10-25)
    // - subtaskDoneA (status done is ignored)
    // - subtaskUnscheduledA is reported as unscheduledActiveCount = 1

    const response = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/capacity/assignment-preview`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: poCookie,
        },
        body: JSON.stringify({
          assigneeId: devUser.id,
          startDate: '2026-10-13',
          dueDate: '2026-10-16',
        }),
      },
    );

    assert.strictEqual(response.status, 200);
    const data = (await response.json()) as AssignmentConflictPreviewResponse;

    assert.strictEqual(data.hasConflict, true);
    assert.strictEqual(data.conflictCount, 2);
    assert.strictEqual(data.unscheduledActiveCount, 1);

    // Verify subtask from active workspace has full details
    const currentWsConflict = data.conflicts.find((c) => c.isCurrentWorkspace);
    assert.ok(currentWsConflict);
    assert.strictEqual(currentWsConflict.id, subtaskExistingA1.id);
    assert.strictEqual(currentWsConflict.title, 'Active FE Subtask A1');
    assert.strictEqual(currentWsConflict.deliveryArea, 'frontend');
    assert.strictEqual(currentWsConflict.isRedacted, false);

    // Verify subtask from Workspace B is REDACTED for poUser (who is NOT member of Workspace B)
    const otherWsConflict = data.conflicts.find((c) => !c.isCurrentWorkspace);
    assert.ok(otherWsConflict);
    assert.strictEqual(otherWsConflict.isRedacted, true);
    assert.strictEqual(otherWsConflict.title, undefined);
    assert.strictEqual(otherWsConflict.workspaceId, undefined);
    assert.strictEqual(otherWsConflict.startDate, '2026-10-14');
    assert.strictEqual(otherWsConflict.dueDate, '2026-10-18');

    // Verify subtaskExistingA2 and subtaskDoneA are NOT in conflicts
    assert.strictEqual(data.conflicts.some((c) => c.id === subtaskExistingA2.id), false);
    assert.strictEqual(data.conflicts.some((c) => c.id === subtaskDoneA.id), false);
    // Verify subtaskUnscheduledA is reported in unscheduledSubtasks
    assert.strictEqual(data.unscheduledSubtasks.some((u) => u.id === subtaskUnscheduledA.id), true);
  });

  test('POST /capacity/assignment-preview: excludes the edited subtask itself (excludeSubtaskId)', async () => {
    // If we are editing subtaskExistingA1 with candidate range 2026-10-10 to 2026-10-12,
    // and excludeSubtaskId = subtaskExistingA1.id, it must NOT conflict with itself!
    const response = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/capacity/assignment-preview`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: poCookie,
        },
        body: JSON.stringify({
          assigneeId: devUser.id,
          startDate: '2026-10-10',
          dueDate: '2026-10-12',
          excludeSubtaskId: subtaskExistingA1.id,
        }),
      },
    );

    assert.strictEqual(response.status, 200);
    const data = (await response.json()) as AssignmentConflictPreviewResponse;

    // Range 10-10 to 10-12 does NOT overlap with subtaskOtherWsB (10-14 to 10-18),
    // and subtaskExistingA1 was excluded, so hasConflict should be false!
    assert.strictEqual(data.hasConflict, false);
    assert.strictEqual(data.conflictCount, 0);
    assert.strictEqual(data.unscheduledActiveCount, 1);
  });

  test('POST /capacity/assignment-preview: reveals cross-workspace details if actor IS a member of the other workspace', async () => {
    // ownerUser is a member of BOTH Workspace A and Workspace B!
    const ownerCookie = await authCookie(ownerUser);

    const response = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/capacity/assignment-preview`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: ownerCookie,
        },
        body: JSON.stringify({
          assigneeId: devUser.id,
          startDate: '2026-10-14',
          dueDate: '2026-10-16',
        }),
      },
    );

    assert.strictEqual(response.status, 200);
    const data = (await response.json()) as AssignmentConflictPreviewResponse;

    const bConflict = data.conflicts.find((c) => c.id === subtaskOtherWsB.id);
    assert.ok(bConflict);
    assert.strictEqual(bConflict.isRedacted, false);
    assert.strictEqual(bConflict.title, 'Top Secret Beta Subtask');
  });

  test('POST /capacity/assignment-preview: RBAC rejects Developer and QA with 403 Forbidden', async () => {
    // Developer attempts to call preview
    const devResponse = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/capacity/assignment-preview`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: devCookie,
        },
        body: JSON.stringify({
          assigneeId: devUser.id,
          startDate: '2026-10-10',
          dueDate: '2026-10-15',
        }),
      },
    );
    assert.strictEqual(devResponse.status, 403);

    // QA attempts to call preview
    const qaResponse = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/capacity/assignment-preview`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: qaCookie,
        },
        body: JSON.stringify({
          assigneeId: devUser.id,
          startDate: '2026-10-10',
          dueDate: '2026-10-15',
        }),
      },
    );
    assert.strictEqual(qaResponse.status, 403);
  });

  test('POST /capacity/assignment-preview: rejects non-workspace member with 403 Forbidden', async () => {
    const response = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/capacity/assignment-preview`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: outsiderCookie,
        },
        body: JSON.stringify({
          assigneeId: devUser.id,
          startDate: '2026-10-10',
          dueDate: '2026-10-15',
        }),
      },
    );
    assert.strictEqual(response.status, 403);
  });

  test('POST /capacity/assignment-preview: validates ordered date pairs', async () => {
    const response = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/capacity/assignment-preview`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: poCookie,
        },
        body: JSON.stringify({
          assigneeId: devUser.id,
          startDate: '2026-10-20',
          dueDate: '2026-10-10', // Inverted!
        }),
      },
    );
    assert.strictEqual(response.status, 400);
  });

  test('GET /capacity/timeline: returns team timeline per member with scheduled & unscheduled subtasks', async () => {
    const response = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/capacity/timeline?startDate=2026-10-01&endDate=2026-10-31&scope=workspace`,
      {
        headers: {
          Cookie: poCookie,
        },
      },
    );

    assert.strictEqual(response.status, 200);
    const data = (await response.json()) as TeamCapacityTimelineResponse;

    assert.strictEqual(data.workspaceId, workspaceA.id);
    assert.strictEqual(data.scope, 'workspace');
    assert.ok(data.members.length >= 4);

    const devMember = data.members.find((m) => m.userId === devUser.id);
    assert.ok(devMember);
    assert.strictEqual(devMember.name, 'Capacity Dev 1');
    assert.ok(devMember.scheduledSubtasks.length >= 2);
    assert.ok(devMember.unscheduledSubtasks.length >= 1);
  });

  test('GET /capacity/timeline: allows Developer and QA to view team timeline in read-only mode', async () => {
    const response = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/capacity/timeline?startDate=2026-10-01&endDate=2026-10-31`,
      {
        headers: {
          Cookie: devCookie,
        },
      },
    );
    assert.strictEqual(response.status, 200);

    const qaRes = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/capacity/timeline?startDate=2026-10-01&endDate=2026-10-31`,
      {
        headers: {
          Cookie: qaCookie,
        },
      },
    );
    assert.strictEqual(qaRes.status, 200);
  });

  test('GET /capacity/timeline: rejects non-workspace member with 403 Forbidden', async () => {
    const response = await fetch(
      `${baseUrl}/workspaces/${workspaceA.id}/capacity/timeline?startDate=2026-10-01&endDate=2026-10-31`,
      {
        headers: {
          Cookie: outsiderCookie,
        },
      },
    );
    assert.strictEqual(response.status, 403);
  });
});
