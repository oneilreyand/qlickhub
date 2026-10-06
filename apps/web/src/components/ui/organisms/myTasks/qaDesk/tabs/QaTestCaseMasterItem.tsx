import React from 'react';
import { AlertTriangle, CheckCircle2, Play, XCircle } from 'lucide-react';
import type { TaskTestExecutionWorkspace, TestCaseVersionCoverageSummary } from '@qlick/contracts';

import { Badge } from '../../../../atoms/Badge';

export interface QaTestCaseMasterItemProps {
  execution: TaskTestExecutionWorkspace['executions'][number];
  isSelected: boolean;
  onSelect: () => void;
  versionCoverage?: TestCaseVersionCoverageSummary | null;
}

export const QaTestCaseMasterItem: React.FC<QaTestCaseMasterItemProps> = ({
  execution,
  isSelected,
  onSelect,
  versionCoverage,
}) => {
  const { testCase, latestRun, testRuns } = execution;

  return (
    <button
      type="button"
      key={testCase.id}
      onClick={onSelect}
      aria-selected={isSelected}
      aria-label={`Pilih Test Case ${testCase.title}`}
      className={`w-full text-left p-3 rounded-xl border transition-all ${
        isSelected
          ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 dark:border-emerald-500/80 shadow-xs ring-1 ring-emerald-500/30'
          : 'border-stone-200 bg-white hover:bg-stone-50/80 dark:border-stone-800 dark:bg-stone-900/50 dark:hover:bg-stone-800/60'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {latestRun?.result?.status === 'passed' ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : latestRun?.result?.status === 'failed' ? (
            <XCircle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
          ) : latestRun?.result?.status === 'blocked' ? (
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
          ) : latestRun?.status === 'in_progress' ? (
            <Play className="h-3.5 w-3.5 text-sky-500 dark:text-sky-400 shrink-0" />
          ) : (
            <div className="h-2 w-2 rounded-full bg-stone-300 dark:bg-stone-600 shrink-0 mx-1" />
          )}
          <span className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
            {testCase.externalReference ? `${testCase.externalReference} · ` : 'TC · '}
            {testCase.title}
          </span>
        </div>
        <Badge
          variant={
            testCase.status === 'active'
              ? 'brand'
              : testCase.status === 'in_review'
                ? 'review'
                : testCase.status === 'draft'
                  ? 'draft'
                  : 'neutral'
          }
          size="sm"
          className="shrink-0"
        >
          {testCase.status === 'active'
            ? 'Aktif'
            : testCase.status === 'in_review'
              ? 'Review PO'
              : testCase.status === 'draft'
                ? 'Draf'
                : testCase.status}
        </Badge>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400">
        <span className="capitalize">{testCase.testType}</span>
        <span>•</span>
        <span className="capitalize">{testCase.priority}</span>
        {testRuns.length > 0 && (
          <>
            <span>•</span>
            <span>
              {testRuns.length} run{testRuns.length > 1 ? 's' : ''}
            </span>
          </>
        )}
        {versionCoverage && (
          <>
            <span>•</span>
            <span>
              Rev {versionCoverage.revision} (AC {versionCoverage.mappedCount} dipetakan)
            </span>
          </>
        )}
      </div>
    </button>
  );
};
