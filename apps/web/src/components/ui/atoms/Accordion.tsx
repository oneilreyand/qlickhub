import React, { createContext, useContext, useId } from 'react';
import { ChevronDown } from 'lucide-react';

interface AccordionContextType {
  expandedItems: string[];
  toggleItem: (id: string) => void;
  allowMultiple?: boolean;
}

const AccordionContext = createContext<AccordionContextType | null>(null);

export const useAccordion = () => useContext(AccordionContext);
export const useAccordionItem = () => useContext(AccordionItemContext);

export interface AccordionProps {
  children: React.ReactNode;
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  allowMultiple?: boolean;
  className?: string;
}

export const Accordion: React.FC<AccordionProps> = ({
  children,
  value,
  defaultValue = [],
  onValueChange,
  allowMultiple = true,
  className = '',
}) => {
  const [internalExpanded, setInternalExpanded] = React.useState<string[]>(defaultValue);
  const isControlled = value !== undefined;
  const expandedItems = isControlled ? value : internalExpanded;

  const toggleItem = React.useCallback(
    (id: string) => {
      let newExpanded: string[];
      if (expandedItems.includes(id)) {
        newExpanded = expandedItems.filter((item) => item !== id);
      } else {
        newExpanded = allowMultiple ? [...expandedItems, id] : [id];
      }

      if (!isControlled) {
        setInternalExpanded(newExpanded);
      }
      onValueChange?.(newExpanded);
    },
    [expandedItems, allowMultiple, isControlled, onValueChange]
  );

  return (
    <AccordionContext.Provider value={{ expandedItems, toggleItem, allowMultiple }}>
      <div className={`space-y-2.5 ${className}`}>{children}</div>
    </AccordionContext.Provider>
  );
};

interface AccordionItemContextType {
  id: string;
  isExpanded: boolean;
  disabled?: boolean;
}

const AccordionItemContext = createContext<AccordionItemContextType | null>(null);

export interface AccordionItemProps {
  id: string;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export const AccordionItem: React.FC<AccordionItemProps> = ({
  id,
  children,
  disabled = false,
  className = '',
}) => {
  const context = useContext(AccordionContext);
  const isExpanded = context ? context.expandedItems.includes(id) : false;

  return (
    <AccordionItemContext.Provider value={{ id, isExpanded, disabled }}>
      <div
        data-state={isExpanded ? 'open' : 'closed'}
        className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
          isExpanded
            ? 'border-stone-300 dark:border-stone-700 bg-white/95 dark:bg-stone-900/90 shadow-sm ring-1 ring-stone-900/5 dark:ring-white/5'
            : 'border-stone-200/90 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/50 hover:border-stone-300 dark:hover:border-stone-700'
        } ${className}`}
      >
        {children}
      </div>
    </AccordionItemContext.Provider>
  );
};

export interface AccordionTriggerProps {
  children: React.ReactNode;
  className?: string;
  hideChevron?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

export const AccordionTrigger: React.FC<AccordionTriggerProps> = ({
  children,
  className = '',
  hideChevron = false,
  onClick,
}) => {
  const accordionContext = useContext(AccordionContext);
  const itemContext = useContext(AccordionItemContext);
  const triggerId = useId();

  if (!itemContext) {
    throw new Error('AccordionTrigger must be used within an AccordionItem');
  }

  const { id, isExpanded, disabled } = itemContext;

  const handleClick = (e: React.MouseEvent) => {
    if (disabled) return;
    onClick?.(e);
    if (!e.defaultPrevented) {
      accordionContext?.toggleItem(id);
    }
  };

  return (
    <button
      type="button"
      id={triggerId}
      aria-expanded={isExpanded}
      aria-controls={`accordion-content-${id}`}
      disabled={disabled}
      onClick={handleClick}
      className={`flex w-full items-center justify-between gap-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B1E743]/50 p-3.5 ${
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
      } ${className}`}
    >
      <div className="flex-1 min-w-0">{children}</div>
      {!hideChevron && (
        <span
          className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg text-stone-400 dark:text-stone-500 transition-transform duration-200 ${
            isExpanded ? 'rotate-180 text-stone-700 dark:text-stone-200' : ''
          }`}
        >
          <ChevronDown className="h-4 w-4" />
        </span>
      )}
    </button>
  );
};

export interface AccordionContentProps {
  children: React.ReactNode;
  className?: string;
}

export const AccordionContent: React.FC<AccordionContentProps> = ({
  children,
  className = '',
}) => {
  const itemContext = useContext(AccordionItemContext);

  if (!itemContext) {
    throw new Error('AccordionContent must be used within an AccordionItem');
  }

  const { id, isExpanded } = itemContext;

  if (!isExpanded) {
    return null;
  }

  return (
    <div
      id={`accordion-content-${id}`}
      role="region"
      className={`border-t border-stone-200/70 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950/40 p-4 transition-all duration-200 animate-fadeIn ${className}`}
    >
      {children}
    </div>
  );
};
