import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { describe, expect, it } from 'vitest';
import uiReducer from '../../../../../store/uiSlice';
import workspaceReducer from '../../../../../store/workspaceSlice';
import { OnboardingWorkspaceStep } from '../OnboardingWorkspaceStep';

function renderStep(role: string) {
  const store = configureStore({
    reducer: {
      workspace: workspaceReducer,
      ui: uiReducer,
    },
  });

  return render(
    <Provider store={store}>
      <OnboardingWorkspaceStep role={role} />
    </Provider>,
  );
}

describe('OnboardingWorkspaceStep', () => {
  it('offers workspace creation to Product Owners', () => {
    renderStep('po');

    expect(screen.getByRole('button', { name: /buat workspace sekarang/i })).toBeInTheDocument();
  });

  it('does not offer workspace creation to QA', () => {
    renderStep('qa');

    expect(
      screen.getByRole('heading', { name: /belum ada workspace yang ditugaskan/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /buat workspace/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /periksa ulang undangan/i })).toBeInTheDocument();
  });
});
