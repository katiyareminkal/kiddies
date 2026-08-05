
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
  Image as ImageIcon,
  ChevronDown,
  Package,
  Filter,
  XCircle,
  Hash,
  CreditCard
} from 'lucide-react';
import { formatCurrency, calculateLateFee } from '../utils/helpers';
import { PaymentStatus, RentalStatus, Rental } from '../types';
import { differenceInDays, parseISO, isSameDay, isAfter, isBefore, addDays, format } from 'date-fns';
import { NewRentalModal } from '../components/forms/NewRentalModal';
import { ReturnRentalModal } from '../components/forms/ReturnRentalModal';

const Rentals: React.FC = () => {
  const { rentals, products, customers, updateRental } = useApp();
  
  // Modals
  const [isNewRentalModalOpen, setIsNewRentalModalOpen] = useState(false);
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
  
  // Selection
  const [selectedRental, setSelectedRental] = useState<Rental | null>(null);
  
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
  }

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
  }

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
      today.setHours(0,0,0,0);
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
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Rentals</h1>
          <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">Rental Desk</p>
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
          <p className="text-[9px] font-semibold uppercase text-slate-400 tracking-widest mb-0.5 group-hover:text-slate-500 transition-colors">Deposits</p>
          <h3 className="text-lg font-bold text-slate-900 group-hover:text-white transition-colors tracking-tight">{formatCurrency(activeDeposits)}</h3>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {/* Navigation & Search & Filter */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex bg-white border border-slate-100 p-1 rounded-lg w-full md:w-auto shadow-sm">
              {(['ACTIVE', 'OVERDUE', 'RETURNED'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 md:flex-none px-6 py-2 rounded-md text-[9px] font-bold uppercase tracking-widest transition-all ${
                    activeTab === tab 
                      ? 'bg-highlight text-slate-900 shadow-sm' 
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            
            <div className="flex gap-2 w-full md:w-auto">
              <div className="relative group flex-1 md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-slate-900 transition-colors" size={14} strokeWidth={2.5} />
                <input 
                  type="text" 
                  placeholder="Search Rentals..." 
                  className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-100 rounded-lg text-[10px] font-semibold uppercase tracking-widest outline-none focus:border-highlight/30 transition-all shadow-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2.5 rounded-lg border transition-all flex items-center justify-center ${showFilters ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200 shadow-sm'}`}
                title="Advanced Filters"
              >
                <Filter size={16} strokeWidth={showFilters ? 3 : 2.5} />
              </button>
            </div>
          </div>

          {/* Advanced Filters Panel */}
          {showFilters && (
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xl animate-nano space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-300 tracking-widest ml-1">From Date</label>
                  <input 
                    type="date" 
                    className="w-full bg-slate-50 border border-transparent focus:bg-white focus:border-highlight/30 rounded-xl p-3 text-[10px] font-black uppercase outline-none transition-all"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-300 tracking-widest ml-1">To Date</label>
                  <input 
                    type="date" 
                    className="w-full bg-slate-50 border border-transparent focus:bg-white focus:border-highlight/30 rounded-xl p-3 text-[10px] font-black uppercase outline-none transition-all"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-300 tracking-widest ml-1">Payment</label>
                  <select 
                    className="w-full bg-slate-50 border border-transparent focus:bg-white focus:border-highlight/30 rounded-xl p-3 text-[10px] font-black uppercase outline-none transition-all appearance-none"
                    value={filterPaymentStatus}
                    onChange={(e) => setFilterPaymentStatus(e.target.value as PaymentStatus | 'ALL')}
                  >
                    <option value="ALL">All Payments</option>
                    {Object.values(PaymentStatus).map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-300 tracking-widest ml-1">Product</label>
                  <select 
                    className="w-full bg-slate-50 border border-transparent focus:bg-white focus:border-highlight/30 rounded-xl p-3 text-[10px] font-black uppercase outline-none transition-all appearance-none"
                    value={filterProductId}
                    onChange={(e) => setFilterProductId(e.target.value)}
                  >
                    <option value="ALL">All Products</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-300 tracking-widest ml-1">Customer</label>
                  <select 
                    className="w-full bg-slate-50 border border-transparent focus:bg-white focus:border-highlight/30 rounded-xl p-3 text-[10px] font-black uppercase outline-none transition-all appearance-none"
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
                  className="px-4 py-2 text-[9px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-2"
                >
                  <XCircle size={14} /> Reset All Filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Rentals List - Mobile Friendly Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filteredRentals.map(rental => {
            const customer = customers.find(c => c.id === rental.customerId);
            const product = products.find(p => p.id === rental.productId);
            const progress = getProgress(rental.startDate, rental.expectedReturnDate);
            const isLate = activeTab === 'OVERDUE';
            
            return (
              <div key={rental.id} className="nano-card p-4 group">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center text-slate-300 border border-slate-100 group-hover:bg-highlight group-hover:text-slate-900 transition-all">
                      <Package size={18} strokeWidth={2} />
                    </div>
                    <div>
                      <h4 className="text-[13px] font-bold text-slate-900 uppercase tracking-tight group-hover:text-highlight transition-colors">{product?.name}</h4>
                      <p className="text-[9px] font-semibold text-slate-300 uppercase tracking-widest mt-0.5">{rental.invoiceNumber} • {customer?.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] font-bold text-slate-900 font-mono">{formatCurrency(rental.totalRentAmount)}</p>
                    <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">
                      Dep: {formatCurrency(rental.securityDeposit)} • <span className="text-emerald-600 font-bold">Ref: {formatCurrency(Math.max(0, rental.securityDeposit - (rental.paidAmount >= (rental.totalRentAmount + rental.securityDeposit) ? 0 : rental.totalRentAmount)))}</span>
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-[9px] font-semibold uppercase tracking-widest">
                    <span className="text-slate-300">{format(parseISO(rental.startDate), 'MMM dd')}</span>
                    <span className={isLate ? 'text-rose-500' : 'text-slate-300'}>
                      {format(parseISO(rental.expectedReturnDate), 'MMM dd')}
                    </span>
                  </div>
                  <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-700 ${
                        rental.status === 'RETURNED' ? 'bg-emerald-500' :
                        isLate ? 'bg-rose-500 animate-pulse' : 
                        progress > 80 ? 'bg-highlight' : 'bg-slate-900'
                      }`} 
                      style={{ width: rental.status === 'RETURNED' ? '100%' : `${progress}%` }}
                    ></div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-50">
                  <div className="flex items-center gap-2">
                    {rental.status === 'ACTIVE' ? (
                      <span className={`text-[9px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-md ${isLate ? 'bg-rose-50 text-rose-500' : 'bg-slate-50 text-slate-400'}`}>
                        {isLate ? 'Overdue' : 'Active'}
                      </span>
                    ) : (
                      <span className="text-[9px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-500">
                        Returned
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {rental.status === 'ACTIVE' && (
                      <>
                        <button 
                          onClick={() => openExtend(rental)}
                          className="p-1.5 text-slate-300 hover:text-highlight transition-colors"
                        >
                          <CalendarDays size={16} strokeWidth={2.5} />
                        </button>
                        <button 
                          onClick={() => { setSelectedRental(rental); setIsCheckInModalOpen(true); }}
                          className="px-4 py-2 bg-slate-900 text-white rounded-lg text-[9px] font-bold uppercase tracking-widest hover:bg-highlight hover:text-slate-900 transition-all shadow-sm"
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

            {filteredRentals.length === 0 && (
              <div className="py-12 text-center">
                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-200 mx-auto mb-3">
                  <Calendar size={24} strokeWidth={1.5} />
                </div>
                <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-widest">No {activeTab.toLowerCase()} rentals found</p>
              </div>
            )}
          </div>

      <NewRentalModal isOpen={isNewRentalModalOpen} onClose={() => setIsNewRentalModalOpen(false)} />
      
      <ReturnRentalModal isOpen={isCheckInModalOpen} onClose={() => { setIsCheckInModalOpen(false); setSelectedRental(null); }} rental={selectedRental} />

      {/* Extend Rental Modal */}
      <Modal isOpen={isExtendModalOpen} onClose={() => setIsExtendModalOpen(false)} title="Extend Rental">
          {selectedRental && (
              <div className="space-y-6">
                  <div className="bg-slate-900 p-6 rounded-3xl shadow-banana text-white border border-slate-800">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Current Due Date</p>
                      <p className="text-xl font-display font-black tracking-tighter">{format(parseISO(selectedRental.expectedReturnDate), 'dd MMMM yyyy')}</p>
                  </div>
                  
                  <div className="space-y-2">
                      <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-2">Add Days</label>
                      <div className="relative group">
                        <CalendarDays className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-highlight transition-colors" size={16} strokeWidth={3} />
                        <input 
                          type="number" 
                          min="1" 
                          value={extendDays} 
                          onChange={e => setExtendDays(Number(e.target.value))} 
                          className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-transparent focus:bg-white focus:border-highlight/30 rounded-2xl outline-none font-black text-slate-900 text-[10px] uppercase tracking-widest"
                        />
                      </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                      <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">New Due Date</p>
                      <p className="font-black text-slate-900 text-[10px] uppercase tracking-widest">{format(addDays(parseISO(selectedRental.expectedReturnDate), extendDays), 'dd MMM yyyy')}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                      <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Additional Cost</p>
                      <p className="font-black text-slate-900 text-[11px] font-mono">{formatCurrency(extendDays * selectedRental.dailyRate * selectedRental.quantity)}</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 pt-4">
                    <button type="button" onClick={() => setIsExtendModalOpen(false)} className="w-full sm:flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-[9px] text-slate-400 border border-slate-100">Cancel</button>
                    <button type="button" onClick={handleConfirmExtend} className="w-full sm:flex-1 h-14 rounded-2xl shadow-banana font-black uppercase tracking-widest text-[9px] bg-highlight text-slate-900">Save Extension</button>
                  </div>
              </div>
          )}
      </Modal>
    </div>
  );
};

export default Rentals;
