import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { Task } from '@qlick/contracts';
import { SubtaskAccordionItem } from '../SubtaskAccordionItem';
import { Accordion } from '../../atoms/Accordion';
import workspaceReducer from '../../../../store/workspaceSlice';
import taskReducer from '../../../../store/taskSlice';
import uiReducer from '../../../../store/uiSlice';
import { taskService } from '../../../../lib/api/taskService';

/** P5g-2 (ADR-038): contract-valid Task factories; the release write itself is proven on PostgreSQL. */
vi.mock('../../../../lib/api/capacityService', () => ({
  capacityService: { previewAssignmentConflict: vi.fn().mockResolvedValue(null) },
}));
vi.mock('../../../../lib/api/requirementService', () => ({
  requirementService: {
    listRequirements: vi.fn().mockResolvedValue([]),
    listTaskRequirementLinks: vi.fn().mockResolvedValue([]),
    linkRequirement: vi.fn(),
    unlinkRequirement: vi.fn(),
  },
}));
vi.mock('../../../../lib/api/taskService', () => ({
  taskService: {
    listTaskComments: vi.fn().mockResolvedValue({ comments: [] }),
    updateTask: vi.fn(),
    releaseTask: vi.fn(),
  },
}));

const DEV_ID = '11111111-1111-4111-8111-111111111111';
const FULLSTACK_ID = '22222222-2222-4222-8222-222222222222';
const PO_ID = '33333333-3333-4333-8333-333333333333';

const baseSubtask: Task = {
  id: '44444444-4444-4444-8444-444444444444',
  workspaceId: '55555555-5555-4555-8555-555555555555',
  folderId: null,
  parentTaskId: '66666666-6666-4666-8666-666666666666',
  deliveryArea: 'backend',
  title: 'Checkout API',
  description: 'Persist checkout',
  status: 'in_progress',
  priority: 'medium',
  assigneeId: DEV_ID,
  assignmentMode: 'assigned',
  reporterId: PO_ID,
  position: 1,
  startDate: '2026-11-04',
  dueDate: '2026-11-10',
  completedAt: null,
  createdAt: '2026-11-03T01:00:00.000Z',
  updatedAt: '2026-11-03T02:00:00.000Z',
};

const members = [
  { userId: DEV_ID, role: 'dev', specialties: ['backend' as const], user: { name: 'Backend Dev' } },
  {
    userId: FULLSTACK_ID,
    role: 'dev',
    specialties: ['fullstack' as const],
    user: { name: 'Fullstack Dev' },
  },
  { userId: PO_ID, role: 'po', user: { name: 'Product Owner' } },
];

function renderItem(subtask: Task, currentUserId = PO_ID, onSubtaskUpdated = vi.fn()) {
  const store = configureStore({
    reducer: { workspace: workspaceReducer, task: taskReducer, ui: uiReducer },
  });
  render(
    <Provider store={store}>
      <MemoryRouter>
        <Accordion>
          <SubtaskAccordionItem
            subtask={subtask}
            workspaceId={subtask.workspaceId}
            currentUserId={currentUserId}
            members={members}
            canMutate
            canPlan
            onSubtaskUpdated={onSubtaskUpdated}
          />
        </Accordion>
      </MemoryRouter>
    </Provider>,
  );
  fireEvent.click(screen.getByRole('button', { name: /Checkout API/i }));
  return { store, onSubtaskUpdated };
}

async function openDetail() {
  fireEvent.click(await screen.findByRole('tab', { name: /Detail/i }));
}

describe('SubtaskAccordionItem open assignment (P5g-2)', () => {
  beforeEach(() => vi.clearAllMocks());

  test('Planner releases assigned work with the persisted version and keeps the result', async () => {
    const released: Task = { ...baseSubtask, assigneeId: null, assignmentMode: 'open' };
    vi.mocked(taskService.releaseTask).mockResolvedValue(released);
    const { onSubtaskUpdated } = renderItem(baseSubtask);
    await openDetail();

    fireEvent.click(await screen.findByRole('button', { name: 'Lepas ke antrean terbuka' }));
    await waitFor(() =>
      expect(taskService.releaseTask).toHaveBeenCalledWith(
        baseSubtask.workspaceId,
        baseSubtask.id,
        {
          expectedUpdatedAt: baseSubtask.updatedAt,
        },
      ),
    );
    expect(onSubtaskUpdated).toHaveBeenCalledWith(released);
  });

  test('open work explains the claim path and offers no release action', async () => {
    renderItem({ ...baseSubtask, assigneeId: null, assignmentMode: 'open' });
    await openDetail();
    expect(await screen.findByText('Penugasan terbuka')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Lepas ke antrean terbuka' })).toBeNull();
    expect(
      screen.getByRole('option', { name: 'Terbuka — tersedia untuk diambil' }),
    ).toBeInTheDocument();
  });

  test('closed work cannot be released and Fullstack is offered for backend work', async () => {
    renderItem({ ...baseSubtask, status: 'done' });
    await openDetail();
    expect(screen.queryByRole('button', { name: 'Lepas ke antrean terbuka' })).toBeNull();
    const assignee = screen
      .getAllByRole('combobox')
      .find((element) => within(element).queryByText(/Fullstack Dev/));
    expect(assignee).toBeDefined();
  });

  test('a 409 from release is reported without changing the subtask', async () => {
    vi.mocked(taskService.releaseTask).mockRejectedValue(
      Object.assign(new Error('changed'), { status: 409 }),
    );
    const { store, onSubtaskUpdated } = renderItem(baseSubtask);
    await openDetail();
    fireEvent.click(await screen.findByRole('button', { name: 'Lepas ke antrean terbuka' }));
    await waitFor(() => expect(taskService.releaseTask).toHaveBeenCalled());
    expect(onSubtaskUpdated).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(JSON.stringify(store.getState().ui)).toContain(
        'Subtask baru berubah atau sudah terbuka',
      ),
    );
  });
});
