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
  AlertOctagon
} from 'lucide-react';
import { exportToExcel } from '../utils/excelBackup';

const Settings: React.FC = () => {
  const { storeProfile, settings, updateStoreProfile, updateSettings, importData, resetData, products, sales, customers, suppliers, rentals, stockLogs } = useApp();
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'data'>('profile');
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Logo Upload State
  const [logoPreview, setLogoPreview] = useState<string | null>(storeProfile.logo || null);
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

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

  const handleProfileSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    updateStoreProfile({
      storeName: formData.get('storeName') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      address: formData.get('address') as string,
      gstin: formData.get('gstin') as string,
      website: formData.get('website') as string,
    }, selectedLogoFile || undefined);
    showNotification('Store profile updated successfully!', 'success');
  };

  const handlePreferencesSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    updateSettings({
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
    showNotification('System preferences saved!', 'success');
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

  const handleReset = () => {
    if (confirm('Are you sure? This will delete ALL data including products, sales, and customers. This cannot be undone.')) {
      resetData();
      showNotification('System reset to factory defaults.', 'success');
    }
  };

  const tabs = [
    { id: 'profile', label: 'Store Profile', icon: <Store size={16} /> },
    { id: 'preferences', label: 'App Preferences', icon: <Sliders size={16} /> },
    { id: 'data', label: 'Data Management', icon: <Database size={16} /> },
  ];

  return (
    <div className="space-y-5 animate-nano pb-20 max-w-[1600px] mx-auto">
      {/* ── Executive Header ── */}
      <div className="bg-white border border-slate-200/80 rounded-md p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-[#01a9fb] text-white flex items-center justify-center shadow-xs shrink-0">
            <SettingsIcon size={20} strokeWidth={2.2} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">System Settings</h1>
              <span className="text-[10px] font-extrabold text-[#01a9fb] bg-[#01a9fb]/10 border border-[#01a9fb]/30 px-2 py-0.5 rounded-md">
                Configuration Console
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Customize business identity, tax calculations, invoice rules, and database snapshots</p>
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className={`fixed bottom-20 md:bottom-10 right-6 px-4 py-3 rounded-md shadow-lg flex items-center gap-2.5 animate-nano z-50 border ${notification.type === 'success' ? 'bg-slate-900 text-white border-slate-800' : 'bg-rose-600 text-white border-rose-700'
          }`}>
          {notification.type === 'success' ? <CheckCircle2 size={16} className="text-emerald-400" /> : <AlertTriangle size={16} className="text-amber-300" />}
          <span className="font-extrabold text-xs">{notification.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Sidebar Navigation */}
        <div className="md:col-span-3">
          <div className="bg-white rounded-md border border-slate-200/80 p-2 shadow-xs sticky top-20">
            <nav className="space-y-1">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-extrabold rounded-md transition-all ${activeTab === tab.id
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
            <div className="bg-white rounded-md border border-slate-200/80 p-5 sm:p-6 shadow-xs">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                <div className="w-9 h-9 rounded-md bg-[#01a9fb]/10 text-[#01a9fb] border border-[#01a9fb]/30 flex items-center justify-center">
                  <Store size={18} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Store Profile</h3>
                  <p className="text-xs text-slate-400 font-medium">Business identity displayed on customer invoices & tags</p>
                </div>
              </div>

              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="flex flex-col sm:flex-row items-center gap-4 mb-4">
                  <div
                    onClick={() => logoInputRef.current?.click()}
                    className="w-24 h-24 rounded-md bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 gap-1 cursor-pointer hover:border-[#01a9fb] hover:text-[#01a9fb] transition-all overflow-hidden shrink-0"
                  >
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-1" />
                    ) : (
                      <>
                        <Image size={20} />
                        <span className="text-[9px] font-extrabold uppercase text-center">Upload Logo</span>
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

                  <div className="flex-1 w-full space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Store Brand Name *</label>
                    <input name="storeName" defaultValue={storeProfile.storeName} required className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#01a9fb] rounded-md outline-none font-extrabold text-sm text-slate-900" placeholder="Kiddies Store" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Official Phone *</label>
                    <input name="phone" defaultValue={storeProfile.phone} required className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#01a9fb] rounded-md outline-none font-bold text-xs text-slate-900" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Official Email *</label>
                    <input name="email" defaultValue={storeProfile.email} required className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#01a9fb] rounded-md outline-none font-bold text-xs text-slate-900" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">GSTIN / Tax Registration</label>
                    <input name="gstin" defaultValue={storeProfile.gstin} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#01a9fb] rounded-md outline-none font-mono font-bold text-xs text-slate-900" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Website URL</label>
                    <input name="website" defaultValue={storeProfile.website} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#01a9fb] rounded-md outline-none font-bold text-xs text-slate-900" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Physical Store Address</label>
                  <textarea name="address" defaultValue={storeProfile.address} className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#01a9fb] rounded-md outline-none font-bold text-xs text-slate-900 h-20 resize-none"></textarea>
                </div>

                <div className="pt-3 flex justify-end border-t border-slate-100">
                  <button type="submit" className="px-5 py-2.5 bg-[#01a9fb] hover:bg-[#0098e6] text-white rounded-md text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
                    <Save size={14} />
                    <span>Save Store Profile</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <div className="bg-white rounded-md border border-slate-200/80 p-5 sm:p-6 shadow-xs">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                <div className="w-9 h-9 rounded-md bg-[#01a9fb]/10 text-[#01a9fb] border border-[#01a9fb]/30 flex items-center justify-center">
                  <Sliders size={18} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">System Preferences</h3>
                  <p className="text-xs text-slate-400 font-medium">Invoicing prefixes, default tax rates, and safety deletion permissions</p>
                </div>
              </div>

              <form onSubmit={handlePreferencesSubmit} className="space-y-5">
                {/* Invoicing Prefixes */}
                <div className="space-y-2">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">Invoice Prefixes & Tax</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Sales Invoice Prefix</label>
                      <input name="salesInvoicePrefix" defaultValue={settings.salesInvoicePrefix} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#01a9fb] rounded-md font-mono font-bold text-xs text-slate-900 uppercase" placeholder="INV-" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Rental Invoice Prefix</label>
                      <input name="rentalInvoicePrefix" defaultValue={settings.rentalInvoicePrefix} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#01a9fb] rounded-md font-mono font-bold text-xs text-slate-900 uppercase" placeholder="RNT-" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Default Tax Rate (%)</label>
                      <input type="number" name="defaultTaxRate" defaultValue={settings.defaultTaxRate} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#01a9fb] rounded-md font-bold text-xs text-slate-900" />
                    </div>
                  </div>
                </div>

                {/* Stock Warnings */}
                <div className="space-y-2 pt-3 border-t border-slate-100">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">Stock Alert Level</h4>
                  <div className="p-3.5 bg-slate-50 rounded-md border border-slate-200 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-900">Global Low Stock Threshold</p>
                      <p className="text-[10px] text-slate-400">Trigger warnings on dashboard when stock dips below</p>
                    </div>
                    <input type="number" name="lowStockThreshold" defaultValue={settings.lowStockThreshold} className="w-20 px-3 py-1.5 bg-white border border-slate-200 focus:border-[#01a9fb] rounded-md font-bold text-xs text-slate-900 text-center" />
                  </div>
                </div>

                {/* Deletion Permission Toggles */}
                <div className="space-y-2 pt-3 border-t border-slate-100">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">Deletion Safety Permissions</h4>
                  <p className="text-[10px] text-slate-400 mb-2">Enable or restrict trash bin actions for system records</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {[
                      { key: 'enableDeleteInventory', label: 'Allow Deleting Inventory SKUs', desc: 'Permanent catalog deletion' },
                      { key: 'enableDeleteTransactions', label: 'Allow Deleting Sales Records', desc: 'Permanent invoice deletion' },
                      { key: 'enableDeleteRentals', label: 'Allow Deleting Rental Bookings', desc: 'Permanent lease deletion' },
                      { key: 'enableDeleteCustomers', label: 'Allow Deleting Customer CRM Profiles', desc: 'Permanent profile deletion' },
                      { key: 'enableDeleteSuppliers', label: 'Allow Deleting Supplier Records', desc: 'Permanent vendor deletion' },
                      { key: 'enableDeleteUsers', label: 'Allow Deleting Staff User Accounts', desc: 'Permanent access revoke' },
                    ].map(item => (
                      <label key={item.key} className="flex items-center justify-between p-3 bg-slate-50 rounded-md border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                        <div>
                          <p className="text-xs font-bold text-slate-900">{item.label}</p>
                          <p className="text-[10px] text-slate-400">{item.desc}</p>
                        </div>
                        <input
                          type="checkbox"
                          name={item.key}
                          defaultChecked={(settings as any)[item.key]}
                          className="rounded border-slate-300 text-[#01a9fb] focus:ring-[#01a9fb] w-4 h-4"
                        />
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-3 flex justify-end border-t border-slate-100">
                  <button type="submit" className="px-5 py-2.5 bg-[#01a9fb] hover:bg-[#0098e6] text-white rounded-md text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
                    <Save size={14} />
                    <span>Save System Preferences</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Data Management Tab */}
          {activeTab === 'data' && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg border border-slate-200/80 p-5 sm:p-6 shadow-xs">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                  <div className="w-9 h-9 rounded-md bg-slate-50 text-slate-700 border border-slate-200 flex items-center justify-center">
                    <Database size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">Backup & Restore Engine</h3>
                    <p className="text-xs text-slate-400 font-medium">Export full table spreadsheets or raw snapshot backups</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/70 flex flex-col justify-between">
                    <div>
                      <div className="w-8 h-8 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                        <Download size={16} />
                      </div>
                      <h4 className="font-extrabold text-xs text-slate-900">Export JSON Snapshot</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5 mb-3">Raw full-fidelity state file</p>
                    </div>
                    <button onClick={handleExportData} className="w-full py-2 bg-white hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 rounded-md text-xs font-extrabold transition-all">
                      Download JSON
                    </button>
                  </div>

                  <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/70 flex flex-col justify-between">
                    <div>
                      <div className="w-8 h-8 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                        <FileSpreadsheet size={16} />
                      </div>
                      <h4 className="font-extrabold text-xs text-slate-900">Export Excel Sheets</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5 mb-3">Multi-sheet .xlsx workbook</p>
                    </div>
                    <button
                      onClick={() => {
                        exportToExcel({ products, sales, rentals, customers, suppliers, stockLogs });
                        showNotification('Excel backup downloaded.', 'success');
                      }}
                      className="w-full py-2 bg-white hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 rounded-md text-xs font-extrabold transition-all"
                    >
                      Download Excel
                    </button>
                  </div>

                  <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/70 flex flex-col justify-between">
                    <div>
                      <div className="w-8 h-8 rounded-md bg-violet-50 text-violet-600 flex items-center justify-center mb-3">
                        <Upload size={16} />
                      </div>
                      <h4 className="font-extrabold text-xs text-slate-900">Restore Backup</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5 mb-3">Import JSON data snapshot</p>
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept=".json"
                      onChange={handleFileChange}
                    />
                    <button onClick={handleImportClick} className="w-full py-2 bg-white hover:bg-violet-50 hover:text-violet-700 border border-slate-200 rounded-md text-xs font-extrabold transition-all">
                      Import Backup
                    </button>
                  </div>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="bg-rose-50/50 rounded-lg border border-rose-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-extrabold text-rose-700 flex items-center gap-1.5 uppercase tracking-wider">
                    <AlertOctagon size={15} />
                    <span>Danger Zone • Factory Reset</span>
                  </h4>
                  <p className="text-[11px] text-rose-600/80 mt-0.5 font-medium">Irreversible action. Permanently wipe all store records and reset to factory defaults.</p>
                </div>
                <button onClick={handleReset} className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-xs font-extrabold uppercase tracking-wider shadow-xs transition-all shrink-0">
                  Reset System Data
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
