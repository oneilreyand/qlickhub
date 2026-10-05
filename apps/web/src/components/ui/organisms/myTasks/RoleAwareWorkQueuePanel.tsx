import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bug,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  ListChecks,
  RefreshCw,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import type { WorkQueueBucket, WorkQueueBucketCode, WorkQueueItem } from '@qlick/contracts';
import type { RoleAwareWorkQueueViewState } from '../../../../lib/hooks/useRoleAwareWorkQueue';
import { useDebounce } from '../../../../lib/hooks/useDebounce';
import { Alert } from '../../atoms/Alert';
import { Badge } from '../../atoms/Badge';
import { Button } from '../../atoms/Button';
import { Card } from '../../atoms/Card';
import { Select } from '../../atoms/Select';
import { Skeleton } from '../../atoms/Skeleton';
import { EmptyState } from '../../molecules/EmptyState';
import { SearchInput } from '../../molecules/SearchInput';
import { Tabs } from '../../molecules/Tabs';

export interface RoleAwareWorkQueuePanelProps {
  state: RoleAwareWorkQueueViewState;
  selectedTaskId?: string | null;
  onRefresh: () => void;
  onOpenItem: (item: WorkQueueItem) => void | Promise<void>;
}

const bucketIcons: Record<WorkQueueBucketCode, React.ReactNode> = {
  po_requirement_work: <FileCheck2 className="h-4 w-4" aria-hidden="true" />,
  po_release_decision: <ShieldCheck className="h-4 w-4" aria-hidden="true" />,
  po_timeline_work: <Calendar className="h-4 w-4" aria-hidden="true" />,
  dev_assigned_work: <ListChecks className="h-4 w-4" aria-hidden="true" />,
  dev_blocked_work: <AlertTriangle className="h-4 w-4" aria-hidden="true" />,
  dev_bug_fix: <Wrench className="h-4 w-4" aria-hidden="true" />,
  qa_test_work: <ClipboardCheck className="h-4 w-4" aria-hidden="true" />,
  qa_retest_work: <Bug className="h-4 w-4" aria-hidden="true" />,
  qa_sign_off: <CheckCircle2 className="h-4 w-4" aria-hidden="true" />,
};

const priorityVariants = {
  urgent: 'blocked',
  high: 'review',
  medium: 'info',
  low: 'draft',
} as const;

const bucketLabels: Record<WorkQueueBucketCode, string> = {
  po_requirement_work: 'Pekerjaan Requirement',
  po_release_decision: 'Keputusan Rilis',
  po_timeline_work: 'Pekerjaan Timeline',
  dev_assigned_work: 'Pekerjaan yang Ditugaskan',
  dev_blocked_work: 'Perlu Perbaikan',
  dev_bug_fix: 'Perbaikan Bug',
  qa_test_work: 'Pengujian dan Review',
  qa_retest_work: 'Pekerjaan Retest',
  qa_sign_off: 'Persetujuan QA',
};

const termLabels: Record<string, string> = {
  feature: 'Feature',
  subtask: 'Subtask',
  bug: 'Bug',
  urgent: 'Mendesak',
  high: 'Tinggi',
  medium: 'Sedang',
  low: 'Rendah',
  todo: 'Belum Dikerjakan',
  in_progress: 'Sedang Dikerjakan',
  changes_requested: 'Perlu Perbaikan',
  in_review: 'Dalam Review',
  resolved: 'Selesai Diperbaiki',
  open: 'Terbuka',
  reopened: 'Dibuka Kembali',
};

const actionLabels: Record<string, string> = {
  add_requirement: 'Tambahkan Requirement',
  complete_requirement: 'Lengkapi Requirement',
  record_release_decision: 'Catat Keputusan Rilis',
  schedule_feature: 'Atur Jadwal Feature',
  review_timeline: 'Tinjau Timeline',
  start_subtask: 'Mulai Subtask',
  continue_subtask: 'Lanjutkan Subtask',
  address_review_feedback: 'Tindak Lanjuti Masukan Review',
  continue_bug_fix: 'Lanjutkan Perbaikan Bug',
  start_bug_fix: 'Mulai Perbaikan Bug',
  review_subtask: 'Tinjau Subtask',
  resume_qa_task: 'Lanjutkan Task QA',
  execute_qa_task: 'Kerjakan Task QA',
  verify_bug_fix: 'Verifikasi Perbaikan Bug',
  record_qa_sign_off: 'Catat Persetujuan QA',
  view_context: 'Lihat konteks',
};

const workStateCopy = {
  actionable: { label: 'Siap ditindak', variant: 'passed' as const, action: 'Buka pekerjaan' },
  blocked: { label: 'Ada prasyarat', variant: 'review' as const, action: 'Lihat prasyarat' },
  read_only: { label: 'Informasi', variant: 'neutral' as const, action: 'Lihat konteks' },
};

function localizeTerm(value: string) {
  return termLabels[value] || value.replace(/_/g, ' ');
}

