import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TaskCollection, EMPTY_TASKS_ILLUSTRATION_URL } from '../TaskCollection';

describe('TaskCollection Organism', () => {
  it('renders no tasks illustration and message when task list is empty', () => {
    render(
      <TaskCollection
        tasks={[]}
        folders={[]}
        isLoading={false}
        onSelect={vi.fn()}
      />
    );

    const imgs = screen.getAllByAltText('No Tasks in Task Hub Illustration');
    expect(imgs.length).toBeGreaterThanOrEqual(1);
    expect(imgs[0]).toHaveAttribute('src', EMPTY_TASKS_ILLUSTRATION_URL);
    expect(EMPTY_TASKS_ILLUSTRATION_URL).toBe(
      'https://res.cloudinary.com/dxgnzhn8l/image/upload/v1787027457/ChatGPT_Image_Aug_18_2026_11_30_28_AM.png'
    );
    expect(screen.getAllByText('No tasks found').length).toBeGreaterThanOrEqual(1);
  });
});
