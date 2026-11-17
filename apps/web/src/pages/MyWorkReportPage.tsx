import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { MyWorkReport } from '@qlick/contracts';
import {
  MyWorkReportHeader,
  MyWorkReportView,
  type MyWorkReportState,
  type WorkPunctuality,
} from '../components/ui/organisms/myWorkReport';
import { Modal } from '../components/ui/molecules/Modal';
import { mapMyWorkReport, formatDayMonth } from '../features/myWork/mapMyWorkReport';
import { buildReportPeriods } from '../features/myWork/reportPeriods';
import { myWorkReportService } from '../lib/api/myWorkReportService';
import { useAppDispatch } from '../store/hooks';
import { enqueueSnackbar } from '../store/uiSlice';

/**
 * MY-WORK-REPORT P1/P2: "Laporan Saya" — the signed-in person's own work across their active
 * Workspaces. Everything shown is computed by the backend.
 */
export const MyWorkReportPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const periods = useMemo(() => buildReportPeriods(), []);
  const [periodValue, setPeriodValue] = useState(periods[0].value);
  const [workspaceValue, setWorkspaceValue] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | WorkPunctuality>('all');
  const [report, setReport] = useState<MyWorkReport | null>(null);
  const [state, setState] = useState<MyWorkReportState>({ status: 'loading' });
  const [isExporting, setIsExporting] = useState(false);
  const [showCauses, setShowCauses] = useState(false);

  const period = periods.find((option) => option.value === periodValue) ?? periods[0];
  const filter = useMemo(
    () => ({
      from: period.from,
      to: period.to,
      workspaceId: workspaceValue === 'all' ? undefined : workspaceValue,
    }),
    [period.from, period.to, workspaceValue],
  );

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const data = await myWorkReportService.get(filter);
      setReport(data);
      setState(
        data.workspaces.length === 0
          ? { status: 'denied' }
          : { status: 'ready', data: mapMyWorkReport(data) },
      );
    } catch (error) {
      setReport(null);
      setState({
        status: 'error',
        message: error instanceof Error ? error.message : 'Laporan gagal dimuat.',
      });
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleRows = report
    ? report.items.filter((item) => statusFilter === 'all' || item.punctuality === statusFilter)
        .length
    : 0;

  const exportCsv = async () => {
    setIsExporting(true);
    try {
      const blob = await myWorkReportService.downloadCsv({
        ...filter,
        punctuality: statusFilter === 'all' ? undefined : statusFilter,
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `laporan-saya-${filter.from}_${filter.to}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      dispatch(
        enqueueSnackbar(error instanceof Error ? error.message : 'CSV gagal diunduh.', 'error'),
      );
    } finally {
      setIsExporting(false);
    }
  };

  const openItem = (id: string) => {
    const item = report?.items.find((row) => row.taskId === id);
    navigate(item?.kind === 'feature' ? `/work/features/${id}` : `/work/subtasks/${id}`);
  };

  const titleOf = new Map(report?.items.map((item) => [item.taskId, item]) ?? []);
  const overDays = report?.load.days.filter((day) => day.totalPercent > 100) ?? [];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 px-4 py-6 sm:px-6">
      <MyWorkReportHeader
        workspaceNames={report?.workspaces.map((ws) => ws.name) ?? []}
        periodOptions={periods.map((option) => ({
          value: option.value,
          label: `${formatDayMonth(option.from)} – ${formatDayMonth(option.to)}`,
        }))}
        periodValue={periodValue}
        onPeriodChange={setPeriodValue}
        workspaceOptions={[
          { value: 'all', label: 'Semua workspace' },
          ...(report?.workspaces.map((ws) => ({ value: ws.id, label: ws.name })) ?? []),
        ]}
        workspaceValue={workspaceValue}
        onWorkspaceChange={setWorkspaceValue}
        onExportCsv={() => void exportCsv()}
        exportDisabled={state.status !== 'ready' || visibleRows === 0}
        isExporting={isExporting}
      />
      <MyWorkReportView
        state={state}
        onRetry={() => void load()}
        onOpenItem={openItem}
        onSeeConflictCause={() => setShowCauses(true)}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
      />
      <Modal
        isOpen={showCauses}
        onClose={() => setShowCauses(false)}
        title="Penyebab beban berlebih"
        description="Kerjaan yang menyumbang beban pada hari yang melebihi kapasitas, terbesar lebih dulu."
      >
        <ul className="space-y-3">
          {overDays.map((day) => (
            <li key={day.date}>
              <p className="text-sm font-bold text-stone-900 dark:text-stone-100">
                {formatDayMonth(day.date)} · {day.totalPercent}%
              </p>
              <ul className="mt-1 space-y-1">
                {day.causeTaskIds.map((taskId) => {
                  const item = titleOf.get(taskId);
                  return (
                    <li key={taskId} className="text-sm text-stone-700 dark:text-stone-300">
                      {item ? (
                        <button
                          type="button"
                          className="text-left underline-offset-2 hover:underline"
                          onClick={() => {
                            setShowCauses(false);
                            openItem(taskId);
                          }}
                        >
                          {item.title}
                        </button>
                      ) : (
                        'Kerjaan di luar daftar periode ini'
                      )}
                      {item && (
                        <span className="text-stone-500 dark:text-stone-400">
                          {' '}
                          · {item.workspaceName}
                          {item.effort ? ` · ${item.effort.toUpperCase()}` : ''}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      </Modal>
    </div>
  );
};
