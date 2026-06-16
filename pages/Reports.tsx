import React, { useState, useMemo } from 'react';
import { useApp } from '../store/AppContext';
import { Card, Button } from '../components/Shared';
import { formatCurrency } from '../utils/helpers';
import { 
  BarChart3, 
  TrendingUp, 
  CreditCard, 
  Calendar,
  Download
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, PieChart, Pie, Legend
} from 'recharts';
import { subDays, isAfter, format, parseISO } from 'date-fns';

const Reports: React.FC = () => {
  const { sales, rentals, products } = useApp();
  const [timeRange, setTimeRange] = useState<'7D' | '30D' | 'ALL'>('30D');

  // Filter Data based on Time Range
  const filteredData = useMemo(() => {
    const now = new Date();
    let startDate = new Date(0); // Beginning of time

    if (timeRange === '7D') startDate = subDays(now, 7);
    if (timeRange === '30D') startDate = subDays(now, 30);

    const filteredSales = sales.filter(s => isAfter(parseISO(s.date), startDate));
    const filteredRentals = rentals.filter(r => isAfter(parseISO(r.date), startDate));

    return { sales: filteredSales, rentals: filteredRentals };
  }, [sales, rentals, timeRange]);

  // Calculations for Summary Cards
  const summary = useMemo(() => {
    const salesRevenue = filteredData.sales.reduce((acc, s) => acc + s.totalAmount, 0);
    const rentalRevenue = filteredData.rentals.reduce((acc, r) => acc + r.totalRentAmount, 0);
    const totalRevenue = salesRevenue + rentalRevenue;
    
    // Net Payout (Sales Net + Rental Revenue)
    const netPayout = filteredData.sales.reduce((acc, s) => acc + s.netPayout, 0) + rentalRevenue;
    
    const totalOrders = filteredData.sales.length + filteredData.rentals.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return { totalRevenue, netPayout, totalOrders, avgOrderValue, salesRevenue, rentalRevenue };
  }, [filteredData]);

  // Chart Data: Revenue Trend (Daily)
  const trendData = useMemo(() => {
    const map = new Map<string, { date: string, sales: number, rentals: number, timestamp: number }>();
    
    [...filteredData.sales, ...filteredData.rentals].forEach(item => {
        const d = parseISO(item.date);
        const key = format(d, 'yyyy-MM-dd');
        const displayDate = format(d, 'MMM dd');
        
        if (!map.has(key)) {
            map.set(key, { date: displayDate, sales: 0, rentals: 0, timestamp: d.getTime() });
        }
        const entry = map.get(key)!;
        if ('totalAmount' in item) {
             entry.sales += (item as any).totalAmount;
        } else {
             entry.rentals += (item as any).totalRentAmount;
        }
    });

    return Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
  }, [filteredData]);

  // Chart Data: Sales by Channel
  const channelData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredData.sales.forEach(s => {
      counts[s.channel] = (counts[s.channel] || 0) + s.totalAmount;
    });
    
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredData]);

  // Top Products
  const topProducts = useMemo(() => {
      const productSales: Record<string, { name: string, quantity: number, revenue: number }> = {};
      
      filteredData.sales.forEach(s => {
          s.items.forEach(item => {
              if (!productSales[item.productId]) {
                  productSales[item.productId] = { name: item.name, quantity: 0, revenue: 0 };
              }
              productSales[item.productId].quantity += item.quantity;
              productSales[item.productId].revenue += item.total;
          });
      });

      return Object.values(productSales).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [filteredData]);

  const COLORS = ['#0F172A', '#FACC15', '#94A3B8', '#E2E8F0', '#F1F5F9'];

  return (
    <div className="space-y-6 animate-nano pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 font-display tracking-tighter">Reports</h1>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] mt-1">Business Intelligence</p>
        </div>
        <div className="flex bg-white rounded-2xl border border-slate-100 p-1 shadow-nano">
           {['7D', '30D', 'ALL'].map((range) => (
             <button
                key={range}
                onClick={() => setTimeRange(range as any)}
                className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${timeRange === range ? 'bg-highlight text-slate-900 shadow-banana' : 'text-slate-400 hover:text-slate-600'}`}
             >
                {range === 'ALL' ? 'All Time' : `Last ${range.replace('D', ' Days')}`}
             </button>
           ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="nano-card p-6 group hover:bg-slate-900 transition-all duration-500">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest group-hover:text-slate-500 transition-colors">Total Revenue</p>
                    <h3 className="text-2xl font-display font-black text-slate-900 mt-1 group-hover:text-white transition-colors">{formatCurrency(summary.totalRevenue)}</h3>
                </div>
                <div className="p-2.5 bg-slate-50 text-slate-900 rounded-xl group-hover:bg-white/10 group-hover:text-white transition-all shadow-nano">
                    <TrendingUp size={18} strokeWidth={3} />
                </div>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-50 group-hover:border-white/10 flex flex-wrap gap-4 text-[8px] font-black uppercase tracking-widest text-slate-400 transition-colors">
                <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-slate-900 group-hover:bg-highlight"></div> Sales: {formatCurrency(summary.salesRevenue)}</span>
                <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-slate-500"></div> Rentals: {formatCurrency(summary.rentalRevenue)}</span>
            </div>
        </div>

        <div className="nano-card p-6 group hover:bg-slate-900 transition-all duration-500">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest group-hover:text-slate-500 transition-colors">Net Profit</p>
                    <h3 className="text-2xl font-display font-black text-slate-900 mt-1 group-hover:text-white transition-colors">{formatCurrency(summary.netPayout)}</h3>
                </div>
                <div className="p-2.5 bg-slate-50 text-slate-900 rounded-xl group-hover:bg-white/10 group-hover:text-white transition-all shadow-nano">
                    <CreditCard size={18} strokeWidth={3} />
                </div>
            </div>
            <p className="text-[8px] font-black text-slate-400 mt-6 group-hover:text-slate-500 uppercase tracking-widest transition-colors">After Deductions</p>
        </div>

        <div className="nano-card p-6 group hover:bg-slate-900 transition-all duration-500">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest group-hover:text-slate-500 transition-colors">Total Orders</p>
                    <h3 className="text-2xl font-display font-black text-slate-900 mt-1 group-hover:text-white transition-colors">{summary.totalOrders}</h3>
                </div>
                <div className="p-2.5 bg-slate-50 text-slate-900 rounded-xl group-hover:bg-white/10 group-hover:text-white transition-all shadow-nano">
                    <BarChart3 size={18} strokeWidth={3} />
                </div>
            </div>
             <p className="text-[8px] font-black text-slate-400 mt-6 group-hover:text-slate-500 uppercase tracking-widest transition-colors">Omnichannel</p>
        </div>

        <div className="nano-card p-6 group hover:bg-slate-900 transition-all duration-500">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest group-hover:text-slate-500 transition-colors">Avg. Order</p>
                    <h3 className="text-2xl font-display font-black text-slate-900 mt-1 group-hover:text-white transition-colors">{formatCurrency(summary.avgOrderValue)}</h3>
                </div>
                <div className="p-2.5 bg-slate-50 text-slate-900 rounded-xl group-hover:bg-white/10 group-hover:text-white transition-all shadow-nano">
                    <Calendar size={18} strokeWidth={3} />
                </div>
            </div>
             <p className="text-[8px] font-black text-slate-400 mt-6 group-hover:text-slate-500 uppercase tracking-widest transition-colors">Per Transaction</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Trend Chart */}
        <div className="lg:col-span-2 p-8 nano-card">
            <div className="flex items-center justify-between mb-8">
                <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Revenue Trend</h3>
                <div className="flex items-center gap-4 text-[8px] font-black uppercase tracking-widest text-slate-300">
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-slate-900"></div> Sales</div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-highlight"></div> Rentals</div>
                </div>
            </div>
            <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData}>
                        <defs>
                            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#0F172A" stopOpacity={0.05}/>
                                <stop offset="95%" stopColor="#0F172A" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorRentals" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#FACC15" stopOpacity={0.05}/>
                                <stop offset="95%" stopColor="#FACC15" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#cbd5e1', fontSize: 8, fontWeight: 900}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#cbd5e1', fontSize: 8, fontWeight: 900}} dx={-10} />
                        <Tooltip 
                            contentStyle={{borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px'}}
                            itemStyle={{fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em'}}
                        />
                        <Area type="monotone" dataKey="sales" name="Sales" stroke="#0F172A" fillOpacity={1} fill="url(#colorSales)" strokeWidth={4} />
                        <Area type="monotone" dataKey="rentals" name="Rentals" stroke="#FACC15" fillOpacity={1} fill="url(#colorRentals)" strokeWidth={4} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Channel Distribution */}
        <div className="p-8 nano-card">
            <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] mb-8">Channel Mix</h3>
            <div className="h-[280px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={channelData}
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={100}
                            fill="#8884d8"
                            paddingAngle={4}
                            dataKey="value"
                            stroke="none"
                        >
                            {channelData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip 
                            contentStyle={{borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                        />
                        <Legend 
                            verticalAlign="bottom" 
                            align="center" 
                            iconType="circle"
                            formatter={(value) => <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">{value}</span>}
                        />
                    </PieChart>
                </ResponsiveContainer>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none -mt-4">
                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-300">Total</p>
                    <p className="text-xl font-display font-black text-slate-900">{formatCurrency(summary.salesRevenue)}</p>
                </div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Top Products */}
          <div className="p-8 nano-card">
              <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] mb-6">Top Performing Products</h3>
              <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                      <thead>
                          <tr className="text-slate-300 border-b border-slate-50">
                              <th className="pb-4 font-black uppercase text-[9px] tracking-widest">Product</th>
                              <th className="pb-4 font-black uppercase text-[9px] tracking-widest text-right">Qty</th>
                              <th className="pb-4 font-black uppercase text-[9px] tracking-widest text-right">Revenue</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                          {topProducts.map((p, i) => (
                              <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                                  <td className="py-4 font-black text-slate-900 text-[11px] uppercase tracking-tight">{p.name}</td>
                                  <td className="py-4 text-right font-black text-slate-400 uppercase tracking-widest text-[10px]">{p.quantity}</td>
                                  <td className="py-4 text-right font-mono font-black text-slate-900">{formatCurrency(p.revenue)}</td>
                              </tr>
                          ))}
                          {topProducts.length === 0 && (
                              <tr>
                                  <td colSpan={3} className="py-12 text-center text-slate-300 font-black uppercase tracking-widest text-[9px]">No data available</td>
                              </tr>
                          )}
                      </tbody>
                  </table>
              </div>
          </div>

          {/* Inventory Value */}
          <div className="p-8 nano-card flex flex-col justify-center">
              <div className="text-center mb-8">
                  <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] mb-1">Inventory Valuation</h3>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Current stock value</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="text-center p-6 bg-slate-50 rounded-[2rem] border border-transparent group hover:bg-slate-900 transition-all duration-500">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 group-hover:text-slate-500 transition-colors">Cost Value</p>
                      <h3 className="text-xl font-display font-black text-slate-900 group-hover:text-white transition-colors">
                          {formatCurrency(products.reduce((acc, p) => acc + (p.purchasePrice * (p.saleStock + p.rentalStock)), 0))}
                      </h3>
                  </div>
                  <div className="text-center p-6 bg-slate-50 rounded-[2rem] border border-transparent group hover:bg-slate-900 transition-all duration-500">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 group-hover:text-slate-500 transition-colors">Retail Value</p>
                      <h3 className="text-xl font-display font-black text-slate-900 group-hover:text-white transition-colors">
                          {formatCurrency(products.reduce((acc, p) => acc + (p.sellingPrice * (p.saleStock + p.rentalStock)), 0))}
                      </h3>
                  </div>
              </div>
              <div className="mt-8">
                  <button className="w-full flex items-center justify-center gap-3 h-14 bg-white border border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 hover:border-slate-200 transition-all rounded-2xl shadow-nano" onClick={() => {}}>
                      <Download size={18} strokeWidth={3} /> Download Report
                  </button>
              </div>
          </div>
      </div>
    </div>
  );
};

export default Reports;