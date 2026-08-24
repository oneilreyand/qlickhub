import type { Transaction } from 'sequelize';
import type {
  CommitTestCaseImportInput,
  TestCaseImportAudit,
  TestCaseImportDryRunRow,
  TestCaseImportPreviewResponse,
  TestCaseImportResult,
  TestCaseImportRowError,
} from '@qlick/contracts';
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
import { computeContentHash, parseCsvContent, parseXlsxContent } from './spreadsheetParser.js';

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
  ): Promise<TestCaseImportPreviewResponse> {
    const membership = await getMembership(workspaceId, actorId);
    assertCanImportTestCases(membership.role);

    const isBuffer = Buffer.isBuffer(fileBuffer);
    const contentHash = computeContentHash(fileBuffer);

    const parsedRows = isBuffer
      ? parseXlsxContent(fileBuffer)
      : parseCsvContent(fileBuffer.toString());

    if (parsedRows.length === 0) {
      throw new Error('BAD_REQUEST: The uploaded file contains no valid data rows or headers.');
    }

    const [requirements, existingTestCases] = await Promise.all([
      RequirementModel.findAll({
        where: { workspaceId },
        attributes: ['id', 'code', 'title'],
      }),
      TestCaseModel.findAll({
        where: { workspaceId },
        attributes: ['id', 'externalReference'],
      }),
    ]);

    const reqByCode = new Map<string, string>();
    for (const req of requirements) {
      reqByCode.set(req.code.trim().toUpperCase(), req.id);
    }

    const existingByExtRef = new Map<string, string>();
    for (const tc of existingTestCases) {
      if (tc.externalReference) {
        existingByExtRef.set(tc.externalReference.trim().toUpperCase(), tc.id);
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
        } else {
          resolvedReqId = found;
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
          existingTestCaseId = dbMatch;
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

    return {
      fileName,
      contentHash,
      templateVersion: '1.0',
      totalRows: dryRunRows.length,
      validRows: validCount,
      invalidRows: invalidCount,
      duplicateRows: duplicateCount,
      rows: dryRunRows,
    };
  }

  async commitImport(
    actorId: string,
    input: CommitTestCaseImportInput,
  ): Promise<TestCaseImportResult> {
    const { workspaceId, fileName, contentHash, mode, rows } = input;

    const result = await sequelize.transaction(async (transaction) => {
      const membership = await getMembership(workspaceId, actorId, transaction);
      assertCanImportTestCases(membership.role);

      const importRecord = await TestCaseImportModel.create(
        {
          workspaceId,
          actorId,
          sourceFileName: fileName,
          contentHash,
          templateVersion: '1.0',
          mode,
          status: 'in_progress',
          totalRows: rows.length,
          createdRows: 0,
          updatedRows: 0,
          skippedRows: 0,
          failedRows: 0,
        },
        { transaction },
      );

      let createdRows = 0;
      let updatedRows = 0;
      let skippedRows = 0;
      let failedRows = 0;
      const errors: TestCaseImportRowError[] = [];

      for (const row of rows) {
        if (!row.isValid || !row.resolvedRequirementId || !row.title) {
          failedRows++;
          const errorMsg = row.validationErrors.join('; ') || 'Invalid row data.';
          errors.push({
            rowNumber: row.sourceRowNumber,
            externalReference: row.externalReference,
            error: errorMsg,
          });

          await TestCaseImportRowModel.create(
            {
              importId: importRecord.id,
              sourceRowNumber: row.sourceRowNumber,
              externalReference: row.externalReference,
              parsedPayload: row as unknown as Record<string, unknown>,
              outcome: 'failed',
              validationErrors: row.validationErrors,
              testCaseId: null,
            },
            { transaction },
          );
          continue;
        }

        let existingCase: TestCaseModel | null = null;
        if (row.externalReference) {
          existingCase = await TestCaseModel.findOne({
            where: { workspaceId, externalReference: row.externalReference },
            transaction,
          });
        }

        if (existingCase) {
          if (mode === 'create_only') {
            skippedRows++;
            await TestCaseImportRowModel.create(
              {
                importId: importRecord.id,
                sourceRowNumber: row.sourceRowNumber,
                externalReference: row.externalReference,
                parsedPayload: row as unknown as Record<string, unknown>,
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
                title: row.title,
                testType: row.testType,
                priority: row.priority,
                scenarioKind: row.scenarioKind,
                preconditions: row.preconditions || null,
                steps: row.steps,
                expectedResult: row.expectedResult || null,
                testData: row.testData || null,
              },
              { transaction },
            );

            // Ensure requirement link exists
            const existingReqLink = await TestCaseRequirementModel.findOne({
              where: {
                workspaceId,
                testCaseId: existingCase.id,
                requirementId: row.resolvedRequirementId,
              },
              transaction,
            });
            if (!existingReqLink) {
              await TestCaseRequirementModel.create(
                {
                  workspaceId,
                  testCaseId: existingCase.id,
                  requirementId: row.resolvedRequirementId,
                  linkedBy: actorId,
                },
                { transaction },
              );
            }

            updatedRows++;
            await TestCaseImportRowModel.create(
              {
                importId: importRecord.id,
                sourceRowNumber: row.sourceRowNumber,
                externalReference: row.externalReference,
                parsedPayload: row as unknown as Record<string, unknown>,
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
                metadata: { importId: importRecord.id, source: 'spreadsheet_import' },
              },
              { transaction },
            );
          }
        } else {
          // Create new Test Case
          const createdCase = await TestCaseModel.create(
            {
              workspaceId,
              externalReference: row.externalReference || null,
              title: row.title,
              description: null,
              testType: row.testType,
              priority: row.priority,
              status: 'draft',
              preconditions: row.preconditions || null,
              steps: row.steps,
              expectedResult: row.expectedResult || null,
              testData: row.testData || null,
              scenarioKind: row.scenarioKind,
              source: 'spreadsheet_import',
              createdBy: actorId,
            },
            { transaction },
          );

          await TestCaseRequirementModel.create(
            {
              workspaceId,
              testCaseId: createdCase.id,
              requirementId: row.resolvedRequirementId,
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
                importId: importRecord.id,
                source: 'spreadsheet_import',
                externalReference: row.externalReference,
              },
            },
            { transaction },
          );

          createdRows++;
          await TestCaseImportRowModel.create(
            {
              importId: importRecord.id,
              sourceRowNumber: row.sourceRowNumber,
              externalReference: row.externalReference,
              parsedPayload: row as unknown as Record<string, unknown>,
              outcome: 'created',
              validationErrors: null,
              testCaseId: createdCase.id,
            },
            { transaction },
          );
        }
      }

      const completedAt = new Date();
      await importRecord.update(
        {
          status: failedRows > 0 && createdRows === 0 && updatedRows === 0 ? 'failed' : 'completed',
          createdRows,
          updatedRows,
          skippedRows,
          failedRows,
          completedAt,
        },
        { transaction },
      );

      return {
        importId: importRecord.id,
        workspaceId,
        sourceFileName: fileName,
        mode,
        status: importRecord.status,
        totalRows: rows.length,
        createdRows,
        updatedRows,
        skippedRows,
        failedRows,
        createdAt: iso(importRecord.createdAt),
        completedAt: iso(completedAt),
        errors,
      };
    });

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
