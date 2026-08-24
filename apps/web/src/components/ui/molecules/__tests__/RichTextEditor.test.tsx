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
      />,
    );

    expect(screen.getByText('Task Description')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Hello world')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /preview/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /write/i })).toBeInTheDocument();
    expect(screen.getByTitle('Expand Fullscreen / Focus Mode')).toBeInTheDocument();
  });

  it('switches between Preview and Write tabs and defaults to preview', () => {
    const handleChange = vi.fn();
    render(
      <RichTextEditor label="Task Description" value="# Big Heading" onChange={handleChange} />,
    );

    // Starts in Preview mode by default
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Big Heading');

    const writeButton = screen.getByRole('button', { name: /write/i });
    fireEvent.click(writeButton);

    expect(screen.getByDisplayValue('# Big Heading')).toBeInTheDocument();

    const previewButton = screen.getByRole('button', { name: /preview/i });
    fireEvent.click(previewButton);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Big Heading');
  });

  it('applies bold formatting when bold button is clicked in write mode', () => {
    const handleChange = vi.fn();
    render(
      <RichTextEditor
        label="Task Description"
        value=""
        onChange={handleChange}
        defaultTab="write"
      />,
    );

    const boldButton = screen.getByTitle('Bold (Ctrl+B)');
    fireEvent.click(boldButton);

    expect(handleChange).toHaveBeenCalledWith('**bold**');
  });

  it('toggles fullscreen mode on and off', () => {
    const handleChange = vi.fn();
    render(
      <RichTextEditor label="Task Description" value="Long text here..." onChange={handleChange} />,
    );

    const expandButton = screen.getByTitle('Expand Fullscreen / Focus Mode');
    fireEvent.click(expandButton);

    expect(screen.getByTitle('Exit Fullscreen (Esc)')).toBeInTheDocument();
    expect(screen.getByText('Press Esc to exit Fullscreen')).toBeInTheDocument();

    const minimizeButton = screen.getByTitle('Exit Fullscreen (Esc)');
    fireEvent.click(minimizeButton);

    expect(screen.getByTitle('Expand Fullscreen / Focus Mode')).toBeInTheDocument();
  });

  it('keeps focus mode inside the application content below the sticky header', () => {
    render(
      <RichTextEditor label="Task Description" value="Long text here..." onChange={vi.fn()} />,
    );

    fireEvent.click(screen.getByTitle('Expand Fullscreen / Focus Mode'));

    const focusModePanel = screen.getByTitle('Exit Fullscreen (Esc)').closest('.fixed');

    expect(focusModePanel).toHaveClass('top-24', 'inset-x-4', 'bottom-4');
    expect(focusModePanel).not.toHaveClass('inset-4');
  });

  it('disables textarea and formatting buttons when disabled is true without dimming the preview', () => {
    const handleChange = vi.fn();
    render(
      <RichTextEditor
        id="task-desc"
        label="Task Description"
        value="![Sample](https://example.com/test.png)"
        onChange={handleChange}
        disabled
      />,
    );

    // In Preview mode, image is rendered
    const img = screen.getByAltText('Sample');
    expect(img).toBeInTheDocument();

    // Switch to write tab and verify textarea is disabled
    const writeButton = screen.getByRole('button', { name: /write/i });
    fireEvent.click(writeButton);

    const textarea = screen.getByDisplayValue('![Sample](https://example.com/test.png)');
    expect(textarea).toBeDisabled();

    // Formatting buttons are disabled
    const boldButton = screen.getByTitle('Bold (Ctrl+B)');
    expect(boldButton).toBeDisabled();
  });

  it('inserts image link via Image Link modal', () => {
    const handleChange = vi.fn();
    render(
      <RichTextEditor
        label="Task Description"
        value=""
        onChange={handleChange}
        defaultTab="write"
      />,
    );

    const imageBtn = screen.getByTitle(/Insert Image Link/i);
    fireEvent.click(imageBtn);

    expect(screen.getAllByText('Insert Image Link').length).toBeGreaterThan(0);

    const urlInput = screen.getByPlaceholderText('https://example.com/screenshot.png');
    fireEvent.change(urlInput, { target: { value: 'https://example.com/ui-preview.png' } });

    const insertBtn = screen.getByRole('button', { name: 'Insert Image Link' });
    fireEvent.click(insertBtn);

    expect(handleChange).toHaveBeenCalledWith(
      expect.stringContaining('https://example.com/ui-preview.png'),
    );
  });

  it('inserts video link via Video Link modal', () => {
    const handleChange = vi.fn();
    render(
      <RichTextEditor
        label="Task Description"
        value=""
        onChange={handleChange}
        defaultTab="write"
      />,
    );

    const videoBtn = screen.getByTitle(/Insert Video Link/i);
    fireEvent.click(videoBtn);

    expect(screen.getAllByText('Insert Video Link').length).toBeGreaterThan(0);

    const urlInput = screen.getByPlaceholderText(/demo\.mp4 or YouTube/i);
    fireEvent.change(urlInput, { target: { value: 'https://cdn.example.com/demo.mp4' } });

    const insertBtn = screen.getByRole('button', { name: 'Insert Video Link' });
    fireEvent.click(insertBtn);

    expect(handleChange).toHaveBeenCalledWith(
      expect.stringContaining('https://cdn.example.com/demo.mp4'),
    );
  });
});
