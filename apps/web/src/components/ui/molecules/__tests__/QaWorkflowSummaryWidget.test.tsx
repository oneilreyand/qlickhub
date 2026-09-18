import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { QaWorkflowSummary } from '@qlick/contracts';
import { QaWorkflowSummaryWidget } from '../QaWorkflowSummaryWidget';

describe('QaWorkflowSummaryWidget', () => {
  const mockBlockerCopy: Record<string, string> = {
    qa_test_cycle_missing: 'Buat Siklus Pengujian untuk kandidat yang akan diuji.',
    scoped_result_missing: 'Setiap Test Case aktif memerlukan hasil pada siklus ini.',
    unverified_bug: 'Masih ada Bug yang belum diverifikasi melalui retest formal.',
  };

  const mockSummaryReady: QaWorkflowSummary = {
    workspaceId: '11111111-1111-1111-1111-111111111111',
    featureTaskId: '22222222-2222-2222-2222-222222222222',
    qaSubtaskId: '33333333-3333-3333-3333-333333333333',
    featureTitle: 'Checkout Flow Refactor',
    qaSubtaskTitle: 'QA Pengujian Checkout Flow',
    qaSubtaskStatus: 'in_progress',
    testCycle: {
      id: '44444444-4444-4444-4444-444444444444',
      workspaceId: '11111111-1111-1111-1111-111111111111',
      featureTaskId: '22222222-2222-2222-2222-222222222222',
      qaSubtaskId: '33333333-3333-3333-3333-333333333333',
      readinessBaselineId: '55555555-5555-5555-5555-555555555555',
      candidateFingerprint: 'fp-123',
      build: 'v2.4.0-rc1',
      environment: 'staging',
      status: 'in_progress',
      ownerQaId: '66666666-6666-6666-6666-666666666666',
      createdAt: '2026-09-18T10:00:00.000Z',
      updatedAt: '2026-09-18T10:00:00.000Z',
    },
    nextAction: {
      code: 'record_qa_sign_off',
      label: 'Lakukan Sign-off QA untuk rilis',
    },
    blockers: [],
  };

  const mockSummaryBlocked: QaWorkflowSummary = {
    workspaceId: '11111111-1111-1111-1111-111111111111',
    featureTaskId: '22222222-2222-2222-2222-222222222222',
    qaSubtaskId: '33333333-3333-3333-3333-333333333333',
    featureTitle: 'Checkout Flow Refactor',
    qaSubtaskTitle: 'QA Pengujian Checkout Flow',
    qaSubtaskStatus: 'in_progress',
    testCycle: {
      id: '44444444-4444-4444-4444-444444444444',
      workspaceId: '11111111-1111-1111-1111-111111111111',
      featureTaskId: '22222222-2222-2222-2222-222222222222',
      qaSubtaskId: '33333333-3333-3333-3333-333333333333',
      readinessBaselineId: '55555555-5555-5555-5555-555555555555',
      candidateFingerprint: 'fp-123',
      build: 'v2.4.0-rc1',
      environment: 'staging',
      status: 'in_progress',
      ownerQaId: '66666666-6666-6666-6666-666666666666',
      createdAt: '2026-09-18T10:00:00.000Z',
      updatedAt: '2026-09-18T10:00:00.000Z',
    },
    nextAction: {
      code: 'execute_test_cases',
      label: 'Jalankan Test Case yang tersisa',
    },
    blockers: ['scoped_result_missing', 'unverified_bug'],
  };

  it('renders loading skeleton when isLoading is true', () => {
    const { container } = render(
      <QaWorkflowSummaryWidget
        workflowSummary={null}
        isLoading={true}
        error={null}
        workflowBlockerCopy={mockBlockerCopy}
      />,
    );
    expect(screen.getByText('Ringkasan Workflow QA')).toBeInTheDocument();
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders error alert when error is provided', () => {
    render(
      <QaWorkflowSummaryWidget
        workflowSummary={null}
        isLoading={false}
        error="Ringkasan workflow tidak dapat dimuat"
        workflowBlockerCopy={mockBlockerCopy}
      />,
    );
    expect(screen.getByText('Ringkasan workflow belum tersedia')).toBeInTheDocument();
    expect(screen.getByText('Ringkasan workflow tidak dapat dimuat')).toBeInTheDocument();
  });

  it('renders 3-tile summary cards with ready state when blockers are empty', () => {
    render(
      <QaWorkflowSummaryWidget
        workflowSummary={mockSummaryReady}
        isLoading={false}
        error={null}
        workflowBlockerCopy={mockBlockerCopy}
      />,
    );

    expect(screen.getByText('Siap lanjut')).toBeInTheDocument();
    expect(screen.getByText(/Menguji: Checkout Flow Refactor/)).toBeInTheDocument();
    expect(screen.getByText('v2.4.0-rc1')).toBeInTheDocument();
    expect(screen.getByText('Berikutnya: Lakukan Sign-off QA untuk rilis')).toBeInTheDocument();
    expect(screen.getByText('Semua kriteria terpenuhi. Siap lanjut.')).toBeInTheDocument();
  });

  it('renders blocker items when blockers are present', () => {
    render(
      <QaWorkflowSummaryWidget
        workflowSummary={mockSummaryBlocked}
        isLoading={false}
        error={null}
        workflowBlockerCopy={mockBlockerCopy}
      />,
    );

    expect(screen.getByText('Ada prasyarat')).toBeInTheDocument();
    expect(screen.getByText('Berikutnya: Jalankan Test Case yang tersisa')).toBeInTheDocument();
    expect(
      screen.getByText('Setiap Test Case aktif memerlukan hasil pada siklus ini.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Masih ada Bug yang belum diverifikasi melalui retest formal.'),
    ).toBeInTheDocument();
  });
});
