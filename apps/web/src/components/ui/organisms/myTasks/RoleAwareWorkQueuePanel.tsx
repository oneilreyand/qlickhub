import React, { useEffect, useMemo, useState } from 'react';
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

function humanize(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter: string) => letter.toUpperCase());
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
  const [activeBucketCode, setActiveBucketCode] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [openingItemId, setOpeningItemId] = useState<string | null>(null);
  const debouncedSearchQuery = useDebounce(searchQuery, 250).trim().toLowerCase();
  const buckets = state.queue?.buckets || [];

  useEffect(() => {
    setActiveBucketCode((current) => firstActiveBucket(buckets, current));
  }, [state.queue?.workspaceId, state.queue?.queueRole, buckets]);

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
      <section className="space-y-4" aria-label="Loading role-aware work queue">
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
        title="Work queue access denied"
        icon={<AlertTriangle className="h-4 w-4" />}
      >
        Your Workspace membership does not permit this queue to be returned.
      </Alert>
    );
  }

  if (state.error) {
    return (
      <div className="space-y-3">
        <Alert
          tone="error"
          title="Unable to load your work queue"
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
          Try again
        </Button>
      </div>
    );
  }

  if (!state.queue || !activeBucket) {
    return (
      <EmptyState
        icon={<ListChecks className="h-5 w-5" />}
        title="No work queue available"
        description="Choose an active Workspace to load your role-specific next actions."
      />
    );
  }

  const totalItems = buckets.reduce((total, bucket) => total + bucket.total, 0);
  const roleLabel =
    state.queue.queueRole === 'planner'
      ? 'Planner'
      : state.queue.queueRole === 'developer'
        ? 'Developer'
        : 'QA';

  return (
    <section className="space-y-5" aria-labelledby="role-aware-queue-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2
              id="role-aware-queue-title"
              className="text-lg font-extrabold text-stone-900 dark:text-stone-100"
            >
              What needs your attention
            </h2>
            <Badge variant={totalItems > 0 ? 'brand' : 'neutral'} size="sm">
              {totalItems} action{totalItems === 1 ? '' : 's'}
            </Badge>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
            {roleLabel} priorities are derived by the backend from persisted Workspace workflow.
          </p>
        </div>
        <Button
          variant="outline"
          size="md"
          onClick={onRefresh}
          leftIcon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}
          aria-label="Refresh work queue"
        >
          Refresh
        </Button>
      </div>

      <Tabs
        variant="pills"
        activeTabId={activeBucket.code}
        onChange={setActiveBucketCode}
        tabs={buckets.map((bucket) => ({
          id: bucket.code,
          label: bucket.label,
          count: bucket.total,
          icon: bucketIcons[bucket.code],
        }))}
      />

      <Card className="p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-stone-900 dark:text-stone-100">
              {activeBucket.label}
            </h3>
            <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400" aria-live="polite">
              Showing {visibleItems.length} of {activeBucket.total} backend-prioritized items.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
            <div className="w-full sm:w-64">
              <SearchInput
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onClear={() => setSearchQuery('')}
                placeholder="Search title, reason, or action"
                aria-label="Search work queue"
              />
            </div>
            <div className="w-full sm:w-44">
              <Select
                value={priorityFilter}
                onChange={(event) => setPriorityFilter(event.target.value)}
                aria-label="Filter work queue by priority"
              >
                <option value="all">All priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </Select>
            </div>
          </div>
        </div>
      </Card>

      {visibleItems.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="h-5 w-5" />}
          title={
            activeBucket.total === 0
              ? `No ${activeBucket.label.toLowerCase()}`
              : 'No matching actions'
          }
          description={
            activeBucket.total === 0
              ? 'There is nothing requiring your attention in this bucket right now.'
              : 'Clear the search or priority filter to see the backend-prioritized work.'
          }
        />
      ) : (
        <div className="space-y-3">
          {visibleItems.map((item) => {
            const isSelected = item.subjectType !== 'bug' && item.subjectId === selectedTaskId;
            return (
              <Card
                key={item.id}
                className={`p-4 transition-colors ${
                  isSelected ? 'border-[#B1E743] bg-[#B1E743]/5 ring-2 ring-[#B1E743]/20' : ''
                }`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="neutral" size="sm" icon={bucketIcons[item.bucketCode]}>
                        {humanize(item.subjectType)}
                      </Badge>
                      {item.priority && (
                        <Badge variant={priorityVariants[item.priority]} size="sm">
                          {humanize(item.priority)} priority
                        </Badge>
                      )}
                      <Badge variant="info" size="sm">
                        {humanize(item.status)}
                      </Badge>
                    </div>
                    <div>
                      <h4 className="break-words text-sm font-extrabold text-stone-900 dark:text-stone-100">
                        {item.title}
                      </h4>
                      <p className="mt-1 text-xs leading-relaxed text-stone-600 dark:text-stone-300">
                        {item.reason}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-stone-500 dark:text-stone-400">
                      <span className="font-semibold text-stone-700 dark:text-stone-300">
                        Next: {item.nextAction.label}
                      </span>
                      {item.dueDate && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                          Due {item.dueDate}
                        </span>
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
                    aria-label={`Open ${item.title}. Next action: ${item.nextAction.label}`}
                  >
                    Open work
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
