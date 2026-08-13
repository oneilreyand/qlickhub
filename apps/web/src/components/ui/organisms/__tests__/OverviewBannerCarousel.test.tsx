import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { OverviewBannerCarousel } from '../OverviewBannerCarousel';

describe('OverviewBannerCarousel', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('automatically moves between the two asset banners', () => {
    vi.useFakeTimers();

    render(<OverviewBannerCarousel />);

    expect(screen.getByRole('img', { name: 'Tugaskan tugas yang tepat ke orang yang tepat.' })).toBeVisible();

    act(() => {
      vi.advanceTimersByTime(7000);
    });

    expect(screen.getByRole('img', { name: 'Perbandingan biaya tools manajemen tugas.' })).toBeVisible();
  });

  it('keeps banner controls visually clean', () => {
    render(<OverviewBannerCarousel />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
