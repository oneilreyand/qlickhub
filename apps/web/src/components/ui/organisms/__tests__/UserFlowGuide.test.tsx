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

function renderWithProviders(ui: React.ReactElement) {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      workspace: workspaceReducer,
      ui: uiReducer,
    },
  });

  return render(
    <Provider store={store}>
      <BrowserRouter>{ui}</BrowserRouter>
    </Provider>
  );
}

describe('UserFlowGuide', () => {
  it('renders correctly with 3 main sections: Panduan, E2E Overview, and User Flow', () => {
    renderWithProviders(<UserFlowGuide initialSection="panduan" />);

    expect(screen.getByText('User Flow & Cara Penggunaan Aplikasi')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Panduan Aplikasi/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /E2E Overview/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /User Flow/i })[0]).toBeInTheDocument();
    expect(screen.getByText('Struktur & Menu Utama Aplikasi')).toBeInTheDocument();
  });

  it('navigates through the 3 main sections and switches roles in User Flow', () => {
    renderWithProviders(<UserFlowGuide initialSection="panduan" />);

    // Click E2E Overview tab
    const overviewTab = screen.getAllByRole('button', { name: /E2E Overview/i })[0];
    fireEvent.click(overviewTab);
    expect(screen.getByText('Siklus Lengkap Kolaborasi Tim (End-to-End Lifecycle)')).toBeInTheDocument();
    expect(screen.getByText('Matriks Peran & Hak Akses (RBAC Matrix)')).toBeInTheDocument();

    // Click User Flow tab
    const userFlowTab = screen.getAllByRole('button', { name: /User Flow/i })[0];
    fireEvent.click(userFlowTab);
    expect(screen.getByText('Pilih Alur Kerja Berdasarkan Role (User Flow)')).toBeInTheDocument();

    // Inside User Flow, switch to QA
    const qaRoleBtn = screen.getAllByRole('button', { name: /Quality Assurance \(QA\)/i })[0];
    fireEvent.click(qaRoleBtn);
    expect(screen.getByText('Alur Kerja: Quality Assurance (QA)')).toBeInTheDocument();
    expect(screen.getAllByText(/Pintu gerbang kualitas/i)[0]).toBeInTheDocument();

    // Switch to Dev
    const devRoleBtn = screen.getAllByRole('button', { name: /Developer \(Dev\)/i })[0];
    fireEvent.click(devRoleBtn);
    expect(screen.getByText('Alur Kerja: Developer (Dev)')).toBeInTheDocument();
    expect(screen.getAllByText(/Anti Self-Approval/i)[0]).toBeInTheDocument();

    // Switch to PO
    const poRoleBtn = screen.getAllByRole('button', { name: /Product Owner \(PO\)/i })[0];
    fireEvent.click(poRoleBtn);
    expect(screen.getByText('Alur Kerja: Product Owner (PO)')).toBeInTheDocument();
    expect(screen.getAllByText(/Prinsip Explicit Parent Completion/i)[0]).toBeInTheDocument();

    // Switch to Owner/Admin
    const adminRoleBtn = screen.getAllByRole('button', { name: /Owner & Admin/i })[0];
    fireEvent.click(adminRoleBtn);
    expect(screen.getByText('Alur Kerja: Owner & Admin')).toBeInTheDocument();

    // Return to Panduan
    const panduanTab = screen.getAllByRole('button', { name: /Panduan Aplikasi/i })[0];
    fireEvent.click(panduanTab);
    expect(screen.getByText('Interactive Feature Workflow Simulator')).toBeInTheDocument();
  });

  it('interacts with the Interactive Feature Workflow Simulator', () => {
    renderWithProviders(<UserFlowGuide initialSection="panduan" />);

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

    // Select Developer Guide (Guide 4)
    const devGuideBtn = screen.getByRole('button', { name: /4\. Developer: Eksekusi/i });
    fireEvent.click(devGuideBtn);
    expect(screen.getByText(/My Tasks — Personal Workspace/i)).toBeInTheDocument();

    // Developer attempts to self-approve to DONE (should trigger anti self-approval guardrail)
    const doneAttemptBtn = screen.getByRole('button', { name: /DONE \(Test\)/i });
    fireEvent.click(doneAttemptBtn);
    expect(screen.getByText(/Quality Gate Blocked: Anti Self-Approval/i)).toBeInTheDocument();

    // Switch to QA Guide (Guide 5)
    const qaGuideBtn = screen.getByRole('button', { name: /5\. QA: Review, Review Notes/i });
    fireEvent.click(qaGuideBtn);
    expect(screen.getByText(/QA Gatekeeper Verification Panel/i)).toBeInTheDocument();

    // Click QA Bug Scenario
    const bugScenarioBtn = screen.getByRole('button', { name: /Temukan Bug \(Reject\)/i });
    fireEvent.click(bugScenarioBtn);
    expect(screen.getByText(/Status: CHANGES REQUESTED/i)).toBeInTheDocument();

    // Click QA Pass Scenario
    const passScenarioBtn = screen.getByRole('button', { name: /Lolos Uji \(Approve\)/i });
    fireEvent.click(passScenarioBtn);
    expect(screen.getByText(/Status Berubah: DONE \(Approved by QA\)/i)).toBeInTheDocument();

    // Switch View Mode to Roadmap (Semua Alur)
    const roadmapBtn = screen.getByRole('button', { name: /Semua Alur/i });
    fireEvent.click(roadmapBtn);
    expect(screen.getAllByRole('button', { name: /Buka di Simulator/i }).length).toBeGreaterThan(0);
  });
});
