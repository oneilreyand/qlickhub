import { z } from 'zod';

export const QaDocTypeSchema = z.enum([
  'product_brief',
  'test_plan',
  'test_strategy',
  'release_report',
  'qa_guide',
]);
export type QaDocType = z.infer<typeof QaDocTypeSchema>;

export const ProductBriefStatusSchema = z.enum(['draft', 'in_review', 'approved']);
export type ProductBriefStatus = z.infer<typeof ProductBriefStatusSchema>;

export const ProductBriefScopeItemInputSchema = z.object({
  id: z.string().uuid().optional(),
  text: z.string().trim().min(1).max(2_000),
  position: z.number().int().min(0),
});

export const ProductBriefScopeItemSchema = ProductBriefScopeItemInputSchema.extend({
  id: z.string().uuid(),
});
export type ProductBriefScopeItem = z.infer<typeof ProductBriefScopeItemSchema>;

export const ProductBriefAcceptanceCriterionInputSchema = ProductBriefScopeItemInputSchema;
export const ProductBriefAcceptanceCriterionSchema = ProductBriefScopeItemSchema;
export type ProductBriefAcceptanceCriterion = z.infer<typeof ProductBriefAcceptanceCriterionSchema>;

export const QaDocumentSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  folderId: z.string().uuid().nullable().optional(),
  title: z.string().min(1).max(255).trim(),
  docType: QaDocTypeSchema.default('test_plan'),
  status: ProductBriefStatusSchema.default('draft'),
  ownerId: z.string().uuid().nullable().optional(),
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
  inScope: z.array(ProductBriefScopeItemSchema).default([]),
  outScope: z.array(ProductBriefScopeItemSchema).default([]),
  acceptanceCriteria: z.array(ProductBriefAcceptanceCriterionSchema).default([]),
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
  ownerId: z.string().uuid().optional(),
  status: ProductBriefStatusSchema.optional().default('draft'),
  contentMarkdown: z.string().min(1),
  inScope: z.array(ProductBriefScopeItemInputSchema).max(100).optional().default([]),
  outScope: z.array(ProductBriefScopeItemInputSchema).max(100).optional().default([]),
  acceptanceCriteria: z.array(ProductBriefAcceptanceCriterionInputSchema).max(100).optional().default([]),
  changelog: z.string().nullable().optional(),
});

export type CreateQaDocumentInput = z.input<typeof CreateQaDocumentSchema>;

export const CreateQaDocumentVersionSchema = z.object({
  workspaceId: z.string().uuid(),
  documentId: z.string().uuid(),
  title: z.string().min(1).max(255).trim().optional(),
  contentMarkdown: z.string().min(1),
  inScope: z.array(ProductBriefScopeItemInputSchema).max(100).optional().default([]),
  outScope: z.array(ProductBriefScopeItemInputSchema).max(100).optional().default([]),
  acceptanceCriteria: z.array(ProductBriefAcceptanceCriterionInputSchema).max(100).optional().default([]),
  changelog: z.string().nullable().optional(),
});

export type CreateQaDocumentVersionInput = z.input<typeof CreateQaDocumentVersionSchema>;

export const TaskDocumentLinkSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  taskId: z.string().uuid(),
  documentId: z.string().uuid(),
  linkType: z.enum(['reference', 'primary_prd']).default('reference'),
  linkedBy: z.string().uuid(),
  createdAt: z.string(),
  document: QaDocumentSchema.optional(),
});

export type TaskDocumentLink = z.infer<typeof TaskDocumentLinkSchema>;

export const ProductBriefSchema = z.object({
  document: QaDocumentSchema.refine((document) => document.docType === 'product_brief', {
    message: 'A Product Brief must use the product_brief document type.',
  }),
  currentVersion: QaDocumentVersionSchema,
});
export type ProductBrief = z.infer<typeof ProductBriefSchema>;

export const UpsertProductBriefSchema = z.object({
  workspaceId: z.string().uuid(),
  taskId: z.string().uuid(),
  title: z.string().trim().min(1).max(255),
  contentMarkdown: z.string().max(100_000),
  inScope: z.array(ProductBriefScopeItemInputSchema).max(100).default([]),
  outScope: z.array(ProductBriefScopeItemInputSchema).max(100).default([]),
  acceptanceCriteria: z.array(ProductBriefAcceptanceCriterionInputSchema).max(100).default([]),
  ownerId: z.string().uuid().optional(),
  status: ProductBriefStatusSchema.default('draft'),
  changelog: z.string().trim().max(2_000).optional(),
});
export type UpsertProductBriefInput = z.infer<typeof UpsertProductBriefSchema>;

export const ProductBriefResponseSchema = z.object({
  brief: ProductBriefSchema.nullable(),
});
export type ProductBriefResponse = z.infer<typeof ProductBriefResponseSchema>;

export const LinkDocumentSchema = z.object({
  workspaceId: z.string().uuid(),
  documentId: z.string().uuid(),
});

export type LinkDocumentInput = z.infer<typeof LinkDocumentSchema>;
