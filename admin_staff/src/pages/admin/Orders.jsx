import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import api from '../../services/api';
import { Search, Plus, Eye } from 'lucide-react';

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [viewOrder, setViewOrder] = useState(null);
  const [walkInForm, setWalkInForm] = useState({ customer_name: '', customer_phone: '', items: [] });
  const [newItem, setNewItem] = useState({ product_id: '', name: '', quantity: 1, price: 0 });
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetchOrders();
    fetchProducts();
  }, []);

  const fetchOrders = async () => {
    const res = await api.get('/orders');
    setOrders(res.data);
  };

  const fetchProducts = async () => {
    const res = await api.get('/products');
    setProducts(res.data.filter(p => p.is_active));
  };

  const updateStatus = async (id, status) => {
    await api.patch(`/orders/${id}/status`, { status });
    fetchOrders();
  };

  const filteredOrders = orders.filter(o => {
    const matchSearch = o.order_number.toLowerCase().includes(search.toLowerCase()) || 
                        (o.customer_name || '').toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || o.status === filter;
    return matchSearch && matchFilter;
  });

  const addWalkInOrder = async () => {
    if (walkInForm.items.length === 0) return;
    const payload = {
      is_walk_in: true,
      customer_name: walkInForm.customer_name || 'Walk-in Customer',
      customer_phone: walkInForm.customer_phone,
      items: walkInForm.items.map(i => ({ product_id: i.product_id, quantity: i.quantity, cake_type: 'standard' })),
      pickup_date: new Date().toISOString().split('T')[0],
      pickup_time: '12:00:00',
    };
    await api.post('/orders', payload);
    setShowWalkInModal(false);
    setWalkInForm({ customer_name: '', customer_phone: '', items: [] });
    fetchOrders();
  };

  return (
    <Layout title="Order Management">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-gray" size={16} />
            <input
              type="text"
              placeholder="Search orders..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 border border-warm-gray/30 rounded-lg w-64 focus:outline-none focus:border-sage"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border border-warm-gray/30 rounded-lg px-3 py-2 bg-white"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="preparing">Preparing</option>
            <option value="ready">Ready</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        <button
          onClick={() => setShowWalkInModal(true)}
          className="bg-sage text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus size={16} /> Walk-in Order
        </button>
      </div>

      <div className="bg-cream-white rounded-xl overflow-hidden border border-warm-gray/10">
        <table className="w-full">
          <thead className="bg-cream/50">
            <tr>
              <th className="text-left p-3 text-sm font-semibold text-sage-dark">Order #</th>
              <th className="text-left p-3 text-sm font-semibold text-sage-dark">Customer</th>
              <th className="text-left p-3 text-sm font-semibold text-sage-dark">Amount</th>
              <th className="text-left p-3 text-sm font-semibold text-sage-dark">Status</th>
              <th className="text-left p-3 text-sm font-semibold text-sage-dark">Payment</th>
              <th className="text-left p-3 text-sm font-semibold text-sage-dark">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((order) => (
              <tr key={order.id} className="border-t border-warm-gray/10 hover:bg-cream/30">
                <td className="p-3 font-medium">{order.order_number}</td>
                <td className="p-3">{order.customer_name || order.customer?.first_name}</td>
                <td className="p-3">₱{order.total_amount.toLocaleString()}</td>
                <td className="p-3">
                  <select
                    value={order.status}
                    onChange={(e) => updateStatus(order.id, e.target.value)}
                    className="text-xs px-2 py-1 rounded-full bg-amber/10 text-amber border-none"
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="preparing">Preparing</option>
                    <option value="ready">Ready</option>
                    <option value="completed">Completed</option>
                  </select>
                </td>
                <td className="p-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${order.payment_status === 'paid' ? 'bg-green/20 text-green' : 'bg-amber/20 text-amber'}`}>
                    {order.payment_status}
                  </span>
                </td>
                <td className="p-3">
                  <button onClick={() => setViewOrder(order)} className="text-sage">
                    <Eye size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* View Order Modal */}
      {viewOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-cream-white rounded-xl p-6 w-full max-w-md">
            <h3 className="font-playfair font-bold text-lg mb-4">Order {viewOrder.order_number}</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-warm-gray text-xs">Customer</p><p className="font-medium">{viewOrder.customer_name}</p></div>
                <div><p className="text-warm-gray text-xs">Status</p><p className="font-medium capitalize">{viewOrder.status}</p></div>
                <div><p className="text-warm-gray text-xs">Total</p><p className="font-medium">₱{viewOrder.total_amount}</p></div>
                <div><p className="text-warm-gray text-xs">Pickup</p><p className="font-medium">{viewOrder.pickup_date} {viewOrder.pickup_time}</p></div>
              </div>
              <button onClick={() => setViewOrder(null)} className="w-full bg-sage text-white py-2 rounded-lg">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Walk-in Modal (simplified) */}
      {showWalkInModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-cream-white rounded-xl p-6 w-full max-w-lg">
            <h3 className="font-playfair font-bold text-lg mb-4">Walk-in Order</h3>
            <input type="text" placeholder="Customer Name" className="w-full border rounded-lg p-2 mb-3" value={walkInForm.customer_name} onChange={e => setWalkInForm({...walkInForm, customer_name: e.target.value})} />
            <input type="text" placeholder="Phone" className="w-full border rounded-lg p-2 mb-3" value={walkInForm.customer_phone} onChange={e => setWalkInForm({...walkInForm, customer_phone: e.target.value})} />
            <div className="flex gap-2 mb-3">
              <select className="flex-1 border rounded-lg p-2" value={newItem.product_id} onChange={e => {
                const p = products.find(p => p.id == e.target.value);
                setNewItem({ product_id: p?.id, name: p?.name, quantity: 1, price: p?.base_price });
              }}>
                <option value="">Select product</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} - ₱{p.base_price}</option>)}
              </select>
              <input type="number" min="1" className="w-20 border rounded-lg p-2" value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: parseInt(e.target.value)})} />
              <button onClick={() => {
                if (newItem.product_id) {
                  setWalkInForm({...walkInForm, items: [...walkInForm.items, {...newItem}]});
                  setNewItem({ product_id: '', name: '', quantity: 1, price: 0 });
                }
              }} className="bg-sage text-white px-3 rounded-lg">Add</button>
            </div>
            <div className="mb-4">
              {walkInForm.items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm py-1"><span>{item.quantity}x {item.name}</span><span>₱{item.price * item.quantity}</span></div>
              ))}
              <div className="font-bold mt-2">Total: ₱{walkInForm.items.reduce((s,i)=>s+i.price*i.quantity,0)}</div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowWalkInModal(false)} className="flex-1 border border-warm-gray rounded-lg py-2">Cancel</button>
              <button onClick={addWalkInOrder} className="flex-1 bg-sage text-white rounded-lg py-2">Create Order</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}