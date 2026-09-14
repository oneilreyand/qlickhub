import { Op, type Transaction } from 'sequelize';
import type {
  CreateFeatureReadinessBaselineInput,
  CreateFeatureReadinessReviewInput,
  FeatureReadinessBaseline,
  FeatureReadinessBaselineSnapshot,
  FeatureReadinessCheck,
  FeatureReadinessReview,
  FeatureReadinessReviewRole,
  FeatureReadinessStaleReason,
  FeatureReadinessState,
  WorkspaceRole,
} from '@qlick/contracts';
import { FeatureReadinessStateSchema } from '@qlick/contracts';
import { sequelize } from '../../db/sequelize.js';
import {
  AcceptanceCriterionModel,
  FeatureReadinessBaselineModel,
  FeatureReadinessBaselineRequirementModel,
  FeatureReadinessReviewModel,
  QaDocumentModel,
  QaDocumentVersionModel,
  RequirementModel,
  TaskActivityModel,
  TaskDocumentModel,
  TaskModel,
  TaskRequirementModel,
} from '../../db/models/index.js';
import { requireActiveMember } from '../../db/repositories/workspaceMemberRepository.js';
import {
  assertCanEstablishFeatureReadinessBaseline,
  assertCanOverrideFeatureReadiness,
  assertCanSubmitFeatureReadinessReview,
} from '../../policies/featureReadinessPolicy.js';

const DEVELOPMENT_AREAS = ['frontend', 'backend', 'mobile', 'fullstack'];

function iso(value: Date | string): string {
  return new Date(value).toISOString();
}

function formatReview(review: FeatureReadinessReviewModel): FeatureReadinessReview {
  return {
    id: review.id,
    workspaceId: review.workspaceId,
    featureTaskId: review.featureTaskId,
    reviewerRole: review.reviewerRole,
    recommendation: review.recommendation,
    notes: review.notes,
    concernSeverity: review.concernSeverity || null,
    createdBy: review.createdBy,
    createdAt: iso(review.createdAt),
  };
}

interface ReadinessContext {
  featureTask: TaskModel;
  productBrief: {
    document: QaDocumentModel;
    version: QaDocumentVersionModel;
  } | null;
  allRequirements: RequirementModel[];
  requirements: RequirementModel[];
  acceptanceCriteriaByRequirementId: Map<string, AcceptanceCriterionModel[]>;
  latestReviews: Record<FeatureReadinessReviewRole, FeatureReadinessReviewModel | null>;
  assignedReviewRole: FeatureReadinessReviewRole | null;
}

export class FeatureReadinessService {
  async getState(
    workspaceId: string,
    featureTaskId: string,
    actorId: string,
  ): Promise<FeatureReadinessState> {
    return sequelize.transaction(async (transaction) => {
      const membership = await requireActiveMember(workspaceId, actorId, transaction);
      return this.buildState(workspaceId, featureTaskId, actorId, membership.role, transaction);
    });
  }

  async createReview(
    actorId: string,
    input: CreateFeatureReadinessReviewInput,
  ): Promise<FeatureReadinessReview> {
    return sequelize.transaction(async (transaction) => {
      const membership = await requireActiveMember(input.workspaceId, actorId, transaction);
      const context = await this.loadContext(
        input.workspaceId,
        input.featureTaskId,
        actorId,
        transaction,
      );
      assertCanSubmitFeatureReadinessReview(membership.role, context.assignedReviewRole);

      const review = await FeatureReadinessReviewModel.create(
        {
          workspaceId: input.workspaceId,
          featureTaskId: input.featureTaskId,
          reviewerRole: context.assignedReviewRole,
          recommendation: input.recommendation,
          notes: input.notes.trim(),
          concernSeverity: input.concernSeverity || null,
          createdBy: actorId,
        },
        { transaction },
      );

      await TaskActivityModel.create(
        {
          workspaceId: input.workspaceId,
          taskId: input.featureTaskId,
          actorId,
          action: 'feature.readiness.review_recorded',
          metadataJson: {
            reviewId: review.id,
            reviewerRole: review.reviewerRole,
            recommendation: review.recommendation,
            concernSeverity: review.concernSeverity,
          },
        },
        { transaction },
      );

      return formatReview(review);
    });
  }

