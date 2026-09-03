import { z } from 'zod';

/**
 * Validates date string in YYYY-MM-DD format and ensures it is a valid calendar date.
 */
export const DateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  .refine((val) => {
    const date = new Date(val);
    if (isNaN(date.getTime())) return false;
    return val === date.toISOString().slice(0, 10);
  }, 'Invalid calendar date');

export type DateString = z.infer<typeof DateStringSchema>;

/**
 * Date filter preset values for task listing views.
 * Daily (today), weekly (this_week / week), monthly (this_month / month), and overdue views.
 */
export const TaskDatePresetSchema = z.enum([
  'today',
  'this_week',
  'week',
  'this_month',
  'month',
  'overdue',
]);

export type TaskDatePreset = z.infer<typeof TaskDatePresetSchema>;

/**
 * Common refinement function for validating date preset and start/end dates.
 */
export function refineDateFilter(
  data: { datePreset?: TaskDatePreset; startDate?: string; endDate?: string },
  ctx: z.RefinementCtx,
): void {
  if (data.datePreset && (data.startDate || data.endDate)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Cannot combine datePreset with explicit startDate or endDate',
      path: ['datePreset'],
    });
  }

  if (data.startDate && data.endDate && data.startDate > data.endDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'startDate cannot be after endDate',
      path: ['endDate'],
    });
  }
}

/**
 * Base date filter input schema with combination refinements.
 */
export const TaskDateFilterSchema = z
  .object({
    datePreset: TaskDatePresetSchema.optional(),
    startDate: DateStringSchema.optional(),
    endDate: DateStringSchema.optional(),
  })
  .superRefine(refineDateFilter);

export type TaskDateFilter = z.infer<typeof TaskDateFilterSchema>;
