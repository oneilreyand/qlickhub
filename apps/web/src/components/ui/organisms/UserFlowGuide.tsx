import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layers,
  CheckSquare,
  Building2,
  ShieldCheck,
  Code2,
  TestTube,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Lock,
  FileText,
  FolderPlus,
  GitCommit,
  Check,
  X,
  FileBarChart,
  MessageSquare,
  Lightbulb,
  Compass,
  Users,
} from 'lucide-react';
import { Card } from '../atoms/Card';
import { Badge } from '../atoms/Badge';
import { Button } from '../atoms/Button';
import { Alert } from '../atoms/Alert';
import { InteractiveGuideSimulator } from './InteractiveGuideSimulator';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { selectCurrentUserRole, setShowOnboardingModal } from '../../../store/authSlice';

export type MainSectionKey = 'panduan' | 'overview' | 'user_flow';
export type RoleKey = 'owner_admin' | 'po' | 'dev' | 'qa';
export type FlowTabKey = MainSectionKey | RoleKey | 'how_to_use';

interface UserFlowGuideProps {
  initialRole?: FlowTabKey;
  initialSection?: MainSectionKey;
}

export const UserFlowGuide: React.FC<UserFlowGuideProps> = ({ initialRole, initialSection }) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const currentRole = useAppSelector(selectCurrentUserRole);

  const getInitialRole = (): RoleKey => {
    if (initialRole === 'owner_admin' || initialRole === 'po' || initialRole === 'dev' || initialRole === 'qa') {
      return initialRole;
    }
    if (currentRole === 'owner' || currentRole === 'admin') return 'owner_admin';
    if (currentRole === 'po') return 'po';
    if (currentRole === 'dev') return 'dev';
    if (currentRole === 'qa') return 'qa';
    return 'po';
  };

  const getInitialSection = (): MainSectionKey => {
    if (initialSection) return initialSection;
    if (initialRole === 'how_to_use' || initialRole === 'panduan') return 'panduan';
    if (initialRole === 'overview') return 'overview';
    if (initialRole === 'user_flow' || initialRole === 'owner_admin' || initialRole === 'po' || initialRole === 'dev' || initialRole === 'qa') {
      return 'user_flow';
    }
    return 'panduan';
  };

  const [activeSection, setActiveSection] = useState<MainSectionKey>(getInitialSection());
  const [activeRole, setActiveRole] = useState<RoleKey>(getInitialRole());

  const handleNavigateToSection = (section: MainSectionKey, role?: RoleKey) => {
    setActiveSection(section);
    if (role) {
      setActiveRole(role);
    }
  };

  const sectionTabs: {
    key: MainSectionKey;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }[] = [
    {
      key: 'panduan',
      label: 'Panduan Aplikasi',
      description: 'Tutorial & Cara Penggunaan Fitur',
      icon: BookOpen,
      badge: 'Tutorial',
    },
    {
      key: 'overview',
      label: 'E2E Overview',
      description: 'Siklus 5 Fase & Matriks RBAC',
      icon: Sparkles,
      badge: 'Siklus & RBAC',
    },
    {
      key: 'user_flow',
      label: 'User Flow',
      description: 'Alur Kerja Berdasarkan Role',
      icon: Users,
      badge: 'Per Role',
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-stone-900 via-[#1C1A19] to-stone-900 p-6 sm:p-8 text-white shadow-xl border border-stone-800">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-[#B1E743]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-48 h-48 bg-[#B1E743]/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-[#B1E743] backdrop-blur-xs border border-white/10">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Interactive System Guide</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              User Flow & Cara Penggunaan Aplikasi
            </h1>
            <p className="text-sm text-stone-300 max-w-2xl leading-relaxed">
              Panduan terintegrasi Qlick Hub yang dibagi menjadi 3 bagian: <strong>Panduan Aplikasi</strong> (Tutorial praktis), <strong>E2E Overview</strong> (Siklus kolaborasi & RBAC), dan <strong>User Flow</strong> (Alur kerja spesifik per role tim).
            </p>
          </div>

          {/* Quick Action CTAs */}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => dispatch(setShowOnboardingModal(true))}
              leftIcon={<Sparkles className="w-4 h-4 text-amber-400" />}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white font-bold"
            >
              Tur Onboarding
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/work')}
              leftIcon={<Layers className="w-4 h-4 text-[#B1E743]" />}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white"
            >
              Buka Work Hub
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/my-tasks')}
              leftIcon={<CheckSquare className="w-4 h-4 text-[#B1E743]" />}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white"
            >
              Buka My Tasks
            </Button>
          </div>
        </div>
      </div>

      {/* Top 3 Main Section Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-1.5 bg-stone-100 dark:bg-stone-900/60 rounded-2xl border border-stone-200/80 dark:border-stone-800">
        {sectionTabs.map((tab, idx) => {
          const Icon = tab.icon;
          const isActive = activeSection === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveSection(tab.key)}
              className={`flex items-center justify-between p-3.5 rounded-xl transition-all text-left ${
                isActive
                  ? 'bg-white dark:bg-[#22201F] text-stone-900 dark:text-white shadow-md border border-stone-200/60 dark:border-stone-700/80 ring-2 ring-[#B1E743]/30 dark:ring-[#B1E743]/20'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-white/60 dark:hover:bg-stone-800/50'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`p-2.5 rounded-xl shrink-0 ${
                    isActive
                      ? 'bg-[#B1E743]/20 text-[#141413] dark:bg-stone-800 dark:text-[#B1E743]'
                      : 'bg-stone-200/70 text-stone-500 dark:bg-stone-800/80 dark:text-stone-400'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-stone-400 dark:text-stone-500">
                      0{idx + 1}
                    </span>
                    <span className="text-sm font-bold truncate">
                      {tab.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate mt-0.5">
                    {tab.description}
                  </p>
                </div>
              </div>
              {tab.badge && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ml-2 ${
                    isActive
                      ? 'bg-[#B1E743]/20 text-[#141413] dark:bg-stone-800 dark:text-[#B1E743] border border-[#B1E743]/40 dark:border-stone-700'
                      : 'bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content Display (3 Sections) */}
      {activeSection === 'panduan' && (
        <HowToUseSection onNavigateToSection={handleNavigateToSection} />
      )}
      {activeSection === 'overview' && (
        <OverviewFlowSection onSelectRole={(role) => handleNavigateToSection('user_flow', role)} />
      )}
      {activeSection === 'user_flow' && (
        <UserFlowSection activeRole={activeRole} onSelectRole={setActiveRole} />
      )}
    </div>
  );
};