  async createBaseline(
    actorId: string,
    input: CreateFeatureReadinessBaselineInput,
  ): Promise<FeatureReadinessBaseline> {
    return sequelize.transaction(async (transaction) => {
      const membership = await requireActiveMember(input.workspaceId, actorId, transaction);
      assertCanEstablishFeatureReadinessBaseline(membership.role);

      const featureTask = await this.getFeatureTask(
        input.workspaceId,
        input.featureTaskId,
        transaction,
        true,
      );
      const context = await this.loadContext(
        input.workspaceId,
        input.featureTaskId,
        actorId,
        transaction,
        featureTask,
      );
      const checks = this.evaluateChecks(context);
      const contentChecksPass = checks.slice(0, 3).every((check) => check.status === 'passed');
      if (!contentChecksPass) {
        throw new Error(
          'CONFLICT: An approved Product Brief, at least one active Requirement, and active Acceptance Criteria for every active Requirement are required before a baseline can be captured.',
        );
      }

      const latestBaseline = await FeatureReadinessBaselineModel.findOne({
        where: { workspaceId: input.workspaceId, featureTaskId: input.featureTaskId },
        order: [
          ['sequence', 'DESC'],
          ['establishedAt', 'DESC'],
        ],
        transaction,
      });
      if (latestBaseline && this.formatBaseline(latestBaseline, context).isCurrent) {
        throw new Error(
          'CONFLICT: The latest readiness baseline still matches the current Product Brief, Requirements, Acceptance Criteria, and reviews.',
        );
      }

      const usesOverride = Boolean(input.overrideReason || input.overrideExpiresAt);
      if (usesOverride) {
        assertCanOverrideFeatureReadiness(membership.role);
      } else if (!checks.every((check) => check.status === 'passed')) {
        throw new Error(
          'CONFLICT: Latest Development and QA readiness inputs must both be ready, or an Owner/Admin must record a bounded emergency exception.',
        );
      }

      const nextSequence =
        Number(
          (await FeatureReadinessBaselineModel.max('sequence', {
            where: { workspaceId: input.workspaceId, featureTaskId: input.featureTaskId },
            transaction,
          })) || 0,
        ) + 1;
      const capturedAt = new Date();
      const snapshot = this.buildSnapshot(context, capturedAt);
      const baseline = await FeatureReadinessBaselineModel.create(
        {
          workspaceId: input.workspaceId,
          featureTaskId: input.featureTaskId,
          sequence: nextSequence,
          mode: 'observation',
          productBriefVersionId: context.productBrief!.version.id,
          devReviewId: context.latestReviews.dev?.id || null,
          qaReviewId: context.latestReviews.qa?.id || null,
          snapshot,
          establishedBy: actorId,
          establishedAt: capturedAt,
          overrideReason: input.overrideReason?.trim() || null,
          overrideExpiresAt: input.overrideExpiresAt ? new Date(input.overrideExpiresAt) : null,
        },
        { transaction },
      );

      await FeatureReadinessBaselineRequirementModel.bulkCreate(
        context.requirements.map((requirement) => ({
          workspaceId: input.workspaceId,
          baselineId: baseline.id,
          requirementId: requirement.id,
        })),
        { transaction },
      );

      await TaskActivityModel.create(
        {
          workspaceId: input.workspaceId,
          taskId: input.featureTaskId,
          actorId,
          action: 'feature.readiness.baseline_established',
          metadataJson: {
            baselineId: baseline.id,
            sequence: baseline.sequence,
            mode: baseline.mode,
            requirementCount: snapshot.requirements.length,
            productBriefVersion: snapshot.productBrief.version,
            devReviewId: baseline.devReviewId,
            qaReviewId: baseline.qaReviewId,
            isEmergencyOverride: usesOverride,
            overrideExpiresAt: baseline.overrideExpiresAt,
          },
        },
        { transaction },
      );

      return this.formatBaseline(baseline, context);
    });
  }

