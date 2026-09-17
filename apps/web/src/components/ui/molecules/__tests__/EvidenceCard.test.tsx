import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EvidenceCard } from '../EvidenceCard';

describe('EvidenceCard', () => {
  const mockLink = {
    id: 'evidence-1',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    normalizedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    provider: 'youtube',
    mediaKind: 'video',
    label: 'Reproduksi video bug checkout',
    previewStatus: 'ready' as const,
  };

  it('renders with theme-aware tokens without hardcoded dark-only surfaces', () => {
    const { container } = render(<EvidenceCard link={mockLink} />);

    const darkOnlyTokens = [
      'bg-slate-800',
      'bg-slate-800/60',
      'bg-slate-800/40',
      'border-slate-700',
      'border-slate-700/60',
      'text-slate-200',
      'text-slate-400',
    ];

    const elementsWithDarkOnly = Array.from(container.querySelectorAll<HTMLElement>('*')).filter(
      (el) => darkOnlyTokens.some((token) => el.classList.contains(token)),
    );

    expect(elementsWithDarkOnly).toEqual([]);
    expect(screen.getByText('Reproduksi video bug checkout')).toBeInTheDocument();
    expect(screen.getByText('YouTube')).toBeInTheDocument();
    expect(screen.getByText('Pratinjau Siap')).toBeInTheDocument();
  });

  it('triggers onPreview when previewStatus is ready', () => {
    const onPreview = vi.fn();
    render(<EvidenceCard link={mockLink} onPreview={onPreview} />);

    const card = screen.getByRole('button');
    fireEvent.click(card);

    expect(onPreview).toHaveBeenCalledTimes(1);
    expect(onPreview).toHaveBeenCalledWith(expect.objectContaining({ id: 'evidence-1' }));
  });

  it('supports keyboard interaction via Enter and Space keys', () => {
    const onPreview = vi.fn();
    render(<EvidenceCard link={mockLink} onPreview={onPreview} />);

    const card = screen.getByRole('button');
    fireEvent.keyDown(card, { key: 'Enter' });
    fireEvent.keyDown(card, { key: ' ' });

    expect(onPreview).toHaveBeenCalledTimes(2);
  });

  it('opens external link directly when preview is not ready', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const linkWithoutPreview = {
      ...mockLink,
      previewStatus: 'unsupported' as const,
    };

    render(<EvidenceCard link={linkWithoutPreview} />);

    const card = screen.getByRole('button');
    fireEvent.click(card);

    expect(openSpy).toHaveBeenCalledWith(
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      '_blank',
      'noopener,noreferrer',
    );
    openSpy.mockRestore();
  });
});
