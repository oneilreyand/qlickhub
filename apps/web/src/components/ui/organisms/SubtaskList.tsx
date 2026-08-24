import React, { useState, useMemo } from 'react';
import {
  Plus,
  Code2,
  Layers,
  Bug,
  ChevronsUpDown,
  ListTodo,
  Clock,
  LayoutList,
  Smartphone,
  Cpu,
} from 'lucide-react';
import type { Task, DeliveryArea, ProductBrief, DeveloperSpecialty } from '@qlick/contracts';
import { Accordion } from '../atoms/Accordion';
import { SubtaskAccordionItem } from './SubtaskAccordionItem';
import { SubtaskRoleTimeline } from '../molecules/SubtaskRoleTimeline';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Skeleton } from '../atoms/Skeleton';
import { Alert } from '../atoms/Alert';
import { ProgressBar } from '../atoms/ProgressBar';

export const EMPTY_SUBTASKS_ILLUSTRATION_URL =
  'https://res.cloudinary.com/dxgnzhn8l/image/upload/v1787024045/ChatGPT_Image_Aug_18_2026_10_32_51_AM.png';

export interface SubtaskListProps {
  subtasks: Task[];
  workspaceId: string;
  parentTask?: Task | null;
  productBrief?: ProductBrief | null;
  currentUserId?: string;
  members?: Array<{
    userId: string;
    role: string;
    specialties?: DeveloperSpecialty[];
    user?: { name?: string; email?: string };
  }>;
  isLoading?: boolean;
  error?: string | null;
  canPlan?: boolean;
  canMutate?: boolean;
  unreadCommentMap?: Record<string, number>;
  onClearSubtaskUnread?: (subtaskId: string) => void;
  onOpenCreateModal?: () => void;
  onRetry?: () => void;
  onSubtaskUpdated?: (updated: Task) => void;
  onSubtaskDeleted?: (subtaskId: string) => void;
}

