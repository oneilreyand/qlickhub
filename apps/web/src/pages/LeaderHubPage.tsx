import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Calendar,
  ShieldAlert,
  FileBarChart2,
  Building2,
  AlertCircle,
  Crown,
  Check,
} from 'lucide-react';
import type { LeaderWorkspaceSummaryItem } from '@qlick/contracts';
import { leaderService } from '../lib/api/leaderService';
import { LeaderTimelineTab, LeaderQualityTab, LeaderDigestTab } from '../features/leader';
import { Card } from '../components/ui/atoms/Card';
import { Badge } from '../components/ui/atoms/Badge';

type LeaderTab = 'timeline' | 'quality' | 'digest';

export const LeaderHubPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = (searchParams.get('tab') as LeaderTab) || 'timeline';

  const [workspaces, setWorkspaces] = useState<LeaderWorkspaceSummaryItem[]>([]);
  const [selectedWorkspaceIds, setSelectedWorkspaceIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaderWorkspaces = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await leaderService.getWorkspaces();
        setWorkspaces(res.workspaces);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal memuat daftar workspace leader');
      } finally {
        setIsLoading(false);
      }
    };
    void fetchLeaderWorkspaces();
  }, []);

  const workspaceNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const ws of workspaces) {
      map[ws.id] = ws.name;
    }
    return map;
  }, [workspaces]);

  const handleTabChange = (tab: LeaderTab) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      return next;
    });
  };

  const toggleWorkspace = (wsId: string) => {
    setSelectedWorkspaceIds((prev) => {
      if (prev.includes(wsId)) {
        return prev.filter((id) => id !== wsId);
      } else {
        return [...prev, wsId];
      }
    });
  };

  const selectAllWorkspaces = () => {
    setSelectedWorkspaceIds([]);
  };

  const isAllSelected = selectedWorkspaceIds.length === 0;

  const effectiveWorkspaceIds = isAllSelected ? undefined : selectedWorkspaceIds;

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 rounded-full border-2 border-stone-300 border-t-[#B1E743] animate-spin" />
        <span className="text-xs text-stone-500">Memuat akses Leader Executive Hub...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Card className="p-8 text-center bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900">
          <AlertCircle className="h-8 w-8 mx-auto mb-2 text-rose-500" />
          <h3 className="font-bold text-sm text-stone-900 dark:text-white">
            Gagal Mengakses Leader Hub
          </h3>
          <p className="text-xs text-stone-500 mt-1">{error}</p>
        </Card>
      </div>
    );
  }

  if (workspaces.length === 0) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Card className="p-10 text-center space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
            <Crown className="h-6 w-6" />
          </div>
          <h3 className="font-bold text-base text-stone-900 dark:text-white">
            Akses Leader Hub Terbatas
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 max-w-md mx-auto leading-relaxed">
            Halaman ini dikhususkan bagi peran <strong>Owner</strong> dan <strong>Admin</strong>{' '}
            untuk memantau performa, kapasitas tim, dan kualitas lintas beberapa workspace. Anda
            saat ini tidak memiliki workspace dengan peran tersebut.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl 2xl:max-w-[1600px] mx-auto">
      {/* Top Leader Hub Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-200/80 dark:border-stone-800/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-[#B1E743] text-[#141413] shadow-xs">
              <Crown className="h-4 w-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white tracking-tight">
              Executive Leader Hub
            </h1>
            <Badge variant="brand" size="sm">
              {workspaces.length} Workspace Dipimpin
            </Badge>
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Dasbor pengawasan lintas workspace: timeline pengerjaan, deteksi overlap beban kerja,
            dan mutu defect staging vs production
          </p>
        </div>

        {/* Multi-Workspace Selector Pills */}
        <div className="flex flex-wrap items-center gap-1.5 bg-stone-100/80 dark:bg-stone-900/80 p-1.5 rounded-2xl border border-stone-200/60 dark:border-stone-800">
          <button
            onClick={selectAllWorkspaces}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              isAllSelected
                ? 'bg-[#B1E743] text-[#141413] shadow-xs font-bold'
                : 'text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white'
            }`}
          >
            {isAllSelected && <Check className="h-3 w-3" />}
            <span>Semua Workspace</span>
          </button>

          {workspaces.map((ws) => {
            const isSelected = selectedWorkspaceIds.includes(ws.id);
            return (
              <button
                key={ws.id}
                onClick={() => toggleWorkspace(ws.id)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-[#B1E743] text-[#141413] shadow-xs font-bold'
                    : 'text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white'
                }`}
              >
                <Building2 className="h-3 w-3 text-stone-400" />
                <span className="max-w-[120px] truncate">{ws.name}</span>
                {isSelected && <Check className="h-3 w-3" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Tabs Navigation Bar */}
      <div className="flex items-center gap-2 border-b border-stone-200/80 dark:border-stone-800/80 pb-3">
        <button
          onClick={() => handleTabChange('timeline')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            currentTab === 'timeline'
              ? 'bg-[#B1E743] text-[#141413] shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100 dark:text-stone-400 dark:hover:text-white dark:hover:bg-stone-800'
          }`}
        >
          <Calendar className="h-4 w-4" />
          <span>Timeline & Beban Kerja (FLOW-007)</span>
        </button>

        <button
          onClick={() => handleTabChange('quality')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            currentTab === 'quality'
              ? 'bg-[#B1E743] text-[#141413] shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100 dark:text-stone-400 dark:hover:text-white dark:hover:bg-stone-800'
          }`}
        >
          <ShieldAlert className="h-4 w-4" />
          <span>Kualitas & Bug (Staging vs Prod)</span>
        </button>

        <button
          onClick={() => handleTabChange('digest')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            currentTab === 'digest'
              ? 'bg-[#B1E743] text-[#141413] shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100 dark:text-stone-400 dark:hover:text-white dark:hover:bg-stone-800'
          }`}
        >
          <FileBarChart2 className="h-4 w-4" />
          <span>Laporan Eksekutif Mingguan/Bulanan</span>
        </button>
      </div>

      {/* Tab Panels */}
      {currentTab === 'timeline' && (
        <LeaderTimelineTab
          workspaceIds={effectiveWorkspaceIds}
          workspaceNameMap={workspaceNameMap}
        />
      )}

      {currentTab === 'quality' && (
        <LeaderQualityTab
          workspaceIds={effectiveWorkspaceIds}
          workspaceNameMap={workspaceNameMap}
        />
      )}

      {currentTab === 'digest' && (
        <LeaderDigestTab workspaceIds={effectiveWorkspaceIds} workspaceNameMap={workspaceNameMap} />
      )}
    </div>
  );
};
