import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Drawer } from '../Drawer';

describe('Drawer', () => {
  it('keeps restore and close controls inside the labelled content region', () => {
    render(
      <Drawer isOpen onClose={vi.fn()} title="Task details" defaultFullScreen>
        <p>Drawer body</p>
      </Drawer>,
    );

    const content = screen.getByRole('region', { name: 'Task details content' });
    const restoreButton = screen.getByRole('button', { name: 'Kembali ke tampilan normal' });
    const closeButton = screen.getByRole('button', { name: 'Tutup panel' });

    expect(content).toContainElement(restoreButton);
    expect(content).toContainElement(closeButton);
    expect(restoreButton).toHaveClass('h-11', 'w-11');
    expect(closeButton).toHaveClass('h-11', 'w-11');
    expect(content).toHaveClass('w-full', 'px-4', 'sm:px-8');
    expect(content).not.toHaveClass('max-w-7xl', 'mx-auto');
  });

  it('places drawer navigation beside the expand and close controls', () => {
    render(
      <Drawer
        isOpen
        onClose={vi.fn()}
        title="Task details"
        toolbar={<button type="button">Overview</button>}
      >
        <p>Drawer body</p>
      </Drawer>,
    );

    const toolbar = screen.getByRole('toolbar', {
      name: 'Task details navigation and controls',
    });

    expect(toolbar).toContainElement(screen.getByRole('button', { name: 'Overview' }));
    expect(toolbar).toContainElement(
      screen.getByRole('button', { name: 'Perluas ke halaman penuh' }),
    );
    expect(toolbar).toContainElement(screen.getByRole('button', { name: 'Tutup panel' }));
  });

  it('toggles between fullscreen and dipulihkan labels from the content controls', () => {
    const onToggleFullScreen = vi.fn();

    render(
      <Drawer
        isOpen
        onClose={vi.fn()}
        title="Task details"
        defaultFullScreen
        onToggleFullScreen={onToggleFullScreen}
      >
        <p>Drawer body</p>
      </Drawer>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Kembali ke tampilan normal' }));

    expect(onToggleFullScreen).toHaveBeenCalledWith(false);
    expect(screen.getByRole('button', { name: 'Perluas ke halaman penuh' })).toBeInTheDocument();
  });

  it('closes from the content control and preserves the fullscreen opt-out', () => {
    const onClose = vi.fn();

    render(
      <Drawer isOpen onClose={onClose} title="Folder details" allowFullScreen={false}>
        <p>Drawer body</p>
      </Drawer>,
    );

    expect(
      screen.queryByRole('button', { name: /full page|normal view/i }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Tutup panel' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('stays open when the parent blocks closing to resolve unsaved changes', () => {
    const onClose = vi.fn(() => false);

    render(
      <Drawer isOpen onClose={onClose} title="Task belum disimpan" allowFullScreen={false}>
        <p>Perubahan masih ada</p>
      </Drawer>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Tutup panel' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Perubahan masih ada')).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: 'Task belum disimpan content' }).parentElement,
    ).not.toHaveClass('animate-slideOutRight');
  });

  it('leaves the drawer unchanged when a nested dialog owns Escape', () => {
    const onClose = vi.fn();
    const onToggleFullScreen = vi.fn();

    render(
      <Drawer
        isOpen
        onClose={onClose}
        title="Task dengan dialog"
        defaultFullScreen
        closeOnEscape={false}
        onToggleFullScreen={onToggleFullScreen}
      >
        <p>Dialog sedang terbuka</p>
      </Drawer>,
    );

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).not.toHaveBeenCalled();
    expect(onToggleFullScreen).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Kembali ke tampilan normal' })).toBeInTheDocument();
  });

  it('can keep the application header above the drawer overlay', () => {
    render(
      <Drawer isOpen onClose={vi.fn()} title="My task details" preserveAppHeader>
        <p>Drawer body</p>
      </Drawer>,
    );

    const content = screen.getByRole('region', { name: 'My task details content' });
    const overlayRoot = content.closest('.fixed.inset-0');

    expect(overlayRoot).toHaveClass('z-20');
    expect(overlayRoot).not.toHaveClass('z-50');
  });
});
