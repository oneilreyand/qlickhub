import React from 'react';
import { CheckSquare, ChevronRight, FileCheck, Plus, Upload } from 'lucide-react';
import type {
  QaTestCycle,
  QaWorkflowSummary,
  Task,
  TaskTestExecutionWorkspace,
  TestCaseVersionCoverageSummary,
} from '@qlick/contracts';

import { Alert } from '../../../../atoms/Alert';
import { Button } from '../../../../atoms/Button';
import { Card } from '../../../../atoms/Card';
import { Select } from '../../../../atoms/Select';
import { Skeleton } from '../../../../atoms/Skeleton';
import { EmptyState } from '../../../../molecules/EmptyState';
import { QaExecutionFilterToolbar } from '../../../../molecules/QaExecutionFilterToolbar';
import { QaTestCaseMasterItem } from './QaTestCaseMasterItem';
import { QaTestCaseDetailView, QaTestCaseDetailViewProps } from './QaTestCaseDetailView';

export interface QaTestCaseExecutionTabProps {
  subtask: Task;
  parentTask?: Task | null;
  workflowSummary: QaWorkflowSummary | null;
  focusTarget?: 'test_cases' | 'qa_sign_off' | null;
  testCasesRef: React.RefObject<HTMLElement>;
  onOpenContextTab: () => void;
  canAuthorTests: boolean;
  onOpenImportWizard: () => void;
  onOpenTestCaseForm: () => void;
  isLoadingRequirementOptions: boolean;
  requirementOptions: Array<{ id: string; code: string; title: string }>;
  isLoadingTestCycles: boolean;
  selectedTestCycle?: QaTestCycle | null;
  testCycles: QaTestCycle[];
  selectedTestCycleId: string;
  onSelectTestCycleId: (id: string) => void;
  canExecuteTests: boolean;
  onOpenTestCycleModal: () => void;
  testCycleError: string | null;
  isTestCycleModalOpen: boolean;
  isLoadingExecutions: boolean;
  executionPermissionDenied: boolean;
  executionError: string | null;
  onReloadExecutions: () => void;
  executionWorkspace: TaskTestExecutionWorkspace | null;
  requirementOptionsError: string | null;
  isPlanner: boolean;
  normalizedUserRole: string;
  assignedQaDisplayName: string;
  executionStats: {
    total: number;
    passed: number;
    failed: number;
    blocked: number;
    unexecuted: number;
  };
  filterOptions: Array<{
    id: 'all' | 'unexecuted' | 'passed' | 'failed' | 'blocked';
    label: string;
    count: number;
  }>;
  statusFilter: 'all' | 'unexecuted' | 'passed' | 'failed' | 'blocked';
  onStatusFilterChange: (status: 'all' | 'unexecuted' | 'passed' | 'failed' | 'blocked') => void;
  viewMode: 'split' | 'list';
  onViewModeChange: (mode: 'split' | 'list') => void;
  filteredExecutions: TaskTestExecutionWorkspace['executions'];
  activeSelectedTestCaseId: string | null;
  onSelectTestCaseId: (id: string) => void;
  versionCoverageByTestCaseId: Record<string, TestCaseVersionCoverageSummary | null>;
  activeExecution: TaskTestExecutionWorkspace['executions'][number] | null;
  detailViewProps: Omit<QaTestCaseDetailViewProps, 'execution'>;
}

