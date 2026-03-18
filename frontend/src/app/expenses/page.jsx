'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppLayout from '../../components/layout/AppLayout';
import api from '../../lib/api';
import { formatCurrency, formatDate } from '../../lib/utils';
import toast from 'react-hot-toast';
import { Plus, Trash2 } from 'lucide-react';

const CATEGORIES = ['Rent', 'Electricity', 'Water', 'Internet', 'Transport', 'Supplies', 'Salaries', 'Equipment', 'Marketing', 'Other'];

export default function ExpensesPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0,10), category: '', amount: '', notes: '' });

  const { data } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => api.get('/expenses').then(r => r.data),
  });

  const addMutation = useMutation({
    mutationFn: (d) => api.post('/expenses', d),
    onSuccess: () => { toast.success('Expense recorded'); qc.invalidateQueries(['expenses']); setForm({ date: new Date().toISOString().slice(0,10), category: '', amount: '', notes: '' }); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/expenses/${id}`),
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries(['expenses']); },
  });

  return (
    <AppLayout>
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Expenses</h1>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Add form */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">Record Expense</h2>
            <form onSubmit={e => { e.preventDefault(); addMutation.mutate(form); }} className="space-y-3">
              <div>
                <label className="label">Date *</label>
                <input type="date" className="input" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required />
              </div>
              <div>
                <label className="label">Category *</label>
                <select className="input" value={form.category} onChange={e => setForm({...form, category: e.target.value})} required>
                  <option value="">Select category...</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Amount *</label>
                <input type="number" step="0.01" className="input" placeholder="0.00" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required />
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea className="input" rows={2} placeholder="Optional notes..." value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
              </div>
              <button type="submit" className="btn-primary w-full" disabled={addMutation.isPending}>
                <Plus size={16} className="inline mr-1" />
                {addMutation.isPending ? 'Saving...' : 'Add Expense'}
              </button>
            </form>
          </div>

          {/* Table */}
          <div className="xl:col-span-2">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="card text-center py-4">
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(data?.totalAmount || 0)}</p>
                <p className="text-xs text-gray-500 mt-1">Total Expenses</p>
              </div>
              <div className="card text-center py-4">
                <p className="text-2xl font-bold text-gray-900">{data?.total || 0}</p>
                <p className="text-xs text-gray-500 mt-1">Records</p>
              </div>
              <div className="card text-center py-4">
                <p className="text-2xl font-bold text-gray-900">
                  {data?.total ? formatCurrency((data.totalAmount || 0) / data.total) : '—'}
                </p>
                <p className="text-xs text-gray-500 mt-1">Avg per Entry</p>
              </div>
            </div>

            <div className="card p-0 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Date</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Category</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Notes</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">Amount</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.expenses || []).map(exp => (
                    <tr key={exp.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-600">{formatDate(exp.date)}</td>
                      <td className="px-4 py-3"><span className="badge-info">{exp.category}</span></td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{exp.notes || '—'}</td>
                      <td className="px-4 py-3 text-right font-semibold">{formatCurrency(exp.amount)}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => deleteMutation.mutate(exp.id)} className="text-red-400 hover:text-red-600">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
