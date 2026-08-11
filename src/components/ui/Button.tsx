import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className, children, disabled, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[#1E3E62]/30 dark:focus:ring-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed rounded-[10px] select-none';

    const variants = {
      primary: 'bg-[#1E3E62] hover:bg-[#142B44] dark:bg-blue-600 dark:hover:bg-blue-500 text-white border border-transparent shadow-[0_1px_2px_rgba(0,0,0,0.05)]',
      secondary: 'bg-white dark:bg-[#1A1A18] text-[#111111] dark:text-[#ECECEC] border border-[#E8E8E8] dark:border-[#2A2A28] hover:bg-[#FAFAF8] dark:hover:bg-[#222220] shadow-[0_1px_2px_rgba(0,0,0,0.03)]',
      outline: 'bg-transparent border border-[#E8E8E8] dark:border-[#2A2A28] text-[#111111] dark:text-[#ECECEC] hover:bg-black/5 dark:hover:bg-white/5',
      ghost: 'bg-transparent text-[#666666] dark:text-[#999999] hover:text-[#111111] dark:hover:text-[#ECECEC] hover:bg-black/5 dark:hover:bg-white/5',
      danger: 'bg-red-600 hover:bg-red-700 text-white border border-transparent shadow-[0_1px_2px_rgba(0,0,0,0.05)]'
    };

    const sizes = {
      sm: 'text-[13px] px-3 py-1.5 gap-1.5',
      md: 'text-[15px] px-4 py-2 gap-2',
      lg: 'text-[16px] px-5 py-2.5 gap-2.5'
    };

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={twMerge(clsx(baseStyles, variants[variant], sizes[size], className))}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
