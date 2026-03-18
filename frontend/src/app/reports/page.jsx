'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AppLayout from '../../components/layout/AppLayout';
import api from '../../lib/api';
import { formatCurrency } from '../../lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#3b82f6','#8b5cf6','#ec4899','#14b8a6'];

export default function ReportsPage() {
  const [range, setRange] = useState('month');
  const now = new Date();
  const startDate = range === 'today'
    ? new Date(now.setHours(0,0,0,0)).toISOString()
    : range === 'week'
    ? new Date(now.getTime() - 7 * 86400000).toISOString()
    : new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const params = `startDate=${startDate}&endDate=${new Date().toISOString()}`;

  const { data: profitData } = useQuery({ queryKey: ['profit', range], queryFn: () => api.get(`/reports/profit?${params}`).then(r => r.data) });
  const { data: sellersData } = useQuery({ queryKey: ['best-sellers', range], queryFn: () => api.get(`/reports/best-sellers?${params}`).then(r => r.data) });
  const { data: invData } = useQuery({ queryKey: ['inventory-value'], queryFn: () => api.get('/reports/inventory-value').then(r => r.data) });
  const { data: salesData } = useQuery({ queryKey: ['sales-report', range], queryFn: () => api.get(`/reports/sales?${params}`).then(r => r.data) });

  const p = profitData || {};
  const chartData = (salesData?.sales || []).slice(-20).map(s => ({
    date: s.createdAt?.slice(0,10),
    total: parseFloat(s.total),
    profit: s.profit,
  }));

  return (
    <AppLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <div className="flex gap-2">
            {['today', 'week', 'month'].map(r => (
              <button key={r} onClick={() => setRange(r)} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${range === r ? 'bg-primary-600 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'}`}>
                {r === 'month' ? 'This Month' : r === 'week' ? 'This Week' : 'Today'}
              </button>
            ))}
          </div>
        </div>

        {/* P&L summary */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {[
            { label: 'Revenue', value: p.revenue, color: 'text-blue-600' },
            { label: 'Cost of Goods', value: p.cogs, color: 'text-gray-600' },
            { label: 'Gross Profit', value: p.grossProfit, color: 'text-green-600' },
            { label: 'Expenses', value: p.expenses, color: 'text-red-600' },
            { label: 'Net Profit', value: p.netProfit, color: 'text-primary-600' },
            { label: 'Net Margin', value: `${p.netMargin || 0}%`, color: 'text-purple-600', raw: true },
          ].map(stat => (
            <div key={stat.label} className="card text-center py-4 px-3">
              <p className={`text-xl font-bold ${stat.color}`}>{stat.raw ? stat.value : formatCurrency(stat.value || 0)}</p>
              <p className="text-xs text-gray-400 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
          {/* Sales chart */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">Revenue vs Profit</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={v => v.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={v => formatCurrency(v)} />
                <Bar dataKey="total" name="Revenue" fill="#6366f1" radius={[4,4,0,0]} />
                <Bar dataKey="profit" name="Profit" fill="#10b981" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Best sellers */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">Best Sellers</h2>
            {sellersData?.products?.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={sellersData.products} dataKey="totalQuantity" nameKey="product.name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${(percent*100).toFixed(0)}%`}>
                    {sellersData.products.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Legend formatter={(v) => v?.slice(0, 20)} />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-40 text-gray-400 text-sm">No sales data</div>
            )}
          </div>
        </div>

        {/* Inventory value */}
        {invData && (
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">Inventory Value</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-xl">
                <p className="text-lg font-bold text-gray-900">{invData.totalItems}</p>
                <p className="text-xs text-gray-500">Batches</p>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-xl">
                <p className="text-lg font-bold text-blue-700">{formatCurrency(invData.totalPurchaseValue)}</p>
                <p className="text-xs text-gray-500">Purchase Value</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-xl">
                <p className="text-lg font-bold text-green-700">{formatCurrency(invData.totalSellingValue)}</p>
                <p className="text-xs text-gray-500">Selling Value</p>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-xl">
                <p className="text-lg font-bold text-purple-700">{formatCurrency(invData.potentialProfit)}</p>
                <p className="text-xs text-gray-500">Potential Profit</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
