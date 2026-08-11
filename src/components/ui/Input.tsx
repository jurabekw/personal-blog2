import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-[13px] font-medium text-[#111111] dark:text-[#ECECEC]">
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={twMerge(
            clsx(
              'w-full bg-white dark:bg-[#1A1A18] text-[#111111] dark:text-[#ECECEC] text-[15px]',
              'px-3.5 py-2 rounded-[10px] border border-[#E8E8E8] dark:border-[#2A2A28]',
              'placeholder:text-[#999999] dark:placeholder:text-[#666666]',
              'focus:outline-none focus:border-[#1E3E62] dark:focus:border-blue-500 focus:ring-1 focus:ring-[#1E3E62] dark:focus:ring-blue-500',
              'transition-all duration-150',
              error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
              className
            )
          )}
          {...props}
        />
        {error ? (
          <p className="text-[13px] text-red-500">{error}</p>
        ) : helperText ? (
          <p className="text-[13px] text-[#666666] dark:text-[#999999]">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
