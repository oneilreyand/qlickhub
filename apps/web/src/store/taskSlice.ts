import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { taskService } from '../lib/api/taskService';
import {
  Task,
  TaskListQuery,
  CreateTaskInput,
  UpdateTaskInput,
  MoveTaskInput,
  CompleteTaskInput,
} from '@qa/contracts';

interface TaskState {
  tasks: Task[];
  total: number;
  page: number;
  limit: number;
  selectedTaskId: string | null;
  queryFilter: Partial<Omit<TaskListQuery, 'workspaceId'>>;
  isLoading: boolean;
  isMutating: boolean;
  error: string | null;
}

const initialState: TaskState = {
  tasks: [],
  total: 0,
  page: 1,
  limit: 50,
  selectedTaskId: null,
  queryFilter: {},
  isLoading: false,
  isMutating: false,
  error: null,
};

export const fetchTasks = createAsyncThunk(
  'task/fetchTasks',
  async ({
    workspaceId,
    query,
  }: {
    workspaceId: string;
    query?: Partial<Omit<TaskListQuery, 'workspaceId'>>;
  }) => {
    return await taskService.listTasks(workspaceId, query);
  }
);

export const createTask = createAsyncThunk(
  'task/createTask',
  async (
    {
      workspaceId,
      input,
      query,
    }: {
      workspaceId: string;
      input: Omit<CreateTaskInput, 'workspaceId'>;
      query?: Partial<Omit<TaskListQuery, 'workspaceId'>>;
    },
    { dispatch }
  ) => {
    const task = await taskService.createTask(workspaceId, input);
    dispatch(fetchTasks({ workspaceId, query }));
    return task;
  }
);

export const updateTask = createAsyncThunk(
  'task/updateTask',
  async ({
    workspaceId,
    taskId,
    input,
  }: {
    workspaceId: string;
    taskId: string;
    input: UpdateTaskInput;
  }) => {
    return await taskService.updateTask(workspaceId, taskId, input);
  }
);

export const moveTask = createAsyncThunk(
  'task/moveTask',
  async (
    {
      workspaceId,
      taskId,
      input,
      query,
    }: {
      workspaceId: string;
      taskId: string;
      input: MoveTaskInput;
      query?: Partial<Omit<TaskListQuery, 'workspaceId'>>;
    },
    { dispatch }
  ) => {
    const task = await taskService.moveTask(workspaceId, taskId, input);
    dispatch(fetchTasks({ workspaceId, query }));
    return task;
  }
);

export const completeTask = createAsyncThunk(
  'task/completeTask',
  async ({
    workspaceId,
    taskId,
    input,
  }: {
    workspaceId: string;
    taskId: string;
    input: CompleteTaskInput;
  }) => {
    return await taskService.completeTask(workspaceId, taskId, input);
  }
);

const taskSlice = createSlice({
  name: 'task',
  initialState,
  reducers: {
    setSelectedTaskId: (state, action: PayloadAction<string | null>) => {
      state.selectedTaskId = action.payload;
    },
    setQueryFilter: (
      state,
      action: PayloadAction<Partial<Omit<TaskListQuery, 'workspaceId'>>>
    ) => {
      state.queryFilter = { ...state.queryFilter, ...action.payload };
    },
    clearTaskError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchTasks
      .addCase(fetchTasks.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.isLoading = false;
        state.tasks = action.payload.tasks;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.limit = action.payload.limit;
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch tasks';
      })
      // createTask
      .addCase(createTask.pending, (state) => {
        state.isMutating = true;
        state.error = null;
      })
      .addCase(createTask.fulfilled, (state) => {
        state.isMutating = false;
      })
      .addCase(createTask.rejected, (state, action) => {
        state.isMutating = false;
        state.error = action.error.message || 'Failed to create task';
      })
      // updateTask
      .addCase(updateTask.pending, (state) => {
        state.isMutating = true;
        state.error = null;
      })
      .addCase(updateTask.fulfilled, (state, action) => {
        state.isMutating = false;
        const index = state.tasks.findIndex((t) => t.id === action.payload.id);
        if (index !== -1) {
          state.tasks[index] = action.payload;
        }
      })
      .addCase(updateTask.rejected, (state, action) => {
        state.isMutating = false;
        state.error = action.error.message || 'Failed to update task';
      })
      // moveTask
      .addCase(moveTask.pending, (state) => {
        state.isMutating = true;
        state.error = null;
      })
      .addCase(moveTask.fulfilled, (state) => {
        state.isMutating = false;
      })
      .addCase(moveTask.rejected, (state, action) => {
        state.isMutating = false;
        state.error = action.error.message || 'Failed to move task';
      })
      // completeTask
      .addCase(completeTask.pending, (state) => {
        state.isMutating = true;
        state.error = null;
      })
      .addCase(completeTask.fulfilled, (state, action) => {
        state.isMutating = false;
        const index = state.tasks.findIndex((t) => t.id === action.payload.id);
        if (index !== -1) {
          state.tasks[index] = action.payload;
        }
      })
      .addCase(completeTask.rejected, (state, action) => {
        state.isMutating = false;
        state.error = action.error.message || 'Failed to complete task';
      });
  },
});

export const { setSelectedTaskId, setQueryFilter, clearTaskError } = taskSlice.actions;
export default taskSlice.reducer;
