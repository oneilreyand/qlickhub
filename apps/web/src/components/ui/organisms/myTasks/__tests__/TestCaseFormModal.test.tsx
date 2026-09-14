import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TestCaseFormModal } from '../TestCaseFormModal';

describe('TestCaseFormModal', () => {
  it('uses theme-aware controls without dark-only surfaces in light mode', () => {
    render(
      <TestCaseFormModal
        isOpen
        onClose={vi.fn()}
        workspaceId="10000000-0000-4000-8000-000000000001"
        userRole="qa"
        requirements={[
          {
            id: '10000000-0000-4000-8000-000000000002',
            code: 'REQ-001',
            title: 'Checkout berhasil',
          },
          {
            id: '10000000-0000-4000-8000-000000000003',
            code: 'REQ-002',
            title: 'Validasi kartu ditolak',
          },
        ]}
        onSuccess={vi.fn()}
      />,
    );

    const dialog = screen.getByRole('dialog', { name: 'Buat Test Case Baru' });
    const darkOnlyTokens = [
      'bg-slate-800',
      'bg-slate-800/60',
      'bg-slate-700/50',
      'border-slate-700',
      'border-slate-800',
      'text-slate-200',
      'text-slate-300',
    ];
    const darkOnlyElements = Array.from(dialog.querySelectorAll<HTMLElement>('*')).filter(
      (element) => darkOnlyTokens.some((token) => element.classList.contains(token)),
    );

    expect(darkOnlyElements).toEqual([]);
    expect(screen.getByRole('combobox', { name: 'Prioritas' })).toHaveClass('bg-white');
    expect(screen.getByRole('combobox', { name: 'Jenis Skenario' })).toHaveClass('bg-white');
    expect(screen.getByRole('combobox', { name: 'Jenis Pengujian' })).toHaveClass('bg-white');
  });
});
