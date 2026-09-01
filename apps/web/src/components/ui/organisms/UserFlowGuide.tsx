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
  Check,
  FileBarChart,
  MessageSquare,
  Lightbulb,
  Compass,
  Users,
  ShieldAlert,
} from 'lucide-react';
import { Card } from '../atoms/Card';
import { Badge } from '../atoms/Badge';
import { Button } from '../atoms/Button';
import { InteractiveGuideSimulator, FilterRole } from './InteractiveGuideSimulator';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  selectCurrentUserRole,
  selectCurrentUser,
  setShowOnboardingModal,
} from '../../../store/authSlice';

export type MainSectionKey = 'panduan' | 'overview' | 'user_flow';
export type RoleKey = 'owner_admin' | 'po' | 'dev' | 'qa';
export type FlowTabKey = MainSectionKey | RoleKey | 'how_to_use';

interface UserFlowGuideProps {
  initialRole?: FlowTabKey;
  initialSection?: MainSectionKey;
}

export const UserFlowGuide: React.FC<UserFlowGuideProps> = ({ initialRole, initialSection }) => {
  const dispatch = useAppDispatch();
  const currentRole = useAppSelector(selectCurrentUserRole);
  const currentUser = useAppSelector(selectCurrentUser);

  const getInitialRole = (): RoleKey => {
    if (
      initialRole === 'owner_admin' ||
      initialRole === 'po' ||
      initialRole === 'dev' ||
      initialRole === 'qa'
    ) {
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
    if (
      initialRole === 'user_flow' ||
      initialRole === 'owner_admin' ||
      initialRole === 'po' ||
      initialRole === 'dev' ||
      initialRole === 'qa'
    ) {
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

  const getSimulatorFilterRole = (): FilterRole => {
    if (currentRole === 'owner' || currentRole === 'admin') return 'admin';
    if (currentRole === 'po') return 'po';
    if (currentRole === 'dev') return 'dev';
    if (currentRole === 'qa') return 'qa';
    return 'all';
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
      label: 'Panduan Aplikasi & Simulator',
      description: 'Tutorial praktis & Simulator interaktif fitur',
      icon: BookOpen,
      badge: 'Tutorial & Simulator',
    },
    {
      key: 'overview',
      label: 'E2E Overview & RBAC',
      description: 'Siklus 5 Fase & Matriks Hak Akses',
      icon: Sparkles,
      badge: 'Siklus & RBAC',
    },
    {
      key: 'user_flow',
      label: 'Alur Kerja per Role',
      description: 'Checklist & Panduan Khusus Peran Anda',
      icon: Users,
      badge: 'Spesifik Peran',
    },
  ];

  return (
    <div className="w-full space-y-6 pb-12">
      {/* 1. Personalized Logged-in User Role Hero Banner */}
      <LoggedInRoleHeroBanner
        currentRole={currentRole}
        userName={currentUser?.name || currentUser?.email || 'Team Member'}
        onOpenOnboarding={() => dispatch(setShowOnboardingModal(true))}
        onSelectRoleView={(role) => handleNavigateToSection('user_flow', role)}
      />

      {/* 2. Top 3 Main Section Tabs */}
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
                    <span className="text-sm font-bold truncate">{tab.label}</span>
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

      {/* 3. Tab Content Display */}
      {activeSection === 'panduan' && (
        <HowToUseSection
          activeUserRole={getSimulatorFilterRole()}
          onNavigateToSection={handleNavigateToSection}
        />
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
   A. PERSONALIZED LOGGED-IN ROLE HERO BANNER
   ========================================================================= */
interface LoggedInRoleHeroBannerProps {
  currentRole: string | null;
  userName: string;
  onOpenOnboarding: () => void;
  onSelectRoleView: (role: RoleKey) => void;
}

const LoggedInRoleHeroBanner: React.FC<LoggedInRoleHeroBannerProps> = ({
  currentRole,
  userName,
  onOpenOnboarding,
  onSelectRoleView,
}) => {
  const navigate = useNavigate();

  const getRoleMetadata = () => {
    switch (currentRole) {
      case 'owner':
      case 'admin':
        return {
          title: 'Owner & Workspace Admin',
          badgeText: 'Governance & Escalation',
          badgeColor: 'bg-amber-400/20 text-amber-300 border-amber-400/30',
          icon: ShieldCheck,
          deskRoute: '/workspaces/settings',
          deskLabel: 'Buka Workspace Settings',
          summary:
            'Anda memegang kendali tata kelola workspace, keanggotaan tim, klasifikasi spesialisasi developer (ADR-002), dan akuntabilitas keputusan rilis tertinggi.',
          primaryActions: [
            'Kelola anggota & spesialisasi (FE/BE/Mobile/Fullstack)',
            'Atur kebijakan task creation permission',
            'Tinjau delivery progress & role bottlenecks',
          ],
          boundary:
            'Tidak boleh menandatangani QA Sign-off sekaligus Release Decision pada Feature yang sama.',
        };
      case 'po':
        return {
          title: 'Product Owner (PO)',
          badgeText: 'Product Planning & Release Ownership',
          badgeColor: 'bg-purple-400/20 text-purple-300 border-purple-400/30',
          icon: CheckCircle2,
          deskRoute: '/my-tasks',
          deskLabel: 'Buka PO Release Desk',
          summary:
            'Anda bertanggung jawab atas perencanaan requirement (In/Out Scope, AC), pembagian subtask terarah ke developer, evaluasi kesiapan rilis, dan penerbitan Release Decision.',
          primaryActions: [
            'Tulis Specification Brief & tautkan Requirement',
            'Bagi subtask sesuai Developer Specialties',
            'Evaluasi Readiness Snapshot & terbitkan Release Decision',
          ],
          boundary:
            'Tidak mengeksekusi Test Runs, tidak menandatangani QA Sign-off, dan tidak dapat self-approve subtask sendiri.',
        };
      case 'dev':
        return {
          title: 'Developer (Frontend / Backend / Mobile / Fullstack)',
          badgeText: 'Technical Delivery & Quality Gate',
          badgeColor: 'bg-blue-400/20 text-blue-300 border-blue-400/30',
          icon: Code2,
          deskRoute: '/my-tasks',
          deskLabel: 'Buka Dev Working Desk',
          summary:
            'Ruang kerja utama Anda adalah Dev Working Desk di My Tasks. Fokus pada implementasi kode sesuai acceptance criteria, ajukan ke In Review, dan perbaiki Bug yang ditugaskan.',
          primaryActions: [
            'Eksekusi subtask: todo ➔ in_progress ➔ in_review',
            'Tulis technical handover notes saat submit review',
            'Perbaiki defect di antrean Bug Fixes dari hasil uji QA',
          ],
          boundary:
            'Anti Self-Approval: Developer dilarang memindahkan subtask sendiri ke DONE (wajib diverifikasi oleh QA).',
        };
      case 'qa':
        return {
          title: 'Quality Assurance (QA)',
          badgeText: 'Quality Gatekeeper & Sign-off Certification',
          badgeColor: 'bg-emerald-400/20 text-emerald-300 border-emerald-400/30',
          icon: TestTube,
          deskRoute: '/my-tasks',
          deskLabel: 'Buka QA Testing Desk',
          summary:
            'Pintu gerbang kualitas sistem. Anda berwenang mereview subtask developer, authoring test cases (Spreadsheet Intake), merekam test runs & evidence, retest bug, dan menerbitkan QA Sign-off.',
          primaryActions: [
            'Review subtask In Review (Approve ke DONE / Changes Requested)',
            'Import Test Case Spreadsheet Wizard (CSV / XLSX)',
            'Catat immutable Test Result, Evidence Links, & QA Sign-off',
          ],
          boundary:
            'Tidak dapat membuat Release Decision produk atau mengubah alokasi Requirement milik Planner.',
        };
      default:
        return {
          title: 'Qlick Hub Member',
          badgeText: 'Collaboration Workspace',
          badgeColor: 'bg-white/10 text-[#B1E743] border-white/20',
          icon: BookOpen,
          deskRoute: '/work',
          deskLabel: 'Buka Work Hub',
          summary:
            'Selamat datang di Qlick Hub. Pelajari panduan kolaborasi terintegrasi untuk mengoptimalkan alur kerja tim Anda.',
          primaryActions: ['Buka Work Hub', 'Buka My Tasks', 'Pelajari User Flow'],
          boundary: 'Ikuti batasan wewenang sesuai role yang ditetapkan di workspace Anda.',
        };
    }
  };

  const meta = getRoleMetadata();
  const RoleIcon = meta.icon;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-stone-900 via-[#1C1A19] to-stone-900 p-6 sm:p-8 text-white shadow-xl border border-stone-800">
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-72 h-72 bg-[#B1E743]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 -mb-12 w-56 h-56 bg-[#B1E743]/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-3 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-xs border ${meta.badgeColor}`}
            >
              <RoleIcon className="w-3.5 h-3.5" />
              <span>{meta.badgeText}</span>
            </span>
            <span className="text-xs text-stone-400">
              Halo, <strong className="text-white">{userName}</strong>
            </span>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <span>Panduan Interaktif: {meta.title}</span>
            </h1>
            <p className="text-sm text-stone-300 mt-1.5 leading-relaxed">{meta.summary}</p>
          </div>

          {/* Key Actions & Boundary Pills */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-stone-300 space-y-1">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-[#B1E743]" /> Fokus Utama Anda:
              </span>
              <ul className="list-disc pl-4 space-y-0.5 text-stone-300 text-[11px]">
                {meta.primaryActions.map((act, i) => (
                  <li key={i}>{act}</li>
                ))}
              </ul>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 space-y-1">
              <span className="font-bold text-amber-300 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" /> Hard Boundary (Governance):
              </span>
              <p className="text-[11px] leading-relaxed">{meta.boundary}</p>
            </div>
          </div>

          {/* Quick peer role switcher */}
          <div className="flex items-center gap-2 pt-1 text-xs text-stone-400">
            <span>Lihat panduan peran lain:</span>
            <button
              type="button"
              onClick={() => onSelectRoleView('owner_admin')}
              className="px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/20 text-white font-medium text-[11px] transition-colors"
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => onSelectRoleView('po')}
              className="px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/20 text-white font-medium text-[11px] transition-colors"
            >
              PO
            </button>
            <button
              type="button"
              onClick={() => onSelectRoleView('dev')}
              className="px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/20 text-white font-medium text-[11px] transition-colors"
            >
              Dev
            </button>
            <button
              type="button"
              onClick={() => onSelectRoleView('qa')}
              className="px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/20 text-white font-medium text-[11px] transition-colors"
            >
              QA
            </button>
          </div>
        </div>

        {/* Quick Action CTAs */}
        <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0">
          <Button
            variant="primary"
            size="md"
            onClick={() => navigate(meta.deskRoute)}
            rightIcon={<ArrowRight className="w-4 h-4" />}
            className="w-full justify-center font-bold"
          >
            {meta.deskLabel}
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
            onClick={onOpenOnboarding}
            leftIcon={<Sparkles className="w-4 h-4 text-amber-400" />}
            className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white"
          >
            Mulai Tur Onboarding
          </Button>
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   B. 01. PANDUAN APLIKASI & WORKFLOW SIMULATOR
   ========================================================================= */
const HowToUseSection: React.FC<{
  activeUserRole: FilterRole;
  onNavigateToSection: (section: MainSectionKey, role?: RoleKey) => void;
}> = ({ activeUserRole, onNavigateToSection }) => {
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
                Pusat pengorganisasian tugas tim. Menyajikan folder sprint, daftar parent task
                dikelompokkan status, serta drawer detail subtask, requirement, dan diskusi.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              onClick={() => navigate('/work')}
              className="w-full text-xs"
            >
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
                Ruang kerja terarah per-role. Menyajikan <strong>Dev Working Desk</strong>,{' '}
                <strong>QA Testing Desk</strong>, atau <strong>PO Planning Desk</strong> sesuai role
                login Anda.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              onClick={() => navigate('/my-tasks')}
              className="w-full text-xs"
            >
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
                <h3 className="font-bold text-sm text-stone-900 dark:text-white">
                  3. Report Dashboard
                </h3>
              </div>
              <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                Analitik visual kecepatan rilis, diagram status task, metrik prioritas, dan QA
                Traceability Matrix untuk audit kualitas.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              onClick={() => navigate('/reports')}
              className="w-full text-xs"
            >
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
                <h3 className="font-bold text-sm text-stone-900 dark:text-white">
                  4. Workspace Settings
                </h3>
              </div>
              <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                Pengaturan workspace, kelola member & spesialisasi Dev (FE/BE/Mobile/Fullstack),
                aturan permission, dan sesi login aktif.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              onClick={() => navigate('/workspaces/settings')}
              className="w-full text-xs"
            >
              Buka Settings
            </Button>
          </div>
        </div>
      </Card>

      {/* 2. Panduan Langkah demi Langkah Interaktif (Interactive Workflow Simulator) */}
      <InteractiveGuideSimulator activeUserRole={activeUserRole} />

      {/* 3. Kolaborasi & Fitur Pendukung */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 border-stone-200/80 dark:border-stone-800 dark:bg-[#1C1A19] space-y-2.5">
          <div className="flex items-center gap-2 text-stone-900 dark:text-white font-bold text-sm">
            <MessageSquare className="w-4 h-4 text-[#141413] dark:text-[#B1E743]" />
            <span>Discussion & Realtime Events</span>
          </div>
          <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
            Gunakan tab <strong>Discussion</strong> di dalam Drawer untuk bertukar pesan dengan tim
            secara real-time melalui koneksi SSE dengan notifikasi unread badge.
          </p>
        </Card>

        <Card className="p-5 border-stone-200/80 dark:border-stone-800 dark:bg-[#1C1A19] space-y-2.5">
          <div className="flex items-center gap-2 text-stone-900 dark:text-white font-bold text-sm">
            <ShieldCheck className="w-4 h-4 text-amber-500" />
            <span>Immutable Audit Trail</span>
          </div>
          <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
            Setiap perpindahan status, QA Sign-off, dan Release Decision tercatat permanen di tab{' '}
            <strong>Activity</strong> sebagai bukti audit yang aman dari manipulasi.
          </p>
        </Card>

        <Card className="p-5 border-stone-200/80 dark:border-stone-800 dark:bg-[#1C1A19] space-y-2.5">
          <div className="flex items-center gap-2 text-stone-900 dark:text-white font-bold text-sm">
            <Lightbulb className="w-4 h-4 text-[#B1E743]" />
            <span>Developer Specialties (ADR-002)</span>
          </div>
          <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
            Penugasan subtask divalidasi ketat terhadap keahlian Frontend, Backend, Mobile, atau
            Fullstack untuk menjamin eksekusi teknis yang akuntabel.
          </p>
        </Card>
      </div>

      {/* Navigasi Lanjutan ke E2E Overview dan User Flow */}
      <div className="p-4 rounded-xl bg-stone-100 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs text-stone-600 dark:text-stone-400">
          Lanjutkan membaca gambaran siklus atau alur kerja peran spesifik:
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onNavigateToSection('overview')}
            className="text-xs"
          >
            2. E2E Overview
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onNavigateToSection('user_flow', 'po')}
            className="text-xs"
          >
            Flow PO
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onNavigateToSection('user_flow', 'dev')}
            className="text-xs"
          >
            Flow Dev
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onNavigateToSection('user_flow', 'qa')}
            className="text-xs"
          >
            Flow QA
          </Button>
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   C. 02. E2E OVERVIEW & RBAC MATRIX (5-PHASE LIFECYCLE)
   ========================================================================= */
const OverviewFlowSection: React.FC<{
  onSelectRole: (role: RoleKey) => void;
}> = ({ onSelectRole }) => {
  return (
    <div className="space-y-6">
      {/* 1. 5-Phase Lifecycle Breakdown */}
      <Card className="p-6 border-stone-200/80 dark:border-stone-800 dark:bg-[#1C1A19] space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#B1E743]/20 text-[#141413] dark:bg-stone-800 dark:text-[#B1E743]">
              <Sparkles className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-stone-900 dark:text-white">
              Siklus Lengkap Kolaborasi Tim (End-to-End 5-Phase Lifecycle)
            </h2>
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Alur kerja terintegrasi dari pembentukan tim hingga keputusan rilis produk resmi.
          </p>
        </div>

        {/* 5 Phase Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {/* Phase 1 */}
          <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200/80 dark:border-stone-800 space-y-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
              FASE 1
            </span>
            <h3 className="font-bold text-sm text-stone-900 dark:text-white">Governance</h3>
            <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
              Owner/Admin setup workspace, undang member, & tetapkan Developer Specialties
              (ADR-002).
            </p>
          </div>

          {/* Phase 2 */}
          <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200/80 dark:border-stone-800 space-y-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300">
              FASE 2
            </span>
            <h3 className="font-bold text-sm text-stone-900 dark:text-white">Product Planning</h3>
            <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
              PO tulis Specification Brief (In/Out Scope, AC), buat Test Cases, & pecah subtask.
            </p>
          </div>

          {/* Phase 3 */}
          <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200/80 dark:border-stone-800 space-y-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
              FASE 3
            </span>
            <h3 className="font-bold text-sm text-stone-900 dark:text-white">Dev Execution</h3>
            <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
              Dev kerjakan subtask di My Tasks, tulis handover notes, & ajukan ke IN REVIEW.
            </p>
          </div>

          {/* Phase 4 */}
          <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200/80 dark:border-stone-800 space-y-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
              FASE 4
            </span>
            <h3 className="font-bold text-sm text-stone-900 dark:text-white">QA Verification</h3>
            <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
              QA uji subtask, rekam Test Runs & Evidence, kelola Bug, dan terbitkan QA Sign-off.
            </p>
          </div>

          {/* Phase 5 */}
          <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200/80 dark:border-stone-800 space-y-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300">
              FASE 5
            </span>
            <h3 className="font-bold text-sm text-stone-900 dark:text-white">Release Decision</h3>
            <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
              PO evaluasi readiness snapshot, terbitkan Release Decision, & tutup Feature resmi.
            </p>
          </div>
        </div>
      </Card>

      {/* 2. RBAC & Governance Matrix Table */}
      <Card className="p-6 border-stone-200/80 dark:border-stone-800 dark:bg-[#1C1A19] space-y-4">
        <div>
          <h3 className="text-base font-bold text-stone-900 dark:text-white">
            Matriks Peran & Hak Akses (RBAC Governance Matrix)
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Penegakan otoritas server-side mutlak berdasarkan ADR-001 & ADR-002.
          </p>
        </div>

        <div className="overflow-x-auto border border-stone-200 dark:border-stone-800 rounded-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-stone-100 dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 font-bold">
                <th className="p-3">Fitur / Aksi Operasional</th>
                <th className="p-3 text-center">Owner</th>
                <th className="p-3 text-center">Admin</th>
                <th className="p-3 text-center">PO</th>
                <th className="p-3 text-center">Developer</th>
                <th className="p-3 text-center">QA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 dark:divide-stone-800 text-stone-700 dark:text-stone-300">
              <tr>
                <td className="p-3 font-semibold">Workspace & Member Governance</td>
                <td className="p-3 text-center font-bold text-emerald-600">Full</td>
                <td className="p-3 text-center font-bold text-emerald-600">Full</td>
                <td className="p-3 text-center text-stone-400">-</td>
                <td className="p-3 text-center text-stone-400">-</td>
                <td className="p-3 text-center text-stone-400">-</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold">Folder & Task Planning (Parent Feature)</td>
                <td className="p-3 text-center text-emerald-600">Ya</td>
                <td className="p-3 text-center text-emerald-600">Ya</td>
                <td className="p-3 text-center font-bold text-emerald-600">Utama</td>
                <td className="p-3 text-center text-stone-400">Izin Khusus</td>
                <td className="p-3 text-center text-stone-400">Izin Khusus</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold">Subtask Planning & Dev Specialties Assign</td>
                <td className="p-3 text-center text-emerald-600">Ya</td>
                <td className="p-3 text-center text-emerald-600">Ya</td>
                <td className="p-3 text-center font-bold text-emerald-600">Utama</td>
                <td className="p-3 text-center text-rose-500 font-bold">Dilarang</td>
                <td className="p-3 text-center text-rose-500 font-bold">Dilarang</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold">Eksekusi Subtask Dev (todo ➔ in_review)</td>
                <td className="p-3 text-center text-stone-400">-</td>
                <td className="p-3 text-center text-stone-400">-</td>
                <td className="p-3 text-center text-stone-400">-</td>
                <td className="p-3 text-center font-bold text-emerald-600">Utama</td>
                <td className="p-3 text-center text-stone-400">-</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold">Review & Approval Subtask (ke DONE)</td>
                <td className="p-3 text-center text-emerald-600">Ya</td>
                <td className="p-3 text-center text-emerald-600">Ya</td>
                <td className="p-3 text-center text-emerald-600">Ya</td>
                <td className="p-3 text-center text-rose-500 font-bold">Locked (Gate)</td>
                <td className="p-3 text-center font-bold text-emerald-600">Utama</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold">Spreadsheet Intake & Test Runs Evidence</td>
                <td className="p-3 text-center text-emerald-600">Ya</td>
                <td className="p-3 text-center text-emerald-600">Ya</td>
                <td className="p-3 text-center text-emerald-600">Import TC</td>
                <td className="p-3 text-center text-stone-400">-</td>
                <td className="p-3 text-center font-bold text-emerald-600">Utama</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold">QA Sign-off Certification</td>
                <td className="p-3 text-center text-amber-600 font-semibold">Segregated</td>
                <td className="p-3 text-center text-amber-600 font-semibold">Segregated</td>
                <td className="p-3 text-center text-rose-500 font-bold">Dilarang</td>
                <td className="p-3 text-center text-rose-500 font-bold">Dilarang</td>
                <td className="p-3 text-center font-bold text-emerald-600">Utama</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold">Release Decision & Parent Feature Done</td>
                <td className="p-3 text-center text-amber-600 font-semibold">Segregated</td>
                <td className="p-3 text-center text-amber-600 font-semibold">Segregated</td>
                <td className="p-3 text-center font-bold text-emerald-600">Utama</td>
                <td className="p-3 text-center text-rose-500 font-bold">Dilarang</td>
                <td className="p-3 text-center text-rose-500 font-bold">Dilarang</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Deep-dive role shortcuts */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-stone-200 dark:border-stone-800 text-xs">
          <span className="text-stone-500 dark:text-stone-400">
            Pelajari panduan mendalam untuk peran:
          </span>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onSelectRole('owner_admin')}
              className="text-xs"
            >
              Owner & Admin
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onSelectRole('po')}
              className="text-xs"
            >
              Product Owner
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onSelectRole('dev')}
              className="text-xs"
            >
              Developer
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onSelectRole('qa')}
              className="text-xs"
            >
              QA Engineer
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

/* =========================================================================
   D. 03. ALUR KERJA SPESIFIK PER ROLE (USER FLOW SECTION)
   ========================================================================= */
const UserFlowSection: React.FC<{
  activeRole: RoleKey;
  onSelectRole: (role: RoleKey) => void;
}> = ({ activeRole, onSelectRole }) => {
  const navigate = useNavigate();

  const roleTabs: {
    key: RoleKey;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { key: 'owner_admin', label: 'Owner & Admin', icon: ShieldCheck },
    { key: 'po', label: 'Product Owner (PO)', icon: CheckCircle2 },
    { key: 'dev', label: 'Developer (Dev)', icon: Code2 },
    { key: 'qa', label: 'Quality Assurance (QA)', icon: TestTube },
  ];

  return (
    <div className="space-y-6">
      {/* Role Switcher Pills */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-stone-100 dark:bg-stone-900/60 rounded-2xl border border-stone-200/80 dark:border-stone-800">
        {roleTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeRole === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onSelectRole(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
                isActive
                  ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-sm ring-2 ring-[#B1E743]/30'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-white/60 dark:hover:bg-stone-800/50'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#B1E743]' : 'text-stone-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Role Details */}
      {activeRole === 'owner_admin' && (
        <Card className="p-6 border-stone-200/80 dark:border-stone-800 dark:bg-[#1C1A19] space-y-5">
          <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-stone-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-500" />
                Alur Kerja: Owner & Workspace Admin
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                Governance, akuntabilitas keanggotaan, spesialisasi developer, dan eskalasi rilis.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/workspaces/settings')}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              Buka Settings
            </Button>
          </div>

          <div className="space-y-3 text-xs text-stone-700 dark:text-stone-300">
            <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 space-y-1.5">
              <span className="font-bold text-stone-900 dark:text-white">
                1. Manajemen Keanggotaan & Developer Specialties (ADR-002)
              </span>
              <p className="text-[11px] leading-relaxed">
                Saat mengundang atau mengedit developer, tetapkan klasifikasi spesialisasi:
                Frontend, Backend, Mobile, dan/atau Fullstack. Penugasan subtask teknis akan
                divalidasi terhadap data spesialisasi ini.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 space-y-1.5">
              <span className="font-bold text-stone-900 dark:text-white">
                2. Kebijakan Task Creation & Hak Akses
              </span>
              <p className="text-[11px] leading-relaxed">
                Atur toggle <code>allowQaTaskCreation</code> jika QA diizinkan membuat Parent Task.
                Namun izin ini tidak pernah memberikan hak untuk memecah/mengubah subtask planner.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 space-y-1.5">
              <span className="font-bold text-stone-900 dark:text-white">
                3. Override Spesialisasi Dev (Owner-Only Audit)
              </span>
              <p className="text-[11px] leading-relaxed">
                Jika situasi darurat memerlukan penugasan di luar spesialisasi, hanya Owner yang
                dapat melakukan override dengan menyertakan alasan audit 10-500 karakter.
              </p>
            </div>
          </div>
        </Card>
      )}

      {activeRole === 'po' && (
        <Card className="p-6 border-stone-200/80 dark:border-stone-800 dark:bg-[#1C1A19] space-y-5">
          <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-stone-900 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-purple-500" />
                Alur Kerja: Product Owner (PO)
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                Perencanaan spesifikasi, alokasi tugas terarah, dan verifikasi keputusan rilis.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/work')}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              Buka Work Hub
            </Button>
          </div>

          <div className="space-y-3 text-xs text-stone-700 dark:text-stone-300">
            <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 space-y-1.5">
              <span className="font-bold text-stone-900 dark:text-white">
                1. Penulisan Specification Brief & Requirement Linking
              </span>
              <p className="text-[11px] leading-relaxed">
                Tuliskan ruang lingkup (In Scope, Out Scope, Acceptance Criteria) di tab Specs &
                Requirements. Tautkan link Figma/PRD untuk ketertelusuran tim penguji.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 space-y-1.5">
              <span className="font-bold text-stone-900 dark:text-white">
                2. Pemecahan Subtask Sesuai Developer Specialties
              </span>
              <p className="text-[11px] leading-relaxed">
                Pecah Feature menjadi subtask Frontend, Backend, Mobile, Fullstack, dan QA. Pilih
                assignee yang spesialisasi terdaftarnya sesuai dengan deliverable.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 space-y-1.5">
              <span className="font-bold text-stone-900 dark:text-white">
                3. Penerbitan Release Decision & Penutupan Parent Feature
              </span>
              <p className="text-[11px] leading-relaxed">
                Setelah QA memberikan QA Sign-off (Approved), buka Release Decision Desk untuk
                menyetujui rilis produksi, lalu tandai Parent Task menjadi DONE secara sadar.
              </p>
            </div>
          </div>
        </Card>
      )}

      {activeRole === 'dev' && (
        <Card className="p-6 border-stone-200/80 dark:border-stone-800 dark:bg-[#1C1A19] space-y-5">
          <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-stone-900 dark:text-white flex items-center gap-2">
                <Code2 className="w-5 h-5 text-blue-500" />
                Alur Kerja: Developer (Dev)
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                Eksekusi subtask teknis, penegakan anti self-approval gate, dan perbaikan bug.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/my-tasks')}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              Buka Dev Working Desk
            </Button>
          </div>

          <div className="space-y-3 text-xs text-stone-700 dark:text-stone-300">
            <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 space-y-1.5">
              <span className="font-bold text-stone-900 dark:text-white">
                1. Transisi Status Subtask: todo ➔ in_progress ➔ in_review
              </span>
              <p className="text-[11px] leading-relaxed">
                Ambil tugas dari antrean Assigned Work di My Tasks. Saat coding, ubah ke IN
                PROGRESS. Setelah deployed ke staging, ajukan ke IN REVIEW beserta catatan teknis.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 space-y-1.5">
              <span className="font-bold text-stone-900 dark:text-white">
                2. Penegakan Anti Self-Approval Guardrail
              </span>
              <p className="text-[11px] leading-relaxed">
                Developer dilarang menandai subtask miliknya sendiri menjadi DONE. Subtask hanya
                bisa dipindahkan ke DONE oleh QA setelah lulus uji acceptance criteria.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 space-y-1.5">
              <span className="font-bold text-stone-900 dark:text-white">
                3. Penanganan Bug Fixes dari Hasil Uji QA
              </span>
              <p className="text-[11px] leading-relaxed">
                Periksa antrean Bug Fixes. Pelajari evidence screenshot/video dari Test Result QA,
                perbaiki kodenya, lalu ubah status Bug menjadi RESOLVED untuk retest independen.
              </p>
            </div>
          </div>
        </Card>
      )}

      {activeRole === 'qa' && (
        <Card className="p-6 border-stone-200/80 dark:border-stone-800 dark:bg-[#1C1A19] space-y-5">
          <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-stone-900 dark:text-white flex items-center gap-2">
                <TestTube className="w-5 h-5 text-emerald-500" />
                Alur Kerja: Quality Assurance (QA)
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                Pintu gerbang kualitas, import spreadsheet test cases, immutable test results & QA
                Sign-off.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/my-tasks')}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              Buka QA Testing Desk
            </Button>
          </div>

          <div className="space-y-3 text-xs text-stone-700 dark:text-stone-300">
            <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 space-y-1.5">
              <span className="font-bold text-stone-900 dark:text-white">
                1. Review Subtask In Review & Penegakan Acceptance Criteria
              </span>
              <p className="text-[11px] leading-relaxed">
                Uji deliverable developer di staging. Jika lolos, approve ke DONE. Jika ditemukan
                cacat, kembalikan ke CHANGES REQUESTED dengan review notes wajib.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 space-y-1.5">
              <span className="font-bold text-stone-900 dark:text-white">
                2. Spreadsheet Intake Wizard (CSV/XLSX) & Formal Evidence Links
              </span>
              <p className="text-[11px] leading-relaxed">
                Impor file test case massal dengan wizard multi-sheet dan pemetaan kolom. Saat
                eksekusi Test Run, lampirkan evidence link dengan in-app zoom/pan preview.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 space-y-1.5">
              <span className="font-bold text-stone-900 dark:text-white">
                3. Retest Independen Bug & Penerbitan QA Sign-off
              </span>
              <p className="text-[11px] leading-relaxed">
                Uji kembali bug berstatus RESOLVED. Jika bersih, tandai VERIFIED (CLOSED). Terbitkan
                QA Sign-off resmi setelah seluruh kriteria release readiness terpenuhi 100%.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
