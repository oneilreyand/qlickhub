/**
 * Task Service Façade
 *
 * Public seam for the Task domain — the only symbol that callers (routes,
 * controllers, and other modules) should import from this module.
 *
 * All implementation detail lives in the internal/ sub-modules:
 *   - internal/taskQuery.ts      — list, get, activity, subtask read ops
 *   - internal/taskLifecycle.ts  — create, update, move, complete
 *   - internal/taskDeletion.ts   — delete with release-critical guards
 *
 * This file must not grow beyond routing/orchestration. Complexity that
 * belongs to a specific domain concept goes into the relevant internal file.
 */

import {
  CreateTaskInput,
  UpdateTaskInput,
  MoveTaskInput,
  CompleteTaskInput,
  TaskListQuery,
  Task,
  TaskListResponse,
  TaskActivityQuery,
  TaskActivityListResponse,
  WorkspaceRole,
} from '@qlick/contracts';

import {
  listTasksImpl,
  getTaskImpl,
  listSubtasksImpl,
  listTaskActivityImpl,
} from './internal/taskQuery.js';
import {
  createTaskImpl,
  updateTaskImpl,
  moveTaskImpl,
  completeTaskImpl,
} from './internal/taskLifecycle.js';
import { deleteTaskImpl } from './internal/taskDeletion.js';

export class TaskService {
  /**
   * Lists tasks in a workspace with filtering, hierarchy options, date presets, search, and pagination.
   */
  async listTasks(
    workspaceId: string,
    query: TaskListQuery,
    actorId?: string,
    actorRole?: WorkspaceRole,
  ): Promise<TaskListResponse> {
    return listTasksImpl(workspaceId, query, actorId, actorRole);
  }

  async getTask(
    workspaceId: string,
    taskId: string,
    actorId: string,
    actorRole?: WorkspaceRole,
  ): Promise<Task> {
    return getTaskImpl(workspaceId, taskId, actorId, actorRole);
  }

  async deleteTask(workspaceId: string, taskId: string, actorId: string): Promise<void> {
    return deleteTaskImpl(workspaceId, taskId, actorId);
  }

  /**
   * Lists direct subtasks for a given parent task.
   */
  async listSubtasks(
    workspaceId: string,
    parentTaskId: string,
    page = 1,
    limit = 50,
    actorId?: string,
    actorRole?: WorkspaceRole,
  ): Promise<TaskListResponse> {
    return listSubtasksImpl(workspaceId, parentTaskId, page, limit, actorId, actorRole);
  }

  /**
   * Lists paginated task activity audit timeline for a task or aggregated parent timeline.
   */
  async listTaskActivity(
    actorId: string,
    workspaceId: string,
    taskId: string,
    query: TaskActivityQuery,
  ): Promise<TaskActivityListResponse> {
    return listTaskActivityImpl(actorId, workspaceId, taskId, query);
  }

  /**
   * Creates a new task or subtask. Enforces active folder, policy rules, and records Activity audit event.
   */
  async createTask(actorId: string, input: CreateTaskInput): Promise<Task> {
    return createTaskImpl(actorId, input);
  }

  /**
   * Updates task details. Enforces field-level policy and records Activity audit events.
   */
  async updateTask(
    actorId: string,
    workspaceId: string,
    taskId: string,
    input: UpdateTaskInput,
  ): Promise<Task> {
    return updateTaskImpl(actorId, workspaceId, taskId, input);
  }

  /**
   * Moves a parent task to a target folder or unfiled, propagating folder change to all direct subtasks and logging Activity.
   */
  async moveTask(
    actorId: string,
    workspaceId: string,
    taskId: string,
    input: MoveTaskInput,
  ): Promise<Task> {
    return moveTaskImpl(actorId, workspaceId, taskId, input);
  }

  /**
   * Completes or cancels a task or subtask.
   */
  async completeTask(
    actorId: string,
    workspaceId: string,
    taskId: string,
    input: CompleteTaskInput,
  ): Promise<Task> {
    return completeTaskImpl(actorId, workspaceId, taskId, input);
  }
}

export const taskService = new TaskService();
