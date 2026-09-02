import assert from 'node:assert';
import { test, describe, before, after } from 'node:test';
import { Server } from 'node:http';
import { createApp } from '../../../app.js';
import { sequelize } from '../../../db/sequelize.js';
import {
  UserModel,
  WorkspaceModel,
  WorkspaceMemberModel,
  TaskModel,
  RequirementModel,
  AcceptanceCriterionModel,
  TaskRequirementModel,
  TaskActivityModel,
  QaDocumentVersionModel,
} from '../../../db/models/index.js';
import { accessTokenCookieName, signToken } from '../../auth/jwt.js';
import { sessionManager } from '../../auth/sessionManager.js';

describe('Requirement HTTP API Integration Tests (AGY-1.1 and AGY-1.2)', () => {
  let appServer: Server;
  let baseUrl: string;

  let ownerUser: UserModel;
  let adminUser: UserModel;
  let poUser: UserModel;
  let devUser: UserModel;
  let qaUser: UserModel;
  let dualUser: UserModel;
  let outsiderUser: UserModel;

  let ownerCookie: string;
  let adminCookie: string;
  let poCookie: string;
  let devCookie: string;
  let qaCookie: string;
  let dualCookie: string;
  let outsiderCookie: string;

  let workspace1: WorkspaceModel;
  let workspace2: WorkspaceModel;
  let task1: TaskModel;

  async function createAuthCookie(user: UserModel): Promise<string> {
    const sessionId = await sessionManager.createSession(
      user.id,
      'RequirementIntegrationTest',
      '127.0.0.1',
    );
    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId,
    });
    return `${accessTokenCookieName}=${token}`;
  }

  before(async () => {
    await sequelize.authenticate();

    const app = createApp();
    await new Promise<void>((resolve) => {
      appServer = app.listen(0, () => {
        const address = appServer.address();
        if (typeof address === 'object' && address) {
          baseUrl = `http://localhost:${address.port}/v1`;
        }
        resolve();
      });
    });

    const timestamp = Date.now();

    // Create users
    ownerUser = await UserModel.create({
      email: `req_owner_${timestamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Workspace Owner',
      role: 'owner',
    });

    adminUser = await UserModel.create({
      email: `req_admin_${timestamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Workspace Admin',
      role: 'admin',
    });

    poUser = await UserModel.create({
      email: `req_po_${timestamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Product Owner User',
      role: 'po',
    });

    devUser = await UserModel.create({
      email: `req_dev_${timestamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Developer User',
      role: 'dev',
    });

    qaUser = await UserModel.create({
      email: `req_qa_${timestamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'QA Engineer User',
      role: 'qa',
    });

    dualUser = await UserModel.create({
      email: `req_dual_${timestamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Dual Member User',
      role: 'dev',
    });

    outsiderUser = await UserModel.create({
      email: `req_outsider_${timestamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Outsider User',
      role: 'admin',
    });

    // Create workspaces
    workspace1 = await WorkspaceModel.create({
      name: 'Req Workspace One',
      slug: `req-ws-one-${timestamp}`,
      ownerId: ownerUser.id,
    });

    workspace2 = await WorkspaceModel.create({
      name: 'Req Workspace Two',
      slug: `req-ws-two-${timestamp}`,
      ownerId: dualUser.id,
    });

    // Memberships for Workspace 1
    await WorkspaceMemberModel.create({
      workspaceId: workspace1.id,
      userId: ownerUser.id,
      role: 'owner',
    });
    await WorkspaceMemberModel.create({
      workspaceId: workspace1.id,
      userId: adminUser.id,
      role: 'admin',
    });
    await WorkspaceMemberModel.create({
      workspaceId: workspace1.id,
      userId: poUser.id,
      role: 'po',
    });
    await WorkspaceMemberModel.create({
      workspaceId: workspace1.id,
      userId: devUser.id,
      role: 'dev',
    });
    await WorkspaceMemberModel.create({
      workspaceId: workspace1.id,
      userId: qaUser.id,
      role: 'qa',
    });
    await WorkspaceMemberModel.create({
      workspaceId: workspace1.id,
      userId: dualUser.id,
      role: 'dev',
    });

    // Memberships for Workspace 2
    await WorkspaceMemberModel.create({
      workspaceId: workspace2.id,
      userId: dualUser.id,
      role: 'owner',
    });
    await WorkspaceMemberModel.create({
      workspaceId: workspace2.id,
      userId: outsiderUser.id,
      role: 'admin',
    });

    // Root task in workspace 1
    task1 = await TaskModel.create({
      workspaceId: workspace1.id,
      title: 'Checkout Flow Root Task',
      status: 'todo',
      priority: 'high',
      reporterId: poUser.id,
    });

    // Auth cookies
    ownerCookie = await createAuthCookie(ownerUser);
    adminCookie = await createAuthCookie(adminUser);
    poCookie = await createAuthCookie(poUser);
    devCookie = await createAuthCookie(devUser);
    qaCookie = await createAuthCookie(qaUser);
    dualCookie = await createAuthCookie(dualUser);
    outsiderCookie = await createAuthCookie(outsiderUser);
  });

  after(async () => {
    if (appServer) {
      await new Promise<void>((resolve) => appServer.close(() => resolve()));
    }

    if (task1) await TaskRequirementModel.destroy({ where: { taskId: task1.id } });
    if (task1) await TaskActivityModel.destroy({ where: { taskId: task1.id } });
    await RequirementModel.destroy({ where: { workspaceId: workspace1.id } });
    await RequirementModel.destroy({ where: { workspaceId: workspace2.id } });
    if (task1) await TaskModel.destroy({ where: { id: task1.id }, force: true });
    if (workspace1) await WorkspaceModel.destroy({ where: { id: workspace1.id } });
    if (workspace2) await WorkspaceModel.destroy({ where: { id: workspace2.id } });
    if (ownerUser) await UserModel.destroy({ where: { id: ownerUser.id } });
    if (adminUser) await UserModel.destroy({ where: { id: adminUser.id } });
    if (poUser) await UserModel.destroy({ where: { id: poUser.id } });
    if (devUser) await UserModel.destroy({ where: { id: devUser.id } });
    if (qaUser) await UserModel.destroy({ where: { id: qaUser.id } });
    if (dualUser) await UserModel.destroy({ where: { id: dualUser.id } });
    if (outsiderUser) await UserModel.destroy({ where: { id: outsiderUser.id } });
  });

  test('PO creates requirement with optional URL, auto-generated Figma code, and links to task', async () => {
    // 1. Create requirement with Figma URL
    const createRes = await fetch(`${baseUrl}/workspaces/${workspace1.id}/requirements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: poCookie,
      },
      body: JSON.stringify({
        title: 'Checkout Prototype UI',
        url: 'https://www.figma.com/file/xyz/Checkout-Flow',
      }),
    });

    assert.strictEqual(createRes.status, 201);
    const createdData = (await createRes.json()) as any;
    assert.ok(createdData.requirement?.id);
    assert.ok(createdData.requirement.code.startsWith('FIGMA-'));
    assert.strictEqual(createdData.requirement.title, 'Checkout Prototype UI');
    assert.strictEqual(createdData.requirement.url, 'https://www.figma.com/file/xyz/Checkout-Flow');
    assert.strictEqual(createdData.requirement.status, 'active');

    const reqId = createdData.requirement.id;

    // 2. Link requirement to task
    const linkRes = await fetch(
      `${baseUrl}/workspaces/${workspace1.id}/tasks/${task1.id}/requirements`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: poCookie,
        },
        body: JSON.stringify({
          requirementId: reqId,
        }),
      },
    );

    assert.strictEqual(linkRes.status, 201);
    const linkData = (await linkRes.json()) as any;
    assert.strictEqual(linkData.link.requirementId, reqId);
    assert.strictEqual(linkData.link.taskId, task1.id);

    // 3. Get Requirement Detail via HTTP -> shows linkedTasks summary
    const detailRes = await fetch(`${baseUrl}/workspaces/${workspace1.id}/requirements/${reqId}`, {
      method: 'GET',
      headers: {
        Cookie: poCookie,
      },
    });

    assert.strictEqual(detailRes.status, 200);
    const detailData = (await detailRes.json()) as any;
    assert.strictEqual(detailData.requirement.id, reqId);
    assert.ok(Array.isArray(detailData.linkedTasks));
    assert.strictEqual(detailData.linkedTasks.length, 1);
    assert.strictEqual(detailData.linkedTasks[0].taskId, task1.id);
    assert.strictEqual(detailData.linkedTasks[0].title, 'Checkout Flow Root Task');

    // 4. PATCH update requirement: update title, clear url with null, update status
    const patchRes = await fetch(`${baseUrl}/workspaces/${workspace1.id}/requirements/${reqId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: poCookie,
      },
      body: JSON.stringify({
        title: 'Checkout Prototype UI v2',
        url: null,
        status: 'draft',
      }),
    });

    assert.strictEqual(patchRes.status, 200);
    const patchData = (await patchRes.json()) as any;
    assert.strictEqual(patchData.requirement.title, 'Checkout Prototype UI v2');
    assert.strictEqual(patchData.requirement.url, null);
    assert.strictEqual(patchData.requirement.status, 'draft');

    // 5. Unlink requirement from task
    const unlinkRes = await fetch(
      `${baseUrl}/workspaces/${workspace1.id}/tasks/${task1.id}/requirements/${reqId}`,
      {
        method: 'DELETE',
        headers: {
          Cookie: poCookie,
        },
      },
    );
    assert.strictEqual(unlinkRes.status, 200);

    // 6. Verify detail now has 0 linked tasks
    const detailResAfter = await fetch(
      `${baseUrl}/workspaces/${workspace1.id}/requirements/${reqId}`,
      {
        method: 'GET',
        headers: { Cookie: poCookie },
      },
    );
    const detailDataAfter = (await detailResAfter.json()) as any;
    assert.strictEqual(detailDataAfter.linkedTasks.length, 0);
  });

  test('Owner and Admin have full management permissions (create, PATCH, link, unlink)', async () => {
    // Admin creates requirement without URL
    const adminCreate = await fetch(`${baseUrl}/workspaces/${workspace1.id}/requirements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie,
      },
      body: JSON.stringify({
        code: 'REQ-ADM-01',
        title: 'Admin Created Requirement',
        description: 'Admin created requirement without URL',
      }),
    });
    assert.strictEqual(adminCreate.status, 201);
    const adminReq = ((await adminCreate.json()) as any).requirement;
    assert.strictEqual(adminReq.code, 'REQ-ADM-01');
    assert.strictEqual(adminReq.url, null);

    // Owner PATCH updates requirement code and title
    const ownerPatch = await fetch(
      `${baseUrl}/workspaces/${workspace1.id}/requirements/${adminReq.id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: ownerCookie,
        },
        body: JSON.stringify({
          code: 'REQ-OWN-01',
          title: 'Owner Updated Requirement',
        }),
      },
    );
    assert.strictEqual(ownerPatch.status, 200);
    const ownerReq = ((await ownerPatch.json()) as any).requirement;
    assert.strictEqual(ownerReq.code, 'REQ-OWN-01');
    assert.strictEqual(ownerReq.title, 'Owner Updated Requirement');

    // Owner links to task
    const ownerLink = await fetch(
      `${baseUrl}/workspaces/${workspace1.id}/tasks/${task1.id}/requirements`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: ownerCookie,
        },
        body: JSON.stringify({ requirementId: adminReq.id }),
      },
    );
    assert.strictEqual(ownerLink.status, 201);

    // Admin unlinks from task
    const adminUnlink = await fetch(
      `${baseUrl}/workspaces/${workspace1.id}/tasks/${task1.id}/requirements/${adminReq.id}`,
      {
        method: 'DELETE',
        headers: { Cookie: adminCookie },
      },
    );
    assert.strictEqual(adminUnlink.status, 200);
  });

  test('PO can bulk unlink or deprecate only Requirements currently linked to the selected Feature', async () => {
    const stamp = Date.now();
    const [first, second, unlinked] = await Promise.all(
      [`REQ-BULK-01-${stamp}`, `REQ-BULK-02-${stamp}`, `REQ-BULK-03-${stamp}`].map((code, index) =>
        RequirementModel.create({
          workspaceId: workspace1.id,
          code,
          title: `Bulk correction Requirement ${index + 1}`,
          createdBy: poUser.id,
        }),
      ),
    );

    await TaskRequirementModel.bulkCreate([
      {
        workspaceId: workspace1.id,
        taskId: task1.id,
        requirementId: first.id,
        linkedBy: poUser.id,
      },
      {
        workspaceId: workspace1.id,
        taskId: task1.id,
        requirementId: second.id,
        linkedBy: poUser.id,
      },
    ]);

    const deprecateResponse = await fetch(
      `${baseUrl}/workspaces/${workspace1.id}/tasks/${task1.id}/requirements/bulk-correction`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: poCookie },
        body: JSON.stringify({ requirementIds: [first.id, second.id], action: 'deprecate' }),
      },
    );
    assert.strictEqual(deprecateResponse.status, 200);
    assert.deepStrictEqual(await deprecateResponse.json(), {
      action: 'deprecate',
      affectedCount: 2,
    });

    const deprecatedRequirements = await RequirementModel.findAll({
      where: { id: [first.id, second.id] },
      order: [['code', 'ASC']],
    });
    assert.deepStrictEqual(
      deprecatedRequirements.map((requirement) => requirement.status),
      ['deprecated', 'deprecated'],
    );
    assert.strictEqual(
      await TaskRequirementModel.count({ where: { taskId: task1.id, requirementId: first.id } }),
      1,
    );

    const unlinkResponse = await fetch(
      `${baseUrl}/workspaces/${workspace1.id}/tasks/${task1.id}/requirements/bulk-correction`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: poCookie },
        body: JSON.stringify({ requirementIds: [first.id, second.id], action: 'unlink' }),
      },
    );
    assert.strictEqual(unlinkResponse.status, 200);
    assert.strictEqual(
      await TaskRequirementModel.count({
        where: { taskId: task1.id, requirementId: [first.id, second.id] },
      }),
      0,
    );
    assert.strictEqual(await RequirementModel.count({ where: { id: [first.id, second.id] } }), 2);

    const invalidScopeResponse = await fetch(
      `${baseUrl}/workspaces/${workspace1.id}/tasks/${task1.id}/requirements/bulk-correction`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: poCookie },
        body: JSON.stringify({ requirementIds: [unlinked.id], action: 'deprecate' }),
      },
    );
    assert.strictEqual(invalidScopeResponse.status, 400);

    const activity = await TaskActivityModel.findOne({
      where: { taskId: task1.id, action: 'requirements_bulk_unlinked' },
      order: [['createdAt', 'DESC']],
    });
    assert.strictEqual(activity?.metadataJson?.affectedCount, 2);
  });

  test('Dev and QA members have authorized read access (list, detail), but mutations return 403 Forbidden', async () => {
    // 1. Dev & QA list workspace requirements
    const devListRes = await fetch(`${baseUrl}/workspaces/${workspace1.id}/requirements`, {
      method: 'GET',
      headers: { Cookie: devCookie },
    });
    assert.strictEqual(devListRes.status, 200);
    const devListData = (await devListRes.json()) as any;
    assert.ok(Array.isArray(devListData.requirements));

    const qaListRes = await fetch(`${baseUrl}/workspaces/${workspace1.id}/requirements`, {
      method: 'GET',
      headers: { Cookie: qaCookie },
    });
    assert.strictEqual(qaListRes.status, 200);
    const qaListData = (await qaListRes.json()) as any;
    assert.ok(Array.isArray(qaListData.requirements));

    // Get an existing requirement ID to test detail & mutation
    const targetReqId = devListData.requirements[0].id;

    // 2. Dev & QA get requirement detail -> 200 OK
    const devDetailRes = await fetch(
      `${baseUrl}/workspaces/${workspace1.id}/requirements/${targetReqId}`,
      {
        method: 'GET',
        headers: { Cookie: devCookie },
      },
    );
    assert.strictEqual(devDetailRes.status, 200);

    const qaDetailRes = await fetch(
      `${baseUrl}/workspaces/${workspace1.id}/requirements/${targetReqId}`,
      {
        method: 'GET',
        headers: { Cookie: qaCookie },
      },
    );
    assert.strictEqual(qaDetailRes.status, 200);

    // 3. Dev mutations -> 403 Forbidden
    const devCreateRes = await fetch(`${baseUrl}/workspaces/${workspace1.id}/requirements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: devCookie },
      body: JSON.stringify({ title: 'Dev forbidden req' }),
    });
    assert.strictEqual(devCreateRes.status, 403);

    const devPatchRes = await fetch(
      `${baseUrl}/workspaces/${workspace1.id}/requirements/${targetReqId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: devCookie },
        body: JSON.stringify({ title: 'Dev forbidden update' }),
      },
    );
    assert.strictEqual(devPatchRes.status, 403);

    const devLinkRes = await fetch(
      `${baseUrl}/workspaces/${workspace1.id}/tasks/${task1.id}/requirements`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: devCookie },
        body: JSON.stringify({ requirementId: targetReqId }),
      },
    );
    assert.strictEqual(devLinkRes.status, 403);

    const devUnlinkRes = await fetch(
      `${baseUrl}/workspaces/${workspace1.id}/tasks/${task1.id}/requirements/${targetReqId}`,
      {
        method: 'DELETE',
        headers: { Cookie: devCookie },
      },
    );
    assert.strictEqual(devUnlinkRes.status, 403);

    // 4. QA mutations -> 403 Forbidden
    const qaCreateRes = await fetch(`${baseUrl}/workspaces/${workspace1.id}/requirements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
      body: JSON.stringify({ title: 'QA forbidden req' }),
    });
    assert.strictEqual(qaCreateRes.status, 403);

    const qaPatchRes = await fetch(
      `${baseUrl}/workspaces/${workspace1.id}/requirements/${targetReqId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
        body: JSON.stringify({ title: 'QA forbidden update' }),
      },
    );
    assert.strictEqual(qaPatchRes.status, 403);

    const qaLinkRes = await fetch(
      `${baseUrl}/workspaces/${workspace1.id}/tasks/${task1.id}/requirements`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
        body: JSON.stringify({ requirementId: targetReqId }),
      },
    );
    assert.strictEqual(qaLinkRes.status, 403);

    const qaUnlinkRes = await fetch(
      `${baseUrl}/workspaces/${workspace1.id}/tasks/${task1.id}/requirements/${targetReqId}`,
      {
        method: 'DELETE',
        headers: { Cookie: qaCookie },
      },
    );
    assert.strictEqual(qaUnlinkRes.status, 403);
  });

  test('Cross-workspace isolation scenarios', async () => {
    // Create a requirement in Workspace 1
    const req1 = await RequirementModel.create({
      workspaceId: workspace1.id,
      code: 'REQ-ISO-01',
      title: 'Workspace 1 Isolation Test',
      createdBy: ownerUser.id,
    });

    // Scenario 1: User who is not a member of Workspace 1 accessing Workspace 1 route -> 403
    const outsiderList = await fetch(`${baseUrl}/workspaces/${workspace1.id}/requirements`, {
      method: 'GET',
      headers: { Cookie: outsiderCookie },
    });
    assert.strictEqual(outsiderList.status, 403);

    const outsiderDetail = await fetch(
      `${baseUrl}/workspaces/${workspace1.id}/requirements/${req1.id}`,
      {
        method: 'GET',
        headers: { Cookie: outsiderCookie },
      },
    );
    assert.strictEqual(outsiderDetail.status, 403);

    // Scenario 2: User who is a member of BOTH Workspace 1 and Workspace 2 requests Workspace 1 requirement ID through Workspace 2 route -> 404
    // dualUser is Dev in WS1 and Owner in WS2. When requesting req1.id through WS2 route, it must return 404
    const crossDetail = await fetch(
      `${baseUrl}/workspaces/${workspace2.id}/requirements/${req1.id}`,
      {
        method: 'GET',
        headers: { Cookie: dualCookie },
      },
    );
    assert.strictEqual(crossDetail.status, 404);

    const crossPatch = await fetch(
      `${baseUrl}/workspaces/${workspace2.id}/requirements/${req1.id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: dualCookie,
        },
        body: JSON.stringify({ title: 'Hacked cross workspace title' }),
      },
    );
    assert.strictEqual(crossPatch.status, 404);
  });

  test('Database uniqueness and deterministic list sorting', async () => {
    // 1. Create requirement with code "REQ-UNIQ-01" in Workspace 1
    const res1 = await fetch(`${baseUrl}/workspaces/${workspace1.id}/requirements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: poCookie },
      body: JSON.stringify({
        code: 'REQ-UNIQ-01',
        title: 'Unique Code Test 1',
      }),
    });
    assert.strictEqual(res1.status, 201);

    // 2. Duplicate code in SAME workspace returns 400 Bad Request
    const resDuplicate = await fetch(`${baseUrl}/workspaces/${workspace1.id}/requirements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: poCookie },
      body: JSON.stringify({
        code: 'req-uniq-01', // case insensitive check / uppercase normalization
        title: 'Duplicate Code Attempt',
      }),
    });
    assert.strictEqual(resDuplicate.status, 400);

    // 3. Same code in DIFFERENT workspace succeeds with 201
    const resOtherWs = await fetch(`${baseUrl}/workspaces/${workspace2.id}/requirements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: dualCookie },
      body: JSON.stringify({
        code: 'REQ-UNIQ-01',
        title: 'Unique Code In WS2',
      }),
    });
    assert.strictEqual(resOtherWs.status, 201);

    // 4. Deterministic list sorting by code ASC
    const listRes = await fetch(`${baseUrl}/workspaces/${workspace1.id}/requirements`, {
      method: 'GET',
      headers: { Cookie: poCookie },
    });
    assert.strictEqual(listRes.status, 200);
    const listData = (await listRes.json()) as any;
    const codes = listData.requirements.map((r: any) => r.code);
    const sortedCodes = [...codes].sort((a, b) => a.localeCompare(b));
    assert.deepStrictEqual(codes, sortedCodes);
  });

  test('Persists stable multi-criterion identities without rewriting Product Brief history', async () => {
    const requirement = await RequirementModel.create({
      workspaceId: workspace1.id,
      code: 'REQ-STABLE-AC',
      title: 'Returning Customer Checkout',
      description: 'Checkout behavior shared by frontend, backend, and QA work.',
      createdBy: poUser.id,
    });

    const linkResponse = await fetch(
      `${baseUrl}/workspaces/${workspace1.id}/tasks/${task1.id}/requirements`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: poCookie },
        body: JSON.stringify({ requirementId: requirement.id }),
      },
    );
    assert.strictEqual(linkResponse.status, 201);

    const criterionTexts = [
      'A returning customer can select a saved payment method.',
      'A payment failure preserves the selected payment method.',
      'A confirmed order records the selected payment method.',
    ];
    const createdCriteria: any[] = [];
    for (const text of criterionTexts) {
      const response = await fetch(
        `${baseUrl}/workspaces/${workspace1.id}/requirements/${requirement.id}/acceptance-criteria`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: poCookie },
          body: JSON.stringify({ text }),
        },
      );
      assert.strictEqual(response.status, 201);
      createdCriteria.push(((await response.json()) as any).acceptanceCriterion);
    }

    assert.deepStrictEqual(
      createdCriteria.map((criterion) => criterion.code),
      ['AC-1', 'AC-2', 'AC-3'],
    );
    assert.strictEqual(new Set(createdCriteria.map((criterion) => criterion.id)).size, 3);

    const firstCriterionId = createdCriteria[0].id;
    const updateResponse = await fetch(
      `${baseUrl}/workspaces/${workspace1.id}/requirements/${requirement.id}/acceptance-criteria/${firstCriterionId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: poCookie },
        body: JSON.stringify({
          text: 'A returning customer can review and select a saved payment method.',
        }),
      },
    );
    assert.strictEqual(updateResponse.status, 200);
    const updatedCriterion = ((await updateResponse.json()) as any).acceptanceCriterion;
    assert.strictEqual(updatedCriterion.id, firstCriterionId);
    assert.strictEqual(updatedCriterion.code, 'AC-1');

    const devListResponse = await fetch(
      `${baseUrl}/workspaces/${workspace1.id}/requirements/${requirement.id}/acceptance-criteria`,
      { headers: { Cookie: devCookie } },
    );
    assert.strictEqual(devListResponse.status, 200);
    const devList = ((await devListResponse.json()) as any).acceptanceCriteria;
    assert.deepStrictEqual(
      devList.map((criterion: any) => criterion.sequence),
      [1, 2, 3],
    );
    assert.strictEqual(devList[0].id, firstCriterionId);

    const duplicateSequenceResponse = await fetch(
      `${baseUrl}/workspaces/${workspace1.id}/requirements/${requirement.id}/acceptance-criteria`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: poCookie },
        body: JSON.stringify({ sequence: 2, text: 'Duplicate AC-2' }),
      },
    );
    assert.strictEqual(duplicateSequenceResponse.status, 400);

    const forbiddenMutationResponse = await fetch(
      `${baseUrl}/workspaces/${workspace1.id}/requirements/${requirement.id}/acceptance-criteria`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
        body: JSON.stringify({ text: 'QA cannot silently change product scope.' }),
      },
    );
    assert.strictEqual(forbiddenMutationResponse.status, 403);

    const criterionActivityCount = await TaskActivityModel.count({
      where: {
        workspaceId: workspace1.id,
        taskId: task1.id,
        action: 'acceptance_criterion_created',
      },
    });
    assert.strictEqual(criterionActivityCount, 3);

    const { qaDocumentService } = await import('../../qaDocuments/qaDocumentService.js');
    const productBriefV1 = await qaDocumentService.upsertProductBrief(
      workspace1.id,
      task1.id,
      poUser.id,
      {
        title: 'Returning Customer Checkout Product Brief',
        contentMarkdown: '# Checkout\n\nInitial returning-customer checkout scope.',
        inScope: [{ text: 'Saved payment methods', position: 0 }],
        outScope: [{ text: 'Guest checkout', position: 0 }],
        acceptanceCriteria: createdCriteria.map((criterion, position) => ({
          id: criterion.id,
          text: criterion.text,
          position,
        })),
        status: 'draft',
      },
    );

    await qaDocumentService.upsertProductBrief(workspace1.id, task1.id, poUser.id, {
      title: 'Returning Customer Checkout Product Brief',
      contentMarkdown: '# Checkout\n\nClarified returning-customer checkout scope.',
      inScope: [{ text: 'Saved payment methods', position: 0 }],
      outScope: [{ text: 'Guest checkout', position: 0 }],
      acceptanceCriteria: [
        {
          id: firstCriterionId,
          text: 'Product Brief wording changed without changing the coverage identity.',
          position: 0,
        },
        {
          id: createdCriteria[2].id,
          text: createdCriteria[2].text,
          position: 1,
        },
      ],
      status: 'in_review',
    });

    const persistedVersions = await QaDocumentVersionModel.findAll({
      where: { documentId: productBriefV1.document.id },
      order: [['version', 'ASC']],
    });
    assert.strictEqual(persistedVersions.length, 2);
    assert.strictEqual(persistedVersions[0].acceptanceCriteria.length, 3);
    assert.strictEqual(persistedVersions[0].acceptanceCriteria[0].id, firstCriterionId);
    assert.strictEqual(persistedVersions[0].acceptanceCriteria[0].text, criterionTexts[0]);
    assert.strictEqual(persistedVersions[1].acceptanceCriteria[0].id, firstCriterionId);
    assert.strictEqual(
      persistedVersions[1].acceptanceCriteria[0].text,
      'Product Brief wording changed without changing the coverage identity.',
    );

    const canonicalCriterion = await AcceptanceCriterionModel.findByPk(firstCriterionId);
    assert.ok(canonicalCriterion);
    assert.strictEqual(canonicalCriterion.id, firstCriterionId);
    assert.strictEqual(
      canonicalCriterion.text,
      'A returning customer can review and select a saved payment method.',
    );

    const deprecateResponse = await fetch(
      `${baseUrl}/workspaces/${workspace1.id}/requirements/${requirement.id}/acceptance-criteria/${firstCriterionId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: poCookie },
        body: JSON.stringify({ status: 'deprecated' }),
      },
    );
    assert.strictEqual(deprecateResponse.status, 200);
    const deprecatedCriterion = ((await deprecateResponse.json()) as any).acceptanceCriterion;
    assert.strictEqual(deprecatedCriterion.id, firstCriterionId);
    assert.strictEqual(deprecatedCriterion.status, 'deprecated');
    assert.strictEqual(
      await AcceptanceCriterionModel.count({ where: { id: firstCriterionId } }),
      1,
    );
  });

  test('Rejects cross-workspace Acceptance Criterion identities in both API and PostgreSQL', async () => {
    const foreignRequirement = await RequirementModel.create({
      workspaceId: workspace2.id,
      code: 'REQ-FOREIGN-AC',
      title: 'Foreign Workspace Requirement',
      createdBy: dualUser.id,
    });

    const crossWorkspaceResponse = await fetch(
      `${baseUrl}/workspaces/${workspace1.id}/requirements/${foreignRequirement.id}/acceptance-criteria`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: poCookie },
        body: JSON.stringify({ text: 'Must not cross Workspace boundaries.' }),
      },
    );
    assert.strictEqual(crossWorkspaceResponse.status, 404);

    await assert.rejects(
      () =>
        AcceptanceCriterionModel.create({
          workspaceId: workspace1.id,
          requirementId: foreignRequirement.id,
          sequence: 1,
          text: 'Direct cross-Workspace insert must fail.',
          status: 'active',
          createdBy: poUser.id,
        }),
      (error: Error) => error.name === 'SequelizeForeignKeyConstraintError',
    );
  });

  test('Validation error handling returns 400 with Problem Details (not 500)', async () => {
    const req = await RequirementModel.create({
      workspaceId: workspace1.id,
      code: 'REQ-VAL-01',
      title: 'Validation Target',
      createdBy: poUser.id,
    });

    // Empty body on PATCH
    const emptyPatch = await fetch(
      `${baseUrl}/workspaces/${workspace1.id}/requirements/${req.id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: poCookie },
        body: JSON.stringify({}),
      },
    );
    assert.strictEqual(emptyPatch.status, 400);
    const emptyJson = (await emptyPatch.json()) as any;
    assert.strictEqual(emptyJson.code, 'VALIDATION_ERROR');

    // Invalid URL on PATCH
    const invalidUrlPatch = await fetch(
      `${baseUrl}/workspaces/${workspace1.id}/requirements/${req.id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: poCookie },
        body: JSON.stringify({ url: 'not-a-valid-url' }),
      },
    );
    assert.strictEqual(invalidUrlPatch.status, 400);

    // Unknown/immutable fields due to .strict()
    const immutablePatch = await fetch(
      `${baseUrl}/workspaces/${workspace1.id}/requirements/${req.id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: poCookie },
        body: JSON.stringify({ workspaceId: workspace2.id, title: 'Valid' }),
      },
    );
    assert.strictEqual(immutablePatch.status, 400);

    // Empty title on POST
    const emptyTitlePost = await fetch(`${baseUrl}/workspaces/${workspace1.id}/requirements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: poCookie },
      body: JSON.stringify({ title: '' }),
    });
    assert.strictEqual(emptyTitlePost.status, 400);
  });
});
