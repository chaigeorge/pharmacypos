'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppLayout from '../../../components/layout/AppLayout';
import api from '../../../lib/api';
import { formatCurrency, formatDateTime } from '../../../lib/utils';
import { useAuthStore } from '../../../store/authStore';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Eye, XCircle } from 'lucide-react';

export default function SalesHistoryPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [selectedSale, setSelectedSale] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['sales', page],
    queryFn: () => api.get(`/sales?page=${page}&limit=20`).then(r => r.data),
  });

  const { data: saleDetail } = useQuery({
    queryKey: ['sale', selectedSale],
    queryFn: () => api.get(`/sales/${selectedSale}`).then(r => r.data),
    enabled: !!selectedSale,
  });

  const voidMutation = useMutation({
    mutationFn: (id) => api.put(`/sales/${id}/void`),
    onSuccess: () => {
      toast.success('Sale voided');
      qc.invalidateQueries(['sales']);
      setSelectedSale(null);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to void'),
  });

  const canVoid = user?.role === 'SUPERADMIN' || user?.role === 'MANAGER';

  return (
    <AppLayout>
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Sales History</h1>

        <div className="card p-0 overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Sale #</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Date</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Cashier</th>
                  <th className="text-center px-4 py-3 text-gray-600 font-medium">Items</th>
                  <th className="text-right px-4 py-3 text-gray-600 font-medium">Total</th>
                  <th className="text-center px-4 py-3 text-gray-600 font-medium">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {(data?.sales || []).map(sale => (
                  <tr key={sale.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{sale.saleNumber}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDateTime(sale.createdAt)}</td>
                    <td className="px-4 py-3 text-gray-700">{sale.cashier?.name}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{sale._count?.items}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatCurrency(sale.total)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={
                        sale.status === 'COMPLETED' ? 'badge-success' :
                        sale.status === 'VOIDED' ? 'badge-danger' : 'badge-warning'
                      }>{sale.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setSelectedSale(sale.id)} className="text-primary-600 hover:text-primary-800">
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Sale detail modal */}
        {selectedSale && saleDetail && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="font-bold text-lg">Sale Detail</h2>
                <button onClick={() => setSelectedSale(null)} className="text-gray-400 hover:text-gray-600">
                  <XCircle size={20} />
                </button>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                  <div><p className="text-gray-500">Sale #</p><p className="font-mono font-medium">{saleDetail.sale?.saleNumber}</p></div>
                  <div><p className="text-gray-500">Date</p><p>{formatDateTime(saleDetail.sale?.createdAt)}</p></div>
                  <div><p className="text-gray-500">Cashier</p><p>{saleDetail.sale?.cashier?.name}</p></div>
                  <div><p className="text-gray-500">Status</p>
                    <span className={saleDetail.sale?.status === 'COMPLETED' ? 'badge-success' : 'badge-danger'}>
                      {saleDetail.sale?.status}
                    </span>
                  </div>
                </div>

                <table className="w-full text-sm mb-4">
                  <thead><tr className="bg-gray-50"><th className="text-left p-2">Product</th><th className="text-center p-2">Qty</th><th className="text-right p-2">Total</th></tr></thead>
                  <tbody>
                    {saleDetail.sale?.items?.map(item => (
                      <tr key={item.id} className="border-b">
                        <td className="p-2">{item.product?.name}</td>
                        <td className="p-2 text-center">{item.quantity}</td>
                        <td className="p-2 text-right">{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex justify-between font-bold text-lg border-t pt-3">
                  <span>Total</span>
                  <span className="text-primary-600">{formatCurrency(saleDetail.sale?.total)}</span>
                </div>
              </div>

              {canVoid && saleDetail.sale?.status === 'COMPLETED' && (
                <div className="px-6 pb-6">
                  <button
                    onClick={() => voidMutation.mutate(selectedSale)}
                    disabled={voidMutation.isPending}
                    className="btn-danger w-full"
                  >
                    Void This Sale
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
