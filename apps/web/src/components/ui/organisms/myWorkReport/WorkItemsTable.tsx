import React, { useMemo, useState } from 'react';
import { Select } from '../../atoms/Select';
import type { WorkItemRow, WorkPunctuality } from './types';
import { PUNCTUALITY_ORDER, PUNCTUALITY_SHORT_LABEL } from './labels';
import { EffortChip, PunctualityPill } from './PunctualityPill';

type GroupBy = 'none' | 'workspace';

const FAIRNESS_CLASS: Record<WorkItemRow['timeFairness'], string> = {
  tight: 'text-rose-700 dark:text-rose-400',
  fair: 'text-stone-700 dark:text-stone-300',
  loose: 'text-stone-700 dark:text-stone-300',
  unknown: 'text-stone-500 dark:text-stone-400',
};

export interface WorkItemsTableProps {
  items: WorkItemRow[];
  onOpenItem?: (id: string) => void;
  /** Controlled status filter (so Export CSV can use the same filter); uncontrolled when absent. */
  statusFilter?: 'all' | WorkPunctuality;
  onStatusFilterChange?: (value: 'all' | WorkPunctuality) => void;
}

export const WorkItemsTable: React.FC<WorkItemsTableProps> = ({
  items,
  onOpenItem,
  statusFilter: controlledFilter,
  onStatusFilterChange,
}) => {
  const [localFilter, setLocalFilter] = useState<'all' | WorkPunctuality>('all');
  const statusFilter = controlledFilter ?? localFilter;
  const setStatusFilter = (value: 'all' | WorkPunctuality) => {
    setLocalFilter(value);
    onStatusFilterChange?.(value);
  };
  const [groupBy, setGroupBy] = useState<GroupBy>('none');

  const filtered = useMemo(
    () =>
      statusFilter === 'all' ? items : items.filter((item) => item.punctuality === statusFilter),
    [items, statusFilter],
  );

  const groups = useMemo(() => {
    if (groupBy === 'none') return [{ key: 'all', label: null as string | null, rows: filtered }];
    const map = new Map<string, { key: string; label: string | null; rows: WorkItemRow[] }>();
    for (const row of filtered) {
      const group = map.get(row.workspaceId) ?? {
        key: row.workspaceId,
        label: row.workspaceName,
        rows: [],
      };
      group.rows.push(row);
      map.set(row.workspaceId, group);
    }
    return [...map.values()];
  }, [filtered, groupBy]);

  return (
    <section
      aria-labelledby="my-report-items-title"
      className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-xs dark:border-stone-800/80 dark:bg-[#1C1A19]"
    >
      <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <h2 id="my-report-items-title" className="text-lg font-bold text-stone-900 dark:text-white">
          Semua kerjaan ({items.length})
        </h2>
        <div className="flex flex-wrap gap-2">
          <div className="w-full min-[420px]:w-44">
            <Select
              aria-label="Filter ketepatan"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'all' | WorkPunctuality)}
            >
              <option value="all">Status: Semua</option>
              {PUNCTUALITY_ORDER.map((key) => (
                <option key={key} value={key}>
                  Status: {PUNCTUALITY_SHORT_LABEL[key]}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-full min-[420px]:w-56">
            <Select
              aria-label="Kelompokkan"
              value={groupBy}
              onChange={(event) => setGroupBy(event.target.value as GroupBy)}
            >
              <option value="none">Kelompokkan: Tidak ada</option>
              <option value="workspace">Kelompokkan: Workspace</option>
            </Select>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="border-t border-stone-100 px-5 py-8 text-center text-sm text-stone-500 dark:border-stone-800 dark:text-stone-400">
          {items.length === 0
            ? 'Belum ada kerjaan di periode ini.'
            : 'Tidak ada kerjaan dengan status ini.'}
        </p>
      ) : (
        <div
          className="overflow-x-auto"
          tabIndex={0}
          aria-label="Tabel kerjaan, geser untuk melihat semua kolom"
        >
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="text-xs font-medium text-stone-500 dark:text-stone-400">
              <tr>
                <th scope="col" className="px-5 py-2 font-medium">
                  Kerjaan
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Workspace
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Effort
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Jadwal
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Status
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Ketepatan
                </th>
                <th scope="col" className="px-5 py-2 font-medium">
                  Kewajaran waktu
                </th>
              </tr>
            </thead>
            {groups.map((group) => (
              <tbody
                key={group.key}
                className="divide-y divide-stone-100 border-t border-stone-100 dark:divide-stone-800 dark:border-stone-800"
              >
                {group.label && (
                  <tr className="bg-stone-50 dark:bg-stone-900/60">
                    <th
                      scope="colgroup"
                      colSpan={7}
                      className="px-5 py-2 text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400"
                    >
                      {group.label} · {group.rows.length}
                    </th>
                  </tr>
                )}
                {group.rows.map((row) => (
                  <tr key={row.id}>
                    <th scope="row" className="px-5 py-3 font-normal">
                      {onOpenItem ? (
                        <button
                          type="button"
                          onClick={() => onOpenItem(row.id)}
                          className="text-left font-semibold text-stone-900 hover:underline dark:text-white"
                        >
                          {row.title}
                        </button>
                      ) : (
                        <span className="font-semibold text-stone-900 dark:text-white">
                          {row.title}
                        </span>
                      )}
                      <span className="block text-xs text-stone-500 dark:text-stone-400">
                        {row.featureName}
                      </span>
                    </th>
                    <td className="px-3 py-3 text-stone-700 dark:text-stone-300">
                      {row.workspaceName}
                    </td>
                    <td className="px-3 py-3">
                      <EffortChip effort={row.effort} />
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-stone-700 dark:text-stone-300">
                      {row.scheduleLabel ?? 'Belum dijadwalkan'}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-stone-700 dark:text-stone-300">
                      {row.statusLabel}
                    </td>
                    <td className="px-3 py-3">
                      <PunctualityPill punctuality={row.punctuality} className="rounded-full">
                        {PUNCTUALITY_SHORT_LABEL[row.punctuality]}
                      </PunctualityPill>
                    </td>
                    <td
                      className={`px-5 py-3 whitespace-nowrap ${FAIRNESS_CLASS[row.timeFairness]}`}
                    >
                      {row.timeFairnessLabel}
                    </td>
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      )}
    </section>
  );
};
