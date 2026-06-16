
import React, { useState, useRef } from 'react';
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
  Hash
} from 'lucide-react';

const Settings: React.FC = () => {
  const { storeProfile, settings, updateStoreProfile, updateSettings, importData, resetData, products, sales, customers } = useApp();
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'data'>('profile');
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Logo Upload State
  const [logoPreview, setLogoPreview] = useState<string | null>(storeProfile.logo || null);
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Limit to 5MB
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
    });
    showNotification('System preferences saved!', 'success');
  };

  const handleExportData = () => {
    const dataStr = JSON.stringify({ storeProfile, settings, products, sales, customers }, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `kiddies_backup_${new Date().toISOString().slice(0,10)}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    showNotification('Backup file downloaded.', 'success');
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
    { id: 'profile', label: 'Store Profile', icon: <Store size={18} /> },
    { id: 'preferences', label: 'App Preferences', icon: <SettingsIcon size={18} /> },
    { id: 'data', label: 'Data Management', icon: <Database size={18} /> },
  ];

  return (
    <div className="space-y-4 animate-nano pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 py-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Settings</h1>
          <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">System Configuration</p>
        </div>
      </div>

      {notification && (
        <div className={`fixed bottom-24 md:bottom-10 right-6 px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-nano z-50 border ${notification.type === 'success' ? 'bg-highlight text-slate-900 border-highlight/10' : 'bg-rose-500 text-white border-rose-500/10'}`}>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${notification.type === 'success' ? 'bg-slate-900/10' : 'bg-white/20'}`}>
            {notification.type === 'success' ? <CheckCircle size={18} strokeWidth={2.5} /> : <AlertTriangle size={18} strokeWidth={2.5} />}
          </div>
          <span className="font-bold uppercase tracking-widest text-[10px]">{notification.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Sidebar Navigation */}
        <div className="md:col-span-3">
            <div className="nano-card p-2 h-fit sticky top-20">
            <nav className="space-y-1">
                {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-[9px] font-bold uppercase tracking-widest rounded-lg transition-all group ${activeTab === tab.id ? 'bg-highlight text-slate-900 shadow-sm' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'}`}
                >
                    <div className={`transition-transform group-hover:scale-110 ${activeTab === tab.id ? 'text-slate-900' : 'text-slate-300'}`}>
                        {React.cloneElement(tab.icon as React.ReactElement<any>, { size: 14, strokeWidth: activeTab === tab.id ? 2.5 : 2 })}
                    </div>
                    {tab.label}
                </button>
                ))}
            </nav>
            </div>
        </div>

        {/* Content Area */}
        <div className="md:col-span-9 space-y-6">
          
          {/* Store Profile Tab */}
          {activeTab === 'profile' && (
            <div className="nano-card p-6">
              <div className="flex items-center gap-4 mb-6 pb-4 border-b border-slate-50">
                <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-highlight group relative overflow-hidden">
                  <Store size={18} strokeWidth={2} className="relative z-10" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">Store Profile</h3>
                  <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">Business Identity</p>
                </div>
              </div>
              
              <form onSubmit={handleProfileSubmit} className="space-y-6">
                <div className="flex flex-col sm:flex-row items-center gap-6 mb-6">
                     <div 
                        onClick={() => logoInputRef.current?.click()}
                        className="w-24 h-24 rounded-2xl bg-slate-50 border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 gap-1 cursor-pointer hover:bg-white hover:border-highlight hover:text-highlight transition-all group shadow-sm overflow-hidden relative"
                      >
                        {logoPreview ? (
                          <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                          <>
                            <Image size={20} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
                            <span className="text-[7px] font-bold uppercase tracking-widest text-center">Upload Logo<br/><span className="text-slate-300 lowercase tracking-normal">(Max 5MB)</span></span>
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
                        <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">Store Name</label>
                        <input name="storeName" defaultValue={storeProfile.storeName} className="w-full px-4 py-2 bg-slate-50 border border-transparent focus:bg-white focus:border-highlight/30 rounded-lg outline-none transition-all font-bold text-lg text-slate-900 tracking-tight" placeholder="Nano Banana Store" />
                     </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">Phone Number</label>
                    <input name="phone" defaultValue={storeProfile.phone} className="w-full px-4 py-2 bg-slate-50 border border-transparent focus:bg-white focus:border-highlight/30 rounded-lg outline-none transition-all font-semibold text-slate-900 text-[11px]" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">Email Address</label>
                    <input name="email" defaultValue={storeProfile.email} className="w-full px-4 py-2 bg-slate-50 border border-transparent focus:bg-white focus:border-highlight/30 rounded-lg outline-none transition-all font-semibold text-slate-900 text-[11px]" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">GSTIN / Tax ID</label>
                    <input name="gstin" defaultValue={storeProfile.gstin} className="w-full px-4 py-2 bg-slate-50 border border-transparent focus:bg-white focus:border-highlight/30 rounded-lg outline-none transition-all font-semibold text-slate-900 text-[11px]" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">Website</label>
                    <input name="website" defaultValue={storeProfile.website} className="w-full px-4 py-2 bg-slate-50 border border-transparent focus:bg-white focus:border-highlight/30 rounded-lg outline-none transition-all font-semibold text-slate-900 text-[11px]" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">Business Address</label>
                  <textarea name="address" defaultValue={storeProfile.address} className="w-full px-4 py-2 bg-slate-50 border border-transparent focus:bg-white focus:border-highlight/30 rounded-lg outline-none transition-all font-semibold text-slate-900 h-20 resize-none text-[11px]"></textarea>
                </div>

                <div className="pt-4 flex justify-end border-t border-slate-50">
                  <button type="submit" className="banana-btn px-6 py-2 text-[9px]">
                    <Save size={14} strokeWidth={2.5} className="mr-2 inline-block" /> Save Store Profile
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <div className="space-y-8">
                <div className="nano-card p-6">
                    <div className="flex items-center gap-4 mb-6 pb-4 border-b border-slate-50">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-900 flex items-center justify-center border border-slate-100">
                            <SettingsIcon size={18} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 tracking-tight">System Preferences</h3>
                            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">App Customization</p>
                        </div>
                    </div>

                    <form onSubmit={handlePreferencesSubmit} className="space-y-8">
                        {/* Section: Inventory */}
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-6 h-6 rounded-lg bg-highlight text-slate-900 flex items-center justify-center shadow-sm">
                                    <AlertTriangle size={12} strokeWidth={2.5} />
                                </div>
                                <h4 className="text-[9px] font-bold uppercase tracking-widest text-slate-900">Inventory Management</h4>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-900 uppercase tracking-tight">Low Stock Alerts</p>
                                        <p className="text-[8px] font-semibold text-slate-400 mt-0.5 uppercase tracking-widest">Dashboard warnings</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" name="enableLowStockAlerts" defaultChecked={settings.enableLowStockAlerts} className="sr-only peer" />
                                        <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-highlight"></div>
                                    </label>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">Global Low Stock Threshold</label>
                                    <input type="number" name="lowStockThreshold" defaultValue={settings.lowStockThreshold} className="w-full md:w-1/3 px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-highlight/30 font-semibold text-slate-900 text-[11px]" />
                                </div>
                            </div>
                        </div>

                        {/* Section: Invoicing */}
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-6 h-6 rounded-lg bg-slate-900 text-highlight flex items-center justify-center shadow-sm">
                                    <Hash size={12} strokeWidth={2.5} />
                                </div>
                                <h4 className="text-[9px] font-bold uppercase tracking-widest text-slate-900">Invoicing & Identifiers</h4>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">Sales Invoice Prefix</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[10px]">#</span>
                                        <input name="salesInvoicePrefix" defaultValue={settings.salesInvoicePrefix} className="w-full pl-8 pr-4 py-2 bg-slate-50 border border-transparent focus:bg-white focus:border-highlight/30 rounded-lg outline-none transition-all font-mono font-bold text-slate-900 text-[11px] uppercase tracking-widest" placeholder="INV-" />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">Rental Invoice Prefix</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[10px]">#</span>
                                        <input name="rentalInvoicePrefix" defaultValue={settings.rentalInvoicePrefix} className="w-full pl-8 pr-4 py-2 bg-slate-50 border border-transparent focus:bg-white focus:border-highlight/30 rounded-lg outline-none transition-all font-mono font-bold text-slate-900 text-[11px] uppercase tracking-widest" placeholder="RNT-" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section: Financials */}
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-6 h-6 rounded-lg bg-slate-900 text-highlight flex items-center justify-center shadow-sm">
                                    <CreditCard size={12} strokeWidth={2.5} />
                                </div>
                                <h4 className="text-[9px] font-bold uppercase tracking-widest text-slate-900">Financial Controls</h4>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">Default Tax Rate (%)</label>
                                    <input type="number" name="defaultTaxRate" defaultValue={settings.defaultTaxRate} className="w-full px-4 py-2 bg-slate-50 border border-transparent focus:bg-white focus:border-highlight/30 rounded-lg outline-none transition-all font-semibold text-slate-900 text-[11px]" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">System Currency</label>
                                    <input name="currency" disabled value="₹" className="w-full px-4 py-2 bg-slate-100 text-slate-400 border border-transparent rounded-lg outline-none font-semibold cursor-not-allowed text-[11px]" />
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end border-t border-slate-50">
                            <button type="submit" className="banana-btn px-6 py-2 text-[9px]">
                                <Save size={14} strokeWidth={2.5} className="mr-2 inline-block" /> Save Preferences
                            </button>
                        </div>
                    </form>
                </div>
            </div>
          )}

          {/* Data Management Tab */}
          {activeTab === 'data' && (
            <div className="space-y-6">
               <div className="nano-card p-6">
                <div className="flex items-center gap-4 mb-6 pb-4 border-b border-slate-50">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-900 flex items-center justify-center border border-slate-100">
                    <Database size={18} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight">Backup & Restore</h3>
                    <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">Data Infrastructure</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-6 border border-slate-50 rounded-xl bg-slate-50/50 hover:bg-white hover:border-highlight hover:shadow-sm transition-all group">
                    <div className="w-10 h-10 bg-highlight/10 text-slate-900 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Download size={18} strokeWidth={2.5} />
                    </div>
                    <h4 className="font-bold text-sm text-slate-900 tracking-tight">Export Backup</h4>
                    <p className="text-[9px] font-semibold text-slate-400 mt-1 mb-4 leading-relaxed uppercase tracking-widest">Download secure JSON snapshot.</p>
                    <button onClick={handleExportData} className="w-full py-2 rounded-lg font-bold uppercase tracking-widest text-[9px] border border-slate-100 hover:border-highlight hover:text-highlight transition-all">Download Backup</button>
                  </div>

                  <div className="p-6 border border-slate-50 rounded-xl bg-slate-50/50 hover:bg-white hover:border-highlight hover:shadow-sm transition-all group">
                    <div className="w-10 h-10 bg-highlight/10 text-slate-900 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Upload size={18} strokeWidth={2.5} />
                    </div>
                    <h4 className="font-bold text-sm text-slate-900 tracking-tight">Restore Data</h4>
                    <p className="text-[9px] font-semibold text-slate-400 mt-1 mb-4 leading-relaxed uppercase tracking-widest">Upload backup file.</p>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept=".json" 
                      onChange={handleFileChange}
                    />
                    <button onClick={handleImportClick} className="w-full py-2 rounded-lg font-bold uppercase tracking-widest text-[9px] border border-slate-100 hover:border-highlight hover:text-highlight transition-all">Upload Backup File</button>
                  </div>
                </div>
               </div>

               <div className="nano-card p-6 border-l-4 border-l-rose-500 bg-rose-50/30">
                 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="text-lg font-bold text-rose-600 flex items-center gap-2 tracking-tight"><Trash2 size={18} strokeWidth={2.5}/> Danger Zone</h3>
                      <p className="text-[9px] font-semibold text-slate-400 max-w-xl leading-relaxed uppercase tracking-widest">Irreversible action. Factory reset will permanently wipe all records.</p>
                    </div>
                    <button onClick={handleReset} className="px-6 py-2 rounded-lg font-bold uppercase tracking-widest text-[9px] bg-rose-500 text-white shadow-sm hover:bg-rose-600 transition-all whitespace-nowrap">
                       Factory Reset System
                    </button>
                 </div>
               </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Settings;
