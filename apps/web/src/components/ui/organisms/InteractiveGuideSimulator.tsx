import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderPlus,
  FileText,
  GitCommit,
  Code2,
  TestTube,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  Lock,
  CheckSquare,
  PlayCircle,
  LayoutGrid,
  Check,
  ExternalLink,
  Lightbulb,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Plus,
} from 'lucide-react';
import { Card } from '../atoms/Card';
import { Badge } from '../atoms/Badge';
import { Button } from '../atoms/Button';
import { TaskStatusBadge } from '../molecules/TaskStatusBadge';

export type GuideId = 'folder' | 'parent_task' | 'subtasks' | 'dev_flow' | 'qa_review' | 'po_acceptance';
export type FilterRole = 'all' | 'po' | 'dev' | 'qa' | 'admin';
export type ViewMode = 'simulator' | 'roadmap';

interface StepDetail {
  title: string;
  shortDesc: string;
  instruction: string;
  tip?: string;
}

interface GuideItem {
  id: GuideId;
  title: string;
  subtitle: string;
  roles: FilterRole[];
  roleBadge: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  targetRoute: string;
  targetRouteLabel: string;
  steps: StepDetail[];
}

const GUIDES: GuideItem[] = [
  {
    id: 'folder',
    title: '1. Membuat Folder Sprint / Kategori',
    subtitle: 'Strukturkan deliverable tim dalam sprint atau modul terorganisir.',
    roles: ['po', 'admin'],
    roleBadge: 'PO / Admin',
    icon: FolderPlus,
    color: 'indigo',
    targetRoute: '/work',
    targetRouteLabel: 'Buka Work Hub',
    steps: [
      {
        title: 'Buka Menu Work Hub',
        shortDesc: 'Akses halaman utama manajemen kerja tim.',
        instruction: 'Navigasikan ke menu Work Hub di sidebar atas/kiri untuk melihat struktur folder sprint dan backlog kerja tim.',
      },
      {
        title: 'Klik Tombol "+ New Folder"',
        shortDesc: 'Picu modal pembuatan folder baru pada panel kiri.',
        instruction: 'Pada bagian header panel Folders, klik tombol "+" untuk menambahkan folder sprint atau kategori baru.',
      },
      {
        title: 'Beri Nama Folder & Simpan',
        shortDesc: 'Masukkan nama sprint/modul (Maks. 2 level kedalaman).',
        instruction: 'Ketikkan nama deskriptif seperti "Sprint 14 - Checkout & Payment", lalu klik Simpan.',
        tip: 'Struktur folder dibatasi maksimal 2 tingkat kedalaman agar tim tetap fokus dan rapi.',
      },
      {
        title: 'Folder Siap Digunakan',
        shortDesc: 'Folder aktif terpilih dan siap diisi parent task.',
        instruction: 'Klik folder yang baru dibuat di panel kiri untuk mulai menambahkan Parent Task fitur.',
      },
    ],
  },
  {
    id: 'parent_task',
    title: '2. Membuat Parent Task Fitur Utama',
    subtitle: 'Daftarkan deliverable fitur utama lengkap dengan requirement PRD.',
    roles: ['po', 'admin'],
    roleBadge: 'PO / Admin',
    icon: FileText,
    color: 'indigo',
    targetRoute: '/work',
    targetRouteLabel: 'Buka Work Hub',
    steps: [
      {
        title: 'Pilih Folder Tujuan',
        shortDesc: 'Tentukan sprint atau modul yang akan menaungi task.',
        instruction: 'Pastikan Anda telah mengklik folder sprint yang sesuai pada panel kiri Work Hub.',
      },
      {
        title: 'Klik "+ Create Task"',
        shortDesc: 'Buka formulir pembuatan parent task baru.',
        instruction: 'Klik tombol "+ Create Task" di sudut kanan atas daftar task untuk membuka modal pembuatan task.',
      },
      {
        title: 'Lengkapi Form & Prioritas & Link PRD',
        shortDesc: 'Isi judul, prioritas, estimasi waktu, dan tautan PRD/Figma.',
        instruction: 'Tentukan prioritas (P0/P1/P2/P3), estimasi tanggal, dan masukkan link dokumen requirement agar tim memiliki konteks lengkap.',
        tip: 'Menautkan link PRD/Figma mempermudah QA dan Developer saat verifikasi pengujian.',
      },
      {
        title: 'Task Muncul di Kolom Backlog',
        shortDesc: 'Parent task baru siap dipecah menjadi subtask.',
        instruction: 'Klik "Create Task". Task akan langsung muncul di daftar dalam status TODO (Backlog).',
      },
    ],
  },
  {
    id: 'subtasks',
    title: '3. Memecah Subtask (FE, BE, QA)',
    subtitle: 'Distribusikan pengerjaan teknis secara akuntabel ke anggota tim.',
    roles: ['po', 'admin'],
    roleBadge: 'PO / Admin',
    icon: GitCommit,
    color: 'indigo',
    targetRoute: '/work',
    targetRouteLabel: 'Buka Work Hub',
    steps: [
      {
        title: 'Buka Task Detail Drawer',
        shortDesc: 'Klik baris parent task di Work Hub.',
        instruction: 'Klik pada salah satu parent task untuk membuka drawer detail di sisi kanan layar.',
      },
      {
        title: 'Pilih Tab "Subtasks"',
        shortDesc: 'Akses area pengelolaan subtask teknis.',
        instruction: 'Di dalam drawer, klik tab "Subtasks" lalu tekan tombol "+ Add Subtask".',
      },
      {
        title: 'Pilih Area Kerja (FE / BE / QA) & Assignee',
        shortDesc: 'Tugaskan subtask terarah ke anggota tim.',
        instruction: 'Pilih area pengerjaan: Frontend (FE), Backend (BE), atau QA Verification, lalu pilih anggota tim yang bertanggung jawab.',
        tip: 'Setiap parent task idealnya memiliki kombinasi subtask FE, BE, dan QA agar deliverable teruji tuntas.',
      },
      {
        title: 'Progress Tracker Terbentuk',
        shortDesc: 'Header parent task menampilkan counter progress terperinci.',
        instruction: 'Sistem otomatis menampilkan kalkulasi progress deliverable seperti: FE 0/1 · BE 0/1 · QA 0/1.',
      },
    ],
  },
  {
    id: 'dev_flow',
    title: '4. Developer: Eksekusi & Ajukan Review',
    subtitle: 'Fokus pengerjaan subtask di My Tasks dan penegakan Quality Gate.',
    roles: ['dev'],
    roleBadge: 'Developer',
    icon: Code2,
    color: 'blue',
    targetRoute: '/my-tasks',
    targetRouteLabel: 'Buka My Tasks',
    steps: [
      {
        title: 'Terima Tugas di "My Tasks"',
        shortDesc: 'Lihat daftar tugas yang di-assign khusus untuk Anda.',
        instruction: 'Buka menu My Tasks. Subtask yang baru Anda terima akan berstatus TODO.',
      },
      {
        title: 'Mulai Coding: Ubah ke "IN PROGRESS"',
        shortDesc: 'Beri sinyal ke tim bahwa task sedang aktif dikerjakan.',
        instruction: 'Klik dropdown status pada baris subtask Anda dan pilih "IN PROGRESS" saat mulai menulis kode.',
      },
      {
        title: 'Selesai Coding: Ajukan ke "IN REVIEW"',
        shortDesc: 'Picu proses review dan pengujian oleh tim QA.',
        instruction: 'Setelah pull request siap dan deployed ke environment staging, ubah status ke "IN REVIEW".',
      },
      {
        title: 'Quality Gate: Anti Self-Approval Guardrail',
        shortDesc: 'Dev dilarang menyelesaikan subtask sendiri ke "DONE".',
        instruction: 'Sistem secara otomatis mengunci status DONE untuk Developer. Subtask hanya bisa dipindahkan ke DONE oleh QA/PO.',
        tip: 'Jika QA meminta perbaikan (Changes Requested), baca catatan pada tab Activity/Review Notes, perbaiki kode, lalu ajukan ulang ke In Review.',
      },
    ],
  },
  {
    id: 'qa_review',
    title: '5. QA: Review, Review Notes & Approval',
    subtitle: 'Pintu gerbang kualitas: validasi acceptance criteria sebelum rilis.',
    roles: ['qa'],
    roleBadge: 'QA',
    icon: TestTube,
    color: 'emerald',
    targetRoute: '/work',
    targetRouteLabel: 'Buka Work Hub',
    steps: [
      {
        title: 'Temukan Subtask "IN REVIEW"',
        shortDesc: 'Pantau subtask Developer yang siap diuji di Work Hub.',
        instruction: 'Buka drawer task yang memiliki subtask berstatus IN REVIEW untuk memulai proses verifikasi.',
      },
      {
        title: 'Skenario A: Bug / Isu Ditemukan (Changes Requested)',
        shortDesc: 'Minta revisi dengan melampirkan catatan temuan bug yang jelas.',
        instruction: 'Jika pengujian gagal, ubah status ke "CHANGES REQUESTED" dan tuliskan deskripsi bug pada modal Review Notes.',
      },
      {
        title: 'Skenario B: Lolos Uji (Approve ke DONE)',
        shortDesc: 'Setujui hasil kerja Developer yang telah memenuhi kriteria.',
        instruction: 'Jika seluruh acceptance criteria lolos pengujian, ubah status subtask Dev menjadi "DONE".',
      },
      {
        title: 'Eksekusi Subtask QA Mandiri',
        shortDesc: 'Jalankan uji regresi atau automation testing penutup.',
        instruction: 'Setelah subtask FE & BE selesai, kerjakan subtask QA mandiri (Test Automation/Regression) lalu pindahkan ke "DONE".',
        tip: 'Ketika semua subtask selesai, progress parent task akan mencapai 100%.',
      },
    ],
  },
  {
    id: 'po_acceptance',
    title: '6. PO: Verifikasi Akhir (Explicit Acceptance)',
    subtitle: 'Penutupan resmi Parent Task oleh Product Owner setelah semua tuntas.',
    roles: ['po', 'admin'],
    roleBadge: 'Product Owner',
    icon: CheckCircle2,
    color: 'purple',
    targetRoute: '/work',
    targetRouteLabel: 'Buka Work Hub',
    steps: [
      {
        title: 'Periksa Ringkasan Progress Subtask',
        shortDesc: 'Pastikan indikator deliverable tercentang sempurna.',
        instruction: 'Periksa header Parent Task di Work Hub. Pastikan indikator menunjukkan FE 1/1 · BE 1/1 · QA 1/1 (100% Selesai).',
      },
      {
        title: 'Validasi Kriteria Deliverable Akhir',
        shortDesc: 'Uji keseluruhan fitur dari sudut pandang pengguna akhir.',
        instruction: 'Product Owner memverifikasi bahwa deliverable sesuai dengan ekspektasi produk pada requirement.',
      },
      {
        title: 'Prinsip Explicit Parent Completion',
        shortDesc: 'Sistem tidak menutup parent task secara otomatis.',
        instruction: 'Penutupan parent task memerlukan aksi sadar dari PO dengan mengklik status Parent Task menjadi "DONE".',
        tip: 'Ini mencegah task tertutup tanpa sepengetahuan Product Owner.',
      },
      {
        title: 'Fitur Selesai & Tercatat di Report',
        shortDesc: 'Task masuk ke laporan analitik rilis dan audit log.',
        instruction: 'Parent task resmi selesai (DONE). Metrik produktivitas dan QA Traceability Matrix terbarui secara real-time.',
      },
    ],
  },
];

