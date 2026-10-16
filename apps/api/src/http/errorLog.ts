import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

// Structured server-error logging (audit F2, Owner decision 2026-10-16: logs only, no third party).
// One JSON line per 5xx so Vercel Logs can be searched by requestId, route, or code. Request bodies,
// query strings, headers, and cookies are never logged; messages are scrubbed of secrets.

export const REQUEST_ID_HEADER = 'x-request-id';
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;
const MAX_MESSAGE_LENGTH = 500;
const MAX_STACK_FRAMES = 8;

type RequestWithContext = Request & {
  requestId?: string;
  user?: { userId?: string };
};

/** Assigns a request id (reusing a well-formed incoming one) and echoes it in the response. */
export function assignRequestId(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.get(REQUEST_ID_HEADER);
  const requestId = incoming && REQUEST_ID_PATTERN.test(incoming) ? incoming : randomUUID();
  (req as RequestWithContext).requestId = requestId;
  res.setHeader(REQUEST_ID_HEADER, requestId);
  next();
}

export function requestIdOf(req: Request | undefined): string | null {
  return (req as RequestWithContext | undefined)?.requestId ?? null;
}

/** Removes connection strings, bearer tokens, JWT-like strings, and long secrets from text. */
export function scrubSecrets(text: string): string {
  return text
    .replace(/\b(postgres(?:ql)?|mysql|redis|rediss):\/\/[^\s'"]+/gi, '$1://[redacted]')
    .replace(/\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [redacted]')
    .replace(/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, '[redacted-jwt]')
    .replace(/\b(password|passwd|secret|token|api[_-]?key)=([^\s&'"]+)/gi, '$1=[redacted]');
}

function routeOf(req: Request): string {
  const routePath = (req.route as { path?: string } | undefined)?.path;
  if (routePath) return `${req.baseUrl}${routePath}`;
  return 'unmatched';
}

export interface ServerErrorLogEntry {
  level: 'error';
  event: 'api.error';
  timestamp: string;
  requestId: string | null;
  vercelId: string | null;
  method: string | null;
  route: string | null;
  status: number;
  code: string;
  errorName: string;
  message: string;
  stack?: string[];
  userId: string | null;
  workspaceId: string | null;
}

export function buildServerErrorLogEntry(
  err: unknown,
  req: Request | undefined,
  status: number,
  code: string,
): ServerErrorLogEntry {
  const error = err instanceof Error ? err : null;
  const rawMessage = error
    ? error.message
    : typeof err === 'string'
      ? err
      : 'Non-error value thrown';
  const stack = error?.stack
    ?.split('\n')
    .slice(1, MAX_STACK_FRAMES + 1)
    .map((frame) => scrubSecrets(frame.trim()));
  const params = (req?.params ?? {}) as Record<string, string | undefined>;
  return {
    level: 'error',
    event: 'api.error',
    timestamp: new Date().toISOString(),
    requestId: requestIdOf(req),
    vercelId: req?.get('x-vercel-id') ?? null,
    method: req?.method ?? null,
    route: req ? routeOf(req) : null,
    status,
    code,
    errorName: error?.name ?? typeof err,
    message: scrubSecrets(rawMessage).slice(0, MAX_MESSAGE_LENGTH),
    ...(stack && stack.length > 0 ? { stack } : {}),
    userId: (req as RequestWithContext | undefined)?.user?.userId ?? null,
    workspaceId: params.workspaceId ?? null,
  };
}

export type ErrorLogSink = (line: string) => void;
let sink: ErrorLogSink = (line) => console.error(line);

/** Test seam: replace the output sink and return a function restoring the previous one. */
export function setErrorLogSink(next: ErrorLogSink): () => void {
  const previous = sink;
  sink = next;
  return () => {
    sink = previous;
  };
}

export function logServerError(
  err: unknown,
  req: Request | undefined,
  status: number,
  code: string,
): void {
  try {
    sink(JSON.stringify(buildServerErrorLogEntry(err, req, status, code)));
  } catch {
    // Logging must never break the response path.
  }
}
