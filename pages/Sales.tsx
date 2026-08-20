import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../store/AppContext';
import { Card, Button } from '../components/Shared';
import { CreateBillModal } from '../components/forms/CreateBillModal';
import {
  Plus,
  Search,
  ShoppingBag,
  ArrowUpRight,
  Filter,
  IndianRupee,
  Package,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Calendar,
  FileText,
  AlertCircle,
  ChevronDown,
  Hash,
  CreditCard,
  Tag,
  X,
  Minus,
  Trash2,
  Globe,
  Store,
  Printer,
  MessageCircle,
  Undo2,
  LayoutGrid,
  List,
  Download,
  Info,
  Edit2,
  Phone,
  CheckCircle2,
  Sparkles,
  Receipt
} from 'lucide-react';
import { formatCurrency } from '../utils/helpers';
import { format, parseISO, isAfter, isBefore, isSameDay, subDays, startOfMonth, startOfYear } from 'date-fns';
import { SalesChannel, PaymentMethod, PaymentStatus, OrderStatus } from '../types';
import {
  exportSalesToFormattedExcel,
  exportSalesToCSV,
  filterSalesByTimeframe,
  DatePresetTimeframe
} from '../utils/salesExport';

import { ProductDetailsModal } from '../components/forms/ProductDetailsModal';

