import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  ErrorBoundary,
  ErrorBoundaryFallback,
  ERROR_BOUNDARY_ILLUSTRATION_URL,
} from '../ErrorBoundary';

const ProblemChild: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test crash inside ProblemChild');
  }
  return <div>Healthy Child Content</div>;
};

describe('ErrorBoundary & ErrorBoundaryFallback Organism', () => {
  it('renders illustration with the correct 404 image url', () => {
    render(
      <ErrorBoundaryFallback
        title="Custom Error Title"
        description="Custom error description"
      />
    );

    const img = screen.getByAltText('Error Illustration');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', ERROR_BOUNDARY_ILLUSTRATION_URL);
    expect(ERROR_BOUNDARY_ILLUSTRATION_URL).toBe(
      'https://res.cloudinary.com/dxgnzhn8l/image/upload/v1787020942/404.png'
    );
    expect(screen.getByText('Custom Error Title')).toBeInTheDocument();
    expect(screen.getByText('Custom error description')).toBeInTheDocument();
  });

  it('catches runtime exception in child component and renders fallback', () => {
    // Suppress console.error in vitest output for expected test error
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    const img = screen.getByAltText('Error Illustration');
    expect(img).toHaveAttribute(
      'src',
      'https://res.cloudinary.com/dxgnzhn8l/image/upload/v1787020942/404.png'
    );

    spy.mockRestore();
  });

  it('handles reset callback when Try Again button is clicked', () => {
    const handleReset = vi.fn();
    render(
      <ErrorBoundaryFallback
        error={new Error('Sample error')}
        resetErrorBoundary={handleReset}
      />
    );

    const tryAgainButton = screen.getByRole('button', { name: /try again/i });
    fireEvent.click(tryAgainButton);
    expect(handleReset).toHaveBeenCalledTimes(1);
  });
});
