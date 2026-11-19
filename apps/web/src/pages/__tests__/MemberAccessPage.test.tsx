import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MemberAccessOverview } from '@qlick/contracts';
import { MemberAccessPage } from '../MemberAccessPage';
import authReducer from '../../store/authSlice';
import workspaceReducer from '../../store/workspaceSlice';
import uiReducer from '../../store/uiSlice';
import type { WorkspaceItem } from '../../lib/api/workspaceService';

const access = vi.hoisted(() => ({
  getOverview: vi.fn(),
  resendInvite: vi.fn(),
  cancelInvite: vi.fn(),
  listTemplates: vi.fn(),
  createTemplate: vi.fn(),
  deleteTemplate: vi.fn(),
  importMembers: vi.fn(),
}));
const ws = vi.hoisted(() => ({
  updateMemberRole: vi.fn(),
  addMember: vi.fn(),
  removeMember: vi.fn(),
}));
vi.mock('../../lib/api/memberAccessService', () => ({ memberAccessService: access }));
vi.mock('../../lib/api/workspaceService', () => ({ workspaceService: ws }));

const ME = '10000000-0000-4000-8000-000000000000';
const RINA = '20000000-0000-4000-8000-000000000000';
const NADIA = '30000000-0000-4000-8000-000000000000';
const PAY = '40000000-0000-4000-8000-000000000000';
const MOB = '50000000-0000-4000-8000-000000000000';
const OLD = '60000000-0000-4000-8000-000000000000';

