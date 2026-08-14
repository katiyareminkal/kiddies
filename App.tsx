
import React, { useState, useRef, useEffect } from 'react';
import { AppProvider, useApp } from './store/AppContext';
import { NAVIGATION_ITEMS } from './constants';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Rentals from './pages/Rentals';
import Customers from './pages/Customers';
import Suppliers from './pages/Suppliers';
import Sales from './pages/Sales';
import Settings from './pages/Settings';
import Reports from './pages/Reports';
import Users from './pages/Users';
import Login from './pages/Login';
import More from './pages/More';
import { Modal } from './components/Shared';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard,
  Package,
  FileText,
  AlertTriangle,
  Clock,
  ShoppingBag,
  RefreshCcw,
  CheckCircle2,
  Bell,
  Info,
  Menu,
  Search,
  Settings as SettingsIcon,
  ChevronDown,
  ShieldCheck,
  User,
  LogOut,
  Trash2,
  Heart,
  Star,
  Cloud,
  Lock,
  Eye,
  EyeOff,
  Sun,
  Download,
  Loader2
} from 'lucide-react';
import { UserRole } from './types';
import { formatDistanceToNow, parseISO } from 'date-fns';

// Helper to check permissions
const canAccess = (user: any, moduleId: string) => {
  if (!user) return false;
  if (user.role === UserRole.ADMIN) return true; // Admins access everything
  return user.permissions?.includes(moduleId) || false;
};

const Logo: React.FC<{ size?: 'sm' | 'md' | 'lg', onClick?: () => void }> = ({ size = 'md', onClick }) => {
  const sizeClasses = {
    sm: 'h-5',
    md: 'h-6',
    lg: 'h-7.5'
  };

  return (
    <div className={`flex items-center ${onClick ? 'cursor-pointer' : ''}`} onClick={onClick}>
      <img
        src="/logo.png"
        alt="Kiddies Logo"
        className={`${sizeClasses[size]} w-auto object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.08)] transition-transform active:scale-95 shrink-0`}
      />
    </div>
  );
};

