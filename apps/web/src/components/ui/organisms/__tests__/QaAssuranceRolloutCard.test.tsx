import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QaAssuranceRolloutCard } from '../QaAssuranceRolloutCard';

const settings = {
  workspaceId: '123e4567-e89b-12d3-a456-426614174000',
  mode: 'observe' as const,
  updatedBy: '223e4567-e89b-12d3-a456-426614174001',
  createdAt: '2026-09-15T00:00:00.000Z',
  updatedAt: '2026-09-15T00:00:00.000Z',
};

describe('QaAssuranceRolloutCard', () => {
  it('submits an explicit audited change only after the reason is valid', () => {
    const onSave = vi.fn();
    render(
      <QaAssuranceRolloutCard
        settings={settings}
        isLoading={false}
        error={null}
        canManage
        isSaving={false}
        onRetry={vi.fn()}
        onSave={onSave}
      />,
    );

    const saveButton = screen.getByRole('button', { name: 'Simpan Keputusan Rollout' });
    expect(saveButton).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Mode rollout QA assurance'), {
      target: { value: 'warn' },
    });
    fireEvent.change(screen.getByLabelText('Alasan perubahan'), { target: { value: 'siap' } });
    expect(saveButton).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Alasan perubahan'), {
      target: { value: 'Pilot peringatan telah disetujui oleh Workspace.' },
    });
    fireEvent.click(saveButton);

    expect(onSave).toHaveBeenCalledWith({
      mode: 'warn',
      reason: 'Pilot peringatan telah disetujui oleh Workspace.',
    });
  });

  it('shows a read-only mode to non-governance roles', () => {
    render(
      <QaAssuranceRolloutCard
        settings={settings}
        isLoading={false}
        error={null}
        canManage={false}
        isSaving={false}
        onRetry={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('Mode rollout QA assurance')).toBeDisabled();
    expect(screen.queryByLabelText('Alasan perubahan')).not.toBeInTheDocument();
    expect(
      screen.getByText(/Hanya Owner atau Admin Workspace yang dapat mengubah/i),
    ).toBeInTheDocument();
  });

  it('shows a retryable authenticated-data error without fallback values', () => {
    const onRetry = vi.fn();
    render(
      <QaAssuranceRolloutCard
        settings={null}
        isLoading={false}
        error="Anda tidak memiliki izin untuk melihat konfigurasi ini."
        canManage={false}
        isSaving={false}
        onRetry={onRetry}
        onSave={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Coba lagi memuat rollout QA assurance' }));
    expect(onRetry).toHaveBeenCalledOnce();
    expect(screen.queryByText(/Mode aktif:/)).not.toBeInTheDocument();
  });
});