/* =========================================================================
   0. CARA PENGGUNAAN APLIKASI (HOW TO USE / TUTORIAL)
   ========================================================================= */
const HowToUseSection: React.FC<{
  onNavigateToSection: (section: MainSectionKey, role?: RoleKey) => void;
}> = ({ onNavigateToSection }) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* 1. Pengenalan Navigasi Utama */}
      <Card className="p-6 border-stone-200/80 dark:border-stone-800 dark:bg-[#1C1A19]">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-stone-100 dark:border-stone-800">
          <div>
            <h2 className="text-lg font-bold text-stone-900 dark:text-white flex items-center gap-2">
              <Compass className="w-5 h-5 text-[#141413] dark:text-[#B1E743]" />
              Struktur & Menu Utama Aplikasi
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
              Kenali area kerja utama di dalam Qlick Hub dan fungsinya.
            </p>
          </div>
          <Badge variant="info">4 Menu Inti</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Menu 1: Work Hub */}
          <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-900/50 border border-stone-200/70 dark:border-stone-800 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <div className="p-2 rounded-lg bg-[#B1E743]/20 text-[#141413] dark:bg-stone-800 dark:text-[#B1E743]">
                  <Layers className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-stone-900 dark:text-white">1. Work Hub</h3>
              </div>
              <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                Pusat pengorganisasian tugas tim. Menyajikan folder sprint, daftar parent task dikelompokkan status, serta drawer detail subtask, requirement, dan diskusi.
              </p>
            </div>
            <Button size="sm" variant="outline" rightIcon={<ArrowRight className="w-3.5 h-3.5" />} onClick={() => navigate('/work')} className="w-full text-xs">
              Buka Work Hub
            </Button>
          </div>

          {/* Menu 2: My Tasks */}
          <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-900/50 border border-stone-200/70 dark:border-stone-800 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-stone-900 dark:text-white">2. My Tasks</h3>
              </div>
              <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                Ruang kerja personal. Menampilkan subtask yang ditugaskan khusus untuk Anda, filter tanggal/status, dan tempat memperbarui status kerja secara cepat.
              </p>
            </div>
            <Button size="sm" variant="outline" rightIcon={<ArrowRight className="w-3.5 h-3.5" />} onClick={() => navigate('/my-tasks')} className="w-full text-xs">
              Buka My Tasks
            </Button>
          </div>

          {/* Menu 3: Report */}
          <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-900/50 border border-stone-200/70 dark:border-stone-800 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                  <FileBarChart className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-stone-900 dark:text-white">3. Report Dashboard</h3>
              </div>
              <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                Analitik visual kecepatan rilis, diagram status task, metrik prioritas, dan QA Traceability Matrix untuk audit kualitas.
              </p>
            </div>
            <Button size="sm" variant="outline" rightIcon={<ArrowRight className="w-3.5 h-3.5" />} onClick={() => navigate('/reports')} className="w-full text-xs">
              Buka Report
            </Button>
          </div>

          {/* Menu 4: Settings */}
          <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-900/50 border border-stone-200/70 dark:border-stone-800 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400">
                  <Building2 className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-stone-900 dark:text-white">4. Workspace Settings</h3>
              </div>
              <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                Pengaturan workspace, undang anggota tim, atur peran (Admin, PO, Dev, QA), dan tentukan aturan Task Creation Policy.
              </p>
            </div>
            <Button size="sm" variant="outline" rightIcon={<ArrowRight className="w-3.5 h-3.5" />} onClick={() => navigate('/workspaces/settings')} className="w-full text-xs">
              Buka Settings
            </Button>
          </div>
        </div>
      </Card>

      {/* 2. Panduan Langkah demi Langkah Interaktif (Interactive Workflow Simulator) */}
      <InteractiveGuideSimulator />

      {/* 3. Kolaborasi & Fitur Pendukung */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 border-stone-200/80 dark:border-stone-800 dark:bg-[#1C1A19] space-y-2.5">
          <div className="flex items-center gap-2 text-stone-900 dark:text-white font-bold text-sm">
            <MessageSquare className="w-4 h-4 text-[#141413] dark:text-[#B1E743]" />
            <span>Discussion & Mention</span>
          </div>
          <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
            Gunakan tab <strong>Discussion</strong> di dalam Drawer untuk bertukar pesan dengan tim. Anda dapat me-reply pesan dan melakukan <code>@mention</code> anggota tim di workspace.
          </p>
        </Card>

        <Card className="p-5 border-stone-200/80 dark:border-stone-800 dark:bg-[#1C1A19] space-y-2.5">
          <div className="flex items-center gap-2 text-stone-900 dark:text-white font-bold text-sm">
            <ShieldCheck className="w-4 h-4 text-amber-500" />
            <span>Immutable Activity Log</span>
          </div>
          <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
            Setiap perpindahan status, perubahan assignee, dan modifikasi tercatat otomatis di tab <strong>Activity</strong> sebagai bukti audit yang tidak dapat dimanipulasi browser.
          </p>
        </Card>

        <Card className="p-5 border-stone-200/80 dark:border-stone-800 dark:bg-[#1C1A19] space-y-2.5">
          <div className="flex items-center gap-2 text-stone-900 dark:text-white font-bold text-sm">
            <Lightbulb className="w-4 h-4 text-[#B1E743]" />
            <span>Quick Filter & Date Presets</span>
          </div>
          <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
            Gunakan filter preset <em>Today</em>, <em>This Week</em>, atau <em>Date Range</em> di Work Hub dan Report untuk menyaring tampilan data secara instan.
          </p>
        </Card>
      </div>

      {/* Navigasi Lanjutan ke E2E Overview dan User Flow */}
      <div className="p-4 rounded-xl bg-stone-100 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs text-stone-600 dark:text-stone-400">
          Lanjutkan membaca gambaran siklus atau alur kerja peran spesifik:
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => onNavigateToSection('overview')} className="text-xs">
            2. E2E Overview
          </Button>
          <Button size="sm" variant="outline" onClick={() => onNavigateToSection('user_flow', 'po')} className="text-xs">
            Flow PO
          </Button>
          <Button size="sm" variant="outline" onClick={() => onNavigateToSection('user_flow', 'dev')} className="text-xs">
            Flow Dev
          </Button>
          <Button size="sm" variant="outline" onClick={() => onNavigateToSection('user_flow', 'qa')} className="text-xs">
            Flow QA
          </Button>
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   1. OVERVIEW FLOW SECTION (END-TO-END)
   ========================================================================= */
const OverviewFlowSection: React.FC<{ onSelectRole: (role: RoleKey) => void }> = ({ onSelectRole }) => {
  return (
    <div className="space-y-6">
      {/* End-to-End Process Stepper */}
      <Card className="p-6 border-stone-200/80 dark:border-stone-800 dark:bg-[#1C1A19]">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-stone-100 dark:border-stone-800">
          <div>
            <h2 className="text-lg font-bold text-stone-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-stone-900 dark:text-[#B1E743]" />
              Siklus Lengkap Kolaborasi Tim (End-to-End Lifecycle)
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
              Bagaimana keempat peran berkolaborasi dari fase perencanaan hingga verifikasi rilis.
            </p>
          </div>
          <Badge variant="info">5 Fase Kunci</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
          {/* Step 1: Inisiasi */}
          <div className="flex flex-col p-4 rounded-xl bg-stone-50 dark:bg-stone-900/50 border border-stone-200/60 dark:border-stone-800 relative">
            <div className="flex items-center justify-between mb-3">
              <span className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 font-bold text-xs flex items-center justify-center">
                1
              </span>
              <Badge variant="neutral" size="sm">Admin / PO</Badge>
            </div>
            <h3 className="font-semibold text-sm text-stone-900 dark:text-white mb-1">Struktur & Ruang Kerja</h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed mb-3">
              Inisiasi Workspace, undang anggota tim, dan buat folder rilis / sprint.
            </p>
            <button
              onClick={() => onSelectRole('owner_admin')}
              className="mt-auto text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1 hover:underline pt-2 border-t border-stone-200/40 dark:border-stone-800"
            >
              Lihat detail Admin <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Step 2: Perencanaan */}
          <div className="flex flex-col p-4 rounded-xl bg-stone-50 dark:bg-stone-900/50 border border-stone-200/60 dark:border-stone-800 relative">
            <div className="flex items-center justify-between mb-3">
              <span className="w-7 h-7 rounded-lg bg-[#B1E743]/20 text-[#141413] dark:bg-stone-800 dark:text-[#B1E743] font-bold text-xs flex items-center justify-center">
                2
              </span>
              <Badge variant="review" size="sm">PO</Badge>
            </div>
            <h3 className="font-semibold text-sm text-stone-900 dark:text-white mb-1">Parent & Subtask FE/BE/QA</h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed mb-3">
              PO memecah parent task menjadi subtask FE, BE, & QA terarah ke masing-masing assignee.
            </p>
            <button
              onClick={() => onSelectRole('po')}
              className="mt-auto text-xs font-bold text-stone-900 dark:text-[#B1E743] flex items-center gap-1 hover:underline pt-2 border-t border-stone-200/40 dark:border-stone-800"
            >
              Lihat detail PO <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Step 3: Implementasi */}
          <div className="flex flex-col p-4 rounded-xl bg-stone-50 dark:bg-stone-900/50 border border-stone-200/60 dark:border-stone-800 relative">
            <div className="flex items-center justify-between mb-3">
              <span className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 font-bold text-xs flex items-center justify-center">
                3
              </span>
              <Badge variant="neutral" size="sm">Developer</Badge>
            </div>
            <h3 className="font-semibold text-sm text-stone-900 dark:text-white mb-1">Coding & Submit Review</h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed mb-3">
              Dev mengerjakan subtask (In Progress), lalu mengajukan ke In Review saat coding selesai.
            </p>
            <button
              onClick={() => onSelectRole('dev')}
              className="mt-auto text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:underline pt-2 border-t border-stone-200/40 dark:border-stone-800"
            >
              Lihat detail Dev <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Step 4: Quality Gate */}
          <div className="flex flex-col p-4 rounded-xl bg-stone-50 dark:bg-stone-900/50 border border-stone-200/60 dark:border-stone-800 relative">
            <div className="flex items-center justify-between mb-3">
              <span className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-bold text-xs flex items-center justify-center">
                4
              </span>
              <Badge variant="passed" size="sm">QA</Badge>
            </div>
            <h3 className="font-semibold text-sm text-stone-900 dark:text-white mb-1">Quality Gate & Testing</h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed mb-3">
              QA me-review kode/fitur. Jika ada bug $\rightarrow$ Changes Requested. Jika lolos $\rightarrow$ Done.
            </p>
            <button
              onClick={() => onSelectRole('qa')}
              className="mt-auto text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 hover:underline pt-2 border-t border-stone-200/40 dark:border-stone-800"
            >
              Lihat detail QA <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Step 5: Final Acceptance */}
          <div className="flex flex-col p-4 rounded-xl bg-stone-50 dark:bg-stone-900/50 border border-stone-200/60 dark:border-stone-800 relative">
            <div className="flex items-center justify-between mb-3">
              <span className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 font-bold text-xs flex items-center justify-center">
                5
              </span>
              <Badge variant="review" size="sm">PO / Admin</Badge>
            </div>
            <h3 className="font-semibold text-sm text-stone-900 dark:text-white mb-1">Final Acceptance</h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed mb-3">
              Setelah seluruh subtask FE, BE, & QA tervalidasi Done, PO menyelesaikan Parent Task.
            </p>
            <button
              onClick={() => onSelectRole('po')}
              className="mt-auto text-xs font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-1 hover:underline pt-2 border-t border-stone-200/40 dark:border-stone-800"
            >
              Lihat Acceptance PO <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </Card>

      {/* Role Comparison Matrix */}
      <Card className="p-6 border-stone-200/80 dark:border-stone-800 dark:bg-[#1C1A19]">
        <h2 className="text-lg font-bold text-stone-900 dark:text-white mb-4 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-stone-900 dark:text-[#B1E743]" />
          Matriks Peran & Hak Akses (RBAC Matrix)
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 font-semibold">
                <th className="py-3 px-4">Operasi / Fitur</th>
                <th className="py-3 px-4 text-center">Owner / Admin</th>
                <th className="py-3 px-4 text-center">Product Owner (PO)</th>
                <th className="py-3 px-4 text-center">Developer (Dev)</th>
                <th className="py-3 px-4 text-center">Quality Assurance (QA)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800/60 text-stone-700 dark:text-stone-300">
              <tr>
                <td className="py-3 px-4 font-medium">Buat Workspace, Folder & Kelola Anggota</td>
                <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-emerald-500 mx-auto" /></td>
                <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-emerald-500 mx-auto" /></td>
                <td className="py-3 px-4 text-center"><X className="w-4 h-4 text-stone-400 mx-auto" /></td>
                <td className="py-3 px-4 text-center"><X className="w-4 h-4 text-stone-400 mx-auto" /></td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium">Buat & Rencanakan Parent Task / Subtask</td>
                <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-emerald-500 mx-auto" /></td>
                <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-emerald-500 mx-auto" /></td>
                <td className="py-3 px-4 text-center"><X className="w-4 h-4 text-stone-400 mx-auto" /></td>
                <td className="py-3 px-4 text-center"><X className="w-4 h-4 text-stone-400 mx-auto" /></td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium">Update Status Eksekusi (Todo $\rightarrow$ In Progress $\rightarrow$ In Review)</td>
                <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-emerald-500 mx-auto" /></td>
                <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-emerald-500 mx-auto" /></td>
                <td className="py-3 px-4 text-center"><span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">Subtask Milik Sendiri</span></td>
                <td className="py-3 px-4 text-center"><span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Subtask Milik Sendiri</span></td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium">Self-Approval Subtask langsung ke "Done"</td>
                <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-emerald-500 mx-auto" /></td>
                <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-emerald-500 mx-auto" /></td>
                <td className="py-3 px-4 text-center"><span className="text-red-500 font-bold">Dilarang (Blocked)</span></td>
                <td className="py-3 px-4 text-center"><span className="text-red-500 font-bold">Dilarang (Blocked)</span></td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium">Approve Review / Beri Review Notes (Changes Requested)</td>
                <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-emerald-500 mx-auto" /></td>
                <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-emerald-500 mx-auto" /></td>
                <td className="py-3 px-4 text-center"><X className="w-4 h-4 text-stone-400 mx-auto" /></td>
                <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-emerald-500 mx-auto" /></td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium">Selesaikan Parent Task Akhir (Final Acceptance)</td>
                <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-emerald-500 mx-auto" /></td>
                <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-emerald-500 mx-auto" /></td>
                <td className="py-3 px-4 text-center"><X className="w-4 h-4 text-stone-400 mx-auto" /></td>
                <td className="py-3 px-4 text-center"><X className="w-4 h-4 text-stone-400 mx-auto" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Navigasi Lanjutan ke Role Flow */}
      <div className="p-4 rounded-xl bg-stone-100 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs text-stone-600 dark:text-stone-400">
          Lihat detail SOP dan panduan alur kerja untuk setiap role tim:
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => onSelectRole('owner_admin')} className="text-xs">
            Alur Owner/Admin
          </Button>
          <Button size="sm" variant="outline" onClick={() => onSelectRole('po')} className="text-xs">
            Alur Product Owner
          </Button>
          <Button size="sm" variant="outline" onClick={() => onSelectRole('dev')} className="text-xs">
            Alur Developer
          </Button>
          <Button size="sm" variant="outline" onClick={() => onSelectRole('qa')} className="text-xs">
            Alur QA
          </Button>
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   2. USER FLOW PER ROLE CONTAINER
   ========================================================================= */
