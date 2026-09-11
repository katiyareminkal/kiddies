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
import { ProductDetailsModal } from '../components/forms/ProductDetailsModal';
import { AvailabilityCalendar } from '../components/rentals/AvailabilityCalendar';

const Rentals: React.FC = () => {
  const { rentals, products, customers, updateRental, deleteRental, cancelReservation, settings } = useApp();

  // View mode state (card vs list vs calendar)
  const [viewMode, setViewMode] = useState<'card' | 'list' | 'calendar'>('card');

  // Modals
  const [isNewRentalModalOpen, setIsNewRentalModalOpen] = useState(false);
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [viewingProduct, setViewingProduct] = useState<any | null>(null);

  // Reservation initial data for prefill
  const [reservationInitialData, setReservationInitialData] = useState<{
    productId?: string;
    startDate?: string;
    returnDate?: string;
    mode?: 'IMMEDIATE' | 'RESERVATION';
  }>({ mode: 'IMMEDIATE' });

  // Selection
  const [selectedRental, setSelectedRental] = useState<Rental | null>(null);
  const [editingRental, setEditingRental] = useState<Rental | null>(null);

  // Extend Modal State
  const [extendDays, setExtendDays] = useState(1);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'ACTIVE' | 'RESERVED' | 'DUE_TODAY' | 'OVERDUE' | 'RETURNED'>('ALL');
  const [showFilters, setShowFilters] = useState(false);
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState<PaymentStatus | 'ALL'>('ALL');
  const [filterProductId, setFilterProductId] = useState<string>('ALL');
  const [filterCustomerId, setFilterCustomerId] = useState<string>('ALL');

  // --- Handlers ---
  const handleOpenReservationBooking = (productId?: string, startDate?: string, returnDate?: string) => {
    setReservationInitialData({
      productId,
      startDate,
      returnDate,
      mode: 'RESERVATION'
    });
    setIsNewRentalModalOpen(true);
  };

  const handleOpenStandardBooking = () => {
    setReservationInitialData({ mode: 'IMMEDIATE' });
    setIsNewRentalModalOpen(true);
  };

  const handleHandoverReservation = (rental: Rental) => {
    const cust = customers.find(c => c.id === rental.customerId);
    const prod = products.find(p => p.id === rental.productId);
    if (window.confirm(`Issue outfit handover to ${cust?.name || 'customer'} for ${prod?.name || 'garment'}? This activates the rental period.`)) {
      updateRental(rental.id, {
        status: RentalStatus.ACTIVE
      });
    }
  };

  const handleCancelReservation = (rental: Rental) => {
    if (window.confirm(`Cancel reservation #${rental.invoiceNumber}? Reserved garment stock will be restored to shelf inventory.`)) {
      cancelReservation(rental.id);
    }
  };

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
      returnDate.setHours(0, 0, 0, 0);
      const startDate = parseISO(r.startDate);
      
      const isDueToday = isSameDay(returnDate, today) && r.status === RentalStatus.ACTIVE;
      const isOverdue = isBefore(returnDate, today) && r.status === RentalStatus.ACTIVE;
      const isActive = isAfter(returnDate, today) && r.status === RentalStatus.ACTIVE;

      // Tab Filtering
      let matchesTab = true;
      if (activeTab === 'ACTIVE') matchesTab = isActive;
      else if (activeTab === 'RESERVED') matchesTab = r.status === RentalStatus.RESERVED;
      else if (activeTab === 'DUE_TODAY') matchesTab = isDueToday;
      else if (activeTab === 'OVERDUE') matchesTab = isOverdue;
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

  // KPIs & Counts
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const allCount = rentals.length;
  const reservedCount = rentals.filter(r => r.status === RentalStatus.RESERVED).length;
  const activeCount = rentals.filter(r => {
    const d = parseISO(r.expectedReturnDate);
    d.setHours(0, 0, 0, 0);
    return r.status === 'ACTIVE' && isAfter(d, today);
  }).length;

  const dueTodayCount = rentals.filter(r => {
    const d = parseISO(r.expectedReturnDate);
    d.setHours(0, 0, 0, 0);
    return r.status === 'ACTIVE' && isSameDay(d, today);
  }).length;

  const overdueCount = rentals.filter(r => {
    const d = parseISO(r.expectedReturnDate);
    d.setHours(0, 0, 0, 0);
    return r.status === 'ACTIVE' && isBefore(d, today);
  }).length;

  const returnedCount = rentals.filter(r => r.status === 'RETURNED').length;

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
                {activeCount + dueTodayCount} Active Leases
              </span>
              {reservedCount > 0 && (
                <span className="text-[10px] font-extrabold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-md">
                  {reservedCount} Reserved
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Manage garment rentals, return schedules, and security deposits</p>
          </div>
        </div>

        <button
          onClick={() => handleOpenStandardBooking()}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#fe569f] hover:bg-[#eb4890] text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-xs transition-all active:scale-95 shrink-0"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>New / Advance Booking</span>
        </button>
      </div>

      {/* ── KPI Cards (5 Cards) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div
          onClick={() => setActiveTab('ACTIVE')}
          className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer ${activeTab === 'ACTIVE'
            ? 'bg-[#fe569f]/10 border-[#fe569f]/50 shadow-card'
            : 'bg-white hover:bg-slate-50/60 border-slate-200/90 shadow-card hover:border-[#fe569f]/30'
            }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-slate-500 whitespace-nowrap">Active (Upcoming)</span>
            <div className="w-8 h-8 rounded-xl bg-[#fe569f]/10 text-[#fe569f] flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
              <Calendar size={15} />
            </div>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none whitespace-nowrap truncate">{activeCount}</h3>
          <p className="text-xs font-extrabold text-[#fe569f] mt-2 whitespace-nowrap truncate">On schedule</p>
        </div>

        <div
          onClick={() => setActiveTab('RESERVED')}
          className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer ${activeTab === 'RESERVED'
            ? 'bg-amber-100/60 border-amber-400 shadow-card'
            : 'bg-white hover:bg-amber-50/40 border-slate-200/90 shadow-card hover:border-amber-300'
            }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-amber-800 whitespace-nowrap">Advance Booked</span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
              <CalendarDays size={15} />
            </div>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none whitespace-nowrap truncate">{reservedCount}</h3>
          <p className="text-xs font-extrabold text-amber-700 mt-2 whitespace-nowrap truncate">Future functions</p>
        </div>

        <div
          onClick={() => setActiveTab('DUE_TODAY')}
          className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer ${activeTab === 'DUE_TODAY'
            ? 'bg-amber-50 border-amber-300 shadow-card'
            : dueTodayCount > 0
              ? 'bg-amber-50/40 border-amber-200 shadow-card hover:border-amber-300'
              : 'bg-white hover:bg-slate-50/60 border-slate-200/90 shadow-card hover:border-amber-200'
            }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-amber-700 whitespace-nowrap">Due Today</span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
              <Clock size={15} />
            </div>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none whitespace-nowrap truncate">{dueTodayCount}</h3>
          <p className="text-xs font-extrabold text-amber-700 mt-2 whitespace-nowrap truncate">Expected return today</p>
        </div>

        <div
          onClick={() => setActiveTab('OVERDUE')}
          className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer ${activeTab === 'OVERDUE'
            ? 'bg-rose-50/70 border-rose-300 shadow-card'
            : overdueCount > 0
              ? 'bg-rose-50/30 border-rose-200/80 shadow-card hover:border-rose-300'
              : 'bg-white hover:bg-slate-50/60 border-slate-200/90 shadow-card hover:border-rose-200'
            }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[10px] sm:text-xs font-extrabold uppercase tracking-wider whitespace-nowrap ${overdueCount > 0 ? 'text-rose-600' : 'text-slate-500'}`}>Overdue</span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs ${overdueCount > 0 ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-400'}`}>
              <AlertTriangle size={15} />
            </div>
          </div>
          <h3 className={`text-xl sm:text-2xl font-black tracking-tight leading-none whitespace-nowrap truncate ${overdueCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>{overdueCount}</h3>
          <p className={`text-xs font-extrabold mt-2 whitespace-nowrap truncate ${overdueCount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
            {overdueCount > 0 ? 'Late / Action required' : 'No overdue items'}
          </p>
        </div>

        <div className="bg-white hover:bg-slate-50/60 p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-card hover:border-[#01a9fb]/50 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-slate-500 whitespace-nowrap">Security Held</span>
            <div className="w-8 h-8 rounded-xl bg-[#01a9fb]/10 text-[#01a9fb] flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
              <IndianRupee size={15} />
            </div>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-[#01a9fb] tracking-tight leading-none whitespace-nowrap truncate">{formatCurrency(activeDeposits)}</h3>
          <p className="text-xs font-extrabold text-[#01a9fb] mt-2 whitespace-nowrap truncate">Refundable on return</p>
        </div>
      </div>

      {/* ── Toolbar: Status Tabs + Search + Filters + View Toggle ── */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Status Tabs: ALL, ACTIVE, RESERVED, DUE TODAY, OVERDUE, RETURNED */}
          <div className="flex flex-wrap bg-slate-100/90 p-1 rounded-xl border border-slate-200/70 shrink-0 gap-1">
            {[
              { id: 'ALL' as const, label: 'All', count: allCount },
              { id: 'ACTIVE' as const, label: 'Active', count: activeCount },
              { id: 'RESERVED' as const, label: 'Reserved', shortLabel: 'Res.', count: reservedCount },
              { id: 'DUE_TODAY' as const, label: 'Due Today', shortLabel: 'Due', count: dueTodayCount },
              { id: 'OVERDUE' as const, label: 'Overdue', count: overdueCount },
              { id: 'RETURNED' as const, label: 'Returned', shortLabel: 'Done', count: returnedCount },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-1.5 px-2.5 sm:px-3.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 text-center shrink-0 ${
                  activeTab === tab.id
                    ? 'bg-[#fe569f] text-white shadow-md shadow-pink-500/25 scale-[1.02]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                }`}
                title={tab.label}
              >
                <span>
                  <span className="sm:hidden">{tab.shortLabel || tab.label}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                </span>
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black leading-none ${
                  activeTab === tab.id ? 'bg-white/30 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-1 md:justify-end">
            {/* Search Input */}
            <div className="relative group flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#fe569f] transition-colors" size={15} strokeWidth={2.5} />
              <input
                type="text"
                placeholder="Search invoice, customer, product..."
                className="w-full pl-10 pr-3.5 py-2 bg-white border border-slate-200/90 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-[#fe569f] focus:ring-2 focus:ring-[#fe569f]/10 transition-all shadow-xs placeholder:text-slate-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filter Toggle Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-xl border transition-all flex items-center justify-center shrink-0 ${showFilters ? 'bg-slate-900 text-white border-slate-900 shadow-xs' : 'bg-white text-slate-600 border-slate-200/90 hover:border-slate-300 shadow-xs'}`}
              title="Advanced Filters"
            >
              <Filter size={15} strokeWidth={showFilters ? 3 : 2.5} />
            </button>

            {/* Card vs List vs Calendar View Toggle */}
            <div className="inline-flex bg-white p-1 rounded-xl border border-slate-200/90 shadow-xs shrink-0 gap-0.5">
              <button
                onClick={() => setViewMode('card')}
                className={`p-1.5 rounded-lg transition-all ${viewMode === 'card' ? 'bg-[#fe569f] text-white shadow-xs' : 'text-slate-400 hover:text-slate-700'}`}
                title="Card View"
              >
                <LayoutGrid size={15} strokeWidth={2.5} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-[#fe569f] text-white shadow-xs' : 'text-slate-400 hover:text-slate-700'}`}
                title="List View"
              >
                <List size={15} strokeWidth={2.5} />
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`p-1.5 px-2 rounded-lg transition-all flex items-center gap-1.5 text-xs font-black uppercase tracking-wider ${viewMode === 'calendar' ? 'bg-[#fe569f] text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                title="Advance Availability Calendar"
              >
                <CalendarDays size={15} strokeWidth={2.5} />
                <span className="hidden sm:inline text-[10px]">Calendar</span>
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

        {/* ── View Mode: CALENDAR / CARD / LIST ── */}
        {viewMode === 'calendar' ? (
          <AvailabilityCalendar
            onBookReservation={(productId, startDate, returnDate) => {
              handleOpenReservationBooking(productId, startDate, returnDate);
            }}
            onViewRentalDetails={(rental) => {
              setSelectedRental(rental);
            }}
          />
        ) : viewMode === 'card' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3.5">
            {filteredRentals.map(rental => {
              const customer = customers.find(c => c.id === rental.customerId);
              const product = products.find(p => p.id === rental.productId);
              const progress = getProgress(rental.startDate, rental.expectedReturnDate);
              
              const itemReturnDate = parseISO(rental.expectedReturnDate);
              itemReturnDate.setHours(0, 0, 0, 0);
              const isItemDueToday = isSameDay(itemReturnDate, today) && rental.status === RentalStatus.ACTIVE;
              const isItemLate = isBefore(itemReturnDate, today) && rental.status === RentalStatus.ACTIVE;
              const netRefundable = Math.max(0, (rental.securityDeposit || 0) - (rental.totalRentAmount || 0));

              return (
                <div
                  key={rental.id}
                  className={`bg-white rounded-2xl border p-3 sm:p-4 transition-all duration-200 flex flex-col justify-between group hover:border-[#fe569f]/50 shadow-card relative overflow-hidden ${
                    rental.status === RentalStatus.RESERVED
                      ? 'border-amber-300 bg-amber-50/10'
                      : isItemLate
                        ? 'border-rose-300'
                        : isItemDueToday
                          ? 'border-amber-300'
                          : 'border-slate-200/90'
                  }`}
                >
                  {/* Floating Top-Right Status Badge */}
                  <div className="absolute top-2 right-2 z-10">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-tight shadow-xs ${
                      rental.status === 'RETURNED'
                        ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                        : rental.status === RentalStatus.RESERVED
                          ? 'bg-amber-500 text-white shadow-amber-500/20'
                          : isItemLate
                            ? 'bg-rose-500 text-white shadow-rose-500/20 animate-pulse'
                            : isItemDueToday
                              ? 'bg-amber-500 text-white shadow-amber-500/20'
                              : 'bg-[#fe569f] text-white shadow-pink-500/20'
                    }`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                      <span>
                        {rental.status === 'RETURNED' 
                          ? 'Returned' 
                          : rental.status === RentalStatus.RESERVED
                            ? 'Reserved'
                            : isItemLate 
                              ? 'Overdue' 
                              : isItemDueToday 
                                ? 'Due Today' 
                                : 'Active'}
                      </span>
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {/* Top Row: Customer Info with right clearance for badge */}
                    <div className="flex items-center gap-2 pr-16 sm:pr-20 pb-2 border-b border-slate-100">
                      <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[#fe569f]/10 text-[#fe569f] font-black text-xs flex items-center justify-center shrink-0">
                        {(customer?.name || 'C').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-extrabold text-xs sm:text-[13px] text-slate-900 leading-tight truncate">
                          {customer?.name || 'Customer'}
                        </h4>
                        <p className="text-[9px] text-slate-400 font-mono leading-none mt-0.5">{rental.invoiceNumber}</p>
                      </div>
                    </div>

                    {/* Product & Rent Amount */}
                    <div 
                      onClick={() => {
                        const effectiveProd = product || {
                          id: rental.productId || 'rental-item',
                          name: 'Rental Outfit',
                          sku: 'N/A',
                          barcode: '',
                          category: 'Rental Item',
                          gender: 'Universal',
                          subCategory: 'General',
                          clothingType: 'Standard',
                          brand: 'Store',
                          purpose: 'RENTAL' as const,
                          purchasePrice: 0,
                          sellingPrice: 0,
                          rentalPrice: rental.dailyRate || 0,
                          taxPercent: 0,
                          stockQuantity: 0,
                          saleStock: 0,
                          rentalStock: 0,
                          minStockAlert: 0,
                          supplierId: '',
                          description: '',
                          sizes: [],
                          images: []
                        };
                        setViewingProduct(effectiveProd);
                      }}
                      className="bg-slate-50/90 px-2 sm:px-3 py-1.5 rounded-xl border border-slate-100 transition-all hover:bg-[#fe569f]/5 hover:border-[#fe569f]/30 cursor-pointer group/item"
                      title="Click to view product details"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] sm:text-[11px] font-bold text-slate-800 truncate flex-1 leading-tight group-hover/item:text-[#fe569f] flex items-center gap-1">
                          <Package size={12} className="shrink-0 text-slate-400 group-hover/item:text-[#fe569f]" />
                          <span className="truncate">{product?.name || 'Garment Item'}</span>
                        </span>
                        <span className="text-xs sm:text-sm font-black text-slate-900 font-mono whitespace-nowrap shrink-0">
                          {formatCurrency(rental.totalRentAmount)}
                        </span>
                      </div>
                    </div>

                    {/* Due Date & Deposit Section */}
                    <div className="space-y-1.5 bg-slate-50/70 p-2 sm:p-3 rounded-xl border border-slate-100/90 text-[10px]">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-slate-400 uppercase tracking-wider text-[9px] font-bold shrink-0">Due Date</span>
                        <span className={`font-mono font-black whitespace-nowrap text-[10px] sm:text-xs ${isItemLate ? 'text-rose-600' : isItemDueToday ? 'text-amber-700' : 'text-slate-800'}`}>
                          {format(parseISO(rental.expectedReturnDate), 'dd MMM yyyy')}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-1">
                        <span className="text-slate-400 uppercase tracking-wider text-[9px] font-bold shrink-0">Deposit Held</span>
                        <span className="font-mono font-bold text-slate-700 whitespace-nowrap text-[10px]">
                          {formatCurrency(rental.securityDeposit)}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="pt-1">
                        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              rental.status === 'RETURNED'
                                ? 'bg-emerald-500'
                                : isItemLate
                                  ? 'bg-rose-500'
                                  : progress > 80
                                    ? 'bg-amber-400'
                                    : 'bg-[#fe569f]'
                            }`}
                            style={{ width: rental.status === 'RETURNED' ? '100%' : `${progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="flex items-center justify-between gap-1 pt-2.5 mt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1 shrink-0">
                      {rental.status === 'ACTIVE' && (
                        <button
                          type="button"
                          onClick={() => openExtend(rental)}
                          className="p-1.5 text-slate-500 hover:text-[#01a9fb] hover:bg-[#01a9fb]/10 rounded-lg transition-colors"
                          title="Extend Lease"
                        >
                          <CalendarDays size={14} strokeWidth={2.2} />
                        </button>
                      )}

                      {rental.status === RentalStatus.RESERVED && (
                        <button
                          type="button"
                          onClick={() => handleCancelReservation(rental)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Cancel Reservation"
                        >
                          <XCircle size={14} strokeWidth={2.2} />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => openEdit(rental)}
                        className="p-1.5 text-slate-500 hover:text-[#fe569f] hover:bg-[#fe569f]/10 rounded-lg transition-colors"
                        title="Edit Booking"
                      >
                        <Pencil size={14} strokeWidth={2.2} />
                      </button>

                      {(settings?.enableDeleteRentals || settings?.enableDeleteTransactions) && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Delete rental booking ${rental.invoiceNumber}?`)) {
                              deleteRental(rental.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Booking"
                        >
                          <Trash2 size={14} strokeWidth={2.2} />
                        </button>
                      )}
                    </div>

                    {rental.status === 'ACTIVE' && (
                      <button
                        type="button"
                        onClick={() => { setSelectedRental(rental); setIsCheckInModalOpen(true); }}
                        className="px-2.5 py-1 sm:px-3 sm:py-1 bg-[#fe569f] hover:bg-[#eb4890] active:scale-95 text-white rounded-lg text-[10px] font-black uppercase tracking-tight transition-all shadow-xs shrink-0 flex items-center justify-center"
                      >
                        Return
                      </button>
                    )}

                    {rental.status === RentalStatus.RESERVED && (
                      <button
                        type="button"
                        onClick={() => handleHandoverReservation(rental)}
                        className="px-2.5 py-1 sm:px-3 sm:py-1 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white rounded-lg text-[10px] font-black uppercase tracking-tight transition-all shadow-xs shrink-0 flex items-center gap-1"
                        title="Issue outfit handover to customer"
                      >
                        <Check size={12} strokeWidth={2.5} />
                        <span>Handover</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── View Mode 2: LIST / TABLE VIEW ── */
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card overflow-hidden">
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
                    
                    const itemReturnDate = parseISO(rental.expectedReturnDate);
                    itemReturnDate.setHours(0, 0, 0, 0);
                    const isItemDueToday = isSameDay(itemReturnDate, today) && rental.status === RentalStatus.ACTIVE;
                    const isItemLate = isBefore(itemReturnDate, today) && rental.status === RentalStatus.ACTIVE;
                    const netRefundable = Math.max(0, (rental.securityDeposit || 0) - (rental.totalRentAmount || 0));

                    return (
                      <tr key={rental.id} className="hover:bg-slate-50/70 transition-colors group">
                        <td className="px-5 py-3.5">
                          <p className="font-extrabold text-[#fe569f] font-mono">{rental.invoiceNumber}</p>
                          <p className="text-[11px] text-slate-800 font-bold mt-0.5">{customer?.name || 'Customer'}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <button
                            type="button"
                            onClick={() => product && setViewingProduct(product)}
                            className={`text-left ${product ? 'hover:text-[#fe569f] group-hover:underline cursor-pointer' : ''}`}
                            title={product ? 'Click to view product' : ''}
                          >
                            <p className="font-bold text-slate-800 flex items-center gap-1.5">
                              <Package size={13} className="text-slate-400" />
                              <span>{product?.name || 'Item'}</span>
                            </p>
                            <p className="text-[10px] text-slate-400 font-bold">Qty: {rental.quantity}</p>
                          </button>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-bold text-slate-700">
                            {format(parseISO(rental.startDate), 'dd MMM')} → <span className={isItemLate ? 'text-rose-600 font-extrabold' : isItemDueToday ? 'text-amber-700 font-extrabold' : 'text-slate-900 font-bold'}>{format(parseISO(rental.expectedReturnDate), 'dd MMM yyyy')}</span>
                          </p>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-extrabold text-slate-900 font-mono">{formatCurrency(rental.totalRentAmount)}</p>
                          <p className="text-[10px] text-slate-500 font-medium">
                            Dep: {formatCurrency(rental.securityDeposit)} • <span className="text-emerald-700 font-bold">Ref: {formatCurrency(netRefundable)}</span>
                          </p>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${
                            rental.status === 'RETURNED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : rental.status === RentalStatus.RESERVED
                                ? 'bg-amber-50 text-amber-800 border border-amber-300'
                                : isItemLate
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : isItemDueToday
                                    ? 'bg-amber-50 text-amber-700 border border-amber-300'
                                    : 'bg-pink-50 text-[#fe569f] border border-pink-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              rental.status === 'RETURNED' 
                                ? 'bg-emerald-500' 
                                : rental.status === RentalStatus.RESERVED
                                  ? 'bg-amber-500'
                                  : isItemLate 
                                    ? 'bg-rose-500' 
                                    : isItemDueToday 
                                      ? 'bg-amber-500' 
                                      : 'bg-[#fe569f]'
                            }`}></span>
                            {rental.status === 'RETURNED' 
                              ? 'Returned' 
                              : rental.status === RentalStatus.RESERVED
                                ? 'Reserved'
                                : isItemLate 
                                  ? 'Overdue' 
                                  : isItemDueToday 
                                    ? 'Due Today' 
                                    : 'Active'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEdit(rental)}
                              className="p-1.5 text-slate-400 hover:text-[#fe569f] hover:bg-pink-50 rounded-lg transition-colors"
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

                            {rental.status === RentalStatus.RESERVED && (
                              <>
                                <button
                                  onClick={() => handleCancelReservation(rental)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                                  title="Cancel Reservation"
                                >
                                  <XCircle size={15} strokeWidth={2.2} />
                                </button>
                                <button
                                  onClick={() => handleHandoverReservation(rental)}
                                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-black uppercase tracking-tight transition-all active:scale-95 shadow-xs flex items-center gap-1"
                                  title="Customer collecting dress - start active rental"
                                >
                                  <Check size={12} strokeWidth={2.5} />
                                  <span>Handover</span>
                                </button>
                              </>
                            )}

                            {rental.status === 'ACTIVE' && (
                              <>
                                <button
                                  onClick={() => openExtend(rental)}
                                  className="p-1.5 text-slate-400 hover:text-[#01a9fb] hover:bg-[#01a9fb]/10 rounded-lg transition-colors"
                                  title="Extend Duration"
                                >
                                  <CalendarDays size={15} strokeWidth={2.2} />
                                </button>
                                <button
                                  onClick={() => { setSelectedRental(rental); setIsCheckInModalOpen(true); }}
                                  className="px-3 py-1.5 bg-[#fe569f] hover:bg-[#eb4890] text-white rounded-lg text-[10px] font-black uppercase tracking-tight transition-all active:scale-95 shadow-xs"
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
        {viewMode !== 'calendar' && filteredRentals.length === 0 && (
          <div className="py-16 text-center bg-white rounded-2xl border border-slate-200/90 shadow-card">
            <div className="w-14 h-14 bg-pink-50 border border-pink-100 rounded-2xl flex items-center justify-center text-[#fe569f] mx-auto mb-3 shadow-2xs">
              <Calendar size={24} strokeWidth={2} />
            </div>
            <p className="text-slate-800 text-sm font-black">No {activeTab.toLowerCase()} rentals found</p>
            <p className="text-slate-400 text-xs mt-1">Try clearing filters or create a new rental booking</p>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      <NewRentalModal 
        isOpen={isNewRentalModalOpen} 
        onClose={() => { 
          setIsNewRentalModalOpen(false); 
          setReservationInitialData({ mode: 'IMMEDIATE' }); 
        }} 
        initialProductId={reservationInitialData.productId}
        initialStartDate={reservationInitialData.startDate}
        initialExpectedReturnDate={reservationInitialData.returnDate}
        initialMode={reservationInitialData.mode}
      />
      <ReturnRentalModal isOpen={isCheckInModalOpen} onClose={() => { setIsCheckInModalOpen(false); setSelectedRental(null); }} rental={selectedRental} />
      <EditRentalModal isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); setEditingRental(null); }} rental={editingRental} />

      {/* Extend Rental Modal */}
      <Modal isOpen={isExtendModalOpen} onClose={() => setIsExtendModalOpen(false)} title="Extend Rental Booking">
        {selectedRental && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current Expected Return</p>
              <p className="text-sm font-black text-slate-900 font-mono">{format(parseISO(selectedRental.expectedReturnDate), 'dd MMMM yyyy')}</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-slate-600 tracking-wider">Extend By (Days)</label>
              <input
                type="number"
                min="1"
                value={extendDays}
                onChange={e => setExtendDays(Math.max(1, Number(e.target.value)))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/90 focus:bg-white focus:border-[#fe569f] focus:ring-2 focus:ring-pink-100 rounded-xl outline-none font-black text-sm text-slate-900 transition-all"
              />
            </div>

            <div className="p-4 bg-pink-50/60 border border-pink-200/80 rounded-xl flex justify-between items-center text-xs">
              <span className="font-black text-pink-950 uppercase text-[10px] tracking-wider">Additional Rental Cost</span>
              <span className="font-black text-[#fe569f] font-mono text-base">
                +{formatCurrency(extendDays * (selectedRental.dailyRate || 0) * (selectedRental.quantity || 1))}
              </span>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsExtendModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl font-bold text-xs text-slate-600 hover:bg-slate-100 border border-slate-200/90 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmExtend}
                className="flex-1 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider bg-[#fe569f] hover:bg-[#eb4890] text-white shadow-xs transition-all active:scale-95"
              >
                Confirm Extension
              </button>
            </div>
          </div>
        )}
      </Modal>
      {/* Product Read-Only Details Modal Triggered from Rental Item */}
      <ProductDetailsModal
        isOpen={!!viewingProduct}
        onClose={() => setViewingProduct(null)}
        product={viewingProduct}
      />
    </div>
  );
};

export default Rentals;
