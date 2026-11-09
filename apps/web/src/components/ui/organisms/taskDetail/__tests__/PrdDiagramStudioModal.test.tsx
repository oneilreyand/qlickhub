import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PrdDiagramStudioModal } from '../PrdDiagramStudioModal';

describe('PrdDiagramStudioModal', () => {
  it('renders modal with palette and canvas when isOpen is true', () => {
    render(<PrdDiagramStudioModal isOpen={true} onClose={vi.fn()} onApplyToPrd={vi.fn()} />);

    expect(screen.getByTestId('prd-diagram-studio')).toBeInTheDocument();
    expect(screen.getByText('Diagram Alur (Flowchart)')).toBeInTheDocument();
    expect(screen.getByText('Grafik Metrik & Target')).toBeInTheDocument();
    expect(screen.getByTestId('diagram-canvas')).toBeInTheDocument();
    expect(screen.getByText('Mulai / Selesai')).toBeInTheDocument();
    expect(screen.getByText('Proses Logika')).toBeInTheDocument();
  });

  it('allows switching between Flowchart mode and Metric Chart mode', () => {
    render(<PrdDiagramStudioModal isOpen={true} onClose={vi.fn()} onApplyToPrd={vi.fn()} />);

    // Switch to Metric mode
    fireEvent.click(screen.getByText('Grafik Metrik & Target'));

    expect(screen.getByText('Konfigurasi Grafik Metrik')).toBeInTheDocument();
    expect(screen.getByText('Bar Chart Target')).toBeInTheDocument();
    expect(screen.getByText('Donut / KPI Ring')).toBeInTheDocument();

    // Switch back to Flowchart mode
    fireEvent.click(screen.getByText('Diagram Alur (Flowchart)'));
    expect(screen.getByTestId('diagram-canvas')).toBeInTheDocument();
  });

  it('allows selecting a node and editing its label', () => {
    render(<PrdDiagramStudioModal isOpen={true} onClose={vi.fn()} onApplyToPrd={vi.fn()} />);

    const node1 = screen.getByText('Pengguna Klik Tombol');
    expect(node1).toBeInTheDocument();

    // Click node to select it
    fireEvent.click(node1);

    expect(screen.getByText('Edit Node Terpilih')).toBeInTheDocument();
    const input = screen.getByLabelText('Label Node');
    expect(input).toHaveValue('Pengguna Klik Tombol');

    // Change label
    fireEvent.change(input, { target: { value: 'User Submit Form' } });
    expect(screen.getByText('User Submit Form')).toBeInTheDocument();
  });

  it('generates Mermaid code and calls onApplyToPrd when apply button is clicked in flowchart mode', () => {
    const onApplyMock = vi.fn();
    const onCloseMock = vi.fn();

    render(
      <PrdDiagramStudioModal isOpen={true} onClose={onCloseMock} onApplyToPrd={onApplyMock} />,
    );

    fireEvent.click(screen.getByTestId('apply-studio-to-prd-button'));

    expect(onApplyMock).toHaveBeenCalledTimes(1);
    const generated = onApplyMock.mock.calls[0][0];
    expect(generated).toContain('```mermaid');
    expect(generated).toContain('flowchart TD');
    expect(generated).toContain('Pengguna Klik Tombol');
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('generates metric chart code and calls onApplyToPrd in metric mode', () => {
    const onApplyMock = vi.fn();
    const onCloseMock = vi.fn();

    render(
      <PrdDiagramStudioModal isOpen={true} onClose={onCloseMock} onApplyToPrd={onApplyMock} />,
    );

    // Switch to Metric mode
    fireEvent.click(screen.getByText('Grafik Metrik & Target'));

    // Switch to Donut submode
    fireEvent.click(screen.getByText('Donut / KPI Ring'));

    fireEvent.click(screen.getByTestId('apply-studio-to-prd-button'));

    expect(onApplyMock).toHaveBeenCalledTimes(1);
    const generated = onApplyMock.mock.calls[0][0];
    expect(generated).toContain('```chart');
    expect(generated).toContain('"type": "donut"');
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });
});
