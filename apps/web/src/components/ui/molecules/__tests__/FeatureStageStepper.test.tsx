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
        summaries={{ prd: '3 requirement · 7 AC', task: '4 subtask' }}
        disabledStages={['apply']}
      />,
    );
    const nav = screen.getByRole('navigation', { name: 'Tahap Feature' });
    expect(nav).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(4);
    expect(screen.getByRole('button', { name: /Task/ })).toHaveAttribute('aria-current', 'step');
    expect(screen.getByRole('button', { name: /Plan/ })).not.toHaveAttribute('aria-current');
    expect(screen.getByText('(tahap Feature saat ini)')).toBeInTheDocument();
    expect(screen.getByText('3 requirement · 7 AC')).toBeInTheDocument();
    expect(screen.getByText('4 subtask')).toBeInTheDocument();
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

  it('Feature tersimpan: tahap saat ini tetap hijau saat dilihat dan Apply ikut selesai', () => {
    render(
      <FeatureStageStepper
        currentStage="task"
        selectedStage="plan"
        applied
        onSelect={vi.fn()}
        disabledStages={['apply']}
        summaries={{ apply: 'Diterapkan' }}
      />,
    );
    // Plan dilihat tetapi tetap bercentang; Task bukan lagi kartu putus-putus.
    expect(screen.getByRole('button', { name: /Plan/ })).toHaveAttribute('aria-current', 'step');
    expect(screen.getByRole('button', { name: /Task/ }).className).not.toMatch(/border-dashed/);
    expect(screen.getByRole('button', { name: /Apply/ })).toHaveAttribute(
      'title',
      'Sudah diterapkan',
    );
    expect(screen.getByText('Diterapkan')).toBeInTheDocument();
  });

  it('tidak memberi centang pada tahap yang sedang dikerjakan, hanya tahap sebelumnya', () => {
    const { rerender } = render(
      <FeatureStageStepper
        currentStage="plan"
        currentStageInProgress
        selectedStage="plan"
        onSelect={vi.fn()}
      />,
    );
    // Plan masih dikerjakan: menampilkan nomor 1, bukan centang.
    expect(screen.getByRole('button', { name: /Plan/ })).toHaveTextContent('1');

    rerender(
      <FeatureStageStepper
        currentStage="prd"
        currentStageInProgress
        selectedStage="prd"
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: /Plan/ })).not.toHaveTextContent('1');
    expect(screen.getByRole('button', { name: /PRD/ })).toHaveTextContent('2');
  });
});
