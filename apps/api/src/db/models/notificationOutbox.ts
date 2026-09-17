import { DataTypes, Model, Optional } from 'sequelize';
import type { NotificationType } from '@qlick/contracts';
import { sequelize } from '../sequelize.js';

export type NotificationDeliveryStatus =
  'pending' | 'processing' | 'delivered' | 'failed' | 'dead_letter';

export interface NotificationOutboxAttributes {
  id: string;
  workspaceId: string;
  taskId?: string | null;
  actorId?: string | null;
  recipientUserId: string;
  eventKey: string;
  notificationType: NotificationType;
  title: string;
  message: string;
  payloadJson: Record<string, string>;
  deliveryStatus: NotificationDeliveryStatus;
  attempts: number;
  nextAttemptAt?: Date;
  deliveredAt?: Date | null;
  deadLetteredAt?: Date | null;
  lastError?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

type CreationAttributes = Optional<
  NotificationOutboxAttributes,
  | 'id'
  | 'taskId'
  | 'actorId'
  | 'payloadJson'
  | 'deliveryStatus'
  | 'attempts'
  | 'nextAttemptAt'
  | 'deliveredAt'
  | 'deadLetteredAt'
  | 'lastError'
  | 'createdAt'
  | 'updatedAt'
>;

export class NotificationOutboxModel
  extends Model<NotificationOutboxAttributes, CreationAttributes>
  implements NotificationOutboxAttributes
{
  declare id: string;
  declare workspaceId: string;
  declare taskId: string | null;
  declare actorId: string | null;
  declare recipientUserId: string;
  declare eventKey: string;
  declare notificationType: NotificationType;
  declare title: string;
  declare message: string;
  declare payloadJson: Record<string, string>;
  declare deliveryStatus: NotificationDeliveryStatus;
  declare attempts: number;
  declare nextAttemptAt: Date;
  declare deliveredAt: Date | null;
  declare deadLetteredAt: Date | null;
  declare lastError: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

NotificationOutboxModel.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    workspaceId: { type: DataTypes.UUID, allowNull: false, field: 'workspace_id' },
    taskId: { type: DataTypes.UUID, allowNull: true, field: 'task_id' },
    actorId: { type: DataTypes.UUID, allowNull: true, field: 'actor_id' },
    recipientUserId: { type: DataTypes.UUID, allowNull: false, field: 'recipient_user_id' },
    eventKey: { type: DataTypes.STRING(255), allowNull: false, field: 'event_key' },
    notificationType: { type: DataTypes.STRING(32), allowNull: false, field: 'notification_type' },
    title: { type: DataTypes.STRING(255), allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: false },
    payloadJson: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
      field: 'payload_json',
    },
    deliveryStatus: {
      type: DataTypes.STRING(16),
      allowNull: false,
      defaultValue: 'pending',
      field: 'delivery_status',
    },
    attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    nextAttemptAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'next_attempt_at',
    },
    deliveredAt: { type: DataTypes.DATE, allowNull: true, field: 'delivered_at' },
    deadLetteredAt: { type: DataTypes.DATE, allowNull: true, field: 'dead_lettered_at' },
    lastError: { type: DataTypes.TEXT, allowNull: true, field: 'last_error' },
  },
  { sequelize, tableName: 'notification_outbox', timestamps: true, underscored: true },
);
