import {
  TASK_SCHEDULE_ORDER_MESSAGE,
  TASK_SCHEDULE_PAIR_MESSAGE,
  type ReadinessGate,
  type TaskScheduleValidationIssue,
} from '@qlick/contracts';

export function getIndonesianTaskScheduleMessage(
  issue: TaskScheduleValidationIssue | null,
): string | null {
  if (!issue) return null;
  if (issue.message === TASK_SCHEDULE_PAIR_MESSAGE) {
    return 'Tanggal mulai dan tanggal tenggat harus diisi bersama.';
  }
  if (issue.message === TASK_SCHEDULE_ORDER_MESSAGE) {
    return 'Tanggal mulai tidak boleh melewati tanggal tenggat.';
  }
  return 'Jadwal task belum valid. Periksa kembali tanggal mulai dan tenggat.';
}

const releaseGateLabels: Record<ReadinessGate['code'], string> = {
  requirement_coverage: 'Cakupan Requirement',
  latest_test_results: 'Hasil Test Run terbaru',
  critical_high_bugs: 'Bug kritis/tinggi',
  development_completion: 'Penyelesaian pengembangan',
  qa_sign_off: 'Persetujuan QA',
};

const replaceReason = (reason: string, pattern: RegExp, replacement: string) => {
  const match = reason.match(pattern);
  if (!match) return null;
  return replacement.replace(/\$(\d+)/g, (_, index: string) => match[Number(index)] || '');
};

export function getIndonesianReleaseGateCopy(gate: ReadinessGate): {
  label: string;
  reason: string;
} {
  const translations = [
    replaceReason(
      gate.reason,
      /^No requirements are linked to this Feature \/ Story\.$/,
      'Belum ada Requirement yang tertaut ke Feature / Story ini.',
    ),
    replaceReason(
      gate.reason,
      /^All (\d+) linked requirements are covered by active test cases\.$/,
      'Seluruh $1 Requirement tertaut telah dicakup oleh Test Case aktif.',
    ),
    replaceReason(
      gate.reason,
      /^(\d+)\/(\d+) linked requirements are covered by active test cases\.$/,
      '$1/$2 Requirement tertaut telah dicakup oleh Test Case aktif.',
    ),
    replaceReason(
      gate.reason,
      /^No active mapped test cases are available for execution\.$/,
      'Belum ada Test Case aktif tertaut yang dapat dijalankan.',
    ),
    replaceReason(
      gate.reason,
      /^No completed Test Run is recorded for the active mapped Test Cases\.$/,
      'Belum ada Test Run selesai untuk Test Case aktif yang tertaut.',
    ),
    replaceReason(
      gate.reason,
      /^Latest results passed for all (\d+) active mapped test cases\.$/,
      'Hasil terbaru lulus untuk seluruh $1 Test Case aktif tertaut.',
    ),
    replaceReason(
      gate.reason,
      /^Latest results: (\d+)\/(\d+) passed, (\d+) failed, (\d+) blocked, (\d+) skipped, (\d+) unexecuted\.$/,
      'Hasil terbaru: $1/$2 lulus, $3 gagal, $4 terblokir, $5 dilewati, $6 belum dijalankan.',
    ),
    replaceReason(
      gate.reason,
      /^No unverified Critical or High bugs are linked to this Feature \/ Story\.$/,
      'Tidak ada Bug kritis atau tinggi yang belum diverifikasi pada Feature / Story ini.',
    ),
    replaceReason(
      gate.reason,
      /^1 unverified Critical or High bug remains\.$/,
      'Masih ada 1 Bug kritis atau tinggi yang belum diverifikasi.',
    ),
    replaceReason(
      gate.reason,
      /^(\d+) unverified Critical or High bugs remain\.$/,
      'Masih ada $1 Bug kritis atau tinggi yang belum diverifikasi.',
    ),
    replaceReason(
      gate.reason,
      /^No development subtasks are linked to this Feature \/ Story\.$/,
      'Belum ada Subtask pengembangan yang tertaut ke Feature / Story ini.',
    ),
    replaceReason(
      gate.reason,
      /^All (\d+) development subtasks are complete\.$/,
      'Seluruh $1 Subtask pengembangan telah selesai.',
    ),
    replaceReason(
      gate.reason,
      /^(\d+)\/(\d+) development subtasks are complete\.$/,
      '$1/$2 Subtask pengembangan telah selesai.',
    ),
    replaceReason(
      gate.reason,
      /^No QA Sign-off is recorded\.$/,
      'Belum ada persetujuan QA yang dicatat.',
    ),
    replaceReason(
      gate.reason,
      /^The latest QA Sign-off is approved\.$/,
      'QA Sign-off terbaru disetujui.',
    ),
    replaceReason(
      gate.reason,
      /^The latest QA Sign-off is rejected\.$/,
      'QA Sign-off terbaru ditolak.',
    ),
  ];

  return {
    label: releaseGateLabels[gate.code],
    reason: translations.find((translation) => translation !== null) || gate.reason,
  };
}
