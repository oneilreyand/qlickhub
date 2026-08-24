import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTabId: string;
  onChange: (id: string) => void;
  variant?: 'underline' | 'pills';
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTabId,
  onChange,
  variant = 'underline',
}) => {
  const activeTabRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    activeTabRef.current?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [activeTabId]);

  if (variant === 'pills') {
    return (
      <div className="flex w-full max-w-full items-center gap-1 overflow-x-auto rounded-2xl border border-stone-200/80 bg-white/80 p-1.5 shadow-xs dark:border-stone-800 dark:bg-stone-900/80 sm:inline-flex sm:w-auto sm:rounded-full">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <button
              ref={isActive ? activeTabRef : undefined}
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
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
                  className={`grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold ${
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
      <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
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
                  className={`rounded-full px-2 py-0.5 text-[10px] ${
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
