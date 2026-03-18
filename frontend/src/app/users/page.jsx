'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppLayout from '../../components/layout/AppLayout';
import api from '../../lib/api';
import { formatDate } from '../../lib/utils';
import toast from 'react-hot-toast';
import { Plus, Edit2, Key, X } from 'lucide-react';

function UserModal({ user, onClose }) {
  const qc = useQueryClient();
  const isEdit = !!user?.id;
  const [form, setForm] = useState({ name: user?.name||'', email: user?.email||'', phone: user?.phone||'', role: user?.role||'PHARMACIST', password: '', isActive: user?.isActive ?? true });

  const mutation = useMutation({
    mutationFn: (d) => isEdit ? api.put(`/users/${user.id}`, d) : api.post('/users', d),
    onSuccess: () => { toast.success(isEdit ? 'User updated' : 'User created'); qc.invalidateQueries(['users']); onClose(); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="font-bold text-lg">{isEdit ? 'Edit User' : 'New User'}</h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); mutation.mutate(form); }} className="p-6 space-y-4">
          <div><label className="label">Full Name *</label><input className="input" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
          <div><label className="label">Email *</label><input type="email" className="input" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
          <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
          <div>
            <label className="label">Role *</label>
            <select className="input" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
              <option value="PHARMACIST">Pharmacist</option>
              <option value="MANAGER">Manager</option>
              <option value="SUPERADMIN">Superadmin</option>
            </select>
          </div>
          {!isEdit && <div><label className="label">Password *</label><input type="password" className="input" required value={form.password} onChange={e => setForm({...form, password: e.target.value})} /></div>}
          {isEdit && (
            <div className="flex items-center gap-2">
              <input type="checkbox" id="active" checked={form.isActive} onChange={e => setForm({...form, isActive: e.target.checked})} />
              <label htmlFor="active" className="text-sm text-gray-700">Active account</label>
            </div>
          )}
          <div className="flex gap-3"><button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button><button type="submit" className="btn-primary flex-1" disabled={mutation.isPending}>{mutation.isPending ? 'Saving...' : 'Save'}</button></div>
        </form>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);

  const { data } = useQuery({ queryKey: ['users'], queryFn: () => api.get('/users').then(r => r.data) });

  const resetMutation = useMutation({
    mutationFn: ({ id, pwd }) => api.put(`/users/${id}/reset-password`, { newPassword: pwd }),
    onSuccess: () => toast.success('Password reset'),
    onError: () => toast.error('Failed to reset password'),
  });

  const handleReset = (user) => {
    const pwd = prompt(`Enter new password for ${user.name}:`);
    if (pwd && pwd.length >= 6) resetMutation.mutate({ id: user.id, pwd });
    else if (pwd) toast.error('Password must be at least 6 characters');
  };

  const roleBadge = (role) => ({
    SUPERADMIN: 'badge-danger',
    MANAGER: 'badge-warning',
    PHARMACIST: 'badge-info',
  }[role] || 'badge-info');

  return (
    <AppLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <button onClick={() => { setEditUser(null); setShowModal(true); }} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Add User
          </button>
        </div>

        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Name</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Email</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Phone</th>
                <th className="text-center px-4 py-3 text-gray-600 font-medium">Role</th>
                <th className="text-center px-4 py-3 text-gray-600 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Created</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {(data?.users || []).map(u => (
                <tr key={u.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold">
                        {u.name?.charAt(0).toUpperCase()}
                      </div>
                      <p className="font-medium text-gray-900">{u.name}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3 text-gray-600">{u.phone || '—'}</td>
                  <td className="px-4 py-3 text-center"><span className={roleBadge(u.role)}>{u.role}</span></td>
                  <td className="px-4 py-3 text-center"><span className={u.isActive ? 'badge-success' : 'badge-danger'}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => { setEditUser(u); setShowModal(true); }} className="text-primary-600 hover:text-primary-800"><Edit2 size={14} /></button>
                      <button onClick={() => handleReset(u)} className="text-yellow-600 hover:text-yellow-800"><Key size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {showModal && <UserModal user={editUser} onClose={() => { setShowModal(false); setEditUser(null); }} />}
    </AppLayout>
  );
}
