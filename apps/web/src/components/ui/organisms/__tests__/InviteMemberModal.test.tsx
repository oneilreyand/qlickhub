import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { InviteMemberModal } from '../InviteMemberModal';
import { WorkspaceItem, WorkspaceMemberItem } from '../../../../lib/api/workspaceService';

const workspaces: WorkspaceItem[] = [
  {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Mobile App',
    slug: 'mobile-app',
    description: null,
    ownerId: '523e4567-e89b-12d3-a456-426614174000',
    role: 'owner',
    archivedAt: null,
    createdAt: '2026-09-11T00:00:00.000Z',
    updatedAt: '2026-09-11T00:00:00.000Z',
  },
  {
    id: '223e4567-e89b-12d3-a456-426614174000',
    name: 'Core API',
    slug: 'core-api',
    description: null,
    ownerId: '523e4567-e89b-12d3-a456-426614174000',
    role: 'admin',
    archivedAt: null,
    createdAt: '2026-09-11T00:00:00.000Z',
    updatedAt: '2026-09-11T00:00:00.000Z',
  },
];

const baseProps = {
  isOpen: true,
  onClose: vi.fn(),
  mode: 'invite' as const,
  currentWorkspaceId: workspaces[0].id,
  workspaces,
  isSubmitting: false,
  onSubmit: vi.fn(),
};

describe('InviteMemberModal access wizard', () => {
  it('guides a new invitation through identity, access, and review steps', () => {
    render(<InviteMemberModal {...baseProps} />);

    fireEvent.change(screen.getByLabelText('Alamat email'), {
      target: { value: 'teammate@company.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Lanjutkan' }));

    expect(screen.getByRole('heading', { name: 'Pilih Workspace dan peran' })).toBeInTheDocument();
    expect(screen.getByText('Workspace tujuan')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Peran Workspace'), { target: { value: 'qa' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lanjutkan' }));

    expect(
      screen.getByRole('heading', { name: 'Periksa akses sebelum disimpan' }),
    ).toBeInTheDocument();
    expect(screen.getByText('teammate@company.com')).toBeInTheDocument();
    expect(screen.getByText('Quality Assurance')).toBeInTheDocument();
  });

  it('submits Workspace-specific roles when the shared-role shortcut is disabled', () => {
    const onSubmit = vi.fn();
    render(<InviteMemberModal {...baseProps} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Alamat email'), {
      target: { value: 'different.roles@company.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Lanjutkan' }));
    fireEvent.click(screen.getByRole('switch'));
    fireEvent.click(screen.getByLabelText(workspaces[1].name));

    fireEvent.change(screen.getByLabelText(`Peran di ${workspaces[0].name}`), {
      target: { value: 'po' },
    });
    fireEvent.change(screen.getByLabelText(`Peran di ${workspaces[1].name}`), {
      target: { value: 'qa' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Lanjutkan' }));
    fireEvent.click(screen.getByRole('button', { name: /Kirim undangan ke 2 Workspace/ }));

    expect(onSubmit).toHaveBeenCalledWith('different.roles@company.com', [
      { workspaceId: workspaces[0].id, role: 'po', specialties: [] },
      { workspaceId: workspaces[1].id, role: 'qa', specialties: [] },
    ]);
  });

  it('starts manage mode at access and excludes existing memberships from the new assignment payload', () => {
    const onSubmit = vi.fn();
    const existingMembership: WorkspaceMemberItem = {
      id: '623e4567-e89b-12d3-a456-426614174000',
      workspaceId: workspaces[0].id,
      userId: '723e4567-e89b-12d3-a456-426614174000',
      role: 'qa',
      specialties: [],
      joinedAt: '2026-09-11T00:00:00.000Z',
      user: {
        id: '723e4567-e89b-12d3-a456-426614174000',
        email: 'existing@company.com',
        name: 'Existing User',
      },
    };

    render(
      <InviteMemberModal
        {...baseProps}
        mode="manage"
        initialEmail="existing@company.com"
        existingMemberships={[existingMembership]}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Pilih Workspace dan peran' })).toBeInTheDocument();
    expect(screen.getByText('Sudah menjadi Quality Assurance')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(workspaces[1].name));
    fireEvent.change(screen.getByLabelText('Peran Workspace'), { target: { value: 'po' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lanjutkan' }));
    fireEvent.click(screen.getByRole('button', { name: /Tambahkan ke 1 Workspace/ }));

    expect(onSubmit).toHaveBeenCalledWith('existing@company.com', [
      { workspaceId: workspaces[1].id, role: 'po', specialties: [] },
    ]);
  });
});
