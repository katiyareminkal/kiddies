import React, { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
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
  Trash2,
  Users,
  CreditCard,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { formatCurrency, getStatusColor } from '../utils/helpers';
import { Sale, Rental, Customer, PaymentStatus } from '../types';
import { ReturnRentalModal } from '../components/forms/ReturnRentalModal';

const Customers: React.FC = () => {
  const { customers, addCustomer, deleteCustomer, sales, rentals, products, addPaymentToSale, creditNotes, addCreditNote, consumeStoreCredit, settings, deleteSale, deleteRental, deleteCreditNote } = useApp();
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

    const sortedCNs = creditNotes
      .filter(cn => cn.customerId === selectedCustomerId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    let runningBal = 0;
    const customerCNs = sortedCNs.map(cn => {
      runningBal += cn.amount;
      return {
        ...cn,
        type: 'CREDIT_NOTE' as const,
        sortDate: new Date(cn.createdAt),
        date: cn.createdAt,
        invoiceNumber: `CN-${cn.id.slice(-6).toUpperCase()}`,
        runningBalance: runningBal
      };
    });

    // Merge and sort by date descending
    const allTransactions = [...customerSales, ...customerRentals, ...customerCNs].sort((a, b) =>
      b.sortDate.getTime() - a.sortDate.getTime()
    );

    const totalSpent = customerSales.reduce((acc, s) => acc + (s.totalAmount || 0), 0) +
      customerRentals.reduce((acc, r) => acc + (r.totalRentAmount || 0), 0);

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
  const activePaymentBalance = activePaymentSale ? (activePaymentSale.totalAmount || 0) - (activePaymentSale.paidAmount || 0) : 0;

  // Filtered customers with computed stats for the list view
  const filteredCustomers = useMemo(() => {
    return customers.filter(c =>
      (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.phone || '').includes(searchTerm)
    ).map(c => {
      const cSales = sales.filter(s => s.customerId === c.id);
      const cRentals = rentals.filter(r => r.customerId === c.id);

      const totalSpent = cSales.reduce((acc, s) => acc + (s.totalAmount || 0), 0) +
        cRentals.reduce((acc, r) => acc + (r.totalRentAmount || 0), 0);

      const balance = cSales.reduce((acc, s) => acc + ((s.totalAmount || 0) - (s.paidAmount || 0)), 0) +
        cRentals.reduce((acc, r) => acc + ((r.totalRentAmount || 0) - (r.paidAmount || 0)), 0);

      const storeCredit = creditNotes
        .filter(cn => cn.customerId === c.id && cn.status?.toUpperCase() === 'ACTIVE')
        .reduce((sum, cn) => sum + cn.amount, 0);

      const lastSale = cSales[cSales.length - 1]?.date;
      const lastRental = cRentals[cRentals.length - 1]?.date;
      const lastActive = [lastSale, lastRental].filter(Boolean).sort().pop();

      return { ...c, totalSpent, balance, storeCredit, lastActive };
    }).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [customers, sales, rentals, creditNotes, searchTerm]);

  const getVipBadge = (spent: number) => {
    if (spent > 50000) return (
      <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-amber-200 shadow-xs">
        <Star size={10} className="fill-amber-500 text-amber-500" /> VIP GOLD
      </span>
    );
    if (spent > 10000) return (
      <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-slate-200">
        <Star size={10} className="text-slate-400" /> SILVER
      </span>
    );
    return null;
  };

  if (selectedCustomer) {
    return (
      <div className="space-y-5 animate-nano pb-20 max-w-[1600px] mx-auto">
        <div className="bg-white border border-slate-200/80 rounded-lg p-4 sm:p-5 shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedCustomerId(null)}
              className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-md transition-all border border-slate-200 active:scale-95 shadow-xs"
              title="Back to Customer Directory"
            >
              <ArrowLeft size={16} strokeWidth={2.5} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">{selectedCustomer.name}</h1>
                {getVipBadge(customerHistory.stats.totalSpent)}
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Customer Ledger & Account Statement</p>
            </div>
          </div>

          {settings?.enableDeleteCustomers && (
            <button
              type="button"
              onClick={async () => {
                if (window.confirm(`Delete customer ${selectedCustomer.name} and clear customer profile?`)) {
                  await deleteCustomer(selectedCustomer.id);
                  setSelectedCustomerId(null);
                }
              }}
              className="px-3 py-2 text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-md transition-colors text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5"
              title="Delete Customer Profile"
            >
              <Trash2 size={14} strokeWidth={2.2} />
              <span className="hidden sm:inline">Delete Customer</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="bg-white rounded-lg border border-slate-200/80 p-5 shadow-xs lg:col-span-4 space-y-4">
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Contact Profile</h3>
            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-3 p-2.5 rounded-md bg-slate-50 border border-slate-100">
                <div className="w-8 h-8 rounded bg-white flex items-center justify-center text-slate-700 shadow-xs border border-slate-200">
                  <Phone size={14} strokeWidth={2.5} />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Phone Number</span>
                  <span className="font-extrabold text-slate-800">{selectedCustomer.phone}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 p-2.5 rounded-md bg-slate-50 border border-slate-100">
                <div className="w-8 h-8 rounded bg-white flex items-center justify-center text-slate-700 shadow-xs border border-slate-200">
                  <Mail size={14} strokeWidth={2.5} />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Email Address</span>
                  <span className="font-extrabold text-slate-800">{selectedCustomer.email || 'No email recorded'}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 p-2.5 rounded-md bg-slate-50 border border-slate-100">
                <div className="w-8 h-8 rounded bg-white flex items-center justify-center text-slate-700 shadow-xs border border-slate-200">
                  <MapPin size={14} strokeWidth={2.5} />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Billing Address</span>
                  <span className="font-bold text-slate-800 leading-tight block">{selectedCustomer.address || 'No address recorded'}</span>
                </div>
              </div>

              {selectedCustomer.gstin && (
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">GSTIN / Tax ID</p>
                  <p className="font-mono text-xs font-extrabold text-slate-900 mt-1 bg-slate-50 px-2.5 py-1 rounded border border-slate-200 inline-block">{selectedCustomer.gstin}</p>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
            <div className="bg-slate-900 text-white rounded-lg p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3 text-slate-400">
                  <TrendingUp size={15} strokeWidth={2.5} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Lifetime Value</span>
                </div>
                <p className="text-2xl font-extrabold font-mono tracking-tight">{formatCurrency(customerHistory.stats.totalSpent)}</p>
              </div>
              <p className="text-[10px] text-slate-400 mt-3 pt-3 border-t border-slate-800">Total gross purchases & rentals</p>
            </div>

            <div className="bg-emerald-900 text-white rounded-lg p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3 text-emerald-300">
                  <Banknote size={15} strokeWidth={2.5} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Store Credit</span>
                </div>
                <p className="text-2xl font-extrabold font-mono text-emerald-300 tracking-tight">{formatCurrency(availableCredit)}</p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => setIsIssueCreditModalOpen(true)}
                    className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-[10px] font-extrabold uppercase tracking-wider transition-all"
                  >
                    + Issue
                  </button>
                  {availableCredit > 0 && (
                    <button
                      onClick={() => setIsCashOutModalOpen(true)}
                      className="px-2.5 py-1 bg-rose-700 hover:bg-rose-600 text-white rounded text-[10px] font-extrabold uppercase tracking-wider transition-all"
                    >
                      Cash Out
                    </button>
                  )}
                </div>
              </div>
              <p className="text-[9px] text-emerald-200/80 mt-3 pt-2 border-t border-emerald-800/60 leading-tight">
                Applicable during checkout
              </p>
            </div>

            <div className="bg-white rounded-lg border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3 text-slate-500">
                  <RefreshCcw size={15} strokeWidth={2.5} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Active Rentals</span>
                </div>
                <p className="text-2xl font-extrabold text-slate-900 tracking-tight">{customerHistory.stats.activeRentals}</p>
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-3 pt-3 border-t border-slate-100">Out on lease</p>
            </div>

            <div className="bg-white rounded-lg border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3 text-slate-500">
                  <ShoppingBag size={15} strokeWidth={2.5} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Total Orders</span>
                </div>
                <p className="text-2xl font-extrabold text-slate-900 tracking-tight">{customerHistory.stats.totalOrders}</p>
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-3 pt-3 border-t border-slate-100">Historical orders</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">Transaction Statement Ledger</h3>
            <div className="inline-flex bg-slate-100 p-1 rounded-md border border-slate-200/70 shrink-0">
              {(['ALL', 'SALE', 'RENTAL', 'CREDIT_NOTE'] as const).map(filter => (
                <button
                  key={filter}
                  onClick={() => setTransactionFilter(filter)}
                  className={`px-3 py-1 rounded text-xs font-bold transition-all ${transactionFilter === filter
                    ? 'bg-white text-slate-900 shadow-xs font-extrabold'
                    : 'text-slate-500 hover:text-slate-800'
                    }`}
                >
                  {filter === 'ALL' ? 'All Transactions' : filter === 'SALE' ? 'Sales Invoices' : filter === 'RENTAL' ? 'Rentals' : 'Credit Notes'}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                  <th className="px-5 py-3.5">Type & Ref</th>
                  <th className="px-4 py-3.5">Date</th>
                  <th className="px-4 py-3.5">Description</th>
                  <th className="px-4 py-3.5 text-right">Amount</th>
                  <th className="px-4 py-3.5 text-right">Balance Impact</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {customerHistory.transactions.map((tx: any) => (
                  <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${tx.type === 'SALE' ? 'bg-emerald-500' : tx.type === 'RENTAL' ? 'bg-indigo-500' : 'bg-purple-500'}`} />
                        <span className="font-extrabold text-slate-900">{tx.refNumber}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-bold text-slate-500">{format(parseISO(tx.date || tx.createdAt), 'dd MMM yyyy')}</td>
                    <td className="px-4 py-3.5 text-slate-700 font-medium">{tx.description}</td>
                    <td className="px-4 py-3.5 text-right font-mono font-extrabold text-slate-900">{formatCurrency(tx.amount)}</td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold">
                      {tx.type === 'CREDIT_NOTE' ? (
                        <span className="text-emerald-700">+{formatCurrency(tx.amount)} (Credit)</span>
                      ) : (
                        <span className="text-slate-700">{formatCurrency(tx.amount)}</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {tx.type === 'SALE' && (
                        <button
                          onClick={() => setSelectedSaleForDetails(tx.raw)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                          title="View Invoice Receipt"
                        >
                          <Eye size={14} strokeWidth={2.2} />
                        </button>
                      )}
                      {tx.type === 'RENTAL' && tx.raw?.status === 'ACTIVE' && (
                        <button
                          onClick={() => setSelectedRentalForReturn(tx.raw)}
                          className="px-2.5 py-1 bg-slate-900 hover:bg-indigo-600 text-white rounded-md text-[10px] font-extrabold uppercase tracking-wider transition-all"
                        >
                          Check In
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {customerHistory.transactions.length === 0 && (
              <div className="py-14 text-center">
                <div className="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center text-slate-300 mx-auto mb-2 border border-slate-200">
                  <FileText size={22} strokeWidth={1.5} />
                </div>
                <p className="text-slate-600 text-xs font-extrabold uppercase tracking-wider">No transaction history found</p>
              </div>
            )}
          </div>
        </div>

        <Modal
          isOpen={isPaymentModalOpen}
          onClose={() => { setIsPaymentModalOpen(false); setSelectedSaleForPayment(null); }}
          title={`Record Payment: ${activePaymentSale?.invoiceNumber}`}
        >
          <form onSubmit={handleRecordPayment} className="space-y-4">
            <div className="p-4 bg-slate-900 text-white rounded-lg space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-400">
                <span>Total Invoice</span>
                <span>{formatCurrency(activePaymentSale?.totalAmount || 0)}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-emerald-400">
                <span>Already Paid</span>
                <span>{formatCurrency(activePaymentSale?.paidAmount || 0)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                <span className="text-xs font-bold text-slate-400">Balance Due</span>
                <span className="text-xl font-extrabold text-white font-mono">{formatCurrency(activePaymentBalance)}</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Payment Amount</label>
              <div className="relative group">
                <IndianRupee className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} strokeWidth={2.5} />
                <input
                  name="amount"
                  type="number"
                  max={activePaymentBalance}
                  min={1}
                  required
                  autoFocus
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-md outline-none transition-all font-extrabold text-slate-900 text-xs"
                  placeholder="Enter amount"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="flex-1 py-2.5 rounded-md font-extrabold uppercase tracking-wider text-xs border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-md font-extrabold uppercase tracking-wider text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
              >
                Record Payment
              </button>
            </div>
          </form>
        </Modal>

        <Modal
          isOpen={!!selectedSaleForDetails}
          onClose={() => setSelectedSaleForDetails(null)}
          title={selectedSaleForDetails ? `Invoice: ${selectedSaleForDetails.invoiceNumber}` : 'Invoice Details'}
        >
          {selectedSaleForDetails && (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-slate-50 p-3.5 rounded-md border border-slate-200 text-xs font-bold text-slate-600">
                <div>
                  <p>Date: {format(new Date(selectedSaleForDetails.date), 'dd MMM yyyy, hh:mm a')}</p>
                  <p className="mt-0.5 text-slate-400">Status: {selectedSaleForDetails.orderStatus}</p>
                </div>
                <div className="text-right">
                  <p>Channel: {selectedSaleForDetails.channel}</p>
                  <p className="mt-0.5 text-slate-400">Method: {selectedSaleForDetails.paymentMethod}</p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Line Items</h4>
                <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                  {selectedSaleForDetails.items.map((item: any, i: number) => (
                    <div key={i} className="py-2 flex justify-between items-center text-xs font-bold text-slate-800">
                      <div>
                        <p>{item.name}</p>
                        <p className="text-[10px] text-slate-400">{item.quantity} x {formatCurrency(item.unitPrice)}</p>
                      </div>
                      <p className="font-mono">{formatCurrency(item.total)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 space-y-1.5 text-xs font-bold text-slate-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-mono text-slate-900">{formatCurrency(selectedSaleForDetails.totalAmount)}</span>
                </div>
                {selectedSaleForDetails.discount > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Discount</span>
                    <span className="font-mono">-{formatCurrency(selectedSaleForDetails.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-900 text-sm font-extrabold pt-2 border-t border-slate-100">
                  <span>Total Paid</span>
                  <span className="font-mono">{formatCurrency(selectedSaleForDetails.netPayout)}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedSaleForDetails(null)}
                  className="flex-1 py-2.5 rounded-md text-xs font-extrabold uppercase tracking-wider border border-slate-200 text-slate-600 hover:bg-slate-50"
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
                  className="flex-1 py-2.5 rounded-md text-xs font-extrabold uppercase tracking-wider bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center gap-1.5"
                >
                  <Printer size={13} />
                  <span>Print Receipt</span>
                </button>
              </div>
            </div>
          )}
        </Modal>

        <ReturnRentalModal
          isOpen={!!selectedRentalForReturn}
          onClose={() => setSelectedRentalForReturn(null)}
          rental={selectedRentalForReturn}
        />

        <Modal
          isOpen={isIssueCreditModalOpen}
          onClose={() => setIsIssueCreditModalOpen(false)}
          title={selectedCustomer ? `Issue Credit Note: ${selectedCustomer.name}` : 'Issue Credit Note'}
        >
          <form onSubmit={handleIssueCreditNote} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Credit Amount (₹)</label>
              <input
                name="amount"
                type="number"
                min={1}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-md outline-none font-extrabold text-slate-900 text-xs"
                placeholder="e.g. 500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Reason / Description</label>
              <textarea
                name="reason"
                required
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-md outline-none font-bold text-slate-900 text-xs min-h-[80px] resize-none"
                placeholder="e.g. Returned defect product or store credit refund"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsIssueCreditModalOpen(false)}
                className="flex-1 py-2.5 rounded-md font-extrabold uppercase tracking-wider text-xs border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-md font-extrabold uppercase tracking-wider text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
              >
                Issue Credit
              </button>
            </div>
          </form>
        </Modal>

        <Modal
          isOpen={isCashOutModalOpen}
          onClose={() => setIsCashOutModalOpen(false)}
          title={selectedCustomer ? `Cash Out Credit: ${selectedCustomer.name}` : 'Cash Out Credit'}
        >
          <form onSubmit={handleCashOutStoreCredit} className="space-y-4">
            <div className="p-4 bg-rose-950 text-white rounded-lg space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-300">Available Credit Balance</span>
              <p className="text-2xl font-extrabold text-white font-mono">{formatCurrency(availableCredit)}</p>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Payout Amount (₹)</label>
              <input
                name="amount"
                type="number"
                max={availableCredit}
                min={1}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-md outline-none font-extrabold text-slate-900 text-xs"
                placeholder="Enter amount to pay out"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCashOutModalOpen(false)}
                className="flex-1 py-2.5 rounded-md font-extrabold uppercase tracking-wider text-xs border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-md font-extrabold uppercase tracking-wider text-xs bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
              >
                Confirm Payout
              </button>
            </div>
          </form>
        </Modal>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-nano pb-20 max-w-[1600px] mx-auto">
      <div className="bg-white border border-slate-200/80 rounded-md p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-[#01a9fb] text-white flex items-center justify-center shadow-xs shrink-0">
            <Users size={20} strokeWidth={2.2} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">Customer CRM</h1>
              <span className="text-[10px] font-extrabold text-[#01a9fb] bg-[#01a9fb]/10 border border-[#01a9fb]/30 px-2 py-0.5 rounded-md">
                {filteredCustomers.length} Registered Profiles
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Manage customer directory, store credits, receivables, and order history</p>
          </div>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#01a9fb] hover:bg-[#0098e6] text-white text-xs font-extrabold uppercase tracking-wider rounded-md shadow-xs transition-all active:scale-95"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>New Customer Profile</span>
        </button>
      </div>

      <div className="relative group max-w-lg">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#01a9fb] transition-colors" size={15} strokeWidth={2.5} />
        <input
          type="text"
          placeholder="Search by customer name or phone number..."
          className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200/80 rounded-md text-xs font-bold text-slate-900 outline-none focus:border-[#01a9fb] focus:ring-2 focus:ring-[#01a9fb]/10 transition-all shadow-xs placeholder:text-slate-400"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3.5">
        {filteredCustomers.map(customer => (
          <div
            key={customer.id}
            onClick={() => setSelectedCustomerId(customer.id)}
            className="bg-white rounded-md border border-slate-200/90 p-2.5 sm:p-3.5 transition-all duration-200 flex flex-col justify-between group cursor-pointer hover:border-[#01a9fb]/60"
          >
            <div>
              <div className="flex items-start gap-2 mb-2">
                <div className="w-8 h-8 sm:w-9 sm:h-9 bg-[#01a9fb] text-white rounded-md flex items-center justify-center font-black text-xs shrink-0 group-hover:scale-105 transition-transform">
                  {(customer.name || 'C').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="text-xs font-black text-slate-900 truncate group-hover:text-[#01a9fb] transition-colors leading-tight">
                      {customer.name}
                    </h4>
                    {settings?.enableDeleteCustomers && (
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (window.confirm(`Delete customer ${customer.name}?`)) {
                            await deleteCustomer(customer.id);
                          }
                        }}
                        className="p-1 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors shrink-0"
                        title="Delete Customer"
                      >
                        <Trash2 size={12} strokeWidth={2.2} />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5 text-[10px] font-bold text-slate-500 truncate">
                    <Phone size={10} strokeWidth={2.5} className="text-slate-400 shrink-0" />
                    <span className="truncate">{customer.phone}</span>
                  </div>
                </div>
              </div>

              {getVipBadge(customer.totalSpent)}
            </div>

            <div className="grid grid-cols-3 gap-1 pt-2 border-t border-slate-100 mt-2 text-[9px] sm:text-[10px]">
              <div>
                <p className="font-extrabold text-slate-400 uppercase tracking-wider text-[8px]">Spent</p>
                <p className="font-black text-slate-900 font-mono truncate">{formatCurrency(customer.totalSpent)}</p>
              </div>
              <div>
                <p className="font-extrabold text-slate-400 uppercase tracking-wider text-[8px]">Dues</p>
                <p className={`font-black font-mono truncate ${customer.balance > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                  {formatCurrency(customer.balance)}
                </p>
              </div>
              <div className="text-right">
                <p className="font-extrabold text-slate-400 uppercase tracking-wider text-[8px]">Credit</p>
                <p className={`font-black font-mono truncate ${customer.storeCredit > 0 ? 'text-emerald-700' : 'text-slate-700'}`}>
                  {formatCurrency(customer.storeCredit)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredCustomers.length === 0 && (
        <div className="py-14 text-center bg-white rounded-lg border border-slate-200/80 shadow-xs">
          <div className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 mx-auto mb-3">
            <User size={22} strokeWidth={2} />
          </div>
          <p className="text-slate-700 text-sm font-extrabold">No customers found</p>
          <p className="text-slate-400 text-xs mt-0.5">Try searching with another name or phone number</p>
        </div>
      )}

      <CustomerFormModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
    </div>
  );
};

export default Customers;
