
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
    <header className="h-14 bg-white border-b border-slate-200/80 flex items-center justify-between px-3.5 sm:px-5 sticky top-0 z-30">
      <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
        {!isSearchOpen && (
          <div className="md:hidden flex items-center shrink-0">
            <Logo size="md" onClick={() => onTabChange('dashboard')} />
          </div>
        )}

        <div className={`
          ${isSearchOpen ? 'flex absolute inset-0 bg-white px-3.5 z-50' : 'hidden sm:flex'} 
          items-center bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5 w-full max-w-sm focus-within:bg-white focus-within:border-[#01a9fb] transition-all group
        `}>
          <Search size={14} className="text-slate-400 group-focus-within:text-[#01a9fb] mr-2 shrink-0 transition-colors" strokeWidth={2.2} />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search items, bills, customers..."
            className="bg-transparent text-xs font-bold outline-none flex-1 placeholder:text-slate-400 text-slate-900"
          />
          {isSearchOpen && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setIsSearchOpen(false); }}
              className="text-xs font-black text-[#01a9fb] ml-2 shrink-0"
            >
              Cancel
            </button>
          )}
        </div>

        {!isSearchOpen && (
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="sm:hidden p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
            title="Search"
          >
            <Search size={18} strokeWidth={2.2} />
          </button>
        )}
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0" ref={dropdownRef}>
        {/* Quick App Install Button if available */}
        {!isStandalone && deferredPrompt && (
          <button
            type="button"
            onClick={handleInstallClick}
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 bg-yellow-100 hover:bg-yellow-200 text-yellow-900 border border-yellow-300 rounded-md text-[10px] font-extrabold uppercase tracking-wider transition-all shadow-xs"
            title="Install PWA Terminal"
          >
            <Download size={12} strokeWidth={2.5} />
            <span>Install</span>
          </button>
        )}

        {/* Notifications Popover */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className={`p-1.5 sm:p-2 rounded-md transition-colors relative border ${isNotificationsOpen ? 'bg-[#01a9fb]/10 text-[#01a9fb] border-[#01a9fb]/40' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 border-transparent'}`}
            title="Notifications"
          >
            <Bell size={18} strokeWidth={2.2} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-[#fe569f] rounded-full ring-2 ring-white" />
            )}
          </button>

          {isNotificationsOpen && (
            <div className="fixed md:absolute left-3 md:left-auto right-3 md:right-0 top-14 md:top-full mt-1.5 w-auto md:w-80 bg-white rounded-md border border-slate-200/90 shadow-md overflow-hidden z-50 animate-nano">
              <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Notifications</h4>
                  {unreadCount > 0 && (
                    <span className="bg-[#fe569f] text-white text-[9px] font-black px-1.5 py-0.2 rounded-full">
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

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2 hover:bg-slate-100/80 p-1 sm:p-1.5 rounded-md transition-colors border border-slate-200/70"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-[#01a9fb] text-white flex items-center justify-center font-black text-xs sm:text-sm shrink-0">
              {(currentUser?.name || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-black text-slate-900 leading-tight truncate max-w-[100px]">{currentUser?.name.split(' ')[0]}</p>
              <span className="text-[9px] font-extrabold uppercase text-[#01a9fb] leading-none block">{currentUser?.role}</span>
            </div>
            <ChevronDown size={13} className="text-slate-400 hidden sm:block" />
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-md border border-slate-200 shadow-md py-1 z-50 animate-nano">
              <div className="px-3.5 py-2.5 border-b border-slate-100 mb-1 bg-slate-50/60">
                <p className="text-xs font-black text-slate-900">{currentUser?.name}</p>
                <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">{currentUser?.email}</p>
                <span className="inline-block mt-1 bg-[#01a9fb]/10 text-[#01a9fb] border border-[#01a9fb]/30 text-[8px] font-extrabold uppercase px-1.5 py-0.2 rounded">
                  {currentUser?.role}
                </span>
              </div>
              <button
                type="button"
                onClick={() => { onTabChange('settings'); setIsUserMenuOpen(false); }}
                className="w-full text-left px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-[#01a9fb] transition-colors flex items-center gap-2"
              >
                <SettingsIcon size={13} />
                <span>Settings</span>
              </button>
              <button
                type="button"
                onClick={() => logout()}
                className="w-full text-left px-3.5 py-1.5 text-xs font-extrabold text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-2 border-t border-slate-100 mt-1 pt-2"
              >
                <LogOut size={13} />
                <span>Log out</span>
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
