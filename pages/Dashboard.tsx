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
  TrendingDown,
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
  Wallet,
  Info,
  Sparkles,
  Layers,
  ShieldCheck,
  BarChart3,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Boxes,
  Flame,
  Zap,
  RotateCcw,
  Tag,
  Search,
  ExternalLink,
  Percent,
  Check
} from 'lucide-react';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import {
  format,
  parseISO,
  isToday,
  isPast,
  isSameMonth,
  subDays,
  subMonths,
  isSameDay,
  differenceInDays,
  addDays
} from 'date-fns';

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

interface EventItem {
  id: string;
  title: string;
  date: string;
  category: 'festival' | 'season' | 'holiday';
  suggestedStock: string[];
  badgeClass: string;
  accentColor: string;
}

const UPCOMING_EVENTS: EventItem[] = [
  {
    id: 'republic_day',
    title: '🇮🇳 Republic Day',
    date: '26 Jan 2026',
    category: 'holiday',
    suggestedStock: ['White T-Shirts', 'White Kurtas', 'Tricolor Dresses', 'Flag Badges', 'Hair Bands'],
    badgeClass: 'bg-amber-100/80 text-amber-800 border-amber-200/60',
    accentColor: 'from-amber-500 to-orange-500'
  },
  {
    id: 'valentines_day',
    title: "💖 Valentine's Day",
    date: '14 Feb 2026',
    category: 'holiday',
    suggestedStock: ['Red Dresses', 'Casual Wear', 'Party Wear', 'Matching Sets'],
    badgeClass: 'bg-rose-100/80 text-rose-700 border-rose-200/60',
    accentColor: 'from-rose-500 to-pink-500'
  },
  {
    id: 'holi',
    title: '🎨 Holi Festival',
    date: '25 Mar 2026',
    category: 'festival',
    suggestedStock: ['White T-Shirts', 'Shorts', 'Cotton Dresses', 'Night Suits', 'Bandhej Kurtas'],
    badgeClass: 'bg-emerald-100/80 text-emerald-700 border-emerald-200/60',
    accentColor: 'from-emerald-500 to-teal-500'
  },
  {
    id: 'eid',
    title: '🌙 Eid al-Fitr',
    date: '31 Mar 2026',
    category: 'festival',
    suggestedStock: ['Kurta Pajama', 'Pathani Suit', 'Girls Ethnic Dresses', 'Hijab Accessories', 'Embroidered Sets'],
    badgeClass: 'bg-teal-100/80 text-teal-700 border-teal-200/60',
    accentColor: 'from-teal-500 to-cyan-500'
  },
  {
    id: 'summer_vacation',
    title: '🧸 Summer Vacation',
    date: '15 Apr 2026',
    category: 'season',
    suggestedStock: ['Cotton T-Shirts', 'Shorts', 'Co-ord Sets', 'Sleeveless Dresses', 'Caps', 'Swimwear'],
    badgeClass: 'bg-orange-100/80 text-orange-700 border-orange-200/60',
    accentColor: 'from-orange-500 to-amber-500'
  },
  {
    id: 'school_reopening',
    title: '📚 School Reopening',
    date: '15 Jun 2026',
    category: 'season',
    suggestedStock: ['School Bags', 'Socks', 'Raincoats', 'Umbrellas', 'Innerwear', 'Uniform Accessories'],
    badgeClass: 'bg-blue-100/80 text-blue-700 border-blue-200/60',
    accentColor: 'from-blue-500 to-indigo-500'
  },
  {
    id: 'independence_day',
    title: '🇮🇳 Independence Day',
    date: '15 Aug 2026',
    category: 'holiday',
    suggestedStock: ['White Collection', 'Tricolor T-Shirts', 'White Kurtas', 'Hair Accessories', 'Badges'],
    badgeClass: 'bg-amber-100/80 text-amber-800 border-amber-200/60',
    accentColor: 'from-amber-500 to-orange-500'
  },
  {
    id: 'raksha_bandhan',
    title: '🎀 Raksha Bandhan',
    date: '29 Aug 2026',
    category: 'festival',
    suggestedStock: ['Brother-Sister Matching Sets', 'Boys Kurta Pajama', 'Girls Lehenga & Gown', 'Frocks', 'Hair Accessories'],
    badgeClass: 'bg-fuchsia-100/80 text-fuchsia-700 border-fuchsia-200/60',
    accentColor: 'from-fuchsia-500 to-purple-500'
  },
  {
    id: 'janmashtami',
    title: '🌸 Janmashtami',
    date: '04 Sep 2026',
    category: 'festival',
    suggestedStock: ['Krishna Dress', 'Radha Dress', 'Dhoti Set', 'Peacock Feather Sets', 'Flute Accessories', 'Crowns'],
    badgeClass: 'bg-yellow-100/80 text-yellow-800 border-yellow-200/60',
    accentColor: 'from-yellow-500 to-amber-500'
  },
  {
    id: 'ganesh_chaturthi',
    title: '🐘 Ganesh Chaturthi',
    date: '14 Sep 2026',
    category: 'festival',
    suggestedStock: ['Ethnic Wear', 'Kurta Sets', 'Traditional Dhoti Sets', 'Silk Frocks'],
    badgeClass: 'bg-rose-100/80 text-rose-700 border-rose-200/60',
    accentColor: 'from-rose-500 to-red-500'
  },
  {
    id: 'navratri',
    title: '💃 Navratri Garba',
    date: '11 Oct 2026',
    category: 'festival',
    suggestedStock: ['Chaniya Choli', 'Garba Dress', 'Kurta Pajama', 'Dupattas', 'Kedia Sets', 'Traditional Jewelry'],
    badgeClass: 'bg-purple-100/80 text-purple-700 border-purple-200/60',
    accentColor: 'from-purple-500 to-violet-500'
  },
  {
    id: 'dussehra',
    title: '🏹 Dussehra',
    date: '20 Oct 2026',
    category: 'festival',
    suggestedStock: ['Festive Collection', 'Ethnic Wear', 'Party Wear', 'Traditional Shoes'],
    badgeClass: 'bg-indigo-100/80 text-indigo-700 border-indigo-200/60',
    accentColor: 'from-indigo-500 to-blue-500'
  },
  {
    id: 'diwali',
    title: '🪔 Diwali Grand Season',
    date: '08 Nov 2026',
    category: 'festival',
    suggestedStock: ['Premium Ethnic Wear', 'Party Wear', 'Sherwani', 'Lehenga', 'Gowns', 'Accessories', 'Silk Sets'],
    badgeClass: 'bg-amber-100/80 text-amber-800 border-amber-200/60',
    accentColor: 'from-amber-500 to-yellow-500'
  },
  {
    id: 'childrens_day',
    title: "👧 Children's Day",
    date: '14 Nov 2026',
    category: 'holiday',
    suggestedStock: ['Cartoon T-Shirts', 'Co-ord Sets', 'Casual Wear', 'Denim', 'Sneakers'],
    badgeClass: 'bg-sky-100/80 text-sky-700 border-sky-200/60',
    accentColor: 'from-sky-500 to-blue-500'
  },
  {
    id: 'wedding_season',
    title: '💍 Wedding & Party Season',
    date: '20 Nov 2026',
    category: 'season',
    suggestedStock: ['Sherwani', 'Indo-Western', 'Party Gowns', 'Tuxedos & Suits', 'Ethnic Wear', 'Formal Footwear'],
    badgeClass: 'bg-purple-100/80 text-purple-700 border-purple-200/60',
    accentColor: 'from-purple-500 to-pink-500'
  },
  {
    id: 'winter_season',
    title: '❄️ Winter Wear Season',
    date: '01 Dec 2026',
    category: 'season',
    suggestedStock: ['Jackets', 'Hoodies', 'Sweaters', 'Thermals', 'Woollen Caps', 'Gloves'],
    badgeClass: 'bg-blue-100/80 text-blue-700 border-blue-200/60',
    accentColor: 'from-blue-500 to-cyan-500'
  },
  {
    id: 'christmas',
    title: '🎄 Christmas',
    date: '25 Dec 2026',
    category: 'holiday',
    suggestedStock: ['Santa Costume', 'Red Dresses', 'Winter Wear', 'Party Dresses', 'Headbands'],
    badgeClass: 'bg-rose-100/80 text-rose-700 border-rose-200/60',
    accentColor: 'from-rose-500 to-red-500'
  },
  {
    id: 'new_year',
    title: '🎉 New Year Celebrations',
    date: '31 Dec 2026',
    category: 'holiday',
    suggestedStock: ['Party Wear', 'Blazers', 'Glitter Dresses', 'Co-ord Sets', 'Stylish Shoes'],
    badgeClass: 'bg-slate-900 text-white border-slate-700',
    accentColor: 'from-slate-700 to-slate-900'
  }
];

