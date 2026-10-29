import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bug,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  Hourglass,
  ListChecks,
  RefreshCw,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import type { WorkQueueBucketCode, WorkQueueItem } from '@qlick/contracts';
import type { RoleAwareWorkQueueViewState } from '../../../../lib/hooks/useRoleAwareWorkQueue';
import { useDebounce } from '../../../../lib/hooks/useDebounce';
import { getQueueItemActionLabel } from '../../../../lib/utils/workQueueRoute';
import {
  DUE_FILTER_OPTIONS,
  matchesDueFilter,
  sortQueueItems,
  type DueFilter,
} from '../../../../lib/utils/workQueueFilters';
import { Alert } from '../../atoms/Alert';
import { Badge } from '../../atoms/Badge';
import { Button } from '../../atoms/Button';
import { Card } from '../../atoms/Card';
import { Select } from '../../atoms/Select';
import { Skeleton } from '../../atoms/Skeleton';
import { EmptyState } from '../../molecules/EmptyState';
import { SearchInput } from '../../molecules/SearchInput';

export interface RoleAwareWorkQueuePanelProps {
  state: RoleAwareWorkQueueViewState;
  selectedTaskId?: string | null;
  onRefresh: () => void;
  onOpenItem: (item: WorkQueueItem) => void | Promise<void>;
  /** Id pengguna aktif; pesan milik sendiri ditampilkan sebagai "Anda". */
  currentUserId?: string | null;
  /** Balas langsung pesan serah-terima (AC-4.4). Tanpa prop ini, kotak Balas tidak tampil. */
  onReplyItem?: (item: WorkQueueItem, body: string) => Promise<void>;
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
  waiting_on_others: <Hourglass className="h-4 w-4" aria-hidden="true" />,
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
  waiting_on_others: 'Menunggu Orang Lain',
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

const SECTION_LIMIT = 5;

export const RoleAwareWorkQueuePanel: React.FC<RoleAwareWorkQueuePanelProps> = ({
  state,
  selectedTaskId,
  onRefresh,
  onOpenItem,
  currentUserId,
  onReplyItem,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [bucketFilter, setBucketFilter] = useState('all');
  const [dueFilter, setDueFilter] = useState<DueFilter>('all');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [openingItemId, setOpeningItemId] = useState<string | null>(null);
  const [replyingItemId, setReplyingItemId] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const debouncedSearchQuery = useDebounce(searchQuery, 250).trim().toLowerCase();
  const buckets = useMemo(() => state.queue?.buckets || [], [state.queue?.buckets]);
  const totalItems = useMemo(
    () => buckets.reduce((sum, bucket) => sum + bucket.total, 0),
    [buckets],
  );

  // Satu daftar tanpa tab: tiap jenis pekerjaan jadi seksi, seksi kosong disembunyikan.
  const sections = useMemo(
    () =>
      buckets
        .filter((bucket) => bucket.total > 0)
        .filter((bucket) => bucketFilter === 'all' || bucket.code === bucketFilter)
        .map((bucket) => ({
          bucket,
          items: sortQueueItems(
            bucket.items.filter((item) => {
              if (priorityFilter !== 'all' && item.priority !== priorityFilter) return false;
              if (!matchesDueFilter(item.dueDate, dueFilter)) return false;
              if (!debouncedSearchQuery) return true;
              return [item.title, item.reason, item.nextAction.label, item.subjectId].some(
                (value) => value.toLowerCase().includes(debouncedSearchQuery),
              );
            }),
          ),
        })),
    [buckets, bucketFilter, debouncedSearchQuery, dueFilter, priorityFilter],
  );
  const visibleCount = sections.reduce((sum, section) => sum + section.items.length, 0);

  const openItem = async (item: WorkQueueItem) => {
    setOpeningItemId(item.id);
    try {
      await onOpenItem(item);
    } finally {
      setOpeningItemId(null);
    }
  };

  const sendReply = async (item: WorkQueueItem) => {
    const body = replyBody.trim();
    if (!body || !onReplyItem || isSendingReply) return;
    setIsSendingReply(true);
    setReplyError(null);
    try {
      await onReplyItem(item, body);
      setReplyBody('');
      setReplyingItemId(null);
    } catch (error) {
      setReplyError(error instanceof Error ? error.message : 'Balasan gagal dikirim.');
    } finally {
      setIsSendingReply(false);
    }
  };

  // "Mulai dari sini" (AC-4.1): satu item siap ditindak paling mendesak dari bucket kerja yang
  // lolos filter, untuk Developer dan QA (PO menyusul di P4c). Tidak diulang di grupnya.
  const startHere = useMemo(
    () =>
      state.queue?.queueRole === 'planner'
        ? null
        : (sortQueueItems(
            sections
              .filter(({ bucket }) => bucket.code !== 'waiting_on_others')
              .flatMap(({ items }) => items)
              .filter((item) => item.workState === 'actionable'),
          )[0] ?? null),
    [sections, state.queue?.queueRole],
  );

  const renderItemCard = (item: WorkQueueItem) => {
    const isSelected = item.subjectType !== 'bug' && item.subjectId === selectedTaskId;
    const workState = workStateCopy[item.workState];
    const isWaiting = item.bucketCode === 'waiting_on_others';
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
            {item.lastMessage && (
              <div className="rounded-xl border border-stone-200/80 bg-stone-50 px-3 py-2 dark:border-stone-800 dark:bg-stone-900/40">
                <p className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                  Pesan dari{' '}
                  {item.sender
                    ? item.sender.id === currentUserId
                      ? 'Anda'
                      : item.sender.name
                    : 'tim'}
                </p>
                <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-stone-800 dark:text-stone-200">
                  {item.lastMessage.body}
                </p>
                {onReplyItem && !isWaiting && replyingItemId !== item.id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-1 -ml-2"
                    onClick={() => {
                      setReplyingItemId(item.id);
                      setReplyBody('');
                      setReplyError(null);
                    }}
                    aria-label={`Balas pesan: ${item.title}`}
                  >
                    Balas
                  </Button>
                )}
                {onReplyItem && !isWaiting && replyingItemId === item.id && (
                  <div className="mt-2 space-y-2">
                    <label
                      htmlFor={`reply-${item.id}`}
                      className="sr-only"
                    >{`Balasan untuk ${item.title}`}</label>
                    <textarea
                      id={`reply-${item.id}`}
                      value={replyBody}
                      onChange={(event) => setReplyBody(event.target.value)}
                      rows={2}
                      maxLength={2000}
                      autoFocus
                      placeholder="Tulis balasan"
                      className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-stone-700 dark:bg-[#1C1A19] dark:text-stone-100"
                    />
                    {replyError && (
                      <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">
                        {replyError}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        isLoading={isSendingReply}
                        disabled={!replyBody.trim()}
                        onClick={() => void sendReply(item)}
                      >
                        Kirim balasan
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isSendingReply}
                        onClick={() => setReplyingItemId(null)}
                      >
                        Batal
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
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
                {isWaiting
                  ? (item.waitingOn?.label ?? 'Menunggu orang lain')
                  : `Berikutnya: ${actionLabels[item.nextAction.code] || item.nextAction.label}`}
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
            variant={isWaiting ? 'outline' : 'primary'}
            size="md"
            className="w-full sm:w-auto"
            isLoading={openingItemId === item.id}
            disabled={openingItemId !== null && openingItemId !== item.id}
            onClick={() => void openItem(item)}
            rightIcon={<ArrowRight className="h-4 w-4" aria-hidden="true" />}
            aria-label={
              isWaiting
                ? `${getQueueItemActionLabel(item, workState.action)}: ${item.title}. ${item.waitingOn?.label ?? 'Menunggu orang lain'}`
                : `${getQueueItemActionLabel(item, workState.action)}: ${item.title}. Tindakan berikutnya: ${actionLabels[item.nextAction.code] || item.nextAction.label}`
            }
          >
            {getQueueItemActionLabel(item, workState.action)}
          </Button>
        </div>
      </Card>
    );
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

  if (!state.queue || buckets.length === 0) {
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

      <div className="flex justify-end">
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

      {startHere && (
        <section aria-labelledby="start-here-title">
          <h3
            id="start-here-title"
            className="mb-2 flex items-center gap-2 text-sm font-bold text-stone-900 dark:text-stone-100"
          >
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
            Mulai dari sini
          </h3>
          <div className="space-y-3">{renderItemCard(startHere)}</div>
        </section>
      )}

      {totalItems > 0 && (
        <div className="grid w-full gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            value={bucketFilter}
            onChange={(event) => setBucketFilter(event.target.value)}
            aria-label="Filter antrean kerja berdasarkan jenis pekerjaan"
          >
            <option value="all">Semua jenis pekerjaan</option>
            {buckets
              .filter((bucket) => bucket.total > 0)
              .map((bucket) => (
                <option key={bucket.code} value={bucket.code}>
                  {bucketLabels[bucket.code]}
                </option>
              ))}
          </Select>
          <Select
            value={dueFilter}
            onChange={(event) => setDueFilter(event.target.value as DueFilter)}
            aria-label="Filter antrean kerja berdasarkan tenggat"
          >
            {DUE_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
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
          <SearchInput
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onClear={() => setSearchQuery('')}
            placeholder="Cari judul, alasan, atau tindakan"
            aria-label="Cari antrean kerja"
          />
        </div>
      )}

      {visibleCount === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="h-5 w-5" />}
          title={totalItems === 0 ? 'Belum ada pekerjaan' : 'Tidak ada tindakan yang cocok'}
          description={
            totalItems === 0
              ? 'Saat ini tidak ada pekerjaan yang membutuhkan perhatian Anda.'
              : 'Hapus pencarian atau filter prioritas untuk melihat semua pekerjaan.'
          }
        />
      ) : (
        <div className="space-y-6">
          {sections.map(({ bucket, items: allItems }) => {
            if (allItems.length === 0) return null;
            const isExpanded = expanded[bucket.code] === true;
            const listItems = allItems.filter((item) => item.id !== startHere?.id);
            if (listItems.length === 0) return null;
            const items = isExpanded ? listItems : listItems.slice(0, SECTION_LIMIT);
            return (
              <section key={bucket.code} aria-label={bucketLabels[bucket.code]}>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-stone-900 dark:text-stone-100">
                  {bucketIcons[bucket.code]}
                  {bucketLabels[bucket.code]}
                  <span className="text-xs font-normal text-stone-500 dark:text-stone-400">
                    {allItems.length === bucket.total
                      ? bucket.total
                      : `${allItems.length} dari ${bucket.total}`}
                  </span>
                </h3>
                <div className="space-y-3">{items.map((item) => renderItemCard(item))}</div>
                {listItems.length > SECTION_LIMIT && (
                  <div className="mt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setExpanded((prev) => ({ ...prev, [bucket.code]: !isExpanded }))
                      }
                    >
                      {isExpanded
                        ? 'Tampilkan lebih sedikit'
                        : `Tampilkan ${listItems.length - SECTION_LIMIT} lagi`}
                    </Button>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
};
