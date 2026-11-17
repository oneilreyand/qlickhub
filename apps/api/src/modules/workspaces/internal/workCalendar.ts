import type {
  CreateWorkspaceHolidayInput,
  UpdateWorkCalendarInput,
  WorkCalendar,
  WorkspaceHoliday,
} from '@qlick/contracts';
import { UniqueConstraintError } from 'sequelize';
import { WorkspaceHolidayModel, WorkspaceModel } from '../../../db/models/index.js';

/** WORK-FOUNDATION P2 (ADR-044): read and maintain a Workspace work calendar. */

const formatHoliday = (holiday: WorkspaceHolidayModel): WorkspaceHoliday => ({
  id: holiday.id,
  date: holiday.holidayDate,
  name: holiday.name,
});

async function requireWorkspace(workspaceId: string) {
  const workspace = await WorkspaceModel.findByPk(workspaceId);
  if (!workspace) throw new Error('NOT_FOUND: Workspace not found.');
  return workspace;
}

function assertNotArchived(workspace: WorkspaceModel) {
  if (workspace.archivedAt) {
    throw new Error('CONFLICT: Workspace diarsipkan; kalender kerja tidak dapat diubah.');
  }
}

export async function getWorkCalendar(workspaceId: string): Promise<WorkCalendar> {
  const workspace = await requireWorkspace(workspaceId);
  const holidays = await WorkspaceHolidayModel.findAll({
    where: { workspaceId },
    order: [['holidayDate', 'ASC']],
  });
  return {
    workspaceId,
    timezone: workspace.timezone,
    workingDays: [...workspace.workingDays].map(Number).sort((a, b) => a - b),
    defaultWeeklyCapacityPoints: workspace.defaultWeeklyCapacityPoints,
    holidays: holidays.map(formatHoliday),
  };
}

export async function updateWorkCalendar(
  workspaceId: string,
  input: UpdateWorkCalendarInput,
): Promise<WorkCalendar> {
  const workspace = await requireWorkspace(workspaceId);
  assertNotArchived(workspace);
  workspace.timezone = input.timezone;
  workspace.workingDays = input.workingDays;
  if (input.defaultWeeklyCapacityPoints !== undefined) {
    workspace.defaultWeeklyCapacityPoints = input.defaultWeeklyCapacityPoints;
  }
  await workspace.save();
  return getWorkCalendar(workspaceId);
}

export async function addWorkspaceHoliday(
  workspaceId: string,
  actorId: string,
  input: CreateWorkspaceHolidayInput,
): Promise<WorkspaceHoliday> {
  const workspace = await requireWorkspace(workspaceId);
  assertNotArchived(workspace);
  try {
    const holiday = await WorkspaceHolidayModel.create({
      workspaceId,
      holidayDate: input.date,
      name: input.name,
      createdBy: actorId,
    });
    return formatHoliday(holiday);
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      throw new Error(`CONFLICT: Tanggal ${input.date} sudah tercatat sebagai hari libur.`, {
        cause: error,
      });
    }
    throw error;
  }
}

export async function deleteWorkspaceHoliday(workspaceId: string, holidayId: string) {
  const workspace = await requireWorkspace(workspaceId);
  assertNotArchived(workspace);
  const deleted = await WorkspaceHolidayModel.destroy({ where: { id: holidayId, workspaceId } });
  if (deleted === 0) throw new Error('NOT_FOUND: Hari libur tidak ditemukan.');
}
