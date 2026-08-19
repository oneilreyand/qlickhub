import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { SearchInput } from '../SearchInput';

describe('SearchInput', () => {
  it('renders with placeholder and accessible label', () => {
    render(<SearchInput placeholder="Search tasks..." aria-label="Search tasks" />);
    const input = screen.getByPlaceholderText('Search tasks...');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('aria-label', 'Search tasks');
  });

  it('handles typing and reports value changes', () => {
    const onChange = vi.fn();
    render(<SearchInput value="" onChange={onChange} placeholder="Search..." />);

    const input = screen.getByPlaceholderText('Search...');
    fireEvent.change(input, { target: { value: 'QA' } });

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('renders clear button when value is present and triggers clear', () => {
    const onClear = vi.fn();
    const onChange = vi.fn();

    const { rerender } = render(
      <SearchInput value="test query" onChange={onChange} onClear={onClear} placeholder="Search..." />
    );

    const clearBtn = screen.getByRole('button', { name: 'Clear search' });
    expect(clearBtn).toBeInTheDocument();

    fireEvent.click(clearBtn);
    expect(onClear).toHaveBeenCalledTimes(1);

    // If onClear is not provided, it falls back to calling onChange with empty string
    rerender(<SearchInput value="another query" onChange={onChange} placeholder="Search..." />);
    const clearBtn2 = screen.getByRole('button', { name: 'Clear search' });
    fireEvent.click(clearBtn2);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({ value: '' }),
      })
    );
  });

  it('displays shortcut badge when query is empty', () => {
    render(<SearchInput value="" onChange={() => {}} shortcut="⌘K" />);
    expect(screen.getByText('⌘K')).toBeInTheDocument();
  });

  it('renders disabled and error states properly', () => {
    render(<SearchInput value="" onChange={() => {}} disabled error="Invalid search term" />);
    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
    expect(screen.getByText('Invalid search term')).toBeInTheDocument();
  });
});