const Sales: React.FC = () => {
  const { sales, products, customers, settings, updateOrderStatus, deleteSale } = useApp();
  const [isAddingSale, setIsAddingSale] = useState(false);
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportFormat, setExportFormat] = useState<'excel' | 'csv'>('excel');
  const [viewingProduct, setViewingProduct] = useState<any | null>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const filterMenuRef = useRef<HTMLDivElement>(null);

  const [activeDatePreset, setActiveDatePreset] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'YEAR'>('ALL');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterStatus, setFilterStatus] = useState<OrderStatus | 'ALL'>('ALL');
  const [filterChannel, setFilterChannel] = useState<SalesChannel | 'ALL'>('ALL');
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);

  // Close export & filter dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
        setShowFilters(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Quick Date Preset
  const applyDatePreset = (preset: 'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'YEAR') => {
    setActiveDatePreset(preset);
    const now = new Date();
    const todayStr = format(now, 'yyyy-MM-dd');

    if (preset === 'TODAY') {
      setFilterStartDate(todayStr);
      setFilterEndDate(todayStr);
    } else if (preset === 'WEEK') {
      setFilterStartDate(format(subDays(now, 6), 'yyyy-MM-dd'));
      setFilterEndDate(todayStr);
    } else if (preset === 'MONTH') {
      setFilterStartDate(format(startOfMonth(now), 'yyyy-MM-dd'));
      setFilterEndDate(todayStr);
    } else if (preset === 'YEAR') {
      setFilterStartDate(format(startOfYear(now), 'yyyy-MM-dd'));
      setFilterEndDate(todayStr);
    } else if (preset === 'ALL') {
      setFilterStartDate('');
      setFilterEndDate('');
    }
  };

  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      const customer = customers.find(c => c.id === s.customerId);
      const searchStr = historySearchTerm.toLowerCase();

      const matchesSearch =
        (s.invoiceNumber || '').toLowerCase().includes(searchStr) ||
        ((customer?.name || 'Guest')).toLowerCase().includes(searchStr) ||
        ((s.channel || '')).toLowerCase().includes(searchStr);

      const saleDate = parseISO(s.date);
      const matchesStartDate = filterStartDate ? isAfter(saleDate, parseISO(filterStartDate)) || isSameDay(saleDate, parseISO(filterStartDate)) : true;
      const matchesEndDate = filterEndDate ? isBefore(saleDate, parseISO(filterEndDate)) || isSameDay(saleDate, parseISO(filterEndDate)) : true;
      const matchesStatus = filterStatus === 'ALL' || s.orderStatus === filterStatus;
      const matchesChannel = filterChannel === 'ALL' || s.channel === filterChannel;

      return matchesSearch && matchesStartDate && matchesEndDate && matchesStatus && matchesChannel;
    });
  }, [sales, historySearchTerm, customers, filterStartDate, filterEndDate, filterStatus, filterChannel]);

  // KPIs
  const todaySales = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return sales
      .filter(s => s.date && s.date.split('T')[0] === today)
      .reduce((acc, s) => acc + (s.totalAmount || 0), 0);
  }, [sales]);

  const activeOrders = sales.filter(s => s.orderStatus !== OrderStatus.COMPLETED && s.orderStatus !== OrderStatus.CANCELLED).length;
  const totalPendingPayments = sales.filter(s => s.paymentStatus !== PaymentStatus.PAID && s.paymentStatus !== PaymentStatus.REFUNDED).reduce((acc, s) => acc + ((s.totalAmount || 0) - (s.paidAmount || 0)), 0);

  const handleExportTimeframe = (timeframe: DatePresetTimeframe, formatType: 'excel' | 'csv' = exportFormat) => {
    let targetList = filteredSales;
    let label = 'Sales Report';

    if (timeframe !== 'custom') {
      const result = filterSalesByTimeframe(sales, timeframe);
      targetList = result.filtered;
      label = result.label;
    } else {
      label = `Sales Report (${targetList.length} Transactions)`;
    }

    const store = settings?.storeName || 'Kiddies - Premium Kids Wear';

    if (formatType === 'excel') {
      exportSalesToFormattedExcel(targetList, customers, store, label);
    } else {
      exportSalesToCSV(targetList, customers, label);
    }
  };

  return (
    <div className="space-y-5 animate-nano pb-24 max-w-[1600px] mx-auto">
      {/* ── Executive Header ── */}
      <div className="bg-white border border-slate-200/80 rounded-md p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-[#01a9fb] text-white flex items-center justify-center shadow-xs shrink-0">
            <ShoppingBag size={18} strokeWidth={2.2} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">Sales & Billing Terminal</h1>
              <span className="text-[10px] font-extrabold text-[#01a9fb] bg-[#01a9fb]/10 border border-[#01a9fb]/30 px-2 py-0.5 rounded-md">
                {sales.length} Invoices
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Point-of-sale checkout, customer invoices, returns, and payment tracking</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Export Dropdown */}
          <div className="relative" ref={exportMenuRef}>
            <div className="flex items-center bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md overflow-hidden shadow-xs">
              <button
                onClick={() => handleExportTimeframe(activeDatePreset === 'ALL' ? 'all' : (activeDatePreset.toLowerCase() as DatePresetTimeframe), exportFormat)}
                className="px-3 py-2 text-slate-700 font-bold text-xs flex items-center gap-1.5 border-r border-slate-200 transition-colors"
              >
                <Download size={14} className="text-[#01a9fb]" />
                <span>Export {exportFormat.toUpperCase()}</span>
              </button>
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="px-2 py-2 text-slate-500 hover:text-slate-900 transition-colors"
              >
                <ChevronDown size={14} className={`transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-xl border border-slate-200 p-2.5 z-50 animate-nano space-y-2">
                <div className="text-[9px] font-extrabold uppercase text-slate-400 px-1">File Format</div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => setExportFormat('excel')}
                    className={`py-1.5 rounded-md text-center text-xs font-bold transition-all border ${exportFormat === 'excel'
                      ? 'bg-[#01a9fb] text-white border-[#01a9fb] shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                  >
                    Excel (.xlsx)
                  </button>
                  <button
                    onClick={() => setExportFormat('csv')}
                    className={`py-1.5 rounded-md text-center text-xs font-bold transition-all border ${exportFormat === 'csv'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                  >
                    CSV (Raw)
                  </button>
                </div>

                <div className="text-[9px] font-extrabold uppercase text-slate-400 px-1 pt-1 border-t border-slate-100">Time Range</div>
                <div className="space-y-0.5">
                  {[
                    { id: 'today', title: 'Today' },
                    { id: 'week', title: 'Last 7 Days' },
                    { id: 'month', title: 'Last 30 Days' },
                    { id: 'year', title: 'This Year' },
                    { id: 'all', title: 'All Time Records' },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => {
                        handleExportTimeframe(opt.id as DatePresetTimeframe, exportFormat);
                        setShowExportMenu(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-[#01a9fb]/10 hover:text-[#01a9fb] text-slate-700 font-bold text-xs transition-colors flex items-center justify-between"
                    >
                      <span>{opt.title}</span>
                      <span className="text-[10px] text-slate-400 font-mono">↓</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsAddingSale(true)}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#01a9fb] hover:bg-[#0098e6] text-white text-xs font-extrabold uppercase tracking-wider rounded-md shadow-xs transition-all active:scale-95"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>+ Create Bill</span>
          </button>
        </div>
      </div>

      {/* ── KPI Metric Cards (4 Cards) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3.5">
        <div className="bg-white hover:bg-slate-50/60 p-3 sm:p-4 rounded-md border border-slate-200/80 hover:border-[#01a9fb]/50 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">Today's Sales</span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-[#01a9fb]/10 text-[#01a9fb] flex items-center justify-center font-bold text-xs shrink-0">
              <IndianRupee size={13} />
            </div>
          </div>
          <h3 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight leading-none font-mono whitespace-nowrap truncate">
            {formatCurrency(todaySales)}
          </h3>
          <p className="text-[10px] sm:text-[11px] font-bold text-[#01a9fb] mt-1.5 whitespace-nowrap truncate">Gross revenue today</p>
        </div>

        <div className="bg-white hover:bg-slate-50/60 p-3 sm:p-4 rounded-md border border-slate-200/80 hover:border-[#fe569f]/50 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">Total Invoices</span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-[#fe569f]/10 text-[#fe569f] flex items-center justify-center font-bold text-xs shrink-0">
              <Receipt size={13} />
            </div>
          </div>
          <h3 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight leading-none font-mono whitespace-nowrap truncate">
            {sales.length}
          </h3>
          <p className="text-[10px] sm:text-[11px] font-bold text-[#fe569f] mt-1.5 whitespace-nowrap truncate">Store checkout volume</p>
        </div>

        <div className="bg-white hover:bg-slate-50/60 p-3 sm:p-4 rounded-md border border-slate-200/80 hover:border-yellow-300 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">Processing</span>
            <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-md flex items-center justify-center font-bold text-xs shrink-0 ${activeOrders > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-slate-50 text-slate-400'}`}>
              <Clock size={13} />
            </div>
          </div>
          <h3 className={`text-lg sm:text-2xl font-black tracking-tight leading-none font-mono whitespace-nowrap truncate ${activeOrders > 0 ? 'text-yellow-700' : 'text-slate-900'}`}>
            {activeOrders}
          </h3>
          <p className="text-[10px] sm:text-[11px] font-bold text-yellow-700 mt-1.5 whitespace-nowrap truncate">Fulfillments underway</p>
        </div>

        <div className="bg-white hover:bg-slate-50/60 p-3 sm:p-4 rounded-md border border-slate-200/80 hover:border-rose-300 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">Pending Dues</span>
            <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-md flex items-center justify-center font-bold text-xs shrink-0 ${totalPendingPayments > 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-400'}`}>
              <CreditCard size={13} />
            </div>
          </div>
          <h3 className={`text-lg sm:text-2xl font-black tracking-tight leading-none font-mono whitespace-nowrap truncate ${totalPendingPayments > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
            {formatCurrency(totalPendingPayments)}
          </h3>
          <p className="text-[10px] sm:text-[11px] font-bold text-rose-600 mt-1.5 whitespace-nowrap truncate">Uncollected receivables</p>
        </div>
      </div>

      {/* ── Toolbar: Quick Date Pills + Search + View Switcher + Filter Toggle ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Date Segmented Pills */}
        <div className="inline-flex bg-slate-100 p-1 rounded-md border border-slate-200/70 shrink-0 overflow-x-auto">
          {[
            { id: 'ALL', label: 'All Time' },
            { id: 'TODAY', label: 'Today' },
            { id: 'WEEK', label: '7 Days' },
            { id: 'MONTH', label: '30 Days' },
            { id: 'YEAR', label: '1 Year' },
          ].map(p => (
            <button
              key={p.id}
              onClick={() => applyDatePreset(p.id as any)}
              className={`px-3 py-1 text-xs font-extrabold rounded whitespace-nowrap transition-all ${activeDatePreset === p.id
                ? 'bg-[#01a9fb] text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
                }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-2 flex-1 md:justify-end">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Search invoice #, customer name, channel..."
              className="w-full bg-white border border-slate-200/80 rounded-md py-2 pl-9 pr-7 text-xs font-bold text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#01a9fb] shadow-xs"
              value={historySearchTerm}
              onChange={(e) => setHistorySearchTerm(e.target.value)}
            />
            {historySearchTerm && (
              <button onClick={() => setHistorySearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={13} />
              </button>
            )}
          </div>

          {/* View Switcher */}
          <div className="flex items-center p-1 bg-white border border-slate-200/80 rounded-md shadow-xs shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded transition-all ${viewMode === 'grid' ? 'bg-[#01a9fb] text-white shadow-xs' : 'text-slate-400 hover:text-slate-700'}`}
              title="Grid Cards View"
            >
              <LayoutGrid size={14} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded transition-all ${viewMode === 'list' ? 'bg-[#01a9fb] text-white shadow-xs' : 'text-slate-400 hover:text-slate-700'}`}
              title="Table List View"
            >
              <List size={14} />
            </button>
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2 rounded-md border transition-all flex items-center gap-1.5 text-xs font-bold shrink-0 ${showFilters ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200/80 hover:bg-slate-50'
              }`}
          >
            <Filter size={13} />
            <span>Filters</span>
          </button>
        </div>
      </div>

      {/* ── Filters Panel ── */}
      {showFilters && (
        <div ref={filterMenuRef} className="bg-white border border-slate-200/80 rounded-lg p-4 shadow-xs space-y-3 animate-nano">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">From Date</label>
              <input
                type="date"
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-md px-3 py-1.5 text-xs font-bold text-slate-900 outline-none"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">To Date</label>
              <input
                type="date"
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-md px-3 py-1.5 text-xs font-bold text-slate-900 outline-none"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Order Status</label>
              <select
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-md px-3 py-1.5 text-xs font-bold text-slate-900 outline-none"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as OrderStatus | 'ALL')}
              >
                <option value="ALL">All Statuses</option>
                {Object.values(OrderStatus).map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Sales Channel</label>
              <select
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-md px-3 py-1.5 text-xs font-bold text-slate-900 outline-none"
                value={filterChannel}
                onChange={(e) => setFilterChannel(e.target.value as SalesChannel | 'ALL')}
              >
                <option value="ALL">All Channels</option>
                {Object.values(SalesChannel).map(channel => (
                  <option key={channel} value={channel}>{channel}</option>
                ))}
              </select>
            </div>
          </div>

          {(filterStartDate || filterEndDate || filterStatus !== 'ALL' || filterChannel !== 'ALL' || historySearchTerm) && (
            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  setFilterStartDate('');
                  setFilterEndDate('');
                  setFilterStatus('ALL');
                  setFilterChannel('ALL');
                  setHistorySearchTerm('');
                  setActiveDatePreset('ALL');
                }}
                className="px-3 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-md transition-colors flex items-center gap-1"
              >
                <XCircle size={13} /> Reset All Filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Content View: Table List vs Grid Cards ── */}
      {viewMode === 'list' ? (
        <div className="bg-white rounded-lg border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                  <th className="px-5 py-3.5">Invoice #</th>
                  <th className="px-4 py-3.5">Customer</th>
                  <th className="px-4 py-3.5">Date</th>
                  <th className="px-4 py-3.5">Items Summary</th>
                  <th className="px-4 py-3.5 text-center">Channel</th>
                  <th className="px-4 py-3.5 text-center">Payment Status</th>
                  <th className="px-4 py-3.5 text-right">Total Amount</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredSales.map(sale => {
                  const customer = customers.find(c => c.id === sale.customerId);
                  const dueAmount = Math.max(0, (sale.totalAmount || 0) - (sale.paidAmount || 0));
                  const channelIcon = (() => {
                    switch (sale.channel) {
                      case SalesChannel.AMAZON: return <Globe size={11} className="text-amber-500" />;
                      case SalesChannel.FLIPKART: return <Globe size={11} className="text-blue-500" />;
                      case SalesChannel.WEBSITE: return <Globe size={11} className="text-emerald-500" />;
                      default: return <Store size={11} className="text-violet-500" />;
                    }
                  })();

                  return (
                    <tr
                      key={sale.id}
                      onClick={() => setSelectedSaleId(sale.id)}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                    >
                      <td className="px-5 py-3.5 font-mono font-extrabold text-violet-600">
                        {sale.invoiceNumber}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-extrabold text-slate-900 group-hover:text-violet-600 transition-colors">
                          {customer?.name || 'Walk-in Customer'}
                        </p>
                        {customer?.phone && (
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                            <Phone size={9} /> {customer.phone}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-400">
                        {format(parseISO(sale.date), 'dd MMM yyyy, HH:mm')}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {(sale.items || []).slice(0, 2).map((item, i) => {
                            const matchedProd = products.find(p => p.id === item.productId || p.sku === item.sku || p.name.toLowerCase() === item.name.toLowerCase());
                            const effectiveProduct = matchedProd || {
                              id: item.productId || `item-${i}`,
                              name: item.name || 'Sold Item',
                              sku: item.sku || 'N/A',
                              barcode: '',
                              category: 'Sale Item',
                              gender: 'Universal',
                              subCategory: 'General',
                              clothingType: 'Standard',
                              brand: 'Store',
                              purpose: 'SALE' as const,
                              purchasePrice: 0,
                              sellingPrice: item.unitPrice || 0,
                              rentalPrice: 0,
                              taxPercent: 0,
                              stockQuantity: 0,
                              saleStock: 0,
                              rentalStock: 0,
                              minStockAlert: 0,
                              supplierId: '',
                              description: '',
                              sizes: item.size ? [item.size] : [],
                              images: []
                            };

                            return (
                              <button
                                key={i}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setViewingProduct(effectiveProduct);
                                }}
                                className="text-[10px] font-bold px-2 py-0.5 rounded text-left transition-colors flex items-center gap-1 text-slate-800 bg-slate-100 hover:bg-[#01a9fb]/15 hover:text-[#01a9fb] cursor-pointer"
                                title={`Click to view ${item.name}`}
                              >
                                <Package size={10} className="text-slate-400" />
                                <span>{item.quantity}x {item.name}</span>
                              </button>
                            );
                          })}
                          {(sale.items || []).length > 2 && (
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">
                              +{(sale.items || []).length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md text-[10px] font-bold text-slate-600">
                          {channelIcon}
                          <span>{sale.channel || 'IN_STORE'}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className={`inline-block text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-md border ${sale.paymentStatus === PaymentStatus.PAID ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            sale.paymentStatus === PaymentStatus.PARTIAL ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              sale.paymentStatus === PaymentStatus.REFUNDED ? 'bg-slate-50 text-slate-500 border-slate-200' :
                                'bg-rose-50 text-rose-700 border-rose-200'
                            }`}>
                            {sale.paymentStatus}
                          </span>
                          {dueAmount > 0 && (
                            <span className="text-[10px] font-bold text-rose-600 font-mono">
                              Due: {formatCurrency(dueAmount)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-extrabold text-slate-900">
                        {formatCurrency(sale.totalAmount)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {settings?.enableDeleteTransactions && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(`Delete sale invoice ${sale.invoiceNumber}?`)) {
                                deleteSale(sale.id);
                              }
                            }}
                            className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title="Delete Invoice Record"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Grid Cards View: 2 columns on mobile, 3 on tablet/laptop, 4 on desktop */
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3.5">
          {filteredSales.map(sale => {
            const customer = customers.find(c => c.id === sale.customerId);
            const dueAmount = Math.max(0, (sale.totalAmount || 0) - (sale.paidAmount || 0));
            const channelIcon = (() => {
              switch (sale.channel) {
                case SalesChannel.AMAZON: return <Globe size={11} className="text-amber-500" />;
                case SalesChannel.FLIPKART: return <Globe size={11} className="text-[#01a9fb]" />;
                case SalesChannel.WEBSITE: return <Globe size={11} className="text-emerald-500" />;
                default: return <Store size={11} className="text-[#01a9fb]" />;
              }
            })();

            return (
              <div
                key={sale.id}
                onClick={() => setSelectedSaleId(sale.id)}
                className="bg-white rounded-md border border-slate-200/90 p-2.5 sm:p-3.5 hover:border-[#01a9fb]/60 transition-all duration-200 cursor-pointer flex flex-col justify-between group active:scale-[0.98]"
              >
                <div>
                  {/* Top Header: Customer Initial & Total */}
                  <div className="flex items-start justify-between gap-1.5 mb-2">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-[#01a9fb]/10 text-[#01a9fb] group-hover:bg-[#01a9fb] group-hover:text-white transition-colors flex items-center justify-center font-extrabold text-xs shrink-0">
                        {(customer?.name || 'W').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-black text-xs text-slate-900 truncate leading-tight group-hover:text-[#01a9fb] transition-colors">
                          {customer?.name || 'Walk-in'}
                        </h4>
                        <p className="text-[9px] sm:text-[10px] text-slate-400 font-mono truncate leading-none mt-0.5">{sale.invoiceNumber}</p>
                      </div>
                    </div>
                  </div>

                  {/* Price & Date Strip */}
                  <div className="flex items-baseline justify-between gap-1 mb-2 bg-slate-50/80 px-2 py-1 rounded border border-slate-100">
                    <span className="text-xs sm:text-sm font-black text-slate-900 font-mono">
                      {formatCurrency(sale.totalAmount)}
                    </span>
                    <span className="text-[9px] font-semibold text-slate-400 whitespace-nowrap">
                      {format(parseISO(sale.date), 'dd MMM')}
                    </span>
                  </div>

                  {/* Items summary pills (Clickable to inspect product) */}
                  <div className="flex flex-wrap gap-1 my-1.5">
                    {(sale.items || []).slice(0, 1).map((item, i) => {
                      const matchedProd = products.find(p => p.id === item.productId || p.sku === item.sku || p.name.toLowerCase() === item.name.toLowerCase());
                      const effectiveProduct = matchedProd || {
                        id: item.productId || `item-${i}`,
                        name: item.name || 'Sold Item',
                        sku: item.sku || 'N/A',
                        barcode: '',
                        category: 'Sale Item',
                        gender: 'Universal',
                        subCategory: 'General',
                        clothingType: 'Standard',
                        brand: 'Store',
                        purpose: 'SALE' as const,
                        purchasePrice: 0,
                        sellingPrice: item.unitPrice || 0,
                        rentalPrice: 0,
                        taxPercent: 0,
                        stockQuantity: 0,
                        saleStock: 0,
                        rentalStock: 0,
                        minStockAlert: 0,
                        supplierId: '',
                        description: '',
                        sizes: item.size ? [item.size] : [],
                        images: []
                      };

                      return (
                        <span
                          key={i}
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingProduct(effectiveProduct);
                          }}
                          className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded truncate max-w-full flex items-center gap-1 transition-colors text-slate-800 bg-slate-100 hover:bg-[#01a9fb]/15 hover:text-[#01a9fb] cursor-pointer"
                          title={`Click to view product ${item.name}`}
                        >
                          <Package size={10} className="shrink-0 text-slate-400" />
                          <span className="truncate">{item.quantity}x {item.name}</span>
                        </span>
                      );
                    })}
                    {(sale.items || []).length > 1 && (
                      <span className="text-[9px] font-extrabold text-slate-400 bg-slate-100 px-1 py-0.5 rounded">
                        +{(sale.items || []).length - 1} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Footer */}
                <div className="flex items-center justify-between pt-2 mt-1.5 border-t border-slate-100 gap-1">
                  <div className="flex items-center gap-1 bg-slate-50 border border-slate-200/70 px-1.5 py-0.5 rounded text-[9px] font-bold text-slate-600 truncate">
                    {channelIcon}
                    <span className="truncate">{sale.channel === SalesChannel.IN_STORE ? 'Store' : (sale.channel || 'Store')}</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded border whitespace-nowrap ${sale.paymentStatus === PaymentStatus.PAID
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : sale.paymentStatus === PaymentStatus.PARTIAL
                      ? 'bg-yellow-50 text-yellow-800 border-yellow-300'
                      : sale.paymentStatus === PaymentStatus.REFUNDED
                      ? 'bg-slate-50 text-slate-500 border-slate-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {sale.paymentStatus === PaymentStatus.PAID ? 'PAID' : (dueAmount > 0 ? `DUE ₹${dueAmount}` : sale.paymentStatus)}
                    </span>

                    {settings?.enableDeleteTransactions && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Delete sale invoice ${sale.invoiceNumber}?`)) {
                            deleteSale(sale.id);
                          }
                        }}
                        className="p-1 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                        title="Delete Invoice"
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
      )}

      {filteredSales.length === 0 && (
        <div className="py-16 text-center bg-white rounded-lg border border-slate-200/80 p-8 shadow-xs">
          <div className="w-12 h-12 bg-violet-50 text-violet-600 rounded-lg flex items-center justify-center mx-auto mb-3 shadow-xs">
            <ShoppingBag size={22} />
          </div>
          <h3 className="text-sm font-extrabold text-slate-900">No transactions found</h3>
          <p className="text-xs text-slate-400 font-medium mt-0.5">Try refining your search query or reset date filters</p>
        </div>
      )}

      {/* ── Create Bill Modal ── */}
      <CreateBillModal isOpen={isAddingSale} onClose={() => setIsAddingSale(false)} />

      {/* ── Sale Details Modal ── */}
      {selectedSaleId && (
        <SaleDetailsModal
          saleId={selectedSaleId}
          onClose={() => setSelectedSaleId(null)}
        />
      )}

      {/* Product Read-Only Details Modal Triggered from Sales Item */}
      <ProductDetailsModal
        isOpen={!!viewingProduct}
        onClose={() => setViewingProduct(null)}
        product={viewingProduct}
      />

      {/* ── Floating New Sale Action Button ── */}
      {createPortal(
        <div className="fixed bottom-20 md:bottom-8 right-4 md:right-8 z-50 pointer-events-none">
          <button
            onClick={() => setIsAddingSale(true)}
            className="pointer-events-auto bg-slate-900 hover:bg-slate-800 text-white p-3.5 md:px-5 md:py-2.5 rounded-md shadow-lg flex items-center gap-2 transition-all active:scale-95 border border-slate-700"
            title="Create New Bill"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span className="hidden md:inline text-xs font-extrabold uppercase tracking-wider">New Bill</span>
          </button>
        </div>,
        document.body
      )}
    </div>
  );
};

// ── Sub-component for Partial Return / Exchange ──
const ReturnExchangeModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  saleId: string;
  itemIndex: number;
  item: any;
}> = ({ isOpen, onClose, saleId, itemIndex, item }) => {
  const { products, processPartialReturnOrExchange } = useApp();
  const [returnQty, setReturnQty] = useState(1);
  const [isExchange, setIsExchange] = useState(false);
  const [exchangeSearchTerm, setExchangeSearchTerm] = useState('');
  const [exchangeProductId, setExchangeProductId] = useState<string | null>(null);
  const [exchangeQty, setExchangeQty] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setReturnQty(1);
      setIsExchange(false);
      setExchangeSearchTerm('');
      setExchangeProductId(null);
      setExchangeQty(1);
      setIsProcessing(false);
    }
  }, [isOpen]);

  if (!isOpen || !item) return null;

  const maxReturnable = item.quantity - (item.returnedQuantity || 0);
  const selectedExchangeProduct = products.find(p => p.id === exchangeProductId);

  const refundAmount = returnQty * (item.total / item.quantity);
  let newChargeAmount = 0;
  if (isExchange && selectedExchangeProduct) {
    const tax = ((selectedExchangeProduct.sellingPrice || 0) * (selectedExchangeProduct.taxPercent || 0)) / 100;
    newChargeAmount = ((selectedExchangeProduct.sellingPrice || 0) + tax) * exchangeQty;
  }
  const netDifference = newChargeAmount - refundAmount;

  const handleSubmit = async () => {
    if (returnQty < 1 || returnQty > maxReturnable) return alert("Invalid return quantity");
    if (isExchange) {
      if (!exchangeProductId) return alert("Select an item to exchange for");
      if (exchangeQty < 1) return alert("Invalid exchange quantity");
      if (selectedExchangeProduct && (selectedExchangeProduct.saleStock || 0) < exchangeQty) return alert("Not enough stock for exchange item");
    }

    setIsProcessing(true);
    try {
      await processPartialReturnOrExchange(
        saleId,
        itemIndex,
        returnQty,
        isExchange ? exchangeProductId! : undefined,
        isExchange ? exchangeQty : undefined
      );
      onClose();
    } catch (err: any) {
      alert(err.message || "Failed to process return/exchange");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-lg shadow-2xl animate-nano text-left flex flex-col w-full max-w-md max-h-[90vh] overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">Return or Exchange Item</h3>
            <p className="text-xs text-slate-400 font-medium mt-0.5">{item.name}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 bg-white text-slate-400 hover:text-slate-600 rounded-md shadow-xs transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Return Quantity (Max: {maxReturnable})</label>
            <input
              type="number"
              min={1}
              max={maxReturnable}
              value={returnQty}
              onChange={(e) => setReturnQty(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-md p-2.5 text-xs font-extrabold text-slate-900 outline-none"
            />
          </div>

          <div className="flex gap-2 p-1 bg-slate-100 rounded-md">
            <button
              onClick={() => setIsExchange(false)}
              className={`flex-1 py-2 text-xs font-extrabold rounded transition-all ${!isExchange ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Refund / Return
            </button>
            <button
              onClick={() => setIsExchange(true)}
              className={`flex-1 py-2 text-xs font-extrabold rounded transition-all ${isExchange ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Exchange Replacement
            </button>
          </div>

          {isExchange && (
            <div className="space-y-3 p-3.5 border border-slate-200 rounded-md bg-slate-50/70">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Find Replacement SKU</label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by product name or SKU..."
                    value={exchangeSearchTerm}
                    onChange={(e) => {
                      setExchangeSearchTerm(e.target.value);
                      setExchangeProductId(null);
                    }}
                    className="w-full bg-white border border-slate-200 rounded-md pl-9 pr-3 py-2 text-xs font-bold outline-none focus:border-indigo-500"
                  />
                </div>
                {!exchangeProductId && exchangeSearchTerm.length > 1 && (
                  <div className="bg-white border border-slate-200 rounded-md shadow-lg mt-1 max-h-40 overflow-y-auto space-y-1 p-1">
                    {products
                      .filter(p => (p.purpose === 'SALE' || p.purpose === 'HYBRID') && (p.saleStock || 0) > 0)
                      .filter(p => (p.name || '').toLowerCase().includes(exchangeSearchTerm.toLowerCase()) || (p.sku || '').toLowerCase().includes(exchangeSearchTerm.toLowerCase()))
                      .slice(0, 5)
                      .map(p => (
                        <button
                          key={p.id}
                          onClick={() => {
                            setExchangeProductId(p.id);
                            setExchangeSearchTerm(p.name);
                          }}
                          className="w-full text-left p-2 hover:bg-slate-50 rounded flex justify-between items-center text-xs"
                        >
                          <div>
                            <p className="font-extrabold text-slate-900 truncate">{p.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{p.sku} • Stock: {p.saleStock}</p>
                          </div>
                          <span className="font-mono font-extrabold text-violet-600">{formatCurrency(p.sellingPrice)}</span>
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {exchangeProductId && selectedExchangeProduct && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Quantity to Issue</label>
                  <input
                    type="number"
                    min={1}
                    max={selectedExchangeProduct.saleStock}
                    value={exchangeQty}
                    onChange={(e) => setExchangeQty(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-md p-2 text-xs font-bold outline-none"
                  />
                  <p className="text-[10px] text-slate-400 font-semibold">Available Stock: {selectedExchangeProduct.saleStock} pcs</p>
                </div>
              )}
            </div>
          )}

          <div className="p-3.5 bg-slate-900 rounded-md text-white space-y-1.5">
            <div className="flex justify-between text-xs font-bold text-slate-400">
              <span>Return Credit Value:</span>
              <span className="text-white font-mono">{formatCurrency(refundAmount)}</span>
            </div>
            {isExchange && (
              <div className="flex justify-between text-xs font-bold text-slate-400">
                <span>Replacement Item Price:</span>
                <span className="text-white font-mono">{formatCurrency(newChargeAmount)}</span>
              </div>
            )}
            <div className="pt-2 border-t border-slate-700 flex justify-between text-xs font-extrabold uppercase tracking-wider">
              <span>{netDifference > 0 ? 'Customer Pays Due:' : netDifference < 0 ? 'Store Refunds Customer:' : 'Even Exchange:'}</span>
              <span className={`font-mono ${netDifference > 0 ? 'text-amber-400' : netDifference < 0 ? 'text-emerald-400' : 'text-white'}`}>
                {formatCurrency(Math.abs(netDifference))}
              </span>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={isProcessing}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-extrabold uppercase tracking-wider shadow-sm transition-all"
          >
            {isProcessing ? 'Processing...' : 'Confirm Return / Exchange'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Sub-component for Sale Details Modal ──
const SaleDetailsModal: React.FC<{ saleId: string; onClose: () => void }> = ({ saleId, onClose }) => {
  const { sales, customers, products, linkSaleItemToProduct, returnSale, updateOrderStatus, updateSale, addPaymentToSale, storeProfile } = useApp();
  const sale = sales.find(s => s.id === saleId);
  const customer = customers.find(c => c.id === sale?.customerId);
  const [linkingItemId, setLinkingItemId] = useState<string | null>(null);
  const [linkSearchTerm, setLinkSearchTerm] = useState('');
  const [isProcessingReturn, setIsProcessingReturn] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [paymentInput, setPaymentInput] = useState<string>('');
  const [returnModalState, setReturnModalState] = useState<{ isOpen: boolean; itemIndex: number; item: any }>({ isOpen: false, itemIndex: -1, item: null });
  const [viewingProduct, setViewingProduct] = useState<any | null>(null);

  if (!sale) return null;

  const handleWhatsAppShare = () => {
    let text = `*Kiddies – Kids Wear & Baby Clothing Store*\n`;
    text += `Receipt: ${sale.invoiceNumber}\n`;
    text += `Date: ${format(parseISO(sale.date), 'dd MMM yyyy')}\n\n`;
    text += `*Items:*\n`;
    (sale.items || []).forEach(item => {
      text += `- ${item.name} x${item.quantity} = ${formatCurrency(item.total)}\n`;
    });
    text += `\n*Total: ${formatCurrency(sale.totalAmount)}*\n`;
    if (sale.discount > 0) text += `Discount: -${formatCurrency(sale.discount)}\n`;
    text += `\nThank you for shopping with us!`;

    const encodedText = encodeURIComponent(text);
    const url = customer?.phone
      ? `https://wa.me/91${customer.phone}?text=${encodedText}`
      : `https://wa.me/?text=${encodedText}`;

    window.open(url, '_blank');
  };

  const handlePrintReceipt = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let itemsHtml = '';
    let textReceipt = `Kiddies - Kids Wear\nSHOP NO. 203, 204 C-30\nPh: 097134 69928\n------------------------\nInv: ${sale.invoiceNumber}\nDate: ${format(parseISO(sale.date), 'dd MMM yyyy, hh:mm a')}\nCustomer: ${customer?.name || 'Walk-in'}\n------------------------\n`;

    (sale.items || []).forEach(item => {
      itemsHtml += `
        <tr>
          <td style="padding: 4px 0; border-bottom: 1px dashed #ccc;">${item.name} <br/> <small style="font-size: 14px; color: #555;">${item.quantity} x ${item.unitPrice}</small></td>
          <td style="padding: 4px 0; border-bottom: 1px dashed #ccc; text-align: right;">${item.total.toFixed(2)}</td>
        </tr>
      `;
      textReceipt += `${item.name}\n${item.quantity} x ${item.unitPrice} = ${item.total.toFixed(2)}\n`;
    });

    textReceipt += `------------------------\nSubtotal: ${(sale.totalAmount || 0).toFixed(2)}\n`;
    if ((sale.discount || 0) > 0) textReceipt += `Discount: -${(sale.discount || 0).toFixed(2)}\n`;
    textReceipt += `Total: Rs ${((sale.netPayout ?? sale.totalAmount ?? 0)).toFixed(2)}\n------------------------\nThank you for your visit!\n`;

    const escapedTextReceipt = textReceipt.replace(/\n/g, '\\n').replace(/'/g, "\\'");

    const html = `
      <html>
        <head>
          <title>Receipt ${sale.invoiceNumber || 'Invoice'}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <style>
            body { font-family: 'Courier New', Courier, monospace; margin: 0; padding: 0; background: #f1f5f9; color: #000; }
            .receipt-container { width: 384px; margin: 20px auto; padding: 10px; background: #fff; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); border-radius: 8px; box-sizing: border-box; }
            h2 { text-align: center; margin: 0 0 12px 0; font-size: 24px; line-height: 1.2; }
            p { text-align: center; margin: 0 0 12px 0; font-size: 16px; line-height: 1.2; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 16px; }
            td { vertical-align: top; }
            .total-row { font-weight: bold; font-size: 20px; }
            .toolbar { display: flex; gap: 10px; justify-content: center; padding: 15px; background: #fff; border-bottom: 1px solid #e2e8f0; position: sticky; top: 0; z-index: 100; }
            .btn { flex: 1; max-width: 150px; padding: 10px 15px; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; font-family: system-ui, sans-serif; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 6px; }
            .btn-print { background: #7C3AED; color: white; }
            @media print {
              .no-print { display: none !important; }
              body { background: #fff; }
              .receipt-container { box-shadow: none; margin: 0; padding: 0; width: 58mm; }
            }
          </style>
        </head>
        <body>
          <div class="toolbar no-print">
            <button class="btn btn-print" onclick="window.print()">🖨️ Print Receipt</button>
          </div>
          <div class="receipt-container">
            <h2>Kiddies – Kids Wear & Baby Clothing</h2>
            <p>SHOP NO. 203, 204 C-30, next to HDFC Bank<br/>Ph: 097134 69928</p>
            <hr style="border: 1px dashed #000;" />
            <p><strong>Inv: ${sale.invoiceNumber || 'N/A'}</strong><br/>${sale.date ? format(parseISO(sale.date), 'dd MMM yyyy, hh:mm a') : 'N/A'}</p>
            <p>Customer: ${customer?.name || 'Walk-in'}</p>
            <hr style="border: 1px dashed #000;" />
            <table>
              ${itemsHtml}
            </table>
            <div style="text-align: right; margin-bottom: 15px;">
              <div>Subtotal: ${(sale.totalAmount || 0).toFixed(2)}</div>
              ${(sale.discount || 0) > 0 ? `<div>Discount: -${(sale.discount || 0).toFixed(2)}</div>` : ''}
              <div class="total-row" style="margin-top: 5px;">Total: Rs ${((sale.netPayout ?? sale.totalAmount ?? 0)).toFixed(2)}</div>
            </div>
            <hr style="border: 1px dashed #000;" />
            <p style="margin-top: 15px; text-align: center;">Thank you for your visit!</p>
          </div>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleReturn = async () => {
    if (!window.confirm('Are you sure you want to process a full return for this sale? Stock will be replenished and revenue will be adjusted.')) return;
    setIsProcessingReturn(true);
    try {
      await returnSale(sale.id);
      onClose();
    } catch (err) {
      alert("Failed to process return.");
    } finally {
      setIsProcessingReturn(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-lg shadow-2xl animate-nano text-left flex flex-col w-full max-w-lg max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">Sale Transaction Details</h3>
            <p className="text-xs text-slate-400 font-mono mt-0.5">{sale.invoiceNumber} • {format(parseISO(sale.date), 'dd MMM yyyy')}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 bg-white text-slate-400 hover:text-slate-600 rounded-md shadow-xs transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* Customer Overview */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200/80 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Customer Identity</p>
                <p className="text-sm font-extrabold text-slate-900 mt-0.5">{customer?.name || 'Walk-in Customer'}</p>
                {customer?.phone && (
                  <p className="text-xs font-bold text-slate-600 font-mono flex items-center gap-1 mt-0.5">
                    <Phone size={11} className="text-violet-600" /> {customer.phone}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Invoice Amount</p>
                <p className="text-base font-extrabold text-slate-900 font-mono mt-0.5">{formatCurrency(sale.totalAmount)}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <span className="text-slate-500 font-bold">Paid: <strong className="text-emerald-700 font-mono">{formatCurrency(sale.paidAmount || 0)}</strong></span>
                <span className="text-slate-500 font-bold">Due: <strong className={`font-mono ${Math.max(0, (sale.totalAmount || 0) - (sale.paidAmount || 0)) > 0 ? 'text-rose-600' : 'text-slate-700'}`}>{formatCurrency(Math.max(0, (sale.totalAmount || 0) - (sale.paidAmount || 0)))}</strong></span>
              </div>
              <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-md border ${sale.paymentStatus === PaymentStatus.PAID ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                sale.paymentStatus === PaymentStatus.PARTIAL ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  sale.paymentStatus === PaymentStatus.REFUNDED ? 'bg-slate-50 text-slate-500 border-slate-200' :
                    'bg-rose-50 text-rose-700 border-rose-200'
                }`}>
                {sale.paymentStatus}
              </span>
            </div>

            {/* Quick Record Payment */}
            {Math.max(0, (sale.totalAmount || 0) - (sale.paidAmount || 0)) > 0 && (
              <div className="pt-2 flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Enter paid amount..."
                  value={paymentInput}
                  onChange={(e) => setPaymentInput(e.target.value)}
                  className="flex-1 bg-white border border-slate-200 rounded-md px-3 py-1.5 text-xs font-mono font-bold text-slate-900 outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={async () => {
                    const amt = Number(paymentInput);
                    if (!amt || amt <= 0) return alert('Enter a valid payment amount');
                    try {
                      await addPaymentToSale(sale.id, amt);
                      setPaymentInput('');
                    } catch (err) {
                      alert('Failed to record payment');
                    }
                  }}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-extrabold uppercase tracking-wider transition-colors flex items-center gap-1"
                >
                  <CreditCard size={13} /> Record Payment
                </button>
              </div>
            )}
          </div>

          {/* Quick Edit Status */}
          <div className="p-3.5 bg-violet-50/60 border border-violet-100 rounded-lg space-y-2.5">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-violet-900 flex items-center gap-1.5">
              <Edit2 size={12} /> Update Order & Payment Status
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[9px] font-bold uppercase text-slate-400 mb-1 block">Order Status</label>
                <select
                  value={sale.orderStatus}
                  onChange={async (e) => {
                    setIsUpdatingStatus(true);
                    try {
                      await updateSale(sale.id, { orderStatus: e.target.value as OrderStatus });
                    } catch (err) {
                      alert('Failed to update status');
                    } finally {
                      setIsUpdatingStatus(false);
                    }
                  }}
                  className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs font-bold text-slate-900 outline-none focus:border-violet-500"
                >
                  {Object.values(OrderStatus).map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[9px] font-bold uppercase text-slate-400 mb-1 block">Payment Status</label>
                <select
                  value={sale.paymentStatus}
                  onChange={async (e) => {
                    setIsUpdatingStatus(true);
                    try {
                      await updateSale(sale.id, { paymentStatus: e.target.value as PaymentStatus });
                    } catch (err) {
                      alert('Failed to update payment status');
                    } finally {
                      setIsUpdatingStatus(false);
                    }
                  }}
                  className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs font-bold text-slate-900 outline-none focus:border-violet-500"
                >
                  {Object.values(PaymentStatus).map(pst => (
                    <option key={pst} value={pst}>{pst}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Items Purchased List */}
          <div>
            <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-2">Purchased Items ({(sale.items || []).length})</h4>
            <div className="space-y-2">
              {(sale.items || []).map((item, idx) => {
                const matchedProd = products.find(p => p.id === item.productId || p.sku === item.sku || p.name.toLowerCase() === item.name.toLowerCase());
                const effectiveProduct = matchedProd || {
                  id: item.productId || `item-${idx}`,
                  name: item.name || 'Sold Item',
                  sku: item.sku || 'N/A',
                  barcode: '',
                  category: 'Sale Item',
                  gender: 'Universal',
                  subCategory: 'General',
                  clothingType: 'Standard',
                  brand: 'Store',
                  purpose: 'SALE' as const,
                  purchasePrice: 0,
                  sellingPrice: item.unitPrice || 0,
                  rentalPrice: 0,
                  taxPercent: 0,
                  stockQuantity: 0,
                  saleStock: 0,
                  rentalStock: 0,
                  minStockAlert: 0,
                  supplierId: '',
                  description: '',
                  sizes: item.size ? [item.size] : [],
                  images: []
                };

                return (
                  <div key={idx} className="p-3 bg-white border border-slate-200/80 rounded-md hover:border-slate-300 transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <div
                          onClick={() => {
                            setViewingProduct(effectiveProduct);
                          }}
                          className="flex items-center gap-1.5 cursor-pointer group/modalItem"
                          title={`Click to view product ${item.name}`}
                        >
                          <Package size={13} className="text-slate-400 group-hover/modalItem:text-[#01a9fb] shrink-0" />
                          <p className="text-xs font-extrabold text-slate-900 group-hover/modalItem:text-[#01a9fb] group-hover/modalItem:underline">
                            {item.name}
                          </p>
                        </div>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5 ml-4.5">{item.quantity} pcs × {formatCurrency(item.unitPrice)}</p>
                      </div>
                      <p className="text-xs font-extrabold text-slate-900 font-mono">{formatCurrency(item.total)}</p>
                    </div>

                    {/* Return / Exchange Button */}
                    {(item.quantity || 1) - (item.returnedQuantity || 0) > 0 && !item.productId?.startsWith('CUSTOM_') && (
                      <div className="mt-2 pt-2 border-t border-slate-100 flex justify-end">
                        <button
                          onClick={() => setReturnModalState({ isOpen: true, itemIndex: idx, item })}
                          className="text-[10px] font-extrabold uppercase text-rose-600 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded transition-colors flex items-center gap-1"
                        >
                          <Undo2 size={11} /> Return / Exchange
                        </button>
                      </div>
                    )}
                    {(item.returnedQuantity || 0) > 0 && (
                      <p className="text-[9px] font-extrabold text-rose-600 uppercase mt-1">({item.returnedQuantity} Returned)</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex gap-2">
              <button onClick={handlePrintReceipt} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs uppercase tracking-wider rounded-md transition-colors flex items-center justify-center gap-1.5">
                <Printer size={14} /> Print Receipt
              </button>
              <button onClick={handleWhatsAppShare} className="flex-1 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-extrabold text-xs uppercase tracking-wider rounded-md transition-colors flex items-center justify-center gap-1.5">
                <MessageCircle size={14} /> Share WhatsApp
              </button>
            </div>

            {sale.orderStatus !== OrderStatus.RETURNED && sale.orderStatus !== OrderStatus.CANCELLED && (
              <button
                onClick={handleReturn}
                disabled={isProcessingReturn}
                className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-extrabold text-xs uppercase tracking-wider rounded-md transition-colors flex items-center justify-center gap-1.5"
              >
                <Undo2 size={14} /> {isProcessingReturn ? 'Processing...' : 'Process Full Return & Restock'}
              </button>
            )}
          </div>
        </div>
      </div>

      <ReturnExchangeModal
        isOpen={returnModalState.isOpen}
        onClose={() => setReturnModalState({ isOpen: false, itemIndex: -1, item: null })}
        saleId={sale.id}
        itemIndex={returnModalState.itemIndex}
        item={returnModalState.item}
      />

      {/* Product Read-Only Details Modal Triggered from Sales Item */}
      <ProductDetailsModal
        isOpen={!!viewingProduct}
        onClose={() => setViewingProduct(null)}
        product={viewingProduct}
      />
    </div>
  );
};

export default Sales;
