import React, { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/auth-context';
import {
  LayoutDashboard, Users, Package, Box, Percent, BarChart3,
  LogOut, Cake, Menu
} from 'lucide-react';

const menuItems = [
  { name: 'Overview', icon: LayoutDashboard, path: '/pages/dashboard' },
  { name: 'Users', icon: Users, path: '/pages/dashboard/users' },
  { name: 'Products', icon: Package, path: '/pages/dashboard/products' },
  { name: 'Ingredients', icon: Box, path: '/pages/dashboard/ingredients' },
  { name: 'Discounts', icon: Percent, path: '/pages/dashboard/discounts' },
  { name: 'Inventory', icon: Package, path: '/pages/dashboard/inventory' },
  { name: 'Reports', icon: BarChart3, path: '/pages/dashboard/reports' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error', error);
      navigate('/login');
    }
  };

  const today = new Date().toLocaleDateString('en-PH', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const SidebarInner = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-5 flex items-center gap-3 border-b border-white/10">
        <div className="w-10 h-10 bg-[#FFF3D9]/20 rounded-xl flex items-center justify-center shrink-0">
          <Cake className="w-5 h-5 text-[#FFF3D9]" />
        </div>
        {!collapsed && (
          <div>
            <h1 className="font-bold text-lg leading-tight text-[#FFF3D9]">North Cakes</h1>
            <p className="text-[#A6A29A] text-xs">CDO Management</p>
          </div>
        )}
      </div>

      {/* Role badge */}
      {!collapsed && (
        <div className="px-5 py-3">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#FFF3D9]/20 text-[#FFF3D9]">
            ADMIN
          </span>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 pb-3 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.name}
              onClick={() => {
                navigate(item.path);
                setMobileOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-left ${
                isActive
                  ? 'bg-[#FFF3D9] text-[#4F5F52] font-medium shadow-sm'
                  : 'text-[#FFF3D9]/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span className="text-sm">{item.name}</span>}
            </button>
          );
        })}
      </nav>

      {/* User & Logout */}
      <div className="p-3 border-t border-white/10">
        <div className={`flex items-center gap-3 mb-2 px-2 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-9 h-9 bg-[#FFF3D9]/20 rounded-full flex items-center justify-center shrink-0 text-[#FFF3D9] text-sm font-bold">
            {user?.first_name?.[0] || 'A'}{user?.last_name?.[0] || 'D'}
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-[#FFF3D9] text-sm font-medium truncate">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-[#A6A29A] text-xs truncate">{user?.email}</p>
            </div>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-[#FFF3D9]/70 hover:bg-white/10 hover:text-[#FFF3D9] transition-all text-sm"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && 'Sign Out'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[#F2EDE4]">
      {/* Desktop sidebar */}
      <aside
        className="fixed lg:relative z-20 flex flex-col bg-[#4F5F52] shrink-0 overflow-hidden transition-all duration-300"
        style={{ width: collapsed ? 72 : 260 }}
      >
        <SidebarInner />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-30"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            className="lg:hidden fixed left-0 top-0 bottom-0 w-64 bg-[#4F5F52] z-40 flex flex-col"
            style={{ animation: 'slideIn 0.25s ease' }}
          >
            <SidebarInner />
          </aside>
        </>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="bg-[#FFF3D9] border-b border-[#A6A29A]/20 px-5 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {/* Desktop collapse */}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:flex p-2 rounded-lg text-[#4F5F52] hover:bg-[#4F5F52]/10 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            {/* Mobile open */}
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg text-[#4F5F52] hover:bg-[#4F5F52]/10"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h2 className="font-semibold text-[#4F5F52] capitalize">
                {menuItems.find((item) => item.path === location.pathname)?.name || 'Dashboard'}
              </h2>
              <p className="text-xs text-[#A6A29A]">{today}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-xs px-2.5 py-1 rounded-full font-medium capitalize bg-[#4F5F52]/10 text-[#4F5F52]">
              Admin
            </span>
            <div className="w-8 h-8 bg-[#4F5F52] rounded-full flex items-center justify-center text-[#FFF3D9] text-xs font-bold">
              {user?.first_name?.[0] || 'A'}{user?.last_name?.[0] || 'D'}
            </div>
          </div>
        </header>

        {/* Page content – nested routes */}
        <main className="flex-1 overflow-y-auto p-5 lg:p-6 bg-[#F2EDE4]">
          <div className="animate-fadeUp">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Keyframes for animations */}
      <style>{`
        @keyframes slideIn { from { transform: translateX(-100%); } to { transform: none; } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        .animate-fadeUp { animation: fadeUp 0.2s ease; }
      `}</style>
    </div>
  );
}