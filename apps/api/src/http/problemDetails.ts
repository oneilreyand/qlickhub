import { Response } from 'express';
import { ZodError } from 'zod';
import { ProblemDetail, ProblemDetailSchema } from '@qlick/contracts';

export interface ProblemDetailsOptions {
  zodCode?: string;
  zodDetail?: string;
  conflictCode?: string;
  uniqueCode?: string;
  uniqueDetail?: string;
  uniqueStatus?: number;
  fallbackCode?: string;
  fallbackStatus?: number;
  fallbackDetail?: string;
  typeUri?: string;
}

const RFC9457_TYPE = 'https://tools.ietf.org/html/rfc9457';

/**
 * Transforms any caught error or unknown value into a strictly validated
 * RFC 9457 ProblemDetail object according to @qlick/contracts.
 */
export function toProblemDetail(err: unknown, options?: ProblemDetailsOptions): ProblemDetail {
  const typeUri = options?.typeUri || RFC9457_TYPE;

  if (err instanceof ZodError) {
    const formattedIssues =
      err.errors && err.errors.length > 0
        ? err.errors
            .map((e) => (e.path.length > 0 ? `${e.path.join('.')}: ${e.message}` : e.message))
            .join('; ')
        : 'Input validation failed';

    const problem: ProblemDetail = {
      type: typeUri,
      title: 'Validation Error',
      status: 400,
      detail: options?.zodDetail || formattedIssues,
      code: options?.zodCode || 'BAD_REQUEST',
      errors: err.errors.map((e) => ({
        field: e.path.join('.') || 'body',
        message: e.message,
      })),
    };
    return ProblemDetailSchema.parse(problem);
  }

  if (
    (err as { name?: string })?.name === 'SequelizeUniqueConstraintError' ||
    (err as { name?: string })?.name === 'UniqueConstraintError'
  ) {
    const problem: ProblemDetail = {
      type: typeUri,
      title: 'Bad Request',
      status: options?.uniqueStatus || 400,
      detail:
        options?.uniqueDetail ||
        (err instanceof Error
          ? err.message
          : 'A unique Requirement or Acceptance Criterion value already exists in this workspace.'),
      code: options?.uniqueCode || 'BAD_REQUEST',
    };
    return ProblemDetailSchema.parse(problem);
  }

  if (err instanceof Error) {
    const msg = err.message;

    if (msg.startsWith('NOT_FOUND:') || msg.startsWith('NOT_FOUND: ')) {
      const problem: ProblemDetail = {
        type: typeUri,
        title: 'Not Found',
        status: 404,
        detail: msg.replace(/^NOT_FOUND:\s*/, '').trim(),
        code: 'NOT_FOUND',
      };
      return ProblemDetailSchema.parse(problem);
    }

    if (msg.startsWith('BAD_REQUEST:') || msg.startsWith('BAD_REQUEST: ')) {
      const problem: ProblemDetail = {
        type: typeUri,
        title: 'Bad Request',
        status: 400,
        detail: msg.replace(/^BAD_REQUEST:\s*/, '').trim(),
        code: 'BAD_REQUEST',
      };
      return ProblemDetailSchema.parse(problem);
    }

    if (msg.startsWith('FORBIDDEN:') || msg.startsWith('FORBIDDEN: ')) {
      const problem: ProblemDetail = {
        type: typeUri,
        title: 'Forbidden',
        status: 403,
        detail: msg.replace(/^FORBIDDEN:\s*/, '').trim(),
        code: 'FORBIDDEN',
      };
      return ProblemDetailSchema.parse(problem);
    }

    if (msg.startsWith('CONFLICT:') || msg.startsWith('CONFLICT: ')) {
      const problem: ProblemDetail = {
        type: typeUri,
        title: 'Conflict',
        status: 409,
        detail: msg.replace(/^CONFLICT:\s*/, '').trim(),
        code: options?.conflictCode || 'CONFLICT',
      };
      return ProblemDetailSchema.parse(problem);
    }

    if (msg.startsWith('UNAUTHORIZED:') || msg.startsWith('UNAUTHORIZED: ')) {
      const problem: ProblemDetail = {
        type: typeUri,
        title: 'Unauthorized',
        status: 401,
        detail: msg.replace(/^UNAUTHORIZED:\s*/, '').trim(),
        code: 'UNAUTHORIZED',
      };
      return ProblemDetailSchema.parse(problem);
    }
  }

  const problem: ProblemDetail = {
    type: typeUri,
    title: 'Internal Server Error',
    status: options?.fallbackStatus || 500,
    detail:
      err instanceof Error
        ? err.message
        : options?.fallbackDetail || 'An unexpected error occurred',
    code: options?.fallbackCode || 'INTERNAL_SERVER_ERROR',
  };
  return ProblemDetailSchema.parse(problem);
}

/**
 * Sends a canonical RFC 9457 Problem Details response to Express Response.
 */
export function sendProblemDetails(
  res: Response,
  err: unknown,
  options?: ProblemDetailsOptions,
): Response {
  const problem = toProblemDetail(err, options);
  return res.status(problem.status).json(problem);
}

/**
 * Alias supporting (err, res, options) parameter order for backward compatibility
 * with taskController and notificationController.
 */
export function formatProblemDetails(
  err: unknown,
  res: Response,
  options?: ProblemDetailsOptions,
): Response {
  return sendProblemDetails(res, err, options);
}
