import React from 'react';
import {
  Sparkles,
  ShieldCheck,
  Layers,
  Code2,
  TestTube,
  Eye,
  Mail,
} from 'lucide-react';
import { Card } from '../../atoms/Card';
import { Badge } from '../../atoms/Badge';
import { User } from '../../../../lib/api/authService';

interface OnboardingWelcomeStepProps {
  user: User;
}

export const getRoleMeta = (role: string = '') => {
  const normalizedRole = role.toLowerCase();
  switch (normalizedRole) {
    case 'owner':
    case 'admin':
      return {
        title: 'Workspace Owner & Admin',
        badge: 'Governance & Management',
        badgeVariant: 'neutral' as const,
        icon: ShieldCheck,
        colorClass: 'text-stone-900 bg-[#B1E743]/20 dark:bg-stone-800 dark:text-[#B1E743]',
        summary:
          'Anda memegang kendali tata kelola workspace, pengaturan anggota tim, konfigurasi Task Policy, dan audit log.',
      };
    case 'po':
      return {
        title: 'Product Owner (PO)',
        badge: 'Planning & Product Lead',
        badgeVariant: 'passed' as const,
        icon: Layers,
        colorClass: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-[#B1E743]',
        summary:
          'Anda memimpin perencanaan folder sprint, spesifikasi parent task, delegasi subtask ke Dev & QA, dan final acceptance.',
      };
    case 'dev':
      return {
        title: 'Software Developer (Frontend / Backend)',
        badge: 'Execution & Delivery',
        badgeVariant: 'passed' as const,
        icon: Code2,
        colorClass: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-[#B1E743]',
        summary:
          'Fokus Anda adalah eksekusi subtask di My Tasks, pembaruan status coding (In Progress ➔ In Review), dan diskusi teknis tim.',
      };
    case 'qa':
      return {
        title: 'Quality Assurance (QA Engineer)',
        badge: 'Verification & Quality Gate',
        badgeVariant: 'passed' as const,
        icon: TestTube,
        colorClass: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-[#B1E743]',
        summary:
          'Anda adalah gatekeeper kualitas yang mereview subtask, memberi catatan review/bug, memvalidasi status Done, dan menjaga Traceability.',
      };
    default:
      return {
        title: 'Workspace Viewer',
        badge: 'Read-Only Member',
        badgeVariant: 'neutral' as const,
        icon: Eye,
        colorClass: 'text-stone-500 bg-stone-100 dark:bg-stone-800 dark:text-stone-300',
        summary:
          'Anda memiliki akses monitoring rilis, laporan analitik, dan riwayat aktivitas tim.',
      };
  }
};

export const OnboardingWelcomeStep: React.FC<OnboardingWelcomeStepProps> = ({ user }) => {
  const roleMeta = getRoleMeta(user.role);
  const RoleIcon = roleMeta.icon;
  const userInitial = user.name ? user.name[0].toUpperCase() : user.email[0].toUpperCase();

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Personalized Greeting Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-stone-100 dark:bg-stone-800 border border-stone-200/80 dark:border-stone-700/80 text-xs font-bold text-stone-700 dark:text-stone-300">
          <Sparkles className="w-3.5 h-3.5 text-[#B1E743]" />
          <span>Selamat Datang di Qlick Hub</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 dark:text-white tracking-tight">
          Halo, <span className="text-emerald-600 dark:text-[#B1E743]">{user.name || user.email.split('@')[0]}</span>!
        </h2>
        <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 max-w-lg mx-auto leading-relaxed">
          Platform kolaborasi dan orkestrasi tugas end-to-end yang menghubungkan Product Owner, Developer, dan QA secara terintegrasi.
        </p>
      </div>

      {/* Confirmed Account Persona Card */}
      <Card className="p-5 sm:p-6 border-stone-200/80 dark:border-stone-800 dark:bg-[#1C1A19] shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100 dark:border-stone-800/80">
          <div className="flex items-center gap-3.5">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#22201F] text-white dark:bg-[#B1E743] dark:text-[#22201F] font-bold text-lg shadow-sm shrink-0">
              {userInitial}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base text-stone-900 dark:text-white truncate">
                {user.name || 'User Profile'}
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400 mt-0.5 truncate">
                <Mail className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{user.email}</span>
              </div>
            </div>
          </div>

          <div className="flex sm:flex-col sm:items-end gap-1.5 shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
              Peran Akun Login
            </span>
            <Badge variant={roleMeta.badgeVariant} size="md">
              {roleMeta.badge}
            </Badge>
          </div>
        </div>

        {/* Role Highlight Banner */}
        <div className="mt-4 p-4 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200/60 dark:border-stone-800 flex items-start gap-3.5">
          <div className={`p-2.5 rounded-xl shrink-0 ${roleMeta.colorClass}`}>
            <RoleIcon className="w-5 h-5" />
          </div>
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-stone-900 dark:text-white">
                {roleMeta.title}
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-[#B1E743]" />
            </div>
            <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
              {roleMeta.summary}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
