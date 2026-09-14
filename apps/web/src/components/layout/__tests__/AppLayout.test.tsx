import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { store } from '../../../store/store';
import { AppLayout } from '../AppLayout';

vi.mock('../Header', () => ({
  Header: () => <header>Menu aplikasi</header>,
}));

vi.mock('../Sidebar', () => ({
  Sidebar: () => <nav>Menu seluler</nav>,
}));

vi.mock('../../ui/molecules/GlobalSnackbarHost', () => ({
  GlobalSnackbarHost: () => null,
}));

vi.mock('../../auth/SessionTimeoutModal', () => ({
  SessionTimeoutModal: () => null,
}));

vi.mock('../../ui/organisms/RoleOnboardingModal', () => ({
  RoleOnboardingModal: () => null,
}));

const CrashingPage = () => {
  throw new Error('Page failed to render');
};

describe('AppLayout', () => {
  it('keeps the application menu visible when page content crashes', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/work']}>
          <AppLayout>
            <CrashingPage />
          </AppLayout>
        </MemoryRouter>
      </Provider>,
    );

    expect(screen.getByText('Menu aplikasi')).toBeInTheDocument();
    expect(screen.getByRole('main')).toContainElement(screen.getByText('Terjadi Kesalahan'));

    consoleError.mockRestore();
  });
});
