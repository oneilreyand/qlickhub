import {
  LEADER_PIPELINE_STAGES,
  LEADER_STAGE_HELD_THRESHOLD_DAYS,
  type FeaturePlanningStage,
  type LeaderFeatureHealth,
  type LeaderHealthReason,
  type LeaderPipelineStage,
  type LeaderStageCell,
} from '@qlick/contracts';
import { countWorkingDays, type WorkingDayCalendar } from '../workspaces/internal/workingDays.js';

/**
 * LEADER-PIPELINE-HUB P1 (ADR-045): pure rules for the pipeline stage and Feature health.
 * Everything here works on already-loaded rows so it can be unit-tested without a database.
 *
 * Stage mapping (documented in docs/features/LEADER-PIPELINE-HUB/contracts.md):
 * - plan / prd / task: Feature Spec status (or the legacy heuristic used by Task Hub).
 * - dev: any Development Subtask still todo / in_progress / changes_requested.
 * - review: every open Development Subtask is in_review.
 * - qa: all Development Subtasks done, no active approved QA sign-off.
 * - release: approved QA sign-off, no active approved release decision.
 * - prodVerify / monitor: not recorded yet → `untracked`, never `done`.
 */

export interface PipelineSubtask {
  id: string;
  title: string;
  deliveryArea: string | null;
  status: string;
  assigneeId: string | null;
  startDate: string | null;
  dueDate: string | null;
  effort: string | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  changesRequestedCount: number;
}

export interface PipelineInput {
  featureCreatedAt: Date;
  planningStage: FeaturePlanningStage;
  planningChangedAt: Date;
  subtasks: PipelineSubtask[];
  approvedSignOffAt: Date | null;
  approvedReleaseAt: Date | null;
  openBlockers: { id: string; taskId: string; description: string; picName: string }[];
  severeOpenBugs: { id: string; title: string; severity: string }[];
  today: string;
  calendar: WorkingDayCalendar;
  now: Date;
}

export interface PipelineResult {
  currentStage: LeaderPipelineStage;
  stages: Record<LeaderPipelineStage, LeaderStageCell>;
  health: LeaderFeatureHealth;
  reasons: LeaderHealthReason[];
}

const DAY_MS = 24 * 60 * 60 * 1000;
const OPEN_DEV = new Set(['todo', 'in_progress', 'changes_requested']);
const TERMINAL = new Set(['done', 'canceled']);

const daysSince = (from: Date, now: Date) =>
  Math.max(0, Math.floor((now.getTime() - from.getTime()) / DAY_MS));

const reason = (
  code: LeaderHealthReason['code'],
  message: string,
  refs: Partial<Pick<LeaderHealthReason, 'taskId' | 'blockerId' | 'bugId'>> = {},
): LeaderHealthReason => ({
  code,
  message,
  taskId: refs.taskId ?? null,
  blockerId: refs.blockerId ?? null,
  bugId: refs.bugId ?? null,
});

function earliest(dates: Date[]): Date | null {
  return dates.length ? new Date(Math.min(...dates.map((date) => date.getTime()))) : null;
}
function latest(dates: Date[]): Date | null {
  return dates.length ? new Date(Math.max(...dates.map((date) => date.getTime()))) : null;
}

export function resolveCurrentStage(input: PipelineInput): {
  stage: LeaderPipelineStage;
  enteredAt: Date | null;
} {
  if (input.planningStage !== 'applied') {
    return {
      stage: input.planningStage,
      enteredAt: input.planningStage === 'plan' ? input.featureCreatedAt : input.planningChangedAt,
    };
  }
  const dev = input.subtasks.filter((s) => s.deliveryArea !== 'qa' && s.status !== 'canceled');
  if (dev.length === 0) return { stage: 'task', enteredAt: input.planningChangedAt };
  const openDev = dev.filter((s) => OPEN_DEV.has(s.status));
  if (openDev.length) {
    return { stage: 'dev', enteredAt: earliest(openDev.map((s) => s.createdAt)) };
  }
  const inReview = dev.filter((s) => s.status === 'in_review');
  if (inReview.length) {
    return { stage: 'review', enteredAt: latest(inReview.map((s) => s.updatedAt)) };
  }
  if (!input.approvedSignOffAt) {
    return {
      stage: 'qa',
      enteredAt: latest(dev.map((s) => s.completedAt).filter((d): d is Date => Boolean(d))),
    };
  }
  if (!input.approvedReleaseAt) return { stage: 'release', enteredAt: input.approvedSignOffAt };
  return { stage: 'prodVerify', enteredAt: input.approvedReleaseAt };
}

