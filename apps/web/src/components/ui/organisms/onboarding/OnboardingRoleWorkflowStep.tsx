import React from 'react';
import { Compass } from 'lucide-react';
import { Alert } from '../../atoms/Alert';

interface OnboardingRoleWorkflowStepProps {
  role: string;
}

export const OnboardingRoleWorkflowStep: React.FC<OnboardingRoleWorkflowStepProps> = ({ role }) => {
  const normalizedRole = role.toLowerCase();

  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-emerald-600 dark:text-[#B1E743]" />
          <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-white">
            Alur Kerja & Panduan Khusus Peran Anda
          </h3>
        </div>
        <p className="text-xs text-stone-500 dark:text-stone-400">
          Kenali tanggung jawab harian dan aturan kolaborasi lintas peran di Qlick Hub.
        </p>
      </div>

      {/* PO Workflow */}
      {normalizedRole === 'po' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200/70 dark:border-stone-800 space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-[#B1E743] font-bold text-xs">
                <span className="w-5 h-5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 dark:text-[#B1E743] text-emerald-800 flex items-center justify-center text-[10px] font-extrabold">
                  1
                </span>
                <span>Struktur Sprint & Folder</span>
              </div>
              <h4 className="font-bold text-xs text-stone-900 dark:text-white">
                Kelola Hirarki Sprint
              </h4>
              <p className="text-[11px] text-stone-600 dark:text-stone-400 leading-relaxed">
                Buat inisiatif rilis dan folder sprint di Work Hub untuk mengelompokkan deliverable
                fitur tim.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200/70 dark:border-stone-800 space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-[#B1E743] font-bold text-xs">
                <span className="w-5 h-5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 dark:text-[#B1E743] text-emerald-800 flex items-center justify-center text-[10px] font-extrabold">
                  2
                </span>
                <span>Product Brief & Requirements</span>
              </div>
              <h4 className="font-bold text-xs text-stone-900 dark:text-white">
                Definisikan Kebutuhan & AC
              </h4>
              <p className="text-[11px] text-stone-600 dark:text-stone-400 leading-relaxed">
                Tulis Product Brief (🎨 Figma, 📄 PRD) serta rumuskan Requirements dengan Kriteria
                Penerimaan (<em>Acceptance Criteria</em>) yang stabil.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200/70 dark:border-stone-800 space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-[#B1E743] font-bold text-xs">
                <span className="w-5 h-5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 dark:text-[#B1E743] text-emerald-800 flex items-center justify-center text-[10px] font-extrabold">
                  3
                </span>
                <span>Breakdown Subtask Spesialisasi</span>
              </div>
              <h4 className="font-bold text-xs text-stone-900 dark:text-white">
                Delegasi ke Pelaksana
              </h4>
              <p className="text-[11px] text-stone-600 dark:text-stone-400 leading-relaxed">
                Pecah parent task ke subtask terarah sesuai spesialisasi: Frontend, Backend, Mobile,
                Fullstack, dan Subtask QA terpisah.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200/70 dark:border-stone-800 space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-[#B1E743] font-bold text-xs">
                <span className="w-5 h-5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 dark:text-[#B1E743] text-emerald-800 flex items-center justify-center text-[10px] font-extrabold">
                  4
                </span>
                <span>Penyelesaian & Gerbang Rilis</span>
              </div>
              <h4 className="font-bold text-xs text-stone-900 dark:text-white">
                Evaluasi Release Decision
              </h4>
              <p className="text-[11px] text-stone-600 dark:text-stone-400 leading-relaxed">
                Tinjau jaminan QA Sign-off, pantau coverage requirement dan pass rate uji, lalu
                terbitkan Keputusan Rilis (<em>Release Decision</em>) untuk menyelesaikan fitur.
              </p>
            </div>
          </div>

          <Alert tone="info" title="Hak Akses Product Owner">
            Hanya PO dan Admin yang berwenang merumuskan parent task, mengatur folder sprint,
            mengelola Requirements, dan menerbitkan Release Decision.
          </Alert>
        </div>
      )}

      {/* Developer Workflow */}
      {normalizedRole === 'dev' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200/70 dark:border-stone-800 space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-[#B1E743] font-bold text-xs">
                <span className="w-5 h-5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 dark:text-[#B1E743] text-emerald-800 flex items-center justify-center text-[10px] font-extrabold">
                  1
                </span>
                <span>Fokus di My Tasks</span>
              </div>
              <h4 className="font-bold text-xs text-stone-900 dark:text-white">
                Ruang Kerja Personal
              </h4>
              <p className="text-[11px] text-stone-600 dark:text-stone-400 leading-relaxed">
                Buka menu <strong>My Tasks</strong> untuk melihat seluruh subtask coding yang
                ditugaskan khusus untuk Anda.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200/70 dark:border-stone-800 space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-[#B1E743] font-bold text-xs">
                <span className="w-5 h-5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 dark:text-[#B1E743] text-emerald-800 flex items-center justify-center text-[10px] font-extrabold">
                  2
                </span>
                <span>Eksekusi Coding & Review</span>
              </div>
              <h4 className="font-bold text-xs text-stone-900 dark:text-white">
                Todo ➔ In Progress ➔ In Review
              </h4>
              <p className="text-[11px] text-stone-600 dark:text-stone-400 leading-relaxed">
                Mulai pekerjaan dengan mengubah status ke <em>In Progress</em>. Saat coding &
                testing internal selesai, ajukan ke <em>In Review</em>.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200/70 dark:border-stone-800 space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-[#B1E743] font-bold text-xs">
                <span className="w-5 h-5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 dark:text-[#B1E743] text-emerald-800 flex items-center justify-center text-[10px] font-extrabold">
                  3
                </span>
                <span>Anti Self-Approval Rule</span>
              </div>
              <h4 className="font-bold text-xs text-stone-900 dark:text-white">
                Quality Gate Independen
              </h4>
              <p className="text-[11px] text-stone-600 dark:text-stone-400 leading-relaxed">
                Developer dilarang memindahkan subtask langsung ke <em>Done</em>. Verifikasi akhir
                wajib melalui review QA atau PO.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200/70 dark:border-stone-800 space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-[#B1E743] font-bold text-xs">
                <span className="w-5 h-5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 dark:text-[#B1E743] text-emerald-800 flex items-center justify-center text-[10px] font-extrabold">
                  4
                </span>
                <span>Kolaborasi & Resolusi Bug</span>
              </div>
              <h4 className="font-bold text-xs text-stone-900 dark:text-white">
                Diskusi & Perbaikan Defect
              </h4>
              <p className="text-[11px] text-stone-600 dark:text-stone-400 leading-relaxed">
                Gunakan tab diskusi subtask untuk <code>@mention</code> rekan tim dan lampirkan bukti media.
                Perbaiki Bug yang dicatat QA dan tandai status <em>Resolved</em> untuk retest.
              </p>
            </div>
          </div>

          <Alert tone="warning" title="Aturan Quality Gate untuk Developer">
            Jika QA menemukan bug atau meminta revisi, status subtask akan berpindah ke{' '}
            <strong>Changes Requested</strong> beserta catatan review spesifik.
          </Alert>
        </div>
      )}

      {/* QA Workflow */}
      {normalizedRole === 'qa' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200/70 dark:border-stone-800 space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-[#B1E743] font-bold text-xs">
                <span className="w-5 h-5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 dark:text-[#B1E743] text-emerald-800 flex items-center justify-center text-[10px] font-extrabold">
                  1
                </span>
                <span>Quality Gatekeeper</span>
              </div>
              <h4 className="font-bold text-xs text-stone-900 dark:text-white">
                Subtask QA & Review Dev
              </h4>
              <p className="text-[11px] text-stone-600 dark:text-stone-400 leading-relaxed">
                Jalankan Subtask QA mandiri Anda (<em>Todo ➔ In Progress ➔ Done</em>) dan tinjau subtask
                pengembang yang diajukan ke status <em>In Review</em>.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200/70 dark:border-stone-800 space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-[#B1E743] font-bold text-xs">
                <span className="w-5 h-5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 dark:text-[#B1E743] text-emerald-800 flex items-center justify-center text-[10px] font-extrabold">
                  2
                </span>
                <span>Catatan Review & Laporan Bug</span>
              </div>
              <h4 className="font-bold text-xs text-stone-900 dark:text-white">
                Changes Requested & Defect
              </h4>
              <p className="text-[11px] text-stone-600 dark:text-stone-400 leading-relaxed">
                Jika terdapat kendala, ajukan status <em>Changes Requested</em> atau catat Bug mandiri
                disertai bukti media untuk diperbaiki oleh Developer.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200/70 dark:border-stone-800 space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-[#B1E743] font-bold text-xs">
                <span className="w-5 h-5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 dark:text-[#B1E743] text-emerald-800 flex items-center justify-center text-[10px] font-extrabold">
                  3
                </span>
                <span>QA Testing Desk & Test Runs</span>
              </div>
              <h4 className="font-bold text-xs text-stone-900 dark:text-white">
                Eksekusi Pengujian Terpadu
              </h4>
              <p className="text-[11px] text-stone-600 dark:text-stone-400 leading-relaxed">
                Buka QA Testing Desk di My Tasks untuk mengeksekusi Test Run pada Test Case aktif yang
                ditautkan ke Requirement fitur di Task Hub.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200/70 dark:border-stone-800 space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-[#B1E743] font-bold text-xs">
                <span className="w-5 h-5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 dark:text-[#B1E743] text-emerald-800 flex items-center justify-center text-[10px] font-extrabold">
                  4
                </span>
                <span>Traceability & QA Sign-off</span>
              </div>
              <h4 className="font-bold text-xs text-stone-900 dark:text-white">Jaminan Kualitas Rilis</h4>
              <p className="text-[11px] text-stone-600 dark:text-stone-400 leading-relaxed">
                Validasi pemenuhan seluruh kriteria penerimaan, rekam hasil uji immutable, dan terbitkan
                dokumen formal <strong>QA Sign-off</strong> sebagai syarat rilis.
              </p>
            </div>
          </div>

          <Alert tone="info" title="Wewenang Quality Assurance">
            QA adalah pihak yang menjamin standar rilis aplikasi. Setiap hasil pengujian, resolusi bug,
            dan persetujuan QA Sign-off tercatat permanen di Immutable Activity Log.
          </Alert>
        </div>
      )}

      {/* Owner / Admin Workflow */}
      {(normalizedRole === 'owner' || normalizedRole === 'admin') && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200/70 dark:border-stone-800 space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-[#B1E743] font-bold text-xs">
                <span className="w-5 h-5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 dark:text-[#B1E743] text-emerald-800 flex items-center justify-center text-[10px] font-extrabold">
                  1
                </span>
                <span>Workspace Governance</span>
              </div>
              <h4 className="font-bold text-xs text-stone-900 dark:text-white">
                Inisiasi & Konfigurasi Tim
              </h4>
              <p className="text-[11px] text-stone-600 dark:text-stone-400 leading-relaxed">
                Buat workspace baru, atur visibilitas proyek, dan kelola konfigurasi ruang kerja
                perusahaan.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200/70 dark:border-stone-800 space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-[#B1E743] font-bold text-xs">
                <span className="w-5 h-5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 dark:text-[#B1E743] text-emerald-800 flex items-center justify-center text-[10px] font-extrabold">
                  2
                </span>
                <span>Undang & Atur Anggota</span>
              </div>
              <h4 className="font-bold text-xs text-stone-900 dark:text-white">
                Penetapan Peran (RBAC)
              </h4>
              <p className="text-[11px] text-stone-600 dark:text-stone-400 leading-relaxed">
                Undang anggota tim dengan peran yang tepat (PO, Dev Frontend, Dev Backend, QA) dan
                transfer kepemilikan.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200/70 dark:border-stone-800 space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-[#B1E743] font-bold text-xs">
                <span className="w-5 h-5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 dark:text-[#B1E743] text-emerald-800 flex items-center justify-center text-[10px] font-extrabold">
                  3
                </span>
                <span>Task Creation Policy</span>
              </div>
              <h4 className="font-bold text-xs text-stone-900 dark:text-white">
                Kontrol Perencanaan
              </h4>
              <p className="text-[11px] text-stone-600 dark:text-stone-400 leading-relaxed">
                Tentukan kebijakan apakah Dev diizinkan membuat parent task mandiri atau khusus
                dirancang oleh PO.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200/70 dark:border-stone-800 space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-[#B1E743] font-bold text-xs">
                <span className="w-5 h-5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 dark:text-[#B1E743] text-emerald-800 flex items-center justify-center text-[10px] font-extrabold">
                  4
                </span>
                <span>Audit & Moderasi Eskalasi</span>
              </div>
              <h4 className="font-bold text-xs text-stone-900 dark:text-white">
                Governance Override
              </h4>
              <p className="text-[11px] text-stone-600 dark:text-stone-400 leading-relaxed">
                Pantau riwayat audit mutasi, buka blokir tugas eskalasi, dan moderasi komentar tim
                jika diperlukan.
              </p>
            </div>
          </div>

          <Alert tone="info" title="Hak Istimewa Administrator">
            Owner & Admin memiliki hak akses penuh ke seluruh pengaturan workspace, laporan
            analitik, dan kontrol keamanan sesi aktif.
          </Alert>
        </div>
      )}

      {/* Viewer Workflow */}
      {normalizedRole !== 'po' &&
        normalizedRole !== 'dev' &&
        normalizedRole !== 'qa' &&
        normalizedRole !== 'owner' &&
        normalizedRole !== 'admin' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200/70 dark:border-stone-800 space-y-2">
              <h4 className="font-bold text-xs text-stone-900 dark:text-white">
                Akses Pemantauan (Read-Only)
              </h4>
              <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                Anda dapat melihat status seluruh inisiatif rilis, daftar task, dan laporan
                pengujian tanpa melakukan perubahan data.
              </p>
            </div>
          </div>
        )}
    </div>
  );
};
