import React, { useState, useEffect } from 'react';
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
  FileSpreadsheet,
  Upload,
  FileCode2,
  Bug,
  ShieldAlert,
  ShieldCheck,
  Video,
  Image,
  Eye,
  AlertTriangle,
} from 'lucide-react';
import { Card } from '../atoms/Card';
import { Badge } from '../atoms/Badge';
import { Button } from '../atoms/Button';
import { TaskStatusBadge } from '../molecules/TaskStatusBadge';

export type GuideId =
  | 'folder'
  | 'specs_brief'
  | 'subtasks_specialties'
  | 'dev_flow'
  | 'dev_bug_fix'
  | 'qa_intake'
  | 'qa_test_run'
  | 'qa_signoff'
  | 'po_release_decision';

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
    title: '1. Membuat Folder Sprint & Kategori',
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
        instruction:
          'Navigasikan ke menu Work Hub di sidebar kiri untuk melihat struktur folder sprint dan backlog kerja tim.',
      },
      {
        title: 'Klik Tombol "+ New Folder"',
        shortDesc: 'Picu modal pembuatan folder baru pada panel kiri.',
        instruction:
          'Pada bagian header panel Folders, klik tombol "+" untuk menambahkan folder sprint atau kategori baru.',
      },
      {
        title: 'Beri Nama Folder & Simpan',
        shortDesc: 'Masukkan nama sprint/modul (Maks. 2 level kedalaman).',
        instruction:
          'Ketikkan nama deskriptif seperti "Sprint 14 - Checkout & Payment", lalu klik Simpan.',
        tip: 'Struktur folder dibatasi maksimal 2 tingkat kedalaman (Folder -> Subfolder) agar navigasi tetap terfokus.',
      },
      {
        title: 'Folder Siap Digunakan',
        shortDesc: 'Folder aktif terpilih dan siap diisi parent task fitur.',
        instruction:
          'Klik folder yang baru dibuat di panel kiri untuk mulai menambahkan Parent Task fitur.',
      },
    ],
  },
  {
    id: 'specs_brief',
    title: '2. Specification Brief & Requirement Linking',
    subtitle: 'Tuliskan spesifikasi produk (In/Out Scope, AC) dan tautkan Requirement.',
    roles: ['po', 'admin'],
    roleBadge: 'PO / Admin',
    icon: FileCode2,
    color: 'indigo',
    targetRoute: '/work',
    targetRouteLabel: 'Buka Work Hub',
    steps: [
      {
        title: 'Buka Parent Feature Task',
        shortDesc: 'Pilih Feature / Story di Work Hub.',
        instruction:
          'Klik pada baris Feature Task untuk membuka Task Detail Drawer di sisi kanan layar.',
      },
      {
        title: 'Buka Tab "Specs & Requirements"',
        shortDesc: 'Akses editor Specification Brief versi terpusat.',
        instruction:
          'Klik tab "Specs & Requirements" untuk mendefinisikan ruang lingkup pengerjaan fitur.',
      },
      {
        title: 'Definisikan In Scope, Out Scope & Acceptance Criteria',
        shortDesc: 'Tuliskan komitmen deliverable dan batasan pengerjaan.',
        instruction:
          'Isi deliverables dalam In Scope, batasan yang dikecualikan dalam Out of Scope, dan observable targets dalam Acceptance Criteria.',
        tip: 'Spesifikasi disimpan dengan versioning otomatis (v1, v2, dst.) sebagai single source of truth.',
      },
      {
        title: 'Tautkan Workspace Requirement (Figma / PRD)',
        shortDesc: 'Hubungkan dokumen requirement eksternal untuk ketertelusuran QA.',
        instruction:
          'Gunakan panel Requirement Manager di bawahnya untuk menautkan link Figma Prototype atau PRD.',
      },
    ],
  },
  {
    id: 'subtasks_specialties',
    title: '3. Pemecahan Subtask & Developer Specialties',
    subtitle: 'Distribusikan pengerjaan teknis sesuai spesialisasi developer (ADR-002).',
    roles: ['po', 'admin'],
    roleBadge: 'PO / Admin',
    icon: GitCommit,
    color: 'indigo',
    targetRoute: '/work',
    targetRouteLabel: 'Buka Work Hub',
    steps: [
      {
        title: 'Buka Tab "Subtasks"',
        shortDesc: 'Akses area distribusi subtask teknis di drawer.',
        instruction:
          'Klik tab "Subtasks" pada detail Feature Task, lalu klik tombol "+ Add Subtask".',
      },
      {
        title: 'Pilih Area Kerja (Frontend, Backend, Mobile, Fullstack, QA)',
        shortDesc: 'Tentukan delivery area yang tepat untuk subtask.',
        instruction:
          'Pilih area pengerjaan: Frontend, Backend, Mobile, Fullstack, atau QA Verification.',
      },
      {
        title: 'Tugaskan Sesuai Developer Specialties (ADR-002)',
        shortDesc: 'Sistem memfilter developer yang memiliki spesialisasi cocok.',
        instruction:
          'Pilih developer yang sesuai dengan area pengerjaan. Backend akan memvalidasi kecocokan spesialisasi secara ketat.',
        tip: 'Jika terjadi mismatch spesialisasi, hanya Workspace Owner yang dapat melakukan override dengan alasan audit wajib.',
      },
      {
        title: 'Pantau Delivery Progress & Bottlenecks',
        shortDesc: 'Cek metrik kelengkapan peran dan jadwal di Role Timeline.',
        instruction:
          'Lihat ringkasan FE/BE/Mobile/Fullstack/QA di header drawer dan evaluasi potensi bottleneck di Task Timeline View.',
      },
    ],
  },
  {
    id: 'dev_flow',
    title: '4. Developer: Eksekusi & Anti Self-Approval Gate',
    subtitle: 'Fokus pengerjaan subtask di Dev Working Desk dan ajukan review.',
    roles: ['dev'],
    roleBadge: 'Developer',
    icon: Code2,
    color: 'blue',
    targetRoute: '/my-tasks',
    targetRouteLabel: 'Buka Dev Working Desk',
    steps: [
      {
        title: 'Buka "My Tasks" (Dev Working Desk)',
        shortDesc: 'Lihat antrean tugas pada bucket "Assigned Work".',
        instruction:
          'Buka menu My Tasks. Subtask yang ditugaskan khusus untuk Anda akan tampil dengan status TODO.',
      },
      {
        title: 'Mulai Pengerjaan: Ubah ke "IN PROGRESS"',
        shortDesc: 'Beri sinyal real-time bahwa kode sedang dikerjakan.',
        instruction:
          'Klik status subtask dan ubah menjadi "IN PROGRESS" saat mulai menulis kode atau membuat branch.',
      },
      {
        title: 'Selesai Coding: Ajukan ke "IN REVIEW"',
        shortDesc: 'Tuliskan handover notes dan serahkan ke tim QA.',
        instruction:
          'Setelah kode siap di-staging, ubah status ke "IN REVIEW". Subtask otomatis masuk ke antrean uji QA.',
      },
      {
        title: 'Penegakan Quality Gate: Anti Self-Approval',
        shortDesc: 'Developer dilarang menyelesaikan tugasnya sendiri ke DONE.',
        instruction:
          'Sistem secara ketat mengunci status DONE bagi Developer. Hanya QA/PO yang berwenang menyetujui subtask menjadi DONE.',
        tip: 'Jika QA mengembalikan dengan Changes Requested, baca catatan temuan bug, perbaiki kode, lalu ajukan kembali ke In Review.',
      },
    ],
  },
  {
    id: 'dev_bug_fix',
    title: '5. Developer: Penanganan Bug Fixes Terkait Test Result',
    subtitle: 'Perbaiki defect berdasar bukti failure Test Result dari QA.',
    roles: ['dev'],
    roleBadge: 'Developer',
    icon: Bug,
    color: 'blue',
    targetRoute: '/my-tasks',
    targetRouteLabel: 'Buka My Tasks',
    steps: [
      {
        title: 'Buka Antrean "Bug Fixes" di My Tasks',
        shortDesc: 'Lihat daftar defect yang ditugaskan QA kepada Anda.',
        instruction:
          'Pada My Tasks, buka section Bug Fixes. Klik defect untuk melihat detail reproduksi bug.',
      },
      {
        title: 'Pelajari Bukti Asal (Originating Test Result & Evidence)',
        shortDesc: 'Lihat langkah gagal, screenshot error, atau rekaman video.',
        instruction:
          'Bug mewarisi evidence link dan deskripsi aktual dari Test Result QA yang gagal.',
      },
      {
        title: 'Perbaiki Kode & Tambahkan Resolution Notes',
        shortDesc: 'Jelaskan commit perbaikan atau solusi teknis.',
        instruction:
          'Setelah defect diperbaiki di staging, tuliskan catatan resolusi pada Bug drawer.',
      },
      {
        title: 'Ubah Status ke "RESOLVED"',
        shortDesc: 'Serahkan kembali ke QA untuk retest independen.',
        instruction:
          'Ubah status Bug menjadi "RESOLVED". Defect otomatis masuk ke antrean "Retest Work" milik QA.',
      },
    ],
  },
  {
    id: 'qa_intake',
    title: '6. QA: Test Case Intake & Spreadsheet Wizard',
    subtitle: 'Authoring native test case & import spreadsheet CSV/XLSX dengan pemetaan kolom.',
    roles: ['qa', 'po', 'admin'],
    roleBadge: 'QA / Planner',
    icon: FileSpreadsheet,
    color: 'emerald',
    targetRoute: '/my-tasks',
    targetRouteLabel: 'Buka QA Testing Desk',
    steps: [
      {
        title: 'Buka QA Testing Desk di My Tasks',
        shortDesc: 'Akses pusat komando pengujian kualitas.',
        instruction:
          'Buka menu My Tasks dan pilih mode QA Testing Desk. Klik tombol "Import Spreadsheet" atau "New Test Case".',
      },
      {
        title: 'Upload File Spreadsheet (CSV / XLSX)',
        shortDesc: 'Pilih file dan tentukan sheet yang ingin diimpor.',
        instruction:
          'Drop file test case spreadsheet. Jika XLSX memiliki multi-sheet, pilih tab sheet yang relevan.',
      },
      {
        title: 'Lakukan Pemetaan Kolom Interaktif',
        shortDesc: 'Cocokkan header spreadsheet dengan field sistem.',
        instruction:
          'Petakan kolom judul, langkah pengujian, ekspektasi, prioritas, dan kode requirement yang sesuai.',
      },
      {
        title: 'Tinjau Preview & Eksekusi Import',
        shortDesc: 'Validasi baris data sebelum disimpan secara permanen.',
        instruction:
          'Periksa ringkasan baris valid vs error. Klik "Commit Import" untuk menyimpan test case ke database.',
      },
    ],
  },
  {
    id: 'qa_test_run',
    title: '7. QA: Test Runs, Formal Evidence Links & Media Preview',
    subtitle: 'Eksekusi pengujian, rekam hasil immutable, dan lampirkan bukti visual.',
    roles: ['qa'],
    roleBadge: 'QA',
    icon: TestTube,
    color: 'emerald',
    targetRoute: '/my-tasks',
    targetRouteLabel: 'Buka QA Testing Desk',
    steps: [
      {
        title: 'Pilih Test Case & Mulai Test Run',
        shortDesc: 'Jalankan pengujian berdasarkan build & environment.',
        instruction:
          'Di QA Desk, klik Test Case yang ingin diuji, masukkan nomor build (misal: v2.4.0-rc1) dan environment (Staging).',
      },
      {
        title: 'Catat Hasil Uji (Passed / Failed / Blocked)',
        shortDesc: 'Hasil uji bersifat immutable (append-only audit).',
        instruction:
          'Tentukan status hasil pengujian dan tuliskan hasil observasi aktual pada formulir Test Result.',
      },
      {
        title: 'Lampirkan Formal Evidence Links (Zoom/Pan & Video)',
        shortDesc: 'Tambahkan link bukti tangkapan layar atau video Loom/YouTube.',
        instruction:
          'Masukkan link HTTPS bukti pengujian. Sistem menyediakan penampil in-app preview dengan kontrol zoom, pan, dan sandboxed video player.',
        tip: 'Evidence link dibatasi maksimal 20 lampiran dan diproteksi dari URL tidak aman.',
      },
      {
        title: 'Otomatisasi Pembuatan Bug jika Gagal',
        shortDesc: 'Konversi failure menjadi Bug dengan satu klik.',
        instruction:
          'Jika Test Result berstatus Failed, sistem menyediakan opsi untuk langsung membuat Bug dengan mewarisi konteks pengujian.',
      },
    ],
  },
  {
    id: 'qa_signoff',
    title: '8. QA: Retest Independen & QA Sign-off Certification',
    subtitle: 'Verifikasi perbaikan bug dan berikan sertifikasi kualitas rilis.',
    roles: ['qa'],
    roleBadge: 'QA',
    icon: ShieldCheck,
    color: 'emerald',
    targetRoute: '/my-tasks',
    targetRouteLabel: 'Buka QA Testing Desk',
    steps: [
      {
        title: 'Buka Antrean "Retest Work" di QA Desk',
        shortDesc: 'Uji ulang Bug yang telah ditandai RESOLVED oleh Dev.',
        instruction:
          'Buka tab Retest Work. Uji kembali bug di environment staging untuk memastikan defect benar-benar teratasi.',
      },
      {
        title: 'Verifikasi (CLOSED) atau Kembalikan (REOPENED)',
        shortDesc: 'Tegakkan standar kualitas tanpa kompromi.',
        instruction:
          'Jika lolos, tandai bug sebagai "VERIFIED (CLOSED)". Jika masih muncul, klik "REOPEN" beserta bukti baru.',
      },
      {
        title: 'Evaluasi Snapshot Release Readiness',
        shortDesc: 'Periksa gate kelulusan syarat rilis dari backend.',
        instruction:
          'Pastikan seluruh subtask selesai, test result 100% pass, dan tidak ada Bug Critical/High yang belum tuntas.',
      },
      {
        title: 'Terbitkan QA Sign-off (Approved / Rejected)',
        shortDesc: 'Rekam sertifikasi kualitas rilis resmi.',
        instruction:
          'Buka panel QA Sign-off pada Feature Task, tuliskan ringkasan audit, lalu klik "Submit QA Sign-off (Approved)".',
      },
    ],
  },
  {
    id: 'po_release_decision',
    title: '9. PO / Owner: Evaluasi Readiness & Release Decision',
    subtitle: 'Penerbitan keputusan rilis resmi dan penutupan Parent Feature (ADR-001).',
    roles: ['po', 'admin'],
    roleBadge: 'Product Owner / Owner',
    icon: CheckCircle2,
    color: 'purple',
    targetRoute: '/my-tasks',
    targetRouteLabel: 'Buka PO Release Desk',
    steps: [
      {
        title: 'Buka Antrean "Release Decisions" di My Tasks',
        shortDesc: 'Lihat Feature yang telah menerima QA Sign-off.',
        instruction:
          'Product Owner membuka PO Release Desk untuk meninjau fitur yang telah disertifikasi oleh QA.',
      },
      {
        title: 'Tinjau Snapshot Kesiapan & Segregation of Duties',
        shortDesc: 'Pastikan pembuat Release Decision berbeda dari penandatangan QA.',
        instruction:
          'Sistem menegakkan aturan Segregation of Duties: pengguna yang sama tidak boleh menandatangani QA Sign-off sekaligus Release Decision pada fitur yang sama.',
      },
      {
        title: 'Terbitkan Release Decision (Approved / Rejected)',
        shortDesc: 'Kunci persetujuan deployment produksi.',
        instruction:
          'Klik "Approve Release". Jika terdapat gate yang tidak lolos namun mendesak, sertakan alasan override 10-500 karakter.',
      },
      {
        title: 'Prinsip Explicit Parent Feature Completion',
        shortDesc: 'Tutup Parent Task setelah semua subtask dan rilis disetujui.',
        instruction:
          'PO secara sadar menandai Parent Task menjadi "DONE". Fitur resmi selesai dan tercatat di Report & Audit Trail.',
      },
    ],
  },
];

