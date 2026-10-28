import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { getWorkPageOrigin } from '../../lib/utils/sectionLabel';
import {
  Component,
  ShieldCheck,
  LayoutDashboard,
  Layers,
  Building2,
  FileBarChart,
  CheckSquare,
  BookOpen,
  Crown,
} from 'lucide-react';
import { useAppSelector } from '../../store/hooks';
import { useAppDispatch } from '../../store/hooks';
import { selectCurrentUserRole } from '../../store/authSlice';
import { featureVisibility } from '../../config/featureVisibility';
import { patchTaskHubQueryState } from '../../lib/utils/taskHubQueryState';
import { FolderTree } from '../ui/organisms/FolderTree';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import {
  archiveFolder,
  createFolder,
  fetchFolderTree,
  updateFolder,
} from '../../store/folderSlice';

interface SidebarProps {
  onCloseMobile?: () => void;
  onHoverChange?: (hovered: boolean) => void;
}

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const navItems: NavItem[] = [
  {
    name: 'Ringkasan',
    path: '/work?tab=overview',
    icon: LayoutDashboard,
  },
  {
    name: 'Task Hub',
    path: '/work?tab=tasks',
    icon: Layers,
  },
  {
    name: 'Tugas Saya',
    path: '/my-tasks',
    icon: CheckSquare,
  },
  {
    name: 'Laporan',
    path: '/reports',
    icon: FileBarChart,
  },
  {
    name: 'Leader Hub',
    path: '/leader-hub',
    icon: Crown,
    badge: 'Leader',
  },
  {
    name: 'Panduan Alur Kerja',
    path: '/user-flows',
    icon: BookOpen,
    badge: 'Panduan',
  },
  {
    name: 'Pengaturan Workspace',
    path: '/workspaces/settings',
    icon: Building2,
  },
  {
    name: 'Galeri Komponen',
    path: '/components',
    icon: Component,
    badge: 'Dev',
  },
];

/** The four primary destinations stay on top; everything else is grouped under "Lainnya". */
const PRIMARY_NAV_PATHS = new Set([
  '/work?tab=overview',
  '/work?tab=tasks',
  '/my-tasks',
  '/reports',
]);