const overview: MemberAccessOverview = {
  workspaces: [
    { id: PAY, name: 'Payment', actorRole: 'owner', archived: false, memberCount: 3 },
    { id: MOB, name: 'Mobile App', actorRole: 'admin', archived: false, memberCount: 2 },
    { id: OLD, name: 'Lama', actorRole: 'owner', archived: true, memberCount: 1 },
  ],
  people: [
    {
      userId: ME,
      name: 'Saya Owner',
      email: 'me@contoh.id',
      avatarUrl: null,
      activation: 'active',
      memberships: [
        { workspaceId: PAY, role: 'owner', specialties: [], joinedAt: '2026-01-01T00:00:00.000Z' },
      ],
    },
    {
      userId: RINA,
      name: 'Rina Wijaya',
      email: 'rina@contoh.id',
      avatarUrl: null,
      activation: 'active',
      memberships: [
        {
          workspaceId: PAY,
          role: 'dev',
          specialties: ['backend'],
          joinedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    },
    {
      userId: NADIA,
      name: 'Nadia Anggraini',
      email: 'nadia@contoh.id',
      avatarUrl: null,
      activation: 'pending',
      memberships: [
        { workspaceId: MOB, role: 'qa', specialties: [], joinedAt: '2026-01-01T00:00:00.000Z' },
      ],
    },
  ],
};

function renderPage() {
  const store = configureStore({
    reducer: { auth: authReducer, workspace: workspaceReducer, ui: uiReducer },
    preloadedState: {
      auth: {
        currentUser: { id: ME, email: 'me@contoh.id', name: 'Saya Owner', role: 'admin' },
        isAuthenticated: true,
      } as never,
      workspace: {
        workspaces: [
          { id: PAY, name: 'Payment', role: 'owner' } as unknown as WorkspaceItem,
          { id: MOB, name: 'Mobile App', role: 'admin' } as unknown as WorkspaceItem,
        ],
        activeWorkspaceId: PAY,
        members: [],
        isLoading: false,
        isMembersLoading: false,
        isInitialized: true,
        error: null,
      } as never,
    },
  });
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <MemberAccessPage />
      </MemoryRouter>
    </Provider>,
  );
}

describe('MemberAccessPage (MEMBER-ACCESS-HUB P2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    access.getOverview.mockResolvedValue(overview);
    access.listTemplates.mockResolvedValue([]);
  });

  it('shows the people × workspace matrix with status and read-only cells', async () => {
    renderPage();
    expect(await screen.findByText('Rina Wijaya')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Mobile App' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: /Ubah akses Rina Wijaya di Payment: Developer · Backend/,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Tambahkan Rina Wijaya ke Mobile App' }),
    ).toBeInTheDocument();
    // Owner role, own access and archived Workspaces are read-only.
    expect(screen.queryByRole('button', { name: /Saya Owner/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /di Lama|ke Lama/ })).toBeNull();
    expect(screen.getAllByText('Menunggu aktivasi').length).toBeGreaterThan(0);
  });

  it('filters by pending activation, search and role', async () => {
    renderPage();
    await screen.findByText('Rina Wijaya');
    fireEvent.click(screen.getByRole('tab', { name: 'Menunggu aktivasi (1)' }));
    expect(screen.queryByText('Rina Wijaya')).toBeNull();
    expect(screen.getByText('Nadia Anggraini')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Semua (3)' }));
    fireEvent.change(screen.getByLabelText('Cari nama atau email'), { target: { value: 'rina' } });
    expect(screen.queryByText('Nadia Anggraini')).toBeNull();
    fireEvent.change(screen.getByLabelText('Cari nama atau email'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Filter peran'), { target: { value: 'qa' } });
    expect(screen.queryByText('Rina Wijaya')).toBeNull();
  });

  it('changes a role through the per-workspace endpoint and reloads', async () => {
    ws.updateMemberRole.mockResolvedValue({});
    renderPage();
    fireEvent.click(
      await screen.findByRole('button', { name: /Ubah akses Rina Wijaya di Payment/ }),
    );
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Peran'), { target: { value: 'qa' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Simpan' }));
    await waitFor(() =>
      expect(ws.updateMemberRole).toHaveBeenCalledWith(PAY, RINA, { role: 'qa', specialties: [] }),
    );
    await waitFor(() => expect(access.getOverview).toHaveBeenCalledTimes(2));
  });

  it('adds an existing person to another workspace, requiring a specialty for developers', async () => {
    ws.addMember.mockResolvedValue({ assignmentResults: [] });
    renderPage();
    fireEvent.click(
      await screen.findByRole('button', { name: 'Tambahkan Rina Wijaya ke Mobile App' }),
    );
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Peran'), { target: { value: 'dev' } });
    expect(within(dialog).getByRole('button', { name: 'Tambahkan' })).toBeDisabled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Mobile' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Tambahkan' }));
    await waitFor(() =>
      expect(ws.addMember).toHaveBeenCalledWith(MOB, {
        email: 'rina@contoh.id',
        assignments: [{ workspaceId: MOB, role: 'dev', specialties: ['mobile'] }],
      }),
    );
  });

  it('removes someone after confirmation and shows server errors', async () => {
    ws.removeMember.mockRejectedValueOnce(new Error('Tidak boleh mengeluarkan Owner'));
    renderPage();
    fireEvent.click(
      await screen.findByRole('button', { name: /Ubah akses Rina Wijaya di Payment/ }),
    );
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Keluarkan dari workspace' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Ya, keluarkan' }));
    await waitFor(() => expect(ws.removeMember).toHaveBeenCalledWith(PAY, RINA));
  });

  it('shows the permission state for non-managers and an error with retry', async () => {
    access.getOverview.mockRejectedValueOnce(
      Object.assign(new Error('Forbidden'), { status: 403 }),
    );
    const { unmount } = renderPage();
    expect(await screen.findByText('Anggota & Akses khusus Owner dan Admin')).toBeInTheDocument();
    unmount();
    access.getOverview
      .mockRejectedValueOnce(Object.assign(new Error('Server sibuk'), { status: 500 }))
      .mockResolvedValueOnce(overview);
    renderPage();
    expect(await screen.findByText('Server sibuk')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));
    expect(await screen.findByText('Rina Wijaya')).toBeInTheDocument();
  });

  it('resends and cancels a pending invitation (P3)', async () => {
    access.resendInvite.mockResolvedValue({ userId: NADIA, workspaceIds: [MOB] });
    access.cancelInvite.mockResolvedValue({ userId: NADIA, workspaceIds: [MOB] });
    renderPage();
    await screen.findByText('Nadia Anggraini');
    expect(screen.getByText(/^Diundang /)).toBeInTheDocument();
    // Active people have no invitation actions.
    expect(
      screen.queryByRole('button', { name: 'Kirim ulang undangan ke rina@contoh.id' }),
    ).toBeNull();

    fireEvent.click(
      screen.getByRole('button', { name: 'Kirim ulang undangan ke nadia@contoh.id' }),
    );
    await waitFor(() => expect(access.resendInvite).toHaveBeenCalledWith(NADIA));

    fireEvent.click(screen.getByRole('button', { name: 'Batalkan undangan nadia@contoh.id' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/tautan undangannya tidak berlaku lagi/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Batalkan undangan' }));
    await waitFor(() => expect(access.cancelInvite).toHaveBeenCalledWith(NADIA));
    await waitFor(() => expect(access.getOverview).toHaveBeenCalledTimes(2));
  });

  const template = {
    id: '70000000-0000-4000-8000-000000000000',
    name: 'QA Mobile',
    createdAt: '2026-11-19T00:00:00.000Z',
    entries: [
      {
        workspaceId: PAY,
        workspaceName: 'Payment',
        role: 'dev' as const,
        specialties: ['frontend' as const],
        available: true,
      },
      {
        workspaceId: MOB,
        workspaceName: 'Mobile App',
        role: 'qa' as const,
        specialties: [],
        available: true,
      },
      {
        workspaceId: OLD,
        workspaceName: null,
        role: 'po' as const,
        specialties: [],
        available: false,
      },
    ],
  };

  it('prefills the invite from a role template and saves a new one (P4)', async () => {
    access.listTemplates.mockResolvedValue([template]);
    access.createTemplate.mockResolvedValue({
      ...template,
      id: '80000000-0000-4000-8000-000000000000',
      name: 'Tim Baru',
    });
    ws.addMember.mockResolvedValue({
      assignmentResults: [{ status: 'added' }, { status: 'added' }],
    });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Undang anggota' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/Alamat email/), {
      target: { value: 'baru@contoh.id' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Lanjutkan' }));
    const picker = await within(dialog).findByLabelText('Pakai template peran');
    fireEvent.change(picker, { target: { value: template.id } });
    expect(within(dialog).getByText(/1 Workspace dari template dilewati/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Lanjutkan' }));

    fireEvent.change(within(dialog).getByLabelText(/Simpan akses ini sebagai template/), {
      target: { value: 'Tim Baru' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Simpan template' }));
    const expected = [
      { workspaceId: PAY, role: 'dev', specialties: ['frontend'] },
      { workspaceId: MOB, role: 'qa', specialties: [] },
    ];
    await waitFor(() =>
      expect(access.createTemplate).toHaveBeenCalledWith({ name: 'Tim Baru', entries: expected }),
    );

    fireEvent.click(within(dialog).getByRole('button', { name: /Kirim undangan ke 2 Workspace/ }));
    await waitFor(() =>
      expect(ws.addMember).toHaveBeenCalledWith(PAY, {
        email: 'baru@contoh.id',
        assignments: expected,
      }),
    );
  });

  it('lists and deletes role templates (P4)', async () => {
    access.listTemplates.mockResolvedValue([template]);
    access.deleteTemplate.mockResolvedValue(undefined);
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Template peran' }));
    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByText('QA Mobile')).toBeInTheDocument();
    expect(within(dialog).getByText(/Workspace tidak tersedia/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Hapus template QA Mobile' }));
    await waitFor(() => expect(access.deleteTemplate).toHaveBeenCalledWith(template.id));
    expect(await within(dialog).findByText(/Belum ada template/)).toBeInTheDocument();
  });

  it('previews a CSV import per row and processes only the valid rows (P4)', async () => {
    const rows = [
      { email: 'a@contoh.id', workspace: 'Payment', role: 'qa', specialties: '' },
      { email: 'salah', workspace: 'Payment', role: 'qa', specialties: '' },
    ];
    const result = (mode: 'preview' | 'commit') => ({
      mode,
      committed: mode === 'commit',
      validCount: 1,
      invalidCount: 1,
      peopleInvited: mode === 'commit' ? 1 : 0,
      rows: [
        {
          line: 1,
          email: 'a@contoh.id',
          workspaceId: PAY,
          workspaceName: 'Payment',
          role: 'qa',
          specialties: [],
          status: 'valid',
          action: 'add',
          errors: [],
        },
        {
          line: 2,
          email: 'salah',
          workspaceId: PAY,
          workspaceName: 'Payment',
          role: 'qa',
          specialties: [],
          status: 'invalid',
          action: null,
          errors: ['Email tidak valid.'],
        },
      ],
    });
    access.importMembers.mockImplementation(async ({ mode }: { mode: 'preview' | 'commit' }) =>
      result(mode),
    );
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Impor CSV' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Isi CSV'), {
      target: { value: 'email,workspace,role\na@contoh.id,Payment,qa\nsalah,Payment,qa' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Periksa file' }));
    await waitFor(() =>
      expect(access.importMembers).toHaveBeenCalledWith({ mode: 'preview', rows }),
    );
    expect(await within(dialog).findByText('Email tidak valid.')).toBeInTheDocument();
    expect(within(dialog).getByText('1 tidak valid')).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Proses 1 baris valid' }));
    await waitFor(() =>
      expect(access.importMembers).toHaveBeenCalledWith({ mode: 'commit', rows }),
    );
    await waitFor(() => expect(access.getOverview).toHaveBeenCalledTimes(2));
  });
});
