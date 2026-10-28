import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { TestCase } from '@qlick/contracts';
import { TestCaseFollowUpPanel, type TestCaseFollowUpPanelProps } from '../TestCaseFollowUpPanel';

const testCase = {
  id: 'tc-1',
  title: 'Halaman 2 berisi sisa subtask',
  preconditions: 'Login sebagai anggota',
  testData: 'Fixture 25 subtask',
  steps: ['Buka Task Hub', 'Klik halaman 2'],
  expectedResult: 'Halaman 2 berisi 1 subtask',
} as unknown as TestCase;

function setup(overrides: Partial<TestCaseFollowUpPanelProps> = {}) {
  const props: TestCaseFollowUpPanelProps = {
    testCase,
    result: { status: 'failed', actualResult: 'Halaman 2 kosong' },
    developers: [{ userId: 'dev-1', name: 'Dina' }],
    reviewTargets: [{ id: 'st-1', title: 'Endpoint paginasi', assigneeName: 'Dina' }],
    existingBugs: [],
    onReportBug: vi.fn().mockResolvedValue(undefined),
    onRequestChanges: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  render(<TestCaseFollowUpPanel {...props} />);
  return props;
}

describe('TestCaseFollowUpPanel (AC-3.5)', () => {
  it('prefills the bug from the test case and actual result and sends it once', async () => {
    const props = setup();
    expect(screen.getByLabelText('Judul bug')).toHaveValue(
      'Halaman 2 berisi sisa subtask — hasil gagal',
    );
    const details = screen.getByLabelText('Langkah reproduksi') as HTMLTextAreaElement;
    expect(details.value).toContain('1. Buka Task Hub');
    expect(details.value).toContain('Hasil aktual: Halaman 2 kosong');

    fireEvent.click(screen.getByRole('button', { name: 'Kirim bug ke Developer' }));
    await waitFor(() =>
      expect(props.onReportBug).toHaveBeenCalledWith(
        expect.objectContaining({ assigneeId: 'dev-1', severity: 'high' }),
      ),
    );
    expect(await screen.findByText(/Bug dikirim ke Dina/)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Kirim bug ke Developer' }),
    ).not.toBeInTheDocument();
  });

  it('requires a Developer when several are possible', () => {
    setup({
      developers: [
        { userId: 'dev-1', name: 'Dina' },
        { userId: 'dev-2', name: 'Bima' },
      ],
    });
    expect(screen.getByRole('button', { name: 'Kirim bug ke Developer' })).toBeDisabled();
    expect(screen.getByText('Pilih Developer penerima.')).toBeInTheDocument();
  });

  it('requests changes on the developer subtask in review with prefilled notes', async () => {
    const props = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Minta perbaikan' }));
    fireEvent.change(screen.getByLabelText('Subtask Developer'), { target: { value: 'st-1' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Minta perbaikan' })[1]);
    await waitFor(() =>
      expect(props.onRequestChanges).toHaveBeenCalledWith({
        subtaskId: 'st-1',
        notes: expect.stringContaining('Hasil aktual: Halaman 2 kosong'),
      }),
    );
  });

  it('explains why changes cannot be requested when no subtask is in review', () => {
    setup({ reviewTargets: [] });
    fireEvent.click(screen.getByRole('button', { name: 'Minta perbaikan' }));
    expect(
      screen.getByText(/tidak ada subtask Developer yang sedang menunggu review/i),
    ).toBeInTheDocument();
  });

  it('shows the existing bug instead of the forms', () => {
    setup({ existingBugs: [{ id: 'b-1', title: 'Halaman 2 kosong', assigneeName: 'Dina' }] });
    expect(screen.getByText(/Dilaporkan sebagai bug/)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Kirim bug ke Developer' }),
    ).not.toBeInTheDocument();
  });

  it('shows the error and keeps the form when sending fails', async () => {
    setup({ onReportBug: vi.fn().mockRejectedValue(new Error('Bug gagal dibuat.')) });
    fireEvent.click(screen.getByRole('button', { name: 'Kirim bug ke Developer' }));
    expect(await screen.findByText('Bug gagal dibuat.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kirim bug ke Developer' })).toBeEnabled();
  });
});
