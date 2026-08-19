import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/api/workspaceService', () => ({
  workspaceService: {
    getWorkspaces: vi.fn().mockResolvedValue([]),
    createWorkspace: vi.fn(),
    updateWorkspace: vi.fn(),
    getMembers: vi.fn(),
    addMember: vi.fn(),
    updateMemberRole: vi.fn(),
    removeMember: vi.fn(),
  },
}));

import authReducer from '../../../store/authSlice';
import folderReducer from '../../../store/folderSlice';
import taskReducer from '../../../store/taskSlice';
import uiReducer from '../../../store/uiSlice';
import workspaceReducer from '../../../store/workspaceSlice';
import { ThemeProvider } from '../../../lib/theme/ThemeContext';
import { Header } from '../Header';

function renderHeader(onToggleMobileSidebar: () => void) {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      ui: uiReducer,
      workspace: workspaceReducer,
      folder: folderReducer,
      task: taskReducer,
    },
  });

  return render(
    <Provider store={store}>
      <ThemeProvider>
        <MemoryRouter initialEntries={['/work?tab=tasks']}>
          <Header onToggleMobileSidebar={onToggleMobileSidebar} />
        </MemoryRouter>
      </ThemeProvider>
    </Provider>,
  );
}

describe('Header', () => {
  it('opens responsive navigation from the mobile menu control', async () => {
    const user = userEvent.setup();
    const onToggleMobileSidebar = vi.fn();

    renderHeader(onToggleMobileSidebar);

    await user.click(screen.getByRole('button', { name: 'Toggle mobile menu' }));

    expect(onToggleMobileSidebar).toHaveBeenCalledOnce();
  });

  it('opens the Report destination from the top navigation', async () => {
    const user = userEvent.setup();

    renderHeader(vi.fn());

    const reportButton = screen.getByRole('button', { name: 'Report' });
    await user.click(reportButton);

    expect(reportButton).toHaveClass('bg-[#22201F]');
  });

  it('highlights the My Tasks button as active when on /my-tasks', () => {
    const store = configureStore({
      reducer: {
        auth: authReducer,
        ui: uiReducer,
        workspace: workspaceReducer,
        folder: folderReducer,
        task: taskReducer,
      },
    });

    render(
      <Provider store={store}>
        <ThemeProvider>
          <MemoryRouter initialEntries={['/my-tasks']}>
            <Header onToggleMobileSidebar={vi.fn()} />
          </MemoryRouter>
        </ThemeProvider>
      </Provider>
    );

    const myTasksButton = screen.getByRole('button', { name: 'My Tasks' });
    expect(myTasksButton).toHaveClass('bg-[#22201F]');
  });
});
