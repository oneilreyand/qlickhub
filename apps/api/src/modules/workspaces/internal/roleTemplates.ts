import { UniqueConstraintError } from 'sequelize';
import {
  ROLE_TEMPLATE_MAX_PER_USER,
  type CreateRoleTemplateInput,
  type RoleTemplate,
} from '@qlick/contracts';
import { CreateRoleTemplateSchema } from '@qlick/contracts';
import { MemberRoleTemplateModel } from '../../../db/models/memberRoleTemplate.js';
import { getActiveManagedWorkspaces } from './managedWorkspaces.js';

/**
 * MEMBER-ACCESS-HUB P4 (ADR-046): role templates. Owned by one person and visible only to them.
 * A template grants nothing; entries for Workspaces the owner no longer manages (or that were
 * archived) are reported as unavailable and skipped when the template is used.
 */
function toView(
  template: MemberRoleTemplateModel,
  workspaceNames: Map<string, string>,
): RoleTemplate {
  return {
    id: template.id,
    name: template.name,
    createdAt: new Date(template.createdAt).toISOString(),
    entries: template.entries.map((entry) => ({
      workspaceId: entry.workspaceId,
      workspaceName: workspaceNames.get(entry.workspaceId) ?? null,
      role: entry.role,
      specialties: entry.role === 'dev' ? entry.specialties : [],
      available: workspaceNames.has(entry.workspaceId),
    })),
  };
}

export async function listRoleTemplates(actorId: string): Promise<RoleTemplate[]> {
  const workspaces = await getActiveManagedWorkspaces(actorId);
  const names = new Map(workspaces.map((workspace) => [workspace.id, workspace.name]));
  const templates = await MemberRoleTemplateModel.findAll({
    where: { ownerUserId: actorId },
    order: [['name', 'ASC']],
  });
  return templates.map((template) => toView(template, names));
}

export async function createRoleTemplate(
  actorId: string,
  rawInput: CreateRoleTemplateInput,
): Promise<RoleTemplate> {
  const input = CreateRoleTemplateSchema.parse(rawInput);
  const workspaces = await getActiveManagedWorkspaces(actorId);
  const names = new Map(workspaces.map((workspace) => [workspace.id, workspace.name]));
  if (input.entries.some((entry) => !names.has(entry.workspaceId))) {
    throw new Error(
      'FORBIDDEN: Template hanya boleh berisi Workspace aktif yang Anda kelola sebagai Owner atau Admin.',
    );
  }
  const count = await MemberRoleTemplateModel.count({ where: { ownerUserId: actorId } });
  if (count >= ROLE_TEMPLATE_MAX_PER_USER) {
    throw new Error(
      `UNPROCESSABLE_ENTITY: Maksimal ${ROLE_TEMPLATE_MAX_PER_USER} template per orang.`,
    );
  }
  try {
    const template = await MemberRoleTemplateModel.create({
      ownerUserId: actorId,
      name: input.name,
      entries: input.entries.map((entry) => ({
        workspaceId: entry.workspaceId,
        role: entry.role,
        specialties: entry.role === 'dev' ? [...entry.specialties].sort() : [],
      })),
    });
    return toView(template, names);
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      throw new Error(`CONFLICT: Template bernama "${input.name}" sudah ada.`, { cause: error });
    }
    throw error;
  }
}

export async function deleteRoleTemplate(actorId: string, templateId: string): Promise<void> {
  const deleted = await MemberRoleTemplateModel.destroy({
    where: { id: templateId, ownerUserId: actorId },
  });
  if (deleted === 0) throw new Error('NOT_FOUND: Template tidak ditemukan.');
}
