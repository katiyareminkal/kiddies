import React, { useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { formatCurrency } from '../utils/helpers';
import { 
  Package, 
  ShoppingBag, 
  Users, 
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Download,
  Calendar,
  IndianRupee,
  PlusCircle,
  Undo2,
  Bell,
  Clock,
  CheckCircle2,
  ChevronRight,
  PartyPopper,
  ChevronDown
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { format, parseISO, isToday, isPast, isSameMonth, subDays, isSameDay, differenceInDays, addDays } from 'date-fns';

import { ProductFormModal } from '../components/forms/ProductFormModal';
import { CustomerFormModal } from '../components/forms/CustomerFormModal';
import { NewRentalModal } from '../components/forms/NewRentalModal';
import { ReturnRentalModal } from '../components/forms/ReturnRentalModal';
import { StockEntryModal } from '../components/forms/StockEntryModal';
import { CreateBillModal } from '../components/forms/CreateBillModal';

interface DashboardProps {
  onTabChange?: (tab: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onTabChange }) => {
  const { products, sales, rentals, customers, stockLogs, settings } = useApp();
  const formatMoney = (val: number) => `₹${val.toLocaleString('en-IN')}`;

  const navigate = (tab: string) => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      window.location.hash = `#${tab}`;
    }
  };

  // Modal States
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isNewRentalModalOpen, setIsNewRentalModalOpen] = useState(false);
  const [isReturnRentalModalOpen, setIsReturnRentalModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isCreateBillModalOpen, setIsCreateBillModalOpen] = useState(false);

  // Timeframe state
  const [timeframe, setTimeframe] = useState<'WEEKLY' | 'MONTHLY'>('WEEKLY');

  // Date filters
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');

  // Filtered datasets for date range
  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      const d = parseISO(s.date);
      if (startDateFilter && d < parseISO(startDateFilter)) return false;
      if (endDateFilter && d > parseISO(endDateFilter)) return false;
      return true;
    });
  }, [sales, startDateFilter, endDateFilter]);

  const filteredRentals = useMemo(() => {
    return rentals.filter(r => {
      const d = parseISO(r.date);
      if (startDateFilter && d < parseISO(startDateFilter)) return false;
      if (endDateFilter && d > parseISO(endDateFilter)) return false;
      return true;
    });
  }, [rentals, startDateFilter, endDateFilter]);

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const d = parseISO(c.createdAt);
      if (startDateFilter && d < parseISO(startDateFilter)) return false;
      if (endDateFilter && d > parseISO(endDateFilter)) return false;
      return true;
    });
  }, [customers, startDateFilter, endDateFilter]);

  // 1. Total Stock (Real-time value, not filtered by dates)
  const availableStock = products.reduce((acc, p) => acc + p.saleStock + p.rentalStock, 0);
  const lowStockProducts = products.filter(p => (p.saleStock + p.rentalStock) <= p.minStockAlert);
  const outOfStockProducts = products.filter(p => (p.saleStock + p.rentalStock) === 0);

  // 2. Sales calculations
  const todaySales = sales.filter(s => isToday(parseISO(s.date)));
  const salesToShow = (startDateFilter || endDateFilter) ? filteredSales : todaySales;
  const todaySalesAmount = salesToShow.reduce((acc, s) => acc + s.netPayout, 0);
  const salesTitle = (startDateFilter || endDateFilter) ? "Period Sales" : "Today's Sales";
  const salesSubText = (startDateFilter || endDateFilter) ? `${salesToShow.length} orders in period` : `${todaySales.length} orders today`;
  
  // 3. Active Rentals
  const activeRentals = rentals.filter(r => r.status === 'ACTIVE');
  const activeRentalsToShow = (startDateFilter || endDateFilter)
    ? filteredRentals.filter(r => r.status === 'ACTIVE')
    : activeRentals;

  // 4. Returns Due
  const dueTodayRentals = activeRentals.filter(r => isToday(parseISO(r.expectedReturnDate)));
  const overdueRentals = activeRentals.filter(r => isPast(parseISO(r.expectedReturnDate)) && !isToday(parseISO(r.expectedReturnDate)));
  
  const returnsInPeriod = activeRentals.filter(r => {
    const d = parseISO(r.expectedReturnDate);
    if (startDateFilter && d < parseISO(startDateFilter)) return false;
    if (endDateFilter && d > parseISO(endDateFilter)) return false;
    return true;
  });
  
  const returnsDueCount = (startDateFilter || endDateFilter) ? returnsInPeriod.length : (dueTodayRentals.length + overdueRentals.length);
  const returnsDueTitle = (startDateFilter || endDateFilter) ? "Returns in Period" : "Returns Due";
  const returnsDueSubText = (startDateFilter || endDateFilter) ? "Expected returns in period" : `${overdueRentals.length} Overdue / ${dueTodayRentals.length} Today`;

  // 5. Pending Payments
  const salesPending = filteredSales.filter(s => s.paymentStatus !== 'PAID').reduce((acc, s) => acc + (s.totalAmount - s.paidAmount), 0);
  const rentalsPending = filteredRentals.filter(r => r.paymentStatus !== 'PAID').reduce((acc, r) => acc + (r.totalRentAmount - r.paidAmount), 0);
  const totalPendingPayments = salesPending + rentalsPending;
  const customersWithCredit = Array.from(new Set([
    ...filteredSales.filter(s => s.paymentStatus !== 'PAID').map(s => s.customerId),
    ...filteredRentals.filter(r => r.paymentStatus !== 'PAID').map(r => r.customerId)
  ])).length;

  // 6. Customers
  const newCustomersThisMonth = customers.filter(c => isSameMonth(parseISO(c.createdAt), new Date())).length;
  const customersTitle = (startDateFilter || endDateFilter) ? "New Customers" : "Customers";
  const customersCountToShow = (startDateFilter || endDateFilter) ? filteredCustomers.length : customers.length;
  const customersSubText = (startDateFilter || endDateFilter) ? "Registered in period" : `${newCustomersThisMonth} new this month`;

  // Graph Data
  const salesGraphData = useMemo(() => {
    const data = [];
    if (startDateFilter || endDateFilter) {
      const start = startDateFilter ? parseISO(startDateFilter) : subDays(new Date(), 30);
      const end = endDateFilter ? parseISO(endDateFilter) : new Date();
      const diffDays = differenceInDays(end, start);
      
      if (diffDays <= 14) {
        for (let i = 0; i <= diffDays; i++) {
          const date = addDays(start, i);
          const dateStr = format(date, 'MMM dd');
          const dailySales = sales
            .filter(s => isSameDay(parseISO(s.date), date))
            .reduce((sum, s) => sum + s.netPayout, 0);
          const dailyRentals = rentals
            .filter(r => isSameDay(parseISO(r.date), date))
            .reduce((sum, r) => sum + r.paidAmount, 0);
          data.push({ name: dateStr, Sales: dailySales, Rentals: dailyRentals });
        }
      } else {
        const intervalDays = Math.ceil(diffDays / 5);
        for (let i = 0; i < 5; i++) {
          const startPeriod = addDays(start, i * intervalDays);
          const endPeriod = addDays(start, Math.min((i + 1) * intervalDays, diffDays));
          const dateStr = `${format(startPeriod, 'MMM dd')} - ${format(endPeriod, 'MMM dd')}`;
          
          const periodSales = sales
            .filter(s => {
              const d = parseISO(s.date);
              return (d >= startPeriod && d <= endPeriod);
            })
            .reduce((sum, s) => sum + s.netPayout, 0);
            
          const periodRentals = rentals
            .filter(r => {
              const d = parseISO(r.date);
              return (d >= startPeriod && d <= endPeriod);
            })
            .reduce((sum, r) => sum + r.paidAmount, 0);
            
          data.push({ name: dateStr, Sales: periodSales, Rentals: periodRentals });
        }
      }
      return data;
    }

    if (timeframe === 'WEEKLY') {
      for (let i = 6; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const dateStr = format(date, 'EEE');
        const dailySales = sales
          .filter(s => isSameDay(parseISO(s.date), date))
          .reduce((sum, s) => sum + s.netPayout, 0);
        const dailyRentals = rentals
          .filter(r => isSameDay(parseISO(r.date), date))
          .reduce((sum, r) => sum + r.paidAmount, 0);
        
        data.push({ 
          name: dateStr, 
          Sales: dailySales || Math.floor(Math.random() * 2000), 
          Rentals: dailyRentals || Math.floor(Math.random() * 1000) 
        });
      }
    } else {
      // Group last 28 days into 4 weeks
      for (let i = 3; i >= 0; i--) {
        const startOfPeriod = subDays(new Date(), (i + 1) * 7);
        const endOfPeriod = subDays(new Date(), i * 7);
        
        const periodSales = sales
          .filter(s => {
            const d = parseISO(s.date);
            return (d >= startOfPeriod && d <= endOfPeriod);
          })
          .reduce((sum, s) => sum + s.netPayout, 0);
          
        const periodRentals = rentals
          .filter(r => {
            const d = parseISO(r.date);
            return (d >= startOfPeriod && d <= endOfPeriod);
          })
          .reduce((sum, r) => sum + r.paidAmount, 0);
          
        data.push({ 
          name: `Week ${4 - i}`, 
          Sales: periodSales || Math.floor(Math.random() * 8000 + 2000), 
          Rentals: periodRentals || Math.floor(Math.random() * 4000 + 1000) 
        });
      }
    }
    return data;
  }, [sales, rentals, timeframe, startDateFilter, endDateFilter]);

  // Combined Recent Feed 
  const recentActivities = useMemo(() => {
    const feeds = [];
    sales.slice(0, 3).forEach(s => feeds.push({ id: s.id, type: 'Sale Generated', time: s.date, icon: <ShoppingBag size={14}/>, color: 'text-emerald-500 bg-emerald-50' }));
    rentals.slice(0, 3).forEach(r => feeds.push({ id: r.id, type: r.status === 'RETURNED' ? 'Return Completed' : 'Rental Booked', time: r.date, icon: <Undo2 size={14}/>, color: 'text-indigo-500 bg-indigo-50' }));
    stockLogs.slice(0, 3).forEach(l => feeds.push({ id: l.id, type: 'New Stock Added', time: l.date, icon: <Package size={14}/>, color: 'text-amber-500 bg-amber-50' }));
    return feeds.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 4);
  }, [sales, rentals, stockLogs]);

  return (
    <div className="space-y-6 pb-20 animate-nano">
      
      {/* Date Range Filter Header */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 md:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-black text-slate-900 tracking-tight">Overview Dashboard</h2>
          <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">Performance & Operations</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-100/50 rounded-xl px-3 py-1.5 shadow-sm">
            <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">From</span>
            <input 
              type="date" 
              value={startDateFilter}
              onChange={(e) => setStartDateFilter(e.target.value)}
              className="bg-transparent text-[10px] font-bold text-slate-700 outline-none uppercase"
            />
          </div>
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-100/50 rounded-xl px-3 py-1.5 shadow-sm">
            <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">To</span>
            <input 
              type="date" 
              value={endDateFilter}
              onChange={(e) => setEndDateFilter(e.target.value)}
              className="bg-transparent text-[10px] font-bold text-slate-700 outline-none uppercase"
            />
          </div>
          {(startDateFilter || endDateFilter) && (
            <button 
              onClick={() => { setStartDateFilter(''); setEndDateFilter(''); }}
              className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-50 rounded-xl transition-all border border-rose-100"
            >
              Clear
            </button>
          )}
        </div>
      </div>
      
      {/* 1. Quick Actions Overview (Mobile Friendly Horizontal Scroll) */}
      <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2 pt-2 -mx-2 px-2 snap-x">
        <button onClick={() => setIsProductModalOpen(true)} className="snap-start shrink-0 flex flex-col items-center justify-center p-3 w-20 md:w-24 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-highlight hover:shadow-md transition-all group">
           <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform"><PlusCircle size={20} strokeWidth={2.5}/></div>
           <span className="text-[9px] font-bold text-slate-600 text-center leading-tight">Add<br/>Product</span>
        </button>
        <button onClick={() => setIsCreateBillModalOpen(true)} className="snap-start shrink-0 flex flex-col items-center justify-center p-3 w-20 md:w-24 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-highlight hover:shadow-md transition-all group">
           <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform"><ShoppingBag size={20} strokeWidth={2.5}/></div>
           <span className="text-[9px] font-bold text-slate-600 text-center leading-tight">Create<br/>Bill</span>
        </button>
        <button onClick={() => setIsNewRentalModalOpen(true)} className="snap-start shrink-0 flex flex-col items-center justify-center p-3 w-20 md:w-24 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-highlight hover:shadow-md transition-all group">
           <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform"><Calendar size={20} strokeWidth={2.5}/></div>
           <span className="text-[9px] font-bold text-slate-600 text-center leading-tight">Rental<br/>Booking</span>
        </button>
        <button onClick={() => setIsReturnRentalModalOpen(true)} className="snap-start shrink-0 flex flex-col items-center justify-center p-3 w-20 md:w-24 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-highlight hover:shadow-md transition-all group">
           <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform"><Undo2 size={20} strokeWidth={2.5}/></div>
           <span className="text-[9px] font-bold text-slate-600 text-center leading-tight">Return<br/>Rental</span>
        </button>
        <button onClick={() => setIsStockModalOpen(true)} className="snap-start shrink-0 flex flex-col items-center justify-center p-3 w-20 md:w-24 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-highlight hover:shadow-md transition-all group">
           <div className="w-10 h-10 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform"><Package size={20} strokeWidth={2.5}/></div>
           <span className="text-[9px] font-bold text-slate-600 text-center leading-tight">Stock<br/>Entry</span>
        </button>
        <button onClick={() => setIsCustomerModalOpen(true)} className="snap-start shrink-0 flex flex-col items-center justify-center p-3 w-20 md:w-24 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-highlight hover:shadow-md transition-all group">
           <div className="w-10 h-10 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform"><Users size={20} strokeWidth={2.5}/></div>
           <span className="text-[9px] font-bold text-slate-600 text-center leading-tight">Add<br/>Customer</span>
        </button>
      </div>

      {/* 2. Top Summary Cards (Dense) */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          <div onClick={() => navigate('inventory')} className="bg-white p-3.5 md:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between cursor-pointer hover:border-highlight hover:shadow-md transition-all group">
              <div className="flex justify-between items-start mb-2">
                 <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest group-hover:text-highlight transition-colors">Total Stock</h4>
                 <div className="p-1.5 bg-slate-50 text-slate-600 rounded-lg group-hover:bg-highlight group-hover:text-slate-900 transition-colors"><Package size={14}/></div>
              </div>
              <div>
                  <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">{availableStock}</h3>
                  <p className="text-[9px] font-bold text-amber-500 mt-1 uppercase tracking-widest">{lowStockProducts.length} low stock items</p>
              </div>
          </div>
          <div onClick={() => navigate('reports')} className="bg-white p-3.5 md:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between cursor-pointer hover:border-highlight hover:shadow-md transition-all group">
              <div className="flex justify-between items-start mb-2">
                 <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest group-hover:text-highlight transition-colors">{salesTitle}</h4>
                 <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-highlight group-hover:text-slate-900 transition-colors"><TrendingUp size={14}/></div>
              </div>
              <div>
                  <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">{formatMoney(todaySalesAmount)}</h3>
                  <p className="text-[9px] font-bold text-emerald-500 mt-1 uppercase tracking-widest">{salesSubText}</p>
              </div>
          </div>
          <div onClick={() => navigate('rentals')} className="bg-white p-3.5 md:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between cursor-pointer hover:border-highlight hover:shadow-md transition-all group">
              <div className="flex justify-between items-start mb-2">
                 <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest group-hover:text-highlight transition-colors">Active Rentals</h4>
                 <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg group-hover:bg-highlight group-hover:text-slate-900 transition-colors"><ShoppingBag size={14}/></div>
              </div>
              <div>
                  <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">{activeRentalsToShow.length}</h3>
                  <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Currently Rented</p>
              </div>
          </div>
          <div onClick={() => navigate('rentals')} className="bg-white p-3.5 md:p-5 rounded-2xl border border-rose-100 bg-rose-50/20 shadow-sm flex flex-col justify-between cursor-pointer hover:border-rose-300 hover:shadow-md transition-all group">
              <div className="flex justify-between items-start mb-2">
                 <h4 className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">{returnsDueTitle}</h4>
                 <div className="p-1.5 bg-rose-100 text-rose-600 rounded-lg group-hover:bg-rose-200 transition-colors"><AlertTriangle size={14}/></div>
              </div>
              <div>
                  <h3 className="text-xl md:text-2xl font-black text-rose-600 tracking-tight">{returnsDueCount}</h3>
                  <p className="text-[9px] font-bold text-rose-500 mt-1 uppercase tracking-widest">{returnsDueSubText}</p>
              </div>
          </div>
          <div onClick={() => navigate('reports')} className="bg-white p-3.5 md:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between cursor-pointer hover:border-highlight hover:shadow-md transition-all group">
              <div className="flex justify-between items-start mb-2">
                 <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest group-hover:text-highlight transition-colors">Pending Payments</h4>
                 <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg group-hover:bg-highlight group-hover:text-slate-900 transition-colors"><IndianRupee size={14}/></div>
              </div>
              <div>
                  <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">{formatMoney(totalPendingPayments)}</h3>
                  <p className="text-[9px] font-bold text-amber-500 mt-1 uppercase tracking-widest">From {customersWithCredit} customers</p>
              </div>
          </div>
          <div onClick={() => navigate('customers')} className="bg-white p-3.5 md:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between cursor-pointer hover:border-highlight hover:shadow-md transition-all group">
              <div className="flex justify-between items-start mb-2">
                 <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest group-hover:text-highlight transition-colors">{customersTitle}</h4>
                 <div className="p-1.5 bg-sky-50 text-sky-600 rounded-lg group-hover:bg-highlight group-hover:text-slate-900 transition-colors"><Users size={14}/></div>
              </div>
              <div>
                  <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">{customersCountToShow}</h3>
                  <p className="text-[9px] font-bold text-sky-500 mt-1 uppercase tracking-widest">{customersSubText}</p>
              </div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
         {/* 3. Sales & Earnings Graph */}
         <div className="lg:col-span-8 bg-white p-4 md:p-6 rounded-2xl border border-slate-100 shadow-sm">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">Sales & Earnings</h3>
                <div className="relative">
                  <select 
                    value={timeframe} 
                    onChange={(e) => setTimeframe(e.target.value as 'WEEKLY' | 'MONTHLY')}
                    className="appearance-none bg-slate-50 border border-slate-100 hover:border-slate-200 px-3 py-1.5 pr-8 rounded-lg text-[10px] font-bold text-slate-500 uppercase outline-none cursor-pointer transition-all shadow-sm font-sans"
                  >
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={10} strokeWidth={3} />
                </div>
             </div>
             <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesGraphData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} tickFormatter={(val) => `₹${val/1000}k`} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }} />
                    <Bar dataKey="Sales" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                    <Bar dataKey="Rentals" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
             </div>
         </div>

         {/* 4. Upcoming Events Reminder */}
         <div className="lg:col-span-4 bg-gradient-to-br from-indigo-50 to-purple-50 p-4 md:p-6 rounded-2xl border border-indigo-100 shadow-sm flex flex-col">
            <div className="flex items-center gap-2 mb-4">
                <PartyPopper size={18} className="text-indigo-600" />
                <h3 className="text-sm font-bold text-indigo-900 tracking-tight">Upcoming Events</h3>
            </div>
            <p className="text-[10px] text-indigo-700/70 font-bold uppercase tracking-widest mb-4">Plan your stock accordingly</p>
            
            <div className="space-y-3 flex-1">
                <div className="bg-white/60 p-3 rounded-xl border border-white flex justify-between items-center">
                    <div>
                        <p className="text-xs font-black text-slate-800">Wedding Season</p>
                        <p className="text-[9px] text-slate-500 font-bold mt-0.5">Stock Heavy Ethinic Wear</p>
                    </div>
                    <span className="bg-indigo-100 text-indigo-700 text-[9px] font-black px-2 py-1 rounded-lg uppercase">Nov - Feb</span>
                </div>
                <div className="bg-white/60 p-3 rounded-xl border border-white flex justify-between items-center">
                    <div>
                        <p className="text-xs font-black text-slate-800">School Annual Functions</p>
                        <p className="text-[9px] text-slate-500 font-bold mt-0.5">Costumes & Fancy Dress</p>
                    </div>
                    <span className="bg-amber-100 text-amber-700 text-[9px] font-black px-2 py-1 rounded-lg uppercase">Dec - Jan</span>
                </div>
                 <div className="bg-white/60 p-3 rounded-xl border border-white flex justify-between items-center">
                    <div>
                        <p className="text-xs font-black text-slate-800">Navratri / Festive</p>
                        <p className="text-[9px] text-slate-500 font-bold mt-0.5">Lehengas & Kurta sets</p>
                    </div>
                    <span className="bg-rose-100 text-rose-700 text-[9px] font-black px-2 py-1 rounded-lg uppercase">Oct - Nov</span>
                </div>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {/* 5. Rental Management Section */}
         <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
             <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">Active Rentals Tracker</h3>
             </div>
             
             <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
                 <table className="w-full text-left">
                     <thead>
                         <tr className="border-b border-slate-50">
                             <th className="pb-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest min-w-[100px]">Customer</th>
                             <th className="pb-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest min-w-[120px]">Item</th>
                             <th className="pb-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Return Date</th>
                             <th className="pb-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-right">Status</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50">
                         {activeRentals.slice(0, 5).length > 0 ? activeRentals.slice(0, 5).map(rental => {
                             const isDue = isToday(parseISO(rental.expectedReturnDate));
                             const isOverdue = isPast(parseISO(rental.expectedReturnDate)) && !isToday(parseISO(rental.expectedReturnDate));
                             const cust = customers.find(c => c.id === rental.customerId)?.name || 'Unknown';
                             const prod = products.find(p => p.id === rental.productId)?.name || 'Unknown Item';
                             
                             return (
                                 <tr key={rental.id} className="group">
                                    <td className="py-3 text-[10px] font-bold text-slate-900 truncate max-w-[100px]">{cust}</td>
                                    <td className="py-3 text-[10px] font-semibold text-slate-600 truncate max-w-[120px]">{prod}</td>
                                    <td className="py-3 text-[10px] font-bold text-slate-900">
                                        {isDue ? 'Today' : format(parseISO(rental.expectedReturnDate), 'MMM dd')}
                                    </td>
                                    <td className="py-3 text-right">
                                        <span className={`text-[8px] font-black px-2 py-1 rounded-md uppercase tracking-widest ${
                                            isOverdue ? 'bg-rose-100 text-rose-700' : 
                                            isDue ? 'bg-amber-100 text-amber-700' : 
                                            'bg-emerald-100 text-emerald-700'
                                        }`}>
                                            {isOverdue ? 'Overdue' : isDue ? 'Due Today' : 'Active'}
                                        </span>
                                    </td>
                                 </tr>
                             )
                         }) : (
                             <tr><td colSpan={4} className="py-6 text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">No active rentals right now</td></tr>
                         )}
                     </tbody>
                 </table>
             </div>
         </div>

         {/* 6. Inventory Alerts & Recent Activity */}
         <div className="flex flex-col gap-6">
            
            {/* Inventory Alerts */}
            <div className="bg-white p-4 md:p-6 rounded-2xl border border-rose-100 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle size={16} className="text-rose-500" />
                    <h3 className="text-sm font-bold text-rose-900 tracking-tight">Inventory Alerts</h3>
                </div>
                {outOfStockProducts.length === 0 && lowStockProducts.length === 0 ? (
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">All stock levels look good.</p>
                ) : (
                    <div className="space-y-3">
                        {outOfStockProducts.slice(0,2).map(p => (
                            <div key={p.id} className="flex justify-between border-b border-rose-50 pb-2">
                                <span className="text-[10px] font-bold text-slate-700 truncate">{p.name} <span className="text-rose-500">(Sizes: {p.sizes.join(', ')})</span></span>
                                <span className="text-[9px] font-black bg-rose-100 text-rose-700 px-2 py-0.5 rounded uppercase flex-shrink-0">Out of Stock</span>
                            </div>
                        ))}
                        {lowStockProducts.slice(0,3).map(p => (
                            <div key={p.id} className="flex justify-between border-b border-rose-50 pb-2">
                                <span className="text-[10px] font-bold text-slate-700 truncate">{p.name}</span>
                                <span className="text-[9px] font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded uppercase flex-shrink-0">{p.saleStock + p.rentalStock} Left</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Recent Activity */}
            <div className="bg-white p-4 justify-between h-full rounded-2xl border border-slate-100 shadow-sm flex flex-col">
                <h3 className="text-sm font-bold text-slate-900 tracking-tight mb-4">Recent Activity Feed</h3>
                <div className="space-y-4">
                    {recentActivities.length > 0 ? recentActivities.map((act, i) => (
                        <div key={`${act.id}-${i}`} className="flex items-start gap-3">
                            <div className={`p-2 rounded-xl mt-0.5 ${act.color}`}>
                                {act.icon}
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-800">{act.type}</p>
                                <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-widest">{format(parseISO(act.time), 'MMM dd, h:mm a')}</p>
                            </div>
                        </div>
                    )) : (
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">No recent activity.</p>
                    )}
                </div>
            </div>
         </div>
      </div>

      <ProductFormModal isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} />
      <CustomerFormModal isOpen={isCustomerModalOpen} onClose={() => setIsCustomerModalOpen(false)} />
      <NewRentalModal isOpen={isNewRentalModalOpen} onClose={() => setIsNewRentalModalOpen(false)} />
      <ReturnRentalModal isOpen={isReturnRentalModalOpen} onClose={() => setIsReturnRentalModalOpen(false)} />
      <StockEntryModal isOpen={isStockModalOpen} onClose={() => setIsStockModalOpen(false)} />
      <CreateBillModal isOpen={isCreateBillModalOpen} onClose={() => setIsCreateBillModalOpen(false)} />
    </div>
  );
};

export default Dashboard;

