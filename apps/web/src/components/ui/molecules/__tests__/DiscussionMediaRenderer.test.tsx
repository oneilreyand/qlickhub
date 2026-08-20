import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DiscussionMediaRenderer } from '../DiscussionMediaRenderer';

describe('DiscussionMediaRenderer', () => {
  it('renders regular text and highlights @channel and mentions', () => {
    render(
      <DiscussionMediaRenderer content="Hey @channel please review the PR from @indra" />
    );

    expect(screen.getByText('@channel')).toBeInTheDocument();
    expect(screen.getByText('@indra')).toBeInTheDocument();
    expect(screen.getByText(/please review the PR from/i)).toBeInTheDocument();
  });

  it('detects and renders zoomable image preview with click-to-enlarge', () => {
    render(
      <DiscussionMediaRenderer content="Screenshot evidence: https://example.com/assets/screenshot.png" />
    );

    const img = screen.getByAltText('Image Attachment');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/assets/screenshot.png');
    expect(screen.getByText('Klik untuk Memperbesar')).toBeInTheDocument();

    // Clicking opens lightbox modal
    const imgCard = img.closest('.cursor-pointer');
    if (imgCard) {
      fireEvent.click(imgCard);
    }
  });

  it('detects and renders HTML5 video player for direct video URLs', () => {
    const { container } = render(
      <DiscussionMediaRenderer content="Recorded reproduction video: https://cdn.example.com/bugs/bug-demo.mp4" />
    );

    const videoEl = container.querySelector('video');
    expect(videoEl).toBeInTheDocument();
    expect(videoEl).toHaveAttribute('src', 'https://cdn.example.com/bugs/bug-demo.mp4');
    expect(videoEl).toHaveAttribute('controls');
  });

  it('detects and renders YouTube embedded player iframe inside chat without redirect', () => {
    const { container } = render(
      <DiscussionMediaRenderer content="Feature walkthrough: https://www.youtube.com/watch?v=dQw4w9WgXcQ" />
    );

    const iframeEl = container.querySelector('iframe');
    expect(iframeEl).toBeInTheDocument();
    expect(iframeEl?.getAttribute('src')).toContain('https://www.youtube.com/embed/dQw4w9WgXcQ');
    expect(screen.getByText('Perbesar')).toBeInTheDocument();
  });

  it('detects and renders Loom embedded player iframe', () => {
    const { container } = render(
      <DiscussionMediaRenderer content="Loom recording: https://www.loom.com/share/abcdef123456" />
    );

    const iframeEl = container.querySelector('iframe');
    expect(iframeEl).toBeInTheDocument();
    expect(iframeEl).toHaveAttribute('src', 'https://www.loom.com/embed/abcdef123456');
  });

  it('detects and renders Vimeo embedded player iframe', () => {
    const { container } = render(
      <DiscussionMediaRenderer content="Vimeo test video: https://vimeo.com/76979871" />
    );

    const iframeEl = container.querySelector('iframe');
    expect(iframeEl).toBeInTheDocument();
    expect(iframeEl).toHaveAttribute('src', 'https://player.vimeo.com/video/76979871');
  });

  it('detects and renders Google Drive video / file preview iframe directly in app', () => {
    const { container } = render(
      <DiscussionMediaRenderer content="Google Drive Video: https://drive.google.com/file/d/1A2B3C4D5E6F_xyz/view?usp=sharing" />
    );

    const iframeEl = container.querySelector('iframe');
    expect(iframeEl).toBeInTheDocument();
    expect(iframeEl).toHaveAttribute('src', 'https://drive.google.com/file/d/1A2B3C4D5E6F_xyz/preview');
  });

  it('detects and renders Figma design link card preview', () => {
    render(
      <DiscussionMediaRenderer content="Figma mockup: https://www.figma.com/design/AbCdEf123/Checkout-Flow-Redesign" />
    );

    expect(screen.getByText('Figma Design')).toBeInTheDocument();
    expect(screen.getByText('UI/UX')).toBeInTheDocument();
    expect(screen.getByText(/Checkout Flow Redesign/i)).toBeInTheDocument();
  });

  it('detects and renders rich web link preview card for PRs and doc links', () => {
    render(
      <DiscussionMediaRenderer content="Check PR details here: https://github.com/qlick-org/qareport/pull/105" />
    );

    expect(screen.getByText('github.com')).toBeInTheDocument();
    expect(screen.getAllByText(/github\.com\/qlick-org/i).length).toBeGreaterThanOrEqual(1);
  });

  it('detects and renders markdown images and opens zoom lightbox', () => {
    render(
      <DiscussionMediaRenderer content="Check this UI glitch: ![Bug Screenshot](https://res.cloudinary.com/demo/image/upload/sample.jpg)" />
    );

    expect(screen.getByText(/Check this UI glitch:/i)).toBeInTheDocument();
    const img = screen.getByAltText('Bug Screenshot');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://res.cloudinary.com/demo/image/upload/sample.jpg');

    // Click to open lightbox
    const imgCard = img.closest('.cursor-pointer');
    if (imgCard) {
      fireEvent.click(imgCard);
    }

    // Lightbox modal should open with zoom controls
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Zoom In/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Zoom Out/i })).toBeInTheDocument();
  });

  it('detects and renders base64 data URL images from clipboard paste', () => {
    const dummyBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    render(
      <DiscussionMediaRenderer content={`Pasted image: ![Pasted Screenshot](${dummyBase64})`} />
    );

    const img = screen.getByAltText('Pasted Screenshot');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', dummyBase64);
  });
});
