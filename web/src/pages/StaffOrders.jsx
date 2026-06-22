// src/pages/StaffOrders.jsx

import React, { useState, useEffect } from 'react';
import axios from '/api/axios';
import {
  Loader, AlertCircle, Search, ShoppingBag, Plus, X, Check,
  Ban, Play, AlertTriangle, Trash2
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
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-CA');
};

export default function StaffOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [menuItems, setMenuItems] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [createForm, setCreateForm] = useState({
    customer_name: '',
    customer_phone: '',
    pickup_date: '',
    pickup_time: '',
    notes: '',
    items: [{ menu_id: '', quantity: 1 }],
  });

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      const res = await axios.get('/staff/orders', { params });
      setOrders(res.data.orders?.data || res.data.orders || []);
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchMenu = async () => {
    try {
      const res = await axios.get('/menu');
      setMenuItems(res.data.products || res.data.menu || []);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchOrders(); fetchMenu(); }, [statusFilter, search]);

  const addItemToCreate = () => setCreateForm(prev => ({
    ...prev, items: [...prev.items, { menu_id: '', quantity: 1 }]
  }));
  const removeItemFromCreate = (idx) => {
    if (createForm.items.length <= 1) return;
    setCreateForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));
  };
  const updateItemCreate = (idx, field, value) => {
    const items = [...createForm.items];
    items[idx][field] = value;
    setCreateForm(prev => ({ ...prev, items }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post('/staff/orders', createForm);
      setShowCreateModal(false);
      setCreateForm({
        customer_name: '', customer_phone: '', pickup_date: '', pickup_time: '', notes: '',
        items: [{ menu_id: '', quantity: 1 }],
      });
      fetchOrders();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!confirmCancel) return;
    setSubmitting(true);
    try {
      await axios.post(`/staff/orders/${confirmCancel.id}/cancel`);
      setConfirmCancel(null);
      fetchOrders();
    } catch (err) {
      alert(err.response?.data?.message || 'Cancel failed');
    } finally {
      setSubmitting(false);
    }
  };

  const nextStatuses = (order) => {
    const transitions = {
      pending: { confirmed: 'Confirm', cancelled: 'Cancel' },
      confirmed: { preparing: 'Start Preparing', cancelled: 'Cancel' },
      preparing: { ready: 'Ready', cancelled: 'Cancel' },
      ready: { completed: 'Complete' },
      completed: {},
      cancelled: {},
    };
    return transitions[order.status] || {};
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await axios.put(`/staff/orders/${orderId}/status`, { status: newStatus });
      fetchOrders();
    } catch (err) {
      alert(err.response?.data?.message || 'Status update failed');
    }
  };

  if (loading) {
    return (
      <div style={{ background: CREAM, minHeight: '100vh' }} className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader className="animate-spin" style={{ color: SAGE }} size={36} />
          <p style={{ color: MUTED_GRAY, fontSize: '0.85rem' }}>Loading orders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-2xl flex items-center gap-3 m-6" style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FEE2E2' }}>
        <AlertCircle size={20} />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div style={{ background: CREAM, minHeight: '100vh', padding: '36px 28px' }}>
      <style>{`
        .grain-overlay { position: fixed; inset: 0; pointer-events: none; z-index: 0; opacity: 0.028; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E"); background-repeat: repeat; background-size: 128px; }
        .divider-line { height: 1px; background: linear-gradient(90deg, transparent, rgba(79,95,82,0.15), transparent); }
        .order-row { transition: background 0.15s ease; }
        .order-row:hover { background: rgba(242,237,228,0.7) !important; }
        .action-btn { transition: all 0.18s ease; border: none; cursor: pointer; }
        .action-btn:hover { transform: scale(1.05); }
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
              <div style={{ width: 36, height: 36, background: `linear-gradient(135deg, ${SAGE}, #3e4c42)`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(79,95,82,0.25)', flexShrink: 0 }}>
                <ShoppingBag size={18} color="#fff" />
              </div>
              <h1 style={{ color: SAGE, fontSize: '1.55rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Order Management</h1>
            </div>
            <p style={{ color: MUTED_GRAY, fontSize: '0.82rem', letterSpacing: '0.03em', marginLeft: 48 }}>Create and process customer orders</p>
          </div>
          <button onClick={() => setShowCreateModal(true)} className="primary-btn flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium" style={{ background: `linear-gradient(135deg, ${SAGE} 0%, #3e4c42 100%)`, boxShadow: '0 4px 14px rgba(79,95,82,0.28)' }}><Plus size={16} strokeWidth={2.2} /> New Walk‑in Order</button>
        </div>

        <div className="divider-line mb-7" />

        {/* Filters */}
        <div className="fade-in-1 flex flex-wrap gap-4 mb-8">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: MUTED_GRAY }} />
            <input type="text" placeholder="Search order # or customer name…" value={search} onChange={(e) => setSearch(e.target.value)} className="modal-input w-full pl-10 pr-4 py-2.5 rounded-xl border bg-white text-sm" style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE }} />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="modal-input px-4 py-2.5 rounded-xl border bg-white text-sm" style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE }}>
            <option value="">All Status</option>
            {Object.keys(statusColors).map((s) => (<option key={s} value={s} className="capitalize">{s}</option>))}
          </select>
        </div>

        {/* Orders Table */}
        <div className="fade-in-1" style={{ background: '#fff', borderRadius: 20, border: '1.5px solid rgba(242,237,228,0.9)', boxShadow: '0 2px 12px rgba(79,95,82,0.06)', overflow: 'hidden' }}>
          <div className="overflow-x-auto">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: `linear-gradient(135deg, ${CREAM}, rgba(255,243,217,0.5))`, borderBottom: `1.5px solid ${CREAM}` }}>
                  {['Order #', 'Customer', 'Date', 'Pickup', 'Total', 'Status', 'Items', 'Actions'].map(col => (
                    <th key={col} style={{ padding: '13px 20px', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, color: SAGE, letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '48px 20px', color: MUTED_GRAY }}>
                      <div style={{ width: 56, height: 56, background: 'rgba(166,162,154,0.1)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', border: '1.5px dashed rgba(166,162,154,0.3)' }}>
                        <ShoppingBag size={24} style={{ color: MUTED_GRAY, opacity: 0.4 }} />
                      </div>
                      <p style={{ fontSize: '0.85rem' }}>No orders found</p>
                    </td>
                  </tr>
                ) : (
                  orders.map((order, idx) => (
                    <tr key={order.id} className="order-row" style={{ borderTop: idx === 0 ? 'none' : `1px solid rgba(242,237,228,0.8)` }}>
                      <td style={{ padding: '13px 20px', fontWeight: 700, color: SAGE, whiteSpace: 'nowrap', fontSize: '0.85rem' }}>{order.order_number}</td>
                      <td style={{ padding: '13px 20px' }}>
                        <p style={{ fontWeight: 600, color: SAGE, margin: 0 }}>{order.customer_name}</p>
                        {order.customer_phone && <p style={{ fontSize: '0.72rem', color: MUTED_GRAY, margin: 0 }}>{order.customer_phone}</p>}
                      </td>
                      <td style={{ padding: '13px 20px', color: MUTED_GRAY, fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{new Date(order.order_date).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
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
                      <td style={{ padding: '13px 20px', fontWeight: 700, color: SAGE, whiteSpace: 'nowrap' }}>₱{parseFloat(order.total_amount).toLocaleString()}</td>
                      <td style={{ padding: '13px 20px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 999, fontSize: '0.68rem', fontWeight: 600, background: statusBg[order.status] || 'rgba(166,162,154,0.1)', color: statusColors[order.status] || MUTED_GRAY, border: `1px solid ${statusColors[order.status]}33`, textTransform: 'capitalize' }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: statusColors[order.status] || MUTED_GRAY, display: 'inline-block' }} /> {order.status}
                        </span>
                      </td>
                      <td style={{ padding: '13px 20px' }}>
                        <div className="flex flex-wrap gap-1">
                          {order.items?.map(item => (<span key={item.id} style={{ display: 'inline-block', background: 'rgba(79,95,82,0.07)', color: SAGE, borderRadius: 5, padding: '2px 6px', fontSize: '0.72rem', marginBottom: 2 }}>{item.menu?.name} ×{item.quantity}</span>))}
                        </div>
                      </td>

                      {/* Actions Column */}
                      <td style={{ padding: '6px 10px', verticalAlign: 'middle' }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '6px',
                          minWidth: '200px',
                        }}>
                          {/* Left: Primary action */}
                          <div style={{ flex: '0 0 130px', textAlign: 'left' }}>
                            {Object.entries(nextStatuses(order))
                              .filter(([status]) => status !== 'cancelled')
                              .map(([newStatus, label]) => {
                                let bgColor = statusBg[newStatus] || 'rgba(79,95,82,0.07)';
                                let textColor = statusColors[newStatus] || SAGE;
                                let borderColor = statusColors[newStatus] ? `${statusColors[newStatus]}44` : 'rgba(79,95,82,0.15)';

                                if (newStatus === 'confirmed') {
                                  bgColor = SAGE; textColor = '#fff'; borderColor = SAGE;
                                } else if (newStatus === 'preparing') {
                                  bgColor = '#7A5B8A'; textColor = '#fff'; borderColor = '#7A5B8A';
                                } else if (newStatus === 'ready') {
                                  bgColor = '#5B8A5E'; textColor = '#fff'; borderColor = '#5B8A5E';
                                } else if (newStatus === 'completed') {
                                  bgColor = SAGE; textColor = '#fff'; borderColor = SAGE;
                                }

                                return (
                                  <button
                                    key={newStatus}
                                    onClick={() => handleStatusChange(order.id, newStatus)}
                                    className="action-btn"
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                      padding: '4px 12px',
                                      borderRadius: '16px',
                                      fontSize: '0.7rem',
                                      fontWeight: 600,
                                      letterSpacing: '0.02em',
                                      background: bgColor,
                                      color: textColor,
                                      border: `1.5px solid ${borderColor}`,
                                      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                                      transition: 'all 0.15s ease',
                                      whiteSpace: 'nowrap',
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)';
                                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.transform = 'none';
                                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
                                    }}
                                  >
                                    <Play size={11} strokeWidth={2.2} />
                                    {label}
                                  </button>
                                );
                              })}
                          </div>

                          {/* Right: Cancel button */}
                          <div style={{ flex: '0 0 80px', textAlign: 'right' }}>
                            {nextStatuses(order).cancelled && (
                              <button
                                onClick={() => setConfirmCancel(order)}
                                className="action-btn"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  padding: '4px 10px',
                                  borderRadius: '16px',
                                  fontSize: '0.7rem',
                                  fontWeight: 600,
                                  letterSpacing: '0.02em',
                                  background: '#C75B5B',
                                  color: '#fff',
                                  border: '1.5px solid #C75B5B',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                                  whiteSpace: 'nowrap',
                                  transition: 'all 0.15s ease',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)';
                                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform = 'none';
                                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
                                }}
                              >
                                <Ban size={11} strokeWidth={2.2} />
                                Cancel
                              </button>
                            )}
                          </div>
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

      {/* Create Order Modal */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(30,35,30,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16, backdropFilter: 'blur(4px)' }}>
          <div className="anim-modal" style={{ background: '#fff', borderRadius: 22, width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(79,95,82,0.18), 0 4px 16px rgba(0,0,0,0.08)', border: '1px solid rgba(242,237,228,0.8)' }}>
            <div style={{ position: 'sticky', top: 0, zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: `1px solid ${CREAM}`, background: `linear-gradient(135deg, rgba(79,95,82,0.04), rgba(255,243,217,0.3))`, backdropFilter: 'blur(8px)' }}>
              <div className="flex items-center gap-3">
                <div style={{ width: 32, height: 32, background: `linear-gradient(135deg, ${SAGE}, #3e4c42)`, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 10px rgba(79,95,82,0.25)' }}><Plus size={15} color="#fff" /></div>
                <h3 style={{ color: SAGE, fontWeight: 700, fontSize: '1.05rem' }}>New Walk‑in Order</h3>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="hover:bg-cream/50 p-1.5 rounded-lg" style={{ color: MUTED_GRAY }}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-xs font-semibold mb-1" style={{ color: SAGE }}>Customer Name *</label><input type="text" value={createForm.customer_name} onChange={e => setCreateForm({...createForm, customer_name: e.target.value})} required className="modal-input w-full px-3.5 py-2.5 rounded-xl border text-sm" style={{ borderColor:'rgba(166,162,154,0.3)', color:SAGE, background:'#fafafa' }} /></div>
                <div><label className="block text-xs font-semibold mb-1" style={{ color: SAGE }}>Phone (optional)</label><input type="text" value={createForm.customer_phone} onChange={e => setCreateForm({...createForm, customer_phone: e.target.value})} className="modal-input w-full px-3.5 py-2.5 rounded-xl border text-sm" style={{ borderColor:'rgba(166,162,154,0.3)', color:SAGE, background:'#fafafa' }} /></div>
                <div><label className="block text-xs font-semibold mb-1" style={{ color: SAGE }}>Pickup Date</label><input type="date" value={createForm.pickup_date} onChange={e => setCreateForm({...createForm, pickup_date: e.target.value})} className="modal-input w-full px-3.5 py-2.5 rounded-xl border text-sm" style={{ borderColor:'rgba(166,162,154,0.3)', color:SAGE, background:'#fafafa' }} /></div>
                <div><label className="block text-xs font-semibold mb-1" style={{ color: SAGE }}>Pickup Time</label><input type="time" value={createForm.pickup_time} onChange={e => setCreateForm({...createForm, pickup_time: e.target.value})} className="modal-input w-full px-3.5 py-2.5 rounded-xl border text-sm" style={{ borderColor:'rgba(166,162,154,0.3)', color:SAGE, background:'#fafafa' }} /></div>
                <div className="md:col-span-2"><label className="block text-xs font-semibold mb-1" style={{ color: SAGE }}>Notes</label><textarea value={createForm.notes} onChange={e => setCreateForm({...createForm, notes: e.target.value})} rows={2} className="modal-input w-full px-3.5 py-2.5 rounded-xl border text-sm resize-none" style={{ borderColor:'rgba(166,162,154,0.3)', color:SAGE, background:'#fafafa' }} /></div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2"><span className="text-xs font-semibold" style={{ color: SAGE }}>Items *</span><button type="button" onClick={addItemToCreate} className="text-xs flex items-center gap-1 px-3 py-1 rounded-lg" style={{ color: SAGE, background: 'rgba(79,95,82,0.08)' }}><Plus size={12} /> Add Item</button></div>
                {createForm.items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 mb-2">
                    <select value={item.menu_id} onChange={e => updateItemCreate(idx, 'menu_id', e.target.value)} required className="flex-1 modal-input px-3 py-2 rounded-xl border text-sm" style={{ borderColor:'rgba(166,162,154,0.3)', color:SAGE, background:'#fafafa' }}><option value="">Select product</option>{menuItems.filter(m => m.is_active).map(m => (<option key={m.id} value={m.id}>{m.name} — ₱{parseFloat(m.base_price).toLocaleString()}</option>))}</select>
                    <input type="number" min="1" value={item.quantity} onChange={e => updateItemCreate(idx, 'quantity', e.target.value)} required className="w-20 modal-input px-3 py-2 rounded-xl border text-sm" style={{ borderColor:'rgba(166,162,154,0.3)', color:SAGE, background:'#fafafa' }} />
                    <button type="button" onClick={() => removeItemFromCreate(idx)} className="p-1.5 rounded-lg" style={{ color: '#EF4444' }}><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
              <div className="divider-line" />
              <div className="flex justify-end gap-3"><button type="button" onClick={() => setShowCreateModal(false)} className="sec-btn px-5 py-2.5 rounded-xl border text-sm" style={{ borderColor:'rgba(166,162,154,0.3)', color:MUTED_GRAY }}>Cancel</button><button type="submit" disabled={submitting} className="primary-btn flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm disabled:opacity-50" style={{ background:`linear-gradient(135deg, ${SAGE}, #3e4c42)` }}>{submitting ? <Loader size={15} className="animate-spin" /> : <Check size={16} />}{submitting ? 'Creating…' : 'Create Order'}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {confirmCancel && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(30,35,30,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16, backdropFilter: 'blur(4px)' }}>
          <div className="anim-modal" style={{ background: '#fff', borderRadius: 22, padding: '32px 28px', maxWidth: 380, width: '100%', textAlign: 'center', boxShadow: '0 24px 60px rgba(79,95,82,0.18), 0 4px 16px rgba(0,0,0,0.08)', border: '1px solid rgba(242,237,228,0.8)' }}>
            <div style={{ width: 56, height: 56, background: 'rgba(199,91,91,0.1)', borderRadius: 16, margin: '0 auto 18px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(199,91,91,0.2)' }}><AlertTriangle size={28} style={{ color: '#C75B5B' }} /></div>
            <h3 style={{ color: SAGE, fontWeight: 700, fontSize: '1.1rem', marginBottom: 8 }}>Cancel Order?</h3>
            <p style={{ color: MUTED_GRAY, fontSize: '0.83rem', marginBottom: 24 }}>This will cancel order <strong style={{ color: SAGE }}>{confirmCancel.order_number}</strong>. This action cannot be undone.</p>
            <div className="flex gap-3 justify-center"><button onClick={() => setConfirmCancel(null)} className="sec-btn px-5 py-2.5 rounded-xl border text-sm" style={{ borderColor:'rgba(166,162,154,0.3)', color:MUTED_GRAY }}>Keep Order</button><button onClick={handleCancel} disabled={submitting} className="primary-btn px-5 py-2.5 rounded-xl text-white text-sm" style={{ background: 'linear-gradient(135deg, #C75B5B, #a14747)', boxShadow: '0 4px 14px rgba(199,91,91,0.25)' }}>{submitting ? <Loader size={15} className="animate-spin" /> : 'Yes, Cancel'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}