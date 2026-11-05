import { describe, expect, it } from 'vitest';
import type { RootState } from '../store';
import { selectActiveWorkspaceRole } from '../workspaceSlice';

// E2E-SDLC-FLOW P1: workspace actions follow the role in the active Workspace, not the account role.
const stateWith = (workspace: Partial<RootState['workspace']>, accountRole = 'dev') =>
  ({
    auth: { currentUser: { role: accountRole } },
    workspace: { workspaces: [], activeWorkspaceId: null, ...workspace },
  }) as unknown as RootState;

describe('selectActiveWorkspaceRole', () => {
  it('returns the membership role of the active Workspace even when the account role differs', () => {
    const state = stateWith({
      activeWorkspaceId: 'ws-2',
      workspaces: [
        { id: 'ws-1', name: 'A', role: 'po' },
        { id: 'ws-2', name: 'B', role: 'QA' },
      ] as RootState['workspace']['workspaces'],
    });
    expect(selectActiveWorkspaceRole(state)).toBe('qa');
  });

  it('falls back to myRole and returns an empty string without an active Workspace', () => {
    expect(
      selectActiveWorkspaceRole(
        stateWith({
          activeWorkspaceId: 'ws-1',
          workspaces: [
            { id: 'ws-1', name: 'A', myRole: 'admin' },
          ] as RootState['workspace']['workspaces'],
        }),
      ),
    ).toBe('admin');
    expect(selectActiveWorkspaceRole(stateWith({}, 'qa'))).toBe('');
  });
});
