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
      <ErrorBoundaryFallback title="Custom Error Title" description="Custom error description" />,
    );

    const img = screen.getByAltText('Ilustrasi kesalahan');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', ERROR_BOUNDARY_ILLUSTRATION_URL);
    expect(ERROR_BOUNDARY_ILLUSTRATION_URL).toBe(
      'https://res.cloudinary.com/dxgnzhn8l/image/upload/v1787020942/404.png',
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
      </ErrorBoundary>,
    );

    expect(screen.getByText('Terjadi Kesalahan')).toBeInTheDocument();
    const img = screen.getByAltText('Ilustrasi kesalahan');
    expect(img).toHaveAttribute(
      'src',
      'https://res.cloudinary.com/dxgnzhn8l/image/upload/v1787020942/404.png',
    );

    spy.mockRestore();
  });

  it('handles reset callback when Try Again button is clicked', () => {
    const handleReset = vi.fn();
    render(
      <ErrorBoundaryFallback error={new Error('Sample error')} resetErrorBoundary={handleReset} />,
    );

    const tryAgainButton = screen.getByRole('button', { name: /coba lagi/i });
    fireEvent.click(tryAgainButton);
    expect(handleReset).toHaveBeenCalledTimes(1);
  });

  it('performs a full reload for a stale lazy route chunk instead of only resetting the boundary', () => {
    const handleReset = vi.fn();
    const reloadPage = vi.fn();
    render(
      <ErrorBoundaryFallback
        error={new TypeError('Failed to fetch dynamically imported module')}
        resetErrorBoundary={handleReset}
        reloadPage={reloadPage}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /coba lagi/i }));

    expect(reloadPage).toHaveBeenCalledTimes(1);
    expect(handleReset).not.toHaveBeenCalled();
  });
});
