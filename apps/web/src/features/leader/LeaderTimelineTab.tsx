import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Calendar,
  AlertTriangle,
  Users,
  CheckCircle2,
  Layers,
  Search,
  Filter,
  RefreshCw,
  Building2,
} from 'lucide-react';
import type { LeaderTimelineResponse } from '@qlick/contracts';
import { leaderService } from '../../lib/api/leaderService';
import { Badge } from '../../components/ui/atoms/Badge';
import { Card } from '../../components/ui/atoms/Card';

interface LeaderTimelineTabProps {
  workspaceIds?: string[];
  workspaceNameMap: Record<string, string>;
}

export const LeaderTimelineTab: React.FC<LeaderTimelineTabProps> = ({
  workspaceIds,
  workspaceNameMap,
}) => {
  const [data, setData] = useState<LeaderTimelineResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [specialtyFilter, setSpecialtyFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchTimeline = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await leaderService.getTimeline({
        workspaceIds,
        specialty: specialtyFilter !== 'all' ? (specialtyFilter as any) : undefined,
      });
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat timeline kapasitas');
    } finally {
      setIsLoading(false);
    }
  }, [workspaceIds, specialtyFilter]);

  useEffect(() => {
    void fetchTimeline();
  }, [fetchTimeline]);

  const filteredMembers = useMemo(() => {
    if (!data?.members) return [];
    return data.members.filter((m) => {
      const matchSearch =
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.email.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSearch;
    });
  }, [data, searchQuery]);

  const capacitySummary = useMemo(() => {
    if (!data?.members) return { overloaded: 0, balanced: 0, underutilized: 0 };
    return data.members.reduce(
      (acc, m) => {
        if (m.capacityStatus === 'overloaded') acc.overloaded += 1;
        else if (m.capacityStatus === 'balanced') acc.balanced += 1;
        else acc.underutilized += 1;
        return acc;
      },
      { overloaded: 0, balanced: 0, underutilized: 0 },
    );
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 sm:p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-stone-500 dark:text-stone-400">
              Total Anggota Tim Aktif
            </span>
            <div className="text-2xl font-black text-stone-900 dark:text-white">
              {data?.totalMembers ?? 0}
            </div>
            <span className="text-[11px] text-stone-400">Lintas workspace terpilih</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-sky-50 dark:bg-sky-950/60 flex items-center justify-center text-sky-600 dark:text-sky-400">
            <Users className="h-5 w-5" />
          </div>
        </Card>

        <Card className="p-4 sm:p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-stone-500 dark:text-stone-400">
              Subtask Sedang Berjalan
            </span>
            <div className="text-2xl font-black text-stone-900 dark:text-white">
              {data?.totalActiveSubtasks ?? 0}
            </div>
            <span className="text-[11px] text-stone-400">In progress / In review</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 flex items-center justify-center text-purple-600 dark:text-purple-400">
            <Layers className="h-5 w-5" />
          </div>
        </Card>

        <Card className="p-4 sm:p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-stone-500 dark:text-stone-400">
              Konflik Jadwal (FLOW-007)
            </span>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
              {data?.totalConflicts ?? 0}
            </div>
            <span className="text-[11px] text-stone-400">Tugas tumpang tindih tanggal</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 dark:text-rose-400">
            <AlertTriangle className="h-5 w-5" />
          </div>
        </Card>

        <Card className="p-4 sm:p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-stone-500 dark:text-stone-400">
              Status Kapasitas Beban
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                {capacitySummary.overloaded} padat
              </span>
              <span className="text-stone-300 dark:text-stone-700">|</span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                {capacitySummary.balanced} seimbang
              </span>
              <span className="text-stone-300 dark:text-stone-700">|</span>
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                {capacitySummary.underutilized} lowong
              </span>
            </div>
            <span className="text-[11px] text-stone-400">Distribusi alokasi beban kerja</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
            <input
              type="text"
              placeholder="Cari nama atau email anggota..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 focus:outline-none focus:ring-2 focus:ring-[#B1E743]"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-stone-400" />
            <select
              value={specialtyFilter}
              onChange={(e) => setSpecialtyFilter(e.target.value)}
              className="text-xs py-1.5 px-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 text-stone-700 dark:text-stone-300 focus:outline-none focus:ring-2 focus:ring-[#B1E743]"
            >
              <option value="all">Semua Spesialisasi</option>
              <option value="backend">Backend</option>
              <option value="frontend">Frontend</option>
              <option value="fullstack">Fullstack</option>
              <option value="mobile">Mobile</option>
              <option value="devops">DevOps</option>
              <option value="qa">QA</option>
            </select>
          </div>
        </div>

        <button
          onClick={() => void fetchTimeline()}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Muat Ulang</span>
        </button>
      </Card>

      {/* Loading & Error States */}
      {isLoading && (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-stone-300 border-t-[#B1E743] animate-spin" />
          <span className="text-xs text-stone-500">
            Menganalisis timeline dan beban kerja anggota...
          </span>
        </div>
      )}

      {error && (
        <Card className="p-6 text-center text-rose-600 bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900">
          <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-rose-500" />
          <p className="text-xs font-semibold">{error}</p>
        </Card>
      )}

      {/* Member Timeline List */}
      {!isLoading && !error && filteredMembers.length === 0 && (
        <Card className="p-12 text-center text-stone-400">
          <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-xs">Tidak ada data anggota tim yang sesuai dengan filter.</p>
        </Card>
      )}

      {!isLoading && !error && filteredMembers.length > 0 && (
        <div className="space-y-4">
          {filteredMembers.map((member) => {
            const hasConflict = member.conflictCount > 0;
            return (
              <Card
                key={member.id}
                className={`p-5 transition-all ${
                  hasConflict
                    ? 'border-rose-300 dark:border-rose-900/80 bg-rose-50/10'
                    : 'hover:border-stone-300 dark:hover:border-stone-700'
                }`}
              >
                {/* Member Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100 dark:border-stone-800">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-bold text-sm">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-stone-900 dark:text-white text-sm">
                          {member.name}
                        </h4>
                        <Badge variant="neutral" size="sm">
                          {member.specialty}
                        </Badge>
                        <Badge
                          variant={
                            member.capacityStatus === 'overloaded'
                              ? 'blocked'
                              : member.capacityStatus === 'balanced'
                                ? 'passed'
                                : 'review'
                          }
                          size="sm"
                        >
                          {member.capacityStatus === 'overloaded'
                            ? 'Beban Berlebih'
                            : member.capacityStatus === 'balanced'
                              ? 'Beban Seimbang'
                              : 'Kapasitas Tersedia'}
                        </Badge>
                      </div>
                      <span className="text-xs text-stone-400">{member.email}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-stone-500">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-stone-400" />
                      <span>{member.workspaces.length} Workspace</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-stone-400" />
                      <span className="font-semibold text-stone-800 dark:text-stone-200">
                        {member.activeSubtaskCount} Subtask
                      </span>
                    </div>
                    {hasConflict && (
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 font-bold text-[11px]">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        <span>{member.conflictCount} Konflik Jadwal</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Subtask Timeline Cards */}
                <div className="mt-4 space-y-2">
                  {member.tasks.length === 0 ? (
                    <div className="py-4 text-center text-xs text-stone-400 italic">
                      Tidak ada subtask aktif yang sedang dikerjakan.
                    </div>
                  ) : (
                    member.tasks.map((task) => {
                      const wsName = workspaceNameMap[task.workspaceId] || 'Workspace';
                      return (
                        <div
                          key={task.id}
                          className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border text-xs gap-3 ${
                            task.hasConflict
                              ? 'border-rose-400 bg-rose-50/40 dark:border-rose-800 dark:bg-rose-950/30'
                              : 'border-stone-200/80 bg-stone-50/40 dark:border-stone-800/80 dark:bg-stone-900/40'
                          }`}
                        >
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-stone-900 dark:text-stone-100">
                                {task.title}
                              </span>
                              {task.hasConflict && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-950 px-1.5 py-0.5 rounded">
                                  <AlertTriangle className="h-3 w-3" />
                                  Tumpang Tindih
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-stone-400">
                              {task.parentTaskTitle && <span>Fitur: {task.parentTaskTitle}</span>}
                              <span>•</span>
                              <span className="inline-flex items-center gap-1 font-medium text-stone-600 dark:text-stone-300">
                                <Building2 className="h-3 w-3" />
                                {wsName}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            {task.deliveryArea && (
                              <Badge variant="brand" size="sm">
                                {task.deliveryArea}
                              </Badge>
                            )}
                            <div className="flex items-center gap-1 text-stone-500 font-mono text-[11px]">
                              <Calendar className="h-3.5 w-3.5 text-stone-400" />
                              <span>{task.startDate || '—'}</span>
                              <span>→</span>
                              <span>{task.dueDate || '—'}</span>
                            </div>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-stone-200/60 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                              {task.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
