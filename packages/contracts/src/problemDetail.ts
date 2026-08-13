import { z } from 'zod';

/**
 * RFC 9457 / RFC 7807 field-level validation error detail.
 */
export const ValidationErrorDetailSchema = z.object({
  field: z.string(),
  message: z.string(),
  code: z.string().optional(),
});

export type ValidationErrorDetail = z.infer<typeof ValidationErrorDetailSchema>;

/**
 * RFC 9457 compliant Problem Detail error schema for API responses.
 */
export const ProblemDetailSchema = z.object({
  type: z.string().describe('A URI reference identifying the problem type'),
  title: z.string().describe('Short human-readable summary of the problem type'),
  status: z.number().int().min(100).max(599).describe('HTTP status code'),
  detail: z.string().optional().describe('Detailed explanation specific to this occurrence'),
  instance: z.string().optional().describe('URI reference identifying specific occurrence'),
  code: z.string().optional().describe('Application-specific error code'),
  errors: z.array(ValidationErrorDetailSchema).optional().describe('Validation error list if applicable'),
});

export type ProblemDetail = z.infer<typeof ProblemDetailSchema>;
