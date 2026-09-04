import { DataTypes, Model, Optional } from 'sequelize';
import type { AuthSecurityEvent, AuthSecurityEventType, WorkspaceRole } from '@qlick/contracts';
import { sequelize } from '../sequelize.js';

export type AuthSecurityEventMetadata =
  | { revokedSessionCount: number }
  | {
      revokedSessionCount: number;
      actorWorkspaceRole: Extract<WorkspaceRole, 'owner' | 'admin'>;
      targetWorkspaceRole: WorkspaceRole;
    };

export interface AuthSecurityEventAttributes {
  id: string;
  eventType: AuthSecurityEventType;
  workspaceId: string | null;
  actorId: string | null;
  subjectUserId: string | null;
  metadata: AuthSecurityEventMetadata;
  createdAt?: Date;
}

type AuthSecurityEventCreationAttributes = Optional<
  AuthSecurityEventAttributes,
  'id' | 'createdAt'
>;

export class AuthSecurityEventModel
  extends Model<AuthSecurityEventAttributes, AuthSecurityEventCreationAttributes>
  implements AuthSecurityEventAttributes
{
  declare id: string;
  declare eventType: AuthSecurityEventType;
  declare workspaceId: string | null;
  declare actorId: string | null;
  declare subjectUserId: string | null;
  declare metadata: AuthSecurityEvent['metadata'];
  declare readonly createdAt: Date;
}

AuthSecurityEventModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    eventType: {
      type: DataTypes.STRING(40),
      allowNull: false,
      field: 'event_type',
    },
    workspaceId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'workspace_id',
    },
    actorId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'actor_id',
    },
    subjectUserId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'subject_user_id',
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: false,
      field: 'metadata_json',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'created_at',
    },
  },
  {
    sequelize,
    tableName: 'auth_security_events',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: false,
    underscored: true,
  },
);
