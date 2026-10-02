import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  AssignmentConflictPreviewInput,
  AssignmentConflictPreviewResponse,
  TeamCapacityTimelineResponse,
} from '@qlick/contracts';

const apiMocks = vi.hoisted(() => ({
  apiClient: vi.fn(),
}));

vi.mock('../apiClient', () => ({
  apiClient: apiMocks.apiClient,
}));

import { capacityService } from '../capacityService';

const workspaceId = '123e4567-e89b-42d3-a456-426614174000';
const assigneeId = '223e4567-e89b-42d3-a456-426614174001';

const conflictInput: AssignmentConflictPreviewInput = {
  assigneeId,
  startDate: '2026-09-30',
  dueDate: '2026-10-02',
  excludeSubtaskId: '323e4567-e89b-42d3-a456-426614174002',
};

const conflictPreview: AssignmentConflictPreviewResponse = {
  assigneeId,
  startDate: '2026-09-30',
  dueDate: '2026-10-02',
  hasConflict: false,
  conflictCount: 0,
  conflicts: [],
  unscheduledActiveCount: 0,
  unscheduledSubtasks: [],
  advisoryMessage: 'Tidak ada bentrokan jadwal untuk periode ini.',
};

const timeline: TeamCapacityTimelineResponse = {
  workspaceId,
  startDate: '2026-09-01',
  endDate: '2026-09-30',
  scope: 'workspace',
  members: [],
  totalMembers: 0,
  totalScheduledSubtasks: 0,
  totalUnscheduledSubtasks: 0,
  totalOutsideWindowSubtasks: 0,
};

describe('capacityService response adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('parses the direct assignment-preview response returned by the capacity API', async () => {
    apiMocks.apiClient.mockResolvedValue(conflictPreview);

    await expect(
      capacityService.previewAssignmentConflict(workspaceId, conflictInput),
    ).resolves.toEqual(conflictPreview);
  });

  it('parses the direct timeline response returned by the capacity API', async () => {
    apiMocks.apiClient.mockResolvedValue(timeline);

    await expect(capacityService.getTeamTimeline(workspaceId)).resolves.toEqual(timeline);
  });
});