export const InteractiveGuideSimulator: React.FC = () => {
  const navigate = useNavigate();

  // State Management
  const [selectedGuideId, setSelectedGuideId] = useState<GuideId>('folder');
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [roleFilter, setRoleFilter] = useState<FilterRole>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('simulator');

  // Interactive Live Simulation States for Try-It Playground
  // 1. Folder Simulator State
  const [simFolderInput, setSimFolderInput] = useState<string>('Sprint 14 - Checkout & Payment');
  const [simShowFolderModal, setSimShowFolderModal] = useState<boolean>(false);
  const [simFolders, setSimFolders] = useState<Array<{ id: string; name: string; count: number; children?: string[] }>>([
    { id: '1', name: 'Sprint 12 - Onboarding', count: 4 },
    { id: '2', name: 'Sprint 13 - Authentication', count: 6, children: ['FE Pages', 'BE Endpoints'] },
  ]);

  // 2. Parent Task Simulator State
  const [simTaskTitle, setSimTaskTitle] = useState<string>('Integrasi Payment Gateway Midtrans');
  const [simTaskPriority, setSimTaskPriority] = useState<'P0' | 'P1' | 'P2' | 'P3'>('P1');
  const [simTaskReqUrl, setSimTaskReqUrl] = useState<string>('https://docs.google.com/document/d/prd-midtrans-v2');
  const [simCreatedTasks, setSimCreatedTasks] = useState<Array<{ id: string; title: string; priority: string; status: string }>>([
    { id: '101', title: 'Setup Database Migration & Indexes', priority: 'P1', status: 'done' },
    { id: '102', title: 'Webhook Signature Security Handler', priority: 'P0', status: 'in_progress' },
  ]);

  // 3. Subtask Simulator State
  const [simSubtasks, setSimSubtasks] = useState<
    Array<{ id: string; title: string; area: 'FE' | 'BE' | 'QA'; assignee: string; status: string; avatar: string }>
  >([
    { id: '1', title: 'Implementasi UI Form Checkout & Payment Method', area: 'FE', assignee: 'Alex Pratama', status: 'done', avatar: 'AP' },
    { id: '2', title: 'API Endpoint /payments/charge & Webhook Verification', area: 'BE', assignee: 'Budi Santoso', status: 'in_review', avatar: 'BS' },
  ]);

  // 4. Developer Simulator State
  const [simDevStatus, setSimDevStatus] = useState<'todo' | 'in_progress' | 'in_review' | 'done'>('todo');
  const [simShowDevBlockModal, setSimShowDevBlockModal] = useState<boolean>(false);

  // 5. QA Simulator State
  const [simQaDecision, setSimQaDecision] = useState<'idle' | 'changes_requested' | 'done'>('idle');
  const [simQaReviewNote, setSimQaReviewNote] = useState<string>(
    'Validasi response error HTTP 400 belum memunculkan snackbar peringatan ke user.'
  );

  // 6. PO Completion Simulator State
  const [simPoParentStatus, setSimPoParentStatus] = useState<'in_progress' | 'done'>('in_progress');

  const currentGuide = GUIDES.find((g) => g.id === selectedGuideId) || GUIDES[0];
  const currentStep = currentGuide.steps[activeStepIndex] || currentGuide.steps[0];
  const totalSteps = currentGuide.steps.length;

  const filteredGuides = GUIDES.filter((g) => {
    if (roleFilter === 'all') return true;
    return g.roles.includes(roleFilter);
  });

  const handleSelectGuide = (id: GuideId) => {
    setSelectedGuideId(id);
    setActiveStepIndex(0);
    setSimShowDevBlockModal(false);
  };

  const handleNextStep = () => {
    if (activeStepIndex < totalSteps - 1) {
      setActiveStepIndex((prev) => prev + 1);
    }
  };

  const handlePrevStep = () => {
    if (activeStepIndex > 0) {
      setActiveStepIndex((prev) => prev - 1);
    }
  };

  const handleResetSimulation = () => {
    setActiveStepIndex(0);
    setSimFolders([
      { id: '1', name: 'Sprint 12 - Onboarding', count: 4 },
      { id: '2', name: 'Sprint 13 - Authentication', count: 6, children: ['FE Pages', 'BE Endpoints'] },
    ]);
    setSimCreatedTasks([
      { id: '101', title: 'Setup Database Migration & Indexes', priority: 'P1', status: 'done' },
      { id: '102', title: 'Webhook Signature Security Handler', priority: 'P0', status: 'in_progress' },
    ]);
    setSimSubtasks([
      { id: '1', title: 'Implementasi UI Form Checkout & Payment Method', area: 'FE', assignee: 'Alex Pratama', status: 'done', avatar: 'AP' },
      { id: '2', title: 'API Endpoint /payments/charge & Webhook Verification', area: 'BE', assignee: 'Budi Santoso', status: 'in_review', avatar: 'BS' },
    ]);
    setSimDevStatus('todo');
    setSimShowDevBlockModal(false);
    setSimQaDecision('idle');
    setSimPoParentStatus('in_progress');
    setSimShowFolderModal(false);
  };

  // Handlers for Interactive Playgrounds
  const handleAddFolderSim = () => {
    if (simFolderInput.trim()) {
      setSimFolders((prev) => [
        ...prev,
        { id: String(Date.now()), name: simFolderInput.trim(), count: 0 },
      ]);
      setSimShowFolderModal(false);
      if (activeStepIndex === 2) {
        setActiveStepIndex(3);
      }
    }
  };

  const handleCreateTaskSim = () => {
    if (simTaskTitle.trim()) {
      setSimCreatedTasks((prev) => [
        ...prev,
        { id: String(Date.now()), title: simTaskTitle.trim(), priority: simTaskPriority, status: 'todo' },
      ]);
      if (activeStepIndex === 2) {
        setActiveStepIndex(3);
      }
    }
  };

  const handleAddQaSubtaskSim = () => {
    if (!simSubtasks.some((s) => s.area === 'QA')) {
      setSimSubtasks((prev) => [
        ...prev,
        {
          id: '3',
          title: 'Uji E2E Alur Pembayaran & Validasi Error Handling',
          area: 'QA',
          assignee: 'Citra Kirana',
          status: 'todo',
          avatar: 'CK',
        },
      ]);
      if (activeStepIndex === 2) {
        setActiveStepIndex(3);
      }
    }
  };

  const handleDevStatusChange = (newStatus: 'todo' | 'in_progress' | 'in_review' | 'done') => {
    if (newStatus === 'done') {
      setSimShowDevBlockModal(true);
      setActiveStepIndex(3);
      return;
    }
    setSimShowDevBlockModal(false);
    setSimDevStatus(newStatus);
    if (newStatus === 'in_progress' && activeStepIndex === 0) {
      setActiveStepIndex(1);
    } else if (newStatus === 'in_review' && activeStepIndex === 1) {
      setActiveStepIndex(2);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Header Card */}
      <Card className="p-5 border-stone-200/80 dark:border-stone-800 dark:bg-[#1C1A19]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-[#B1E743]">
                <PlayCircle className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-bold text-stone-900 dark:text-white">
                Interactive Feature Workflow Simulator
              </h2>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Visualisasi alur kerja nyata dengan simulator interaktif. Pilih panduan di bawah untuk mencoba langkah dan simulasi antarmuka secara langsung.
            </p>
          </div>

          {/* View Mode & Role Filter Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Switcher */}
            <div className="flex items-center bg-stone-100 dark:bg-stone-900 p-1 rounded-xl border border-stone-200/70 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setViewMode('simulator')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'simulator'
                    ? 'bg-white dark:bg-[#22201F] text-stone-900 dark:text-white shadow-xs'
                    : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
                }`}
              >
                <PlayCircle className="w-3.5 h-3.5" />
                <span>Simulator</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('roadmap')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'roadmap'
                    ? 'bg-white dark:bg-[#22201F] text-stone-900 dark:text-white shadow-xs'
                    : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Semua Alur</span>
              </button>
            </div>

            {/* Reset Simulation Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetSimulation}
              leftIcon={<RotateCcw className="w-3.5 h-3.5 text-stone-500" />}
              className="text-xs"
            >
              Reset
            </Button>
          </div>
        </div>

        {/* Role Filter Chips */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-stone-100 dark:border-stone-800/80">
          <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 mr-1">
            Filter Peran:
          </span>
          {[
            { key: 'all', label: 'Semua (6)' },
            { key: 'po', label: 'Product Owner (4)' },
            { key: 'dev', label: 'Developer (1)' },
            { key: 'qa', label: 'QA (1)' },
            { key: 'admin', label: 'Admin (3)' },
          ].map((filter) => {
            const isSelected = roleFilter === filter.key;
            return (
              <button
                key={filter.key}
                type="button"
                onClick={() => setRoleFilter(filter.key as FilterRole)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  isSelected
                    ? 'bg-[#B1E743] text-[#141413] font-bold shadow-xs dark:bg-[#B1E743] dark:text-[#141413]'
                    : 'bg-stone-100 dark:bg-stone-800/60 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-800'
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Guide Selector Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2.5">
        {filteredGuides.map((guide) => {
          const Icon = guide.icon;
          const isSelected = selectedGuideId === guide.id;
          return (
            <button
              key={guide.id}
              data-guide-id={guide.id}
              type="button"
              onClick={() => handleSelectGuide(guide.id)}
              className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                isSelected
                  ? 'bg-white dark:bg-[#22201F] border-[#B1E743] shadow-md ring-2 ring-[#B1E743]/30 dark:ring-[#B1E743]/20'
                  : 'bg-white/60 dark:bg-stone-900/40 border-stone-200/80 dark:border-stone-800 hover:bg-white dark:hover:bg-stone-800/80'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div
                    className={`p-2 rounded-lg ${
                      isSelected
                        ? 'bg-[#B1E743]/20 text-[#141413] dark:bg-stone-800 dark:text-[#B1E743]'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <Badge variant="neutral" size="sm">
                    {guide.roleBadge}
                  </Badge>
                </div>
                <h4
                  className={`text-xs font-bold line-clamp-2 ${
                    isSelected ? 'text-stone-900 dark:text-white' : 'text-stone-700 dark:text-stone-300'
                  }`}
                >
                  {guide.title}
                </h4>
              </div>

              <div className="mt-3 pt-2 border-t border-stone-100 dark:border-stone-800/60 flex items-center justify-between text-[11px] text-stone-400">
                <span>{guide.steps.length} Langkah</span>
                {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-stone-900 dark:text-[#B1E743]" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Interactive Guide & Simulator Stage Area */}
      {currentGuide && currentStep && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (5 Cols): Step Navigator, Instructions & Context */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="p-5 border-stone-200/80 dark:border-stone-800 dark:bg-[#1C1A19] space-y-5">
              {/* Active Guide Info */}
              <div className="space-y-1.5 pb-4 border-b border-stone-100 dark:border-stone-800">
                <div className="flex items-center justify-between">
                  <Badge variant="review">{currentGuide.roleBadge}</Badge>
                  <span className="text-xs font-bold text-stone-900 dark:text-[#B1E743]">
                    Langkah {activeStepIndex + 1} dari {totalSteps}
                  </span>
                </div>
                <h3 className="text-base font-bold text-stone-900 dark:text-white">
                  {currentGuide.title}
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  {currentGuide.subtitle}
                </p>
              </div>

              {/* Progress Bar & Clickable Step Dots */}
              <div className="space-y-2">
                <div className="w-full bg-stone-100 dark:bg-stone-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#B1E743] dark:bg-[#B1E743] h-full transition-all duration-300 rounded-full"
                    style={{ width: `${((activeStepIndex + 1) / totalSteps) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between items-center px-1">
                  {currentGuide.steps.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveStepIndex(idx)}
                      className={`flex items-center gap-1 text-[11px] font-semibold transition-all ${
                        activeStepIndex === idx
                          ? 'text-stone-900 dark:text-[#B1E743] font-bold'
                          : activeStepIndex > idx
                          ? 'text-stone-800 dark:text-stone-200'
                          : 'text-stone-400 dark:text-stone-600'
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          activeStepIndex === idx
                            ? 'bg-[#B1E743] text-[#141413] dark:bg-[#B1E743] dark:text-[#141413]'
                            : activeStepIndex > idx
                            ? 'bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-200'
                            : 'bg-stone-100 dark:bg-stone-800 text-stone-400'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <span className="hidden sm:inline">{s.title.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Current Step Instruction Box */}
              <div className="p-4 rounded-xl bg-[#B1E743]/10 dark:bg-[#B1E743]/10 border border-[#B1E743]/30 dark:border-[#B1E743]/20 space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-[#B1E743] text-[#141413] font-bold text-xs flex items-center justify-center">
                    {activeStepIndex + 1}
                  </span>
                  <h4 className="text-sm font-bold text-stone-900 dark:text-white">
                    {currentStep.title}
                  </h4>
                </div>
                <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed font-medium">
                  {currentStep.instruction}
                </p>
                {currentStep.tip && (
                  <div className="flex items-start gap-2 pt-2 border-t border-[#B1E743]/30 dark:border-[#B1E743]/20 text-[11px] text-stone-900 dark:text-[#B1E743]">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <span>{currentStep.tip}</span>
                  </div>
                )}
              </div>

              {/* Stepper Navigation Buttons */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevStep}
                  disabled={activeStepIndex === 0}
                  leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
                  className="text-xs"
                >
                  Sebelumnya
                </Button>
                {activeStepIndex < totalSteps - 1 ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleNextStep}
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                    className="text-xs"
                  >
                    Langkah Selanjutnya
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      const curIdx = GUIDES.findIndex((g) => g.id === selectedGuideId);
                      if (curIdx < GUIDES.length - 1) {
                        handleSelectGuide(GUIDES[curIdx + 1].id);
                      } else {
                        handleSelectGuide(GUIDES[0].id);
                      }
                    }}
                    rightIcon={<Check className="w-3.5 h-3.5" />}
                    className="text-xs"
                  >
                    Tutorial Berikutnya
                  </Button>
                )}
              </div>

              {/* Direct Deep Link CTA */}
              <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs">
                <span className="text-stone-500 dark:text-stone-400">Siap mencoba fitur ini di aplikasi?</span>
                <button
                  type="button"
                  onClick={() => navigate(currentGuide.targetRoute)}
                  className="font-bold text-indigo-600 dark:text-[#B1E743] hover:underline flex items-center gap-1"
                >
                  <span>{currentGuide.targetRouteLabel}</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </Card>
          </div>

          {/* Right Column (7 Cols): LIVE INTERACTIVE MICRO-UI MOCKUP */}
          <div className="lg:col-span-7 space-y-4">
            <Card className="p-0 border-stone-200/80 dark:border-stone-800 dark:bg-[#1C1A19] overflow-hidden shadow-lg">
              {/* Mockup Window Title Bar */}
              <div className="px-4 py-3 bg-stone-100 dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  </div>
                  <span className="text-[11px] font-mono text-stone-500 dark:text-stone-400 ml-2">
                    Live Simulator — {currentGuide.title}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    <Sparkles className="w-3 h-3" />
                    Interactive Playground
                  </span>
                </div>
              </div>

              {/* Dynamic Interactive Canvas Content by Guide */}
              <div className="p-5 sm:p-6 bg-stone-50/50 dark:bg-[#151413] min-h-[420px] flex flex-col justify-center">
                {/* 1. MOCKUP FOR FOLDER CREATION (FOLDER TREE SPRINT EXPLORER) */}
                {selectedGuideId === 'folder' && (
                  <div className="space-y-4 max-w-lg mx-auto w-full">
                    <div className="rounded-xl bg-white dark:bg-[#1E1C1B] border border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden">
                      {/* Folder Tree Header like real app */}
                      <div className="p-3.5 bg-stone-50 dark:bg-stone-900/80 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Folder className="w-4 h-4 text-indigo-500 dark:text-[#B1E743]" />
                          <span className="text-xs font-bold text-stone-900 dark:text-white uppercase tracking-wider">
                            Folders
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-bold">
                            {simFolders.length}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => {
                            setSimShowFolderModal(true);
                            if (activeStepIndex === 0 || activeStepIndex === 1) {
                              setActiveStepIndex(2);
                            }
                          }}
                          leftIcon={<Plus className="w-3.5 h-3.5" />}
                          className="text-xs !py-1 !min-h-[28px]"
                        >
                          New Folder
                        </Button>
                      </div>

                      {/* Folder Tree List */}
                      <div className="p-3 space-y-1.5">
                        {simFolders.map((f, idx) => (
                          <div key={f.id} className="space-y-1">
                            <div
                              className={`flex items-center justify-between p-2.5 rounded-lg text-xs font-medium border transition-all ${
                                idx === simFolders.length - 1 && simFolders.length > 2
                                  ? 'bg-[#B1E743]/20 dark:bg-[#B1E743]/20 border-[#B1E743] text-[#141413] dark:text-[#B1E743] ring-1 ring-[#B1E743]'
                                  : 'bg-stone-50/70 dark:bg-stone-900/50 border-stone-200/60 dark:border-stone-800 text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
                                <FolderOpen className="w-4 h-4 text-amber-500" />
                                <span className="font-semibold">{f.name}</span>
                              </div>
                              <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                                {f.count} tasks
                              </span>
                            </div>

                            {/* Subfolder preview (Level 2 max depth) */}
                            {f.children && (
                              <div className="pl-6 space-y-1">
                                {f.children.map((sub, sIdx) => (
                                  <div
                                    key={sIdx}
                                    className="flex items-center gap-2 p-2 rounded-lg text-[11px] bg-stone-100/60 dark:bg-stone-900/30 text-stone-600 dark:text-stone-400 border border-stone-200/40 dark:border-stone-800/40"
                                  >
                                    <ChevronRight className="w-3 h-3 text-stone-400" />
                                    <Folder className="w-3.5 h-3.5 text-stone-400" />
                                    <span>{sub}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Add Folder Live Form Drawer / Modal Preview */}
                      {simShowFolderModal && (
                        <div className="p-3.5 bg-[#B1E743]/10 dark:bg-[#B1E743]/10 border-t border-[#B1E743]/30 space-y-2.5 animate-fadeIn">
                          <div className="flex items-center justify-between text-xs font-bold text-[#141413] dark:text-[#B1E743]">
                            <span>Buat Folder Sprint Baru:</span>
                            <span className="text-[10px] text-stone-500">Maks. 2 Level</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={simFolderInput}
                              onChange={(e) => setSimFolderInput(e.target.value)}
                              placeholder="Ketik nama folder..."
                              className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#B1E743]"
                            />
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={handleAddFolderSim}
                              leftIcon={<FolderPlus className="w-3.5 h-3.5" />}
                              className="shrink-0 text-xs"
                            >
                              Simpan
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-center text-stone-500 dark:text-stone-400">
                      💡 Klik tombol <strong>New Folder</strong> untuk mencoba menambahkan folder sprint baru secara live.
                    </p>
                  </div>
                )}

                {/* 2. MOCKUP FOR PARENT TASK CREATION (REAL MODAL STYLE) */}
                {selectedGuideId === 'parent_task' && (
                  <div className="space-y-4 max-w-lg mx-auto w-full">
                    <div className="rounded-xl bg-white dark:bg-[#1E1C1B] border border-stone-200 dark:border-stone-800 shadow-xl overflow-hidden">
                      {/* Modal Header */}
                      <div className="p-4 bg-stone-50 dark:bg-stone-900/80 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-stone-700 dark:text-[#B1E743]" />
                          <h4 className="text-xs font-bold text-stone-900 dark:text-white uppercase tracking-wider">
                            Create New Task (Fitur Utama)
                          </h4>
                        </div>
                        <Badge variant="info" size="sm">Sprint 14</Badge>
                      </div>

                      {/* Modal Form Fields */}
                      <div className="p-4 space-y-3 text-xs">
                        <div className="space-y-1">
                          <label className="font-semibold text-stone-700 dark:text-stone-300">
                            Task Title *
                          </label>
                          <input
                            type="text"
                            value={simTaskTitle}
                            onChange={(e) => setSimTaskTitle(e.target.value)}
                            className="w-full text-xs px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-white focus:ring-2 focus:ring-[#B1E743] outline-none"
                          />
                        </div>

                        {/* Priority Selector Pill Buttons */}
                        <div className="space-y-1">
                          <label className="font-semibold text-stone-700 dark:text-stone-300">
                            Priority
                          </label>
                          <div className="grid grid-cols-4 gap-1.5">
                            {[
                              { key: 'P0', label: 'P0 Critical', color: 'bg-rose-600 text-white' },
                              { key: 'P1', label: 'P1 High', color: 'bg-amber-500 text-white' },
                              { key: 'P2', label: 'P2 Medium', color: 'bg-blue-500 text-white' },
                              { key: 'P3', label: 'P3 Low', color: 'bg-stone-600 text-white' },
                            ].map((p) => (
                              <button
                                key={p.key}
                                type="button"
                                onClick={() => setSimTaskPriority(p.key as any)}
                                className={`p-1.5 rounded-lg text-xs font-bold border transition-all ${
                                  simTaskPriority === p.key
                                    ? p.color
                                    : 'bg-stone-50 dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400'
                                }`}
                              >
                                {p.key}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Requirement URL */}
                        <div className="space-y-1">
                          <label className="font-semibold text-stone-700 dark:text-stone-300 flex items-center justify-between">
                            <span>Requirement Link (PRD / Figma)</span>
                            <span className="text-[10px] text-stone-400">Optional</span>
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              value={simTaskReqUrl}
                              onChange={(e) => setSimTaskReqUrl(e.target.value)}
                              className="w-full text-xs pl-3 pr-7 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-white focus:ring-2 focus:ring-[#B1E743] outline-none truncate"
                            />
                            <ExternalLink className="w-3.5 h-3.5 text-stone-400 absolute right-2.5 top-2.5 pointer-events-none" />
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-2 flex items-center justify-end gap-2 border-t border-stone-100 dark:border-stone-800">
                          <Button size="sm" variant="outline" className="text-xs">
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={handleCreateTaskSim}
                            className="text-xs"
                          >
                            + Create Task
                          </Button>
                        </div>
                      </div>

                      {/* Live Backlog List Display */}
                      <div className="p-3 bg-stone-100/70 dark:bg-stone-900/90 border-t border-stone-200 dark:border-stone-800 space-y-1.5">
                        <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                          Backlog Task List ({simCreatedTasks.length} items):
                        </span>
                        {simCreatedTasks.map((t) => (
                          <div
                            key={t.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-stone-800 border border-stone-200/60 dark:border-stone-700 text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="w-3.5 h-3.5 text-stone-700 dark:text-[#B1E743] shrink-0" />
                              <span className="font-semibold text-stone-900 dark:text-white truncate">{t.title}</span>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ml-2 ${
                                t.priority === 'P0'
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                  : t.priority === 'P1'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                  : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              }`}
                            >
                              {t.priority}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. MOCKUP FOR SUBTASKS BREAKDOWN (TASK DETAIL DRAWER) */}
                {selectedGuideId === 'subtasks' && (
                  <div className="space-y-4 max-w-lg mx-auto w-full">
                    <div className="rounded-xl bg-white dark:bg-[#1E1C1B] border border-stone-200 dark:border-stone-800 shadow-xl overflow-hidden">
                      {/* Drawer Header */}
                      <div className="p-4 bg-stone-50 dark:bg-stone-900/80 border-b border-stone-100 dark:border-stone-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-stone-500">
                            Sprint 14 / Payment Module
                          </span>
                          <TaskStatusBadge state="in_progress" />
                        </div>
                        <h4 className="text-sm font-bold text-stone-900 dark:text-white">
                          Integrasi Payment Gateway Midtrans
                        </h4>

                        {/* Navigation Drawer Tabs */}
                        <div className="flex items-center gap-4 pt-2 border-t border-stone-200/60 dark:border-stone-800 text-xs font-semibold">
                          <span className="text-stone-400">Overview</span>
                          <span className="text-stone-900 dark:text-[#B1E743] border-b-2 border-[#B1E743] pb-1">
                            Subtasks ({simSubtasks.length})
                          </span>
                          <span className="text-stone-400">Discussion</span>
                          <span className="text-stone-400">Activity</span>
                        </div>
                      </div>

                      {/* Subtasks Tab Content */}
                      <div className="p-4 space-y-3">
                        {/* Progress Bar Header */}
                        <div className="p-2.5 rounded-lg bg-stone-100 dark:bg-stone-900 border border-stone-200/70 dark:border-stone-800 flex items-center justify-between text-xs">
                          <span className="font-semibold text-stone-700 dark:text-stone-300">
                            Deliverable Progress:
                          </span>
                          <span className="font-bold text-stone-900 dark:text-[#B1E743]">
                            FE {simSubtasks.filter((s) => s.area === 'FE' && s.status === 'done').length}/
                            {simSubtasks.filter((s) => s.area === 'FE').length} · BE{' '}
                            {simSubtasks.filter((s) => s.area === 'BE' && s.status === 'done').length}/
                            {simSubtasks.filter((s) => s.area === 'BE').length} · QA{' '}
                            {simSubtasks.filter((s) => s.area === 'QA' && s.status === 'done').length}/
                            {simSubtasks.filter((s) => s.area === 'QA').length}
                          </span>
                        </div>

                        {/* Subtasks List */}
                        <div className="space-y-2">
                          {simSubtasks.map((s) => (
                            <div
                              key={s.id}
                              className="p-2.5 rounded-lg bg-stone-50 dark:bg-stone-900/60 border border-stone-200/70 dark:border-stone-800 flex items-center justify-between text-xs"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span
                                  className={`px-2 py-0.5 rounded font-bold text-[10px] shrink-0 ${
                                    s.area === 'FE'
                                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                      : s.area === 'BE'
                                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  }`}
                                >
                                  {s.area}
                                </span>
                                <div className="min-w-0">
                                  <span className="font-semibold text-stone-900 dark:text-stone-100 block truncate">
                                    {s.title}
                                  </span>
                                  <div className="flex items-center gap-1 text-[10px] text-stone-500 mt-0.5">
                                    <span className="w-4 h-4 rounded-full bg-stone-300 dark:bg-stone-700 text-stone-800 dark:text-stone-200 flex items-center justify-center font-bold text-[8px]">
                                      {s.avatar}
                                    </span>
                                    <span>{s.assignee}</span>
                                  </div>
                                </div>
                              </div>
                              <TaskStatusBadge state={s.status as any} />
                            </div>
                          ))}
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleAddQaSubtaskSim}
                          disabled={simSubtasks.some((s) => s.area === 'QA')}
                          leftIcon={<Plus className="w-3.5 h-3.5" />}
                          className="w-full text-xs"
                        >
                          {simSubtasks.some((s) => s.area === 'QA')
                            ? '✓ Subtask QA Berhasil Ditambahkan'
                            : '+ Tambah Subtask QA Verification'}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. MOCKUP FOR DEVELOPER EXECUTION & ANTI SELF-APPROVAL */}
                {selectedGuideId === 'dev_flow' && (
                  <div className="space-y-4 max-w-lg mx-auto w-full">
                    <div className="rounded-xl bg-white dark:bg-[#1E1C1B] border border-stone-200 dark:border-stone-800 shadow-xl overflow-hidden">
                      {/* My Tasks Header */}
                      <div className="p-3.5 bg-stone-50 dark:bg-stone-900/80 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckSquare className="w-4 h-4 text-blue-500" />
                          <h4 className="text-xs font-bold text-stone-900 dark:text-white uppercase tracking-wider">
                            My Tasks — Personal Workspace
                          </h4>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-bold text-[10px]">
                            Developer Role
                          </span>
                        </div>
                      </div>

                      {/* Task Item Row in My Tasks */}
                      <div className="p-4 space-y-3">
                        <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-900/70 border border-stone-200 dark:border-stone-800 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-stone-500">
                              Sprint 14 / Integrasi Payment Gateway
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                              Frontend (FE)
                            </span>
                          </div>
                          <h5 className="text-xs font-bold text-stone-900 dark:text-white">
                            Implementasi UI Form Checkout & Payment Method
                          </h5>

                          <div className="pt-2 border-t border-stone-200/60 dark:border-stone-800/80 space-y-2">
                            <span className="text-[11px] font-semibold text-stone-600 dark:text-stone-400 block">
                              Klik tombol status di bawah untuk simulasi aksi developer:
                            </span>

                            {/* Status Selector Pills */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                              {[
                                { key: 'todo', label: 'TODO' },
                                { key: 'in_progress', label: 'IN PROGRESS' },
                                { key: 'in_review', label: 'IN REVIEW' },
                                { key: 'done', label: 'DONE (Test)' },
                              ].map((st) => (
                                <button
                                  key={st.key}
                                  type="button"
                                  onClick={() => handleDevStatusChange(st.key as any)}
                                  className={`py-2 px-1 rounded-lg text-[11px] font-bold border transition-all text-center ${
                                    simDevStatus === st.key && st.key !== 'done'
                                      ? 'bg-[#B1E743] text-[#141413] font-bold border-[#B1E743] shadow-sm'
                                      : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700'
                                  }`}
                                >
                                  {st.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Guardrail Anti Self-Approval Warning */}
                        {simShowDevBlockModal && (
                          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 space-y-2 animate-bounce">
                            <div className="flex items-center gap-2 font-bold">
                              <Lock className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                              <span>Quality Gate Blocked: Anti Self-Approval</span>
                            </div>
                            <p className="text-[11px] leading-relaxed">
                              Developer <strong>dilarang menyelesaikan subtask sendiri ke status DONE</strong>. Pilih status <strong>IN REVIEW</strong> agar tim QA menguji fungsionalitas dan memberikan approval resmi!
                            </p>
                          </div>
                        )}

                        <div className="p-2.5 rounded-lg bg-stone-100 dark:bg-stone-900 flex items-center justify-between text-xs">
                          <span className="text-stone-600 dark:text-stone-400">Status Subtask Saat Ini:</span>
                          <TaskStatusBadge state={simDevStatus} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. MOCKUP FOR QA QUALITY GATE & REVIEW */}
                {selectedGuideId === 'qa_review' && (
                  <div className="space-y-4 max-w-lg mx-auto w-full">
                    <div className="rounded-xl bg-white dark:bg-[#1E1C1B] border border-stone-200 dark:border-stone-800 shadow-xl overflow-hidden">
                      {/* QA Panel Header */}
                      <div className="p-3.5 bg-stone-50 dark:bg-stone-900/80 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <TestTube className="w-4 h-4 text-emerald-500" />
                          <h4 className="text-xs font-bold text-stone-900 dark:text-white uppercase tracking-wider">
                            QA Gatekeeper Verification Panel
                          </h4>
                        </div>
                        <Badge variant="review">IN REVIEW</Badge>
                      </div>

                      <div className="p-4 space-y-3">
                        <div className="p-3 rounded-lg bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 space-y-1">
                          <span className="text-[10px] text-stone-500">Subtask Under Test:</span>
                          <h5 className="text-xs font-bold text-stone-900 dark:text-white">
                            API Endpoint /payments/charge & Webhook Verification
                          </h5>
                          <span className="text-[10px] text-stone-400">Assignee: Budi Santoso (BE Dev)</span>
                        </div>

                        <div className="space-y-2 pt-1">
                          <span className="text-[11px] font-semibold text-stone-600 dark:text-stone-400 block">
                            Pilih Skenario Hasil Pengujian QA:
                          </span>
                          <div className="grid grid-cols-2 gap-2.5">
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setSimQaDecision('changes_requested');
                                setActiveStepIndex(1);
                              }}
                              className="text-xs"
                            >
                              🔴 Temukan Bug (Reject)
                            </Button>
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => {
                                setSimQaDecision('done');
                                setActiveStepIndex(2);
                              }}
                              className="text-xs bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600"
                            >
                              🟢 Lolos Uji (Approve)
                            </Button>
                          </div>
                        </div>

                        {/* Result Display */}
                        {simQaDecision === 'changes_requested' && (
                          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 space-y-2 animate-fadeIn">
                            <div className="flex items-center justify-between text-xs font-bold text-rose-800 dark:text-rose-300">
                              <span>Status: CHANGES REQUESTED</span>
                              <TaskStatusBadge state="changes_requested" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-stone-600 dark:text-stone-400 block">
                                Catatan Review QA (Wajib diisi):
                              </label>
                              <textarea
                                value={simQaReviewNote}
                                onChange={(e) => setSimQaReviewNote(e.target.value)}
                                rows={2}
                                className="w-full text-xs p-2 rounded-lg border border-rose-200 dark:border-rose-800/80 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
                              />
                            </div>
                            <p className="text-[10px] text-rose-600 dark:text-rose-400 font-medium">
                              Catatan ini otomatis diteruskan ke notifikasi & drawer subtask Developer untuk diperbaiki.
                            </p>
                          </div>
                        )}

                        {simQaDecision === 'done' && (
                          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-2 animate-fadeIn">
                            <div className="flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300">
                              <span>Status Berubah: DONE (Approved by QA)</span>
                              <TaskStatusBadge state="done" />
                            </div>
                            <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                              🎉 Subtask BE resmi disetujui. QA kini dapat menyelesaikan subtask pengujian mandiri (*E2E Regression*).
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. MOCKUP FOR PRODUCT OWNER FINAL ACCEPTANCE */}
                {selectedGuideId === 'po_acceptance' && (
                  <div className="space-y-4 max-w-lg mx-auto w-full">
                    <div className="rounded-xl bg-white dark:bg-[#1E1C1B] border border-stone-200 dark:border-stone-800 shadow-xl overflow-hidden">
                      {/* Header */}
                      <div className="p-3.5 bg-stone-50 dark:bg-stone-900/80 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-purple-500" />
                          <h4 className="text-xs font-bold text-stone-900 dark:text-white uppercase tracking-wider">
                            Product Owner Final Acceptance
                          </h4>
                        </div>
                        <Badge variant="review">PO Sign-Off</Badge>
                      </div>

                      <div className="p-4 space-y-3">
                        <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-900/70 border border-stone-200 dark:border-stone-800 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-stone-800 dark:text-stone-200">
                              Deliverables Completion:
                            </span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              FE 1/1 · BE 1/1 · QA 1/1 (100% Done)
                            </span>
                          </div>
                          <div className="w-full bg-stone-200 dark:bg-stone-700 h-2.5 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full w-full rounded-full transition-all duration-500" />
                          </div>
                        </div>

                        {/* Acceptance Criteria Checklist */}
                        <div className="p-3 rounded-lg bg-stone-50/70 dark:bg-stone-900/40 border border-stone-200/60 dark:border-stone-800 space-y-1.5 text-xs text-stone-700 dark:text-stone-300">
                          <span className="font-bold text-[10px] text-stone-400 uppercase tracking-wider block">
                            Acceptance Checklist:
                          </span>
                          <div className="flex items-center gap-2 text-[11px]">
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Payment Gateway Sandbox integration validated</span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px]">
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Error handling & webhook callback verified</span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px]">
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                            <span>QA Automation & Regression test passed</span>
                          </div>
                        </div>

                        <div className="pt-2 flex items-center justify-between gap-4">
                          <span className="text-xs text-stone-500 dark:text-stone-400">
                            Status Parent Task: <strong>{simPoParentStatus.toUpperCase()}</strong>
                          </span>
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => {
                              const nextStatus = simPoParentStatus === 'done' ? 'in_progress' : 'done';
                              setSimPoParentStatus(nextStatus);
                              if (nextStatus === 'done') {
                                setActiveStepIndex(3);
                              }
                            }}
                            className={`text-xs ${
                              simPoParentStatus === 'done'
                                ? 'bg-stone-700 hover:bg-stone-800'
                                : 'bg-purple-600 hover:bg-purple-700 text-white'
                            }`}
                          >
                            {simPoParentStatus === 'done' ? 'Buka Kembali Task' : '✓ Selesaikan Parent Task'}
                          </Button>
                        </div>

                        {simPoParentStatus === 'done' && (
                          <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-xs text-purple-900 dark:text-purple-200 flex items-center gap-2 animate-fadeIn">
                            <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                            <span>
                              Parent Task resmi selesai (DONE). Keputusan penutupan explicit PO tercatat dalam immutable audit log.
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: VISUAL ROADMAP CARDS (ALL FLOWS AT A GLANCE) */}
      {viewMode === 'roadmap' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGuides.map((guide, idx) => {
              const Icon = guide.icon;
              return (
                <Card
                  key={guide.id}
                  className="p-5 border-stone-200/80 dark:border-stone-800 dark:bg-[#1C1A19] flex flex-col justify-between space-y-4 hover:border-stone-400 dark:hover:border-stone-700 transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-[#B1E743] text-[#141413] font-bold text-xs flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div className="p-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                          <Icon className="w-4 h-4" />
                        </div>
                      </div>
                      <Badge variant="neutral" size="sm">
                        {guide.roleBadge}
                      </Badge>
                    </div>

                    <div>
                      <h3 className="font-bold text-sm text-stone-900 dark:text-white">
                        {guide.title}
                      </h3>
                      <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
                        {guide.subtitle}
                      </p>
                    </div>

                    {/* Step pills */}
                    <div className="space-y-1.5 pt-2 border-t border-stone-100 dark:border-stone-800">
                      {guide.steps.map((step, sIdx) => (
                        <div
                          key={sIdx}
                          className="flex items-start gap-2 text-xs text-stone-600 dark:text-stone-300"
                        >
                          <span className="text-[10px] font-bold text-stone-400 mt-0.5">
                            {sIdx + 1}.
                          </span>
                          <span className="font-medium">{step.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedGuideId(guide.id);
                      setViewMode('simulator');
                      setActiveStepIndex(0);
                    }}
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                    className="w-full text-xs"
                  >
                    Buka di Simulator
                  </Button>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