export const Sidebar: React.FC<SidebarProps> = ({ onCloseMobile, onHoverChange }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { workspaces, activeWorkspaceId } = useAppSelector((state) => state.workspace);
  const {
    folders,
    selectedFolderId,
    isLoading: isFolderLoading,
    error: folderError,
  } = useAppSelector((state) => state.folder);
  const workspaceFeatureCount = useAppSelector(
    (state) =>
      state.task.tasks.filter(
        (task) => task.workspaceId === activeWorkspaceId && !task.parentTaskId,
      ).length,
  );
  const currentUserRole = useAppSelector(selectCurrentUserRole);

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0];
  const userRole = (
    activeWorkspace?.role ||
    activeWorkspace?.myRole ||
    currentUserRole ||
    ''
  ).toLowerCase();
  const canAccessSettings = ['owner', 'admin', 'po'].includes(userRole);
  const canAccessUISystem = userRole === 'owner';
  const canAccessLeaderHub = ['owner', 'admin'].includes(userRole);
  const isTaskHub =
    location.pathname === '/work' && new URLSearchParams(location.search).get('tab') === 'tasks';
  // Halaman Feature dan tautan langsung Task adalah bagian dari Task Hub: Sidebar tetap
  // menampilkan folder dan menyorot menu Task Hub.
  const isFeaturePage =
    /^\/work\/features\/[^/]+$/.test(location.pathname) ||
    /^\/projects\/[^/]+\/tasks\/[^/]+$/.test(location.pathname);
  const showFolders = isTaskHub || isFeaturePage;
  const isUnfiledSelected = new URLSearchParams(location.search).get('unfiledOnly') === 'true';

  // The workspace shell keeps labels visible on desktop; the mobile drawer reuses the same shape.
  const isExpanded = true;

  const visibleNavItems = navItems.filter((item) => {
    if (item.path === '/leader-hub') {
      return canAccessLeaderHub;
    }
    if (item.path === '/user-flows') {
      return featureVisibility.userFlowGuide;
    }
    if (item.path === '/workspaces/settings') {
      return canAccessSettings;
    }
    if (item.path === '/components') {
      return canAccessUISystem;
    }
    return true;
  });

  const primaryNavItems = visibleNavItems.filter((item) => PRIMARY_NAV_PATHS.has(item.path));
  const secondaryNavItems = visibleNavItems.filter((item) => !PRIMARY_NAV_PATHS.has(item.path));

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon;
    const searchParams = new URLSearchParams(location.search);
    const currentTab = searchParams.get('tab') || (location.pathname === '/work' ? 'overview' : '');
    const workPageOrigin = getWorkPageOrigin(location.pathname, location.state);
    const isTaskDeepLink = isFeaturePage || workPageOrigin === 'task-hub';

    const isActive =
      item.path === '/work?tab=overview'
        ? location.pathname === '/work' && currentTab === 'overview'
        : item.path === '/work?tab=tasks'
          ? (location.pathname === '/work' && currentTab === 'tasks') || isTaskDeepLink
          : item.path === '/my-tasks'
            ? location.pathname === '/my-tasks' ||
              location.pathname.startsWith('/my-tasks/') ||
              workPageOrigin === 'my-tasks' ||
              location.pathname === '/requirements'
            : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);

    return (
      <NavLink
        key={item.path}
        to={item.path}
        onClick={onCloseMobile}
        title={!isExpanded ? item.name : undefined}
        className={`group relative flex min-h-[40px] items-center rounded-xl text-xs font-medium transition-colors ${
          isActive
            ? 'bg-[#B1E743] text-[#141413] font-bold shadow-xs dark:bg-[#B1E743] dark:text-[#141413]'
            : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800/80 dark:hover:text-white'
        } ${isExpanded ? 'px-3 gap-2.5 justify-start' : 'justify-center px-0'}`}
      >
        {/* Menu Icon */}
        <div className="inline-flex h-5 w-5 shrink-0 items-center justify-center">
          <Icon
            className={`h-4 w-4 shrink-0 transition-transform group-hover:scale-105 ${
              isActive
                ? 'text-[#141413] dark:text-[#141413]'
                : 'text-stone-400 group-hover:text-stone-800 dark:group-hover:text-white'
            }`}
          />
        </div>

        {/* Text Label & Badge: ONLY visible when expanded (isExpanded) */}
        {isExpanded && (
          <div className="flex flex-1 items-center justify-between truncate whitespace-nowrap min-w-0">
            <span className="truncate">{item.name}</span>
            {item.badge && (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ml-2 shrink-0 ${
                  isActive
                    ? 'bg-[#141413]/20 text-[#141413]'
                    : 'bg-stone-100 text-stone-500 group-hover:bg-stone-200 group-hover:text-stone-800 dark:bg-stone-800 dark:text-stone-400 dark:group-hover:bg-stone-700 dark:group-hover:text-stone-200'
                }`}
              >
                {item.badge}
              </span>
            )}
          </div>
        )}
      </NavLink>
    );
  };

  const handleMouseEnter = () => {
    if (onHoverChange) onHoverChange(true);
  };

  const handleMouseLeave = () => {
    if (onHoverChange) onHoverChange(false);
  };

  const handleSelectFolder = (folderId: string | null) => {
    const next = patchTaskHubQueryState(new URLSearchParams(location.search), {
      folderId,
      unfiledOnly: false,
    });
    next.set('tab', 'tasks');
    navigate(`/work?${next.toString()}`);
    onCloseMobile?.();
  };

  const handleSelectUnfiled = () => {
    const next = patchTaskHubQueryState(new URLSearchParams(location.search), {
      folderId: null,
      unfiledOnly: true,
    });
    next.set('tab', 'tasks');
    navigate(`/work?${next.toString()}`);
    onCloseMobile?.();
  };

  const handleCreateFolder = async (name: string, parentFolderId?: string) => {
    if (!activeWorkspaceId) return;
    await dispatch(
      createFolder({ workspaceId: activeWorkspaceId, input: { name, parentFolderId } }),
    ).unwrap();
  };

  const handleRenameFolder = async (folderId: string, name: string) => {
    if (!activeWorkspaceId) return;
    await dispatch(
      updateFolder({ workspaceId: activeWorkspaceId, folderId, input: { name } }),
    ).unwrap();
  };

  const handleArchiveFolder = async (folderId: string) => {
    if (!activeWorkspaceId) return;
    await dispatch(archiveFolder({ workspaceId: activeWorkspaceId, folderId })).unwrap();
  };

  return (
    <aside
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative flex h-full w-full flex-col overflow-hidden border-r border-stone-200/80 bg-white/95 backdrop-blur-md text-stone-700 shadow-[0_4px_24px_rgba(0,0,0,0.04)] transition-all duration-300 ease-in-out dark:border-stone-800/80 dark:bg-[#141413] dark:text-stone-300"
    >
      {/* Top Header: Matches the h-20 (80px) application header divider. */}
      <div className="shrink-0">
        <div
          className={`flex h-20 items-center border-b border-stone-100 dark:border-stone-800/80 ${isExpanded ? 'px-4 gap-2.5' : 'justify-center px-0'}`}
        >
          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#B1E743] text-[#141413] shadow-xs font-bold">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div
            className={`flex flex-col truncate transition-all duration-200 whitespace-nowrap ${
              isExpanded ? 'opacity-100 max-w-full' : 'opacity-0 max-w-0 pointer-events-none'
            }`}
          >
            <span className="text-sm font-bold tracking-tight text-stone-900 dark:text-white">
              Qlick Hub
            </span>
          </div>
        </div>
      </div>

      {/* Workspace selector lives in the Sidebar (ADR-035). */}
      <div className="shrink-0 px-3 pt-4">
        <WorkspaceSwitcher onNavigate={onCloseMobile} />
      </div>

      {/* Navigation and folder tree share one scroll area so short screens keep every item reachable. */}
      <div className="flex-1 overflow-y-auto overscroll-contain py-4">
        <nav className="space-y-1.5 px-3">
          {primaryNavItems.map(renderNavItem)}
          {secondaryNavItems.length > 0 && (
            <>
              <div className="px-3 pb-1 pt-4 text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                Lainnya
              </div>
              {secondaryNavItems.map(renderNavItem)}
            </>
          )}
        </nav>
        {showFolders && (
          <div className="mt-4 border-t border-stone-100 px-3 pt-4 dark:border-stone-800/80">
            <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.14em] text-stone-400 dark:text-stone-500">
              Folder workspace
            </p>
            <div className="pr-0.5">
              <FolderTree
                folders={folders}
                selectedFolderId={selectedFolderId || null}
                isUnfiledSelected={isUnfiledSelected}
                // Jumlah berasal dari daftar Task Hub; di halaman Feature yang dibuka langsung
                // daftar itu belum dimuat, jadi angka disembunyikan daripada menampilkan 0.
                totalTasks={
                  isFeaturePage && workspaceFeatureCount === 0 ? undefined : workspaceFeatureCount
                }
                isLoading={isFolderLoading}
                error={folderError}
                userRole={activeWorkspace?.role}
                onSelectFolder={handleSelectFolder}
                onSelectUnfiled={handleSelectUnfiled}
                onCreateFolder={handleCreateFolder}
                onRenameFolder={handleRenameFolder}
                onArchiveFolder={handleArchiveFolder}
                onRetry={() => activeWorkspaceId && dispatch(fetchFolderTree(activeWorkspaceId))}
              />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
