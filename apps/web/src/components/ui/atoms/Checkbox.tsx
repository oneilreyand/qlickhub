import React from 'react';
import { Check } from 'lucide-react';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({ label, checked, onChange, disabled, className = '', id, ...props }) => {
  const checkboxId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <label
      htmlFor={checkboxId}
      className={`inline-flex min-h-[44px] cursor-pointer items-center gap-2.5 text-sm font-medium text-stone-700 select-none dark:text-stone-300 ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'hover:text-stone-900 dark:hover:text-stone-100'
      } ${className}`}
    >
      <div className="relative">
        <input
          type="checkbox"
          id={checkboxId}
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="sr-only"
          {...props}
        />
        <div
          className={`grid h-5 w-5 place-items-center rounded-md border transition-all ${
            checked
              ? 'border-[#22201F] bg-[#22201F] text-white dark:border-[#B1E743] dark:bg-[#B1E743] dark:text-[#22201F]'
              : 'border-stone-300 bg-white hover:border-stone-400 dark:border-stone-700 dark:bg-stone-900 dark:hover:border-stone-600'
          }`}
        >
          {checked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
        </div>
      </div>
      {label && <span>{label}</span>}
    </label>
  );
};

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export const ToggleSwitch: React.FC<SwitchProps> = ({ checked, onChange, label, disabled }) => {
  return (
    <label className={`inline-flex min-h-[44px] cursor-pointer items-center gap-3 text-sm font-medium text-stone-700 select-none dark:text-stone-300 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#22201F]/20 ${
          checked ? 'bg-[#22201F] dark:bg-[#B1E743]' : 'bg-stone-300 dark:bg-stone-700'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out dark:bg-stone-900 ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
      {label && <span>{label}</span>}
    </label>
  );
};
