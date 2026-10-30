import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  evaluateFeatureSpecSection,
  type FeatureSpec,
  type FeatureSpecPlan,
} from '@qlick/contracts';
import { FeatureSpecPlanPanel, FeatureSpecPlanRail } from '../FeatureSpecPlanPanel';

const id = (n: number) => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

const completePlan: FeatureSpecPlan = {
  idea: 'Checkout satu halaman',
  title: 'Checkout satu halaman',
  problem: 'Pembeli keluar di halaman alamat.',
  targetUsers: 'Pembeli baru dan lama.',
  goal: 'Bayar dalam satu halaman.',
  successMeasure: 'Konversi naik dari 52% ke 60%.',
  targetPlatform: 'web_mobile',
  priority: 'high',
  startDate: '2026-11-03',
  dueDate: '2026-11-20',
};

function makeSpec(plan: FeatureSpecPlan, status: FeatureSpec['status'] = 'plan'): FeatureSpec {
  return {
    id: id(1),
    workspaceId: id(2),
    featureTaskId: id(3),
    version: 3,
    status,
    plan,
    prd: {},
    tasks: {},
    completeness: {
      plan: evaluateFeatureSpecSection('plan', plan),
      prd: evaluateFeatureSpecSection('prd', {}),
      tasks: evaluateFeatureSpecSection('tasks', {}),
    },
    recentVersions: [
      {
        version: 3,
        actorType: 'user',
        actorId: id(9),
        actorName: 'Reyand',
        via: 'web',
        createdAt: '2026-10-29T09:02:00.000Z',
      },
      {
        version: 2,
        actorType: 'agent',
        actorId: id(9),
        actorName: 'Plan Bot',
        via: 'mcp',
        createdAt: '2026-10-29T08:40:00.000Z',
      },
    ],
    createdBy: id(9),
    updatedBy: id(9),
    createdAt: '2026-10-29T08:00:00.000Z',
    updatedAt: '2026-10-29T09:02:00.000Z',
  };
}

const partialPlan: FeatureSpecPlan = {
  idea: 'Checkout satu halaman',
  title: 'Checkout satu halaman',
  problem: 'Pembeli keluar di halaman alamat.',
};

describe('FeatureSpecPlanPanel (AC-5.1 to AC-5.3)', () => {
  it('marks every plan field as required and locks "Lanjut ke PRD" with the reason', () => {
    render(<FeatureSpecPlanPanel spec={makeSpec(partialPlan)} canEdit onSave={vi.fn()} />);

    expect(screen.getAllByText('Wajib')).toHaveLength(9);
    const next = screen.getByRole('button', { name: 'Lanjut ke PRD' });
    expect(next).toBeDisabled();
    expect(screen.getByText('Terkunci: 7 field wajib belum terisi.')).toBeInTheDocument();
    expect(next).toHaveAttribute('aria-describedby', 'spec-continue-reason');
  });

  it('saves an incomplete draft without validating and only after something changed', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<FeatureSpecPlanPanel spec={makeSpec(partialPlan)} canEdit onSave={onSave} />);

    const save = screen.getByRole('button', { name: 'Simpan draf' });
    expect(save).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Tujuan/), { target: { value: 'Bayar sekali klik.' } });
    expect(save).toBeEnabled();
    fireEvent.click(save);

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ goal: 'Bayar sekali klik.', title: 'Checkout satu halaman' }),
      false,
    );
  });

  it('enables "Lanjut ke PRD" for a complete plan and saves it as complete', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<FeatureSpecPlanPanel spec={makeSpec(completePlan)} canEdit onSave={onSave} />);

    const next = screen.getByRole('button', { name: 'Lanjut ke PRD' });
    expect(next).toBeEnabled();
    fireEvent.click(next);

    await waitFor(() => expect(onSave).toHaveBeenCalledWith(completePlan, true));
  });

  it('shows "Wajib diisi." on empty fields after a rejected save', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('gagal'));
    render(<FeatureSpecPlanPanel spec={makeSpec(partialPlan)} canEdit onSave={onSave} />);

    expect(screen.queryByText('Wajib diisi.')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Tujuan/), { target: { value: 'x' } });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan draf' }));

    await waitFor(() => expect(screen.getAllByText('Wajib diisi.').length).toBeGreaterThan(0));
    expect(screen.getByLabelText(/Ukuran keberhasilan/)).toHaveAttribute('aria-invalid', 'true');
  });

  it('is read-only for people who cannot write the Spec (AC-5.7)', () => {
    render(<FeatureSpecPlanPanel spec={makeSpec(completePlan)} canEdit={false} onSave={vi.fn()} />);

    expect(screen.getByLabelText(/Judul Feature/)).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Simpan draf' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Lanjut ke PRD' })).not.toBeInTheDocument();
    expect(screen.getByText(/Hanya Product Owner, Admin, dan Owner/)).toBeInTheDocument();
  });

  it('hides the continue button once the plan is complete and the stage advanced', () => {
    render(<FeatureSpecPlanPanel spec={makeSpec(completePlan, 'prd')} canEdit onSave={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Lanjut ke PRD' })).not.toBeInTheDocument();
    expect(screen.getByText(/Plan sudah lengkap/)).toBeInTheDocument();
  });
});

describe('FeatureSpecPlanRail', () => {
  it('shows saved progress, the missing fields, and who changed the Spec', () => {
    render(<FeatureSpecPlanRail spec={makeSpec(partialPlan)} onOpenPrd={vi.fn()} />);

    expect(screen.getByText('2 / 9')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ukuran keberhasilan' })).toHaveAttribute(
      'href',
      '#spec-successMeasure',
    );
    expect(screen.getByText(/Versi 3 · Reyand/)).toBeInTheDocument();
    expect(screen.getByText(/Versi 2 · Plan Bot \(agent\)/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Lihat PRD/ })).not.toBeInTheDocument();
  });

  it('opens the current PRD view once the plan is complete', () => {
    const onOpenPrd = vi.fn();
    render(<FeatureSpecPlanRail spec={makeSpec(completePlan, 'prd')} onOpenPrd={onOpenPrd} />);

    expect(screen.getByText('9 / 9')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Lihat PRD/ }));
    expect(onOpenPrd).toHaveBeenCalledTimes(1);
  });
});
