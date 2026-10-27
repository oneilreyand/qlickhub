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
      screen.getByText(
        'Tambahkan tautan bukti (Google Drive, Loom, YouTube, atau Vimeo) untuk hasil ini.',
      ),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Tautan bukti/), {
      target: { value: 'https://drive.google.com/file/d/abc123/view' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Tambah tautan' }));
    expect(save).toBeEnabled();

    fireEvent.click(save);
    expect(props.onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'failed',
        actualResult: 'Halaman 2 kosong',
        links: [{ url: 'https://drive.google.com/file/d/abc123/view', label: undefined }],
      }),
    );
  });

  it('accepts a video link as evidence and a skipped result with a reason', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Terblokir' }));
    fireEvent.change(screen.getByLabelText(/Hasil aktual/), { target: { value: 'Server mati' } });
    fireEvent.change(screen.getByLabelText(/Tautan bukti/), {
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

  it('rejects links that cannot be previewed in the app (only link evidence is accepted)', () => {
    setup();
    expect(screen.queryByLabelText('Pilih file bukti')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Lulus' }));
    fireEvent.change(screen.getByLabelText(/Tautan bukti/), {
      target: { value: 'https://example.com/screenshot.png' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Tambah tautan' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Google Drive, Loom, YouTube, atau Vimeo');
    expect(screen.getByRole('button', { name: 'Simpan hasil' })).toBeDisabled();
  });

  it('opens a saved evidence link inside the app instead of leaving it', () => {
    const run = {
      id: 'run1',
      build: 'b1',
      environment: 'staging',
      status: 'completed',
      result: {
        status: 'passed',
        actualResult: null,
        notes: null,
        evidence: [],
        evidenceLinks: [
          {
            id: 'l1',
            url: 'https://www.loom.com/share/abc123',
            provider: 'loom',
            mediaKind: 'video',
            label: 'Rekaman uji',
            normalizedUrl: 'https://www.loom.com/embed/abc123',
            previewStatus: 'ready',
          },
        ],
        evidenceManifests: [],
      },
    } as unknown as TestRun;
    setup({ run });
    fireEvent.click(screen.getByText('Rekaman uji'));
    const frame = screen.getByTitle('Rekaman uji');
    expect(frame).toHaveAttribute('src', 'https://www.loom.com/embed/abc123');
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