const UserFlowSection: React.FC<{
  activeRole: RoleKey;
  onSelectRole: (role: RoleKey) => void;
}> = ({ activeRole, onSelectRole }) => {
  const roleTabs: {
    key: RoleKey;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge: string;
    desc: string;
  }[] = [
    {
      key: 'owner_admin',
      label: 'Owner & Admin',
      icon: ShieldCheck,
      badge: 'Governance',
      desc: 'Setup workspace, member, Task Policy & override',
    },
    {
      key: 'po',
      label: 'Product Owner (PO)',
      icon: Layers,
      badge: 'Planning',
      desc: 'Folder sprint, parent task, subtask & explicit completion',
    },
    {
      key: 'dev',
      label: 'Developer (Dev)',
      icon: Code2,
      badge: 'Execution',
      desc: 'My Tasks, Todo → In Progress → In Review, anti self-approval',
    },
    {
      key: 'qa',
      label: 'Quality Assurance (QA)',
      icon: TestTube,
      badge: 'Verification',
      desc: 'Gatekeeper, review notes, approve Done & subtask QA',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Role Navigation Bar */}
      <Card className="p-4 bg-stone-50/80 dark:bg-stone-900/60 border-stone-200/80 dark:border-stone-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 px-1">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-stone-900 dark:text-[#B1E743]" />
            <h3 className="text-xs font-bold text-stone-900 dark:text-white uppercase tracking-wider">
              Pilih Alur Kerja Berdasarkan Role (User Flow)
            </h3>
          </div>
          <span className="text-[11px] text-stone-500 dark:text-stone-400">
            Pilih peran di bawah untuk melihat SOP & Quality Gate
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {roleTabs.map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeRole === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onSelectRole(tab.key)}
                className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-white dark:bg-[#22201F] border-[#B1E743] shadow-md ring-2 ring-[#B1E743]/30 dark:ring-[#B1E743]/20'
                    : 'bg-white/70 dark:bg-stone-900/40 border-stone-200/80 dark:border-stone-800 hover:bg-white dark:hover:bg-stone-800/80 text-stone-600 dark:text-stone-300'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`p-2 rounded-lg shrink-0 ${
                      isSelected
                        ? 'bg-[#B1E743]/20 text-[#141413] dark:bg-stone-800 dark:text-[#B1E743]'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-xs font-bold truncate ${isSelected ? 'text-stone-900 dark:text-white' : 'text-stone-700 dark:text-stone-300'}`}>
                      {tab.label}
                    </p>
                    <p className="text-[10px] text-stone-400 dark:text-stone-500 truncate">
                      {tab.desc}
                    </p>
                  </div>
                </div>
                {isSelected && <CheckCircle2 className="w-4 h-4 text-stone-900 dark:text-[#B1E743] shrink-0 ml-1" />}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Active Role Content */}
      {activeRole === 'owner_admin' && <OwnerAdminFlowSection />}
      {activeRole === 'po' && <PoFlowSection />}
      {activeRole === 'dev' && <DevFlowSection />}
      {activeRole === 'qa' && <QaFlowSection />}
    </div>
  );
};

