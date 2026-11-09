import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { inspectPrdDiagrams, serializePrdDiagram } from '@qlick/contracts';
import { PrdDiagramStudioModal } from '../PrdDiagramStudioModal';

// True external seam: Mermaid CDN engine, not document/persistence behavior.
const engine = { initialize: vi.fn(), render: vi.fn() };
beforeEach(() => {
  (window as unknown as { __qlick_mermaid: typeof engine }).__qlick_mermaid = engine;
  engine.render.mockImplementation(async (_id: string, code: string) => {
    if (code.includes('INVALID')) throw new Error('Syntax error');
    return { svg: '<svg role="img"><text>Diagram fixture</text></svg>' };
  });
});
const source = 'flowchart LR\nA[PO] --> B[QA]';
const fixture = {
  schemaVersion: 1 as const,
  id: '54fd5966-ad1a-4129-bcf5-7fa0c887621f',
  title: 'Alur PO',
  revision: 1,
  source,
};

function fillDiagram(code = source) {
  fireEvent.change(screen.getByLabelText('Judul diagram'), { target: { value: 'Alur PO' } });
  fireEvent.change(screen.getByLabelText('Kode Mermaid'), { target: { value: code } });
}

describe('Mermaid Studio', () => {
  it('starts empty and disables insertion until an actual preview succeeds', async () => {
    const apply = vi.fn();
    render(
      <PrdDiagramStudioModal
        isOpen
        onClose={vi.fn()}
        onApplyToPrd={apply}
        documentMarkdown="Context"
      />,
    );
    expect(screen.queryByTestId('diagram-canvas')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sisipkan ke|Perbarui Diagram/ })).toBeDisabled();
    fillDiagram();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Sisipkan ke|Perbarui Diagram/ })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole('button', { name: /Sisipkan ke|Perbarui Diagram/ }));
    expect(apply.mock.calls[0][0]).toMatch(/^Context\n\n<!-- qlick-diagram/);
    expect(inspectPrdDiagrams(apply.mock.calls[0][0]).diagrams).toHaveLength(1);
  });
  it('edits the existing block, keeping identity and surrounding context', async () => {
    const original = `Intro\n\n${serializePrdDiagram(fixture)}\nTail`;
    const apply = vi.fn();
    render(
      <PrdDiagramStudioModal
        isOpen
        onClose={vi.fn()}
        onApplyToPrd={apply}
        documentMarkdown={original}
        initialTarget={inspectPrdDiagrams(original).diagrams[0]}
      />,
    );
    expect(screen.getByLabelText('Kode Mermaid')).toHaveValue(source);
    fireEvent.change(screen.getByLabelText('Kode Mermaid'), {
      target: { value: source + '\nB --> C' },
    });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Perbarui Diagram' })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Perbarui Diagram' }));
    const next = apply.mock.calls[0][0];
    expect(next).toMatch(/^Intro\n\n/);
    expect(next).toMatch(/\nTail$/);
    const read = inspectPrdDiagrams(next).diagrams;
    expect(read).toHaveLength(1);
    expect(read[0].id).toBe(fixture.id);
    expect(read[0].revision).toBe(2);
  });
  it('blocks invalid Mermaid and retries the engine without changing the source', async () => {
    render(<PrdDiagramStudioModal isOpen onClose={vi.fn()} onApplyToPrd={vi.fn()} />);
    fillDiagram('INVALID');
    await screen.findByText('Syntax error');
    expect(screen.getByRole('button', { name: /Sisipkan ke|Perbarui Diagram/ })).toBeDisabled();
    engine.render.mockResolvedValue({ svg: '<svg />' });
    fireEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Sisipkan ke|Perbarui Diagram/ })).toBeEnabled(),
    );
    expect(screen.getByLabelText('Kode Mermaid')).toHaveValue('INVALID');
  });
  it('does not reuse a valid preview for changed source', async () => {
    render(<PrdDiagramStudioModal isOpen onClose={vi.fn()} onApplyToPrd={vi.fn()} />);
    fillDiagram();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Sisipkan ke|Perbarui Diagram/ })).toBeEnabled(),
    );
    fireEvent.change(screen.getByLabelText('Kode Mermaid'), { target: { value: 'INVALID' } });
    expect(screen.getByRole('button', { name: /Sisipkan ke|Perbarui Diagram/ })).toBeDisabled();
    await screen.findByText('Syntax error');
  });
  it('protects document limits, dirty cancel, and permission changes', async () => {
    const close = vi.fn();
    const props = { isOpen: true, onClose: close, onApplyToPrd: vi.fn(), maxLength: 25 };
    const { rerender } = render(<PrdDiagramStudioModal {...props} />);
    fillDiagram();
    expect(screen.getByText(/Dokumen melebihi batas/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Batal' }));
    expect(close).not.toHaveBeenCalled();
    expect(screen.getByText('Buang perubahan diagram?')).toBeInTheDocument();
    rerender(<PrdDiagramStudioModal {...props} disabled />);
    expect(screen.getByLabelText('Kode Mermaid')).toBeDisabled();
    expect(screen.getByRole('button', { name: /Sisipkan ke|Perbarui Diagram/ })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Buang perubahan' }));
    expect(close).toHaveBeenCalledTimes(1);
  });
  it('detects a changed target while the modal is open', async () => {
    const original = serializePrdDiagram(fixture);
    const props = {
      isOpen: true,
      onClose: vi.fn(),
      onApplyToPrd: vi.fn(),
      initialTarget: inspectPrdDiagrams(original).diagrams[0],
    };
    const { rerender } = render(<PrdDiagramStudioModal {...props} documentMarkdown={original} />);
    rerender(
      <PrdDiagramStudioModal
        {...props}
        documentMarkdown={original.replace('Alur PO', 'New title')}
      />,
    );
    expect(screen.getByText(/Diagram berubah sejak dibuka/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sisipkan ke|Perbarui Diagram/ })).toBeDisabled();
  });
  it('blocks a new insertion if the containing document changed during editing', () => {
    const props = { isOpen: true, onClose: vi.fn(), onApplyToPrd: vi.fn() };
    const { rerender } = render(
      <PrdDiagramStudioModal {...props} documentMarkdown="Original context" />,
    );
    fillDiagram();
    rerender(<PrdDiagramStudioModal {...props} documentMarkdown="New context" />);
    expect(screen.getByText(/Dokumen berubah sejak editor dibuka/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sisipkan ke PRD' })).toBeDisabled();
  });
  it('requires confirmation before discarding source when selecting another diagram', () => {
    render(
      <PrdDiagramStudioModal
        isOpen
        onClose={vi.fn()}
        onApplyToPrd={vi.fn()}
        documentMarkdown={serializePrdDiagram(fixture)}
      />,
    );
    fillDiagram('flowchart LR\nNew --> Draft');
    fireEvent.change(screen.getByLabelText('Diagram yang disunting'), { target: { value: '0' } });
    expect(screen.getByText('Ganti diagram?')).toBeInTheDocument();
    expect(screen.getByLabelText('Kode Mermaid')).toHaveValue('flowchart LR\nNew --> Draft');
    fireEvent.click(screen.getByRole('button', { name: 'Buang dan ganti' }));
    expect(screen.getByLabelText('Kode Mermaid')).toHaveValue(source);
  });
});
