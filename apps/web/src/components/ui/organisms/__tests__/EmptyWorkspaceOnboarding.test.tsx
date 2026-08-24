import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import {
  EmptyWorkspaceOnboarding,
  CREATE_WORKSPACE_ILLUSTRATION_URL,
} from '../EmptyWorkspaceOnboarding';
import workspaceReducer from '../../../../store/workspaceSlice';
import uiReducer from '../../../../store/uiSlice';

const renderWithProviders = (ui: React.ReactElement) => {
  const store = configureStore({
    reducer: {
      workspace: workspaceReducer,
      ui: uiReducer,
    },
  });

  return render(<Provider store={store}>{ui}</Provider>);
};

describe('EmptyWorkspaceOnboarding Organism', () => {
  it('renders create workspace illustration image and welcome message for admin/lead/po roles', () => {
    localStorage.setItem('user_role', 'admin');
    renderWithProviders(<EmptyWorkspaceOnboarding />);

    const img = screen.getByAltText('Create Workspace Illustration');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', CREATE_WORKSPACE_ILLUSTRATION_URL);
    expect(CREATE_WORKSPACE_ILLUSTRATION_URL).toBe(
      'https://res.cloudinary.com/dxgnzhn8l/image/upload/v1787020941/create_workspace.png',
    );

    expect(
      screen.getByRole('heading', { name: /create your first workspace/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create workspace/i })).toBeInTheDocument();
  });

  it('opens create workspace modal when button is clicked by a permitted role', () => {
    localStorage.setItem('user_role', 'po');
    renderWithProviders(<EmptyWorkspaceOnboarding />);

    const createBtn = screen.getByRole('button', { name: /create workspace/i });
    fireEvent.click(createBtn);

    expect(screen.getByLabelText(/workspace name/i)).toBeInTheDocument();
  });

  it('does not offer workspace creation to QA', () => {
    localStorage.setItem('user_role', 'qa');
    renderWithProviders(<EmptyWorkspaceOnboarding />);

    expect(screen.getByRole('heading', { name: /no workspace assigned yet/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^create workspace$/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /check again/i })).toBeInTheDocument();
  });

  it('renders no workspace assigned state for member/dev roles without create button', () => {
    localStorage.setItem('user_role', 'dev');
    renderWithProviders(<EmptyWorkspaceOnboarding />);

    expect(screen.getByRole('heading', { name: /no workspace assigned yet/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^create workspace$/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /check again/i })).toBeInTheDocument();
  });
});
