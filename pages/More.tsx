
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
  Download
} from 'lucide-react';
import { UserRole } from '../types';
import { Modal } from '../components/Shared';

interface MoreProps {
  onTabChange: (id: string) => void;
}

const InstallGuideModal: React.FC<{ isOpen: boolean; onClose: () => void; isIOS: boolean }> = ({ isOpen, onClose, isIOS }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Install Kiddies App">
      <div className="p-4 space-y-6 flex flex-col items-center text-center">
        <div className="w-16 h-16 bg-[#8B5CF6]/10 text-[#8B5CF6] rounded-full flex items-center justify-center mb-2">
          <Download size={32} strokeWidth={2.5} />
        </div>
        
        {isIOS ? (
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight mb-2">Install on iOS</h3>
            <p className="text-sm font-semibold text-slate-500 mb-4">Apple requires a manual step to install web apps.</p>
            <ol className="text-sm text-slate-600 space-y-3 text-left bg-slate-50 p-4 rounded-xl border border-slate-100">
              <li className="flex gap-2"><strong>1.</strong> Tap the <b>Share</b> icon at the bottom of Safari.</li>
              <li className="flex gap-2"><strong>2.</strong> Scroll down and tap <b>Add to Home Screen</b>.</li>
            </ol>
          </div>
        ) : (
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight mb-2">Browser Install Blocked</h3>
            <p className="text-sm font-semibold text-slate-500 mb-4">Your browser has blocked the automatic install prompt. You can still install it manually!</p>
            <div className="text-sm text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100 font-medium">
              Look for the <b>Install</b> icon (a screen with a down arrow) at the far right of your browser's top address bar and click it.
            </div>
          </div>
        )}
        
        <button onClick={onClose} className="w-full bg-slate-900 text-white rounded-xl py-3 text-[11px] font-black uppercase tracking-widest hover:bg-slate-800 transition-colors">
          Got it
        </button>
      </div>
    </Modal>
  );
};

const More: React.FC<MoreProps> = ({ onTabChange }) => {
  const { currentUser, logout } = useApp();
  
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);

  useEffect(() => {
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone);
    setIsIOSDevice(/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream);
    
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      setShowInstallGuide(true);
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const menuGroups = [
    {
      title: 'Management',
      items: [
        { id: 'customers', label: 'Customers', icon: <Users size={18} />, color: 'text-slate-900', bg: 'bg-highlight' },
        { id: 'suppliers', label: 'Suppliers', icon: <Truck size={18} />, color: 'text-slate-900', bg: 'bg-highlight' },
        { id: 'reports', label: 'Reports & Analytics', icon: <BarChart3 size={18} />, color: 'text-slate-900', bg: 'bg-highlight' },
      ]
    },
    {
      title: 'Administration',
      items: [
        { id: 'users', label: 'Employees & Roles', icon: <ShieldCheck size={18} />, color: 'text-highlight', bg: 'bg-slate-900', adminOnly: true },
        { id: 'settings', label: 'Settings', icon: <Settings size={18} />, color: 'text-highlight', bg: 'bg-slate-900' },
      ]
    },
    {
      title: 'System',
      items: [
        ...(!isStandalone ? [{ id: 'install', label: 'Install App', icon: <Download size={18} />, color: 'text-[#8B5CF6]', bg: 'bg-[#8B5CF6]/10' }] : []),
        { id: 'backup', label: 'Backup & Restore', icon: <Database size={18} />, color: 'text-slate-400', bg: 'bg-slate-50' },
        { id: 'help', label: 'Help & Support', icon: <HelpCircle size={18} />, color: 'text-slate-400', bg: 'bg-slate-50' },
      ]
    }
  ];

  const canAccess = (item: any) => {
    if (!item.adminOnly) return true;
    return currentUser?.role === UserRole.ADMIN;
  };

  return (
    <div className="pb-20 animate-nano space-y-6">
      {/* Page Header */}
      <div className="py-4">
        <h1 className="text-3xl font-black text-slate-900 font-display tracking-tighter">More</h1>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] mt-1">System Administration</p>
      </div>

      {/* Profile Header */}
      <div className="nano-card p-6 flex items-center gap-6">
        <div className="w-16 h-16 rounded-2xl bg-highlight text-slate-900 flex items-center justify-center text-2xl font-black shadow-banana">
          {currentUser?.name.charAt(0)}
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-900 font-display tracking-tighter">{currentUser?.name}</h2>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{currentUser?.role} • {currentUser?.email}</p>
        </div>
      </div>

      {/* Menu Groups */}
      <div className="space-y-8">
        {menuGroups.map((group, idx) => (
          <div key={idx}>
            <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 px-2">{group.title}</h3>
            <div className="nano-card overflow-hidden">
              {group.items.filter(canAccess).map((item, itemIdx) => (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id === 'install') {
                      handleInstallClick();
                    } else {
                      onTabChange(item.id);
                    }
                  }}
                  className={`w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors group ${itemIdx !== group.items.length - 1 ? 'border-b border-slate-50' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl ${item.bg} ${item.color} flex items-center justify-center shadow-nano group-hover:scale-110 transition-transform`}>
                      {React.cloneElement(item.icon as React.ReactElement, { strokeWidth: 3 })}
                    </div>
                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{item.label}</span>
                  </div>
                  <ChevronRight size={16} strokeWidth={3} className="text-slate-300 group-hover:text-slate-900 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Logout Button */}
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-3 p-5 bg-rose-50 text-rose-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all shadow-nano active:scale-95"
        >
          <LogOut size={18} strokeWidth={3} />
          Sign Out
        </button>
      </div>
      <InstallGuideModal isOpen={showInstallGuide} onClose={() => setShowInstallGuide(false)} isIOS={isIOSDevice} />
    </div>
  );
};

export default More;
