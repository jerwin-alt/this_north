// src/pages/dashboard/DashboardOverview.tsx
import React from 'react';
import {
  ShoppingBag, DollarSign, Clock, AlertTriangle,
  BarChart3, TrendingUp, Box, ArrowRight
} from 'lucide-react';

// ---------- Color Palette ----------
const SAGE = '#4F5F52';
const CREAM = '#F2EDE4';
const SOFT_WHITE = '#FFF3D9';
const MUTED_GRAY = '#A6A29A';

// ---------- Mock Data ----------
const dashboardStats = {
  totalOrdersToday: 12,
  revenueToday: 28450,
  pendingOrders: 5,
  lowStockItems: 3,
};

const statCards = [
  { label: "Today's Orders", value: dashboardStats.totalOrdersToday, icon: ShoppingBag, trend: '+12%', up: true },
  { label: "Today's Revenue", value: `₱${dashboardStats.revenueToday.toLocaleString()}`, icon: TrendingUp, trend: '+8%', up: true },
  { label: 'Pending Orders', value: dashboardStats.pendingOrders, icon: Clock, trend: '3 urgent', up: false },
  { label: 'Low Stock Items', value: dashboardStats.lowStockItems, icon: AlertTriangle, trend: 'Need restock', up: false },
];

// 7‑day sales (for the bar chart)
const salesData = [
  { day: 'Mon', amount: 18500 },
  { day: 'Tue', amount: 22400 },
  { day: 'Wed', amount: 15600 },
  { day: 'Thu', amount: 31200 },
  { day: 'Fri', amount: 26800 },
  { day: 'Sat', amount: 34100 },
  { day: 'Sun', amount: 28450 },
];
const maxSales = Math.max(...salesData.map(d => d.amount));

// Order status distribution (for the doughnut)
const orderStatusData = [
  { status: 'pending', count: 5, color: '#D4A03D' },
  { status: 'confirmed', count: 8, color: '#5B7A8A' },
  { status: 'preparing', count: 12, color: '#7A5B8A' },
  { status: 'ready', count: 6, color: '#5B8A5E' },
  { status: 'completed', count: 45, color: '#4F5F52' },
  { status: 'cancelled', count: 3, color: '#C75B5B' },
];
const totalStatus = orderStatusData.reduce((sum, s) => sum + s.count, 0);

const recentOrders = [
  { id: 1, order_number: 'ORD-2024-001', customer_name: 'Carlos Garcia', total_amount: 1500, status: 'completed' },
  { id: 2, order_number: 'ORD-2024-002', customer_name: 'Isabella Lim', total_amount: 1440, status: 'preparing' },
  { id: 3, order_number: 'ORD-2024-003', customer_name: 'Miguel Tan', total_amount: 15000, status: 'confirmed' },
  { id: 4, order_number: 'ORD-2024-004', customer_name: 'Walk-in Customer', total_amount: 450, status: 'ready' },
  { id: 5, order_number: 'ORD-2024-005', customer_name: 'Carlos Garcia', total_amount: 2700, status: 'pending' },
];

const inventoryAlerts = [
  { ingredient_id: 6, name: 'Cocoa Powder', current_stock: 3, unit: 'kg' },
  { ingredient_id: 10, name: 'Chocolate Chips', current_stock: 2, unit: 'kg' },
  { ingredient_id: 9, name: 'Heavy Cream', current_stock: 4, unit: 'L' },
];

// ---------- Helpers ----------
const statusColorMap = {
  pending: '#D4A03D',
  confirmed: '#5B7A8A',
  preparing: '#7A5B8A',
  ready: '#5B8A5E',
  completed: '#4F5F52',
  cancelled: '#C75B5B',
};

// Simple doughnut conic gradient generator
const conicGradient = orderStatusData.map(s => {
  const percentage = (s.count / totalStatus) * 100;
  return `${s.color} ${percentage}%`;
}).join(', ');

// ---------- Component ----------
export default function DashboardOverview() {
  return (
    <div className="space-y-6">
      {/* ----- Stat Cards ----- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((card, i) => {
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
                  <p className={`text-xs mt-1 font-medium ${card.up ? 'text-green-600' : 'text-amber-600'}`}>
                    {card.trend}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${SAGE}1A` }}>
                  <Icon className="w-6 h-6" style={{ color: SAGE }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ----- Charts Row ----- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Chart (simple bar chart) */}
        <div className="rounded-2xl border p-5 shadow-sm" style={{ backgroundColor: SOFT_WHITE, borderColor: `${MUTED_GRAY}33` }}>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5" style={{ color: SAGE }} />
            <h3 className="font-semibold" style={{ color: SAGE }}>Sales Overview (Last 7 Days)</h3>
          </div>
          <div className="flex items-end justify-between h-40 gap-2">
            {salesData.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center justify-end h-full">
                <span className="text-xs mb-1" style={{ color: MUTED_GRAY }}>₱{(d.amount / 1000).toFixed(1)}k</span>
                <div
                  className="w-full rounded-t-md transition-all duration-300"
                  style={{
                    height: `${(d.amount / maxSales) * 100}%`,
                    backgroundColor: SAGE,
                    minHeight: 4,
                  }}
                />
                <span className="text-xs mt-2" style={{ color: MUTED_GRAY }}>{d.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Order Status Distribution (simulated doughnut) */}
        <div className="rounded-2xl border p-5 shadow-sm" style={{ backgroundColor: SOFT_WHITE, borderColor: `${MUTED_GRAY}33` }}>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5" style={{ color: SAGE }} />
            <h3 className="font-semibold" style={{ color: SAGE }}>Order Status Distribution</h3>
          </div>
          <div className="flex items-center justify-center">
            {/* Pseudo doughnut with conic-gradient */}
            <div
              className="rounded-full flex items-center justify-center"
              style={{
                width: 180,
                height: 180,
                background: `conic-gradient(${conicGradient})`,
                position: 'relative',
              }}
            >
              <div
                className="rounded-full"
                style={{
                  width: 100,
                  height: 100,
                  backgroundColor: SOFT_WHITE,
                }}
              />
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-4 mt-6">
            {orderStatusData.map(s => (
              <div key={s.status} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-xs capitalize" style={{ color: MUTED_GRAY }}>{s.status} ({s.count})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ----- Bottom Row ----- */}
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
                        style={{ backgroundColor: statusColorMap[order.status] || '#A6A29A' }}
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

        {/* Low Stock Alerts */}
        <div className="rounded-2xl border p-5 shadow-sm" style={{ backgroundColor: SOFT_WHITE, borderColor: `${MUTED_GRAY}33` }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" style={{ color: '#D4A03D' }} />
              <h3 className="font-semibold" style={{ color: SAGE }}>Low Stock Alerts</h3>
            </div>
            <button className="text-sm flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100" style={{ color: SAGE }}>
              Manage Inventory <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-4">
            {inventoryAlerts.map(item => (
              <div key={item.ingredient_id} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: '#D4A03D1A' }}>
                <div className="flex items-center gap-3">
                  <Box className="w-5 h-5" style={{ color: '#D4A03D' }} />
                  <div>
                    <p className="font-medium" style={{ color: SAGE }}>{item.name}</p>
                    <p className="text-sm" style={{ color: MUTED_GRAY }}>
                      {item.current_stock} {item.unit} remaining
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium" style={{ borderColor: '#D4A03D', color: '#D4A03D' }}>
                  Low Stock
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}