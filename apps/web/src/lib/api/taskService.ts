import { apiClient } from './apiClient';
import {
  Task,
  TaskStatus,
  TaskListResponse,
  TaskListQuery,
  CreateTaskInput,
  UpdateTaskInput,
  MoveTaskInput,
  CompleteTaskInput,
  TaskActivityListResponse,
  TaskCommentListResponse,
  CreateTaskCommentInput,
  UpdateTaskCommentInput,
  TaskComment,
  TaskAttachment,
} from '@qlick/contracts';

export const taskService = {
  async getTask(workspaceId: string, taskId: string): Promise<Task> {
    const res = await apiClient<{ data: Task }>(`/workspaces/${workspaceId}/tasks/${taskId}`);
    return res.data;
  },

  async deleteTask(workspaceId: string, taskId: string): Promise<{ success: boolean }> {
    const res = await apiClient<{ data: { success: boolean } }>(
      `/workspaces/${workspaceId}/tasks/${taskId}`,
      {
        method: 'DELETE',
      },
    );
    return res.data;
  },

  async updateTaskStatus(workspaceId: string, taskId: string, status: TaskStatus): Promise<Task> {
    const res = await apiClient<{ data: Task }>(
      `/workspaces/${workspaceId}/tasks/${taskId}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      },
    );
    return res.data;
  },

  async listTasks(
    workspaceId: string,
    query?: Partial<Omit<TaskListQuery, 'workspaceId'>>,
  ): Promise<TaskListResponse> {
    const params: Record<string, string> = {};
    if (query) {
      if (query.folderId) params.folderId = query.folderId;
      if (query.includeDescendants !== undefined)
        params.includeDescendants = String(query.includeDescendants);
      if (query.unfiledOnly !== undefined) params.unfiledOnly = String(query.unfiledOnly);
      if (query.rootOnly !== undefined) params.rootOnly = String(query.rootOnly);
      if (query.myTasksOnly !== undefined) params.myTasksOnly = String(query.myTasksOnly);
      if (query.parentTaskId) params.parentTaskId = query.parentTaskId;
      if (query.includeSubtaskSummary !== undefined)
        params.includeSubtaskSummary = String(query.includeSubtaskSummary);
      if (query.status) {
        params.status = Array.isArray(query.status) ? query.status.join(',') : query.status;
      }
      if (query.priority) {
        params.priority = Array.isArray(query.priority) ? query.priority.join(',') : query.priority;
      }
      if (query.assigneeId) params.assigneeId = query.assigneeId;
      if (query.datePreset) params.datePreset = query.datePreset;
      if (query.startDate) params.startDate = query.startDate;
      if (query.endDate) params.endDate = query.endDate;
      if (query.search) params.search = query.search;
      if (query.page) params.page = String(query.page);
      if (query.limit) params.limit = String(query.limit);
    }

    const res = await apiClient<{ data: TaskListResponse }>(`/workspaces/${workspaceId}/tasks`, {
      params,
    });
    return res.data;
  },

  async listSubtasks(
    workspaceId: string,
    parentTaskId: string,
    page = 1,
    limit = 50,
  ): Promise<TaskListResponse> {
    const res = await apiClient<{ data: TaskListResponse }>(
      `/workspaces/${workspaceId}/tasks/${parentTaskId}/subtasks`,
      { params: { page: String(page), limit: String(limit) } },
    );
    return res.data;
  },

  async createTask(
    workspaceId: string,
    input: Omit<CreateTaskInput, 'workspaceId'>,
  ): Promise<Task> {
    const res = await apiClient<{ data: Task }>(`/workspaces/${workspaceId}/tasks`, {
      method: 'POST',
      body: JSON.stringify({ ...input, workspaceId }),
    });
    return res.data;
  },

  async createSubtask(
    workspaceId: string,
    parentTaskId: string,
    input: Omit<CreateTaskInput, 'workspaceId' | 'parentTaskId'>,
  ): Promise<Task> {
    const res = await apiClient<{ data: Task }>(
      `/workspaces/${workspaceId}/tasks/${parentTaskId}/subtasks`,
      {
        method: 'POST',
        body: JSON.stringify({ ...input, workspaceId, parentTaskId }),
      },
    );
    return res.data;
  },

  async updateTask(workspaceId: string, taskId: string, input: UpdateTaskInput): Promise<Task> {
    const res = await apiClient<{ data: Task }>(`/workspaces/${workspaceId}/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
    return res.data;
  },

  async moveTask(workspaceId: string, taskId: string, input: MoveTaskInput): Promise<Task> {
    const res = await apiClient<{ data: Task }>(`/workspaces/${workspaceId}/tasks/${taskId}/move`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
    return res.data;
  },

  async completeTask(workspaceId: string, taskId: string, input: CompleteTaskInput): Promise<Task> {
    const res = await apiClient<{ data: Task }>(
      `/workspaces/${workspaceId}/tasks/${taskId}/complete`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    );
    return res.data;
  },

  async listTaskActivity(
    workspaceId: string,
    taskId: string,
    page = 1,
    limit = 50,
  ): Promise<TaskActivityListResponse> {
    const res = await apiClient<{ data: TaskActivityListResponse }>(
      `/workspaces/${workspaceId}/tasks/${taskId}/activity`,
      { params: { page: String(page), limit: String(limit) } },
    );
    return res.data;
  },

  async listTaskComments(
    workspaceId: string,
    taskId: string,
    page = 1,
    limit = 50,
  ): Promise<TaskCommentListResponse> {
    const res = await apiClient<{ data: TaskCommentListResponse }>(
      `/workspaces/${workspaceId}/tasks/${taskId}/comments`,
      { params: { page: String(page), limit: String(limit) } },
    );
    return res.data;
  },

  async createTaskComment(
    workspaceId: string,
    taskId: string,
    input: CreateTaskCommentInput,
  ): Promise<TaskComment> {
    const res = await apiClient<{ data: TaskComment }>(
      `/workspaces/${workspaceId}/tasks/${taskId}/comments`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    );
    return res.data;
  },

  async updateTaskComment(
    workspaceId: string,
    taskId: string,
    commentId: string,
    input: UpdateTaskCommentInput,
  ): Promise<TaskComment> {
    const res = await apiClient<{ data: TaskComment }>(
      `/workspaces/${workspaceId}/tasks/${taskId}/comments/${commentId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      },
    );
    return res.data;
  },

  async deleteTaskComment(
    workspaceId: string,
    taskId: string,
    commentId: string,
  ): Promise<TaskComment> {
    const res = await apiClient<{ data: TaskComment }>(
      `/workspaces/${workspaceId}/tasks/${taskId}/comments/${commentId}`,
      {
        method: 'DELETE',
      },
    );
    return res.data;
  },

  async listTaskAttachments(workspaceId: string, taskId: string): Promise<TaskAttachment[]> {
    const res = await apiClient<{ attachments: TaskAttachment[] }>(
      `/workspaces/${workspaceId}/tasks/${taskId}/attachments`,
    );
    return res.attachments || [];
  },
};
