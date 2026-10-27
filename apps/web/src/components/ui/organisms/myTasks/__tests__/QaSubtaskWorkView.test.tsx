import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type {
  ParentTaskDeliveryTrace,
  QaTestCycle,
  Task,
  TaskTestCaseExecution,
} from '@qlick/contracts';
import { QaSubtaskWorkView, type QaSubtaskWorkViewProps } from '../QaSubtaskWorkView';

const subtask = {
  id: 'qa-1',
  parentTaskId: 'feat-1',
  title: 'Endpoint subtask per Feature dengan paginasi',
  deliveryArea: 'qa',
  status: 'in_progress',
  dueDate: '2026-10-03T00:00:00.000Z',
} as Task;
const parent = { id: 'feat-1', title: 'Sistem Manajemen Tugas' } as Task;

const trace = {
  requirements: [
    {
      requirement: { id: 'req-1', code: 'REQ-1' },
      acceptanceCriteria: [
        { id: 'ac-1', code: 'AC-1.1', text: 'a' },
        { id: 'ac-2', code: 'AC-1.2', text: 'b' },
      ],
      implementingSubtasks: [subtask],
    },
  ],
} as unknown as ParentTaskDeliveryTrace;

function execution(
  id: string,
  title: string,
  createdAt: string,
  status: 'passed' | 'failed' | null,
  caseStatus = 'active',
): TaskTestCaseExecution {
  return {
    testCase: { id, title, createdAt, status: caseStatus, requirementIds: ['req-1'] },
    latestRun: status ? { result: { status } } : null,
    testRuns: [],
  } as unknown as TaskTestCaseExecution;
}

const cycle = {
  id: 'cy-1',
  build: 'local-smoke-2026.10.19',
  environment: 'staging',
  status: 'in_progress',
} as QaTestCycle;

function setup(overrides: Partial<QaSubtaskWorkViewProps> = {}) {
  const props: QaSubtaskWorkViewProps = {
    subtask,
    parentTask: parent,
    trace,
    executions: [
      execution('tc-2', 'Dari halaman 2 kembali ke halaman 1', '2026-10-01T02:00:00Z', null),
      execution('tc-1', 'Feature dengan 25 subtask', '2026-10-01T01:00:00Z', 'passed'),
    ],
    acCodesByCase: { 'tc-1': ['AC-1.1'], 'tc-2': ['AC-1.1', 'AC-1.2'] },
    cycle,
    cycleCount: 2,
    developerNames: ['Bima (BE)'],
    handoff: {
      senderName: 'Bima',
      senderArea: 'BE',
      at: '2026-10-01T06:15:00.000Z',
      message: 'Siap diuji. Fixture tersedia.',
    },
    canExecute: true,
    onBack: vi.fn(),
    onOpenFeature: vi.fn(),
    onOpenActivity: vi.fn(),
    onOpenRun: vi.fn(),
    onAddTestCase: vi.fn(),
    onOpenFullDesk: vi.fn(),
    ...overrides,
  };
  render(<QaSubtaskWorkView {...props} />);
  return props;
}

describe('QaSubtaskWorkView (desain 08)', () => {
  it('shows the design elements: eyebrow, meta, handoff card, status panel', () => {
    setup();
    expect(screen.getByText(/Uji subtask/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: subtask.title })).toBeInTheDocument();
    expect(screen.getByText(/Bagian dari/)).toBeInTheDocument();
    expect(screen.getByText(/uji sebelum/)).toBeInTheDocument();
    const handoff = screen.getByLabelText('Pesan serah-terima');
    expect(within(handoff).getByText(/Bima \(BE\) mengirim ke QA/)).toBeInTheDocument();
    expect(within(handoff).getByText('Siap diuji. Fixture tersedia.')).toBeInTheDocument();
    const panel = screen.getByLabelText('Status uji');
    expect(within(panel).getByText('Sedang diuji')).toBeInTheDocument();
    expect(within(panel).getByText('Bima (BE)')).toBeInTheDocument();
    expect(within(panel).getByText(/2 AC/)).toBeInTheDocument();
    expect(within(panel).getByText('staging · local-smoke-2026.10.19')).toBeInTheDocument();
    expect(within(panel).getByText('Ke-2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aktivitas' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tugas Saya/ })).toBeInTheDocument();
  });

  it('lists Test Cases per Requirement numbered by creation order with their ACs', () => {
    setup();
    const group = screen.getByLabelText('Test Case untuk REQ-1');
    expect(within(group).getByText('1 dari 2 diuji')).toBeInTheDocument();
    expect(within(group).getByText('TC-01 · AC-1.1')).toBeInTheDocument();
    expect(within(group).getByText('TC-02 · AC-1.1, AC-1.2')).toBeInTheDocument();
    expect(within(group).getAllByText('Buka untuk cara uji dan unggah bukti')).toHaveLength(2);
  });

  it('Lulus and Gagal open the run page with the chosen result; tested cases show their result', () => {
    const props = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Gagal' }));
    expect(props.onOpenRun).toHaveBeenCalledWith('tc-2', 'failed');
    const lulus = screen.getAllByRole('button', { name: 'Lulus' });
    expect(lulus).toHaveLength(2);
    fireEvent.click(lulus[1]);
    expect(props.onOpenRun).toHaveBeenCalledWith('tc-2', 'passed');
    // TC-01 sudah lulus: tampil sebagai hasil (satu tombol), bukan pasangan Lulus/Gagal.
    expect(screen.getAllByRole('button', { name: 'Gagal' })).toHaveLength(1);
  });

  it('hides add and result actions for non-assigned viewers', () => {
    setup({ canExecute: false });
    expect(screen.queryByRole('button', { name: '+ Test Case' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Tambah Test Case untuk AC ini' }),
    ).not.toBeInTheDocument();
  });

  it('omits the handoff message line when the developer left no comment', () => {
    setup({
      handoff: { senderName: 'Bima', senderArea: 'BE', at: '2026-10-01T06:15:00Z', message: null },
    });
    expect(screen.getByText(/Bima \(BE\) mengirim ke QA/)).toBeInTheDocument();
    expect(screen.queryByText(/Siap diuji/)).not.toBeInTheDocument();
  });

  it('wires Aktivitas, add, feature, back, and full-desk actions', () => {
    const props = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Aktivitas' }));
    fireEvent.click(screen.getByRole('button', { name: '+ Test Case' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tambah Test Case untuk AC ini' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sistem Manajemen Tugas' }));
    fireEvent.click(screen.getByRole('button', { name: /Tugas Saya/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Buka desk QA lengkap' }));
    expect(props.onOpenActivity).toHaveBeenCalled();
    expect(props.onAddTestCase).toHaveBeenCalledTimes(2);
    expect(props.onOpenFeature).toHaveBeenCalled();
    expect(props.onBack).toHaveBeenCalled();
    expect(props.onOpenFullDesk).toHaveBeenCalled();
  });

  it('shows an empty state and no cycle without data', () => {
    setup({ executions: [], cycle: null, cycleCount: 0, handoff: null });
    expect(screen.getByText('Belum ada Test Case untuk requirement ini.')).toBeInTheDocument();
    expect(screen.getByText('Belum dimulai')).toBeInTheDocument();
  });
});
