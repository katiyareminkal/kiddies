import React, { useState, useEffect } from 'react';
import { useApp } from '../store/AppContext';
import {
  Users,
  Truck,
  BarChart3,
  ShieldCheck,
  Settings,
  LogOut,
  ChevronRight,
  Database,
  HelpCircle,
  Layers,
  Tag,
  Wallet,
  UserPlus,
  Download,
  Shield,
  Smartphone,
  Sparkles
} from 'lucide-react';
import { UserRole } from '../types';
import { Modal } from '../components/Shared';

interface MoreProps {
  onTabChange: (id: string) => void;
}

const InstallGuideModal: React.FC<{ isOpen: boolean; onClose: () => void; isIOS: boolean; hasPrompt: boolean; onTriggerPrompt: () => void }> = ({ isOpen, onClose, isIOS, hasPrompt, onTriggerPrompt }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Install Kiddies Terminal App">
      <div className="p-4 sm:p-5 space-y-4 flex flex-col items-center text-center">
        <div className="w-16 h-16 bg-[#01a9fb]/10 text-[#01a9fb] border border-[#01a9fb]/30 rounded-2xl flex items-center justify-center shadow-xs">
          <Download size={30} strokeWidth={2.2} />
        </div>

        {hasPrompt ? (
          <div>
            <h3 className="text-base font-black text-slate-900 mb-1">One-Click Install Ready</h3>
            <p className="text-xs text-slate-500 mb-4 font-semibold">Click below to install Kiddies on your device desktop or home screen for offline access.</p>
            <button
              onClick={onTriggerPrompt}
              className="w-full bg-[#01a9fb] hover:bg-[#0098e6] active:scale-95 text-white rounded-xl py-3 text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-blue-500/25 flex items-center justify-center gap-2"
            >
              <Download size={16} strokeWidth={2.5} />
              <span>Install App Now</span>
            </button>
          </div>
        ) : isIOS ? (
          <div className="w-full text-left">
            <h3 className="text-sm font-black text-slate-900 mb-1 text-center">Install on iOS (Safari)</h3>
            <p className="text-xs text-slate-500 mb-3 text-center font-medium">Follow these quick steps to add the app to your Home Screen:</p>
            <div className="text-xs text-slate-700 space-y-2.5 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#01a9fb] text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">1</span>
                <span>Tap the <b>Share button</b> (box with arrow up) at the bottom toolbar of Safari.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#01a9fb] text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">2</span>
                <span>Scroll down and tap <b>"Add to Home Screen"</b>.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#01a9fb] text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">3</span>
                <span>Tap <b>"Add"</b> at the top-right corner.</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full text-left">
            <h3 className="text-sm font-black text-slate-900 mb-1 text-center">Install on Chrome / Edge / Android</h3>
            <p className="text-xs text-slate-500 mb-3 text-center font-medium">Install as a standalone desktop or mobile application:</p>
            <div className="text-xs text-slate-700 space-y-2.5 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#01a9fb] text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">1</span>
                <span>Click the <b>Install App icon (⊕ or 💻)</b> on the right side of your browser address bar.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#01a9fb] text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">2</span>
                <span>Or open browser menu (<b>⋮</b>) and select <b>"Install Kiddies..."</b> or <b>"Add to Home screen"</b>.</span>
              </div>
            </div>
          </div>
        )}

        <button onClick={onClose} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl py-2.5 text-xs font-black uppercase tracking-wider transition-colors">
          Dismiss
        </button>
      </div>
    </Modal>
  );
};

