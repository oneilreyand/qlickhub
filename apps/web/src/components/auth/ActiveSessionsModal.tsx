import React, { useEffect, useState } from 'react';
import { Laptop, Smartphone, Globe, Trash2, RefreshCw, AlertCircle } from 'lucide-react';
import { Modal } from '../ui/molecules/Modal';
import { Button } from '../ui/atoms/Button';
import { IconButton } from '../ui/atoms/IconButton';
import { Badge } from '../ui/atoms/Badge';
import { EmptyState } from '../ui/molecules/EmptyState';
import { authService } from '../../lib/api/authService';

interface ActiveSessionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SessionItem {
  id: string;
  userId: string;
  userAgent: string | null;
  ipAddress: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  isCurrent?: boolean;
}

export const ActiveSessionsModal: React.FC<ActiveSessionsModalProps> = ({ isOpen, onClose }) => {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRevokingOther, setIsRevokingOther] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchSessions = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await authService.listSessions();
      setSessions(data);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal memuat daftar sesi.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSessions();
    }
  }, [isOpen]);

  const handleRevoke = async (sessionId: string, isCurrent?: boolean) => {
    setRevokingId(sessionId);
    try {
      await authService.revokeSession(sessionId);
      if (isCurrent) {
        onClose();
        window.location.href = '/login';
        return;
      }
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal membatalkan sesi.');
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeOthers = async () => {
    setIsRevokingOther(true);
    try {
      await authService.revokeOtherSessions();
      setSessions((prev) => prev.filter((s) => s.isCurrent));
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal membatalkan sesi lain.');
    } finally {
      setIsRevokingOther(false);
    }
  };

  const getDeviceIcon = (userAgent: string | null) => {
    if (!userAgent) return <Globe className="h-4 w-4 text-stone-500" />;
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return <Smartphone className="h-4 w-4 text-stone-500" />;
    }
    return <Laptop className="h-4 w-4 text-stone-500" />;
  };

  const parseUserAgent = (userAgent: string | null) => {
    if (!userAgent) return 'Perangkat Tidak Dikenal';
    if (userAgent.includes('Edg/')) return 'Microsoft Edge';
    if (userAgent.includes('Chrome/')) return 'Google Chrome';
    if (userAgent.includes('Firefox/')) return 'Mozilla Firefox';
    if (userAgent.includes('Safari/') && !userAgent.includes('Chrome/')) return 'Apple Safari';
    return userAgent.slice(0, 30);
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const hasOtherSessions = sessions.some((s) => !s.isCurrent);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Perangkat & Sesi Aktif"
      description="Kelola sesi login yang aktif di browser atau perangkat lain."
      size="md"
      secondaryActionLabel="Tutup"
    >
      <div className="space-y-4">
        {errorMessage && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8 text-stone-400 space-y-2">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span className="text-xs">Memuat sesi aktif…</span>
          </div>
        ) : sessions.length === 0 ? (
          <EmptyState
            icon={<Laptop className="h-6 w-6" />}
            title="Tidak ada sesi"
            description="Tidak ditemukan sesi aktif untuk akun ini."
          />
        ) : (
          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                  session.isCurrent
                    ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/60 dark:bg-emerald-950/20'
                    : 'border-stone-200 bg-stone-50/50 hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-900/40'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white shadow-xs border border-stone-200/80 dark:bg-stone-800 dark:border-stone-700">
                    {getDeviceIcon(session.userAgent)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-stone-900 truncate dark:text-stone-100">
                        {parseUserAgent(session.userAgent)}
                      </span>
                      {session.isCurrent && (
                        <Badge variant="passed" size="sm" className="text-[10px] px-1.5 py-0">
                          Sesi Ini
                        </Badge>
                      )}
                    </div>
                    <div className="text-[11px] text-stone-500 truncate dark:text-stone-400">
                      {session.ipAddress ? `IP: ${session.ipAddress}` : 'IP Lokal'} • Aktif: {formatDate(session.updatedAt)}
                    </div>
                  </div>
                </div>

                <IconButton
                  onClick={() => handleRevoke(session.id, session.isCurrent)}
                  label={session.isCurrent ? 'Logout sesi ini' : 'Putuskan sesi'}
                  size="sm"
                  variant="ghost"
                  disabled={revokingId === session.id}
                  className="text-stone-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  {revokingId === session.id ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </IconButton>
              </div>
            ))}
          </div>
        )}

        {hasOtherSessions && (
          <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              isLoading={isRevokingOther}
              onClick={handleRevokeOthers}
              className="text-stone-600 border-stone-300 hover:bg-stone-100 dark:text-stone-300 dark:border-stone-700 dark:hover:bg-stone-800"
            >
              Putuskan Semua Perangkat Lain
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};

