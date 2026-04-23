import { ShoppingBag, DollarSign, Clock, AlertTriangle, LayoutDashboard, ShoppingCart, Package, Box, BarChart3, Users, Percent, Settings, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/auth-context';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.log("Logout Error.", error);
      navigate('/');
    }
  }
  
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

  const menuItems = [
    { name: 'Overview', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'Orders', icon: ShoppingCart, path: '/orders' },
    { name: 'Inventory', icon: Package, path: '/inventory' },
    { name: 'Products', icon: Box, path: '/products' },
    { name: 'Reports', icon: BarChart3, path: '/reports' },
    { name: 'Users', icon: Users, path: '/users' },
    { name: 'Discounts', icon: Percent, path: '/discounts' },
    { name: 'Settings', icon: Settings, path: '/settings' },
  ];

  

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-lg fixed h-full">
        {/* Logo/Brand */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-green-700 rounded-lg flex items-center justify-center">
              <span className="text-white text-lg">🎂</span>
            </div>
            <div>
              <h1 className="font-bold text-gray-800">North Cakes CDO</h1>
              <p className="text-xs text-gray-500">Admin Panel</p>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="p-4">
          <div className="space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.name}
                className="w-full flex items-center space-x-3 px-4 py-2.5 text-gray-700 rounded-lg hover:bg-green-50 hover:text-green-700 transition-colors duration-200"
                onClick={() => console.log(`Navigate to ${item.path}`)}
              >
                <item.icon size={20} />
                <span className="text-sm font-medium">{item.name}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* Logout Button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-2.5 text-red-600 rounded-lg hover:bg-red-50 transition-colors duration-200"
          >
            <LogOut size={20} />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64">
        <div className="p-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Dashboard Overview</h1>
            <p className="text-gray-600 text-sm">Welcome back, Admin</p>
          </div>

          {/* Stats Cards */}
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

          {/* Recent Orders */}
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
        </div>
      </main>
    </div>
  );
}