  private async buildState(
    workspaceId: string,
    featureTaskId: string,
    actorId: string,
    role: WorkspaceRole,
    transaction: Transaction,
  ): Promise<FeatureReadinessState> {
    const context = await this.loadContext(workspaceId, featureTaskId, actorId, transaction);
    const baselines = await FeatureReadinessBaselineModel.findAll({
      where: { workspaceId, featureTaskId },
      order: [
        ['sequence', 'DESC'],
        ['establishedAt', 'DESC'],
      ],
      limit: 20,
      transaction,
    });
    const baselineHistory = baselines.map((baseline) => this.formatBaseline(baseline, context));
    const checks = this.evaluateChecks(context);

    return FeatureReadinessStateSchema.parse({
      workspaceId,
      featureTaskId,
      mode: 'observation',
      readyToBaseline: checks.every((check) => check.status === 'passed'),
      checks,
      latestReviews: {
        dev: context.latestReviews.dev ? formatReview(context.latestReviews.dev) : null,
        qa: context.latestReviews.qa ? formatReview(context.latestReviews.qa) : null,
      },
      currentBaseline: baselineHistory[0] || null,
      baselineHistory,
      capabilities: {
        canSubmitReview: Boolean(context.assignedReviewRole && role === context.assignedReviewRole),
        reviewRole:
          context.assignedReviewRole && role === context.assignedReviewRole
            ? context.assignedReviewRole
            : null,
        canEstablishBaseline: ['owner', 'admin', 'po'].includes(role),
        canOverride: ['owner', 'admin'].includes(role),
      },
    });
  }

  private async loadContext(
    workspaceId: string,
    featureTaskId: string,
    actorId: string,
    transaction: Transaction,
    lockedFeatureTask?: TaskModel,
  ): Promise<ReadinessContext> {
    const featureTask =
      lockedFeatureTask ||
      (await this.getFeatureTask(workspaceId, featureTaskId, transaction, false));
    const subtasks = await TaskModel.findAll({
      where: { workspaceId, parentTaskId: featureTaskId },
      attributes: ['id', 'deliveryArea', 'assigneeId'],
      transaction,
    });
    const taskIds = [featureTaskId, ...subtasks.map((subtask) => subtask.id)];
    const requirementLinks = await TaskRequirementModel.findAll({
      where: { workspaceId, taskId: { [Op.in]: taskIds } },
      attributes: ['requirementId'],
      transaction,
    });
    const requirementIds = [...new Set(requirementLinks.map((link) => link.requirementId))];
    const allRequirements =
      requirementIds.length > 0
        ? await RequirementModel.findAll({
            where: { workspaceId, id: { [Op.in]: requirementIds } },
            order: [['code', 'ASC']],
            transaction,
          })
        : [];
    const requirements = allRequirements.filter((requirement) => requirement.status === 'active');
    const acceptanceCriteria =
      requirements.length > 0
        ? await AcceptanceCriterionModel.findAll({
            where: {
              workspaceId,
              requirementId: { [Op.in]: requirements.map((requirement) => requirement.id) },
              status: 'active',
            },
            order: [
              ['requirementId', 'ASC'],
              ['sequence', 'ASC'],
            ],
            transaction,
          })
        : [];
    const acceptanceCriteriaByRequirementId = new Map<string, AcceptanceCriterionModel[]>();
    for (const criterion of acceptanceCriteria) {
      const items = acceptanceCriteriaByRequirementId.get(criterion.requirementId) || [];
      items.push(criterion);
      acceptanceCriteriaByRequirementId.set(criterion.requirementId, items);
    }

    const productBriefLink = await TaskDocumentModel.findOne({
      where: { workspaceId, taskId: featureTaskId, linkType: 'primary_prd' },
      transaction,
    });
    let productBrief: ReadinessContext['productBrief'] = null;
    if (productBriefLink) {
      const document = await QaDocumentModel.findOne({
        where: {
          id: productBriefLink.documentId,
          workspaceId,
          docType: 'product_brief',
        },
        transaction,
      });
      if (document) {
        const version = await QaDocumentVersionModel.findOne({
          where: { workspaceId, documentId: document.id, version: document.currentVersion },
          transaction,
        });
        if (version) productBrief = { document, version };
      }
    }

    const reviews = await FeatureReadinessReviewModel.findAll({
      where: { workspaceId, featureTaskId },
      order: [
        ['createdAt', 'DESC'],
        ['id', 'DESC'],
      ],
      transaction,
    });
    const assignedReviewerIds: Record<FeatureReadinessReviewRole, Set<string>> = {
      dev: new Set(
        subtasks
          .filter(
            (task) =>
              task.assigneeId &&
              Boolean(task.deliveryArea && DEVELOPMENT_AREAS.includes(task.deliveryArea)),
          )
          .map((task) => task.assigneeId!),
      ),
      qa: new Set(
        subtasks
          .filter((task) => task.assigneeId && task.deliveryArea === 'qa')
          .map((task) => task.assigneeId!),
      ),
    };
    const latestReviews: ReadinessContext['latestReviews'] = { dev: null, qa: null };
    for (const review of reviews) {
      if (
        !latestReviews[review.reviewerRole] &&
        assignedReviewerIds[review.reviewerRole].has(review.createdBy)
      ) {
        latestReviews[review.reviewerRole] = review;
      }
      if (latestReviews.dev && latestReviews.qa) break;
    }

    const hasQaAssignment = subtasks.some(
      (task) => task.assigneeId === actorId && task.deliveryArea === 'qa',
    );
    const hasDevAssignment = subtasks.some(
      (task) =>
        task.assigneeId === actorId &&
        Boolean(task.deliveryArea && DEVELOPMENT_AREAS.includes(task.deliveryArea)),
    );

    return {
      featureTask,
      productBrief,
      allRequirements,
      requirements,
      acceptanceCriteriaByRequirementId,
      latestReviews,
      assignedReviewRole: hasQaAssignment ? 'qa' : hasDevAssignment ? 'dev' : null,
    };
  }

