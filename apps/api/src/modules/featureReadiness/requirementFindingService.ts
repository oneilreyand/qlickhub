import { Op, type Transaction } from 'sequelize';
import type {
  CreateRequirementFindingClarificationInput,
  CreateRequirementFindingGovernanceDecisionInput,
  CreateRequirementFindingInput,
  CreateRequirementFindingStatusEventInput,
  CreateRequirementFindingTriagePositionInput,
  RequirementFinding,
  RequirementFindingCause,
  RequirementFindingClarification,
  RequirementFindingState,
  RequirementFindingStatusEvent,
  RequirementFindingTriageDecision,
  RequirementFindingTriageGroup,
  RequirementFindingTriagePosition,
  WorkspaceRole,
} from '@qlick/contracts';
import { RequirementFindingStateSchema } from '@qlick/contracts';
import { sequelize } from '../../db/sequelize.js';
import {
  RequirementFindingClarificationModel,
  RequirementFindingModel,
  RequirementFindingStatusEventModel,
  RequirementFindingTriageDecisionModel,
  RequirementFindingTriagePositionModel,
  RequirementModel,
  TaskActivityModel,
  TaskModel,
  TaskRequirementModel,
} from '../../db/models/index.js';
import { requireActiveMember } from '../../db/repositories/workspaceMemberRepository.js';
import {
  assertCanGovernRequirementFindingDispute,
  assertCanResolveRequirementFinding,
  triageGroupForRole,
} from '../../policies/featureReadinessPolicy.js';

const TRIAGE_GROUPS: RequirementFindingTriageGroup[] = ['product', 'development', 'qa'];

function iso(value: Date | string): string {
  return new Date(value).toISOString();
}

function formatClarification(
  item: RequirementFindingClarificationModel,
): RequirementFindingClarification {
  return {
    id: item.id,
    workspaceId: item.workspaceId,
    findingId: item.findingId,
    message: item.message,
    authorGroup: item.authorGroup,
    createdBy: item.createdBy,
    createdAt: iso(item.createdAt),
  };
}

function formatPosition(
  item: RequirementFindingTriagePositionModel,
): RequirementFindingTriagePosition {
  return {
    id: item.id,
    workspaceId: item.workspaceId,
    findingId: item.findingId,
    participantGroup: item.participantGroup,
    classification: item.classification,
    rationale: item.rationale,
    createdBy: item.createdBy,
    createdAt: iso(item.createdAt),
  };
}

function formatDecision(
  item: RequirementFindingTriageDecisionModel,
): RequirementFindingTriageDecision {
  return {
    id: item.id,
    workspaceId: item.workspaceId,
    findingId: item.findingId,
    version: item.version,
    classification: item.classification,
    mode: item.mode,
    rationale: item.rationale,
    positionIds: item.positionIds,
    supersedesDecisionId: item.supersedesDecisionId || null,
    recordedBy: item.recordedBy,
    recordedAt: iso(item.recordedAt),
  };
}

function formatStatusEvent(
  item: RequirementFindingStatusEventModel,
): RequirementFindingStatusEvent {
  return {
    id: item.id,
    workspaceId: item.workspaceId,
    findingId: item.findingId,
    action: item.action,
    reason: item.reason,
    createdBy: item.createdBy,
    createdAt: iso(item.createdAt),
  };
}

function latestPositions(
  positions: RequirementFindingTriagePositionModel[],
): Record<RequirementFindingTriageGroup, RequirementFindingTriagePositionModel | null> {
  const latest: Record<
    RequirementFindingTriageGroup,
    RequirementFindingTriagePositionModel | null
  > = { product: null, development: null, qa: null };
  for (const position of positions) {
    if (!latest[position.participantGroup]) latest[position.participantGroup] = position;
  }
  return latest;
}

function positionsMatchDecision(
  positions: Record<RequirementFindingTriageGroup, RequirementFindingTriagePositionModel | null>,
  decision: RequirementFindingTriageDecisionModel | null,
): boolean {
  if (!decision) return false;
  return TRIAGE_GROUPS.every((group) => positions[group]?.id === decision.positionIds[group]);
}