const More: React.FC<MoreProps> = ({ onTabChange }) => {
  const { currentUser, logout } = useApp();

  const [deferredPrompt, setDeferredPrompt] = useState<any>((window as any).deferredPWAInstallPrompt || null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);

  useEffect(() => {
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone);
    setIsIOSDevice(/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream);

    if ((window as any).deferredPWAInstallPrompt) {
      setDeferredPrompt((window as any).deferredPWAInstallPrompt);
    }

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      (window as any).deferredPWAInstallPrompt = e;
      setDeferredPrompt(e);
    };

    const handleInstallReady = () => {
      if ((window as any).deferredPWAInstallPrompt) {
        setDeferredPrompt((window as any).deferredPWAInstallPrompt);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('pwa-install-ready', handleInstallReady);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('pwa-install-ready', handleInstallReady);
    };
  }, []);

  const handleInstallClick = async () => {
    const promptToUse = deferredPrompt || (window as any).deferredPWAInstallPrompt;
    if (!promptToUse) {
      setShowInstallGuide(true);
      return;
    }
    try {
      promptToUse.prompt();
      const { outcome } = await promptToUse.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        (window as any).deferredPWAInstallPrompt = null;
        setShowInstallGuide(false);
      }
    } catch (err) {
      console.warn('Install prompt error:', err);
      setShowInstallGuide(true);
    }
  };

  const menuGroups = [
    {
      title: 'Store Operations & Relations',
      items: [
        { id: 'customers', label: 'Customers CRM', desc: 'Client directory & store credits', icon: <Users size={18} />, color: 'text-[#01a9fb]', bg: 'bg-[#01a9fb]/10 border-[#01a9fb]/30' },
        { id: 'suppliers', label: 'Procurement Suppliers', desc: 'Vendor directory & purchase bills', icon: <Truck size={18} />, color: 'text-[#fe569f]', bg: 'bg-[#fe569f]/10 border-[#fe569f]/30' },
        { id: 'reports', label: 'Financial Reports & Analytics', desc: 'P&L, channels & audit ledger', icon: <BarChart3 size={18} />, color: 'text-[#01a9fb]', bg: 'bg-[#01a9fb]/10 border-[#01a9fb]/30' },
      ]
    },
    {
      title: 'Store Administration',
      items: [
        { id: 'users', label: 'Staff & Role Permissions', desc: 'Employee access & security', icon: <ShieldCheck size={18} />, color: 'text-[#fe569f]', bg: 'bg-[#fe569f]/10 border-[#fe569f]/30', adminOnly: true },
        { id: 'settings', label: 'System Configuration', desc: 'Store profile, taxes & backups', icon: <Settings size={18} />, color: 'text-slate-700', bg: 'bg-slate-100 border-slate-200' },
      ]
    },
    {
      title: 'System Utilities',
      items: [
        ...(!isStandalone ? [{ id: 'install', label: 'Install Desktop / Mobile App', desc: 'Offline ready progressive web app', icon: <Download size={18} />, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100' }] : []),
        { id: 'backup', label: 'Database Backup & Restore', desc: 'Export spreadsheets or raw JSON', icon: <Database size={18} />, color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200' },
        { id: 'help', label: 'Support & Documentation', desc: 'POS manual and cheat sheet', icon: <HelpCircle size={18} />, color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200' },
      ]
    }
  ];

  const canAccess = (item: any) => {
    if (!item.adminOnly) return true;
    return currentUser?.role === UserRole.ADMIN;
  };

  return (
    <div className="pb-24 animate-nano space-y-5 max-w-[1000px] mx-auto">
      {/* Page Header */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-[#01a9fb] text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
            <Layers size={22} strokeWidth={2.2} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">Navigation & Utilities</h1>
              <span className="text-[10px] font-black uppercase text-[#01a9fb] bg-[#eff6ff] border border-[#dbeafe] px-2 py-0.5 rounded-md">
                Admin Console
              </span>
            </div>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">Quick access to admin modules, reports, CRM, and system tools</p>
          </div>
        </div>
      </div>

      {/* User Profile Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#01a9fb] to-[#fe569f] text-white flex items-center justify-center text-xl font-black shadow-md shadow-blue-500/15 shrink-0 border border-white/20">
            {(currentUser?.name || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-slate-900">{currentUser?.name}</h2>
              <span className="bg-[#01a9fb]/10 text-[#01a9fb] border border-[#01a9fb]/30 text-[10px] font-black uppercase px-2 py-0.5 rounded-md">
                {currentUser?.role}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">{currentUser?.email}</p>
          </div>
        </div>

        <button
          onClick={logout}
          className="px-3.5 py-2 text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 flex items-center gap-1.5 shrink-0"
          title="Sign out of current terminal session"
        >
          <LogOut size={14} strokeWidth={2.5} />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>

      {/* Menu Groups */}
      <div className="space-y-5">
        {menuGroups.map((group, idx) => (
          <div key={idx} className="space-y-2.5">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-wider px-2">{group.title}</h3>
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden divide-y divide-slate-100">
              {group.items.filter(canAccess).map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id === 'install') {
                      handleInstallClick();
                    } else if (item.id === 'backup') {
                      onTabChange('settings');
                    } else {
                      onTabChange(item.id);
                    }
                  }}
                  className="w-full flex items-center justify-between p-4 sm:p-4.5 hover:bg-slate-50 transition-colors group text-left active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3.5">
                    <div className={`w-10 h-10 rounded-xl ${item.bg} ${item.color} border flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs`}>
                      {item.icon}
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-[#01a9fb] transition-colors">
                        {item.label}
                      </h4>
                      <p className="text-[11px] text-slate-400 font-semibold mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                  <ChevronRight size={17} strokeWidth={2.5} className="text-slate-300 group-hover:text-slate-900 group-hover:translate-x-1 transition-all shrink-0" />
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Big Sign Out Button */}
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white border border-rose-200 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-xs active:scale-95"
        >
          <LogOut size={16} strokeWidth={2.5} />
          <span>Sign Out of Terminal</span>
        </button>
      </div>

      <InstallGuideModal
        isOpen={showInstallGuide}
        onClose={() => setShowInstallGuide(false)}
        isIOS={isIOSDevice}
        hasPrompt={Boolean(deferredPrompt || (window as any).deferredPWAInstallPrompt)}
        onTriggerPrompt={handleInstallClick}
      />
    </div>
  );
};

export default More;
