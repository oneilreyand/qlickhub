import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import {
  AccessRestricted,
  ACCESS_RESTRICTED_ILLUSTRATION_URL,
} from '../AccessRestricted';

describe('AccessRestricted Organism', () => {
  it('renders illustration with the correct access restricted image URL', () => {
    render(
      <MemoryRouter>
        <AccessRestricted workspaceName="Billing & Core QA" />
      </MemoryRouter>
    );

    const img = screen.getByAltText('Access Restricted Illustration');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', ACCESS_RESTRICTED_ILLUSTRATION_URL);
    expect(ACCESS_RESTRICTED_ILLUSTRATION_URL).toBe(
      'https://res.cloudinary.com/dxgnzhn8l/image/upload/v1787022062/ChatGPT_Image_Aug_18_2026_10_00_36_AM.png'
    );

    expect(screen.getByRole('heading', { name: /access restricted/i })).toBeInTheDocument();
    expect(screen.getByText(/Billing & Core QA/i)).toBeInTheDocument();
  });

  it('handles custom onAction callback when button is clicked', () => {
    const handleAction = vi.fn();
    render(
      <MemoryRouter>
        <AccessRestricted
          title="Custom Forbidden"
          description="You cannot view this page"
          actionLabel="Go Back"
          onAction={handleAction}
        />
      </MemoryRouter>
    );

    const actionBtn = screen.getByRole('button', { name: /go back/i });
    fireEvent.click(actionBtn);
    expect(handleAction).toHaveBeenCalledTimes(1);
  });
});
