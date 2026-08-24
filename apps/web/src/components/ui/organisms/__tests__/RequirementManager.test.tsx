import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, test, expect, vi } from 'vitest';
import { RequirementManager } from '../RequirementManager';

const listRequirementsMock = vi.fn();
const getRequirementMock = vi.fn();
const createRequirementMock = vi.fn();
const updateRequirementMock = vi.fn();
const listTaskRequirementLinksMock = vi.fn();
const linkRequirementMock = vi.fn();
const unlinkRequirementMock = vi.fn();

vi.mock('../../../../lib/api/requirementService', () => ({
  requirementService: {
    listRequirements: (...args: any[]) => listRequirementsMock(...args),
    getRequirement: (...args: any[]) => getRequirementMock(...args),
    createRequirement: (...args: any[]) => createRequirementMock(...args),
    updateRequirement: (...args: any[]) => updateRequirementMock(...args),
    listTaskRequirementLinks: (...args: any[]) => listTaskRequirementLinksMock(...args),
    linkRequirement: (...args: any[]) => linkRequirementMock(...args),
    unlinkRequirement: (...args: any[]) => unlinkRequirementMock(...args),
  },
}));

describe('RequirementManager Organism', () => {
  const mockRequirements = [
    {
      id: 'req-1',
      workspaceId: 'ws-1',
      code: 'REQ-101',
      title: 'Checkout Flow UI Spec',
      description: 'Covers payment gateway and cart review',
      url: 'https://www.figma.com/file/123/checkout',
      status: 'active' as const,
      createdBy: 'user-po',
      createdAt: '2026-08-21T00:00:00.000Z',
      updatedAt: '2026-08-21T00:00:00.000Z',
    },
    {
      id: 'req-2',
      workspaceId: 'ws-1',
      code: 'REQ-102',
      title: 'Tax Calculation Formula',
      description: null,
      url: null,
      status: 'active' as const,
      createdBy: 'user-po',
      createdAt: '2026-08-21T00:00:00.000Z',
      updatedAt: '2026-08-21T00:00:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    listRequirementsMock.mockResolvedValue(mockRequirements);
    listTaskRequirementLinksMock.mockResolvedValue([]);
    getRequirementMock.mockResolvedValue({
      requirement: mockRequirements[0],
      linkedTasks: [
        {
          taskId: 'task-1',
          title: 'Implement Checkout',
          status: 'in_progress',
          deliveryArea: 'frontend',
        },
      ],
    });
  });

  test('renders requirements list and shows New Requirement button for PO role', async () => {
    render(<RequirementManager workspaceId="ws-1" userRole="po" />);

    expect(await screen.findByText('Checkout Flow UI Spec')).toBeInTheDocument();
    expect(screen.getByText('Tax Calculation Formula')).toBeInTheDocument();
    expect(screen.getByTestId('create-requirement-btn')).toBeInTheDocument();
  });

  test('keeps a new task count at zero and separates available Workspace Requirements', async () => {
    listTaskRequirementLinksMock.mockResolvedValueOnce([]);

    render(<RequirementManager workspaceId="ws-1" taskId="new-task" userRole="po" />);

    expect(await screen.findByText('Checkout Flow UI Spec')).toBeInTheDocument();
    expect(screen.getByText('Linked Specifications & Requirements (0)')).toBeInTheDocument();
    expect(screen.getByText('No requirement linked')).toBeInTheDocument();
    expect(screen.getByText('Available Workspace Requirements (2)')).toBeInTheDocument();
  });

  test('shows Dev only Requirements linked to the selected task', async () => {
    listTaskRequirementLinksMock.mockResolvedValueOnce([
      {
        id: 'link-1',
        workspaceId: 'ws-1',
        taskId: 'task-1',
        requirementId: 'req-1',
        linkedBy: 'user-po',
        createdAt: '2026-08-21T00:00:00.000Z',
      },
    ]);

    render(<RequirementManager workspaceId="ws-1" taskId="task-1" userRole="dev" />);

    expect(await screen.findByText('Checkout Flow UI Spec')).toBeInTheDocument();
    expect(screen.getByText('Linked Specifications & Requirements (1)')).toBeInTheDocument();
    expect(screen.queryByText('Tax Calculation Formula')).not.toBeInTheDocument();
    expect(screen.queryByText(/Available Workspace Requirements/)).not.toBeInTheDocument();
  });

  test('moves Requirements between linked and available sections without stale counts', async () => {
    listTaskRequirementLinksMock.mockResolvedValueOnce([
      {
        id: 'link-1',
        workspaceId: 'ws-1',
        taskId: 'task-1',
        requirementId: 'req-1',
        linkedBy: 'user-po',
        createdAt: '2026-08-21T00:00:00.000Z',
      },
    ]);
    linkRequirementMock.mockResolvedValueOnce({
      id: 'link-2',
      workspaceId: 'ws-1',
      taskId: 'task-1',
      requirementId: 'req-2',
      linkedBy: 'user-po',
      createdAt: '2026-08-21T00:00:00.000Z',
    });
    unlinkRequirementMock.mockResolvedValueOnce(undefined);

    render(<RequirementManager workspaceId="ws-1" taskId="task-1" userRole="po" />);

    expect(await screen.findByText('Linked Specifications & Requirements (1)')).toBeInTheDocument();
    expect(screen.getByText('Available Workspace Requirements (1)')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Link$/i }));

    await waitFor(() => {
      expect(screen.getByText('Linked Specifications & Requirements (2)')).toBeInTheDocument();
      expect(screen.getByText('Available Workspace Requirements (0)')).toBeInTheDocument();
    });

    const unlinkButtons = screen.getAllByRole('button', { name: /^Unlink$/i });
    fireEvent.click(unlinkButtons[1]);

    await waitFor(() => {
      expect(screen.getByText('Linked Specifications & Requirements (1)')).toBeInTheDocument();
      expect(screen.getByText('Available Workspace Requirements (1)')).toBeInTheDocument();
    });
  });

  test('renders read-only badge and hides New Requirement button for Dev and QA roles', async () => {
    const { rerender } = render(<RequirementManager workspaceId="ws-1" userRole="dev" />);

    expect(await screen.findByText('Checkout Flow UI Spec')).toBeInTheDocument();
    expect(screen.queryByTestId('create-requirement-btn')).not.toBeInTheDocument();
    expect(screen.getByText('Read-Only')).toBeInTheDocument();

    rerender(<RequirementManager workspaceId="ws-1" userRole="qa" />);
    expect(screen.queryByTestId('create-requirement-btn')).not.toBeInTheDocument();
    expect(screen.getByText('Read-Only')).toBeInTheDocument();
  });

  test('filters requirements using search query', async () => {
    render(<RequirementManager workspaceId="ws-1" userRole="po" />);

    expect(await screen.findByText('Checkout Flow UI Spec')).toBeInTheDocument();
    expect(screen.getByText('Tax Calculation Formula')).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(/Search requirements by code/i);
    fireEvent.change(searchInput, { target: { value: 'Tax' } });

    expect(screen.queryByText('Checkout Flow UI Spec')).not.toBeInTheDocument();
    expect(screen.getByText('Tax Calculation Formula')).toBeInTheDocument();
  });

  test('expands requirement details and loads linked tasks summary', async () => {
    render(<RequirementManager workspaceId="ws-1" userRole="po" />);

    expect(await screen.findByText('Checkout Flow UI Spec')).toBeInTheDocument();

    const expandButtons = screen.getAllByRole('button', { name: /Expand details/i });
    fireEvent.click(expandButtons[0]);

    await waitFor(() => {
      expect(getRequirementMock).toHaveBeenCalledWith('ws-1', 'req-1');
      expect(screen.getByText(/Covers payment gateway and cart review/i)).toBeInTheDocument();
      expect(screen.getByText('Implement Checkout')).toBeInTheDocument();
    });
  });

  test('shows empty state when no requirements exist', async () => {
    listRequirementsMock.mockResolvedValueOnce([]);

    render(<RequirementManager workspaceId="ws-1" userRole="po" />);

    expect(await screen.findByText('No requirements found')).toBeInTheDocument();
  });
});
