import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar,
  Clock,
  Lock,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Code2,
  Layers,
  Cpu,
  Bug,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type {
  TeamCapacityTimelineResponse,
  TimelineSubtaskItem,
  DeliveryArea,
  TaskStatus,
  CapacityScope,
} from '@qlick/contracts';
import { capacityService } from '../../../lib/api/capacityService';
import { normalizeDateStr, diffDays } from '../../../lib/utils/scheduleHealth';
import { Button } from '../atoms/Button';
import { Select } from '../atoms/Select';
import { Badge } from '../atoms/Badge';
import { Card } from '../atoms/Card';
import { Alert } from '../atoms/Alert';
import { Skeleton } from '../atoms/Skeleton';
import { TaskStatusBadge } from '../molecules/TaskStatusBadge';
import { Modal } from '../molecules/Modal';

export interface TeamCapacityTimelineProps {
  workspaceId: string;
  initialMemberId?: string;
  initialStartDate?: string;
  initialEndDate?: string;
  initialScale?: 'day' | 'week' | 'month';
  initialScope?: CapacityScope;
}

function getDefaultDateRange(scale: 'day' | 'week' | 'month') {
  const today = new Date();
  const start = new Date(today);
  const end = new Date(today);

  if (scale === 'day') {
    start.setDate(today.getDate() - 3);
    end.setDate(today.getDate() + 17);
  } else if (scale === 'week') {
    start.setDate(today.getDate() - 14 - today.getDay());
    end.setDate(today.getDate() + 42);
  } else {
    start.setMonth(today.getMonth() - 1);
    start.setDate(1);
    end.setMonth(today.getMonth() + 3);
    end.setDate(0);
  }

  return {
    startDate: normalizeDateStr(start),
    endDate: normalizeDateStr(end),
  };
}

