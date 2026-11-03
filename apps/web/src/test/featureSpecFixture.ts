import { evaluateFeatureSpecSection, FeatureSpecSchema, type FeatureSpec } from '@qlick/contracts';

/** Contract-valid test factory; never a production data source. */
export function featureSpecFixture(status: FeatureSpec['status'] = 'task'): FeatureSpec {
  const plan = {
    title: 'Checkout satu halaman',
    idea: 'Selesaikan checkout di satu halaman.',
    problem: 'Pembeli kehilangan alamat.',
    targetUsers: 'Pembeli',
    goal: 'Checkout tersimpan',
    successMeasure: 'Checkout valid terbaca ulang',
    targetPlatform: 'web',
    priority: 'high',
    startDate: '2026-11-03',
    dueDate: '2026-11-20',
  };
  const prd = {
    brief: { inScope: 'Simpan checkout', outScope: 'Pembayaran eksternal' },
    requirements: [
      {
        key: 'R1',
        title: 'Simpan checkout',
        description: 'Simpan input valid.',
        acceptanceCriteria: [
          { given: 'Data lengkap', when: 'Dikirim', then: 'Checkout tersimpan' },
        ],
      },
    ],
  };
  const tasks = {
    subtasks: [
      {
        key: 'T1',
        title: 'API checkout',
        description: 'Simpan dan baca checkout.',
        deliveryArea: 'backend',
        priority: 'high',
        startDate: '2026-11-04',
        dueDate: '2026-11-10',
        requirementKeys: ['R1'],
        assignmentMode: 'assigned',
        assigneeId: '30000000-0000-4000-8000-000000000004',
      },
    ],
  };
  return FeatureSpecSchema.parse({
    id: '30000000-0000-4000-8000-000000000001',
    workspaceId: '30000000-0000-4000-8000-000000000002',
    featureTaskId: '30000000-0000-4000-8000-000000000003',
    version: 4,
    status,
    plan,
    prd,
    tasks,
    completeness: {
      plan: evaluateFeatureSpecSection('plan', plan),
      prd: evaluateFeatureSpecSection('prd', prd),
      tasks: evaluateFeatureSpecSection('tasks', tasks, { prd }),
    },
    recentVersions: [],
    createdBy: '30000000-0000-4000-8000-000000000005',
    updatedBy: '30000000-0000-4000-8000-000000000005',
    createdAt: '2026-11-03T00:00:00.000Z',
    updatedAt: '2026-11-03T00:00:00.000Z',
  });
}
