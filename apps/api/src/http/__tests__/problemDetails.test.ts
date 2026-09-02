import assert from 'node:assert';
import { describe, it } from 'node:test';
import { z } from 'zod';
import { ProblemDetailSchema } from '@qlick/contracts';
import { toProblemDetail, sendProblemDetails, formatProblemDetails } from '../problemDetails.js';

describe('HTTP Problem Details Canonical Adapter (RFC 9457)', () => {
  it('formats ZodError into 400 Bad Request with field-level errors', () => {
    const schema = z.object({
      title: z.string().min(3),
      age: z.number().positive(),
    });

    const result = schema.safeParse({ title: 'a', age: -5 });
    assert.strictEqual(result.success, false);

    if (!result.success) {
      const problem = toProblemDetail(result.error);
      const validated = ProblemDetailSchema.parse(problem);

      assert.strictEqual(validated.status, 400);
      assert.strictEqual(validated.title, 'Validation Error');
      assert.strictEqual(validated.code, 'BAD_REQUEST');
      assert.strictEqual(validated.errors?.length, 2);
      assert.strictEqual(validated.errors?.[0].field, 'title');
      assert.strictEqual(validated.errors?.[1].field, 'age');
    }
  });

  it('formats BAD_REQUEST error into 400 Bad Request', () => {
    const error = new Error('BAD_REQUEST: Invalid filter parameters provided.');
    const problem = toProblemDetail(error);
    const validated = ProblemDetailSchema.parse(problem);

    assert.strictEqual(validated.status, 400);
    assert.strictEqual(validated.title, 'Bad Request');
    assert.strictEqual(validated.detail, 'Invalid filter parameters provided.');
    assert.strictEqual(validated.code, 'BAD_REQUEST');
  });

  it('formats UNAUTHORIZED error into 401 Unauthorized', () => {
    const error = new Error('UNAUTHORIZED: Session has expired.');
    const problem = toProblemDetail(error);
    const validated = ProblemDetailSchema.parse(problem);

    assert.strictEqual(validated.status, 401);
    assert.strictEqual(validated.title, 'Unauthorized');
    assert.strictEqual(validated.detail, 'Session has expired.');
    assert.strictEqual(validated.code, 'UNAUTHORIZED');
  });

  it('formats FORBIDDEN error into 403 Forbidden', () => {
    const error = new Error('FORBIDDEN: Only planners can delete tasks.');
    const problem = toProblemDetail(error);
    const validated = ProblemDetailSchema.parse(problem);

    assert.strictEqual(validated.status, 403);
    assert.strictEqual(validated.title, 'Forbidden');
    assert.strictEqual(validated.detail, 'Only planners can delete tasks.');
    assert.strictEqual(validated.code, 'FORBIDDEN');
  });

  it('formats NOT_FOUND error into 404 Not Found', () => {
    const error = new Error('NOT_FOUND: Workspace not found.');
    const problem = toProblemDetail(error);
    const validated = ProblemDetailSchema.parse(problem);

    assert.strictEqual(validated.status, 404);
    assert.strictEqual(validated.title, 'Not Found');
    assert.strictEqual(validated.detail, 'Workspace not found.');
    assert.strictEqual(validated.code, 'NOT_FOUND');
  });

  it('formats CONFLICT error into 409 Conflict', () => {
    const error = new Error('CONFLICT: Task has linked requirements.');
    const problem = toProblemDetail(error);
    const validated = ProblemDetailSchema.parse(problem);

    assert.strictEqual(validated.status, 409);
    assert.strictEqual(validated.title, 'Conflict');
    assert.strictEqual(validated.detail, 'Task has linked requirements.');
    assert.strictEqual(validated.code, 'CONFLICT');
  });

  it('supports custom conflict code option', () => {
    const error = new Error('CONFLICT: QA evidence attachment is immutable.');
    const problem = toProblemDetail(error, { conflictCode: 'IMMUTABLE_EVIDENCE' });
    const validated = ProblemDetailSchema.parse(problem);

    assert.strictEqual(validated.status, 409);
    assert.strictEqual(validated.code, 'IMMUTABLE_EVIDENCE');
    assert.strictEqual(validated.detail, 'QA evidence attachment is immutable.');
  });

  it('formats SequelizeUniqueConstraintError into 400 Bad Request', () => {
    const error = {
      name: 'SequelizeUniqueConstraintError',
      message: 'Validation error: code must be unique',
    };
    const problem = toProblemDetail(error);
    const validated = ProblemDetailSchema.parse(problem);

    assert.strictEqual(validated.status, 400);
    assert.strictEqual(validated.title, 'Bad Request');
    assert.strictEqual(validated.code, 'BAD_REQUEST');
  });

  it('formats unexpected errors into 500 Internal Server Error', () => {
    const error = new Error('Database connection pool exhausted');
    const problem = toProblemDetail(error);
    const validated = ProblemDetailSchema.parse(problem);

    assert.strictEqual(validated.status, 500);
    assert.strictEqual(validated.title, 'Internal Server Error');
    assert.strictEqual(validated.detail, 'Database connection pool exhausted');
    assert.strictEqual(validated.code, 'INTERNAL_SERVER_ERROR');
  });

  it('sendProblemDetails delegates to express response correctly', () => {
    let capturedStatus = 0;
    let capturedBody: any = null;

    const mockRes: any = {
      status(s: number) {
        capturedStatus = s;
        return this;
      },
      json(data: any) {
        capturedBody = data;
        return this;
      },
    };

    sendProblemDetails(mockRes, new Error('NOT_FOUND: Item missing'));
    assert.strictEqual(capturedStatus, 404);
    assert.strictEqual(capturedBody.code, 'NOT_FOUND');
    assert.strictEqual(capturedBody.detail, 'Item missing');
  });

  it('formatProblemDetails supports (err, res) parameter order', () => {
    let capturedStatus = 0;
    let capturedBody: any = null;

    const mockRes: any = {
      status(s: number) {
        capturedStatus = s;
        return this;
      },
      json(data: any) {
        capturedBody = data;
        return this;
      },
    };

    formatProblemDetails(new Error('FORBIDDEN: Denied access'), mockRes);
    assert.strictEqual(capturedStatus, 403);
    assert.strictEqual(capturedBody.code, 'FORBIDDEN');
    assert.strictEqual(capturedBody.detail, 'Denied access');
  });
});
