import type { Response } from 'express';
import { ZodError } from 'zod';
import { UniqueConstraintError } from 'sequelize';

/**
 * Centralised RFC 9457 Problem Details error handler shared by all API controllers.
 *
 * Maps well-known service error prefixes (NOT_FOUND:, FORBIDDEN:, BAD_REQUEST:,
 * CONFLICT:, GONE:, UNPROCESSABLE:) to the correct HTTP status codes and a
 * consistent JSON envelope. Falls back to 500 Internal Server Error for anything
 * that does not match a known prefix.
 *
 * Usage:
 *   import { handleError } from '../../http/errors/handleError.js';
 *   ...
 *   } catch (error) {
 *     return handleError(res, error);
 *   }
 */
export function handleError(res: Response, error: unknown): Response {
  if (error instanceof ZodError) {

    return res.status(400).json({
      type: 'https://tools.ietf.org/html/rfc9457',
      title: 'Validation Error',
      status: 400,
      detail: 'Input validation failed',
      code: 'BAD_REQUEST',
      errors: error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  if (error instanceof UniqueConstraintError) {
    return res.status(409).json({
      type: 'https://tools.ietf.org/html/rfc9457',
      title: 'Conflict',
      status: 409,
      detail: 'A unique value already exists for the given resource.',
      code: 'CONFLICT',
    });
  }

  const message = error instanceof Error ? error.message : 'An unexpected error occurred';

  if (message.startsWith('NOT_FOUND:')) {
    return res.status(404).json({
      type: 'https://tools.ietf.org/html/rfc9457',
      title: 'Not Found',
      status: 404,
      detail: message.slice('NOT_FOUND:'.length).trim(),
      code: 'NOT_FOUND',
    });
  }
  if (message.startsWith('FORBIDDEN:')) {
    return res.status(403).json({
      type: 'https://tools.ietf.org/html/rfc9457',
      title: 'Forbidden',
      status: 403,
      detail: message.slice('FORBIDDEN:'.length).trim(),
      code: 'FORBIDDEN',
    });
  }
  if (message.startsWith('BAD_REQUEST:')) {
    return res.status(400).json({
      type: 'https://tools.ietf.org/html/rfc9457',
      title: 'Bad Request',
      status: 400,
      detail: message.slice('BAD_REQUEST:'.length).trim(),
      code: 'BAD_REQUEST',
    });
  }
  if (message.startsWith('CONFLICT:')) {
    return res.status(409).json({
      type: 'https://tools.ietf.org/html/rfc9457',
      title: 'Conflict',
      status: 409,
      detail: message.slice('CONFLICT:'.length).trim(),
      code: 'CONFLICT',
    });
  }
  if (message.startsWith('GONE:')) {
    return res.status(410).json({
      type: 'https://tools.ietf.org/html/rfc9457',
      title: 'Gone',
      status: 410,
      detail: message.slice('GONE:'.length).trim(),
      code: 'GONE',
    });
  }
  if (message.startsWith('UNPROCESSABLE:')) {
    return res.status(422).json({
      type: 'https://tools.ietf.org/html/rfc9457',
      title: 'Unprocessable Entity',
      status: 422,
      detail: message.slice('UNPROCESSABLE:'.length).trim(),
      code: 'UNPROCESSABLE',
    });
  }

  return res.status(500).json({
    type: 'https://tools.ietf.org/html/rfc9457',
    title: 'Internal Server Error',
    status: 500,
    detail: message,
    code: 'INTERNAL_ERROR',
  });
}
