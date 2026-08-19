import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MyTasksDashboard, EMPTY_TASKS_ILLUSTRATION_URL } from '../MyTasksDashboard';

describe('MyTasksDashboard Organism', () => {
  it('renders no tasks illustration and message when task list is empty', () => {
    render(
      <MyTasksDashboard
        tasks={[]}
        isLoading={false}
        selectedTaskId={null}
        onSelectTask={vi.fn()}
        onToggleComplete={vi.fn()}
        onCreateTaskClick={vi.fn()}
      />
    );

    const img = screen.getByAltText('No Tasks Illustration');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', EMPTY_TASKS_ILLUSTRATION_URL);
    expect(EMPTY_TASKS_ILLUSTRATION_URL).toBe(
      'https://res.cloudinary.com/dxgnzhn8l/image/upload/v1787027457/ChatGPT_Image_Aug_18_2026_11_30_28_AM.png'
    );
    expect(screen.getByText('No tasks found')).toBeInTheDocument();
  });
});
