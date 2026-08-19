import React from 'react';
import {
  Rocket,
  BookOpen,
  ArrowRight,
  Layers,
  CheckSquare,
  Building2,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { Card } from '../../atoms/Card';
import { Button } from '../../atoms/Button';
import { Badge } from '../../atoms/Badge';

interface OnboardingQuickLaunchStepProps {
  role: string;
  onLaunchDestination: (destination: string) => void;
}

export const OnboardingQuickLaunchStep: React.FC<OnboardingQuickLaunchStepProps> = ({
  role,
  onLaunchDestination,
}) => {
  const normalizedRole = role.toLowerCase();

  const getPrimaryLaunchTarget = () => {
    switch (normalizedRole) {
      case 'po':
        return {
          path: '/work',
          title: 'Buka Work Hub (Sprint Planner)',
          desc: 'Mulai merumuskan folder rilis, parent task, dan membagi subtask ke tim.',
          icon: Layers,
          buttonText: 'Luncurkan Work Hub',
        };
      case 'dev':
        return {
          path: '/my-tasks',
          title: 'Buka My Tasks (Ruang Kerja Dev)',
          desc: 'Lihat antrean subtask coding Anda dan mulai update status pengerjaan.',
          icon: CheckSquare,
          buttonText: 'Luncurkan My Tasks',
        };
      case 'qa':
        return {
          path: '/my-tasks',
          title: 'Buka Quality Gate & My Tasks',
          desc: 'Pantau subtask yang siap direview dan jalankan pengujian QA.',
          icon: ShieldCheck,
          buttonText: 'Luncurkan Quality Gate',
        };
      case 'owner':
      case 'admin':
        return {
          path: '/workspaces/settings',
          title: 'Buka Workspace Settings',
          desc: 'Atur konfigurasi tim, undang anggota baru, dan sesuaikan Task Creation Policy.',
          icon: Building2,
          buttonText: 'Luncurkan Settings',
        };
      default:
        return {
          path: '/work',
          title: 'Buka Overview Hub',
          desc: 'Lihat ringkasan tugas dan status rilis proyek secara umum.',
          icon: Rocket,
          buttonText: 'Mulai Menjelajah',
        };
    }
  };

  const primaryTarget = getPrimaryLaunchTarget();
  const PrimaryIcon = primaryTarget.icon;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Ready Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#B1E743]/20 border border-[#B1E743]/40 text-xs font-bold text-stone-900 dark:text-[#B1E743]">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Onboarding Selesai — Siap Berkolaborasi</span>
        </div>
        <h3 className="text-2xl font-extrabold text-stone-900 dark:text-white tracking-tight">
          Anda Siap Memulai di Qlick Hub!
        </h3>
        <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 max-w-md mx-auto leading-relaxed">
          Semua panduan peran dan alur kerja telah Anda pelajari. Klik menu di bawah untuk langsung menuju area kerja utama Anda.
        </p>
      </div>

      {/* Primary Destination Action Card */}
      <Card className="p-5 sm:p-6 border-stone-200/80 dark:border-stone-800 dark:bg-[#1C1A19] shadow-md relative overflow-hidden group">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-[#B1E743]/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-stone-900 text-white dark:bg-[#B1E743] dark:text-stone-900 shadow-sm shrink-0">
              <PrimaryIcon className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm sm:text-base text-stone-900 dark:text-white">
                  {primaryTarget.title}
                </h4>
                <Badge variant="neutral" size="sm">Rekomendasi Peran</Badge>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed max-w-md">
                {primaryTarget.desc}
              </p>
            </div>
          </div>

          <Button
            size="md"
            onClick={() => onLaunchDestination(primaryTarget.path)}
            rightIcon={<ArrowRight className="w-4 h-4" />}
            className="shrink-0 w-full sm:w-auto text-xs font-bold"
          >
            {primaryTarget.buttonText}
          </Button>
        </div>
      </Card>

      {/* Replay Notice Footer */}
      <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-900/50 border border-stone-200/60 dark:border-stone-800 flex items-center justify-between gap-3 text-xs text-stone-500 dark:text-stone-400">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-emerald-600 dark:text-[#B1E743] shrink-0" />
          <span>
            Butuh menyegarkan ingatan? Anda dapat membuka kembali panduan kapan saja melalui <strong>Menu Profil</strong> (kanan atas) atau halaman <strong>User Flow Guide</strong>.
          </span>
        </div>
      </div>
    </div>
  );
};
