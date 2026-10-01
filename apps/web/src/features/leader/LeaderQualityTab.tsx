import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Bug, ShieldAlert, RotateCcw, AlertOctagon, RefreshCw, Search } from 'lucide-react';
import type { LeaderQualityMetricsResponse, LeaderDeveloperQualityItem } from '@qlick/contracts';
import { leaderService } from '../../lib/api/leaderService';
import { Badge } from '../../components/ui/atoms/Badge';
import { Card } from '../../components/ui/atoms/Card';

interface LeaderQualityTabProps {
  workspaceIds?: string[];
  workspaceNameMap: Record<string, string>;
}

export const LeaderQualityTab: React.FC<LeaderQualityTabProps> = ({ workspaceIds }) => {
  const [data, setData] = useState<LeaderQualityMetricsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchQualityMetrics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await leaderService.getQuality({
        workspaceIds,
      });
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat metrik kualitas');
    } finally {
      setIsLoading(false);
    }
  }, [workspaceIds]);

  useEffect(() => {
    void fetchQualityMetrics();
  }, [fetchQualityMetrics]);

  const filteredMembers = useMemo(() => {
    if (!data?.developerMetrics) return [];
    return data.developerMetrics.filter((m: LeaderDeveloperQualityItem) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [data, searchQuery]);

  // Defect Escape Rate threshold assessment
  const der = data?.summary.defectEscapeRate ?? 0;
  const derStatus = useMemo(() => {
    if (der === 0)
      return { label: 'Optimal (0%)', variant: 'passed' as const, tip: 'Tidak ada bug prod' };
    if (der <= 5)
      return {
        label: 'Baik (<5%)',
        variant: 'passed' as const,
        tip: 'Sesuai target standar industri',
      };
    if (der <= 10)
      return {
        label: 'Peringatan (5-10%)',
        variant: 'review' as const,
        tip: 'Perlu penguatan test staging',
      };
    return {
      label: 'Kritis (>10%)',
      variant: 'blocked' as const,
      tip: 'Terlalu banyak bug lolos ke production',
    };
  }, [der]);

  const totalBugs = (data?.summary.stagingBugs ?? 0) + (data?.summary.productionBugs ?? 0);
  const stagingPercent =
    totalBugs > 0 ? Math.round(((data?.summary.stagingBugs ?? 0) / totalBugs) * 100) : 0;
  const prodPercent = totalBugs > 0 ? 100 - stagingPercent : 0;

  return (
    <div className="space-y-6">
      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total & Staging */}
        <Card className="p-4 sm:p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-stone-500 dark:text-stone-400">
              Bug di Staging (QA)
            </span>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {data?.summary.stagingBugs ?? 0}
            </div>
            <span className="text-[11px] text-stone-400">
              {stagingPercent}% dari total {totalBugs} temuan bug
            </span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Bug className="h-5 w-5" />
          </div>
        </Card>

        {/* Production Bugs */}
        <Card className="p-4 sm:p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-stone-500 dark:text-stone-400">
              Bug Lolos ke Prod (Incidents)
            </span>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
              {data?.summary.productionBugs ?? 0}
            </div>
            <span className="text-[11px] text-stone-400">
              {prodPercent}% lolos dari release gate
            </span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 dark:text-rose-400">
            <AlertOctagon className="h-5 w-5" />
          </div>
        </Card>

        {/* Defect Escape Rate */}
        <Card className="p-4 sm:p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-stone-500 dark:text-stone-400 flex items-center gap-1">
              Defect Escape Rate (DER)
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-stone-900 dark:text-white">
                {data?.summary.defectEscapeRate ?? 0}%
              </span>
              <Badge variant={derStatus.variant} size="sm">
                {derStatus.label}
              </Badge>
            </div>
            <span className="text-[11px] text-stone-400">{derStatus.tip}</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-700 dark:text-stone-300">
            <ShieldAlert className="h-5 w-5" />
          </div>
        </Card>

        {/* Bug Reopen / Bounce Rate */}
        <Card className="p-4 sm:p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-stone-500 dark:text-stone-400">
              Bug Reopen / Bounce Rate
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                {data?.summary.teamReopenRate ?? 0}%
              </span>
              <span className="text-xs text-stone-400">
                ({data?.summary.reopenedBugs ?? 0} kali reopen)
              </span>
            </div>
            <span className="text-[11px] text-stone-400">Bug yang balik lagi setelah di-fix</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <RotateCcw className="h-5 w-5" />
          </div>
        </Card>
      </div>

      {/* Defect Escape Visual Distribution Bar */}
      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-stone-900 dark:text-white">
              Rasio Distribusi Defect: Staging vs Production
            </span>
            <span className="text-stone-400 text-[11px]">(Formula: Prod / [Staging + Prod])</span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-400">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              Staging ({data?.summary.stagingBugs ?? 0})
            </span>
            <span className="flex items-center gap-1.5 font-medium text-rose-600 dark:text-rose-400">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
              Production ({data?.summary.productionBugs ?? 0})
            </span>
          </div>
        </div>

        {/* Progress Ratio Bar */}
        <div className="h-3 w-full bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden flex">
          <div
            style={{ width: `${stagingPercent}%` }}
            className="h-full bg-amber-500 transition-all duration-500"
            title={`Staging: ${stagingPercent}%`}
          />
          <div
            style={{ width: `${prodPercent}%` }}
            className="h-full bg-rose-500 transition-all duration-500"
            title={`Production: ${prodPercent}%`}
          />
        </div>

        <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
          💡 <strong>Leader Tip:</strong> Menemukan dan memperbaiki bug di fase Staging menghemat
          hingga 10x biaya perbaikan dibandingkan bug yang lolos ke Production. Targetkan Defect
          Escape Rate di bawah <strong>10%</strong> untuk stabilitas sistem.
        </p>
      </Card>

      {/* Search Bar */}
      <Card className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
          <input
            type="text"
            placeholder="Cari anggota tim..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 focus:outline-none focus:ring-2 focus:ring-[#B1E743]"
          />
        </div>

        <button
          onClick={() => void fetchQualityMetrics()}
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
            Menghitung metrik kualitas rekayasa dan bug rate...
          </span>
        </div>
      )}

      {error && (
        <Card className="p-6 text-center text-rose-600 bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900">
          <AlertOctagon className="h-6 w-6 mx-auto mb-2 text-rose-500" />
          <p className="text-xs font-semibold">{error}</p>
        </Card>
      )}

      {/* Quality Breakdown Table per Developer */}
      {!isLoading && !error && (
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              Distribusi Kualitas & Bug per Anggota Tim ({filteredMembers.length})
            </h3>
            <span className="text-[11px] text-stone-400">
              Evaluasi akurasi pengerjaan & tingkat bounce bug
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50/80 dark:bg-stone-900/80 text-stone-400 text-[11px] font-bold uppercase border-b border-stone-100 dark:border-stone-800">
                <tr>
                  <th className="py-3 px-4">Anggota Tim</th>
                  <th className="py-3 px-3 text-center">Spesialisasi</th>
                  <th className="py-3 px-3 text-center">Bug Ditugaskan</th>
                  <th className="py-3 px-3 text-center">Bug Selesai</th>
                  <th className="py-3 px-3 text-center">Reopened / Bounce</th>
                  <th className="py-3 px-3 text-center">Reopen Rate</th>
                  <th className="py-3 px-3 text-center">First Time Right</th>
                  <th className="py-3 px-4 text-center">Status Mutu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-stone-400 italic">
                      Tidak ada data metrik anggota untuk filter saat ini.
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map((m: LeaderDeveloperQualityItem) => {
                    const isHighBounce = m.reopenRate > 25;
                    const isFtrHigh = m.firstTimeRightRate >= 80;

                    return (
                      <tr
                        key={m.developerId}
                        className="hover:bg-stone-50/50 dark:hover:bg-stone-800/40 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="grid h-7 w-7 place-items-center rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-bold text-xs">
                              {m.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-stone-900 dark:text-white">
                                {m.name}
                              </div>
                              <div className="text-[10px] text-stone-400">{m.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <Badge variant="neutral" size="sm">
                            {m.specialty}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-center font-semibold text-stone-800 dark:text-stone-200">
                          {m.assignedBugs}
                        </td>
                        <td className="py-3 px-3 text-center font-medium text-emerald-600 dark:text-emerald-400">
                          {m.resolvedBugs}
                        </td>
                        <td className="py-3 px-3 text-center font-semibold text-indigo-600 dark:text-indigo-400">
                          {m.reopenedBugs}x
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold">
                          <span
                            className={
                              m.reopenRate > 25
                                ? 'text-rose-600 dark:text-rose-400'
                                : m.reopenRate > 10
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-emerald-600 dark:text-emerald-400'
                            }
                          >
                            {m.reopenRate}%
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-stone-700 dark:text-stone-300">
                          {m.firstTimeRightRate}%
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isHighBounce ? (
                            <Badge variant="blocked" size="sm">
                              Sering Bounce
                            </Badge>
                          ) : isFtrHigh ? (
                            <Badge variant="passed" size="sm">
                              Prima
                            </Badge>
                          ) : (
                            <Badge variant="review" size="sm">
                              Cukup
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
