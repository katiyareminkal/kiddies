
import React, { useState } from 'react';
import { useApp } from '../store/AppContext';
import { Card, Button, Modal } from '../components/Shared';
import { formatCurrency } from '../utils/helpers';
import { 
  Plus, 
  Search, 
  Phone, 
  Mail, 
  MapPin, 
  Truck, 
  Package, 
  Building2,
  ExternalLink 
} from 'lucide-react';

const Suppliers: React.FC = () => {
  const { suppliers, addSupplier, products } = useApp();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSupplierStats = (supplierId: string) => {
    const supplierProducts = products.filter(p => p.supplierId === supplierId);
    const totalItems = supplierProducts.reduce((acc, p) => acc + p.saleStock + p.rentalStock, 0);
    const totalValue = supplierProducts.reduce((acc, p) => acc + (p.purchasePrice * (p.saleStock + p.rentalStock)), 0);
    return { productCount: supplierProducts.length, totalItems, totalValue };
  };

  const handleAddSupplier = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    addSupplier({
      name: formData.get('name') as string,
      contactPerson: formData.get('contactPerson') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string,
      address: formData.get('address') as string,
    });
    setIsAddModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-nano pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 font-display tracking-tighter">Suppliers</h1>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] mt-1">Procurement Partners</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="banana-btn px-8 py-4 text-[10px]"
        >
          <Plus size={18} strokeWidth={3} className="mr-2 inline-block" /> Add Supplier
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="nano-card p-4 group hover:bg-slate-900 transition-all duration-300">
          <p className="text-[9px] font-semibold uppercase text-slate-400 tracking-widest mb-0.5 group-hover:text-slate-500 transition-colors">Total Vendors</p>
          <p className="text-lg font-bold text-slate-900 group-hover:text-white transition-colors tracking-tight">{suppliers.length}</p>
        </div>
        
        <div className="nano-card p-4 group hover:bg-slate-900 transition-all duration-300">
          <p className="text-[9px] font-semibold uppercase text-slate-400 tracking-widest mb-0.5 group-hover:text-slate-500 transition-colors">Sourced Products</p>
          <p className="text-lg font-bold text-slate-900 group-hover:text-white transition-colors tracking-tight">{products.length}</p>
        </div>

        <div className="nano-card p-4 group hover:bg-slate-900 transition-all duration-300 hidden md:block">
          <p className="text-[9px] font-semibold uppercase text-slate-400 tracking-widest mb-0.5 group-hover:text-slate-500 transition-colors">Active Relations</p>
          <p className="text-lg font-bold text-slate-900 group-hover:text-white transition-colors tracking-tight">{new Set(products.map(p => p.supplierId)).size}</p>
        </div>
      </div>

      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#8B5CF6] transition-colors" size={14} strokeWidth={2.5} />
        <input 
          type="text" 
          placeholder="Search suppliers..." 
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-100 rounded-xl text-[9px] font-bold uppercase tracking-widest outline-none focus:border-[#8B5CF6]/30 transition-all shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filteredSuppliers.map(supplier => {
            const stats = getSupplierStats(supplier.id);
            return (
                <div key={supplier.id} className="nano-card p-4 group cursor-pointer transition-all duration-300 flex flex-col hover:shadow-lg">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 bg-slate-50 text-slate-900 rounded-xl flex items-center justify-center font-display font-black text-lg border border-slate-100 group-hover:bg-highlight group-hover:scale-110 transition-all duration-500 shadow-sm shrink-0">
                            {supplier.name.charAt(0)}
                        </div>
                        <button className="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-slate-900 group-hover:text-white transition-all duration-300 border border-slate-100 group-hover:border-slate-900">
                            <ExternalLink size={12} strokeWidth={3} />
                        </button>
                    </div>
                    
                    <div className="flex-1">
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight mb-1 group-hover:text-highlight transition-colors line-clamp-1">{supplier.name}</h3>
                        <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-4 line-clamp-1">{supplier.contactPerson}</p>
    
                        <div className="space-y-1.5 mb-5">
                            <div className="flex items-center gap-2 text-[9px] font-bold text-slate-500 uppercase tracking-widest bg-slate-50 px-2 py-1.5 rounded-lg group-hover:bg-highlight/5 transition-colors border border-slate-50 group-hover:border-highlight/20">
                                <Phone size={10} strokeWidth={3} className="text-slate-300 group-hover:text-highlight" />
                                <span className="truncate">{supplier.phone}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[9px] font-bold text-slate-500 lowercase tracking-widest bg-slate-50 px-2 py-1.5 rounded-lg group-hover:bg-highlight/5 transition-colors border border-slate-50 group-hover:border-highlight/20">
                                <Mail size={10} strokeWidth={3} className="text-slate-300 group-hover:text-highlight" />
                                <span className="truncate">{supplier.email}</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-auto pt-3 border-t border-slate-100">
                        <div className="flex items-center gap-2">
                            <Package size={12} className="text-slate-300" />
                            <div>
                                <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Products</p>
                                <p className="text-[10px] font-black text-slate-900">{stats.productCount}</p>
                            </div>
                        </div>
                        <div className="flex items-center justify-end text-right">
                            <div>
                                <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Inv. Value</p>
                                <p className="text-[10px] font-black text-emerald-600 font-mono tracking-tight">{formatCurrency(stats.totalValue)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            );
        })}
      </div>

      
      {filteredSuppliers.length === 0 && (
          <div className="py-20 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-200 mx-auto mb-4">
              <Building2 size={32} strokeWidth={1.5} />
            </div>
            <p className="text-slate-400 text-sm font-black uppercase tracking-widest">No suppliers found</p>
          </div>
      )}

      {/* Add Supplier Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add New Supplier">
        <form onSubmit={handleAddSupplier} className="space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Company Name <span className="text-red-500">*</span></label>
            <div className="relative group">
              <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={18} strokeWidth={3} />
              <input name="name" required className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-primary/20 rounded-[1.25rem] outline-none transition-all font-black text-xs text-slate-900 shadow-inner" placeholder="e.g. ABC Textiles Pvt Ltd" />
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Contact Person <span className="text-red-500">*</span></label>
                <input name="contactPerson" required className="w-full px-4 py-3.5 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-primary/20 rounded-[1.25rem] outline-none transition-all font-black text-xs text-slate-900 shadow-inner" placeholder="Name" />
            </div>
            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Phone <span className="text-red-500">*</span></label>
                <div className="relative group">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={18} strokeWidth={3} />
                  <input name="phone" required className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-primary/20 rounded-[1.25rem] outline-none transition-all font-black text-xs text-slate-900 shadow-inner" placeholder="Phone Number" />
                </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Email <span className="text-red-500">*</span></label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={18} strokeWidth={3} />
              <input name="email" type="email" required className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-primary/20 rounded-[1.25rem] outline-none transition-all font-black text-xs text-slate-900 shadow-inner" placeholder="email@company.com" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Address <span className="text-red-500">*</span></label>
            <div className="relative group">
              <MapPin className="absolute left-4 top-4 text-slate-400 group-focus-within:text-primary transition-colors" size={18} strokeWidth={3} />
              <textarea name="address" required className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-primary/20 rounded-[1.25rem] outline-none transition-all font-black text-xs text-slate-900 h-24 resize-none shadow-inner" placeholder="Full office address"></textarea>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-6">
            <Button variant="ghost" onClick={() => setIsAddModalOpen(false)} className="w-full sm:flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] text-slate-400">Cancel</Button>
            <Button type="submit" className="w-full sm:flex-1 h-14 rounded-2xl shadow-xl font-black uppercase tracking-widest text-[10px] bg-slate-900 hover:bg-slate-800">Save Supplier</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Suppliers;
