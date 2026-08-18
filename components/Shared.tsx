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
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center md:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/25 backdrop-blur-[2px]"
          />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            className={`bg-white rounded-t-lg md:rounded-lg shadow-dropdown w-full md:w-full h-auto max-h-[90vh] md:max-h-[85vh] ${maxWidth || 'max-w-2xl'} overflow-hidden border border-gray-200/60 flex flex-col relative z-10`}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0 bg-white">
              <h2 className="text-base font-semibold text-gray-900 tracking-tight">{title}</h2>
              <div className="flex items-center gap-2">
                {headerActions}
                <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-md transition-colors text-gray-400 hover:text-gray-600">
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="px-5 py-5 overflow-y-auto flex-1 hide-scrollbar">
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