export class RequirementFindingService {
  async getState(
    workspaceId: string,
    featureTaskId: string,
    actorId: string,
  ): Promise<RequirementFindingState> {
    return sequelize.transaction(async (transaction) => {
      const membership = await requireActiveMember(workspaceId, actorId, transaction);
      await this.requireFeature(workspaceId, featureTaskId, transaction);
      return this.buildState(workspaceId, featureTaskId, membership.role, transaction);
    });
  }

  async createFinding(
    actorId: string,
    input: CreateRequirementFindingInput,
  ): Promise<RequirementFinding> {
    return sequelize.transaction(async (transaction) => {
      const membership = await requireActiveMember(input.workspaceId, actorId, transaction);
      await this.requireFeature(input.workspaceId, input.featureTaskId, transaction);
      const linkedRequirements = await this.loadLinkedRequirements(
        input.workspaceId,
        input.featureTaskId,
        transaction,
      );
      const requirement = linkedRequirements.find((item) => item.id === input.requirementId);
      if (!requirement) {
        throw new Error(
          'CONFLICT: A Requirement finding must reference a Requirement linked to this Feature or one of its Subtasks.',
        );
      }

      const finding = await RequirementFindingModel.create(
        {
          workspaceId: input.workspaceId,
          featureTaskId: input.featureTaskId,
          requirementId: requirement.id,
          requirementCode: requirement.code,
          requirementTitle: requirement.title,
          requirementStatus: requirement.status,
          category: input.category,
          severity: input.severity,
          summary: input.summary.trim(),
          details: input.details.trim(),
          proposedCause: input.proposedCause,
          reporterGroup: triageGroupForRole(membership.role),
          reportedBy: actorId,
        },
        { transaction },
      );

      await this.recordActivity(
        input.workspaceId,
        input.featureTaskId,
        actorId,
        'feature.requirement_finding.recorded',
        {
          findingId: finding.id,
          requirementId: finding.requirementId,
          category: finding.category,
          severity: finding.severity,
          proposedCause: finding.proposedCause,
          mode: 'observation',
        },
        transaction,
      );
      return this.buildFinding(finding, transaction);
    });
  }

  async addClarification(
    actorId: string,
    input: CreateRequirementFindingClarificationInput,
  ): Promise<RequirementFinding> {
    return sequelize.transaction(async (transaction) => {
      const membership = await requireActiveMember(input.workspaceId, actorId, transaction);
      const finding = await this.requireFinding(input, transaction, true);
      const clarification = await RequirementFindingClarificationModel.create(
        {
          workspaceId: input.workspaceId,
          findingId: finding.id,
          message: input.message.trim(),
          authorGroup: triageGroupForRole(membership.role),
          createdBy: actorId,
        },
        { transaction },
      );
      await this.recordActivity(
        input.workspaceId,
        input.featureTaskId,
        actorId,
        'feature.requirement_finding.clarified',
        { findingId: finding.id, clarificationId: clarification.id },
        transaction,
      );
      return this.buildFinding(finding, transaction);
    });
  }

  async addTriagePosition(
    actorId: string,
    input: CreateRequirementFindingTriagePositionInput,
  ): Promise<RequirementFinding> {
    return sequelize.transaction(async (transaction) => {
      const membership = await requireActiveMember(input.workspaceId, actorId, transaction);
      const finding = await this.requireFinding(input, transaction, true);
      await this.assertFindingOpen(finding, transaction);
      const participantGroup = triageGroupForRole(membership.role);
      const position = await RequirementFindingTriagePositionModel.create(
        {
          workspaceId: input.workspaceId,
          findingId: finding.id,
          participantGroup,
          classification: input.classification,
          rationale: input.rationale.trim(),
          createdBy: actorId,
        },
        { transaction },
      );

      await this.recordActivity(
        input.workspaceId,
        input.featureTaskId,
        actorId,
        'feature.requirement_finding.triage_position_recorded',
        {
          findingId: finding.id,
          positionId: position.id,
          participantGroup,
          classification: position.classification,
        },
        transaction,
      );

      const positions = await this.loadLatestPositions(finding.id, input.workspaceId, transaction);
      const complete = TRIAGE_GROUPS.every((group) => positions[group]);
      const classifications = new Set(
        TRIAGE_GROUPS.map((group) => positions[group]?.classification).filter(Boolean),
      );
      if (complete && classifications.size === 1) {
        await this.recordDecision(
          finding,
          positions,
          input.classification,
          'consensus',
          'Posisi terbaru Product, Development, dan QA mencapai klasifikasi yang sama.',
          actorId,
          transaction,
        );
      }
      return this.buildFinding(finding, transaction);
    });
  }

