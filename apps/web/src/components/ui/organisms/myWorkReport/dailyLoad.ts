import type { DailyLoadDay, ReportWorkspace } from './types';

export function dayTotalPercent(day: DailyLoadDay): number {
  return day.segments.reduce((sum, segment) => sum + segment.percent, 0);
}

export function dayAriaLabel(day: DailyLoadDay, workspaces: ReportWorkspace[]): string {
  const total = dayTotalPercent(day);
  const parts = day.segments
    .filter((segment) => segment.percent > 0)
    .map((segment) => {
      const name = workspaces.find((ws) => ws.id === segment.workspaceId)?.name ?? 'Workspace lain';
      return `${name} ${segment.percent}%`;
    });
  const over = total > 100 ? ', bentrok: melebihi kapasitas' : '';
  return `${day.weekdayLabel} ${day.dayOfMonthLabel}: ${total}% dari kapasitas${over}${
    parts.length ? ` (${parts.join(', ')})` : ''
  }`;
}
