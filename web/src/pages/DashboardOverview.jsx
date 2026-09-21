// web/src/pages/DashboardOverview.jsx

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '/api/axios';
import {
  ShoppingBag, DollarSign, Clock, AlertTriangle,
  BarChart3, TrendingUp, Box, ArrowRight
} from 'lucide-react';

// ── Chart.js imports ──
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  DoughnutController,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend, DoughnutController);

// Color palette
const SAGE = '#4F5F52';
const CREAM = '#F2EDE4';
const SOFT_WHITE = '#FFF3D9';
const MUTED_GRAY = '#A6A29A';

// Fallback used when a product has no explicit min_stock_level configured.
// MUST match the constant used in Inventory.jsx so both pages agree.
const DEFAULT_MIN_STOCK = 2;

// Helper — returns the effective min_stock_level for a product.
// Mirrors the same rule used on the Inventory page.
const getEffectiveMinStock = (product) => {
  const rawMin = product?.min_stock_level ?? 0;
  return rawMin > 0 ? rawMin : DEFAULT_MIN_STOCK;
};

// Status colours (same as admin orders)
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

// ── Helper ──
const isToday = (dateStr) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const today = new Date();
  return d.getDate() === today.getDate() &&
         d.getMonth() === today.getMonth() &&
         d.getFullYear() === today.getFullYear();
};

