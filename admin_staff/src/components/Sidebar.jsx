import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Package, 
  Cake, 
  BarChart3, 
  Users, 
  Ticket, 
  Settings,
  Calendar,
  LogOut,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function Sidebar({ collapsed, onToggle }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const adminNav = [
    { path: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard },
    { path: '/admin/orders', label: 'Orders', icon: ShoppingBag },
    { path: '/admin/inventory', label: 'Inventory', icon: Package },
    { path: '/admin/products', label: 'Products', icon: Cake },
    { path: '/admin/reports', label: 'Reports', icon: BarChart3 },
    { path: '/admin/users', label: 'Users', icon: Users },
    { path: '/admin/discounts', label: 'Discounts', icon: Ticket },
    { path: '/admin/settings', label: 'Settings', icon: Settings },
  ];

  const staffNav = [
    { path: '/staff/dashboard', label: 'Overview', icon: LayoutDashboard },
    { path: '/staff/orders', label: 'Process Orders', icon: ShoppingBag },
    { path: '/staff/schedule', label: 'Schedule', icon: Calendar },
    { path: '/staff/inventory', label: 'Inventory', icon: Package },
  ];

  const navItems = user?.role === 'admin' ? adminNav : staffNav;

  return (
    <aside className={`${collapsed ? 'w-20' : 'w-64'} bg-gradient-to-b from-sage to-sage-dark flex flex-col transition-all duration-300 relative`}>
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        {!collapsed && (
          <div>
            <h1 className="text-ncGreen font-playfair text-lg font-bold">North Cakes</h1>
            <p className="text-white/60 text-xs">CDO</p>
          </div>
        )}
        {collapsed && <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center text-white">🎂</div>}
      </div>
      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive ? 'bg-cream-light text-sage' : 'text-white/70 hover:bg-white/10'
              }`
            }
          >
            <item.icon size={18} />
            {!collapsed && <span className="text-sm">{item.label}</span>}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 text-white/70 hover:bg-white/10 rounded-lg transition-colors"
        >
          <LogOut size={18} />
          {!collapsed && <span className="text-sm">Logout</span>}
        </button>
      </div>
      <button
        onClick={onToggle}
        className="absolute -right-3 top-20 bg-sage border-2 border-cream-light rounded-full p-1 text-white"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </aside>
  );
}