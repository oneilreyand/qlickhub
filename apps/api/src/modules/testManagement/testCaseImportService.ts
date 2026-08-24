import { v4 as uuidv4 } from 'uuid';
import type { Transaction } from 'sequelize';
import type {
  CommitTestCaseImportInput,
  TestCaseImportAudit,
  TestCaseImportDryRunRow,
  TestCaseImportMode,
  TestCaseImportPreviewResponse,
  TestCaseImportResult,
  TestCaseImportRowError,
} from '@qlick/contracts';

import { MAX_IMPORT_ROWS } from '@qlick/contracts';
import { sequelize } from '../../db/sequelize.js';
import {
  RequirementModel,
  TestCaseActivityModel,
  TestCaseImportModel,
  TestCaseImportRowModel,
  TestCaseModel,
  TestCaseRequirementModel,
  UserModel,
  WorkspaceMemberModel,
} from '../../db/models/index.js';
import { assertCanImportTestCases } from '../../policies/testManagementPolicy.js';
import {
  computeContentHash,
  extractSpreadsheetHeaders,
  getSpreadsheetSheets,
  parseCsvContent,
  parseXlsxContent,
} from './spreadsheetParser.js';

async function getMembership(workspaceId: string, actorId: string, transaction?: Transaction) {
  const membership = await WorkspaceMemberModel.findOne({
    where: { workspaceId, userId: actorId },
    transaction,
  });
  if (!membership) {
    throw new Error('FORBIDDEN: You are not a member of this workspace.');
  }
  return membership;
}

function iso(value: Date): string {
  return new Date(value).toISOString();
}

const SESSION_TTL_MS = 3600 * 1000; // 1 hour

export class TestCaseImportService {
  getTemplateCsv(): string {
    const headers = [
      'Test Case ID',
      'Title',
      'Requirement Code',
      'Steps',
      'Expected Result',
      'Test Data',
      'Priority',
      'Scenario Kind',
      'Test Type',
      'Preconditions',
    ];
    const sampleRows = [
      [
        'TC-001',
        'Verify returning customer saved card checkout',
        'REQ-001',
        '1. Navigate to /cart\n2. Select saved visa card\n3. Click Confirm Payment',
        'Order confirmation screen is displayed with valid order ID',
        'Saved Visa card ending 4242',
        'high',
        'positive',
        'manual',
        'User is logged in with active cart and saved payment card',
      ],
      [
        'TC-002',
        'Reject checkout when payment card has expired',
        'REQ-001',
        '1. Navigate to /cart\n2. Select expired card\n3. Click Confirm Payment',
        'Error banner displayed stating card expired; no charge made',
        'Expired Mastercard ending 1111',
        'medium',
        'negative',
        'manual',
        'User is on checkout screen',
      ],
    ];

    const escapeCsv = (val: string) => `"${val.replace(/"/g, '""')}"`;
    const lines = [headers.join(','), ...sampleRows.map((row) => row.map(escapeCsv).join(','))];
    return lines.join('\n');
  }

