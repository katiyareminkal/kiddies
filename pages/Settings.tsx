import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../store/AppContext';
import { Card, Button } from '../components/Shared';
import {
  Store,
  Settings as SettingsIcon,
  Database,
  Save,
  Download,
  Upload,
  Trash2,
  AlertTriangle,
  CheckCircle,
  FileText,
  Image,
  CreditCard,
  Hash,
  FileSpreadsheet,
  MonitorSmartphone,
  Smartphone,
  Shield,
  Sparkles,
  Sliders,
  CheckCircle2,
  AlertOctagon,
  Package,
  ShoppingCart,
  Calendar,
  Users,
  Truck,
  Receipt,
  Bell,
  RotateCcw,
  X,
  Loader2,
  CheckSquare,
  Square,
  ShieldCheck,
  Check,
  Cloud,
  RefreshCw,
  Link,
  ExternalLink,
  Copy,
  Activity,
  Server
} from 'lucide-react';
import { exportToExcel } from '../utils/excelBackup';
import {
  testSupabaseConnection,
  getSupabaseConfig,
  setSupabaseCredentials,
  clearSupabaseCredentials,
  SupabaseConnectionStatus,
  TableProbeResult,
  isSupabaseConfigured
} from '../supabase';

const Settings: React.FC = () => {
  const {
    currentUser,
    storeProfile,
    settings,
    updateStoreProfile,
    updateSettings,
    importData,
    resetData,
    products,
    sales,
    customers,
    suppliers,
    rentals,
    stockLogs,
    supplierBills,
    expenses,
    creditNotes,
    notifications,
    syncAllOfflineDataToSupabase,
    refreshData
  } = useApp();
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'data' | 'cloud'>('profile');
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Supabase Diagnostics & Cloud Persistence State
  const [connectionStatus, setConnectionStatus] = useState<SupabaseConnectionStatus | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isSyncingToCloud, setIsSyncingToCloud] = useState(false);
  const [syncSummary, setSyncSummary] = useState<{ success: boolean; message: string; syncedCounts?: Record<string, number> } | null>(null);
  const [customSupabaseUrl, setCustomSupabaseUrl] = useState(() => {
    return localStorage.getItem('kiddies_supabase_url') || getSupabaseConfig().url || '';
  });
  const [customSupabaseKey, setCustomSupabaseKey] = useState(() => {
    return localStorage.getItem('kiddies_supabase_anon_key') || '';
  });
  const [isEditingCredentials, setIsEditingCredentials] = useState(false);
  const [isCopiedSql, setIsCopiedSql] = useState(false);

  // Logo Upload State
  const [logoPreview, setLogoPreview] = useState<string | null>(storeProfile.logo || null);
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (storeProfile.logo && !selectedLogoFile) {
      setLogoPreview(storeProfile.logo);
    }
  }, [storeProfile.logo, selectedLogoFile]);

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);

  // Granular Reset States
  const [selectiveCategories, setSelectiveCategories] = useState<{
    products: boolean;
    sales: boolean;
    rentals: boolean;
    customers: boolean;
    suppliers: boolean;
    expenses: boolean;
    notifications: boolean;
  }>({
    products: false,
    sales: false,
    rentals: false,
    customers: false,
    suppliers: false,
    expenses: false,
    notifications: false,
  });

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    isFull: boolean;
    title: string;
    description: string;
    recordBreakdown: { label: string; count: number }[];
  }>({
    isOpen: false,
    isFull: false,
    title: '',
    description: '',
    recordBreakdown: [],
  });

  const [confirmationInput, setConfirmationInput] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccessModal, setResetSuccessModal] = useState<{
    isOpen: boolean;
    message: string;
    summary: string[];
  } | null>(null);

  const toggleCategory = (key: keyof typeof selectiveCategories) => {
    setSelectiveCategories(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSelectAll = () => {
    setSelectiveCategories({
      products: true,
      sales: true,
      rentals: true,
      customers: true,
      suppliers: true,
      expenses: true,
      notifications: true,
    });
  };

  const handleDeselectAll = () => {
    setSelectiveCategories({
      products: false,
      sales: false,
      rentals: false,
      customers: false,
      suppliers: false,
      expenses: false,
      notifications: false,
    });
  };

  const selectedCategoriesCount = Object.values(selectiveCategories).filter(Boolean).length;

  const handleTriggerSelectiveReset = () => {
    if (selectedCategoriesCount === 0) {
      showNotification('Please select at least one data category to delete.', 'error');
      return;
    }

    const breakdown: { label: string; count: number }[] = [];
    if (selectiveCategories.products) {
      breakdown.push({ label: 'Products & Inventory', count: products?.length || 0 });
      breakdown.push({ label: 'Stock Movement Logs', count: stockLogs?.length || 0 });
    }
    if (selectiveCategories.sales) {
      breakdown.push({ label: 'Sales & Invoices', count: sales?.length || 0 });
    }
    if (selectiveCategories.rentals) {
      breakdown.push({ label: 'Rentals & Bookings', count: rentals?.length || 0 });
    }
    if (selectiveCategories.customers) {
      breakdown.push({ label: 'Customers', count: customers?.length || 0 });
      breakdown.push({ label: 'Credit Notes', count: creditNotes?.length || 0 });
    }
    if (selectiveCategories.suppliers) {
      breakdown.push({ label: 'Suppliers', count: suppliers?.length || 0 });
      breakdown.push({ label: 'Supplier Bills', count: supplierBills?.length || 0 });
    }
    if (selectiveCategories.expenses) {
      breakdown.push({ label: 'Store Expenses', count: expenses?.length || 0 });
    }
    if (selectiveCategories.notifications) {
      breakdown.push({ label: 'System Notifications', count: notifications?.length || 0 });
    }

    setConfirmationInput('');
    setConfirmModal({
      isOpen: true,
      isFull: false,
      title: 'Confirm Selective Data Delete',
      description: 'You have chosen to purge specific tables from the database. All unselected tables and all user accounts will remain completely safe.',
      recordBreakdown: breakdown,
    });
  };

  const handleTriggerFullReset = () => {
    const breakdown = [
      { label: 'Products & Inventory', count: products?.length || 0 },
      { label: 'Stock Movement Logs', count: stockLogs?.length || 0 },
      { label: 'Sales & Invoices', count: sales?.length || 0 },
      { label: 'Rentals & Bookings', count: rentals?.length || 0 },
      { label: 'Customers & CRM', count: customers?.length || 0 },
      { label: 'Store Credit Notes', count: creditNotes?.length || 0 },
      { label: 'Suppliers & Directory', count: suppliers?.length || 0 },
      { label: 'Supplier Bills & Line Items', count: supplierBills?.length || 0 },
      { label: 'Store Expenses', count: expenses?.length || 0 },
      { label: 'System Notifications & Alerts', count: notifications?.length || 0 },
    ];

    setConfirmationInput('');
    setConfirmModal({
      isOpen: true,
      isFull: true,
      title: 'Full Database Reset (Keep Users)',
      description: 'This will permanently wipe ALL store tables, transactions, inventory, customers, suppliers, bills, expenses, and logs. User profiles, accounts, and credentials will be preserved.',
      recordBreakdown: breakdown,
    });
  };

  const handleExecuteReset = async () => {
    setIsResetting(true);
    try {
      const result = await resetData(
        confirmModal.isFull
          ? { full: true }
          : {
              full: false,
              categories: {
                products: selectiveCategories.products,
                sales: selectiveCategories.sales,
                rentals: selectiveCategories.rentals,
                customers: selectiveCategories.customers,
                suppliers: selectiveCategories.suppliers,
                expenses: selectiveCategories.expenses,
                notifications: selectiveCategories.notifications,
              },
            }
      );

      if (result.success) {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        const summaryList: string[] = [];
        if (confirmModal.isFull) {
          summaryList.push('All store tables wiped clean');
          summaryList.push('Offline cache and local sync cleared');
          summaryList.push('All User Accounts & Profiles PRESERVED');
        } else {
          if (selectiveCategories.products) summaryList.push('Products & Stock Logs purged');
          if (selectiveCategories.sales) summaryList.push('Sales & Invoices purged');
          if (selectiveCategories.rentals) summaryList.push('Rentals purged');
          if (selectiveCategories.customers) summaryList.push('Customers & Credit Notes purged');
          if (selectiveCategories.suppliers) summaryList.push('Suppliers & Bills purged');
          if (selectiveCategories.expenses) summaryList.push('Expenses purged');
          if (selectiveCategories.notifications) summaryList.push('Notifications purged');
          summaryList.push('User Accounts & Unselected Tables PRESERVED');
        }

        setResetSuccessModal({
          isOpen: true,
          message: result.message,
          summary: summaryList,
        });
        showNotification(result.message, 'success');
        handleDeselectAll();
      } else {
        showNotification(result.message || 'Failed to complete reset', 'error');
      }
    } catch (err: any) {
      console.error('Reset execution failed:', err);
      showNotification(err?.message || 'Error occurred during reset.', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      if (file.size > 5 * 1024 * 1024) {
        alert(`Logo file too large: ${(file.size / (1024 * 1024)).toFixed(2)}MB. Please select a file smaller than 5MB.`);
        if (logoInputRef.current) logoInputRef.current.value = '';
        return;
      }

      setSelectedLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleProfileSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      const formData = new FormData(e.currentTarget);
      await updateStoreProfile({
        storeName: formData.get('storeName') as string,
        email: formData.get('email') as string,
        phone: formData.get('phone') as string,
        address: formData.get('address') as string,
        gstin: formData.get('gstin') as string,
        website: formData.get('website') as string,
      }, selectedLogoFile || undefined);
      showNotification('Store profile updated successfully!', 'success');
    } catch (err: any) {
      console.error(err);
      showNotification(err?.message || 'Failed to update store profile', 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePreferencesSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSavingPreferences(true);
    try {
      const formData = new FormData(e.currentTarget);
      await updateSettings({
        defaultTaxRate: Number(formData.get('defaultTaxRate')),
        lowStockThreshold: Number(formData.get('lowStockThreshold')),
        enableLowStockAlerts: formData.get('enableLowStockAlerts') === 'on',
        salesInvoicePrefix: formData.get('salesInvoicePrefix') as string,
        rentalInvoicePrefix: formData.get('rentalInvoicePrefix') as string,
        enableDeleteInventory: formData.get('enableDeleteInventory') === 'on',
        enableDeleteCustomers: formData.get('enableDeleteCustomers') === 'on',
        enableDeleteTransactions: formData.get('enableDeleteTransactions') === 'on',
        enableDeleteRentals: formData.get('enableDeleteRentals') === 'on',
        enableDeleteSuppliers: formData.get('enableDeleteSuppliers') === 'on',
        enableDeleteUsers: formData.get('enableDeleteUsers') === 'on',
      });
      showNotification('System preferences saved successfully!', 'success');
    } catch (err: any) {
      console.error(err);
      showNotification(err?.message || 'Failed to save system preferences', 'error');
    } finally {
      setIsSavingPreferences(false);
    }
  };

  const handleExportData = () => {
    try {
      const dataStr = JSON.stringify({
        storeProfile,
        settings,
        products: products || [],
        sales: sales || [],
        customers: customers || [],
        suppliers: suppliers || [],
        rentals: rentals || [],
        stockLogs: stockLogs || []
      }, null, 2);

      const blob = new Blob([dataStr], { type: 'application/json;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const fileName = `kiddies_backup_${new Date().toISOString().slice(0, 10)}.json`;

      const linkElement = document.createElement('a');
      linkElement.href = url;
      linkElement.download = fileName;
      document.body.appendChild(linkElement);
      linkElement.click();

      setTimeout(() => {
        document.body.removeChild(linkElement);
        window.URL.revokeObjectURL(url);
      }, 100);

      showNotification('JSON backup file downloaded.', 'success');
    } catch (err) {
      console.error("Export JSON failed:", err);
      showNotification('Failed to generate JSON backup.', 'error');
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        if (event.target?.result) {
          const success = importData(event.target.result as string);
          if (success) {
            showNotification('Data restored successfully!', 'success');
          } else {
            showNotification('Invalid backup file.', 'error');
          }
        }
      };
    }
  };

  const runConnectionTest = async () => {
    setIsTestingConnection(true);
    try {
      const status = await testSupabaseConnection();
      setConnectionStatus(status);
    } catch (e: any) {
      showNotification('Failed to test connection: ' + e?.message, 'error');
    } finally {
      setIsTestingConnection(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'cloud') {
      runConnectionTest();
    }
  }, [activeTab]);

  const handleSyncOfflineData = async () => {
    setIsSyncingToCloud(true);
    setSyncSummary(null);
    try {
      const res = await syncAllOfflineDataToSupabase();
      setSyncSummary(res);
      if (res.success) {
        showNotification(res.message, 'success');
        await runConnectionTest();
      } else {
        showNotification(res.message, 'error');
      }
    } catch (err: any) {
      showNotification('Sync failed: ' + (err?.message || 'Unknown error'), 'error');
    } finally {
      setIsSyncingToCloud(false);
    }
  };

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customSupabaseUrl.trim()) {
      showNotification('Please enter a valid Supabase project URL.', 'error');
      return;
    }
    setSupabaseCredentials(customSupabaseUrl.trim(), customSupabaseKey.trim());
    showNotification('Supabase credentials saved. Testing connectivity...', 'success');
    setIsEditingCredentials(false);
    await runConnectionTest();
    await refreshData();
  };

  const handleClearCredentials = async () => {
    clearSupabaseCredentials();
    setCustomSupabaseUrl('');
    setCustomSupabaseKey('');
    setIsEditingCredentials(false);
    showNotification('Credentials reset. App running in offline local mode.', 'success');
    await runConnectionTest();
  };

  const handleCopySql = () => {
    const sql = `-- Quick fix for public read/write access:
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on products" ON public.products FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on customers" ON public.customers FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on sales" ON public.sales FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on sale_items" ON public.sale_items FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE public.rentals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on rentals" ON public.rentals FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on suppliers" ON public.suppliers FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE public.supplier_bills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on supplier_bills" ON public.supplier_bills FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on expenses" ON public.expenses FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE public.credit_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on credit_notes" ON public.credit_notes FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE public.stock_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on stock_logs" ON public.stock_logs FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE public.store_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on store_profile" ON public.store_profile FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on settings" ON public.settings FOR ALL USING (true) WITH CHECK (true);`;

    navigator.clipboard.writeText(sql);
    setIsCopiedSql(true);
    setTimeout(() => setIsCopiedSql(false), 2500);
    showNotification('RLS bypass SQL copied to clipboard!', 'success');
  };

  const tabs = [
    { id: 'profile', label: 'Store Profile', icon: <Store size={16} /> },
    { id: 'preferences', label: 'App Preferences', icon: <Sliders size={16} /> },
    { id: 'data', label: 'Data Management', icon: <Database size={16} /> },
    { id: 'cloud', label: 'Supabase Cloud & Sync', icon: <Cloud size={16} /> },
  ];

  return (
    <div className="space-y-5 animate-nano pb-20 max-w-[1600px] mx-auto">
      {/* ── Executive Header ── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#01a9fb] text-white flex items-center justify-center shadow-xs shrink-0">
            <SettingsIcon size={20} strokeWidth={2.2} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">System Settings</h1>
              <span className="text-[10px] font-extrabold text-[#01a9fb] bg-[#01a9fb]/10 border border-[#01a9fb]/30 px-2 py-0.5 rounded-lg">
                Configuration Console
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Customize business identity, tax calculations, invoice rules, and database snapshots</p>
          </div>
        </div>
      </div>

      {/* Notification Toast with green right tick and round border, transparent look */}
      {notification && (
        <div className="fixed bottom-20 md:bottom-10 right-6 px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 animate-nano z-50 bg-slate-900/95 backdrop-blur-sm text-white border border-slate-700">
          {notification.type === 'success' ? (
            <div className="w-5 h-5 rounded-full border-2 border-emerald-500 flex items-center justify-center shrink-0 bg-transparent">
              <CheckCircle2 size={13} className="text-emerald-400 stroke-[2.5]" />
            </div>
          ) : (
            <div className="w-5 h-5 rounded-full border-2 border-rose-500 flex items-center justify-center shrink-0 bg-transparent">
              <AlertTriangle size={13} className="text-rose-400 stroke-[2.5]" />
            </div>
          )}
          <span className="font-black text-xs tracking-wide">{notification.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Sidebar Navigation */}
        <div className="md:col-span-3">
          <div className="bg-white rounded-2xl border border-slate-200/90 p-2.5 shadow-card sticky top-20">
            <nav className="space-y-1.5">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full flex items-center gap-2.5 px-4 py-3 text-xs font-black rounded-xl transition-all ${activeTab === tab.id
                    ? 'bg-[#01a9fb] text-white shadow-xs'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content Area */}
        <div className="md:col-span-9 space-y-5">
          {/* Store Profile Tab */}
          {activeTab === 'profile' && (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-card">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-[#01a9fb]/10 text-[#01a9fb] border border-[#01a9fb]/30 flex items-center justify-center shadow-2xs">
                  <Store size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Store Profile</h3>
                  <p className="text-xs text-slate-400 font-medium">Business identity displayed on customer invoices & tags</p>
                </div>
              </div>

              <form
                key={`profile-${storeProfile.storeName}-${storeProfile.phone}-${storeProfile.email}-${storeProfile.address}-${storeProfile.gstin}`}
                onSubmit={handleProfileSubmit}
                className="space-y-4"
              >
                <div className="flex flex-col sm:flex-row items-center gap-4 mb-4">
                  <div
                    onClick={() => logoInputRef.current?.click()}
                    className="w-24 h-24 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 gap-1 cursor-pointer hover:border-[#01a9fb] hover:text-[#01a9fb] transition-all overflow-hidden shrink-0 shadow-2xs"
                  >
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-1" />
                    ) : (
                      <>
                        <Image size={20} />
                        <span className="text-[9px] font-black uppercase text-center">Upload Logo</span>
                      </>
                    )}
                    <input
                      type="file"
                      ref={logoInputRef}
                      onChange={handleLogoChange}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>

                  <div className="flex-1 w-full space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Store Brand Name *</label>
                    <input name="storeName" defaultValue={storeProfile.storeName} required className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200/90 focus:bg-white focus:border-[#01a9fb] rounded-xl outline-none font-black text-sm text-slate-900 transition-all shadow-2xs" placeholder="Kiddies Store" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Official Phone *</label>
                    <input name="phone" defaultValue={storeProfile.phone} required className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200/90 focus:bg-white focus:border-[#01a9fb] rounded-xl outline-none font-bold text-xs text-slate-900 transition-all shadow-2xs" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Official Email *</label>
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
                        <CheckCircle2 size={10} /> Verified Active
                      </span>
                    </div>
                    <input
                      name="email"
                      defaultValue={currentUser?.email || storeProfile.email}
                      required
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200/90 focus:bg-white focus:border-[#01a9fb] rounded-xl outline-none font-bold text-xs text-slate-900 transition-all shadow-2xs"
                    />
                    <p className="text-[10px] text-slate-400">Defaults to your active logged-in email. Updating will send a verification link to your new inbox.</p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">GSTIN / Tax Registration</label>
                    <input name="gstin" defaultValue={storeProfile.gstin} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200/90 focus:bg-white focus:border-[#01a9fb] rounded-xl outline-none font-mono font-bold text-xs text-slate-900 transition-all shadow-2xs" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Website URL</label>
                    <input name="website" defaultValue={storeProfile.website} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200/90 focus:bg-white focus:border-[#01a9fb] rounded-xl outline-none font-bold text-xs text-slate-900 transition-all shadow-2xs" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Physical Store Address</label>
                  <textarea name="address" defaultValue={storeProfile.address} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200/90 focus:bg-white focus:border-[#01a9fb] rounded-xl outline-none font-bold text-xs text-slate-900 h-20 resize-none transition-all shadow-2xs"></textarea>
                </div>

                <div className="pt-4 flex justify-end border-t border-slate-100">
                  <button type="submit" disabled={isSavingProfile} className="px-5 py-2.5 bg-[#01a9fb] hover:bg-[#0098e6] text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xs disabled:opacity-75 disabled:cursor-not-allowed active:scale-95 transition-all">
                    <Save size={14} />
                    <span>{isSavingProfile ? 'Saving....' : 'Save Store Profile'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-card">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-[#01a9fb]/10 text-[#01a9fb] border border-[#01a9fb]/30 flex items-center justify-center shadow-2xs">
                  <Sliders size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">System Preferences</h3>
                  <p className="text-xs text-slate-400 font-medium">Invoicing prefixes, default tax rates, and safety deletion permissions</p>
                </div>
              </div>

              <form onSubmit={handlePreferencesSubmit} className="space-y-5">
                {/* Invoicing Prefixes */}
                <div className="space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">Invoice Prefixes & Tax</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Sales Invoice Prefix</label>
                      <input name="salesInvoicePrefix" defaultValue={settings.salesInvoicePrefix} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/90 focus:bg-white focus:border-[#01a9fb] rounded-xl font-mono font-bold text-xs text-slate-900 uppercase shadow-2xs transition-all" placeholder="INV-" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Rental Invoice Prefix</label>
                      <input name="rentalInvoicePrefix" defaultValue={settings.rentalInvoicePrefix} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/90 focus:bg-white focus:border-[#01a9fb] rounded-xl font-mono font-bold text-xs text-slate-900 uppercase shadow-2xs transition-all" placeholder="RNT-" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Default Tax Rate (%)</label>
                      <input type="number" name="defaultTaxRate" defaultValue={settings.defaultTaxRate} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/90 focus:bg-white focus:border-[#01a9fb] rounded-xl font-bold text-xs text-slate-900 shadow-2xs transition-all" />
                    </div>
                  </div>
                </div>

                {/* Stock Warnings */}
                <div className="space-y-2 pt-3 border-t border-slate-100">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">Stock Alert Level</h4>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/90 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black text-slate-900">Global Low Stock Threshold</p>
                      <p className="text-[10px] text-slate-400">Trigger warnings on dashboard when stock dips below</p>
                    </div>
                    <input type="number" name="lowStockThreshold" defaultValue={settings.lowStockThreshold} className="w-20 px-3 py-2 bg-white border border-slate-200/90 focus:border-[#01a9fb] rounded-xl font-black text-xs text-slate-900 text-center shadow-2xs" />
                  </div>
                </div>

                {/* Deletion Permission Toggles */}
                <div className="space-y-2 pt-3 border-t border-slate-100">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">Deletion Safety Permissions</h4>
                  <p className="text-[10px] text-slate-400 mb-2">Enable or restrict trash bin actions for system records</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { key: 'enableDeleteInventory', label: 'Allow Deleting Inventory SKUs', desc: 'Permanent catalog deletion' },
                      { key: 'enableDeleteTransactions', label: 'Allow Deleting Sales Records', desc: 'Permanent invoice deletion' },
                      { key: 'enableDeleteRentals', label: 'Allow Deleting Rental Bookings', desc: 'Permanent lease deletion' },
                      { key: 'enableDeleteCustomers', label: 'Allow Deleting Customer CRM Profiles', desc: 'Permanent profile deletion' },
                      { key: 'enableDeleteSuppliers', label: 'Allow Deleting Supplier Records', desc: 'Permanent vendor deletion' },
                      { key: 'enableDeleteUsers', label: 'Allow Deleting Staff User Accounts', desc: 'Permanent access revoke' },
                    ].map(item => (
                      <label key={item.key} className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/90 cursor-pointer hover:bg-slate-100 transition-colors shadow-2xs">
                        <div>
                          <p className="text-xs font-black text-slate-900">{item.label}</p>
                          <p className="text-[10px] text-slate-400">{item.desc}</p>
                        </div>
                        <input
                          type="checkbox"
                          name={item.key}
                          defaultChecked={(settings as any)[item.key]}
                          className="rounded-lg border-slate-300 text-[#01a9fb] focus:ring-[#01a9fb] w-4 h-4 cursor-pointer"
                        />
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-4 flex justify-end border-t border-slate-100">
                  <button type="submit" disabled={isSavingPreferences} className="px-5 py-2.5 bg-[#01a9fb] hover:bg-[#0098e6] text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xs disabled:opacity-75 disabled:cursor-not-allowed active:scale-95 transition-all">
                    <Save size={14} />
                    <span>{isSavingPreferences ? 'Saving....' : 'Save System Preferences'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Data Management Tab */}
          {activeTab === 'data' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-card">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-700 border border-slate-200 flex items-center justify-center shadow-2xs">
                    <Database size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">Backup & Restore Engine</h3>
                    <p className="text-xs text-slate-400 font-medium">Export full table spreadsheets or raw snapshot backups</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/70 flex flex-col justify-between shadow-2xs">
                    <div>
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 shadow-2xs">
                        <Download size={16} />
                      </div>
                      <h4 className="font-black text-xs text-slate-900">Export JSON Snapshot</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5 mb-3">Raw full-fidelity state file</p>
                    </div>
                    <button onClick={handleExportData} className="w-full py-2.5 bg-white hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 rounded-xl text-xs font-black transition-all shadow-2xs active:scale-95">
                      Download JSON
                    </button>
                  </div>

                  <div className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/70 flex flex-col justify-between shadow-2xs">
                    <div>
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 shadow-2xs">
                        <FileSpreadsheet size={16} />
                      </div>
                      <h4 className="font-black text-xs text-slate-900">Export Excel Sheets</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5 mb-3">Multi-sheet .xlsx workbook</p>
                    </div>
                    <button
                      onClick={() => {
                        exportToExcel({ products, sales, rentals, customers, suppliers, stockLogs });
                        showNotification('Excel backup downloaded.', 'success');
                      }}
                      className="w-full py-2.5 bg-white hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 rounded-xl text-xs font-black transition-all shadow-2xs active:scale-95"
                    >
                      Download Excel
                    </button>
                  </div>

                  <div className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/70 flex flex-col justify-between shadow-2xs">
                    <div>
                      <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center mb-3 shadow-2xs">
                        <Upload size={16} />
                      </div>
                      <h4 className="font-black text-xs text-slate-900">Restore Backup</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5 mb-3">Import JSON data snapshot</p>
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept=".json"
                      onChange={handleFileChange}
                    />
                    <button onClick={handleImportClick} className="w-full py-2.5 bg-white hover:bg-violet-50 hover:text-violet-700 border border-slate-200 rounded-xl text-xs font-black transition-all shadow-2xs active:scale-95">
                      Import Backup
                    </button>
                  </div>
                </div>
              </div>

              {/* Database Reset & Cleanup Center */}
              <div className="space-y-4">
                {/* 1. Selective Table Purge */}
                <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-card">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shadow-2xs shrink-0">
                        <Trash2 size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-black text-slate-900">Selective Table Purge</h3>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-wider">
                            Granular Control
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-medium">Selectively wipe specific database tables without affecting the rest of your store.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={handleSelectAll}
                        className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={handleDeselectAll}
                        className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg transition-all"
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>

                  {/* Category Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Products */}
                    <div
                      onClick={() => toggleCategory('products')}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                        selectiveCategories.products
                          ? 'bg-amber-50/50 border-amber-300 ring-1 ring-amber-300 shadow-2xs'
                          : 'bg-slate-50/60 border-slate-200/90 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                          <Package size={16} />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-slate-900">Products & Inventory</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100/70 text-emerald-800">
                              {products?.length || 0} Items
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 font-medium">Catalog items, barcodes, and {stockLogs?.length || 0} stock movement audit logs</p>
                        </div>
                      </div>
                      <div className="shrink-0 mt-1">
                        {selectiveCategories.products ? (
                          <CheckSquare className="text-amber-600" size={18} />
                        ) : (
                          <Square className="text-slate-300" size={18} />
                        )}
                      </div>
                    </div>

                    {/* Sales */}
                    <div
                      onClick={() => toggleCategory('sales')}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                        selectiveCategories.sales
                          ? 'bg-amber-50/50 border-amber-300 ring-1 ring-amber-300 shadow-2xs'
                          : 'bg-slate-50/60 border-slate-200/90 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                          <ShoppingCart size={16} />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-slate-900">Sales & Invoices</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100/70 text-blue-800">
                              {sales?.length || 0} Sales
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 font-medium">In-store & channel orders, invoice line items, and transaction logs</p>
                        </div>
                      </div>
                      <div className="shrink-0 mt-1">
                        {selectiveCategories.sales ? (
                          <CheckSquare className="text-amber-600" size={18} />
                        ) : (
                          <Square className="text-slate-300" size={18} />
                        )}
                      </div>
                    </div>

                    {/* Rentals */}
                    <div
                      onClick={() => toggleCategory('rentals')}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                        selectiveCategories.rentals
                          ? 'bg-amber-50/50 border-amber-300 ring-1 ring-amber-300 shadow-2xs'
                          : 'bg-slate-50/60 border-slate-200/90 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0 mt-0.5">
                          <Calendar size={16} />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-slate-900">Rentals & Bookings</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100/70 text-purple-800">
                              {rentals?.length || 0} Rentals
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 font-medium">Active & returned rental contracts, deposits, and offline rental caches</p>
                        </div>
                      </div>
                      <div className="shrink-0 mt-1">
                        {selectiveCategories.rentals ? (
                          <CheckSquare className="text-amber-600" size={18} />
                        ) : (
                          <Square className="text-slate-300" size={18} />
                        )}
                      </div>
                    </div>

                    {/* Customers */}
                    <div
                      onClick={() => toggleCategory('customers')}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                        selectiveCategories.customers
                          ? 'bg-amber-50/50 border-amber-300 ring-1 ring-amber-300 shadow-2xs'
                          : 'bg-slate-50/60 border-slate-200/90 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                          <Users size={16} />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-slate-900">Customers & Credit Notes</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100/70 text-amber-800">
                              {customers?.length || 0} Customers
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 font-medium">Customer CRM directory and {creditNotes?.length || 0} store credit balance notes</p>
                        </div>
                      </div>
                      <div className="shrink-0 mt-1">
                        {selectiveCategories.customers ? (
                          <CheckSquare className="text-amber-600" size={18} />
                        ) : (
                          <Square className="text-slate-300" size={18} />
                        )}
                      </div>
                    </div>

                    {/* Suppliers */}
                    <div
                      onClick={() => toggleCategory('suppliers')}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                        selectiveCategories.suppliers
                          ? 'bg-amber-50/50 border-amber-300 ring-1 ring-amber-300 shadow-2xs'
                          : 'bg-slate-50/60 border-slate-200/90 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 border border-teal-100 flex items-center justify-center shrink-0 mt-0.5">
                          <Truck size={16} />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-slate-900">Suppliers & Purchase Bills</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-100/70 text-teal-800">
                              {suppliers?.length || 0} Suppliers
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 font-medium">Vendor contacts, purchase orders, and {supplierBills?.length || 0} purchase bills</p>
                        </div>
                      </div>
                      <div className="shrink-0 mt-1">
                        {selectiveCategories.suppliers ? (
                          <CheckSquare className="text-amber-600" size={18} />
                        ) : (
                          <Square className="text-slate-300" size={18} />
                        )}
                      </div>
                    </div>

                    {/* Expenses */}
                    <div
                      onClick={() => toggleCategory('expenses')}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                        selectiveCategories.expenses
                          ? 'bg-amber-50/50 border-amber-300 ring-1 ring-amber-300 shadow-2xs'
                          : 'bg-slate-50/60 border-slate-200/90 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0 mt-0.5">
                          <Receipt size={16} />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-slate-900">Store Expenses</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100/70 text-rose-800">
                              {expenses?.length || 0} Expenses
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 font-medium">Daily operational store expenses and cash outflow records</p>
                        </div>
                      </div>
                      <div className="shrink-0 mt-1">
                        {selectiveCategories.expenses ? (
                          <CheckSquare className="text-amber-600" size={18} />
                        ) : (
                          <Square className="text-slate-300" size={18} />
                        )}
                      </div>
                    </div>

                    {/* Notifications */}
                    <div
                      onClick={() => toggleCategory('notifications')}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 md:col-span-2 ${
                        selectiveCategories.notifications
                          ? 'bg-amber-50/50 border-amber-300 ring-1 ring-amber-300 shadow-2xs'
                          : 'bg-slate-50/60 border-slate-200/90 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 border border-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                          <Bell size={16} />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-slate-900">System Notifications & Alerts</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-800">
                              {notifications?.length || 0} Alerts
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 font-medium">Low stock alerts, system notifications, and historical activity alerts</p>
                        </div>
                      </div>
                      <div className="shrink-0 mt-1">
                        {selectiveCategories.notifications ? (
                          <CheckSquare className="text-amber-600" size={18} />
                        ) : (
                          <Square className="text-slate-300" size={18} />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Selective Action Footer */}
                  <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-600">
                        {selectedCategoriesCount} of 7 categories selected
                      </span>
                      {selectedCategoriesCount > 0 && (
                        <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md font-semibold">
                          Selected tables will be purged
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleTriggerSelectiveReset}
                      disabled={selectedCategoriesCount === 0}
                      className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-2xs transition-all flex items-center justify-center gap-2 active:scale-95"
                    >
                      <Trash2 size={14} />
                      <span>Delete Selected Data</span>
                    </button>
                  </div>
                </div>

                {/* 2. Full Database Reset (Keep Users) */}
                <div className="bg-gradient-to-br from-rose-50/80 via-rose-50/50 to-white rounded-2xl border border-rose-200 p-5 sm:p-6 shadow-card">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                          <AlertOctagon size={18} />
                        </div>
                        <h4 className="text-sm font-black text-rose-800 uppercase tracking-wider">
                          Full Database Reset
                        </h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 border border-rose-200 uppercase tracking-wider">
                          Cleans All Tables • Users Safe
                        </span>
                      </div>
                      <p className="text-xs text-rose-700/80 font-medium max-w-2xl leading-relaxed">
                        Permanently wipes all 12 store tables: products, inventory audit logs, sales, invoices, rentals, customer directory, credit notes, suppliers, purchase bills, expenses, and system notifications.
                      </p>
                      <div className="flex items-center gap-2 pt-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 rounded-lg px-2.5 py-1.5 w-fit">
                        <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
                        <span>Protected: Store Admin, Sarah Staff, and user login accounts are completely preserved and will NOT be deleted.</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleTriggerFullReset}
                      className="px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-xs transition-all shrink-0 active:scale-95 flex items-center justify-center gap-2 self-start sm:self-center"
                    >
                      <AlertOctagon size={16} />
                      <span>Full Reset (Keep Users)</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Supabase Cloud & Sync Tab ── */}
          {activeTab === 'cloud' && (
            <div className="space-y-5">
              {/* 1. Connection Status Card */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-card">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#01a9fb]/10 text-[#01a9fb] border border-[#01a9fb]/30 flex items-center justify-center shadow-2xs shrink-0">
                      <Cloud size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-black text-slate-900">Supabase Cloud Connectivity</h3>
                        {connectionStatus?.isConnected ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            Live Connected
                          </span>
                        ) : isSupabaseConfigured() ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                            <AlertTriangle size={12} />
                            Connection Issue
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-sky-100 text-sky-800 border border-sky-200">
                            <Shield size={12} />
                            Offline Mode (Protected)
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 font-medium">Cloud database synchronization, table diagnostics, and remote persistence</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={runConnectionTest}
                    disabled={isTestingConnection}
                    className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-xs transition-all flex items-center justify-center gap-2 shrink-0"
                  >
                    <RefreshCw size={14} className={isTestingConnection ? 'animate-spin text-[#01a9fb]' : ''} />
                    <span>{isTestingConnection ? 'Diagnosing...' : 'Test Connection'}</span>
                  </button>
                </div>

                {/* Status Diagnostics Message */}
                <div className="mt-5 space-y-3">
                  {connectionStatus ? (
                    <div className={`p-4 rounded-xl border text-xs leading-relaxed ${connectionStatus.isConnected
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                      : 'bg-amber-50/80 border-amber-200 text-amber-900'
                      }`}>
                      <div className="flex items-start gap-2.5">
                        {connectionStatus.isConnected ? (
                          <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                        )}
                        <div className="space-y-1 flex-1">
                          <div className="font-bold flex items-center justify-between">
                            <span>{connectionStatus.message}</span>
                            {connectionStatus.latencyMs !== undefined && (
                              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-white/70 border border-slate-200/50 text-slate-700">
                                {connectionStatus.latencyMs} ms
                              </span>
                            )}
                          </div>
                          {connectionStatus.url && (
                            <div className="font-mono text-[11px] text-slate-600 truncate mt-1">
                              Endpoint: {connectionStatus.url} ({connectionStatus.source})
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-600 flex items-center justify-between">
                      <span>Click "Test Connection" to probe all 8 Supabase store tables.</span>
                      <button
                        type="button"
                        onClick={runConnectionTest}
                        className="text-[#01a9fb] font-black hover:underline text-xs"
                      >
                        Run Probe Now
                      </button>
                    </div>
                  )}
                </div>

                {/* Table by table status breakdown */}
                {connectionStatus?.tables && Object.keys(connectionStatus.tables).length > 0 && (
                  <div className="mt-5 pt-5 border-t border-slate-100">
                    <div className="text-xs font-black text-slate-800 mb-3 uppercase tracking-wider flex items-center justify-between">
                      <span>Table Verification Status</span>
                      <span className="text-[11px] text-slate-400 font-medium lowercase">
                        {(Object.values(connectionStatus.tables) as TableProbeResult[]).filter(t => t.ok).length} of {Object.keys(connectionStatus.tables).length} verified
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                      {Object.entries(connectionStatus.tables).map(([table, rawResult]) => {
                        const result = rawResult as TableProbeResult;
                        return (
                          <div
                            key={table}
                            className={`p-3 rounded-xl border text-xs flex flex-col justify-between gap-1 transition-all ${result.ok
                              ? 'bg-emerald-50/50 border-emerald-200'
                              : 'bg-rose-50/60 border-rose-200'
                              }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-slate-800">{table}</span>
                              {result.ok ? (
                                <CheckCircle2 size={14} className="text-emerald-600" />
                              ) : (
                                <AlertTriangle size={14} className="text-rose-600" />
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">
                              {result.ok ? (
                                <span className="text-emerald-700 font-semibold">{result.count ?? 0} rows in database</span>
                              ) : (
                                <span className="text-rose-700 font-medium" title={result.error}>
                                  {result.error || 'Access Denied / Not Found'}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Sync Offline Records to Cloud */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-card">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                        <Upload size={16} />
                      </div>
                      <h4 className="text-sm font-black text-slate-900">Synchronize All Data to Supabase</h4>
                    </div>
                    <p className="text-xs text-slate-500 font-medium max-w-xl">
                      Uploads all locally cached activity (products, sales, customers, rentals, suppliers, bills, and expenses) directly to your remote Supabase database.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleSyncOfflineData}
                    disabled={isSyncingToCloud}
                    className="px-5 py-3 bg-[#01a9fb] hover:bg-[#01a9fb]/90 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-xs transition-all flex items-center justify-center gap-2 shrink-0 self-start sm:self-center"
                  >
                    {isSyncingToCloud ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Syncing to Cloud...</span>
                      </>
                    ) : (
                      <>
                        <Cloud size={16} />
                        <span>Push All Data to Cloud</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Local Cache Record Inventory */}
                <div className="mt-4 pt-2">
                  <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2">
                    Current Local Records Ready to Sync:
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
                      <div className="text-base font-black text-slate-800">{products.length}</div>
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Products</div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
                      <div className="text-base font-black text-slate-800">{customers.length}</div>
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Customers</div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
                      <div className="text-base font-black text-slate-800">{sales.length}</div>
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Sales Invoices</div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
                      <div className="text-base font-black text-slate-800">{rentals.length}</div>
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Rentals</div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
                      <div className="text-base font-black text-slate-800">{suppliers.length}</div>
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Suppliers</div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
                      <div className="text-base font-black text-slate-800">{supplierBills.length}</div>
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Purchase Bills</div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
                      <div className="text-base font-black text-slate-800">{expenses.length}</div>
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Expenses</div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
                      <div className="text-base font-black text-slate-800">{creditNotes.length}</div>
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Credit Notes</div>
                    </div>
                  </div>
                </div>

                {/* Sync Summary Result Banner */}
                {syncSummary && (
                  <div className={`mt-4 p-3.5 rounded-xl border text-xs ${syncSummary.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}>
                    <div className="font-bold flex items-center gap-2">
                      {syncSummary.success ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                      <span>{syncSummary.message}</span>
                    </div>
                    {syncSummary.syncedCounts && (
                      <div className="mt-2 text-[11px] grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-emerald-200/60 font-mono">
                        {Object.entries(syncSummary.syncedCounts).map(([k, v]) => (
                          <div key={k}>{k}: {v} synced</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 3. Custom Supabase Credentials Configuration */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-card">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                      <Link size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900">Supabase API Credentials</h4>
                      <p className="text-xs text-slate-400 font-medium">Configure custom project endpoint & anon key</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditingCredentials(prev => !prev)}
                    className="text-xs font-bold text-[#01a9fb] hover:underline"
                  >
                    {isEditingCredentials ? 'Cancel Editing' : 'Change Credentials'}
                  </button>
                </div>

                {isEditingCredentials ? (
                  <form onSubmit={handleSaveCredentials} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Supabase Project URL
                      </label>
                      <input
                        type="text"
                        value={customSupabaseUrl}
                        onChange={(e) => setCustomSupabaseUrl(e.target.value)}
                        placeholder="https://xyzcompany.supabase.co"
                        className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#01a9fb]"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">Found in Supabase Project Settings → API → Project URL</p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Supabase Public Anon Key
                      </label>
                      <input
                        type="password"
                        value={customSupabaseKey}
                        onChange={(e) => setCustomSupabaseKey(e.target.value)}
                        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                        className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#01a9fb]"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">Found in Supabase Project Settings → API → Project API Keys (anon public)</p>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-[#01a9fb] hover:bg-[#01a9fb]/90 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-xs transition-all"
                      >
                        Save & Connect
                      </button>
                      <button
                        type="button"
                        onClick={handleClearCredentials}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                      >
                        Clear Custom Keys
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-bold">Active URL:</span>
                      <span className="font-mono text-slate-800 select-all">
                        {getSupabaseConfig().url || '(No custom URL set - using default/environment)'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-bold">Anon Key Status:</span>
                      <span className="font-mono text-slate-800">
                        {getSupabaseConfig().hasKey ? 'Configured (Active)' : 'Not Set (Offline Mode)'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-bold">Active Source:</span>
                      <span className="font-bold text-[#01a9fb] uppercase text-[10px]">
                        {getSupabaseConfig().source}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Troubleshooting & SQL Schema Assistant */}
              <div className="bg-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-card space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Server size={18} className="text-[#01a9fb]" />
                    <h4 className="text-sm font-black">Supabase SQL & RLS Troubleshooting</h4>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopySql}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all border border-slate-700"
                  >
                    {isCopiedSql ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    <span>{isCopiedSql ? 'Copied!' : 'Copy RLS Fix SQL'}</span>
                  </button>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  If table probes show <code className="bg-slate-800 px-1.5 py-0.5 rounded text-rose-300">permission denied</code> or <code className="bg-slate-800 px-1.5 py-0.5 rounded text-amber-300">row-level security policy</code> errors, click "Copy RLS Fix SQL" above, open your Supabase Project Dashboard → <strong>SQL Editor</strong>, paste and run it to enable instant read/write permissions for all store tables.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Confirmation Modal ── */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-nano">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${confirmModal.isFull ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
                  <AlertOctagon size={22} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">{confirmModal.title}</h3>
                  <p className="text-xs text-slate-400 font-medium">Irreversible database action</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isResetting && setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              {confirmModal.description}
            </p>

            {/* Record Breakdown Box */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 mb-4 max-h-48 overflow-y-auto">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Tables & Records Marked For Deletion:
              </div>
              <div className="space-y-1.5">
                {confirmModal.recordBreakdown.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-white border border-slate-100">
                    <span className="font-semibold text-slate-700">{item.label}</span>
                    <span className={`font-black px-2 py-0.5 rounded text-[11px] ${item.count > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'}`}>
                      {item.count} records
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Safety Guarantee Box */}
            <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 mb-4 flex items-start gap-2.5">
              <ShieldCheck className="text-emerald-600 shrink-0 mt-0.5" size={18} />
              <div>
                <div className="text-xs font-black text-emerald-800">User Safety Guarantee</div>
                <div className="text-[11px] text-emerald-700 mt-0.5 leading-snug">
                  User accounts (<span className="font-bold">Store Admin, Sarah Staff</span>, and custom staff) and active login credentials will remain intact. You will NOT be locked out.
                </div>
              </div>
            </div>

            {/* Type to Confirm Guard */}
            <div className="mb-5">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Type <span className="font-mono text-rose-600 font-black">DELETE</span> to confirm:
              </label>
              <input
                type="text"
                value={confirmationInput}
                onChange={(e) => setConfirmationInput(e.target.value)}
                placeholder="Type DELETE here"
                disabled={isResetting}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-rose-500 focus:border-rose-500 font-mono uppercase tracking-wider"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                disabled={isResetting}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteReset}
                disabled={confirmationInput.trim().toUpperCase() !== 'DELETE' || isResetting}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-xs transition-all flex items-center gap-2"
              >
                {isResetting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Wiping Database...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Permanently Purge Data</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Success Modal ── */}
      {resetSuccessModal?.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-nano text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-1">Database Cleared Successfully</h3>
            <p className="text-xs text-slate-500 mb-4">{resetSuccessModal.message}</p>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-5 text-left space-y-1.5">
              {resetSuccessModal.summary.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs text-slate-700">
                  <Check size={14} className="text-emerald-600 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setResetSuccessModal(null)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
            >
              Done & Return to Store
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
