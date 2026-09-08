import assert from 'node:assert';
import { afterEach, test } from 'node:test';
import type { NextFunction, Request, Response } from 'express';
import { WorkspaceModel } from '../../../db/models/workspace.js';
import { rejectArchivedWorkspaceMutation } from '../workspaceArchive.js';

const workspaceId = '12345678-1234-1234-1234-123456789012';
const originalFindByPk = WorkspaceModel.findByPk;

afterEach(() => {
  WorkspaceModel.findByPk = originalFindByPk;
});

test('allows permanent deletion of archived Workspace with a trailing slash', async () => {
  WorkspaceModel.findByPk = (async () => ({ archivedAt: new Date() })) as typeof originalFindByPk;

  let nextCalled = false;
  let responseStatus: number | undefined;
  const req = {
    method: 'DELETE',
    path: `/workspaces/${workspaceId}/`,
    body: {},
  } as Request;
  const res = {
    status(status: number) {
      responseStatus = status;
      return this;
    },
    json() {
      return this;
    },
  } as unknown as Response;
  const next: NextFunction = () => {
    nextCalled = true;
  };

  await rejectArchivedWorkspaceMutation(req, res, next);

  assert.equal(nextCalled, true);
  assert.equal(responseStatus, undefined);
});