  private evaluateChecks(context: ReadinessContext): FeatureReadinessCheck[] {
    const productBriefApproved = context.productBrief?.document.status === 'approved';
    const activeRequirementsPresent = context.requirements.length > 0;
    const inactiveRequirements = context.allRequirements.filter(
      (requirement) => requirement.status !== 'active',
    );
    const requirementScopeReady = activeRequirementsPresent && inactiveRequirements.length === 0;
    const incompleteRequirements = context.requirements.filter(
      (requirement) =>
        (context.acceptanceCriteriaByRequirementId.get(requirement.id) || []).length === 0,
    );

    return [
      {
        code: 'product_brief_approved',
        status: productBriefApproved ? 'passed' : 'failed',
        label: 'Ringkasan Produk disetujui',
        reason: productBriefApproved
          ? `Versi ${context.productBrief!.version.version} siap dijadikan acuan.`
          : 'Ringkasan Produk root Feature belum tersedia atau belum berstatus disetujui.',
      },
      {
        code: 'active_requirements_present',
        status: requirementScopeReady ? 'passed' : 'failed',
        label: 'Requirement aktif tersedia',
        reason: requirementScopeReady
          ? `${context.requirements.length} Requirement aktif tercakup.`
          : inactiveRequirements.length > 0
            ? `${inactiveRequirements.length} Requirement tertaut masih berstatus draft atau deprecated.`
            : 'Tautkan minimal satu Requirement aktif ke Feature atau Subtask-nya.',
      },
      {
        code: 'active_acceptance_criteria_complete',
        status:
          activeRequirementsPresent && incompleteRequirements.length === 0 ? 'passed' : 'failed',
        label: 'Kriteria Penerimaan lengkap',
        reason:
          activeRequirementsPresent && incompleteRequirements.length === 0
            ? 'Setiap Requirement aktif memiliki Kriteria Penerimaan aktif.'
            : `${incompleteRequirements.length || context.requirements.length} Requirement belum memiliki Kriteria Penerimaan aktif.`,
      },
      this.reviewCheck('dev', context.latestReviews.dev),
      this.reviewCheck('qa', context.latestReviews.qa),
    ];
  }

  private reviewCheck(
    role: FeatureReadinessReviewRole,
    review: FeatureReadinessReviewModel | null,
  ): FeatureReadinessCheck {
    const ready = review?.recommendation === 'ready';
    return {
      code: role === 'dev' ? 'dev_review_ready' : 'qa_review_ready',
      status: ready ? 'passed' : 'failed',
      label: role === 'dev' ? 'Masukan Development siap' : 'Masukan QA siap',
      reason: review
        ? ready
          ? `Masukan ${role === 'dev' ? 'Development' : 'QA'} terbaru menyatakan siap.`
          : `Perubahan diminta dengan dampak ${review.concernSeverity || 'belum ditentukan'}.`
        : `Belum ada masukan dari assignee ${role === 'dev' ? 'Development' : 'QA'}.`,
    };
  }

