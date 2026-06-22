// web/src/pages/Orders.jsx

import React, { useState, useEffect, useCallback } from 'react';
import axios from '/api/axios';
import {
  Loader,
  AlertCircle,
  Calendar,
  X,
  Check,
  Search,
  ShoppingBag,
  CheckCircle,
  XCircle,
} from 'lucide-react';

const SAGE = '#4F5F52';
const CREAM = '#F2EDE4';
const MUTED_GRAY = '#A6A29A';

const statusColors = {
  pending: '#D4A03D',
  confirmed: '#5B7A8A',
  preparing: '#7A5B8A',
  ready: '#5B8A5E',
  completed: '#4F5F52',
  cancelled: '#C75B5B',
};

const statusBg = {
  pending: 'rgba(212,160,61,0.1)',
  confirmed: 'rgba(91,122,138,0.1)',
  preparing: 'rgba(122,91,138,0.1)',
  ready: 'rgba(91,138,94,0.1)',
  completed: 'rgba(79,95,82,0.1)',
  cancelled: 'rgba(199,91,91,0.1)',
};

// Helper to format date to YYYY-MM-DD
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr; // fallback
  return d.toLocaleDateString('en-CA'); // produces YYYY-MM-DD in local time
};

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [scheduleModal, setScheduleModal] = useState({ show: false, order: null });
  const [scheduleForm, setScheduleForm] = useState({ pickup_date: '', pickup_time: '' });
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const [rejectModal, setRejectModal] = useState({ show: false, orderId: null });
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const extractOrdersArray = (responseData) => {
    if (Array.isArray(responseData)) return responseData;
    if (responseData?.data && Array.isArray(responseData.data)) return responseData.data;
    if (responseData?.orders) {
      if (Array.isArray(responseData.orders)) return responseData.orders;
      if (responseData.orders?.data && Array.isArray(responseData.orders.data)) return responseData.orders.data;
    }
    return [];
  };

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (searchTerm) params.search = searchTerm;
      const response = await axios.get('/admin/orders', { params });
      const ordersArray = extractOrdersArray(response.data);
      setOrders(ordersArray);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) setError('Unauthorized. Please login again.');
      else if (err.response?.status === 403) setError('Access denied.');
      else setError(err.response?.data?.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchTerm]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleApprove = async (orderId) => {
    if (!window.confirm('Approve this order? The schedule will be confirmed.')) return;
    setActionLoading(orderId);
    try {
      await axios.put(`/admin/orders/${orderId}/approve`);
      await fetchOrders();
      alert('Order approved successfully.');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to approve order.');
    } finally {
      setActionLoading(null);
    }
  };

  const openScheduleModal = (order) => {
    setScheduleModal({ show: true, order });
    setScheduleForm({
      pickup_date: order.pickup_date || '',
      pickup_time: order.pickup_time ? order.pickup_time.slice(0, 5) : '',
    });
  };

  const handleScheduleSave = async () => {
    if (!scheduleModal.order) return;
    setSavingSchedule(true);
    try {
      let formattedTime = scheduleForm.pickup_time;
      if (formattedTime && formattedTime.split(':').length === 2) {
        formattedTime = `${formattedTime}:00`;
      }

      const payload = {
        pickup_date: scheduleForm.pickup_date,
        pickup_time: formattedTime,
      };

      await axios.put(`/admin/orders/${scheduleModal.order.id}/schedule`, payload);
      await fetchOrders();
      setScheduleModal({ show: false, order: null });
      alert('Schedule updated successfully.');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to update schedule');
    } finally {
      setSavingSchedule(false);
    }
  };

  if (loading) {
    return (
      <div style={{ background: CREAM, minHeight: '100vh' }} className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader className="animate-spin" style={{ color: SAGE }} size={36} />
          <p style={{ color: MUTED_GRAY, fontSize: '0.85rem', letterSpacing: '0.05em' }}>Loading orders…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex items-center gap-3 p-4 rounded-2xl m-6"
        style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FEE2E2' }}
      >
        <AlertCircle size={20} />
        <span style={{ fontSize: '0.875rem' }}>{error}</span>
      </div>
    );
  }

  return (
    <div style={{ background: CREAM, minHeight: '100vh', padding: '36px 28px' }}>
      <style>{`
        .grain-overlay {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          opacity: 0.028;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
          background-repeat: repeat;
          background-size: 128px;
        }
        .divider-line { height: 1px; background: linear-gradient(90deg, transparent, rgba(79,95,82,0.15), transparent); }
        .order-row { transition: background 0.15s ease; }
        .order-row:hover { background: rgba(242,237,228,0.7) !important; }
        .action-btn { transition: all 0.18s ease; border-radius: 10px; border: none; cursor: pointer; }
        .action-btn:hover { transform: scale(1.12); }
        .primary-btn { position: relative; overflow: hidden; transition: all 0.22s cubic-bezier(0.4,0,0.2,1); border: none; cursor: pointer; }
        .primary-btn::before { content: ''; position: absolute; inset: 0; background: rgba(255,255,255,0.1); opacity: 0; transition: opacity 0.2s; }
        .primary-btn:hover::before { opacity: 1; }
        .primary-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(79,95,82,0.3); }
        .primary-btn:active { transform: translateY(0); }
        .sec-btn { transition: all 0.2s ease; cursor: pointer; }
        .sec-btn:hover { background: rgba(79,95,82,0.07) !important; transform: translateY(-1px); }
        .modal-input:focus { box-shadow: 0 0 0 3px rgba(79,95,82,0.12); border-color: #4F5F52 !important; outline: none; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
        .fade-in { animation: fadeInUp 0.4s ease both; }
        .fade-in-1 { animation: fadeInUp 0.4s 0.05s ease both; }
        @keyframes modalIn { from { opacity: 0; transform: scale(0.96) translateY(12px); } to { opacity: 1; transform: none; } }
        .anim-modal { animation: modalIn 0.25s cubic-bezier(0.25,0.46,0.45,0.94); }
      `}</style>

      <div className="grain-overlay" />
      <div className="max-w-7xl mx-auto relative" style={{ zIndex: 1 }}>
        {/* Header */}
        <div className="flex flex-wrap justify-between items-start gap-4 mb-8 fade-in">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div
                style={{
                  width: 36,
                  height: 36,
                  background: `linear-gradient(135deg, ${SAGE}, #3e4c42)`,
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(79,95,82,0.25)',
                  flexShrink: 0,
                }}
              >
                <ShoppingBag size={18} color="#fff" />
              </div>
              <h1 style={{ color: SAGE, fontSize: '1.55rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
                Order Management
              </h1>
            </div>
            <p style={{ color: MUTED_GRAY, fontSize: '0.82rem', letterSpacing: '0.03em', marginLeft: 48 }}>
              View customer orders, approve/reject, and manage pickup schedules
            </p>
          </div>
        </div>

        <div className="divider-line mb-7" />

        {/* Filters */}
        <div className="fade-in-1 flex flex-wrap gap-4 mb-8">
          <div className="relative flex-1 min-w-[200px]">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2"
              style={{ color: MUTED_GRAY }}
            />
            <input
              type="text"
              placeholder="Search order # or customer name…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="modal-input w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm"
              style={{
                borderColor: 'rgba(166,162,154,0.3)',
                color: SAGE,
                background: '#fafafa',
              }}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="modal-input px-4 py-2.5 rounded-xl border text-sm"
            style={{
              borderColor: 'rgba(166,162,154,0.3)',
              color: SAGE,
              background: '#fafafa',
            }}
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="preparing">Preparing</option>
            <option value="ready">Ready</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Orders Table */}
        <div
          className="fade-in-1"
          style={{
            background: '#fff',
            borderRadius: 20,
            border: '1.5px solid rgba(242,237,228,0.9)',
            boxShadow: '0 2px 12px rgba(79,95,82,0.06)',
            overflow: 'hidden',
          }}
        >
          <div className="overflow-x-auto">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr
                  style={{
                    background: `linear-gradient(135deg, ${CREAM}, rgba(255,243,217,0.5))`,
                    borderBottom: `1.5px solid ${CREAM}`,
                  }}
                >
                  {['Order #', 'Customer', 'Date', 'Pickup', 'Total', 'Status', 'Payment', 'Items', 'Actions'].map(
                    (col) => (
                      <th
                        key={col}
                        style={{
                          padding: '13px 20px',
                          textAlign: 'left',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          color: SAGE,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {col}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr key="no-orders">
                    <td colSpan="9" style={{ textAlign: 'center', padding: '48px 20px', color: MUTED_GRAY }}>
                      <div
                        style={{
                          width: 56,
                          height: 56,
                          background: 'rgba(166,162,154,0.1)',
                          borderRadius: 16,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 12px',
                          border: '1.5px dashed rgba(166,162,154,0.3)',
                        }}
                      >
                        <ShoppingBag size={24} style={{ color: MUTED_GRAY, opacity: 0.4 }} />
                      </div>
                      <p style={{ fontSize: '0.85rem' }}>No orders found</p>
                    </td>
                  </tr>
                ) : (
                  orders.map((order, idx) => (
                    <tr
                      key={order.id}
                      className="order-row"
                      style={{
                        borderTop: idx === 0 ? 'none' : `1px solid rgba(242,237,228,0.8)`,
                      }}
                    >
                      <td
                        style={{
                          padding: '13px 20px',
                          fontWeight: 700,
                          color: SAGE,
                          whiteSpace: 'nowrap',
                          fontSize: '0.85rem',
                        }}
                      >
                        {order.order_number}
                      </td>
                      <td style={{ padding: '13px 20px' }}>
                        <p style={{ fontWeight: 600, color: SAGE, margin: 0 }}>{order.customer_name}</p>
                        {order.customer_phone && (
                          <p style={{ fontSize: '0.72rem', color: MUTED_GRAY, margin: 0 }}>
                            {order.customer_phone}
                          </p>
                        )}
                      </td>
                      <td
                        style={{
                          padding: '13px 20px',
                          color: MUTED_GRAY,
                          fontSize: '0.78rem',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {new Date(order.order_date).toLocaleDateString('en-PH')}
                      </td>
                      <td style={{ padding: '13px 20px', whiteSpace: 'nowrap' }}>
                        {order.pickup_date ? (
                          <div>
                            <span style={{ color: SAGE, fontWeight: 600 }}>
                              {formatDate(order.pickup_date)}
                            </span>
                            {order.pickup_time && (
                              <span style={{ color: MUTED_GRAY, marginLeft: 4 }}>
                                {order.pickup_time.slice(0, 5)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: MUTED_GRAY, fontSize: '0.78rem' }}>—</span>
                        )}
                      </td>
                      <td
                        style={{
                          padding: '13px 20px',
                          fontWeight: 700,
                          color: SAGE,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        ₱{parseFloat(order.total_amount).toLocaleString()}
                      </td>
                      <td style={{ padding: '13px 20px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '3px 10px',
                            borderRadius: 999,
                            fontSize: '0.68rem',
                            fontWeight: 600,
                            background: statusBg[order.status] || 'rgba(166,162,154,0.1)',
                            color: statusColors[order.status] || MUTED_GRAY,
                            border: `1px solid ${statusColors[order.status]}33`,
                            textTransform: 'capitalize',
                          }}
                        >
                          <span
                            style={{
                              width: 5,
                              height: 5,
                              borderRadius: '50%',
                              background: statusColors[order.status] || MUTED_GRAY,
                              display: 'inline-block',
                            }}
                          />
                          {order.status}
                        </span>
                      </td>
                      <td style={{ padding: '13px 20px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '3px 10px',
                            borderRadius: 999,
                            fontSize: '0.68rem',
                            fontWeight: 600,
                            background:
                              order.payment_status === 'paid'
                                ? 'rgba(52,196,104,0.1)'
                                : order.payment_status === 'partially_paid'
                                ? 'rgba(234,179,8,0.1)'
                                : 'rgba(239,68,68,0.08)',
                            color:
                              order.payment_status === 'paid'
                                ? '#1a7a3c'
                                : order.payment_status === 'partially_paid'
                                ? '#92670a'
                                : '#c0392b',
                            border: `1px solid ${
                              order.payment_status === 'paid'
                                ? 'rgba(52,196,104,0.2)'
                                : order.payment_status === 'partially_paid'
                                ? 'rgba(234,179,8,0.2)'
                                : 'rgba(239,68,68,0.15)'
                            }`,
                            textTransform: 'capitalize',
                          }}
                        >
                          {order.payment_status?.replace('_', ' ')}
                        </span>
                      </td>
                      {/* Items Column */}
                      <td style={{ padding: '13px 20px' }}>
                        <div className="flex flex-wrap gap-1">
                          {order.items?.map((item) => (
                            <span
                              key={item.id}
                              style={{
                                display: 'inline-block',
                                background: 'rgba(79,95,82,0.07)',
                                color: SAGE,
                                borderRadius: 5,
                                padding: '2px 6px',
                                fontSize: '0.72rem',
                                marginBottom: 2,
                              }}
                            >
                              {item.menu?.name} ×{item.quantity}
                            </span>
                          ))}
                        </div>
                      </td>
                      {/* Actions Column */}
                      <td style={{ padding: '13px 20px', whiteSpace: 'nowrap' }}>
                        <div className="flex items-center gap-2">
                          {order.customer_id !== null && (
                            <>
                              {order.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => handleApprove(order.id)}
                                    disabled={actionLoading === order.id}
                                    className="action-btn p-1.5 rounded-lg"
                                    style={{
                                      background: 'rgba(52,196,104,0.1)',
                                      color: '#1a7a3c',
                                    }}
                                    title="Approve order"
                                  >
                                    {actionLoading === order.id ? (
                                      <Loader size={14} className="animate-spin" />
                                    ) : (
                                      <CheckCircle size={14} />
                                    )}
                                  </button>
                                  <button
                                    onClick={() => setRejectModal({ show: true, orderId: order.id })}
                                    disabled={actionLoading === order.id}
                                    className="action-btn p-1.5 rounded-lg"
                                    style={{
                                      background: 'rgba(239,68,68,0.1)',
                                      color: '#dc2626',
                                    }}
                                    title="Reject order"
                                  >
                                    <XCircle size={14} />
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => openScheduleModal(order)}
                                className="action-btn p-1.5 rounded-lg"
                                style={{
                                  background: 'rgba(79,95,82,0.08)',
                                  color: SAGE,
                                }}
                                title="Set pickup schedule"
                              >
                                <Calendar size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Schedule Modal */}
      {scheduleModal.show && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(30,35,30,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: 16,
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            className="anim-modal"
            style={{
              background: '#fff',
              borderRadius: 22,
              width: '100%',
              maxWidth: 420,
              boxShadow: '0 24px 60px rgba(79,95,82,0.18), 0 4px 16px rgba(0,0,0,0.08)',
              border: '1px solid rgba(242,237,228,0.8)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '20px 24px',
                borderBottom: `1px solid ${CREAM}`,
                background: `linear-gradient(135deg, rgba(79,95,82,0.04), rgba(255,243,217,0.3))`,
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  style={{
                    width: 32,
                    height: 32,
                    background: `linear-gradient(135deg, ${SAGE}, #3e4c42)`,
                    borderRadius: 9,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 3px 10px rgba(79,95,82,0.25)',
                  }}
                >
                  <Calendar size={15} color="#fff" />
                </div>
                <h3 style={{ color: SAGE, fontWeight: 700, fontSize: '1.05rem', letterSpacing: '-0.01em' }}>
                  Update Pickup Schedule
                </h3>
              </div>
              <button
                onClick={() => setScheduleModal({ show: false, order: null })}
                style={{
                  color: MUTED_GRAY,
                  padding: 7,
                  borderRadius: 10,
                  transition: 'all 0.15s',
                  background: 'transparent',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = CREAM)}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '24px 26px', display: 'flex', flexDirection: 'column', gap: 18 }}>
              <p style={{ fontSize: '0.85rem', color: SAGE, fontWeight: 600 }}>
                Order: {scheduleModal.order?.order_number}
              </p>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    color: SAGE,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    marginBottom: 6,
                  }}
                >
                  Pickup Date *
                </label>
                <input
                  type="date"
                  value={scheduleForm.pickup_date}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, pickup_date: e.target.value })}
                  className="modal-input w-full px-3.5 py-2.5 rounded-xl border text-sm"
                  style={{
                    borderColor: 'rgba(166,162,154,0.3)',
                    color: SAGE,
                    background: '#fafafa',
                  }}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    color: SAGE,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    marginBottom: 6,
                  }}
                >
                  Pickup Time *
                </label>
                <input
                  type="time"
                  value={scheduleForm.pickup_time}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, pickup_time: e.target.value })}
                  className="modal-input w-full px-3.5 py-2.5 rounded-xl border text-sm"
                  style={{
                    borderColor: 'rgba(166,162,154,0.3)',
                    color: SAGE,
                    background: '#fafafa',
                  }}
                  step="60"
                />
              </div>

              <div className="divider-line" />

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setScheduleModal({ show: false, order: null })}
                  className="sec-btn px-5 py-2.5 rounded-xl border text-sm font-medium"
                  style={{
                    borderColor: 'rgba(166,162,154,0.3)',
                    color: MUTED_GRAY,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleScheduleSave}
                  disabled={savingSchedule}
                  className="primary-btn flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50"
                  style={{
                    background: `linear-gradient(135deg, ${SAGE}, #3e4c42)`,
                    cursor: 'pointer',
                  }}
                >
                  {savingSchedule ? <Loader size={15} className="animate-spin" /> : <Check size={16} />}
                  {savingSchedule ? 'Saving…' : 'Save Schedule'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectModal.show && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(30,35,30,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: 16,
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            className="anim-modal"
            style={{
              background: '#fff',
              borderRadius: 22,
              width: '100%',
              maxWidth: 480,
              boxShadow: '0 24px 60px rgba(79,95,82,0.18)',
              border: '1px solid rgba(242,237,228,0.8)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '20px 24px',
                borderBottom: `1px solid ${CREAM}`,
                background: `linear-gradient(135deg, rgba(79,95,82,0.04), rgba(255,243,217,0.3))`,
              }}
            >
              <h3 style={{ color: SAGE, fontWeight: 700, fontSize: '1.1rem' }}>Reject Order</h3>
              <button
                onClick={() => {
                  setRejectModal({ show: false, orderId: null });
                  setRejectReason('');
                }}
                style={{
                  color: MUTED_GRAY,
                  padding: 7,
                  borderRadius: 10,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '24px' }}>
              <p style={{ marginBottom: 16, color: SAGE, fontSize: '0.95rem' }}>
                Please provide a reason for rejecting this order.
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter rejection reason..."
                rows={4}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: 12,
                  border: '1.5px solid rgba(166,162,154,0.3)',
                  color: SAGE,
                  fontSize: '0.9rem',
                  resize: 'vertical',
                  minHeight: '100px',
                  outline: 'none',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20 }}>
                <button
                  onClick={() => {
                    setRejectModal({ show: false, orderId: null });
                    setRejectReason('');
                  }}
                  className="sec-btn px-5 py-2.5 rounded-xl border text-sm font-medium"
                  style={{
                    borderColor: 'rgba(166,162,154,0.3)',
                    color: MUTED_GRAY,
                    background: 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!rejectReason.trim()) {
                      alert('Please provide a rejection reason.');
                      return;
                    }
                    setRejecting(true);
                    try {
                      await axios.put(`/admin/orders/${rejectModal.orderId}/reject`, {
                        reason: rejectReason.trim(),
                      });
                      await fetchOrders();
                      setRejectModal({ show: false, orderId: null });
                      setRejectReason('');
                      alert('Order rejected successfully.');
                    } catch (err) {
                      alert(err.response?.data?.message || 'Failed to reject order.');
                    } finally {
                      setRejecting(false);
                    }
                  }}
                  disabled={rejecting}
                  className="primary-btn flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50"
                  style={{
                    background: `linear-gradient(135deg, ${SAGE}, #3e4c42)`,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {rejecting ? <Loader size={15} className="animate-spin" /> : 'Confirm Rejection'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}