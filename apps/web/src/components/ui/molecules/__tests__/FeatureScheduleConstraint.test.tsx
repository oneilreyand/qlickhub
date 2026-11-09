import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FeatureScheduleConstraintSchema } from '@qlick/contracts';
import { FeatureScheduleConstraintBadge, FeatureScheduleRange } from '../FeatureScheduleConstraint';

/** Contract-valid response factory: backend status is authoritative for UI rendering. */
const constraint = (status: 'outside' | 'within' | 'ignored') =>
  FeatureScheduleConstraintSchema.parse({
    status,
    label: status === 'outside' ? 'Di luar jadwal Feature' : 'Tidak ada konflik',
    reason: 'Rentang Feature 2026-11-01–2026-11-30',
    featureStartDate: '2026-11-01',
    featureDueDate: '2026-11-30',
  });
describe('Feature schedule presentation', () => {
  it('renders backend legacy warning with text and icon, without calculating dates', () => {
    render(<FeatureScheduleConstraintBadge constraint={constraint('outside')} />);
    expect(screen.getByText('Di luar jadwal Feature')).toBeVisible();
    expect(screen.getByTitle(/Rentang Feature/)).toBeInTheDocument();
  });
  it('does not invent an outside flag for missing or ignored backend state', () => {
    const { rerender } = render(<FeatureScheduleConstraintBadge />);
    expect(screen.queryByText('Di luar jadwal Feature')).toBeNull();
    rerender(<FeatureScheduleConstraintBadge constraint={constraint('ignored')} />);
    expect(screen.queryByText('Di luar jadwal Feature')).toBeNull();
  });
  it('presents the persisted range and its explicit unbounded state', () => {
    const { rerender } = render(
      <FeatureScheduleRange startDate="2026-11-01" dueDate="2026-11-30" />,
    );
    expect(screen.getByText(/2026-11-01 – 2026-11-30/)).toBeVisible();
    rerender(<FeatureScheduleRange startDate={null} dueDate={null} />);
    expect(screen.getByText(/Tanpa jadwal; subtask tidak dibatasi/)).toBeVisible();
    rerender(<FeatureScheduleRange />);
    expect(screen.getByText(/Belum tersedia; muat ulang/)).toBeVisible();
  });
});
