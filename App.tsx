
import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  ChevronRight,
  X,
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
  Loader2,
  Truck,
  Users as UsersIcon,
  BarChart3
} from 'lucide-react';
import { UserRole } from './types';
import { formatDistanceToNow, parseISO } from 'date-fns';

// Helper to check permissions
export const canAccess = (user: any, moduleId: string): boolean => {
  if (!user) return false;
  if (user.role === UserRole.ADMIN) return true; // Admins access everything
  if (moduleId === 'users' || moduleId === 'settings') return false; // Staff never access users or system settings
  if (moduleId === 'more') {
    // Secondary tabs that live under 'more'
    const secondaryTabs = ['customers', 'suppliers', 'reports'];
    return secondaryTabs.some(tab => user.permissions?.includes(tab));
  }
  return user.permissions?.includes(moduleId) || false;
};

const AccessRestrictedView: React.FC<{
  tabId: string;
  user: any;
  allowedTabs: string[];
  onNavigate: (tabId: string) => void;
}> = ({ tabId, user, allowedTabs, onNavigate }) => {
  const currentTab = NAVIGATION_ITEMS.find(item => item.id === tabId);
  const primaryFallback = allowedTabs[0] || 'sales';
  const primaryFallbackItem = NAVIGATION_ITEMS.find(item => item.id === primaryFallback);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4 animate-nano">
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 max-w-lg w-full text-center shadow-card">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border-2 border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-4 shadow-2xs">
          <Lock size={30} strokeWidth={2.2} />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50/80 border border-amber-200/80 rounded-full text-[10px] font-black uppercase tracking-wider text-amber-800 mb-3">
          <ShieldCheck size={12} />
          <span>Restricted Staff Access</span>
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Page Access Restricted
        </h2>
        
        <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-2 leading-relaxed">
          Your staff account is restricted to selected modules. You do not currently have authorization to access the <span className="font-black text-slate-800">{currentTab?.label || tabId}</span> page.
        </p>

        {allowedTabs.length > 0 && (
          <div className="mt-6 pt-5 border-t border-slate-100 text-left">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2.5">
              Your Authorized Pages ({allowedTabs.length})
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {allowedTabs.map(id => {
                const nav = NAVIGATION_ITEMS.find(n => n.id === id);
                if (!nav) return null;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onNavigate(id)}
                    className="p-2.5 rounded-xl border border-slate-200/90 bg-slate-50 hover:bg-[#01a9fb]/10 hover:border-[#01a9fb]/40 transition-all text-left flex items-center gap-2.5 group"
                  >
                    <div className="text-slate-500 group-hover:text-[#01a9fb]">
                      {nav.icon}
                    </div>
                    <span className="text-xs font-bold text-slate-800 group-hover:text-[#01a9fb] truncate">
                      {nav.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-6 pt-4 flex flex-col sm:flex-row gap-2.5 justify-center">
          {primaryFallbackItem && (
            <button
              type="button"
              onClick={() => onNavigate(primaryFallback)}
              className="px-5 py-2.5 bg-[#01a9fb] hover:bg-[#0098e6] text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-card transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <span>Return to {primaryFallbackItem.label}</span>
              <ChevronRight size={14} />
            </button>
          )}
        </div>

        <p className="text-[11px] text-slate-400 font-semibold mt-4">
          Need access to this module? Request access from your Store Administrator.
        </p>
      </div>
    </div>
  );
};

const Logo: React.FC<{ size?: 'sm' | 'md' | 'lg', onClick?: () => void }> = ({ size = 'md', onClick }) => {
  const sizeClasses = {
    sm: 'h-8',
    md: 'h-10 sm:h-11',
    lg: 'h-12 sm:h-14'
  };

  return (
    <div className={`flex items-center gap-2.5 ${onClick ? 'cursor-pointer' : ''}`} onClick={onClick}>
      <img
        src="/icon.png"
        alt="Logo"
        className={`${sizeClasses[size]} w-auto object-contain transition-transform active:scale-95 shrink-0`}
      />
      <div className="flex flex-col text-left leading-tight">
        <span className="text-xs font-black uppercase tracking-wider text-slate-900 whitespace-nowrap">Stock & Rentals</span>
        <span className="text-[9px] font-extrabold text-[#01a9fb] uppercase tracking-widest whitespace-nowrap">Management</span>
      </div>
    </div>
  );
};

const Sidebar: React.FC<{ activeTab: string; onTabChange: (id: string) => void }> = ({ activeTab, onTabChange }) => {
  const { currentUser, products, rentals } = useApp();

  const activeRentalsCount = (rentals || []).filter(r => r.status === 'ACTIVE' || r.status === 'OVERDUE').length;
  const lowStockCount = (products || []).filter(p => ((p.saleStock || 0) + (p.rentalStock || 0)) <= (p.minStockAlert || 3) && ((p.saleStock || 0) + (p.rentalStock || 0)) > 0).length;

  const NAV_SECTIONS = [
    {
      title: 'OPERATIONS',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={19} strokeWidth={2.2} /> },
        { id: 'sales', label: 'Sales', icon: <ShoppingBag size={19} strokeWidth={2.2} /> },
        { 
          id: 'rentals', 
          label: 'Rentals', 
          icon: <RefreshCcw size={19} strokeWidth={2.2} />,
          badge: activeRentalsCount > 0 ? `${activeRentalsCount}` : undefined,
          badgeColor: 'bg-sky-50 text-sky-700 border border-sky-200'
        },
      ]
    },
    {
      title: 'CATALOG & PARTNERS',
      items: [
        { 
          id: 'inventory', 
          label: 'Inventory', 
          icon: <Package size={19} strokeWidth={2.2} />,
          badge: lowStockCount > 0 ? `${lowStockCount}` : undefined,
          badgeColor: 'bg-amber-50 text-amber-800 border border-amber-200'
        },
        { id: 'suppliers', label: 'Suppliers', icon: <Truck size={19} strokeWidth={2.2} /> },
        { id: 'customers', label: 'Customers', icon: <UsersIcon size={19} strokeWidth={2.2} /> },
      ]
    },
    {
      title: 'MANAGEMENT',
      items: [
        { id: 'reports', label: 'Reports', icon: <BarChart3 size={19} strokeWidth={2.2} /> },
        { id: 'users', label: 'Users', icon: <ShieldCheck size={19} strokeWidth={2.2} /> },
        { id: 'settings', label: 'Settings', icon: <SettingsIcon size={19} strokeWidth={2.2} /> },
      ]
    }
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white h-full border-r border-slate-200/80 shrink-0 select-none justify-between">
      {/* Navigation Groups */}
      <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto hide-scrollbar">
        {NAV_SECTIONS.map((section, idx) => {
          const visibleItems = section.items.filter(item => canAccess(currentUser, item.id));
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.title || idx} className="space-y-1">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.16em] px-3.5 pb-1">
                {section.title}
              </p>
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onTabChange(item.id)}
                      className={`
                        group relative w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[13px] font-bold transition-all duration-150
                        ${isActive
                          ? 'bg-[#01a9fb] text-white shadow-xs shadow-blue-500/25'
                          : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100/80 active:bg-slate-200/60'
                        }
                      `}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-700'} transition-colors shrink-0`}>
                          {item.icon}
                        </span>
                        <span className="truncate">{item.label}</span>
                      </div>

                      {item.badge && !isActive && (
                        <span className={`text-[10.5px] font-black px-2 py-0.5 rounded-full ${item.badgeColor}`}>
                          {item.badge}
                        </span>
                      )}

                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Minimal Brand Footer */}
      <div className="px-4 py-3 border-t border-slate-100/90 select-none bg-slate-50/50 space-y-1.5">
        {currentUser?.role !== UserRole.ADMIN ? (
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md flex items-center gap-1">
              <ShieldCheck size={11} className="text-amber-600" />
              <span>Staff ({currentUser?.permissions?.length || 0} Pages)</span>
            </span>
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">v2.4</span>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-bold text-slate-500 tracking-tight">Admin Full Access</span>
            </div>
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
              v2.4
            </span>
          </div>
        )}
      </div>
    </aside>
  );
};

const TopBar: React.FC<{ activeTab: string; onTabChange: (id: string) => void }> = ({ activeTab, onTabChange }) => {
  const { products, rentals, sales, customers, notifications, currentUser, logout, markNotificationsAsRead, clearNotifications } = useApp();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone);

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  // Global Ctrl+K / Cmd+K Search shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => {
          const next = !prev;
          if (next) {
            setTimeout(() => searchInputRef.current?.focus(), 60);
          }
          return next;
        });
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setIsNotificationsOpen(false);
        setIsUserMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
        setIsUserMenuOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Live search results
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || q.length < 2) return null;

    const matchedProducts = (products || [])
      .filter(p => p.name.toLowerCase().includes(q) || (p.sku && p.sku.toLowerCase().includes(q)))
      .slice(0, 4);

    const matchedCustomers = (customers || [])
      .filter(c => c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q)))
      .slice(0, 3);

    const matchedSales = (sales || [])
      .filter(s => s.id.toLowerCase().includes(q) || (s.invoiceNumber && s.invoiceNumber.toLowerCase().includes(q)))
      .slice(0, 3);

    return {
      products: matchedProducts,
      customers: matchedCustomers,
      sales: matchedSales,
      total: matchedProducts.length + matchedCustomers.length + matchedSales.length
    };
  }, [searchQuery, products, customers, sales]);

  return (
    <header className="bg-white text-slate-900 px-3 sm:px-6 py-2 sm:py-2.5 shadow-2xs border-b border-slate-200/90 sticky top-0 z-40 w-full shrink-0">
      <div className="flex items-center justify-between gap-3 sm:gap-6 w-full max-w-[1700px] mx-auto">
        {/* Left Side: Brand Logo (Same as Preloader) */}
        <div
          onClick={() => {
            if (canAccess(currentUser, 'dashboard')) {
              onTabChange('dashboard');
            } else {
              const allowed = currentUser?.permissions?.[0] || 'sales';
              onTabChange(allowed);
            }
          }}
          className="cursor-pointer flex items-center gap-2.5 sm:gap-3 select-none group shrink-0"
        >
          <img
            src="/icon.png"
            alt="Stock & Rentals"
            className="h-8 sm:h-9 w-auto object-contain transition-transform duration-200 group-hover:scale-105 active:scale-95 shrink-0"
          />
          <div className="flex flex-col text-left leading-tight">
            <span className="text-xs sm:text-[13.5px] font-black uppercase tracking-wider text-slate-900 whitespace-nowrap">
              Stock & Rentals
            </span>
            <span className="text-[8px] sm:text-[9.5px] font-extrabold text-[#01a9fb] uppercase tracking-widest whitespace-nowrap">
              Management Suite
            </span>
          </div>
        </div>

        {/* Right side: Search Icon Trigger + Notifications + User Profile */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0" ref={dropdownRef}>
          {/* Search Icon Trigger - Opens just below it */}
          <div className="relative" ref={searchContainerRef}>
            <button
              type="button"
              onClick={() => {
                setIsSearchOpen(prev => {
                  const next = !prev;
                  if (next) {
                    setTimeout(() => searchInputRef.current?.focus(), 60);
                  }
                  return next;
                });
              }}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all border shrink-0 shadow-2xs ${
                isSearchOpen
                  ? 'bg-[#01a9fb]/10 text-[#01a9fb] border-[#01a9fb]/40'
                  : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 border-slate-200/80 active:scale-95'
              }`}
              title="Search products, orders, customers (Ctrl+K)"
              aria-label="Search"
            >
              <Search size={17} strokeWidth={2.2} />
            </button>

            {isSearchOpen && (
              <div className="fixed sm:absolute left-3 sm:left-auto right-3 sm:right-0 top-16 sm:top-full mt-2 w-auto sm:w-96 md:w-[460px] bg-white rounded-2xl border border-slate-200 shadow-dropdown p-3 z-50 animate-in zoom-in-95 fade-in duration-150 text-slate-900">
                <div className="flex items-center bg-slate-100/90 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#01a9fb]/35 focus-within:border-[#01a9fb] border border-slate-200/90 rounded-xl px-3 py-2 transition-all shadow-2xs">
                  <Search size={16} className="text-slate-400 shrink-0 mr-2.5" strokeWidth={2.3} />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search products, orders, customers..."
                    className="bg-transparent text-xs sm:text-sm font-medium outline-none flex-1 placeholder:text-slate-400 text-slate-900 w-full"
                    autoFocus
                  />
                  {searchQuery ? (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="text-slate-400 hover:text-slate-700 p-0.5"
                    >
                      <X size={14} />
                    </button>
                  ) : (
                    <span className="hidden sm:inline-flex items-center text-[9px] font-mono font-bold text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-2xs select-none">
                      ESC
                    </span>
                  )}
                </div>

                {/* Live Search Results */}
                {searchResults && (
                  <div className="mt-2.5 max-h-[340px] overflow-y-auto divide-y divide-slate-100 custom-scrollbar pr-1">
                    {searchResults.products.length > 0 && (
                      <div className="pb-1.5">
                        <span className="text-[10px] font-black uppercase text-slate-400 px-2 block mb-1">Products</span>
                        {searchResults.products.map(p => (
                          <div
                            key={p.id}
                            onClick={() => {
                              if (canAccess(currentUser, 'inventory')) {
                                onTabChange('inventory');
                                setIsSearchOpen(false);
                              }
                            }}
                            className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#01a9fb] flex items-center justify-center shrink-0">
                                <Package size={15} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-900 truncate">{p.name}</p>
                                <p className="text-[10px] text-slate-400 font-mono">{p.sku || 'No SKU'}</p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-xs font-black text-slate-900">₹{p.salePrice || p.rentalPrice || 0}</p>
                              <p className="text-[10px] font-bold text-emerald-600">Stock: {(p.saleStock || 0) + (p.rentalStock || 0)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {searchResults.customers.length > 0 && (
                      <div className="pt-1.5 border-t border-slate-100">
                        <span className="text-[10px] font-black uppercase text-slate-400 px-2 block mb-1">Customers</span>
                        {searchResults.customers.map(c => (
                          <div
                            key={c.id}
                            onClick={() => {
                              if (canAccess(currentUser, 'customers')) {
                                onTabChange('customers');
                                setIsSearchOpen(false);
                              }
                            }}
                            className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                                <UsersIcon size={15} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-900 truncate">{c.name}</p>
                                <p className="text-[10px] text-slate-400">{c.phone || 'No Phone'}</p>
                              </div>
                            </div>
                            <ChevronRight size={14} className="text-slate-400" />
                          </div>
                        ))}
                      </div>
                    )}

                    {searchResults.sales.length > 0 && (
                      <div className="pt-1.5 border-t border-slate-100">
                        <span className="text-[10px] font-black uppercase text-slate-400 px-2 block mb-1">Sales & Orders</span>
                        {searchResults.sales.map(s => (
                          <div
                            key={s.id}
                            onClick={() => {
                              if (canAccess(currentUser, 'sales')) {
                                onTabChange('sales');
                                setIsSearchOpen(false);
                              }
                            }}
                            className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                <ShoppingBag size={15} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-900 truncate">{s.invoiceNumber || s.id}</p>
                                <p className="text-[10px] text-slate-400">{s.customerName || 'Walk-in'}</p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-xs font-black text-slate-900">₹{s.finalAmount || 0}</p>
                              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">
                                {s.paymentStatus || 'Paid'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {searchResults.total === 0 && (
                      <div className="py-6 text-center">
                        <p className="text-xs font-bold text-slate-400">No matches found for "{searchQuery}"</p>
                      </div>
                    )}
                  </div>
                )}

                {!searchQuery.trim() && (
                  <div className="pt-2 px-1 text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Type at least 2 characters to search</span>
                    <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">Ctrl+K</span>
                  </div>
                )}
              </div>
            )}
          </div>
          {/* Notifications Popover */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-100 hover:bg-slate-200/80 active:scale-95 flex items-center justify-center text-slate-700 hover:text-slate-900 transition-all border border-slate-200/80 relative shrink-0 shadow-2xs"
              title="Notifications"
            >
              <Bell size={17} strokeWidth={2.2} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] bg-[#fe569f] text-white text-[9.5px] font-black rounded-full flex items-center justify-center px-1 border-2 border-white shadow-xs animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {isNotificationsOpen && (
              <div className="fixed md:absolute left-3 md:left-auto right-3 md:right-0 top-16 md:top-full mt-2 w-auto md:w-80 bg-white rounded-2xl border border-slate-200 shadow-dropdown overflow-hidden z-50 text-slate-900 animate-in zoom-in-95 fade-in duration-150">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
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

          {/* User Profile Capsule Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 p-1 sm:pr-3 rounded-full bg-slate-100 hover:bg-slate-200/80 active:scale-95 text-slate-800 transition-all border border-slate-200/80 shadow-2xs shrink-0 group"
              title={currentUser?.name || 'Account'}
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#01a9fb] text-white flex items-center justify-center font-black text-xs sm:text-sm shadow-xs shrink-0">
                {(currentUser?.name || 'K').charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-extrabold text-slate-900 leading-none truncate max-w-[100px]">
                  {currentUser?.name || 'User'}
                </span>
                <span className="text-[8.5px] font-bold text-[#01a9fb] leading-none mt-0.5 uppercase tracking-wider">
                  {currentUser?.role || 'Staff'}
                </span>
              </div>
              <ChevronDown size={12} className="hidden sm:block text-slate-400 group-hover:text-slate-700 transition-colors" />
            </button>

            {isUserMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl border border-slate-200 shadow-dropdown py-2 z-50 text-slate-900 animate-in zoom-in-95 fade-in duration-150">
                <div className="px-4 py-3 border-b border-slate-100 mb-1 bg-slate-50/80">
                  <p className="text-xs font-black text-slate-900">{currentUser?.name}</p>
                  <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">{currentUser?.email}</p>
                  <span className="inline-block mt-1 bg-[#01a9fb]/10 text-[#01a9fb] border border-[#01a9fb]/30 text-[8px] font-extrabold uppercase px-2 py-0.5 rounded-full">
                    {currentUser?.role}
                  </span>
                </div>
                {currentUser?.role === UserRole.ADMIN && (
                  <button
                    type="button"
                    onClick={() => { onTabChange('settings'); setIsUserMenuOpen(false); }}
                    className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-[#01a9fb] transition-colors flex items-center gap-2"
                  >
                    <SettingsIcon size={14} />
                    <span>Settings</span>
                  </button>
                )}
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

  const visibleNavItems = bottomNavItems.filter(item => {
    if (item.id === 'more') {
      if (currentUser?.role === UserRole.ADMIN) return true;
      return ['customers', 'suppliers', 'reports'].some(p => currentUser?.permissions?.includes(p));
    }
    return canAccess(currentUser, item.id);
  });

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/90 flex justify-around items-center h-[60px] z-40 pb-safe shadow-lg">
      {visibleNavItems.map(item => {
        const isActive = item.id === 'more'
          ? secondaryTabs.includes(activeTab)
          : activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`flex flex-col items-center justify-center w-full h-full gap-0.5 transition-all active:scale-90 ${isActive ? 'text-[#01a9fb]' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <div className={`p-1 rounded-xl transition-colors ${isActive ? 'bg-[#01a9fb]/10' : ''}`}>
              {React.cloneElement(item.icon as React.ReactElement<any>, { size: 19, strokeWidth: isActive ? 2.5 : 1.8 })}
            </div>
            <span className={`text-[10px] ${isActive ? 'font-black text-[#01a9fb]' : 'font-semibold'}`}>{item.label}</span>
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

const AppLaunchSplash: React.FC<{ isVisible: boolean }> = ({ isVisible }) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="app-launch-splash-screen"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-white select-none pointer-events-none"
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center gap-6 px-4"
          >
            <motion.img
              src="/icon.png"
              alt="Kiddies Logo"
              className="h-24 sm:h-28 w-auto max-w-[65vw] object-contain drop-shadow-xl"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
            />
            <div className="flex flex-col items-center gap-1.5 text-center">
              <span className="text-sm sm:text-base font-black uppercase tracking-[0.14em] text-slate-900">
                Stock & Rentals
              </span>
              <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#01a9fb]">
                Management Suite
              </span>
            </div>
            <div className="w-36 h-1 bg-slate-100 rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-gradient-to-r from-[#01a9fb] via-[#fe569f] to-[#FACC15] rounded-full"
                style={{ animation: 'brandProgressBar 1.6s ease-in-out infinite' }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const AppContent: React.FC = () => {
  const { currentUser, isAuthReady, isPasswordRecovery } = useApp();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLaunchSplashVisible, setIsLaunchSplashVisible] = useState(true);

  // Guarantee launch splash displays for 1.2s on app boot
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLaunchSplashVisible(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  const showSplash = !isAuthReady || isLaunchSplashVisible;

  // List of authorized modules for the current user
  const allowedTabs = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === UserRole.ADMIN) {
      return NAVIGATION_ITEMS.map(i => i.id);
    }
    return NAVIGATION_ITEMS
      .map(i => i.id)
      .filter(id => id !== 'users' && id !== 'settings' && currentUser.permissions?.includes(id));
  }, [currentUser]);

  // If user logs in and cannot access the initial activeTab, switch to their first permitted page
  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.role !== UserRole.ADMIN) {
      if (!canAccess(currentUser, activeTab) && activeTab !== 'more') {
        const fallback = allowedTabs[0] || 'sales';
        setActiveTab(fallback);
      }
    }
  }, [currentUser, allowedTabs]);

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

  if (isPasswordRecovery) {
    return (
      <>
        <AppLaunchSplash isVisible={showSplash} />
        <ResetPasswordScreen />
      </>
    );
  }

  if (!currentUser) {
    return (
      <>
        <AppLaunchSplash isVisible={showSplash} />
        <Login />
      </>
    );
  }

  const renderContent = () => {
    // Strict route-level permission check: if staff tries to view a restricted module, render AccessRestrictedView
    if (activeTab !== 'more' && !canAccess(currentUser, activeTab)) {
      return (
        <AccessRestrictedView
          tabId={activeTab}
          user={currentUser}
          allowedTabs={allowedTabs}
          onNavigate={(tab) => setActiveTab(tab)}
        />
      );
    }

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
        default: return <Dashboard onTabChange={setActiveTab} />;
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
    <>
      <AppLaunchSplash isVisible={showSplash} />
      <div className="flex flex-col h-screen bg-gray-50 font-sans text-gray-900 overflow-hidden">
        {/* Full-Width Clean Light Header (100% viewport width) */}
        <TopBar activeTab={activeTab} onTabChange={setActiveTab} />
      
      {/* Body Area: Sidebar + Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="flex-1 overflow-y-auto px-3 sm:px-6 pt-3 sm:pt-4 pb-24 md:pb-6 custom-scrollbar relative">
          {renderContent()}
        </main>
      </div>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  </>
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
