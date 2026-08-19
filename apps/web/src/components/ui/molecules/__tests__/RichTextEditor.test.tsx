import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RichTextEditor } from '../RichTextEditor';

describe('RichTextEditor Molecule', () => {
  it('renders label, toolbar buttons, and textarea', () => {
    const handleChange = vi.fn();
    render(
      <RichTextEditor
        id="task-desc"
        label="Task Description"
        required
        value="Hello world"
        onChange={handleChange}
      />
    );

    expect(screen.getByText('Task Description')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Hello world')).toBeInTheDocument();
    expect(screen.getByTitle('Bold (Ctrl+B)')).toBeInTheDocument();
    expect(screen.getByTitle('Bullet List')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /preview/i })).toBeInTheDocument();
    expect(screen.getByTitle('Expand Fullscreen / Focus Mode')).toBeInTheDocument();
  });

  it('switches between Write and Preview tabs', () => {
    const handleChange = vi.fn();
    render(
      <RichTextEditor
        label="Task Description"
        value="# Big Heading"
        onChange={handleChange}
      />
    );

    const previewButton = screen.getByRole('button', { name: /preview/i });
    fireEvent.click(previewButton);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Big Heading');

    const writeButton = screen.getByRole('button', { name: /write/i });
    fireEvent.click(writeButton);

    expect(screen.getByDisplayValue('# Big Heading')).toBeInTheDocument();
  });

  it('applies bold formatting when bold button is clicked', () => {
    const handleChange = vi.fn();
    render(
      <RichTextEditor
        label="Task Description"
        value=""
        onChange={handleChange}
      />
    );

    const boldButton = screen.getByTitle('Bold (Ctrl+B)');
    fireEvent.click(boldButton);

    expect(handleChange).toHaveBeenCalledWith('**bold**');
  });

  it('toggles fullscreen mode on and off', () => {
    const handleChange = vi.fn();
    render(
      <RichTextEditor
        label="Task Description"
        value="Long text here..."
        onChange={handleChange}
      />
    );

    const expandButton = screen.getByTitle('Expand Fullscreen / Focus Mode');
    fireEvent.click(expandButton);

    expect(screen.getByTitle('Exit Fullscreen (Esc)')).toBeInTheDocument();
    expect(screen.getByText('Press Esc to exit Fullscreen')).toBeInTheDocument();

    const minimizeButton = screen.getByTitle('Exit Fullscreen (Esc)');
    fireEvent.click(minimizeButton);

    expect(screen.getByTitle('Expand Fullscreen / Focus Mode')).toBeInTheDocument();
  });
});
