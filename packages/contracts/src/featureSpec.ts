import { z } from 'zod';
import { DeliveryAreaSchema, TaskPrioritySchema } from './task.js';

/**
 * Feature Spec (ADR-036, P5a): one versioned specification per root Feature with three sections
 * (Plan, PRD, Tasks). The required-field rules live here so the server, the web UI, the AI
 * (P5b-P5d), and agents (P9) all use the same definition.
 */

const DateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the YYYY-MM-DD date format.');
const ShortTextSchema = z.string().max(200);
const LongTextSchema = z.string().max(5000);

export const FeatureSpecSectionSchema = z.enum(['plan', 'prd', 'tasks']);
export type FeatureSpecSection = z.infer<typeof FeatureSpecSectionSchema>;

export const FeatureSpecStatusSchema = z.enum(['plan', 'prd', 'task', 'applied']);
export type FeatureSpecStatus = z.infer<typeof FeatureSpecStatusSchema>;

export const FeatureSpecTargetPlatformSchema = z.enum(['web', 'mobile', 'web_mobile', 'api']);
export type FeatureSpecTargetPlatform = z.infer<typeof FeatureSpecTargetPlatformSchema>;

export const FeatureSpecAssignmentModeSchema = z.enum(['assigned', 'open']);
export type FeatureSpecAssignmentMode = z.infer<typeof FeatureSpecAssignmentModeSchema>;

export const FeatureSpecActorTypeSchema = z.enum(['user', 'agent']);
export type FeatureSpecActorType = z.infer<typeof FeatureSpecActorTypeSchema>;

// ---------------------------------------------------------------------------
// Section content (drafts may be incomplete; completeness is evaluated separately)
// ---------------------------------------------------------------------------

export const FeatureSpecPlanSchema = z.object({
  idea: LongTextSchema.optional(),
  title: ShortTextSchema.optional(),
  problem: LongTextSchema.optional(),
  targetUsers: LongTextSchema.optional(),
  goal: LongTextSchema.optional(),
  successMeasure: LongTextSchema.optional(),
  targetPlatform: FeatureSpecTargetPlatformSchema.nullable().optional(),
  priority: TaskPrioritySchema.nullable().optional(),
  startDate: DateOnlySchema.nullable().optional(),
  dueDate: DateOnlySchema.nullable().optional(),
});
export type FeatureSpecPlan = z.infer<typeof FeatureSpecPlanSchema>;

export const FeatureSpecAcceptanceCriterionSchema = z.object({
  given: LongTextSchema.optional(),
  when: LongTextSchema.optional(),
  then: LongTextSchema.optional(),
});
export type FeatureSpecAcceptanceCriterion = z.infer<typeof FeatureSpecAcceptanceCriterionSchema>;

export const FeatureSpecRequirementSchema = z.object({
  /** Stable key inside the Spec (for example "R1"); Tasks refer to it. */
  key: z.string().trim().min(1).max(40),
  title: ShortTextSchema.optional(),
  description: LongTextSchema.optional(),
  acceptanceCriteria: z.array(FeatureSpecAcceptanceCriterionSchema).max(50).optional(),
});
export type FeatureSpecRequirement = z.infer<typeof FeatureSpecRequirementSchema>;

export const FeatureSpecPrdSchema = z.object({
  brief: z
    .object({
      context: LongTextSchema.optional(),
      inScope: LongTextSchema.optional(),
      outScope: LongTextSchema.optional(),
    })
    .optional(),
  requirements: z.array(FeatureSpecRequirementSchema).max(100).optional(),
});
export type FeatureSpecPrd = z.infer<typeof FeatureSpecPrdSchema>;

export const FeatureSpecSubtaskSchema = z.object({
  key: z.string().trim().min(1).max(40),
  title: ShortTextSchema.optional(),
  description: LongTextSchema.optional(),
  deliveryArea: DeliveryAreaSchema.nullable().optional(),
  priority: TaskPrioritySchema.nullable().optional(),
  startDate: DateOnlySchema.nullable().optional(),
  dueDate: DateOnlySchema.nullable().optional(),
  requirementKeys: z.array(z.string().trim().min(1).max(40)).max(100).optional(),
  assignmentMode: FeatureSpecAssignmentModeSchema.nullable().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
});
export type FeatureSpecSubtask = z.infer<typeof FeatureSpecSubtaskSchema>;

export const FeatureSpecTasksSchema = z.object({
  subtasks: z.array(FeatureSpecSubtaskSchema).max(200).optional(),
});
export type FeatureSpecTasks = z.infer<typeof FeatureSpecTasksSchema>;

export const FEATURE_SPEC_SECTION_SCHEMAS = {
  plan: FeatureSpecPlanSchema,
  prd: FeatureSpecPrdSchema,
  tasks: FeatureSpecTasksSchema,
} as const;

// ---------------------------------------------------------------------------
// Required-field rules (ADR-036 decision 2)
// ---------------------------------------------------------------------------

export const FEATURE_SPEC_PLAN_REQUIRED_FIELDS = [
  'title',
  'problem',
  'targetUsers',
  'goal',
  'successMeasure',
  'targetPlatform',
  'priority',
  'startDate',
  'dueDate',
] as const;

export interface FeatureSpecSectionEvaluation {
  /** Number of required checks that apply to the section as it stands. */
  total: number;
  /** Dotted/bracketed paths of the checks that fail, for example `plan.successMeasure`. */
  missingFields: string[];
  complete: boolean;
}

function isBlank(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  return false;
}

/**
 * Evaluates the required fields of one section. `prd` is needed only for `tasks`, to check that
 * every Requirement has an implementing subtask and that subtasks refer to known Requirements.
 */
