import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import React from 'react';
import { Tabs } from '../Tabs';

const tabItems = [
  { id: 'overview', label: 'Ringkasan' },
  { id: 'requirements', label: 'Requirement' },
  { id: 'discussion', label: 'Diskusi' },
];

const TabsHarness = ({ variant = 'underline' }: { variant?: 'underline' | 'pills' }) => {
  const [activeTabId, setActiveTabId] = React.useState('overview');
  return (
    <Tabs
      tabs={tabItems}
      activeTabId={activeTabId}
      onChange={setActiveTabId}
      variant={variant}
      ariaLabel="Bagian detail Task"
    />
  );
};

describe('Tabs', () => {
  it.each(['underline', 'pills'] as const)(
    'mengekspos semantik dan status aktif pada varian %s',
    (variant) => {
      render(<TabsHarness variant={variant} />);

      expect(screen.getByRole('tablist', { name: 'Bagian detail Task' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Ringkasan' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
      expect(screen.getByRole('tab', { name: 'Ringkasan' })).toHaveAttribute('tabindex', '0');
      expect(screen.getByRole('tab', { name: 'Requirement' })).toHaveAttribute('tabindex', '-1');
    },
  );

  it('berpindah dan memutar fokus dengan ArrowLeft/ArrowRight', () => {
    render(<TabsHarness />);

    fireEvent.keyDown(screen.getByRole('tab', { name: 'Ringkasan' }), { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'Requirement' })).toHaveFocus();
    expect(screen.getByRole('tab', { name: 'Requirement' })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    fireEvent.keyDown(screen.getByRole('tab', { name: 'Requirement' }), { key: 'ArrowLeft' });
    expect(screen.getByRole('tab', { name: 'Ringkasan' })).toHaveFocus();

    fireEvent.keyDown(screen.getByRole('tab', { name: 'Ringkasan' }), { key: 'ArrowLeft' });
    expect(screen.getByRole('tab', { name: 'Diskusi' })).toHaveFocus();
  });

  it('berpindah langsung ke tab pertama dan terakhir dengan Home/End', () => {
    render(<TabsHarness />);

    fireEvent.keyDown(screen.getByRole('tab', { name: 'Ringkasan' }), { key: 'End' });
    expect(screen.getByRole('tab', { name: 'Diskusi' })).toHaveFocus();
    expect(screen.getByRole('tab', { name: 'Diskusi' })).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(screen.getByRole('tab', { name: 'Diskusi' }), { key: 'Home' });
    expect(screen.getByRole('tab', { name: 'Ringkasan' })).toHaveFocus();
  });
});
