import { describe, expect, it } from 'vitest';
import { canCreateWorkspace } from '../workspacePermissions';

describe('workspace permissions', () => {
  it.each(['owner', 'admin', 'po'])('allows %s to create a Workspace', (role) => {
    expect(canCreateWorkspace(role)).toBe(true);
  });

  it.each(['qa', 'dev', 'viewer', '', undefined])('blocks %s from creating a Workspace', (role) => {
    expect(canCreateWorkspace(role)).toBe(false);
  });
});
