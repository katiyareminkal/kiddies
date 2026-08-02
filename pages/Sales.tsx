
import React, { useState, useMemo, useEffect } from 'react';
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
  Info
} from 'lucide-react';
import { formatCurrency } from '../utils/helpers';
import { format, parseISO, isAfter, isBefore, isSameDay } from 'date-fns';
import { SalesChannel, PaymentMethod, PaymentStatus, OrderStatus } from '../types';

const Sales: React.FC = () => {
  const { sales, products, customers, updateOrderStatus } = useApp();
  const [isAddingSale, setIsAddingSale] = useState(false);
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterStatus, setFilterStatus] = useState<OrderStatus | 'ALL'>('ALL');
  const [filterChannel, setFilterChannel] = useState<SalesChannel | 'ALL'>('ALL');
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);

  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      const customer = customers.find(c => c.id === s.customerId);
      const searchStr = historySearchTerm.toLowerCase();

      const matchesSearch =
        s.invoiceNumber.toLowerCase().includes(searchStr) ||
        (customer?.name || 'Guest').toLowerCase().includes(searchStr) ||
        s.channel.toLowerCase().includes(searchStr);

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
      .filter(s => s.date.split('T')[0] === today)
      .reduce((acc, s) => acc + s.totalAmount, 0);
  }, [sales]);

  const activeOrders = sales.filter(s => s.orderStatus !== OrderStatus.COMPLETED && s.orderStatus !== OrderStatus.CANCELLED).length;

  const handleExportSales = () => {
    if (filteredSales.length === 0) return alert('No sales records to export');
    const headers = ['Invoice Number', 'Customer', 'Date', 'Total Amount', 'Items Count', 'Channel', 'Status', 'Payment Method'];
    const rows = filteredSales.map(s => {
      const cust = customers.find(c => c.id === s.customerId);
      return [
        s.invoiceNumber,
        `"${cust?.name || 'Guest Customer'}"`,
        `"${format(parseISO(s.date), 'yyyy-MM-dd HH:mm')}"`,
        s.totalAmount,
        s.items.reduce((sum, item) => sum + item.quantity, 0),
        s.channel,
        s.orderStatus,
        s.paymentMethod
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `sales_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };




  return (
    <div className="space-y-6 animate-nano pb-10">
      {/* Page Header */}
      <div className="flex items-center justify-between py-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Sales</h1>
          <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">Order History & Transactions</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportSales}
            className="px-4 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-xs"
            title="Export Sales CSV"
          >
            <Download size={13} strokeWidth={2.5} />
            <span className="hidden sm:inline">Export</span>
          </button>
          <button
            onClick={() => setIsAddingSale(true)}
            className="banana-btn shadow-banana"
          >
            <Plus size={14} strokeWidth={2.5} className="mr-2" /> New Sale
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Today's Revenue */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:border-[#8B5CF6]/30 hover:shadow-md transition-all relative group/card">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Today's Revenue</span>
              <div className="relative group/tooltip">
                <Info size={11} className="text-slate-300 hover:text-[#8B5CF6] transition-colors cursor-pointer" />
                <div className="absolute left-0 sm:left-1/2 sm:-translate-x-1/2 bottom-full mb-2 hidden group-hover/tooltip:block w-48 p-2.5 bg-slate-900/95 text-white text-[9px] font-medium leading-relaxed rounded-xl shadow-xl z-30 backdrop-blur-md pointer-events-none animate-in fade-in duration-150">
                  Total net sales revenue collected from all completed orders today.
                  <div className="absolute top-full left-3 sm:left-1/2 sm:-translate-x-1/2 border-4 border-transparent border-t-slate-900/95"></div>
                </div>
              </div>
            </div>
            <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
              <IndianRupee size={14} strokeWidth={2.5} />
            </div>
          </div>
          <h3 className="text-lg font-black text-slate-900 tracking-tight font-mono">{formatCurrency(todaySales)}</h3>
        </div>

        {/* Total Orders */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:border-[#8B5CF6]/30 hover:shadow-md transition-all relative group/card">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Total Orders</span>
              <div className="relative group/tooltip">
                <Info size={11} className="text-slate-300 hover:text-[#8B5CF6] transition-colors cursor-pointer" />
                <div className="absolute left-0 sm:left-1/2 sm:-translate-x-1/2 bottom-full mb-2 hidden group-hover/tooltip:block w-48 p-2.5 bg-slate-900/95 text-white text-[9px] font-medium leading-relaxed rounded-xl shadow-xl z-30 backdrop-blur-md pointer-events-none animate-in fade-in duration-150">
                  Total count of all sales orders recorded across all channels.
                  <div className="absolute top-full left-3 sm:left-1/2 sm:-translate-x-1/2 border-4 border-transparent border-t-slate-900/95"></div>
                </div>
              </div>
            </div>
            <div className="w-7 h-7 rounded-xl bg-purple-50 text-[#8B5CF6] flex items-center justify-center">
              <ShoppingBag size={14} strokeWidth={2.5} />
            </div>
          </div>
          <h3 className="text-lg font-black text-slate-900 tracking-tight font-mono">{sales.length}</h3>
        </div>

        {/* Active Orders */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:border-[#8B5CF6]/30 hover:shadow-md transition-all relative group/card">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Active Orders</span>
              <div className="relative group/tooltip">
                <Info size={11} className="text-slate-300 hover:text-[#8B5CF6] transition-colors cursor-pointer" />
                <div className="absolute left-0 sm:left-1/2 sm:-translate-x-1/2 bottom-full mb-2 hidden group-hover/tooltip:block w-48 p-2.5 bg-slate-900/95 text-white text-[9px] font-medium leading-relaxed rounded-xl shadow-xl z-30 backdrop-blur-md pointer-events-none animate-in fade-in duration-150">
                  Orders currently pending, processing, or awaiting shipping/fulfillment.
                  <div className="absolute top-full left-3 sm:left-1/2 sm:-translate-x-1/2 border-4 border-transparent border-t-slate-900/95"></div>
                </div>
              </div>
            </div>
            <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${activeOrders > 0 ? 'bg-amber-50 text-amber-500' : 'bg-slate-50 text-slate-400'}`}>
              <Clock size={14} strokeWidth={2.5} />
            </div>
          </div>
          <h3 className={`text-lg font-black tracking-tight font-mono ${activeOrders > 0 ? 'text-amber-600' : 'text-slate-900'}`}>{activeOrders}</h3>
        </div>

        {/* Average Ticket */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:border-[#8B5CF6]/30 hover:shadow-md transition-all relative group/card">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Average Ticket</span>
              <div className="relative group/tooltip">
                <Info size={11} className="text-slate-300 hover:text-[#8B5CF6] transition-colors cursor-pointer" />
                <div className="absolute right-0 sm:left-1/2 sm:-translate-x-1/2 bottom-full mb-2 hidden group-hover/tooltip:block w-48 p-2.5 bg-slate-900/95 text-white text-[9px] font-medium leading-relaxed rounded-xl shadow-xl z-30 backdrop-blur-md pointer-events-none animate-in fade-in duration-150">
                  Average order value (AOV = Total Revenue ÷ Total Order Count).
                  <div className="absolute top-full right-3 sm:left-1/2 sm:-translate-x-1/2 border-4 border-transparent border-t-slate-900/95"></div>
                </div>
              </div>
            </div>
            <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center">
              <Tag size={14} strokeWidth={2.5} />
            </div>
          </div>
          <h3 className="text-lg font-black text-slate-900 tracking-tight font-mono">
            {formatCurrency(sales.length > 0 ? sales.reduce((acc, s) => acc + s.totalAmount, 0) / sales.length : 0)}
          </h3>
        </div>
      </div>

      {/* Search Bar & Filter Toggle */}
      <div className="flex gap-4">
        <div className="relative group flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-slate-900 transition-colors" size={14} strokeWidth={2.5} />
          <input
            type="text"
            placeholder="Search Sales History..."
            className="w-full bg-white border border-slate-100 rounded-2xl py-3 pl-12 pr-4 text-[10px] font-bold uppercase tracking-widest outline-none focus:border-highlight/30 transition-all shadow-sm"
            value={historySearchTerm}
            onChange={(e) => setHistorySearchTerm(e.target.value)}
          />
        </div>

        {/* View Switcher: Card View / List View */}
        <div className="flex items-center p-1 bg-white border border-slate-100 rounded-2xl shadow-sm">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2.5 rounded-xl transition-all ${
              viewMode === 'grid'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-700'
            }`}
            title="Card View"
          >
            <LayoutGrid size={15} strokeWidth={2.5} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2.5 rounded-xl transition-all ${
              viewMode === 'list'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-700'
            }`}
            title="List View"
          >
            <List size={15} strokeWidth={2.5} />
          </button>
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-6 rounded-2xl border transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${showFilters ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'}`}
        >
          <Filter size={14} strokeWidth={showFilters ? 3 : 2.5} />
          {showFilters ? 'Hide Filters' : 'Advanced Filters'}
        </button>
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-xl animate-nano space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-slate-300 tracking-widest ml-2">From Date</label>
              <input
                type="date"
                className="w-full bg-slate-50 border border-transparent focus:bg-white focus:border-highlight/30 rounded-xl p-3 text-[10px] font-black uppercase outline-none transition-all"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-slate-300 tracking-widest ml-2">To Date</label>
              <input
                type="date"
                className="w-full bg-slate-50 border border-transparent focus:bg-white focus:border-highlight/30 rounded-xl p-3 text-[10px] font-black uppercase outline-none transition-all"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-slate-300 tracking-widest ml-2">Order Status</label>
              <select
                className="w-full bg-slate-50 border border-transparent focus:bg-white focus:border-highlight/30 rounded-xl p-3 text-[10px] font-black uppercase outline-none transition-all appearance-none"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as OrderStatus | 'ALL')}
              >
                <option value="ALL">All Statuses</option>
                {Object.values(OrderStatus).map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-slate-300 tracking-widest ml-2">Sales Channel</label>
              <select
                className="w-full bg-slate-50 border border-transparent focus:bg-white focus:border-highlight/30 rounded-xl p-3 text-[10px] font-black uppercase outline-none transition-all appearance-none"
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
          <div className="flex justify-end pt-2 border-t border-slate-50">
            <button
              onClick={() => {
                setFilterStartDate('');
                setFilterEndDate('');
                setFilterStatus('ALL');
                setFilterChannel('ALL');
                setHistorySearchTerm('');
              }}
              className="px-4 py-2 text-[9px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-2"
            >
              <XCircle size={14} /> Reset All Filters
            </button>
          </div>
        </div>
      )}

      {/* Sales Display (Cards / List View) */}
      {viewMode === 'list' ? (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-[8.5px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Items Summary</th>
                  <th className="py-3 px-4 text-center">Channel</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/60">
                {filteredSales.map(sale => {
                  const customer = customers.find(c => c.id === sale.customerId);
                  const channelIcon = (() => {
                    switch (sale.channel) {
                      case SalesChannel.AMAZON: return <Globe size={11} className="text-amber-500" />;
                      case SalesChannel.FLIPKART: return <Globe size={11} className="text-blue-500" />;
                      case SalesChannel.WEBSITE: return <Globe size={11} className="text-emerald-500" />;
                      default: return <Store size={11} className="text-purple-500" />;
                    }
                  })();

                  return (
                    <tr 
                      key={sale.id}
                      onClick={() => setSelectedSaleId(sale.id)}
                      className="hover:bg-purple-50/30 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4 font-mono text-[10px] font-black text-[#8B5CF6]">
                        {sale.invoiceNumber}
                      </td>
                      <td className="py-3 px-4 font-black text-[11px] text-slate-800 uppercase tracking-tight group-hover:text-[#8B5CF6] transition-colors">
                        {customer?.name || 'Guest Customer'}
                      </td>
                      <td className="py-3 px-4 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                        {format(parseISO(sale.date), 'MMM dd, HH:mm')}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {sale.items.slice(0, 2).map((item, i) => (
                            <span key={i} className="text-[7.5px] font-bold text-slate-600 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded-md">
                              {item.quantity}x {item.name}
                            </span>
                          ))}
                          {sale.items.length > 2 && (
                            <span className="text-[7.5px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-md">
                              +{sale.items.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-lg text-[8px] font-black text-slate-500 uppercase tracking-wider">
                          {channelIcon}
                          {sale.channel}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block text-[8px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-lg border ${
                          sale.orderStatus === OrderStatus.COMPLETED ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                          sale.orderStatus === OrderStatus.CANCELLED ? 'bg-rose-50 text-rose-600 border-rose-100' :
                          'bg-amber-50 text-amber-600 border-amber-100'
                        }`}>
                          {sale.orderStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-[11px] text-slate-900">
                        {formatCurrency(sale.totalAmount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Sales Cards Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredSales.map(sale => {
            const customer = customers.find(c => c.id === sale.customerId);
            const channelIcon = (() => {
              switch (sale.channel) {
                case SalesChannel.AMAZON: return <Globe size={11} className="text-amber-500" />;
                case SalesChannel.FLIPKART: return <Globe size={11} className="text-blue-500" />;
                case SalesChannel.WEBSITE: return <Globe size={11} className="text-emerald-500" />;
                default: return <Store size={11} className="text-purple-500" />;
              }
            })();

            return (
              <div 
                key={sale.id} 
                className="bg-white rounded-2xl border border-slate-100/80 p-3.5 shadow-sm hover:shadow-lg hover:shadow-purple-500/5 hover:border-[#8B5CF6]/30 transition-all duration-200 cursor-pointer group flex flex-col justify-between min-h-[110px]"
                onClick={() => setSelectedSaleId(sale.id)}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-purple-50 text-[#8B5CF6] group-hover:bg-[#8B5CF6] group-hover:text-white transition-colors flex items-center justify-center shrink-0">
                        <ShoppingBag size={14} strokeWidth={2.2} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-tight truncate group-hover:text-[#8B5CF6] transition-colors">{customer?.name || 'Guest Customer'}</h4>
                        <p className="text-[8px] font-bold text-slate-400 font-mono tracking-widest">{sale.invoiceNumber}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[11px] font-black text-slate-900 font-mono tracking-tight">{formatCurrency(sale.totalAmount)}</p>
                      <p className="text-[7.5px] font-bold text-slate-400 uppercase tracking-widest">{format(parseISO(sale.date), 'MMM dd, HH:mm')}</p>
                    </div>
                  </div>

                  {/* Items Summary Pills */}
                  <div className="flex flex-wrap gap-1 my-1.5">
                    {sale.items.slice(0, 2).map((item, i) => (
                      <span key={i} className="text-[7.5px] font-bold text-slate-600 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded-md truncate max-w-[130px]">
                        {item.quantity}x {item.name}
                      </span>
                    ))}
                    {sale.items.length > 2 && (
                      <span className="text-[7.5px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-md">
                        +{sale.items.length - 2}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Footer */}
                <div className="flex items-center justify-between pt-2 mt-1 border-t border-slate-100/60">
                  <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-lg">
                    {channelIcon}
                    <span className="text-[7.5px] font-black text-slate-500 uppercase tracking-wider">{sale.channel}</span>
                  </div>
                  <span className={`text-[7.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg border ${
                    sale.orderStatus === OrderStatus.COMPLETED ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                    sale.orderStatus === OrderStatus.CANCELLED ? 'bg-rose-50 text-rose-600 border-rose-100' :
                    'bg-amber-50 text-amber-600 border-amber-100'
                  }`}>
                    {sale.orderStatus}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filteredSales.length === 0 && (
        <div className="py-20 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-[2rem] flex items-center justify-center text-slate-200 mx-auto mb-4 border border-slate-100">
            <ShoppingBag size={24} strokeWidth={1.5} />
          </div>
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-1">No transactions found</h3>
          <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em]">Try a different search term</p>
        </div>
      )}

      <CreateBillModal isOpen={isAddingSale} onClose={() => setIsAddingSale(false)} />
      
      {selectedSaleId && (
        <SaleDetailsModal 
          saleId={selectedSaleId} 
          onClose={() => setSelectedSaleId(null)} 
        />
      )}
    </div>
  );
};

// Sub-component for Partial Return / Exchange
const ReturnExchangeModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  saleId: string;
  itemIndex: number;
  item: any; // InvoiceItem
}> = ({ isOpen, onClose, saleId, itemIndex, item }) => {
  const { products, processPartialReturnOrExchange } = useApp();
  const [returnQty, setReturnQty] = useState(1);
  const [isExchange, setIsExchange] = useState(false);
  const [exchangeSearchTerm, setExchangeSearchTerm] = useState('');
  const [exchangeProductId, setExchangeProductId] = useState<string | null>(null);
  const [exchangeQty, setExchangeQty] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);

  // Reset state on open
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
    const tax = (selectedExchangeProduct.sellingPrice * (selectedExchangeProduct.taxPercent || 0)) / 100;
    newChargeAmount = (selectedExchangeProduct.sellingPrice + tax) * exchangeQty;
  }
  const netDifference = newChargeAmount - refundAmount;

  const handleSubmit = async () => {
    if (returnQty < 1 || returnQty > maxReturnable) return alert("Invalid return quantity");
    if (isExchange) {
      if (!exchangeProductId) return alert("Select an item to exchange for");
      if (exchangeQty < 1) return alert("Invalid exchange quantity");
      if (selectedExchangeProduct && selectedExchangeProduct.saleStock < exchangeQty) return alert("Not enough stock for exchange item");
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
    <div style={{ position: 'fixed', inset: 0, zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', padding: '24px' }}>
      <div className="bg-white rounded-[2rem] shadow-2xl animate-nano text-left flex flex-col w-full max-w-md max-h-[90vh]">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-[2rem]">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Return / Exchange</h3>
            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{item.name}</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 bg-white text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 shadow-sm transition-all">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-2">Quantity to Return (Max: {maxReturnable})</label>
            <input
              type="number"
              min={1}
              max={maxReturnable}
              value={returnQty}
              onChange={(e) => setReturnQty(Number(e.target.value))}
              className="w-full bg-slate-50 border border-transparent focus:bg-white focus:border-highlight/30 rounded-xl p-3 text-sm font-black outline-none transition-all"
            />
          </div>

          <div className="flex gap-2 p-1 bg-slate-50 rounded-xl">
            <button
              onClick={() => setIsExchange(false)}
              className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${!isExchange ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Just Return
            </button>
            <button
              onClick={() => setIsExchange(true)}
              className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${isExchange ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Exchange Item
            </button>
          </div>

          {isExchange && (
            <div className="space-y-4 p-4 border border-slate-100 rounded-2xl bg-slate-50/50">
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-2">Search Replacement Item</label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by name or SKU..."
                    value={exchangeSearchTerm}
                    onChange={(e) => {
                      setExchangeSearchTerm(e.target.value);
                      setExchangeProductId(null);
                    }}
                    className="w-full bg-white border border-slate-200 focus:border-highlight/50 rounded-xl pl-9 pr-3 py-3 text-xs font-bold outline-none transition-all"
                  />
                </div>
                {!exchangeProductId && exchangeSearchTerm.length > 1 && (
                  <div className="bg-white border border-slate-100 rounded-xl shadow-lg mt-2 max-h-40 overflow-y-auto absolute z-10 w-full left-0 right-0">
                    {products
                      .filter(p => (p.purpose === 'SALE' || p.purpose === 'HYBRID') && p.saleStock > 0)
                      .filter(p => p.name.toLowerCase().includes(exchangeSearchTerm.toLowerCase()) || p.sku.toLowerCase().includes(exchangeSearchTerm.toLowerCase()))
                      .slice(0, 5)
                      .map(p => (
                        <button
                          key={p.id}
                          onClick={() => {
                            setExchangeProductId(p.id);
                            setExchangeSearchTerm(p.name);
                          }}
                          className="w-full text-left p-3 hover:bg-slate-50 border-b border-slate-50 last:border-0 flex justify-between items-center"
                        >
                          <div>
                            <p className="text-[10px] font-bold text-slate-900 uppercase truncate pr-2">{p.name}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{p.sku} • {p.sizes.join(', ')}</p>
                          </div>
                          <span className="text-[10px] text-highlight font-black bg-highlight/10 px-2 py-1 rounded-md flex-shrink-0">{formatCurrency(p.sellingPrice)}</span>
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {exchangeProductId && selectedExchangeProduct && (
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-2">Quantity to Give</label>
                  <input
                    type="number"
                    min={1}
                    max={selectedExchangeProduct.saleStock}
                    value={exchangeQty}
                    onChange={(e) => setExchangeQty(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 focus:border-highlight/50 rounded-xl p-3 text-sm font-black outline-none transition-all"
                  />
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest ml-2 mt-1">Available Stock: {selectedExchangeProduct.saleStock}</p>
                </div>
              )}
            </div>
          )}

          <div className="p-4 bg-slate-900 rounded-2xl text-white space-y-2">
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400">
              <span>Refund Amount:</span>
              <span className="text-white">{formatCurrency(refundAmount)}</span>
            </div>
            {isExchange && (
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <span>New Charge:</span>
                <span className="text-white">{formatCurrency(newChargeAmount)}</span>
              </div>
            )}
            <div className="pt-2 border-t border-slate-700 flex justify-between text-xs font-black uppercase tracking-widest">
              <span>{netDifference > 0 ? 'Customer Owes:' : netDifference < 0 ? 'You Refund:' : 'Net Difference:'}</span>
              <span className={netDifference > 0 ? 'text-rose-400' : netDifference < 0 ? 'text-emerald-400' : 'text-white'}>
                {formatCurrency(Math.abs(netDifference))}
              </span>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={isProcessing}
            className="w-full banana-btn shadow-banana text-sm"
          >
            {isProcessing ? 'Processing...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Sub-component for Sale Details Modal to keep it clean
const SaleDetailsModal: React.FC<{ saleId: string; onClose: () => void }> = ({ saleId, onClose }) => {
  const { sales, customers, products, linkSaleItemToProduct, returnSale, storeProfile } = useApp();
  const sale = sales.find(s => s.id === saleId);
  const customer = customers.find(c => c.id === sale?.customerId);
  const [linkingItemId, setLinkingItemId] = useState<string | null>(null);
  const [linkSearchTerm, setLinkSearchTerm] = useState('');
  const [isProcessingReturn, setIsProcessingReturn] = useState(false);
  const [returnModalState, setReturnModalState] = useState<{isOpen: boolean; itemIndex: number; item: any}>({isOpen: false, itemIndex: -1, item: null});

  if (!sale) return null;

  const handleWhatsAppShare = () => {
    let text = `*Kiddies – Kids Wear & Baby Clothing Store*\n`;
    text += `Receipt: ${sale.invoiceNumber}\n`;
    text += `Date: ${format(parseISO(sale.date), 'dd MMM yyyy')}\n\n`;
    text += `*Items:*\n`;
    sale.items.forEach(item => {
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

    sale.items.forEach(item => {
      itemsHtml += `
        <tr>
          <td style="padding: 4px 0; border-bottom: 1px dashed #ccc;">${item.name} <br/> <small style="font-size: 15px; color: #555;">${item.quantity} x ${item.unitPrice}</small></td>
          <td style="padding: 4px 0; border-bottom: 1px dashed #ccc; text-align: right;">${item.total.toFixed(2)}</td>
        </tr>
      `;
      textReceipt += `${item.name}\n${item.quantity} x ${item.unitPrice} = ${item.total.toFixed(2)}\n`;
    });

    textReceipt += `------------------------\nSubtotal: ${sale.totalAmount.toFixed(2)}\n`;
    if (sale.discount > 0) textReceipt += `Discount: -${sale.discount.toFixed(2)}\n`;
    textReceipt += `Total: Rs ${sale.netPayout.toFixed(2)}\n------------------------\nThank you for your visit!\n`;

    // Make it safe for injecting into JS string
    const escapedTextReceipt = textReceipt.replace(/\n/g, '\\n').replace(/'/g, "\\'");

    const html = `
      <html>
        <head>
          <title>Receipt ${sale.invoiceNumber}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <style>
            body { font-family: 'Courier New', Courier, monospace; margin: 0; padding: 0; background: #f1f5f9; color: #000; }
            .receipt-container { width: 384px; margin: 20px auto; padding: 10px; background: #fff; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); border-radius: 8px; box-sizing: border-box; }
            h2 { text-align: center; margin: 0 0 12px 0; font-size: 24px; line-height: 1.2; }
            p { text-align: center; margin: 0 0 12px 0; font-size: 18px; line-height: 1.2; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 18px; }
            td { vertical-align: top; }
            .total-row { font-weight: bold; font-size: 22px; }
            .center { text-align: center; }
            .mb-2 { margin-bottom: 12px; }
            
            .toolbar { display: flex; gap: 10px; justify-content: center; padding: 15px; background: #fff; border-bottom: 1px solid #e2e8f0; position: sticky; top: 0; z-index: 100; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
            .btn { flex: 1; max-width: 150px; padding: 12px 15px; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; font-family: system-ui, sans-serif; font-size: 14px; display: flex; align-items: center; justify-content: center; gap: 6px; }
            .btn-print { background: #8B5CF6; color: white; }
            .btn-share { background: #1E293B; color: white; }
            
            @media print {
              .no-print { display: none !important; }
              body { background: #fff; }
              .receipt-container { box-shadow: none; margin: 0; padding: 0; width: 58mm; border-radius: 0; }
            }
          </style>
        </head>
        <body>
          <div class="toolbar no-print">
            <button class="btn btn-print" onclick="window.print()">🖨️ Print</button>
            <button class="btn btn-share" onclick="shareReceipt()">📤 Open With...</button>
          </div>
          <div class="receipt-container">
            <h2>Kiddies – Kids Wear & Baby Clothing Store</h2>
            <p>SHOP NO. 203, 204 C-30, next to HDFC Bank<br/>Ph: 097134 69928</p>
            <hr style="border: 1px dashed #000;" />
            <p class="mb-2"><strong>Inv: ${sale.invoiceNumber}</strong><br/>${format(parseISO(sale.date), 'dd MMM yyyy, hh:mm a')}</p>
            <p class="mb-2">Customer: ${customer?.name || 'Walk-in'}</p>
            <hr style="border: 1px dashed #000;" />
            <table>
              ${itemsHtml}
            </table>
            <div style="text-align: right; margin-bottom: 15px;">
              <div>Subtotal: ${sale.totalAmount.toFixed(2)}</div>
              ${sale.discount > 0 ? `<div>Discount: -${sale.discount.toFixed(2)}</div>` : ''}
              <div class="total-row" style="margin-top: 5px;">Total: Rs ${sale.netPayout.toFixed(2)}</div>
            </div>
            <hr style="border: 1px dashed #000;" />
            <p style="margin-top: 15px;">Thank you for your visit!</p>
          </div>
          
          <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
          <script>
            async function shareReceipt() {
              const btn = document.querySelector('.btn-share');
              const originalText = btn.innerHTML;
              btn.innerHTML = '⏳ Preparing...';
              btn.disabled = true;

              try {
                const container = document.querySelector('.receipt-container');
                // Use html2canvas to convert the receipt to a high-res image first
                const canvas = await html2canvas(container, {
                  scale: 2, // High resolution for sharp text
                  backgroundColor: '#ffffff'
                });
                
                const imgData = canvas.toDataURL('image/png');
                
                // Force physical paper width to exactly 58mm
                const pdfWidth = 58;
                // Calculate proportional height in mm
                const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                
                const { jsPDF } = window.jspdf;
                const pdf = new jsPDF({
                  orientation: 'portrait',
                  unit: 'mm',
                  format: [pdfWidth, pdfHeight]
                });
                
                // Add the high-res image to the perfectly sized 58mm PDF page
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                const pdfBlob = pdf.output('blob');
                
                const file = new File([pdfBlob], 'receipt_${sale.invoiceNumber}.pdf', { type: 'application/pdf' });
                
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                  await navigator.share({
                    title: 'Receipt ${sale.invoiceNumber}',
                    files: [file]
                  });
                } else {
                  // Fallback to sharing plain text if PDF sharing is unsupported
                  const text = '${escapedTextReceipt}';
                  await navigator.share({
                    title: 'Receipt ${sale.invoiceNumber}',
                    text: text
                  });
                }
                
                btn.innerHTML = originalText;
                btn.disabled = false;
                
              } catch (err) {
                console.error('Share failed:', err);
                alert('Sharing failed or was cancelled.');
                btn.innerHTML = originalText;
                btn.disabled = false;
              }
            }
          </script>
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
    <div style={{ position: 'absolute', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)', padding: '24px' }}>
      <div className="bg-white rounded-[2rem] shadow-2xl animate-nano text-left flex flex-col" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh' }}>
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Sale Details</h3>
            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{sale.invoiceNumber} • {format(parseISO(sale.date), 'MMM dd, yyyy')}</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 bg-slate-50 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-all">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
             <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Customer</p>
                <p className="text-xs font-bold text-slate-900 uppercase tracking-tight mt-1">{customer?.name || 'Guest Customer'}</p>
             </div>
             <div className="text-right">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Amount</p>
                <p className="text-sm font-black text-slate-900 tracking-tight mt-1">{formatCurrency(sale.totalAmount)}</p>
             </div>
          </div>

          <div>
             <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-900 mb-3">Items Purchased ({sale.items.length})</h4>
             <div className="space-y-3">
                {sale.items.map((item, idx) => (
                  <div key={idx} className="p-4 bg-white border border-slate-100 rounded-2xl">
                     <div className="flex justify-between items-start mb-2">
                        <div>
                           <p className="text-xs font-bold text-slate-900 uppercase">{item.name}</p>
                           <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">Qty: {item.quantity} × {formatCurrency(item.unitPrice)}</p>
                        </div>
                        <p className="text-xs font-black text-slate-900">{formatCurrency(item.total)}</p>
                     </div>
                     
                     {/* Linking Logic for Custom Items */}
                     {item.productId?.startsWith('CUSTOM_') && (
                        <div className="mt-3 pt-3 border-t border-slate-50">
                           {linkingItemId === item.productId ? (
                              <div className="space-y-2">
                                 <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Link to Inventory</p>
                                 <div className="relative">
                                   <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                   <input 
                                     type="text"
                                     autoFocus
                                     placeholder="Search inventory..."
                                     value={linkSearchTerm}
                                     onChange={(e) => setLinkSearchTerm(e.target.value)}
                                     className="w-full bg-slate-50 pl-8 pr-3 py-2 rounded-lg text-[10px] font-bold outline-none border border-transparent focus:bg-white focus:border-highlight/30 transition-all text-slate-900"
                                   />
                                 </div>
                                 {linkSearchTerm.length > 1 && (
                                   <div className="bg-white border border-slate-100 rounded-lg shadow-sm mt-1 max-h-32 overflow-y-auto">
                                     {products
                                       .filter(p => p.name.toLowerCase().includes(linkSearchTerm.toLowerCase()) || p.sku.toLowerCase().includes(linkSearchTerm.toLowerCase()))
                                       .slice(0, 5)
                                       .map(p => (
                                         <button 
                                           key={p.id}
                                           onClick={async () => {
                                             try {
                                               await linkSaleItemToProduct(sale.id, item.productId, p.id);
                                               setLinkingItemId(null);
                                               setLinkSearchTerm('');
                                             } catch (err) {
                                               alert("Failed to link item");
                                             }
                                           }}
                                           className="w-full text-left p-2 hover:bg-slate-50 border-b border-slate-50 last:border-0 text-[9px] flex justify-between items-center"
                                         >
                                            <span className="font-bold text-slate-700 uppercase truncate pr-2">{p.name}</span>
                                            <span className="text-slate-400 font-mono flex-shrink-0">Stock: {p.saleStock}</span>
                                         </button>
                                       ))}
                                   </div>
                                 )}
                                 <button onClick={() => { setLinkingItemId(null); setLinkSearchTerm(''); }} className="text-[9px] text-slate-400 hover:text-slate-600 font-bold uppercase tracking-widest mt-1">Cancel</button>
                              </div>
                           ) : (
                              <button 
                                onClick={() => setLinkingItemId(item.productId)}
                                className="text-[9px] font-black uppercase tracking-widest text-highlight bg-highlight/10 hover:bg-highlight/20 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                              >
                                <Plus size={10} /> Link to Product
                              </button>
                           )}
                        </div>
                     )}
                     {/* Return/Exchange Action */}
                     {item.quantity - (item.returnedQuantity || 0) > 0 && !item.productId?.startsWith('CUSTOM_') && (
                        <div className="mt-3 pt-3 border-t border-slate-50 flex justify-end">
                           <button 
                             onClick={() => setReturnModalState({ isOpen: true, itemIndex: idx, item })}
                             className="text-[9px] font-black uppercase tracking-widest text-rose-500 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                           >
                             <Undo2 size={10} /> Return / Exchange
                           </button>
                        </div>
                     )}
                     {(item.returnedQuantity || 0) > 0 && (
                        <div className="mt-2 text-[9px] font-black text-rose-500 uppercase tracking-widest">
                          ({item.returnedQuantity} Returned)
                        </div>
                     )}
                  </div>
                ))}
              </div>
           </div>

           <div className="flex flex-col gap-3 pt-4 border-t border-slate-100">
             <div className="flex gap-3">
               <button onClick={handlePrintReceipt} className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-[10px] uppercase tracking-widest py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                 <Printer size={14} /> Print Receipt
               </button>
               <button onClick={handleWhatsAppShare} className="flex-1 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] font-bold text-[10px] uppercase tracking-widest py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                 <MessageCircle size={14} /> Share WhatsApp
               </button>
             </div>
             {sale.orderStatus !== OrderStatus.RETURNED && sale.orderStatus !== OrderStatus.CANCELLED && (
               <button 
                 onClick={handleReturn}
                 disabled={isProcessingReturn}
                 className="w-full bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-[10px] uppercase tracking-widest py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
               >
                 <Undo2 size={14} /> {isProcessingReturn ? 'Processing...' : 'Process Full Return'}
               </button>
             )}
             {sale.orderStatus === OrderStatus.RETURNED && (
               <div className="w-full bg-rose-50 border border-rose-100 text-rose-600 font-bold text-[10px] uppercase tracking-widest py-3 rounded-xl text-center">
                 Sale Returned & Stock Replenished
               </div>
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
    </div>
  );
};

export default Sales;
