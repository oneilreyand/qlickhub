import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import {
  EmptyWorkspaceOnboarding,
  CREATE_WORKSPACE_ILLUSTRATION_URL,
} from '../EmptyWorkspaceOnboarding';
import authReducer from '../../../../store/authSlice';
import workspaceReducer from '../../../../store/workspaceSlice';
import uiReducer from '../../../../store/uiSlice';

const renderWithProviders = (ui: React.ReactElement, role = '') => {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      workspace: workspaceReducer,
      ui: uiReducer,
    },
    preloadedState: role
      ? {
          auth: {
            currentUser: {
              id: 'user-1',
              email: 'test@company.com',
              name: 'Test User',
              role,
            },
            isAuthenticated: true,
            showOnboardingModal: false,
            status: 'succeeded' as const,
            error: null,
          },
        }
      : undefined,
  });

  return render(<Provider store={store}>{ui}</Provider>);
};

describe('EmptyWorkspaceOnboarding Organism', () => {
  it('renders buat workspace illustration image and welcome message for admin/lead/po roles', () => {
    renderWithProviders(<EmptyWorkspaceOnboarding />, 'admin');

    const img = screen.getByAltText('Ilustrasi membuat workspace');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', CREATE_WORKSPACE_ILLUSTRATION_URL);
    expect(CREATE_WORKSPACE_ILLUSTRATION_URL).toBe(
      'https://res.cloudinary.com/dxgnzhn8l/image/upload/v1787020941/create_workspace.png',
    );

    expect(
      screen.getByRole('heading', { name: /buat workspace pertama Anda/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /buat workspace/i })).toBeInTheDocument();
  });

  it('opens buat workspace modal when button is clicked by a permitted role', () => {
    renderWithProviders(<EmptyWorkspaceOnboarding />, 'po');

    const createBtn = screen.getByRole('button', { name: /buat workspace/i });
    fireEvent.click(createBtn);

    expect(screen.getByLabelText(/nama workspace/i)).toBeInTheDocument();
  });

  it('does not offer workspace creation to QA', () => {
    renderWithProviders(<EmptyWorkspaceOnboarding />, 'qa');

    expect(
      screen.getByRole('heading', { name: /belum ada workspace untuk Anda/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^buat workspace$/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /coba lagi/i })).toBeInTheDocument();
  });

  it('renders no workspace assigned state for member/dev roles without create button', () => {
    renderWithProviders(<EmptyWorkspaceOnboarding />, 'dev');

    expect(
      screen.getByRole('heading', { name: /belum ada workspace untuk Anda/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^buat workspace$/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /coba lagi/i })).toBeInTheDocument();
  });

  it('ignores spoofed user_role in localStorage and relies only on Redux role', () => {
    localStorage.setItem('user_role', 'admin');
    renderWithProviders(<EmptyWorkspaceOnboarding />, 'dev');

    expect(
      screen.getByRole('heading', { name: /belum ada workspace untuk Anda/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^buat workspace$/i })).not.toBeInTheDocument();
  });
});
