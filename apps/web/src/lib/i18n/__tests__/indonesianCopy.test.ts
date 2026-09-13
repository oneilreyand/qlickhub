import { describe, expect, it } from 'vitest';
import type { ReadinessGate } from '@qlick/contracts';
import { getIndonesianReleaseGateCopy } from '../indonesianCopy';

const gate = (code: ReadinessGate['code'], reason: string): ReadinessGate => ({
  code,
  label: 'Backend label',
  status: 'failed',
  reason,
});

describe('getIndonesianReleaseGateCopy', () => {
  it.each([
    ['requirement_coverage', 'Cakupan Requirement'],
    ['latest_test_results', 'Hasil Test Run terbaru'],
    ['critical_high_bugs', 'Bug kritis/tinggi'],
    ['development_completion', 'Penyelesaian pengembangan'],
    ['qa_sign_off', 'Persetujuan QA'],
  ] as const)('menerjemahkan label gate %s', (code, label) => {
    expect(getIndonesianReleaseGateCopy(gate(code, 'Alasan sudah diterjemahkan.')).label).toBe(
      label,
    );
  });

  it.each([
    [
      'requirement_coverage',
      'No requirements are linked to this Feature / Story.',
      'Belum ada Requirement yang tertaut ke Feature / Story ini.',
    ],
    [
      'requirement_coverage',
      'All 2 linked requirements are covered by active test cases.',
      'Seluruh 2 Requirement tertaut telah dicakup oleh Test Case aktif.',
    ],
    [
      'requirement_coverage',
      '1/2 linked requirements are covered by active test cases.',
      '1/2 Requirement tertaut telah dicakup oleh Test Case aktif.',
    ],
    [
      'latest_test_results',
      'No active mapped test cases are available for execution.',
      'Belum ada Test Case aktif tertaut yang dapat dijalankan.',
    ],
    [
      'latest_test_results',
      'Latest results passed for all 4 active mapped test cases.',
      'Hasil terbaru lulus untuk seluruh 4 Test Case aktif tertaut.',
    ],
    [
      'latest_test_results',
      'Latest results: 2/5 passed, 1 failed, 1 blocked, 0 skipped, 1 unexecuted.',
      'Hasil terbaru: 2/5 lulus, 1 gagal, 1 terblokir, 0 dilewati, 1 belum dijalankan.',
    ],
    [
      'critical_high_bugs',
      'No unverified Critical or High bugs are linked to this Feature / Story.',
      'Tidak ada Bug kritis atau tinggi yang belum diverifikasi pada Feature / Story ini.',
    ],
    [
      'critical_high_bugs',
      '2 unverified Critical or High bugs remain.',
      'Masih ada 2 Bug kritis atau tinggi yang belum diverifikasi.',
    ],
    [
      'development_completion',
      'No development subtasks are linked to this Feature / Story.',
      'Belum ada Subtask pengembangan yang tertaut ke Feature / Story ini.',
    ],
    [
      'development_completion',
      '1/2 development subtasks are complete.',
      '1/2 Subtask pengembangan telah selesai.',
    ],
    ['qa_sign_off', 'No QA Sign-off is recorded.', 'Belum ada persetujuan QA yang dicatat.'],
    ['qa_sign_off', 'The latest QA Sign-off is rejected.', 'QA Sign-off terbaru ditolak.'],
  ] as const)('menerjemahkan alasan backend untuk %s', (code, reason, expected) => {
    expect(getIndonesianReleaseGateCopy(gate(code, reason)).reason).toBe(expected);
  });

  it('mempertahankan alasan baru yang belum memiliki pemetaan', () => {
    expect(
      getIndonesianReleaseGateCopy(
        gate('qa_sign_off', 'Alasan backend baru yang belum memiliki pemetaan.'),
      ).reason,
    ).toBe('Alasan backend baru yang belum memiliki pemetaan.');
  });
});
