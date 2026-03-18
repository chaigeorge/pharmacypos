'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppLayout from '../../components/layout/AppLayout';
import api from '../../lib/api';
import { formatCurrency, formatDate } from '../../lib/utils';
import toast from 'react-hot-toast';
import { Plus, Trash2, PackagePlus, Search } from 'lucide-react';

const emptyItem = () => ({ productId: '', productName: '', batchNumber: '', expiryDate: '', quantity: 1, unitsPerBox: 1, purchasePrice: '', sellingPrice: '' });

export default function PurchasesPage() {
  const qc = useQueryClient();
  const [items, setItems] = useState([emptyItem()]);
  const [supplierId, setSupplierId] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [productSearches, setProductSearches] = useState({});
  const [searchResults, setSearchResults] = useState({});

  const { data: supData } = useQuery({ queryKey: ['suppliers'], queryFn: () => api.get('/suppliers').then(r => r.data) });
  const { data: purchasesData } = useQuery({ queryKey: ['purchases'], queryFn: () => api.get('/purchases').then(r => r.data) });

  const mutation = useMutation({
    mutationFn: (data) => api.post('/purchases', data),
    onSuccess: () => {
      toast.success('Stock received successfully!');
      setItems([emptyItem()]);
      setSupplierId('');
      setInvoiceNo('');
      qc.invalidateQueries(['purchases']);
      qc.invalidateQueries(['inventory']);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to receive stock'),
  });

  const searchProduct = async (idx, val) => {
    setProductSearches(p => ({...p, [idx]: val}));
    if (val.length < 2) { setSearchResults(p => ({...p, [idx]: []})); return; }
    const { data } = await api.get(`/products?search=${val}&limit=6`);
    setSearchResults(p => ({...p, [idx]: data.products}));
  };

  const selectProduct = (idx, product) => {
    setItems(prev => prev.map((item, i) => i === idx ? {
      ...item,
      productId: product.id,
      productName: product.name,
      unitsPerBox: product.unitsPerBox,
      purchasePrice: product.purchasePrice,
      sellingPrice: product.sellingPrice,
    } : item));
    setProductSearches(p => ({...p, [idx]: product.name}));
    setSearchResults(p => ({...p, [idx]: []}));
  };

  const updateItem = (idx, field, value) => setItems(prev => prev.map((item, i) => i === idx ? {...item, [field]: value} : item));
  const addItem = () => setItems(prev => [...prev, emptyItem()]);
  const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = (e) => {
    e.preventDefault();
    const valid = items.every(i => i.productId && i.batchNumber && i.expiryDate && i.quantity && i.purchasePrice);
    if (!valid) return toast.error('Please fill all required fields for each item');
    mutation.mutate({ supplierId, invoiceNo, items });
  };

  return (
    <AppLayout>
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <PackagePlus size={22} /> Receive Stock
        </h1>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Receive form */}
          <div className="xl:col-span-2">
            <form onSubmit={handleSubmit} className="card space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Supplier (optional)</label>
                  <select className="input" value={supplierId} onChange={e => setSupplierId(e.target.value)}>
                    <option value="">No supplier</option>
                    {supData?.suppliers?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Invoice Number</label>
                  <input className="input" placeholder="INV-001" value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} />
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-800">Stock Items</h3>
                  <button type="button" onClick={addItem} className="text-primary-600 text-sm flex items-center gap-1 hover:text-primary-800">
                    <Plus size={14} /> Add Item
                  </button>
                </div>

                {items.map((item, idx) => (
                  <div key={idx} className="p-4 bg-gray-50 rounded-xl mb-3 space-y-3">
                    <div className="flex justify-between items-start">
                      <p className="text-sm font-medium text-gray-700">Item {idx + 1}</p>
                      {items.length > 1 && (
                        <button type="button" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    {/* Product search */}
                    <div className="relative">
                      <label className="label">Product *</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={14} />
                        <input
                          className="input pl-8"
                          placeholder="Search product..."
                          value={productSearches[idx] || ''}
                          onChange={e => searchProduct(idx, e.target.value)}
                        />
                      </div>
                      {(searchResults[idx] || []).length > 0 && (
                        <div className="absolute z-10 bg-white border rounded-xl shadow-lg mt-1 w-full">
                          {searchResults[idx].map(p => (
                            <button key={p.id} type="button" onClick={() => selectProduct(idx, p)}
                              className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b last:border-0">
                              {p.name} <span className="text-gray-400 text-xs">({p.barcode})</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <div>
                        <label className="label">Batch # *</label>
                        <input className="input" placeholder="BATCH001" value={item.batchNumber} onChange={e => updateItem(idx, 'batchNumber', e.target.value)} required />
                      </div>
                      <div>
                        <label className="label">Expiry Date *</label>
                        <input type="date" className="input" value={item.expiryDate} onChange={e => updateItem(idx, 'expiryDate', e.target.value)} required />
                      </div>
                      <div>
                        <label className="label">Qty (boxes) *</label>
                        <input type="number" min="1" className="input" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} required />
                      </div>
                      <div>
                        <label className="label">Units/Box</label>
                        <input type="number" className="input" value={item.unitsPerBox} onChange={e => updateItem(idx, 'unitsPerBox', e.target.value)} />
                      </div>
                      <div>
                        <label className="label">Buy Price *</label>
                        <input type="number" step="0.01" className="input" value={item.purchasePrice} onChange={e => updateItem(idx, 'purchasePrice', e.target.value)} required />
                      </div>
                      <div>
                        <label className="label">Sell Price</label>
                        <input type="number" step="0.01" className="input" value={item.sellingPrice} onChange={e => updateItem(idx, 'sellingPrice', e.target.value)} />
                      </div>
                    </div>
                    {item.quantity && item.unitsPerBox && (
                      <p className="text-xs text-green-700 bg-green-50 px-3 py-1.5 rounded-lg">
                        → {item.quantity} × {item.unitsPerBox} = <strong>{item.quantity * item.unitsPerBox} units</strong> will be added to stock
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <button type="submit" className="btn-primary w-full py-3" disabled={mutation.isPending}>
                {mutation.isPending ? 'Saving...' : 'Confirm Stock Receipt'}
              </button>
            </form>
          </div>

          {/* Recent purchases */}
          <div>
            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-4">Recent Purchases</h2>
              <div className="space-y-3">
                {(purchasesData?.purchases || []).slice(0, 8).map(p => (
                  <div key={p.id} className="flex justify-between text-sm border-b pb-2 last:border-0">
                    <div>
                      <p className="font-medium text-gray-800">{p.invoiceNo || 'No invoice'}</p>
                      <p className="text-gray-400 text-xs">{p.supplier?.name || 'No supplier'} · {p._count?.stockEntries} items</p>
                      <p className="text-gray-400 text-xs">{formatDate(p.createdAt)}</p>
                    </div>
                    <p className="font-semibold text-gray-900">{formatCurrency(p.totalAmount)}</p>
                  </div>
                ))}
                {(!purchasesData?.purchases || purchasesData.purchases.length === 0) && (
                  <p className="text-sm text-gray-400 text-center py-4">No purchases yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
