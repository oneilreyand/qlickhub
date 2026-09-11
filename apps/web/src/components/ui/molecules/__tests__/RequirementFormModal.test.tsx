import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { RequirementFormModal } from '../RequirementFormModal';

describe('RequirementFormModal Molecule', () => {
  test('renders create form and successfully submits without URL (URL optional)', async () => {
    const handleSave = vi.fn().mockResolvedValue(undefined);
    const handleClose = vi.fn();

    render(<RequirementFormModal isOpen={true} onClose={handleClose} onSave={handleSave} />);

    expect(screen.getByRole('heading', { name: 'Create Requirement' })).toBeInTheDocument();

    const titleInput = screen.getByLabelText(/Requirement Title/i);
    fireEvent.change(titleInput, { target: { value: 'New Structured Requirement' } });

    const codeInput = screen.getByLabelText(/Requirement Code/i);
    fireEvent.change(codeInput, { target: { value: 'req-999' } });

    const submitBtn = screen.getByRole('button', { name: /^Create Requirement$/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(handleSave).toHaveBeenCalledWith({
        code: 'REQ-999',
        title: 'New Structured Requirement',
        description: undefined,
        url: undefined,
        status: undefined,
      });
      expect(handleClose).toHaveBeenCalled();
    });
  });

  test('offers an explicit create-and-plan action without auto-creating a Subtask', async () => {
    const handleSave = vi.fn().mockResolvedValue(undefined);
    const handleSaveAndPlan = vi.fn().mockResolvedValue(undefined);
    const handleClose = vi.fn();

    render(
      <RequirementFormModal
        isOpen={true}
        onClose={handleClose}
        onSave={handleSave}
        onSaveAndPlan={handleSaveAndPlan}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Requirement Title/i), {
      target: { value: 'Requirement with planned delivery' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create & Plan Subtask' }));

    await waitFor(() => {
      expect(handleSaveAndPlan).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Requirement with planned delivery' }),
      );
      expect(handleSave).not.toHaveBeenCalled();
      expect(handleClose).toHaveBeenCalled();
    });
  });

  test('uses the shared rich-text editor and saves bold Markdown in Requirement details', async () => {
    const handleSave = vi.fn().mockResolvedValue(undefined);

    render(<RequirementFormModal isOpen={true} onClose={vi.fn()} onSave={handleSave} />);

    expect(screen.getByTitle('Bold (Ctrl+B)')).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /write/i }));

    const detailInput = screen.getByLabelText(
      'Detailed Description (Optional)',
    ) as HTMLTextAreaElement;
    fireEvent.change(detailInput, { target: { value: 'Important rule' } });
    detailInput.setSelectionRange(0, 'Important rule'.length);
    fireEvent.click(screen.getByTitle('Bold (Ctrl+B)'));

    fireEvent.change(screen.getByLabelText(/Requirement Title/i), {
      target: { value: 'Formatted Requirement' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Create Requirement$/i }));

    await waitFor(() => {
      expect(handleSave).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Formatted Requirement',
          description: '**Important rule**',
        }),
      );
    });
  });

  test('validates URL format and shows error for invalid URL string', async () => {
    const handleSave = vi.fn();
    const handleClose = vi.fn();

    render(<RequirementFormModal isOpen={true} onClose={handleClose} onSave={handleSave} />);

    const titleInput = screen.getByLabelText(/Requirement Title/i);
    fireEvent.change(titleInput, { target: { value: 'Spec with bad URL' } });

    const urlInput = screen.getByLabelText(/Source \/ Reference URL/i);
    fireEvent.change(urlInput, { target: { value: 'not_a_valid_url' } });

    const submitBtn = screen.getByRole('button', { name: /^Create Requirement$/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/Please enter a valid URL/i)).toBeInTheDocument();
    expect(handleSave).not.toHaveBeenCalled();
  });

  test('populates initialData for edit mode and allows clearing URL with null', async () => {
    const handleSave = vi.fn().mockResolvedValue(undefined);
    const handleClose = vi.fn();

    const initialData = {
      id: 'req-1',
      workspaceId: 'ws-1',
      code: 'REQ-101',
      title: 'Original Title',
      description: 'Original Description',
      url: 'https://www.figma.com/file/123',
      status: 'active' as const,
      createdBy: 'user-1',
      createdAt: '2026-08-21T00:00:00.000Z',
      updatedAt: '2026-08-21T00:00:00.000Z',
    };

    render(
      <RequirementFormModal
        isOpen={true}
        onClose={handleClose}
        onSave={handleSave}
        initialData={initialData}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Edit Requirement' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Original Title')).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://www.figma.com/file/123')).toBeInTheDocument();

    const urlInput = screen.getByDisplayValue('https://www.figma.com/file/123');
    fireEvent.change(urlInput, { target: { value: '' } });

    const submitBtn = screen.getByRole('button', { name: /^Update Requirement$/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(handleSave).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Original Title',
          url: null,
          status: 'active',
        }),
      );
    });
  });
});
