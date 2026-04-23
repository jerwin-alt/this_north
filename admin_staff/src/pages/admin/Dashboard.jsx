import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import api from '../../services/api';
import { ShoppingBag, DollarSign, Clock, AlertTriangle } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ orders: 0, revenue: 0, pending: 0, lowStock: 0 });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ordersRes, productsRes, ingredientsRes] = await Promise.all([
          api.get('/orders'),
          api.get('/products'),
          api.get('/ingredients')
        ]);
        const orders = ordersRes.data;
        const totalRevenue = orders.filter(o => o.payment_status === 'paid').reduce((sum, o) => sum + o.total_amount, 0);
        const pendingOrders = orders.filter(o => o.status === 'pending').length;
        const lowStock = productsRes.data.filter(p => p.stock_quantity <= p.min_stock_level).length;
        setStats({ orders: orders.length, revenue: totalRevenue, pending: pendingOrders, lowStock });
        setRecentOrders(orders.slice(0, 5));
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const statCards = [
    { label: 'Total Orders', value: stats.orders, icon: ShoppingBag, color: 'bg-blue/10 text-blue' },
    { label: 'Revenue', value: `₱${stats.revenue.toLocaleString()}`, icon: DollarSign, color: 'bg-green/10 text-green' },
    { label: 'Pending Orders', value: stats.pending, icon: Clock, color: 'bg-amber/10 text-amber' },
    { label: 'Low Stock Items', value: stats.lowStock, icon: AlertTriangle, color: 'bg-red/10 text-red' },
  ];

  return (
    <Layout title="Dashboard Overview">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card, i) => (
          <div key={i} className="bg-cream-white rounded-xl p-5 shadow-sm border border-warm-gray/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-warm-gray text-sm">{card.label}</p>
                <p className="text-2xl font-playfair font-bold text-sage-dark mt-1">{card.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl ${card.color} flex items-center justify-center`}>
                <card.icon size={22} />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-cream-white rounded-xl p-5 shadow-sm border border-warm-gray/10">
        <h3 className="font-playfair font-semibold text-sage-dark mb-4">Recent Orders</h3>
        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between p-3 bg-cream/50 rounded-lg">
                <div>
                  <p className="font-medium text-sage-dark">{order.order_number}</p>
                  <p className="text-xs text-warm-gray">{order.customer_name}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-sage-dark">₱{order.total_amount.toLocaleString()}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                    order.status === 'pending' ? 'bg-amber/20 text-amber' :
                    order.status === 'completed' ? 'bg-green/20 text-green' : 'bg-warm-gray/20 text-warm-gray'
                  }`}>{order.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}