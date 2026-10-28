import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ParentTaskDeliveryTrace, Task } from '@qlick/contracts';
import {
  FeaturePrdRail,
  FeaturePrdSummary,
  FeatureTaskRail,
  FeatureTaskSummary,
} from '../FeatureStagePanels';

const id = (n: number) => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

const subtaskBe = {
  id: id(10),
  title: 'Endpoint subtask',
  status: 'todo',
  priority: 'high',
  deliveryArea: 'backend',
  assigneeId: id(50),
  startDate: '2026-09-30',
  dueDate: '2026-10-02',
} as unknown as Task;
const subtaskFe = {
  id: id(11),
  title: 'Kanban baca-saja',
  status: 'todo',
  priority: 'medium',
  deliveryArea: 'frontend',
  assigneeId: null,
} as unknown as Task;

const feature = {
  id: id(1),
  title: 'Sistem Manajemen Tugas',
  status: 'todo',
  priority: 'high',
  startDate: '2026-09-30',
  dueDate: '2026-10-05',
} as unknown as Task;

function node(n: number, code: string, acs: number, subtasks: Task[]) {
  return {
    requirement: { id: id(100 + n), code, title: `Judul ${code}` },
    acceptanceCriteria: Array.from({ length: acs }, (_, i) => ({
      id: id(200 + n * 10 + i),
      code: `AC-${i + 1}`,
      text: `Kriteria ${code} ${i + 1}`,
      status: 'active',
    })),
    implementingSubtasks: subtasks,
    totalAcceptanceCriteria: acs,
    totalImplementingSubtasks: subtasks.length,
  };
}

const trace = {
  requirements: [node(1, 'REQ-1', 2, [subtaskBe]), node(2, 'REQ-2', 1, [subtaskBe, subtaskFe])],
} as unknown as ParentTaskDeliveryTrace;

const brief = {
  currentVersion: {
    contentMarkdown: 'Tim perlu melihat semua pekerjaan.',
    inScope: [{ id: 'a', text: 'Kanban baca-saja' }],
    outScope: [{ id: 'b', text: 'Drag & drop kartu' }],
  },
} as never;

