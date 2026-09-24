import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FormattedText, stripMarkdown } from '../FormattedText';

describe('FormattedText Atom', () => {
  it('renders fallback when content is empty', () => {
    render(<FormattedText content="" />);
    expect(screen.getByText('Belum ada deskripsi.')).toBeInTheDocument();
  });

  it('renders headings and teks tebal', () => {
    const text = '# Main Header\nThis is **important** text';
    render(<FormattedText content={text} />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Main Header');
    expect(screen.getByText('important')).toBeInTheDocument();
  });

  it('renders bullet lists and task checklists', () => {
    const text = '- First bullet point\n- [ ] Task item to complete';
    render(<FormattedText content={text} />);

    expect(screen.getByText('First bullet point')).toBeInTheDocument();
    expect(screen.getByText('Task item to complete')).toBeInTheDocument();
  });

  it('strips markdown syntax cleanly for plain text card snippets', () => {
    const text = '# Heading\n**Bold** and *Italic* with `code` item\n- Bullet point';
    const plain = stripMarkdown(text);
    expect(plain).toBe('Heading Bold and Italic with code item Bullet point');
  });

  it('renders zoomable image pratinjau for explicit markdown image syntax', () => {
    render(
      <FormattedText content="Screenshot evidence:\n![Evidence](https://example.com/assets/screenshot.png)" />,
    );

    const img = screen.getByAltText('Evidence');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/assets/screenshot.png');
    expect(screen.getByText(/memperbesar|enlarge/i)).toBeInTheDocument();
  });

  it('renders explicit markdown links as clickable anchor tags', () => {
    render(
      <FormattedText content="Please check the [Specification Document](https://example.com/docs/spec) for details" />,
    );

    const link = screen.getByRole('link', { name: /Specification Document/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://example.com/docs/spec');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('keeps plain URLs as normal text without converting to links or cards', () => {
    render(<FormattedText content="Raw link: https://example.com/plain-url is just plain text" />);

    expect(screen.queryByRole('link')).toBeNull();
    expect(
      screen.getByText(/Raw link: https:\/\/example\.com\/plain-url is just plain text/),
    ).toBeInTheDocument();
  });

  it('renders GitHub Alert callout boxes (Note, Penting, Tip, Warning)', () => {
    const text = `> [!IMPORTANT]
> Must pass all payment gateway integration test cases
> [!WARNING]
> Do not expose API secrets in client bundle`;

    render(<FormattedText content={text} />);

    expect(screen.getByText('Penting')).toBeInTheDocument();
    expect(
      screen.getByText(/Must pass all payment gateway integration test cases/i),
    ).toBeInTheDocument();
    expect(screen.getByText('Peringatan')).toBeInTheDocument();
    expect(screen.getByText(/Do not expose API secrets in client bundle/i)).toBeInTheDocument();
  });

  it('renders Smart Section Header badges for standard PM keywords', () => {
    const text = `Objective:
Build responsive checkout drawer
Acceptance Criteria:
- [ ] User can select payment method
- [ ] Shows confirmation toast on success`;

    render(<FormattedText content={text} />);

    expect(screen.getByText('Tujuan & Konteks')).toBeInTheDocument();
    expect(screen.getByText('Kriteria Penerimaan')).toBeInTheDocument();
    expect(screen.getByText('User can select payment method')).toBeInTheDocument();
    expect(screen.getByText('Shows confirmation toast on success')).toBeInTheDocument();
  });

  it('renders interactive video card for direct video markdown', () => {
    const { container } = render(
      <FormattedText content="![k video](https://example.com/demo.mp4)" />,
    );

    expect(screen.getByText('VIDEO')).toBeInTheDocument();
    expect(screen.getByText('k video')).toBeInTheDocument();
    const video = container.querySelector('video');
    expect(video).toBeInTheDocument();
    expect(video).toHaveAttribute('src', 'https://example.com/demo.mp4');
    expect(screen.getByText(/Klik untuk Memperbesar & Memutar/i)).toBeInTheDocument();
  });

  it('renders YouTube video card with thumbnail and YOUTUBE badge', () => {
    render(
      <FormattedText content="![Tutorial Video](https://www.youtube.com/watch?v=dQw4w9WgXcQ)" />,
    );

    expect(screen.getByText('YOUTUBE')).toBeInTheDocument();
    expect(screen.getByText('Tutorial Video')).toBeInTheDocument();
    const thumb = screen.getByAltText('Tutorial Video');
    expect(thumb).toBeInTheDocument();
    expect(thumb).toHaveAttribute('src', 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
  });

  it('renders Google Drive video card with G-DRIVE VIDEO badge when alt hints video', () => {
    render(
      <FormattedText content="![k video](https://drive.google.com/file/d/1a2b3c4d5e/view)" />,
    );

    expect(screen.getByText('G-DRIVE VIDEO')).toBeInTheDocument();
    expect(screen.getByText('k video')).toBeInTheDocument();
  });

  it('renders fallback card when image fails to load', () => {
    render(
      <FormattedText content="![Broken Image](https://example.com/not-found.png)" />,
    );

    const img = screen.getByAltText('Broken Image');
    expect(img).toBeInTheDocument();

    // Trigger image error
    fireEvent.error(img);

    expect(screen.getByText('Broken Image')).toBeInTheDocument();
    expect(screen.getByText(/Pratinjau gambar tidak dapat dimuat|URL diblokir/i)).toBeInTheDocument();
    expect(screen.getByText('Buka Tautan')).toBeInTheDocument();
  });
});
