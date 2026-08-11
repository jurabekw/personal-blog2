import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  elevation?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({ children, elevation = 'sm', className, ...props }) => {
  const shadowClass = {
    none: 'shadow-none',
    sm: 'shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.2)]',
    md: 'shadow-[0_8px_24px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.3)]',
    lg: 'shadow-[0_16px_48px_rgba(0,0,0,0.10)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.4)]',
  };

  return (
    <div
      className={twMerge(
        clsx(
          'bg-white dark:bg-[#1A1A18] border border-[#E8E8E8] dark:border-[#2A2A28] rounded-[12px] p-6 transition-colors duration-150',
          shadowClass[elevation],
          className
        )
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'neutral' | 'success' | 'warning' | 'accent' | 'info';
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'neutral', children, className, ...props }) => {
  const variants = {
    neutral: 'bg-[#F4F4F2] dark:bg-[#262624] text-[#666666] dark:text-[#A0A09C] border-[#E0E0DC] dark:border-[#333330]',
    success: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40',
    warning: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/40',
    accent: 'bg-[#F0F4F8] dark:bg-[#1E293B] text-[#1E3E62] dark:text-blue-400 border-[#D5E1ED] dark:border-blue-900/40',
    info: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-800/40'
  };

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center text-[12px] font-medium px-2.5 py-0.5 rounded-[6px] border select-none leading-none tracking-tight whitespace-nowrap',
          variants[variant],
          className
        )
      )}
      {...props}
    >
      {children}
    </span>
  );
};
