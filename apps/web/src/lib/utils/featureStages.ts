/**
 * Pemetaan 8 tab detail Task lama ke tahap Plan → PRD → Task → Apply (ADR-035).
 * Tab tetap menjadi sumber state di TaskDetailDrawer; tahap hanyalah cara
 * mengelompokkan dan menampilkannya di halaman detail Feature.
 */
export type FeatureStage = 'plan' | 'prd' | 'task' | 'apply';
export type FeatureStageParam = Exclude<FeatureStage, 'apply'>;

export const FEATURE_STAGE_LABELS: Record<FeatureStage, string> = {
  plan: 'Plan',
  prd: 'PRD',
  task: 'Task',
  apply: 'Apply',
};

/** Tab di dalam tiap tahap, berurutan. */
export const FEATURE_STAGE_TABS: Record<FeatureStageParam, string[]> = {
  plan: ['discussion'],
  prd: ['brief', 'prd'],
  task: ['overview', 'subtasks'],
};

/** Tab yang dibuka dari baris atas, bukan dari tahap. */
export const FEATURE_HEADER_TABS = ['activity', 'bugs', 'trace'] as const;

export function isFeatureStageParam(value: string | null | undefined): value is FeatureStageParam {
  return value === 'plan' || value === 'prd' || value === 'task';
}

export function stageForTab(tabId: string): FeatureStageParam | null {
  for (const stage of Object.keys(FEATURE_STAGE_TABS) as FeatureStageParam[]) {
    if (FEATURE_STAGE_TABS[stage].includes(tabId)) return stage;
  }
  return null;
}

export function firstTabForStage(stage: FeatureStageParam): string {
  return FEATURE_STAGE_TABS[stage][0];
}

/**
 * Tahap sementara dihitung dari data yang sudah ada sampai tahap tersimpan
 * tersedia (P5a): ada subtask → Task; ada brief atau requirement → PRD; selain itu Plan.
 */
export function deriveFeatureStage(input: {
  subtaskCount: number;
  hasProductBrief: boolean;
  requirementCount: number;
}): FeatureStageParam {
  if (input.subtaskCount > 0) return 'task';
  if (input.hasProductBrief || input.requirementCount > 0) return 'prd';
  return 'plan';
}
