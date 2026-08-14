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
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, headerActions, maxWidth }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/30"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`bg-white rounded-2xl shadow-lg w-[calc(100%-1.5rem)] md:w-full h-auto max-h-[85vh] md:max-h-[90vh] ${maxWidth || 'max-w-2xl'} overflow-hidden border border-slate-100 flex flex-col relative z-10`}
          >
            <div className="flex items-center justify-between p-3 md:p-4 border-b border-slate-50 shrink-0 bg-white">
              <h2 className="text-sm md:text-base font-semibold text-slate-900 tracking-tight">{title}</h2>
              <div className="flex items-center gap-2">
                {headerActions}
                <button onClick={onClose} className="p-1.5 hover:bg-slate-50 rounded-lg transition-all text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="p-3 md:p-6 overflow-y-auto flex-1 hide-scrollbar pb-6 md:pb-6">
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
  <div className={`bg-white rounded-xl border border-slate-100 shadow-sm ${className}`}>
    {children}
  </div>
);

export const Button: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  className?: string;
  type?: 'button' | 'submit';
  disabled?: boolean;
}> = ({ children, onClick, variant = 'primary', className = "", type = 'button', disabled }) => {
  const variants = {
    primary: 'bg-primary text-white hover:bg-primary/90 shadow-sm',
    secondary: 'bg-white text-slate-900 border border-slate-200 hover:bg-slate-50',
    danger: 'bg-rose-500 text-white hover:bg-rose-600 shadow-sm',
    ghost: 'bg-transparent text-slate-500 hover:bg-slate-50'
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-lg font-semibold text-[11px] uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};