  async recordGovernanceDecision(
    actorId: string,
    input: CreateRequirementFindingGovernanceDecisionInput,
  ): Promise<RequirementFinding> {
    return sequelize.transaction(async (transaction) => {
      const membership = await requireActiveMember(input.workspaceId, actorId, transaction);
      assertCanGovernRequirementFindingDispute(membership.role);
      const finding = await this.requireFinding(input, transaction, true);
      await this.assertFindingOpen(finding, transaction);
      const positions = await this.loadLatestPositions(finding.id, input.workspaceId, transaction);
      if (!TRIAGE_GROUPS.every((group) => positions[group])) {
        throw new Error(
          'CONFLICT: Product, Development, and QA must each record a position before governance resolves a disagreement.',
        );
      }
      if (new Set(TRIAGE_GROUPS.map((group) => positions[group]!.classification)).size === 1) {
        throw new Error(
          'CONFLICT: The latest Product, Development, and QA positions already have consensus.',
        );
      }
      await this.recordDecision(
        finding,
        positions,
        input.classification,
        'governance',
        input.rationale.trim(),
        actorId,
        transaction,
      );
      return this.buildFinding(finding, transaction);
    });
  }

  async changeStatus(
    actorId: string,
    input: CreateRequirementFindingStatusEventInput,
  ): Promise<RequirementFinding> {
    return sequelize.transaction(async (transaction) => {
      const membership = await requireActiveMember(input.workspaceId, actorId, transaction);
      assertCanResolveRequirementFinding(membership.role);
      const finding = await this.requireFinding(input, transaction, true);
      const currentStatus = await this.currentStatus(finding.id, input.workspaceId, transaction);
      if (input.action === 'resolved') {
        if (currentStatus === 'resolved') {
          throw new Error('CONFLICT: This Requirement finding is already resolved.');
        }
        const positions = await this.loadLatestPositions(
          finding.id,
          input.workspaceId,
          transaction,
        );
        const latestDecision = await this.latestDecision(
          finding.id,
          input.workspaceId,
          transaction,
        );
        if (!positionsMatchDecision(positions, latestDecision)) {
          throw new Error(
            'CONFLICT: A current triage decision is required before resolving a Requirement finding.',
          );
        }
      } else if (currentStatus === 'open') {
        throw new Error('CONFLICT: This Requirement finding is already open.');
      }

      const statusEvent = await RequirementFindingStatusEventModel.create(
        {
          workspaceId: input.workspaceId,
          findingId: finding.id,
          action: input.action,
          reason: input.reason.trim(),
          createdBy: actorId,
        },
        { transaction },
      );
      await this.recordActivity(
        input.workspaceId,
        input.featureTaskId,
        actorId,
        `feature.requirement_finding.${input.action}`,
        { findingId: finding.id, statusEventId: statusEvent.id, reason: statusEvent.reason },
        transaction,
      );
      return this.buildFinding(finding, transaction);
    });
  }

  private async buildState(
    workspaceId: string,
    featureTaskId: string,
    role: WorkspaceRole,
    transaction: Transaction,
  ): Promise<RequirementFindingState> {
    const requirements = await this.loadLinkedRequirements(workspaceId, featureTaskId, transaction);
    const findingModels = await RequirementFindingModel.findAll({
      where: { workspaceId, featureTaskId },
      order: [
        ['reportedAt', 'DESC'],
        ['id', 'DESC'],
      ],
      transaction,
    });
    const findings: RequirementFinding[] = [];
    for (const finding of findingModels) {
      findings.push(await this.buildFinding(finding, transaction));
    }
    return RequirementFindingStateSchema.parse({
      workspaceId,
      featureTaskId,
      mode: 'observation',
      openCriticalCount: findings.filter((finding) => finding.blocksNewWork).length,
      requirements: requirements.map((requirement) => ({
        id: requirement.id,
        code: requirement.code,
        title: requirement.title,
        status: requirement.status,
      })),
      findings,
      capabilities: {
        canCreateFinding: true,
        canAddClarification: true,
        canParticipateTriage: true,
        triageGroup: triageGroupForRole(role),
        canGovernDispute: role === 'owner' || role === 'admin',
        canResolve: ['owner', 'admin', 'po'].includes(role),
      },
    });
  }

