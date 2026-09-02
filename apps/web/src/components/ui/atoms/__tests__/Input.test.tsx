import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { Input } from '../Input';

describe('Input Atom Component', () => {
  it('renders standard text input and associates label with input ID', () => {
    const onChange = vi.fn();
    render(<Input label="Username" placeholder="Enter username" onChange={onChange} />);

    const input = screen.getByLabelText('Username');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'text');
    expect(input).toHaveAttribute('placeholder', 'Enter username');

    fireEvent.change(input, { target: { value: 'johndoe' } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('renders error message when error prop is provided', () => {
    render(<Input label="Email" error="Invalid email address" />);

    expect(screen.getByText('Invalid email address')).toBeInTheDocument();
  });

  it('renders left icon and shortcut when provided', () => {
    render(
      <Input label="Search" leftIcon={<span data-testid="search-icon">🔍</span>} shortcut="⌘K" />,
    );

    expect(screen.getByTestId('search-icon')).toBeInTheDocument();
    expect(screen.getByText('⌘K')).toBeInTheDocument();
  });

  it('renders password visibility toggle by default for type="password"', () => {
    render(<Input label="Password" type="password" placeholder="Enter password" />);

    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('type', 'password');

    const toggleButton = screen.getByRole('button', { name: /show password/i });
    expect(toggleButton).toBeInTheDocument();
    expect(toggleButton).toHaveAttribute('type', 'button');

    // Click toggle button to show password
    fireEvent.click(toggleButton);
    expect(input).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: /hide password/i })).toBeInTheDocument();

    // Click toggle button again to hide password
    fireEvent.click(screen.getByRole('button', { name: /hide password/i }));
    expect(input).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: /show password/i })).toBeInTheDocument();
  });

  it('does not render password visibility toggle if showPasswordToggle is false', () => {
    render(<Input label="Password" type="password" showPasswordToggle={false} />);

    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('type', 'password');
    expect(screen.queryByRole('button', { name: /show password/i })).not.toBeInTheDocument();
  });

  it('disables toggle button and applies disabled styling when input is disabled', () => {
    render(<Input label="Password" type="password" disabled />);

    const input = screen.getByLabelText('Password');
    expect(input).toBeDisabled();

    const toggleButton = screen.getByRole('button', { name: /show password/i });
    expect(toggleButton).toBeDisabled();
  });

  it('renders rightIcon when provided and not password toggle', () => {
    render(<Input label="Custom" rightIcon={<span data-testid="custom-right-icon">★</span>} />);

    expect(screen.getByTestId('custom-right-icon')).toBeInTheDocument();
  });
});