export function evaluateFeatureSpecSection(
  section: FeatureSpecSection,
  content: unknown,
  context: { prd?: unknown } = {},
): FeatureSpecSectionEvaluation {
  const missing: string[] = [];
  let total = 0;
  const check = (path: string, value: unknown) => {
    total += 1;
    if (isBlank(value)) missing.push(path);
  };

  if (section === 'plan') {
    const plan = (content ?? {}) as Record<string, unknown>;
    for (const field of FEATURE_SPEC_PLAN_REQUIRED_FIELDS) {
      check(`plan.${field}`, plan[field]);
    }
  } else if (section === 'prd') {
    const prd = (content ?? {}) as FeatureSpecPrd;
    // Brief context is optional: Apply takes it from the Plan's problem statement when blank.
    check('prd.brief.inScope', prd.brief?.inScope);
    check('prd.brief.outScope', prd.brief?.outScope);
    const requirements = prd.requirements ?? [];
    total += 1;
    if (requirements.length === 0) missing.push('prd.requirements');
    requirements.forEach((requirement, index) => {
      const base = `prd.requirements[${index}]`;
      check(`${base}.title`, requirement.title);
      check(`${base}.description`, requirement.description);
      const criteria = requirement.acceptanceCriteria ?? [];
      total += 1;
      if (criteria.length === 0) missing.push(`${base}.acceptanceCriteria`);
      criteria.forEach((criterion, criterionIndex) => {
        const criterionBase = `${base}.acceptanceCriteria[${criterionIndex}]`;
        check(`${criterionBase}.given`, criterion.given);
        check(`${criterionBase}.when`, criterion.when);
        check(`${criterionBase}.then`, criterion.then);
      });
    });
  } else {
    const tasks = (content ?? {}) as FeatureSpecTasks;
    const prd = (context.prd ?? {}) as FeatureSpecPrd;
    const requirementKeys = new Set((prd.requirements ?? []).map((requirement) => requirement.key));
    const subtasks = tasks.subtasks ?? [];
    total += 1;
    if (subtasks.length === 0) missing.push('tasks.subtasks');
    const covered = new Set<string>();
    subtasks.forEach((subtask, index) => {
      const base = `tasks.subtasks[${index}]`;
      check(`${base}.title`, subtask.title);
      check(`${base}.description`, subtask.description);
      check(`${base}.deliveryArea`, subtask.deliveryArea);
      check(`${base}.priority`, subtask.priority);
      check(`${base}.startDate`, subtask.startDate);
      check(`${base}.dueDate`, subtask.dueDate);
      check(`${base}.assignmentMode`, subtask.assignmentMode);
      if (subtask.assignmentMode === 'assigned') {
        check(`${base}.assigneeId`, subtask.assigneeId);
      }
      const keys = subtask.requirementKeys ?? [];
      total += 1;
      if (keys.length === 0) {
        missing.push(`${base}.requirementKeys`);
      } else {
        for (const key of keys) {
          if (requirementKeys.has(key)) {
            covered.add(key);
          } else {
            total += 1;
            missing.push(`${base}.requirementKeys[${key}]`);
          }
        }
      }
    });
    (prd.requirements ?? []).forEach((requirement, index) => {
      total += 1;
      if (!covered.has(requirement.key)) missing.push(`tasks.coverage.requirements[${index}]`);
    });
  }

  return { total, missingFields: missing, complete: missing.length === 0 };
}

// ---------------------------------------------------------------------------
// Resource and requests
// ---------------------------------------------------------------------------

export const FeatureSpecVersionSummarySchema = z.object({
  version: z.number().int().positive(),
  actorType: FeatureSpecActorTypeSchema,
  actorId: z.string().uuid().nullable(),
  actorName: z.string().nullable(),
  via: z.string(),
  createdAt: z.string().datetime(),
});
export type FeatureSpecVersionSummary = z.infer<typeof FeatureSpecVersionSummarySchema>;

export const FeatureSpecCompletenessSchema = z.object({
  total: z.number().int().nonnegative(),
  missingFields: z.array(z.string()),
  complete: z.boolean(),
});

export const FeatureSpecSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  featureTaskId: z.string().uuid(),
  version: z.number().int().positive(),
  status: FeatureSpecStatusSchema,
  plan: FeatureSpecPlanSchema,
  prd: FeatureSpecPrdSchema,
  tasks: FeatureSpecTasksSchema,
  completeness: z.object({
    plan: FeatureSpecCompletenessSchema,
    prd: FeatureSpecCompletenessSchema,
    tasks: FeatureSpecCompletenessSchema,
  }),
  recentVersions: z.array(FeatureSpecVersionSummarySchema),
  createdBy: z.string().uuid(),
  updatedBy: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type FeatureSpec = z.infer<typeof FeatureSpecSchema>;

export const CreateFeatureSpecSchema = z.object({
  workspaceId: z.string().uuid(),
  folderId: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(1, 'Feature title is required').max(200),
  idea: z.string().trim().min(1, 'The idea is required').max(5000),
});
export type CreateFeatureSpecInput = z.infer<typeof CreateFeatureSpecSchema>;

export const SaveFeatureSpecSectionSchema = z.object({
  workspaceId: z.string().uuid(),
  specId: z.string().uuid(),
  section: FeatureSpecSectionSchema,
  /** Version the caller last saw; an older value is rejected with 409. */
  version: z.number().int().positive(),
  content: z.unknown(),
  /** When true the server validates required fields (400 with `missingFields`) and may advance the stage. */
  complete: z.boolean().optional().default(false),
});
export type SaveFeatureSpecSectionInput = z.infer<typeof SaveFeatureSpecSectionSchema>;

export const FEATURE_SPEC_INCOMPLETE_CODE = 'FEATURE_SPEC_INCOMPLETE';
