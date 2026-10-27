import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { BugRetestHistory, BugStatus, BugWithContext } from '@qlick/contracts';
import { BugWorkView, type BugWorkViewProps } from '../BugWorkView';

function makeBug(status: BugStatus): BugWithContext {
  return {
    id: 'b1',
    workspaceId: 'w1',
    featureTaskId: 'f1',
    requirementId: 'r1',
    testResultId: 't1',
    environment: 'staging',
    assigneeId: 'u1',
    title: 'Total checkout salah',
    severity: 'high',
    status,
    reproductionDetails: 'Tambah dua item lalu lihat total',
    resolutionNotes: null,
    createdBy: 'u2',
    resolvedAt: null,
    verifiedAt: null,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    featureTask: { id: 'f1', title: 'Checkout' },
    requirement: { id: 'r1', code: 'REQ-1', title: 'Total benar' },
    assignee: { id: 'u1', name: 'Dev Satu', email: 'dev@example.com' },
    originatingTestResult: null,
    originatingTestCase: null,
    bugEvidenceLinks: [],
  } as unknown as BugWithContext;
}

function setup(status: BugStatus, overrides: Partial<BugWorkViewProps> = {}) {
  const props: BugWorkViewProps = {
    bug: makeBug(status),
    history: { cycles: [] } as unknown as BugRetestHistory,
    canFix: false,
    canRetest: false,
    isBusy: false,
    onBack: vi.fn(),
    onOpenFeature: vi.fn(),
    onStart: vi.fn(),
    onResolve: vi.fn().mockResolvedValue(undefined),
    onStartRetest: vi.fn(),
    ...overrides,
  };
  render(<BugWorkView {...props} />);
  return props;
}

describe('BugWorkView', () => {
  it('lets the assigned developer start an open bug', () => {
    const props = setup('open', { canFix: true });
    fireEvent.click(screen.getByRole('button', { name: 'Mulai dikerjakan' }));
    expect(props.onStart).toHaveBeenCalledOnce();
  });

  it('requires a candidate and notes before sending the fix to QA', async () => {
    const props = setup('in_progress', { canFix: true });
    fireEvent.click(screen.getByRole('button', { name: 'Kirim ke QA' }));
    expect(screen.getByRole('button', { name: 'Kirim perbaikan' })).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Kandidat/i), { target: { value: 'commit:abc123' } });
    fireEvent.change(screen.getByLabelText(/Catatan/i), { target: { value: 'Perbaiki total' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kirim perbaikan' }));

    await waitFor(() =>
      expect(props.onResolve).toHaveBeenCalledWith(
        expect.objectContaining({
          candidateFingerprint: 'commit:abc123',
          resolutionNotes: 'Perbaiki total',
        }),
      ),
    );
  });

  it('lets QA start a retest only when the bug awaits retest', () => {
    const props = setup('resolved', { canRetest: true });
    fireEvent.click(screen.getByRole('button', { name: 'Mulai retest' }));
    expect(props.onStartRetest).toHaveBeenCalledOnce();
  });

  it('shows no action buttons for viewers and warns about reopened bugs', () => {
    setup('reopened');
    expect(screen.queryByRole('button', { name: 'Mulai dikerjakan' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mulai retest' })).not.toBeInTheDocument();
    expect(screen.getByText(/dibuka kembali setelah retest/i)).toBeInTheDocument();
  });
});
