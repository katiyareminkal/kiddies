
import React, { useState, useMemo } from 'react';
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
  Store
} from 'lucide-react';
import { formatCurrency } from '../utils/helpers';
import { format, parseISO, isAfter, isBefore, isSameDay } from 'date-fns';
import { SalesChannel, PaymentMethod, PaymentStatus, OrderStatus } from '../types';

const Sales: React.FC = () => {
  const { sales, products, customers, updateOrderStatus } = useApp();
  const [isAddingSale, setIsAddingSale] = useState(false);
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterStatus, setFilterStatus] = useState<OrderStatus | 'ALL'>('ALL');
  const [filterChannel, setFilterChannel] = useState<SalesChannel | 'ALL'>('ALL');

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




  return (
    <div className="space-y-6 animate-nano pb-10">
      {/* Page Header */}
      <div className="flex items-center justify-between py-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Sales</h1>
          <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">Order History</p>
        </div>
        <button
          onClick={() => setIsAddingSale(true)}
          className="banana-btn shadow-banana"
        >
          <Plus size={14} strokeWidth={2.5} className="mr-2" /> New Sale
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="nano-card p-4 group hover:bg-slate-900 transition-all duration-300">
          <p className="text-[9px] font-semibold uppercase text-slate-400 tracking-widest mb-0.5 group-hover:text-slate-500 transition-colors">Today's Revenue</p>
          <h3 className="text-lg font-bold text-slate-900 group-hover:text-white transition-colors tracking-tight font-mono">{formatCurrency(todaySales)}</h3>
        </div>

        <div className="nano-card p-4 group hover:bg-slate-900 transition-all duration-300">
          <p className="text-[9px] font-semibold uppercase text-slate-400 tracking-widest mb-0.5 group-hover:text-slate-500 transition-colors">Total Orders</p>
          <h3 className="text-lg font-bold text-slate-900 group-hover:text-white transition-colors tracking-tight">{sales.length}</h3>
        </div>

        <div className="nano-card p-4 group hover:bg-slate-900 transition-all duration-300">
          <p className="text-[9px] font-semibold uppercase text-slate-400 tracking-widest mb-0.5 group-hover:text-slate-500 transition-colors">Active Orders</p>
          <h3 className={`text-lg font-bold group-hover:text-white transition-colors tracking-tight ${activeOrders > 0 ? 'text-amber-500' : 'text-slate-900'}`}>{activeOrders}</h3>
        </div>

        <div className="nano-card p-4 group hover:bg-slate-900 transition-all duration-300">
          <p className="text-[9px] font-semibold uppercase text-slate-400 tracking-widest mb-0.5 group-hover:text-slate-500 transition-colors">Average Ticket</p>
          <h3 className="text-lg font-bold text-slate-900 group-hover:text-white transition-colors tracking-tight font-mono">
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

      {/* Sales List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSales.map(sale => {
          const customer = customers.find(c => c.id === sale.customerId);
          const channelIcon = (() => {
            switch (sale.channel) {
              case SalesChannel.AMAZON: return <Globe size={12} className="text-orange-500" />;
              case SalesChannel.FLIPKART: return <Globe size={12} className="text-blue-500" />;
              case SalesChannel.WEBSITE: return <Globe size={12} className="text-emerald-500" />;
              default: return <Store size={12} className="text-slate-400" />;
            }
          })();

          return (
            <div key={sale.id} className="nano-card p-5 group hover:border-highlight/50 transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-highlight group-hover:text-primary transition-all">
                    <ShoppingBag size={14} strokeWidth={2.5} />
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">{sale.invoiceNumber}</p>
                    <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{customer?.name || 'Guest Customer'}</h4>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[12px] font-black text-slate-900 font-mono tracking-tight">{formatCurrency(sale.totalAmount)}</p>
                  <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mt-0.5">{format(parseISO(sale.date), 'MMM dd, HH:mm')}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {sale.items.slice(0, 2).map((item, i) => (
                    <span key={i} className="text-[8px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-md">
                      {item.quantity}x {item.name}
                    </span>
                  ))}
                  {sale.items.length > 2 && (
                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest px-2 py-1">
                      +{sale.items.length - 2} more
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md">
                      {channelIcon}
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{sale.channel}</span>
                    </div>
                  </div>
                  <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${sale.orderStatus === OrderStatus.COMPLETED ? 'bg-emerald-50 text-emerald-500' :
                      sale.orderStatus === OrderStatus.CANCELLED ? 'bg-rose-50 text-rose-500' :
                        'bg-amber-50 text-amber-500'
                    }`}>
                    {sale.orderStatus}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

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
    </div>
  );
};

export default Sales;