export const SubtaskList: React.FC<SubtaskListProps> = ({
  subtasks,
  workspaceId,
  parentTask = null,
  productBrief = null,
  currentUserId,
  members = [],
  isLoading = false,
  error = null,
  canPlan = false,
  canMutate = true,
  unreadCommentMap,
  onClearSubtaskUnread,
  onOpenCreateModal,
  onRetry,
  onSubtaskUpdated,
  onSubtaskDeleted,
}) => {
  const [viewMode, setViewMode] = useState<'accordion' | 'timeline'>('accordion');
  const [selectedArea, setSelectedArea] = useState<DeliveryArea | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  React.useEffect(() => {
    setExpandedIds([]);
  }, [parentTask?.id]);

  // Metrics
  const metrics = useMemo(() => {
    const total = subtasks.length;
    const completed = subtasks.filter((s) => s.status === 'done').length;

    const feTotal = subtasks.filter((s) => s.deliveryArea === 'frontend').length;
    const feDone = subtasks.filter(
      (s) => s.deliveryArea === 'frontend' && s.status === 'done',
    ).length;

    const beTotal = subtasks.filter((s) => s.deliveryArea === 'backend').length;
    const beDone = subtasks.filter(
      (s) => s.deliveryArea === 'backend' && s.status === 'done',
    ).length;

    const mobileTotal = subtasks.filter((s) => s.deliveryArea === 'mobile').length;
    const mobileDone = subtasks.filter(
      (s) => s.deliveryArea === 'mobile' && s.status === 'done',
    ).length;

    const fullstackTotal = subtasks.filter((s) => s.deliveryArea === 'fullstack').length;
    const fullstackDone = subtasks.filter(
      (s) => s.deliveryArea === 'fullstack' && s.status === 'done',
    ).length;

    const qaTotal = subtasks.filter((s) => s.deliveryArea === 'qa').length;
    const qaDone = subtasks.filter((s) => s.deliveryArea === 'qa' && s.status === 'done').length;

    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      completed,
      feTotal,
      feDone,
      beTotal,
      beDone,
      mobileTotal,
      mobileDone,
      fullstackTotal,
      fullstackDone,
      qaTotal,
      qaDone,
      percent,
    };
  }, [subtasks]);

  // Filtered Subtasks
  const filteredSubtasks = useMemo(() => {
    return subtasks.filter((st) => {
      if (selectedArea !== 'all' && st.deliveryArea !== selectedArea) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = st.title.toLowerCase().includes(q);
        const descMatch = (st.description || '').toLowerCase().includes(q);
        if (!titleMatch && !descMatch) return false;
      }
      return true;
    });
  }, [subtasks, selectedArea, searchQuery]);

  const toggleExpandAll = () => {
    if (expandedIds.length === filteredSubtasks.length && filteredSubtasks.length > 0) {
      setExpandedIds([]);
    } else {
      setExpandedIds(filteredSubtasks.map((s) => s.id));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-12 w-full rounded-2xl" />
        <Skeleton className="h-12 w-full rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert tone="error" title="Subtasks unavailable">
        <div className="flex items-center justify-between gap-3">
          <span>{error}</span>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              Retry
            </Button>
          )}
        </div>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* 1. Header & Metrics Bar */}
      <div className="rounded-2xl border border-stone-200/90 dark:border-stone-800 bg-white dark:bg-stone-900 p-3.5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
              <ListTodo className="h-4 w-4 text-stone-700 dark:text-[#B1E743]" />
              <span>Direct Subtasks ({subtasks.length})</span>
            </span>
            <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400">
              • {metrics.completed}/{metrics.total} Done ({metrics.percent}%)
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {/* View Mode Switcher (Accordion vs Role Timeline) */}
            <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800/80 p-0.5 rounded-lg border border-stone-200/80 dark:border-stone-700/80">
              <button
                type="button"
                onClick={() => setViewMode('accordion')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  viewMode === 'accordion'
                    ? 'bg-[#B1E743] text-[#141413] font-bold shadow-xs dark:bg-[#B1E743] dark:text-[#141413]'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
                title="View subtasks as expandable accordion cards"
              >
                <LayoutList className="h-3.5 w-3.5" />
                <span>Accordion</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('timeline')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  viewMode === 'timeline'
                    ? 'bg-[#B1E743] text-[#141413] font-bold shadow-xs dark:bg-[#B1E743] dark:text-[#141413]'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
                title="View cross-role timeline and overlap diagnostics"
              >
                <Clock className="h-3.5 w-3.5" />
                <span>Role Timeline</span>
              </button>
            </div>

            {viewMode === 'accordion' && filteredSubtasks.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleExpandAll}
                className="h-7 text-xs px-2 text-stone-600 dark:text-stone-400"
                leftIcon={<ChevronsUpDown className="h-3.5 w-3.5" />}
              >
                {expandedIds.length === filteredSubtasks.length && filteredSubtasks.length > 0
                  ? 'Collapse All'
                  : 'Expand All'}
              </Button>
            )}

            {canPlan && onOpenCreateModal && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="h-3.5 w-3.5" />}
                onClick={onOpenCreateModal}
                className="h-7 text-xs px-3"
              >
                Plan Subtask
              </Button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <ProgressBar value={metrics.percent} max={100} size="sm" />

        {/* Delivery Area Cards Summary */}
        <div className="grid grid-cols-2 gap-2 pt-1 sm:grid-cols-5">
          {/* Frontend */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200/80 dark:border-sky-900/60 text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <Code2 className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
              <span className="font-bold text-sky-950 dark:text-sky-200 truncate">Frontend</span>
            </div>
            <span className="font-mono text-[11px] font-bold text-sky-800 dark:text-sky-300">
              {metrics.feDone}/{metrics.feTotal}
            </span>
          </div>

          {/* Backend */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/60 text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <Layers className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="font-bold text-amber-950 dark:text-amber-200 truncate">Backend</span>
            </div>
            <span className="font-mono text-[11px] font-bold text-amber-800 dark:text-amber-300">
              {metrics.beDone}/{metrics.beTotal}
            </span>
          </div>

          {/* Mobile */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-stone-50/70 dark:bg-stone-900/30 border border-stone-200/80 dark:border-stone-800 text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <Smartphone className="h-3.5 w-3.5 text-stone-600 dark:text-stone-400 shrink-0" />
              <span className="font-bold text-stone-900 dark:text-stone-200 truncate">Mobile</span>
            </div>
            <span className="font-mono text-[11px] font-bold text-stone-700 dark:text-stone-300">
              {metrics.mobileDone}/{metrics.mobileTotal}
            </span>
          </div>

          {/* Fullstack */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-[#B1E743]/10 border border-[#B1E743]/40 text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <Cpu className="h-3.5 w-3.5 text-[#141413] dark:text-[#B1E743] shrink-0" />
              <span className="font-bold text-[#141413] dark:text-[#B1E743] truncate">
                Fullstack
              </span>
            </div>
            <span className="font-mono text-[11px] font-bold text-[#141413] dark:text-[#B1E743]">
              {metrics.fullstackDone}/{metrics.fullstackTotal}
            </span>
          </div>

          {/* QA */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/60 text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <Bug className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="font-bold text-emerald-950 dark:text-emerald-200 truncate">QA</span>
            </div>
            <span className="font-mono text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
              {metrics.qaDone}/{metrics.qaTotal}
            </span>
          </div>
        </div>
      </div>

      {/* 2. RENDER SELECTED VIEW */}
      {viewMode === 'timeline' ? (
        <SubtaskRoleTimeline
          parentTask={
            parentTask ||
            ({
              id: 'fallback',
              title: 'Task',
              startDate: null,
              dueDate: null,
              status: 'todo',
            } as Task)
          }
          subtasks={subtasks}
          productBrief={productBrief}
          members={members}
          canMutate={canMutate}
          onSubtaskUpdated={onSubtaskUpdated}
        />
      ) : (
        <>
          {/* Filter Tabs & Search Bar */}
          {subtasks.length > 0 && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
              {/* Area Filter Buttons */}
              <div className="flex flex-wrap items-center gap-1 bg-stone-100 dark:bg-stone-800/60 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setSelectedArea('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    selectedArea === 'all'
                      ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                  }`}
                >
                  All ({subtasks.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedArea('frontend')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                    selectedArea === 'frontend'
                      ? 'bg-sky-100 dark:bg-sky-950 text-sky-900 dark:text-sky-200 shadow-xs'
                      : 'text-stone-600 dark:text-stone-400 hover:text-sky-600'
                  }`}
                >
                  <Code2 className="h-3 w-3" /> FE ({metrics.feTotal})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedArea('backend')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                    selectedArea === 'backend'
                      ? 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 shadow-xs'
                      : 'text-stone-600 dark:text-stone-400 hover:text-amber-600'
                  }`}
                >
                  <Layers className="h-3 w-3" /> BE ({metrics.beTotal})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedArea('mobile')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                    selectedArea === 'mobile'
                      ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                  }`}
                >
                  <Smartphone className="h-3 w-3" /> MOB ({metrics.mobileTotal})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedArea('fullstack')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                    selectedArea === 'fullstack'
                      ? 'bg-[#B1E743]/30 text-[#141413] dark:text-[#B1E743] shadow-xs'
                      : 'text-stone-600 dark:text-stone-400 hover:text-[#141413] dark:hover:text-[#B1E743]'
                  }`}
                >
                  <Cpu className="h-3 w-3" /> FS ({metrics.fullstackTotal})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedArea('qa')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                    selectedArea === 'qa'
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 shadow-xs'
                      : 'text-stone-600 dark:text-stone-400 hover:text-emerald-600'
                  }`}
                >
                  <Bug className="h-3 w-3" /> QA ({metrics.qaTotal})
                </button>
              </div>

              {/* Quick Search */}
              <div className="w-full sm:w-48">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search subtasks..."
                  className="h-8 text-xs"
                />
              </div>
            </div>
          )}

          {/* Subtasks Accordion List / Empty State */}
          {subtasks.length === 0 ? (
            <div className="py-10 sm:py-12 px-4 text-center border border-dashed border-stone-200 dark:border-stone-800 rounded-2xl bg-stone-50/50 dark:bg-stone-900/30 space-y-4 animate-fadeIn">
              <div className="flex justify-center">
                <img
                  src={EMPTY_SUBTASKS_ILLUSTRATION_URL}
                  alt="No subtasks created"
                  className="dark:hidden w-full max-w-[260px] sm:max-w-[320px] md:max-w-[380px] h-auto max-h-60 sm:max-h-72 object-contain mx-auto transition-transform duration-300 hover:scale-[1.03] drop-shadow-xs"
                  loading="lazy"
                />
                <div className="hidden dark:flex items-center justify-center py-2">
                  <div className="relative grid h-16 w-16 place-items-center rounded-2xl bg-stone-900 border border-stone-800 shadow-inner">
                    <div className="absolute inset-0 rounded-2xl bg-[#B1E743]/10 blur-lg pointer-events-none" />
                    <ListTodo className="h-7 w-7 text-[#B1E743]" />
                  </div>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 font-medium max-w-sm mx-auto leading-relaxed">
                No subtasks created under this task.
              </p>
              {canPlan && onOpenCreateModal && (
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                  onClick={onOpenCreateModal}
                  className="mt-2"
                >
                  Plan First Subtask
                </Button>
              )}
            </div>
          ) : filteredSubtasks.length === 0 ? (
            <div className="py-8 text-center border border-dashed border-stone-200 dark:border-stone-800 rounded-2xl bg-stone-50/50 dark:bg-stone-900/30 text-xs text-stone-500">
              No subtasks match the selected area or search query.
            </div>
          ) : (
            <Accordion value={expandedIds} onValueChange={setExpandedIds} allowMultiple={true}>
              {filteredSubtasks.map((st) => (
                <SubtaskAccordionItem
                  key={st.id}
                  subtask={st}
                  workspaceId={workspaceId}
                  currentUserId={currentUserId}
                  members={members}
                  canMutate={canMutate}
                  canPlan={canPlan}
                  initialUnreadCount={unreadCommentMap?.[st.id] || 0}
                  onClearUnread={() => onClearSubtaskUnread?.(st.id)}
                  onSubtaskUpdated={onSubtaskUpdated}
                  onSubtaskDeleted={onSubtaskDeleted}
                />
              ))}
            </Accordion>
          )}
        </>
      )}
    </div>
  );
};
