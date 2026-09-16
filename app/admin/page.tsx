'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminDashboard() {
  const [dateRange, setDateRange] = useState('7days');
  const [loading, setLoading] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);

  const [stats, setStats] = useState([
    { title: 'Total Revenue',    value: 'GH₵ 0.00',  change: '0%',  trend: 'up', icon: 'ri-money-dollar-circle-line', accent: 'bg-emerald-500' },
    { title: 'Orders',           value: '0',          change: '0%',  trend: 'up', icon: 'ri-shopping-bag-line',        accent: 'bg-blue-500'   },
    { title: 'Customers',        value: '0',          change: '0%',  trend: 'up', icon: 'ri-group-line',               accent: 'bg-violet-500' },
    { title: 'Avg Order Value',  value: 'GH₵ 0.00',  change: '0%',  trend: 'up', icon: 'ri-line-chart-line',          accent: 'bg-blue-500'  },
  ]);

  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const { data: allOrdersData, error: ordersError } = await supabase
          .from('orders')
          .select('total, status, payment_status, created_at, email');

        if (ordersError) throw ordersError;

        const paidOrders = allOrdersData?.filter(o => o.payment_status === 'paid') || [];
        const totalRevenue = paidOrders.reduce((sum, order) => sum + (order.total || 0), 0);
        const totalOrders = allOrdersData?.length || 0;
        const paidOrderCount = paidOrders.length;
        const avgOrderValue = paidOrderCount > 0 ? totalRevenue / paidOrderCount : 0;
        const uniqueCustomers = new Set(allOrdersData?.map(o => o.email)).size;

        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          return d.toISOString().split('T')[0];
        });

        const chartMap = last7Days.reduce((acc: any, date) => { acc[date] = 0; return acc; }, {});
        paidOrders.forEach(order => {
          const date = new Date(order.created_at).toISOString().split('T')[0];
          if (chartMap[date] !== undefined) chartMap[date] += (order.total || 0);
        });

        setChartData(Object.keys(chartMap).map(date => ({
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          revenue: chartMap[date]
        })));

        setStats([
          { title: 'Total Revenue',   value: `GH₵ ${totalRevenue.toFixed(2)}`,   change: '+0%', trend: 'up', icon: 'ri-money-dollar-circle-line', accent: 'bg-emerald-500' },
          { title: 'Orders',          value: totalOrders.toString(),               change: '+0%', trend: 'up', icon: 'ri-shopping-bag-line',        accent: 'bg-blue-500'   },
          { title: 'Customers',       value: uniqueCustomers.toString(),            change: '+0%', trend: 'up', icon: 'ri-group-line',               accent: 'bg-violet-500' },
          { title: 'Avg Order Value', value: `GH₵ ${avgOrderValue.toFixed(2)}`,   change: '+0%', trend: 'up', icon: 'ri-line-chart-line',          accent: 'bg-blue-500'  },
        ]);

        const { data: recentOrdersData } = await supabase
          .from('orders')
          .select('id, order_number, user_id, email, created_at, total, status, shipping_address')
          .eq('payment_status', 'paid')
          .order('created_at', { ascending: false })
          .limit(5);

        if (recentOrdersData) {
          setRecentOrders(recentOrdersData.map((o: any) => {
            const addr = o.shipping_address || {};
            const customerName = (addr.firstName && addr.lastName)
              ? `${addr.firstName.trim()} ${addr.lastName.trim()}`
              : addr.full_name || addr.firstName || o.email.split('@')[0];
            return {
              id: o.id, displayId: o.order_number, customer: customerName,
              email: o.email, date: new Date(o.created_at).toLocaleDateString(),
              total: o.total, status: o.status,
            };
          }));
        }

        const { data: lowStockData } = await supabase.from('products').select('name, quantity').lt('quantity', 10).limit(5);
        if (lowStockData) {
          setLowStockProducts(lowStockData.map((p: any) => ({
            name: p.name, stock: p.quantity, status: p.quantity === 0 ? 'critical' : 'low'
          })));
        }

        const { data: productData } = await supabase.from('products').select('*, product_images(url)').limit(4);
        if (productData) {
          setTopProducts(productData.map((p: any) => ({
            id: p.slug, name: p.name,
            image: p.product_images?.[0]?.url || 'https://via.placeholder.com/200',
            sales: 0, revenue: 0, stock: p.quantity
          })));
        }
      } catch (error) {
        console.error('Error loading dashboard:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardData();
  }, []);

  useEffect(() => { setHasMounted(true); }, []);

  const statusConfig: any = {
    pending:    { label: 'Pending',    cls: 'bg-blue-50 text-blue-700 border-blue-200'    },
    processing: { label: 'Processing', cls: 'bg-blue-50 text-blue-700 border-blue-200'       },
    shipped:    { label: 'Packaged',   cls: 'bg-violet-50 text-violet-700 border-violet-200' },
    delivered:  { label: 'Delivered',  cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    cancelled:  { label: 'Cancelled',  cls: 'bg-red-50 text-red-700 border-red-200'          },
  };

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-[9px] font-black tracking-[0.5em] uppercase text-slate-400">Loading Dashboard</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── WELCOME BANNER ───────────────────────────────── */}
      <div className="bg-slate-950 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
        <div aria-hidden className="absolute right-0 top-0 font-serif italic text-white/[0.03] leading-none pointer-events-none select-none" style={{ fontSize: '10rem' }}>D</div>
        <div className="relative z-10">
          <p className="text-[9px] font-black tracking-[0.5em] uppercase text-slate-500 mb-1">{dateStr}</p>
          <h1 className="font-serif text-2xl sm:text-3xl italic text-white">{greeting} 👋</h1>
          <p className="text-slate-500 text-sm mt-1">Here&apos;s what&apos;s happening in your store today.</p>
        </div>
        <div className="flex items-center gap-3 relative z-10 flex-shrink-0">
          <Link href="/admin/products/new" className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-slate-950 px-4 py-2.5 rounded-xl font-black text-xs tracking-[0.2em] uppercase transition-colors">
            <i className="ri-add-line" /> New Product
          </Link>
          <Link href="/admin/pos" className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2.5 rounded-xl font-black text-xs tracking-[0.2em] uppercase transition-colors">
            <i className="ri-store-3-line" /> Open POS
          </Link>
        </div>
      </div>

      {/* ── STAT CARDS ───────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.title} className="bg-white rounded-2xl p-5 border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all group">
            <div className="flex items-start justify-between mb-4">
              <div className={`w-9 h-9 rounded-xl ${stat.accent} bg-opacity-10 flex items-center justify-center`}>
                <i className={`${stat.icon} text-base ${stat.accent.replace('bg-', 'text-')}`} />
              </div>
              <span className="text-[9px] font-black tracking-wide uppercase text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                {stat.change}
              </span>
            </div>
            <p className="text-2xl font-black text-slate-900 leading-none mb-1.5">{stat.value}</p>
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-slate-400">{stat.title}</p>
          </div>
        ))}
      </div>

      {/* ── CHART + QUICK ACTIONS ────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-4">

        {/* Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-[9px] font-black tracking-[0.4em] uppercase text-slate-400 mb-1">Performance</p>
              <h2 className="font-serif text-xl italic text-slate-900">Revenue Trend</h2>
            </div>
            <select
              className="text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none cursor-pointer"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            >
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
            </select>
          </div>
          <div className="h-72 w-full">
            {hasMounted && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#a8a29e' }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#a8a29e' }} tickFormatter={(v) => `₵${v}`} />
                  <Tooltip
                    contentStyle={{ background: '#1c1917', border: '1px solid #292524', borderRadius: '12px', boxShadow: '0 10px 25px rgb(0 0 0 / 0.3)' }}
                    labelStyle={{ color: '#a8a29e', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}
                    itemStyle={{ color: '#fbbf24', fontWeight: 700 }}
                    formatter={(value) => [`GH₵${(value as number)?.toFixed(2) ?? '0.00'}`, 'Revenue']}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100">
          <p className="text-[9px] font-black tracking-[0.4em] uppercase text-slate-400 mb-1">Shortcuts</p>
          <h2 className="font-serif text-xl italic text-slate-900 mb-5">Quick Actions</h2>
          <div className="space-y-2">
            {[
              { label: 'Add New Product',  icon: 'ri-add-circle-line',  href: '/admin/products/new', accent: 'text-blue-500'  },
              { label: 'Open POS System',  icon: 'ri-computer-line',    href: '/admin/pos',          accent: 'text-blue-500'   },
              { label: 'Manage Orders',    icon: 'ri-file-list-line',   href: '/admin/orders',       accent: 'text-violet-500' },
              { label: 'View Analytics',   icon: 'ri-bar-chart-line',   href: '/admin/analytics',    accent: 'text-emerald-500'},
              { label: 'Store-wide Sale',  icon: 'ri-price-tag-2-line', href: '/admin/sales',        accent: 'text-rose-500'   },
            ].map(action => (
              <Link
                key={action.href}
                href={action.href}
                className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <i className={`${action.icon} text-base ${action.accent}`} />
                  <span className="text-sm font-semibold">{action.label}</span>
                </div>
                <i className="ri-arrow-right-line text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all text-sm" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── ORDERS + LOW STOCK ───────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-4">

        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
            <div>
              <p className="text-[9px] font-black tracking-[0.4em] uppercase text-slate-400 mb-0.5">Latest</p>
              <h2 className="font-serif text-xl italic text-slate-900">Recent Orders</h2>
            </div>
            <Link href="/admin/orders" className="text-xs font-bold tracking-[0.2em] uppercase text-slate-400 hover:text-slate-900 transition-colors flex items-center gap-1">
              View All <i className="ri-arrow-right-line" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            {recentOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mb-3">
                  <i className="ri-shopping-bag-line text-xl text-slate-300" />
                </div>
                <p className="text-sm text-slate-400">No orders yet.</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-3 px-5 text-[9px] font-black tracking-[0.4em] uppercase text-slate-400">Order</th>
                    <th className="text-left py-3 px-5 text-[9px] font-black tracking-[0.4em] uppercase text-slate-400">Customer</th>
                    <th className="text-left py-3 px-5 text-[9px] font-black tracking-[0.4em] uppercase text-slate-400 hidden sm:table-cell">Date</th>
                    <th className="text-left py-3 px-5 text-[9px] font-black tracking-[0.4em] uppercase text-slate-400">Total</th>
                    <th className="text-left py-3 px-5 text-[9px] font-black tracking-[0.4em] uppercase text-slate-400">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recentOrders.map((order) => {
                    const sc = statusConfig[order.status] || { label: order.status, cls: 'bg-slate-50 text-slate-600 border-slate-200' };
                    return (
                      <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-5">
                          <Link href={`/admin/orders/${order.id}`} className="text-xs font-black text-slate-900 hover:text-blue-600 transition-colors">
                            {order.displayId}
                          </Link>
                        </td>
                        <td className="py-4 px-5">
                          <p className="text-sm font-semibold text-slate-900 truncate max-w-[130px]">{order.customer}</p>
                          <p className="text-[10px] text-slate-400 truncate max-w-[130px]">{order.email}</p>
                        </td>
                        <td className="py-4 px-5 text-xs text-slate-500 hidden sm:table-cell">{order.date}</td>
                        <td className="py-4 px-5 text-sm font-black text-slate-900">GH₵{order.total.toFixed(2)}</td>
                        <td className="py-4 px-5">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${sc.cls}`}>
                            {sc.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Low Stock */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
            <div>
              <p className="text-[9px] font-black tracking-[0.4em] uppercase text-slate-400 mb-0.5">Alert</p>
              <h2 className="font-serif text-xl italic text-slate-900">Low Stock</h2>
            </div>
            {lowStockProducts.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-white text-[9px] font-black">
                {lowStockProducts.length}
              </span>
            )}
          </div>

          <div className="p-4">
            {lowStockProducts.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-3">
                  <i className="ri-checkbox-circle-line text-xl text-emerald-500" />
                </div>
                <p className="text-sm font-semibold text-slate-900 mb-0.5">All Good!</p>
                <p className="text-xs text-slate-400">Inventory looks healthy.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {lowStockProducts.map((product, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50 group hover:bg-slate-100 transition-colors">
                    <div className="min-w-0 flex-1 mr-3">
                      <p className="text-sm font-semibold text-slate-900 truncate">{product.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{product.stock} units left</p>
                    </div>
                    <span className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[9px] font-black border ${
                      product.status === 'critical'
                        ? 'bg-red-50 text-red-600 border-red-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                      {product.status === 'critical' ? 'Critical' : 'Low'}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <Link href="/admin/products?filter=low-stock" className="flex items-center justify-center gap-1 mt-4 text-[10px] font-black tracking-[0.25em] uppercase text-slate-400 hover:text-slate-900 transition-colors">
              View All Products <i className="ri-arrow-right-line" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── PRODUCTS ─────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <p className="text-[9px] font-black tracking-[0.4em] uppercase text-slate-400 mb-0.5">Catalogue</p>
            <h2 className="font-serif text-xl italic text-slate-900">Products</h2>
          </div>
          <Link href="/admin/products" className="text-xs font-bold tracking-[0.2em] uppercase text-slate-400 hover:text-slate-900 transition-colors flex items-center gap-1">
            View All <i className="ri-arrow-right-line" />
          </Link>
        </div>

        <div className="p-6">
          {topProducts.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No products found.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {topProducts.map((product) => (
                <div key={product.id} className="group">
                  <div className="aspect-square bg-slate-50 rounded-2xl overflow-hidden mb-3 relative">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-slate-950/0 group-hover:bg-slate-950/20 transition-colors rounded-2xl" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900 line-clamp-1 mb-1">{product.name}</h3>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Stock: {product.stock}</span>
                    <Link
                      href={`/admin/products/${product.id}`}
                      className="text-[10px] font-black tracking-[0.2em] uppercase text-blue-600 hover:text-blue-500 transition-colors flex items-center gap-0.5"
                    >
                      Edit <i className="ri-arrow-right-line text-xs" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