function localizeReason(reason: string) {
  return reason
    .replace(
      'No Requirement is linked to this Feature or its subtasks.',
      'Belum ada Requirement yang tertaut ke Feature atau Subtask-nya.',
    )
    .replace(
      /(\d+) linked Requirement\(s\) are not active\./,
      '$1 Requirement tertaut belum aktif.',
    )
    .replace(
      /Latest QA Sign-off is (.+) and has no Release Decision\./,
      'Persetujuan QA terbaru berstatus $1 dan belum memiliki Keputusan Rilis.',
    )
    .replace('Changes were requested during review.', 'Perbaikan diminta saat proses review.')
    .replace(/^Changes requested: /, 'Perbaikan diminta: ')
    .replace(
      'Latest QA Sign-off is rejected; record a new certification after verification.',
      'Persetujuan QA terbaru ditolak; catat persetujuan baru setelah verifikasi.',
    )
    .replace(
      'Feature is in review and has no QA Sign-off.',
      'Feature sedang dalam review dan belum memiliki persetujuan QA.',
    )
    .replace(
      /Feature is missing its start date and due date\./,
      'Feature belum memiliki tanggal mulai dan tenggat.',
    )
    .replace(/Feature is missing its start date\./, 'Feature belum memiliki tanggal mulai.')
    .replace(/Feature is missing its due date\./, 'Feature belum memiliki tenggat.')
    .replace(
      /Feature was due on (.+) and remains open\./,
      'Tenggat Feature adalah $1 dan pekerjaannya masih terbuka.',
    )
    .replace(
      /^This (.+) subtask is assigned to you and is (.+)\.$/,
      'Subtask $1 ini ditugaskan kepada Anda dan berstatus $2.',
    )
    .replace(
      /^(.+) Bug is assigned to you and is (.+)\.$/,
      'Bug dengan tingkat $1 ditugaskan kepada Anda dan berstatus $2.',
    )
    .replace(
      /^(.+) subtask is waiting for independent QA review\.$/,
      'Subtask $1 menunggu review independen dari QA.',
    )
    .replace(
      /^QA subtask is assigned to you and is (.+)\.$/,
      'Subtask QA ditugaskan kepada Anda dan berstatus $1.',
    )
    .replace(
      /^(.+) Bug is resolved and requires independent QA verification\.$/,
      'Bug dengan tingkat $1 telah diperbaiki dan memerlukan verifikasi independen dari QA.',
    );
}

function firstActiveBucket(buckets: WorkQueueBucket[], currentCode: string | null) {
  if (currentCode && buckets.some((bucket) => bucket.code === currentCode)) return currentCode;
  return buckets.find((bucket) => bucket.total > 0)?.code || buckets[0]?.code || null;
}

