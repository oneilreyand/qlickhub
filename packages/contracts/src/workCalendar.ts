import { z } from 'zod';

/**
 * WORK-FOUNDATION P2 (ADR-044): Workspace work calendar.
 * Working days use ISO weekday numbers: 1 = Monday … 7 = Sunday.
 */
export const DEFAULT_WORKSPACE_TIMEZONE = 'Asia/Jakarta';
export const DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5] as const;

export const IsoWeekdaySchema = z.number().int().min(1).max(7);

export function isValidIanaTimeZone(value: string): boolean {
  if (!value || value.length > 64) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

const IsoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal harus berformat YYYY-MM-DD')
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, 'Tanggal tidak valid');

export const WorkspaceHolidaySchema = z.object({
  id: z.string().uuid(),
  date: IsoDateSchema,
  name: z.string(),
});
export type WorkspaceHoliday = z.infer<typeof WorkspaceHolidaySchema>;

export const WorkCalendarSchema = z.object({
  workspaceId: z.string().uuid(),
  timezone: z.string(),
  workingDays: z.array(IsoWeekdaySchema),
  holidays: z.array(WorkspaceHolidaySchema),
});
export type WorkCalendar = z.infer<typeof WorkCalendarSchema>;

export const UpdateWorkCalendarSchema = z.object({
  timezone: z
    .string()
    .trim()
    .refine(isValidIanaTimeZone, 'Zona waktu tidak dikenal (gunakan nama IANA, mis. Asia/Jakarta)'),
  workingDays: z
    .array(IsoWeekdaySchema)
    .min(1, 'Pilih minimal satu hari kerja')
    .max(7)
    .refine((days) => new Set(days).size === days.length, 'Hari kerja tidak boleh berulang')
    .transform((days) => [...days].sort((a, b) => a - b)),
});
export type UpdateWorkCalendarInput = z.infer<typeof UpdateWorkCalendarSchema>;

export const CreateWorkspaceHolidaySchema = z.object({
  date: IsoDateSchema,
  name: z.string().trim().min(1, 'Nama hari libur wajib diisi').max(120),
});
export type CreateWorkspaceHolidayInput = z.infer<typeof CreateWorkspaceHolidaySchema>;