export function computeFeaturePipeline(input: PipelineInput): PipelineResult {
  const { stage, enteredAt } = resolveCurrentStage(input);
  const currentIndex = LEADER_PIPELINE_STAGES.indexOf(stage);
  const days = enteredAt ? daysSince(enteredAt, input.now) : 0;
  const isHeld =
    !['prodVerify', 'monitor'].includes(stage) && days > LEADER_STAGE_HELD_THRESHOLD_DAYS[stage];

  const stages = {} as Record<LeaderPipelineStage, LeaderStageCell>;
  LEADER_PIPELINE_STAGES.forEach((key, index) => {
    if (key === 'prodVerify' || key === 'monitor') {
      stages[key] = { state: 'untracked' };
    } else if (index < currentIndex) {
      stages[key] = { state: 'done' };
    } else if (index === currentIndex) {
      stages[key] = { state: isHeld || input.openBlockers.length ? 'held' : 'active', days };
    } else {
      stages[key] = { state: 'pending' };
    }
  });

  const blockedReasons: LeaderHealthReason[] = input.openBlockers.map((blocker) =>
    reason('open_blocker', `Hambatan: ${blocker.description} · PIC ${blocker.picName}`, {
      taskId: blocker.taskId,
      blockerId: blocker.id,
    }),
  );
  if (isHeld) {
    blockedReasons.push(
      reason(
        'stage_held',
        `${days} hari di tahap ${stage} (batas ${LEADER_STAGE_HELD_THRESHOLD_DAYS[stage]} hari)`,
      ),
    );
  }

  const riskReasons: LeaderHealthReason[] = [];
  const severeAllowed = currentIndex >= LEADER_PIPELINE_STAGES.indexOf('qa');
  for (const subtask of input.subtasks) {
    if (TERMINAL.has(subtask.status)) continue;
    if (subtask.dueDate && subtask.dueDate < input.today) {
      riskReasons.push(
        reason('subtask_late', `Subtask "${subtask.title}" lewat tenggat ${subtask.dueDate}`, {
          taskId: subtask.id,
        }),
      );
    } else if (
      subtask.status === 'todo' &&
      subtask.dueDate &&
      countWorkingDays(input.today, subtask.dueDate, input.calendar) <= 2
    ) {
      riskReasons.push(
        reason(
          'subtask_at_risk',
          `Subtask "${subtask.title}" belum dimulai, tenggat ${subtask.dueDate}`,
          {
            taskId: subtask.id,
          },
        ),
      );
    }
    if (subtask.changesRequestedCount >= 2) {
      riskReasons.push(
        reason(
          'changes_requested_repeated',
          `Subtask "${subtask.title}" diminta perbaikan ${subtask.changesRequestedCount}×`,
          { taskId: subtask.id },
        ),
      );
    }
    if (!subtask.assigneeId || !subtask.dueDate || !subtask.effort) {
      const missing = [
        !subtask.assigneeId && 'pelaksana',
        !subtask.dueDate && 'jadwal',
        !subtask.effort && 'effort',
      ].filter(Boolean);
      riskReasons.push(
        reason(
          'subtask_unplanned',
          `Subtask "${subtask.title}" belum punya ${missing.join(', ')}`,
          {
            taskId: subtask.id,
          },
        ),
      );
    }
  }
  if (severeAllowed) {
    for (const bug of input.severeOpenBugs) {
      riskReasons.push(
        reason('severe_bug_open', `Bug ${bug.severity} terbuka: ${bug.title}`, { bugId: bug.id }),
      );
    }
  }

  const health: LeaderFeatureHealth = blockedReasons.length
    ? 'blocked'
    : riskReasons.length
      ? 'at_risk'
      : 'on_track';
  return {
    currentStage: stage,
    stages,
    health,
    reasons: [...blockedReasons, ...riskReasons],
  };
}
