import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { Task, TaskListQuery } from '@qa/contracts';
import { taskService } from '../lib/api/taskService';

type ReportQuery = Omit<Partial<Omit<TaskListQuery, 'workspaceId'>>, 'page' | 'limit'>;

interface ReportState {
  tasks: Task[];
  total: number;
  isLoading: boolean;
  error: string | null;
}

const initialState: ReportState = {
  tasks: [],
  total: 0,
  isLoading: false,
  error: null,
};

/**
 * Reports need complete workspace totals, while the task list is intentionally
 * paginated. Load every page through the existing authorised task endpoint so
 * no report value is inferred from fixture data or browser-side persistence.
 */
export const fetchTaskReport = createAsyncThunk(
  'report/fetchTaskReport',
  async ({ workspaceId, query }: { workspaceId: string; query?: ReportQuery }) => {
    const firstPage = await taskService.listTasks(workspaceId, {
      ...query,
      page: 1,
      limit: 100,
    });

    const totalPages = Math.ceil(firstPage.total / firstPage.limit);
    if (totalPages <= 1) {
      return { tasks: firstPage.tasks, total: firstPage.total };
    }

    const remainingPages = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, index) =>
        taskService.listTasks(workspaceId, {
          ...query,
          page: index + 2,
          limit: firstPage.limit,
        })
      )
    );

    return {
      tasks: [firstPage.tasks, ...remainingPages.map((page) => page.tasks)].flat(),
      total: firstPage.total,
    };
  }
);

const reportSlice = createSlice({
  name: 'report',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTaskReport.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        // Do not display a previous workspace's metrics while the authorised
        // report request for the current workspace is in flight.
        state.tasks = [];
        state.total = 0;
      })
      .addCase(fetchTaskReport.fulfilled, (state, action) => {
        state.isLoading = false;
        state.tasks = action.payload.tasks;
        state.total = action.payload.total;
      })
      .addCase(fetchTaskReport.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to load the report data';
      });
  },
});

export default reportSlice.reducer;
