import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { FeaturePlan } from '@qlick/contracts';
import { FeaturePlanStatusBadge } from '../FeaturePlanStatusBadge';
import { featurePlanService } from '../../../../lib/api/featurePlanService';

vi.mock('../../../../lib/api/featurePlanService', () => ({
  featurePlanService: { getFeaturePlanForFeature: vi.fn(), createFeaturePlan: vi.fn() },
}));

const WORKSPACE_ID = '10000000-0000-4000-8000-000000000001';
const FEATURE_ID = '20000000-0000-4000-8000-000000000001';
const mockedGet = vi.mocked(featurePlanService.getFeaturePlanForFeature);

const plan: FeaturePlan = {
  id: '60000000-0000-4000-8000-000000000001',
  workspaceId: WORKSPACE_ID,
  featureTaskId: FEATURE_ID,
  idea: 'Pengguna ingin melihat riwayat serah-terima.',
  status: 'clarifying',
  createdBy: '30000000-0000-4000-8000-000000000001',
  createdAt: '2026-10-29T01:00:00.000Z',
  updatedAt: '2026-10-29T01:00:00.000Z',
};

describe('FeaturePlanStatusBadge (P5a-1, AC-5.1)', () => {
  beforeEach(() => {
    mockedGet.mockReset();
  });

  it('shows the Plan status but not the idea (the idea lives in "Ide awal")', async () => {
    mockedGet.mockResolvedValue(plan);
    render(<FeaturePlanStatusBadge workspaceId={WORKSPACE_ID} featureTaskId={FEATURE_ID} />);

    expect(await screen.findByText('Plan: Menyusun pertanyaan')).toBeInTheDocument();
    expect(screen.queryByText(plan.idea)).not.toBeInTheDocument();
    expect(mockedGet).toHaveBeenCalledWith(WORKSPACE_ID, FEATURE_ID);
  });

  it('renders nothing for a Feature without a Plan', async () => {
    mockedGet.mockResolvedValue(null);
    const { container } = render(
      <FeaturePlanStatusBadge workspaceId={WORKSPACE_ID} featureTaskId={FEATURE_ID} />,
    );
    await waitFor(() => expect(mockedGet).toHaveBeenCalled());
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it('stays silent when the Plan cannot be loaded', async () => {
    mockedGet.mockRejectedValue(new Error('Server error'));
    const { container } = render(
      <FeaturePlanStatusBadge workspaceId={WORKSPACE_ID} featureTaskId={FEATURE_ID} />,
    );
    await waitFor(() => expect(mockedGet).toHaveBeenCalled());
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });
});
