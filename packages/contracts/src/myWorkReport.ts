import { z } from 'zod';
import { CapacitySourceSchema } from './capacity.js';
import { TaskEffortSchema, TaskStatusSchema } from './task.js';
import { IsoDateSchema } from './workCalendar.js';

/**
 * MY-WORK-REPORT P1 + P2 (ADR-044): the caller's own work across their active Workspaces.
 * Everything is computed by the backend with the calendar of each task's Workspace.
 */

export const WORK_PUNCTUALITIES = [
  'on_time',
  'finished_late',
  'late',
  'at_risk',
  'on_track',
  'unscheduled',
] as const;
export const WorkPunctualitySchema = z.enum(WORK_PUNCTUALITIES);
export type WorkPunctuality = z.infer<typeof WorkPunctualitySchema>;

/** Longest period one report may cover (performance guard, breakdown §3). */
export const MY_WORK_REPORT_MAX_DAYS = 92;

export const WorkRiskReasonSchema = z.enum([
  'due_soon_not_started',
  'time_mostly_used_not_started',
  'open_blocker',
  'completion_date_unknown',
]);
export type WorkRiskReason = z.infer<typeof WorkRiskReasonSchema>;

export const MyWorkItemSchema = z.object({
  taskId: z.string().uuid(),
  kind: z.enum(['subtask', 'feature']),
  title: z.string(),
  featureId: z.string().uuid().nullable(),
  featureName: z.string().nullable(),
  workspaceId: z.string().uuid(),
  workspaceName: z.string(),
  status: TaskStatusSchema,
  effort: TaskEffortSchema.nullable(),
  startDate: z.string().nullable(),
  dueDate: z.string().nullable(),
  /** Completion date in the Workspace time zone. */
  completedDate: z.string().nullable(),
  punctuality: WorkPunctualitySchema,
  /** Calendar days past due (late or finished late). */
  daysLate: z.number().int().nullable(),
  reasons: z.array(WorkRiskReasonSchema),
  openBlockerCount: z.number().int().min(0),
});
export type MyWorkItem = z.infer<typeof MyWorkItemSchema>;

export const MyWorkLoadDaySchema = z.object({
  date: z.string(),
  segments: z.array(z.object({ workspaceId: z.string().uuid(), percent: z.number().int() })),
  totalPercent: z.number().int(),
  /** Tasks contributing on this day, largest share first (only listed when over 100%). */
  causeTaskIds: z.array(z.string().uuid()),
});
export type MyWorkLoadDay = z.infer<typeof MyWorkLoadDaySchema>;

export const MyWorkLoadSchema = z.object({
  weeklyCapacityPoints: z.number().int(),
  capacitySource: CapacitySourceSchema,
  dailyCapacityPoints: z.number(),
  days: z.array(MyWorkLoadDaySchema),
  /** Scheduled Subtasks without effort: shown as "beban belum diukur", never counted as 0. */
  unmeasuredTaskIds: z.array(z.string().uuid()),
  /** Time-off dates inside the period (not counted as working days). */
  timeOffDates: z.array(z.string()),
});
export type MyWorkLoad = z.infer<typeof MyWorkLoadSchema>;

export const MyWorkReportSchema = z.object({
  generatedAt: z.string(),
  period: z.object({ from: z.string(), to: z.string() }),
  workspaces: z.array(z.object({ id: z.string().uuid(), name: z.string() })),
  counts: z.record(WorkPunctualitySchema, z.number().int().min(0)),
  items: z.array(MyWorkItemSchema),
  load: MyWorkLoadSchema,
});
export type MyWorkReport = z.infer<typeof MyWorkReportSchema>;

export const MyWorkReportQuerySchema = z
  .object({
    from: IsoDateSchema,
    to: IsoDateSchema,
    workspaceId: z.string().uuid().optional(),
    punctuality: WorkPunctualitySchema.optional(),
    format: z.enum(['json', 'csv']).optional(),
  })
  .refine((value) => value.to >= value.from, {
    message: 'Tanggal akhir tidak boleh sebelum tanggal awal',
    path: ['to'],
  })
  .refine(
    (value) =>
      (Date.parse(`${value.to}T00:00:00Z`) - Date.parse(`${value.from}T00:00:00Z`)) / 86_400_000 <
      MY_WORK_REPORT_MAX_DAYS,
    { message: `Periode maksimal ${MY_WORK_REPORT_MAX_DAYS} hari`, path: ['to'] },
  );
export type MyWorkReportQuery = z.infer<typeof MyWorkReportQuerySchema>;
