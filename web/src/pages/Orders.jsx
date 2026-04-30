import { useState, useEffect } from 'react';
import { 
  Search, Plus, Eye, Edit2, Loader2, X, Check, 
  ShoppingBag, Calendar, Clock, User, Phone, CreditCard 
} from 'lucide-react';
import axios from '/api/axios';

// ----------------------------------------------------------------------
// MOCK DATA (will be replaced with real API later)
// ----------------------------------------------------------------------

// Mock products – matches your menu table
const MOCK_PRODUCTS = [
  { id: 1, name: 'Gray Cap', base_price: 80.00, image_url: null, category: 'Cap' },
  { id: 2, name: 'Woman Dress', base_price: 80.00, image_url: null, category: 'Fashion' },
  { id: 3, name: 'Olive Lather', base_price: 136.00, image_url: null, category: 'Hand Bag' },
  { id: 4, name: 'Headphone', base_price: 115.00, image_url: null, category: 'Electronic' },
  { id: 5, name: 'Kids Shoe', base_price: 75.00, image_url: null, category: 'Shoe' },
  { id: 6, name: 'Money Bag', base_price: 550.00, image_url: null, category: 'Wallet' },
  { id: 7, name: 'Eye glass', base_price: 95.00, image_url: null, category: 'Sunglass' },
  { id: 8, name: 'Half hand t-shirt', base_price: 347.00, image_url: null, category: 'T-Shirt' },
];

// Mock orders – matches your `orders` and `order_items` tables
const MOCK_ORDERS = [
  {
    id: 1001,
    order_number: 'ORD-1001',
    customer_name: 'John Doe',
    customer_phone: '09171234567',
    order_type: 'walk_in',
    order_date: '2025-04-20T10:30:00',
    pickup_date: '2025-04-22',
    pickup_time: '14:00',
    subtotal: 250.00,
    discount_amount: 0,
    total_amount: 250.00,
    payment_status: 'paid',
    status: 'completed',
    notes: 'Please add a birthday message',
    items: [
      { id: 101, product_id: 1, product_name: 'Gray Cap', quantity: 2, unit_price: 80.00, total_price: 160.00 },
      { id: 102, product_id: 5, product_name: 'Kids Shoe', quantity: 1, unit_price: 75.00, total_price: 75.00 },
    ]
  },
  {
    id: 1002,
    order_number: 'ORD-1002',
    customer_name: 'Jane Smith',
    customer_phone: '09876543210',
    order_type: 'online',
    order_date: '2025-04-19T15:45:00',
    pickup_date: '2025-04-23',
    pickup_time: '10:00',
    subtotal: 450.00,
    discount_amount: 0,
    total_amount: 450.00,
    payment_status: 'unpaid',
    status: 'pending',
    notes: '',
    items: [
      { id: 103, product_id: 2, product_name: 'Woman Dress', quantity: 1, unit_price: 80.00, total_price: 80.00 },
      { id: 104, product_id: 4, product_name: 'Headphone', quantity: 2, unit_price: 115.00, total_price: 230.00 },
      { id: 105, product_id: 6, product_name: 'Money Bag', quantity: 1, unit_price: 550.00, total_price: 550.00 },
    ]
  },
  {
    id: 1003,
    order_number: 'ORD-1003',
    customer_name: 'Maria Santos',
    customer_phone: '09123456789',
    order_type: 'walk_in',
    order_date: '2025-04-18T09:15:00',
    pickup_date: '2025-04-21',
    pickup_time: '16:30',
    subtotal: 180.00,
    discount_amount: 0,
    total_amount: 180.00,
    payment_status: 'paid',
    status: 'preparing',
    notes: 'Leave at reception',
    items: [
      { id: 106, product_id: 3, product_name: 'Olive Lather', quantity: 1, unit_price: 136.00, total_price: 136.00 },
      { id: 107, product_id: 7, product_name: 'Eye glass', quantity: 1, unit_price: 95.00, total_price: 95.00 },
    ]
  },
];

// All possible order statuses (matches your `orders.status` ENUM)
const ALL_STATUSES = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'];
// Status background colors (Sage Green palette)
const STATUS_COLORS = {
  pending: '#A6A29A',
  confirmed: '#4F5F52',
  preparing: '#F2EDE4',
  ready: '#FFF3D9',
  completed: '#4F5F52',
  cancelled: '#A6A29A',
};
// Payment status styles
const PAYMENT_STYLES = {
  unpaid: 'bg-warm-gray/20 text-warm-gray',
  partially_paid: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  refunded: 'bg-red-100 text-red-800',
};

// Helper: format date
const fmtDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-PH');
};
const fmtTime = (time) => time ? time.slice(0,5) : '';

