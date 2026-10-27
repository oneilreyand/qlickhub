import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { QaTestCycle, TestCase, TestRun } from '@qlick/contracts';
import { TestCaseRunView, type TestCaseRunViewProps } from '../TestCaseRunView';

const testCase = {
  id: 'tc1',
  title: 'Halaman 2 berisi sisa subtask',
  scenarioKind: 'positive',
  priority: 'high',
  status: 'active',
  preconditions: 'Login sebagai anggota',
  testData: 'Fixture 1',
  steps: ['Buka Task Hub', 'Klik halaman 2'],
  expectedResult: 'Halaman 2 berisi 1 subtask',
  requirementIds: ['r1'],
} as TestCase;

const cycle = {
  id: 'c1',
  build: 'f19bab6',
  environment: 'Lokal',
  candidateFingerprint: 'commit:f19bab6',
  status: 'in_progress',
} as QaTestCycle;

function setup(overrides: Partial<TestCaseRunViewProps> = {}) {
  const props: TestCaseRunViewProps = {
    testCase,
    cycle,
    cycleDefaults: { candidateFingerprint: '', build: '', environment: '' },
    isStartingCycle: false,
    onStartCycle: vi.fn(),
    run: null,
    history: [],
    canExecute: true,
    isSaving: false,
    onUploadEvidence: vi.fn().mockResolvedValue({ id: 'att1', fileName: 'layar.png' }),
    onSave: vi.fn(),
    onAddSupplement: vi.fn().mockResolvedValue(undefined),
    onBack: vi.fn(),
    ...overrides,
  };
  render(<TestCaseRunView {...props} />);
  return props;
}

describe('TestCaseRunView', () => {
  it('keeps Simpan hasil disabled with a reason until the result is valid', async () => {
    const props = setup();
    const save = screen.getByRole('button', { name: 'Simpan hasil' });
    expect(save).toBeDisabled();
    expect(screen.getByText(/Pilih hasil/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Gagal' }));
    expect(save).toBeDisabled();
    expect(
      screen.getByText('Tulis hasil aktual untuk hasil Gagal atau Terblokir.'),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Hasil aktual/), {
      target: { value: 'Halaman 2 kosong' },
    });
    expect(save).toBeDisabled();
    expect(
      screen.getByText('Tambahkan bukti gambar atau video untuk hasil ini.'),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Pilih file bukti'), {
      target: { files: [new File(['x'], 'layar.png', { type: 'image/png' })] },
    });
    await waitFor(() => expect(screen.getByText('layar.png')).toBeInTheDocument());
    expect(save).toBeEnabled();

    fireEvent.click(save);
    expect(props.onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'failed',
        actualResult: 'Halaman 2 kosong',
        attachmentIds: ['att1'],
      }),
    );
  });

  it('accepts a video link as evidence and a skipped result with a reason', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Terblokir' }));
    fireEvent.change(screen.getByLabelText(/Hasil aktual/), { target: { value: 'Server mati' } });
    fireEvent.change(screen.getByLabelText(/Tautan \(mis/), {
      target: { value: 'https://www.loom.com/share/abc' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Tambah tautan' }));
    expect(screen.getByRole('button', { name: 'Simpan hasil' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Dilewati' }));
    expect(screen.getByRole('button', { name: 'Simpan hasil' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Alasan dilewati/), {
      target: { value: 'Fitur ditunda' },
    });
    expect(screen.getByRole('button', { name: 'Simpan hasil' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Lulus' }));
    expect(screen.getByRole('button', { name: 'Simpan hasil' })).toBeEnabled();
  });

  it('rejects non-image uploads with a clear message', async () => {
    const props = setup();
    fireEvent.change(screen.getByLabelText('Pilih file bukti'), {
      target: { files: [new File(['x'], 'log.pdf', { type: 'application/pdf' })] },
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('gambar atau video');
    expect(props.onUploadEvidence).not.toHaveBeenCalled();
  });

  it('offers to start a cycle prefilled from the last one when none is active', () => {
    const props = setup({
      cycle: null,
      cycleDefaults: { candidateFingerprint: 'commit:old', build: 'b1', environment: 'staging' },
    });
    expect(screen.getByRole('button', { name: 'Gagal' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Mulai siklus uji' }));
    expect(props.onStartCycle).toHaveBeenCalledWith({
      candidateFingerprint: 'commit:old',
      build: 'b1',
      environment: 'staging',
    });
  });

  it('locks a saved result and records a supplement with a reason', async () => {
    const run = {
      id: 'run1',
      build: 'f19bab6',
      environment: 'Lokal',
      status: 'completed',
      result: {
        status: 'failed',
        actualResult: 'Halaman 2 kosong',
        notes: null,
        evidence: [{ attachmentId: 'a1', fileName: 'layar.png' }],
        evidenceLinks: [],
        evidenceManifests: [],
      },
    } as unknown as TestRun;
    const props = setup({ run });
    expect(screen.queryByRole('button', { name: 'Simpan hasil' })).not.toBeInTheDocument();
    expect(screen.getByText('Gagal')).toBeInTheDocument();
    expect(screen.getByText('layar.png')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Tambah bukti susulan' }));
    expect(screen.getByText('Tautan dan alasan bukti susulan wajib diisi.')).toBeInTheDocument();
    expect(props.onAddSupplement).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Tautan bukti'), {
      target: { value: 'https://www.loom.com/share/xyz' },
    });
    fireEvent.change(screen.getByLabelText('Alasan menambah bukti'), {
      target: { value: 'Rekaman baru selesai diunggah' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Tambah bukti susulan' }));
    await waitFor(() =>
      expect(props.onAddSupplement).toHaveBeenCalledWith({
        url: 'https://www.loom.com/share/xyz',
        label: undefined,
        reason: 'Rekaman baru selesai diunggah',
      }),
    );
  });

  it('is read-only for someone who is not the assigned QA and shows blocked reasons', () => {
    setup({ canExecute: false, blockedReason: 'Test Case ini belum aktif.' });
    expect(screen.getByText('Test Case ini belum aktif.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lulus' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Simpan hasil' })).toBeDisabled();
  });

  it('shows position and the next Test Case', () => {
    const onOpen = vi.fn();
    setup({ position: { index: 1, total: 3 }, next: { title: 'TC kedua', onOpen } });
    expect(screen.getByText('1 dari 3')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Berikutnya: TC kedua' }));
    expect(onOpen).toHaveBeenCalled();
  });
});
