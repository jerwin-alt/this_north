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

const orderStatusData = [
  { status: 'pending',   count: 5,  color: '#D4A03D' },
  { status: 'confirmed', count: 8,  color: '#5B7A8A' },
  { status: 'preparing', count: 12, color: '#7A5B8A' },
  { status: 'ready',     count: 6,  color: '#5B8A5E' },
  { status: 'completed', count: 45, color: '#4F5F52' },
  { status: 'cancelled', count: 3,  color: '#C75B5B' },
];
const totalStatus = orderStatusData.reduce((sum, s) => sum + s.count, 0);

const recentOrders = [
  { id: 1, order_number: 'ORD-2024-001', customer_name: 'Carlos Garcia',     total_amount: 1500,  status: 'completed' },
  { id: 2, order_number: 'ORD-2024-002', customer_name: 'Isabella Lim',      total_amount: 1440,  status: 'preparing' },
  { id: 3, order_number: 'ORD-2024-003', customer_name: 'Miguel Tan',         total_amount: 15000, status: 'confirmed' },
  { id: 4, order_number: 'ORD-2024-004', customer_name: 'Walk-in Customer',   total_amount: 450,   status: 'ready'     },
  { id: 5, order_number: 'ORD-2024-005', customer_name: 'Carlos Garcia',     total_amount: 2700,  status: 'pending'   },
];

const inventoryAlerts = [
  { ingredient_id: 6,  name: 'Cocoa Powder',    current_stock: 3, unit: 'kg' },
  { ingredient_id: 10, name: 'Chocolate Chips',  current_stock: 2, unit: 'kg' },
  { ingredient_id: 9,  name: 'Heavy Cream',      current_stock: 4, unit: 'L'  },
];

// ---------- Helpers ----------
const statusColorMap = {
  pending:   '#D4A03D',
  confirmed: '#5B7A8A',
  preparing: '#7A5B8A',
  ready:     '#5B8A5E',
  completed: '#4F5F52',
  cancelled: '#C75B5B',
};

const statusBgMap = {
  pending:   'rgba(212,160,61,0.1)',
  confirmed: 'rgba(91,122,138,0.1)',
  preparing: 'rgba(122,91,138,0.1)',
  ready:     'rgba(91,138,94,0.1)',
  completed: 'rgba(79,95,82,0.1)',
  cancelled: 'rgba(199,91,91,0.1)',
};

const conicGradient = orderStatusData.map(s => `${s.color} ${(s.count / totalStatus) * 100}%`).join(', ');

