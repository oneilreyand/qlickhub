import React from 'react';
import { Download } from 'lucide-react';
import { Button } from '../../atoms/Button';
import { Select } from '../../atoms/Select';

export interface ReportOption {
  value: string;
  label: string;
}

export interface MyWorkReportHeaderProps {
  workspaceNames: string[];
  periodOptions: ReportOption[];
  periodValue: string;
  onPeriodChange: (value: string) => void;
  workspaceOptions: ReportOption[];
  workspaceValue: string;
  onWorkspaceChange: (value: string) => void;
  onExportCsv?: () => void;
  isExporting?: boolean;
}

export const MyWorkReportHeader: React.FC<MyWorkReportHeaderProps> = ({
  workspaceNames,
  periodOptions,
  periodValue,
  onPeriodChange,
  workspaceOptions,
  workspaceValue,
  onWorkspaceChange,
  onExportCsv,
  isExporting = false,
}) => (
  <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
    <div className="min-w-0 space-y-1">
      <h1 className="text-2xl font-black tracking-tight text-stone-900 sm:text-3xl dark:text-white">
        Laporan Saya
      </h1>
      <p className="text-sm text-stone-500 dark:text-stone-400">
        {workspaceNames.length > 0
          ? `Semua kerjaan kamu di ${workspaceNames.length} workspace — ${workspaceNames.join(', ')}`
          : 'Semua kerjaan kamu di workspace yang kamu ikuti'}
      </p>
    </div>
    <div className="flex flex-wrap gap-2">
      <div className="w-full min-[420px]:w-44">
        <Select
          aria-label="Periode laporan"
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
      {onExportCsv && (
        <Button
          variant="outline"
          leftIcon={<Download className="h-4 w-4" />}
          onClick={onExportCsv}
          isLoading={isExporting}
          className="min-h-[44px]"
        >
          Export CSV
        </Button>
      )}
    </div>
  </header>
);
