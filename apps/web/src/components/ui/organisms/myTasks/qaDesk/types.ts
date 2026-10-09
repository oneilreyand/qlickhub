import type { TestResultStatus } from '@qlick/contracts';

export type QaWorkflowTab = 'context' | 'preparation' | 'bugs' | 'sign_off' | 'discussion';

export interface BugTraceOption {
  key: string;
  testResultId: string;
  requirementId: string;
  label: string;
  testCaseTitle?: string;
  steps?: string[];
  expectedResult?: string | null;
  actualResult?: string | null;
  environment?: string;
}

export const resultBadgeVariant = (status?: TestResultStatus) => {
  if (status === 'passed') return 'passed' as const;
  if (status === 'failed') return 'blocked' as const;
  if (status === 'blocked') return 'review' as const;
  return 'neutral' as const;
};

export const testRunStatusCopy: Record<string, string> = {
  planned: 'Direncanakan',
  in_progress: 'Sedang berjalan',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
  passed: 'Lulus',
  failed: 'Gagal',
  blocked: 'Terblokir',
  skipped: 'Dilewati',
};

export const workflowBlockerCopy: Record<string, string> = {
  qa_test_cycle_missing: 'Buat Siklus Pengujian untuk kandidat yang akan diuji.',
  scoped_run_in_progress: 'Ada pengujian aktif yang masih memerlukan hasil.',
  scoped_result_missing: 'Setiap Test Case aktif memerlukan hasil pada siklus ini.',
  scoped_result_not_passed: 'Hasil Test Case terbaru belum seluruhnya lulus.',
  evidence_manifest_missing: 'Hasil lulus memerlukan bukti gambar atau video yang siap dibuka.',
  acceptance_criteria_uncovered: 'Acceptance Criterion aktif belum seluruhnya tercakup.',
  unverified_bug: 'Masih ada Bug yang belum diverifikasi melalui retest formal.',
};