/* =========================================================================
   3. OWNER & ADMIN FLOW SECTION
   ========================================================================= */
const OwnerAdminFlowSection: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <Card className="p-6 border-stone-200/80 dark:border-stone-800 dark:bg-[#1C1A19]">
        <div className="flex items-center justify-between pb-4 border-b border-stone-100 dark:border-stone-800 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900 dark:text-white">Alur Kerja: Owner & Admin</h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">Tata kelola workspace, hak akses tim, audit log, dan override eskalasi.</p>
            </div>
          </div>
          <Button size="sm" leftIcon={<Building2 className="w-4 h-4" />} onClick={() => navigate('/workspaces/settings')}>
            Workspace Settings
          </Button>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-bold text-stone-900 dark:text-white uppercase tracking-wider text-xs">
            Langkah-Langkah Kerja Utama
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-900/50 border border-stone-200/70 dark:border-stone-800 space-y-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                Tahap 1
              </span>
              <h4 className="font-semibold text-sm text-stone-900 dark:text-white">Setup Workspace & Member</h4>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Buat workspace baru, atur slug, dan undang anggota tim dengan role yang tepat (`po`, `dev`, `qa`).
              </p>
            </div>

            <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-900/50 border border-stone-200/70 dark:border-stone-800 space-y-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                Tahap 2
              </span>
              <h4 className="font-semibold text-sm text-stone-900 dark:text-white">Konfigurasi Task Policy</h4>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Tentukan kebijakan apakah Dev diizinkan membuat task mandiri atau hanya PO/Admin yang boleh merencanakan task.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-900/50 border border-stone-200/70 dark:border-stone-800 space-y-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                Tahap 3
              </span>
              <h4 className="font-semibold text-sm text-stone-900 dark:text-white">Audit & Monitoring</h4>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Pantau laporan agregat di Report Dashboard dan riwayat aktivitas (*Activity Audit Log*) yang tidak dapat dimanipulasi.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-stone-100 dark:border-stone-800">
          <Alert tone="info" title="Hak Istimewa Admin (Governance Override)">
            Owner dan Admin memiliki wewenang penuh untuk melakukan intervensi jika ada subtask yang terblokir, mengedit detail parent task kapan saja, dan memoderasi komentar pada thread diskusi.
          </Alert>
        </div>
      </Card>
    </div>
  );
};

