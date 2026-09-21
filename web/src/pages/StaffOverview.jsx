// web/src/pages/StaffOverview.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // 👈 import
import axios from '/api/axios';
import {
  ShoppingBag, Clock, CheckCircle, Package, BarChart3, ArrowRight
} from 'lucide-react';

const SAGE = '#4F5F52';
const CREAM = '#F2EDE4';
const SOFT_WHITE = '#FFF3D9';
const MUTED_GRAY = '#A6A29A';

// Helpers
const formatDisplayDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const isToday = (dateStr) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const today = new Date();
  return d.getDate() === today.getDate() &&
         d.getMonth() === today.getMonth() &&
         d.getFullYear() === today.getFullYear();
};

const statusColors = {
  pending:   '#D4A03D',
  confirmed: '#5B7A8A',
  preparing: '#7A5B8A',
  ready:     '#5B8A5E',
  completed: '#4F5F52',
  cancelled: '#C75B5B',
};

const statusBg = {
  pending:   'rgba(212,160,61,0.1)',
  confirmed: 'rgba(91,122,138,0.1)',
  preparing: 'rgba(122,91,138,0.1)',
  ready:     'rgba(91,138,94,0.1)',
  completed: 'rgba(79,95,82,0.1)',
  cancelled: 'rgba(199,91,91,0.1)',
};

const statusBorder = {
  pending:   'rgba(212,160,61,0.22)',
  confirmed: 'rgba(91,122,138,0.2)',
  preparing: 'rgba(122,91,138,0.2)',
  ready:     'rgba(91,138,94,0.2)',
  completed: 'rgba(79,95,82,0.2)',
  cancelled: 'rgba(199,91,91,0.2)',
};

