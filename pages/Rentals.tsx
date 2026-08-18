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
  Trash2,
  AlertTriangle,
  RefreshCw,
  Sparkles
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
    if (totalDuration <= 0) return 100;
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
    .reduce((acc, r) => acc + (r.securityDeposit || 0), 0);

  return (
    <div className="space-y-5 animate-nano pb-20 max-w-[1600px] mx-auto">
      {/* ── Executive Header ── */}
      <div className="bg-white border border-slate-200/80 rounded-md p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-[#fe569f] text-white flex items-center justify-center shadow-xs shrink-0">
            <Calendar size={20} strokeWidth={2.2} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">Rentals Desk</h1>
              <span className="text-[10px] font-extrabold text-[#fe569f] bg-[#fe569f]/10 border border-[#fe569f]/30 px-2 py-0.5 rounded-md">
                {activeCount} Active Leases
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Manage garment rentals, return schedules, and security deposits</p>
          </div>
        </div>

        <button
          onClick={() => setIsNewRentalModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#fe569f] hover:bg-[#eb4890] text-white text-xs font-extrabold uppercase tracking-wider rounded-md shadow-xs transition-all active:scale-95"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>New Rental Booking</span>
        </button>
      </div>

      {/* ── KPI Cards (4 Cards) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3.5">
        <div
          onClick={() => setActiveTab('ACTIVE')}
          className={`p-3 sm:p-4 rounded-md border transition-all duration-200 cursor-pointer ${activeTab === 'ACTIVE'
            ? 'bg-[#fe569f]/10 border-[#fe569f]/50'
            : 'bg-white hover:bg-slate-50/60 border-slate-200/80 hover:border-[#fe569f]/30'
            }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">Active Rentals</span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-[#fe569f]/10 text-[#fe569f] flex items-center justify-center font-bold text-xs shrink-0">
              <Calendar size={13} />
            </div>
          </div>
          <h3 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight leading-none whitespace-nowrap truncate">{activeCount}</h3>
          <p className="text-[10px] sm:text-[11px] font-bold text-[#fe569f] mt-1.5 whitespace-nowrap truncate">Currently out on lease</p>
        </div>

        <div
          onClick={() => setActiveTab('OVERDUE')}
          className={`p-3 sm:p-4 rounded-md border transition-all duration-200 cursor-pointer ${activeTab === 'OVERDUE'
            ? 'bg-rose-50/70 border-rose-300'
            : overdueCount > 0
              ? 'bg-rose-50/30 border-rose-200/80 hover:border-rose-300'
              : 'bg-white hover:bg-slate-50/60 border-slate-200/80 hover:border-rose-200'
            }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider whitespace-nowrap ${overdueCount > 0 ? 'text-rose-600' : 'text-slate-500'}`}>Overdue</span>
            <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-md flex items-center justify-center font-bold text-xs shrink-0 ${overdueCount > 0 ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-400'}`}>
              <AlertTriangle size={13} />
            </div>
          </div>
          <h3 className={`text-lg sm:text-2xl font-black tracking-tight leading-none whitespace-nowrap truncate ${overdueCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>{overdueCount}</h3>
          <p className={`text-[10px] sm:text-[11px] font-bold mt-1.5 whitespace-nowrap truncate ${overdueCount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
            {overdueCount > 0 ? 'Action required' : 'No overdue items'}
          </p>
        </div>

        <div className="bg-white hover:bg-slate-50/60 p-3 sm:p-4 rounded-md border border-slate-200/80 hover:border-yellow-300 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">Due Today</span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-yellow-100 text-yellow-800 flex items-center justify-center font-bold text-xs shrink-0">
              <Clock size={13} />
            </div>
          </div>
          <h3 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight leading-none whitespace-nowrap truncate">{returnsDueToday}</h3>
          <p className="text-[10px] sm:text-[11px] font-bold text-yellow-700 mt-1.5 whitespace-nowrap truncate">Expected return today</p>
        </div>

        <div className="bg-white hover:bg-slate-50/60 p-3 sm:p-4 rounded-md border border-slate-200/80 hover:border-[#01a9fb]/50 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">Security Held</span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-[#01a9fb]/10 text-[#01a9fb] flex items-center justify-center font-bold text-xs shrink-0">
              <IndianRupee size={13} />
            </div>
          </div>
          <h3 className="text-lg sm:text-2xl font-black text-[#01a9fb] tracking-tight leading-none whitespace-nowrap truncate">{formatCurrency(activeDeposits)}</h3>
          <p className="text-[10px] sm:text-[11px] font-bold text-[#01a9fb] mt-1.5 whitespace-nowrap truncate">Refundable on return</p>
        </div>
      </div>

      {/* ── Toolbar: Status Tabs + Search + Filters + View Toggle ── */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="inline-flex bg-slate-100/90 p-1 rounded-md border border-slate-200/70 shrink-0">
            {(['ACTIVE', 'OVERDUE', 'RETURNED'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded text-xs font-bold transition-all ${activeTab === tab
                  ? 'bg-[#fe569f] text-white shadow-xs font-extrabold'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
              >
                {tab === 'ACTIVE' ? 'Active' : tab === 'OVERDUE' ? 'Overdue' : 'Returned'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-1 md:justify-end">
            {/* Search Input */}
            <div className="relative group flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={15} strokeWidth={2.5} />
              <input
                type="text"
                placeholder="Search invoice, customer, product..."
                className="w-full pl-10 pr-3.5 py-2 bg-white border border-slate-200/80 rounded-md text-xs font-bold text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all shadow-xs placeholder:text-slate-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filter Toggle Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-md border transition-all flex items-center justify-center shrink-0 ${showFilters ? 'bg-slate-900 text-white border-slate-900 shadow-xs' : 'bg-white text-slate-600 border-slate-200/80 hover:border-slate-300 shadow-xs'}`}
              title="Advanced Filters"
            >
              <Filter size={15} strokeWidth={showFilters ? 3 : 2.5} />
            </button>

            {/* Card vs List View Toggle */}
            <div className="inline-flex bg-slate-100 p-1 rounded-md border border-slate-200/70 shrink-0">
              <button
                onClick={() => setViewMode('card')}
                className={`p-1.5 rounded transition-all ${viewMode === 'card' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-400 hover:text-slate-700'}`}
                title="Card View"
              >
                <LayoutGrid size={15} strokeWidth={2.5} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded transition-all ${viewMode === 'list' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-400 hover:text-slate-700'}`}
                title="List View"
              >
                <List size={15} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Advanced Filters Drawer ── */}
        {showFilters && (
          <div className="bg-white border border-slate-200/80 rounded-lg p-4 sm:p-5 shadow-xs animate-nano space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-extrabold uppercase text-slate-600 tracking-wider">Advanced Filter Options</span>
              <button
                onClick={() => {
                  setFilterStartDate('');
                  setFilterEndDate('');
                  setFilterPaymentStatus('ALL');
                  setFilterProductId('ALL');
                  setFilterCustomerId('ALL');
                  setSearchTerm('');
                }}
                className="text-[11px] font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1"
              >
                <XCircle size={13} />
                <span>Reset All Filters</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">From Start Date</label>
                <input
                  type="date"
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-indigo-500"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">To Return Date</label>
                <input
                  type="date"
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-indigo-500"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Payment Status</label>
                <select
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-indigo-500"
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
                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Product</label>
                <select
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-indigo-500"
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
                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Customer</label>
                <select
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-indigo-500"
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
          </div>
        )}

        {/* ── View Mode 1: CARD VIEW (2 columns on mobile, 3 on tablet/desktop) ── */}
        {viewMode === 'card' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3.5">
            {filteredRentals.map(rental => {
              const customer = customers.find(c => c.id === rental.customerId);
              const product = products.find(p => p.id === rental.productId);
              const progress = getProgress(rental.startDate, rental.expectedReturnDate);
              const isLate = activeTab === 'OVERDUE';
              const netRefundable = Math.max(0, (rental.securityDeposit || 0) - (rental.totalRentAmount || 0));

              return (
                <div
                  key={rental.id}
                  className={`bg-white rounded-md border p-2.5 sm:p-3.5 transition-all duration-200 flex flex-col justify-between group ${isLate ? 'border-rose-300' : 'border-slate-200/90 hover:border-[#fe569f]/60'
                    }`}
                >
                  <div>
                    {/* Header: Initial & Amount */}
                    <div className="flex items-start justify-between gap-1.5 mb-2">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-[#fe569f]/10 text-[#fe569f] group-hover:bg-[#fe569f] group-hover:text-white transition-colors flex items-center justify-center font-extrabold text-xs shrink-0">
                          {(customer?.name || 'C').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-black text-xs text-slate-900 truncate leading-tight group-hover:text-[#fe569f] transition-colors">
                            {customer?.name || 'Customer'}
                          </h4>
                          <p className="text-[9px] sm:text-[10px] text-slate-400 font-mono truncate leading-none mt-0.5">{rental.invoiceNumber}</p>
                        </div>
                      </div>
                    </div>

                    {/* Product Name Pill */}
                    <div className="mb-2 bg-slate-50/80 px-2 py-1 rounded border border-slate-100 flex items-center justify-between gap-1">
                      <span className="text-[10px] font-bold text-slate-800 truncate">
                        {product?.name || 'Garment Item'}
                      </span>
                      <span className="text-xs sm:text-sm font-black text-slate-900 font-mono whitespace-nowrap">
                        {formatCurrency(rental.totalRentAmount)}
                      </span>
                    </div>

                    {/* Due Date & Deposit */}
                    <div className="space-y-1 my-2 bg-slate-50/70 p-2 rounded-md border border-slate-100 text-[9px] sm:text-[10px]">
                      <div className="flex justify-between items-center font-bold">
                        <span className="text-slate-500 uppercase tracking-wider text-[8px] sm:text-[9px]">Due Date</span>
                        <span className={`font-mono font-extrabold whitespace-nowrap ${isLate ? 'text-rose-600' : 'text-slate-800'}`}>
                          {format(parseISO(rental.expectedReturnDate), 'dd MMM yyyy')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center font-bold">
                        <span className="text-slate-400 uppercase tracking-wider text-[8px] sm:text-[9px]">Deposit</span>
                        <span className="text-slate-700 font-mono">{formatCurrency(rental.securityDeposit)}</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mt-1">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${rental.status === 'RETURNED'
                            ? 'bg-emerald-500'
                            : isLate
                              ? 'bg-rose-500 animate-pulse'
                              : progress > 80
                                ? 'bg-yellow-400'
                                : 'bg-[#fe569f]'
                            }`}
                          style={{ width: rental.status === 'RETURNED' ? '100%' : `${progress}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="flex items-center justify-between pt-2 mt-1 border-t border-slate-100 gap-1">
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider whitespace-nowrap ${rental.status === 'RETURNED'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : isLate
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-[#fe569f]/10 text-[#fe569f] border border-[#fe569f]/30'
                      }`}>
                      <span className={`w-1 h-1 rounded-full ${rental.status === 'RETURNED' ? 'bg-emerald-500' : isLate ? 'bg-rose-500' : 'bg-[#fe569f]'}`}></span>
                      {rental.status === 'RETURNED' ? 'Returned' : isLate ? 'Overdue' : 'Active'}
                    </span>

                    <div className="flex items-center gap-1">
                      {rental.status === 'ACTIVE' && (
                        <>
                          <button
                            type="button"
                            onClick={() => openExtend(rental)}
                            className="p-1 text-slate-400 hover:text-[#01a9fb] hover:bg-[#01a9fb]/10 rounded transition-colors"
                            title="Extend Lease"
                          >
                            <CalendarDays size={12} strokeWidth={2.2} />
                          </button>
                          <button
                            type="button"
                            onClick={() => { setSelectedRental(rental); setIsCheckInModalOpen(true); }}
                            className="px-2 py-0.5 bg-[#fe569f] hover:bg-[#eb4890] text-white rounded text-[9px] font-black uppercase tracking-wider transition-all shadow-xs"
                          >
                            Return
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => openEdit(rental)}
                        className="p-1 text-slate-400 hover:text-[#fe569f] hover:bg-[#fe569f]/10 rounded transition-colors"
                        title="Edit Booking"
                      >
                        <Pencil size={12} strokeWidth={2.2} />
                      </button>

                      {(settings?.enableDeleteRentals || settings?.enableDeleteTransactions) && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Delete rental booking ${rental.invoiceNumber}?`)) {
                              deleteRental(rental.id);
                            }
                          }}
                          className="p-1 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="Delete Booking"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── View Mode 2: LIST / TABLE VIEW ── */
          <div className="bg-white rounded-lg border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                    <th className="px-5 py-3.5">Invoice & Customer</th>
                    <th className="px-4 py-3.5">Outfit / Product</th>
                    <th className="px-4 py-3.5">Dates Span</th>
                    <th className="px-4 py-3.5">Financials</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredRentals.map(rental => {
                    const customer = customers.find(c => c.id === rental.customerId);
                    const product = products.find(p => p.id === rental.productId);
                    const isLate = activeTab === 'OVERDUE';
                    const netRefundable = Math.max(0, (rental.securityDeposit || 0) - (rental.totalRentAmount || 0));

                    return (
                      <tr key={rental.id} className="hover:bg-slate-50/70 transition-colors group">
                        <td className="px-5 py-3.5">
                          <p className="font-extrabold text-slate-900">{rental.invoiceNumber}</p>
                          <p className="text-[11px] text-slate-500 font-semibold mt-0.5">{customer?.name || 'Customer'}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-bold text-slate-800">{product?.name || 'Item'}</p>
                          <p className="text-[10px] text-slate-400 font-bold">Qty: {rental.quantity}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-bold text-slate-700">
                            {format(parseISO(rental.startDate), 'dd MMM')} → <span className={isLate ? 'text-rose-600 font-extrabold' : 'text-slate-900 font-bold'}>{format(parseISO(rental.expectedReturnDate), 'dd MMM yyyy')}</span>
                          </p>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-extrabold text-slate-900 font-mono">{formatCurrency(rental.totalRentAmount)}</p>
                          <p className="text-[10px] text-slate-500 font-medium">
                            Dep: {formatCurrency(rental.securityDeposit)} • <span className="text-emerald-700 font-bold">Ref: {formatCurrency(netRefundable)}</span>
                          </p>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${rental.status === 'RETURNED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : isLate
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${rental.status === 'RETURNED' ? 'bg-emerald-500' : isLate ? 'bg-rose-500' : 'bg-indigo-500'}`}></span>
                            {rental.status === 'RETURNED' ? 'Returned' : isLate ? 'Overdue' : 'Active'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEdit(rental)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                              title="Edit Booking"
                            >
                              <Pencil size={15} strokeWidth={2.2} />
                            </button>

                            {(settings?.enableDeleteRentals || settings?.enableDeleteTransactions) && (
                              <button
                                onClick={() => {
                                  if (window.confirm(`Delete rental booking ${rental.invoiceNumber}?`)) {
                                    deleteRental(rental.id);
                                  }
                                }}
                                className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                                title="Delete Booking"
                              >
                                <Trash2 size={15} strokeWidth={2.2} />
                              </button>
                            )}

                            {rental.status === 'ACTIVE' && (
                              <>
                                <button
                                  onClick={() => openExtend(rental)}
                                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                                  title="Extend Duration"
                                >
                                  <CalendarDays size={15} strokeWidth={2.2} />
                                </button>
                                <button
                                  onClick={() => { setSelectedRental(rental); setIsCheckInModalOpen(true); }}
                                  className="px-3 py-1.5 bg-slate-900 hover:bg-indigo-600 text-white rounded-md text-[10px] font-extrabold transition-all"
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
          </div>
        )}

        {/* Empty State */}
        {filteredRentals.length === 0 && (
          <div className="py-14 text-center bg-white rounded-lg border border-slate-200/80 shadow-xs">
            <div className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 mx-auto mb-3">
              <Calendar size={22} strokeWidth={2} />
            </div>
            <p className="text-slate-700 text-sm font-extrabold">No {activeTab.toLowerCase()} rentals found</p>
            <p className="text-slate-400 text-xs mt-0.5">Try clearing filters or create a new rental booking</p>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      <NewRentalModal isOpen={isNewRentalModalOpen} onClose={() => setIsNewRentalModalOpen(false)} />
      <ReturnRentalModal isOpen={isCheckInModalOpen} onClose={() => { setIsCheckInModalOpen(false); setSelectedRental(null); }} rental={selectedRental} />
      <EditRentalModal isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); setEditingRental(null); }} rental={editingRental} />

      {/* Extend Rental Modal */}
      <Modal isOpen={isExtendModalOpen} onClose={() => setIsExtendModalOpen(false)} title="Extend Rental Booking">
        {selectedRental && (
          <div className="space-y-4">
            <div className="p-3.5 bg-slate-50 rounded-md border border-slate-200 space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current Expected Return</p>
              <p className="text-sm font-extrabold text-slate-900 font-mono">{format(parseISO(selectedRental.expectedReturnDate), 'dd MMMM yyyy')}</p>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Extend By (Days)</label>
              <input
                type="number"
                min="1"
                value={extendDays}
                onChange={e => setExtendDays(Math.max(1, Number(e.target.value)))}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-md outline-none font-extrabold text-xs text-slate-900"
              />
            </div>

            <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-md flex justify-between items-center text-xs">
              <span className="font-extrabold text-indigo-950 uppercase text-[10px]">Additional Rental Cost</span>
              <span className="font-extrabold text-indigo-700 font-mono text-base">
                +{formatCurrency(extendDays * (selectedRental.dailyRate || 0) * (selectedRental.quantity || 1))}
              </span>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsExtendModalOpen(false)}
                className="flex-1 py-2.5 rounded-md font-extrabold uppercase tracking-wider text-xs text-slate-600 hover:bg-slate-100 border border-slate-200 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmExtend}
                className="flex-1 py-2.5 rounded-md font-extrabold uppercase tracking-wider text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all"
              >
                Confirm Extension
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Rentals;
