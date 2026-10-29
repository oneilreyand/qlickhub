import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { FeaturePlanCreateModal } from '../FeaturePlanCreateModal';
import { featurePlanService } from '../../../../lib/api/featurePlanService';
import { configureStore } from '@reduxjs/toolkit';
import uiReducer from '../../../../store/uiSlice';

vi.mock('../../../../lib/api/featurePlanService', () => ({
  featurePlanService: { getFeaturePlanForFeature: vi.fn(), createFeaturePlan: vi.fn() },
}));

const WORKSPACE_ID = '10000000-0000-4000-8000-000000000001';
const FEATURE_ID = '20000000-0000-4000-8000-000000000001';
const mockedCreate = vi.mocked(featurePlanService.createFeaturePlan);
const createTestStore = () => configureStore({ reducer: { ui: uiReducer } });

function renderModal(overrides: { onCreated?: (id: string) => void; onClose?: () => void } = {}) {
  const onCreated = overrides.onCreated ?? vi.fn();
  const onClose = overrides.onClose ?? vi.fn();
  render(
    <Provider store={createTestStore()}>
      <FeaturePlanCreateModal
        isOpen
        onClose={onClose}
        workspaceId={WORKSPACE_ID}
        folders={[]}
        onCreated={onCreated}
      />
    </Provider>,
  );
  return { onCreated, onClose };
}

describe('FeaturePlanCreateModal (P5a-1, AC-5.1)', () => {
  beforeEach(() => {
    mockedCreate.mockReset();
  });

  it('keeps the save button disabled until title and idea are filled', () => {
    renderModal();
    expect(screen.getByRole('button', { name: 'Simpan Plan' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Judul Feature/), { target: { value: 'Riwayat' } });
    expect(screen.getByRole('button', { name: 'Simpan Plan' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Ide Feature/), { target: { value: 'Ide saya' } });
    expect(screen.getByRole('button', { name: 'Simpan Plan' })).toBeEnabled();
  });

  it('saves the trimmed Plan and hands the new Feature id to the caller', async () => {
    mockedCreate.mockResolvedValue({
      featurePlan: {
        id: '60000000-0000-4000-8000-000000000001',
        workspaceId: WORKSPACE_ID,
        featureTaskId: FEATURE_ID,
        idea: 'Ide saya',
        status: 'clarifying',
        createdBy: '30000000-0000-4000-8000-000000000001',
        createdAt: '2026-10-29T01:00:00.000Z',
        updatedAt: '2026-10-29T01:00:00.000Z',
      },
      feature: { id: FEATURE_ID, title: 'Riwayat', folderId: null },
    });
    const { onCreated, onClose } = renderModal();
    fireEvent.change(screen.getByLabelText(/Judul Feature/), { target: { value: '  Riwayat  ' } });
    fireEvent.change(screen.getByLabelText(/Ide Feature/), { target: { value: '  Ide saya  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Plan' }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(FEATURE_ID));
    expect(mockedCreate).toHaveBeenCalledWith(WORKSPACE_ID, {
      title: 'Riwayat',
      idea: 'Ide saya',
      folderId: null,
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('keeps the form open and does not navigate when saving fails', async () => {
    mockedCreate.mockRejectedValue(new Error('Hanya planner'));
    const { onCreated, onClose } = renderModal();
    fireEvent.change(screen.getByLabelText(/Judul Feature/), { target: { value: 'Riwayat' } });
    fireEvent.change(screen.getByLabelText(/Ide Feature/), { target: { value: 'Ide saya' } });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Plan' }));

    await waitFor(() => expect(mockedCreate).toHaveBeenCalled());
    expect(onCreated).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Simpan Plan' })).toBeEnabled();
  });
});
