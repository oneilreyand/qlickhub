import React, { useEffect, useRef, useState } from 'react';
import { Bell, ChevronDown, LogOut, Menu, Moon, Sun, Shield, Building2, Plus, Check, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { useTheme } from '../../lib/theme/ThemeContext';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchWorkspaces, setActiveWorkspaceId, createWorkspace } from '../../store/workspaceSlice';
import { enqueueSnackbar } from '../../store/uiSlice';
import { useNavigate, useLocation } from 'react-router-dom';
import { IconButton } from '../ui/atoms/IconButton';
import { Input } from '../ui/atoms/Input';
import { Textarea } from '../ui/atoms/Textarea';
import { Modal } from '../ui/molecules/Modal';
import { useDismissableLayer } from '../../hooks/useDismissableLayer';

interface HeaderProps {
  onToggleMobileSidebar: () => void;
  userEmail?: string;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleMobileSidebar,
  userEmail = 'qa.lead@company.com',
  onLogout,
}) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const currentTab = searchParams.get('tab') || 'overview';

  const { workspaces, activeWorkspaceId, isLoading, error } = useAppSelector((state) => state.workspace);

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [showCreateWsModal, setShowCreateWsModal] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [newWsDesc, setNewWsDesc] = useState('');
  const [isCreatingWs, setIsCreatingWs] = useState(false);

  const workspaceMenuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const { theme, toggleTheme } = useTheme();
  const isDarkMode = theme === 'dark';

  const userInitial = userEmail ? userEmail[0].toUpperCase() : 'U';
  const userName = userEmail.split('@')[0].replace('.', ' ');

  useDismissableLayer(workspaceMenuRef, showWorkspaceMenu, () => setShowWorkspaceMenu(false));
  useDismissableLayer(notificationRef, showNotifications, () => setShowNotifications(false));
  useDismissableLayer(profileMenuRef, isProfileOpen, () => setIsProfileOpen(false));

  useEffect(() => {
    dispatch(fetchWorkspaces());
  }, [dispatch]);

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0];

  const handleOpenCreateModal = () => {
    setShowWorkspaceMenu(false);
    setShowCreateWsModal(true);
  };

  const handleCreateWs = async () => {
    if (!newWsName.trim()) return;
    setIsCreatingWs(true);
    try {
      await dispatch(createWorkspace({ name: newWsName.trim(), description: newWsDesc.trim() || undefined })).unwrap();
      dispatch(enqueueSnackbar(`Workspace "${newWsName.trim()}" created successfully!`, 'success'));
      setNewWsName('');
      setNewWsDesc('');
      setShowCreateWsModal(false);
    } catch (err) {
      dispatch(enqueueSnackbar(err instanceof Error ? err.message : 'Failed to create workspace', 'error'));
    } finally {
      setIsCreatingWs(false);
    }
  };

  const isOverviewActive = location.pathname === '/work' && currentTab === 'overview';
  const isTasksActive = location.pathname === '/work' && currentTab === 'tasks';
  const isReqsActive = location.pathname === '/requirements' || (location.pathname === '/work' && currentTab === 'requirements');
  const isReportsActive = location.pathname === '/reports';
  const isComponentsActive = location.pathname === '/components';
  const isSettingsActive = location.pathname === '/workspaces/settings';

  return (
    <header className="sticky top-0 z-30 flex h-20 w-full items-center justify-between border-b border-stone-200/60 bg-[#FBFCF7]/95 px-4 backdrop-blur-md transition-colors sm:px-8 dark:border-stone-800/80 dark:bg-[#141413]/95 dark:text-stone-100">
      {/* Left section: App Brand Logo & Workspace Switcher */}
      <div className="flex items-center gap-3 lg:gap-4">
        <IconButton
          onClick={onToggleMobileSidebar}
          label="Toggle mobile menu"
          variant="ghost"
          className="lg:hidden text-stone-700 hover:bg-stone-200/60 dark:text-stone-300 dark:hover:bg-stone-800"
        >
          <Menu className="h-5 w-5" />
        </IconButton>

        {/* Brand Logo Pill */}
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#B1E743] text-[#22201F] shadow-sm font-black text-lg">
            Q
          </div>
        </div>

        {/* Workspace Switcher Dropdown */}
        <div className="relative hidden xl:block" ref={workspaceMenuRef}>
          <button
            type="button"
            onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
            aria-label="Switch Workspace"
            className="flex items-center gap-2 rounded-2xl border border-stone-200/80 bg-white px-3 py-1.5 min-h-[38px] text-xs font-semibold text-stone-800 hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-[#22201F]/20 transition-all dark:border-stone-800 dark:bg-stone-900 dark:text-stone-200"
          >
            <Building2 className="h-3.5 w-3.5 text-stone-500" />
            <span className="max-w-[120px] truncate">
              {isLoading
                ? 'Loading...'
                : activeWorkspace
                ? activeWorkspace.name
                : 'Select Workspace'}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-stone-400" />
          </button>

          {/* Workspace Menu Dropdown */}
          {showWorkspaceMenu && (
            <div className="absolute left-0 mt-2 w-64 rounded-2xl border border-stone-200 bg-white p-2 shadow-xl ring-1 ring-stone-900/5 z-30 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100">
              <div className="flex items-center justify-between px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                <span>Workspaces ({workspaces.length})</span>
                {isLoading && <Loader2 className="h-3 w-3 animate-spin text-[#22201F]" />}
              </div>

              {error ? (
                <div className="p-3 my-1 rounded-xl bg-rose-50 text-rose-700 text-xs flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <p className="font-medium">{error}</p>
                    <button
                      type="button"
                      onClick={() => dispatch(fetchWorkspaces())}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold underline"
                    >
                      <RefreshCw className="h-3 w-3" /> Retry
                    </button>
                  </div>
                </div>
              ) : (
                <div className="max-h-56 overflow-y-auto space-y-1 py-1">
                  {workspaces.map((ws) => {
                    const isSelected = ws.id === activeWorkspace?.id;
                    return (
                      <button
                        key={ws.id}
                        type="button"
                        onClick={() => {
                          dispatch(setActiveWorkspaceId(ws.id));
                          setShowWorkspaceMenu(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
                          isSelected
                            ? 'bg-[#22201F] text-white font-semibold'
                            : 'text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800'
                        }`}
                      >
                        <span className="truncate">{ws.name}</span>
                        {isSelected && <Check className="h-4 w-4 text-[#B1E743]" />}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="border-t border-stone-100 pt-1 dark:border-stone-800">
                <button
                  type="button"
                  onClick={handleOpenCreateModal}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-stone-900 hover:bg-stone-100 dark:text-stone-100 dark:hover:bg-stone-800"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Workspace</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Center section: Content-aligned Top Navigation Pills Bar */}
      <nav className="hidden lg:flex items-center gap-1 bg-white/80 dark:bg-stone-900/80 p-1.5 rounded-full border border-stone-200/80 dark:border-stone-800 shadow-xs">
        <button
          onClick={() => navigate('/work?tab=overview')}
          className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
            isOverviewActive
              ? 'bg-[#22201F] text-white font-bold shadow-xs dark:bg-[#B1E743] dark:text-[#22201F]'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100 dark:text-stone-400 dark:hover:text-stone-100 dark:hover:bg-stone-800'
          }`}
        >
          Overview
        </button>

        <button
          onClick={() => navigate('/work?tab=tasks')}
          className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
            isTasksActive
              ? 'bg-[#22201F] text-white font-bold shadow-xs dark:bg-[#B1E743] dark:text-[#22201F]'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100 dark:text-stone-400 dark:hover:text-stone-100 dark:hover:bg-stone-800'
          }`}
        >
          Task Hub
        </button>

        <button
          onClick={() => navigate('/requirements')}
          className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
            isReqsActive
              ? 'bg-[#22201F] text-white font-bold shadow-xs dark:bg-[#B1E743] dark:text-[#22201F]'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100 dark:text-stone-400 dark:hover:text-stone-100 dark:hover:bg-stone-800'
          }`}
        >
          My Tasks
        </button>

        <button
          onClick={() => navigate('/reports')}
          className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
            isReportsActive
              ? 'bg-[#22201F] text-white font-bold shadow-xs dark:bg-[#B1E743] dark:text-[#22201F]'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100 dark:text-stone-400 dark:hover:text-stone-100 dark:hover:bg-stone-800'
          }`}
        >
          Report
        </button>

        <button
          onClick={() => navigate('/workspaces/settings')}
          className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
            isSettingsActive
              ? 'bg-[#22201F] text-white font-bold shadow-xs dark:bg-[#B1E743] dark:text-[#22201F]'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100 dark:text-stone-400 dark:hover:text-stone-100 dark:hover:bg-stone-800'
          }`}
        >
          Workspace Settings
        </button>

        <button
          onClick={() => navigate('/components')}
          className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
            isComponentsActive
              ? 'bg-[#22201F] text-white font-bold shadow-xs dark:bg-[#B1E743] dark:text-[#22201F]'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100 dark:text-stone-400 dark:hover:text-stone-100 dark:hover:bg-stone-800'
          }`}
        >
          UI System
        </button>
      </nav>

      {/* Right section: Search, Notifications & User profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Search Icon Pill Button */}
        <button
          type="button"
          aria-label="Search"
          className="grid h-10 w-10 place-items-center rounded-full border border-stone-200/90 bg-white text-stone-600 hover:bg-stone-100 transition-all dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>

        {/* Quick Theme Toggle Button */}
        <IconButton
          onClick={toggleTheme}
          label={`Switch to ${isDarkMode ? 'Light' : 'Dark'} Mode`}
          size="sm"
          className="rounded-full border border-stone-200/90 bg-white dark:border-stone-800 dark:bg-stone-900"
        >
          {isDarkMode ? <Sun className="h-4.5 w-4.5 text-amber-400" /> : <Moon className="h-4.5 w-4.5 text-stone-500" />}
        </IconButton>

        {/* Notification Bell with indicator dot */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label="Notifications"
            className="relative grid h-10 w-10 place-items-center rounded-full border border-stone-200/90 bg-white text-stone-600 hover:bg-stone-100 transition-all dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[#B1E743] ring-2 ring-white dark:ring-stone-900" />
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-stone-200 bg-white p-4 shadow-xl ring-1 ring-stone-900/5 z-30 dark:border-stone-800 dark:bg-slate-900 dark:text-slate-100">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3 dark:border-stone-800">
                <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Notifications</h3>
                <span className="rounded-full bg-[#B1E743] px-2 py-0.5 text-xs font-bold text-[#22201F]">1 New</span>
              </div>
              <div className="mt-3 text-center py-6 text-xs text-stone-400 dark:text-stone-500">
                No new notifications
              </div>
            </div>
          )}
        </div>

        {/* User Profile Avatar Pill */}
        <div className="relative" ref={profileMenuRef}>
          <button
            type="button"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            aria-label="User Profile Menu"
            aria-expanded={isProfileOpen}
            className="flex items-center gap-2 p-0.5 rounded-full border border-stone-200/90 bg-white hover:bg-stone-100 focus:outline-none transition-all dark:border-stone-800 dark:bg-stone-900"
          >
            <div className="relative">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-[#22201F] text-xs font-bold text-white shadow-xs">
                {userInitial}
              </div>
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-[#B1E743] ring-2 ring-white dark:ring-stone-900" />
            </div>
          </button>

          {/* Profile Menu Dropdown */}
          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-stone-200 bg-white p-2 shadow-xl ring-1 ring-stone-900/5 z-30 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100">
              <div className="border-b border-stone-100 px-3 py-2.5 dark:border-stone-800">
                <p className="text-xs font-semibold text-stone-900 capitalize dark:text-stone-100">{userName}</p>
                <p className="truncate text-xs text-stone-500 dark:text-stone-400">{userEmail}</p>
              </div>

              <div className="py-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileOpen(false);
                    navigate('/workspaces/settings');
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-800"
                >
                  <Building2 className="h-4 w-4 text-stone-400" />
                  <span>Workspace Settings</span>
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-800"
                >
                  <Shield className="h-4 w-4 text-stone-400" />
                  <span>Security & Permissions</span>
                </button>
              </div>

              <div className="border-t border-stone-100 pt-1 dark:border-stone-800">
                <button
                  type="button"
                  onClick={onLogout}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Molecule: Create New Workspace */}
      <Modal
        isOpen={showCreateWsModal}
        onClose={() => setShowCreateWsModal(false)}
        title="Create New Workspace"
        description="Set up a workspace for your team to organize folders, tasks, and QA evidence."
        primaryActionLabel="Create Workspace"
        secondaryActionLabel="Cancel"
        onPrimaryAction={handleCreateWs}
        isPrimaryLoading={isCreatingWs}
      >
        <div className="space-y-4">
          <Input
            label="Workspace Name"
            type="text"
            value={newWsName}
            onChange={(e) => setNewWsName(e.target.value)}
            required
            placeholder="e.g. Core Engineering QA"
            autoFocus
          />

          <Textarea
            label="Description"
            rows={3}
            value={newWsDesc}
            onChange={(e) => setNewWsDesc(e.target.value)}
            placeholder="Optional description of team workspace purpose..."
          />
        </div>
      </Modal>
    </header>
  );
};
