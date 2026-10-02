import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from '../Button';

describe('Button', () => {
  it('keeps the compact button at the canonical 44px touch target', () => {
    render(<Button size="sm">Aksi ringkas</Button>);

    expect(screen.getByRole('button', { name: 'Aksi ringkas' })).toHaveClass('min-h-[44px]');
  });
});
