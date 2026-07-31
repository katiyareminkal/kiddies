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
  ExternalLink,
  FileText,
  IndianRupee,
  Trash2,
  ArrowRight,
  ImagePlus,
  Pencil
} from 'lucide-react';
import { Supplier, SupplierBill } from '../types';

const Suppliers: React.FC = () => {
  const { suppliers, addSupplier, updateSupplier, deleteSupplier, products, supplierBills, addSupplierBill, addPaymentToSupplierBill, deleteSupplierBill, settings } = useApp();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Ledger State
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);
  const [isAddBillOpen, setIsAddBillOpen] = useState(false);
  
  // Payment State
  const [paymentBill, setPaymentBill] = useState<SupplierBill | null>(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  // New Bill Form State
  const [billItems, setBillItems] = useState<{itemName: string, quantity: string, unitPrice: string, total: number}[]>([{itemName: '', quantity: '1', unitPrice: '', total: 0}]);
  const [billImageFile, setBillImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSupplierStats = (supplierId: string) => {
    const supplierProducts = products.filter(p => p.supplierId === supplierId);
    const totalItems = supplierProducts.reduce((acc, p) => acc + p.saleStock + p.rentalStock, 0);
    const totalValue = supplierProducts.reduce((acc, p) => acc + (p.purchasePrice * (p.saleStock + p.rentalStock)), 0);
    
    const bills = supplierBills.filter(b => b.supplierId === supplierId);
    const totalDue = bills.reduce((acc, b) => acc + (b.totalAmount - b.paidAmount), 0);

    return { productCount: supplierProducts.length, totalItems, totalValue, totalDue, bills };
  };

  const handleAddSupplier = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      if (editingSupplier) {
        await updateSupplier(editingSupplier.id, {
          name: formData.get('name') as string,
          contactPerson: formData.get('contactPerson') as string,
          phone: formData.get('phone') as string,
          email: formData.get('email') as string,
          address: formData.get('address') as string,
          location: formData.get('location') as string,
          category: formData.get('category') as string,
        });
      } else {
        await addSupplier({
          name: formData.get('name') as string,
          contactPerson: formData.get('contactPerson') as string,
          phone: formData.get('phone') as string,
          email: formData.get('email') as string,
          address: formData.get('address') as string,
          location: formData.get('location') as string,
          category: formData.get('category') as string,
        });
      }
      setIsAddModalOpen(false);
      setEditingSupplier(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddBill = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedSupplier) return;
    setIsUploading(true);
    const formData = new FormData(e.currentTarget);
    const paid = Number(formData.get('paidAmount') || 0);
    const total = billItems.reduce((acc, item) => acc + item.total, 0);
    
    let status: 'UNPAID' | 'PARTIAL' | 'PAID' = 'UNPAID';
    if (paid >= total) status = 'PAID';
    else if (paid > 0) status = 'PARTIAL';

    try {
      const itemsForSubmit = billItems
        .filter(item => item.itemName.trim() !== '')
        .map(item => ({
          itemName: item.itemName,
          quantity: Number(item.quantity) || 0,
          unitPrice: Number(item.unitPrice) || 0,
          total: item.total
        }));
      await addSupplierBill({
        supplierId: selectedSupplier.id,
        billNumber: formData.get('billNumber') as string,
        date: formData.get('date') as string,
        totalAmount: total,
        paidAmount: paid,
        status,
        notes: formData.get('notes') as string,
        items: itemsForSubmit
      }, billImageFile || undefined);
      setIsAddBillOpen(false);
      setBillItems([{itemName: '', quantity: '1', unitPrice: '', total: 0}]);
      setBillImageFile(null);
    } catch (err: any) {
      console.error('Failed to save bill:', err);
      alert('Failed to save bill: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsUploading(false);
    }
  };

  const updateBillItem = (index: number, field: string, value: string) => {
    const newItems = [...billItems];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === 'quantity' || field === 'unitPrice') {
       const qty = Number(newItems[index].quantity) || 0;
       const price = Number(newItems[index].unitPrice) || 0;
       newItems[index].total = qty * price;
    }
    setBillItems(newItems);
  };

  const addBillItemRow = () => {
    setBillItems([...billItems, {itemName: '', quantity: '1', unitPrice: '', total: 0}]);
  };

  const removeBillItemRow = (index: number) => {
    if (billItems.length > 1) {
      setBillItems(billItems.filter((_, i) => i !== index));
    }
  };

  const handleRecordPayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!paymentBill) return;
    const formData = new FormData(e.currentTarget);
    const amount = Number(formData.get('amount'));
    await addPaymentToSupplierBill(paymentBill.id, amount);
    setIsPaymentOpen(false);
    setPaymentBill(null);
  };

  const openLedger = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsLedgerOpen(true);
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
          onClick={() => { setEditingSupplier(null); setIsAddModalOpen(true); }}
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
                        <div className="flex gap-2">
                          <button onClick={() => { setEditingSupplier(supplier); setIsAddModalOpen(true); }} className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                              <Pencil size={16} strokeWidth={2.5} />
                          </button>
                          <button onClick={() => openLedger(supplier)} className="px-3 py-1.5 rounded-lg bg-slate-50 text-[9px] font-black uppercase tracking-widest text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all border border-slate-100 group-hover:border-slate-900 flex items-center gap-1.5">
                              Ledger <ArrowRight size={10} strokeWidth={3} />
                          </button>
                        </div>
                    </div>
                    
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-xl font-display font-black text-slate-900 group-hover:text-primary transition-colors line-clamp-1">{supplier.name}</h3>
                          {supplier.category && (
                            <span className="px-2 py-0.5 bg-slate-100 text-[8px] font-black uppercase tracking-widest text-slate-500 rounded-md whitespace-nowrap">
                              {supplier.category}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-widest">
                           <Phone size={12} strokeWidth={2.5} /> {supplier.contactPerson} • {supplier.phone}
                        </p>
                        {supplier.location && (
                          <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-widest mt-1">
                             <MapPin size={12} strokeWidth={2.5} /> {supplier.location}
                          </p>
                        )}
                        <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-widest mt-1">
                           <Mail size={12} strokeWidth={2.5} /> {supplier.email}
                        </p>
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
                                <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Balance Due</p>
                                <p className={`text-[10px] font-black font-mono tracking-tight ${stats.totalDue > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>{formatCurrency(stats.totalDue)}</p>
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

      {/* Add/Edit Supplier Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => { setIsAddModalOpen(false); setEditingSupplier(null); }} title={editingSupplier ? "Edit Supplier" : "Add New Supplier"}>
        <form onSubmit={handleAddSupplier} className="space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Company Name <span className="text-red-500">*</span></label>
            <div className="relative group">
              <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={18} strokeWidth={3} />
              <input name="name" defaultValue={editingSupplier?.name || ''} required className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-primary/20 rounded-[1.25rem] outline-none transition-all font-black text-xs text-slate-900 shadow-inner" placeholder="e.g. ABC Textiles Pvt Ltd" />
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Contact Person <span className="text-red-500">*</span></label>
                <input name="contactPerson" defaultValue={editingSupplier?.contactPerson || ''} required className="w-full px-4 py-3.5 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-primary/20 rounded-[1.25rem] outline-none transition-all font-black text-xs text-slate-900 shadow-inner" placeholder="Name" />
            </div>
            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Phone <span className="text-red-500">*</span></label>
                <div className="relative group">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={18} strokeWidth={3} />
                  <input name="phone" defaultValue={editingSupplier?.phone || ''} required className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-primary/20 rounded-[1.25rem] outline-none transition-all font-black text-xs text-slate-900 shadow-inner" placeholder="Phone Number" />
                </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Email <span className="text-red-500">*</span></label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={18} strokeWidth={3} />
              <input name="email" type="email" defaultValue={editingSupplier?.email || ''} required className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-primary/20 rounded-[1.25rem] outline-none transition-all font-black text-xs text-slate-900 shadow-inner" placeholder="email@company.com" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Location (Optional)</label>
              <div className="relative group">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={18} strokeWidth={3} />
                <input name="location" defaultValue={editingSupplier?.location || ''} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-primary/20 rounded-[1.25rem] outline-none transition-all font-black text-xs text-slate-900 shadow-inner" placeholder="City or Region" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Category (Optional)</label>
              <div className="relative group">
                <Package className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={18} strokeWidth={3} />
                <input name="category" defaultValue={editingSupplier?.category || ''} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-primary/20 rounded-[1.25rem] outline-none transition-all font-black text-xs text-slate-900 shadow-inner" placeholder="e.g. Toys, Clothing" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Full Address <span className="text-red-500">*</span></label>
            <div className="relative group">
              <MapPin className="absolute left-4 top-4 text-slate-400 group-focus-within:text-primary transition-colors" size={18} strokeWidth={3} />
              <textarea name="address" defaultValue={editingSupplier?.address || ''} required className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-primary/20 rounded-[1.25rem] outline-none transition-all font-black text-xs text-slate-900 h-24 resize-none shadow-inner" placeholder="Full office address"></textarea>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-6">
            <Button variant="ghost" type="button" onClick={() => { setIsAddModalOpen(false); setEditingSupplier(null); }} className="w-full sm:flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] text-slate-400">Cancel</Button>
            <Button type="submit" className="w-full sm:flex-1 h-14 rounded-2xl shadow-xl font-black uppercase tracking-widest text-[10px] bg-slate-900 hover:bg-slate-800">
               {editingSupplier ? "Update Supplier" : "Save Supplier"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Ledger Modal */}
      {selectedSupplier && (
        <Modal isOpen={isLedgerOpen} onClose={() => { setIsLedgerOpen(false); setSelectedSupplier(null); }} title={`${selectedSupplier.name} - Ledger`} size="lg">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
               <div>
                  <h3 className="text-xl font-display font-black text-slate-900">Bills & Invoices</h3>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">Total Outstanding: <span className="text-rose-500">{formatCurrency(getSupplierStats(selectedSupplier.id).totalDue)}</span></p>
               </div>
               <button onClick={() => setIsAddBillOpen(true)} className="banana-btn px-4 py-2 text-[9px]">
                  <Plus size={14} strokeWidth={2.5} className="mr-1.5 inline-block" /> Add Bill
               </button>
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Date</th>
                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Bill #</th>
                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Total</th>
                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Paid</th>
                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Status</th>
                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {getSupplierStats(selectedSupplier.id).bills.map(bill => (
                    <tr key={bill.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4 text-[10px] font-bold text-slate-900">{new Date(bill.date).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-[10px] font-bold text-slate-900">
                        {bill.billNumber}
                        {bill.items && bill.items.length > 0 && (
                          <div className="mt-1 text-[8px] text-slate-400 font-normal">
                             {bill.items.map(i => `${i.quantity}x ${i.itemName}`).join(', ')}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-[10px] font-bold text-slate-900">{formatCurrency(bill.totalAmount)}</td>
                      <td className="px-6 py-4 text-[10px] font-bold text-slate-500">{formatCurrency(bill.paidAmount)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-2.5 py-1 text-[8px] font-black uppercase tracking-widest rounded-md ${
                          bill.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' :
                          bill.status === 'PARTIAL' ? 'bg-amber-100 text-amber-700' :
                          'bg-rose-100 text-rose-700'
                        }`}>
                          {bill.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                         <div className="flex items-center justify-end gap-2">
                            {bill.imageUrl && (
                              <a href={bill.imageUrl} target="_blank" rel="noreferrer" className="text-[9px] font-black uppercase tracking-widest text-emerald-600 hover:bg-emerald-50 px-3 py-1.5 rounded-lg transition-colors border border-transparent hover:border-emerald-200">
                                View Bill
                              </a>
                            )}
                            {bill.status !== 'PAID' && (
                               <button 
                                 onClick={() => { setPaymentBill(bill); setIsPaymentOpen(true); }}
                                 className="text-[9px] font-black uppercase tracking-widest text-highlight hover:bg-highlight/10 px-3 py-1.5 rounded-lg transition-colors border border-transparent hover:border-highlight/20"
                               >
                                 Pay
                               </button>
                            )}
                            {settings?.enableDeleteSuppliers && (
                               <button 
                                 onClick={() => {
                                     if(window.confirm('Delete this bill?')) deleteSupplierBill(bill.id);
                                 }}
                                 className="text-slate-300 hover:text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg transition-colors"
                                 title="Delete Bill"
                               >
                                 <Trash2 size={14} strokeWidth={2.5} />
                               </button>
                            )}
                         </div>
                      </td>
                    </tr>
                  ))}
                  {getSupplierStats(selectedSupplier.id).bills.length === 0 && (
                      <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              No bills recorded yet.
                          </td>
                      </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Bill Modal */}
      <Modal isOpen={isAddBillOpen} onClose={() => setIsAddBillOpen(false)} title="Record New Bill" size="lg">
        <form onSubmit={handleAddBill} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Bill Number *</label>
              <input name="billNumber" required className="w-full px-4 py-3 bg-slate-50 border border-transparent focus:bg-white focus:border-highlight/30 rounded-xl outline-none transition-all font-bold text-slate-900 text-[11px]" placeholder="INV-001" />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Date *</label>
              <input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full px-4 py-3 bg-slate-50 border border-transparent focus:bg-white focus:border-highlight/30 rounded-xl outline-none transition-all font-bold text-slate-900 text-[11px]" />
            </div>
          </div>

          <div className="space-y-3">
             <div className="flex justify-between items-center">
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Bill Items</label>
             </div>
             <div className="bg-slate-50 rounded-xl p-2 space-y-2">
               {billItems.map((item, index) => (
                 <div key={index} className="flex gap-2 items-center">
                    <input 
                      type="text" 
                      required 
                      value={item.itemName}
                      onChange={e => updateBillItem(index, 'itemName', e.target.value)}
                      placeholder="Item Name" 
                      className="flex-1 px-3 py-2 bg-white rounded-lg border border-slate-200 focus:border-highlight/30 outline-none font-bold text-[10px] text-slate-900"
                    />
                    <input 
                      type="number" 
                      required 
                      min="1"
                      value={item.quantity}
                      onChange={e => updateBillItem(index, 'quantity', e.target.value)}
                      placeholder="Qty" 
                      className="w-16 px-3 py-2 bg-white rounded-lg border border-slate-200 focus:border-highlight/30 outline-none font-bold text-[10px] text-slate-900"
                    />
                    <div className="relative w-24">
                        <IndianRupee className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={10} />
                        <input 
                          type="number" 
                          required 
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={e => updateBillItem(index, 'unitPrice', e.target.value)}
                          placeholder="Price" 
                          className="w-full pl-6 pr-2 py-2 bg-white rounded-lg border border-slate-200 focus:border-highlight/30 outline-none font-bold text-[10px] text-slate-900"
                        />
                    </div>
                    <div className="w-20 text-right font-mono font-bold text-[10px] text-slate-600">
                       {formatCurrency(item.total)}
                    </div>
                    <button 
                      type="button" 
                      onClick={() => removeBillItemRow(index)}
                      className={`p-2 rounded-lg transition-colors ${billItems.length > 1 ? 'text-slate-400 hover:text-rose-500 hover:bg-rose-50' : 'text-slate-200 cursor-not-allowed'}`}
                    >
                       <Trash2 size={12} strokeWidth={3} />
                    </button>
                 </div>
               ))}
               <button type="button" onClick={addBillItemRow} className="w-full py-2 border-2 border-dashed border-slate-200 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-highlight hover:border-highlight/30 hover:bg-highlight/5 transition-all">
                  + Add Another Item
               </button>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4 items-end">
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Amount Paid Now</label>
              <div className="relative group">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-highlight" size={14} strokeWidth={2.5} />
                <input name="paidAmount" type="number" min={0} step="0.01" defaultValue={0} className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-transparent focus:bg-white focus:border-highlight/30 rounded-xl outline-none transition-all font-bold text-slate-900 text-[11px]" placeholder="0.00" />
              </div>
            </div>
            <div className="bg-slate-900 text-white p-3 rounded-xl flex justify-between items-center shadow-banana">
               <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Bill</span>
               <span className="text-lg font-display font-black text-highlight">{formatCurrency(billItems.reduce((acc, item) => acc + item.total, 0))}</span>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Notes (Optional)</label>
            <input name="notes" className="w-full px-4 py-3 bg-slate-50 border border-transparent focus:bg-white focus:border-highlight/30 rounded-xl outline-none transition-all font-bold text-slate-900 text-[11px]" placeholder="Any remarks" />
          </div>
          
          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Upload Bill Image (Optional)</label>
            <div className="relative group">
              <input 
                type="file" 
                accept="image/*"
                onChange={(e) => setBillImageFile(e.target.files ? e.target.files[0] : null)}
                className="w-full px-4 py-3 bg-slate-50 border border-transparent focus:bg-white focus:border-highlight/30 rounded-xl outline-none transition-all font-bold text-slate-900 text-[11px] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[9px] file:font-black file:uppercase file:tracking-widest file:bg-slate-900 file:text-white hover:file:bg-slate-800 cursor-pointer" 
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button type="button" onClick={() => { setIsAddBillOpen(false); setBillItems([{itemName: '', quantity: '1', unitPrice: '', total: 0}]); setBillImageFile(null); }} className="flex-1 h-12 rounded-xl font-black uppercase tracking-widest text-[9px] text-slate-400 hover:bg-slate-50" disabled={isUploading}>Cancel</button>
            <button type="submit" className="banana-btn flex-1 h-12 text-[9px]" disabled={isUploading}>
              {isUploading ? 'Saving...' : 'Save Bill'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Record Payment Modal */}
      {paymentBill && (
        <Modal isOpen={isPaymentOpen} onClose={() => { setIsPaymentOpen(false); setPaymentBill(null); }} title="Record Payment">
          <form onSubmit={handleRecordPayment} className="space-y-6">
            <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-2 shadow-banana">
              <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-400">
                <span>Total Bill</span>
                <span>{formatCurrency(paymentBill.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-highlight">
                <span>Already Paid</span>
                <span>{formatCurrency(paymentBill.paidAmount)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Balance Due</span>
                <span className="text-xl font-display font-black text-highlight">{formatCurrency(paymentBill.totalAmount - paymentBill.paidAmount)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Payment Amount *</label>
              <div className="relative group">
                <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" size={16} strokeWidth={3} />
                <input 
                  name="amount" 
                  type="number" 
                  max={paymentBill.totalAmount - paymentBill.paidAmount}
                  min={1}
                  required 
                  autoFocus
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-transparent focus:bg-white focus:border-highlight/30 rounded-xl outline-none transition-all font-black text-slate-900 text-[11px]" 
                  placeholder="Enter amount" 
                />
              </div>
            </div>

            <div className="flex gap-4 pt-2">
              <button type="button" onClick={() => setIsPaymentOpen(false)} className="flex-1 h-12 rounded-xl font-black uppercase tracking-widest text-[9px] text-slate-400 hover:bg-slate-50">Cancel</button>
              <button type="submit" className="banana-btn flex-1 h-12 text-[9px]">Record Payment</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default Suppliers;
