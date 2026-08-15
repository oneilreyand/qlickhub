import { z } from 'zod';

export const QaDocTypeSchema = z.enum([
  'test_plan',
  'test_strategy',
  'release_report',
  'qa_guide',
]);
export type QaDocType = z.infer<typeof QaDocTypeSchema>;

export const QaDocumentSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  folderId: z.string().uuid().nullable().optional(),
  title: z.string().min(1).max(255).trim(),
  docType: QaDocTypeSchema.default('test_plan'),
  currentVersion: z.number().int().min(1),
  createdBy: z.string().uuid(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type QaDocument = z.infer<typeof QaDocumentSchema>;

export const QaDocumentVersionSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  documentId: z.string().uuid(),
  version: z.number().int().min(1),
  title: z.string().min(1).max(255).trim(),
  contentMarkdown: z.string(),
  changelog: z.string().nullable().optional(),
  createdBy: z.string().uuid(),
  createdAt: z.string(),
});

export type QaDocumentVersion = z.infer<typeof QaDocumentVersionSchema>;

export const CreateQaDocumentSchema = z.object({
  workspaceId: z.string().uuid(),
  folderId: z.string().uuid().nullable().optional(),
  title: z.string().min(1).max(255).trim(),
  docType: QaDocTypeSchema.optional().default('test_plan'),
  contentMarkdown: z.string().min(1),
  changelog: z.string().nullable().optional(),
});

export type CreateQaDocumentInput = z.input<typeof CreateQaDocumentSchema>;

export const CreateQaDocumentVersionSchema = z.object({
  workspaceId: z.string().uuid(),
  documentId: z.string().uuid(),
  title: z.string().min(1).max(255).trim().optional(),
  contentMarkdown: z.string().min(1),
  changelog: z.string().nullable().optional(),
});

export type CreateQaDocumentVersionInput = z.infer<typeof CreateQaDocumentVersionSchema>;

export const TaskDocumentLinkSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  taskId: z.string().uuid(),
  documentId: z.string().uuid(),
  linkedBy: z.string().uuid(),
  createdAt: z.string(),
  document: QaDocumentSchema.optional(),
});

export type TaskDocumentLink = z.infer<typeof TaskDocumentLinkSchema>;

export const LinkDocumentSchema = z.object({
  workspaceId: z.string().uuid(),
  documentId: z.string().uuid(),
});

export type LinkDocumentInput = z.infer<typeof LinkDocumentSchema>;
