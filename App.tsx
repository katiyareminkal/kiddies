
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
    lg: 'h-8'
  };

  return (
    <div className={`flex items-center ${onClick ? 'cursor-pointer' : ''}`} onClick={onClick}>
      <img
        src="/logo.png"
        alt="Kiddies Logo"
        className={`${sizeClasses[size]} w-auto object-contain transition-transform active:scale-95 shrink-0`}
      />
    </div>
  );
};

const Sidebar: React.FC<{ activeTab: string; onTabChange: (id: string) => void }> = ({ activeTab, onTabChange }) => {
  const { currentUser } = useApp();

  return (
    <aside className="hidden md:flex flex-col w-60 bg-white h-screen border-r border-gray-200/60 shrink-0">
      {/* Branding Area */}
      <div className="px-6 py-5">
        <Logo size="lg" onClick={() => onTabChange('dashboard')} />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto hide-scrollbar">
        {NAVIGATION_ITEMS.map((item) => {
          if (!canAccess(currentUser, item.id)) return null;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`
                relative w-full flex items-center gap-3 px-3.5 py-2.5 rounded-md text-[13px] font-bold transition-all
                ${isActive
                  ? 'bg-[#01a9fb] text-white shadow-xs'
                  : 'text-slate-600 hover:text-[#01a9fb] hover:bg-[#01a9fb]/5'
                }
              `}
            >
              <span className={`${isActive ? 'text-white' : 'text-slate-400'} transition-colors`}>
                {React.isValidElement(item.icon)
                  ? React.cloneElement(item.icon as React.ReactElement<any>, {
                    size: 18,
                    strokeWidth: isActive ? 2.2 : 1.8
                  })
                  : item.icon
                }
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      <div className="px-4 pb-4 pt-2">
        <div className="bg-[#fe569f]/10 rounded-md p-3.5 border border-[#fe569f]/20">
          <p className="text-[11px] font-extrabold text-[#fe569f] uppercase tracking-wider mb-0.5">Kiddies Store</p>
          <p className="text-xs font-bold text-slate-900 leading-snug">Retail & Rental Terminal ✨</p>
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
    <header className="bg-gradient-to-r from-[#1746c9] via-[#1a56db] to-[#2563eb] text-white px-3 sm:px-5 py-3 sm:py-3.5 shadow-md relative z-30">
      {/* Background glow accents */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-blue-400/20 rounded-full blur-2xl" />
        <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-indigo-400/25 rounded-full blur-2xl" />
      </div>

      <div className="flex items-center justify-between gap-2.5 sm:gap-4 relative z-10">
        {/* Left side: Colorful Logo & Subtitle */}
        <div 
          onClick={() => onTabChange('dashboard')} 
          className="cursor-pointer flex flex-col items-start select-none group shrink-0"
        >
          <div className="flex items-center text-2xl sm:text-3xl font-black tracking-tight leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)]">
            <span className="text-[#38bdf8]">K</span>
            <span className="text-[#38bdf8]">i</span>
            <span className="text-[#38bdf8]">d</span>
            <span className="text-[#f472b6]">d</span>
            <span className="text-[#f472b6]">i</span>
            <span className="text-[#fde047]">e</span>
            <span className="text-[#f472b6]">s</span>
          </div>
          <div className="w-full flex justify-between text-[6.5px] sm:text-[7px] font-black uppercase text-white/90 leading-none mt-1 select-none tracking-wider drop-shadow-sm">
            <span>R</span><span>E</span><span>T</span><span>A</span><span>I</span><span>L</span>
            <span>&nbsp;</span><span>&amp;</span><span>&nbsp;</span>
            <span>R</span><span>E</span><span>N</span><span>T</span><span>A</span><span>L</span><span>S</span>
          </div>
        </div>

        {/* Center: Translucent Search Bar with breathing space */}
        <div className="flex-1 max-w-md ml-3.5 sm:ml-6 mr-1.5 sm:mr-3">
          <div className="flex items-center bg-white/15 hover:bg-white/20 focus-within:bg-white/25 border border-white/20 rounded-xl sm:rounded-2xl px-3 py-1.5 sm:py-2 transition-all shadow-inner">
            <Search size={15} className="text-blue-200 shrink-0 mr-2" strokeWidth={2.3} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search anything..."
              className="bg-transparent text-xs sm:text-sm font-semibold outline-none flex-1 placeholder:text-blue-200/80 text-white w-full"
            />
          </div>
        </div>

        {/* Right side: Notifications bell with red counter + Circular User Avatar */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0" ref={dropdownRef}>
          {/* Notifications Popover */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 flex items-center justify-center text-white transition-all border border-white/10 relative shrink-0 shadow-inner"
              title="Notifications"
            >
              <Bell size={18} strokeWidth={2.2} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] bg-[#fe569f] text-white text-[9.5px] font-black rounded-full flex items-center justify-center px-1 border-2 border-[#1a56db] shadow-sm">
                  {unreadCount}
                </span>
              )}
            </button>

            {isNotificationsOpen && (
              <div className="fixed md:absolute left-3 md:left-auto right-3 md:right-0 top-16 md:top-full mt-2 w-auto md:w-80 bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden z-50 text-slate-900 animate-in zoom-in-95 fade-in duration-200">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Notifications</h4>
                    {unreadCount > 0 && (
                      <span className="bg-[#fe569f] text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button type="button" onClick={markNotificationsAsRead} className="text-[10px] font-bold text-[#01a9fb] hover:underline uppercase">Mark read</button>
                  )}
                </div>
                <div className="max-h-[300px] overflow-y-auto divide-y divide-slate-50">
                  {notifications.length > 0 ? (
                    notifications.map((note) => (
                      <div key={note.id} className={`p-3 hover:bg-slate-50 transition-colors cursor-pointer ${!note.isRead ? 'bg-[#01a9fb]/5' : ''}`}>
                        <h5 className="text-xs font-bold text-slate-900">{note.title}</h5>
                        <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">{note.message}</p>
                        <p className="text-[9px] font-bold text-slate-400 mt-1">
                          {formatDistanceToNow(parseISO(note.timestamp), { addSuffix: true })}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center">
                      <Bell size={20} className="mx-auto text-slate-300 mb-1.5" />
                      <p className="text-xs font-bold text-slate-400">No new notifications</p>
                    </div>
                  )}
                </div>
                {notifications.length > 0 && (
                  <div className="px-3 py-2 bg-slate-50 text-center border-t border-slate-100">
                    <button type="button" onClick={clearNotifications} className="text-[10px] font-bold text-slate-400 hover:text-rose-500 transition-colors uppercase">Clear all</button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User Profile Dropdown (Large Round Badge with Initial) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#01a9fb] hover:bg-[#0098e6] active:scale-95 text-white flex items-center justify-center font-black text-sm sm:text-base transition-all border-2 border-white/40 shadow-md shrink-0"
              title={currentUser?.name || 'Account'}
            >
              {(currentUser?.name || 'K').charAt(0).toUpperCase()}
            </button>

            {isUserMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl border border-slate-200 shadow-2xl py-2 z-50 text-slate-900 animate-in zoom-in-95 fade-in duration-200">
                <div className="px-4 py-3 border-b border-slate-100 mb-1 bg-slate-50">
                  <p className="text-xs font-black text-slate-900">{currentUser?.name}</p>
                  <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">{currentUser?.email}</p>
                  <span className="inline-block mt-1 bg-[#01a9fb]/10 text-[#01a9fb] border border-[#01a9fb]/30 text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded-full">
                    {currentUser?.role}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => { onTabChange('settings'); setIsUserMenuOpen(false); }}
                  className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-[#01a9fb] transition-colors flex items-center gap-2"
                >
                  <SettingsIcon size={14} />
                  <span>Settings</span>
                </button>
                <button
                  type="button"
                  onClick={() => logout()}
                  className="w-full text-left px-4 py-2 text-xs font-extrabold text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-2 border-t border-slate-100 mt-1 pt-2"
                >
                  <LogOut size={14} />
                  <span>Log out</span>
                </button>
              </div>
            )}
          </div>
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

  const secondaryTabs = ['customers', 'suppliers', 'reports', 'users', 'settings', 'more'];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200/60 flex justify-around items-center h-[56px] z-40 pb-safe shadow-[0_-1px_3px_rgba(0,0,0,0.04)]">
      {bottomNavItems.map(item => {
        const isActive = item.id === 'more'
          ? secondaryTabs.includes(activeTab)
          : activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`flex flex-col items-center justify-center w-full h-full gap-0.5 transition-all active:scale-95 ${isActive ? 'text-[#01a9fb]' : 'text-gray-400'}`}
          >
            {React.cloneElement(item.icon as React.ReactElement<any>, { size: 20, strokeWidth: isActive ? 2.5 : 1.5 })}
            <span className={`text-[10px] ${isActive ? 'font-extrabold text-[#01a9fb]' : 'font-normal'}`}>{item.label}</span>
            {isActive && <div className="w-4 h-0.5 rounded-full bg-[#01a9fb] mt-0.5" />}
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
        className="w-full max-w-[440px] bg-white rounded-lg shadow-sm p-10 relative z-10 border border-slate-200"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="flex text-5xl font-bold tracking-tight mb-1">
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
          <div className="mb-6 bg-red-50 text-red-500 p-4 rounded-md text-xs font-bold text-center border border-red-100 animate-nano">
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
              className="w-full pl-12 pr-12 py-3.5 bg-white border border-[#E2E8F0] rounded-md outline-none focus:border-slate-900 transition-all text-[#2D3648] placeholder-[#A0AEC0]"
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
              className="w-full pl-12 pr-12 py-3.5 bg-white border border-[#E2E8F0] rounded-md outline-none focus:border-slate-900 transition-all text-[#2D3648] placeholder-[#A0AEC0]"
              placeholder="Confirm New Password"
            />
          </div>

          <button
            type="submit"
            disabled={isUpdating}
            className="w-full py-3.5 bg-slate-900 text-white font-bold rounded-md shadow-xs hover:bg-slate-800 transition-all active:scale-[0.98] disabled:opacity-50"
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

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash && NAVIGATION_ITEMS.some(item => item.id === hash)) {
        setActiveTab(hash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Update hash when activeTab changes
  useEffect(() => {
    if (window.location.hash !== `#${activeTab}`) {
      window.history.pushState(null, '', `#${activeTab}`);
    }
  }, [activeTab]);

  // While Supabase auth is initialising, render the loading screen
  // so React never blanks #root and causes a white flash
  if (!isAuthReady) {
    return (
      <div style={{ height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
          <img src="/logo.png" alt="Kiddies Logo" style={{ height: 'auto', width: '150px', maxWidth: '60vw', objectFit: 'contain', filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.08))' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
            <div className="dot-pulse" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#01a9fb', animationDelay: '0s' }} />
            <div className="dot-pulse" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#fe569f', animationDelay: '0.2s' }} />
            <div className="dot-pulse" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#FACC15', animationDelay: '0.4s' }} />
          </div>
        </div>
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
        <main className="flex-1 overflow-y-auto px-3 sm:px-6 pt-3 sm:pt-4 pb-24 md:pb-6 custom-scrollbar relative">
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