  private async buildFinding(
    finding: RequirementFindingModel,
    transaction: Transaction,
  ): Promise<RequirementFinding> {
    // A PostgreSQL transaction owns one connection, so keep its queries sequential.
    const clarifications = await RequirementFindingClarificationModel.findAll({
      where: { workspaceId: finding.workspaceId, findingId: finding.id },
      order: [
        ['createdAt', 'ASC'],
        ['id', 'ASC'],
      ],
      transaction,
    });
    const positions = await RequirementFindingTriagePositionModel.findAll({
      where: { workspaceId: finding.workspaceId, findingId: finding.id },
      order: [
        ['createdAt', 'DESC'],
        ['id', 'DESC'],
      ],
      transaction,
    });
    const decisions = await RequirementFindingTriageDecisionModel.findAll({
      where: { workspaceId: finding.workspaceId, findingId: finding.id },
      order: [['version', 'DESC']],
      transaction,
    });
    const statusEvents = await RequirementFindingStatusEventModel.findAll({
      where: { workspaceId: finding.workspaceId, findingId: finding.id },
      order: [
        ['createdAt', 'DESC'],
        ['id', 'DESC'],
      ],
      transaction,
    });
    const latest = latestPositions(positions);
    const currentDecision = decisions[0] || null;
    const latestStatusEvent = statusEvents[0] || null;
    const status = latestStatusEvent?.action === 'resolved' ? 'resolved' : 'open';
    const missingTriageGroups = TRIAGE_GROUPS.filter((group) => !latest[group]);
    const classifications = new Set(
      TRIAGE_GROUPS.map((group) => latest[group]?.classification).filter(Boolean),
    );

    return {
      id: finding.id,
      workspaceId: finding.workspaceId,
      featureTaskId: finding.featureTaskId,
      requirement: {
        id: finding.requirementId,
        code: finding.requirementCode,
        title: finding.requirementTitle,
        status: finding.requirementStatus,
      },
      category: finding.category,
      severity: finding.severity,
      summary: finding.summary,
      details: finding.details,
      proposedCause: finding.proposedCause,
      reporterGroup: finding.reporterGroup,
      reportedBy: finding.reportedBy,
      reportedAt: iso(finding.reportedAt),
      status,
      blocksNewWork: status === 'open' && finding.severity === 'critical',
      latestStatusEvent: latestStatusEvent ? formatStatusEvent(latestStatusEvent) : null,
      clarifications: clarifications.map(formatClarification),
      latestPositions: {
        product: latest.product ? formatPosition(latest.product) : null,
        development: latest.development ? formatPosition(latest.development) : null,
        qa: latest.qa ? formatPosition(latest.qa) : null,
      },
      missingTriageGroups,
      hasTriageDisagreement: missingTriageGroups.length === 0 && classifications.size > 1,
      currentDecision: currentDecision ? formatDecision(currentDecision) : null,
      decisionIsCurrent: positionsMatchDecision(latest, currentDecision),
      decisionHistory: decisions.map(formatDecision),
    };
  }

  private async loadLinkedRequirements(
    workspaceId: string,
    featureTaskId: string,
    transaction: Transaction,
  ): Promise<RequirementModel[]> {
    const subtasks = await TaskModel.findAll({
      where: { workspaceId, parentTaskId: featureTaskId },
      attributes: ['id'],
      transaction,
    });
    const links = await TaskRequirementModel.findAll({
      where: {
        workspaceId,
        taskId: { [Op.in]: [featureTaskId, ...subtasks.map((task) => task.id)] },
      },
      attributes: ['requirementId'],
      transaction,
    });
    const ids = [...new Set(links.map((link) => link.requirementId))];
    if (ids.length === 0) return [];
    return RequirementModel.findAll({
      where: { workspaceId, id: { [Op.in]: ids } },
      order: [['code', 'ASC']],
      transaction,
    });
  }