/* =========================================================================
   3. PRODUCT OWNER (PO) FLOW SECTION
   ========================================================================= */
const PoFlowSection: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <Card className="p-6 border-stone-200/80 dark:border-stone-800 dark:bg-[#1C1A19]">
        <div className="flex items-center justify-between pb-4 border-b border-stone-100 dark:border-stone-800 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#B1E743]/20 text-[#141413] dark:bg-stone-800 dark:text-[#B1E743]">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900 dark:text-white">Alur Kerja: Product Owner (PO)</h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">Perencanaan folder sprint, requirement, parent task, pembagian subtask, dan final acceptance.</p>
            </div>
          </div>
          <Button size="sm" leftIcon={<Layers className="w-4 h-4" />} onClick={() => navigate('/work')}>
            Buka Work Hub
          </Button>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-bold text-stone-900 dark:text-white uppercase tracking-wider text-xs">
            Alur Eksekusi Product Owner
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-900/50 border border-stone-200/70 dark:border-stone-800 space-y-2">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-stone-700 dark:text-[#B1E743]" />
                <h4 className="font-semibold text-sm text-stone-900 dark:text-white">1. Buat Folder Sprint</h4>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Buat struktur folder kerja (maksimal 2 tingkat kedalaman) untuk mengelompokkan deliverable fitur.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-900/50 border border-stone-200/70 dark:border-stone-800 space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-stone-700 dark:text-[#B1E743]" />
                <h4 className="font-semibold text-sm text-stone-900 dark:text-white">2. Buat Parent Task</h4>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Buat parent task fitur utama, tautkan URL requirement/PRD, dan tentukan prioritas serta estimasi tanggal.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-900/50 border border-stone-200/70 dark:border-stone-800 space-y-2">
              <div className="flex items-center gap-2">
                <GitCommit className="w-4 h-4 text-stone-700 dark:text-[#B1E743]" />
                <h4 className="font-semibold text-sm text-stone-900 dark:text-white">3. Pecah Subtask (FE/BE/QA)</h4>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Buka tab *Subtasks*, buat subtask terarah (`Frontend`, `Backend`, `QA`) dan tugaskan langsung ke anggota tim.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-900/50 border border-stone-200/70 dark:border-stone-800 space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h4 className="font-semibold text-sm text-stone-900 dark:text-white">4. Final Acceptance</h4>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Pantau bar ringkasan penyelesaian (`FE 1/1 · BE 1/1 · QA 1/1`). Jika semua lolos uji, selesaikan Parent Task ke **Done**.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 rounded-xl bg-[#B1E743]/10 dark:bg-[#B1E743]/10 border border-[#B1E743]/30 dark:border-[#B1E743]/20 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-stone-900 dark:text-[#B1E743] shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <span className="font-bold text-[#141413] dark:text-[#B1E743]">Prinsip Explicit Parent Completion:</span>
            <p className="text-stone-700 dark:text-stone-300">
              Sistem tidak akan menyelesaikan parent task secara otomatis saat subtask selesai. Penutupan parent task adalah keputusan sadar Product Owner setelah memastikan hasil pengerjaan sesuai dengan kriteria penerimaan produk.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

/* =========================================================================
   4. DEVELOPER (DEV) FLOW SECTION
   ========================================================================= */
const DevFlowSection: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <Card className="p-6 border-stone-200/80 dark:border-stone-800 dark:bg-[#1C1A19]">
        <div className="flex items-center justify-between pb-4 border-b border-stone-100 dark:border-stone-800 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400">
              <Code2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900 dark:text-white">Alur Kerja: Developer (Dev)</h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">Fokus eksekusi subtask di My Tasks, pengajuan review, dan penanganan review notes.</p>
            </div>
          </div>
          <Button size="sm" leftIcon={<CheckSquare className="w-4 h-4" />} onClick={() => navigate('/my-tasks')}>
            Buka My Tasks
          </Button>
        </div>

        {/* Workflow Progression Stepper */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-stone-900 dark:text-white uppercase tracking-wider text-xs">
            Siklus Status Subtask Developer
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-900/50 border border-stone-200/70 dark:border-stone-800 space-y-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                1. TODO
              </span>
              <h4 className="font-semibold text-sm text-stone-900 dark:text-white">Terima Tugas di My Tasks</h4>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Buka menu *My Tasks*, periksa deskripsi tugas, requirement terkait, dan spesifikasi teknis.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-900/50 border border-stone-200/70 dark:border-stone-800 space-y-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                2. IN PROGRESS
              </span>
              <h4 className="font-semibold text-sm text-stone-900 dark:text-white">Mulai Pengerjaan Kode</h4>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Ubah status ke **In Progress** saat mulai coding agar tim mengetahui subtask sedang aktif dikerjakan.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-900/50 border border-stone-200/70 dark:border-stone-800 space-y-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                3. IN REVIEW
              </span>
              <h4 className="font-semibold text-sm text-stone-900 dark:text-white">Submit untuk Uji QA</h4>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Setelah pull request/fitur siap, ubah status ke **In Review** untuk memicu proses verifikasi oleh QA.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-900/50 border border-stone-200/70 dark:border-stone-800 space-y-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                4. DONE / REVISI
              </span>
              <h4 className="font-semibold text-sm text-stone-900 dark:text-white">Hasil Review QA</h4>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Jika ada catatan revisi (`Changes Requested`), baca catatan di Drawer, perbaiki, dan submit ulang ke In Review.
              </p>
            </div>
          </div>
        </div>

        {/* Quality Gate Guardrail Alert */}
        <div className="mt-6 space-y-3">
          <div className="p-4 rounded-xl bg-red-50/70 dark:bg-red-950/30 border border-red-200/80 dark:border-red-800/60 flex items-start gap-3">
            <Lock className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <span className="font-bold text-red-900 dark:text-red-200">Quality Gate: Anti Self-Approval</span>
              <p className="text-red-800 dark:text-red-300">
                Developer <strong>dilarang dan diblokir oleh sistem</strong> untuk langsung menyelesaikan subtask sendiri ke status <code>DONE</code>. Status Done hanya dapat diberikan oleh QA atau PO setelah pengujian terverifikasi.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

/* =========================================================================
   5. QUALITY ASSURANCE (QA) FLOW SECTION
   ========================================================================= */
const QaFlowSection: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <Card className="p-6 border-stone-200/80 dark:border-stone-800 dark:bg-[#1C1A19]">
        <div className="flex items-center justify-between pb-4 border-b border-stone-100 dark:border-stone-800 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
              <TestTube className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900 dark:text-white">Alur Kerja: Quality Assurance (QA)</h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">Pintu gerbang kualitas (*Quality Gatekeeper*), review hasil kerja dev, dan eksekusi pengujian.</p>
            </div>
          </div>
          <Button size="sm" leftIcon={<Layers className="w-4 h-4" />} onClick={() => navigate('/work')}>
            Buka Work Hub
          </Button>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-bold text-stone-900 dark:text-white uppercase tracking-wider text-xs">
            Langkah Review & Pengujian QA
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-900/50 border border-stone-200/70 dark:border-stone-800 space-y-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                1. Review Subtask Dev
              </span>
              <h4 className="font-semibold text-sm text-stone-900 dark:text-white">Verifikasi Subtask In Review</h4>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Saat subtask Developer berstatus **In Review**, buka drawer task dan uji kesesuaian fungsionalitasnya.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-900/50 border border-stone-200/70 dark:border-stone-800 space-y-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                2. Skenario Bug / Isu
              </span>
              <h4 className="font-semibold text-sm text-stone-900 dark:text-white">Kirim Changes Requested</h4>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Jika ditemukan cacat / bug, ubah status ke **Changes Requested** dan wajib sertakan deskripsi jelas pada kolom *Review Notes*.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-900/50 border border-stone-200/70 dark:border-stone-800 space-y-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                3. Skenario Lolos Uji
              </span>
              <h4 className="font-semibold text-sm text-stone-900 dark:text-white">Approve Subtask Dev ke Done</h4>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Jika seluruh kriteria pengujian terpenuhi, QA menyetujui subtask Dev menjadi **Done**.
              </p>
            </div>
          </div>
        </div>

        {/* Eksekusi Subtask QA */}
        <div className="mt-6 pt-6 border-t border-stone-100 dark:border-stone-800 space-y-4">
          <h3 className="text-sm font-bold text-stone-900 dark:text-white uppercase tracking-wider text-xs">
            Pengujian Akhir & Eksekusi Subtask QA
          </h3>

          <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-800/50 space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h4 className="font-semibold text-sm text-stone-900 dark:text-white">Eksekusi Subtask QA (Automation & E2E Verification)</h4>
            </div>
            <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
              Setelah subtask implementasi (Frontend & Backend) disetujui, QA mengeksekusi subtask pengujian mandiri (*E2E Automation Test / Regression Test*), melampirkan bukti pengujian, dan memindahkan subtask QA ke **Done**.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
