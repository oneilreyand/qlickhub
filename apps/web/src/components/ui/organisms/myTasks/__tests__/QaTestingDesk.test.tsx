import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { QaTestingDesk } from '../QaTestingDesk';
import authReducer from '../../../../../store/authSlice';
import taskReducer from '../../../../../store/taskSlice';
import workspaceReducer from '../../../../../store/workspaceSlice';
import uiReducer from '../../../../../store/uiSlice';
import type { Task } from '@qlick/contracts';

const createTestStore = () => {
  return configureStore({
    reducer: {
      auth: authReducer,
      task: taskReducer,
      workspace: workspaceReducer,
      ui: uiReducer,
    },
  });
};

const mockQaSubtask: Task = {
  id: 'st-qa-1',
  workspaceId: 'ws-1',
  parentTaskId: 't-parent-1',
  deliveryArea: 'qa',
  title: 'QA Smoke & Integration Verification',
  description: 'PR: https://github.com/org/repo/pull/12\nStaging: https://staging.app.io/checkout',
  status: 'in_progress',
  priority: 'high',
  reporterId: 'u-1',
  assigneeId: 'u-3',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('QaTestingDesk Organism', () => {
  it('renders an honest verification empty state and disables sign-off without persisted evidence', () => {
    const store = createTestStore();
    render(
      <Provider store={store}>
        <QaTestingDesk
          subtask={mockQaSubtask}
          workspaceId="ws-1"
          currentUserId="u-3"
          onDataChanged={vi.fn()}
        />
      </Provider>
    );

    expect(screen.getByText('QA Testing & Quality Desk')).toBeInTheDocument();
    expect(screen.getByText('QA Smoke & Integration Verification')).toBeInTheDocument();
    expect(screen.getByText('Interactive Test Execution Checklist')).toBeInTheDocument();
    expect(screen.getByText('Log Defect / Changes')).toBeInTheDocument();
    expect(screen.getByText('No formal test cases linked yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve Sign-off' })).toBeDisabled();
  });

  it('does not offer browser-only test scenario creation', () => {
    const store = createTestStore();
    render(
      <Provider store={store}>
        <QaTestingDesk
          subtask={mockQaSubtask}
          workspaceId="ws-1"
          currentUserId="u-3"
          onDataChanged={vi.fn()}
        />
      </Provider>
    );

    expect(
      screen.queryByPlaceholderText('Add custom test scenario / edge-case...')
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add' })).not.toBeInTheDocument();
  });

  it('opens Defect Report modal when clicking Log Defect button', () => {
    const store = createTestStore();
    render(
      <Provider store={store}>
        <QaTestingDesk
          subtask={mockQaSubtask}
          workspaceId="ws-1"
          currentUserId="u-3"
          onDataChanged={vi.fn()}
        />
      </Provider>
    );

    const logDefectBtn = screen.getByText('Log Defect / Changes');
    fireEvent.click(logDefectBtn);

    expect(screen.getByText('Report Defect / Request Changes')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/E.g. Checkout button unresponsive on mobile viewport/i)).toBeInTheDocument();
  });
});
