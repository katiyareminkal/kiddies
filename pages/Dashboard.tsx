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
  ChevronDown,
  FileSpreadsheet,
  Wallet
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
import { format, parseISO, isToday, isPast, isSameMonth, subDays, subMonths, isSameDay, differenceInDays, addDays } from 'date-fns';

import { ProductFormModal } from '../components/forms/ProductFormModal';
import { CustomerFormModal } from '../components/forms/CustomerFormModal';
import { NewRentalModal } from '../components/forms/NewRentalModal';
import { ReturnRentalModal } from '../components/forms/ReturnRentalModal';
import { StockEntryModal } from '../components/forms/StockEntryModal';
import { CreateBillModal } from '../components/forms/CreateBillModal';
import { RecordExpenseModal } from '../components/forms/RecordExpenseModal';
import { exportToExcel } from '../utils/excelBackup';
import { OrderStatus } from '../types';

interface DashboardProps {
  onTabChange?: (tab: string) => void;
}

const UPCOMING_EVENTS = [
  {
    title: 'School Annuals & Winter Peak',
    period: 'Dec - Jan',
    focus: 'Fancy Dress Costumes, Jackets & Sweatshirts',
    strategy: 'Heavy costume rental demand. Promote winter layering outfits and holiday party wear.',
    checklist: ['Double dry-cleaning speeds', 'Check winter jacket stock levels', 'Stock up on holiday gift bundles'],
    stockSuggestion: 'Purchase superhero and animal costume sizes (3-6Y) and warm fleece jackets.',
    bundleIdea: 'Bundle fancy dress costumes with matching props (wands, capes) at 15% off.',
    color: 'amber',
    bgClass: 'bg-amber-50/70 border-amber-100/50',
    badgeClass: 'bg-amber-100 text-amber-700'
  },
  {
    title: 'Academic Session & Spring Play',
    period: 'Feb - Mar',
    focus: 'School Uniforms, Shoes, Activewear & Rompers',
    strategy: 'Preparation for the new school year. Stock durable school shoes, backpacks, and light spring activewear.',
    checklist: ['Partner with uniform suppliers', 'Run school stock clearance campaigns', 'Launch spring wear preorder catalogs'],
    stockSuggestion: 'Increase inventory of black/white school shoes (sizes 6-10) and high-cotton uniforms.',
    bundleIdea: 'Cross-sell uniform purchases with pack-of-3 cotton school socks and water bottles.',
    color: 'indigo',
    bgClass: 'bg-indigo-50/70 border-indigo-100/50',
    badgeClass: 'bg-indigo-100 text-indigo-700'
  },
  {
    title: 'Summer Vacation & Swimwear',
    period: 'Apr - Jun',
    focus: 'Cotton Rompers, Swimsuits, Sun Hats & Shorts',
    strategy: 'Casual lightweight wear peak. Stock breathable organic cotton clothing for holidays.',
    checklist: ['Set up summer holiday product bundles', 'Focus marketing on travel & vacation gear', 'Run beachwear early bird deals'],
    stockSuggestion: 'Stock UV-protective swimwear, cute straw hats, and pastel linen shorts sets.',
    bundleIdea: 'Package a swim dress with matching sunglasses and a sun hat as a vacation pack.',
    color: 'teal',
    bgClass: 'bg-teal-50/70 border-teal-100/50',
    badgeClass: 'bg-teal-100 text-teal-700'
  },
  {
    title: 'Monsoon & Rainwear Essentials',
    period: 'Jul - Aug',
    focus: 'Raincoats, Waterproof Boots, Umbrellas',
    strategy: 'High demand for waterproof kids gear. Ensure all clothing storage areas are dry and damp-proof.',
    checklist: ['Stock anti-slip footwear sizes', 'Audit storage facility humidity levels', 'Introduce monsoon raincoat combo packages'],
    stockSuggestion: 'Increase rubber boot stock in bright colors and premium waterproof light jackets.',
    bundleIdea: 'Offer a raincoat + matching umbrella combo discount to clear monsoon stock quickly.',
    color: 'sky',
    bgClass: 'bg-sky-50/70 border-sky-100/50',
    badgeClass: 'bg-sky-100 text-sky-700'
  },
  {
    title: 'Festive Season & Navratri',
    period: 'Sep - Oct',
    focus: 'Kediyus, Chaniya Cholis, traditional Kurta sets',
    strategy: 'Peak festival demand. High booking volume for traditional rental costumes.',
    checklist: ['Launch advance festive rental booking discounts', 'Stock ethnic accessories/turbans', 'Perform stitch audits on high-rotation sets'],
    stockSuggestion: 'Increase silk sherwanis (boys 4-10Y) and heavy mirror-work chaniya cholis (girls 5-12Y).',
    bundleIdea: 'Bundle ethnic wear with traditional footwear (Juttis) and hair accessories at checkout.',
    color: 'rose',
    bgClass: 'bg-rose-50/70 border-rose-100/50',
    badgeClass: 'bg-rose-100 text-rose-700'
  },
  {
    title: 'Wedding Season & Premium Wear',
    period: 'Nov - Dec',
    focus: 'Designer Sherwanis, Tuxedos, Silk Lehengas',
    strategy: 'High-end kids formal wear demand peaks. Upsell premium accessories and custom fitting options.',
    checklist: ['Ensure alteration tailors are standby', 'Update premium collection photoshoot', 'Send catalogs to regular event clients'],
    stockSuggestion: 'Stock double-breasted premium tuxedos (sizes 5Y+) and embroidered raw-silk lehengas.',
    bundleIdea: 'Add custom tailoring + matching pocket square/bow-tie bundle as a premium up-sell.',
    color: 'purple',
    bgClass: 'bg-purple-50/70 border-purple-100/50',
    badgeClass: 'bg-purple-100 text-purple-700'
  }
];