const Sidebar: React.FC<{ activeTab: string; onTabChange: (id: string) => void }> = ({ activeTab, onTabChange }) => {
  const { currentUser } = useApp();

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white h-screen border-r border-slate-100 shrink-0 relative">
      {/* Branding Area */}
      <div className="p-8 pb-6">
        <Logo size="lg" onClick={() => onTabChange('dashboard')} />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto hide-scrollbar mt-2 mb-4">
        {NAVIGATION_ITEMS.filter(item => {
          if (item.id === 'settings') return false;
          return canAccess(currentUser, item.id);
        }).map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`
                relative w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[12px] font-bold transition-all duration-300 group
                ${isActive
                  ? 'bg-[#8B5CF6]/10 text-[#8B5CF6]'
                  : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'
                }
              `}
            >
              <span className={`
                ${isActive ? 'text-[#8B5CF6]' : 'text-slate-300 group-hover:text-slate-900'} 
                transition-colors duration-200
              `}>
                {React.isValidElement(item.icon)
                  ? React.cloneElement(item.icon as React.ReactElement<any>, {
                    size: 16,
                    strokeWidth: isActive ? 2.5 : 2
                  })
                  : item.icon
                }
              </span>

              <span className="tracking-widest uppercase text-[10px] font-bold">{item.label}</span>
              {isActive && (
                <div className="absolute right-2 w-1.5 h-1.5 bg-[#8B5CF6] rounded-full"></div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Sidebar Banner */}
      <div className="px-4 mb-6">
        <div className="bg-[#F3E8FF] rounded-[2rem] p-6 relative overflow-hidden group">
          <div className="absolute top-2 right-2 text-[#A084E8] opacity-20 group-hover:rotate-12 transition-transform">
            <Heart size={20} fill="currentColor" />
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-bold text-[#8B5CF6] uppercase tracking-widest mb-1">Make every day</p>
            <p className="text-sm font-black text-[#2D3648] leading-tight">a little stylish!</p>
            <div className="mt-4 flex justify-center">
              <div className="text-[#FFD93D] animate-bounce">
                <Star size={32} fill="currentColor" />
              </div>
            </div>
          </div>
          <div className="absolute -bottom-2 -left-2 text-[#6AD4DD] opacity-20">
            <Cloud size={40} fill="currentColor" />
          </div>
        </div>
      </div>
    </aside>
  );
};

const TopBar: React.FC<{ activeTab: string; onTabChange: (id: string) => void }> = ({ activeTab, onTabChange }) => {
  const { products, rentals, notifications, currentUser, logout, markNotificationsAsRead, clearNotifications } = useApp();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const unreadCount = notifications.filter(n => !n.isRead).length;

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

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-4 flex-1">
        {!isSearchOpen && (
          <div className="md:hidden flex items-center pr-1">
            <Logo size="md" onClick={() => onTabChange('dashboard')} />
          </div>
        )}

        <div className={`
          ${isSearchOpen ? 'flex absolute inset-0 bg-white px-4' : 'hidden sm:flex'} 
          items-center bg-slate-50 sm:bg-slate-50 rounded-none sm:rounded-xl px-4 py-2 w-full max-w-md focus-within:bg-white transition-all border-b sm:border border-slate-100 sm:border-transparent focus-within:border-[#8B5CF6]/20 group z-50
        `}>
          <Search size={16} className="text-slate-400 mr-3 group-focus-within:text-[#8B5CF6]" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search anything..."
            className="bg-transparent text-xs outline-none flex-1 placeholder:text-slate-400 text-slate-700 font-medium"
          />
          {isSearchOpen && (
            <button
              onClick={(e) => { e.stopPropagation(); setIsSearchOpen(false); }}
              className="text-[10px] font-black text-[#8B5CF6] ml-4 uppercase tracking-widest"
            >
              Cancel
            </button>
          )}
        </div>

        {/* Small search trigger for mobile */}
        {!isSearchOpen && (
          <button
            onClick={() => setIsSearchOpen(true)}
            className="sm:hidden p-2 text-slate-400 hover:bg-slate-50 rounded-xl transition-all"
          >
            <Search size={18} />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 md:gap-4" ref={dropdownRef}>
        <div className="relative">
          <button
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className={`p-2 rounded-xl transition-all relative ${isNotificationsOpen ? 'bg-[#8B5CF6]/10 text-[#8B5CF6]' : 'text-slate-400 hover:bg-slate-50'}`}
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-[#FF7B7B] text-white text-[8px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                {unreadCount}
              </span>
            )}
          </button>

          {isNotificationsOpen && (
            <div className="fixed md:absolute left-4 md:left-auto right-4 md:right-0 top-16 md:top-full mt-2 w-auto md:w-80 bg-white shadow-2xl rounded-2xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-2 origin-top-right z-50">
              <div className="p-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-900">Notifications</h4>
                {unreadCount > 0 && (
                  <button onClick={markNotificationsAsRead} className="text-[9px] font-bold text-[#8B5CF6] hover:underline">Mark all as read</button>
                )}
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map((note) => (
                    <div key={note.id} className={`p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer ${!note.isRead ? 'bg-[#8B5CF6]/5' : ''}`}>
                      <h5 className="text-[11px] font-bold text-slate-900">{note.title}</h5>
                      <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">{note.message}</p>
                      <p className="text-[8px] text-slate-400 mt-2 font-bold uppercase tracking-widest">
                        {formatDistanceToNow(parseISO(note.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center">
                    <Bell size={32} className="mx-auto text-slate-200 mb-2" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No notifications</p>
                  </div>
                )}
              </div>
              {notifications.length > 0 && (
                <div className="p-3 bg-slate-50 text-center border-t border-slate-50">
                  <button onClick={clearNotifications} className="text-[9px] font-bold text-slate-400 hover:text-rose-500 transition-colors uppercase tracking-widest">Clear All</button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="h-8 w-[1px] bg-slate-100 mx-2"></div>

        <div className="relative">
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-3 hover:bg-slate-50 p-1 rounded-xl transition-all"
          >
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-bold text-slate-900">Hi, {currentUser?.name.split(' ')[0]}</p>
              <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">{currentUser?.role}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-[#8B5CF6] text-white flex items-center justify-center font-black text-xs shadow-sm">
              {currentUser?.name.charAt(0)}
            </div>
            <ChevronDown size={14} className="text-slate-400" />
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white shadow-xl rounded-2xl border border-slate-100 py-2 animate-in fade-in slide-in-from-top-2 origin-top-right">
              <div className="px-4 py-2 border-b border-slate-50 mb-1">
                <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{currentUser?.name}</p>
                <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">{currentUser?.email}</p>
              </div>
              <button onClick={() => { onTabChange('settings'); setIsUserMenuOpen(false); }} className="w-full text-left px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                Settings
              </button>
              <button onClick={() => logout()} className="w-full text-left px-4 py-2 text-xs font-bold text-rose-500 hover:bg-rose-50 transition-colors">
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};


const BottomNav: React.FC<{ activeTab: string; onTabChange: (id: string) => void }> = ({ activeTab, onTabChange }) => {
  const { currentUser } = useApp();

  const bottomNavItems = [
    { id: 'dashboard', label: 'Home', icon: <LayoutDashboard size={20} /> },
    { id: 'sales', label: 'Sales', icon: <ShoppingBag size={20} /> },
    { id: 'rentals', label: 'Rentals', icon: <RefreshCcw size={20} /> },
    { id: 'inventory', label: 'Inventory', icon: <Package size={20} /> },
    { id: 'more', label: 'More', icon: <Menu size={20} /> },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 flex justify-around items-center h-16 z-40 pb-safe shadow-sm">
      {bottomNavItems.map(item => {
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all ${isActive ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <div className={`p-1 rounded-xl transition-all ${isActive ? 'bg-highlight' : ''}`}>
              {React.cloneElement(item.icon as React.ReactElement<any>, { size: 18, className: isActive ? 'stroke-[3px]' : '' })}
            </div>
            <span className={`text-[8px] uppercase tracking-[0.2em] ${isActive ? 'font-black' : 'font-bold'}`}>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};

const ResetPasswordScreen: React.FC = () => {
  const { updatePassword } = useApp();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsUpdating(true);
    const ok = await updatePassword(password);
    setIsUpdating(false);

    if (ok) {
      alert('Password reset successfully! You can now log in.');
      window.location.hash = '#dashboard';
      window.location.reload();
    } else {
      setError('Failed to reset password. The link may have expired.');
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF9F0] flex items-center justify-center p-6 relative overflow-hidden font-sans">
      <div className="absolute top-10 left-10 text-[#FFB7B7] opacity-40 animate-bounce" style={{ animationDuration: '3s' }}>
        <Heart size={48} fill="currentColor" />
      </div>
      <div className="absolute top-20 right-20 text-[#FFD93D] opacity-60 animate-pulse">
        <Sun size={80} strokeWidth={1.5} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[440px] bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] p-10 relative z-10 border border-white/50"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="flex text-5xl font-black tracking-tight mb-1">
            <span className="text-[#FF7B7B]">k</span>
            <span className="text-[#FFD93D]">i</span>
            <span className="text-[#FF8AAE]">d</span>
            <span className="text-[#A084E8]">d</span>
            <span className="text-[#6AD4DD]">i</span>
            <span className="text-[#F99417]">e</span>
            <span className="text-[#F99417]">s</span>
          </div>
        </div>

        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-[#2D3648] mb-1">Reset Password</h2>
          <p className="text-[#718096] text-sm">Enter your new secure password below</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 text-red-500 p-4 rounded-2xl text-xs font-bold text-center border border-red-100 animate-nano">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A0AEC0]" size={20} />
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-12 pr-12 py-4 bg-white border border-[#E2E8F0] rounded-2xl outline-none focus:border-[#A084E8] transition-all text-[#2D3648] placeholder-[#A0AEC0]"
              placeholder="New Password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A0AEC0] hover:text-[#718096]"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A0AEC0]" size={20} />
            <input
              type={showPassword ? "text" : "password"}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full pl-12 pr-12 py-4 bg-white border border-[#E2E8F0] rounded-2xl outline-none focus:border-[#A084E8] transition-all text-[#2D3648] placeholder-[#A0AEC0]"
              placeholder="Confirm New Password"
            />
          </div>

          <button
            type="submit"
            disabled={isUpdating}
            className="w-full py-4 bg-[#8B5CF6] text-white font-bold rounded-2xl shadow-[0_10px_20px_rgba(139,92,246,0.3)] hover:bg-[#7C3AED] transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {isUpdating ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

const AppContent: React.FC = () => {
  const { currentUser, isAuthReady, isPasswordRecovery } = useApp();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash && NAVIGATION_ITEMS.some(item => item.id === hash)) {
        setActiveTab(hash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    // Initial check
    handleHashChange();

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Update hash when activeTab changes
  useEffect(() => {
    if (window.location.hash !== `#${activeTab}`) {
      window.history.pushState(null, '', `#${activeTab}`);
    }
  }, [activeTab]);

  if (showSplash) {
    return (
      <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
          <img
            src="/logo.png"
            alt="Kiddies Logo"
            style={{ height: 'auto', width: '150px', maxWidth: '60vw', objectFit: 'contain', filter: 'drop-shadow(0 6px 12px rgba(0, 0, 0, 0.08))' }}
          />
          {/* Dotted loading animation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#0EA5E9', animation: 'dotPulse 1.4s infinite ease-in-out both', animationDelay: '0s' }}></div>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#8B5CF6', animation: 'dotPulse 1.4s infinite ease-in-out both', animationDelay: '0.2s' }}></div>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#EC4899', animation: 'dotPulse 1.4s infinite ease-in-out both', animationDelay: '0.4s' }}></div>
          </div>
        </div>
        <style>{`
          @keyframes dotPulse {
            0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
            40% { transform: scale(1.3); opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  if (isPasswordRecovery) {
    return <ResetPasswordScreen />;
  }

  if (!currentUser) {
    return <Login />;
  }

  const renderContent = () => {
    const content = (() => {
      switch (activeTab) {
        case 'dashboard': return <Dashboard onTabChange={setActiveTab} />;
        case 'inventory': return <Inventory />;
        case 'rentals': return <Rentals />;
        case 'customers': return <Customers />;
        case 'suppliers': return <Suppliers />;
        case 'sales': return <Sales />;
        case 'reports': return <Reports />;
        case 'users': return <Users />;
        case 'settings': return <Settings />;
        case 'more': return <More onTabChange={setActiveTab} />;
        default: return <Dashboard />;
      }
    })();

    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
          className="h-full animate-nano"
        >
          {content}
        </motion.div>
      </AnimatePresence>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <TopBar activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="flex-1 overflow-y-auto p-3 md:p-6 custom-scrollbar pb-24 md:pb-6 relative">
          {renderContent()}
        </main>
      </div>
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default App;