export const TeamCapacityTimeline: React.FC<TeamCapacityTimelineProps> = ({
  workspaceId,
  initialMemberId = '',
  initialStartDate,
  initialEndDate,
  initialScale = 'day',
  initialScope = 'workspace',
}) => {
  const [scale, setScale] = useState<'day' | 'week' | 'month'>(initialScale);
  const [scope, setScope] = useState<CapacityScope>(initialScope);
  const [memberId, setMemberId] = useState<string>(initialMemberId);
  const [role, setRole] = useState<string>('');
  const [deliveryArea, setDeliveryArea] = useState<string>('');
  const [status, setStatus] = useState<string>('');

  const [dateRange, setDateRange] = useState(() => {
    if (initialStartDate && initialEndDate) {
      return { startDate: initialStartDate, endDate: initialEndDate };
    }
    return getDefaultDateRange(initialScale);
  });

  const [timelineData, setTimelineData] = useState<TeamCapacityTimelineResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubtask, setSelectedSubtask] = useState<TimelineSubtaskItem | null>(null);
  const [expandedUnscheduledMemberIds, setExpandedUnscheduledMemberIds] = useState<Set<string>>(
    new Set(),
  );

  const todayStr = useMemo(() => normalizeDateStr(new Date()), []);

  const loadTimeline = useCallback(async () => {
    if (!workspaceId) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await capacityService.getTeamTimeline(workspaceId, {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        scale,
        scope,
        role: role || undefined,
        deliveryArea: (deliveryArea as DeliveryArea) || undefined,
        status: (status as TaskStatus) || undefined,
        memberId: memberId || undefined,
      });
      setTimelineData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat timeline kapasitas tim.');
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, dateRange, scale, scope, role, deliveryArea, status, memberId]);

  useEffect(() => {
    void loadTimeline();
  }, [loadTimeline]);

  // Date range navigation
  const handleShiftDate = (direction: 'prev' | 'next') => {
    const start = new Date(dateRange.startDate + 'T00:00:00');
    const end = new Date(dateRange.endDate + 'T00:00:00');
    const daysShift = scale === 'day' ? 7 : scale === 'week' ? 28 : 60;
    const factor = direction === 'next' ? 1 : -1;

    start.setDate(start.getDate() + daysShift * factor);
    end.setDate(end.getDate() + daysShift * factor);

    setDateRange({
      startDate: normalizeDateStr(start),
      endDate: normalizeDateStr(end),
    });
  };

  const handleResetToToday = () => {
    setDateRange(getDefaultDateRange(scale));
  };

  // Generate date columns
  const columns = useMemo(() => {
    const cols: Array<{
      key: string;
      label: string;
      subLabel: string;
      isToday: boolean;
      isWeekend: boolean;
    }> = [];

    const cur = new Date(dateRange.startDate + 'T00:00:00');
    const end = new Date(dateRange.endDate + 'T00:00:00');

    while (cur <= end) {
      const key = normalizeDateStr(cur);
      const isSunOrSat = cur.getDay() === 0 || cur.getDay() === 6;
      const isToday = key === todayStr;
      const dayNum = cur.getDate();
      const monthShort = cur.toLocaleDateString('id-ID', { month: 'short' });
      const dayNarrow = cur.toLocaleDateString('id-ID', { weekday: 'narrow' });

      cols.push({
        key,
        label: `${dayNum} ${monthShort}`,
        subLabel: dayNarrow,
        isToday,
        isWeekend: isSunOrSat,
      });

      cur.setDate(cur.getDate() + 1);
    }

    return cols;
  }, [dateRange, todayStr]);

  const totalDays = useMemo(() => {
    return Math.max(1, diffDays(dateRange.endDate, dateRange.startDate) + 1);
  }, [dateRange]);

  const toggleUnscheduledMember = (userId: string) => {
    setExpandedUnscheduledMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  // Helper to layout subtask bars in non-overlapping tracks
  const layoutMemberSubtasks = (subtasks: TimelineSubtaskItem[]) => {
    const validSubtasks = subtasks.filter((s) => s.startDate && s.dueDate);
    const sorted = [...validSubtasks].sort((a, b) =>
      (a.startDate || '').localeCompare(b.startDate || ''),
    );
    const tracks: TimelineSubtaskItem[][] = [];

    for (const sub of sorted) {
      let placed = false;
      const subStart = sub.startDate || '';
      for (const track of tracks) {
        const lastInTrack = track[track.length - 1];
        const lastDue = lastInTrack.dueDate || '';
        if (lastDue < subStart) {
          track.push(sub);
          placed = true;
          break;
        }
      }
      if (!placed) {
        tracks.push([sub]);
      }
    }

    return tracks;
  };

  const getAreaColor = (area: DeliveryArea | null | undefined, isRedacted: boolean) => {
    if (isRedacted) {
      return 'bg-stone-500 hover:bg-stone-600 text-white border-stone-600';
    }
    switch (area) {
      case 'frontend':
        return 'bg-sky-600 hover:bg-sky-700 text-white border-sky-700';
      case 'backend':
        return 'bg-amber-600 hover:bg-amber-700 text-white border-amber-700';
      case 'mobile':
        return 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-700';
      case 'fullstack':
        return 'bg-[#B1E743] hover:bg-[#a2d83b] text-[#141413] border-[#93c732] font-semibold';
      case 'qa':
        return 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700';
      default:
        return 'bg-stone-600 hover:bg-stone-700 text-white border-stone-700';
    }
  };

  const members = timelineData?.members || [];

  return (
    <div role="region" aria-label="Timeline Kapasitas Tim" className="space-y-4">
      {/* Header & Controls Card */}
      <Card className="p-4 sm:p-5 border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
                Timeline Kapasitas Tim
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#B1E743]/20 text-[#141413] dark:text-[#B1E743] border border-[#B1E743]/40">
                Kapasitas & Irisan Jadwal
              </span>
            </div>
            <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">
              Visualisasi alokasi subtask tim per anggota, deteksi irisan waktu, dan beban aktif
              tanpa jadwal.
            </p>
          </div>

          {/* Scale & Navigation toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Scale toggle */}
            <div className="inline-flex rounded-xl border border-stone-200 dark:border-stone-800 p-0.5 bg-stone-100 dark:bg-stone-800/60 text-xs">
              <button
                type="button"
                onClick={() => {
                  setScale('day');
                  setDateRange(getDefaultDateRange('day'));
                }}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  scale === 'day'
                    ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
              >
                Hari
              </button>
              <button
                type="button"
                onClick={() => {
                  setScale('week');
                  setDateRange(getDefaultDateRange('week'));
                }}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  scale === 'week'
                    ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
              >
                Minggu
              </button>
              <button
                type="button"
                onClick={() => {
                  setScale('month');
                  setDateRange(getDefaultDateRange('month'));
                }}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  scale === 'month'
                    ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
              >
                Bulan
              </button>
            </div>

            {/* Date shift controls */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleShiftDate('prev')}
                aria-label="Rentang sebelumnya"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetToToday}
                className="text-xs font-semibold"
              >
                Hari Ini
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleShiftDate('next')}
                aria-label="Rentang berikutnya"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadTimeline()}
              isLoading={isLoading}
              leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
              aria-label="Segarkan timeline"
            >
              Segarkan
            </Button>
          </div>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-4 mt-4 border-t border-stone-100 dark:border-stone-800 text-xs">
          {/* Scope Toggle */}
          <div>
            <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-1">
              Cakupan Workspace
            </label>
            <Select
              value={scope}
              onChange={(e) => setScope(e.target.value as CapacityScope)}
              aria-label="Cakupan Workspace"
            >
              <option value="workspace">Workspace Aktif</option>
              <option value="all">Semua Workspace (Privasi Terjaga)</option>
            </Select>
          </div>

          {/* Member Filter */}
          <div>
            <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-1">
              Anggota Tim
            </label>
            <Select
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              aria-label="Filter Anggota"
            >
              <option value="">Semua Anggota ({members.length})</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.name || m.email} ({m.role.toUpperCase()})
                </option>
              ))}
            </Select>
          </div>

          {/* Role Filter */}
          <div>
            <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-1">
              Peran
            </label>
            <Select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              aria-label="Filter Peran"
            >
              <option value="">Semua Peran</option>
              <option value="po">Product Owner</option>
              <option value="dev">Developer</option>
              <option value="qa">QA Engineer</option>
            </Select>
          </div>

          {/* Delivery Area Filter */}
          <div>
            <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-1">
              Area Delivery
            </label>
            <Select
              value={deliveryArea}
              onChange={(e) => setDeliveryArea(e.target.value)}
              aria-label="Filter Area Delivery"
            >
              <option value="">Semua Area</option>
              <option value="frontend">Frontend</option>
              <option value="backend">Backend</option>
              <option value="mobile">Mobile</option>
              <option value="fullstack">Fullstack</option>
              <option value="qa">QA Testing</option>
            </Select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-1">
              Status Subtask
            </label>
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              aria-label="Filter Status"
            >
              <option value="">Semua Status Aktif</option>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="in_review">In Review</option>
              <option value="changes_requested">Changes Requested</option>
            </Select>
          </div>

          {/* Active Range Indicator */}
          <div className="flex flex-col justify-end">
            <span className="text-[10px] text-stone-500 dark:text-stone-400">Rentang Waktu:</span>
            <span className="text-xs font-semibold text-stone-800 dark:text-stone-200">
              {dateRange.startDate} s/d {dateRange.endDate}
            </span>
          </div>
        </div>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert tone="error" title="Gagal Memuat Timeline">
          <div className="flex items-center justify-between gap-2">
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={() => void loadTimeline()}>
              Coba Lagi
            </Button>
          </div>
        </Alert>
      )}

      {/* Timeline Grid Container */}
      <Card className="border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm overflow-hidden">
        {isLoading && !timelineData ? (
          <div className="p-8 space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-48 rounded-lg" />
              <Skeleton className="h-6 w-32 rounded-lg" />
            </div>
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        ) : members.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-500">
              <Calendar className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
              Tidak Ada Anggota atau Subtask
            </h3>
            <p className="text-xs text-stone-600 dark:text-stone-400 max-w-md mx-auto">
              Tidak ditemukan jadwal pekerjaan untuk anggota dengan filter atau rentang waktu yang
              sedang dipilih.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Timeline Header Row */}
              <div className="flex border-b border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900/90 text-xs font-semibold">
                {/* Left member column header */}
                <div className="w-64 p-3 shrink-0 border-r border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 flex items-center justify-between">
                  <span>Anggota ({members.length})</span>
                  <span className="text-[10px] text-stone-500">Peran & Beban</span>
                </div>

                {/* Right calendar date header columns */}
                <div className="flex-1 flex relative">
                  {columns.map((col) => (
                    <div
                      key={col.key}
                      className={`flex-1 min-w-[36px] py-2 px-1 text-center border-r border-stone-200/60 dark:border-stone-800/60 last:border-r-0 ${
                        col.isToday
                          ? 'bg-[#B1E743]/15 font-bold text-[#141413] dark:text-[#B1E743]'
                          : col.isWeekend
                            ? 'bg-stone-100/50 dark:bg-stone-900 text-stone-500'
                            : 'text-stone-700 dark:text-stone-300'
                      }`}
                    >
                      <div className="text-[11px] leading-tight">{col.label}</div>
                      <div className="text-[9px] text-stone-500 uppercase">{col.subLabel}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Member Rows */}
              <div className="divide-y divide-stone-100 dark:divide-stone-800">
                {members.map((member) => {
                  const scheduledTasks = member.scheduledSubtasks || [];
                  const unscheduledTasks = member.unscheduledSubtasks || [];
                  const tracks = layoutMemberSubtasks(scheduledTasks);
                  const trackCount = Math.max(1, tracks.length);
                  const rowHeightPx = Math.max(68, trackCount * 34 + 20);
                  const isUnscheduledExpanded = expandedUnscheduledMemberIds.has(member.userId);

                  return (
                    <div key={member.userId} className="flex flex-col">
                      <div className="flex transition-colors hover:bg-stone-50/50 dark:hover:bg-stone-800/30">
                        {/* Member Info Column */}
                        <div className="w-64 p-3 shrink-0 border-r border-stone-200 dark:border-stone-800 flex flex-col justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-stone-900 dark:text-stone-100 truncate">
                                {member.name || member.email}
                              </span>
                              <Badge variant="neutral" size="sm">
                                {member.role.toUpperCase()}
                              </Badge>
                            </div>
                            <div className="text-[11px] text-stone-500 truncate">{member.email}</div>
                            {member.specialties && member.specialties.length > 0 && (
                              <div className="flex gap-1 flex-wrap pt-0.5">
                                {member.specialties.map((s) => (
                                  <span
                                    key={s}
                                    className="text-[9px] px-1 py-0.2 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400"
                                  >
                                    {s}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Member Workload Summary Chips */}
                          <div className="flex items-center gap-1.5 pt-2 text-[10px]">
                            <span
                              className="px-1.5 py-0.5 rounded font-semibold bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800"
                              title="Subtask terjadwal"
                            >
                              {scheduledTasks.length} terjadwal
                            </span>
                            {unscheduledTasks.length > 0 && (
                              <button
                                type="button"
                                onClick={() => toggleUnscheduledMember(member.userId)}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 transition-colors"
                                title="Klik untuk melihat subtask aktif tanpa tanggal"
                              >
                                <span>{unscheduledTasks.length} tanpa jadwal</span>
                                {isUnscheduledExpanded ? (
                                  <ChevronUp className="h-3 w-3" />
                                ) : (
                                  <ChevronDown className="h-3 w-3" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Timeline Grid Lane for this Member */}
                        <div
                          className="flex-1 relative border-r border-stone-200/40 dark:border-stone-800/40"
                          style={{ minHeight: `${rowHeightPx}px` }}
                        >
                          {/* Background vertical day lines */}
                          <div className="absolute inset-0 flex pointer-events-none">
                            {columns.map((col) => (
                              <div
                                key={col.key}
                                className={`flex-1 min-w-[36px] border-r border-stone-100 dark:border-stone-800/40 last:border-r-0 ${
                                  col.isToday
                                    ? 'bg-[#B1E743]/10 dark:bg-[#B1E743]/5'
                                    : col.isWeekend
                                      ? 'bg-stone-50/40 dark:bg-stone-900/40'
                                      : ''
                                }`}
                              />
                            ))}
                          </div>

                          {/* Task Bars in Lanes */}
                          <div className="absolute inset-0 p-2">
                            {tracks.map((track, trackIdx) => (
                              <div key={trackIdx}>
                                {track.map((sub) => {
                                  const subStart = sub.startDate || dateRange.startDate;
                                  const subDue = sub.dueDate || dateRange.endDate;

                                  // Clamp dates to visible range
                                  const effectiveStart =
                                    subStart < dateRange.startDate
                                      ? dateRange.startDate
                                      : subStart;
                                  const effectiveEnd =
                                    subDue > dateRange.endDate
                                      ? dateRange.endDate
                                      : subDue;

                                  const startOffsetDays = diffDays(
                                    effectiveStart,
                                    dateRange.startDate,
                                  );
                                  const durationDays =
                                    Math.max(1, diffDays(effectiveEnd, effectiveStart) + 1);

                                  const leftPercent = (startOffsetDays / totalDays) * 100;
                                  const widthPercent = (durationDays / totalDays) * 100;
                                  const colorClasses = getAreaColor(
                                    sub.deliveryArea,
                                    sub.isRedacted,
                                  );

                                  return (
                                    <button
                                      key={sub.id}
                                      type="button"
                                      onClick={() => setSelectedSubtask(sub)}
                                      className={`absolute h-7 rounded-lg px-2 text-xs flex items-center justify-between gap-1 shadow-xs border transition-all cursor-pointer truncate ${colorClasses}`}
                                      style={{
                                        left: `${Math.max(0, leftPercent)}%`,
                                        width: `calc(${Math.min(100, widthPercent)}% - 4px)`,
                                        top: `${trackIdx * 32 + 8}px`,
                                      }}
                                      title={`${sub.title} (${sub.startDate} s/d ${sub.dueDate})`}
                                    >
                                      <div className="flex items-center gap-1 min-w-0 truncate">
                                        {sub.isRedacted ? (
                                          <Lock className="h-3 w-3 shrink-0" />
                                        ) : sub.deliveryArea === 'frontend' ? (
                                          <Code2 className="h-3 w-3 shrink-0" />
                                        ) : sub.deliveryArea === 'backend' ? (
                                          <Layers className="h-3 w-3 shrink-0" />
                                        ) : sub.deliveryArea === 'qa' ? (
                                          <Bug className="h-3 w-3 shrink-0" />
                                        ) : (
                                          <Cpu className="h-3 w-3 shrink-0" />
                                        )}
                                        <span className="truncate font-semibold text-[11px]">
                                          {sub.title}
                                        </span>
                                      </div>
                                      <span className="text-[10px] opacity-80 shrink-0 hidden sm:inline">
                                        {(sub.dueDate || '').slice(5)}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Expandable Unscheduled Subtasks List */}
                      {isUnscheduledExpanded && unscheduledTasks.length > 0 && (
                        <div className="bg-amber-50/50 dark:bg-amber-950/20 border-t border-amber-200/50 dark:border-amber-900/50 p-3 pl-8">
                          <p className="text-[11px] font-bold text-amber-900 dark:text-amber-200 mb-2 flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            <span>Beban Aktif Tanpa Jadwal ({unscheduledTasks.length}):</span>
                            <span className="text-[10px] font-normal text-amber-800 dark:text-amber-300">
                              (Subtask aktif tanpa tanggal mulai/tenggat; irisan waktu tidak dapat
                              dinilai)
                            </span>
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                            {unscheduledTasks.map((un) => (
                              <div
                                key={un.id}
                                className="p-2 rounded-lg bg-white dark:bg-stone-900 border border-amber-200/70 dark:border-amber-800/40 text-xs flex items-center justify-between gap-2 shadow-2xs"
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <Badge variant="neutral" size="sm">
                                    {(un.deliveryArea || 'SUBTASK').toUpperCase()}
                                  </Badge>
                                  <span className="truncate font-medium text-stone-800 dark:text-stone-200">
                                    {un.title}
                                  </span>
                                </div>
                                <TaskStatusBadge state={un.status} size="sm" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Subtask Details Modal */}
      {selectedSubtask && (
        <Modal
          isOpen={Boolean(selectedSubtask)}
          onClose={() => setSelectedSubtask(null)}
          title={selectedSubtask.isRedacted ? 'Pekerjaan Aktif Lain' : selectedSubtask.title}
          size="md"
        >
          <div className="space-y-4 text-xs">
            {selectedSubtask.isRedacted ? (
              <Alert tone="warning" title="Detail Dirahasiakan">
                Pekerjaan aktif ini berada pada workspace lain di mana Anda bukan anggota resmi.
                Sesuai kebijakan privasi lintas-workspace (AUTH-011), rincian judul, deskripsi, dan
                nama workspace disembunyikan.
              </Alert>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-800">
                  <div>
                    <span className="block text-[10px] text-stone-500 font-medium">Area Delivery</span>
                    <span className="font-bold text-stone-900 dark:text-stone-100 uppercase">
                      {selectedSubtask.deliveryArea || 'Tidak Ada'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-stone-500 font-medium">Status</span>
                    <TaskStatusBadge state={selectedSubtask.status} size="sm" />
                  </div>
                  <div>
                    <span className="block text-[10px] text-stone-500 font-medium">Tanggal Mulai</span>
                    <span className="font-semibold text-stone-800 dark:text-stone-200">
                      {selectedSubtask.startDate || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-stone-500 font-medium">Tanggal Tenggat</span>
                    <span className="font-semibold text-stone-800 dark:text-stone-200">
                      {selectedSubtask.dueDate || '—'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-stone-100 dark:border-stone-800">
              <Button size="sm" variant="outline" onClick={() => setSelectedSubtask(null)}>
                Tutup
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
