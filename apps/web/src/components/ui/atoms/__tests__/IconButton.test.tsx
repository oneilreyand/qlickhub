import { render, screen } from '@testing-library/react';
import { ChevronLeft } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { IconButton } from '../IconButton';

describe('IconButton', () => {
  it('keeps the compact icon button at the canonical 44px touch target', () => {
    render(
      <IconButton label="Kembali" size="sm">
        <ChevronLeft />
      </IconButton>,
    );

    expect(screen.getByRole('button', { name: 'Kembali' })).toHaveClass('h-11', 'w-11');
  });
});
