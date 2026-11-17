import { Response } from 'express';
import { CreateWorkspaceHolidaySchema, UpdateWorkCalendarSchema } from '@qlick/contracts';
import { AuthenticatedRequest } from '../../http/middleware/authenticate.js';
import { sendProblemDetails } from '../../http/problemDetails.js';
import {
  addWorkspaceHoliday,
  deleteWorkspaceHoliday,
  getWorkCalendar,
  updateWorkCalendar,
} from './internal/workCalendar.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const getWorkCalendarHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    return res.status(200).json({ data: await getWorkCalendar(req.params.workspaceId) });
  } catch (error) {
    return sendProblemDetails(res, error);
  }
};

export const updateWorkCalendarHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = UpdateWorkCalendarSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendProblemDetails(res, parsed.error, { zodDetail: 'Kalender kerja tidak valid.' });
    }
    return res
      .status(200)
      .json({ data: await updateWorkCalendar(req.params.workspaceId, parsed.data) });
  } catch (error) {
    return sendProblemDetails(res, error);
  }
};

export const addWorkspaceHolidayHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = CreateWorkspaceHolidaySchema.safeParse(req.body);
    if (!parsed.success) {
      return sendProblemDetails(res, parsed.error, { zodDetail: 'Hari libur tidak valid.' });
    }
    const holiday = await addWorkspaceHoliday(
      req.params.workspaceId,
      req.user!.userId,
      parsed.data,
    );
    return res.status(201).json({ data: holiday });
  } catch (error) {
    return sendProblemDetails(res, error);
  }
};

export const deleteWorkspaceHolidayHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!UUID.test(req.params.holidayId)) {
      throw new Error('NOT_FOUND: Hari libur tidak ditemukan.');
    }
    await deleteWorkspaceHoliday(req.params.workspaceId, req.params.holidayId);
    return res.status(204).send();
  } catch (error) {
    return sendProblemDetails(res, error);
  }
};