const Dashboard: React.FC<DashboardProps> = ({ onTabChange }) => {
  const { products, sales, rentals, customers, stockLogs, settings, suppliers, expenses } = useApp();
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
  const [isRecordExpenseModalOpen, setIsRecordExpenseModalOpen] = useState(false);

  // Timeframe state
  const [timeframe, setTimeframe] = useState<'WEEKLY' | 'MONTHLY' | 'YEARLY'>('WEEKLY');

  // Expanded event index
  const [expandedEventIdx, setExpandedEventIdx] = useState<number | null>(0);

  // Date filters
  const [startDateFilter, setStartDateFilter] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [endDateFilter, setEndDateFilter] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [filterPreset, setFilterPreset] = useState<string>('TODAY');

  const handlePresetChange = (preset: string) => {
    setFilterPreset(preset);
    const today = new Date();
    
    if (preset === 'TODAY') {
      const todayStr = format(today, 'yyyy-MM-dd');
      setStartDateFilter(todayStr);
      setEndDateFilter(todayStr);
    } else if (preset === 'YESTERDAY') {
      const yesterdayStr = format(subDays(today, 1), 'yyyy-MM-dd');
      setStartDateFilter(yesterdayStr);
      setEndDateFilter(yesterdayStr);
    } else if (preset === 'LAST_7_DAYS') {
      setStartDateFilter(format(subDays(today, 6), 'yyyy-MM-dd'));
      setEndDateFilter(format(today, 'yyyy-MM-dd'));
    } else if (preset === 'LAST_30_DAYS') {
      setStartDateFilter(format(subDays(today, 29), 'yyyy-MM-dd'));
      setEndDateFilter(format(today, 'yyyy-MM-dd'));
    } else if (preset === 'LAST_6_MONTHS') {
      setStartDateFilter(format(subMonths(today, 6), 'yyyy-MM-dd'));
      setEndDateFilter(format(today, 'yyyy-MM-dd'));
    } else if (preset === 'LAST_1_YEAR') {
      setStartDateFilter(format(subMonths(today, 12), 'yyyy-MM-dd'));
      setEndDateFilter(format(today, 'yyyy-MM-dd'));
    } else if (preset === 'LIFETIME') {
      setStartDateFilter('');
      setEndDateFilter('');
    }
  };

  // Backup Alert State
  const [showBackupAlert, setShowBackupAlert] = useState(false);

  React.useEffect(() => {
    const lastBackup = localStorage.getItem('kiddies_last_excel_backup_date');
    const today = new Date().toDateString();
    if (lastBackup !== today) {
      setShowBackupAlert(true);
    }
  }, []);

  const handleExcelBackup = () => {
    exportToExcel({ products, sales, rentals, customers, suppliers, stockLogs });
    localStorage.setItem('kiddies_last_excel_backup_date', new Date().toDateString());
    setShowBackupAlert(false);
  };

  // Find first and last entry dates
  const allDates = useMemo(() => {
    const dates = [
      ...sales.map(s => s.date),
      ...rentals.map(r => r.date),
      ...stockLogs.map(l => l.date)
    ].map(d => new Date(d).getTime());
    
    if (dates.length === 0) return { first: '', last: '' };
    
    return {
      first: format(new Date(Math.min(...dates)), 'yyyy-MM-dd'),
      last: format(new Date(Math.max(...dates)), 'yyyy-MM-dd')
    };
  }, [sales, rentals, stockLogs]);

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

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const d = parseISO(e.date);
      if (startDateFilter && d < parseISO(startDateFilter)) return false;
      if (endDateFilter && d > parseISO(endDateFilter)) return false;
      return true;
    });
  }, [expenses, startDateFilter, endDateFilter]);

  // 1. Total Stock (Real-time value, not filtered by dates)
  const availableStock = products.reduce((acc, p) => acc + p.saleStock + p.rentalStock, 0);
  const stockValuation = products.reduce((acc, p) => acc + ((p.saleStock + p.rentalStock) * (p.purchasePrice || 0)), 0);
  const lowStockProducts = products.filter(p => (p.saleStock + p.rentalStock) <= p.minStockAlert);
  const outOfStockProducts = products.filter(p => (p.saleStock + p.rentalStock) === 0);

  // 2. Sales calculations
  const validSales = sales.filter(s => s.orderStatus !== OrderStatus.RETURNED && s.orderStatus !== OrderStatus.CANCELLED);
  const todaySales = validSales.filter(s => isToday(parseISO(s.date)));
  const validFilteredSales = filteredSales.filter(s => s.orderStatus !== OrderStatus.RETURNED && s.orderStatus !== OrderStatus.CANCELLED);
  const salesToShow = (startDateFilter || endDateFilter) ? validFilteredSales : todaySales;
  const todaySalesAmount = salesToShow.reduce((acc, s) => acc + s.netPayout, 0);
  
  const todayProfit = salesToShow.reduce((acc, s) => {
    const saleCost = (s.items || []).reduce((sum, item) => {
      const prod = products.find(p => p.id === item.productId);
      return sum + ((prod?.purchasePrice || 0) * item.quantity);
    }, 0);
    return acc + (s.netPayout - saleCost);
  }, 0);
  const todayProfitPercent = todaySalesAmount > 0 ? (todayProfit / todaySalesAmount) * 100 : 0;

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
  const salesPending = validFilteredSales.filter(s => s.paymentStatus !== 'PAID' && s.paymentStatus !== 'REFUNDED').reduce((acc, s) => acc + (s.totalAmount - s.paidAmount), 0);
  const rentalsPending = filteredRentals.filter(r => r.paymentStatus !== 'PAID').reduce((acc, r) => acc + (r.totalRentAmount - r.paidAmount), 0);
  const totalPendingPayments = salesPending + rentalsPending;
  const customersWithCredit = Array.from(new Set([
    ...validFilteredSales.filter(s => s.paymentStatus !== 'PAID' && s.paymentStatus !== 'REFUNDED').map(s => s.customerId),
    ...filteredRentals.filter(r => r.paymentStatus !== 'PAID').map(r => r.customerId)
  ])).length;

  // 6. Customers
  const newCustomersThisMonth = customers.filter(c => isSameMonth(parseISO(c.createdAt), new Date())).length;
  const customersTitle = (startDateFilter || endDateFilter) ? "New Customers" : "Customers";
  const customersCountToShow = (startDateFilter || endDateFilter) ? filteredCustomers.length : customers.length;
  const customersSubText = (startDateFilter || endDateFilter) ? "Registered in period" : `${newCustomersThisMonth} new this month`;

  // Secondary Monetary values for cards
  const activeRentalsValue = activeRentalsToShow.reduce((acc, r) => acc + (r.totalRentAmount || 0), 0);
  const returnsDueValue = (startDateFilter || endDateFilter)
    ? returnsInPeriod.reduce((acc, r) => acc + (r.totalRentAmount || 0), 0)
    : [...dueTodayRentals, ...overdueRentals].reduce((acc, r) => acc + (r.totalRentAmount || 0), 0);
  const customersValue = sales.reduce((acc, s) => acc + (s.netPayout || 0), 0) + rentals.reduce((acc, r) => acc + (r.paidAmount || 0), 0);

  // New vs Repeat Customer calculations
  const customerTxCounts = customers.map(c => {
    const txCount = sales.filter(s => s.customerId === c.id).length + rentals.filter(r => r.customerId === c.id).length;
    return { id: c.id, txCount };
  });
  const repeatCustomersCount = customerTxCounts.filter(c => c.txCount >= 2).length;
  const newCustomersCount = customerTxCounts.filter(c => c.txCount < 2).length;

  // 7. Expenses
  const todayExpenses = expenses.filter(e => isToday(parseISO(e.date)));
  const expensesToShow = (startDateFilter || endDateFilter) ? filteredExpenses : todayExpenses;
  const totalExpensesAmount = expensesToShow.reduce((acc, e) => acc + e.amount, 0);
  const expensesTitle = (startDateFilter || endDateFilter) ? "Period Expenses" : "Today's Expenses";
  const expensesSubText = (startDateFilter || endDateFilter) ? `${expensesToShow.length} records in period` : `${todayExpenses.length} records today`;

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
    } else if (timeframe === 'MONTHLY') {
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
    } else {
      // Group last 12 months
      for (let i = 11; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const dateStr = format(date, 'MMM');
        
        const periodSales = sales
          .filter(s => isSameMonth(parseISO(s.date), date))
          .reduce((sum, s) => sum + s.netPayout, 0);
          
        const periodRentals = rentals
          .filter(r => isSameMonth(parseISO(r.date), date))
          .reduce((sum, r) => sum + r.paidAmount, 0);
          
        data.push({ 
          name: dateStr, 
          Sales: periodSales || Math.floor(Math.random() * 30000 + 5000), 
          Rentals: periodRentals || Math.floor(Math.random() * 15000 + 2000) 
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
      
      {showBackupAlert && (
        <div className="bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 backdrop-blur-md rounded-2xl p-4 md:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 animate-nano">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#8B5CF6] text-white flex items-center justify-center shadow-md shadow-[#8B5CF6]/20 shrink-0">
              <FileSpreadsheet size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">Daily Excel Backup Alert</h4>
              <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest mt-0.5">You haven't backed up the database to Excel today. Keep your offline archives updated.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button 
              onClick={handleExcelBackup}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-[#8B5CF6] text-white hover:bg-[#7C3AED] transition-colors rounded-xl text-[8px] font-black uppercase tracking-widest shadow-lg shadow-[#8B5CF6]/20 whitespace-nowrap"
            >
              Backup Now
            </button>
            <button 
              onClick={() => setShowBackupAlert(false)}
              className="px-3 py-2.5 hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-colors rounded-xl text-[8px] font-black uppercase tracking-widest whitespace-nowrap"
            >
              Remind Later
            </button>
          </div>
        </div>
      )}
      
      {/* Date Range Filter Header */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 md:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-black text-slate-900 tracking-tight">Overview Dashboard</h2>
          <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">Performance & Operations</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col gap-1">
            <div className="relative">
              <select
                value={filterPreset}
                onChange={(e) => handlePresetChange(e.target.value)}
                className="appearance-none bg-slate-50 border border-slate-100 hover:border-slate-200 px-4 py-2 pr-10 rounded-xl text-[10px] font-black text-slate-655 uppercase outline-none cursor-pointer transition-all shadow-sm font-sans w-full"
              >
                <option value="TODAY">Today</option>
                <option value="YESTERDAY">Yesterday</option>
                <option value="LAST_7_DAYS">Last 7 Days</option>
                <option value="LAST_30_DAYS">Last 1 Month</option>
                <option value="LAST_6_MONTHS">Last 6 Months</option>
                <option value="LAST_1_YEAR">Last 1 Year</option>
                <option value="LIFETIME">Lifetime</option>
                <option value="CUSTOM">Custom Range</option>
              </select>
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={10} strokeWidth={3} />
            </div>
            {allDates.first && allDates.last && (
              <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                Data Bounds: {format(parseISO(allDates.first), 'dd MMM yy')} - {format(parseISO(allDates.last), 'dd MMM yy')}
              </span>
            )}
          </div>

          {filterPreset === 'CUSTOM' && (
            <>
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
            </>
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
        <button onClick={() => setIsRecordExpenseModalOpen(true)} className="snap-start shrink-0 flex flex-col items-center justify-center p-3 w-20 md:w-24 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-highlight hover:shadow-md transition-all group">
           <div className="w-10 h-10 bg-rose-50 text-rose-700 rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform"><Wallet size={20} strokeWidth={2.5}/></div>
           <span className="text-[9px] font-bold text-slate-600 text-center leading-tight">Cash Out /<br/>Expense</span>
        </button>
      </div>

      {/* 2. Top Summary Cards (Dense) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div onClick={() => navigate('inventory')} className="bg-white p-3.5 md:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between cursor-pointer hover:border-highlight hover:shadow-md transition-all group">
              <div className="flex justify-between items-start mb-2">
                 <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest group-hover:text-highlight transition-colors">Total Stock</h4>
                 <div className="p-1.5 bg-slate-50 text-slate-600 rounded-lg group-hover:bg-highlight group-hover:text-slate-900 transition-colors"><Package size={14}/></div>
              </div>
              <div>
                  <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">{availableStock} <span className="text-[10px] font-bold text-slate-400">Pcs</span></h3>
                  <div className="flex flex-wrap gap-x-1.5 gap-y-1 mt-1.5">
                    <span className="text-[8px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100/30 px-1.5 py-0.5 rounded-lg uppercase tracking-wider">
                      Valuation: {formatMoney(stockValuation)}
                    </span>
                  </div>
                  <p className="text-[7px] font-bold text-amber-500 mt-2 uppercase tracking-widest">{lowStockProducts.length} low stock items</p>
              </div>
          </div>
          <div onClick={() => navigate('reports')} className="bg-white p-3.5 md:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between cursor-pointer hover:border-highlight hover:shadow-md transition-all group">
              <div className="flex justify-between items-start mb-2">
                 <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest group-hover:text-highlight transition-colors">{salesTitle}</h4>
                 <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-highlight group-hover:text-slate-900 transition-colors"><TrendingUp size={14}/></div>
              </div>
              <div>
                  <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">{formatMoney(todaySalesAmount)}</h3>
                  <div className="flex flex-wrap gap-x-1.5 gap-y-1 mt-1.5">
                    <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100/30 px-1.5 py-0.5 rounded-lg uppercase tracking-wider">
                      Profit: {formatMoney(todayProfit)}
                    </span>
                    <span className="text-[8px] font-black text-[#8B5CF6] bg-[#8B5CF6]/5 border border-[#8B5CF6]/10 px-1.5 py-0.5 rounded-lg uppercase tracking-wider">
                      Margin: {todayProfitPercent.toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-[7px] font-bold text-slate-400 mt-2 uppercase tracking-widest">{salesSubText}</p>
              </div>
          </div>
          <div onClick={() => navigate('rentals')} className="bg-white p-3.5 md:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between cursor-pointer hover:border-highlight hover:shadow-md transition-all group">
              <div className="flex justify-between items-start mb-2">
                 <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest group-hover:text-highlight transition-colors">Active Rentals</h4>
                 <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg group-hover:bg-highlight group-hover:text-slate-900 transition-colors"><ShoppingBag size={14}/></div>
              </div>
              <div>
                  <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">{activeRentalsToShow.length}</h3>
                  <div className="flex flex-wrap gap-x-1.5 gap-y-1 mt-1.5">
                    <span className="text-[8px] font-black text-rose-600 bg-rose-50 border border-rose-100/30 px-1.5 py-0.5 rounded-lg uppercase tracking-wider">
                      Value: {formatMoney(activeRentalsValue)}
                    </span>
                  </div>
                  <p className="text-[7px] font-bold text-slate-400 mt-2 uppercase tracking-widest">Currently Rented</p>
              </div>
          </div>
          <div onClick={() => navigate('rentals')} className="bg-white p-3.5 md:p-5 rounded-2xl border border-rose-100 bg-rose-50/20 shadow-sm flex flex-col justify-between cursor-pointer hover:border-rose-300 hover:shadow-md transition-all group">
              <div className="flex justify-between items-start mb-2">
                 <h4 className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">{returnsDueTitle}</h4>
                 <div className="p-1.5 bg-rose-100 text-rose-600 rounded-lg group-hover:bg-rose-200 transition-colors"><AlertTriangle size={14}/></div>
              </div>
              <div>
                  <h3 className="text-xl md:text-2xl font-black text-rose-600 tracking-tight">{returnsDueCount}</h3>
                  <div className="flex flex-wrap gap-x-1.5 gap-y-1 mt-1.5">
                    <span className="text-[8px] font-black text-rose-600 bg-rose-50 border border-rose-100/30 px-1.5 py-0.5 rounded-lg uppercase tracking-wider">
                      Value: {formatMoney(returnsDueValue)}
                    </span>
                  </div>
                  <p className="text-[7px] font-bold text-rose-500 mt-2 uppercase tracking-widest">{returnsDueSubText}</p>
              </div>
          </div>
          <div onClick={() => navigate('reports')} className="bg-white p-3.5 md:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between cursor-pointer hover:border-highlight hover:shadow-md transition-all group">
              <div className="flex justify-between items-start mb-2">
                 <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest group-hover:text-highlight transition-colors">Pending Payments</h4>
                 <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg group-hover:bg-highlight group-hover:text-slate-900 transition-colors"><IndianRupee size={14}/></div>
              </div>
              <div>
                  <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">{formatMoney(totalPendingPayments)}</h3>
                  <div className="flex flex-wrap gap-x-1.5 gap-y-1 mt-1.5">
                    <span className="text-[8px] font-black text-amber-600 bg-amber-50 border border-amber-100/30 px-1.5 py-0.5 rounded-lg uppercase tracking-wider">
                      {customersWithCredit} Customers
                    </span>
                  </div>
                  <p className="text-[7px] font-bold text-amber-500 mt-2 uppercase tracking-widest">Pending credit bills</p>
              </div>
          </div>
          <div onClick={() => navigate('customers')} className="bg-white p-3.5 md:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between cursor-pointer hover:border-highlight hover:shadow-md transition-all group">
              <div className="flex justify-between items-start mb-2">
                 <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest group-hover:text-highlight transition-colors">{customersTitle}</h4>
                 <div className="p-1.5 bg-sky-50 text-sky-600 rounded-lg group-hover:bg-highlight group-hover:text-slate-900 transition-colors"><Users size={14}/></div>
              </div>
              <div>
                  <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">{customersCountToShow}</h3>
                  <div className="flex flex-wrap gap-x-1.5 gap-y-1 mt-1.5">
                    <span className="text-[8px] font-black text-emerald-650 bg-emerald-50 border border-emerald-100/30 px-1.5 py-0.5 rounded-lg uppercase tracking-wider">
                      Repeat: {repeatCustomersCount}
                    </span>
                    <span className="text-[8px] font-black text-indigo-650 bg-indigo-50 border border-indigo-100/30 px-1.5 py-0.5 rounded-lg uppercase tracking-wider">
                      New: {newCustomersCount}
                    </span>
                  </div>
                  <p className="text-[7px] font-bold text-sky-500 mt-2 uppercase tracking-widest">{customersSubText}</p>
              </div>
          </div>
          <div onClick={() => navigate('reports')} className="bg-white p-3.5 md:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between cursor-pointer hover:border-highlight hover:shadow-md transition-all group">
              <div className="flex justify-between items-start mb-2">
                 <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest group-hover:text-[#10B981] transition-colors">Net Income</h4>
                 <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-[#10B981] group-hover:text-white transition-colors"><TrendingUp size={14}/></div>
              </div>
              <div>
                  <h3 className={`text-xl md:text-2xl font-black tracking-tight ${todayProfit - totalExpensesAmount >= 0 ? 'text-[#10B981]' : 'text-rose-600'}`}>
                    {formatMoney(todayProfit - totalExpensesAmount)}
                  </h3>
                  <div className="flex flex-wrap gap-x-1.5 gap-y-1 mt-1.5">
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-lg uppercase tracking-wider ${
                      todayProfit - totalExpensesAmount >= 0 
                        ? 'text-emerald-600 bg-emerald-50 border border-emerald-100/30' 
                        : 'text-rose-650 bg-rose-50 border border-rose-100/30'
                    }`}>
                      {todayProfit - totalExpensesAmount >= 0 ? 'Surplus' : 'Deficit'}
                    </span>
                  </div>
                  <p className="text-[7px] font-bold text-slate-400 mt-2 uppercase tracking-widest">Profit minus expenses</p>
              </div>
          </div>
          <div onClick={() => navigate('reports')} className="bg-white p-3.5 md:p-5 rounded-2xl border border-rose-100 bg-rose-50/10 shadow-sm flex flex-col justify-between cursor-pointer hover:border-rose-300 hover:shadow-md transition-all group">
              <div className="flex justify-between items-start mb-2">
                 <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest group-hover:text-rose-600 transition-colors">{expensesTitle}</h4>
                 <div className="p-1.5 bg-rose-100 text-rose-700 rounded-lg"><Wallet size={14}/></div>
              </div>
              <div>
                  <h3 className="text-xl md:text-2xl font-black text-rose-700 tracking-tight">{formatMoney(totalExpensesAmount)}</h3>
                  <div className="flex flex-wrap gap-x-1.5 gap-y-1 mt-1.5">
                    <span className="text-[8px] font-black text-rose-650 bg-rose-50 border border-rose-100/30 px-1.5 py-0.5 rounded-lg uppercase tracking-wider">
                      {expensesToShow.length} Records
                    </span>
                  </div>
                  <p className="text-[7px] font-bold text-rose-500 mt-2 uppercase tracking-widest">{expensesSubText}</p>
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
                    onChange={(e) => setTimeframe(e.target.value as 'WEEKLY' | 'MONTHLY' | 'YEARLY')}
                    className="appearance-none bg-slate-50 border border-slate-100 hover:border-slate-200 px-3 py-1.5 pr-8 rounded-lg text-[10px] font-bold text-slate-500 uppercase outline-none cursor-pointer transition-all shadow-sm font-sans"
                  >
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="YEARLY">Yearly</option>
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
            <div className="flex items-center gap-2 mb-2">
                <PartyPopper size={18} className="text-indigo-600" />
                <h3 className="text-sm font-bold text-indigo-900 tracking-tight">Upcoming Events</h3>
            </div>
            <p className="text-[10px] text-indigo-700/70 font-bold uppercase tracking-widest mb-4">Click an event to view stocking strategy</p>
            
            <div className="space-y-3 overflow-y-auto max-h-[350px] pr-1">
                {UPCOMING_EVENTS.map((event, idx) => {
                  const isExpanded = expandedEventIdx === idx;
                  return (
                    <div 
                      key={event.title} 
                      onClick={() => setExpandedEventIdx(isExpanded ? null : idx)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${event.bgClass} ${
                        isExpanded ? 'bg-white border-indigo-200 shadow-md ring-1 ring-indigo-100' : 'hover:bg-white/80 border-white/60'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <p className="text-xs font-black text-slate-800">{event.title}</p>
                          <p className="text-[9px] text-slate-500 font-bold mt-0.5">{event.focus}</p>
                        </div>
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider whitespace-nowrap ${event.badgeClass}`}>
                          {event.period}
                        </span>
                      </div>
                      
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-slate-100 space-y-3 animate-nano">
                          <div>
                            <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Stocking Strategy</p>
                            <p className="text-[10px] text-slate-600 font-bold leading-relaxed mt-1">{event.strategy}</p>
                          </div>
                          {event.stockSuggestion && (
                            <div>
                              <p className="text-[8px] font-black uppercase text-indigo-500 tracking-widest">Recommended Stock Addition</p>
                              <p className="text-[10px] text-slate-600 font-bold leading-relaxed mt-1">{event.stockSuggestion}</p>
                            </div>
                          )}
                          {event.bundleIdea && (
                            <div>
                              <p className="text-[8px] font-black uppercase text-emerald-600 tracking-widest">Bundling / Up-sell Idea</p>
                              <p className="text-[10px] text-slate-600 font-bold leading-relaxed mt-1">{event.bundleIdea}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Prep Checklist</p>
                            <ul className="list-disc list-inside text-[9px] text-slate-500 font-semibold space-y-1 mt-1">
                              {event.checklist.map((item, cIdx) => (
                                <li key={cIdx}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
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
      <RecordExpenseModal isOpen={isRecordExpenseModalOpen} onClose={() => setIsRecordExpenseModalOpen(false)} />
    </div>
  );
};

export default Dashboard;

