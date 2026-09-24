import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MediaLightboxModal } from '../MediaLightboxModal';

describe('MediaLightboxModal Molecule', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <MediaLightboxModal
        isOpen={false}
        src="https://example.com/test.png"
        alt="Test Image"
        onClose={vi.fn()}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders image with zoom and rotate controls when open with type="image"', () => {
    render(
      <MediaLightboxModal
        isOpen={true}
        src="https://example.com/test.png"
        type="image"
        alt="Foto Desain"
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText('Foto Desain')).toBeInTheDocument();
    expect(screen.getByAltText('Foto Desain')).toHaveAttribute('src', 'https://example.com/test.png');
    expect(screen.getByLabelText('Perbesar')).toBeInTheDocument();
    expect(screen.getByLabelText('Perkecil')).toBeInTheDocument();
    expect(screen.getByLabelText('Putar')).toBeInTheDocument();
  });

  it('renders HTML5 video player with controls when type="video_direct"', () => {
    render(
      <MediaLightboxModal
        isOpen={true}
        src="https://example.com/demo.mp4"
        type="video_direct"
        alt="Rekaman Bug"
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText('Rekaman Bug')).toBeInTheDocument();
    const video = document.querySelector('video');
    expect(video).toBeInTheDocument();
    expect(video).toHaveAttribute('src', 'https://example.com/demo.mp4');
    expect(video).toHaveAttribute('controls');
    // Zoom buttons should not be rendered for videos
    expect(screen.queryByLabelText('Perbesar')).toBeNull();
  });

  it('renders embedded iframe when type="video_embed"', () => {
    render(
      <MediaLightboxModal
        isOpen={true}
        src="https://www.youtube.com/embed/dQw4w9WgXcQ"
        type="video_embed"
        alt="YouTube Walkthrough"
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText('YouTube Walkthrough')).toBeInTheDocument();
    const iframe = document.querySelector('iframe');
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute('src', 'https://www.youtube.com/embed/dQw4w9WgXcQ');
  });

  it('renders informative error fallback and hides zoom buttons when image fails to load', () => {
    render(
      <MediaLightboxModal
        isOpen={true}
        src="https://example.com/blocked-image.png"
        type="image"
        alt="Gambar Terblokir"
        onClose={vi.fn()}
      />,
    );

    const img = screen.getByAltText('Gambar Terblokir');
    expect(img).toBeInTheDocument();
    expect(screen.getByLabelText('Perbesar')).toBeInTheDocument();

    // Trigger image load failure
    fireEvent.error(img);

    expect(screen.getByText('Gambar Tidak Dapat Dimuat')).toBeInTheDocument();
    expect(
      screen.getByText(/Tautan gambar ini mungkin diblokir oleh penyedia/i),
    ).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /Buka Tautan Asli/i });
    expect(link).toHaveAttribute(
      'href',
      'https://example.com/blocked-image.png',
    );
    // Zoom buttons should now be hidden
    expect(screen.queryByLabelText('Perbesar')).toBeNull();
  });

  it('calls onClose when close button or escape is pressed', () => {
    const onClose = vi.fn();
    render(
      <MediaLightboxModal
        isOpen={true}
        src="https://example.com/test.png"
        type="image"
        alt="Preview"
        onClose={onClose}
      />,
    );

    fireEvent.click(screen.getByLabelText('Tutup pratinjau (Esc)'));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
