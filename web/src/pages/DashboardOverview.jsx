import { ShoppingBag, DollarSign, Clock, AlertTriangle } from 'lucide-react';

export default function DashboardOverview() {
  const statCards = [
    { label: 'Total Orders', value: '0', icon: ShoppingBag, color: 'bg-blue-100 text-blue-600' },
    { label: 'Revenue', value: '₱0', icon: DollarSign, color: 'bg-green-100 text-green-600' },
    { label: 'Pending Orders', value: '0', icon: Clock, color: 'bg-yellow-100 text-yellow-600' },
    { label: 'Low Stock Items', value: '0', icon: AlertTriangle, color: 'bg-red-100 text-red-600' },
  ];

  const recentOrders = [
    { id: 1, order_number: 'ORD-001', customer_name: 'John Doe', total_amount: 250, status: 'pending' },
    { id: 2, order_number: 'ORD-002', customer_name: 'Jane Smith', total_amount: 450, status: 'completed' },
    { id: 3, order_number: 'ORD-003', customer_name: 'Maria Santos', total_amount: 180, status: 'pending' },
  ];

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard Overview</h1>
        <p className="text-gray-600 text-sm">Welcome back, Admin</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card, i) => (
          <div key={i} className="bg-white rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">{card.label}</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{card.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl ${card.color} flex items-center justify-center`}>
                <card.icon size={22} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl p-5 shadow-sm">
        <h3 className="font-semibold text-gray-800 mb-4">Recent Orders</h3>
        <div className="space-y-3">
          {recentOrders.map((order) => (
            <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-800">{order.order_number}</p>
                <p className="text-xs text-gray-500">{order.customer_name}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-800">₱{order.total_amount.toLocaleString()}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                  order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                }`}>
                  {order.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}