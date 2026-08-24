import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { WorkspaceMembersTable } from '../WorkspaceMembersTable';
import type { WorkspaceMemberItem } from '../../../../lib/api/workspaceService';

const members: WorkspaceMemberItem[] = [
  {
    id: 'membership-owner',
    workspaceId: 'workspace-1',
    userId: 'user-owner',
    role: 'owner',
    joinedAt: '2026-08-01T00:00:00.000Z',
    user: { id: 'user-owner', name: 'Workspace Owner', email: 'owner@example.com' },
  },
  {
    id: 'membership-admin',
    workspaceId: 'workspace-1',
    userId: 'user-admin',
    role: 'admin',
    joinedAt: '2026-08-02T00:00:00.000Z',
    user: { id: 'user-admin', name: 'Workspace Admin', email: 'admin@example.com' },
  },
  {
    id: 'membership-po',
    workspaceId: 'workspace-1',
    userId: 'user-po',
    role: 'po',
    joinedAt: '2026-08-03T00:00:00.000Z',
    user: { id: 'user-po', name: 'Product Owner', email: 'po@example.com' },
  },
  {
    id: 'membership-dev',
    workspaceId: 'workspace-1',
    userId: 'user-dev',
    role: 'dev',
    specialties: ['frontend'],
    joinedAt: '2026-08-04T00:00:00.000Z',
    user: { id: 'user-dev', name: 'Developer', email: 'dev@example.com' },
  },
  {
    id: 'membership-qa',
    workspaceId: 'workspace-1',
    userId: 'user-qa',
    role: 'qa',
    joinedAt: '2026-08-05T00:00:00.000Z',
    user: { id: 'user-qa', name: 'QA Engineer', email: 'qa@example.com' },
  },
];

function renderTable(
  managerRole: 'owner' | 'admin' | null,
  canManageMembers = true,
  onSpecialtiesChange = vi.fn(),
) {
  return render(
    <WorkspaceMembersTable
      members={members}
      isLoading={false}
      canManageMembers={canManageMembers}
      managerRole={managerRole}
      searchQuery=""
      onSearchChange={vi.fn()}
      onInviteClick={vi.fn()}
      onRoleChange={vi.fn()}
      onSpecialtiesChange={onSpecialtiesChange}
      onRemoveMember={vi.fn()}
      onResetPasswordClick={vi.fn()}
    />,
  );
}

describe('WorkspaceMembersTable deletion hierarchy', () => {
  it('lets Owner target every non-Owner role', () => {
    renderTable('owner');

    // Mobile and desktop surfaces each render one remove action per removable member.
    expect(screen.getAllByRole('button', { name: 'Remove member' })).toHaveLength(8);
  });

  it('does not let Admin target Owner or Admin', () => {
    renderTable('admin');

    expect(screen.getAllByRole('button', { name: 'Remove member' })).toHaveLength(6);
  });

  it('hides all removal actions from roles that cannot manage members', () => {
    renderTable(null, false);

    expect(screen.queryByRole('button', { name: 'Remove member' })).not.toBeInTheDocument();
  });

  it('shows persisted Developer specialties and sends specialty edits through the member callback', () => {
    const onSpecialtiesChange = vi.fn();
    renderTable('owner', true, onSpecialtiesChange);

    const frontendButtons = screen.getAllByRole('button', {
      name: 'Toggle frontend specialty for Developer',
    });
    expect(frontendButtons[0]).toHaveAttribute('aria-pressed', 'true');
    expect(frontendButtons[0]).toBeDisabled();

    fireEvent.click(
      screen.getAllByRole('button', {
        name: 'Toggle mobile specialty for Developer',
      })[0],
    );
    expect(onSpecialtiesChange).toHaveBeenCalledWith('user-dev', ['frontend', 'mobile']);
  });
});