describe('FeaturePrdSummary', () => {
  it('menampilkan brief, scope, dan REQ → AC dari jejak delivery', () => {
    const onEditBrief = vi.fn();
    const onManage = vi.fn();
    render(
      <FeaturePrdSummary
        productBrief={brief}
        trace={trace}
        showBrief
        onEditBrief={onEditBrief}
        onManageRequirements={onManage}
      />,
    );

    expect(screen.getByText('Tim perlu melihat semua pekerjaan.')).toBeInTheDocument();
    expect(screen.getByText('Kanban baca-saja')).toBeInTheDocument();
    expect(screen.getByText('Drag & drop kartu')).toBeInTheDocument();
    expect(screen.getByText('Kriteria REQ-1 2')).toBeInTheDocument();
    expect(screen.getByText('Judul REQ-2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.click(screen.getByRole('button', { name: 'Kelola' }));
    expect(onEditBrief).toHaveBeenCalled();
    expect(onManage).toHaveBeenCalled();
  });

  it('menyembunyikan brief untuk subtask dan menampilkan keadaan kosong', () => {
    render(
      <FeaturePrdSummary
        productBrief={null}
        trace={null}
        showBrief={false}
        onEditBrief={vi.fn()}
        onManageRequirements={vi.fn()}
      />,
    );
    expect(screen.queryByRole('region', { name: 'Product Brief' })).not.toBeInTheDocument();
    expect(screen.getByText(/Belum ada Requirement tertaut/)).toBeInTheDocument();
  });
});

describe('FeaturePrdRail', () => {
  it('menghitung kelengkapan dan melanjutkan ke Task', () => {
    const onContinue = vi.fn();
    render(<FeaturePrdRail productBrief={brief} trace={trace} showBrief onContinue={onContinue} />);

    const rail = within(screen.getByRole('complementary', { name: 'Kelengkapan PRD' }));
    expect(rail.getByText(/2 requirement/)).toBeInTheDocument();
    expect(rail.getByText(/Setiap requirement punya AC \(3\)/)).toBeInTheDocument();
    expect(rail.getAllByText(/terpenuhi/)).toHaveLength(3);
    fireEvent.click(rail.getByRole('button', { name: 'Lanjut ke Task' }));
    expect(onContinue).toHaveBeenCalled();
  });

  it('menandai belum terpenuhi bila requirement tanpa AC', () => {
    const incomplete = {
      requirements: [node(1, 'REQ-1', 0, [])],
    } as unknown as ParentTaskDeliveryTrace;
    render(
      <FeaturePrdRail productBrief={null} trace={incomplete} showBrief onContinue={vi.fn()} />,
    );
    expect(screen.getAllByText(/belum terpenuhi/).length).toBeGreaterThanOrEqual(2);
  });
});

describe('FeatureTaskSummary', () => {
  const members = [{ userId: id(50), user: { name: 'Dina Nur' } }];

  it('menampilkan root task, subtask dengan label REQ, area, jadwal, dan inisial', () => {
    const onOpenSubtask = vi.fn();
    render(
      <FeatureTaskSummary
        task={feature}
        subtasks={[subtaskBe, subtaskFe]}
        trace={trace}
        members={members}
        isSubtask={false}
        canPlan
        onEditTask={vi.fn()}
        onOpenSubtask={onOpenSubtask}
        onManageSubtasks={vi.fn()}
        onAddSubtask={vi.fn()}
      />,
    );

    expect(screen.getByText('Mencakup REQ-1, REQ-2')).toBeInTheDocument();
    expect(screen.getByText('Subtask (2)')).toBeInTheDocument();
    const row = screen.getByRole('button', { name: /Endpoint subtask/ });
    expect(within(row).getByText('BE')).toBeInTheDocument();
    expect(within(row).getByText('REQ-1')).toBeInTheDocument();
    expect(within(row).getByText('REQ-2')).toBeInTheDocument();
    expect(within(row).getByText('30 Sep – 2 Okt')).toBeInTheDocument();
    expect(within(row).getByText('DN')).toBeInTheDocument();

    fireEvent.click(row);
    expect(onOpenSubtask).toHaveBeenCalledWith(subtaskBe.id);
    expect(screen.getByRole('button', { name: '+ Subtask' })).toBeInTheDocument();
  });

  it('menyembunyikan + Subtask tanpa izin merencanakan', () => {
    render(
      <FeatureTaskSummary
        task={feature}
        subtasks={[]}
        trace={null}
        members={[]}
        isSubtask={false}
        canPlan={false}
        onEditTask={vi.fn()}
        onOpenSubtask={vi.fn()}
        onManageSubtasks={vi.fn()}
        onAddSubtask={vi.fn()}
      />,
    );
    expect(screen.queryByRole('button', { name: '+ Subtask' })).not.toBeInTheDocument();
    expect(screen.getByText(/Belum ada subtask/)).toBeInTheDocument();
  });
});

describe('FeatureTaskRail', () => {
  it('merangkum cakupan dan menonaktifkan Tinjau & Apply', () => {
    render(<FeatureTaskRail trace={trace} />);
    const rail = within(screen.getByRole('complementary', { name: 'Cakupan requirement' }));
    expect(rail.getByText('1 subtask')).toBeInTheDocument();
    expect(rail.getByText('2 subtask')).toBeInTheDocument();
    expect(rail.getByText('Semua requirement punya subtask.')).toBeInTheDocument();
    expect(rail.getByRole('button', { name: 'Tinjau & Apply' })).toBeDisabled();
  });

  it('memberi tahu requirement yang belum punya subtask', () => {
    const partial = {
      requirements: [node(1, 'REQ-1', 1, []), node(2, 'REQ-2', 1, [subtaskBe])],
    } as unknown as ParentTaskDeliveryTrace;
    render(<FeatureTaskRail trace={partial} />);
    expect(screen.getByText('1 requirement belum punya subtask.')).toBeInTheDocument();
  });
});