  async previewImport(
    workspaceId: string,
    actorId: string,
    fileName: string,
    fileBuffer: Buffer | string,
    mimeType = '',
    sheetName?: string,
    columnMapping?: Record<string, string>,
  ): Promise<TestCaseImportPreviewResponse> {
    const membership = await getMembership(workspaceId, actorId);
    assertCanImportTestCases(membership.role);

    const isBuffer = Buffer.isBuffer(fileBuffer);
    const contentHash = computeContentHash(fileBuffer);
    const availableSheets = isBuffer ? getSpreadsheetSheets(fileBuffer, mimeType) : ['Sheet1'];
    const selectedSheet =
      sheetName && availableSheets.includes(sheetName) ? sheetName : availableSheets[0] || 'Sheet1';

    const parsedRows = isBuffer
      ? parseXlsxContent(fileBuffer, selectedSheet, columnMapping)
      : parseCsvContent(fileBuffer.toString(), columnMapping);

    if (parsedRows.length === 0) {
      throw new Error('BAD_REQUEST: The uploaded file contains no valid data rows or headers.');
    }

    if (parsedRows.length > MAX_IMPORT_ROWS) {
      throw new Error(`BAD_REQUEST: Spreadsheet exceeds maximum limit of ${MAX_IMPORT_ROWS} rows.`);
    }

    const [requirements, existingTestCases] = await Promise.all([
      RequirementModel.findAll({
        where: { workspaceId },
        attributes: ['id', 'code', 'title', 'status'],
      }),
      TestCaseModel.findAll({
        where: { workspaceId },
        attributes: ['id', 'externalReference', 'status'],
      }),
    ]);

    const reqByCode = new Map<string, { id: string; status: string }>();
    for (const req of requirements) {
      reqByCode.set(req.code.trim().toUpperCase(), { id: req.id, status: req.status });
    }

    const existingByExtRef = new Map<string, { id: string; status: string }>();
    for (const tc of existingTestCases) {
      if (tc.externalReference) {
        existingByExtRef.set(tc.externalReference.trim().toUpperCase(), {
          id: tc.id,
          status: tc.status,
        });
      }
    }

    const seenExtRefsInFile = new Set<string>();
    const dryRunRows: TestCaseImportDryRunRow[] = [];
    let validCount = 0;
    let invalidCount = 0;
    let duplicateCount = 0;

    for (const row of parsedRows) {
      const errors: string[] = [];
      const data = row.data;

      const extRefRaw = (data.external_reference || '').trim();
      const extRef = extRefRaw.length > 0 ? extRefRaw : null;
      const title = (data.title || '').trim();
      const reqCode = (data.requirement_code || '').trim();
      const stepsRaw = data.steps || '';
      const expectedResult = (data.expected_result || '').trim() || null;
      const testData = (data.test_data || '').trim() || null;
      const preconditions = (data.preconditions || '').trim() || null;

      // Normalize Priority
      let priority: 'high' | 'medium' | 'low' = 'medium';
      const rawPriority = (data.priority || '').trim().toLowerCase();
      if (rawPriority === 'high' || rawPriority === 'medium' || rawPriority === 'low') {
        priority = rawPriority;
      } else if (rawPriority.length > 0) {
        errors.push(`Invalid priority "${data.priority}". Allowed: high, medium, low.`);
      }

      // Normalize Scenario Kind
      let scenarioKind: 'positive' | 'negative' = 'positive';
      const rawScenario = (data.scenario_kind || '').trim().toLowerCase();
      if (rawScenario === 'positive' || rawScenario === 'negative') {
        scenarioKind = rawScenario;
      } else if (rawScenario.length > 0) {
        errors.push(`Invalid scenario kind "${data.scenario_kind}". Allowed: positive, negative.`);
      }

      // Normalize Test Type
      let testType: 'manual' | 'e2e' | 'integration' | 'unit' = 'manual';
      const rawType = (data.test_type || '').trim().toLowerCase();
      if (['manual', 'e2e', 'integration', 'unit'].includes(rawType)) {
        testType = rawType as typeof testType;
      } else if (rawType.length > 0) {
        errors.push(
          `Invalid test type "${data.test_type}". Allowed: manual, e2e, integration, unit.`,
        );
      }

      // Validate Title
      if (!title) {
        errors.push('Test Case Title is required.');
      } else if (title.length > 255) {
        errors.push('Test Case Title must not exceed 255 characters.');
      }

      // Validate Requirement Code
      let resolvedReqId: string | null = null;
      if (!reqCode) {
        errors.push('Requirement Code is required (e.g. REQ-001).');
      } else {
        const found = reqByCode.get(reqCode.toUpperCase());
        if (!found) {
          errors.push(`Requirement code "${reqCode}" was not found in this workspace.`);
        } else if (found.status !== 'active') {
          errors.push(
            `Requirement "${reqCode}" is not active (${found.status}). Only active requirements can be mapped.`,
          );
        } else {
          resolvedReqId = found.id;
        }
      }

      // Steps parsing
      let steps: string[] = [];
      if (stepsRaw.length > 0) {
        steps = stepsRaw
          .split(/\r?\n/)
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
      }

      // Check external reference duplicates
      let isDuplicate = false;
      let existingTestCaseId: string | null = null;
      if (extRef) {
        const normalized = extRef.toUpperCase();
        if (seenExtRefsInFile.has(normalized)) {
          isDuplicate = true;
          errors.push(`Duplicate external reference "${extRef}" appears multiple times in file.`);
        } else {
          seenExtRefsInFile.add(normalized);
        }

        const dbMatch = existingByExtRef.get(normalized);
        if (dbMatch) {
          isDuplicate = true;
          existingTestCaseId = dbMatch.id;
        }
      }

      if (isDuplicate) duplicateCount++;
      const isValid = errors.length === 0;
      if (isValid) validCount++;
      else invalidCount++;

      dryRunRows.push({
        sourceRowNumber: row.rowNumber,
        externalReference: extRef,
        title,
        requirementCode: reqCode,
        resolvedRequirementId: resolvedReqId,
        testType,
        priority,
        scenarioKind,
        preconditions,
        steps,
        expectedResult,
        testData,
        status: 'draft',
        isValid,
        validationErrors: errors,
        isDuplicate,
        existingTestCaseId,
      });
    }

    const importSessionId = uuidv4();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    // Save server-side staging record
    await sequelize.transaction(async (transaction) => {
      await TestCaseImportModel.create(
        {
          id: importSessionId,
          workspaceId,
          actorId,
          sourceFileName: fileName,
          contentHash,
          templateVersion: '1.0',
          mode: 'create_only',
          status: 'in_progress',
          totalRows: dryRunRows.length,
          createdRows: 0,
          updatedRows: 0,
          skippedRows: 0,
          failedRows: 0,
        },
        { transaction },
      );

      for (const row of dryRunRows) {
        await TestCaseImportRowModel.create(
          {
            importId: importSessionId,
            sourceRowNumber: row.sourceRowNumber,
            externalReference: row.externalReference,
            parsedPayload: {
              ...row,
              sheetName: selectedSheet,
            } as unknown as Record<string, unknown>,
            outcome: row.isValid ? (row.isDuplicate ? 'skipped' : 'created') : 'failed',
            validationErrors: row.validationErrors.length > 0 ? row.validationErrors : null,
            testCaseId: row.existingTestCaseId || null,
          },
          { transaction },
        );
      }
    });

    const headers = extractSpreadsheetHeaders(fileBuffer, mimeType, selectedSheet);

    return {
      importSessionId,
      fileName,
      contentHash,
      templateVersion: '1.0',
      totalRows: dryRunRows.length,
      validRows: validCount,
      invalidRows: invalidCount,
      duplicateRows: duplicateCount,
      availableSheets,
      selectedSheet,
      headers,
      columnMapping,
      expiresAt: expiresAt.toISOString(),
      rows: dryRunRows,
    };
  }

