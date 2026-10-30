import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import uiReducer from '../../../../store/uiSlice';
import { featureSpecService } from '../../../../lib/api/featureSpecService';
import { FeatureSpecCreateModal } from '../FeatureSpecCreateModal';

vi.mock('../../../../lib/api/featureSpecService', () => ({
  featureSpecService: { create: vi.fn() },
}));

const WORKSPACE_ID = '10000000-0000-4000-8000-000000000002';

function renderModal(onCreated = vi.fn()) {
  const store = configureStore({ reducer: { ui: uiReducer } });
  render(
    <Provider store={store}>
      <FeatureSpecCreateModal
        isOpen
        workspaceId={WORKSPACE_ID}
        folderId={null}
        onClose={vi.fn()}
        onCreated={onCreated}
      />
    </Provider>,
  );
  return { onCreated, store };
}

describe('FeatureSpecCreateModal (AC-5.1)', () => {
  beforeEach(() => {
    vi.mocked(featureSpecService.create).mockReset();
  });

  it('requires both a title and an idea before saving', () => {
    renderModal();
    const submit = screen.getByRole('button', { name: 'Simpan dan lanjut' });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Judul Feature'), { target: { value: 'Checkout' } });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Ide awal'), { target: { value: 'Satu halaman' } });
    expect(submit).toBeEnabled();
  });

  it('creates the Spec with trimmed values and reports it to the caller', async () => {
    const created = { id: 's1', featureTaskId: 'f1' };
    vi.mocked(featureSpecService.create).mockResolvedValue(created as never);
    const { onCreated } = renderModal();

    fireEvent.change(screen.getByLabelText('Judul Feature'), { target: { value: '  Checkout  ' } });
    fireEvent.change(screen.getByLabelText('Ide awal'), { target: { value: ' Satu halaman ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan dan lanjut' }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(created));
    expect(featureSpecService.create).toHaveBeenCalledWith(WORKSPACE_ID, {
      title: 'Checkout',
      idea: 'Satu halaman',
      folderId: null,
    });
  });

  it('keeps the modal values and does not navigate when saving fails', async () => {
    vi.mocked(featureSpecService.create).mockRejectedValue(new Error('Anda tidak memiliki izin'));
    const { onCreated, store } = renderModal();

    fireEvent.change(screen.getByLabelText('Judul Feature'), { target: { value: 'Checkout' } });
    fireEvent.change(screen.getByLabelText('Ide awal'), { target: { value: 'Satu halaman' } });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan dan lanjut' }));

    await waitFor(() => expect(store.getState().ui.notifications.length).toBeGreaterThan(0));
    expect(onCreated).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Judul Feature')).toHaveValue('Checkout');
  });
});
