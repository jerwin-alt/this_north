import React from 'react';
import { ShoppingBag, Clock, CheckCircle, Package, BarChart3, ArrowRight } from 'lucide-react';

const SAGE = '#4F5F52';
const CREAM = '#F2EDE4';
const SOFT_WHITE = '#FFF3D9';
const MUTED_GRAY = '#A6A29A';

// Mock data
const stats = [
  { label: 'Today\'s Orders', value: 8, icon: ShoppingBag, trend: '+5%' },
  { label: 'Pending Orders', value: 3, icon: Clock, trend: '2 urgent' },
  { label: 'Completed Today', value: 5, icon: CheckCircle, trend: '2 more than yesterday' },
  { label: 'Products', value: 24, icon: Package, trend: '4 low stock' },
];

const recentOrders = [
  { id: 1, order_number: 'ORD-1001', customer_name: 'Maria Santos', total_amount: 450, status: 'pending' },
  { id: 2, order_number: 'ORD-1002', customer_name: 'Juan Dela Cruz', total_amount: 120, status: 'preparing' },
  { id: 3, order_number: 'ORD-1003', customer_name: 'Ana Reyes', total_amount: 250, status: 'ready' },
  { id: 4, order_number: 'ORD-1004', customer_name: 'Pedro Lim', total_amount: 600, status: 'completed' },
];

const upcomingPickups = [
  { id: 1, order_number: 'ORD-1005', customer_name: 'Sofia Garcia', pickup_time: '2:00 PM', status: 'confirmed' },
  { id: 2, order_number: 'ORD-1006', customer_name: 'Luz Gonzales', pickup_time: '4:30 PM', status: 'confirmed' },
];

const statusColors = {
  pending: '#D4A03D',
  preparing: '#7A5B8A',
  ready: '#5B8A5E',
  completed: '#4F5F52',
  cancelled: '#C75B5B',
};

export default function StaffOverview() {
  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-2xl p-5 border shadow-sm transition-all duration-200 hover:-translate-y-1"
              style={{ backgroundColor: SOFT_WHITE, borderColor: `${MUTED_GRAY}33` }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm" style={{ color: MUTED_GRAY }}>{card.label}</p>
                  <p className="text-3xl font-bold mt-2" style={{ color: SAGE }}>{card.value}</p>
                  <p className="text-xs mt-1 font-medium text-amber-600">{card.trend}</p>
                </div>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${SAGE}1A` }}>
                  <Icon className="w-6 h-6" style={{ color: SAGE }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Row: Recent Orders + Upcoming Pickups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders Table */}
        <div className="rounded-2xl border p-5 shadow-sm" style={{ backgroundColor: SOFT_WHITE, borderColor: `${MUTED_GRAY}33` }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold" style={{ color: SAGE }}>Recent Orders</h3>
            <button className="text-sm flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100" style={{ color: SAGE }}>
              View All <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: `1px solid ${MUTED_GRAY}33` }}>
                  <th className="text-left pb-2 text-xs font-medium uppercase" style={{ color: MUTED_GRAY }}>Order #</th>
                  <th className="text-left pb-2 text-xs font-medium uppercase" style={{ color: MUTED_GRAY }}>Customer</th>
                  <th className="text-left pb-2 text-xs font-medium uppercase" style={{ color: MUTED_GRAY }}>Amount</th>
                  <th className="text-left pb-2 text-xs font-medium uppercase" style={{ color: MUTED_GRAY }}>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: `${MUTED_GRAY}33` }}>
                {recentOrders.map(order => (
                  <tr key={order.id} className="hover:bg-[#F2EDE4]/50 transition-colors">
                    <td className="py-2.5 font-medium" style={{ color: SAGE }}>{order.order_number}</td>
                    <td className="py-2.5" style={{ color: MUTED_GRAY }}>{order.customer_name}</td>
                    <td className="py-2.5 font-semibold" style={{ color: SAGE }}>₱{order.total_amount.toLocaleString()}</td>
                    <td className="py-2.5">
                      <span
                        className="inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium text-white capitalize"
                        style={{ backgroundColor: statusColors[order.status] || MUTED_GRAY }}
                      >
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Upcoming Pickups */}
        <div className="rounded-2xl border p-5 shadow-sm" style={{ backgroundColor: SOFT_WHITE, borderColor: `${MUTED_GRAY}33` }}>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5" style={{ color: SAGE }} />
            <h3 className="font-semibold" style={{ color: SAGE }}>Upcoming Pickups</h3>
          </div>
          <div className="space-y-4">
            {upcomingPickups.map(pickup => (
              <div key={pickup.id} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: `${SAGE}10` }}>
                <div>
                  <p className="font-medium" style={{ color: SAGE }}>{pickup.customer_name}</p>
                  <p className="text-xs" style={{ color: MUTED_GRAY }}>{pickup.order_number} – {pickup.pickup_time}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full capitalize"
                  style={{ backgroundColor: `${SAGE}20`, color: SAGE }}>
                  {pickup.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}