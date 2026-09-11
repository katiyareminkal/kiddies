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
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-[2px] cursor-pointer"
          />
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className={`bg-white rounded-t-2xl md:rounded-2xl shadow-dropdown w-full h-auto max-h-[92vh] md:max-h-[88vh] ${finalMaxWidth} overflow-hidden border border-slate-200/90 flex flex-col relative z-10 my-auto`}
          >
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 shrink-0 bg-white/95 backdrop-blur-xs">
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">{title}</h2>
              <div className="flex items-center gap-2">
                {headerActions}
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-xl transition-all active:scale-95 border border-transparent hover:border-slate-200"
                  title="Close (Esc)"
                >
                  <X size={18} strokeWidth={2.5} />
                </button>
              </div>
            </div>
            <div className="px-5 sm:px-6 py-5 overflow-y-auto flex-1 hide-scrollbar">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export const Card: React.FC<{ children: React.ReactNode; className?: string; hoverable?: boolean }> = ({ 
  children, 
  className = "",
  hoverable = false
}) => (
  <div className={`bg-white rounded-2xl border border-slate-200/80 shadow-card ${hoverable ? 'hover:shadow-md hover:border-slate-300/80 transition-all duration-200' : ''} ${className}`}>
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
    primary: 'bg-[#01a9fb] text-white hover:bg-[#0098e6] shadow-xs shadow-blue-500/20 active:bg-[#0087cc]',
    secondary: 'bg-white text-slate-700 border border-slate-200/90 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 shadow-xs',
    accent: 'bg-[#fe569f] text-white hover:bg-[#eb4890] shadow-xs shadow-pink-500/20 active:bg-[#d4377a]',
    warning: 'bg-[#FACC15] text-slate-950 hover:bg-[#EAB308] shadow-xs font-black active:bg-[#CA8A04]',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 shadow-xs shadow-rose-500/20 active:bg-rose-800',
    dark: 'bg-slate-900 text-white hover:bg-slate-800 shadow-xs active:bg-black',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-[13px] tracking-tight transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

export const Badge: React.FC<{
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'neutral';
  className?: string;
}> = ({ children, variant = 'neutral', className = '' }) => {
  const variants = {
    primary: 'bg-[#01a9fb]/10 text-[#01a9fb] border-[#01a9fb]/25',
    secondary: 'bg-[#fe569f]/10 text-[#fe569f] border-[#fe569f]/25',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    warning: 'bg-amber-50 text-amber-800 border-amber-200/80',
    danger: 'bg-rose-50 text-rose-700 border-rose-200/80',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200/80',
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};
