import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
  sublabel?: React.ReactNode;
  ariaLabel?: string;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTabId: string;
  onChange: (id: string) => void;
  variant?: 'underline' | 'pills' | 'cards';
  ariaLabel?: string;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTabId,
  onChange,
  variant = 'underline',
  ariaLabel = 'Navigasi tab',
  className = '',
}) => {
  const tabRefs = React.useRef(new Map<string, HTMLButtonElement>());

  React.useEffect(() => {
    tabRefs.current.get(activeTabId)?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [activeTabId]);

  const registerTab = (tabId: string, node: HTMLButtonElement | null) => {
    if (node) tabRefs.current.set(tabId, node);
    else tabRefs.current.delete(tabId);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length;
    if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = tabs.length - 1;
    if (nextIndex === null) return;

    event.preventDefault();
    const nextTab = tabs[nextIndex];
    tabRefs.current.get(nextTab.id)?.focus();
    onChange(nextTab.id);
  };

  if (variant === 'cards') {
    const defaultGridCols =
      tabs.length === 2
        ? 'grid-cols-1 sm:grid-cols-2'
        : tabs.length === 3
          ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
          : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';

    return (
      <div
        role="tablist"
        aria-label={ariaLabel}
        aria-orientation="horizontal"
        className={`grid gap-3 w-full ${defaultGridCols} ${className}`}
      >
        {tabs.map((tab, index) => {
          const isActive = tab.id === activeTabId;
          return (
            <button
              ref={(node) => registerTab(tab.id, node)}
              key={tab.id}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-controls={`tabpanel-${tab.id}`}
              aria-selected={isActive}
              aria-label={tab.ariaLabel || tab.label}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onChange(tab.id)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border p-3.5 sm:p-4 text-left transition-all min-h-[96px] ${
                isActive
                  ? 'border-2 border-[#B1E743] bg-white dark:bg-stone-900 shadow-md ring-2 ring-[#B1E743]/20 dark:ring-[#B1E743]/20'
                  : 'border-stone-200/90 bg-stone-50/70 hover:bg-white hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900/50 dark:hover:bg-stone-900'
              }`}
            >
              {isActive && <span className="absolute top-0 left-0 right-0 h-1 bg-[#B1E743]" />}
              <div className="flex items-center justify-between gap-2 w-full">
                <div className="flex items-center gap-2 min-w-0">
                  {tab.icon && (
                    <span
                      className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg transition-colors ${
                        isActive
                          ? 'bg-[#B1E743]/20 text-stone-900 dark:text-[#B1E743]'
                          : 'bg-stone-200/60 text-stone-600 dark:bg-stone-800 dark:text-stone-400 group-hover:bg-stone-200 dark:group-hover:bg-stone-700'
                      }`}
                    >
                      {tab.icon}
                    </span>
                  )}
                  <span
                    className={`text-xs uppercase tracking-wider truncate ${
                      isActive
                        ? 'text-stone-900 dark:text-stone-100 font-extrabold'
                        : 'text-stone-600 dark:text-stone-400 font-bold'
                    }`}
                  >
                    {tab.label}
                  </span>
                </div>
                {tab.badge}
                {tab.count !== undefined && !tab.badge && (
                  <span
                    className={`grid h-5 min-w-5 shrink-0 place-items-center rounded-full px-1.5 text-[11px] font-bold ${
                      isActive
                        ? 'bg-[#B1E743] text-[#141413]'
                        : 'bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </div>
              {tab.sublabel && (
                <div className="mt-2.5 pt-2 border-t border-stone-200/60 dark:border-stone-800/60 text-xs w-full">
                  {tab.sublabel}
                </div>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  if (variant === 'pills') {
    return (
      <div
        role="tablist"
        aria-label={ariaLabel}
        aria-orientation="horizontal"
        className="flex w-full max-w-full items-center gap-1 overflow-x-auto rounded-2xl border border-stone-200/80 bg-white/80 p-1.5 shadow-xs dark:border-stone-800 dark:bg-stone-900/80 sm:inline-flex sm:w-auto sm:rounded-full"
      >
        {tabs.map((tab, index) => {
          const isActive = tab.id === activeTabId;
          return (
            <button
              ref={(node) => registerTab(tab.id, node)}
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={tab.ariaLabel || tab.label}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onChange(tab.id)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={`flex min-h-[44px] shrink-0 items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-[#B1E743] text-[#141413] font-bold shadow-xs dark:bg-[#B1E743] dark:text-[#141413]'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100 dark:text-stone-400 dark:hover:text-stone-100 dark:hover:bg-stone-800'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge}
              {tab.count !== undefined && (
                <span
                  className={`grid h-4 min-w-4 place-items-center rounded-full px-1 text-[11px] font-bold ${
                    isActive
                      ? 'bg-[#141413] text-[#B1E743] dark:bg-[#141413] dark:text-[#B1E743]'
                      : 'bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="border-b border-stone-200 dark:border-stone-800">
      <nav
        className="-mb-px flex space-x-6 overflow-x-auto"
        role="tablist"
        aria-label={ariaLabel}
        aria-orientation="horizontal"
      >
        {tabs.map((tab, index) => {
          const isActive = tab.id === activeTabId;
          return (
            <button
              ref={(node) => registerTab(tab.id, node)}
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={tab.ariaLabel || tab.label}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onChange(tab.id)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={`flex min-h-[44px] items-center gap-2 border-b-2 py-3 px-1 text-xs font-semibold transition-all ${
                isActive
                  ? 'border-[#B1E743] text-stone-900 font-bold dark:border-[#B1E743] dark:text-[#B1E743]'
                  : 'border-transparent text-stone-500 hover:border-stone-300 hover:text-stone-700 dark:text-stone-400 dark:hover:border-stone-700 dark:hover:text-stone-200'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge}
              {tab.count !== undefined && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] ${
                    isActive
                      ? 'bg-[#B1E743] text-[#141413] font-bold dark:bg-[#B1E743] dark:text-[#141413]'
                      : 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};
