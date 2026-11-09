import assert from 'node:assert';
import type { Server } from 'node:http';
import { after, before, describe, test } from 'node:test';
import { createApp } from '../../../app.js';
import { sequelize } from '../../../db/sequelize.js';
import {
  TaskModel,
  TaskLinkModel,
  UserModel,
  WorkFolderModel,
  WorkspaceMemberModel,
  WorkspaceModel,
} from '../../../db/models/index.js';
import { accessTokenCookieName, signToken } from '../../auth/jwt.js';
import { sessionManager } from '../../auth/sessionManager.js';
import type { TaskLink } from '@qlick/contracts';

describe('Task Links HTTP / PostgreSQL Integration (F2 - FEATURE-REFERENCES-MEDIA)', () => {
  const stamp = Date.now();
  let server: Server;
  let baseUrl: string;

  let owner: UserModel;
  let po: UserModel;
  let dev: UserModel;
  let qa: UserModel;
  let outsider: UserModel;

  let workspace: WorkspaceModel;
  let foreignWorkspace: WorkspaceModel;
  let folder: WorkFolderModel;
  let featureTask: TaskModel;

  let ownerCookie: string;
  let poCookie: string;
  let devCookie: string;
  let qaCookie: string;
  let outsiderCookie: string;

  async function createAuthCookie(user: UserModel): Promise<string> {
    const sessionId = await sessionManager.createSession(
      user.id,
      'TaskLinksIntegration',
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
      server = app.listen(0, () => {
        const address = server.address();
        if (typeof address === 'object' && address) {
          baseUrl = `http://localhost:${address.port}/v1`;
        }
        resolve();
      });
    });

    owner = await UserModel.create({
      email: `owner-links-${stamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Owner Links',
      role: 'admin',
    });
    po = await UserModel.create({
      email: `po-links-${stamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'PO Links',
      role: 'po',
    });
    dev = await UserModel.create({
      email: `dev-links-${stamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Dev Links',
      role: 'dev',
    });
    qa = await UserModel.create({
      email: `qa-links-${stamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'QA Links',
      role: 'qa',
    });
    outsider = await UserModel.create({
      email: `outsider-links-${stamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Outsider Links',
      role: 'dev',
    });

    workspace = await WorkspaceModel.create({
      name: `Links Workspace ${stamp}`,
      slug: `links-ws-${stamp}`,
      ownerId: owner.id,
    });

    foreignWorkspace = await WorkspaceModel.create({
      name: `Foreign Workspace ${stamp}`,
      slug: `foreign-ws-${stamp}`,
      ownerId: outsider.id,
    });

    await WorkspaceMemberModel.create({
      workspaceId: workspace.id,
      userId: owner.id,
      role: 'owner',
    });
    await WorkspaceMemberModel.create({
      workspaceId: workspace.id,
      userId: po.id,
      role: 'po',
    });
    await WorkspaceMemberModel.create({
      workspaceId: workspace.id,
      userId: dev.id,
      role: 'dev',
    });
    await WorkspaceMemberModel.create({
      workspaceId: workspace.id,
      userId: qa.id,
      role: 'qa',
    });
    await WorkspaceMemberModel.create({
      workspaceId: foreignWorkspace.id,
      userId: outsider.id,
      role: 'owner',
    });

    folder = await WorkFolderModel.create({
      workspaceId: workspace.id,
      name: 'Media Folder',
      position: 0,
      createdBy: owner.id,
    });

    featureTask = await TaskModel.create({
      workspaceId: workspace.id,
      folderId: folder.id,
      title: 'Feature Checkout v2',
      status: 'in_progress',
      priority: 'high',
      reporterId: po.id,
      assigneeId: dev.id,
    });

    ownerCookie = await createAuthCookie(owner);
    poCookie = await createAuthCookie(po);
    devCookie = await createAuthCookie(dev);
    qaCookie = await createAuthCookie(qa);
    outsiderCookie = await createAuthCookie(outsider);
  });

  after(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  test('AC-F2.1: PO can create a valid link with https URL', async () => {
    const res = await fetch(`${baseUrl}/workspaces/${workspace.id}/tasks/${featureTask.id}/links`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: poCookie,
      },
      body: JSON.stringify({
        title: 'Desain Figma Checkout v2',
        url: 'https://figma.com/file/checkout-v2',
        linkType: 'figma',
      }),
    });

    assert.strictEqual(res.status, 201);
    const body = (await res.json()) as { data: TaskLink };
    assert.ok(body.data.id);
    assert.strictEqual(body.data.title, 'Desain Figma Checkout v2');
    assert.strictEqual(body.data.url, 'https://figma.com/file/checkout-v2');
    assert.strictEqual(body.data.linkType, 'figma');
    assert.strictEqual(body.data.createdBy, po.id);

    // Verify row persisted in PostgreSQL
    const persisted = await TaskLinkModel.findByPk(body.data.id);
    assert.ok(persisted);
    assert.strictEqual(persisted.title, 'Desain Figma Checkout v2');
  });

  test('AC-F2.2: Server rejects non-https URLs (http:// or javascript:)', async () => {
    const resInsecure = await fetch(
      `${baseUrl}/workspaces/${workspace.id}/tasks/${featureTask.id}/links`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: poCookie,
        },
        body: JSON.stringify({
          title: 'Insecure Link',
          url: 'http://example.com/insecure',
        }),
      },
    );
    assert.strictEqual(resInsecure.status, 400);

    const resJs = await fetch(
      `${baseUrl}/workspaces/${workspace.id}/tasks/${featureTask.id}/links`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: poCookie,
        },
        body: JSON.stringify({
          title: 'XSS Attempt',
          url: 'javascript:alert(1)',
        }),
      },
    );
    assert.strictEqual(resJs.status, 400);
  });

  test('AC-F2.7: Developer and QA cannot create, edit, reorder, or delete links (403 Forbidden)', async () => {
    // Dev attempts create
    const devCreate = await fetch(
      `${baseUrl}/workspaces/${workspace.id}/tasks/${featureTask.id}/links`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: devCookie,
        },
        body: JSON.stringify({
          title: 'Dev Link',
          url: 'https://github.com/my-pr',
        }),
      },
    );
    assert.strictEqual(devCreate.status, 403);

    // Create a link as PO first
    const poCreate = await fetch(
      `${baseUrl}/workspaces/${workspace.id}/tasks/${featureTask.id}/links`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: poCookie,
        },
        body: JSON.stringify({
          title: 'Doc to test edit/delete',
          url: 'https://docs.google.com/doc-1',
          linkType: 'document',
        }),
      },
    );
    const link = ((await poCreate.json()) as { data: TaskLink }).data;

    // QA attempts update
    const qaUpdate = await fetch(
      `${baseUrl}/workspaces/${workspace.id}/tasks/${featureTask.id}/links/${link.id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: qaCookie,
        },
        body: JSON.stringify({ title: 'Mutated by QA' }),
      },
    );
    assert.strictEqual(qaUpdate.status, 403);

    // Dev attempts delete
    const devDelete = await fetch(
      `${baseUrl}/workspaces/${workspace.id}/tasks/${featureTask.id}/links/${link.id}`,
      {
        method: 'DELETE',
        headers: { Cookie: devCookie },
      },
    );
    assert.strictEqual(devDelete.status, 403);

    // QA attempts reorder
    const qaReorder = await fetch(
      `${baseUrl}/workspaces/${workspace.id}/tasks/${featureTask.id}/links/reorder`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: qaCookie,
        },
        body: JSON.stringify({ linkIds: [link.id] }),
      },
    );
    assert.strictEqual(qaReorder.status, 403);
  });

  test('AC-F2.3 & AC-F2.8: Developer and QA can read all links (view-only)', async () => {
    const devList = await fetch(
      `${baseUrl}/workspaces/${workspace.id}/tasks/${featureTask.id}/links`,
      {
        headers: { Cookie: devCookie },
      },
    );
    assert.strictEqual(devList.status, 200);
    const bodyDev = (await devList.json()) as { data: TaskLink[] };
    assert.ok(Array.isArray(bodyDev.data));
    assert.ok(bodyDev.data.length >= 1);

    const qaList = await fetch(
      `${baseUrl}/workspaces/${workspace.id}/tasks/${featureTask.id}/links`,
      {
        headers: { Cookie: qaCookie },
      },
    );
    assert.strictEqual(qaList.status, 200);
  });

  test('AC-F2.4: Owner/PO can update, reorder, and delete links', async () => {
    // Add two more links
    const l1Res = await fetch(
      `${baseUrl}/workspaces/${workspace.id}/tasks/${featureTask.id}/links`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: ownerCookie },
        body: JSON.stringify({
          title: 'Link 1 First',
          url: 'https://example.com/1',
          linkType: 'other',
        }),
      },
    );
    const l1 = ((await l1Res.json()) as { data: TaskLink }).data;

    const l2Res = await fetch(
      `${baseUrl}/workspaces/${workspace.id}/tasks/${featureTask.id}/links`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: ownerCookie },
        body: JSON.stringify({
          title: 'Link 2 Second',
          url: 'https://example.com/2',
          linkType: 'sheet',
        }),
      },
    );
    const l2 = ((await l2Res.json()) as { data: TaskLink }).data;

    // Update link 1
    const updateRes = await fetch(
      `${baseUrl}/workspaces/${workspace.id}/tasks/${featureTask.id}/links/${l1.id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: poCookie },
        body: JSON.stringify({
          title: 'Link 1 Updated Title',
          linkType: 'video',
        }),
      },
    );
    assert.strictEqual(updateRes.status, 200);
    const updated = ((await updateRes.json()) as { data: TaskLink }).data;
    assert.strictEqual(updated.title, 'Link 1 Updated Title');
    assert.strictEqual(updated.linkType, 'video');

    // Reorder: put l2 before l1
    const reorderRes = await fetch(
      `${baseUrl}/workspaces/${workspace.id}/tasks/${featureTask.id}/links/reorder`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Cookie: poCookie },
        body: JSON.stringify({ linkIds: [l2.id, l1.id] }),
      },
    );
    assert.strictEqual(reorderRes.status, 200);
    const reorderedList = ((await reorderRes.json()) as { data: TaskLink[] }).data;
    const l2Index = reorderedList.findIndex((item) => item.id === l2.id);
    const l1Index = reorderedList.findIndex((item) => item.id === l1.id);
    assert.ok(l2Index < l1Index, 'l2 should appear before l1 after reorder');

    // Delete l1
    const deleteRes = await fetch(
      `${baseUrl}/workspaces/${workspace.id}/tasks/${featureTask.id}/links/${l1.id}`,
      {
        method: 'DELETE',
        headers: { Cookie: poCookie },
      },
    );
    assert.strictEqual(deleteRes.status, 200);

    // Verify l1 no longer in database
    const checkDb = await TaskLinkModel.findByPk(l1.id);
    assert.strictEqual(checkDb, null);
  });

  test('AC-F2.9: Task deletion cascades to task_links', async () => {
    // Create a temporary task and link
    const tempTask = await TaskModel.create({
      workspaceId: workspace.id,
      folderId: folder.id,
      title: 'Temporary Task with Link',
      status: 'todo',
      priority: 'low',
      reporterId: po.id,
    });

    const link = await TaskLinkModel.create({
      workspaceId: workspace.id,
      taskId: tempTask.id,
      title: 'Ephemeral Link',
      url: 'https://example.com/ephemeral',
      linkType: 'other',
    });

    assert.ok(await TaskLinkModel.findByPk(link.id));

    // Delete task via API as Owner
    const delRes = await fetch(`${baseUrl}/workspaces/${workspace.id}/tasks/${tempTask.id}`, {
      method: 'DELETE',
      headers: { Cookie: ownerCookie },
    });
    assert.strictEqual(delRes.status, 200);

    // Assert link is cascade deleted in PostgreSQL
    const postDeleteLink = await TaskLinkModel.findByPk(link.id);
    assert.strictEqual(postDeleteLink, null);
  });

  test('Workspace Isolation: outsider cannot access links in another workspace', async () => {
    const outsiderRes = await fetch(
      `${baseUrl}/workspaces/${workspace.id}/tasks/${featureTask.id}/links`,
      {
        headers: { Cookie: outsiderCookie },
      },
    );
    // Outsider is not a member of workspace -> 403 Forbidden
    assert.strictEqual(outsiderRes.status, 403);
  });
});
