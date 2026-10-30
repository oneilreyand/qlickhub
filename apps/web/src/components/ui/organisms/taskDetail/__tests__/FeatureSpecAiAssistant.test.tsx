import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  evaluateFeatureSpecSection,
  type FeatureSpec,
  type FeatureSpecPlan,
  type FeatureSpecQuestion,
} from '@qlick/contracts';
import { FeatureSpecPlanPanel } from '../FeatureSpecPlanPanel';

const id = (n: number) => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

function makeSpec(plan: FeatureSpecPlan, status: FeatureSpec['status'] = 'plan'): FeatureSpec {
  return {
    id: id(1),
    workspaceId: id(2),
    featureTaskId: id(3),
    version: 2,
    status,
    plan,
    prd: {},
    tasks: {},
    completeness: {
      plan: evaluateFeatureSpecSection('plan', plan),
      prd: evaluateFeatureSpecSection('prd', {}),
      tasks: evaluateFeatureSpecSection('tasks', {}),
    },
    recentVersions: [],
    createdBy: id(9),
    updatedBy: id(9),
    createdAt: '2026-10-30T08:00:00.000Z',
    updatedAt: '2026-10-30T09:00:00.000Z',
  };
}

function makeQuestion(n: number, over: Partial<FeatureSpecQuestion> = {}): FeatureSpecQuestion {
  return {
    id: id(100 + n),
    specId: id(1),
    position: n,
    text: `Pertanyaan ${n}?`,
    reason: `Alasan ${n}`,
    required: true,
    answer: null,
    answeredBy: null,
    answeredAt: null,
    createdAt: '2026-10-30T08:30:00.000Z',
    ...over,
  };
}

const ideaOnly: FeatureSpecPlan = { idea: 'Checkout satu halaman', title: 'Checkout satu halaman' };

function renderPanel(
  options: {
    plan?: FeatureSpecPlan;
    questions?: FeatureSpecQuestion[];
    canEdit?: boolean;
    status?: FeatureSpec['status'];
  } = {},
) {
  const ai = {
    questions: options.questions ?? [],
    busy: null,
    onGenerateQuestions: vi.fn(),
    onAnswer: vi.fn().mockResolvedValue(undefined),
    onGeneratePlan: vi.fn(),
  };
  render(
    <FeatureSpecPlanPanel
      spec={makeSpec(options.plan ?? ideaOnly, options.status)}
      canEdit={options.canEdit ?? true}
      onSave={vi.fn()}
      ai={ai}
    />,
  );
  return ai;
}

describe('FeatureSpecAiAssistant (AC-5.4)', () => {
  it('asks the AI for questions only when the PO presses the button', () => {
    const ai = renderPanel();
    expect(ai.onGenerateQuestions).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Minta AI membuat pertanyaan' }));
    expect(ai.onGenerateQuestions).toHaveBeenCalledTimes(1);
  });

  it('allows filling the Plan without questions', () => {
    const ai = renderPanel();
    const fill = screen.getByRole('button', { name: 'Isi Plan dengan AI' });
    expect(fill).toBeEnabled();
    fireEvent.click(fill);
    expect(ai.onGeneratePlan).toHaveBeenCalledTimes(1);
  });

  it('blocks filling the Plan while a required question is unanswered, and says why', () => {
    renderPanel({
      questions: [makeQuestion(1), makeQuestion(2, { required: false }), makeQuestion(3)],
    });
    expect(screen.getByRole('button', { name: 'Isi Plan dengan AI' })).toBeDisabled();
    expect(screen.getByText('2 pertanyaan wajib belum dijawab.')).toBeInTheDocument();
  });

  it('enables filling once every required question has an answer', () => {
    renderPanel({
      questions: [makeQuestion(1, { answer: 'Pembeli' }), makeQuestion(2, { required: false })],
    });
    expect(screen.getByRole('button', { name: 'Isi Plan dengan AI' })).toBeEnabled();
  });

  it('saves an answer through the handler and keeps it in the field when saving fails', async () => {
    const ai = renderPanel({ questions: [makeQuestion(1)] });
    const field = screen.getByLabelText(/Pertanyaan 1\?/);
    const save = screen.getByRole('button', { name: 'Simpan jawaban' });
    expect(save).toBeDisabled();

    fireEvent.change(field, { target: { value: 'Pembeli baru' } });
    fireEvent.click(save);
    await waitFor(() =>
      expect(ai.onAnswer).toHaveBeenCalledWith(makeQuestion(1).id, 'Pembeli baru'),
    );
  });

  it('asks to save the draft first when the Plan has unsaved edits', () => {
    renderPanel();
    fireEvent.change(screen.getByLabelText(/Tujuan/), { target: { value: 'Bayar sekali klik.' } });
    expect(screen.getByRole('button', { name: 'Isi Plan dengan AI' })).toBeDisabled();
    expect(
      screen.getByText('Simpan draf dulu supaya perubahanmu tidak terlewat.'),
    ).toBeInTheDocument();
  });

  it('marks AI-filled fields and drops the mark once the PO edits that field', () => {
    renderPanel({
      plan: {
        ...ideaOnly,
        goal: 'Tujuan dari AI.',
        problem: 'Masalah dari AI.',
        aiFilledFields: ['goal', 'problem'],
      },
    });
    expect(screen.getAllByText('Diisi AI')).toHaveLength(2);

    fireEvent.change(screen.getByLabelText(/Tujuan/), { target: { value: 'Tujuan saya.' } });
    expect(screen.getAllByText('Diisi AI')).toHaveLength(1);
  });

  it('is hidden for people who cannot edit', () => {
    renderPanel({ canEdit: false });
    expect(screen.queryByRole('button', { name: 'Isi Plan dengan AI' })).not.toBeInTheDocument();
  });

  it('is hidden once the Plan stage is done', () => {
    renderPanel({ status: 'prd' });
    expect(screen.queryByRole('button', { name: 'Isi Plan dengan AI' })).not.toBeInTheDocument();
  });
});
