"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "../../components/layout/AppLayout";
import api from "../../lib/api";
import { formatCurrency } from "../../lib/utils";
import toast from "react-hot-toast";
import { Plus, Search, Edit2, X } from "lucide-react";

function ProductModal({ product, onClose, categories, suppliers }) {
  const qc = useQueryClient();
  const isEdit = !!product?.id;
  const [form, setForm] = useState({
    name: product?.name || '',
    barcode: product?.barcode || '',
    categoryId: product?.categoryId || '',
    supplierId: product?.supplierId || '',
    unitType: product?.unitType || 'tablet',
    unitsPerBox: product?.unitsPerBox || 1,
    reorderLevel: product?.reorderLevel || 10,
    requiresPrescription: product?.requiresPrescription || false,
  });

  const mutation = useMutation({
    mutationFn: (data) => isEdit ? api.put(`/products/${product.id}`, data) : api.post('/products', data),
    onSuccess: () => {
      toast.success(isEdit ? 'Product updated' : 'Product created');
      qc.invalidateQueries(['products']);
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to save product'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
          <h2 className="font-bold text-lg">{isEdit ? 'Edit Product' : 'Add New Product'}</h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Product Name *</label>
              <input className="input" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            </div>
            <div>
              <label className="label">Barcode</label>
              <input className="input" value={form.barcode} onChange={e => setForm({...form, barcode: e.target.value})} />
            </div>
            <div>
              <label className="label">Unit Type</label>
              <select className="input" value={form.unitType} onChange={e => setForm({...form, unitType: e.target.value})}>
                {['tablet','capsule','bottle','vial','sachet','tube','box','piece'].map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Category</label>
              <select className="input" value={form.categoryId} onChange={e => setForm({...form, categoryId: e.target.value})}>
                <option value="">None</option>
                {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Supplier</label>
              <select className="input" value={form.supplierId} onChange={e => setForm({...form, supplierId: e.target.value})}>
                <option value="">None</option>
                {suppliers?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Units Per Box</label>
              <input type="number" className="input" value={form.unitsPerBox} onChange={e => setForm({...form, unitsPerBox: e.target.value})} />
            </div>
            <div>
              <label className="label">Reorder Level</label>
              <input type="number" className="input" value={form.reorderLevel} onChange={e => setForm({...form, reorderLevel: e.target.value})} />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input type="checkbox" id="rx" checked={form.requiresPrescription} onChange={e => setForm({...form, requiresPrescription: e.target.checked})} />
              <label htmlFor="rx" className="text-sm text-gray-700">Requires prescription</label>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : 'Save Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [uploading, setUploading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['products', search],
    queryFn: () => api.get(`/products?search=${search}&limit=50`).then(r => r.data),
  });

  const { data: catData } = useQuery({ queryKey: ['categories'], queryFn: () => api.get('/categories').then(r => r.data) });
  const { data: supData } = useQuery({ queryKey: ['suppliers'], queryFn: () => api.get('/suppliers').then(r => r.data) });

  const qc = useQueryClient();

  const handleBulkUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const text = await file.text();
      const rows = text
        .split('\n')
        .map(r => r.trim())
        .filter(Boolean);

      const [headerLine, ...dataLines] = rows;
      const headers = headerLine.split(',').map(h => h.trim().toLowerCase());

      const products = dataLines.map((line) => {
        const cells = line.split(',');
        const obj = {};
        headers.forEach((h, idx) => {
          obj[h] = cells[idx]?.trim();
        });
        return {
          name: obj.name,
          barcode: obj.barcode,
          unitType: obj.unittype,
          unitsPerBox: obj.unitsperbox,
          reorderLevel: obj.reorderlevel,
          requiresPrescription: obj.requiresprescription === 'true',
        };
      }).filter(p => p.name);

      await api.post('/products/bulk', { products });
      toast.success(`Imported ${products.length} products`);
      qc.invalidateQueries(['products']);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to import products');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  return (
    <AppLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <div className="flex gap-3">
            <label className="btn-secondary cursor-pointer text-sm flex items-center gap-2">
              {uploading ? 'Importing...' : 'Import CSV'}
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleBulkUpload}
                disabled={uploading}
              />
            </label>
            <button onClick={() => { setEditProduct(null); setShowModal(true); }} className="btn-primary flex items-center gap-2">
              <Plus size={16} /> Add Product
            </button>
          </div>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
          <input className="input pl-9 max-w-sm" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Name</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Barcode</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Category</th>
                <th className="text-right px-4 py-3 text-gray-600 font-medium">Stock</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {(data?.products || []).map(p => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{p.name}</p>
                    {p.requiresPrescription && <span className="text-xs text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">Rx</span>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.barcode || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{p.category?.name || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-semibold ${p.totalStock <= p.reorderLevel ? 'text-red-600' : 'text-gray-900'}`}>
                      {p.totalStock}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(p.purchasePrice)}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatCurrency(p.sellingPrice)}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => { setEditProduct(p); setShowModal(true); }} className="text-primary-600 hover:text-primary-800">
                      <Edit2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {isLoading && <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>}
        </div>
      </div>

      {showModal && (
        <ProductModal
          product={editProduct}
          onClose={() => { setShowModal(false); setEditProduct(null); }}
          categories={catData?.categories}
          suppliers={supData?.suppliers}
        />
      )}
    </AppLayout>
  );
}
