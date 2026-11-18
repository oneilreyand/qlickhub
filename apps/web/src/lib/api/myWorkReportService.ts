import type { EffortBaseline, MyWorkReport, WorkPunctuality } from '@qlick/contracts';
import { apiClient, getHumanReadableApiErrorMessage } from './apiClient';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/v1';

export interface MyWorkReportFilter {
  from: string;
  to: string;
  workspaceId?: string;
  punctuality?: WorkPunctuality;
}

function toQuery(filter: MyWorkReportFilter, format?: 'csv'): string {
  const params = new URLSearchParams({ from: filter.from, to: filter.to });
  if (filter.workspaceId) params.set('workspaceId', filter.workspaceId);
  if (filter.punctuality) params.set('punctuality', filter.punctuality);
  if (format) params.set('format', format);
  return params.toString();
}

/** MY-WORK-REPORT P1: the caller's own report. */
export const myWorkReportService = {
  async get(filter: MyWorkReportFilter): Promise<MyWorkReport> {
    const res = await apiClient<{ data: MyWorkReport }>(`/me/work-report?${toQuery(filter)}`);
    return res.data;
  },

  /** MY-WORK-REPORT P3: median working days per effort in a Workspace (aggregates only). */
  async getEffortBaseline(workspaceId: string): Promise<EffortBaseline> {
    const res = await apiClient<{ data: EffortBaseline }>(
      `/workspaces/${workspaceId}/effort-baseline`,
    );
    return res.data;
  },

  /** CSV with the same rows as the filtered list (AC-1.4). */
  async downloadCsv(filter: MyWorkReportFilter): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/me/work-report?${toQuery(filter, 'csv')}`, {
      credentials: 'include',
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        code?: string;
        detail?: string;
      } | null;
      throw new Error(getHumanReadableApiErrorMessage(response.status, body?.code, body?.detail));
    }
    return response.blob();
  },
};
