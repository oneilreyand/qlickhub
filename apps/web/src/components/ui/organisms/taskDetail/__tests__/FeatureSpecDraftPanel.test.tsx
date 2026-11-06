import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FeatureSpec } from '@qlick/contracts';
import { ApplyFeatureSpecResponseSchema } from '@qlick/contracts';
import { createDeliveryTraceFixture } from '../../../../../test/deliveryTraceFixture';
import { featureSpecFixture } from '../../../../../test/featureSpecFixture';
import { featureSpecService } from '../../../../../lib/api/featureSpecService';
import { FeatureSpecDraftPanel } from '../FeatureSpecDraftPanel';

vi.mock('../../../../../lib/api/featureSpecService', () => ({
  featureSpecService: {
    saveSection: vi.fn(),
    generatePrd: vi.fn(),
    generateTasks: vi.fn(),
    apply: vi.fn(),
  },
}));
const members = [
  {
    userId: '30000000-0000-4000-8000-000000000004',
    role: 'dev' as const,
    user: {
      id: '30000000-0000-4000-8000-000000000004',
      name: 'Developer BE',
      email: 'dev@example.test',
    },
  },
];
function setup(
  section: 'prd' | 'tasks' = 'prd',
  options: { canEdit?: boolean; spec?: FeatureSpec } = {},
) {
  const props = {
    spec: options.spec ?? featureSpecFixture(section === 'prd' ? 'prd' : 'task'),
    section,
    canEdit: options.canEdit ?? true,
    members,
    onChange: vi.fn(),
    onReload: vi.fn(),
    onApplied: vi.fn(),
    onContinue: vi.fn(),
    onDirtyChange: vi.fn(),
  };
  render(<FeatureSpecDraftPanel {...props} />);
  return props;
}
describe('Feature Spec PRD/Tasks workflow (P5e)', () => {
  beforeEach(() => vi.clearAllMocks());
  it('offers explicit open assignment without requiring or retaining an assignee', async () => {
    setup('tasks');
    fireEvent.change(screen.getByLabelText('Penugasan · Wajib'), { target: { value: 'open' } });
    expect(screen.queryByLabelText('Penanggung jawab · Wajib')).not.toBeInTheDocument();
    expect(screen.getByText(/Tanpa penanggung jawab sampai/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tinjau dan Terapkan' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Penugasan · Wajib'), { target: { value: 'assigned' } });
    expect(screen.getByLabelText('Penanggung jawab · Wajib')).toHaveValue('');
  });
  it('does not advance or invoke AI when a previously completed Plan became incomplete', () => {
    const spec = featureSpecFixture('prd');
    spec.plan.goal = '';
    spec.completeness.plan = {
      ...spec.completeness.plan,
      complete: false,
      missingFields: ['plan.goal'],
    };
    setup('prd', { spec });
    expect(screen.getByRole('button', { name: 'Lanjut ke Task' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Usulkan PRD dengan AI' })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('Tahap sebelumnya belum lengkap');
  });
  it('names uncovered and stale Requirement references and links to rendered controls', () => {
    const spec = featureSpecFixture();
    spec.tasks.subtasks![0].requirementKeys = ['removed'];
    setup('tasks', { spec });
    const missing = screen.getByRole('link', { name: /Requirement 1 · Simpan checkout: belum dicakup/ });
    expect(document.querySelector(missing.getAttribute('href')!)).not.toBeNull();
    expect(screen.getByRole('link', { name: /Requirement removed tidak ada/ })).toHaveAttribute(
      'href',
      '#tasks-subtasks-0--requirementKeys',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Lepas tautan requirement lama' }));
    expect(
      screen.queryByRole('link', { name: /Requirement removed tidak ada/ }),
    ).not.toBeInTheDocument();
  });
  it('shows missing fields and locks advance after removing the only Requirement', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Hapus Requirement 1' }));
    expect(screen.getByRole('button', { name: 'Lanjut ke Task' })).toBeDisabled();
    expect(screen.getByRole('complementary', { name: 'Field wajib' })).toHaveTextContent(
      'Tambahkan Requirement dan AC',
    );
    expect(screen.getByRole('button', { name: 'Usulkan PRD dengan AI' })).toBeDisabled();
  });
  it('saves the reviewed PRD version before advancing', async () => {
    const props = setup();
    vi.mocked(featureSpecService.saveSection).mockResolvedValue({
      ...props.spec,
      version: 5,
      status: 'task',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Lanjut ke Task' }));
    await waitFor(() => expect(props.onContinue).toHaveBeenCalledOnce());
    expect(featureSpecService.saveSection).toHaveBeenCalledWith(
      props.spec.workspaceId,
      props.spec.id,
      'prd',
      { version: 4, content: props.spec.prd, complete: true },
    );
  });
  it('requires explicit confirmation before AI replaces a saved draft', async () => {
    const props = setup();
    vi.mocked(featureSpecService.generatePrd).mockResolvedValue({ ...props.spec, version: 5 });
    fireEvent.click(screen.getByRole('button', { name: 'Usulkan PRD dengan AI' }));
    expect(featureSpecService.generatePrd).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Ganti dengan usulan AI' }));
    await waitFor(() =>
      expect(featureSpecService.generatePrd).toHaveBeenCalledWith(
        props.spec.workspaceId,
        props.spec.id,
        4,
        true,
      ),
    );
  });
  it('requires review and confirmation before Apply; a retry retains the same idempotency key', async () => {
    const props = setup('tasks');
    vi.mocked(featureSpecService.apply)
      .mockRejectedValueOnce(new Error('Jaringan terputus'))
      .mockResolvedValueOnce(
        ApplyFeatureSpecResponseSchema.parse({
          featureSpec: { ...props.spec, status: 'applied', version: 5 },
          task: {
            ...createDeliveryTraceFixture().featureTask,
            id: props.spec.featureTaskId,
            workspaceId: props.spec.workspaceId,
          },
          appliedVersion: 4,
          createdSubtaskCount: 1,
          createdRequirementCount: 1,
          hasProductBrief: true,
          replayed: false,
        }),
      );
    fireEvent.click(screen.getByRole('button', { name: 'Tinjau dan Terapkan' }));
    expect(featureSpecService.apply).not.toHaveBeenCalled();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('API checkout');
    expect(dialog).toHaveTextContent('Developer BE');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Terapkan sekarang' }));
    await waitFor(() =>
      expect(within(dialog).getByRole('alert')).toHaveTextContent('Jaringan terputus'),
    );
    fireEvent.click(within(dialog).getByRole('button', { name: 'Terapkan sekarang' }));
    await waitFor(() => expect(props.onApplied).toHaveBeenCalledOnce());
    expect(vi.mocked(featureSpecService.apply).mock.calls[0]).toEqual(
      vi.mocked(featureSpecService.apply).mock.calls[1],
    );
  });
  it('does not overwrite local edits or advance on a stale version', async () => {
    const props = setup();
    vi.mocked(featureSpecService.saveSection).mockRejectedValue(
      Object.assign(new Error('Conflict'), { status: 409 }),
    );
    fireEvent.change(screen.getByLabelText('In Scope · Wajib'), {
      target: { value: 'Perubahan lokal' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan draf PRD' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Spec sudah berubah'));
    expect(screen.getByLabelText('In Scope · Wajib')).toHaveValue('Perubahan lokal');
    expect(props.onContinue).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Muat ulang Spec' }));
    expect(props.onReload).toHaveBeenCalledOnce();
  });
  it('gives non-Planners read-only fields and no write action', () => {
    setup('tasks', { canEdit: false });
    expect(screen.getByLabelText('Judul subtask · Wajib')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Tinjau dan Terapkan' })).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Kamu dapat membaca');
  });
});
