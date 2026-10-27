import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { DeliveryTraceRequirementNode, Task } from '@qlick/contracts';
import { TestCaseEditor, type TestCaseEditorProps } from '../TestCaseEditor';

const subtask = {
  id: 's1',
  title: 'Uji endpoint',
  deliveryArea: 'qa',
} as Task;

const requirements = [
  {
    requirement: { id: 'r1', code: 'REQ-1', title: 'Paginasi subtask' },
    acceptanceCriteria: [
      { id: 'a1', code: 'AC-1', text: 'Halaman 1 berisi 24', status: 'active' },
      { id: 'a2', code: 'AC-2', text: 'Dihapus', status: 'archived' },
    ],
    testCases: [{ id: 't1' }],
  },
] as unknown as DeliveryTraceRequirementNode[];

function setup(overrides: Partial<TestCaseEditorProps> = {}) {
  const props: TestCaseEditorProps = {
    subtask,
    requirements,
    canSubmit: true,
    isSaving: false,
    onBack: vi.fn(),
    onSubmit: vi.fn(),
    ...overrides,
  };
  render(<TestCaseEditor {...props} />);
  return props;
}

describe('TestCaseEditor', () => {
  it('lists only active AC and requires a title and at least one AC', () => {
    const props = setup();
    expect(screen.getByRole('button', { name: /REQ-1 AC-1/ })).toBeInTheDocument();
    // Chip dikelompokkan per requirement dengan judulnya agar jelas AC milik requirement mana.
    expect(screen.getAllByText(/Paginasi subtask/).length).toBeGreaterThan(0);
    expect(screen.getByText(/TEST CASE BARU · REQ-1/)).toBeInTheDocument();
    expect(screen.queryByText(/AC-2/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Simpan Test Case' }));
    expect(props.onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Judul wajib diisi.')).toBeInTheDocument();
    expect(screen.getByText('Pilih minimal satu AC yang diuji.')).toBeInTheDocument();
  });

  it('submits trimmed values and distinguishes save from save-and-run', () => {
    const props = setup();
    fireEvent.change(screen.getByLabelText('Judul'), { target: { value: '  Halaman 2  ' } });
    fireEvent.click(screen.getByRole('button', { name: /REQ-1 AC-1/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Negatif' }));
    fireEvent.change(screen.getByLabelText('Langkah 1'), { target: { value: 'Buka Task Hub' } });
    fireEvent.click(screen.getByRole('button', { name: 'Langkah' }));
    fireEvent.click(screen.getByRole('button', { name: 'Hapus langkah 2' }));

    fireEvent.click(screen.getByRole('button', { name: 'Simpan & jalankan sekarang' }));
    expect(props.onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Halaman 2',
        criterionIds: ['a1'],
        scenarioKind: 'negative',
        steps: ['Buka Task Hub'],
      }),
      true,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Simpan Test Case' }));
    expect(props.onSubmit).toHaveBeenLastCalledWith(expect.anything(), false);
  });

  it('disables saving for someone who is not the assigned QA', () => {
    setup({ canSubmit: false });
    expect(screen.getByText(/Hanya QA yang ditugaskan/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Simpan Test Case' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Simpan & jalankan sekarang' })).toBeDisabled();
  });

  it('shows the Test Case count per requirement', () => {
    setup();
    expect(screen.getByText('1 Test Case')).toBeInTheDocument();
  });
});
