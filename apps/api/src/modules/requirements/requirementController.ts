import { Response } from 'express';
import { AuthenticatedRequest } from '../../http/middleware/authenticate.js';
import { requirementService } from './requirementService.js';
import {
  CreateRequirementSchema,
  UpdateRequirementSchema,
  CreateAcceptanceCriterionSchema,
  UpdateAcceptanceCriterionSchema,
  LinkRequirementSchema,
  BulkCorrectTaskRequirementsSchema,
} from '@qlick/contracts';
import { sendProblemDetails } from '../../http/problemDetails.js';

export const listWorkspaceRequirements = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const actorId = req.user!.userId;
    const requirements = await requirementService.listWorkspaceRequirements(workspaceId, actorId);
    return res.status(200).json({ requirements });
  } catch (error) {
    return sendProblemDetails(res, error, { zodCode: 'VALIDATION_ERROR' });
  }
};

export const getRequirementDetail = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workspaceId, requirementId } = req.params;
    const actorId = req.user!.userId;
    const detail = await requirementService.getRequirementDetail(
      workspaceId,
      requirementId,
      actorId,
    );
    return res.status(200).json(detail);
  } catch (error) {
    return sendProblemDetails(res, error, { zodCode: 'VALIDATION_ERROR' });
  }
};

export const createRequirement = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const actorId = req.user!.userId;

    const parsed = CreateRequirementSchema.parse({
      ...req.body,
      workspaceId,
    });

    const requirement = await requirementService.createRequirement(workspaceId, actorId, parsed);
    return res.status(201).json({ requirement });
  } catch (error) {
    return sendProblemDetails(res, error, { zodCode: 'VALIDATION_ERROR' });
  }
};

export const updateRequirement = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workspaceId, requirementId } = req.params;
    const actorId = req.user!.userId;

    const parsed = UpdateRequirementSchema.parse(req.body);
    const requirement = await requirementService.updateRequirement(
      workspaceId,
      requirementId,
      actorId,
      parsed,
    );
    return res.status(200).json({ requirement });
  } catch (error) {
    return sendProblemDetails(res, error, { zodCode: 'VALIDATION_ERROR' });
  }
};

export const listAcceptanceCriteria = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workspaceId, requirementId } = req.params;
    const actorId = req.user!.userId;
    const acceptanceCriteria = await requirementService.listAcceptanceCriteria(
      workspaceId,
      requirementId,
      actorId,
    );
    return res.status(200).json({ acceptanceCriteria });
  } catch (error) {
    return sendProblemDetails(res, error, { zodCode: 'VALIDATION_ERROR' });
  }
};

export const createAcceptanceCriterion = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workspaceId, requirementId } = req.params;
    const actorId = req.user!.userId;
    const parsed = CreateAcceptanceCriterionSchema.parse({
      ...req.body,
      workspaceId,
      requirementId,
    });
    const acceptanceCriterion = await requirementService.createAcceptanceCriterion(
      workspaceId,
      requirementId,
      actorId,
      parsed,
    );
    return res.status(201).json({ acceptanceCriterion });
  } catch (error) {
    return sendProblemDetails(res, error, { zodCode: 'VALIDATION_ERROR' });
  }
};

export const updateAcceptanceCriterion = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workspaceId, requirementId, criterionId } = req.params;
    const actorId = req.user!.userId;
    const parsed = UpdateAcceptanceCriterionSchema.parse(req.body);
    const acceptanceCriterion = await requirementService.updateAcceptanceCriterion(
      workspaceId,
      requirementId,
      criterionId,
      actorId,
      parsed,
    );
    return res.status(200).json({ acceptanceCriterion });
  } catch (error) {
    return sendProblemDetails(res, error, { zodCode: 'VALIDATION_ERROR' });
  }
};

export const listTaskRequirements = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workspaceId, taskId } = req.params;
    const actorId = req.user!.userId;
    const links = await requirementService.listTaskRequirementLinks(workspaceId, taskId, actorId);
    return res.status(200).json({ links });
  } catch (error) {
    return sendProblemDetails(res, error, { zodCode: 'VALIDATION_ERROR' });
  }
};

export const linkRequirementToTask = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workspaceId, taskId } = req.params;
    const actorId = req.user!.userId;

    const parsed = LinkRequirementSchema.parse({
      ...req.body,
      workspaceId,
    });

    let targetRequirementId = parsed.requirementId;

    if (!targetRequirementId) {
      if (!parsed.title) {
        return sendProblemDetails(
          res,
          new Error(
            'BAD_REQUEST: Either requirementId or title must be provided to embed a reference link.',
          ),
        );
      }
      const created = await requirementService.createRequirement(workspaceId, actorId, {
        code: parsed.code,
        title: parsed.title,
        url: parsed.url,
      });
      targetRequirementId = created.id;
    }

    const link = await requirementService.linkRequirementToTask(
      workspaceId,
      taskId,
      actorId,
      targetRequirementId,
    );
    return res.status(201).json({ link });
  } catch (error) {
    return sendProblemDetails(res, error, { zodCode: 'VALIDATION_ERROR' });
  }
};

export const unlinkRequirementFromTask = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workspaceId, taskId, requirementId } = req.params;
    const actorId = req.user!.userId;

    await requirementService.unlinkRequirementFromTask(workspaceId, taskId, actorId, requirementId);
    return res.status(200).json({ success: true });
  } catch (error) {
    return sendProblemDetails(res, error, { zodCode: 'VALIDATION_ERROR' });
  }
};

export const bulkCorrectTaskRequirements = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workspaceId, taskId } = req.params;
    const actorId = req.user!.userId;
    const parsed = BulkCorrectTaskRequirementsSchema.parse({
      ...req.body,
      workspaceId,
    });

    const result = await requirementService.bulkCorrectTaskRequirements(
      workspaceId,
      taskId,
      actorId,
      parsed,
    );
    return res.status(200).json(result);
  } catch (error) {
    return sendProblemDetails(res, error, { zodCode: 'VALIDATION_ERROR' });
  }
};
