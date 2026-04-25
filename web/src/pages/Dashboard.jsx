import { ShoppingBag, DollarSign, Clock, AlertTriangle, LayoutDashboard, ShoppingCart, Package, Box, BarChart3, Users, Percent, Settings, LogOut } from 'lucide-react';
import { useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/auth-context';

export default function Dashboard() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Logout Error.", error);
      navigate('/login');
    }
  };

  const menuItems = [
    { name: 'Overview', icon: LayoutDashboard, path: '/pages/dashboard' },
    { name: 'Orders', icon: ShoppingCart, path: '/pages/dashboard/orders' },
    { name: 'Inventory', icon: Package, path: '/pages/dashboard/inventory' },
    { name: 'Products', icon: Box, path: '/pages/dashboard/products' },
    { name: 'Reports', icon: BarChart3, path: '/pages/dashboard/reports' },
    { name: 'Users', icon: Users, path: '/pages/dashboard/users' },      // matches nested route
    { name: 'Discounts', icon: Percent, path: '/pages/dashboard/discounts' },
    { name: 'Settings', icon: Settings, path: '/pages/dashboard/settings' },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-lg fixed h-full">
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

        <nav className="p-4">
          <div className="space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.name}
                className="w-full flex items-center space-x-3 px-4 py-2.5 text-gray-700 rounded-lg hover:bg-green-50 hover:text-green-700 transition-colors duration-200"
                onClick={() => navigate(item.path)}
              >
                <item.icon size={20} />
                <span className="text-sm font-medium">{item.name}</span>
              </button>
            ))}
          </div>
        </nav>

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

      {/* Main content area - nested routes render here */}
      <main className="flex-1 ml-64">
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}