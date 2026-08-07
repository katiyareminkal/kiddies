import React, { useState, useMemo } from 'react';
import { useApp } from '../store/AppContext';
import { Card, Button, Modal } from '../components/Shared';
import {
  Plus,
  Search,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  User,
  Box,
  ArrowRight,
  Phone,
  MoreVertical,
  Check,
  CalendarDays,
  IndianRupee,
  Receipt,
  Upload,
  X,
  ChevronDown,
  Package,
  Filter,
  XCircle,
  Hash,
  CreditCard,
  LayoutGrid,
  List,
  Pencil,
  Trash2
} from 'lucide-react';
import { formatCurrency, calculateLateFee } from '../utils/helpers';
import { PaymentStatus, RentalStatus, Rental } from '../types';
import { differenceInDays, parseISO, isSameDay, isAfter, isBefore, addDays, format } from 'date-fns';
import { NewRentalModal } from '../components/forms/NewRentalModal';
import { ReturnRentalModal } from '../components/forms/ReturnRentalModal';
import { EditRentalModal } from '../components/forms/EditRentalModal';

const Rentals: React.FC = () => {
  const { rentals, products, customers, updateRental, deleteRental, settings } = useApp();

  // View mode state (card vs list)
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');

  // Modals
  const [isNewRentalModalOpen, setIsNewRentalModalOpen] = useState(false);
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Selection
  const [selectedRental, setSelectedRental] = useState<Rental | null>(null);
  const [editingRental, setEditingRental] = useState<Rental | null>(null);

  // Extend Modal State
  const [extendDays, setExtendDays] = useState(1);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'OVERDUE' | 'RETURNED'>('ACTIVE');
  const [showFilters, setShowFilters] = useState(false);
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState<PaymentStatus | 'ALL'>('ALL');
  const [filterProductId, setFilterProductId] = useState<string>('ALL');
  const [filterCustomerId, setFilterCustomerId] = useState<string>('ALL');

  // --- Handlers ---
  const openExtend = (rental: Rental) => {
    setSelectedRental(rental);
    setExtendDays(1);
    setIsExtendModalOpen(true);
  };

  const openEdit = (rental: Rental) => {
    setEditingRental(rental);
    setIsEditModalOpen(true);
  };

  const handleConfirmExtend = () => {
    if (selectedRental) {
      const currentEnd = parseISO(selectedRental.expectedReturnDate);
      const newEnd = addDays(currentEnd, extendDays);
      const newEndDateStr = format(newEnd, 'yyyy-MM-dd');

      const additionalCost = extendDays * selectedRental.dailyRate * selectedRental.quantity;

      updateRental(selectedRental.id, {
        expectedReturnDate: newEndDateStr,
        totalRentAmount: selectedRental.totalRentAmount + additionalCost,
      });

      setIsExtendModalOpen(false);
      setSelectedRental(null);
    }
  };

  // --- Calculations for Views ---
  const filteredRentals = useMemo(() => {
    return rentals.filter(r => {
      const cust = customers.find(c => c.id === r.customerId);
      const prod = products.find(p => p.id === r.productId);
      const searchStr = searchTerm.toLowerCase();

      const matchesSearch = (
        cust?.name.toLowerCase().includes(searchStr) ||
        prod?.name.toLowerCase().includes(searchStr) ||
        r.invoiceNumber.toLowerCase().includes(searchStr)
      );

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const returnDate = parseISO(r.expectedReturnDate);
      const startDate = parseISO(r.startDate);
      const isOverdue = isBefore(returnDate, today) && r.status === RentalStatus.ACTIVE;

      // Tab Filtering
      let matchesTab = true;
      if (activeTab === 'ACTIVE') matchesTab = r.status === 'ACTIVE' && !isOverdue;
      else if (activeTab === 'OVERDUE') matchesTab = r.status === 'ACTIVE' && isOverdue;
      else if (activeTab === 'RETURNED') matchesTab = r.status === 'RETURNED';

      // Advanced Filtering
      const matchesStartDate = filterStartDate ? isAfter(startDate, parseISO(filterStartDate)) || isSameDay(startDate, parseISO(filterStartDate)) : true;
      const matchesEndDate = filterEndDate ? isBefore(returnDate, parseISO(filterEndDate)) || isSameDay(returnDate, parseISO(filterEndDate)) : true;
      const matchesPayment = filterPaymentStatus === 'ALL' || r.paymentStatus === filterPaymentStatus;
      const matchesProduct = filterProductId === 'ALL' || r.productId === filterProductId;
      const matchesCustomer = filterCustomerId === 'ALL' || r.customerId === filterCustomerId;

      return matchesSearch && matchesTab && matchesStartDate && matchesEndDate && matchesPayment && matchesProduct && matchesCustomer;
    });
  }, [rentals, customers, products, searchTerm, activeTab, filterStartDate, filterEndDate, filterPaymentStatus, filterProductId, filterCustomerId]);

  const getProgress = (start: string, end: string) => {
    const startDate = parseISO(start).getTime();
    const endDate = parseISO(end).getTime();
    const now = new Date().getTime();
    const totalDuration = endDate - startDate;
    const elapsed = now - startDate;
    const percentage = Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));
    return percentage;
  };

  // KPIs
  const activeCount = rentals.filter(r => r.status === 'ACTIVE').length;
  const overdueCount = rentals.filter(r => r.status === 'ACTIVE' && isBefore(parseISO(r.expectedReturnDate), new Date())).length;
  const returnsDueToday = rentals.filter(r => r.status === 'ACTIVE' && isSameDay(parseISO(r.expectedReturnDate), new Date())).length;
  const activeDeposits = rentals
    .filter(r => r.status === 'ACTIVE')
    .reduce((acc, r) => acc + r.securityDeposit, 0);

  return (
    <div className="space-y-4 animate-nano pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 py-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Rentals Desk</h1>
          <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">Manage Active Leases & Returns</p>
        </div>
        <button
          onClick={() => setIsNewRentalModalOpen(true)}
          className="banana-btn"
        >
          <Plus size={14} strokeWidth={2.5} className="mr-2" /> Create Rental
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="nano-card p-4 group hover:bg-slate-900 transition-all duration-300">
          <p className="text-[9px] font-semibold uppercase text-slate-400 tracking-widest mb-0.5 group-hover:text-slate-500 transition-colors">Active</p>
          <h3 className="text-lg font-bold text-slate-900 group-hover:text-white transition-colors tracking-tight">{activeCount}</h3>
        </div>

        <div className="nano-card p-4 group hover:bg-slate-900 transition-all duration-300">
          <p className="text-[9px] font-semibold uppercase text-slate-400 tracking-widest mb-0.5 group-hover:text-slate-500 transition-colors">Overdue</p>
          <h3 className={`text-lg font-bold group-hover:text-white transition-colors tracking-tight ${overdueCount > 0 ? 'text-rose-500' : 'text-slate-900'}`}>{overdueCount}</h3>
        </div>

        <div className="nano-card p-4 group hover:bg-slate-900 transition-all duration-300">
          <p className="text-[9px] font-semibold uppercase text-slate-400 tracking-widest mb-0.5 group-hover:text-slate-500 transition-colors">Due Today</p>
          <h3 className="text-lg font-bold text-slate-900 group-hover:text-white transition-colors tracking-tight">{returnsDueToday}</h3>
        </div>

        <div className="nano-card p-4 group hover:bg-slate-900 transition-all duration-300">
          <p className="text-[9px] font-semibold uppercase text-slate-400 tracking-widest mb-0.5 group-hover:text-slate-500 transition-colors">Deposits Held</p>
          <h3 className="text-lg font-bold text-slate-900 group-hover:text-white transition-colors tracking-tight">{formatCurrency(activeDeposits)}</h3>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {/* Toolbar: Navigation Tabs + Search + View Mode (Icons Only) */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex bg-white border border-slate-100 p-1 rounded-lg w-full md:w-auto shadow-sm">
            {(['ACTIVE', 'OVERDUE', 'RETURNED'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 md:flex-none px-5 py-2 rounded-md text-[9px] font-bold uppercase tracking-widest transition-all ${activeTab === tab
                    ? 'bg-[#8B5CF6] text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-600'
                  }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            {/* View Mode Toggle: Icons Only */}
            <div className="flex bg-white border border-slate-200/80 p-0.5 rounded-xl shadow-sm shrink-0">
              <button
                onClick={() => setViewMode('card')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'card' ? 'bg-[#8B5CF6] text-white shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}
                title="Card View"
              >
                <LayoutGrid size={15} strokeWidth={2.5} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-[#8B5CF6] text-white shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}
                title="List View"
              >
                <List size={15} strokeWidth={2.5} />
              </button>
            </div>

            <div className="relative group flex-1 md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-slate-900 transition-colors" size={14} strokeWidth={2.5} />
              <input
                type="text"
                placeholder="Search Rentals..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200/80 rounded-xl text-[10px] font-semibold uppercase tracking-widest outline-none focus:border-[#8B5CF6] transition-all shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-xl border transition-all flex items-center justify-center ${showFilters ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-400 border-slate-200/80 hover:border-slate-300 shadow-sm'}`}
              title="Advanced Filters"
            >
              <Filter size={15} strokeWidth={showFilters ? 3 : 2.5} />
            </button>
          </div>
        </div>

        {/* Advanced Filters Panel */}
        {showFilters && (
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm animate-nano space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase text-slate-300 tracking-widest ml-1">From Date</label>
                <input
                  type="date"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-[10px] font-bold uppercase outline-none"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase text-slate-300 tracking-widest ml-1">To Date</label>
                <input
                  type="date"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-[10px] font-bold uppercase outline-none"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase text-slate-300 tracking-widest ml-1">Payment</label>
                <select
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-[10px] font-bold uppercase outline-none appearance-none"
                  value={filterPaymentStatus}
                  onChange={(e) => setFilterPaymentStatus(e.target.value as PaymentStatus | 'ALL')}
                >
                  <option value="ALL">All Payments</option>
                  {Object.values(PaymentStatus).map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase text-slate-300 tracking-widest ml-1">Product</label>
                <select
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-[10px] font-bold uppercase outline-none appearance-none"
                  value={filterProductId}
                  onChange={(e) => setFilterProductId(e.target.value)}
                >
                  <option value="ALL">All Products</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase text-slate-300 tracking-widest ml-1">Customer</label>
                <select
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-[10px] font-bold uppercase outline-none appearance-none"
                  value={filterCustomerId}
                  onChange={(e) => setFilterCustomerId(e.target.value)}
                >
                  <option value="ALL">All Customers</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end pt-2 border-t border-slate-50">
              <button
                onClick={() => {
                  setFilterStartDate('');
                  setFilterEndDate('');
                  setFilterPaymentStatus('ALL');
                  setFilterProductId('ALL');
                  setFilterCustomerId('ALL');
                  setSearchTerm('');
                }}
                className="px-3 py-1.5 text-[8.5px] font-black uppercase tracking-wider text-rose-500 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <XCircle size={13} /> Reset Filters
              </button>
            </div>
          </div>
        )}

        {/* View Mode 1: CARD VIEW */}
        {viewMode === 'card' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {filteredRentals.map(rental => {
              const customer = customers.find(c => c.id === rental.customerId);
              const product = products.find(p => p.id === rental.productId);
              const progress = getProgress(rental.startDate, rental.expectedReturnDate);
              const isLate = activeTab === 'OVERDUE';
              const netRefundable = Math.max(0, rental.securityDeposit - rental.totalRentAmount);

              return (
                <div key={rental.id} className="nano-card p-4 group">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 border border-slate-100 group-hover:bg-[#8B5CF6] group-hover:text-white transition-all">
                        <Package size={16} strokeWidth={2.5} />
                      </div>
                      <div>
                        <h4 className="text-[13px] font-bold text-slate-900 uppercase tracking-tight group-hover:text-[#8B5CF6] transition-colors">{product?.name}</h4>
                        <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">{rental.invoiceNumber} • {customer?.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[13px] font-bold text-slate-900 font-mono">{formatCurrency(rental.totalRentAmount)}</p>
                      <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">
                        Dep: {formatCurrency(rental.securityDeposit)} • <span className="text-emerald-600 font-bold">Ref: {formatCurrency(netRefundable)}</span>
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[9px] font-semibold uppercase tracking-widest">
                      <span className="text-slate-400">{format(parseISO(rental.startDate), 'MMM dd')}</span>
                      <span className={isLate ? 'text-rose-500 font-bold' : 'text-slate-400'}>
                        {format(parseISO(rental.expectedReturnDate), 'MMM dd')}
                      </span>
                    </div>
                    <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${rental.status === 'RETURNED' ? 'bg-emerald-500' :
                            isLate ? 'bg-rose-500 animate-pulse' :
                              progress > 80 ? 'bg-amber-500' : 'bg-slate-900'
                          }`}
                        style={{ width: rental.status === 'RETURNED' ? '100%' : `${progress}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      {rental.status === 'ACTIVE' ? (
                        <span className={`text-[8.5px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md ${isLate ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-slate-50 text-slate-500'}`}>
                          {isLate ? 'Overdue' : 'Active'}
                        </span>
                      ) : (
                        <span className="text-[8.5px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-100">
                          Returned
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Edit Option */}
                      <button
                        onClick={() => openEdit(rental)}
                        className="p-1.5 text-slate-400 hover:text-[#8B5CF6] hover:bg-[#8B5CF6]/10 rounded-lg transition-colors"
                        title="Edit Rental"
                      >
                        <Pencil size={14} strokeWidth={2.5} />
                      </button>

                      {/* Delete Option */}
                      {(settings?.enableDeleteRentals || settings?.enableDeleteTransactions) && (
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete rental booking ${rental.invoiceNumber}?`)) {
                              deleteRental(rental.id);
                            }
                          }}
                          className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Rental Booking"
                        >
                          <Trash2 size={14} strokeWidth={2.5} />
                        </button>
                      )}

                      {rental.status === 'ACTIVE' && (
                        <>
                          <button
                            onClick={() => openExtend(rental)}
                            className="p-1.5 text-slate-400 hover:text-[#8B5CF6] hover:bg-[#8B5CF6]/10 rounded-lg transition-colors"
                            title="Extend Duration"
                          >
                            <CalendarDays size={14} strokeWidth={2.5} />
                          </button>
                          <button
                            onClick={() => { setSelectedRental(rental); setIsCheckInModalOpen(true); }}
                            className="px-3.5 py-1.5 bg-slate-900 text-white rounded-lg text-[9px] font-bold uppercase tracking-wider hover:bg-[#8B5CF6] transition-all shadow-sm"
                          >
                            Check In
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* View Mode 2: LIST / TABLE VIEW */
          <Card className="overflow-hidden border border-slate-200/80 shadow-sm rounded-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-400">
                    <th className="px-4 py-3 font-bold uppercase text-[9px] tracking-wider">Invoice & Customer</th>
                    <th className="px-4 py-3 font-bold uppercase text-[9px] tracking-wider">Product</th>
                    <th className="px-4 py-3 font-bold uppercase text-[9px] tracking-wider">Dates</th>
                    <th className="px-4 py-3 font-bold uppercase text-[9px] tracking-wider">Financials</th>
                    <th className="px-4 py-3 font-bold uppercase text-[9px] tracking-wider">Status</th>
                    <th className="px-4 py-3 font-bold uppercase text-[9px] tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRentals.map(rental => {
                    const customer = customers.find(c => c.id === rental.customerId);
                    const product = products.find(p => p.id === rental.productId);
                    const isLate = activeTab === 'OVERDUE';
                    const netRefundable = Math.max(0, rental.securityDeposit - rental.totalRentAmount);

                    return (
                      <tr key={rental.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-900 text-xs">{rental.invoiceNumber}</p>
                          <p className="text-[10px] text-slate-500 font-medium">{customer?.name || 'Unknown'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-800 text-xs">{product?.name || 'Unknown'}</p>
                          <p className="text-[9.5px] text-slate-400 font-bold">Qty: {rental.quantity}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-[10px] font-bold text-slate-700">
                            {format(parseISO(rental.startDate), 'MMM dd')} → <span className={isLate ? 'text-rose-600 font-black' : ''}>{format(parseISO(rental.expectedReturnDate), 'MMM dd')}</span>
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-900 font-mono text-xs">{formatCurrency(rental.totalRentAmount)}</p>
                          <p className="text-[9px] text-slate-400 font-medium">
                            Dep: {formatCurrency(rental.securityDeposit)} • <span className="text-emerald-600 font-bold">Ref: {formatCurrency(netRefundable)}</span>
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          {rental.status === 'ACTIVE' ? (
                            <span className={`px-2 py-0.5 rounded-md text-[8.5px] font-bold uppercase tracking-wider ${isLate ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-slate-100 text-slate-600'}`}>
                              {isLate ? 'Overdue' : 'Active'}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[8.5px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-100">
                              Returned
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Edit Option */}
                            <button
                              onClick={() => openEdit(rental)}
                              className="p-1.5 text-slate-400 hover:text-[#8B5CF6] hover:bg-[#8B5CF6]/10 rounded-lg transition-colors"
                              title="Edit Rental"
                            >
                              <Pencil size={14} strokeWidth={2.5} />
                            </button>

                            {/* Delete Option */}
                            {(settings?.enableDeleteRentals || settings?.enableDeleteTransactions) && (
                              <button
                                onClick={() => {
                                  if (window.confirm(`Delete rental booking ${rental.invoiceNumber}?`)) {
                                    deleteRental(rental.id);
                                  }
                                }}
                                className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Delete Rental Booking"
                              >
                                <Trash2 size={14} strokeWidth={2.5} />
                              </button>
                            )}

                            {rental.status === 'ACTIVE' && (
                              <>
                                <button
                                  onClick={() => openExtend(rental)}
                                  className="p-1.5 text-slate-400 hover:text-[#8B5CF6] hover:bg-[#8B5CF6]/10 rounded-lg transition-colors"
                                  title="Extend Duration"
                                >
                                  <CalendarDays size={14} strokeWidth={2.5} />
                                </button>
                                <button
                                  onClick={() => { setSelectedRental(rental); setIsCheckInModalOpen(true); }}
                                  className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-[9px] font-bold uppercase tracking-wider hover:bg-[#8B5CF6] transition-all shadow-sm"
                                >
                                  Check In
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {filteredRentals.length === 0 && (
          <div className="py-12 text-center bg-white rounded-2xl border border-slate-100">
            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300 mx-auto mb-2">
              <Calendar size={20} strokeWidth={2} />
            </div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">No {activeTab.toLowerCase()} rentals found</p>
          </div>
        )}
      </div>

      {/* New Rental Modal */}
      <NewRentalModal isOpen={isNewRentalModalOpen} onClose={() => setIsNewRentalModalOpen(false)} />

      {/* Return / Check-In Modal */}
      <ReturnRentalModal isOpen={isCheckInModalOpen} onClose={() => { setIsCheckInModalOpen(false); setSelectedRental(null); }} rental={selectedRental} />

      {/* Edit Rental Modal */}
      <EditRentalModal isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); setEditingRental(null); }} rental={editingRental} />

      {/* Extend Rental Modal */}
      <Modal isOpen={isExtendModalOpen} onClose={() => setIsExtendModalOpen(false)} title="Extend Rental">
        {selectedRental && (
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
              <p className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider">Current Expected Return</p>
              <p className="text-sm font-black text-slate-900 font-mono">{format(parseISO(selectedRental.expectedReturnDate), 'MMM dd, yyyy')}</p>
            </div>

            <div className="space-y-1">
              <label className="text-[8.5px] font-black uppercase text-slate-400 tracking-wider">Extend By (Days)</label>
              <input
                type="number"
                min="1"
                value={extendDays}
                onChange={e => setExtendDays(Math.max(1, Number(e.target.value)))}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#8B5CF6] rounded-xl outline-none font-bold text-xs text-slate-900"
              />
            </div>

            <div className="p-3 bg-[#8B5CF6]/5 border border-[#8B5CF6]/20 rounded-xl flex justify-between items-center text-xs">
              <span className="font-bold text-slate-600 uppercase text-[9px]">Additional Rental Cost</span>
              <span className="font-black text-[#8B5CF6] font-mono text-sm">
                +{formatCurrency(extendDays * selectedRental.dailyRate * selectedRental.quantity)}
              </span>
            </div>

            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setIsExtendModalOpen(false)} className="flex-1 py-2.5 rounded-xl font-bold uppercase tracking-wider text-[9.5px] text-slate-500 border border-slate-200">Cancel</button>
              <button type="button" onClick={handleConfirmExtend} className="flex-1 py-2.5 rounded-xl font-black uppercase tracking-wider text-[9.5px] bg-[#8B5CF6] text-white">Confirm Extension</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Rentals;
