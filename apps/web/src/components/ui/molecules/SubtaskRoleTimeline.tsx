import React, { useMemo, useState } from 'react';
import {
  Code2,
  Layers,
  Bug,
  Smartphone,
  Cpu,
  FileCode2,
  Clock,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  User,
} from 'lucide-react';
import type { Task, ProductBrief, DeliveryArea } from '@qlick/contracts';
import {
  calculateRoleOverlapAndBottlenecks,
  calculateSubtaskScheduleHealth,
  normalizeDateStr,
} from '../../../lib/utils/scheduleHealth';
import { TaskScheduleHealthBadge } from './TaskScheduleHealthBadge';

export interface SubtaskRoleTimelineProps {
  parentTask: Task;
  subtasks: Task[];
  productBrief?: ProductBrief | null;
  members?: Array<{ userId: string; role: string; user?: { name?: string; email?: string } }>;
  canMutate?: boolean;
  onSubtaskUpdated?: (updated: Task) => void;
}

function formatShortDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export const SubtaskRoleTimeline: React.FC<SubtaskRoleTimelineProps> = ({
  parentTask,
  subtasks,
  productBrief = null,
  members = [],
}) => {
  const [activeRoleFilter, setActiveRoleFilter] = useState<
    'all' | 'po' | 'backend' | 'frontend' | 'mobile' | 'fullstack' | 'qa'
  >('all');

  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => normalizeDateStr(today), [today]);

  const analysis = useMemo(() => {
    return calculateRoleOverlapAndBottlenecks(parentTask, subtasks, productBrief, members, today);
  }, [parentTask, subtasks, productBrief, members, today]);

  // Determine timeline boundary dates
  const { startDateRange, endDateRange, dayColumns } = useMemo(() => {
    const allDates: string[] = [];
    if (parentTask.startDate) allDates.push(parentTask.startDate);
    if (parentTask.dueDate) allDates.push(parentTask.dueDate);

    for (const st of subtasks) {
      if (st.startDate) allDates.push(st.startDate);
      if (st.dueDate) allDates.push(st.dueDate);
    }
    allDates.push(todayStr);

    allDates.sort();

    const minDateStr = allDates[0];
    const maxDateStr = allDates[allDates.length - 1];

    let start = new Date(minDateStr + 'T00:00:00');
    let end = new Date(maxDateStr + 'T00:00:00');

    // Buffer by 3 days before and 5 days after
    start.setDate(start.getDate() - 2);
    end.setDate(end.getDate() + 4);

    const cols: Array<{ key: string; label: string; subLabel: string; isToday: boolean; isWeekend: boolean; date: Date }> = [];
    const cur = new Date(start);
    while (cur <= end) {
      const key = normalizeDateStr(cur);
      const dayNum = cur.getDate();
      const weekday = cur.toLocaleDateString('en-US', { weekday: 'narrow' });
      const isWeekend = cur.getDay() === 0 || cur.getDay() === 6;

      cols.push({
        key,
        label: `${dayNum}`,
        subLabel: weekday,
        isToday: key === todayStr,
        isWeekend,
        date: new Date(cur),
      });
      cur.setDate(cur.getDate() + 1);
    }

    return {
      startDateRange: start,
      endDateRange: end,
      dayColumns: cols,
    };
  }, [parentTask, subtasks, todayStr]);

  const totalDurationMs = Math.max(endDateRange.getTime() - startDateRange.getTime(), 1);

  // Position of Today line
  const todayMarkerPercent = useMemo(() => {
    const offsetMs = today.getTime() - startDateRange.getTime();
    if (offsetMs < 0 || offsetMs > totalDurationMs) return null;
    return (offsetMs / totalDurationMs) * 100;
  }, [startDateRange, totalDurationMs, today]);

  // Compute bar position
  const computeBarPosition = (st: Task) => {
    let s = st.startDate ? new Date(st.startDate + 'T00:00:00') : null;
    let e = st.dueDate ? new Date(st.dueDate + 'T23:59:59') : null;

    if (!s && e) {
      s = new Date(e);
      s.setDate(s.getDate() - 2);
    } else if (s && !e) {
      e = new Date(s);
      e.setDate(e.getDate() + 3);
    }

    if (!s || !e) {
      return { display: 'none' as const };
    }

    const startOffsetMs = Math.max(0, s.getTime() - startDateRange.getTime());
    const durationMs = Math.max(86400000, e.getTime() - s.getTime());

    const leftPercent = (startOffsetMs / totalDurationMs) * 100;
    const widthPercent = Math.min((durationMs / totalDurationMs) * 100, 100 - leftPercent);

    return {
      left: `${Math.max(0, Math.min(100, leftPercent))}%`,
      width: `${Math.max(3, Math.min(100, widthPercent))}%`,
      minWidth: '28px',
    };
  };

  const getRoleBadge = (area?: DeliveryArea | null) => {
    switch (area) {
      case 'frontend':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700 shrink-0">
            <Code2 className="h-3 w-3" /> FE
          </span>
        );
      case 'backend':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shrink-0">
            <Layers className="h-3 w-3" /> BE
          </span>
        );
      case 'mobile':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700 shrink-0">
            <Smartphone className="h-3 w-3" /> MOB
          </span>
        );
      case 'fullstack':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700 shrink-0">
            <Cpu className="h-3 w-3" /> FS
          </span>
        );
      case 'qa':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-[#B1E743]/20 text-[#22201F] dark:text-[#B1E743] border border-[#B1E743]/50 shrink-0">
            <Bug className="h-3 w-3" /> QA
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300 shrink-0">
            SUBTASK
          </span>
        );
    }
  };

  const getRoleBarStyle = (area?: DeliveryArea | null, healthStatus?: string) => {
    if (healthStatus === 'delayed') {
      return 'bg-rose-500 hover:bg-rose-600 text-white shadow-xs ring-1 ring-rose-600/50';
    }
    if (healthStatus === 'completed') {
      return 'bg-[#B1E743] hover:bg-[#9ed434] text-[#22201F] shadow-xs';
    }
    if (healthStatus === 'at_risk') {
      return 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs ring-1 ring-amber-600/50';
    }
    switch (area) {
      case 'frontend':
      case 'mobile':
      case 'fullstack':
        return 'bg-[#22201F] hover:bg-stone-800 text-white shadow-xs dark:bg-stone-700';
      case 'backend':
        return 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs';
      case 'qa':
        return 'bg-[#B1E743] hover:bg-[#9ed434] text-[#22201F] shadow-xs';
      default:
        return 'bg-stone-600 hover:bg-stone-700 text-white shadow-xs';
    }
  };


  const filteredSubtasks = useMemo(() => {
    if (activeRoleFilter === 'all') return subtasks;
    if (activeRoleFilter === 'po') return [];
    return subtasks.filter((s) => s.deliveryArea === activeRoleFilter);
  }, [subtasks, activeRoleFilter]);

  const bottleneck = analysis.primaryBottleneck;

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* 1. Primary Bottleneck & Schedule Health Banner */}
      <div
        className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
          bottleneck.severity === 'delayed'
            ? 'bg-rose-50/90 border-rose-200 dark:bg-rose-950/30 dark:border-rose-900/60 text-rose-950 dark:text-rose-100'
            : bottleneck.severity === 'at_risk'
            ? 'bg-amber-50/90 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/60 text-amber-950 dark:text-amber-100'
            : 'bg-emerald-50/90 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/60 text-emerald-950 dark:text-emerald-100'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            {bottleneck.severity === 'delayed' ? (
              <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            ) : bottleneck.severity === 'at_risk' ? (
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            )}
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-xs uppercase tracking-wider">
                  {bottleneck.title}
                </span>
                <TaskScheduleHealthBadge
                  status={analysis.overallHealth}
                  label={
                    analysis.overallHealth === 'delayed'
                      ? `${bottleneck.overlapDays}d Slippage`
                      : analysis.overallHealth === 'at_risk'
                      ? 'At Risk'
                      : 'On Track'
                  }
                />
              </div>
              <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
                {bottleneck.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <span className="text-[11px] font-semibold opacity-80">
              {analysis.summary.completedSubtasks}/{analysis.summary.totalSubtasks} Subtasks Done
            </span>
          </div>
        </div>
      </div>

      {/* 2. Cross-Role Handoff Pipeline (PO -> BE -> FE -> QA) */}
      <div className="rounded-2xl border border-stone-200/90 dark:border-stone-800 bg-white dark:bg-stone-900 p-3 sm:p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-indigo-500" />
            <span>Inter-Role Handoff Pipeline</span>
          </span>
          <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400">
            PO Specs ➔ Dev Backend ➔ Dev Frontend ➔ QA Verification
          </span>
        </div>

        {/* 4 Connected Role Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {analysis.stageList.map((stage, idx) => {
            const isLast = idx === analysis.stageList.length - 1;
            const isDelayed = stage.health === 'delayed';
            const isAtRisk = stage.health === 'at_risk';
            const isDone = stage.status === 'done';

            const cardBorder = isDelayed
              ? 'border-rose-300 dark:border-rose-900 bg-rose-50/40 dark:bg-rose-950/20'
              : isAtRisk
              ? 'border-amber-300 dark:border-amber-900 bg-amber-50/40 dark:bg-amber-950/20'
              : isDone
              ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/30 dark:bg-emerald-950/15'
              : 'border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-900/40';

            return (
              <div
                key={stage.role}
                className={`p-3 rounded-xl border flex flex-col justify-between gap-2.5 transition-all relative ${cardBorder}`}
              >
                {/* Header: Icon, Role Name, Health Badge */}
                <div className="flex items-start justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {stage.role === 'po' && <FileCode2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                    {stage.role === 'backend' && <Layers className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />}
                    {stage.role === 'frontend' && <Code2 className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0" />}
                    {stage.role === 'qa' && <Bug className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                    <span className="font-bold text-xs text-stone-900 dark:text-stone-100 truncate">
                      {stage.shortLabel}
                    </span>
                  </div>
                  <TaskScheduleHealthBadge
                    status={stage.health}
                    label={
                      isDelayed
                        ? `${stage.daysOverdue}d Late`
                        : isDone
                        ? 'Done'
                        : isAtRisk
                        ? 'At Risk'
                        : stage.status === 'unscheduled'
                        ? 'Unscheduled'
                        : 'On Track'
                    }
                    compact={false}
                  />
                </div>

                {/* Timeline Dates Window */}
                <div className="space-y-1 text-[11px] text-stone-600 dark:text-stone-300">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-stone-400 dark:text-stone-500 uppercase font-semibold">Planned:</span>
                    <span className="font-mono font-medium">
                      {formatShortDate(stage.startDate)} → {formatShortDate(stage.dueDate)}
                    </span>
                  </div>

                  {/* Overlap / Slippage alert */}
                  {stage.overlapWithNextDays > 0 && !isLast && (
                    <div className="flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 pt-0.5">
                      <AlertTriangle className="h-3 w-3 shrink-0" />
                      <span>Overlaps next role by +{stage.overlapWithNextDays}d</span>
                    </div>
                  )}
                </div>

                {/* Assignees and Subtasks count footer */}
                <div className="flex items-center justify-between pt-1 border-t border-stone-200/60 dark:border-stone-800 text-[10px] text-stone-500 dark:text-stone-400">
                  <div className="flex items-center gap-1 truncate max-w-[120px]">
                    <User className="h-3 w-3 shrink-0 text-stone-400" />
                    <span className="truncate">
                      {stage.assignees.length > 0 ? stage.assignees.map((a) => a.name).join(', ') : 'Unassigned'}
                    </span>
                  </div>
                  <span className="font-mono">
                    {stage.role === 'po'
                      ? productBrief ? 'v' + productBrief.currentVersion.version : 'Draft'
                      : `${stage.subtasks.filter((s) => s.status === 'done').length}/${stage.subtasks.length} tasks`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Role Filter Switcher Bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800/70 p-1 rounded-xl flex-wrap">
          {[
            { id: 'all', label: `All (${subtasks.length})` },
            { id: 'backend', label: `BE (${subtasks.filter((s) => s.deliveryArea === 'backend').length})`, icon: <Layers className="h-3 w-3" /> },
            { id: 'frontend', label: `FE (${subtasks.filter((s) => s.deliveryArea === 'frontend').length})`, icon: <Code2 className="h-3 w-3" /> },
            { id: 'mobile', label: `MOB (${subtasks.filter((s) => s.deliveryArea === 'mobile').length})`, icon: <Smartphone className="h-3 w-3" /> },
            { id: 'fullstack', label: `FS (${subtasks.filter((s) => s.deliveryArea === 'fullstack').length})`, icon: <Cpu className="h-3 w-3" /> },
            { id: 'qa', label: `QA (${subtasks.filter((s) => s.deliveryArea === 'qa').length})`, icon: <Bug className="h-3 w-3" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveRoleFilter(tab.id as any)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                activeRoleFilter === tab.id
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 text-[11px] font-medium text-stone-500 dark:text-stone-400 flex-wrap">
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> BE</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-sky-500" /> FE</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-purple-500" /> MOB</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-cyan-500" /> FS</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> QA</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Late</span>
        </div>
      </div>

      {/* 4. Subtask Interactive Gantt Canvas */}
      <div className="rounded-2xl border border-stone-200/90 dark:border-stone-800 bg-white dark:bg-[#1C1A19] overflow-hidden shadow-xs">
        <div className="flex overflow-x-auto min-w-0">
          {/* Left Column: Subtask Label & Role */}
          <div className="w-64 sm:w-72 md:w-80 shrink-0 sticky left-0 z-20 bg-white dark:bg-[#1C1A19] border-r border-stone-200 dark:border-stone-800 shadow-xs">
            <div className="h-11 px-3 flex items-center justify-between border-b border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/80 text-[10px] font-extrabold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              <span>Role & Subtask</span>
              <span>Health</span>
            </div>

            {filteredSubtasks.map((st) => {
              const health = calculateSubtaskScheduleHealth(st, today);
              return (
                <div
                  key={st.id}
                  className="h-12 px-3 flex items-center justify-between border-b border-stone-100 dark:border-stone-800/60 hover:bg-stone-50/70 dark:hover:bg-stone-800/40 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    {getRoleBadge(st.deliveryArea)}
                    <span className="text-xs font-semibold text-stone-900 dark:text-stone-100 truncate" title={st.title}>
                      {st.title}
                    </span>
                  </div>
                  <TaskScheduleHealthBadge status={health.status} label={health.label} compact={true} />
                </div>
              );
            })}
          </div>

          {/* Right Column: Day-by-Day Gantt Stream */}
          <div className="flex-1 overflow-x-auto min-w-[400px]">
            <div style={{ width: `${dayColumns.length * 36}px` }} className="relative select-none">
              {/* Day header row */}
              <div className="h-11 flex border-b border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/80">
                {dayColumns.map((col) => (
                  <div
                    key={col.key}
                    style={{ width: '36px' }}
                    className={`h-full border-r border-stone-200/70 dark:border-stone-800/70 flex flex-col items-center justify-center text-center shrink-0 ${
                      col.isToday
                        ? 'bg-amber-50/80 dark:bg-amber-950/40 font-bold text-amber-700 dark:text-amber-400'
                        : col.isWeekend
                        ? 'bg-stone-100/40 dark:bg-stone-900/30 text-stone-400'
                        : 'text-stone-600 dark:text-stone-300'
                    }`}
                  >
                    <span className="text-[11px] leading-tight font-bold">{col.label}</span>
                    <span className="text-[9px] text-stone-400 leading-tight">{col.subLabel}</span>
                  </div>
                ))}
              </div>

              {/* Background Grid Columns */}
              <div className="absolute inset-0 top-11 pointer-events-none flex">
                {dayColumns.map((col) => (
                  <div
                    key={`grid-${col.key}`}
                    style={{ width: '36px' }}
                    className={`h-full border-r border-stone-100 dark:border-stone-800/30 shrink-0 ${
                      col.isToday ? 'bg-amber-50/30 dark:bg-amber-950/15' : col.isWeekend ? 'bg-stone-50/30 dark:bg-stone-900/20' : ''
                    }`}
                  />
                ))}
              </div>

              {/* Vertical Today Line */}
              {todayMarkerPercent !== null && (
                <div
                  style={{ left: `${todayMarkerPercent}%` }}
                  className="absolute top-0 bottom-0 z-10 w-0.5 bg-amber-500 shadow-sm pointer-events-none"
                >
                  <div className="absolute top-0.5 -translate-x-1/2 bg-amber-500 text-white text-[8px] font-extrabold px-1 rounded-full uppercase tracking-tighter shadow-xs">
                    Today
                  </div>
                </div>
              )}

              {/* Subtask Bars */}
              {filteredSubtasks.map((st) => {
                const health = calculateSubtaskScheduleHealth(st, today);
                const pos = computeBarPosition(st);
                const isOverdue = health.status === 'delayed';

                return (
                  <div
                    key={`bar-${st.id}`}
                    className="h-12 border-b border-stone-100 dark:border-stone-800/60 relative flex items-center"
                  >
                    {st.startDate || st.dueDate ? (
                      <div
                        style={pos}
                        className={`absolute h-6 rounded-lg px-2 flex items-center justify-between text-xs font-semibold cursor-pointer transition-all duration-150 z-10 hover:scale-[1.01] hover:z-30 ${getRoleBarStyle(
                          st.deliveryArea,
                          health.status
                        )}`}
                        title={`${st.title} (${st.deliveryArea?.toUpperCase() || 'SUBTASK'}) • ${st.startDate || '—'} → ${st.dueDate || '—'} [${health.label}]`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0 truncate">
                          {isOverdue ? (
                            <AlertCircle className="h-3 w-3 shrink-0 text-white animate-pulse" />
                          ) : health.status === 'completed' ? (
                            <CheckCircle2 className="h-3 w-3 shrink-0 text-white" />
                          ) : (
                            <Clock className="h-3 w-3 shrink-0 opacity-80" />
                          )}
                          <span className="truncate text-[10px] font-bold">{st.title}</span>
                        </div>

                        <span className="text-[9px] opacity-90 ml-1 font-mono shrink-0">
                          {formatShortDate(st.startDate)} → {formatShortDate(st.dueDate)}
                        </span>
                      </div>
                    ) : (
                      <div className="pl-3 flex items-center gap-1 text-[11px] text-stone-400 italic">
                        <span>Unscheduled (Click Details tab to add dates)</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