// ---------- Component ----------
export default function DashboardOverview() {
  return (
    <div style={{ background: CREAM, minHeight: '100vh', padding: '36px 28px' }}>
      <style>{`
        .grain-overlay {
          position: fixed; inset: 0; pointer-events: none; z-index: 0; opacity: 0.028;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
          background-repeat: repeat; background-size: 128px;
        }
        .divider-line {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(79,95,82,0.15), transparent);
        }
        .stat-card {
          transition: box-shadow 0.3s ease, transform 0.3s ease;
        }
        .stat-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 16px 36px rgba(79,95,82,0.14) !important;
        }
        .panel {
          background: #fff;
          border-radius: 20px;
          border: 1.5px solid rgba(242,237,228,0.9);
          box-shadow: 0 2px 12px rgba(79,95,82,0.06);
        }
        .bar-col {
          transition: opacity 0.15s ease;
        }
        .bar-col:hover { opacity: 0.75; }
        .order-row { transition: background 0.15s ease; }
        .order-row:hover { background: rgba(242,237,228,0.7); }
        .view-btn {
          transition: all 0.18s ease;
          border-radius: 10px;
          padding: 5px 10px;
        }
        .view-btn:hover {
          background: rgba(79,95,82,0.08);
          transform: translateX(2px);
        }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
        .fade-in   { animation: fadeInUp 0.4s ease both; }
        .fade-in-1 { animation: fadeInUp 0.4s 0.05s ease both; }
        .fade-in-2 { animation: fadeInUp 0.4s 0.10s ease both; }
        .fade-in-3 { animation: fadeInUp 0.4s 0.15s ease both; }
        .fade-in-4 { animation: fadeInUp 0.4s 0.20s ease both; }
      `}</style>

      <div className="grain-overlay" />

      <div className="max-w-7xl mx-auto relative" style={{ zIndex: 1 }}>

        {/* ── Header ── */}
        <div className="flex items-start gap-3 mb-8 fade-in">
          <div style={{
            width: 36, height: 36,
            background: `linear-gradient(135deg, ${SAGE}, #3e4c42)`,
            borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(79,95,82,0.25)',
            flexShrink: 0,
            marginTop: 2,
          }}>
            <BarChart3 size={18} color="#fff" />
          </div>
          <div>
            <h1 style={{ color: SAGE, fontSize: '1.55rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
              Dashboard
            </h1>
            <p style={{ color: MUTED_GRAY, fontSize: '0.82rem', letterSpacing: '0.03em' }}>
              Overview of today's activity and key metrics
            </p>
          </div>
        </div>

        <div className="divider-line mb-7" />

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-7 fade-in-1">
          {statCards.map((card) => {
            const Icon = card.icon;
            const isPositive = card.up;
            return (
              <div
                key={card.label}
                className="stat-card"
                style={{
                  background: '#fff',
                  borderRadius: 20,
                  border: '1.5px solid rgba(242,237,228,0.9)',
                  boxShadow: '0 2px 12px rgba(79,95,82,0.06)',
                  padding: '22px 22px 18px',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                {/* Subtle top accent */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                  background: isPositive
                    ? `linear-gradient(90deg, ${SAGE}, #3e4c42)`
                    : `linear-gradient(90deg, #D4A03D, #b8872e)`,
                }} />

                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ color: MUTED_GRAY, fontSize: '0.75rem', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8 }}>
                      {card.label}
                    </p>
                    <p style={{ color: SAGE, fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 8 }}>
                      {card.value}
                    </p>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      fontSize: '0.7rem', fontWeight: 600,
                      padding: '2px 8px', borderRadius: 999,
                      background: isPositive ? 'rgba(52,196,104,0.1)' : 'rgba(212,160,61,0.1)',
                      color: isPositive ? '#1a7a3c' : '#92670a',
                      border: `1px solid ${isPositive ? 'rgba(52,196,104,0.2)' : 'rgba(212,160,61,0.2)'}`,
                    }}>
                      {card.trend}
                    </span>
                  </div>
                  <div style={{
                    width: 44, height: 44, borderRadius: 14,
                    background: isPositive
                      ? `linear-gradient(135deg, rgba(79,95,82,0.12), rgba(79,95,82,0.06))`
                      : `linear-gradient(135deg, rgba(212,160,61,0.14), rgba(212,160,61,0.06))`,
                    border: `1.5px solid ${isPositive ? 'rgba(79,95,82,0.12)' : 'rgba(212,160,61,0.15)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Icon size={20} style={{ color: isPositive ? SAGE : '#D4A03D' }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Charts Row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 fade-in-2">

          {/* Sales Bar Chart */}
          <div className="panel" style={{ padding: '22px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: `linear-gradient(135deg, ${SAGE}, #3e4c42)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(79,95,82,0.2)',
              }}>
                <BarChart3 size={13} color="#fff" />
              </div>
              <h3 style={{ color: SAGE, fontWeight: 700, fontSize: '0.95rem', letterSpacing: '-0.01em' }}>
                Sales Overview
              </h3>
              <span style={{
                fontSize: '0.68rem', fontWeight: 600, color: MUTED_GRAY,
                background: 'rgba(166,162,154,0.12)', border: '1px solid rgba(166,162,154,0.2)',
                borderRadius: 999, padding: '2px 8px', marginLeft: 2,
              }}>
                Last 7 Days
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: 160, gap: 8 }}>
              {salesData.map((d, i) => {
                const heightPct = (d.amount / maxSales) * 100;
                const isMax = d.amount === maxSales;
                return (
                  <div key={d.day} className="bar-col" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', gap: 6 }}>
                    <span style={{ fontSize: '0.62rem', color: MUTED_GRAY, fontWeight: 500 }}>
                      ₱{(d.amount / 1000).toFixed(1)}k
                    </span>
                    <div style={{
                      width: '100%', borderRadius: '6px 6px 0 0',
                      height: `${heightPct}%`, minHeight: 6,
                      background: isMax
                        ? `linear-gradient(180deg, ${SAGE}, #3e4c42)`
                        : `linear-gradient(180deg, rgba(79,95,82,0.55), rgba(79,95,82,0.35))`,
                      boxShadow: isMax ? '0 -4px 12px rgba(79,95,82,0.25)' : 'none',
                      transition: 'all 0.3s ease',
                    }} />
                    <span style={{ fontSize: '0.68rem', color: isMax ? SAGE : MUTED_GRAY, fontWeight: isMax ? 700 : 400 }}>
                      {d.day}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Order Status Doughnut */}
          <div className="panel" style={{ padding: '22px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: `linear-gradient(135deg, ${SAGE}, #3e4c42)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(79,95,82,0.2)',
              }}>
                <BarChart3 size={13} color="#fff" />
              </div>
              <h3 style={{ color: SAGE, fontWeight: 700, fontSize: '0.95rem', letterSpacing: '-0.01em' }}>
                Order Status Distribution
              </h3>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <div style={{
                width: 168, height: 168,
                background: `conic-gradient(${conicGradient})`,
                borderRadius: '50%',
                position: 'relative',
                boxShadow: '0 8px 24px rgba(79,95,82,0.14)',
              }}>
                {/* Inner hole */}
                <div style={{
                  position: 'absolute', top: '50%', left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 90, height: 90,
                  background: '#fff',
                  borderRadius: '50%',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  boxShadow: 'inset 0 2px 8px rgba(79,95,82,0.08)',
                }}>
                  <span style={{ fontSize: '1.3rem', fontWeight: 800, color: SAGE, letterSpacing: '-0.03em', lineHeight: 1 }}>
                    {totalStatus}
                  </span>
                  <span style={{ fontSize: '0.62rem', color: MUTED_GRAY, fontWeight: 500, marginTop: 2 }}>orders</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px 16px' }}>
              {orderStatusData.map(s => (
                <div key={s.status} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, display: 'inline-block', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.72rem', color: MUTED_GRAY, textTransform: 'capitalize', fontWeight: 500 }}>
                    {s.status} <span style={{ fontWeight: 700, color: SAGE }}>({s.count})</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Bottom Row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 fade-in-3">

          {/* Recent Orders */}
          <div className="panel" style={{ padding: '22px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: `linear-gradient(135deg, ${SAGE}, #3e4c42)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(79,95,82,0.2)',
                }}>
                  <ShoppingBag size={13} color="#fff" />
                </div>
                <h3 style={{ color: SAGE, fontWeight: 700, fontSize: '0.95rem', letterSpacing: '-0.01em' }}>
                  Recent Orders
                </h3>
              </div>
              <button className="view-btn" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', fontWeight: 600, color: SAGE, background: 'transparent', border: 'none', cursor: 'pointer' }}>
                View All <ArrowRight size={14} />
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: `linear-gradient(135deg, ${CREAM}, rgba(255,243,217,0.5))` }}>
                    {['Order #', 'Customer', 'Amount', 'Status'].map(col => (
                      <th key={col} style={{
                        padding: '10px 14px', textAlign: 'left',
                        fontSize: '0.65rem', fontWeight: 700, color: SAGE,
                        letterSpacing: '0.08em', textTransform: 'uppercase',
                        whiteSpace: 'nowrap',
                      }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order, idx) => (
                    <tr key={order.id} className="order-row" style={{ borderTop: idx === 0 ? 'none' : `1px solid rgba(242,237,228,0.8)` }}>
                      <td style={{ padding: '11px 14px', fontWeight: 700, color: SAGE, whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                        {order.order_number}
                      </td>
                      <td style={{ padding: '11px 14px', color: MUTED_GRAY, fontSize: '0.78rem' }}>
                        {order.customer_name}
                      </td>
                      <td style={{ padding: '11px 14px', fontWeight: 800, color: SAGE, fontSize: '0.88rem', letterSpacing: '-0.01em' }}>
                        ₱{order.total_amount.toLocaleString()}
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '3px 9px', borderRadius: 999,
                          fontSize: '0.65rem', fontWeight: 600,
                          background: statusBgMap[order.status] || 'rgba(166,162,154,0.1)',
                          color: statusColorMap[order.status] || MUTED_GRAY,
                          border: `1px solid ${statusColorMap[order.status]}33`,
                          textTransform: 'capitalize',
                        }}>
                          <span style={{
                            width: 5, height: 5, borderRadius: '50%',
                            background: statusColorMap[order.status] || MUTED_GRAY,
                            display: 'inline-block', flexShrink: 0,
                          }} />
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
          <div className="panel" style={{ padding: '22px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: 'linear-gradient(135deg, #D4A03D, #b8872e)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(212,160,61,0.25)',
                }}>
                  <AlertTriangle size={13} color="#fff" />
                </div>
                <h3 style={{ color: SAGE, fontWeight: 700, fontSize: '0.95rem', letterSpacing: '-0.01em' }}>
                  Low Stock Alerts
                </h3>
                <span style={{
                  fontSize: '0.65rem', fontWeight: 700,
                  background: 'rgba(212,160,61,0.12)',
                  color: '#92670a',
                  border: '1px solid rgba(212,160,61,0.22)',
                  borderRadius: 999, padding: '2px 7px',
                }}>
                  {inventoryAlerts.length} items
                </span>
              </div>
              <button className="view-btn" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', fontWeight: 600, color: SAGE, background: 'transparent', border: 'none', cursor: 'pointer' }}>
                Manage <ArrowRight size={14} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {inventoryAlerts.map(item => (
                <div key={item.ingredient_id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 16px',
                  background: 'rgba(212,160,61,0.06)',
                  borderRadius: 14,
                  border: '1.5px solid rgba(212,160,61,0.15)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: 'rgba(212,160,61,0.12)',
                      border: '1.5px solid rgba(212,160,61,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Box size={16} style={{ color: '#D4A03D' }} />
                    </div>
                    <div>
                      <p style={{ fontWeight: 700, color: SAGE, fontSize: '0.85rem', marginBottom: 2 }}>
                        {item.name}
                      </p>
                      <p style={{ fontSize: '0.72rem', color: MUTED_GRAY, fontWeight: 500 }}>
                        {item.current_stock} {item.unit} remaining
                      </p>
                    </div>
                  </div>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '3px 10px', borderRadius: 999,
                    fontSize: '0.65rem', fontWeight: 700,
                    background: 'rgba(212,160,61,0.1)',
                    color: '#92670a',
                    border: '1px solid rgba(212,160,61,0.25)',
                  }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#D4A03D', display: 'inline-block' }} />
                    Low Stock
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}