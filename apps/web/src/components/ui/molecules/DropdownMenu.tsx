import React, { useState, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { useDismissableLayer } from '../../../hooks/useDismissableLayer';

export interface DropdownMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  destructive?: boolean;
  onClick: () => void;
}

export interface DropdownMenuProps {
  triggerLabel: string;
  triggerIcon?: React.ReactNode;
  items: DropdownMenuItem[];
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({
  triggerLabel,
  triggerIcon,
  items,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useDismissableLayer(dropdownRef, isOpen, () => setIsOpen(false));

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-stone-200/80 bg-white px-3.5 text-xs font-semibold text-stone-700 shadow-xs hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-[#22201F]/20 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
      >
        {triggerIcon}
        <span>{triggerLabel}</span>
        <ChevronDown className="h-4 w-4 text-stone-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-2xl border border-stone-200 bg-white p-1.5 shadow-xl ring-1 ring-stone-900/5 z-30 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                item.onClick();
                setIsOpen(false);
              }}
              className={`flex w-full min-h-[36px] items-center gap-2.5 rounded-xl px-3 text-xs font-medium transition-colors ${
                item.destructive
                  ? 'text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40'
                  : 'text-stone-700 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-white'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
