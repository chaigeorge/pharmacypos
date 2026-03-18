'use client';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import AppLayout from '../../components/layout/AppLayout';
import api from '../../lib/api';
import { formatCurrency, formatDate, expiryStatus } from '../../lib/utils';
import { useState, Suspense } from 'react';
import { Package, AlertTriangle } from 'lucide-react';

const FILTERS = [
  { value: '', label: 'All Stock' },
  { value: 'active', label: 'Active' },
  { value: 'expiring_soon', label: 'Expiring (30d)' },
  { value: 'expiring_60', label: 'Expiring (60d)' },
  { value: 'expired', label: 'Expired' },
  { value: 'depleted', label: 'Depleted' },
];

function InventoryContent() {
  const searchParams = useSearchParams();
  const defaultFilter = searchParams.get('filter') || '';
  const [filter, setFilter] = useState(defaultFilter);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['inventory', filter, page],
    queryFn: () => api.get(`/inventory?filter=${filter}&page=${page}&limit=30`).then(r => r.data),
  });

  return (
    <AppLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
            <p className="text-gray-500 text-sm mt-1">Stock by batch and expiry date</p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => { setFilter(f.value); setPage(1); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f.value
                  ? 'bg-primary-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="card p-0 overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            </div>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Product</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Batch</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Expiry</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">Qty</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">Buy Price</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">Sell Price</th>
                    <th className="text-center px-4 py-3 text-gray-600 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.entries || []).map(entry => {
                    const { label, color } = expiryStatus(entry.expiryDate);
                    return (
                      <tr key={entry.id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{entry.product?.name}</p>
                          <p className="text-xs text-gray-400">{entry.product?.barcode || '—'}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-600 font-mono text-xs">{entry.batchNumber}</td>
                        <td className="px-4 py-3">
                          <p className="text-gray-700">{formatDate(entry.expiryDate)}</p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-semibold ${entry.remainingQty <= (entry.product?.reorderLevel || 10) ? 'text-red-600' : 'text-gray-900'}`}>
                            {entry.remainingQty}
                          </span>
                          <span className="text-gray-400 text-xs"> / {entry.quantity}</span>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(entry.purchasePrice)}</td>
                        <td className="px-4 py-3 text-right font-medium">{formatCurrency(entry.sellingPrice)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`badge-${color}`}>{label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {(!data?.entries || data.entries.length === 0) && (
                <div className="text-center py-12 text-gray-400">
                  <Package size={32} className="mx-auto mb-2 opacity-30" />
                  <p>No inventory records found</p>
                </div>
              )}

              {data?.total > 30 && (
                <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
                  <p className="text-sm text-gray-500">Showing {(page-1)*30+1}–{Math.min(page*30, data.total)} of {data.total}</p>
                  <div className="flex gap-2">
                    <button onClick={() => setPage(p => p-1)} disabled={page === 1} className="btn-secondary text-xs px-3 py-1">Previous</button>
                    <button onClick={() => setPage(p => p+1)} disabled={page * 30 >= data.total} className="btn-secondary text-xs px-3 py-1">Next</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

export default function InventoryPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading inventory...</div>}>
      <InventoryContent />
    </Suspense>
  );
}
