import type { Response } from 'express';
import { z, ZodError } from 'zod';
import {
  CommitTestCaseImportSchema,
  CreateEvidenceLinkInputSchema,
  CreateTestCaseSchema,
  CreateTestResultSchema,
  CreateTestRunSchema,
  ListTestCasesQuerySchema,
  UpdateTestCaseSchema,
} from '@qlick/contracts';
import type { AuthenticatedRequest } from '../../http/middleware/authenticate.js';
import { testManagementService } from './testManagementService.js';
import { testCaseImportService } from './testCaseImportService.js';

function problem(res: Response, status: number, code: string, detail: string) {
  return res.status(status).json({
    type: `https://api.qa-hub.com/errors/${code.toLowerCase().replaceAll('_', '-')}`,
    title: code
      .split('_')
      .map((word) => word[0] + word.slice(1).toLowerCase())
      .join(' '),
    status,
    detail,
    code,
  });
}

function handleError(res: Response, error: unknown) {
  if (error instanceof ZodError) {
    return problem(res, 400, 'BAD_REQUEST', error.errors.map((issue) => issue.message).join('; '));
  }
  const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
  if (message.startsWith('NOT_FOUND:'))
    return problem(res, 404, 'NOT_FOUND', message.slice(10).trim());
  if (message.startsWith('FORBIDDEN:'))
    return problem(res, 403, 'FORBIDDEN', message.slice(10).trim());
  if (message.startsWith('BAD_REQUEST:'))
    return problem(res, 400, 'BAD_REQUEST', message.slice(12).trim());
  if (message.startsWith('CONFLICT:'))
    return problem(res, 409, 'CONFLICT', message.slice(9).trim());
  return problem(res, 500, 'INTERNAL_SERVER_ERROR', message);
}

export async function getTaskTestExecutions(req: AuthenticatedRequest, res: Response) {
  try {
    const taskId = z.string().uuid().parse(req.params.taskId);
    const executionWorkspace = await testManagementService.getTaskTestExecutions(
      req.params.workspaceId,
      taskId,
      req.user!.userId,
    );
    return res.status(200).json({ executionWorkspace });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function listTestCases(req: AuthenticatedRequest, res: Response) {
  try {
    const query = ListTestCasesQuerySchema.parse(req.query);
    const testCases = await testManagementService.listTestCases(
      req.params.workspaceId,
      req.user!.userId,
      query,
    );
    return res.status(200).json({ testCases });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function getTestCase(req: AuthenticatedRequest, res: Response) {
  try {
    const testCase = await testManagementService.getTestCase(
      req.params.workspaceId,
      req.params.testCaseId,
      req.user!.userId,
    );
    return res.status(200).json({ testCase });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function createTestCase(req: AuthenticatedRequest, res: Response) {
  try {
    const input = CreateTestCaseSchema.parse({ ...req.body, workspaceId: req.params.workspaceId });
    const testCase = await testManagementService.createTestCase(req.user!.userId, input);
    return res.status(201).json({ testCase });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function updateTestCase(req: AuthenticatedRequest, res: Response) {
  try {
    const input = UpdateTestCaseSchema.parse({
      ...req.body,
      workspaceId: req.params.workspaceId,
      testCaseId: req.params.testCaseId,
    });
    const testCase = await testManagementService.updateTestCase(req.user!.userId, input);
    return res.status(200).json({ testCase });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function createTestRun(req: AuthenticatedRequest, res: Response) {
  try {
    const input = CreateTestRunSchema.parse({
      ...req.body,
      workspaceId: req.params.workspaceId,
      testCaseId: req.params.testCaseId,
    });
    const testRun = await testManagementService.createTestRun(req.user!.userId, input);
    return res.status(201).json({ testRun });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function recordTestResult(req: AuthenticatedRequest, res: Response) {
  try {
    const input = CreateTestResultSchema.parse({
      ...req.body,
      workspaceId: req.params.workspaceId,
      testCaseId: req.params.testCaseId,
      testRunId: req.params.testRunId,
    });
    const testRun = await testManagementService.recordTestResult(req.user!.userId, input);
    return res.status(201).json({ testRun });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function addTestResultEvidenceLink(req: AuthenticatedRequest, res: Response) {
  try {
    const input = CreateEvidenceLinkInputSchema.parse(req.body);
    const evidenceLink = await testManagementService.addTestResultEvidenceLink(
      req.user!.userId,
      req.params.workspaceId,
      req.params.testCaseId,
      req.params.testRunId,
      input,
    );
    return res.status(201).json({ evidenceLink });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function listTestRuns(req: AuthenticatedRequest, res: Response) {
  try {
    const testRuns = await testManagementService.listTestRuns(
      req.params.workspaceId,
      req.params.testCaseId,
      req.user!.userId,
    );
    return res.status(200).json({ testRuns });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function listTestCaseActivity(req: AuthenticatedRequest, res: Response) {
  try {
    const activity = await testManagementService.listTestCaseActivity(
      req.params.workspaceId,
      req.params.testCaseId,
      req.user!.userId,
    );
    return res.status(200).json({ activity });
  } catch (error) {
    return handleError(res, error);
  }
}

// Import endpoints
export async function downloadTestCaseTemplate(_req: AuthenticatedRequest, res: Response) {
  try {
    const csv = testCaseImportService.getTemplateCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="test_cases_template.csv"');
    return res.status(200).send(csv);
  } catch (error) {
    return handleError(res, error);
  }
}

export async function previewTestCaseImport(req: AuthenticatedRequest, res: Response) {
  try {
    const { fileName, fileContent, fileBase64, mimeType, sheetName, columnMapping } =
      req.body || {};
    if (!fileName || (!fileContent && !fileBase64)) {
      return problem(
        res,
        400,
        'BAD_REQUEST',
        'File name and file content (or base64) are required.',
      );
    }

    const buffer = fileBase64
      ? Buffer.from(fileBase64, 'base64')
      : Buffer.from(fileContent, 'utf8');
    const preview = await testCaseImportService.previewImport(
      req.params.workspaceId,
      req.user!.userId,
      fileName,
      buffer,
      mimeType || '',
      sheetName || (req.query.sheetName as string) || undefined,
      columnMapping || undefined,
    );
    return res.status(200).json({ preview });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function commitTestCaseImport(req: AuthenticatedRequest, res: Response) {
  try {
    const input = CommitTestCaseImportSchema.parse({
      ...req.body,
      workspaceId: req.params.workspaceId,
    });
    const result = await testCaseImportService.commitImport(req.user!.userId, input);
    return res.status(201).json({ result });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function listTestCaseImportAudits(req: AuthenticatedRequest, res: Response) {
  try {
    const audits = await testCaseImportService.listImportAudits(
      req.params.workspaceId,
      req.user!.userId,
    );
    return res.status(200).json({ audits });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function getTestCaseImportErrorsCsv(req: AuthenticatedRequest, res: Response) {
  try {
    const csv = await testCaseImportService.getImportErrorReportCsv(
      req.params.workspaceId,
      req.params.importId,
      req.user!.userId,
    );
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="import_errors_${req.params.importId}.csv"`,
    );
    return res.status(200).send(csv);
  } catch (error) {
    return handleError(res, error);
  }
}
