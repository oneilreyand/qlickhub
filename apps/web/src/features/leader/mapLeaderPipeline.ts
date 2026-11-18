import { LEADER_TEAM_AREA_LABEL, type LeaderPipelineSummary } from '@qlick/contracts';
import type {
  LeaderHubSummaryData,
  LeaderPipelineRow,
  SdlcStageKey,
  SdlcStageState,
} from '../../components/ui/organisms/leaderHub';
import { SDLC_PIPELINE_STAGES } from '../../components/ui/organisms/leaderHub';

/** LEADER-PIPELINE-HUB P2: maps `/v1/leader/pipeline` to the Ringkasan view-model. */
export function mapLeaderPipeline(summary: LeaderPipelineSummary): LeaderHubSummaryData {
  const pipeline: LeaderPipelineRow[] = summary.features.map((feature) => {
    const stages = {} as Record<SdlcStageKey, SdlcStageState>;
    for (const { key } of SDLC_PIPELINE_STAGES) {
      stages[key] = (feature.stages[key] ?? { state: 'untracked' }) as SdlcStageState;
    }
    return {
      featureId: feature.featureId,
      featureName: feature.featureName,
      workspaceName: feature.workspaceName,
      health: feature.health,
      stages,
      reason:
        feature.reasons.length === 0
          ? 'Tidak ada sinyal risiko.'
          : feature.reasons.length === 1
            ? feature.reasons[0].message
            : `${feature.reasons[0].message} (+${feature.reasons.length - 1} alasan lain)`,
    };
  });

  const overCapacity = summary.teamLoad.members.filter((member) => member.percent > 100);
  return {
    stats: {
      activeFeatures: summary.stats.activeFeatures,
      workspaceCount: summary.workspaces.length,
      onTrack: summary.stats.onTrack,
      atRisk: summary.stats.atRisk,
      blocked: summary.stats.blocked,
      openBlockers: summary.stats.openBlockers,
      openBlockerAverageAgeDays: summary.stats.openBlockerAverageAgeDays,
      overCapacityMembers: overCapacity.length,
    },
    pipeline,
    openBlockers: summary.openBlockers.map((blocker) => ({
      id: blocker.id,
      title: blocker.description,
      taskName: blocker.taskTitle,
      workspaceName: blocker.workspaceName,
      category: blocker.category,
      ageDays: blocker.ageDays,
      picName: blocker.picName,
      nextPingAvailableAt: blocker.nextPingAvailableAt,
    })),
    teamLoad: {
      areas: summary.teamLoad.areas.map((area) => ({
        key: area.key,
        label: area.label,
        percent: area.percent,
      })),
      overCapacity: overCapacity.map((member) => ({
        memberId: member.userId,
        name: member.name,
        areaLabel: LEADER_TEAM_AREA_LABEL[member.area],
        workspaceCount: member.workspaceCount,
        percent: member.percent,
      })),
    },
  };
}