  private buildSnapshot(
    context: ReadinessContext,
    capturedAt: Date,
  ): FeatureReadinessBaselineSnapshot {
    return {
      schemaVersion: 1,
      capturedAt: iso(capturedAt),
      productBrief: {
        documentId: context.productBrief!.document.id,
        versionId: context.productBrief!.version.id,
        version: context.productBrief!.version.version,
        status: 'approved',
        title: context.productBrief!.version.title,
      },
      requirements: context.requirements.map((requirement) => ({
        id: requirement.id,
        code: requirement.code,
        title: requirement.title,
        description: requirement.description || null,
        url: requirement.url || null,
        status: 'active',
        updatedAt: iso(requirement.updatedAt),
        acceptanceCriteria: (
          context.acceptanceCriteriaByRequirementId.get(requirement.id) || []
        ).map((criterion) => ({
          id: criterion.id,
          sequence: criterion.sequence,
          code: `AC-${criterion.sequence}`,
          text: criterion.text,
          status: 'active',
          updatedAt: iso(criterion.updatedAt),
        })),
      })),
      reviewIds: {
        dev: context.latestReviews.dev?.id || null,
        qa: context.latestReviews.qa?.id || null,
      },
    };
  }

  private formatBaseline(
    baseline: FeatureReadinessBaselineModel,
    context: ReadinessContext,
  ): FeatureReadinessBaseline {
    const staleReasons = this.getStaleReasons(baseline, context);
    return {
      id: baseline.id,
      workspaceId: baseline.workspaceId,
      featureTaskId: baseline.featureTaskId,
      sequence: baseline.sequence,
      mode: 'observation',
      snapshot: baseline.snapshot,
      establishedBy: baseline.establishedBy,
      establishedAt: iso(baseline.establishedAt),
      overrideReason: baseline.overrideReason || null,
      overrideExpiresAt: baseline.overrideExpiresAt ? iso(baseline.overrideExpiresAt) : null,
      isCurrent: staleReasons.length === 0,
      staleReasons,
    };
  }

  private getStaleReasons(
    baseline: FeatureReadinessBaselineModel,
    context: ReadinessContext,
  ): FeatureReadinessStaleReason[] {
    const reasons = new Set<FeatureReadinessStaleReason>();
    const snapshot = baseline.snapshot;
    if (context.productBrief?.version.id !== snapshot.productBrief.versionId) {
      reasons.add('product_brief_changed');
    }

    const currentRequirementIds = context.allRequirements
      .map((requirement) => requirement.id)
      .sort();
    const snapshotRequirementIds = snapshot.requirements
      .map((requirement) => requirement.id)
      .sort();
    if (currentRequirementIds.join(',') !== snapshotRequirementIds.join(',')) {
      reasons.add('requirement_scope_changed');
    }

    for (const savedRequirement of snapshot.requirements) {
      const currentRequirement = context.allRequirements.find(
        (requirement) => requirement.id === savedRequirement.id,
      );
      if (!currentRequirement) continue;
      if (
        currentRequirement.status !== 'active' ||
        iso(currentRequirement.updatedAt) !== savedRequirement.updatedAt
      ) {
        reasons.add('requirement_changed');
      }
      const currentCriteria =
        context.acceptanceCriteriaByRequirementId.get(currentRequirement.id) || [];
      const currentCriterionSignature = currentCriteria
        .map((criterion) => `${criterion.id}:${iso(criterion.updatedAt)}`)
        .sort()
        .join(',');
      const savedCriterionSignature = savedRequirement.acceptanceCriteria
        .map((criterion) => `${criterion.id}:${criterion.updatedAt}`)
        .sort()
        .join(',');
      if (currentCriterionSignature !== savedCriterionSignature) {
        reasons.add('acceptance_criteria_changed');
      }
    }

    if ((context.latestReviews.dev?.id || null) !== snapshot.reviewIds.dev) {
      reasons.add('dev_review_changed');
    }
    if ((context.latestReviews.qa?.id || null) !== snapshot.reviewIds.qa) {
      reasons.add('qa_review_changed');
    }
    if (baseline.overrideExpiresAt && baseline.overrideExpiresAt.getTime() <= Date.now()) {
      reasons.add('override_expired');
    }
    return [...reasons];
  }

  private async getFeatureTask(
    workspaceId: string,
    featureTaskId: string,
    transaction: Transaction,
    lock: boolean,
  ): Promise<TaskModel> {
    const featureTask = await TaskModel.findOne({
      where: { id: featureTaskId, workspaceId, parentTaskId: null },
      transaction,
      ...(lock ? { lock: transaction.LOCK.UPDATE } : {}),
    });
    if (!featureTask) {
      throw new Error('NOT_FOUND: Root Feature was not found in this workspace.');
    }
    return featureTask;
  }
}

export const featureReadinessService = new FeatureReadinessService();