function Avatar({ name }) {
  const parts = name.trim().split(' ');
  const initials = (parts[0]?.[0] || '') + (parts[1]?.[0] || '');
  return (
    <div style={{
      width: 30, height: 30, borderRadius: '50%',
      background: `linear-gradient(135deg, ${SAGE}, #3e4c42)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
      fontSize: '0.65rem', fontWeight: 700, color: '#fff',
      letterSpacing: '0.02em',
      boxShadow: '0 2px 6px rgba(79,95,82,0.22)',
    }}>
      {initials.toUpperCase()}
    </div>
  );
}

export default function StaffOverview() {
  const navigate = useNavigate(); // 👈 hook for navigation

  const [stats, setStats] = useState({
    todayOrders: 0,
    pendingOrders: 0,
    completedToday: 0,
    productsCount: 0,
    lowStockItems: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [upcomingPickups, setUpcomingPickups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOverviewData = async () => {
    try {
      // 1. Fetch orders
      const ordersRes = await axios.get('/staff/orders');
      const orders = ordersRes.data.orders?.data || ordersRes.data.orders || [];

      // 2. Fetch products
      const productsRes = await axios.get('/menu');
      const products = productsRes.data.products || [];

      // Compute stats
      const today = new Date().toISOString().split('T')[0];
      const todayOrders = orders.filter(o => o.order_date?.startsWith(today)).length;
      const pendingOrders = orders.filter(o => o.status === 'pending').length;
      const completedToday = orders.filter(o => o.status === 'completed' && o.order_date?.startsWith(today)).length;
      const productsCount = products.length;
      const lowStockItems = products.filter(p => p.track_stock && (p.stock_quantity || 0) <= (p.min_stock_level || 0)).length;

      setStats({
        todayOrders,
        pendingOrders,
        completedToday,
        productsCount,
        lowStockItems,
      });

      // Recent orders (last 5 by order_date)
      const sorted = [...orders].sort((a, b) => new Date(b.order_date) - new Date(a.order_date));
      setRecentOrders(sorted.slice(0, 5));

      // Upcoming pickups today (confirmed/preparing/ready)
      const todayPickups = orders.filter(o =>
        o.pickup_date?.startsWith(today) &&
        ['confirmed', 'preparing', 'ready'].includes(o.status)
      );
      // Sort by pickup_time
      todayPickups.sort((a, b) => (a.pickup_time || '').localeCompare(b.pickup_time || ''));
      setUpcomingPickups(todayPickups.slice(0, 10));

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
          <p style={{ color: MUTED_GRAY, fontSize: '0.85rem' }}>Loading overview...</p>
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

  // Build stat cards data
  const statCards = [
    { label: "Today's Orders",  value: stats.todayOrders,  icon: ShoppingBag, trend: `${stats.todayOrders} today`, positive: true },
    { label: 'Pending Orders',  value: stats.pendingOrders, icon: Clock,        trend: `${stats.pendingOrders} pending`, positive: false },
    { label: 'Completed Today', value: stats.completedToday, icon: CheckCircle, trend: `${stats.completedToday} completed`, positive: true },
    { label: 'Products',        value: stats.productsCount, icon: Package,      trend: `${stats.lowStockItems} low stock`, positive: false },
  ];

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
          position: relative; overflow: hidden;
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
        .order-row:hover { background: rgba(242,237,228,0.7) !important; }
        .view-btn {
          transition: all 0.18s ease; border-radius: 10px; padding: 5px 10px;
          display: flex; align-items: center; gap: 5px;
          font-size: 0.78rem; font-weight: 600;
          background: transparent; border: none; cursor: pointer;
        }
        .view-btn:hover { background: rgba(79,95,82,0.08); transform: translateX(2px); }
        .pickup-card {
          transition: box-shadow 0.2s ease, transform 0.2s ease;
        }
        .pickup-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(79,95,82,0.1) !important;
        }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
        .fade-in   { animation: fadeInUp 0.4s ease both; }
        .fade-in-1 { animation: fadeInUp 0.4s 0.05s ease both; }
        .fade-in-2 { animation: fadeInUp 0.4s 0.10s ease both; }
        .fade-in-3 { animation: fadeInUp 0.4s 0.15s ease both; }
      `}</style>

      <div className="grain-overlay" />

      <div className="max-w-7xl mx-auto relative" style={{ zIndex: 1 }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 32 }} className="fade-in">
          <div style={{
            width: 36, height: 36,
            background: `linear-gradient(135deg, ${SAGE}, #3e4c42)`,
            borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(79,95,82,0.25)',
            flexShrink: 0, marginTop: 2,
          }}>
            <BarChart3 size={18} color="#fff" />
          </div>
          <div>
            <h1 style={{ color: SAGE, fontSize: '1.55rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
              Staff Overview
            </h1>
            <p style={{ color: MUTED_GRAY, fontSize: '0.82rem', letterSpacing: '0.03em' }}>
              Today's activity at a glance
            </p>
          </div>
        </div>

        <div className="divider-line" style={{ marginBottom: 28 }} />

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 fade-in-1" style={{ marginBottom: 28 }}>
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="stat-card" style={{
                background: '#fff',
                borderRadius: 20,
                border: '1.5px solid rgba(242,237,228,0.9)',
                boxShadow: '0 2px 12px rgba(79,95,82,0.06)',
                padding: '22px 22px 18px',
              }}>
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                  background: card.positive
                    ? `linear-gradient(90deg, ${SAGE}, #3e4c42)`
                    : `linear-gradient(90deg, #D4A03D, #b8872e)`,
                }} />

                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ color: MUTED_GRAY, fontSize: '0.72rem', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8 }}>
                      {card.label}
                    </p>
                    <p style={{ color: SAGE, fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 8 }}>
                      {card.value}
                    </p>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      fontSize: '0.68rem', fontWeight: 600,
                      padding: '2px 8px', borderRadius: 999,
                      background: card.positive ? 'rgba(52,196,104,0.1)' : 'rgba(212,160,61,0.1)',
                      color: card.positive ? '#1a7a3c' : '#92670a',
                      border: `1px solid ${card.positive ? 'rgba(52,196,104,0.2)' : 'rgba(212,160,61,0.2)'}`,
                    }}>
                      {card.trend}
                    </span>
                  </div>
                  <div style={{
                    width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                    background: card.positive
                      ? 'linear-gradient(135deg, rgba(79,95,82,0.12), rgba(79,95,82,0.06))'
                      : 'linear-gradient(135deg, rgba(212,160,61,0.14), rgba(212,160,61,0.06))',
                    border: `1.5px solid ${card.positive ? 'rgba(79,95,82,0.12)' : 'rgba(212,160,61,0.15)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={20} style={{ color: card.positive ? SAGE : '#D4A03D' }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Bottom Row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 fade-in-2">

          {/* Recent Orders */}
          <div className="panel" style={{ overflow: 'hidden' }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 22px',
              borderBottom: `1px solid ${CREAM}`,
              background: `linear-gradient(135deg, ${CREAM}, rgba(255,243,217,0.5))`,
            }}>
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
                <span style={{
                  fontSize: '0.65rem', fontWeight: 600, color: MUTED_GRAY,
                  background: 'rgba(166,162,154,0.12)', border: '1px solid rgba(166,162,154,0.2)',
                  borderRadius: 999, padding: '2px 7px',
                }}>
                  {recentOrders.length}
                </span>
              </div>
              <button
                className="view-btn"
                style={{ color: SAGE }}
                onClick={() => navigate('/pages/staff-dashboard/orders')} // 👈 navigation
              >
                View All <ArrowRight size={13} />
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(242,237,228,0.3)' }}>
                    {['Order #', 'Customer', 'Amount', 'Status'].map(col => (
                      <th key={col} style={{
                        padding: '10px 18px', textAlign: 'left',
                        fontSize: '0.65rem', fontWeight: 700, color: SAGE,
                        letterSpacing: '0.08em', textTransform: 'uppercase',
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
                        <td style={{ padding: '12px 18px', fontWeight: 700, color: SAGE, fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                          {order.order_number}
                        </td>
                        <td style={{ padding: '12px 18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Avatar name={order.customer_name || 'Walk-in'} />
                            <span style={{ color: MUTED_GRAY, fontSize: '0.78rem' }}>{order.customer_name || 'Walk-in'}</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 18px', fontWeight: 800, color: SAGE, fontSize: '0.88rem', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
                          ₱{parseFloat(order.total_amount).toLocaleString()}
                        </td>
                        <td style={{ padding: '12px 18px' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '3px 9px', borderRadius: 999,
                            fontSize: '0.65rem', fontWeight: 600,
                            background: statusBg[order.status] || 'rgba(166,162,154,0.1)',
                            color: statusColors[order.status] || MUTED_GRAY,
                            border: `1px solid ${statusBorder[order.status] || 'rgba(166,162,154,0.2)'}`,
                            textTransform: 'capitalize',
                          }}>
                            <span style={{
                              width: 5, height: 5, borderRadius: '50%',
                              background: statusColors[order.status] || MUTED_GRAY,
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

          {/* Upcoming Pickups */}
          <div className="panel" style={{ overflow: 'hidden' }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 22px',
              borderBottom: `1px solid ${CREAM}`,
              background: `linear-gradient(135deg, ${CREAM}, rgba(255,243,217,0.5))`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: `linear-gradient(135deg, ${SAGE}, #3e4c42)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(79,95,82,0.2)',
                }}>
                  <Clock size={13} color="#fff" />
                </div>
                <h3 style={{ color: SAGE, fontWeight: 700, fontSize: '0.95rem', letterSpacing: '-0.01em' }}>
                  Upcoming Pickups
                </h3>
                <span style={{
                  fontSize: '0.65rem', fontWeight: 600, color: MUTED_GRAY,
                  background: 'rgba(166,162,154,0.12)', border: '1px solid rgba(166,162,154,0.2)',
                  borderRadius: 999, padding: '2px 7px',
                }}>
                  {upcomingPickups.length} today
                </span>
              </div>
            </div>

            <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {upcomingPickups.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '28px 0', color: MUTED_GRAY }}>
                  <div style={{
                    width: 48, height: 48, background: 'rgba(166,162,154,0.1)', borderRadius: 12,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 10px', border: '1.5px dashed rgba(166,162,154,0.3)',
                  }}>
                    <Clock size={20} style={{ color: MUTED_GRAY, opacity: 0.4 }} />
                  </div>
                  <p style={{ fontSize: '0.82rem' }}>No pickups scheduled today</p>
                </div>
              ) : (
                upcomingPickups.map((pickup) => (
                  <div key={pickup.id} className="pickup-card" style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 16px',
                    background: 'rgba(79,95,82,0.05)',
                    borderRadius: 14,
                    border: '1.5px solid rgba(79,95,82,0.1)',
                    boxShadow: '0 2px 8px rgba(79,95,82,0.05)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Avatar name={pickup.customer_name || 'Walk-in'} />
                      <div>
                        <p style={{ fontWeight: 700, color: SAGE, fontSize: '0.88rem', letterSpacing: '-0.01em' }}>
                          {pickup.customer_name || 'Walk-in'}
                        </p>
                        <p style={{ fontSize: '0.7rem', color: MUTED_GRAY, marginTop: 2, fontWeight: 500 }}>
                          {pickup.order_number}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        background: '#fff',
                        border: '1.5px solid rgba(79,95,82,0.12)',
                        borderRadius: 8, padding: '3px 10px',
                        boxShadow: '0 1px 4px rgba(79,95,82,0.07)',
                      }}>
                        <Clock size={11} style={{ color: SAGE }} />
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: SAGE, letterSpacing: '-0.01em' }}>
                          {pickup.pickup_time ? pickup.pickup_time.slice(0,5) : '—'}
                        </span>
                      </div>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '2px 8px', borderRadius: 999,
                        fontSize: '0.62rem', fontWeight: 600,
                        background: 'rgba(52,196,104,0.1)',
                        color: '#1a7a3c',
                        border: '1px solid rgba(52,196,104,0.2)',
                        textTransform: 'capitalize',
                      }}>
                        <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#34c468', display: 'inline-block' }} />
                        {pickup.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}