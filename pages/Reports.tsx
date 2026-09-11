import React, { useState, useMemo } from 'react';
import { useApp } from '../store/AppContext';
import { Card, Button } from '../components/Shared';
import { formatCurrency } from '../utils/helpers';
import {
  BarChart3,
  TrendingUp,
  CreditCard,
  Calendar,
  Download,
  PieChart as PieChartIcon,
  Package,
  ArrowUpRight,
  Sparkles,
  ShoppingBag,
  Coins,
  IndianRupee,
  Layers
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, Legend
} from 'recharts';
import { subDays, isAfter, format, parseISO } from 'date-fns';
import { OrderStatus } from '../types';

const Reports: React.FC = () => {
  const { sales, rentals, products, expenses } = useApp();
  const [timeRange, setTimeRange] = useState<'7D' | '30D' | 'ALL'>('30D');

  // Filter Data based on Time Range
  const filteredData = useMemo(() => {
    const now = new Date();
    let startDate = new Date(0);

    if (timeRange === '7D') startDate = subDays(now, 7);
    if (timeRange === '30D') startDate = subDays(now, 30);

    const filteredSales = sales.filter(s =>
      s.orderStatus !== OrderStatus.RETURNED &&
      s.orderStatus !== OrderStatus.CANCELLED &&
      isAfter(parseISO(s.date), startDate)
    );
    const filteredRentals = rentals.filter(r => isAfter(parseISO(r.date), startDate));
    const filteredExpenses = expenses.filter(e => isAfter(parseISO(e.date), startDate));

    return { sales: filteredSales, rentals: filteredRentals, expenses: filteredExpenses };
  }, [sales, rentals, expenses, timeRange]);

  // Calculations for Summary Cards
  const summary = useMemo(() => {
    const salesRevenue = filteredData.sales.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
    const rentalRevenue = filteredData.rentals.reduce((acc, r) => acc + (r.totalRentAmount || 0), 0);
    const totalRevenue = salesRevenue + rentalRevenue;

    const totalExpenses = filteredData.expenses.reduce((acc, e) => acc + (e.amount || 0), 0);
    const netPayout = (filteredData.sales.reduce((acc, s) => acc + (s.netPayout || s.totalAmount || 0), 0) + rentalRevenue) - totalExpenses;

    const totalOrders = filteredData.sales.length + filteredData.rentals.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return { totalRevenue, netPayout, totalOrders, avgOrderValue, salesRevenue, rentalRevenue, totalExpenses };
  }, [filteredData]);

  // Chart Data: Revenue Trend (Daily)
  const trendData = useMemo(() => {
    const map = new Map<string, { date: string, sales: number, rentals: number, timestamp: number }>();

    [...filteredData.sales, ...filteredData.rentals].forEach(item => {
      const d = parseISO(item.date);
      const key = format(d, 'yyyy-MM-dd');
      const displayDate = format(d, 'dd MMM');

      if (!map.has(key)) {
        map.set(key, { date: displayDate, sales: 0, rentals: 0, timestamp: d.getTime() });
      }
      const entry = map.get(key)!;
      if ('totalAmount' in item) {
        entry.sales += (item as any).totalAmount || 0;
      } else {
        entry.rentals += (item as any).totalRentAmount || 0;
      }
    });

    return Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
  }, [filteredData]);

  // Chart Data: Sales by Channel
  const channelData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredData.sales.forEach(s => {
      const ch = s.channel || 'IN_STORE';
      counts[ch] = (counts[ch] || 0) + (s.totalAmount || 0);
    });

    const arr = Object.entries(counts).map(([name, value]) => ({ name, value }));
    return arr.length > 0 ? arr : [{ name: 'Direct Store', value: summary.salesRevenue || 1 }];
  }, [filteredData, summary.salesRevenue]);

  // Top Products
  const topProducts = useMemo(() => {
    const productSales: Record<string, { name: string, quantity: number, revenue: number }> = {};

    filteredData.sales.forEach(s => {
      (s.items || []).forEach(item => {
        if (!productSales[item.productId]) {
          productSales[item.productId] = { name: item.name, quantity: 0, revenue: 0 };
        }
        productSales[item.productId].quantity += item.quantity || 1;
        productSales[item.productId].revenue += item.total || 0;
      });
    });

    return Object.values(productSales).sort((a, b) => b.revenue - a.revenue).slice(0, 6);
  }, [filteredData]);

  const COLORS = ['#01a9fb', '#fe569f', '#FACC15', '#6366F1', '#10B981'];

  const handleExportCSV = () => {
    let csv = `Type,Date,Reference,Description,Amount\n`;
    filteredData.sales.forEach(s => {
      csv += `SALE,"${s.date}","${s.invoiceNumber}","${(s.items || []).map(i => i.name).join('; ')}",${s.netPayout || s.totalAmount}\n`;
    });
    filteredData.rentals.forEach(r => {
      csv += `RENTAL,"${r.date}","${r.invoiceNumber}","Rental Booking",${r.totalRentAmount}\n`;
    });
    filteredData.expenses.forEach(e => {
      csv += `EXPENSE,"${e.date}","${e.type}","${e.reason}",-${e.amount}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Financial_Report_${timeRange}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5 animate-nano pb-20 max-w-[1600px] mx-auto">
      {/* ── Executive Header ── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#01a9fb] text-white flex items-center justify-center shadow-xs shrink-0">
            <BarChart3 size={20} strokeWidth={2.2} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">Business Intelligence & Reports</h1>
              <span className="text-[10px] font-extrabold text-[#01a9fb] bg-[#01a9fb]/10 border border-[#01a9fb]/30 px-2 py-0.5 rounded-lg">
                Financial Health
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Comprehensive sales performance, net margin analytics, and ledger tracking</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Time Range Pill Switcher */}
          <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200/70 shrink-0 gap-0.5">
            {(['7D', '30D', 'ALL'] as const).map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3.5 py-1.5 text-xs font-black rounded-lg transition-all ${timeRange === range
                  ? 'bg-[#01a9fb] text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
                  }`}
              >
                {range === 'ALL' ? 'All Time' : `Last ${range.replace('D', 'D')}`}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[#01a9fb] hover:bg-[#0098e6] text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-xs transition-all active:scale-95"
          >
            <Download size={14} strokeWidth={2.5} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* ── Summary KPI Cards (4 Cards) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white hover:bg-slate-50/60 p-4 sm:p-5 rounded-2xl border border-slate-200/90 hover:border-[#01a9fb]/50 shadow-card transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-500">Gross Turnover</span>
            <div className="w-8 h-8 rounded-xl bg-[#01a9fb]/10 text-[#01a9fb] flex items-center justify-center font-bold text-xs shadow-2xs">
              <TrendingUp size={15} />
            </div>
          </div>
          <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none font-mono">
            {formatCurrency(summary.totalRevenue)}
          </h3>
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 mt-2.5 pt-2 border-t border-slate-100">
            <span className="text-[#01a9fb]">Sale: {formatCurrency(summary.salesRevenue)}</span>
            <span>•</span>
            <span className="text-[#fe569f]">Rent: {formatCurrency(summary.rentalRevenue)}</span>
          </div>
        </div>

        <div className="bg-white hover:bg-slate-50/60 p-4 sm:p-5 rounded-2xl border border-slate-200/90 hover:border-emerald-300 shadow-card transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-500">Net Operating Profit</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs shadow-2xs">
              <IndianRupee size={15} />
            </div>
          </div>
          <h3 className={`text-2xl sm:text-3xl font-black tracking-tight leading-none font-mono ${summary.netPayout >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
            {formatCurrency(summary.netPayout)}
          </h3>
          <p className="text-[10px] sm:text-xs font-semibold text-slate-400 mt-2">After expenses (-{formatCurrency(summary.totalExpenses)})</p>
        </div>

        <div className="bg-white hover:bg-slate-50/60 p-4 sm:p-5 rounded-2xl border border-slate-200/90 hover:border-[#fe569f]/50 shadow-card transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-500">Total Transactions</span>
            <div className="w-8 h-8 rounded-xl bg-[#fe569f]/10 text-[#fe569f] flex items-center justify-center font-bold text-xs shadow-2xs">
              <ShoppingBag size={15} />
            </div>
          </div>
          <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none">
            {summary.totalOrders}
          </h3>
          <p className="text-[10px] sm:text-xs font-bold text-[#fe569f] mt-2">Sales & rental bookings fulfilled</p>
        </div>

        <div className="bg-white hover:bg-slate-50/60 p-4 sm:p-5 rounded-2xl border border-slate-200/90 hover:border-yellow-300 shadow-card transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-500">Average Order Value</span>
            <div className="w-8 h-8 rounded-xl bg-yellow-100 text-yellow-800 flex items-center justify-center font-bold text-xs shadow-2xs">
              <Coins size={15} />
            </div>
          </div>
          <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none font-mono">
            {formatCurrency(summary.avgOrderValue)}
          </h3>
          <p className="text-[10px] sm:text-xs font-bold text-yellow-700 mt-2">Average gross checkout</p>
        </div>
      </div>

      {/* ── Charts Grid: Revenue Trend + Channel Distribution ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Trend Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">Revenue Progression Trend</h3>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">Daily turnover split by sales vs rental bookings</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-bold">
              <div className="flex items-center gap-1.5 text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-[#01a9fb]"></span>
                <span>Sales</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-[#fe569f]"></span>
                <span>Rentals</span>
              </div>
            </div>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 700 }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 700 }} dx={-8} tickFormatter={val => `₹${val}`} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', padding: '12px' }}
                  itemStyle={{ fontSize: '11px', fontWeight: 800 }}
                  formatter={(val: any) => [`₹${Number(val).toLocaleString()}`, '']}
                />
                <Area type="monotone" dataKey="sales" name="Sales Turnover" stroke="#01a9fb" fill="#01a9fb" fillOpacity={0.08} strokeWidth={2.5} />
                <Area type="monotone" dataKey="rentals" name="Rental Bookings" stroke="#fe569f" fill="#fe569f" fillOpacity={0.08} strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Channel Mix Chart */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-card flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">Sales Channel Distribution</h3>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Turnover share by POS and online channels</p>
          </div>

          <div className="h-[220px] w-full relative my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={channelData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="none"
                >
                  {channelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}
                  formatter={(val: any) => [`₹${Number(val).toLocaleString()}`, '']}
                />
                <Legend
                  verticalAlign="bottom"
                  align="center"
                  iconType="circle"
                  formatter={(value) => <span className="text-[10px] font-bold text-slate-600 ml-1">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none -mt-4">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Total</p>
              <p className="text-sm font-extrabold text-slate-900 font-mono">{formatCurrency(summary.salesRevenue)}</p>
            </div>
          </div>

          <p className="text-[10px] text-slate-400 text-center pt-2 border-t border-slate-100">Omnichannel revenue split</p>
        </div>
      </div>

      {/* ── Top Performing Products & Stock Valuation ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Products */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">Top Performing SKUs</h3>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">Top revenue generating items</p>
            </div>
            <Package size={16} className="text-slate-400" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                  <th className="pb-3">Product Name</th>
                  <th className="pb-3 text-center">Units Sold</th>
                  <th className="pb-3 text-right">Revenue Generated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-bold">
                {topProducts.map((p, i) => (
                  <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 text-slate-900 font-extrabold">{p.name}</td>
                    <td className="py-3 text-center text-slate-500">{p.quantity} pcs</td>
                    <td className="py-3 text-right font-mono font-extrabold text-slate-900">{formatCurrency(p.revenue)}</td>
                  </tr>
                ))}
                {topProducts.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-slate-400 font-bold">No sales data recorded</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Inventory Valuation Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">Inventory Stock Valuation</h3>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">Purchase cost basis vs estimated retail market value</p>
              </div>
              <Layers size={16} className="text-slate-400" />
            </div>

            <div className="grid grid-cols-2 gap-3 my-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Cost Basis Valuation</span>
                <h4 className="text-xl font-black text-slate-900 font-mono">
                  {formatCurrency(products.reduce((acc, p) => acc + ((p.purchasePrice || 0) * ((p.saleStock || 0) + (p.rentalStock || 0))), 0))}
                </h4>
                <p className="text-[10px] text-slate-500 mt-1">Capital invested in inventory</p>
              </div>

              <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200/80">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block mb-1">Retail Value</span>
                <h4 className="text-xl font-black text-emerald-800 font-mono">
                  {formatCurrency(products.reduce((acc, p) => acc + ((p.sellingPrice || 0) * ((p.saleStock || 0) + (p.rentalStock || 0))), 0))}
                </h4>
                <p className="text-[10px] text-emerald-600 mt-1">Gross catalogue retail potential</p>
              </div>
            </div>
          </div>

          <button
            onClick={handleExportCSV}
            className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-xs active:scale-95"
          >
            <Download size={14} />
            <span>Download Detailed Audit Report</span>
          </button>
        </div>
      </div>

      {/* ── Expense & Cash Out Ledger Section ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">Expense & Cash Out Audit Ledger</h3>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Audit trail of store expenses, cash payouts, and personal/family item withdrawals</p>
          </div>
          <span className="text-xs font-bold text-rose-600 font-mono">Total Expenses: {formatCurrency(summary.totalExpenses)}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Item Details</th>
                <th className="px-4 py-3">Paid To / Recipient</th>
                <th className="px-4 py-3">Reason / Description</th>
                <th className="px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredData.expenses.map((exp) => {
                const product = products.find(p => p.id === exp.productId);
                return (
                  <tr key={exp.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-extrabold text-slate-900">{format(new Date(exp.date), 'dd MMM yyyy')}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider ${exp.type === 'CASH_OUT' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}>
                        {exp.type === 'CASH_OUT' ? 'Cash Out' : 'Goods Taken'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-600">
                      {exp.type === 'GOODS_CONSUMPTION' && product
                        ? `${product.name} (Qty: ${exp.quantity || 1})`
                        : '-'
                      }
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-800">{exp.paidTo || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{exp.reason}</td>
                    <td className="px-4 py-3 text-right font-mono font-extrabold text-rose-600">-{formatCurrency(exp.amount)}</td>
                  </tr>
                );
              })}
              {filteredData.expenses.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-bold">No expense records logged in this timeframe</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reports;