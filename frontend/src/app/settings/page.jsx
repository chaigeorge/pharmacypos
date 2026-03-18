'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import AppLayout from '../../components/layout/AppLayout';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { Save } from 'lucide-react';

export default function SettingsPage() {
  const [form, setForm] = useState({});

  const { data, isLoading } = useQuery({ queryKey: ['settings'], queryFn: () => api.get('/settings').then(r => r.data) });

  useEffect(() => {
    if (data?.settings) setForm(data.settings);
  }, [data]);

  const mutation = useMutation({
    mutationFn: (d) => api.put('/settings', d),
    onSuccess: () => toast.success('Settings saved'),
    onError: () => toast.error('Failed to save settings'),
  });

  const fields = [
    { key: 'pharmacy_name', label: 'Pharmacy Name', type: 'text' },
    { key: 'currency', label: 'Currency Code', type: 'text', placeholder: 'TZS' },
    { key: 'currency_symbol', label: 'Currency Symbol', type: 'text', placeholder: 'TSh' },
    { key: 'low_stock_threshold', label: 'Low Stock Alert Level', type: 'number' },
    { key: 'expiry_alert_days', label: 'Expiry Alert (days before)', type: 'number' },
    { key: 'tax_enabled', label: 'Enable Tax', type: 'checkbox' },
    { key: 'tax_rate', label: 'Tax Rate (%)', type: 'number' },
  ];

  return (
    <AppLayout>
      <div className="p-8 max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">System Settings</h1>

        {isLoading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
        ) : (
          <div className="card space-y-5">
            {fields.map(f => (
              <div key={f.key}>
                <label className="label">{f.label}</label>
                {f.type === 'checkbox' ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={f.key}
                      checked={form[f.key] === 'true'}
                      onChange={e => setForm({...form, [f.key]: String(e.target.checked)})}
                    />
                    <label htmlFor={f.key} className="text-sm text-gray-600">Enabled</label>
                  </div>
                ) : (
                  <input
                    type={f.type}
                    className="input max-w-xs"
                    placeholder={f.placeholder}
                    value={form[f.key] || ''}
                    onChange={e => setForm({...form, [f.key]: e.target.value})}
                  />
                )}
              </div>
            ))}

            <div className="pt-2 border-t">
              <button
                onClick={() => mutation.mutate(form)}
                disabled={mutation.isPending}
                className="btn-primary flex items-center gap-2"
              >
                <Save size={16} />
                {mutation.isPending ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