// ----------------------------------------------------------------------
// Main Component
// ----------------------------------------------------------------------
export default function Orders() {
  // ---------- State ----------
  const [orders, setOrders] = useState(MOCK_ORDERS);
  const [products] = useState(MOCK_PRODUCTS);
  const [search, setSearch] = useState('');
  const [statusFilter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [viewOrder, setViewOrder] = useState(null);
  const [showWalkIn, setShowWalkIn] = useState(false);
  const [updatingId, setUpdId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [walkForm, setWalkForm] = useState({
    customer_name: '',
    customer_phone: '',
    product_id: '',
    quantity: 1,
    pickup_date: '',
    notes: ''
  });

  // (Optional) Later replace with real API call
  const fetchOrders = async () => {
    setLoading(true);
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    setOrders(MOCK_ORDERS);
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Filter orders
  const filtered = orders.filter(order => {
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesSearch = !search || 
      order.order_number.toLowerCase().includes(search.toLowerCase()) ||
      order.customer_name.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Mock update status (will be replaced with API)
  const updateStatus = async (orderId, newStatus) => {
    setUpdId(orderId);
    await new Promise(resolve => setTimeout(resolve, 300)); // simulate network
    setOrders(prev => prev.map(o => 
      o.id === orderId ? { ...o, status: newStatus } : o
    ));
    setUpdId(null);
  };

  // Mock create walk-in order
  const createWalkIn = async () => {
    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    const selectedProduct = products.find(p => p.id === +walkForm.product_id);
    if (!selectedProduct) {
      setSaving(false);
      return;
    }
    const qty = +walkForm.quantity;
    const total = selectedProduct.base_price * qty;
    const newOrder = {
      id: Date.now(),
      order_number: `ORD-WI-${Date.now()}`,
      customer_name: walkForm.customer_name || 'Walk-in Customer',
      customer_phone: walkForm.customer_phone || '',
      order_type: 'walk_in',
      order_date: new Date().toISOString(),
      pickup_date: walkForm.pickup_date || new Date().toISOString().slice(0,10),
      pickup_time: '',
      subtotal: total,
      discount_amount: 0,
      total_amount: total,
      payment_status: 'unpaid',
      status: 'pending',
      notes: walkForm.notes,
      items: [{
        id: Date.now(),
        product_id: selectedProduct.id,
        product_name: selectedProduct.name,
        quantity: qty,
        unit_price: selectedProduct.base_price,
        total_price: total,
      }]
    };
    setOrders(prev => [newOrder, ...prev]);
    setShowWalkIn(false);
    setWalkForm({ customer_name: '', customer_phone: '', product_id: '', quantity: 1, pickup_date: '', notes: '' });
    setSaving(false);
  };

  return (
    <div className="bg-[#F2EDE4] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#4F5F52]">Order Management</h1>
            <p className="text-[#A6A29A] text-sm">View, search, and update orders</p>
          </div>
          <button
            onClick={() => setShowWalkIn(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#4F5F52] text-white rounded-lg hover:bg-[#3e4c42] transition"
          >
            <Plus size={18} /> New Walk-in Order
          </button>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A6A29A]" />
            <input
              type="text"
              placeholder="Search order # or customer name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-[#A6A29A]/30 bg-white text-[#4F5F52] focus:outline-none focus:ring-2 focus:ring-[#4F5F52]/20"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 rounded-xl border border-[#A6A29A]/30 bg-white text-[#4F5F52] focus:outline-none"
          >
            <option value="all">All Status</option>
            {ALL_STATUSES.map(s => (
              <option key={s} value={s} className="capitalize">{s}</option>
            ))}
          </select>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="w-6 h-6 animate-spin text-[#4F5F52]" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-[#FFF3D9]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#4F5F52] uppercase">Order #</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#4F5F52] uppercase">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#4F5F52] uppercase">Order Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#4F5F52] uppercase">Pickup</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#4F5F52] uppercase">Total</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#4F5F52] uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#4F5F52] uppercase">Payment</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-[#4F5F52] uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center py-12 text-[#A6A29A]">No orders found</td>
                    </tr>
                  ) : (
                    filtered.map(order => (
                      <tr key={order.id} className="hover:bg-[#F2EDE4]/40 transition">
                        <td className="px-6 py-4 font-mono text-sm text-[#4F5F52]">{order.order_number}</td>
                        <td className="px-6 py-4">
                          <p className="font-medium text-gray-800">{order.customer_name}</p>
                          {order.customer_phone && <p className="text-xs text-[#A6A29A]">{order.customer_phone}</p>}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{fmtDate(order.order_date)}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {fmtDate(order.pickup_date)} {order.pickup_time && `at ${order.pickup_time}`}
                        </td>
                        <td className="px-6 py-4 font-semibold text-[#4F5F52]">₱{order.total_amount.toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <select
                            value={order.status}
                            onChange={(e) => updateStatus(order.id, e.target.value)}
                            disabled={updatingId === order.id}
                            className="text-xs text-white font-semibold px-2 py-1 rounded-full border-0 cursor-pointer"
                            style={{ backgroundColor: STATUS_COLORS[order.status] || '#A6A29A' }}
                          >
                            {ALL_STATUSES.map(s => (
                              <option key={s} value={s} style={{ background: 'white', color: '#333' }} className="capitalize">
                                {s}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${PAYMENT_STYLES[order.payment_status] || 'bg-gray-100 text-gray-600'}`}>
                            {order.payment_status?.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => setViewOrder(order)}
                            className="p-1.5 rounded-lg hover:bg-[#F2EDE4] text-[#4F5F52] transition"
                          >
                            <Eye size={18} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ---------- View Order Modal ---------- */}
      {viewOrder && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-[#4F5F52]">{viewOrder.order_number}</h3>
                <p className="text-sm text-[#A6A29A] capitalize">{viewOrder.order_type?.replace('_', ' ')} order</p>
              </div>
              <button onClick={() => setViewOrder(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-5">
              {/* Customer & Pickup Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-2">
                  <User size={18} className="text-[#A6A29A] mt-0.5" />
                  <div>
                    <p className="text-xs text-[#A6A29A]">Customer</p>
                    <p className="font-medium text-gray-800">{viewOrder.customer_name}</p>
                    {viewOrder.customer_phone && (
                      <p className="text-sm text-gray-500">{viewOrder.customer_phone}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Calendar size={18} className="text-[#A6A29A] mt-0.5" />
                  <div>
                    <p className="text-xs text-[#A6A29A]">Pickup Date</p>
                    <p className="font-medium text-gray-800">{fmtDate(viewOrder.pickup_date)}</p>
                    {viewOrder.pickup_time && <p className="text-sm text-gray-500">{viewOrder.pickup_time}</p>}
                  </div>
                </div>
              </div>

              {/* Items */}
              <div>
                <h4 className="font-semibold text-[#4F5F52] mb-2">Items</h4>
                <div className="space-y-2">
                  {viewOrder.items.map(item => (
                    <div key={item.id} className="flex justify-between items-center p-3 bg-[#F2EDE4]/40 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-800">{item.product_name}</p>
                        <p className="text-xs text-[#A6A29A]">×{item.quantity} @ ₱{item.unit_price.toLocaleString()}</p>
                      </div>
                      <p className="font-semibold text-[#4F5F52]">₱{item.total_price.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="border-t border-gray-100 pt-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span>₱{viewOrder.subtotal.toLocaleString()}</span>
                </div>
                {viewOrder.discount_amount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount</span>
                    <span>- ₱{viewOrder.discount_amount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg text-[#4F5F52] pt-1">
                  <span>Total</span>
                  <span>₱{viewOrder.total_amount.toLocaleString()}</span>
                </div>
              </div>

              {viewOrder.notes && (
                <div className="p-3 bg-[#FFF3D9] rounded-lg text-sm">
                  <p className="font-medium text-[#4F5F52]">Notes</p>
                  <p className="text-gray-700">{viewOrder.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---------- Create Walk-in Order Modal ---------- */}
      {showWalkIn && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex justify-between items-center p-5 border-b border-gray-100">
              <h3 className="text-lg font-bold text-[#4F5F52]">New Walk‑in Order</h3>
              <button onClick={() => setShowWalkIn(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                <input
                  type="text"
                  value={walkForm.customer_name}
                  onChange={(e) => setWalkForm({ ...walkForm, customer_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4F5F52]/20"
                  placeholder="Walk-in Customer"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={walkForm.customer_phone}
                  onChange={(e) => setWalkForm({ ...walkForm, customer_phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="09XX XXX XXXX"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Date</label>
                <input
                  type="date"
                  value={walkForm.pickup_date}
                  onChange={(e) => setWalkForm({ ...walkForm, pickup_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                <select
                  value={walkForm.product_id}
                  onChange={(e) => setWalkForm({ ...walkForm, product_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select a product</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} — ₱{p.base_price.toLocaleString()}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={walkForm.quantity}
                  onChange={(e) => setWalkForm({ ...walkForm, quantity: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <textarea
                  rows="2"
                  value={walkForm.notes}
                  onChange={(e) => setWalkForm({ ...walkForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100">
              <button
                onClick={createWalkIn}
                disabled={saving || !walkForm.product_id}
                className="flex-1 bg-[#4F5F52] text-white py-2 rounded-lg hover:bg-[#3e4c42] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check size={18} />}
                Create Order
              </button>
              <button
                onClick={() => setShowWalkIn(false)}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}