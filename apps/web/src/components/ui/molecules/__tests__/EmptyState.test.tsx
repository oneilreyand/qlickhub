import { render, screen } from '@testing-library/react';
import { CheckCircle2 } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import { EmptyState } from '../EmptyState';

describe('EmptyState', () => {
  it('keeps the illustration visible across light and dark themes', () => {
    render(
      <EmptyState
        icon={<CheckCircle2 data-testid="empty-state-icon" />}
        title="Nothing pending"
        description="There is no work requiring attention."
        illustrationSrc="https://example.com/empty.png"
        illustrationAlt="Empty queue illustration"
      />,
    );

    expect(screen.getByRole('img', { name: 'Empty queue illustration' })).not.toHaveClass(
      'dark:hidden',
    );
    expect(screen.queryByTestId('empty-state-icon')).not.toBeInTheDocument();
  });

  it('keeps the supplied icon visible when no illustration exists', () => {
    render(
      <EmptyState
        icon={<CheckCircle2 data-testid="empty-state-icon" />}
        title="Nothing pending"
        description="There is no work requiring attention."
      />,
    );

    expect(screen.getByTestId('empty-state-icon').parentElement).toHaveClass('grid');
    expect(screen.getByTestId('empty-state-icon').parentElement).not.toHaveClass('hidden');
  });
});
