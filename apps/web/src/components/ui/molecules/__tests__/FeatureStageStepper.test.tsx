import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FeatureStageStepper } from '../FeatureStageStepper';

describe('FeatureStageStepper', () => {
  it('menampilkan empat tahap dan menandai tahap yang dilihat (AC-2.1)', () => {
    render(
      <FeatureStageStepper
        currentStage="prd"
        selectedStage="task"
        onSelect={vi.fn()}
        disabledStages={['apply']}
      />,
    );
    const nav = screen.getByRole('navigation', { name: 'Tahap Feature' });
    expect(nav).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(4);
    expect(screen.getByRole('button', { name: /Task/ })).toHaveAttribute('aria-current', 'step');
    expect(screen.getByRole('button', { name: /Plan/ })).not.toHaveAttribute('aria-current');
    expect(screen.getByText('(tahap Feature saat ini)')).toBeInTheDocument();
  });

  it('memanggil onSelect, dan Apply nonaktif', () => {
    const onSelect = vi.fn();
    render(
      <FeatureStageStepper
        currentStage="plan"
        selectedStage="plan"
        onSelect={onSelect}
        disabledStages={['apply']}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /PRD/ }));
    expect(onSelect).toHaveBeenCalledWith('prd');
    expect(screen.getByRole('button', { name: /Apply/ })).toBeDisabled();
  });
});
