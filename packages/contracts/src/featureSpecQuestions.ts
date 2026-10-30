import { z } from 'zod';
import { FeatureSpecTargetPlatformSchema, type FeatureSpec } from './featureSpec.js';
import { TaskPrioritySchema } from './task.js';

/**
 * Feature Spec AI Plan (P5b, AC-5.4): the AI asks clarifying questions about the idea, the
 * answers are stored, and then the AI fills the Plan. The AI output is always re-validated by the
 * server with the schemas below before anything is saved.
 */

export const FEATURE_SPEC_QUESTION_ANSWER_MAX = 2000;
export const FEATURE_SPEC_QUESTIONS_MIN = 3;
export const FEATURE_SPEC_QUESTIONS_MAX = 6;

export const FeatureSpecQuestionSchema = z.object({
  id: z.string().uuid(),
  specId: z.string().uuid(),
  position: z.number().int().min(0),
  text: z.string().min(1).max(500),
  reason: z.string().max(500),
  required: z.boolean(),
  answer: z.string().max(FEATURE_SPEC_QUESTION_ANSWER_MAX).nullable(),
  answeredBy: z.string().uuid().nullable(),
  answeredAt: z.string().nullable(),
  createdAt: z.string(),
});
export type FeatureSpecQuestion = z.infer<typeof FeatureSpecQuestionSchema>;

/** What the model must return when asked for questions. */
export const AiFeatureSpecQuestionsOutputSchema = z.object({
  questions: z
    .array(
      z.object({
        text: z.string().trim().min(1).max(500),
        reason: z.string().trim().max(500).default(''),
        required: z.boolean().default(true),
      }),
    )
    .min(FEATURE_SPEC_QUESTIONS_MIN)
    .max(FEATURE_SPEC_QUESTIONS_MAX),
});
export type AiFeatureSpecQuestionsOutput = z.infer<typeof AiFeatureSpecQuestionsOutputSchema>;

/** What the model must return when asked to fill the Plan. */
export const AiFeatureSpecPlanOutputSchema = z.object({
  problem: z.string().trim().min(1).max(5000),
  targetUsers: z.string().trim().min(1).max(5000),
  goal: z.string().trim().min(1).max(5000),
  successMeasure: z.string().trim().min(1).max(5000),
  targetPlatform: FeatureSpecTargetPlatformSchema,
  priority: TaskPrioritySchema,
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
});
export type AiFeatureSpecPlanOutput = z.infer<typeof AiFeatureSpecPlanOutputSchema>;

export const AnswerFeatureSpecQuestionSchema = z.object({
  workspaceId: z.string().uuid(),
  specId: z.string().uuid(),
  questionId: z.string().uuid(),
  answer: z.string().trim().min(1).max(FEATURE_SPEC_QUESTION_ANSWER_MAX),
});
export type AnswerFeatureSpecQuestionInput = z.infer<typeof AnswerFeatureSpecQuestionSchema>;

export const GenerateFeatureSpecPlanSchema = z.object({
  workspaceId: z.string().uuid(),
  specId: z.string().uuid(),
  /** Spec version the person was looking at; a stale value is rejected with 409. */
  version: z.number().int().min(1),
});
export type GenerateFeatureSpecPlanInput = z.infer<typeof GenerateFeatureSpecPlanSchema>;

export const FEATURE_SPEC_QUESTIONS_UNANSWERED_CODE = 'FEATURE_SPEC_QUESTIONS_UNANSWERED';
export const FEATURE_SPEC_AI_UNAVAILABLE_CODE = 'FEATURE_SPEC_AI_UNAVAILABLE';

export interface FeatureSpecQuestionsResponse {
  questions: FeatureSpecQuestion[];
}
export interface FeatureSpecGeneratePlanResponse {
  featureSpec: FeatureSpec;
  aiFilledFields: string[];
}