  async commitImport(
    actorId: string,
    input: CommitTestCaseImportInput,
  ): Promise<TestCaseImportResult> {
    const { workspaceId, importSessionId, contentHash, mode } = input;

    const result = await sequelize.transaction(
      async (transaction): Promise<TestCaseImportResult> => {
        const membership = await getMembership(workspaceId, actorId, transaction);
        assertCanImportTestCases(membership.role);

        // Verify server-side staged session with row lock

        const stagedImport = await TestCaseImportModel.findOne({
          where: { id: importSessionId, workspaceId },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });

        if (!stagedImport) {
          throw new Error('NOT_FOUND: Import session not found or invalid.');
        }

        if (stagedImport.actorId !== actorId) {
          throw new Error('FORBIDDEN: You do not own this import session.');
        }

        if (stagedImport.contentHash !== contentHash) {
          throw new Error(
            'BAD_REQUEST: Content hash mismatch. The uploaded file has been modified.',
          );
        }

        // Idempotent replay: if session is already completed, return existing final result without re-executing
        if (stagedImport.status === 'completed') {
          const failedRowRecords = await TestCaseImportRowModel.findAll({
            where: { importId: importSessionId, outcome: 'failed' },
            order: [['sourceRowNumber', 'ASC']],
            transaction,
          });
          const replayErrors: TestCaseImportRowError[] = failedRowRecords.map((r) => ({
            rowNumber: r.sourceRowNumber,
            externalReference: r.externalReference,
            error: (r.validationErrors || []).join('; ') || 'Row failed validation.',
          }));
          return {
            importId: stagedImport.id,
            workspaceId,
            sourceFileName: stagedImport.sourceFileName,
            mode: stagedImport.mode as TestCaseImportMode,
            status: 'completed' as const,
            totalRows: stagedImport.totalRows,
            createdRows: stagedImport.createdRows,
            updatedRows: stagedImport.updatedRows,
            skippedRows: stagedImport.skippedRows,
            failedRows: stagedImport.failedRows,
            createdAt: iso(stagedImport.createdAt),
            completedAt: iso(stagedImport.completedAt || stagedImport.createdAt),
            errors: replayErrors,
          };
        }

        if (stagedImport.status === 'failed') {
          throw new Error(
            'BAD_REQUEST: This import session has failed and cannot be committed. Please preview a new import.',
          );
        }

        if (stagedImport.status !== 'in_progress') {
          throw new Error('BAD_REQUEST: Import session is not in a valid state to commit.');
        }

        const elapsed = Date.now() - new Date(stagedImport.createdAt).getTime();
        if (elapsed > SESSION_TTL_MS) {
          await stagedImport.update({ status: 'failed' }, { transaction });
          throw new Error(
            'BAD_REQUEST: Import preview session has expired. Please re-upload the file.',
          );
        }

        // Re-fetch current database requirements & test cases in this workspace
        const [requirements, existingTestCases] = await Promise.all([
          RequirementModel.findAll({
            where: { workspaceId },
            attributes: ['id', 'code', 'status'],
            transaction,
          }),
          TestCaseModel.findAll({
            where: { workspaceId },
            attributes: ['id', 'externalReference', 'status'],
            transaction,
          }),
        ]);

        const reqByCode = new Map<string, { id: string; status: string }>();
        for (const req of requirements) {
          reqByCode.set(req.code.trim().toUpperCase(), { id: req.id, status: req.status });
        }

        const existingByExtRef = new Map<string, TestCaseModel>();
        for (const tc of existingTestCases) {
          if (tc.externalReference) {
            existingByExtRef.set(tc.externalReference.trim().toUpperCase(), tc);
          }
        }

        const stagedRows = await TestCaseImportRowModel.findAll({
          where: { importId: importSessionId },
          order: [['sourceRowNumber', 'ASC']],
          transaction,
        });

        let createdRows = 0;
        let updatedRows = 0;
        let skippedRows = 0;
        let failedRows = 0;
        const errors: TestCaseImportRowError[] = [];

        for (const stagedRow of stagedRows) {
          const payload = (stagedRow.parsedPayload || {}) as unknown as TestCaseImportDryRunRow;
          const extRef = (payload.externalReference || '').trim() || null;
          const title = (payload.title || '').trim();
          const reqCode = (payload.requirementCode || '').trim();

          // If the row already failed during preview dry-run, reject it consistently
          if (
            stagedRow.outcome === 'failed' ||
            (stagedRow.validationErrors && stagedRow.validationErrors.length > 0)
          ) {
            failedRows++;
            const errorMsg =
              (stagedRow.validationErrors || []).join('; ') ||
              'Row failed validation during preview.';
            errors.push({
              rowNumber: stagedRow.sourceRowNumber,
              externalReference: extRef,
              error: errorMsg,
            });
            continue;
          }

          // Strict server-side re-validation
          const rowValidationErrors: string[] = [];

          if (!title) {
            rowValidationErrors.push('Test Case Title is required.');
          } else if (title.length > 255) {
            rowValidationErrors.push('Test Case Title must not exceed 255 characters.');
          }

          let resolvedReqId: string | null = null;
          if (!reqCode) {
            rowValidationErrors.push('Requirement Code is required (e.g. REQ-001).');
          } else {
            const req = reqByCode.get(reqCode.toUpperCase());
            if (!req) {
              rowValidationErrors.push(
                `Requirement code "${reqCode}" not found in this workspace.`,
              );
            } else if (req.status !== 'active') {
              rowValidationErrors.push(
                `Requirement "${reqCode}" is not active (${req.status}). Only active requirements can be mapped.`,
              );
            } else {
              resolvedReqId = req.id;
            }
          }

          // Strict Priority
          let priority: 'high' | 'medium' | 'low' = 'medium';
          const rawPriority = (payload.priority || '').trim().toLowerCase();
          if (rawPriority === 'high' || rawPriority === 'medium' || rawPriority === 'low') {
            priority = rawPriority;
          } else if (rawPriority.length > 0) {
            rowValidationErrors.push(
              `Invalid priority "${payload.priority}". Allowed: high, medium, low.`,
            );
          }

          // Strict Scenario Kind
          let scenarioKind: 'positive' | 'negative' = 'positive';
          const rawScenario = (payload.scenarioKind || '').trim().toLowerCase();
          if (rawScenario === 'positive' || rawScenario === 'negative') {
            scenarioKind = rawScenario;
          } else if (rawScenario.length > 0) {
            rowValidationErrors.push(
              `Invalid scenario kind "${payload.scenarioKind}". Allowed: positive, negative.`,
            );
          }

          // Strict Test Type
          let testType: 'manual' | 'e2e' | 'integration' | 'unit' = 'manual';
          const rawType = (payload.testType || '').trim().toLowerCase();
          if (['manual', 'e2e', 'integration', 'unit'].includes(rawType)) {
            testType = rawType as typeof testType;
          } else if (rawType.length > 0) {
            rowValidationErrors.push(
              `Invalid test type "${payload.testType}". Allowed: manual, e2e, integration, unit.`,
            );
          }

          if (rowValidationErrors.length > 0 || !resolvedReqId) {
            failedRows++;
            const errorMsg = rowValidationErrors.join('; ') || 'Row failed validation.';
            errors.push({
              rowNumber: stagedRow.sourceRowNumber,
              externalReference: extRef,
              error: errorMsg,
            });
            await stagedRow.update(
              { outcome: 'failed', validationErrors: rowValidationErrors },
              { transaction },
            );
            continue;
          }

          // Check duplicate
          let existingCase: TestCaseModel | undefined;
          if (extRef) {
            existingCase = existingByExtRef.get(extRef.toUpperCase());
          }

          if (existingCase) {
            if (mode === 'create_only') {
              skippedRows++;
              await stagedRow.update(
                {
                  outcome: 'skipped',
                  validationErrors: ['Skipped: external reference already exists in workspace.'],
                  testCaseId: existingCase.id,
                },
                { transaction },
              );
            } else {
              // mode === 'update'
              await existingCase.update(
                {
                  title,
                  testType,
                  priority,
                  scenarioKind,
                  preconditions: payload.preconditions || null,
                  steps: payload.steps || [],
                  expectedResult: payload.expectedResult || null,
                  testData: payload.testData || null,
                },
                { transaction },
              );

              // Ensure requirement link exists
              const existingReqLink = await TestCaseRequirementModel.findOne({
                where: {
                  workspaceId,
                  testCaseId: existingCase.id,
                  requirementId: resolvedReqId,
                },
                transaction,
              });
              if (!existingReqLink) {
                await TestCaseRequirementModel.create(
                  {
                    workspaceId,
                    testCaseId: existingCase.id,
                    requirementId: resolvedReqId,
                    linkedBy: actorId,
                  },
                  { transaction },
                );
              }

              updatedRows++;
              await stagedRow.update(
                {
                  outcome: 'updated',
                  validationErrors: null,
                  testCaseId: existingCase.id,
                },
                { transaction },
              );

              await TestCaseActivityModel.create(
                {
                  workspaceId,
                  testCaseId: existingCase.id,
                  actorId,
                  action: 'test_case_updated',
                  metadata: { importId: stagedImport.id, source: 'spreadsheet_import' },
                },
                { transaction },
              );
            }
          } else {
            // Create new Test Case (active canonical state for Planner import under ADR-001)
            const createdCase = await TestCaseModel.create(
              {
                workspaceId,
                externalReference: extRef,
                title,
                description: null,
                testType,
                priority,
                status: 'active',
                preconditions: payload.preconditions || null,
                steps: payload.steps || [],
                expectedResult: payload.expectedResult || null,
                testData: payload.testData || null,
                scenarioKind,
                source: 'spreadsheet_import',
                createdBy: actorId,
              },
              { transaction },
            );

            if (extRef) {
              existingByExtRef.set(extRef.toUpperCase(), createdCase);
            }

            await TestCaseRequirementModel.create(
              {
                workspaceId,
                testCaseId: createdCase.id,
                requirementId: resolvedReqId,
                linkedBy: actorId,
              },
              { transaction },
            );

            await TestCaseActivityModel.create(
              {
                workspaceId,
                testCaseId: createdCase.id,
                actorId,
                action: 'test_case_created',
                metadata: {
                  importId: stagedImport.id,
                  source: 'spreadsheet_import',
                  externalReference: extRef,
                },
              },
              { transaction },
            );

            createdRows++;
            await stagedRow.update(
              {
                outcome: 'created',
                validationErrors: null,
                testCaseId: createdCase.id,
              },
              { transaction },
            );
          }
        }

        const completedAt = new Date();
        await stagedImport.update(
          {
            mode,
            status:
              failedRows > 0 && createdRows === 0 && updatedRows === 0 ? 'failed' : 'completed',
            createdRows,
            updatedRows,
            skippedRows,
            failedRows,
            completedAt,
          },
          { transaction },
        );

        return {
          importId: stagedImport.id,
          workspaceId,
          sourceFileName: stagedImport.sourceFileName,
          mode,
          status: stagedImport.status as 'completed',
          totalRows: stagedRows.length,

          createdRows,
          updatedRows,
          skippedRows,
          failedRows,
          createdAt: iso(stagedImport.createdAt),
          completedAt: iso(completedAt),
          errors,
        };
      },
    );

    return result;
  }

