import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, test, expect, vi } from 'vitest';
import {
  AssignmentConflictBanner,
  type AssignmentConflictBannerProps,
} from '../AssignmentConflictBanner';
import type { AssignmentConflictPreviewResponse } from '@qlick/contracts';

function renderBanner(props: AssignmentConflictBannerProps) {
  return render(
    <MemoryRouter>
      <AssignmentConflictBanner {...props} />
    </MemoryRouter>,
  );
}

describe('AssignmentConflictBanner Component', () => {
  test('returns null when preview is null', () => {
    const { container } = renderBanner({ preview: null });
    expect(container.firstChild).toBeNull();
  });

  test('returns null when there is no conflict and no unscheduled tasks', () => {
    const preview: AssignmentConflictPreviewResponse = {
      assigneeId: '11111111-1111-4111-8111-111111111111',
      startDate: '2026-09-01',
      dueDate: '2026-09-05',
      hasConflict: false,
      conflictCount: 0,
      conflicts: [],
      unscheduledActiveCount: 0,
      unscheduledSubtasks: [],
      advisoryMessage: 'No conflict',
    };
    const { container } = renderBanner({ preview });
    expect(container.firstChild).toBeNull();
  });

  test('renders loading indicator when isLoading is true', () => {
    renderBanner({ preview: null, isLoading: true, assigneeName: 'Budi' });
    expect(screen.getByText('Memeriksa irisan jadwal & kapasitas Budi...')).toBeInTheDocument();
  });

  test('renders error state with retry button', () => {
    const retryFn = vi.fn();
    renderBanner({
      preview: null,
      error: 'Network timeout',
      onRetry: retryFn,
    });
    expect(screen.getByText(/Gagal memeriksa jadwal: Network timeout/)).toBeInTheDocument();
    const retryBtn = screen.getByRole('button', { name: /Coba Lagi/i });
    retryBtn.click();
    expect(retryFn).toHaveBeenCalledOnce();
  });

  test('renders conflict alert with current workspace conflicts, redacted items, and unscheduled count', () => {
    const preview: AssignmentConflictPreviewResponse = {
      assigneeId: '11111111-1111-4111-8111-111111111111',
      startDate: '2026-09-02',
      dueDate: '2026-09-06',
      hasConflict: true,
      conflictCount: 2,
      conflicts: [
        {
          id: '22222222-2222-4222-8222-222222222222',
          workspaceId: '33333333-3333-4333-8333-333333333333',
          title: 'Implement Auth Endpoint',
          deliveryArea: 'backend',
          status: 'in_progress',
          startDate: '2026-09-01',
          dueDate: '2026-09-05',
          isRedacted: false,
          isCurrentWorkspace: true,
        },
        {
          startDate: '2026-09-03',
          dueDate: '2026-09-06',
          isRedacted: true,
          isCurrentWorkspace: false,
        },
        {
          startDate: '2026-09-04',
          dueDate: '2026-09-07',
          isRedacted: true,
          isCurrentWorkspace: false,
        },
      ],
      unscheduledActiveCount: 3,
      unscheduledSubtasks: [],
      advisoryMessage: 'Advisory: conflict detected',
    };

    renderBanner({
      preview,
      startDate: '2026-09-02',
      dueDate: '2026-09-06',
    });

    expect(
      screen.getByRole('heading', { name: 'Peringatan Irisan Jadwal (Advisory)' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Tidak Memblokir Simpan')).toBeInTheDocument();

    // Current workspace conflict details
    expect(screen.getByText('Implement Auth Endpoint')).toBeInTheDocument();
    expect(screen.getByText('BACKEND')).toBeInTheDocument();
    expect(screen.getByText('2026-09-01 — 2026-09-05')).toBeInTheDocument();

    // Redacted cross-workspace message (AUTH-011)
    expect(
      screen.getByText(
        (_content, element) =>
          element?.tagName.toLowerCase() === 'span' &&
          Boolean(element?.textContent?.includes('Terdapat 2 pekerjaan aktif pada workspace lain')),
      ),
    ).toBeInTheDocument();

    // Unscheduled count message
    expect(
      screen.getByText(
        (_content, element) =>
          element?.tagName.toLowerCase() === 'span' &&
          Boolean(element?.textContent?.includes('Pelaksana memiliki 3 subtask aktif tanpa jadwal')),
      ),
    ).toBeInTheDocument();

    // Link to reports with query params
    const reportsLink = screen.getByRole('link', { name: /Lihat di Timeline Tim/i });
    expect(reportsLink).toHaveAttribute(
      'href',
      '/reports?memberId=11111111-1111-4111-8111-111111111111&startDate=2026-09-02&endDate=2026-09-06',
    );
  });
});
