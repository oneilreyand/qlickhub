import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TaskHubHeader } from '../TaskHubHeader';

const baseProps = {
  workspaceName: 'Payment',
  onCreateTask: vi.fn(),
  onOpenMobileFolders: vi.fn(),
};

describe('TaskHubHeader entry points', () => {
  it('shows "Tulis ide" as the main action and "Buat Feature manual" as the secondary one', () => {
    const onWriteIdea = vi.fn();
    const onCreateTask = vi.fn();
    render(
      <TaskHubHeader
        {...baseProps}
        canCreateTask
        onCreateTask={onCreateTask}
        onWriteIdea={onWriteIdea}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Tulis ide' }));
    expect(onWriteIdea).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Buat Feature manual' }));
    expect(onCreateTask).toHaveBeenCalledTimes(1);
  });

  it('hides both creation actions from people who cannot create Features', () => {
    render(<TaskHubHeader {...baseProps} canCreateTask={false} onWriteIdea={vi.fn()} />);

    expect(screen.queryByRole('button', { name: 'Tulis ide' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Buat Feature manual' })).not.toBeInTheDocument();
  });
});
