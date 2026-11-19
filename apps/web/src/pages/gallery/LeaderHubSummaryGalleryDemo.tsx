import React, { useState } from 'react';
import { Tabs } from '../../components/ui/molecules/Tabs';
import {
  LeaderHubHeader,
  LeaderHubSummaryView,
  type LeaderHubSummaryState,
} from '../../components/ui/organisms/leaderHub';
import {
  leaderHubSummaryEmptyFixture,
  leaderHubSummaryFixture,
} from '../../components/ui/organisms/leaderHub/__fixtures__/leaderHubSummary.fixture';

type DemoState = 'ready' | 'loading' | 'empty' | 'error' | 'denied';

const DEMO_STATES = [
  { id: 'ready', label: 'Ada data' },
  { id: 'loading', label: 'Memuat' },
  { id: 'empty', label: 'Kosong' },
  { id: 'error', label: 'Gagal' },
  { id: 'denied', label: 'Akses ditolak' },
];

const LEADER_TABS = [
  { id: 'summary', label: 'Ikhtisar' },
  { id: 'workload', label: 'Beban kerja' },
  { id: 'blockers', label: 'Hambatan' },
  { id: 'quality', label: 'Kualitas' },
  { id: 'periodic', label: 'Laporan berkala' },
];

function toViewState(demo: DemoState): LeaderHubSummaryState {
  switch (demo) {
    case 'loading':
      return { status: 'loading' };
    case 'empty':
      return { status: 'ready', data: leaderHubSummaryEmptyFixture };
    case 'error':
      return {
        status: 'error',
        message: 'Server tidak merespons. Data terakhir tidak ditampilkan agar tidak menyesatkan.',
      };
    case 'denied':
      return { status: 'denied' };
    default:
      return { status: 'ready', data: leaderHubSummaryFixture };
  }
}

/**
 * Gallery-only demo for the Leader Hub "Ringkasan" slice. Uses labelled FIXTURE data; buttons only
 * write a local note and never call the API.
 */
export const LeaderHubSummaryGalleryDemo: React.FC = () => {
  const [demoState, setDemoState] = useState<DemoState>('ready');
  const [workspace, setWorkspace] = useState('all');
  const [period, setPeriod] = useState('this-week');
  const [tab, setTab] = useState('summary');
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

      <div className="rounded-2xl bg-[#FAFAF7] p-4 sm:p-6 dark:bg-[#141413]">
        <div className="space-y-5">
          <LeaderHubHeader
            freshnessLabel={demoState === 'loading' ? undefined : 'diperbarui 10 detik lalu'}
            workspaceCount={3}
            memberCount={18}
            workspaceOptions={[
              { value: 'all', label: 'Semua workspace' },
              { value: 'payment', label: 'Payment' },
              { value: 'mobile', label: 'Mobile App' },
              { value: 'internal', label: 'Internal Tools' },
            ]}
            workspaceValue={workspace}
            onWorkspaceChange={setWorkspace}
            periodOptions={[
              { value: 'this-week', label: 'Minggu ini' },
              { value: 'last-week', label: 'Minggu lalu' },
              { value: 'this-month', label: 'Bulan ini' },
            ]}
            periodValue={period}
            onPeriodChange={setPeriod}
            tabs={LEADER_TABS}
            activeTabId={tab}
            onTabChange={setTab}
          />
          {tab === 'summary' ? (
            <LeaderHubSummaryView
              state={toViewState(demoState)}
              onRetry={() => setDemoState('ready')}
              onOpenFeature={(id) => note(`Buka Feature ${id}`)}
              onPingPic={(id) => note(`Ping PIC untuk ${id}`)}
              onOpenBlocker={(id) => note(`Buka hambatan ${id}`)}
              onSeeAllBlockers={() => note('Lihat semua hambatan')}
            />
          ) : (
            <p className="rounded-2xl border border-dashed border-stone-300 px-4 py-10 text-center text-sm text-stone-500 dark:border-stone-700 dark:text-stone-400">
              Tab ini belum didesain. Slicing saat ini hanya untuk Ringkasan.
            </p>
          )}
        </div>
      </div>
      {lastAction && (
        <p role="status" className="text-xs text-stone-500 dark:text-stone-400">
          {lastAction}
        </p>
      )}
    </div>
  );
};
