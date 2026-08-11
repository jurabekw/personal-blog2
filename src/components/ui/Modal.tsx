import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'md'
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const widthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-150">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative w-full ${widthClasses[maxWidth]} bg-white dark:bg-[#1A1A18] border border-[#E8E8E8] dark:border-[#2A2A28] rounded-[12px] shadow-[0_16px_48px_rgba(0,0,0,0.15)] overflow-hidden z-10 p-6 flex flex-col gap-4 animate-in zoom-in-95 duration-150`}
      >
        {(title || description) && (
          <div className="flex items-start justify-between gap-4">
            <div>
              {title && <h3 className="text-[18px] font-semibold text-[#111111] dark:text-[#ECECEC]">{title}</h3>}
              {description && <p className="text-[14px] text-[#666666] dark:text-[#999999] mt-1">{description}</p>}
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="p-1 rounded-md text-[#666666]">
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
};