export interface InteractiveGuideSimulatorProps {
  activeUserRole?: FilterRole;
}

export const InteractiveGuideSimulator: React.FC<InteractiveGuideSimulatorProps> = ({
  activeUserRole = 'all',
}) => {
  const navigate = useNavigate();

  // State Management
  const [roleFilter, setRoleFilter] = useState<FilterRole>(activeUserRole);
  const [selectedGuideId, setSelectedGuideId] = useState<GuideId>(() => {
    if (activeUserRole === 'dev') return 'dev_flow';
    if (activeUserRole === 'qa') return 'qa_intake';
    if (activeUserRole === 'po') return 'specs_brief';
    if (activeUserRole === 'admin') return 'folder';
    return 'folder';
  });
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [viewMode, setViewMode] = useState<ViewMode>('simulator');

  useEffect(() => {
    if (activeUserRole && activeUserRole !== 'all') {
      setRoleFilter(activeUserRole);
      if (activeUserRole === 'dev') setSelectedGuideId('dev_flow');
      else if (activeUserRole === 'qa') setSelectedGuideId('qa_intake');
      else if (activeUserRole === 'po') setSelectedGuideId('specs_brief');
      else if (activeUserRole === 'admin') setSelectedGuideId('folder');
      setActiveStepIndex(0);
    }
  }, [activeUserRole]);

  // Interactive Live Simulation States for Try-It Playground
  // 1. Folder Simulator State
  const [simFolderInput, setSimFolderInput] = useState<string>('Sprint 14 - Checkout & Payment');
  const [simShowFolderModal, setSimShowFolderModal] = useState<boolean>(false);
  const [simFolders, setSimFolders] = useState<
    Array<{ id: string; name: string; count: number; children?: string[] }>
  >([
    { id: '1', name: 'Sprint 12 - Onboarding', count: 4 },
    {
      id: '2',
      name: 'Sprint 13 - Authentication',
      count: 6,
      children: ['FE Pages', 'BE Endpoints'],
    },
  ]);

  // 2. Developer Simulator State
  const [simDevStatus, setSimDevStatus] = useState<'todo' | 'in_progress' | 'in_review' | 'done'>(
    'todo',
  );
  const [simShowDevBlockModal, setSimShowDevBlockModal] = useState<boolean>(false);

  // 3. QA Simulator State
  const [simQaDecision, setSimQaDecision] = useState<'idle' | 'changes_requested' | 'done'>('idle');
  const [simQaReviewNote, setSimQaReviewNote] = useState<string>(
    'Validasi response error HTTP 400 belum memunculkan snackbar peringatan ke user.',
  );

  // 4. QA Spreadsheet Intake Simulator State
  const [simSpreadsheetStage, setSimSpreadsheetStage] = useState<'upload' | 'mapping' | 'preview'>(
    'upload',
  );
  const [simImportCount, setSimImportCount] = useState<number>(12);

  // 5. PO Release Decision Simulator State
  const [simPoDecision, setSimPoDecision] = useState<'idle' | 'approved' | 'rejected'>('idle');
  const [simOverrideReason, setSimOverrideReason] = useState<string>('');

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
    setSimDevStatus('todo');
    setSimShowDevBlockModal(false);
    setSimQaDecision('idle');
    setSimSpreadsheetStage('upload');
    setSimPoDecision('idle');
    setSimOverrideReason('');
    setSimShowFolderModal(false);
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
              <span className="p-1.5 rounded-lg bg-[#B1E743]/20 text-[#141413] dark:bg-stone-800 dark:text-[#B1E743]">
                <PlayCircle className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-bold text-stone-900 dark:text-white">
                Interactive Feature Workflow Simulator
              </h2>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Visualisasi alur kerja nyata dengan simulator interaktif. Disinkronkan dengan fitur
              terkini Qlick Hub (ADR-001 & ADR-002).
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
                <span>Simulator Interaktif</span>
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
                <span>Semua Alur ({GUIDES.length})</span>
              </button>
            </div>

            {/* Role Filter Pills */}
            <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-900 p-1 rounded-xl border border-stone-200/70 dark:border-stone-800 overflow-x-auto">
              {[
                { id: 'all', label: 'Semua Role' },
                { id: 'po', label: 'PO' },
                { id: 'dev', label: 'Developer' },
                { id: 'qa', label: 'QA' },
                { id: 'admin', label: 'Admin' },
              ].map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setRoleFilter(role.id as FilterRole)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                    roleFilter === role.id
                      ? 'bg-[#B1E743] text-[#141413] font-bold shadow-xs'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
                  }`}
                >
                  {role.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Guide Selection Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pt-4 mt-4 border-t border-stone-100 dark:border-stone-800 pb-1">
          {filteredGuides.map((guide) => {
            const Icon = guide.icon;
            const isSelected = selectedGuideId === guide.id;
            return (
              <button
                key={guide.id}
                type="button"
                onClick={() => handleSelectGuide(guide.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all border ${
                  isSelected
                    ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 border-stone-900 dark:border-stone-100 shadow-sm'
                    : 'bg-white dark:bg-stone-900/60 text-stone-700 dark:text-stone-300 border-stone-200/80 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-[#B1E743]' : 'text-stone-400'}`} />
                <span>{guide.title}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                    isSelected
                      ? 'bg-white/20 text-white dark:bg-stone-900/20 dark:text-stone-900'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400'
                  }`}
                >
                  {guide.roleBadge}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* ROADMAP VIEW: Grid of all guides */}
      {viewMode === 'roadmap' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGuides.map((guide, idx) => {
            const Icon = guide.icon;
            return (
              <Card
                key={guide.id}
                className="p-5 border-stone-200/80 dark:border-stone-800 dark:bg-[#1C1A19] flex flex-col justify-between space-y-4 hover:border-stone-300 dark:hover:border-stone-700 transition-all shadow-xs hover:shadow-md"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="p-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-[#B1E743]">
                      <Icon className="w-5 h-5" />
                    </span>
                    <Badge variant="neutral">{guide.roleBadge}</Badge>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold font-mono text-stone-400">
                      STEP 0{idx + 1}
                    </span>
                    <h3 className="font-bold text-sm text-stone-900 dark:text-white mt-0.5">
                      {guide.title}
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
                      {guide.subtitle}
                    </p>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-stone-100 dark:border-stone-800/80">
                    {guide.steps.map((step, sIdx) => (
                      <div
                        key={sIdx}
                        className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-400"
                      >
                        <span className="w-4 h-4 rounded-full bg-stone-100 dark:bg-stone-800 text-[10px] flex items-center justify-center font-bold text-stone-500">
                          {sIdx + 1}
                        </span>
                        <span className="truncate">{step.title}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedGuideId(guide.id);
                      setViewMode('simulator');
                      setActiveStepIndex(0);
                    }}
                    className="w-full text-xs"
                  >
                    Buka di Simulator
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => navigate(guide.targetRoute)}
                    rightIcon={<ExternalLink className="w-3 h-3" />}
                    className="shrink-0 text-xs"
                  >
                    Buka Fitur
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* SIMULATOR VIEW */}
      {viewMode === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: Step-by-Step Guidance Panel (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="p-5 border-stone-200/80 dark:border-stone-800 dark:bg-[#1C1A19] space-y-4">
              {/* Header Step Info */}
              <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
                <div className="flex items-center gap-2">
                  <Badge variant="passed">
                    Langkah {activeStepIndex + 1} dari {totalSteps}
                  </Badge>
                  <span className="text-xs font-semibold text-stone-400">{currentGuide.roleBadge}</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleResetSimulation}
                  leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                  className="text-xs text-stone-500"
                >
                  Reset
                </Button>
              </div>

              {/* Step Title & Instruction */}
              <div className="space-y-2">
                <h3 className="text-base font-bold text-stone-900 dark:text-white">
                  {currentStep.title}
                </h3>
                <p className="text-xs font-medium text-stone-500 dark:text-stone-400">
                  {currentStep.shortDesc}
                </p>
                <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200/70 dark:border-stone-800 text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
                  {currentStep.instruction}
                </div>
                {currentStep.tip && (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300">
                    <Lightbulb className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                    <span>
                      <strong>Tips Kualitas:</strong> {currentStep.tip}
                    </span>
                  </div>
                )}
              </div>

              {/* Progress Stepper Indicator */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-[11px] text-stone-500 font-medium">
                  <span>Progres Langkah</span>
                  <span>{Math.round(((activeStepIndex + 1) / totalSteps) * 100)}% Selesai</span>
                </div>
                <div className="w-full h-2 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                  <div
                    className="h-full bg-[#B1E743] transition-all duration-300"
                    style={{ width: `${((activeStepIndex + 1) / totalSteps) * 100}%` }}
                  />
                </div>
              </div>

              {/* Stepper Navigation Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-stone-100 dark:border-stone-800">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePrevStep}
                  disabled={activeStepIndex === 0}
                  leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
                  className="text-xs"
                >
                  Sebelumnya
                </Button>

                {activeStepIndex < totalSteps - 1 ? (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={handleNextStep}
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                    className="text-xs"
                  >
                    Langkah Selanjutnya
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => navigate(currentGuide.targetRoute)}
                    rightIcon={<ExternalLink className="w-3.5 h-3.5" />}
                    className="text-xs"
                  >
                    {currentGuide.targetRouteLabel}
                  </Button>
                )}
              </div>
            </Card>

            {/* Contextual Link Card */}
            <div className="p-4 rounded-xl bg-stone-100 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 flex items-center justify-between">
              <div className="text-xs text-stone-600 dark:text-stone-300">
                <span>Ingin mencoba langsung di aplikasi?</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(currentGuide.targetRoute)}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                className="text-xs"
              >
                {currentGuide.targetRouteLabel}
              </Button>
            </div>
          </div>

          {/* RIGHT: Live Interactive UI Simulation Playground (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            <Card className="p-5 border-stone-200/80 dark:border-stone-800 dark:bg-[#1C1A19] space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900 dark:text-white">
                    Live UI Playground Simulator
                  </h3>
                </div>
                <Badge variant="outline">Simulasi Interaktif</Badge>
              </div>

              {/* SIMULATOR 1: Folder Management */}
              {selectedGuideId === 'folder' && (
                <div className="space-y-4 p-4 rounded-xl bg-stone-50 dark:bg-stone-900/40 border border-stone-200 dark:border-stone-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                      <Folder className="w-4 h-4 text-[#141413] dark:text-[#B1E743]" />
                      Panel Folder Work Hub
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      leftIcon={<Plus className="w-3.5 h-3.5" />}
                      onClick={() => setSimShowFolderModal(true)}
                      className="text-xs"
                    >
                      New Folder
                    </Button>
                  </div>

                  {simShowFolderModal && (
                    <div className="p-3 rounded-xl bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 shadow-sm space-y-2 animate-fadeIn">
                      <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                        Nama Folder Sprint:
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={simFolderInput}
                          onChange={(e) => setSimFolderInput(e.target.value)}
                          className="flex-1 px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-600 text-xs bg-white dark:bg-stone-900 text-stone-900 dark:text-white"
                          placeholder="e.g. Sprint 15 - Notifications"
                        />
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => {
                            if (simFolderInput.trim()) {
                              setSimFolders((prev) => [
                                ...prev,
                                { id: String(Date.now()), name: simFolderInput.trim(), count: 0 },
                              ]);
                              setSimShowFolderModal(false);
                            }
                          }}
                          className="text-xs"
                        >
                          Simpan
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    {simFolders.map((f) => (
                      <div
                        key={f.id}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700/80 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <FolderOpen className="w-3.5 h-3.5 text-stone-400" />
                          <span className="font-semibold text-stone-900 dark:text-white">
                            {f.name}
                          </span>
                        </div>
                        <Badge variant="neutral">{f.count} tasks</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SIMULATOR 2: Specs & Brief */}
              {selectedGuideId === 'specs_brief' && (
                <div className="space-y-3 p-4 rounded-xl bg-stone-50 dark:bg-stone-900/40 border border-stone-200 dark:border-stone-800 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-stone-200 dark:border-stone-700">
                    <span className="font-bold text-stone-900 dark:text-white">
                      Specification Brief v1 (Single Source of Truth)
                    </span>
                    <Badge variant="passed">v1 Ready</Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="p-2.5 rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                      <p className="font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5 mb-1">
                        <span className="w-2 h-2 rounded-full bg-[#B1E743]" /> In Scope (Deliverable)
                      </p>
                      <ul className="list-disc pl-5 space-y-0.5 text-stone-600 dark:text-stone-300 text-[11px]">
                        <li>Saved payment methods & charge API</li>
                        <li>Responsive Checkout UI form</li>
                      </ul>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                      <p className="font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5 mb-1">
                        <span className="w-2 h-2 rounded-full bg-amber-400" /> Acceptance Criteria
                      </p>
                      <ul className="list-disc pl-5 space-y-0.5 text-stone-600 dark:text-stone-300 text-[11px]">
                        <li>User dapat me-review rincian transaksi sebelum bayar</li>
                        <li>Response HTTP 400 memicu error snackbar</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* SIMULATOR 3: Developer Anti Self-Approval Gate */}
              {selectedGuideId === 'dev_flow' && (
                <div className="space-y-4 p-4 rounded-xl bg-stone-50 dark:bg-stone-900/40 border border-stone-200 dark:border-stone-800">
                  <div className="flex items-center justify-between pb-2 border-b border-stone-200 dark:border-stone-700">
                    <div className="text-xs font-bold text-stone-900 dark:text-white">
                      Subtask Dev: Implementasi Checkout Form UI
                    </div>
                    <TaskStatusBadge state={simDevStatus} />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                      Coba Ubah Status Kerja Sebagai Developer:
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant={simDevStatus === 'todo' ? 'primary' : 'outline'}
                        onClick={() => handleDevStatusChange('todo')}
                        className="text-xs"
                      >
                        TODO
                      </Button>
                      <Button
                        size="sm"
                        variant={simDevStatus === 'in_progress' ? 'primary' : 'outline'}
                        onClick={() => handleDevStatusChange('in_progress')}
                        className="text-xs"
                      >
                        IN PROGRESS
                      </Button>
                      <Button
                        size="sm"
                        variant={simDevStatus === 'in_review' ? 'primary' : 'outline'}
                        onClick={() => handleDevStatusChange('in_review')}
                        className="text-xs"
                      >
                        IN REVIEW (Ajukan Uji)
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDevStatusChange('done')}
                        className="text-xs"
                      >
                        DONE (Coba Selesaikan)
                      </Button>
                    </div>
                  </div>

                  {simShowDevBlockModal && (
                    <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-900 dark:text-rose-200 space-y-1.5 animate-fadeIn">
                      <div className="flex items-center gap-1.5 font-bold">
                        <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                        <span>Quality Gate Blocked: Anti Self-Approval</span>
                      </div>
                      <p className="text-[11px] leading-relaxed">
                        Developer dilarang memindahkan tugas ke <strong>DONE</strong> secara
                        mandiri. Subtask wajib diajukan ke <strong>IN REVIEW</strong> dan disetujui
                        oleh Quality Assurance (QA).
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* SIMULATOR 4: QA Review & Approval */}
              {selectedGuideId === 'qa_signoff' || selectedGuideId === 'subtasks_specialties' ? (
                <div className="space-y-4 p-4 rounded-xl bg-stone-50 dark:bg-stone-900/40 border border-stone-200 dark:border-stone-800">
                  <div className="flex items-center justify-between pb-2 border-b border-stone-200 dark:border-stone-700">
                    <div className="text-xs font-bold text-stone-900 dark:text-white">
                      QA Gatekeeper Verification Panel
                    </div>
                    <Badge variant={simQaDecision === 'done' ? 'passed' : 'warning'}>
                      {simQaDecision === 'done'
                        ? 'Approved (DONE)'
                        : simQaDecision === 'changes_requested'
                          ? 'Changes Requested'
                          : 'Waiting Review'}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <span className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                      Simulasikan Keputusan Review QA:
                    </span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setSimQaDecision('changes_requested')}
                        className="text-xs flex-1"
                      >
                        Temukan Bug (Reject)
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => setSimQaDecision('done')}
                        className="text-xs flex-1"
                      >
                        Lolos Uji (Approve ke DONE)
                      </Button>
                    </div>
                  </div>

                  {simQaDecision === 'changes_requested' && (
                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                      <p className="font-bold">Status: CHANGES REQUESTED</p>
                      <p className="text-[11px] italic">&ldquo;{simQaReviewNote}&rdquo;</p>
                      <p className="text-[10px] text-amber-700 dark:text-amber-400">
                        Catatan temuan otomatis dikirimkan ke notifikasi Developer.
                      </p>
                    </div>
                  )}

                  {simQaDecision === 'done' && (
                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
                      <p className="font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        Status Berubah: DONE (Approved by QA)
                      </p>
                      <p className="text-[11px]">
                        Subtask terverifikasi tuntas. Progress deliverable parent task meningkat.
                      </p>
                    </div>
                  )}
                </div>
              ) : null}

              {/* SIMULATOR 5: Spreadsheet Intake Wizard */}
              {selectedGuideId === 'qa_intake' && (
                <div className="space-y-4 p-4 rounded-xl bg-stone-50 dark:bg-stone-900/40 border border-stone-200 dark:border-stone-800">
                  <div className="flex items-center justify-between pb-2 border-b border-stone-200 dark:border-stone-700">
                    <span className="text-xs font-bold text-stone-900 dark:text-white flex items-center gap-1.5">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      Spreadsheet Intake Wizard Simulator
                    </span>
                    <Badge variant="info">3-Step Flow</Badge>
                  </div>

                  <div className="flex items-center justify-between text-xs bg-white dark:bg-stone-800 p-2 rounded-lg border border-stone-200 dark:border-stone-700">
                    <span
                      className={`font-bold ${simSpreadsheetStage === 'upload' ? 'text-emerald-600' : 'text-stone-400'}`}
                    >
                      1. Upload File
                    </span>
                    <span>➔</span>
                    <span
                      className={`font-bold ${simSpreadsheetStage === 'mapping' ? 'text-emerald-600' : 'text-stone-400'}`}
                    >
                      2. Pemetaan Kolom
                    </span>
                    <span>➔</span>
                    <span
                      className={`font-bold ${simSpreadsheetStage === 'preview' ? 'text-emerald-600' : 'text-stone-400'}`}
                    >
                      3. Dry-Run Preview
                    </span>
                  </div>

                  <div className="p-3 bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-stone-800 dark:text-stone-200">
                        file_test_cases_checkout.xlsx
                      </span>
                      <span className="text-stone-500 font-mono">12 baris valid</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSimSpreadsheetStage('mapping')}
                        className="text-xs flex-1"
                      >
                        Lihat Pemetaan Kolom
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => setSimSpreadsheetStage('preview')}
                        className="text-xs flex-1"
                      >
                        Commit Import (12 Test Cases)
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* SIMULATOR 6: PO Release Decision */}
              {selectedGuideId === 'po_release_decision' && (
                <div className="space-y-4 p-4 rounded-xl bg-stone-50 dark:bg-stone-900/40 border border-stone-200 dark:border-stone-800 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-stone-200 dark:border-stone-700">
                    <span className="font-bold text-stone-900 dark:text-white">
                      PO Release Decision Desk
                    </span>
                    <Badge variant={simPoDecision === 'approved' ? 'passed' : 'warning'}>
                      {simPoDecision === 'approved' ? 'Release Approved' : 'Decision Pending'}
                    </Badge>
                  </div>

                  <div className="p-3 bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-stone-600 dark:text-stone-300">QA Sign-off Status:</span>
                      <Badge variant="passed">Approved by QA</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-stone-600 dark:text-stone-300">Test Coverage:</span>
                      <span className="font-bold text-stone-900 dark:text-white">100% Pass</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setSimPoDecision('rejected')}
                      className="text-xs flex-1"
                    >
                      Reject Release
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => setSimPoDecision('approved')}
                      className="text-xs flex-1"
                    >
                      Approve Release Decision
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