  async listImportAudits(workspaceId: string, actorId: string): Promise<TestCaseImportAudit[]> {
    const membership = await getMembership(workspaceId, actorId);
    assertCanImportTestCases(membership.role);

    const imports = await TestCaseImportModel.findAll({
      where: { workspaceId },
      include: [{ model: UserModel, as: 'importer', attributes: ['id', 'name', 'email'] }],
      order: [['createdAt', 'DESC']],
      limit: 50,
    });

    return imports.map((imp) => {
      const importer = (imp as TestCaseImportModel & { importer?: UserModel }).importer;
      return {
        id: imp.id,
        workspaceId: imp.workspaceId,
        actorId: imp.actorId,
        actorName: importer?.name || importer?.email || null,
        sourceFileName: imp.sourceFileName,
        contentHash: imp.contentHash,
        templateVersion: imp.templateVersion,
        mode: imp.mode,
        status: imp.status,
        totalRows: imp.totalRows,
        createdRows: imp.createdRows,
        updatedRows: imp.updatedRows,
        skippedRows: imp.skippedRows,
        failedRows: imp.failedRows,
        createdAt: iso(imp.createdAt),
        completedAt: imp.completedAt ? iso(imp.completedAt) : null,
      };
    });
  }

  async getImportErrorReportCsv(
    workspaceId: string,
    importId: string,
    actorId: string,
  ): Promise<string> {
    const membership = await getMembership(workspaceId, actorId);
    assertCanImportTestCases(membership.role);

    const importRecord = await TestCaseImportModel.findOne({
      where: { id: importId, workspaceId },
    });
    if (!importRecord) {
      throw new Error('NOT_FOUND: Import record not found.');
    }

    const failedRows = await TestCaseImportRowModel.findAll({
      where: { importId, outcome: 'failed' },
      order: [['sourceRowNumber', 'ASC']],
    });

    const headers = ['Row Number', 'External Reference', 'Errors'];
    const escapeCsv = (val: string) => `"${val.replace(/"/g, '""')}"`;
    const lines = [
      headers.join(','),
      ...failedRows.map((r) =>
        [
          String(r.sourceRowNumber),
          escapeCsv(r.externalReference || ''),
          escapeCsv(
            Array.isArray(r.validationErrors) ? r.validationErrors.join('; ') : 'Validation error',
          ),
        ].join(','),
      ),
    ];

    return lines.join('\n');
  }
}

export const testCaseImportService = new TestCaseImportService();
