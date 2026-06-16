
import React from 'react';
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
  UserPlus
} from 'lucide-react';
import { UserRole } from '../types';

interface MoreProps {
  onTabChange: (id: string) => void;
}

const More: React.FC<MoreProps> = ({ onTabChange }) => {
  const { currentUser, logout } = useApp();

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
                  onClick={() => onTabChange(item.id)}
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
    </div>
  );
};

export default More;