export const QaTestCaseExecutionTab: React.FC<QaTestCaseExecutionTabProps> = ({
  subtask,
  parentTask,
  workflowSummary,
  focusTarget,
  testCasesRef,
  onOpenContextTab,
  canAuthorTests,
  onOpenImportWizard,
  onOpenTestCaseForm,
  isLoadingRequirementOptions,
  requirementOptions,
  isLoadingTestCycles,
  selectedTestCycle,
  testCycles,
  selectedTestCycleId,
  onSelectTestCycleId,
  canExecuteTests,
  onOpenTestCycleModal,
  testCycleError,
  isTestCycleModalOpen,
  isLoadingExecutions,
  executionPermissionDenied,
  executionError,
  onReloadExecutions,
  executionWorkspace,
  requirementOptionsError,
  isPlanner,
  normalizedUserRole,
  assignedQaDisplayName,
  executionStats,
  filterOptions,
  statusFilter,
  onStatusFilterChange,
  viewMode,
  onViewModeChange,
  filteredExecutions,
  activeSelectedTestCaseId,
  onSelectTestCaseId,
  versionCoverageByTestCaseId,
  activeExecution,
  detailViewProps,
}) => {
  return (
    <section
      role="tabpanel"
      id="qa-workflow-panel-preparation"
      aria-label="Persiapan dan eksekusi QA"
      className="space-y-4"
    >
      {/* Quick Context Summary Banner for QA */}
      {(subtask.description || parentTask?.description) && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-stone-200 bg-stone-50/70 dark:border-stone-800 dark:bg-stone-900/40 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <FileCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-stone-600 dark:text-stone-400 truncate">
              <strong className="text-stone-900 dark:text-stone-100">
                {workflowSummary?.featureTitle || parentTask?.title || 'Feature'}:
              </strong>{' '}
              {subtask.title}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenContextTab}
            className="text-xs shrink-0 font-bold"
            rightIcon={<ChevronRight className="h-3.5 w-3.5" />}
          >
            Lihat Spesifikasi &amp; Prasyarat
          </Button>
        </div>
      )}
      <Card
        ref={testCasesRef}
        id="qa-test-cases"
        tabIndex={focusTarget === 'test_cases' ? -1 : undefined}
        className="p-5 border-stone-200/80 dark:border-stone-800 space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-3 dark:border-stone-800">
          <div>
            <div className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm font-extrabold text-stone-900 dark:text-stone-100">
                Pengelolaan &amp; Eksekusi Test Case
              </h3>
            </div>
            <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
              Pembuatan manual dan impor spreadsheet yang tertaut ke Requirement Feature.
            </p>
          </div>

          {canAuthorTests && (
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenImportWizard}
                leftIcon={<Upload className="h-3.5 w-3.5" />}
              >
                Impor Spreadsheet
              </Button>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={onOpenTestCaseForm}
                  disabled={isLoadingRequirementOptions || requirementOptions.length === 0}
                  title={
                    isLoadingRequirementOptions
                      ? 'Memuat Requirement tertaut'
                      : 'Tautkan minimal satu Requirement aktif ke Feature sebelum membuat Test Case.'
                  }
                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                >
                  Test Case Baru
                </Button>
                {!isLoadingRequirementOptions && requirementOptions.length === 0 && (
                  <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                    Tautkan minimal 1 Requirement aktif
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-3 dark:border-stone-800 dark:bg-stone-950/40">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-stone-500">
                Siklus Pengujian / Kandidat
              </p>
              {isLoadingTestCycles ? (
                <Skeleton className="mt-1 h-4 w-56" />
              ) : selectedTestCycle ? (
                <p className="mt-1 text-xs font-semibold text-stone-800 dark:text-stone-200">
                  Siklus aktif · {selectedTestCycle.build} · {selectedTestCycle.environment}
                </p>
              ) : (
                <p className="mt-1 text-xs text-stone-600 dark:text-stone-400">
                  Belum ada Siklus Pengujian aktif. Pengujian baru tidak dapat memakai konteks
                  kandidat yang ambigu.
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {testCycles.length > 0 && (
                <Select
                  value={selectedTestCycleId}
                  onChange={(event) => onSelectTestCycleId(event.target.value)}
                  aria-label="Pilih Siklus Pengujian"
                  className="min-w-52"
                >
                  <option value="">Pilih Siklus Pengujian</option>
                  {testCycles.map((cycle) => (
                    <option key={cycle.id} value={cycle.id}>
                      {cycle.build} · {cycle.environment}
                    </option>
                  ))}
                </Select>
              )}
              {canExecuteTests && (
                <Button variant="outline" size="sm" onClick={onOpenTestCycleModal}>
                  Buat Siklus Pengujian
                </Button>
              )}
            </div>
          </div>
          {testCycleError && !isTestCycleModalOpen && (
            <Alert tone="warning" title="Konteks Siklus Pengujian belum tersedia">
              {testCycleError}
            </Alert>
          )}
        </div>

        {isLoadingExecutions ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
        ) : executionPermissionDenied ? (
          <Alert tone="warning" title="Akses pengelolaan pengujian dibatasi">
            Peran Workspace Anda tidak dapat melihat Test Case yang tersimpan dalam konteks ini.
            Hubungi Product Owner, Admin, atau Pemilik Workspace untuk meminta akses.
          </Alert>
        ) : executionError ? (
          <Alert tone="error" title="Eksekusi pengujian tidak dapat dimuat">
            <div className="space-y-2">
              <p>{executionError}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={onReloadExecutions}
                aria-label="Muat ulang eksekusi pengujian"
              >
                Muat ulang eksekusi
              </Button>
            </div>
          </Alert>
        ) : !executionWorkspace || executionWorkspace.executions.length === 0 ? (
          <div className="space-y-3">
            {requirementOptionsError ? (
              <Alert tone="error" title="Requirement tertaut tidak dapat dimuat">
                {requirementOptionsError}
              </Alert>
            ) : !isLoadingRequirementOptions && requirementOptions.length === 0 ? (
              <Alert tone="info" title="Tautkan Requirement sebelum membuat Test Case">
                {isPlanner
                  ? 'Feature ini belum memiliki Requirement aktif yang tertaut. Tautkan minimal satu Requirement aktif ke Feature ini dari panel Requirement agar QA dapat menyusun Test Case.'
                  : 'Feature ini belum memiliki Requirement aktif yang tertaut. Hubungi Product Owner atau Admin untuk menautkan Requirement ke Feature ini agar Anda dapat menyusun Test Case.'}
              </Alert>
            ) : null}
            <EmptyState
              icon={<CheckSquare className="h-6 w-6" />}
              title="Belum ada Test Case yang tertaut ke Feature ini"
              description="Buat Test Case baru atau impor baris CSV/XLSX yang tertaut ke Requirement."
            />
          </div>
        ) : (
          <div className="space-y-4">
            {!canExecuteTests && (
              <Alert tone="info" title="Pengujian hanya dapat dilihat">
                {normalizedUserRole === 'qa'
                  ? `Ditugaskan ke ${assignedQaDisplayName} — minta penugasan ke Product Owner untuk menjalankan atau memperbarui pengujian.`
                  : 'Peran Anda dapat melihat Test Case dan riwayat pengujian. Hanya QA yang ditugaskan yang dapat memulai pengujian, mencatat hasil, dan menambahkan bukti.'}
              </Alert>
            )}

            <QaExecutionFilterToolbar
              stats={executionStats}
              filterOptions={filterOptions}
              statusFilter={statusFilter}
              onStatusFilterChange={onStatusFilterChange}
              viewMode={viewMode}
              onViewModeChange={onViewModeChange}
            />

            {/* Test Cases Layout (Split or List) */}
            {viewMode === 'split' ? (
              filteredExecutions.length === 0 ? (
                <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-6 text-center dark:border-stone-800 dark:bg-stone-900/40">
                  <p className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                    Tidak ada Test Case dengan status pengujian &quot;{statusFilter}&quot;.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => onStatusFilterChange('all')}
                  >
                    Tampilkan Semua Test Case
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                  {/* Master List Column */}
                  <div className="lg:col-span-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between px-1 text-xs font-bold text-stone-600 dark:text-stone-400">
                      <span>Daftar Kasus ({filteredExecutions.length})</span>
                      <span className="text-xs font-normal text-stone-400">
                        Pilih untuk eksekusi
                      </span>
                    </div>
                    <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
                      {filteredExecutions.map((execution) => (
                        <QaTestCaseMasterItem
                          key={execution.testCase.id}
                          execution={execution}
                          isSelected={activeSelectedTestCaseId === execution.testCase.id}
                          onSelect={() => onSelectTestCaseId(execution.testCase.id)}
                          versionCoverage={versionCoverageByTestCaseId[execution.testCase.id]}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Detail Pane Column */}
                  <div className="lg:col-span-8 min-w-0">
                    {activeExecution ? (
                      <QaTestCaseDetailView execution={activeExecution} {...detailViewProps} />
                    ) : (
                      <EmptyState
                        icon={<CheckSquare className="h-6 w-6" />}
                        title="Pilih Test Case"
                        description="Pilih salah satu Test Case dari daftar di sebelah kiri untuk melihat detail atau menjalankan pengujian."
                      />
                    )}
                  </div>
                </div>
              )
            ) : (
              <div className="space-y-4">
                {filteredExecutions.length === 0 ? (
                  <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-6 text-center dark:border-stone-800 dark:bg-stone-900/40">
                    <p className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                      Tidak ada Test Case dengan status pengujian &quot;{statusFilter}&quot;.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => onStatusFilterChange('all')}
                    >
                      Tampilkan Semua Test Case
                    </Button>
                  </div>
                ) : (
                  filteredExecutions.map((execution) => (
                    <QaTestCaseDetailView
                      key={execution.testCase.id}
                      execution={execution}
                      {...detailViewProps}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </Card>
    </section>
  );
};