const Dashboard: React.FC<DashboardProps> = ({ onTabChange }) => {
  const { products, sales, rentals, customers, stockLogs, settings, suppliers, expenses } = useApp();
  const formatMoney = (val: number) => `₹${Math.round(val).toLocaleString('en-IN')}`;

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

  // Timeframe & Chart State
  const [timeframe, setTimeframe] = useState<'WEEKLY' | 'MONTHLY' | 'YEARLY'>('WEEKLY');
  const [chartType, setChartType] = useState<'BAR' | 'AREA'>('BAR');
  const [chartMetric, setChartMetric] = useState<'ALL' | 'SALES' | 'RENTALS'>('ALL');

  // Expanded event index & filter
  const [expandedEventIdx, setExpandedEventIdx] = useState<number | null>(0);
  const [eventCategoryFilter, setEventCategoryFilter] = useState<'ALL' | 'SOON' | 'FESTIVAL' | 'SEASON'>('SOON');

  // High Sales Days filter
  const [salesThreshold, setSalesThreshold] = useState<number>(5000);
  const [salesThresholdInput, setSalesThresholdInput] = useState<string>('5000');

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
  const [backupToast, setBackupToast] = useState<string | null>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isMobileDateMenuOpen, setIsMobileDateMenuOpen] = useState(false);

  // Stock Stats Breakdown
  const stockStats = useMemo(() => {
    let goodPcs = 0;
    let lowPcs = 0;
    let outOfStockSKUs = 0;
    let totalSKUs = products.length;

    products.forEach(p => {
      const total = (p.saleStock || 0) + (p.rentalStock || 0);
      if (total === 0) {
        outOfStockSKUs += 1;
      } else if (total <= (p.minStockAlert || 3)) {
        lowPcs += total;
      } else {
        goodPcs += total;
      }
    });

    const totalPieces = goodPcs + lowPcs;
    const goodPercent = totalPieces > 0 ? Math.round((goodPcs / totalPieces) * 100) : 100;
    const lowPercent = totalPieces > 0 ? Math.round((lowPcs / totalPieces) * 100) : 0;

    return { goodPcs, lowPcs, outOfStockSKUs, totalSKUs, totalPieces, goodPercent, lowPercent };
  }, [products]);

  const calcEventRemainingDays = (dateStr: string) => {
    try {
      const today = new Date();
      const parsed = new Date(dateStr);
      if (isNaN(parsed.getTime())) return 999;

      let target = parsed;
      if (target < today && !isSameDay(target, today)) {
        const nextYear = today.getFullYear() + (target.getMonth() < today.getMonth() || (target.getMonth() === today.getMonth() && target.getDate() < today.getDate()) ? 1 : 0);
        target = new Date(nextYear, parsed.getMonth(), parsed.getDate());
      }
      return differenceInDays(target, today);
    } catch {
      return 999;
    }
  };

  const calcEventRemaining = (dateStr: string) => {
    const diff = calcEventRemainingDays(dateStr);
    if (diff === 0) return 'Today!';
    if (diff === 1) return 'Tomorrow';
    if (diff > 1 && diff <= 30) return `In ${diff} Days`;
    if (diff > 30) return `In ${Math.round(diff / 30)} Mo`;
    if (diff < 0) return 'Passed';
    return 'Upcoming';
  };

  React.useEffect(() => {
    const lastBackup = localStorage.getItem('kiddies_last_excel_backup_date');
    const today = new Date().toDateString();
    if (lastBackup !== today) {
      setShowBackupAlert(true);
    }
  }, []);

  const handleExcelBackup = () => {
    setIsBackingUp(true);
    setTimeout(() => {
      const success = exportToExcel({ products, sales, rentals, customers, suppliers, stockLogs });
      setIsBackingUp(false);
      if (success) {
        localStorage.setItem('kiddies_last_excel_backup_date', new Date().toDateString());
        setShowBackupAlert(false);
        setBackupToast('Backup downloaded successfully! Excel file saved to your device.');
        setTimeout(() => setBackupToast(null), 4000);
      } else {
        setBackupToast('Error generating backup. Please try again.');
        setTimeout(() => setBackupToast(null), 4000);
      }
    }, 150);
  };

  // Find first and last entry dates
  const allDates = useMemo(() => {
    const dates = [
      ...sales.map(s => s.date),
      ...rentals.map(r => r.date),
      ...stockLogs.map(l => l.date)
    ].map(d => new Date(d).getTime()).filter(t => !isNaN(t));

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

  // 1. Total Stock (Real-time value)
  const availableStock = products.reduce((acc, p) => acc + (p.saleStock || 0) + (p.rentalStock || 0), 0);
  const stockValuation = products.reduce((acc, p) => acc + (((p.saleStock || 0) + (p.rentalStock || 0)) * (p.purchasePrice || 0)), 0);
  const lowStockProducts = products.filter(p => ((p.saleStock || 0) + (p.rentalStock || 0)) <= (p.minStockAlert || 3) && ((p.saleStock || 0) + (p.rentalStock || 0)) > 0);
  const outOfStockProducts = products.filter(p => ((p.saleStock || 0) + (p.rentalStock || 0)) === 0);

  // 2. Sales calculations
  const validSales = sales.filter(s => s.orderStatus !== OrderStatus.RETURNED && s.orderStatus !== OrderStatus.CANCELLED);
  const todaySales = validSales.filter(s => isToday(parseISO(s.date)));
  const validFilteredSales = filteredSales.filter(s => s.orderStatus !== OrderStatus.RETURNED && s.orderStatus !== OrderStatus.CANCELLED);
  const salesToShow = (startDateFilter || endDateFilter) ? validFilteredSales : todaySales;
  const todaySalesAmount = salesToShow.reduce((acc, s) => acc + (s.netPayout || 0), 0);

  const todayProfit = salesToShow.reduce((acc, s) => {
    const saleCost = (s.items || []).reduce((sum, item) => {
      const prod = products.find(p => p.id === item.productId);
      return sum + ((prod?.purchasePrice || 0) * (item.quantity || 1));
    }, 0);
    return acc + ((s.netPayout || 0) - saleCost);
  }, 0);
  const todayProfitPercent = todaySalesAmount > 0 ? (todayProfit / todaySalesAmount) * 100 : 0;

  const salesTitle = "Sales Revenue";

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
  const returnsDueTitle = "Returns Due";

  // 5. Pending Payments
  const salesPending = validFilteredSales.filter(s => s.paymentStatus !== 'PAID' && s.paymentStatus !== 'REFUNDED').reduce((acc, s) => acc + ((s.totalAmount || 0) - (s.paidAmount || 0)), 0);
  const rentalsPending = filteredRentals.filter(r => r.paymentStatus !== 'PAID').reduce((acc, r) => acc + ((r.totalRentAmount || 0) - (r.paidAmount || 0)), 0);
  const totalPendingPayments = salesPending + rentalsPending;
  const customersWithCredit = Array.from(new Set([
    ...validFilteredSales.filter(s => s.paymentStatus !== 'PAID' && s.paymentStatus !== 'REFUNDED').map(s => s.customerId),
    ...filteredRentals.filter(r => r.paymentStatus !== 'PAID').map(r => r.customerId)
  ])).filter(Boolean).length;

  // 6. Customers
  const newCustomersThisMonth = customers.filter(c => isSameMonth(parseISO(c.createdAt), new Date())).length;
  const customersTitle = "Customers";
  const customersCountToShow = (startDateFilter || endDateFilter) ? filteredCustomers.length : customers.length;

  // Secondary Monetary values for cards
  const activeRentalsValue = activeRentalsToShow.reduce((acc, r) => acc + (r.totalRentAmount || 0), 0);
  const returnsDueValue = (startDateFilter || endDateFilter)
    ? returnsInPeriod.reduce((acc, r) => acc + (r.totalRentAmount || 0), 0)
    : [...dueTodayRentals, ...overdueRentals].reduce((acc, r) => acc + (r.totalRentAmount || 0), 0);

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
  const totalExpensesAmount = expensesToShow.reduce((acc, e) => acc + (e.amount || 0), 0);
  const expensesTitle = "Expenses";

  // Net Income
  const netIncomeValue = todayProfit - totalExpensesAmount;

  // High Sales Days Computation
  const HIGH_SALES_FESTIVES: { name: string; date: string; emoji: string }[] = [
    { name: 'Republic Day', date: '01-26', emoji: '🇮🇳' },
    { name: "Valentine's Day", date: '02-14', emoji: '💖' },
    { name: 'Holi', date: '03-25', emoji: '🎨' },
    { name: 'Eid', date: '03-31', emoji: '🌙' },
    { name: 'Summer Vacation', date: '04-15', emoji: '🧸' },
    { name: 'School Reopening', date: '06-15', emoji: '📚' },
    { name: 'Independence Day', date: '08-15', emoji: '🇮🇳' },
    { name: 'Raksha Bandhan', date: '08-29', emoji: '🎀' },
    { name: 'Janmashtami', date: '09-04', emoji: '🌸' },
    { name: 'Ganesh Chaturthi', date: '09-14', emoji: '🐘' },
    { name: 'Navratri', date: '10-11', emoji: '💃' },
    { name: 'Dussehra', date: '10-20', emoji: '🏹' },
    { name: 'Diwali', date: '11-08', emoji: '🪔' },
    { name: "Children's Day", date: '11-14', emoji: '👧' },
    { name: 'Wedding Season', date: '11-20', emoji: '💍' },
    { name: 'Winter Season', date: '12-01', emoji: '❄️' },
    { name: 'Christmas', date: '12-25', emoji: '🎄' },
    { name: 'New Year Eve', date: '12-31', emoji: '🎉' },
  ];

  const highSalesDays = useMemo(() => {
    const byDate: Record<string, number> = {};
    validSales.forEach(s => {
      const d = s.date.slice(0, 10);
      byDate[d] = (byDate[d] || 0) + (s.netPayout || 0);
    });

    return Object.entries(byDate)
      .filter(([, total]) => total >= salesThreshold)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([dateStr, total]) => {
        const d = parseISO(dateStr);
        const monthDay = format(d, 'MM-dd');
        const festive = HIGH_SALES_FESTIVES.find(f => {
          const festMonthDay = f.date;
          const [fM, fD] = festMonthDay.split('-').map(Number);
          const [curM, curD] = monthDay.split('-').map(Number);
          const festDayOfYear = fM * 30 + fD;
          const curDayOfYear = curM * 30 + curD;
          return Math.abs(festDayOfYear - curDayOfYear) <= 7;
        });
        return {
          dateStr,
          date: format(d, 'dd'),
          month: format(d, 'MMMM'),
          year: format(d, 'yyyy'),
          weekday: format(d, 'EEE'),
          total,
          festive: festive ? `${festive.emoji} ${festive.name}` : null,
        };
      });
  }, [validSales, salesThreshold]);

  // Graph Data
  const salesGraphData = useMemo(() => {
    const data: { name: string; Sales: number; Rentals: number; Total: number }[] = [];

    if (startDateFilter || endDateFilter) {
      const start = startDateFilter ? parseISO(startDateFilter) : subDays(new Date(), 30);
      const end = endDateFilter ? parseISO(endDateFilter) : new Date();
      const diffDays = differenceInDays(end, start);

      if (diffDays <= 14) {
        for (let i = 0; i <= diffDays; i++) {
          const date = addDays(start, i);
          const dateStr = format(date, 'MMM dd');
          const dailySales = sales
            .filter(s => isSameDay(parseISO(s.date), date) && s.orderStatus !== OrderStatus.CANCELLED && s.orderStatus !== OrderStatus.RETURNED)
            .reduce((sum, s) => sum + (s.netPayout || 0), 0);
          const dailyRentals = rentals
            .filter(r => isSameDay(parseISO(r.date), date))
            .reduce((sum, r) => sum + (r.paidAmount || 0), 0);
          data.push({ name: dateStr, Sales: dailySales, Rentals: dailyRentals, Total: dailySales + dailyRentals });
        }
      } else {
        const intervalDays = Math.ceil(diffDays / 6);
        for (let i = 0; i < 6; i++) {
          const startPeriod = addDays(start, i * intervalDays);
          const endPeriod = addDays(start, Math.min((i + 1) * intervalDays, diffDays));
          const dateStr = `${format(startPeriod, 'dd MMM')} - ${format(endPeriod, 'dd MMM')}`;

          const periodSales = sales
            .filter(s => {
              const d = parseISO(s.date);
              return (d >= startPeriod && d <= endPeriod) && s.orderStatus !== OrderStatus.CANCELLED && s.orderStatus !== OrderStatus.RETURNED;
            })
            .reduce((sum, s) => sum + (s.netPayout || 0), 0);

          const periodRentals = rentals
            .filter(r => {
              const d = parseISO(r.date);
              return (d >= startPeriod && d <= endPeriod);
            })
            .reduce((sum, r) => sum + (r.paidAmount || 0), 0);

          data.push({ name: dateStr, Sales: periodSales, Rentals: periodRentals, Total: periodSales + periodRentals });
        }
      }
      return data;
    }

    if (timeframe === 'WEEKLY') {
      for (let i = 6; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const dateStr = format(date, 'EEE');
        const dailySales = sales
          .filter(s => isSameDay(parseISO(s.date), date) && s.orderStatus !== OrderStatus.CANCELLED && s.orderStatus !== OrderStatus.RETURNED)
          .reduce((sum, s) => sum + (s.netPayout || 0), 0);
        const dailyRentals = rentals
          .filter(r => isSameDay(parseISO(r.date), date))
          .reduce((sum, r) => sum + (r.paidAmount || 0), 0);

        data.push({
          name: dateStr,
          Sales: dailySales,
          Rentals: dailyRentals,
          Total: dailySales + dailyRentals
        });
      }
    } else if (timeframe === 'MONTHLY') {
      for (let i = 3; i >= 0; i--) {
        const startOfPeriod = subDays(new Date(), (i + 1) * 7);
        const endOfPeriod = subDays(new Date(), i * 7);

        const periodSales = sales
          .filter(s => {
            const d = parseISO(s.date);
            return (d >= startOfPeriod && d <= endOfPeriod) && s.orderStatus !== OrderStatus.CANCELLED && s.orderStatus !== OrderStatus.RETURNED;
          })
          .reduce((sum, s) => sum + (s.netPayout || 0), 0);

        const periodRentals = rentals
          .filter(r => {
            const d = parseISO(r.date);
            return (d >= startOfPeriod && d <= endOfPeriod);
          })
          .reduce((sum, r) => sum + (r.paidAmount || 0), 0);

        data.push({
          name: `Week ${4 - i}`,
          Sales: periodSales,
          Rentals: periodRentals,
          Total: periodSales + periodRentals
        });
      }
    } else {
      for (let i = 11; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const dateStr = format(date, 'MMM');

        const periodSales = sales
          .filter(s => isSameMonth(parseISO(s.date), date) && s.orderStatus !== OrderStatus.CANCELLED && s.orderStatus !== OrderStatus.RETURNED)
          .reduce((sum, s) => sum + (s.netPayout || 0), 0);

        const periodRentals = rentals
          .filter(r => isSameMonth(parseISO(r.date), date))
          .reduce((sum, r) => sum + (r.paidAmount || 0), 0);

        data.push({
          name: dateStr,
          Sales: periodSales,
          Rentals: periodRentals,
          Total: periodSales + periodRentals
        });
      }
    }
    return data;
  }, [sales, rentals, timeframe, startDateFilter, endDateFilter]);

  const chartTotals = useMemo(() => {
    const totalSales = salesGraphData.reduce((sum, d) => sum + (d.Sales || 0), 0);
    const totalRentals = salesGraphData.reduce((sum, d) => sum + (d.Rentals || 0), 0);
    const combined = totalSales + totalRentals;
    const avgDaily = salesGraphData.length > 0 ? Math.round(combined / salesGraphData.length) : 0;
    return { totalSales, totalRentals, combined, avgDaily };
  }, [salesGraphData]);

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return UPCOMING_EVENTS.filter(event => {
      const days = calcEventRemainingDays(event.date);
      if (eventCategoryFilter === 'SOON') return days >= 0 && days <= 45;
      if (eventCategoryFilter === 'FESTIVAL') return event.category === 'festival';
      if (eventCategoryFilter === 'SEASON') return event.category === 'season';
      return true;
    });
  }, [eventCategoryFilter]);

  // Combined Recent Feed 
  const recentActivities = useMemo(() => {
    const feeds: { id: string; type: string; details: string; time: string; icon: React.ReactNode; color: string; badge: string }[] = [];

    sales.slice(0, 4).forEach(s => {
      const cust = customers.find(c => c.id === s.customerId)?.name || 'Walk-in Customer';
      feeds.push({
        id: `sale-${s.id}`,
        type: 'Sale Order Completed',
        details: `${cust} • ${formatMoney(s.netPayout || s.totalAmount)}`,
        time: s.date,
        icon: <ShoppingBag size={14} className="text-emerald-600" />,
        color: 'bg-emerald-50 border-emerald-100',
        badge: 'Sale'
      });
    });

    rentals.slice(0, 4).forEach(r => {
      const cust = customers.find(c => c.id === r.customerId)?.name || 'Customer';
      const isReturned = r.status === 'RETURNED';
      feeds.push({
        id: `rental-${r.id}`,
        type: isReturned ? 'Rental Item Returned' : 'New Rental Dispatched',
        details: `${cust} • ${formatMoney(r.totalRentAmount)}`,
        time: r.date,
        icon: <Undo2 size={14} className="text-indigo-600" />,
        color: isReturned ? 'bg-amber-50 border-amber-100' : 'bg-indigo-50 border-indigo-100',
        badge: isReturned ? 'Return' : 'Rental'
      });
    });

    stockLogs.slice(0, 4).forEach(l => {
      const prod = products.find(p => p.id === l.productId)?.name || 'Inventory Item';
      const qtyStr = l.type === 'IN' ? `+${l.quantity}` : `-${l.quantity}`;
      feeds.push({
        id: `stock-${l.id}`,
        type: 'Stock Inventory Updated',
        details: `${prod} (${qtyStr} pcs • ${l.pool === 'RENTAL' ? 'Rental Pool' : 'Sale Pool'})`,
        time: l.date,
        icon: <Package size={14} className="text-teal-600" />,
        color: 'bg-teal-50 border-teal-100',
        badge: 'Stock'
      });
    });

    expenses.slice(0, 3).forEach(e => {
      feeds.push({
        id: `exp-${e.id}`,
        type: `Expense: ${e.category || 'General'}`,
        details: `${e.notes || 'Operating cost'} • ${formatMoney(e.amount)}`,
        time: e.date,
        icon: <Wallet size={14} className="text-purple-600" />,
        color: 'bg-purple-50 border-purple-100',
        badge: 'Expense'
      });
    });

    return feeds.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 5);
  }, [sales, rentals, stockLogs, expenses, customers, products]);

  // Format relative time helper
  const getRelativeTime = (dateStr: string) => {
    try {
      const d = parseISO(dateStr);
      if (isToday(d)) return `Today at ${format(d, 'hh:mm a')}`;
      if (isSameDay(d, subDays(new Date(), 1))) return `Yesterday at ${format(d, 'hh:mm a')}`;
      return format(d, 'dd MMM, hh:mm a');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-5 pb-24 animate-nano max-w-[1600px] mx-auto">

      {/* ── Backup Feedback Toast Notification ── */}
      {backupToast && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-top-3 duration-200 border border-slate-700">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <span>{backupToast}</span>
        </div>
      )}

      {/* ── Daily Backup Banner (Compact & Sleek) ── */}
      {showBackupAlert && (
        <div className="bg-amber-50/80 border border-amber-200/90 rounded-lg px-3 py-1.5 flex items-center justify-between gap-2 shadow-2xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2 min-w-0">
            <FileSpreadsheet size={15} className="text-amber-700 shrink-0" />
            <p className="text-[11px] sm:text-xs font-bold text-amber-900 truncate">
              Daily backup recommended <span className="hidden sm:inline font-normal text-amber-700 text-[10px]">• Download today's Excel snapshot</span>
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleExcelBackup}
              disabled={isBackingUp}
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-75 active:scale-95 text-white font-extrabold rounded text-[10px] sm:text-[11px] transition-all flex items-center gap-1"
            >
              {isBackingUp ? (
                <>
                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Generating...</span>
                </>
              ) : (
                'Backup Now'
              )}
            </button>
            <button
              onClick={() => setShowBackupAlert(false)}
              className="text-amber-600 hover:text-amber-900 p-0.5 rounded hover:bg-amber-100/60 transition-colors text-xs font-bold leading-none"
              title="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ── Executive Command Header & Range Filter (Matching Reference Design) ── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Left Branding / Title */}
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-[#01a9fb] text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
                <Calendar size={22} strokeWidth={2.2} />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-tight">Dashboard</h1>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">
                  {format(new Date(), 'dd MMM yyyy, EEEE')}
                </p>
              </div>
            </div>

            {/* Mobile Controls (Date Selector Dropdown + Excel Icon Button) */}
            <div className="flex md:hidden items-center gap-2">
              <div className="relative">
                <button
                  onClick={() => setIsMobileDateMenuOpen(!isMobileDateMenuOpen)}
                  className="flex items-center gap-1.5 bg-[#f0f7ff] hover:bg-[#e0f0fe] text-[#01a9fb] border border-[#bfdbfe] rounded-xl px-3 py-2 text-xs font-bold transition-all active:scale-95 shadow-xs"
                >
                  <Calendar size={14} strokeWidth={2.2} className="text-[#01a9fb] shrink-0" />
                  <span>
                    {filterPreset === 'TODAY' && 'Today'}
                    {filterPreset === 'YESTERDAY' && 'Yesterday'}
                    {filterPreset === 'LAST_7_DAYS' && 'Last 7 Days'}
                    {filterPreset === 'LAST_30_DAYS' && 'Last 30 Days'}
                    {filterPreset === 'LAST_6_MONTHS' && 'Last 6 Months'}
                    {filterPreset === 'LAST_1_YEAR' && 'Last 1 Year'}
                    {filterPreset === 'LIFETIME' && 'All Time'}
                    {filterPreset === 'CUSTOM' && 'Custom'}
                  </span>
                  <ChevronDown size={13} strokeWidth={2.5} className={`transition-transform duration-200 text-[#01a9fb] ${isMobileDateMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Popover Menu for Mobile */}
                {isMobileDateMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsMobileDateMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-1.5 w-44 bg-white border border-slate-200 rounded-md shadow-lg py-1 z-50 animate-nano">
                      {[
                        { id: 'TODAY', label: 'Today' },
                        { id: 'YESTERDAY', label: 'Yesterday' },
                        { id: 'LAST_7_DAYS', label: 'Last 7 Days' },
                        { id: 'LAST_30_DAYS', label: 'Last 30 Days' },
                        { id: 'LAST_6_MONTHS', label: 'Last 6 Months' },
                        { id: 'LAST_1_YEAR', label: 'Last 1 Year' },
                        { id: 'LIFETIME', label: 'All Time' },
                        { id: 'CUSTOM', label: 'Custom Range...' },
                      ].map(item => (
                        <button
                          key={item.id}
                          onClick={() => {
                            handlePresetChange(item.id);
                            setIsMobileDateMenuOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs font-bold flex items-center justify-between transition-colors ${filterPreset === item.id
                            ? 'bg-[#01a9fb]/10 text-[#01a9fb]'
                            : 'text-slate-700 hover:bg-slate-50'
                            }`}
                        >
                          <span>{item.label}</span>
                          {filterPreset === item.id && <span className="w-1.5 h-1.5 rounded-full bg-[#01a9fb]" />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={handleExcelBackup}
                title="Download Excel Backup"
                className="p-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md transition-all active:scale-95 shrink-0"
              >
                <Download size={13} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {/* Desktop Filter Pills & Export Button */}
          <div className="hidden md:flex items-center gap-2 flex-wrap">
            <div className="inline-flex bg-slate-100/90 p-0.5 sm:p-1 rounded-md border border-slate-200/80 gap-0.5">
              {[
                { id: 'TODAY', label: 'Today' },
                { id: 'YESTERDAY', label: 'Y’day' },
                { id: 'LAST_7_DAYS', label: '7D' },
                { id: 'LAST_30_DAYS', label: '30D' },
                { id: 'LAST_6_MONTHS', label: '6M' },
                { id: 'LAST_1_YEAR', label: '1Y' },
                { id: 'LIFETIME', label: 'All' },
                { id: 'CUSTOM', label: 'Custom' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => handlePresetChange(tab.id)}
                  className={`px-2.5 py-1 text-xs font-bold rounded transition-all whitespace-nowrap ${filterPreset === tab.id
                    ? 'bg-[#01a9fb] text-white font-extrabold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              onClick={handleExcelBackup}
              title="Download Excel Backup"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-md transition-all active:scale-95 shrink-0"
            >
              <Download size={13} strokeWidth={2.5} />
              <span>Export Excel</span>
            </button>
          </div>
        </div>

        {/* Custom Date Pickers Drawer (when Custom is selected) */}
        {filterPreset === 'CUSTOM' && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 flex-wrap animate-nano">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Date Range:</span>
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-md p-1 ">
              <div className="flex items-center gap-1 px-2 py-0.5 bg-white rounded border border-slate-200/60">
                <span className="text-[9px] font-bold text-slate-400 uppercase">From:</span>
                <input
                  type="date"
                  value={startDateFilter}
                  onChange={(e) => setStartDateFilter(e.target.value)}
                  className="text-xs font-semibold text-slate-700 bg-transparent outline-none cursor-pointer"
                />
              </div>
              <span className="text-slate-400 font-bold text-xs">→</span>
              <div className="flex items-center gap-1 px-2 py-0.5 bg-white rounded border border-slate-200/60">
                <span className="text-[9px] font-bold text-slate-400 uppercase">To:</span>
                <input
                  type="date"
                  value={endDateFilter}
                  onChange={(e) => setEndDateFilter(e.target.value)}
                  className="text-xs font-semibold text-slate-700 bg-transparent outline-none cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── High-Efficiency Quick Action Strip (Matching Reference Design) ── */}
      <div className="flex overflow-x-auto gap-2.5 sm:gap-3 pb-1.5 hide-scrollbar snap-x sm:grid sm:grid-cols-4 lg:grid-cols-7 sm:overflow-visible sm:pb-0">
        {/* Action 1: New Bill / Sale */}
        <button
          onClick={() => setIsCreateBillModalOpen(true)}
          className="min-w-[130px] shrink-0 snap-start sm:min-w-0 sm:shrink group relative flex flex-col justify-between p-3.5 bg-white hover:bg-[#01a9fb]/5 border border-slate-200/90 hover:border-[#01a9fb] rounded-2xl transition-all text-left shadow-xs active:scale-95"
        >
          <div className="w-full flex items-center justify-between gap-2 mb-3">
            <div className="w-9 h-9 rounded-xl bg-[#01a9fb] text-white flex items-center justify-center transition-transform group-hover:scale-105 shadow-sm shadow-blue-500/20 shrink-0">
              <ShoppingBag size={17} strokeWidth={2.2} />
            </div>
            <span className="text-[9.5px] font-black tracking-wider uppercase text-[#01a9fb] bg-[#eff6ff] border border-[#dbeafe] px-2 py-0.5 rounded-md shrink-0 whitespace-nowrap">
              POS
            </span>
          </div>
          <div>
            <span className="text-xs sm:text-sm font-black text-slate-900 leading-tight block whitespace-nowrap">+ New Bill</span>
            <span className="text-[10px] font-semibold text-slate-400 mt-0.5 block whitespace-nowrap">Instant Sale</span>
          </div>
        </button>

        {/* Action 2: New Rental */}
        <button
          onClick={() => setIsNewRentalModalOpen(true)}
          className="min-w-[130px] shrink-0 snap-start sm:min-w-0 sm:shrink group relative flex flex-col justify-between p-3.5 bg-white hover:bg-[#fe569f]/5 border border-slate-200/90 hover:border-[#fe569f] rounded-2xl transition-all text-left shadow-xs active:scale-95"
        >
          <div className="w-full flex items-center justify-between gap-2 mb-3">
            <div className="w-9 h-9 rounded-xl bg-[#fe569f] text-white flex items-center justify-center transition-transform group-hover:scale-105 shadow-sm shadow-pink-500/20 shrink-0">
              <Calendar size={17} strokeWidth={2.2} />
            </div>
            <span className="text-[9.5px] font-black tracking-wider uppercase text-[#fe569f] bg-[#fdf2f8] border border-[#fce7f3] px-2 py-0.5 rounded-md shrink-0 whitespace-nowrap">
              RENT
            </span>
          </div>
          <div>
            <span className="text-xs sm:text-sm font-black text-slate-900 leading-tight block whitespace-nowrap">+ Rental</span>
            <span className="text-[10px] font-semibold text-slate-400 mt-0.5 block whitespace-nowrap">Book Outfit</span>
          </div>
        </button>

        {/* Action 3: Add Product */}
        <button
          onClick={() => setIsProductModalOpen(true)}
          className="min-w-[130px] shrink-0 snap-start sm:min-w-0 sm:shrink group relative flex flex-col justify-between p-3.5 bg-white hover:bg-[#01a9fb]/5 border border-slate-200/90 hover:border-[#01a9fb] rounded-2xl transition-all text-left shadow-xs active:scale-95"
        >
          <div className="w-full flex items-center justify-between gap-2 mb-3">
            <div className="w-9 h-9 rounded-xl bg-[#0f172a] text-white group-hover:bg-[#01a9fb] flex items-center justify-center transition-colors shadow-sm shrink-0">
              <PlusCircle size={17} strokeWidth={2.2} />
            </div>
            <span className="text-[9.5px] font-black tracking-wider uppercase text-slate-800 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md shrink-0 whitespace-nowrap">
              SKU
            </span>
          </div>
          <div>
            <span className="text-xs sm:text-sm font-black text-slate-900 leading-tight block whitespace-nowrap">+ Product</span>
            <span className="text-[10px] font-semibold text-slate-400 mt-0.5 block whitespace-nowrap">Add Catalog</span>
          </div>
        </button>

        {/* Action 4: Return Rental */}
        <button
          onClick={() => setIsReturnRentalModalOpen(true)}
          className="min-w-[130px] shrink-0 snap-start sm:min-w-0 sm:shrink group relative flex flex-col justify-between p-3.5 bg-white hover:bg-yellow-50/60 border border-slate-200/90 hover:border-yellow-400 rounded-2xl transition-all text-left shadow-xs active:scale-95"
        >
          <div className="w-full flex items-center justify-between gap-2 mb-3">
            <div className="w-9 h-9 rounded-xl bg-[#FACC15] text-slate-900 flex items-center justify-center font-bold transition-transform group-hover:scale-105 shadow-sm shadow-yellow-500/20 shrink-0">
              <Undo2 size={17} strokeWidth={2.5} />
            </div>
            <span className="text-[9px] font-black tracking-wider uppercase text-yellow-900 bg-yellow-100 px-2 py-0.5 rounded border border-yellow-300 shrink-0 whitespace-nowrap">
              Inward
            </span>
          </div>
          <div>
            <span className="text-xs font-black text-slate-900 leading-tight block whitespace-nowrap">Return</span>
            <span className="text-[10px] font-semibold text-slate-400 mt-0.5 block whitespace-nowrap">Check In</span>
          </div>
        </button>

        {/* Action 5: Stock In */}
        <button
          onClick={() => setIsStockModalOpen(true)}
          className="min-w-[130px] shrink-0 snap-start sm:min-w-0 sm:shrink group relative flex flex-col justify-between p-3.5 bg-white hover:bg-[#01a9fb]/5 border border-slate-200/90 hover:border-[#01a9fb] rounded-2xl transition-all text-left shadow-xs active:scale-95"
        >
          <div className="w-full flex items-center justify-between gap-2 mb-3">
            <div className="w-9 h-9 rounded-xl bg-[#01a9fb]/15 text-[#01a9fb] group-hover:bg-[#01a9fb] group-hover:text-white flex items-center justify-center transition-colors shrink-0">
              <Package size={17} strokeWidth={2.2} />
            </div>
            <span className="text-[9px] font-black tracking-wider uppercase text-[#01a9fb] bg-[#01a9fb]/10 px-2 py-0.5 rounded border border-[#01a9fb]/20 shrink-0 whitespace-nowrap">
              Stock
            </span>
          </div>
          <div>
            <span className="text-xs font-black text-slate-900 leading-tight block whitespace-nowrap">+ Stock In</span>
            <span className="text-[10px] font-semibold text-slate-400 mt-0.5 block whitespace-nowrap">Add Units</span>
          </div>
        </button>

        {/* Action 6: Add Customer */}
        <button
          onClick={() => setIsCustomerModalOpen(true)}
          className="min-w-[130px] shrink-0 snap-start sm:min-w-0 sm:shrink group relative flex flex-col justify-between p-3.5 bg-white hover:bg-[#fe569f]/5 border border-slate-200/90 hover:border-[#fe569f] rounded-2xl transition-all text-left shadow-xs active:scale-95"
        >
          <div className="w-full flex items-center justify-between gap-2 mb-3">
            <div className="w-9 h-9 rounded-xl bg-[#fe569f]/15 text-[#fe569f] group-hover:bg-[#fe569f] group-hover:text-white flex items-center justify-center transition-colors shrink-0">
              <Users size={17} strokeWidth={2.2} />
            </div>
            <span className="text-[9px] font-black tracking-wider uppercase text-[#fe569f] bg-[#fe569f]/10 px-2 py-0.5 rounded border border-[#fe569f]/20 shrink-0 whitespace-nowrap">
              CRM
            </span>
          </div>
          <div>
            <span className="text-xs font-black text-slate-900 leading-tight block whitespace-nowrap">+ Customer</span>
            <span className="text-[10px] font-semibold text-slate-400 mt-0.5 block whitespace-nowrap">New Profile</span>
          </div>
        </button>

        {/* Action 7: Record Expense */}
        <button
          onClick={() => setIsRecordExpenseModalOpen(true)}
          className="min-w-[130px] shrink-0 snap-start sm:min-w-0 sm:shrink sm:col-span-4 lg:col-span-1 group relative flex flex-col justify-between p-3.5 bg-white hover:bg-yellow-50/60 border border-slate-200/90 hover:border-yellow-400 rounded-2xl transition-all text-left shadow-xs active:scale-95"
        >
          <div className="w-full flex items-center justify-between gap-2 mb-3">
            <div className="w-9 h-9 rounded-xl bg-yellow-100 text-yellow-900 group-hover:bg-[#FACC15] group-hover:text-slate-900 flex items-center justify-center transition-colors shrink-0">
              <Wallet size={17} strokeWidth={2.2} />
            </div>
            <span className="text-[9px] font-black tracking-wider uppercase text-yellow-900 bg-yellow-100 px-2 py-0.5 rounded border border-yellow-300 shrink-0 whitespace-nowrap">
              Cost
            </span>
          </div>
          <div>
            <span className="text-xs font-black text-slate-900 leading-tight block whitespace-nowrap">+ Expense</span>
            <span className="text-[10px] font-semibold text-slate-400 mt-0.5 block whitespace-nowrap">Log Outflow</span>
          </div>
        </button>
      </div>

      {/* ── Executive Metric KPI Cards Grid (8 Cards) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3.5">

        {/* KPI 1: Sales / Revenue */}
        <div
          onClick={() => navigate('reports')}
          className="group relative overflow-hidden bg-white hover:bg-slate-50/50 p-3 sm:p-4 rounded-md border border-slate-200/80 hover:border-[#01a9fb]/60 transition-all duration-200 cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between gap-1 mb-2">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 leading-tight line-clamp-1">{salesTitle}</span>
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-[#01a9fb]/10 text-[#01a9fb] flex items-center justify-center group-hover:bg-[#01a9fb] group-hover:text-white transition-colors shrink-0">
                <TrendingUp size={14} strokeWidth={2.5} />
              </div>
            </div>
            <h2 className="text-base sm:text-xl lg:text-2xl font-extrabold text-slate-900 tracking-tight leading-none">
              {formatMoney(todaySalesAmount)}
            </h2>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-1 mt-2.5 pt-2 border-t border-slate-100 text-[10px] sm:text-xs">
            <span className="font-bold text-[#01a9fb]">
              Profit: {formatMoney(todayProfit)}
            </span>
            <span className="font-extrabold text-[#fe569f] bg-[#fe569f]/10 border border-[#fe569f]/30 px-1 py-0.2 rounded text-[9px] sm:text-[10px]">
              {todayProfitPercent.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* KPI 2: Net Income */}
        <div
          onClick={() => navigate('reports')}
          className="group relative overflow-hidden bg-white hover:bg-slate-50/50 p-3 sm:p-4 rounded-md border border-slate-200/80 hover:border-[#01a9fb]/60 transition-all duration-200 cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between gap-1 mb-2">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 leading-tight line-clamp-1">Net Income</span>
              <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-md flex items-center justify-center transition-colors shrink-0 ${netIncomeValue >= 0 ? 'bg-[#01a9fb]/10 text-[#01a9fb] group-hover:bg-[#01a9fb] group-hover:text-white' : 'bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white'}`}>
                {netIncomeValue >= 0 ? <ArrowUpRight size={14} strokeWidth={2.5} /> : <ArrowDownRight size={14} strokeWidth={2.5} />}
              </div>
            </div>
            <h2 className={`text-base sm:text-xl lg:text-2xl font-extrabold tracking-tight leading-none ${netIncomeValue >= 0 ? 'text-[#01a9fb]' : 'text-rose-600'}`}>
              {formatMoney(netIncomeValue)}
            </h2>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-1 mt-2.5 pt-2 border-t border-slate-100 text-[10px] sm:text-xs">
            <span className={`font-bold ${netIncomeValue >= 0 ? 'text-[#01a9fb]' : 'text-rose-600'}`}>
              {netIncomeValue >= 0 ? 'Surplus' : 'Deficit'}
            </span>
            <span className="text-slate-500 font-semibold">
              Exp: {formatMoney(totalExpensesAmount)}
            </span>
          </div>
        </div>

        {/* KPI 3: Active Rentals */}
        <div
          onClick={() => navigate('rentals')}
          className="group relative overflow-hidden bg-white hover:bg-slate-50/50 p-3 sm:p-4 rounded-md border border-slate-200/80 hover:border-[#fe569f]/60 transition-all duration-200 cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between gap-1 mb-2">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 leading-tight line-clamp-1">Active Rentals</span>
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-[#fe569f]/10 text-[#fe569f] flex items-center justify-center group-hover:bg-[#fe569f] group-hover:text-white transition-colors shrink-0">
                <Calendar size={14} strokeWidth={2.5} />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <h2 className="text-base sm:text-xl lg:text-2xl font-extrabold text-slate-900 tracking-tight leading-none">
                {activeRentalsToShow.length}
              </h2>
              <span className="text-[11px] font-semibold text-slate-400">items</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-1 mt-2.5 pt-2 border-t border-slate-100 text-[10px] sm:text-xs">
            <span className="font-semibold text-slate-600">
              Val: <strong className="text-slate-900">{formatMoney(activeRentalsValue)}</strong>
            </span>
            <span className="text-[9px] sm:text-[10px] font-bold text-[#fe569f] bg-[#fe569f]/10 px-1 py-0.2 rounded border border-[#fe569f]/30">
              Manage →
            </span>
          </div>
        </div>

        {/* KPI 4: Returns Due & Overdue */}
        <div
          onClick={() => navigate('rentals')}
          className={`group relative overflow-hidden p-3 sm:p-4 rounded-md border transition-all duration-200 cursor-pointer flex flex-col justify-between ${overdueRentals.length > 0
            ? 'bg-rose-50/50 border-rose-200 hover:border-rose-300'
            : 'bg-white hover:bg-slate-50/50 border-slate-200/80 hover:border-yellow-300'
            }`}
        >
          <div>
            <div className="flex items-center justify-between gap-1 mb-2">
              <span className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider leading-tight line-clamp-1 ${overdueRentals.length > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                {returnsDueTitle}
              </span>
              <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-md flex items-center justify-center transition-colors shrink-0 ${overdueRentals.length > 0 ? 'bg-rose-100 text-rose-600 group-hover:bg-rose-600 group-hover:text-white' : 'bg-yellow-100 text-yellow-800 group-hover:bg-[#FACC15] group-hover:text-slate-900'}`}>
                <AlertTriangle size={14} strokeWidth={2.5} />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <h2 className={`text-base sm:text-xl lg:text-2xl font-extrabold tracking-tight leading-none ${overdueRentals.length > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                {returnsDueCount}
              </h2>
              <span className="text-[11px] font-semibold text-slate-400">due</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-1 mt-2.5 pt-2 border-t border-slate-100 text-[10px] sm:text-xs">
            <div className="flex items-center gap-1">
              {overdueRentals.length > 0 && (
                <span className="text-[9px] font-extrabold bg-rose-600 text-white px-1 py-0.2 rounded">
                  {overdueRentals.length} Overdue
                </span>
              )}
              <span className="text-[9px] font-bold text-yellow-900 bg-yellow-100 px-1 py-0.2 rounded border border-yellow-300">
                {dueTodayRentals.length} Today
              </span>
            </div>
            <span className="text-slate-500 font-semibold">{formatMoney(returnsDueValue)}</span>
          </div>
        </div>

        {/* KPI 5: Pending Credit / Dues */}
        <div
          onClick={() => navigate('reports')}
          className="group relative overflow-hidden bg-white hover:bg-slate-50/50 p-3 sm:p-4 rounded-md border border-slate-200/80 hover:border-yellow-300 transition-all duration-200 cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between gap-1 mb-2">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 leading-tight line-clamp-1">Credit / Dues</span>
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-yellow-100 text-yellow-800 flex items-center justify-center group-hover:bg-[#FACC15] group-hover:text-slate-900 transition-colors shrink-0">
                <IndianRupee size={14} strokeWidth={2.5} />
              </div>
            </div>
            <h2 className="text-base sm:text-xl lg:text-2xl font-extrabold text-yellow-700 tracking-tight leading-none">
              {formatMoney(totalPendingPayments)}
            </h2>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-1 mt-2.5 pt-2 border-t border-slate-100 text-[10px] sm:text-xs">
            <span className="font-semibold text-slate-600">
              <strong className="text-slate-900">{customersWithCredit}</strong> Clients
            </span>
            <span className="text-[9px] sm:text-[10px] font-bold text-yellow-900 bg-yellow-100 px-1 py-0.2 rounded border border-yellow-300">
              Dues
            </span>
          </div>
        </div>

        {/* KPI 6: Total Inventory Stock */}
        <div
          onClick={() => navigate('inventory')}
          className="group relative overflow-hidden bg-white hover:bg-slate-50/50 p-3 sm:p-4 rounded-md border border-slate-200/80 hover:border-[#01a9fb]/60 transition-all duration-200 cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between gap-1 mb-2">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 leading-tight line-clamp-1">Store Stock</span>
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-[#01a9fb]/10 text-[#01a9fb] flex items-center justify-center group-hover:bg-[#01a9fb] group-hover:text-white transition-colors shrink-0">
                <Package size={14} strokeWidth={2.5} />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <h2 className="text-base sm:text-xl lg:text-2xl font-extrabold text-slate-900 tracking-tight leading-none">
                {availableStock}
              </h2>
              <span className="text-[11px] font-semibold text-slate-400">pcs</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-1 mt-2.5 pt-2 border-t border-slate-100 text-[10px] sm:text-xs">
            <span className="font-semibold text-slate-600">
              Val: <strong className="text-slate-900">{formatMoney(stockValuation)}</strong>
            </span>
            <span className="text-[9px] sm:text-[10px] font-bold text-[#01a9fb] bg-[#01a9fb]/10 px-1 py-0.2 rounded border border-[#01a9fb]/30">
              {products.length} SKUs
            </span>
          </div>
        </div>

        {/* KPI 7: Customer Base Dynamics */}
        <div
          onClick={() => navigate('customers')}
          className="group relative overflow-hidden bg-white hover:bg-slate-50/50 p-3 sm:p-4 rounded-md border border-slate-200/80 hover:border-[#fe569f]/60 transition-all duration-200 cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between gap-1 mb-2">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 leading-tight line-clamp-1">{customersTitle}</span>
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-[#fe569f]/10 text-[#fe569f] flex items-center justify-center group-hover:bg-[#fe569f] group-hover:text-white transition-colors shrink-0">
                <Users size={14} strokeWidth={2.5} />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <h2 className="text-base sm:text-xl lg:text-2xl font-extrabold text-slate-900 tracking-tight leading-none">
                {customersCountToShow}
              </h2>
              <span className="text-[11px] font-semibold text-slate-400">users</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-1 mt-2.5 pt-2 border-t border-slate-100 text-[10px] sm:text-xs">
            <div className="flex items-center gap-1">
              <span className="text-[9px] font-bold text-[#01a9fb] bg-[#01a9fb]/10 px-1 py-0.2 rounded border border-[#01a9fb]/30">
                {repeatCustomersCount} Ret
              </span>
              <span className="text-[9px] font-bold text-[#fe569f] bg-[#fe569f]/10 px-1 py-0.2 rounded border border-[#fe569f]/30">
                {newCustomersCount} New
              </span>
            </div>
            <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium">+{newCustomersThisMonth} mo</span>
          </div>
        </div>

        {/* KPI 8: Operating Expenses */}
        <div
          onClick={() => navigate('reports')}
          className="group relative overflow-hidden bg-white hover:bg-slate-50/50 p-3 sm:p-4 rounded-md border border-slate-200/80 hover:border-yellow-300 transition-all duration-200 cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between gap-1 mb-2">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 leading-tight line-clamp-1">{expensesTitle}</span>
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-yellow-100 text-yellow-800 flex items-center justify-center group-hover:bg-[#FACC15] group-hover:text-slate-900 transition-colors shrink-0">
                <Wallet size={14} strokeWidth={2.5} />
              </div>
            </div>
            <h2 className="text-base sm:text-xl lg:text-2xl font-extrabold text-yellow-800 tracking-tight leading-none">
              {formatMoney(totalExpensesAmount)}
            </h2>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-1 mt-2.5 pt-2 border-t border-slate-100 text-[10px] sm:text-xs">
            <span className="font-semibold text-slate-600">
              <strong className="text-slate-900">{expensesToShow.length}</strong> logs
            </span>
            <span className="text-[9px] sm:text-[10px] font-bold text-yellow-900 bg-yellow-100 px-1 py-0.2 rounded border border-yellow-300">
              Details →
            </span>
          </div>
        </div>

      </div>

      {/* ── Main Operations Row: Visual Analytics & Seasonal Stocking Hub ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* 1. Sales & Earnings Chart Hub (8 Cols) */}
        <div className="lg:col-span-8 bg-white p-5 sm:p-6 rounded-md border border-slate-200/80 flex flex-col justify-between">
          <div>
            {/* Chart Control Header */}
            <div className="space-y-2.5 pb-3 border-b border-slate-100">
              {/* Row 1: Title Header */}
              <div className="flex items-center gap-2">
                <BarChart3 size={17} className="text-[#01a9fb] shrink-0" />
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight whitespace-nowrap">Revenue Trends</h2>
              </div>

              {/* Row 2: All / Sales / Rentals Filter on Left, Bar vs Curve Icons on Right */}
              <div className="flex items-center justify-between gap-2.5">
                {/* Metric Filter (Left Aligned) */}
                <div className="inline-flex bg-slate-100 p-0.5 rounded-md text-[10px] font-bold shrink-0">
                  <button
                    onClick={() => setChartMetric('ALL')}
                    className={`px-2.5 py-1 rounded transition-all whitespace-nowrap ${chartMetric === 'ALL' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setChartMetric('SALES')}
                    className={`px-2.5 py-1 rounded transition-all whitespace-nowrap ${chartMetric === 'SALES' ? 'bg-[#01a9fb] text-white shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    Sales
                  </button>
                  <button
                    onClick={() => setChartMetric('RENTALS')}
                    className={`px-2.5 py-1 rounded transition-all whitespace-nowrap ${chartMetric === 'RENTALS' ? 'bg-[#fe569f] text-white shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    Rentals
                  </button>
                </div>

                {/* Bar vs Curve Icon Toggle (Right Aligned) */}
                <div className="inline-flex bg-slate-100 p-0.5 rounded-md text-[10px] font-bold shrink-0">
                  <button
                    type="button"
                    onClick={() => setChartType('BAR')}
                    className={`p-1.5 rounded transition-all flex items-center justify-center ${chartType === 'BAR' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
                    title="Bar Chart View"
                  >
                    <BarChart3 size={13} strokeWidth={2.5} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartType('AREA')}
                    className={`p-1.5 rounded transition-all flex items-center justify-center ${chartType === 'AREA' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
                    title="Smooth Curve Area View"
                  >
                    <Activity size={13} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            </div>

            {/* Chart Summary Metric Strip */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5 my-2.5 sm:my-3">
              <div className="bg-[#01a9fb]/10 border border-[#01a9fb]/20 rounded-md p-2 sm:p-2.5">
                <span className="text-[9px] sm:text-[10px] font-extrabold uppercase text-[#01a9fb] tracking-wider whitespace-nowrap block truncate">Sales</span>
                <p className="text-xs sm:text-base font-extrabold text-slate-900 mt-0.5 whitespace-nowrap truncate">{formatMoney(chartTotals.totalSales)}</p>
              </div>
              <div className="bg-[#fe569f]/10 border border-[#fe569f]/20 rounded-md p-2 sm:p-2.5">
                <span className="text-[9px] sm:text-[10px] font-extrabold uppercase text-[#fe569f] tracking-wider whitespace-nowrap block truncate">Rentals</span>
                <p className="text-xs sm:text-base font-extrabold text-slate-900 mt-0.5 whitespace-nowrap truncate">{formatMoney(chartTotals.totalRentals)}</p>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-2 sm:p-2.5">
                <span className="text-[9px] sm:text-[10px] font-extrabold uppercase text-yellow-800 tracking-wider whitespace-nowrap block truncate">Turnover</span>
                <p className="text-xs sm:text-base font-extrabold text-slate-900 mt-0.5 whitespace-nowrap truncate">{formatMoney(chartTotals.combined)}</p>
              </div>
            </div>
            {/* Chart Display */}
            {chartTotals.combined === 0 ? (
              <div className="h-[240px] w-full flex flex-col items-center justify-center text-center p-6 bg-slate-50/70 rounded-md border border-dashed border-slate-200">
                <div className="w-10 h-10 rounded-md bg-slate-100 flex items-center justify-center mb-2">
                  <BarChart3 size={20} className="text-slate-400" />
                </div>
                <p className="text-xs font-bold text-slate-600">No transactions recorded for this period</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Create a new bill or rental booking to visualize real-time growth</p>
              </div>
            ) : (
              <div className="h-[200px] sm:h-[240px] w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'BAR' ? (
                    <BarChart data={salesGraphData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} dy={8} />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }}
                        tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                      />
                      <Tooltip
                        cursor={{ fill: '#f8fafc', opacity: 0.8 }}
                        formatter={(value: any, name: any) => [`₹${Number(value || 0).toLocaleString('en-IN')}`, name]}
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: 'none', fontSize: '11px', fontWeight: 'bold', padding: '8px 12px' }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', paddingTop: '10px' }} />
                      {(chartMetric === 'ALL' || chartMetric === 'SALES') && (
                        <Bar dataKey="Sales" stackId={chartMetric === 'ALL' ? 'a' : undefined} fill="#01a9fb" radius={chartMetric === 'ALL' ? [0, 0, 2, 2] : [4, 4, 0, 0]} maxBarSize={45} />
                      )}
                      {(chartMetric === 'ALL' || chartMetric === 'RENTALS') && (
                        <Bar dataKey="Rentals" stackId={chartMetric === 'ALL' ? 'a' : undefined} fill="#fe569f" radius={[4, 4, 0, 0]} maxBarSize={45} />
                      )}
                    </BarChart>
                  ) : (
                    <AreaChart data={salesGraphData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} dy={8} />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }}
                        tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                      />
                      <Tooltip
                        formatter={(value: any, name: any) => [`₹${Number(value || 0).toLocaleString('en-IN')}`, name]}
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: 'none', fontSize: '11px', fontWeight: 'bold', padding: '8px 12px' }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', paddingTop: '10px' }} />
                      {(chartMetric === 'ALL' || chartMetric === 'SALES') && (
                        <Area type="monotone" dataKey="Sales" stroke="#01a9fb" strokeWidth={2.5} fill="#01a9fb" fillOpacity={0.12} />
                      )}
                      {(chartMetric === 'ALL' || chartMetric === 'RENTALS') && (
                        <Area type="monotone" dataKey="Rentals" stroke="#fe569f" strokeWidth={2.5} fill="#fe569f" fillOpacity={0.12} />
                      )}
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Festive Stocking Hub (Standalone Section) ── */}
      <div className="bg-white p-4 sm:p-5 rounded-md border border-slate-200/80 border-l-4 border-l-[#fe569f]">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-1.5">
              <PartyPopper size={17} className="text-[#fe569f] shrink-0" />
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight whitespace-nowrap">Festive Stocking Hub</h2>
            </div>
            <span className="text-[10px] font-bold text-[#fe569f] bg-[#fe569f]/10 px-1.5 py-0.2 rounded uppercase tracking-wider border border-[#fe569f]/20 shrink-0">
              {UPCOMING_EVENTS.length} Events
            </span>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1 mb-2.5 overflow-x-auto hide-scrollbar">
            {[
              { id: 'SOON', label: 'Next 45d' },
              { id: 'FESTIVAL', label: 'Festivals' },
              { id: 'SEASON', label: 'Seasons' },
              { id: 'ALL', label: 'All Year' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setEventCategoryFilter(f.id as any)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all whitespace-nowrap ${eventCategoryFilter === f.id
                  ? 'bg-[#fe569f] text-white'
                  : 'bg-[#fe569f]/10 text-[#fe569f] hover:bg-[#fe569f]/20'
                  }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Event List */}
          <div className="space-y-2 overflow-y-auto max-h-[320px] pr-0.5 hide-scrollbar">
            {filteredEvents.length === 0 ? (
              <div className="p-4 text-center text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50 rounded-md border border-slate-200/60">
                No events in this filter
              </div>
            ) : (
              filteredEvents.map((event, idx) => {
                const isExpanded = expandedEventIdx === idx;
                const remainingText = calcEventRemaining(event.date);
                const isSoon = calcEventRemainingDays(event.date) <= 15 && calcEventRemainingDays(event.date) >= 0;

                return (
                  <div
                    key={event.id}
                    className={`rounded-md border transition-all overflow-hidden ${isExpanded
                      ? 'bg-white border-[#fe569f]/60'
                      : 'bg-white hover:bg-slate-50 border-slate-200/80 hover:border-[#fe569f]/40'
                      }`}
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedEventIdx(isExpanded ? null : idx)}
                      className="w-full p-2.5 flex items-center justify-between text-left cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-1.5 min-w-0 pr-1">
                        <span className="text-xs font-extrabold text-slate-900 truncate leading-tight">{event.title}</span>
                        {isSoon && (
                          <span className="shrink-0 w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 ml-1">
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase tracking-wider border whitespace-nowrap ${event.badgeClass}`}>
                          {remainingText}
                        </span>
                        <ChevronDown
                          size={13}
                          strokeWidth={2.5}
                          className={`text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-[#fe569f]' : ''}`}
                        />
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-3 pb-3 pt-1 border-t border-slate-100 space-y-2 bg-slate-50/70 animate-nano">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 bg-white p-2 rounded-md border border-slate-200/70">
                          <span className="flex items-center gap-1 whitespace-nowrap">
                            📅 Date: <strong className="text-slate-900">{event.date}</strong>
                          </span>
                          <span className="text-[#fe569f] font-extrabold bg-[#fe569f]/10 px-1.5 py-0.2 rounded border border-[#fe569f]/20 whitespace-nowrap">
                            {remainingText}
                          </span>
                        </div>

                        <div>
                          <p className="text-[9px] font-extrabold uppercase text-slate-500 tracking-wider mb-1 flex items-center gap-1">
                            <Flame size={11} className="text-amber-500" />
                            <span>Must-Stock Inventory</span>
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {event.suggestedStock.map((item, sIdx) => (
                              <span
                                key={sIdx}
                                className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold text-slate-800 bg-white px-1.5 py-0.5 rounded border border-slate-200/70"
                              >
                                <Check size={10} className="text-emerald-600 shrink-0" />
                                <span className="whitespace-nowrap">{item}</span>
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="pt-0.5 flex items-center justify-end">
                          <button
                            onClick={() => setIsStockModalOpen(true)}
                            className="text-[9px] sm:text-[10px] font-bold text-[#fe569f] hover:text-white hover:bg-[#fe569f] bg-[#fe569f]/10 border border-[#fe569f]/30 px-2 py-0.5 rounded transition-all flex items-center gap-1 whitespace-nowrap"
                          >
                            <PlusCircle size={11} />
                            <span>Restock For {event.title.split(' ')[0] || 'Event'}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── Operations Hub: Active Rentals Tracker & Inventory/Activity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* 1. Active Rentals Monitor & Fast Return (7 Cols) */}
        <div className="lg:col-span-7 bg-white p-4 sm:p-6 rounded-md border border-slate-200/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-[#fe569f]" />
                <div>
                  <h2 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">Active Rentals Tracker</h2>
                  <p className="text-[11px] sm:text-xs text-slate-400 font-medium">Real-time status of costumes & outfits currently rented out</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => navigate('rentals')}
              className="text-xs font-bold text-[#fe569f] hover:underline flex items-center gap-1 shrink-0"
            >
              <span>View All ({activeRentals.length})</span>
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Mobile Card View */}
          <div className="sm:hidden space-y-2">
            {activeRentals.slice(0, 5).length > 0 ? (
              activeRentals.slice(0, 5).map(rental => {
                const isDue = isToday(parseISO(rental.expectedReturnDate));
                const isOverdue = isPast(parseISO(rental.expectedReturnDate)) && !isToday(parseISO(rental.expectedReturnDate));
                const cust = customers.find(c => c.id === rental.customerId)?.name || 'Walk-in Customer';
                const prod = products.find(p => p.id === rental.productId)?.name || 'Garment Item';

                return (
                  <div key={rental.id} className="bg-slate-50 border border-slate-200/80 rounded-md p-2.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-7 h-7 rounded-md bg-[#01a9fb]/10 text-[#01a9fb] flex items-center justify-center font-extrabold text-[10px] shrink-0">
                        {cust.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 whitespace-nowrap overflow-hidden">
                          <p className="text-xs font-extrabold text-slate-900 truncate max-w-[110px]">{cust}</p>
                          <span className="text-slate-300">•</span>
                          <p className="text-[11px] text-slate-500 font-medium truncate flex-1">{prod}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 text-[9px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${isOverdue
                            ? 'bg-rose-100 text-rose-700 border border-rose-200'
                            : isDue
                              ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                              : 'bg-[#fe569f]/10 text-[#fe569f] border border-[#fe569f]/30'
                            }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isOverdue ? 'bg-rose-500' : isDue ? 'bg-yellow-500' : 'bg-[#fe569f]'}`}></span>
                            {isOverdue ? 'Overdue' : isDue ? 'Due Today' : format(parseISO(rental.expectedReturnDate), 'dd MMM')}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold">{rental.totalRentAmount ? `₹${rental.totalRentAmount}` : ''}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setIsReturnRentalModalOpen(true)}
                      className="text-[10px] font-extrabold text-[#fe569f] bg-[#fe569f]/10 hover:bg-[#fe569f]/20 border border-[#fe569f]/30 px-2.5 py-1.5 rounded transition-all shrink-0 whitespace-nowrap active:scale-95"
                    >
                      Return
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="py-6 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                No active rentals right now.
              </div>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                  <th className="pb-2.5">Customer</th>
                  <th className="pb-2.5">Outfit / Item</th>
                  <th className="pb-2.5 whitespace-nowrap">Return Date</th>
                  <th className="pb-2.5">Status</th>
                  <th className="pb-2.5 text-right whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {activeRentals.slice(0, 5).length > 0 ? (
                  activeRentals.slice(0, 5).map(rental => {
                    const isDue = isToday(parseISO(rental.expectedReturnDate));
                    const isOverdue = isPast(parseISO(rental.expectedReturnDate)) && !isToday(parseISO(rental.expectedReturnDate));
                    const cust = customers.find(c => c.id === rental.customerId)?.name || 'Walk-in Customer';
                    const prod = products.find(p => p.id === rental.productId)?.name || 'Garment Item';

                    return (
                      <tr key={rental.id} className="hover:bg-slate-50/70 transition-colors group">
                        <td className="py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-md bg-[#01a9fb]/10 text-[#01a9fb] flex items-center justify-center font-extrabold text-[10px] shrink-0">
                              {cust.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-bold text-slate-900 truncate max-w-[140px] block">{cust}</span>
                          </div>
                        </td>
                        <td className="py-3 font-semibold text-slate-600 truncate max-w-[160px] whitespace-nowrap">
                          {prod}
                        </td>
                        <td className="py-3 font-bold text-slate-900 whitespace-nowrap">
                          {isDue ? (
                            <span className="text-yellow-700 font-extrabold bg-yellow-100 px-1.5 py-0.5 rounded border border-yellow-300">Today</span>
                          ) : (
                            format(parseISO(rental.expectedReturnDate), 'dd MMM yyyy')
                          )}
                        </td>
                        <td className="py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider ${isOverdue
                            ? 'bg-rose-100 text-rose-700 border border-rose-200'
                            : isDue
                              ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                              : 'bg-[#fe569f]/10 text-[#fe569f] border border-[#fe569f]/30'
                            }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isOverdue ? 'bg-rose-500' : isDue ? 'bg-yellow-500' : 'bg-[#fe569f]'}`}></span>
                            {isOverdue ? 'Overdue' : isDue ? 'Due Today' : 'Active'}
                          </span>
                        </td>
                        <td className="py-3 text-right whitespace-nowrap">
                          <button
                            onClick={() => setIsReturnRentalModalOpen(true)}
                            className="text-[10px] font-bold text-[#fe569f] bg-[#fe569f]/10 hover:bg-[#fe569f]/20 border border-[#fe569f]/30 px-2.5 py-1 rounded transition-all active:scale-95"
                          >
                            Return
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                      No active rentals right now. All items are checked in.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 2. Smart Stock Health Gauge & Recent Activity (5 Cols) */}
      <div className="lg:col-span-5 flex flex-col gap-5">

        {/* Stock Health & Low Alerts */}
        <div className="bg-white p-4 sm:p-5 rounded-md border border-slate-200/80">
          <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-1.5">
              <AlertTriangle size={17} className="text-yellow-600 shrink-0" />
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight whitespace-nowrap">Stock Health & Alerts</h2>
            </div>
            <button
              onClick={() => navigate('inventory')}
              className="text-[11px] sm:text-xs font-bold text-[#01a9fb] hover:underline whitespace-nowrap"
            >
              Inventory ({products.length})
            </button>
          </div>

          {/* Health Meter Progress Bar */}
          <div className="space-y-1 mb-3.5">
            <div className="flex justify-between text-[11px] sm:text-xs font-semibold text-slate-500 whitespace-nowrap">
              <span>Healthy: <strong className="text-[#01a9fb]">{stockStats.goodPcs} pcs</strong> ({stockStats.goodPercent}%)</span>
              <span>Low: <strong className="text-yellow-700">{stockStats.lowPcs} pcs</strong> ({stockStats.lowPercent}%)</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
              <div style={{ width: `${stockStats.goodPercent}%` }} className="bg-[#01a9fb] transition-all duration-500"></div>
              <div style={{ width: `${stockStats.lowPercent}%` }} className="bg-[#FACC15] transition-all duration-500"></div>
              <div style={{ width: `${stockStats.outOfStockSKUs > 0 ? 5 : 0}%` }} className="bg-rose-500 transition-all duration-500"></div>
            </div>
          </div>

          {/* Alerts List */}
          {outOfStockProducts.length === 0 && lowStockProducts.length === 0 ? (
            <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-md border border-emerald-200 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
              <span className="truncate">All SKUs have adequate stock levels!</span>
            </div>
          ) : (
            <div className="space-y-1.5">
              {outOfStockProducts.slice(0, 2).map(p => (
                <div key={p.id} className="flex items-center justify-between p-2 bg-rose-50/70 border border-rose-200/80 rounded-md text-xs gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-extrabold text-rose-950 truncate leading-tight">{p.name}</p>
                    <p className="text-[10px] text-rose-700 font-semibold truncate">Sizes: {p.sizes?.join(', ') || 'Standard'}</p>
                  </div>
                  <button
                    onClick={() => setIsStockModalOpen(true)}
                    className="shrink-0 text-[10px] font-extrabold bg-rose-600 text-white hover:bg-rose-700 px-2 py-1 rounded transition-all whitespace-nowrap active:scale-95"
                  >
                    + Restock
                  </button>
                </div>
              ))}

              {lowStockProducts.slice(0, 2).map(p => (
                <div key={p.id} className="flex items-center justify-between p-2 bg-yellow-50/80 border border-yellow-200 rounded-md text-xs gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-extrabold text-yellow-950 truncate leading-tight">{p.name}</p>
                    <p className="text-[10px] text-yellow-800 font-semibold truncate">{((p.saleStock || 0) + (p.rentalStock || 0))} left (Alert at {p.minStockAlert || 3})</p>
                  </div>
                  <button
                    onClick={() => setIsStockModalOpen(true)}
                    className="shrink-0 text-[10px] font-extrabold bg-[#FACC15] text-slate-900 hover:bg-[#EAB308] px-2 py-1 rounded transition-all whitespace-nowrap active:scale-95"
                  >
                    + Stock
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Real-time Activity Timeline */}
        <div className="bg-white p-5 rounded-md border border-slate-200/80 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Activity size={18} className="text-[#01a9fb]" />
                <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Recent Activity Feed</h2>
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live Sync</span>
            </div>

            <div className="space-y-3">
              {recentActivities.length > 0 ? (
                recentActivities.map((act) => (
                  <div key={act.id} className="flex items-start gap-3 group">
                    <div className={`p-2 rounded-md border shrink-0 ${act.color}`}>
                      {act.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-extrabold text-slate-900 truncate">{act.type}</p>
                        <span className="text-[10px] font-bold text-slate-400 shrink-0 ml-2">
                          {getRelativeTime(act.time)}
                        </span>
                      </div>
                      <p className="text-[11px] font-semibold text-slate-500 truncate mt-0.5">{act.details}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest text-center py-4">No recent activity logged.</p>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* ── High Sales Days & Festive Intelligence Explorer ── */}
      <div className="bg-white rounded-md border border-slate-200/80 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5">
                <TrendingUp size={18} className="text-[#01a9fb] shrink-0" />
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight whitespace-nowrap">High Sales & Festive Correlator</h2>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 font-medium mt-0.5 hidden sm:block">
                Historical revenue peaks matching major Indian festivals & shopping rush dates
              </p>
            </div>

            {/* Threshold Filter Bar */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">Min:</span>
                <div className="flex items-center bg-white border border-slate-200 rounded-md overflow-hidden">
                  <span className="px-1.5 py-0.5 text-[11px] font-bold text-slate-500 border-r border-slate-200 bg-slate-100">₹</span>
                  <input
                    type="number"
                    value={salesThresholdInput}
                    onChange={(e) => setSalesThresholdInput(e.target.value)}
                    onBlur={() => {
                      const val = parseInt(salesThresholdInput);
                      if (!isNaN(val) && val >= 0) setSalesThreshold(val);
                      else setSalesThresholdInput(String(salesThreshold));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = parseInt(salesThresholdInput);
                        if (!isNaN(val) && val >= 0) setSalesThreshold(val);
                        else setSalesThresholdInput(String(salesThreshold));
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    className="w-16 px-1.5 py-0.5 text-[11px] font-extrabold text-slate-900 bg-transparent outline-none"
                    placeholder="5000"
                  />
                </div>
              </div>

              <div className="flex gap-1 overflow-x-auto hide-scrollbar shrink-0 py-0.5">
                {[1000, 5000, 10000, 25000, 50000].map(amt => (
                  <button
                    key={amt}
                    onClick={() => { setSalesThreshold(amt); setSalesThresholdInput(String(amt)); }}
                    className={`px-2 py-0.5 rounded text-[10px] font-extrabold transition-all whitespace-nowrap shrink-0 ${salesThreshold === amt
                      ? 'bg-[#01a9fb] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200/60'
                      }`}
                  >
                    {amt >= 1000 ? `₹${amt / 1000}k` : `₹${amt}`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Summary Metric Strip */}
          {highSalesDays.length > 0 && (
            <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-slate-100 text-[11px] sm:text-xs flex-wrap">
              <span className="font-extrabold text-[#01a9fb] bg-[#01a9fb]/10 px-2 py-0.2 rounded border border-[#01a9fb]/30 whitespace-nowrap">
                {highSalesDays.length} {highSalesDays.length === 1 ? 'Peak Day' : 'Peak Days'}
              </span>
              <span className="text-slate-600 font-semibold whitespace-nowrap">
                Peak Total: <strong className="text-slate-900">{formatMoney(highSalesDays.reduce((s, d) => s + d.total, 0))}</strong>
              </span>
              <span className="hidden sm:inline text-slate-400">• Avg: {formatMoney(Math.round(highSalesDays.reduce((s, d) => s + d.total, 0) / highSalesDays.length))}</span>
            </div>
          )}
        </div>

        {/* Content Display */}
        {highSalesDays.length === 0 ? (
          <div className="p-8 flex flex-col items-center justify-center text-center">
            <div className="w-9 h-9 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-center mb-2">
              <TrendingUp size={18} className="text-slate-400" />
            </div>
            <p className="text-xs font-extrabold text-slate-700">No dates recorded above {formatMoney(salesThreshold)}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Lower the threshold or log new sales to discover top shopping patterns</p>
          </div>
        ) : (
          <div>
            {/* Mobile List View */}
            <div className="sm:hidden divide-y divide-slate-100 p-2.5 space-y-1.5">
              {highSalesDays.map((d) => (
                <div key={d.dateStr} className="bg-slate-50/70 border border-slate-200/80 rounded-md p-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-bold text-slate-600 bg-white px-1.5 py-0.2 rounded border border-slate-200/60 uppercase">{d.weekday}</span>
                      <span className="text-xs font-extrabold text-slate-900 truncate">{d.date} {d.year}</span>
                    </div>
                    {d.festive && (
                      <div className="mt-1">
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-[#fe569f] bg-[#fe569f]/10 px-1.5 py-0.2 rounded border border-[#fe569f]/30">
                          {d.festive}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-extrabold text-[#01a9fb]">{formatMoney(d.total)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                    <th className="px-5 py-2.5 w-24">Weekday</th>
                    <th className="px-4 py-2.5">Calendar Date</th>
                    <th className="px-4 py-2.5">Month</th>
                    <th className="px-4 py-2.5">Festive Season Correlator</th>
                    <th className="px-5 py-2.5 text-right">Total Net Sales</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {highSalesDays.map((d) => (
                    <tr key={d.dateStr} className="hover:bg-[#01a9fb]/5 transition-colors group">
                      <td className="px-5 py-3">
                        <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60">
                          {d.weekday}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-extrabold text-slate-900">{d.date}</span>
                        <span className="text-[11px] text-slate-400 ml-1">{d.year}</span>
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-700">
                        {d.month}
                      </td>
                      <td className="px-4 py-3">
                        {d.festive ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#fe569f] bg-[#fe569f]/10 px-2 py-0.5 rounded-md border border-[#fe569f]/30">
                            {d.festive}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-300 font-medium">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className="text-sm font-extrabold text-[#01a9fb]">{formatMoney(d.total)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
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