// ── Component ──
export default function DashboardOverview() {
  const navigate = useNavigate();

  // State
  const [stats, setStats] = useState({
    todayOrders: 0,
    revenueToday: 0,
    pendingOrders: 0,
    lowStockItems: 0,
    pendingLossReports: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [inventoryAlerts, setInventoryAlerts] = useState([]);
  const [salesData, setSalesData] = useState([]);
  const [orderStatusData, setOrderStatusData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const chartRef = useRef(null);

  // Fetch data
  const fetchOverviewData = async () => {
    try {
      // 1. Fetch orders (admin endpoint)
      const ordersRes = await axios.get('/admin/orders');
      const orders = ordersRes.data.orders?.data || ordersRes.data.orders || [];
      console.log('Orders fetched:', orders.length);

      // 2. Fetch products (admin menu)
      const productsRes = await axios.get('/admin/menu');
      const products = productsRes.data.products || [];


      let pendingLossReports = 0;
      try {
        const lossRes = await axios.get('/admin/lost-and-damages', {
          params: { status: 'pending', per_page: 1 },
        });
        pendingLossReports = lossRes.data?.stats?.pending ?? lossRes.data?.records?.total ?? 0;
      } catch (e) {
        console.warn('Failed to fetch pending loss reports', e);
      }

      // Compute stats
      const today = new Date().toISOString().split('T')[0];
      const todayOrders = orders.filter(o => o.order_date?.startsWith(today)).length;
      const pendingOrders = orders.filter(o => o.status === 'pending').length;
      const revenueToday = orders
        .filter(o => o.status === 'completed' && o.order_date?.startsWith(today))
        .reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);

      // ── Low stock uses the SAME fallback rule as Inventory.jsx ──
      const lowStockProductsList = products.filter(p => {
        if (!p.track_stock) return false;
        const stock = p.stock_quantity ?? 0;
        const min   = getEffectiveMinStock(p);
        return stock <= min;
      });

      setStats({
        todayOrders,
        revenueToday,
        pendingOrders,
        lowStockItems: lowStockProductsList.length,
        pendingLossReports,
      });

      // Recent orders
      const sorted = [...orders].sort((a, b) => new Date(b.order_date) - new Date(a.order_date));
      setRecentOrders(sorted.slice(0, 5));

      // Inventory alerts — same filter, sorted by stock ascending (most urgent first)
      const sortedLowStock = [...lowStockProductsList].sort(
        (a, b) => (a.stock_quantity ?? 0) - (b.stock_quantity ?? 0)
      );
      setInventoryAlerts(sortedLowStock.slice(0, 3));

      // ── Sales Overview (last 7 days) ──
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
        const dayTotal = orders
          .filter(o => o.order_date?.startsWith(dateStr) && o.status !== 'cancelled')
          .reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
        last7Days.push({ day: dayName, amount: dayTotal });
      }
      setSalesData(last7Days);

      // ── Order Status Distribution ──
      const statusOrder = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'];
      const statusCounts = {};
      orders.forEach(o => {
        const status = o.status || 'unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      const statusData = statusOrder.map(s => ({
        status: s,
        count: statusCounts[s] || 0,
        color: statusColorMap[s] || MUTED_GRAY,
      }));
      setOrderStatusData(statusData);

      setError(null);
    } catch (err) {
      console.error('Failed to fetch overview data:', err);
      setError(err.response?.data?.message || 'Failed to load overview data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverviewData();
  }, []);

  if (loading) {
    return (
      <div style={{ background: CREAM, minHeight: '100vh' }} className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-t-2" style={{ borderColor: SAGE }} />
          <p style={{ color: MUTED_GRAY, fontSize: '0.85rem' }}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-2xl m-6" style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FEE2E2' }}>
        <span style={{ fontSize: '0.875rem' }}>Error: {error}</span>
      </div>
    );
  }

  // Stat cards data
  const statCards = [
    { label: "Today's Orders", value: stats.todayOrders, icon: ShoppingBag, trend: `${stats.todayOrders} today`, up: true },
    { label: "Today's Revenue", value: `₱${stats.revenueToday.toLocaleString()}`, icon: TrendingUp, trend: `${stats.revenueToday > 0 ? '+' : ''}${stats.revenueToday.toLocaleString()}`, up: stats.revenueToday > 0 },
    { label: 'Pending Orders', value: stats.pendingOrders, icon: Clock, trend: `${stats.pendingOrders} pending`, up: false },
    { label: 'Low Stock Items', value: stats.lowStockItems, icon: AlertTriangle, trend: `${stats.lowStockItems} need restock`, up: false },
    { label: 'Pending Loss Reports', value: stats.pendingLossReports, icon: AlertTriangle, trend: `${stats.pendingLossReports} pending`, up: false },
  ];

  // ── Sales bar chart ──
  const maxSales = Math.max(...salesData.map(d => d.amount), 0);
  const totalOrders = orderStatusData.reduce((sum, s) => sum + s.count, 0);

  // ── Chart.js data for doughnut ──
  const chartLabels = orderStatusData.map(s => s.status);
  const chartColors = orderStatusData.map(s => s.color);
  const chartCounts = orderStatusData.map(s => s.count);

  const chartData = {
    labels: chartLabels,
    datasets: [
      {
        data: chartCounts,
        backgroundColor: chartColors,
        borderColor: '#fff',
        borderWidth: 2,
        borderRadius: 6,
        spacing: 8,
        offset: 8,
      },
    ],
  };

  const chartOptions = {
    cutout: '50%',
    plugins: {
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed || 0;
            return `${label}: ${value}`;
          }
        },
        backgroundColor: 'rgba(0,0,0,0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(255,255,255,0.2)',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 10,
        position: 'nearest',
      },
      legend: {
        display: false,
      },
    },
    animation: {
      animateRotate: true,
    },
  };

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
        .order-row { transition: background 0.15s ease; }
        .order-row:hover { background: rgba(242,237,228,0.7); }
        .view-btn {
          transition: all 0.18s ease;
          border-radius: 10px;
          padding: 5px 10px;
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 0.78rem;
          font-weight: 600;
          background: transparent;
          border: none;
          cursor: pointer;
        }
        .view-btn:hover {
          background: rgba(79,95,82,0.08);
          transform: translateX(2px);
        }
        .bar-col {
          transition: opacity 0.15s ease;
        }
        .bar-col:hover { opacity: 0.75; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
        .fade-in   { animation: fadeInUp 0.4s ease both; }
        .fade-in-1 { animation: fadeInUp 0.4s 0.05s ease both; }
        .fade-in-2 { animation: fadeInUp 0.4s 0.10s ease both; }
        .fade-in-3 { animation: fadeInUp 0.4s 0.15s ease both; }

        .status-card {
          background: #fff;
          border-radius: 20px;
          border: 1.5px solid rgba(242,237,228,0.9);
          box-shadow: 0 2px 12px rgba(79,95,82,0.06);
          padding: 22px 24px;
          transition: box-shadow 0.3s ease;
        }
        .status-card:hover {
          box-shadow: 0 8px 28px rgba(79,95,82,0.12);
        }
        .status-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
        }
        .status-header-icon {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          background: linear-gradient(135deg, ${SAGE}, #3e4c42);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(79,95,82,0.2);
        }
        .status-header-title {
          color: ${SAGE};
          font-weight: 700;
          font-size: 0.95rem;
          letter-spacing: -0.01em;
        }
        .doughnut-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          margin-bottom: 12px;
        }
        .doughnut-container {
          width: 180px;
          height: 180px;
          position: relative;
          border-radius: 50%;
          box-shadow: 0 8px 24px rgba(79,95,82,0.14);
          z-index: 1;
        }
        .doughnut-container canvas {
          border-radius: 50% !important;
        }
        .doughnut-hole {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 90px;
          height: 90px;
          background: #fff;
          border-radius: 50%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          box-shadow: inset 0 2px 8px rgba(79,95,82,0.08);
          pointer-events: none;
          z-index: 2;
        }
        .doughnut-total {
          font-size: 1.3rem;
          font-weight: 800;
          color: ${SAGE};
          letter-spacing: -0.03em;
          line-height: 1;
        }
        .doughnut-label {
          font-size: 0.62rem;
          color: ${MUTED_GRAY};
          font-weight: 500;
          margin-top: 2px;
        }
        .legend-grid {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 8px 16px;
          margin-top: 6px;
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(242,237,228,0.5);
          padding: 4px 12px 4px 8px;
          border-radius: 20px;
          border: 1px solid rgba(242,237,228,0.9);
        }
        .legend-color {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .legend-text {
          font-size: 0.72rem;
          color: ${MUTED_GRAY};
          font-weight: 500;
          text-transform: capitalize;
        }
        .legend-count {
          font-weight: 700;
          color: ${SAGE};
          margin-left: 2px;
        }
        .chartjs-tooltip {
          z-index: 999 !important;
        }
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 mb-7 fade-in-1">
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
                const heightPct = maxSales > 0 ? (d.amount / maxSales) * 100 : 0;
                const isMax = d.amount === maxSales && maxSales > 0;
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

          {/* Order Status Distribution */}
          <div className="status-card">
            <div className="status-header">
              <div className="status-header-icon">
                <BarChart3 size={13} color="#fff" />
              </div>
              <h3 className="status-header-title">Order Status Distribution</h3>
            </div>

            <div className="doughnut-wrapper">
              <div className="doughnut-container">
                <Doughnut
                  ref={chartRef}
                  data={chartData}
                  options={chartOptions}
                  key={JSON.stringify(chartData)}
                />
                <div className="doughnut-hole">
                  <span className="doughnut-total">{totalOrders}</span>
                  <span className="doughnut-label">orders</span>
                </div>
              </div>
            </div>

            <div className="legend-grid">
              {orderStatusData.map(s => (
                <div key={s.status} className="legend-item">
                  <span className="legend-color" style={{ background: s.color }} />
                  <span className="legend-text">
                    {s.status} <span className="legend-count">({s.count})</span>
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
              <button
                className="view-btn"
                style={{ color: SAGE }}
                onClick={() => navigate('/pages/dashboard/orders')}
              >
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
                  {recentOrders.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: MUTED_GRAY }}>
                        No orders found
                      </td>
                    </tr>
                  ) : (
                    recentOrders.map((order, idx) => (
                      <tr key={order.id} className="order-row" style={{ borderTop: idx === 0 ? 'none' : `1px solid rgba(242,237,228,0.8)` }}>
                        <td style={{ padding: '11px 14px', fontWeight: 700, color: SAGE, whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                          {order.order_number}
                        </td>
                        <td style={{ padding: '11px 14px', color: MUTED_GRAY, fontSize: '0.78rem' }}>
                          {order.customer_name || 'Walk-in'}
                        </td>
                        <td style={{ padding: '11px 14px', fontWeight: 800, color: SAGE, fontSize: '0.88rem', letterSpacing: '-0.01em' }}>
                          ₱{parseFloat(order.total_amount || 0).toLocaleString()}
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
                    ))
                  )}
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
              <button
                className="view-btn"
                style={{ color: SAGE }}
                onClick={() => navigate('/pages/dashboard/products')}
              >
                Manage <ArrowRight size={14} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {inventoryAlerts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '28px 0', color: MUTED_GRAY }}>
                  <div style={{
                    width: 48, height: 48, background: 'rgba(166,162,154,0.1)', borderRadius: 12,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 10px', border: '1.5px dashed rgba(166,162,154,0.3)',
                  }}>
                    <Box size={20} style={{ color: MUTED_GRAY, opacity: 0.4 }} />
                  </div>
                  <p style={{ fontSize: '0.82rem' }}>No low stock items</p>
                </div>
              ) : (
                inventoryAlerts.map(item => {
                  // Use effective min (with fallback) so the display matches Inventory.jsx
                  const effectiveMin = getEffectiveMinStock(item);
                  const isOutOfStock = (item.stock_quantity ?? 0) <= 0;

                  return (
                    <div key={item.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '14px 16px',
                      background: isOutOfStock ? 'rgba(199,91,91,0.06)' : 'rgba(212,160,61,0.06)',
                      borderRadius: 14,
                      border: `1.5px solid ${isOutOfStock ? 'rgba(199,91,91,0.18)' : 'rgba(212,160,61,0.15)'}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 10,
                          background: isOutOfStock ? 'rgba(199,91,91,0.12)' : 'rgba(212,160,61,0.12)',
                          border: `1.5px solid ${isOutOfStock ? 'rgba(199,91,91,0.2)' : 'rgba(212,160,61,0.2)'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          <Box size={16} style={{ color: isOutOfStock ? '#C75B5B' : '#D4A03D' }} />
                        </div>
                        <div>
                          <p style={{ fontWeight: 700, color: SAGE, fontSize: '0.85rem', marginBottom: 2 }}>
                            {item.name}
                          </p>
                          <p style={{ fontSize: '0.72rem', color: MUTED_GRAY, fontWeight: 500 }}>
                            {item.stock_quantity ?? 0} in stock (min: {effectiveMin})
                          </p>
                        </div>
                      </div>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '3px 10px', borderRadius: 999,
                        fontSize: '0.65rem', fontWeight: 700,
                        background: isOutOfStock ? 'rgba(199,91,91,0.1)' : 'rgba(212,160,61,0.1)',
                        color: isOutOfStock ? '#C75B5B' : '#92670a',
                        border: `1px solid ${isOutOfStock ? 'rgba(199,91,91,0.25)' : 'rgba(212,160,61,0.25)'}`,
                      }}>
                        <span style={{
                          width: 5, height: 5, borderRadius: '50%',
                          background: isOutOfStock ? '#C75B5B' : '#D4A03D',
                          display: 'inline-block',
                        }} />
                        {isOutOfStock ? 'Out of Stock' : 'Low Stock'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}