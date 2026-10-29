import React from 'react';
import type { FeaturePlanStatus } from '@qlick/contracts';
import { useFeaturePlan } from '../../../lib/hooks/useFeaturePlan';
import { Badge } from '../atoms/Badge';

const STATUS_LABEL: Record<FeaturePlanStatus, string> = {
  clarifying: 'Menyusun pertanyaan',
  ready: 'Siap disusun',
  applied: 'Sudah diterapkan',
};

export interface FeaturePlanStatusBadgeProps {
  workspaceId: string | undefined;
  featureTaskId: string;
}

/**
 * Status Plan tersimpan sebuah Feature (P5a-1, AC-5.1), ditampilkan di kotak "Ide awal".
 * Ide hanya tampil sekali (di kotak itu); lencana ini tidak muncul bila Feature tidak punya
 * Plan, dan tidak mengganggu halaman bila Plan gagal dimuat.
 */
export const FeaturePlanStatusBadge: React.FC<FeaturePlanStatusBadgeProps> = ({
  workspaceId,
  featureTaskId,
}) => {
  const { plan } = useFeaturePlan(workspaceId, featureTaskId);
  if (!plan) return null;
  return <Badge variant="neutral">{`Plan: ${STATUS_LABEL[plan.status]}`}</Badge>;
};
