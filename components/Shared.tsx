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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 md:p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            className={`bg-white rounded-2xl shadow-xl w-[calc(100%-1rem)] md:w-full h-auto max-h-[85vh] md:max-h-[90vh] ${maxWidth || 'max-w-2xl'} overflow-hidden border border-slate-100 flex flex-col relative z-10`}
          >
            <div className="flex items-center justify-between px-4 py-3.5 md:px-6 md:py-4 border-b border-slate-100 shrink-0 bg-white">
              <h2 className="text-sm md:text-base font-bold text-slate-900 tracking-tight">{title}</h2>
              <div className="flex items-center gap-2">
                {headerActions}
                <button onClick={onClose} className="p-1.5 hover:bg-slate-100/80 rounded-xl transition-all text-slate-400 hover:text-slate-700 active:scale-95">
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="p-4 md:p-6 overflow-y-auto flex-1 custom-scrollbar">
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
  <div className={`bg-white rounded-2xl border border-slate-100/90 shadow-[0_2px_8px_rgba(0,0,0,0.03)] ${className}`}>
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
    primary: 'bg-violet-600 text-white hover:bg-violet-700 shadow-xs shadow-violet-600/20',
    secondary: 'bg-white text-slate-800 border border-slate-200 hover:bg-slate-50',
    danger: 'bg-rose-500 text-white hover:bg-rose-600 shadow-xs shadow-rose-500/20',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100/80'
  };
  return (
    <button 
      type={type}
      onClick={onClick} 
      disabled={disabled}
      className={`px-4 py-2 rounded-xl font-bold text-[11px] uppercase tracking-wider transition-all active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};
