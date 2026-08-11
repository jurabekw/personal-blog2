import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-[13px] font-medium text-[#111111] dark:text-[#ECECEC]">
            {label}
          </label>
        )}
        <select
          id={inputId}
          ref={ref}
          className={twMerge(
            clsx(
              'w-full bg-white dark:bg-[#1A1A18] text-[#111111] dark:text-[#ECECEC] text-[15px]',
              'px-3.5 py-2 rounded-[10px] border border-[#E8E8E8] dark:border-[#2A2A28]',
              'focus:outline-none focus:border-[#1E3E62] dark:focus:border-blue-500 focus:ring-1 focus:ring-[#1E3E62] dark:focus:ring-blue-500',
              'transition-all duration-150 cursor-pointer',
              error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
              className
            )
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-white dark:bg-[#1A1A18] text-[#111111] dark:text-[#ECECEC]">
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-[13px] text-red-500">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}

export const Switch: React.FC<SwitchProps> = ({ checked, onChange, label, description, disabled }) => {
  return (
    <label className={clsx('flex items-center justify-between gap-4 cursor-pointer select-none', disabled && 'opacity-50 cursor-not-allowed')}>
      {(label || description) && (
        <div className="flex flex-col">
          {label && <span className="text-[14px] font-medium text-[#111111] dark:text-[#ECECEC]">{label}</span>}
          {description && <span className="text-[13px] text-[#666666] dark:text-[#999999]">{description}</span>}
        </div>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={clsx(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-[#1E3E62]/30',
          checked ? 'bg-[#1E3E62] dark:bg-blue-600' : 'bg-[#E0E0DC] dark:bg-[#333330]'
        )}
      >
        <span
          className={clsx(
            'inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ease-out',
            checked ? 'translate-x-6' : 'translate-x-1'
          )}
        />
      </button>
    </label>
  );
};
