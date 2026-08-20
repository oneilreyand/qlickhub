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
  if (variant === 'pills') {
    return (
      <div className="inline-flex items-center gap-1 bg-white/80 dark:bg-stone-900/80 p-1.5 rounded-full border border-stone-200/80 dark:border-stone-800 shadow-xs">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-[#22201F] text-white font-bold shadow-xs dark:bg-[#B1E743] dark:text-[#22201F]'
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
                      ? 'bg-[#B1E743] text-[#22201F] dark:bg-[#22201F] dark:text-white'
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
                  ? 'border-[#22201F] text-[#22201F] dark:border-[#B1E743] dark:text-[#B1E743]'
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
                      ? 'bg-[#22201F] text-white font-bold dark:bg-[#B1E743] dark:text-[#22201F]'
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
