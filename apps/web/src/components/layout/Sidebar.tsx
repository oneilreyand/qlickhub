import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Component, ShieldCheck, Layers, Building2, FileBarChart, CheckSquare, BookOpen } from 'lucide-react';
import { useAppSelector } from '../../store/hooks';

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
    name: 'Work Hub',
    path: '/work',
    icon: Layers,
  },
  {
    name: 'My Tasks',
    path: '/my-tasks',
    icon: CheckSquare,
  },
  {
    name: 'Report',
    path: '/reports',
    icon: FileBarChart,
  },
  {
    name: 'User Flow Guide',
    path: '/user-flows',
    icon: BookOpen,
    badge: 'Guide',
  },
  {
    name: 'Workspace Settings',
    path: '/workspaces/settings',
    icon: Building2,
  },
  {
    name: 'Component Gallery',
    path: '/components',
    icon: Component,
    badge: 'Dev',
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ onCloseMobile, onHoverChange }) => {
  const [isHovered, setIsHovered] = useState(false);
  const location = useLocation();
  const { workspaces, activeWorkspaceId } = useAppSelector((state) => state.workspace);

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0];
  const userRole = activeWorkspace?.role || activeWorkspace?.myRole;
  const canManageSettings = userRole === 'owner' || userRole === 'admin';

  // Mobile drawers always render expanded navigation.
  const isExpanded = isHovered || Boolean(onCloseMobile);

  const visibleNavItems = navItems.filter((item) => {
    if (item.path === '/workspaces/settings') {
      return canManageSettings;
    }
    return true;
  });

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (onHoverChange) onHoverChange(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (onHoverChange) onHoverChange(false);
  };

  return (
    <aside
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative flex h-full w-full flex-col overflow-hidden border-r border-stone-200/80 bg-white/95 backdrop-blur-md text-stone-700 shadow-[0_4px_24px_rgba(0,0,0,0.04)] transition-all duration-300 ease-in-out dark:border-stone-800/80 dark:bg-[#141413] dark:text-stone-300"
    >
      {/* Top Header: Matched h-16 (64px) height with compact Shield icon */}
      <div className="shrink-0">
        <div className={`flex h-16 items-center border-b border-stone-100 dark:border-stone-800/80 ${isExpanded ? 'px-4 gap-2.5' : 'justify-center px-0'}`}>
          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#22201F] text-[#B1E743] dark:bg-[#B1E743] dark:text-[#22201F] shadow-xs">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div
            className={`flex flex-col truncate transition-all duration-200 whitespace-nowrap ${
              isExpanded ? 'opacity-100 max-w-full' : 'opacity-0 max-w-0 pointer-events-none'
            }`}
          >
            <span className="text-xs font-bold tracking-tight text-stone-900 dark:text-white">Qlick Hub</span>
            <span className="text-[9px] font-semibold text-stone-500 dark:text-[#B1E743]">Work Hub v2.0</span>
          </div>
        </div>
      </div>

      {/* Navigation Menu (Scrollable area) */}
      <div className="flex-1 overflow-y-auto overscroll-contain py-4">
        <nav className="space-y-1.5 px-3">
          <div
            className={`px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-stone-400 whitespace-nowrap transition-all duration-200 dark:text-stone-500 ${
              isExpanded ? 'opacity-100 max-w-full' : 'opacity-0 max-w-0 h-0 p-0 overflow-hidden'
            }`}
          >
            Main Menu
          </div>
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.path === '/my-tasks'
                ? location.pathname === '/my-tasks' ||
                  location.pathname.startsWith('/my-tasks/') ||
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
                    ? 'bg-[#22201F] text-white font-semibold shadow-xs dark:bg-[#B1E743] dark:text-[#22201F]'
                    : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800/80 dark:hover:text-white'
                } ${isExpanded ? 'px-3 gap-2.5 justify-start' : 'justify-center px-0'}`}
              >
                {/* Menu Icon */}
                <div className="inline-flex h-5 w-5 shrink-0 items-center justify-center">
                  <Icon
                    className={`h-4 w-4 shrink-0 transition-transform group-hover:scale-105 ${
                      isActive
                        ? 'text-white dark:text-[#22201F]'
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
                            ? 'bg-white/20 text-white dark:bg-[#22201F]/20 dark:text-[#22201F]'
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
          })}
        </nav>
      </div>

      {/* Footer Section */}
      <div className="shrink-0 border-t border-stone-100 p-3 dark:border-stone-800/80">
        <div className={`flex items-center overflow-hidden rounded-xl border border-stone-200/80 bg-stone-50 px-3 py-2 text-[11px] dark:border-stone-800 dark:bg-stone-900/60 ${isExpanded ? '' : 'justify-center px-0'}`}>
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <div
            className={`flex flex-1 items-center justify-between truncate pl-2.5 whitespace-nowrap transition-all duration-200 ${
              isExpanded ? 'opacity-100 max-w-full' : 'opacity-0 max-w-0 pointer-events-none'
            }`}
          >
            <span className="font-semibold text-stone-700 dark:text-stone-200">Workspace Active</span>
            <span className="text-[10px] font-medium text-stone-400 dark:text-stone-500">v2.0</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
