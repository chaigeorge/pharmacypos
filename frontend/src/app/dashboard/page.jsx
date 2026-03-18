'use client';
import { useQuery } from '@tanstack/react-query';
import AppLayout from '../../components/layout/AppLayout';
import api from '../../lib/api';
import { formatCurrency, formatDateTime } from '../../lib/utils';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ShoppingCart, TrendingUp, AlertTriangle, Clock, Package } from 'lucide-react';
import Link from 'next/link';

function StatCard({ title, value, subtitle, icon: Icon, color, href }) {
  const content = (
    <div className={`card hover:shadow-md transition-shadow ${href ? 'cursor-pointer' : ''}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard').then(r => r.data),
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-8 flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      </AppLayout>
    );
  }

  const d = data || {};

  return (
    <AppLayout>
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Today's Sales"
            value={formatCurrency(d.todaySales?.total || 0)}
            subtitle={`${d.todaySales?.count || 0} transactions`}
            icon={ShoppingCart}
            color="bg-primary-500"
          />
          <StatCard
            title="Today's Expenses"
            value={formatCurrency(d.todayExpenses || 0)}
            subtitle="Total recorded expenses today"
            icon={TrendingUp}
            color="bg-green-500"
          />
          <StatCard
            title="Low Stock Items"
            value={d.lowStockCount || 0}
            subtitle="Need restocking"
            icon={Package}
            color="bg-yellow-500"
            href="/inventory?filter=low_stock"
          />
          <StatCard
            title="Expiring Soon"
            value={d.expiringSoon || 0}
            subtitle={`${d.expiredCount || 0} already expired`}
            icon={Clock}
            color="bg-red-500"
            href="/inventory?filter=expiring_soon"
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Sales chart */}
          <div className="xl:col-span-2 card">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Sales — Last 7 Days</h2>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={d.salesChart || []}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => formatCurrency(v)} labelFormatter={(l) => `Date: ${l}`} />
                <Area type="monotone" dataKey="total" stroke="#6366f1" fill="url(#salesGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Recent transactions */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">Recent Sales</h2>
              <Link href="/sales/history" className="text-primary-600 text-xs hover:underline">View all</Link>
            </div>
            <div className="space-y-3">
              {(d.recentSales || []).slice(0, 6).map((sale) => (
                <div key={sale.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{sale.saleNumber}</p>
                    <p className="text-xs text-gray-400">{sale.cashier?.name} · {sale._count?.items} items</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(sale.total)}</p>
                    <span className={sale.status === 'COMPLETED' ? 'badge-success' : 'badge-danger'}>
                      {sale.status}
                    </span>
                  </div>
                </div>
              ))}
              {(!d.recentSales || d.recentSales.length === 0) && (
                <p className="text-sm text-gray-400 text-center py-4">No sales yet today</p>
              )}
            </div>
          </div>
        </div>

        {/* Alerts */}
        {(d.expiredCount > 0 || d.lowStockCount > 0) && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {d.expiredCount > 0 && (
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-800">{d.expiredCount} batch(es) expired</p>
                  <p className="text-xs text-red-600 mt-0.5">Remove expired stock from shelves immediately.</p>
                  <Link href="/inventory?filter=expired" className="text-xs text-red-700 font-medium underline mt-1 inline-block">View expired items →</Link>
                </div>
              </div>
            )}
            {d.lowStockCount > 0 && (
              <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                <Package className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-yellow-800">{d.lowStockCount} product(s) low in stock</p>
                  <p className="text-xs text-yellow-600 mt-0.5">Consider placing a reorder soon.</p>
                  <Link href="/inventory?filter=low_stock" className="text-xs text-yellow-700 font-medium underline mt-1 inline-block">View low stock →</Link>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