export const RoleAwareWorkQueuePanel: React.FC<RoleAwareWorkQueuePanelProps> = ({
  state,
  selectedTaskId,
  onRefresh,
  onOpenItem,
}) => {
  const [selectedBucketCode, setSelectedBucketCode] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [openingItemId, setOpeningItemId] = useState<string | null>(null);
  const debouncedSearchQuery = useDebounce(searchQuery, 250).trim().toLowerCase();
  const buckets = useMemo(() => state.queue?.buckets || [], [state.queue?.buckets]);

  const activeBucketCode = useMemo(() => {
    if (selectedBucketCode && buckets.some((bucket) => bucket.code === selectedBucketCode)) {
      return selectedBucketCode;
    }
    return firstActiveBucket(buckets, null);
  }, [buckets, selectedBucketCode]);

  const activeBucket = buckets.find((bucket) => bucket.code === activeBucketCode) || buckets[0];
  const visibleItems = useMemo(() => {
    if (!activeBucket) return [];
    return activeBucket.items.filter((item) => {
      if (priorityFilter !== 'all' && item.priority !== priorityFilter) return false;
      if (!debouncedSearchQuery) return true;
      return [item.title, item.reason, item.nextAction.label, item.subjectId].some((value) =>
        value.toLowerCase().includes(debouncedSearchQuery),
      );
    });
  }, [activeBucket, debouncedSearchQuery, priorityFilter]);

  const openItem = async (item: WorkQueueItem) => {
    setOpeningItemId(item.id);
    try {
      await onOpenItem(item);
    } finally {
      setOpeningItemId(null);
    }
  };

  if (state.isLoading) {
    return (
      <section className="space-y-4" aria-label="Memuat antrean kerja sesuai peran">
        <div className="grid gap-3 sm:grid-cols-3">
          {[1, 2, 3].map((id) => (
            <Skeleton key={id} variant="rectangular" className="h-20 rounded-2xl" />
          ))}
        </div>
        <Skeleton variant="rectangular" className="h-28 rounded-2xl" />
        <Skeleton variant="rectangular" className="h-28 rounded-2xl" />
      </section>
    );
  }

  if (state.permissionDenied) {
    return (
      <Alert
        tone="warning"
        title="Akses antrean kerja ditolak"
        icon={<AlertTriangle className="h-4 w-4" />}
      >
        Keanggotaan Workspace Anda tidak mengizinkan akses ke antrean ini.
      </Alert>
    );
  }

  if (state.error) {
    return (
      <div className="space-y-3">
        <Alert
          tone="error"
          title="Antrean kerja Anda tidak dapat dimuat"
          icon={<AlertTriangle className="h-4 w-4" />}
        >
          {state.error}
        </Alert>
        <Button
          variant="outline"
          size="md"
          onClick={onRefresh}
          leftIcon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}
        >
          Coba lagi
        </Button>
      </div>
    );
  }

  if (!state.queue || !activeBucket) {
    return (
      <EmptyState
        icon={<ListChecks className="h-5 w-5" />}
        title="Antrean kerja belum tersedia"
        description="Pilih Workspace aktif untuk memuat pekerjaan berikutnya sesuai peran Anda."
      />
    );
  }

  return (
    <section className="space-y-4" aria-labelledby="role-aware-queue-title">
      <h2 id="role-aware-queue-title" className="sr-only">
        Yang perlu Anda perhatikan
      </h2>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1 overflow-x-auto">
          <Tabs
            variant="pills"
            activeTabId={activeBucket.code}
            onChange={setSelectedBucketCode}
            ariaLabel="Filter antrean kerja"
            tabs={buckets.map((bucket) => ({
              id: bucket.code,
              label: bucketLabels[bucket.code],
              count: bucket.total,
              icon: bucketIcons[bucket.code],
            }))}
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={state.isLoading}
          leftIcon={
            <RefreshCw
              className={`h-3.5 w-3.5 ${state.isLoading ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
          }
          aria-label="Muat ulang antrean kerja"
          className="shrink-0 text-stone-600 dark:text-stone-300"
        >
          Muat ulang
        </Button>
      </div>

      {activeBucket.total > 10 && (
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
          <div className="w-full sm:w-64">
            <SearchInput
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onClear={() => setSearchQuery('')}
              placeholder="Cari judul, alasan, atau tindakan"
              aria-label="Cari antrean kerja"
            />
          </div>
          <div className="w-full sm:w-44">
            <Select
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value)}
              aria-label="Filter antrean kerja berdasarkan prioritas"
            >
              <option value="all">Semua prioritas</option>
              <option value="urgent">Mendesak</option>
              <option value="high">Tinggi</option>
              <option value="medium">Sedang</option>
              <option value="low">Rendah</option>
            </Select>
          </div>
        </div>
      )}

      {visibleItems.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="h-5 w-5" />}
          title={
            activeBucket.total === 0
              ? `Belum ada ${bucketLabels[activeBucket.code].toLowerCase()}`
              : 'Tidak ada tindakan yang cocok'
          }
          description={
            activeBucket.total === 0
              ? 'Saat ini tidak ada pekerjaan yang membutuhkan perhatian Anda di kelompok ini.'
              : 'Hapus pencarian atau filter prioritas untuk melihat semua pekerjaan.'
          }
        />
      ) : (
        <div className="space-y-3">
          {visibleItems.map((item) => {
            const isSelected = item.subjectType !== 'bug' && item.subjectId === selectedTaskId;
            const workState = workStateCopy[item.workState];
            return (
              <Card
                key={item.id}
                className={`p-4 transition-colors ${
                  isSelected ? 'border-[#B1E743] bg-[#B1E743]/5 ring-2 ring-[#B1E743]/20' : ''
                }`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-2">
                    <div>
                      <h4 className="break-words text-sm font-extrabold text-stone-900 dark:text-stone-100">
                        {item.title}
                      </h4>
                      <p className="mt-1 text-sm leading-relaxed text-stone-700 dark:text-stone-200">
                        {localizeReason(item.reason)}
                      </p>
                    </div>
                    {(item.priority || item.dueDate) && (
                      <div className="flex flex-wrap items-center gap-2">
                        {item.priority && (
                          <Badge variant={priorityVariants[item.priority]} size="sm">
                            Prioritas {localizeTerm(item.priority)}
                          </Badge>
                        )}
                        {item.dueDate && (
                          <Badge variant="neutral" size="sm">
                            <Calendar className="mr-1 h-3 w-3 text-stone-400" aria-hidden="true" />
                            Tenggat {item.dueDate}
                          </Badge>
                        )}
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
                      <span className="font-semibold text-stone-800 dark:text-stone-200">
                        Berikutnya: {actionLabels[item.nextAction.code] || item.nextAction.label}
                      </span>
                      <span className="text-stone-300 dark:text-stone-600">•</span>
                      <span>{localizeTerm(item.status)}</span>
                      {item.workState === 'blocked' && (
                        <>
                          <span className="text-stone-300 dark:text-stone-600">•</span>
                          <span className="font-semibold text-amber-600 dark:text-amber-400">
                            Ada prasyarat
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="primary"
                    size="md"
                    className="w-full sm:w-auto"
                    isLoading={openingItemId === item.id}
                    disabled={openingItemId !== null && openingItemId !== item.id}
                    onClick={() => void openItem(item)}
                    rightIcon={<ArrowRight className="h-4 w-4" aria-hidden="true" />}
                    aria-label={`${workState.action}: ${item.title}. Tindakan berikutnya: ${actionLabels[item.nextAction.code] || item.nextAction.label}`}
                  >
                    {workState.action}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
};
