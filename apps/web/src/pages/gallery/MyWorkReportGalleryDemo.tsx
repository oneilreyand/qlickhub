import React, { useState } from 'react';
import { Tabs } from '../../components/ui/molecules/Tabs';
import {
  MyWorkReportHeader,
  MyWorkReportView,
  type MyWorkReportState,
} from '../../components/ui/organisms/myWorkReport';
import {
  myWorkReportEmptyFixture,
  myWorkReportFixture,
} from '../../components/ui/organisms/myWorkReport/__fixtures__/myWorkReport.fixture';

type DemoState = 'ready' | 'loading' | 'empty' | 'error' | 'denied';

const DEMO_STATES = [
  { id: 'ready', label: 'Ada data' },
  { id: 'loading', label: 'Memuat' },
  { id: 'empty', label: 'Kosong' },
  { id: 'error', label: 'Gagal' },
  { id: 'denied', label: 'Akses ditolak' },
];

function toViewState(demo: DemoState): MyWorkReportState {
  switch (demo) {
    case 'loading':
      return { status: 'loading' };
    case 'empty':
      return { status: 'ready', data: myWorkReportEmptyFixture };
    case 'error':
      return {
        status: 'error',
        message: 'Server tidak merespons. Data terakhir tidak ditampilkan agar tidak menyesatkan.',
      };
    case 'denied':
      return { status: 'denied' };
    default:
      return { status: 'ready', data: myWorkReportFixture };
  }
}

/**
 * Gallery-only demo for the "Laporan Saya" slice. Uses labelled FIXTURE data; buttons only write a
 * local note and never call the API.
 */
export const MyWorkReportGalleryDemo: React.FC = () => {
  const [demoState, setDemoState] = useState<DemoState>('ready');
  const [period, setPeriod] = useState('2026-10-27_2026-11-07');
  const [workspace, setWorkspace] = useState('all');
  const [lastAction, setLastAction] = useState<string | null>(null);
  const note = (text: string) => setLastAction(`${text} — demo, tidak mengirim apa pun.`);

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-col gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900 sm:flex-row sm:items-center sm:justify-between dark:bg-amber-950/40 dark:text-amber-200">
        <span>
          <strong>Data contoh (fixture).</strong> Nama dan angka fiktif; belum tersambung ke API.
        </span>
        <Tabs
          tabs={DEMO_STATES}
          activeTabId={demoState}
          onChange={(id) => setDemoState(id as DemoState)}
          variant="pills"
          ariaLabel="Pilih state demo"
        />
      </div>

      <div className="space-y-5 rounded-2xl bg-[#FAFAF7] p-4 sm:p-6 dark:bg-[#141413]">
        <MyWorkReportHeader
          workspaceNames={myWorkReportFixture.workspaces.map((ws) => ws.name)}
          periodOptions={[
            { value: '2026-10-27_2026-11-07', label: '27 Okt – 7 Nov' },
            { value: '2026-11-10_2026-11-21', label: '10 – 21 Nov' },
          ]}
          periodValue={period}
          onPeriodChange={setPeriod}
          workspaceOptions={[
            { value: 'all', label: 'Semua workspace' },
            ...myWorkReportFixture.workspaces.map((ws) => ({ value: ws.id, label: ws.name })),
          ]}
          workspaceValue={workspace}
          onWorkspaceChange={setWorkspace}
          onExportCsv={() => note('Export CSV')}
        />
        <MyWorkReportView
          state={toViewState(demoState)}
          onRetry={() => setDemoState('ready')}
          onOpenItem={(id) => note(`Buka kerjaan ${id}`)}
          onSeeConflictCause={() => note('Lihat penyebab bentrok')}
        />
      </div>
      {lastAction && (
        <p role="status" className="text-xs text-stone-500 dark:text-stone-400">
          {lastAction}
        </p>
      )}
    </div>
  );
};
