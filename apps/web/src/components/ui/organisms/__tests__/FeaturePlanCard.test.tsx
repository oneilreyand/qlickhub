import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { FeaturePlan } from '@qlick/contracts';
import { FeaturePlanCard } from '../FeaturePlanCard';
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

describe('FeaturePlanCard (P5a-1, AC-5.1)', () => {
  beforeEach(() => {
    mockedGet.mockReset();
  });

  it('shows the saved idea and the Plan status', async () => {
    mockedGet.mockResolvedValue(plan);
    render(<FeaturePlanCard workspaceId={WORKSPACE_ID} featureTaskId={FEATURE_ID} />);

    expect(await screen.findByText('Pengguna ingin melihat riwayat serah-terima.')).toBeVisible();
    expect(screen.getByText('Ide Feature')).toBeInTheDocument();
    expect(screen.getByText('Menyusun pertanyaan')).toBeInTheDocument();
    expect(mockedGet).toHaveBeenCalledWith(WORKSPACE_ID, FEATURE_ID);
  });

  it('renders nothing for a Feature without a Plan', async () => {
    mockedGet.mockResolvedValue(null);
    const { container } = render(
      <FeaturePlanCard workspaceId={WORKSPACE_ID} featureTaskId={FEATURE_ID} />,
    );
    await waitFor(() => expect(mockedGet).toHaveBeenCalled());
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it('shows an error with a retry button', async () => {
    mockedGet.mockRejectedValueOnce(new Error('Server error'));
    mockedGet.mockResolvedValueOnce(plan);
    render(<FeaturePlanCard workspaceId={WORKSPACE_ID} featureTaskId={FEATURE_ID} />);

    expect(await screen.findByText('Server error')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));
    expect(await screen.findByText(plan.idea)).toBeInTheDocument();
    expect(mockedGet).toHaveBeenCalledTimes(2);
  });
});
