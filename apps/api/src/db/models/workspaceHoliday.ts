import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize.js';

/** WORK-FOUNDATION P2 (ADR-044): a non-working date in a Workspace work calendar. */
export interface WorkspaceHolidayAttributes {
  id: string;
  workspaceId: string;
  holidayDate: string;
  name: string;
  createdBy?: string | null;
  createdAt?: Date;
}

export interface WorkspaceHolidayCreationAttributes extends Optional<
  WorkspaceHolidayAttributes,
  'id' | 'createdBy' | 'createdAt'
> {}

export class WorkspaceHolidayModel
  extends Model<WorkspaceHolidayAttributes, WorkspaceHolidayCreationAttributes>
  implements WorkspaceHolidayAttributes
{
  declare id: string;
  declare workspaceId: string;
  declare holidayDate: string;
  declare name: string;
  declare createdBy: string | null;
  declare readonly createdAt: Date;
}

WorkspaceHolidayModel.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    workspaceId: { type: DataTypes.UUID, allowNull: false, field: 'workspace_id' },
    holidayDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'holiday_date' },
    name: { type: DataTypes.STRING(120), allowNull: false },
    createdBy: { type: DataTypes.UUID, allowNull: true, field: 'created_by' },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
  },
  {
    sequelize,
    tableName: 'workspace_holidays',
    timestamps: false,
    underscored: true,
  },
);
