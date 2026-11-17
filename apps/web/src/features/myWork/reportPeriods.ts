/** MY-WORK-REPORT P1: period presets, computed from the viewer's local calendar date. */

export interface ReportPeriod {
  value: string;
  label: string;
  from: string;
  to: string;
}

const iso = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;

const shift = (date: Date, days: number) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

export function buildReportPeriods(today: Date = new Date()): ReportPeriod[] {
  const day = today.getDay() === 0 ? 7 : today.getDay();
  const monday = shift(today, 1 - day);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
  return [
    {
      value: 'this_2w',
      label: 'Minggu ini + depan',
      from: iso(monday),
      to: iso(shift(monday, 13)),
    },
    {
      value: 'last_2w',
      label: '2 minggu lalu',
      from: iso(shift(monday, -14)),
      to: iso(shift(monday, -1)),
    },
    { value: 'this_month', label: 'Bulan ini', from: iso(monthStart), to: iso(monthEnd) },
    {
      value: 'last_month',
      label: 'Bulan lalu',
      from: iso(lastMonthStart),
      to: iso(lastMonthEnd),
    },
  ];
}
