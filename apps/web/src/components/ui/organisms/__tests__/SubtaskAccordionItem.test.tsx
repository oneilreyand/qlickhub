import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { SubtaskAccordionItem } from '../SubtaskAccordionItem';
import { Accordion } from '../../atoms/Accordion';
import workspaceReducer from '../../../../store/workspaceSlice';
import taskReducer from '../../../../store/taskSlice';
import uiReducer from '../../../../store/uiSlice';
import { capacityService } from '../../../../lib/api/capacityService';
import type { Task } from '@qlick/contracts';

vi.mock('../../../../lib/api/capacityService', () => ({
  capacityService: {
    previewAssignmentConflict: vi.fn(),
  },
}));

vi.mock('../../../../lib/api/taskService', () => ({
  taskService: {
    listTaskComments: vi.fn().mockResolvedValue({ comments: [] }),
    updateTask: vi.fn().mockResolvedValue({}),
  },
}));

const mockSubtask: Task = {
  id: 'subtask-123',
  workspaceId: 'ws-1',
  folderId: null,
  parentTaskId: 'parent-1',
  deliveryArea: 'frontend',
  title: 'Subtask UI Implementation',
  description: 'Technical details',
  status: 'todo',
  priority: 'medium',
  assigneeId: '11111111-1111-4111-8111-111111111111',
  reporterId: 'user-1',
  position: 1,
  startDate: '2026-09-01',
  dueDate: '2026-09-05',
  completedAt: null,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

const mockMembers = [
  {
    userId: '11111111-1111-4111-8111-111111111111',
    role: 'dev',
    specialties: ['frontend' as const],
    user: { name: 'Frontend Dev', email: 'dev1@example.com' },
  },
  {
    userId: 'po-1',
    role: 'po',
    user: { name: 'Product Owner', email: 'po@example.com' },
  },
];

describe('SubtaskAccordionItem Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('displays advisory conflict banner in settings tab when schedule overlap is detected', async () => {
    vi.mocked(capacityService.previewAssignmentConflict).mockResolvedValue({
      assigneeId: '11111111-1111-4111-8111-111111111111',
      startDate: '2026-09-01',
      dueDate: '2026-09-05',
      hasConflict: true,
      conflictCount: 1,
      conflicts: [
        {
          id: '22222222-2222-4222-8222-222222222222',
          workspaceId: '33333333-3333-4333-8333-333333333333',
          title: 'Another Overlapping Task',
          deliveryArea: 'frontend',
          status: 'in_progress',
          startDate: '2026-09-02',
          dueDate: '2026-09-08',
          isRedacted: false,
          isCurrentWorkspace: true,
        },
      ],
      unscheduledActiveCount: 1,
      unscheduledSubtasks: [],
      advisoryMessage: 'Conflict detected',
    });

    const store = configureStore({
      reducer: {
        workspace: workspaceReducer,
        task: taskReducer,
        ui: uiReducer,
      },
      preloadedState: {
        workspace: {
          workspaces: [
            {
              id: 'ws-1',
              name: 'Test Workspace',
              slug: 'test-workspace',
              role: 'po' as const,
              ownerId: 'po-1',
              createdAt: '2026-01-01',
              updatedAt: '2026-01-01',
            },
          ],
          activeWorkspaceId: 'ws-1',
          members: mockMembers as any,
          isLoading: false,
          isMembersLoading: false,
          isInitialized: true,
          error: null,
        },
      },
    });

    render(
      <Provider store={store}>
        <MemoryRouter>
          <Accordion>
            <SubtaskAccordionItem
              subtask={mockSubtask}
              workspaceId="ws-1"
              currentUserId="po-1"
              members={mockMembers}
              canMutate={true}
              canPlan={true}
            />
          </Accordion>
        </MemoryRouter>
      </Provider>,
    );

    // Open accordion by clicking summary trigger
    const trigger = screen.getByRole('button', { name: /Subtask UI Implementation/i });
    fireEvent.click(trigger);

    // Switch to Detail tab (id: settings)
    const detailTab = await screen.findByRole('tab', { name: /Detail/i });
    fireEvent.click(detailTab);

    // Wait for debounced conflict preview to render banner
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Peringatan Irisan Jadwal (Advisory)' }),
      ).toBeInTheDocument();
      expect(screen.getByText('Another Overlapping Task')).toBeInTheDocument();
      expect(screen.getByText('Tidak Memblokir Simpan')).toBeInTheDocument();
    });

    // Verify "Simpan Detail" button is still accessible and enabled
    const saveBtn = screen.getByRole('button', { name: 'Simpan Detail' });
    expect(saveBtn).toBeEnabled();
  });
});
