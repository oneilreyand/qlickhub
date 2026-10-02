import React, { useEffect, useState, useCallback } from 'react';
import {
  Copy,
  Check,
  Printer,
  Calendar,
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import type { LeaderReportDigestResponse } from '@qlick/contracts';
import { leaderService } from '../../lib/api/leaderService';
import { Badge } from '../../components/ui/atoms/Badge';
import { Card } from '../../components/ui/atoms/Card';

interface LeaderDigestTabProps {
  workspaceIds?: string[];
  workspaceNameMap: Record<string, string>;
}

export const LeaderDigestTab: React.FC<LeaderDigestTabProps> = ({ workspaceIds }) => {
  const [data, setData] = useState<LeaderReportDigestResponse | null>(null);
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchDigest = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await leaderService.getDigest({
        workspaceIds,
        period,
      });
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghasilkan digest eksekutif');
    } finally {
      setIsLoading(false);
    }
  }, [workspaceIds, period]);

  useEffect(() => {
    void fetchDigest();
  }, [fetchDigest]);

  const handleCopy = async () => {
    if (!data?.markdownSummary) return;
    try {
      await navigator.clipboard.writeText(data.markdownSummary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Clipboard copy failed:', err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Period Selector */}
      <Card className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-stone-900 dark:text-white">
              Digest Laporan Eksekutif Lintas Workspace
            </h2>
            <Badge variant="brand" size="sm">
              {period === 'weekly' ? 'Mingguan' : 'Bulanan'}
            </Badge>
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Laporan otomatis kesiapan sistem, kapasitas tim, dan kualitas defect untuk manajemen
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Period Toggle */}
          <div className="flex items-center bg-stone-100 dark:bg-stone-800 p-1 rounded-xl">
            <button
              onClick={() => setPeriod('weekly')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                period === 'weekly'
                  ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-xs'
                  : 'text-stone-500 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              Mingguan (Weekly)
            </button>
            <button
              onClick={() => setPeriod('monthly')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                period === 'monthly'
                  ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-xs'
                  : 'text-stone-500 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              Bulanan (Monthly)
            </button>
          </div>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            disabled={isLoading || !data}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
              copied
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300'
                : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Tersalin ke Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-stone-500" />
                <span>Salin Markdown (Slack/Email)</span>
              </>
            )}
          </button>

          {/* Print PDF Button */}
          <button
            onClick={handlePrint}
            disabled={isLoading || !data}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <Printer className="h-3.5 w-3.5 text-stone-500" />
            <span className="hidden sm:inline">Cetak / PDF</span>
          </button>

          {/* Refresh */}
          <button
            onClick={() => void fetchDigest()}
            disabled={isLoading}
            className="p-2 rounded-xl border border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            title="Muat Ulang"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </Card>

      {/* Loading & Error States */}
      {isLoading && (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-stone-300 border-t-[#B1E743] animate-spin" />
          <span className="text-xs text-stone-500">Menghasilkan digest eksekutif...</span>
        </div>
      )}

      {error && (
        <Card className="p-6 text-center text-rose-600 bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900">
          <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-rose-500" />
          <p className="text-xs font-semibold">{error}</p>
        </Card>
      )}

      {/* Structured Digest Report */}
      {!isLoading && !error && data && (
        <div className="space-y-6">
          {/* Executive Overview Banner */}
          <Card className="p-6 bg-gradient-to-br from-stone-50 to-stone-100/60 dark:from-stone-900 dark:to-stone-900/60 border-stone-200 dark:border-stone-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-[#B1E743]">
                  Qlick Hub Executive Report
                </span>
                <h3 className="text-lg font-black text-stone-900 dark:text-white">
                  Laporan {data.type === 'weekly' ? 'Mingguan' : 'Bulanan'} Tim Engineering
                </h3>
                <div className="flex items-center gap-2 text-xs text-stone-500">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Periode: {data.periodLabel}</span>
                  <span>•</span>
                  <span>Dihasilkan pada: {new Date(data.generatedAt).toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-stone-200 dark:border-stone-800 text-xs">
              <div>
                <span className="text-stone-400 block">Fitur Selesai</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                  {data.highlights.featuresDelivered} Fitur
                </span>
              </div>
              <div>
                <span className="text-stone-400 block">Subtask Selesai</span>
                <span className="font-bold text-stone-800 dark:text-stone-100 text-sm">
                  {data.highlights.subtasksCompleted} Subtask
                </span>
              </div>
              <div>
                <span className="text-stone-400 block">Blocker Aktif</span>
                <span className="font-bold text-rose-600 dark:text-rose-400 text-sm">
                  {data.highlights.activeBlockers} Blocker
                </span>
              </div>
              <div>
                <span className="text-stone-400 block">Bug Critical / High Open</span>
                <span className="font-bold text-amber-600 dark:text-amber-400 text-sm">
                  {data.highlights.criticalHighBugsOpen} Bug
                </span>
              </div>
            </div>
          </Card>

          {/* Highlights & Quality Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Quality Digest Card */}
            <Card className="p-5 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-stone-100 dark:border-stone-800">
                <div className="h-8 w-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <ShieldAlert className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-bold text-stone-900 dark:text-white text-sm">
                    Kualitas Rekayasa & Staging vs Prod
                  </h4>
                  <span className="text-[11px] text-stone-400">
                    Defect escape rate dan tingkat bounce bug
                  </span>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-stone-500">Defect Escape Rate (DER):</span>
                  <span className="font-mono font-bold text-stone-800 dark:text-stone-100">
                    {data.qualityHealth.defectEscapeRate}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-500">Bug di Staging:</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                    {data.qualityHealth.stagingBugs} bug
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-500">Bug Lolos ke Production:</span>
                  <span className="font-semibold text-rose-600 dark:text-rose-400">
                    {data.qualityHealth.productionBugs} bug
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-500">Bug Bounce / Reopen Rate:</span>
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                    {data.qualityHealth.reopenRate}%
                  </span>
                </div>
              </div>
            </Card>

            {/* Capacity & Risk Matrix Card */}
            <Card className="p-5 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-stone-100 dark:border-stone-800">
                <div className="h-8 w-8 rounded-lg bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-bold text-stone-900 dark:text-white text-sm">
                    Kapasitas Beban & Risiko Jadwal
                  </h4>
                  <span className="text-[11px] text-stone-400">
                    Tumpang tindih jadwal dan bottleneck anggota
                  </span>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-stone-500">Total Konflik Overlap Jadwal:</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">
                    {data.capacityOutlook.scheduleConflictCount} konflik
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-500">Anggota Beban Berlebih (&gt;3 task):</span>
                  <span className="font-semibold text-rose-600 dark:text-rose-400">
                    {data.capacityOutlook.overloadedMembersCount} orang
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-500">Anggota Beban Seimbang:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {data.capacityOutlook.balancedMembersCount} orang
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-500">Anggota Tersedia Kapasitas:</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                    {data.capacityOutlook.underutilizedMembersCount} orang
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* Raw Markdown Preview Section */}
          <Card className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-stone-800 dark:text-stone-200 text-xs uppercase tracking-wider">
                Pratinjau Format Markdown (Slack / Email)
              </h4>
              <button
                onClick={handleCopy}
                className="text-xs font-semibold text-[#7CA812] dark:text-[#B1E743] hover:underline"
              >
                {copied ? '✓ Berhasil Disalin' : 'Salin Semua'}
              </button>
            </div>
            <pre className="p-4 rounded-xl bg-stone-900 text-stone-100 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap max-h-80 overflow-y-auto leading-relaxed">
              {data.markdownSummary}
            </pre>
          </Card>
        </div>
      )}
    </div>
  );
};
