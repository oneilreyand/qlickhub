import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { UserFlowGuide } from '../UserFlowGuide';
import authReducer from '../../../../store/authSlice';
import workspaceReducer from '../../../../store/workspaceSlice';
import uiReducer from '../../../../store/uiSlice';

import type { AuthState } from '../../../../store/authSlice';

function renderWithProviders(ui: React.ReactElement, initialAuthState?: Partial<AuthState>) {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      workspace: workspaceReducer,
      ui: uiReducer,
    },
    preloadedState: {
      auth: {
        currentUser: {
          id: 'user-1',
          email: 'qa@qlickhub.com',
          name: 'Budi QA Lead',
          role: 'qa',
          onboardingCompletedAt: '2026-08-24T00:00:00.000Z',
          ...initialAuthState?.currentUser,
        },
        isAuthenticated: true,
        showOnboardingModal: false,
        status: 'succeeded' as const,
        error: null,
        ...initialAuthState,
      },
    },
  });

  return render(
    <Provider store={store}>
      <BrowserRouter>{ui}</BrowserRouter>
    </Provider>,
  );
}

describe('UserFlowGuide', () => {
  it('renders dynamic personalized banner according to logged-in user role', () => {
    renderWithProviders(<UserFlowGuide initialSection="panduan" />, {
      currentUser: {
        id: 'user-qa',
        name: 'Sarah QA Engineer',
        email: 'qa@example.com',
        role: 'qa',
      },
    });

    expect(screen.getByText(/Panduan Interaktif: Quality Assurance \(QA\)/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Buka QA Testing Desk/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/Sarah QA Engineer/i)).toBeInTheDocument();
    expect(screen.getByText(/Pintu gerbang kualitas sistem/i)).toBeInTheDocument();
  });

  it('renders correctly with 3 main sections: Panduan, E2E Overview, and User Flow', () => {
    renderWithProviders(<UserFlowGuide initialSection="panduan" />);

    expect(
      screen.getAllByRole('button', { name: /Panduan Aplikasi & Simulator/i })[0],
    ).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /E2E Overview & RBAC/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Alur Kerja per Role/i })[0]).toBeInTheDocument();
    expect(screen.getByText('Struktur & Menu Utama Aplikasi')).toBeInTheDocument();
  });

  it('navigates through the 3 main sections and switches roles in User Flow', () => {
    renderWithProviders(<UserFlowGuide initialSection="panduan" />);

    // Click E2E Overview tab
    const overviewTab = screen.getAllByRole('button', { name: /E2E Overview & RBAC/i })[0];
    fireEvent.click(overviewTab);
    expect(
      screen.getByText(/Siklus Lengkap Kolaborasi Tim \(End-to-End 5-Phase Lifecycle\)/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Matriks Peran & Hak Akses \(RBAC Governance Matrix\)/i),
    ).toBeInTheDocument();

    // Click User Flow tab
    const userFlowTab = screen.getAllByRole('button', { name: /Alur Kerja per Role/i })[0];
    fireEvent.click(userFlowTab);

    // Inside User Flow, switch to QA
    const qaRoleBtn = screen.getAllByRole('button', { name: /Quality Assurance \(QA\)/i })[0];
    fireEvent.click(qaRoleBtn);
    expect(screen.getByText('Alur Kerja: Quality Assurance (QA)')).toBeInTheDocument();
    expect(screen.getByText(/Spreadsheet Intake Wizard/i)).toBeInTheDocument();

    // Switch to Dev
    const devRoleBtn = screen.getAllByRole('button', { name: /Developer \(Dev\)/i })[0];
    fireEvent.click(devRoleBtn);
    expect(screen.getByText('Alur Kerja: Developer (Dev)')).toBeInTheDocument();
    expect(screen.getByText(/Penegakan Anti Self-Approval Guardrail/i)).toBeInTheDocument();

    // Switch to PO
    const poRoleBtn = screen.getAllByRole('button', { name: /Product Owner \(PO\)/i })[0];
    fireEvent.click(poRoleBtn);
    expect(screen.getByText('Alur Kerja: Product Owner (PO)')).toBeInTheDocument();
    expect(screen.getByText(/Penulisan Specification Brief/i)).toBeInTheDocument();

    // Switch to Owner/Admin
    const adminRoleBtn = screen.getAllByRole('button', { name: /Owner & Admin/i })[0];
    fireEvent.click(adminRoleBtn);
    expect(screen.getByText('Alur Kerja: Owner & Workspace Admin')).toBeInTheDocument();
    expect(screen.getByText(/Developer Specialties \(ADR-002\)/i)).toBeInTheDocument();

    // Return to Panduan
    const panduanTab = screen.getAllByRole('button', { name: /Panduan Aplikasi & Simulator/i })[0];
    fireEvent.click(panduanTab);
    expect(screen.getByText('Interactive Feature Workflow Simulator')).toBeInTheDocument();
  });

  it('interacts with the Interactive Feature Workflow Simulator with role pre-selection and switcher', () => {
    renderWithProviders(<UserFlowGuide initialSection="panduan" />, {
      currentUser: {
        id: 'user-dev',
        name: 'Dev Specialist',
        email: 'dev@example.com',
        role: 'dev',
      },
    });

    // Check simulator presence
    expect(screen.getByText('Interactive Feature Workflow Simulator')).toBeInTheDocument();
    expect(screen.getByText(/Langkah 1 dari 4/i)).toBeInTheDocument();

    // Next step
    const nextBtn = screen.getByRole('button', { name: /Langkah Selanjutnya/i });
    fireEvent.click(nextBtn);
    expect(screen.getByText(/Langkah 2 dari 4/i)).toBeInTheDocument();

    // Previous step
    const prevBtn = screen.getByRole('button', { name: /Sebelumnya/i });
    fireEvent.click(prevBtn);
    expect(screen.getByText(/Langkah 1 dari 4/i)).toBeInTheDocument();

    // Developer attempts to self-approve to DONE (triggers anti self-approval guardrail)
    const doneAttemptBtn = screen.getByRole('button', { name: /DONE \(Coba Selesaikan\)/i });
    fireEvent.click(doneAttemptBtn);
    expect(screen.getByText(/Quality Gate Blocked: Anti Self-Approval/i)).toBeInTheDocument();

    // Switch filter to Semua Role
    const allRoleFilterBtn = screen.getByRole('button', { name: /Semua Role/i });
    fireEvent.click(allRoleFilterBtn);

    // Switch to QA Signoff Guide (Guide 8)
    const qaGuideBtn = screen.getByRole('button', { name: /8\. QA: Retest Independen/i });
    fireEvent.click(qaGuideBtn);
    expect(screen.getByText(/QA Gatekeeper Verification Panel/i)).toBeInTheDocument();

    // Click QA Bug Scenario
    const bugScenarioBtn = screen.getByRole('button', { name: /Temukan Bug \(Reject\)/i });
    fireEvent.click(bugScenarioBtn);
    expect(screen.getByText(/Status: CHANGES REQUESTED/i)).toBeInTheDocument();

    // Click QA Pass Scenario
    const passScenarioBtn = screen.getByRole('button', { name: /Lolos Uji \(Approve ke DONE\)/i });
    fireEvent.click(passScenarioBtn);
    expect(screen.getByText(/Status Berubah: DONE \(Approved by QA\)/i)).toBeInTheDocument();

    // Switch to QA Intake Guide (Guide 6)
    const qaIntakeBtn = screen.getByRole('button', { name: /6\. QA: Test Case Intake/i });
    fireEvent.click(qaIntakeBtn);
    expect(screen.getByText(/Spreadsheet Intake Wizard Simulator/i)).toBeInTheDocument();

    // Switch View Mode to Roadmap (Semua Alur)
    const roadmapBtn = screen.getByRole('button', { name: /Semua Alur/i });
    fireEvent.click(roadmapBtn);
    expect(screen.getAllByRole('button', { name: /Buka di Simulator/i }).length).toBeGreaterThan(0);
  });
});
