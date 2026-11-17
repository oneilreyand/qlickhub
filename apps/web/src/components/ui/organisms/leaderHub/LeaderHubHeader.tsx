import React from 'react';
import { Select } from '../../atoms/Select';
import { Tabs, type TabItem } from '../../molecules/Tabs';

export interface LeaderHubOption {
  value: string;
  label: string;
}

export interface LeaderHubHeaderProps {
  /** e.g. "diperbarui 10 detik lalu"; omit while the first load is in flight. */
  freshnessLabel?: string;
  workspaceCount: number;
  memberCount: number;
  workspaceOptions: LeaderHubOption[];
  workspaceValue: string;
  onWorkspaceChange: (value: string) => void;
  periodOptions: LeaderHubOption[];
  periodValue: string;
  onPeriodChange: (value: string) => void;
  tabs: TabItem[];
  activeTabId: string;
  onTabChange: (id: string) => void;
}

export const LeaderHubHeader: React.FC<LeaderHubHeaderProps> = ({
  freshnessLabel,
  workspaceCount,
  memberCount,
  workspaceOptions,
  workspaceValue,
  onWorkspaceChange,
  periodOptions,
  periodValue,
  onPeriodChange,
  tabs,
  activeTabId,
  onTabChange,
}) => (
  <header className="space-y-5">
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0 space-y-1">
        <h1 className="text-2xl font-black tracking-tight text-stone-900 sm:text-3xl dark:text-white">
          Leader Hub
        </h1>
        <p className="flex flex-wrap items-center gap-x-1.5 text-sm text-stone-500 dark:text-stone-400">
          <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
          <span>
            Realtime{freshnessLabel ? ` · ${freshnessLabel}` : ''} · {workspaceCount} workspace,{' '}
            {memberCount} anggota
          </span>
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <div className="w-full min-[420px]:w-48">
          <Select
            aria-label="Filter workspace"
            value={workspaceValue}
            onChange={(event) => onWorkspaceChange(event.target.value)}
          >
            {workspaceOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-full min-[420px]:w-40">
          <Select
            aria-label="Periode"
            value={periodValue}
            onChange={(event) => onPeriodChange(event.target.value)}
          >
            {periodOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </div>
    </div>
    <Tabs
      tabs={tabs}
      activeTabId={activeTabId}
      onChange={onTabChange}
      variant="pills"
      ariaLabel="Bagian Leader Hub"
    />
  </header>
);
