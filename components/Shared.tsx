import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  headerActions?: React.ReactNode;
  maxWidth?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  zIndex?: number;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, headerActions, maxWidth, size = 'md', zIndex = 100 }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!mounted) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    full: 'max-w-[95vw]'
  };

  const finalMaxWidth = maxWidth || sizeClasses[size] || 'max-w-2xl';

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 flex items-end md:items-center justify-center md:p-4 overflow-x-hidden overflow-y-auto"
          style={{ zIndex }}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-[2px] cursor-pointer"
          />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            onClick={(e) => e.stopPropagation()}
            className={`bg-white rounded-t-xl md:rounded-xl shadow-2xl w-full h-auto max-h-[90vh] md:max-h-[85vh] ${finalMaxWidth} overflow-hidden border border-slate-200 flex flex-col relative z-10 my-auto`}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 shrink-0 bg-white">
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">{title}</h2>
              <div className="flex items-center gap-2">
                {headerActions}
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-700 active:scale-95"
                  title="Close (Esc)"
                >
                  <X size={18} strokeWidth={2.5} />
                </button>
              </div>
            </div>
            <div className="px-5 py-4 overflow-y-auto flex-1 hide-scrollbar">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <div className={`bg-white rounded-lg border border-gray-200/60 shadow-xs ${className}`}>
    {children}
  </div>
);

export const Button: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'accent' | 'warning' | 'danger' | 'dark' | 'ghost';
  className?: string;
  type?: 'button' | 'submit';
  disabled?: boolean;
}> = ({ children, onClick, variant = 'primary', className = "", type = 'button', disabled }) => {
  const variants = {
    primary: 'bg-[#01a9fb] text-white hover:bg-[#0098e6] shadow-xs',
    secondary: 'bg-white text-gray-700 border border-gray-200 hover:bg-[#01a9fb]/5 hover:border-[#01a9fb]/30 hover:text-[#01a9fb]',
    accent: 'bg-[#fe569f] text-white hover:bg-[#eb4890] shadow-xs',
    warning: 'bg-[#FACC15] text-slate-900 hover:bg-[#EAB308] shadow-xs font-bold',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 shadow-xs',
    dark: 'bg-slate-900 text-white hover:bg-slate-800 shadow-xs',
    ghost: 'bg-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-700'
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2.5 rounded-md font-medium text-[13px] transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};
