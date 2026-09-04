import { Op, type Transaction } from 'sequelize';
import {
  AuthSecurityEventListResponseSchema,
  type AuthSecurityEventListResponse,
  type AuthSecurityEventQuery,
  type WorkspaceRole,
} from '@qlick/contracts';
import { AuthSecurityEventModel, WorkspaceMemberModel } from '../../db/models/index.js';

const toResponse = (event: AuthSecurityEventModel) => ({
  id: event.id,
  eventType: event.eventType,
  workspaceId: event.workspaceId,
  actorId: event.actorId,
  subjectUserId: event.subjectUserId,
  metadata: event.metadata,
  createdAt: event.createdAt.toISOString(),
});

export const authSecurityEventService = {
  async recordPasswordResetCompleted(
    subjectUserId: string,
    revokedSessionCount: number,
    transaction: Transaction,
  ): Promise<void> {
    await AuthSecurityEventModel.create(
      {
        eventType: 'password_reset_completed',
        workspaceId: null,
        actorId: null,
        subjectUserId,
        metadata: { revokedSessionCount },
      },
      { transaction },
    );
  },

  async recordPasswordChanged(
    userId: string,
    revokedSessionCount: number,
    transaction: Transaction,
  ): Promise<void> {
    await AuthSecurityEventModel.create(
      {
        eventType: 'password_changed',
        workspaceId: null,
        actorId: userId,
        subjectUserId: userId,
        metadata: { revokedSessionCount },
      },
      { transaction },
    );
  },

  async recordMemberPasswordReset(
    input: {
      workspaceId: string;
      actorId: string;
      subjectUserId: string;
      actorWorkspaceRole: Extract<WorkspaceRole, 'owner' | 'admin'>;
      targetWorkspaceRole: WorkspaceRole;
      revokedSessionCount: number;
    },
    transaction: Transaction,
  ): Promise<void> {
    await AuthSecurityEventModel.create(
      {
        eventType: 'member_password_reset',
        workspaceId: input.workspaceId,
        actorId: input.actorId,
        subjectUserId: input.subjectUserId,
        metadata: {
          revokedSessionCount: input.revokedSessionCount,
          actorWorkspaceRole: input.actorWorkspaceRole,
          targetWorkspaceRole: input.targetWorkspaceRole,
        },
      },
      { transaction },
    );
  },

  async listForActor(
    actorId: string,
    query: AuthSecurityEventQuery,
  ): Promise<AuthSecurityEventListResponse | null> {
    if (query.workspaceId) {
      const membership = await WorkspaceMemberModel.findOne({
        where: {
          workspaceId: query.workspaceId,
          userId: actorId,
          role: { [Op.in]: ['owner', 'admin'] },
        },
      });
      if (!membership) return null;
    }

    const events = await AuthSecurityEventModel.findAll({
      where: query.workspaceId
        ? { workspaceId: query.workspaceId }
        : { [Op.or]: [{ actorId }, { subjectUserId: actorId }] },
      order: [
        ['createdAt', 'DESC'],
        ['id', 'DESC'],
      ],
      limit: query.limit,
    });

    return AuthSecurityEventListResponseSchema.parse({
      events: events.map(toResponse),
      limit: query.limit,
    });
  },
};
