import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { featureSpecService } from '../../api/featureSpecService';
import { useFeatureSpec } from '../useFeatureSpec';
import { featureSpecFixture } from '../../../test/featureSpecFixture';

vi.mock('../../api/featureSpecService', () => ({ featureSpecService: { getByFeature: vi.fn() } }));
describe('useFeatureSpec persisted loading states', () => {
  beforeEach(() => vi.clearAllMocks());
  it('distinguishes a failed authenticated fetch from a legacy Feature without a Spec, and can retry', async () => {
    vi.mocked(featureSpecService.getByFeature)
      .mockRejectedValueOnce(Object.assign(new Error('Forbidden'), { status: 403 }))
      .mockResolvedValueOnce(null);
    const spec = featureSpecFixture();
    const { result } = renderHook(() => useFeatureSpec(spec.workspaceId, spec.featureTaskId));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toEqual({ status: 403, message: 'Forbidden' });
    act(() => result.current.reload());
    await waitFor(() => expect(featureSpecService.getByFeature).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.spec).toBeNull();
    expect(result.current.error).toBeNull();
  });
  it('ignores an earlier Feature response after the workspace/Feature has changed', async () => {
    const spec = featureSpecFixture();
    let finish!: (value: typeof spec) => void;
    vi.mocked(featureSpecService.getByFeature)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      )
      .mockResolvedValueOnce(null);
    const { result, rerender } = renderHook(({ id }) => useFeatureSpec(spec.workspaceId, id), {
      initialProps: { id: spec.featureTaskId },
    });
    rerender({ id: '30000000-0000-4000-8000-000000000099' });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      finish(spec);
    });
    act(() => result.current.setSpec(spec));
    expect(result.current.spec).toBeNull();
  });
});
