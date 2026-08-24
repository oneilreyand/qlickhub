import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Modal } from '../Modal';

describe('Modal keyboard focus', () => {
  it('moves focus inside, traps Tab, and restores the launcher focus on close', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const view = render(
      <>
        <button type="button">Open launcher</button>
        <Modal isOpen={false} onClose={onClose} title="Keyboard modal">
          <input aria-label="Modal field" />
          <button type="button">Save modal</button>
        </Modal>
      </>,
    );

    const launcher = screen.getByRole('button', { name: 'Open launcher' });
    launcher.focus();
    view.rerender(
      <>
        <button type="button">Open launcher</button>
        <Modal isOpen onClose={onClose} title="Keyboard modal">
          <input aria-label="Modal field" />
          <button type="button">Save modal</button>
        </Modal>
      </>,
    );

    const closeButton = screen.getByRole('button', { name: 'Close modal' });
    expect(closeButton).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Save modal' })).toHaveFocus();
    await user.tab();
    expect(closeButton).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
    view.rerender(
      <>
        <button type="button">Open launcher</button>
        <Modal isOpen={false} onClose={onClose} title="Keyboard modal">
          <input aria-label="Modal field" />
          <button type="button">Save modal</button>
        </Modal>
      </>,
    );
    expect(screen.getByRole('button', { name: 'Open launcher' })).toHaveFocus();
  });
});
