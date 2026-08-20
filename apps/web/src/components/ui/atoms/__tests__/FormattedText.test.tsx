import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FormattedText, stripMarkdown } from '../FormattedText';

describe('FormattedText Atom', () => {
  it('renders fallback when content is empty', () => {
    render(<FormattedText content="" />);
    expect(screen.getByText('No description provided.')).toBeInTheDocument();
  });

  it('renders headings and bold text', () => {
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

  it('renders zoomable image preview with click-to-enlarge matching discussion style', () => {
    render(
      <FormattedText content="Screenshot evidence:\nhttps://example.com/assets/screenshot.png" />
    );

    const img = screen.getByAltText('Image Attachment');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/assets/screenshot.png');
    expect(screen.getByText(/memperbesar|enlarge/i)).toBeInTheDocument();
  });

  it('renders Pinterest pin preview and open pin button', () => {
    render(
      <FormattedText content="Pinterest Reference:\nhttps://www.pinterest.com/pin/594404850814223726/" />
    );

    expect(screen.getByRole('link', { name: /Buka Pin/i })).toBeInTheDocument();
    expect(screen.getByTitle('Pinterest Pin Widget')).toBeInTheDocument();
  });

  it('renders Google Drive preview with thumbnail and open drive button', () => {
    render(
      <FormattedText content="Drive Spec:\nhttps://drive.google.com/file/d/1X-example-id/view?usp=sharing" />
    );

    expect(screen.getByText('DRIVE PREVIEW')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Buka Drive/i })).toBeInTheDocument();
  });

  it('renders HTML5 video player for direct video URLs', () => {
    const { container } = render(
      <FormattedText content="Recorded reproduction demo:\nhttps://cdn.example.com/bugs/bug-demo.mp4" />
    );

    const videoEl = container.querySelector('video');
    expect(videoEl).toBeInTheDocument();
    expect(videoEl).toHaveAttribute('src', 'https://cdn.example.com/bugs/bug-demo.mp4');
    expect(videoEl).toHaveAttribute('controls');
  });

  it('renders YouTube embedded player iframe', () => {
    const { container } = render(
      <FormattedText content="Feature walkthrough:\nhttps://www.youtube.com/watch?v=dQw4w9WgXcQ" />
    );

    const iframeEl = container.querySelector('iframe');
    expect(iframeEl).toBeInTheDocument();
    expect(iframeEl).toHaveAttribute('src', 'https://www.youtube.com/embed/dQw4w9WgXcQ');
  });

  it('renders GitHub Alert callout boxes (Note, Important, Tip, Warning)', () => {
    const text = `> [!IMPORTANT]
> Must pass all payment gateway integration test cases
> [!WARNING]
> Do not expose API secrets in client bundle`;

    render(<FormattedText content={text} />);

    expect(screen.getByText('Important')).toBeInTheDocument();
    expect(screen.getByText(/Must pass all payment gateway integration test cases/i)).toBeInTheDocument();
    expect(screen.getByText('Warning')).toBeInTheDocument();
    expect(screen.getByText(/Do not expose API secrets in client bundle/i)).toBeInTheDocument();
  });

  it('renders Smart Section Header badges for standard PM keywords', () => {
    const text = `Objective:
Build responsive checkout drawer
Acceptance Criteria:
- [ ] User can select payment method
- [ ] Shows confirmation toast on success`;

    render(<FormattedText content={text} />);

    expect(screen.getByText('Objective & Context')).toBeInTheDocument();
    expect(screen.getByText('Acceptance Criteria')).toBeInTheDocument();
    expect(screen.getByText('User can select payment method')).toBeInTheDocument();
    expect(screen.getByText('Shows confirmation toast on success')).toBeInTheDocument();
  });

  it('renders smart interactive chip for GitHub PR and Issue links', () => {
    const text = 'Review PR: https://github.com/qlick-org/qlick-hub/pull/245 and Issue https://github.com/qlick-org/qlick-hub/issues/100';
    render(<FormattedText content={text} />);

    expect(screen.getByText('qlick-hub #245')).toBeInTheDocument();
    expect(screen.getByText('qlick-hub #100')).toBeInTheDocument();
  });
});
