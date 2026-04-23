import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import api from '../../services/api';

export default function StaffDashboard() {
  const [stats, setStats] = useState({ pending: 0, preparing: 0, ready: 0 });
  const [todayOrders, setTodayOrders] = useState([]);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    const res = await api.get('/orders');
    const orders = res.data;
    const pending = orders.filter(o => o.status === 'pending').length;
    const preparing = orders.filter(o => o.status === 'preparing').length;
    const ready = orders.filter(o => o.status === 'ready').length;
    setStats({ pending, preparing, ready });
    setTodayOrders(orders.slice(0, 5));
  };

  return (
    <Layout title="Staff Dashboard">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-cream-white rounded-xl p-5 border border-warm-gray/10"><p className="text-warm-gray">Pending Orders</p><p className="text-3xl font-bold text-amber">{stats.pending}</p></div>
        <div className="bg-cream-white rounded-xl p-5 border border-warm-gray/10"><p className="text-warm-gray">Preparing</p><p className="text-3xl font-bold text-purple">{stats.preparing}</p></div>
        <div className="bg-cream-white rounded-xl p-5 border border-warm-gray/10"><p className="text-warm-gray">Ready for Pickup</p><p className="text-3xl font-bold text-green">{stats.ready}</p></div>
      </div>
      <div className="bg-cream-white rounded-xl p-5 border border-warm-gray/10">
        <h3 className="font-playfair font-semibold mb-4">Recent Orders</h3>
        {todayOrders.map(order => (
          <div key={order.id} className="flex justify-between items-center p-3 border-b"><span>{order.order_number}</span><span className="capitalize">{order.status}</span><span>₱{order.total_amount}</span></div>
        ))}
      </div>
    </Layout>
  );
}