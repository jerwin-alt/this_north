import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import api from '../../services/api';

export default function StaffSchedule() {
  const [orders, setOrders] = useState([]);

  useEffect(() => { fetchOrders(); }, []);

  const fetchOrders = async () => {
    const res = await api.get('/orders');
    setOrders(res.data.filter(o => o.status !== 'completed' && o.status !== 'cancelled'));
  };

  return (
    <Layout title="Production Schedule">
      <div className="bg-cream-white rounded-xl p-6 border border-warm-gray/10">
        <h3 className="font-playfair font-semibold mb-4">Today's Production</h3>
        <div className="space-y-3">
          {orders.map(o => (
            <div key={o.id} className="flex items-center justify-between p-3 border-b">
              <div><p className="font-medium">{o.order_number}</p><p className="text-sm text-warm-gray">{o.customer_name} • Pickup: {o.pickup_time}</p></div>
              <span className={`text-xs px-2 py-1 rounded-full capitalize ${o.status === 'pending' ? 'bg-amber/20 text-amber' : 'bg-sage/20 text-sage'}`}>{o.status}</span>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}

