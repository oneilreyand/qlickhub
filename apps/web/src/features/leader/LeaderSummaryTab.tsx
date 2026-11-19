import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { LeaderPipelineSummary } from '@qlick/contracts';
import {
  LeaderHubSummaryView,
  type LeaderHubSummaryState,
} from '../../components/ui/organisms/leaderHub';
import { leaderService } from '../../lib/api/leaderService';
import { useAppDispatch } from '../../store/hooks';
import { enqueueSnackbar } from '../../store/uiSlice';
import { mapLeaderPipeline } from './mapLeaderPipeline';
import { useLeaderLiveUpdates } from './useLeaderLiveUpdates';

const PREVIEW = 4;

/**
 * LEADER-PIPELINE-HUB P2: "Ringkasan" tab — SDLC pipeline and health per Feature, open blockers
 * with Ping PIC, and team load in points, all computed by the backend.
 */
export const LeaderSummaryTab: React.FC<{ workspaceIds?: string[] }> = ({ workspaceIds }) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [summary, setSummary] = useState<LeaderPipelineSummary | null>(null);
  const [state, setState] = useState<LeaderHubSummaryState>({ status: 'loading' });
  const [pingingId, setPingingId] = useState<string | null>(null);
  const [showAllBlockers, setShowAllBlockers] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const key = workspaceIds?.join(',') ?? '';

  /** `silent` refreshes (live updates) keep the current view instead of showing the skeleton. */
  const load = useCallback(
    async (silent = false) => {
      if (!silent) setState({ status: 'loading' });
      try {
        const data = await leaderService.getPipeline(key ? key.split(',') : undefined);
        setSummary(data);
        setState({ status: 'ready', data: mapLeaderPipeline(data) });
        setUpdatedAt(new Date());
      } catch (error) {
        if (silent) return;
        const message = error instanceof Error ? error.message : 'Ringkasan gagal dimuat.';
        const status = (error as { status?: number } | null)?.status;
        setState(status === 403 ? { status: 'denied' } : { status: 'error', message });
      }
    },
    [key],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const liveStatus = useLeaderLiveUpdates(() => void load(true), state.status !== 'denied');

  const blockerOf = (id: string) => summary?.openBlockers.find((blocker) => blocker.id === id);

  const pingPic = async (blockerId: string) => {
    const blocker = blockerOf(blockerId);
    if (!blocker) return;
    setPingingId(blockerId);
    try {
      const result = await leaderService.pingBlockerPic(
        blocker.workspaceId,
        blocker.taskId,
        blockerId,
      );
      dispatch(enqueueSnackbar(`Pengingat terkirim ke ${blocker.picName}.`, 'success'));
      const next: LeaderPipelineSummary = {
        ...summary!,
        openBlockers: summary!.openBlockers.map((item) =>
          item.id === blockerId
            ? {
                ...item,
                lastPingedAt: result.pingedAt,
                nextPingAvailableAt: result.nextPingAvailableAt,
              }
            : item,
        ),
      };
      setSummary(next);
      setState({ status: 'ready', data: mapLeaderPipeline(next) });
    } catch (error) {
      dispatch(
        enqueueSnackbar(error instanceof Error ? error.message : 'Ping PIC gagal.', 'error'),
      );
    } finally {
      setPingingId(null);
    }
  };

  const openBlocker = (blockerId: string) => {
    const blocker = blockerOf(blockerId);
    if (!blocker) return;
    navigate(
      blocker.taskId === blocker.featureId
        ? `/work/features/${blocker.taskId}`
        : `/work/subtasks/${blocker.taskId}`,
    );
  };

  return (
    <LeaderHubSummaryView
      state={state}
      onRetry={() => void load()}
      onOpenFeature={(featureId) => navigate(`/work/features/${featureId}`)}
      onPingPic={(id) => void pingPic(id)}
      pingingBlockerId={pingingId}
      onOpenBlocker={openBlocker}
      onSeeAllBlockers={showAllBlockers ? undefined : () => setShowAllBlockers(true)}
      blockerPreviewLimit={showAllBlockers ? Number.MAX_SAFE_INTEGER : PREVIEW}
      live={{ status: liveStatus, updatedAt }}
    />
  );
};
