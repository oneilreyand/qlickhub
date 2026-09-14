import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Task, ProductBrief } from '@qlick/contracts';
import { SubtaskRoleTimeline } from '../SubtaskRoleTimeline';

const mockParentTask: Task = {
  id: 'parent-task-1',
  workspaceId: 'ws-1',
  title: 'E-Commerce Checkout Revamp',
  status: 'in_progress',
  priority: 'high',
  reporterId: 'user-po',
  startDate: '2026-08-01',
  dueDate: '2026-08-30',
  createdAt: '2026-08-01T00:00:00Z',
  updatedAt: '2026-08-01T00:00:00Z',
};

const mockSubtasks: Task[] = [
  {
    id: 'sub-be-1',
    workspaceId: 'ws-1',
    parentTaskId: 'parent-task-1',
    title: 'Payment Gateway API Integration',
    deliveryArea: 'backend',
    status: 'in_progress',
    priority: 'urgent',
    reporterId: 'user-po',
    assigneeId: 'user-be',
    startDate: '2026-08-01',
    dueDate: '2026-08-10', // Overdue relative to current date
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
  },
  {
    id: 'sub-fe-1',
    workspaceId: 'ws-1',
    parentTaskId: 'parent-task-1',
    title: 'Credit Card Input Form UI',
    deliveryArea: 'frontend',
    status: 'todo',
    priority: 'high',
    reporterId: 'user-po',
    assigneeId: 'user-fe',
    startDate: '2026-08-11',
    dueDate: '2026-08-20',
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
  },
  {
    id: 'sub-qa-1',
    workspaceId: 'ws-1',
    parentTaskId: 'parent-task-1',
    title: 'Checkout E2E Automated Tests',
    deliveryArea: 'qa',
    status: 'todo',
    priority: 'medium',
    reporterId: 'user-po',
    assigneeId: 'user-qa',
    startDate: '2026-08-21',
    dueDate: '2026-08-28',
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
  },
];

const mockBrief: ProductBrief = {
  document: {
    id: 'doc-1',
    workspaceId: 'ws-1',
    title: 'Checkout Specs',
    docType: 'product_brief',
    status: 'approved',
    ownerId: 'user-po',
    currentVersion: 1,
    createdBy: 'user-po',
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
  },
  currentVersion: {
    id: 'v-1',
    workspaceId: 'ws-1',
    documentId: 'doc-1',
    version: 1,
    title: 'Checkout Specs',
    contentMarkdown: 'Specs content',
    inScope: [{ id: 'scope-1', text: 'Stripe', position: 0 }],
    outScope: [{ id: 'scope-2', text: 'Crypto', position: 0 }],
    acceptanceCriteria: [{ id: 'crit-1', text: 'Fast checkout', position: 0 }],
    createdBy: 'user-po',
    createdAt: '2026-08-01T00:00:00Z',
  },
};

const mockMembers = [
  { userId: 'user-po', role: 'po', user: { name: 'Sarah PO' } },
  { userId: 'user-be', role: 'dev', user: { name: 'Alex Backend' } },
  { userId: 'user-fe', role: 'dev', user: { name: 'Jordan Frontend' } },
  { userId: 'user-qa', role: 'qa', user: { name: 'Taylor QA' } },
];

describe('SubtaskRoleTimeline Molecule', () => {
  it('renders bottleneck banner identifying Dev Backend bottleneck when backend subtask is delayed', () => {
    render(
      <SubtaskRoleTimeline
        parentTask={mockParentTask}
        subtasks={mockSubtasks}
        productBrief={mockBrief}
        members={mockMembers}
      />,
    );

    expect(screen.getByText('Timeline Peran & Handoff')).toBeInTheDocument();

    // Primary Bottleneck banner
    expect(screen.getByText(/Hambatan Dev Backend/i)).toBeInTheDocument();
    expect(screen.getByText(/Subtask Backend terlambat/i)).toBeInTheDocument();

    // Cross-role handoff pipeline stage cards
    expect(screen.getByText('Spesifikasi PO')).toBeInTheDocument();
    expect(screen.getByText('Dev BE')).toBeInTheDocument();
    expect(screen.getByText('Dev FE')).toBeInTheDocument();
    expect(screen.getAllByText('QA').length).toBeGreaterThan(0);
  });

  it('renders subtask items and allows role filtering', () => {
    render(
      <SubtaskRoleTimeline
        parentTask={mockParentTask}
        subtasks={mockSubtasks}
        productBrief={mockBrief}
        members={mockMembers}
      />,
    );

    // Initial view: all subtasks listed in stream
    expect(screen.getAllByText('Payment Gateway API Integration').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Credit Card Input Form UI').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Checkout E2E Automated Tests').length).toBeGreaterThan(0);

    // Filter by FE only
    const feFilterBtn = screen.getByRole('button', { name: /FE \(1\)/i });
    fireEvent.click(feFilterBtn);

    expect(screen.getAllByText('Credit Card Input Form UI').length).toBeGreaterThan(0);
    expect(screen.queryByText('Payment Gateway API Integration')).not.toBeInTheDocument();
  });

  it('displays role-specific assignees and date ranges in stage cards', () => {
    render(
      <SubtaskRoleTimeline
        parentTask={mockParentTask}
        subtasks={mockSubtasks}
        productBrief={mockBrief}
        members={mockMembers}
      />,
    );

    // PO specs card displays Sarah PO
    expect(screen.getByText('Sarah PO')).toBeInTheDocument();

    // BE card displays Alex Backend
    expect(screen.getByText('Alex Backend')).toBeInTheDocument();
  });

  it('renders the schedule as a calendar grid with accessible full-date headers', () => {
    render(
      <SubtaskRoleTimeline
        parentTask={mockParentTask}
        subtasks={mockSubtasks}
        productBrief={mockBrief}
        members={mockMembers}
      />,
    );

    expect(screen.getByRole('grid', { name: 'Kalender jadwal peran' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Jadwal rinci Feature ini untuk mengikuti handoff dari PO ke Development dan QA.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: `Semua (${mockSubtasks.length})` }),
    ).toBeInTheDocument();
    expect(screen.getByText('Peran & Subtask')).toBeInTheDocument();
    expect(screen.getByText('Kondisi')).toBeInTheDocument();
    expect(screen.getByText('Terlambat')).toBeInTheDocument();
    expect(screen.getByText('Agustus 2026')).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: /sabtu, 1 agustus 2026/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: /Payment Gateway API Integration.*1 Agu.*10 Agu/i }),
    ).toBeInTheDocument();
  });

  it('guarantees at least 21 calendar day columns for short-range or unscheduled tasks to avoid empty void', () => {
    const unscheduledParentTask: Task = {
      ...mockParentTask,
      startDate: undefined,
      dueDate: undefined,
    };
    const shortSubtasks: Task[] = [
      {
        ...mockSubtasks[0],
        startDate: undefined,
        dueDate: undefined,
      },
      {
        ...mockSubtasks[1],
        startDate: '2026-09-14',
        dueDate: '2026-09-15',
      },
    ];

    render(
      <SubtaskRoleTimeline
        parentTask={unscheduledParentTask}
        subtasks={shortSubtasks}
        members={mockMembers}
      />,
    );

    const columnHeaders = screen.getAllByRole('columnheader');
    expect(columnHeaders.length).toBeGreaterThanOrEqual(21);
    expect(
      screen.getByText('Belum dijadwalkan (Tambahkan tanggal di tab Detail)'),
    ).toBeInTheDocument();
  });
});