  private async loadLatestPositions(
    findingId: string,
    workspaceId: string,
    transaction: Transaction,
  ) {
    const positions = await RequirementFindingTriagePositionModel.findAll({
      where: { workspaceId, findingId },
      order: [
        ['createdAt', 'DESC'],
        ['id', 'DESC'],
      ],
      transaction,
    });
    return latestPositions(positions);
  }

  private async recordDecision(
    finding: RequirementFindingModel,
    positions: Record<RequirementFindingTriageGroup, RequirementFindingTriagePositionModel | null>,
    classification: RequirementFindingCause,
    mode: 'consensus' | 'governance',
    rationale: string,
    actorId: string,
    transaction: Transaction,
  ) {
    const previous = await this.latestDecision(finding.id, finding.workspaceId, transaction);
    const decision = await RequirementFindingTriageDecisionModel.create(
      {
        workspaceId: finding.workspaceId,
        findingId: finding.id,
        version: (previous?.version || 0) + 1,
        classification,
        mode,
        rationale,
        positionIds: {
          product: positions.product!.id,
          development: positions.development!.id,
          qa: positions.qa!.id,
        },
        supersedesDecisionId: previous?.id || null,
        recordedBy: actorId,
      },
      { transaction },
    );
    await this.recordActivity(
      finding.workspaceId,
      finding.featureTaskId,
      actorId,
      'feature.requirement_finding.triage_decided',
      {
        findingId: finding.id,
        decisionId: decision.id,
        version: decision.version,
        mode,
        classification,
        supersedesDecisionId: decision.supersedesDecisionId,
      },
      transaction,
    );
    return decision;
  }

  private latestDecision(findingId: string, workspaceId: string, transaction: Transaction) {
    return RequirementFindingTriageDecisionModel.findOne({
      where: { workspaceId, findingId },
      order: [['version', 'DESC']],
      transaction,
    });
  }

  private async currentStatus(
    findingId: string,
    workspaceId: string,
    transaction: Transaction,
  ): Promise<'open' | 'resolved'> {
    const latest = await RequirementFindingStatusEventModel.findOne({
      where: { workspaceId, findingId },
      order: [
        ['createdAt', 'DESC'],
        ['id', 'DESC'],
      ],
      transaction,
    });
    return latest?.action === 'resolved' ? 'resolved' : 'open';
  }

  private async assertFindingOpen(finding: RequirementFindingModel, transaction: Transaction) {
    if ((await this.currentStatus(finding.id, finding.workspaceId, transaction)) === 'resolved') {
      throw new Error('CONFLICT: Reopen this Requirement finding before changing its triage.');
    }
  }

  private async requireFeature(
    workspaceId: string,
    featureTaskId: string,
    transaction: Transaction,
  ) {
    const feature = await TaskModel.findOne({
      where: { id: featureTaskId, workspaceId, parentTaskId: null },
      transaction,
    });
    if (!feature) throw new Error('NOT_FOUND: Root Feature was not found in this workspace.');
    return feature;
  }

  private async requireFinding(
    input: { workspaceId: string; featureTaskId: string; findingId: string },
    transaction: Transaction,
    lock: boolean,
  ) {
    const finding = await RequirementFindingModel.findOne({
      where: {
        id: input.findingId,
        workspaceId: input.workspaceId,
        featureTaskId: input.featureTaskId,
      },
      transaction,
      ...(lock ? { lock: transaction.LOCK.UPDATE } : {}),
    });
    if (!finding) {
      throw new Error('NOT_FOUND: Requirement finding was not found on this Feature.');
    }
    return finding;
  }

  private recordActivity(
    workspaceId: string,
    taskId: string,
    actorId: string,
    action: string,
    metadataJson: Record<string, unknown>,
    transaction: Transaction,
  ) {
    return TaskActivityModel.create(
      { workspaceId, taskId, actorId, action, metadataJson },
      { transaction },
    );
  }
}

export const requirementFindingService = new RequirementFindingService();
