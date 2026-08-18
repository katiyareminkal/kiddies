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
  Pencil,
  Eye,
  CreditCard,
  Boxes,
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Supplier, SupplierBill } from '../types';

const Suppliers: React.FC = () => {
  const { suppliers, addSupplier, updateSupplier, deleteSupplier, products, supplierBills, addSupplierBill, updateSupplierBill, addPaymentToSupplierBill, deleteSupplierBill, settings } = useApp();
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

  // New Bill & Edit Bill Form State
  const [editingBill, setEditingBill] = useState<SupplierBill | null>(null);
  const [isEditBillOpen, setIsEditBillOpen] = useState(false);
  const [viewingBillDetails, setViewingBillDetails] = useState<SupplierBill | null>(null);
  const [viewingBillImage, setViewingBillImage] = useState<string | null>(null);
  const [billItems, setBillItems] = useState<{ itemName: string, quantity: string, unitPrice: string, total: number }[]>([{ itemName: '', quantity: '1', unitPrice: '', total: 0 }]);
  const [billImageFile, setBillImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const filteredSuppliers = suppliers.filter(s =>
    (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.contactPerson || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSupplierStats = (supplierId: string) => {
    const supplierProducts = products.filter(p => p.supplierId === supplierId);
    const totalItems = supplierProducts.reduce((acc, p) => acc + (p.saleStock || 0) + (p.rentalStock || 0), 0);
    const totalValue = supplierProducts.reduce((acc, p) => acc + ((p.purchasePrice || 0) * ((p.saleStock || 0) + (p.rentalStock || 0))), 0);

    const bills = supplierBills.filter(b => b.supplierId === supplierId);
    const totalDue = bills.reduce((acc, b) => acc + ((b.totalAmount || 0) - (b.paidAmount || 0)), 0);

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
      setBillItems([{ itemName: '', quantity: '1', unitPrice: '', total: 0 }]);
      setBillImageFile(null);
    } catch (err: any) {
      console.error('Failed to save bill:', err);
      alert('Failed to save bill: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleOpenEditBill = (bill: SupplierBill) => {
    setEditingBill(bill);
    setBillItems(
      bill.items && bill.items.length > 0
        ? bill.items.map(i => ({ itemName: i.itemName, quantity: String(i.quantity), unitPrice: String(i.unitPrice), total: i.total }))
        : [{ itemName: '', quantity: '1', unitPrice: '', total: 0 }]
    );
    setBillImageFile(null);
    setIsEditBillOpen(true);
  };

  const handleUpdateBill = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingBill) return;
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
      await updateSupplierBill(editingBill.id, {
        supplierId: editingBill.supplierId,
        billNumber: formData.get('billNumber') as string,
        date: formData.get('date') as string,
        totalAmount: total,
        paidAmount: paid,
        status,
        notes: formData.get('notes') as string,
        items: itemsForSubmit
      }, billImageFile || undefined);
      setIsEditBillOpen(false);
      setEditingBill(null);
      setBillItems([{ itemName: '', quantity: '1', unitPrice: '', total: 0 }]);
      setBillImageFile(null);
    } catch (err: any) {
      console.error('Failed to update bill:', err);
      alert('Failed to update bill: ' + (err?.message || 'Unknown error'));
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
    setBillItems([...billItems, { itemName: '', quantity: '1', unitPrice: '', total: 0 }]);
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
    <div className="space-y-5 animate-nano pb-20 max-w-[1600px] mx-auto">
      {/* ── Executive Header ── */}
      <div className="bg-white border border-slate-200/80 rounded-md p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-[#fe569f] text-white flex items-center justify-center shadow-xs shrink-0">
            <Building2 size={20} strokeWidth={2.2} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">Suppliers & Purchase Bills</h1>
              <span className="text-[10px] font-extrabold text-[#fe569f] bg-[#fe569f]/10 border border-[#fe569f]/30 px-2 py-0.5 rounded-md">
                {suppliers.length} Active Vendors
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Manage procurement vendors, incoming purchase bills, and payment ledgers</p>
          </div>
        </div>

        <button
          onClick={() => { setEditingSupplier(null); setIsAddModalOpen(true); }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#fe569f] hover:bg-[#eb4890] text-white text-xs font-extrabold uppercase tracking-wider rounded-md shadow-xs transition-all active:scale-95"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>New Supplier</span>
        </button>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5">
        <div className="bg-white hover:bg-slate-50/60 p-4 sm:p-5 rounded-md border border-slate-200/80 hover:border-[#fe569f]/50 shadow-xs transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Vendors</span>
            <div className="w-7 h-7 rounded-md bg-[#fe569f]/10 text-[#fe569f] flex items-center justify-center font-bold text-xs">
              <Building2 size={14} />
            </div>
          </div>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-none">{suppliers.length}</h3>
          <p className="text-[11px] font-bold text-[#fe569f] mt-2">Registered procurement partners</p>
        </div>

        <div className="bg-white hover:bg-slate-50/60 p-4 sm:p-5 rounded-md border border-slate-200/80 hover:border-[#01a9fb]/50 shadow-xs transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Sourced Products</span>
            <div className="w-7 h-7 rounded-md bg-[#01a9fb]/10 text-[#01a9fb] flex items-center justify-center font-bold text-xs">
              <Boxes size={14} />
            </div>
          </div>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-none">{products.length}</h3>
          <p className="text-[11px] font-bold text-[#01a9fb] mt-2">Total SKUs in store</p>
        </div>

        <div className="bg-white hover:bg-slate-50/60 p-4 sm:p-5 rounded-md border border-slate-200/80 hover:border-yellow-300 shadow-xs transition-all col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Active Supply Channels</span>
            <div className="w-7 h-7 rounded-md bg-yellow-100 text-yellow-800 flex items-center justify-center font-bold text-xs">
              <Truck size={14} />
            </div>
          </div>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-none">{new Set(products.map(p => p.supplierId)).size}</h3>
          <p className="text-[11px] font-bold text-yellow-700 mt-2">Suppliers currently mapped</p>
        </div>
      </div>

      {/* ── Search Input ── */}
      <div className="relative group max-w-lg">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#fe569f] transition-colors" size={15} strokeWidth={2.5} />
        <input
          type="text"
          placeholder="Search suppliers by name or contact person..."
          className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200/80 rounded-md text-xs font-bold text-slate-900 outline-none focus:border-[#fe569f] focus:ring-2 focus:ring-[#fe569f]/10 transition-all shadow-xs placeholder:text-slate-400"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* ── Supplier Cards Grid (2 columns on mobile, 3 on tablet, 4 on desktop) ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3.5">
        {filteredSuppliers.map(supplier => {
          const stats = getSupplierStats(supplier.id);

          return (
            <div
              key={supplier.id}
              className="bg-white rounded-[6px] border border-slate-200/90 p-2.5 sm:p-3.5 transition-all duration-200 flex flex-col justify-between group hover:border-[#fe569f]/60"
            >
              <div>
                <div className="flex justify-between items-start mb-2 gap-1.5">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 bg-[#fe569f] text-white rounded-[6px] flex items-center justify-center font-black text-xs shrink-0">
                    {(supplier.name || 'S').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => { setEditingSupplier(supplier); setIsAddModalOpen(true); }}
                      className="p-1 text-slate-400 hover:text-[#fe569f] hover:bg-[#fe569f]/10 rounded-[6px] transition-colors"
                      title="Edit Supplier Profile"
                    >
                      <Pencil size={12} strokeWidth={2.2} />
                    </button>
                    <button
                      type="button"
                      onClick={() => openLedger(supplier)}
                      className="px-2 py-0.5 rounded-[6px] bg-[#01a9fb] hover:bg-[#0098e6] text-white text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-0.5 shadow-xs"
                    >
                      <span>Ledger</span>
                      <ArrowRight size={9} strokeWidth={3} />
                    </button>
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1 mb-0.5">
                    <h3 className="text-xs font-black text-slate-900 truncate group-hover:text-[#fe569f] transition-colors leading-tight">
                      {supplier.name}
                    </h3>
                  </div>

                  <p className="text-[10px] font-semibold text-slate-500 flex items-center gap-1 truncate">
                    <Phone size={10} strokeWidth={2.2} className="text-slate-400 shrink-0" />
                    <span className="truncate">{supplier.contactPerson || supplier.phone}</span>
                  </p>
                  {supplier.location && (
                    <p className="text-[9px] font-semibold text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                      <MapPin size={9} strokeWidth={2.2} className="text-slate-400 shrink-0" />
                      <span className="truncate">{supplier.location}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Card Footer */}
              <div className="grid grid-cols-2 gap-1 pt-2 border-t border-slate-100 mt-2 text-[9px] sm:text-[10px]">
                <div>
                  <p className="font-extrabold text-slate-400 uppercase tracking-wider text-[8px]">Catalog</p>
                  <p className="font-black text-slate-900 truncate">{stats.productCount} SKUs</p>
                </div>
                <div className="text-right">
                  <p className="font-extrabold text-slate-400 uppercase tracking-wider text-[8px]">Balance Due</p>
                  <p className={`font-black font-mono truncate ${stats.totalDue > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                    {formatCurrency(stats.totalDue)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredSuppliers.length === 0 && (
        <div className="py-14 text-center bg-white rounded-[6px] border border-slate-200/80 shadow-xs">
          <div className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-[6px] flex items-center justify-center text-slate-400 mx-auto mb-3">
            <Building2 size={22} strokeWidth={2} />
          </div>
          <p className="text-slate-700 text-sm font-extrabold">No suppliers found</p>
          <p className="text-slate-400 text-xs mt-0.5">Try searching with another vendor name</p>
        </div>
      )}

      {/* ── Add/Edit Supplier Modal ── */}
      <Modal isOpen={isAddModalOpen} onClose={() => { setIsAddModalOpen(false); setEditingSupplier(null); }} title={editingSupplier ? "Edit Supplier Profile" : "Register New Supplier"}>
        <form onSubmit={handleAddSupplier} className="space-y-3.5">
          <div className="space-y-1">
            <label className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">Company Name *</label>
            <input name="name" defaultValue={editingSupplier?.name || ''} required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#01a9fb] rounded-[6px] outline-none font-bold text-xs text-slate-900" placeholder="e.g. ABC Textiles Pvt Ltd" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">Contact Person *</label>
              <input name="contactPerson" defaultValue={editingSupplier?.contactPerson || ''} required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#01a9fb] rounded-[6px] outline-none font-bold text-xs text-slate-900" placeholder="Name" />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">Phone *</label>
              <input name="phone" defaultValue={editingSupplier?.phone || ''} required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#01a9fb] rounded-[6px] outline-none font-bold text-xs text-slate-900" placeholder="Phone number" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">Email Address</label>
            <input name="email" type="email" defaultValue={editingSupplier?.email || ''} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#01a9fb] rounded-[6px] outline-none font-bold text-xs text-slate-900" placeholder="email@company.com" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">Location / City</label>
              <input name="location" defaultValue={editingSupplier?.location || ''} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#01a9fb] rounded-[6px] outline-none font-bold text-xs text-slate-900" placeholder="City or Region" />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">Category</label>
              <input name="category" defaultValue={editingSupplier?.category || ''} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#01a9fb] rounded-[6px] outline-none font-bold text-xs text-slate-900" placeholder="e.g. Traditional Wear, Western" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">Address</label>
            <textarea name="address" defaultValue={editingSupplier?.address || ''} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#01a9fb] rounded-[6px] outline-none font-bold text-xs text-slate-900 h-16 resize-none" placeholder="Full office address"></textarea>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => { setIsAddModalOpen(false); setEditingSupplier(null); }} className="flex-1 py-2.5 rounded-[6px] font-bold uppercase tracking-wider text-xs text-slate-600 hover:bg-slate-50 border border-slate-200">Cancel</button>
            <button type="submit" className="flex-1 py-2.5 rounded-[6px] font-extrabold uppercase tracking-wider text-xs bg-[#fe569f] hover:bg-[#eb4890] text-white shadow-xs">
              {editingSupplier ? "Update Supplier" : "Save Supplier"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Ledger Modal ── */}
      {selectedSupplier && (
        <Modal isOpen={isLedgerOpen} onClose={() => { setIsLedgerOpen(false); setSelectedSupplier(null); }} title={`${selectedSupplier.name} - Purchase Bills Ledger`} size="lg">
          <div className="space-y-4 text-left">
            <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-lg border border-slate-200">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Purchase Bills & Outstanding</h3>
                <p className="text-xs font-bold text-slate-500 mt-0.5">Total Outstanding Due: <span className="text-rose-600 font-extrabold font-mono">{formatCurrency(getSupplierStats(selectedSupplier.id).totalDue)}</span></p>
              </div>
              <button
                onClick={() => setIsAddBillOpen(true)}
                className="px-3 py-1.5 bg-slate-900 hover:bg-purple-600 text-white rounded-md text-xs font-extrabold uppercase tracking-wider transition-all flex items-center gap-1 shadow-xs"
              >
                <Plus size={14} strokeWidth={2.5} />
                <span>+ Add Bill</span>
              </button>
            </div>

            {/* Desktop Table View */}
            <div className="bg-white border border-slate-200/80 rounded-lg overflow-hidden shadow-xs">
              <div className="overflow-x-auto max-h-[55vh]">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-slate-50 border-b border-slate-100 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Bill # & Items</th>
                      <th className="px-4 py-3 text-right">Total</th>
                      <th className="px-4 py-3 text-right">Paid</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {getSupplierStats(selectedSupplier.id).bills.map(bill => (
                      <tr key={bill.id} className="hover:bg-slate-50/70 transition-colors group">
                        <td className="px-4 py-3 font-bold text-slate-900">{new Date(bill.date).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <p className="font-mono font-bold text-slate-900">{bill.billNumber}</p>
                          {bill.items && bill.items.length > 0 && (
                            <p className="text-[10px] text-slate-400 font-semibold truncate max-w-xs">
                              {bill.items.map(i => `${i.quantity}x ${i.itemName}`).join(', ')}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-extrabold text-slate-900">{formatCurrency(bill.totalAmount)}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-600">{formatCurrency(bill.paidAmount)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-md ${bill.status === 'PAID' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            bill.status === 'PARTIAL' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                              'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                            {bill.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setViewingBillDetails(bill)}
                              className="px-2 py-1 text-[10px] font-extrabold uppercase text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition-all flex items-center gap-1"
                            >
                              <Eye size={11} /> Bill
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEditBill(bill)}
                              className="px-2 py-1 text-[10px] font-extrabold uppercase text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-md transition-all flex items-center gap-1"
                            >
                              <Pencil size={11} /> Edit
                            </button>
                            {bill.status !== 'PAID' && (
                              <button
                                onClick={() => { setPaymentBill(bill); setIsPaymentOpen(true); }}
                                className="px-2.5 py-1 text-[10px] font-extrabold uppercase text-white bg-slate-900 hover:bg-purple-600 rounded-md transition-all shadow-xs"
                              >
                                Pay
                              </button>
                            )}
                            {settings?.enableDeleteSuppliers && (
                              <button
                                onClick={() => {
                                  if (window.confirm('Delete this bill?')) deleteSupplierBill(bill.id);
                                }}
                                className="p-1 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                                title="Delete Bill"
                              >
                                <Trash2 size={13} strokeWidth={2.2} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {getSupplierStats(selectedSupplier.id).bills.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                          No purchase bills recorded for this vendor yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Add Bill Modal ── */}
      <Modal isOpen={isAddBillOpen} onClose={() => setIsAddBillOpen(false)} title="Record New Purchase Bill" size="lg">
        <form onSubmit={handleAddBill} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Bill / Invoice Number *</label>
              <input name="billNumber" required className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-purple-500 rounded-md outline-none font-bold text-xs text-slate-900" placeholder="e.g. INV-2026-001" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Invoice Date *</label>
              <input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-purple-500 rounded-md outline-none font-bold text-xs text-slate-900" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Itemized Line Items</label>
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 space-y-2 max-h-56 overflow-y-auto">
              {billItems.map((item, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <input
                    type="text"
                    required
                    value={item.itemName}
                    onChange={e => updateBillItem(index, 'itemName', e.target.value)}
                    placeholder="Item Description"
                    className="flex-1 px-3 py-2 bg-white rounded-md border border-slate-200 focus:border-purple-500 outline-none font-bold text-xs text-slate-900"
                  />
                  <input
                    type="number"
                    required
                    min="1"
                    value={item.quantity}
                    onChange={e => updateBillItem(index, 'quantity', e.target.value)}
                    placeholder="Qty"
                    className="w-16 px-2.5 py-2 bg-white rounded-md border border-slate-200 focus:border-purple-500 outline-none font-bold text-xs text-slate-900 text-center"
                  />
                  <div className="relative w-28">
                    <IndianRupee className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={e => updateBillItem(index, 'unitPrice', e.target.value)}
                      placeholder="Price"
                      className="w-full pl-6 pr-2 py-2 bg-white rounded-md border border-slate-200 focus:border-purple-500 outline-none font-bold text-xs text-slate-900"
                    />
                  </div>
                  <div className="w-24 text-right font-mono font-extrabold text-xs text-slate-800">
                    {formatCurrency(item.total)}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeBillItemRow(index)}
                    className={`p-1.5 rounded-md transition-colors ${billItems.length > 1 ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50' : 'text-slate-200 cursor-not-allowed'}`}
                  >
                    <Trash2 size={13} strokeWidth={2.5} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addBillItemRow}
                className="w-full py-2 border-2 border-dashed border-slate-200 rounded-md text-xs font-extrabold uppercase tracking-wider text-slate-500 hover:text-purple-600 hover:border-purple-300 hover:bg-purple-50/50 transition-all"
              >
                + Add Another Line Item
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 items-end">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Amount Paid Now</label>
              <div className="relative group">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input name="paidAmount" type="number" min={0} step="0.01" defaultValue={0} className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-purple-500 rounded-md outline-none font-extrabold text-slate-900 text-xs" placeholder="0.00" />
              </div>
            </div>
            <div className="bg-slate-900 text-white p-3 rounded-md flex justify-between items-center shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Bill</span>
              <span className="text-base font-extrabold text-white font-mono">{formatCurrency(billItems.reduce((acc, item) => acc + item.total, 0))}</span>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Remarks / Notes</label>
            <input name="notes" className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-purple-500 rounded-md outline-none font-bold text-slate-900 text-xs" placeholder="Optional notes" />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Bill Document / Scan (Optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setBillImageFile(e.target.files ? e.target.files[0] : null)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-600 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-[10px] file:font-extrabold file:uppercase file:bg-slate-900 file:text-white cursor-pointer"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => { setIsAddBillOpen(false); setBillItems([{ itemName: '', quantity: '1', unitPrice: '', total: 0 }]); setBillImageFile(null); }} className="flex-1 py-2.5 rounded-md font-extrabold uppercase tracking-wider text-xs text-slate-600 hover:bg-slate-50 border border-slate-200" disabled={isUploading}>Cancel</button>
            <button type="submit" className="flex-1 py-2.5 rounded-md font-extrabold uppercase tracking-wider text-xs bg-purple-600 hover:bg-purple-700 text-white shadow-xs" disabled={isUploading}>
              {isUploading ? 'Saving...' : 'Save Bill'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Record Payment Modal ── */}
      {paymentBill && (
        <Modal isOpen={isPaymentOpen} onClose={() => { setIsPaymentOpen(false); setPaymentBill(null); }} title="Record Supplier Payment">
          <form onSubmit={handleRecordPayment} className="space-y-4">
            <div className="p-4 bg-slate-900 text-white rounded-lg space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-400">
                <span>Total Bill</span>
                <span>{formatCurrency(paymentBill.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-emerald-400">
                <span>Already Paid</span>
                <span>{formatCurrency(paymentBill.paidAmount)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                <span className="text-xs font-bold text-slate-400">Balance Due</span>
                <span className="text-xl font-extrabold text-white font-mono">{formatCurrency(paymentBill.totalAmount - paymentBill.paidAmount)}</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Payment Amount *</label>
              <div className="relative group">
                <IndianRupee className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} strokeWidth={2.5} />
                <input
                  name="amount"
                  type="number"
                  max={paymentBill.totalAmount - paymentBill.paidAmount}
                  min={1}
                  required
                  autoFocus
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-purple-500 rounded-md outline-none font-extrabold text-slate-900 text-xs"
                  placeholder="Enter payment amount"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setIsPaymentOpen(false)} className="flex-1 py-2.5 rounded-md font-extrabold uppercase tracking-wider text-xs border border-slate-200 text-slate-600 hover:bg-slate-50">Cancel</button>
              <button type="submit" className="flex-1 py-2.5 rounded-md font-extrabold uppercase tracking-wider text-xs bg-purple-600 hover:bg-purple-700 text-white shadow-xs">Record Payment</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Edit Bill Modal ── */}
      {editingBill && (
        <Modal isOpen={isEditBillOpen} onClose={() => { setIsEditBillOpen(false); setEditingBill(null); setBillItems([{ itemName: '', quantity: '1', unitPrice: '', total: 0 }]); setBillImageFile(null); }} title={`Edit Bill #${editingBill.billNumber}`} size="lg">
          <form onSubmit={handleUpdateBill} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Bill Number *</label>
                <input name="billNumber" required defaultValue={editingBill.billNumber} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-purple-500 rounded-md outline-none font-bold text-xs text-slate-900" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Date *</label>
                <input name="date" type="date" required defaultValue={editingBill.date} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-purple-500 rounded-md outline-none font-bold text-xs text-slate-900" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Bill Items</label>
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 space-y-2 max-h-56 overflow-y-auto">
                {billItems.map((item, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <input
                      type="text"
                      required
                      value={item.itemName}
                      onChange={e => updateBillItem(index, 'itemName', e.target.value)}
                      placeholder="Item Description"
                      className="flex-1 px-3 py-2 bg-white rounded-md border border-slate-200 focus:border-purple-500 outline-none font-bold text-xs text-slate-900"
                    />
                    <input
                      type="number"
                      required
                      min="1"
                      value={item.quantity}
                      onChange={e => updateBillItem(index, 'quantity', e.target.value)}
                      placeholder="Qty"
                      className="w-16 px-2.5 py-2 bg-white rounded-md border border-slate-200 focus:border-purple-500 outline-none font-bold text-xs text-slate-900 text-center"
                    />
                    <div className="relative w-28">
                      <IndianRupee className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={e => updateBillItem(index, 'unitPrice', e.target.value)}
                        placeholder="Price"
                        className="w-full pl-6 pr-2 py-2 bg-white rounded-md border border-slate-200 focus:border-purple-500 outline-none font-bold text-xs text-slate-900"
                      />
                    </div>
                    <div className="w-24 text-right font-mono font-extrabold text-xs text-slate-800">
                      {formatCurrency(item.total)}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeBillItemRow(index)}
                      className={`p-1.5 rounded-md transition-colors ${billItems.length > 1 ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50' : 'text-slate-200 cursor-not-allowed'}`}
                    >
                      <Trash2 size={13} strokeWidth={2.5} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addBillItemRow}
                  className="w-full py-2 border-2 border-dashed border-slate-200 rounded-md text-xs font-extrabold uppercase tracking-wider text-slate-500 hover:text-purple-600 hover:border-purple-300 hover:bg-purple-50/50 transition-all"
                >
                  + Add Line Item
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 items-end">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Amount Paid</label>
                <div className="relative group">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input name="paidAmount" type="number" min={0} step="0.01" defaultValue={editingBill.paidAmount} className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-purple-500 rounded-md outline-none font-extrabold text-slate-900 text-xs" />
                </div>
              </div>
              <div className="bg-slate-900 text-white p-3 rounded-md flex justify-between items-center shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Bill</span>
                <span className="text-base font-extrabold text-white font-mono">{formatCurrency(billItems.reduce((acc, item) => acc + item.total, 0))}</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Remarks / Notes</label>
              <input name="notes" defaultValue={editingBill.notes || ''} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-purple-500 rounded-md outline-none font-bold text-slate-900 text-xs" />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Bill Document / Scan</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setBillImageFile(e.target.files ? e.target.files[0] : null)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-600 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-[10px] file:font-extrabold file:uppercase file:bg-slate-900 file:text-white cursor-pointer"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => { setIsEditBillOpen(false); setEditingBill(null); setBillItems([{ itemName: '', quantity: '1', unitPrice: '', total: 0 }]); setBillImageFile(null); }} className="flex-1 py-2.5 rounded-md font-extrabold uppercase tracking-wider text-xs text-slate-600 hover:bg-slate-50 border border-slate-200" disabled={isUploading}>Cancel</button>
              <button type="submit" className="flex-1 py-2.5 rounded-md font-extrabold uppercase tracking-wider text-xs bg-purple-600 hover:bg-purple-700 text-white shadow-xs" disabled={isUploading}>
                {isUploading ? 'Updating...' : 'Update Bill'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── View Bill Details Modal ── */}
      {viewingBillDetails && (
        <Modal
          isOpen={!!viewingBillDetails}
          onClose={() => setViewingBillDetails(null)}
          title={`Bill Details: #${viewingBillDetails.billNumber}`}
          size="lg"
        >
          <div className="space-y-4 text-left">
            <div className="p-4 bg-slate-900 text-white rounded-lg flex justify-between items-center shadow-xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Supplier Purchase Bill</span>
                <h3 className="text-base font-extrabold text-white tracking-tight">{viewingBillDetails.billNumber}</h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Date: {viewingBillDetails.date} • {selectedSupplier?.name || 'Vendor'}</p>
              </div>
              <span className={`inline-block px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider rounded-md ${viewingBillDetails.status === 'PAID' ? 'bg-emerald-500 text-white' :
                viewingBillDetails.status === 'PARTIAL' ? 'bg-amber-500 text-white' :
                  'bg-rose-500 text-white'
                }`}>
                {viewingBillDetails.status}
              </span>
            </div>

            {viewingBillDetails.items && viewingBillDetails.items.length > 0 ? (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-extrabold text-[10px] uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-2.5">Item Description</th>
                      <th className="px-4 py-2.5 text-center">Qty</th>
                      <th className="px-4 py-2.5 text-right">Unit Price</th>
                      <th className="px-4 py-2.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-bold text-slate-800">
                    {viewingBillDetails.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-4 py-2.5 font-extrabold text-slate-900">{item.itemName}</td>
                        <td className="px-4 py-2.5 text-center font-mono">{item.quantity}</td>
                        <td className="px-4 py-2.5 text-right font-mono">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-4 py-2.5 text-right font-mono font-extrabold text-slate-900">{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 rounded-md border border-slate-200 text-slate-400 text-xs italic text-center">
                No line items itemized on this bill.
              </div>
            )}

            <div className="grid grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Total Amount</span>
                <p className="font-mono font-extrabold text-slate-900 text-sm">{formatCurrency(viewingBillDetails.totalAmount)}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Amount Paid</span>
                <p className="font-mono font-extrabold text-emerald-700 text-sm">{formatCurrency(viewingBillDetails.paidAmount)}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Balance Due</span>
                <p className="font-mono font-extrabold text-rose-600 text-sm">{formatCurrency(viewingBillDetails.totalAmount - viewingBillDetails.paidAmount)}</p>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  const b = viewingBillDetails;
                  setViewingBillDetails(null);
                  handleOpenEditBill(b);
                }}
                className="flex-1 py-2.5 rounded-md font-extrabold uppercase tracking-wider text-xs text-purple-700 bg-purple-50 border border-purple-200 hover:bg-purple-100 transition-colors flex items-center justify-center gap-1"
              >
                <Pencil size={13} /> Edit Bill
              </button>
              {viewingBillDetails.status !== 'PAID' && (
                <button
                  type="button"
                  onClick={() => {
                    const b = viewingBillDetails;
                    setViewingBillDetails(null);
                    setPaymentBill(b);
                    setIsPaymentOpen(true);
                  }}
                  className="flex-1 py-2.5 rounded-md font-extrabold uppercase tracking-wider text-xs bg-purple-600 hover:bg-purple-700 text-white shadow-xs flex items-center justify-center gap-1"
                >
                  <CreditCard size={13} /> Pay Balance ({formatCurrency(viewingBillDetails.totalAmount - viewingBillDetails.paidAmount)})
                </button>
              )}
              <button
                type="button"
                onClick={() => setViewingBillDetails(null)}
                className="py-2.5 px-4 rounded-md font-extrabold uppercase tracking-wider text-xs text-slate-600 border border-slate-200 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Suppliers;
