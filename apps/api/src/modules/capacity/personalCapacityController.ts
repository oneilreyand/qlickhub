import type { Request, Response } from 'express';
import { CreateUserTimeOffSchema, UpdateUserCapacitySchema } from '@qlick/contracts';
import { sendProblemDetails } from '../../http/problemDetails.js';
import {
  addTimeOff,
  getPersonalCapacity,
  removeTimeOff,
  updatePersonalCapacity,
} from './internal/personalCapacity.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type AuthedRequest = Request & { user?: { userId: string } };

/** `me` routes target the caller; `:userId` routes target someone else (or the caller). */
function targetOf(req: AuthedRequest): string {
  const target = req.params.userId ?? req.user!.userId;
  // Unknown or malformed ids answer like "not allowed" so accounts are not revealed.
  if (!UUID.test(target))
    throw new Error('FORBIDDEN: Tidak dapat mengatur kapasitas pengguna ini.');
  return target;
}

/** WORK-FOUNDATION P4 (ADR-044): personal capacity and time off. */
export const personalCapacityController = {
  async get(req: AuthedRequest, res: Response) {
    try {
      const data = await getPersonalCapacity(req.user!.userId, targetOf(req));
      return res.status(200).json({ data });
    } catch (error) {
      return sendProblemDetails(res, error);
    }
  },

  async update(req: AuthedRequest, res: Response) {
    try {
      const parsed = UpdateUserCapacitySchema.safeParse(req.body);
      if (!parsed.success) {
        return sendProblemDetails(res, parsed.error, { zodDetail: 'Kapasitas tidak valid.' });
      }
      const data = await updatePersonalCapacity(req.user!.userId, targetOf(req), parsed.data);
      return res.status(200).json({ data });
    } catch (error) {
      return sendProblemDetails(res, error);
    }
  },

  async addTimeOff(req: AuthedRequest, res: Response) {
    try {
      const parsed = CreateUserTimeOffSchema.safeParse(req.body);
      if (!parsed.success) {
        return sendProblemDetails(res, parsed.error, { zodDetail: 'Cuti tidak valid.' });
      }
      const data = await addTimeOff(req.user!.userId, targetOf(req), parsed.data);
      return res.status(201).json({ data });
    } catch (error) {
      return sendProblemDetails(res, error);
    }
  },

  async removeTimeOff(req: AuthedRequest, res: Response) {
    try {
      const target = targetOf(req);
      const { timeOffId } = req.params;
      if (!UUID.test(timeOffId)) throw new Error('NOT_FOUND: Cuti tidak ditemukan.');
      await removeTimeOff(req.user!.userId, target, timeOffId);
      return res.status(204).send();
    } catch (error) {
      return sendProblemDetails(res, error);
    }
  },
};
