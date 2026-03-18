'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import api from '../../lib/api';
import { useSocket } from '../../hooks/useSocket';
import { useAuthStore } from '../../store/authStore';
import { formatCurrency } from '../../lib/utils';
import toast from 'react-hot-toast';
import { Search, Trash2, Plus, Minus, QrCode, ShoppingCart, CheckCircle, Smartphone } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export default function SalesPage() {
  const { user } = useAuthStore();
  const { getSocket } = useSocket();
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [sessionId] = useState(() => uuidv4());
  const [mobileConnected, setMobileConnected] = useState(false);
  const searchRef = useRef(null);
  const searchTimeout = useRef(null);

  // Register POS session with Socket.IO
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.emit('pos:register', { sessionId, userId: user?.id });

    // Receive barcode from mobile
    socket.on('scan:received', async ({ barcode }) => {
      toast.success(`📱 Scanned: ${barcode}`, { duration: 1500 });
      await addByBarcode(barcode);
    });

    return () => {
      socket.emit('pos:unregister', { sessionId });
      socket.off('scan:received');
    };
  }, [sessionId, user]);

  // USB barcode scanner — listens for rapid keyboard input
  useEffect(() => {
    let buffer = '';
    let timer = null;

    const handleKeyDown = (e) => {
      if (document.activeElement === searchRef.current) return;
      if (e.key === 'Enter' && buffer.length > 3) {
        addByBarcode(buffer);
        buffer = '';
        return;
      }
      if (e.key.length === 1) {
        buffer += e.key;
        clearTimeout(timer);
        timer = setTimeout(() => { buffer = ''; }, 200);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart]);

  const addByBarcode = useCallback(async (barcode) => {
    try {
      const { data } = await api.get(`/products/barcode/${barcode}`);
      addToCart(data.product);
    } catch {
      toast.error(`Product not found: ${barcode}`);
    }
  }, []);

  const addToCart = (product) => {
    if (product.totalStock <= 0) {
      toast.error(`${product.name} is out of stock`);
      return;
    }
    setCart((prev) => {
      const existing = prev.find(i => i.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.totalStock) {
          toast.error('Not enough stock');
          return prev;
        }
        return prev.map(i =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, {
        productId: product.id,
        name: product.name,
        unitPrice: parseFloat(product.sellingPrice),
        quantity: 1,
        maxStock: product.totalStock,
        unitType: product.unitType,
      }];
    });
    setSearch('');
    setSearchResults([]);
  };

  const updateQty = (productId, delta) => {
    setCart((prev) => prev.map(i => {
      if (i.productId !== productId) return i;
      const newQty = i.quantity + delta;
      if (newQty <= 0) return null;
      if (newQty > i.maxStock) { toast.error('Not enough stock'); return i; }
      return { ...i, quantity: newQty };
    }).filter(Boolean));
  };

  const removeItem = (productId) => setCart(prev => prev.filter(i => i.productId !== productId));

  const subtotal = cart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const total = Math.max(0, subtotal - parseFloat(discount || 0));

  const handleSearch = async (val) => {
    setSearch(val);
    clearTimeout(searchTimeout.current);
    if (val.trim().length < 2) { setSearchResults([]); return; }
    setSearching(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const { data } = await api.get(`/products?search=${encodeURIComponent(val)}&limit=8`);
        setSearchResults(data.products);
      } catch { /* ignore */ }
      setSearching(false);
    }, 300);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return toast.error('Cart is empty');
    setCompleting(true);
    try {
      await api.post('/sales', {
        items: cart.map(i => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice })),
        discount,
      });
      toast.success('Sale completed!');
      setCart([]);
      setDiscount(0);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Checkout failed');
    } finally {
      setCompleting(false);
    }
  };

  const mobileUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/scan?session=${sessionId}`;

  return (
    <AppLayout>
      <div className="flex h-full">
        {/* Left — product search */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <ShoppingCart size={20} /> Point of Sale
            </h1>
            <button
              onClick={() => {
                navigator.clipboard.writeText(mobileUrl);
                toast.success('Mobile scanner URL copied!');
              }}
              className="flex items-center gap-2 text-sm bg-primary-50 text-primary-700 border border-primary-200 px-3 py-1.5 rounded-lg hover:bg-primary-100 transition"
            >
              <Smartphone size={14} />
              Mobile Scanner
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input
              ref={searchRef}
              className="input pl-9"
              placeholder="Search product name or barcode..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
            />
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-20 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 overflow-hidden">
                {searchResults.map(p => (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 text-left border-b border-gray-50 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{p.name}</p>
                      <p className="text-xs text-gray-400">{p.barcode || 'No barcode'} · Stock: {p.totalStock} {p.unitType}s</p>
                    </div>
                    <p className="text-sm font-semibold text-primary-600">{formatCurrency(p.sellingPrice)}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Mobile scanner hint */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 flex items-start gap-2">
            <QrCode size={14} className="mt-0.5 flex-shrink-0" />
            <span>
              <strong>USB scanner:</strong> Just scan — it auto-adds.&nbsp;
              <strong>Mobile:</strong> Open <code className="bg-blue-100 px-1 rounded">/scan?session={sessionId.slice(0,8)}...</code> on your phone.
            </span>
          </div>

          {/* Cart table */}
          {cart.length > 0 && (
            <div className="card overflow-hidden p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Product</th>
                    <th className="text-center px-4 py-3 text-gray-600 font-medium">Qty</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">Price</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">Total</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map(item => (
                    <tr key={item.productId} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-xs text-gray-400">{item.unitType}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => updateQty(item.productId, -1)} className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                            <Minus size={12} />
                          </button>
                          <span className="w-8 text-center font-semibold">{item.quantity}</span>
                          <button onClick={() => updateQty(item.productId, 1)} className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                            <Plus size={12} />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(item.unitPrice)}</td>
                      <td className="px-4 py-3 text-right font-semibold">{formatCurrency(item.unitPrice * item.quantity)}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => removeItem(item.productId)} className="text-red-400 hover:text-red-600">
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {cart.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <ShoppingCart size={48} className="mb-3 opacity-30" />
              <p className="text-sm">Cart is empty</p>
              <p className="text-xs mt-1">Search for a product or scan a barcode</p>
            </div>
          )}
        </div>

        {/* Right — checkout panel */}
        <div className="w-80 bg-white border-l border-gray-200 p-6 flex flex-col">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Order Summary</h2>

          <div className="flex-1 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Discount</span>
              <input
                type="number"
                min="0"
                className="w-28 border border-gray-300 rounded-lg px-2 py-1 text-right text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="border-t pt-3 flex justify-between">
              <span className="text-base font-bold text-gray-900">Total</span>
              <span className="text-xl font-bold text-primary-600">{formatCurrency(total)}</span>
            </div>
          </div>

          <div className="mt-auto space-y-3">
            <div className="text-xs text-gray-400 text-center">
              {cart.length} item{cart.length !== 1 ? 's' : ''} in cart
            </div>
            <button
              onClick={handleCheckout}
              disabled={cart.length === 0 || completing}
              className="btn-primary w-full py-3 text-base flex items-center justify-center gap-2"
            >
              <CheckCircle size={18} />
              {completing ? 'Processing...' : 'Complete Sale'}
            </button>
            <button
              onClick={() => { setCart([]); setDiscount(0); }}
              disabled={cart.length === 0}
              className="btn-secondary w-full py-2 text-sm"
            >
              Clear Cart
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
