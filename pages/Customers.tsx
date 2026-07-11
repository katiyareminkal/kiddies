
import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { useApp } from '../store/AppContext';
import { Card, Button, Modal } from '../components/Shared';
import { CustomerFormModal } from '../components/forms/CustomerFormModal';
import { 
  Search, 
  Plus, 
  Phone, 
  Mail, 
  MapPin, 
  ArrowLeft, 
  ArrowRight,
  FileText, 
  RefreshCcw, 
  ShoppingBag, 
  TrendingUp, 
  Calendar,
  Banknote,
  IndianRupee,
  User,
  Star,
  Printer,
  Eye,
  Trash2
} from 'lucide-react';
import { formatCurrency, getStatusColor } from '../utils/helpers';
import { Sale, Rental, Customer, PaymentStatus } from '../types';
import { ReturnRentalModal } from '../components/forms/ReturnRentalModal';

const Customers: React.FC = () => {
  const { customers, addCustomer, sales, rentals, products, addPaymentToSale, creditNotes, addCreditNote, consumeStoreCredit, settings, deleteSale, deleteRental, deleteCreditNote } = useApp();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isIssueCreditModalOpen, setIsIssueCreditModalOpen] = useState(false);
  const [isCashOutModalOpen, setIsCashOutModalOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedSaleForPayment, setSelectedSaleForPayment] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [transactionFilter, setTransactionFilter] = useState<'ALL' | 'SALE' | 'RENTAL' | 'CREDIT_NOTE'>('ALL');
  
  // Custom states for view / action handlers
  const [selectedRentalForReturn, setSelectedRentalForReturn] = useState<any>(null);
  const [selectedSaleForDetails, setSelectedSaleForDetails] = useState<any>(null);

  // Derived state for the selected customer's ledger
  const selectedCustomer = useMemo(() => 
    customers.find(c => c.id === selectedCustomerId), 
  [customers, selectedCustomerId]);

  const customerHistory = useMemo(() => {
    if (!selectedCustomerId) return { transactions: [], stats: { totalSpent: 0, activeRentals: 0, totalOrders: 0 } };

    const customerSales = sales.filter(s => s.customerId === selectedCustomerId).map(s => ({
      ...s,
      type: 'SALE' as const,
      sortDate: new Date(s.date)
    }));

    const customerRentals = rentals.filter(r => r.customerId === selectedCustomerId).map(r => ({
      ...r,
      type: 'RENTAL' as const,
      sortDate: new Date(r.date)
    }));

    const customerCNs = creditNotes.filter(cn => cn.customerId === selectedCustomerId).map(cn => ({
      ...cn,
      type: 'CREDIT_NOTE' as const,
      sortDate: new Date(cn.createdAt),
      date: cn.createdAt,
      invoiceNumber: `CN-${cn.id.slice(-6).toUpperCase()}`
    }));

    // Merge and sort by date descending
    const allTransactions = [...customerSales, ...customerRentals, ...customerCNs].sort((a, b) => 
      b.sortDate.getTime() - a.sortDate.getTime()
    );

    const totalSpent = customerSales.reduce((acc, s) => acc + s.totalAmount, 0) + 
                       customerRentals.reduce((acc, r) => acc + r.totalRentAmount, 0);

    const activeRentals = customerRentals.filter(r => r.status === 'ACTIVE').length;

    // Apply Filter
    const visibleTransactions = allTransactions.filter(t => {
      if (transactionFilter === 'ALL') return true;
      return t.type === transactionFilter;
    });

    return {
      transactions: visibleTransactions,
      stats: {
        totalSpent,
        activeRentals,
        totalOrders: customerSales.length + customerRentals.length
      }
    };
  }, [sales, rentals, creditNotes, selectedCustomerId, transactionFilter]);

  const availableCredit = useMemo(() => {
    if (!selectedCustomerId) return 0;
    return creditNotes
      .filter(cn => cn.customerId === selectedCustomerId && cn.status?.toUpperCase() === 'ACTIVE')
      .reduce((sum, cn) => sum + cn.amount, 0);
  }, [creditNotes, selectedCustomerId]);

  const handleIssueCreditNote = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedCustomerId) return;
    const formData = new FormData(e.currentTarget);
    const amount = Number(formData.get('amount'));
    const reason = formData.get('reason') as string;
    
    if (amount > 0 && reason.trim()) {
      try {
        await addCreditNote(selectedCustomerId, amount, reason);
        setIsIssueCreditModalOpen(false);
      } catch (err) {
        alert('Failed to issue credit note.');
      }
    }
  };

  const handleCashOutStoreCredit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedCustomerId) return;
    const formData = new FormData(e.currentTarget);
    const amount = Number(formData.get('amount'));
    
    if (amount > 0) {
      if (amount > availableCredit) {
        alert("Cannot cash out more than available store credit balance.");
        return;
      }
      try {
        await consumeStoreCredit(selectedCustomerId, amount, 'CASH-OUT');
        setIsCashOutModalOpen(false);
      } catch (err) {
        alert('Failed to process cash payout.');
      }
    }
  };



  const handleRecordPayment = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const amount = Number(formData.get('amount'));
    if (selectedSaleForPayment && amount > 0) {
      addPaymentToSale(selectedSaleForPayment, amount);
      setIsPaymentModalOpen(false);
      setSelectedSaleForPayment(null);
    }
  };

  const openPaymentModal = (saleId: string) => {
    setSelectedSaleForPayment(saleId);
    setIsPaymentModalOpen(true);
  };

  // Helper to find selected sale for the modal
  const activePaymentSale = sales.find(s => s.id === selectedSaleForPayment);
  const activePaymentBalance = activePaymentSale ? activePaymentSale.totalAmount - activePaymentSale.paidAmount : 0;

  // Filtered customers with computed stats for the list view
  const filteredCustomers = useMemo(() => {
     return customers.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.phone.includes(searchTerm)
      ).map(c => {
        // Compute stats on the fly for the list
        const cSales = sales.filter(s => s.customerId === c.id);
        const cRentals = rentals.filter(r => r.customerId === c.id);
        
        const totalSpent = cSales.reduce((acc, s) => acc + s.totalAmount, 0) + 
                           cRentals.reduce((acc, r) => acc + r.totalRentAmount, 0);
        
        const balance = cSales.reduce((acc, s) => acc + (s.totalAmount - s.paidAmount), 0) +
                        cRentals.reduce((acc, r) => acc + (r.totalRentAmount - r.paidAmount), 0);

        const storeCredit = creditNotes
          .filter(cn => cn.customerId === c.id && cn.status?.toUpperCase() === 'ACTIVE')
          .reduce((sum, cn) => sum + cn.amount, 0);
        
        // Find last activity
        const lastSale = cSales[cSales.length - 1]?.date;
        const lastRental = cRentals[cRentals.length - 1]?.date;
        const lastActive = [lastSale, lastRental].filter(Boolean).sort().pop();

        return { ...c, totalSpent, balance, storeCredit, lastActive };
      }).sort((a, b) => b.totalSpent - a.totalSpent); // Sort by highest spender
  }, [customers, sales, rentals, creditNotes, searchTerm]);

  const getVipBadge = (spent: number) => {
      if (spent > 50000) return <span className="flex items-center gap-1 bg-yellow-100 text-yellow-700 text-[10px] font-black px-2 py-0.5 rounded-full border border-yellow-200"><Star size={10} fill="currentColor" /> VIP GOLD</span>;
      if (spent > 10000) return <span className="flex items-center gap-1 bg-gray-100 text-gray-600 text-[10px] font-black px-2 py-0.5 rounded-full border border-gray-200"><Star size={10} /> SILVER</span>;
      return null;
  }

  // -- RENDER: Customer Ledger (Detail View) --
  if (selectedCustomer) {
    return (
      <div className="space-y-4 animate-nano pb-10">
        <div className="flex items-center gap-3 py-2">
          <button 
            onClick={() => setSelectedCustomerId(null)}
            className="p-2 bg-white hover:bg-highlight hover:text-slate-900 rounded-xl transition-all border border-slate-100 group active:scale-95 shadow-sm"
          >
            <ArrowLeft size={16} strokeWidth={2.5} className="group-hover:-translate-x-1 transition-transform" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">{selectedCustomer.name}</h1>
              {getVipBadge(customerHistory.stats.totalSpent)}
            </div>
            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">Customer Ledger</p>
          </div>
        </div>

        {/* Customer Profile & Stats - High Density */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="nano-card p-4 lg:col-span-4">
            <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-4">Contact Profile</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 group">
                <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-900 group-hover:bg-highlight transition-all shadow-sm">
                  <Phone size={14} strokeWidth={2.5} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[7px] font-bold uppercase text-slate-400 tracking-wider">Phone</span>
                  <span className="text-[10px] font-bold text-slate-700">{selectedCustomer.phone}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 group">
                <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-900 group-hover:bg-highlight transition-all shadow-sm">
                  <Mail size={14} strokeWidth={2.5} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[7px] font-bold uppercase text-slate-400 tracking-wider">Email</span>
                  <span className="text-[10px] font-bold text-slate-700">{selectedCustomer.email}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 group">
                <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-900 group-hover:bg-highlight transition-all shadow-sm">
                  <MapPin size={14} strokeWidth={2.5} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[7px] font-bold uppercase text-slate-400 tracking-wider">Address</span>
                  <span className="text-[10px] font-bold text-slate-700 leading-tight">{selectedCustomer.address}</span>
                </div>
              </div>
              {selectedCustomer.gstin && (
                <div className="pt-3 border-t border-slate-50">
                   <p className="text-[7px] text-slate-400 uppercase font-bold tracking-widest">GSTIN / Tax ID</p>
                   <p className="font-mono text-[9px] font-bold text-slate-900 mt-1.5 bg-slate-50 px-2 py-1 rounded-lg inline-block border border-slate-100">{selectedCustomer.gstin}</p>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="nano-card p-5 bg-slate-900 text-white relative overflow-hidden group shadow-lg">
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4 text-slate-400 group-hover:text-highlight transition-colors">
                  <TrendingUp size={14} strokeWidth={2.5} />
                  <span className="text-[9px] font-bold uppercase tracking-widest">Lifetime Value</span>
                </div>
                <p className="text-2xl font-bold tracking-tight">{formatCurrency(customerHistory.stats.totalSpent)}</p>
                <div className="mt-4 flex items-center gap-2">
                  <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-highlight rounded-full" style={{ width: '75%' }}></div>
                  </div>
                </div>
              </div>
              <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-slate-800/50 rounded-full blur-2xl group-hover:bg-highlight/10 transition-all"></div>
            </div>

            <div className="nano-card p-5 bg-emerald-950 text-white relative overflow-hidden group shadow-lg flex flex-col justify-between">
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4 text-emerald-300">
                  <Banknote size={14} strokeWidth={2.5} />
                  <span className="text-[9px] font-bold uppercase tracking-widest">Store Credit</span>
                </div>
                <p className="text-2xl font-bold text-highlight tracking-tight">{formatCurrency(availableCredit)}</p>
                <div className="flex gap-2 mt-3">
                  <button 
                    onClick={() => setIsIssueCreditModalOpen(true)}
                    className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-lg text-[8px] font-black uppercase tracking-widest transition-all"
                  >
                    Issue Credit
                  </button>
                  {availableCredit > 0 && (
                    <button 
                      onClick={() => setIsCashOutModalOpen(true)}
                      className="px-3 py-1.5 bg-rose-800 hover:bg-rose-700 text-white rounded-lg text-[8px] font-black uppercase tracking-widest transition-all"
                    >
                      Cash Out
                    </button>
                  )}
                </div>
              </div>
              <div className="relative z-10 mt-3 pt-3 border-t border-emerald-900/50">
                <p className="text-[7px] text-emerald-300/80 uppercase font-black tracking-wider leading-relaxed">
                  💡 How to use: Select this customer on the Sales page & toggle "Apply Store Credit" at checkout.
                </p>
              </div>
              <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-emerald-900/50 rounded-full blur-2xl group-hover:bg-highlight/10 transition-all"></div>
            </div>

            <div className="nano-card p-5 group hover:bg-slate-900 transition-all duration-500">
              <div className="flex items-center gap-2 mb-4 text-slate-400 group-hover:text-slate-500 transition-colors">
                <RefreshCcw size={14} strokeWidth={2.5} />
                <span className="text-[9px] font-bold uppercase tracking-widest">Active Rentals</span>
              </div>
              <p className="text-2xl font-bold text-slate-900 group-hover:text-white transition-colors">{customerHistory.stats.activeRentals}</p>
              <p className="text-[9px] font-bold uppercase text-slate-400 mt-2 group-hover:text-slate-500 transition-colors">Possessions</p>
            </div>

            <div className="nano-card p-5 group hover:bg-slate-900 transition-all duration-500">
              <div className="flex items-center gap-2 mb-4 text-slate-400 group-hover:text-slate-500 transition-colors">
                <ShoppingBag size={14} strokeWidth={2.5} />
                <span className="text-[9px] font-bold uppercase tracking-widest">Total Orders</span>
              </div>
              <p className="text-2xl font-bold text-slate-900 group-hover:text-white transition-colors">{customerHistory.stats.totalOrders}</p>
              <p className="text-[9px] font-bold uppercase text-slate-400 mt-2 group-hover:text-slate-500 transition-colors">Transactions</p>
            </div>
          </div>
        </div>

        {/* Transaction History Table - High Density */}
        <div className="nano-card overflow-hidden">
          <div className="p-6 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
             <div className="flex items-center gap-6">
               <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-900">Transaction Ledger</h3>
               <div className="flex bg-slate-50 p-1 rounded-2xl border border-slate-100">
                  {(['ALL', 'SALE', 'RENTAL', 'CREDIT_NOTE'] as const).map(filter => (
                    <button 
                      key={filter}
                      onClick={() => setTransactionFilter(filter)} 
                      className={`px-6 py-2 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all ${transactionFilter === filter ? 'bg-highlight text-slate-900 shadow-banana' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      {filter === 'ALL' ? 'All' : filter === 'SALE' ? 'Sales' : filter === 'RENTAL' ? 'Rentals' : 'Credits'}
                    </button>
                  ))}
               </div>
             </div>
          </div>
          <div className="overflow-x-auto hide-scrollbar">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-100">
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider">Date & Inv</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider">Type</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider">Details</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-right">Amount</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-center">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {customerHistory.transactions.map((t: any) => {
                  const isSale = t.type === 'SALE';
                  const isRental = t.type === 'RENTAL';
                  const isCreditNote = t.type === 'CREDIT_NOTE';

                  const productName = isSale 
                    ? t.items.map((item: any) => `${item.quantity}x ${item.name}`).join(', ')
                    : isRental 
                    ? products.find(p => p.id === t.productId)?.name || 'Unknown Product'
                    : t.status?.toUpperCase() === 'USED'
                    ? `Credit Consumed: ${t.reason}`
                    : `Credit Issued: ${t.reason}`;

                  const dateRange = isRental 
                    ? `${format(new Date(t.startDate), 'dd MMM')} - ${format(new Date(t.expectedReturnDate), 'dd MMM yyyy')}`
                    : '';
                  
                  const total = isSale ? t.totalAmount : isRental ? t.totalRentAmount : t.amount;
                  const paid = t.paidAmount || 0;
                  const balance = total - paid;
                  
                  return (
                    <tr key={t.id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 text-xs">{format(new Date(t.date || t.createdAt), 'dd MMM yyyy')}</span>
                          <span className="text-[9px] font-bold text-slate-400 font-mono mt-0.5">{t.invoiceNumber}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                         {isSale ? (
                           <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black tracking-wider bg-indigo-50 text-indigo-700 uppercase border border-indigo-100">
                             <ShoppingBag size={11} strokeWidth={2.5} /> Sale
                           </span>
                         ) : isRental ? (
                           <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black tracking-wider bg-slate-900 text-highlight uppercase shadow-nano">
                             <RefreshCcw size={11} strokeWidth={2.5} /> Rental
                           </span>
                         ) : (
                           <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black tracking-wider bg-emerald-50 text-emerald-700 uppercase border border-emerald-100">
                             <Banknote size={11} strokeWidth={2.5} /> Credit
                           </span>
                         )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col max-w-xs md:max-w-sm">
                          <span className="font-bold text-slate-800 text-xs truncate" title={productName}>{productName}</span>
                          {!isSale && !isCreditNote && (
                            <div className="text-[9px] text-slate-400 mt-1 flex items-center gap-1.5 font-bold uppercase tracking-wider">
                               <Calendar size={10} strokeWidth={2.5} />
                               {dateRange} ({t.quantity} unit{t.quantity > 1 ? 's' : ''})
                            </div>
                          )}
                          {isCreditNote && t.status?.toUpperCase() === 'USED' && t.usedAt && (
                            <div className="text-[8px] text-slate-400 mt-0.5 font-bold uppercase tracking-wider">
                              Consumed: {format(new Date(t.usedAt), 'dd MMM yyyy')}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                          <div className="flex flex-col items-end">
                              {!isCreditNote && (
                                 <span className="font-mono font-bold text-slate-900 text-xs">{formatCurrency(total)}</span>
                              )}
                              {isSale && balance > 0 && (
                                 <span className="text-[9px] font-bold text-rose-500 uppercase tracking-wider mt-0.5">
                                    Bal Due: {formatCurrency(balance)}
                                 </span>
                              )}
                              {isSale && balance <= 0 && (
                                 <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded uppercase tracking-wider mt-0.5 border border-emerald-100">
                                    Fully Paid
                                 </span>
                              )}
                              {isCreditNote && (
                                 <span className={`text-[10px] font-bold font-mono ${
                                   t.status?.toUpperCase() === 'USED' 
                                     ? 'text-slate-400 line-through' 
                                     : t.amount < 0 
                                     ? 'text-rose-600' 
                                     : 'text-emerald-600'
                                 }`}>
                                    {t.status?.toUpperCase() === 'USED' 
                                      ? '' 
                                      : t.amount < 0 
                                      ? '' 
                                      : '+'
                                    }{formatCurrency(t.amount)} {t.status?.toUpperCase() === 'USED' && '(Consumed)'}
                                 </span>
                              )}
                          </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                         <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                            isSale 
                              ? t.paymentStatus === PaymentStatus.PAID 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                : t.paymentStatus === PaymentStatus.PARTIAL
                                ? 'bg-amber-50 text-amber-700 border border-amber-100'
                                : 'bg-rose-50 text-rose-700 border border-rose-100'
                              : isRental 
                              ? getStatusColor(t.status) 
                              : t.status?.toUpperCase() === 'ACTIVE' 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                              : 'bg-slate-50 text-slate-400 border border-slate-100'
                         }`}>
                            {isSale ? t.paymentStatus : isRental ? t.status : t.status}
                         </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                         <div className="flex justify-end gap-2">
                           {isSale && (
                             <button 
                               onClick={() => setSelectedSaleForDetails(t)}
                               className="text-[9px] font-black uppercase tracking-widest text-slate-600 hover:text-slate-900 bg-slate-50 border border-slate-100 px-3.5 py-2.5 rounded-xl transition-all shadow-nano active:scale-95 flex items-center gap-1"
                             >
                               <Eye size={10} /> View Bill
                             </button>
                           )}
                           {isSale && t.paymentStatus !== PaymentStatus.PAID && (
                             <button 
                               onClick={() => openPaymentModal(t.id)}
                               className="text-[9px] font-black uppercase tracking-widest text-slate-900 hover:bg-highlight bg-slate-50 border border-slate-100 px-3.5 py-2.5 rounded-xl transition-all shadow-nano active:scale-95"
                             >
                               Record Payment
                             </button>
                           )}
                           {isRental && t.status === 'ACTIVE' && (
                             <button 
                               onClick={() => setSelectedRentalForReturn(t)}
                               className="text-[9px] font-black uppercase tracking-widest text-rose-600 hover:bg-rose-100 bg-rose-50 border border-rose-100 px-3.5 py-2.5 rounded-xl transition-all shadow-nano active:scale-95"
                             >
                               Return Item
                             </button>
                           )}
                           {settings.allowLedgerDeletions && (
                              <button 
                                onClick={async () => {
                                  if (window.confirm("Are you sure you want to permanently delete this transaction from the database? This cannot be undone.")) {
                                    try {
                                      if (isSale) await deleteSale(t.id);
                                      else if (isRental) await deleteRental(t.id);
                                      else if (isCreditNote) await deleteCreditNote(t.id);
                                    } catch (err) {
                                      alert("Failed to delete transaction.");
                                    }
                                  }
                                }}
                                className="text-[9px] font-black uppercase tracking-widest text-rose-600 hover:bg-rose-100 bg-rose-50 border border-slate-100 px-2.5 py-2.5 rounded-xl transition-all shadow-nano active:scale-95 flex items-center justify-center"
                                title="Delete Transaction"
                              >
                                <Trash2 size={11} strokeWidth={2.5} />
                              </button>
                            )}
                         </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {customerHistory.transactions.length === 0 && (
              <div className="py-24 text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-200 mx-auto mb-4">
                  <FileText size={32} strokeWidth={1.5} />
                </div>
                <p className="text-slate-400 font-black uppercase tracking-widest text-[9px]">No transaction history found</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Payment Modal */}
        <Modal 
           isOpen={isPaymentModalOpen} 
           onClose={() => { setIsPaymentModalOpen(false); setSelectedSaleForPayment(null); }} 
           title={`Record Payment: ${activePaymentSale?.invoiceNumber}`}
        >
           <form onSubmit={handleRecordPayment} className="space-y-6">
              <div className="p-6 bg-slate-900 text-white rounded-3xl space-y-3 shadow-banana">
                 <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-400">
                    <span>Total Invoice</span>
                    <span>{formatCurrency(activePaymentSale?.totalAmount || 0)}</span>
                 </div>
                 <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-highlight">
                    <span>Already Paid</span>
                    <span>{formatCurrency(activePaymentSale?.paidAmount || 0)}</span>
                 </div>
                 <div className="flex justify-between items-center pt-3 border-t border-slate-800">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Balance Due</span>
                    <span className="text-2xl font-display font-black text-highlight">{formatCurrency(activePaymentBalance)}</span>
                 </div>
              </div>

              <div className="space-y-2">
                 <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-2">Payment Amount</label>
                 <div className="relative group">
                    <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" size={18} strokeWidth={3} />
                    <input 
                      name="amount" 
                      type="number" 
                      max={activePaymentBalance}
                      min={1}
                      required 
                      autoFocus
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-transparent focus:bg-white focus:border-highlight/30 rounded-2xl outline-none transition-all font-black text-slate-900 text-[11px]" 
                      placeholder="Enter amount" 
                    />
                 </div>
                 <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest ml-2">Max: {formatCurrency(activePaymentBalance)}</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                 <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="w-full sm:flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-[9px] border border-slate-100 text-slate-400">Cancel</button>
                 <button type="submit" className="banana-btn w-full sm:flex-1 h-14 text-[9px]">Record Payment</button>
              </div>
            </form>
         </Modal>

         {/* Ledger Sale Details Modal */}
         <Modal
            isOpen={!!selectedSaleForDetails}
            onClose={() => setSelectedSaleForDetails(null)}
            title={selectedSaleForDetails ? `Invoice: ${selectedSaleForDetails.invoiceNumber}` : 'Invoice Details'}
         >
            {selectedSaleForDetails && (
              <div className="space-y-6">
                <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  <div>
                    <p>Date: {format(new Date(selectedSaleForDetails.date), 'dd MMM yyyy, hh:mm a')}</p>
                    <p className="mt-1">Status: {selectedSaleForDetails.orderStatus}</p>
                  </div>
                  <div className="text-right">
                    <p>Channel: {selectedSaleForDetails.channel}</p>
                    <p className="mt-1">Method: {selectedSaleForDetails.paymentMethod}</p>
                  </div>
                </div>

                <div className="space-y-3 text-left">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Items Details</h4>
                  <div className="divide-y divide-slate-100">
                    {selectedSaleForDetails.items.map((item: any, i: number) => (
                      <div key={i} className="py-2.5 flex justify-between items-center text-xs font-bold text-slate-900 uppercase">
                        <div>
                          <p>{item.name}</p>
                          <p className="text-[8px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">{item.quantity} x {formatCurrency(item.unitPrice)}</p>
                        </div>
                        <p className="font-mono">{formatCurrency(item.total)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-left">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-mono text-slate-900">{formatCurrency(selectedSaleForDetails.totalAmount)}</span>
                  </div>
                  {selectedSaleForDetails.discount > 0 && (
                    <div className="flex justify-between text-rose-500">
                      <span>Discount</span>
                      <span className="font-mono">-{formatCurrency(selectedSaleForDetails.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-900 text-xs font-black pt-2 border-t border-slate-50">
                    <span>Total Paid</span>
                    <span className="font-mono">{formatCurrency(selectedSaleForDetails.netPayout)}</span>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button 
                    type="button" 
                    onClick={() => setSelectedSaleForDetails(null)} 
                    className="flex-1 h-12 rounded-xl text-[9px] font-black uppercase tracking-widest border border-slate-100 text-slate-400"
                  >
                    Close
                  </button>
                  <button 
                    type="button" 
                    onClick={() => {
                      const printWindow = window.open('', '_blank');
                      if (!printWindow) return;
                      const printHtml = `
                        <html>
                          <head>
                            <title>Receipt ${selectedSaleForDetails.invoiceNumber}</title>
                            <style>
                              body { font-family: monospace; padding: 20px; font-size: 14px; }
                              table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                              th, td { text-align: left; padding: 5px 0; }
                              .total { font-weight: bold; font-size: 16px; text-align: right; margin-top: 15px; }
                              .center { text-align: center; }
                            </style>
                          </head>
                          <body onload="window.print()">
                            <h2 class="center">Kiddies Store</h2>
                            <p class="center">Inv: ${selectedSaleForDetails.invoiceNumber}<br/>Date: ${format(new Date(selectedSaleForDetails.date), 'dd MMM yyyy, hh:mm a')}</p>
                            <hr style="border: 1px dashed #000;" />
                            <table>
                              ${selectedSaleForDetails.items.map((item: any) => `
                                <tr>
                                  <td>${item.name} (${item.quantity}x)</td>
                                  <td style="text-align: right;">${formatCurrency(item.total)}</td>
                                </tr>
                              `).join('')}
                            </table>
                            <hr style="border: 1px dashed #000;" />
                            <div class="total">Total: ${formatCurrency(selectedSaleForDetails.netPayout)}</div>
                          </body>
                        </html>
                      `;
                      printWindow.document.write(printHtml);
                      printWindow.document.close();
                    }}
                    className="banana-btn flex-1 h-12 text-[9px] flex items-center justify-center gap-1.5"
                  >
                    <Printer size={12} /> Print Bill
                  </button>
                </div>
              </div>
            )}
         </Modal>

         {/* Return Rental Modal */}
         <ReturnRentalModal 
            isOpen={!!selectedRentalForReturn} 
            onClose={() => setSelectedRentalForReturn(null)} 
            rental={selectedRentalForReturn} 
         />

         {/* Issue Credit Note Modal */}
         <Modal 
            isOpen={isIssueCreditModalOpen} 
            onClose={() => setIsIssueCreditModalOpen(false)} 
            title={selectedCustomer ? `Issue Credit Note: ${selectedCustomer.name}` : 'Issue Credit Note'}
         >
            <form onSubmit={handleIssueCreditNote} className="space-y-6">
               <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-2">Credit Amount (₹)</label>
                  <input 
                    name="amount" 
                    type="number" 
                    min={1}
                    required 
                    className="w-full px-4 py-3.5 bg-slate-50 border border-transparent focus:bg-white focus:border-highlight/30 rounded-2xl outline-none transition-all font-black text-slate-900 text-[11px]" 
                    placeholder="e.g. 500" 
                  />
               </div>
               <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-2">Reason / Description</label>
                  <textarea 
                    name="reason" 
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-transparent focus:bg-white focus:border-highlight/30 rounded-2xl outline-none transition-all font-black text-slate-900 text-[10px] min-h-[80px] resize-none" 
                    placeholder="e.g. Returned defect product" 
                  />
               </div>

               <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <button type="button" onClick={() => setIsIssueCreditModalOpen(false)} className="w-full sm:flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-[9px] border border-slate-100 text-slate-400">Cancel</button>
                  <button type="submit" className="banana-btn w-full sm:flex-1 h-14 text-[9px]">Issue Credit</button>
               </div>
            </form>
         </Modal>

         {/* Cash Out Store Credit Modal */}
         <Modal 
            isOpen={isCashOutModalOpen} 
            onClose={() => setIsCashOutModalOpen(false)} 
            title={selectedCustomer ? `Cash Out Credit: ${selectedCustomer.name}` : 'Cash Out Credit'}
         >
            <form onSubmit={handleCashOutStoreCredit} className="space-y-6">
               <div className="p-6 bg-rose-950 text-white rounded-3xl space-y-3 shadow-banana">
                  <div className="flex justify-between items-center">
                     <span className="text-[10px] font-black uppercase tracking-widest text-rose-300">Available Credit Balance</span>
                     <span className="text-2xl font-display font-black text-highlight">{formatCurrency(availableCredit)}</span>
                  </div>
               </div>

               <div className="space-y-2 text-left">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-2">Payout Amount (₹)</label>
                  <input 
                    name="amount" 
                    type="number" 
                    max={availableCredit}
                    min={1}
                    required 
                    className="w-full px-4 py-3.5 bg-slate-50 border border-transparent focus:bg-white focus:border-highlight/30 rounded-2xl outline-none transition-all font-black text-slate-900 text-[11px]" 
                    placeholder="Enter amount to pay out" 
                  />
                  <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest ml-2">Max: {formatCurrency(availableCredit)}</p>
               </div>

               <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <button type="button" onClick={() => setIsCashOutModalOpen(false)} className="w-full sm:flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-[9px] border border-slate-100 text-slate-400">Cancel</button>
                  <button type="submit" className="banana-btn w-full sm:flex-1 h-14 text-[9px] bg-rose-600 hover:bg-rose-500 shadow-rose-500/25">Confirm Payout</button>
               </div>
            </form>
         </Modal>
      </div>
    );
  }

  // -- RENDER: Customer Directory (List View) --
  return (
    <div className="space-y-6 animate-nano pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 font-display tracking-tighter">Customers</h1>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] mt-1">Client Relations</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="banana-btn px-8 py-4 text-[10px]"
        >
          <Plus size={18} strokeWidth={3} className="mr-2 inline-block" /> Add Customer
        </button>
      </div>

      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-slate-900 transition-colors" size={16} strokeWidth={3} />
        <input 
          type="text" 
          placeholder="Search customers..." 
          className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:border-highlight/30 transition-all shadow-nano"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filteredCustomers.map(customer => (
          <div 
            key={customer.id} 
            className="nano-card p-4 group cursor-pointer transition-all duration-300 flex flex-col hover:shadow-lg"
            onClick={() => setSelectedCustomerId(customer.id)}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-slate-50 text-slate-900 rounded-xl flex items-center justify-center font-display font-black text-lg border border-slate-100 group-hover:bg-highlight group-hover:scale-110 transition-all duration-500 shadow-sm shrink-0">
                {customer.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight truncate group-hover:text-highlight transition-colors line-clamp-1">{customer.name}</h4>
                  {getVipBadge(customer.totalSpent)}
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-[9px] font-bold text-slate-500 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-md group-hover:bg-highlight/5 transition-colors border border-slate-50 group-hover:border-highlight/20 w-fit">
                    <Phone size={10} strokeWidth={3} className="text-slate-300 group-hover:text-highlight" />
                    <span>{customer.phone}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-100 mt-auto">
              <div>
                <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Spent</p>
                <p className="text-[10px] font-black text-slate-900 font-mono tracking-tight">{formatCurrency(customer.totalSpent)}</p>
              </div>
              <div>
                <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Dues</p>
                <p className={`text-[10px] font-black font-mono tracking-tight ${customer.balance > 0 ? 'text-rose-500' : 'text-slate-900'}`}>{formatCurrency(customer.balance)}</p>
              </div>
              <div className="text-right">
                <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Store Credit</p>
                <p className={`text-[10px] font-black font-mono tracking-tight ${customer.storeCredit > 0 ? 'text-emerald-600 font-bold' : 'text-slate-900'}`}>{formatCurrency(customer.storeCredit)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

        {filteredCustomers.length === 0 && (
          <div className="py-20 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-200 mx-auto mb-4">
              <User size={32} strokeWidth={1.5} />
            </div>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">No customers found</p>
          </div>
        )}

      <CustomerFormModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
    </div>
  );
};

export default Customers;
