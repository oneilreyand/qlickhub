import React, { useRef } from 'react';

export interface WorkspaceSettingsNavItem {
  id: string;
  label: string;
}

export interface WorkspaceSettingsNavProps {
  tabs: WorkspaceSettingsNavItem[];
  activeTabId: string;
  onChange: (id: string) => void;
  ariaLabel: string;
  /** Tab shown in red (Zona Bahaya). */
  dangerTabId?: string;
}

/**
 * UX-NAV-CLARITY: section list of Pengaturan Workspace as in the design — a vertical list on
 * wide screens, a horizontally scrolling row on phones. Same tab semantics as `Tabs`.
 */
export const WorkspaceSettingsNav: React.FC<WorkspaceSettingsNavProps> = ({
  tabs,
  activeTabId,
  onChange,
  ariaLabel,
  dangerTabId,
}) => {
  const refs = useRef(new Map<string, HTMLButtonElement>());

  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    const keys: Record<string, number> = {
      ArrowDown: index + 1,
      ArrowRight: index + 1,
      ArrowUp: index - 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: tabs.length - 1,
    };
    if (!(event.key in keys)) return;
    event.preventDefault();
    const next = tabs[(keys[event.key] + tabs.length) % tabs.length];
    refs.current.get(next.id)?.focus();
    onChange(next.id);
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      aria-orientation="vertical"
      className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0"
    >
      {tabs.map((tab, index) => {
        const active = tab.id === activeTabId;
        const danger = tab.id === dangerTabId;
        return (
          <button
            key={tab.id}
            ref={(node) => {
              if (node) refs.current.set(tab.id, node);
              else refs.current.delete(tab.id);
            }}
            type="button"
            role="tab"
            id={`settings-tab-${tab.id}`}
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={`flex min-h-[44px] shrink-0 items-center whitespace-nowrap rounded-xl px-3.5 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B1E743] ${
              active
                ? 'bg-[#141413] font-semibold text-white dark:bg-stone-100 dark:text-[#141413]'
                : danger
                  ? 'font-medium text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40'
                  : 'font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};
