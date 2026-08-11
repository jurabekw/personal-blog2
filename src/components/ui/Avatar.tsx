import React from 'react';

export interface AvatarProps {
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ src, name, size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-7 h-7 text-[12px]',
    md: 'w-10 h-10 text-[14px]',
    lg: 'w-16 h-16 text-[20px]'
  };

  const getInitials = (n: string) => {
    return n
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        referrerPolicy="no-referrer"
        className={`rounded-full object-cover border border-[#E8E8E8] dark:border-[#2A2A28] ${sizeClasses[size]} ${className}`}
      />
    );
  }

  return (
    <div
      className={`rounded-full bg-[#1E3E62] text-white font-medium flex items-center justify-center shrink-0 border border-transparent ${sizeClasses[size]} ${className}`}
    >
      {getInitials(name)}
    </div>
  );
};
