import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Task } from '@qlick/contracts';
import { SubtaskSummaryRow } from '../SubtaskSummaryRow';

/** Contract-valid subtask factory (P5g-2, ADR-038). */
const subtask = (overrides: Partial<Task> = {}): Task => ({
  id: '10000000-0000-4000-8000-000000000001',
  workspaceId: '20000000-0000-4000-8000-000000000001',
  folderId: null,
  parentTaskId: '40000000-0000-4000-8000-000000000001',
  deliveryArea: 'backend',
  title: 'Webhook pembayaran',
  description: null,
  status: 'todo',
  priority: 'high',
  assigneeId: null,
  assignmentMode: 'assigned',
  reporterId: '30000000-0000-4000-8000-000000000001',
  startDate: '2026-11-04',
  dueDate: '2026-11-10',
  completedAt: null,
  createdAt: '2026-11-03T01:00:00.000Z',
  updatedAt: '2026-11-03T01:00:00.000Z',
  ...overrides,
});

describe('SubtaskSummaryRow assignee label', () => {
  it('labels open work as Terbuka, distinct from unassigned work', () => {
    const { unmount } = render(<SubtaskSummaryRow subtask={subtask({ assignmentMode: 'open' })} />);
    expect(screen.getByText('Terbuka')).toBeInTheDocument();
    expect(
      screen.getByTitle('Penugasan terbuka: Developer/QA yang cocok dapat mengambilnya'),
    ).toBeInTheDocument();
    unmount();
    render(<SubtaskSummaryRow subtask={subtask()} />);
    expect(screen.getByText('Belum ditugaskan')).toBeInTheDocument();
    expect(screen.queryByText('Terbuka')).toBeNull();
  });

  it('shows the assignee name when the subtask is assigned', () => {
    render(
      <SubtaskSummaryRow
        subtask={subtask({ assigneeId: subtask().reporterId })}
        assigneeName="Bima"
      />,
    );
    expect(screen.getByText('Bima')).toBeInTheDocument();
  });
});
