// src/components/admin/CustomerOrderHistoryModal.jsx
import { useEffect, useState } from 'react';
import { getCustomerOrders } from '../../lib/adminCustomers';
import { 
  X, History, Eye, Calendar, Clock, User, Tag, CreditCard, 
  Image as ImageIcon, CheckCircle2, Truck, MapPin, Loader 
} from 'lucide-react';

// ── Brand Colors ──
const SAGE = '#4F5F52';
const CREAM = '#F2EDE4';
const MUTED_GRAY = '#A6A29A';
const SOFT_WHITE = '#FFF3D9';

export default function CustomerOrderHistoryModal({
  customerId,
  customerName,
  isOpen,
  onClose,
}) {
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    payment_status: '',
    order_type: '',
    date_from: '',
    date_to: '',
    per_page: 10,
    page: 1,
  });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Changed from openOrderId to selectedOrder to hold the full object
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Reset when switching customers
  useEffect(() => {
    if (!isOpen) return;
    setData(null);
    setError(null);
    setFilters(f => ({ ...f, page: 1 }));
  }, [customerId, isOpen]);

  useEffect(() => {
    if (!isOpen || !customerId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    getCustomerOrders(customerId, filters)
      .then(res => { if (!cancelled) setData(res); })
      .catch(err => {
        if (!cancelled) {
          setError(err?.response?.data?.message ?? 'Failed to load order history.');
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [customerId, filters, isOpen]);

  const orders = data?.orders ?? [];
  const pagination = data?.pagination;

  if (!isOpen) return null;

  // Helper for Payment Status Badge Colors
  const getPaymentColor = (status) => {
    switch (status) {
      case 'paid': return { bg: 'rgba(52,196,104,0.1)', color: '#1a7a3c', border: 'rgba(52,196,104,0.2)' };
      case 'unpaid': return { bg: 'rgba(212,160,61,0.1)', color: '#92670a', border: 'rgba(212,160,61,0.2)' };
      case 'partially_paid': return { bg: 'rgba(91,122,138,0.1)', color: '#5B7A8A', border: 'rgba(91,122,138,0.2)' };
      default: return { bg: 'rgba(166,162,154,0.1)', color: MUTED_GRAY, border: 'rgba(166,162,154,0.2)' };
    }
  };

  // Helper for Order Status Badge Colors
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'confirmed': return { bg: 'rgba(91,138,94,0.1)', color: '#5B8A5E', border: 'rgba(91,138,94,0.2)' };
      case 'completed': return { bg: 'rgba(79,95,82,0.1)', color: SAGE, border: 'rgba(79,95,82,0.2)' };
      case 'ready': return { bg: 'rgba(91,138,94,0.1)', color: '#5B8A5E', border: 'rgba(91,138,94,0.2)' };
      case 'preparing': return { bg: 'rgba(122,91,138,0.1)', color: '#7A5B8A', border: 'rgba(122,91,138,0.2)' };
      case 'pending': return { bg: 'rgba(212,160,61,0.1)', color: '#D4A03D', border: 'rgba(212,160,61,0.2)' };
      case 'cancelled': return { bg: 'rgba(199,91,91,0.1)', color: '#C75B5B', border: 'rgba(199,91,91,0.2)' };
      default: return { bg: 'rgba(166,162,154,0.1)', color: MUTED_GRAY, border: 'rgba(166,162,154,0.2)' };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(30,35,30,0.45)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-6xl flex flex-col max-h-[90vh] rounded-3xl overflow-hidden anim-modal" style={{ background: '#fff', boxShadow: '0 24px 60px rgba(79,95,82,0.18)', border: '1px solid rgba(242,237,228,0.8)' }}>
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: `1px solid ${CREAM}`, background: `linear-gradient(135deg, rgba(79,95,82,0.04), rgba(255,243,217,0.3))` }}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl" style={{ background: `linear-gradient(135deg, ${SAGE}, #3e4c42)`, boxShadow: '0 3px 10px rgba(79,95,82,0.25)' }}>
              <History size={18} color="#fff" />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: SAGE, letterSpacing: '-0.01em' }}>Order History</h2>
              <p className="text-sm font-medium" style={{ color: MUTED_GRAY }}>{customerName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl transition-colors" style={{ color: MUTED_GRAY, background: 'transparent', border: 'none', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = CREAM} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <X size={20} />
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 px-6 py-4" style={{ borderBottom: `1px solid ${CREAM}`, background: '#fff' }}>
          <input
            type="text" placeholder="Search order #"
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))}
            className="rounded-xl border px-4 py-2 text-sm search-input"
            style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE, outline: 'none' }}
          />
          <select
            value={filters.status}
            onChange={e => setFilters(f => ({ ...f, status: e.target.value, page: 1 }))}
            className="rounded-xl border px-4 py-2 text-sm search-input"
            style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE, background: '#fff', outline: 'none' }}
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="preparing">Preparing</option>
            <option value="ready">Ready</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={filters.payment_status}
            onChange={e => setFilters(f => ({ ...f, payment_status: e.target.value, page: 1 }))}
            className="rounded-xl border px-4 py-2 text-sm search-input"
            style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE, background: '#fff', outline: 'none' }}
          >
            <option value="">All payments</option>
            <option value="unpaid">Unpaid</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="paid">Paid</option>
            <option value="refunded">Refunded</option>
          </select>
          <select
            value={filters.order_type}
            onChange={e => setFilters(f => ({ ...f, order_type: e.target.value, page: 1 }))}
            className="rounded-xl border px-4 py-2 text-sm search-input"
            style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE, background: '#fff', outline: 'none' }}
          >
            <option value="">All types</option>
            <option value="standard">Standard</option>
            <option value="custom">Custom Cake</option>
          </select>
          <input type="date" value={filters.date_from}
            onChange={e => setFilters(f => ({ ...f, date_from: e.target.value, page: 1 }))}
            className="rounded-xl border px-4 py-2 text-sm search-input col-span-1 md:col-span-2"
            style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE, outline: 'none' }} />
          <input type="date" value={filters.date_to}
            onChange={e => setFilters(f => ({ ...f, date_to: e.target.value, page: 1 }))}
            className="rounded-xl border px-4 py-2 text-sm search-input col-span-1 md:col-span-2"
            style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE, outline: 'none' }} />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto bg-white">
          {loading && (
            <div className="py-20 flex flex-col items-center justify-center" style={{ color: MUTED_GRAY }}>
              <Loader className="animate-spin mb-4" size={32} style={{ color: SAGE }} />
              <p className="text-sm">Loading orders…</p>
            </div>
          )}

          {!loading && error && (
            <div className="m-6 rounded-xl p-4 text-sm flex items-center gap-2" style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FEE2E2' }}>
              <span className="font-bold">Error:</span> {error}
            </div>
          )}

          {!loading && !error && orders.length === 0 && (
            <div className="py-20 text-center" style={{ color: MUTED_GRAY }}>
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: 'rgba(166,162,154,0.1)', border: '1.5px dashed rgba(166,162,154,0.3)' }}>
                <History size={32} style={{ color: MUTED_GRAY, opacity: 0.4 }} />
              </div>
              <p className="text-base font-bold" style={{ color: SAGE }}>No order history found</p>
              <p className="text-sm mt-1">This customer has not placed any orders yet.</p>
            </div>
          )}

          {!loading && !error && orders.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm" style={{ borderCollapse: 'collapse' }}>
                <thead style={{ background: `linear-gradient(135deg, ${CREAM}, rgba(255,243,217,0.5))`, borderBottom: `1.5px solid ${CREAM}` }}>
                  <tr>
                    {['Order #', 'Date', 'Type', 'Items', 'Total', 'Payment', 'Status', 'Pickup', 'Action'].map((h, i) => (
                      <th key={h} style={{ padding: '14px 20px', fontSize: '0.68rem', fontWeight: 700, color: SAGE, letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: i === 8 ? 'right' : 'left', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody style={{ borderTop: `1px solid ${CREAM}` }}>
                  {orders.map((o) => {
                    const isCustom = o.items?.some((i) => i.cake_type === 'custom');
                    const pColor = getPaymentColor(o.payment_status);
                    const sColor = getStatusColor(o.status);
                    return (
                      <tr key={o.id} className="cust-table-row" style={{ borderTop: `1px solid rgba(242,237,228,0.8)` }}>
                        <td style={{ padding: '14px 20px', fontFamily: 'monospace', fontSize: '0.78rem', fontWeight: 600, color: SAGE }}>{o.order_number}</td>
                        <td style={{ padding: '14px 20px', color: MUTED_GRAY, fontSize: '0.8rem' }}>{new Date(o.order_date).toLocaleDateString()}</td>
                        <td style={{ padding: '14px 20px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', borderRadius: 999, padding: '3px 10px', fontSize: '0.68rem', fontWeight: 700, background: isCustom ? 'rgba(122,91,138,0.1)' : 'rgba(91,122,138,0.1)', color: isCustom ? '#7A5B8A' : '#5B7A8A', border: `1px solid ${isCustom ? 'rgba(122,91,138,0.2)' : 'rgba(91,122,138,0.2)'}` }}>
                            {isCustom ? 'Custom' : 'Standard'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 20px', color: MUTED_GRAY, fontSize: '0.8rem', fontWeight: 500 }}>{o.items?.length ?? 0}</td>
                        <td style={{ padding: '14px 20px', fontWeight: 700, color: SAGE, fontSize: '0.85rem' }}>₱{Number(o.total_amount).toFixed(2)}</td>
                        <td style={{ padding: '14px 20px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', borderRadius: 999, padding: '3px 10px', fontSize: '0.68rem', fontWeight: 700, background: pColor.bg, color: pColor.color, border: `1px solid ${pColor.border}`, textTransform: 'capitalize' }}>
                            {o.payment_status?.replace('_', ' ')}
                          </span>
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', borderRadius: 999, padding: '3px 10px', fontSize: '0.68rem', fontWeight: 700, background: sColor.bg, color: sColor.color, border: `1px solid ${sColor.border}`, textTransform: 'capitalize' }}>
                            {o.status}
                          </span>
                        </td>
                        <td style={{ padding: '14px 20px', color: MUTED_GRAY, fontSize: '0.8rem' }}>
                          {o.pickup_date ? `${o.pickup_date} ${o.pickup_time ?? ''}`.trim() : '—'}
                        </td>
                        <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                          <button
                            onClick={() => setSelectedOrder(o)}
                            className="action-btn"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: '0.75rem', fontWeight: 600, color: SAGE, background: 'rgba(79,95,82,0.08)', borderRadius: 10, border: 'none', cursor: 'pointer', transition: 'all 0.2s ease' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(79,95,82,0.15)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(79,95,82,0.08)'}
                          >
                            <Eye size={14} /> View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.total > 0 && (
          <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: `1px solid ${CREAM}`, background: `linear-gradient(135deg, rgba(242,237,228,0.5), rgba(255,243,217,0.2))` }}>
            <span className="text-sm" style={{ color: MUTED_GRAY }}>
              Showing <span style={{ fontWeight: 600, color: SAGE }}>{pagination.from}</span>–<span style={{ fontWeight: 600, color: SAGE }}>{pagination.to}</span> of <span style={{ fontWeight: 600, color: SAGE }}>{pagination.total}</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.current_page <= 1}
                onClick={() => setFilters(f => ({ ...f, page: (f.page ?? 1) - 1 }))}
                className="sec-btn px-4 py-1.5 rounded-xl border text-sm font-medium disabled:opacity-40"
                style={{ borderColor: 'rgba(166,162,154,0.3)', color: MUTED_GRAY, background: '#fff', cursor: pagination.current_page <= 1 ? 'not-allowed' : 'pointer' }}
              >
                Prev
              </button>
              <span className="px-2 text-sm font-medium" style={{ color: SAGE }}>
                Page {pagination.current_page} / {pagination.last_page}
              </span>
              <button
                disabled={pagination.current_page >= pagination.last_page}
                onClick={() => setFilters(f => ({ ...f, page: (f.page ?? 1) + 1 }))}
                className="sec-btn px-4 py-1.5 rounded-xl border text-sm font-medium disabled:opacity-40"
                style={{ borderColor: 'rgba(166,162,154,0.3)', color: MUTED_GRAY, background: '#fff', cursor: pagination.current_page >= pagination.last_page ? 'not-allowed' : 'pointer' }}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* THE REPLACEMENT: FULL ORDER DETAILS MODAL */}
        {selectedOrder && (
          <OrderDetailsModal 
            order={selectedOrder} 
            onClose={() => setSelectedOrder(null)} 
            getPaymentColor={getPaymentColor}
            getStatusColor={getStatusColor}
          />
        )}
      </div>
    </div>
  );
}

// ─── NEW COMPONENT: ORDER DETAILS MODAL ──────────────────────────────────────
// Built entirely from the BACKEND_DEBUG.txt schema using your exact brand colors
function OrderDetailsModal({ order, onClose, getPaymentColor, getStatusColor }) {
  const isCustom = order.items?.some((i) => i.cake_type === 'custom');
  const pColor = getPaymentColor(order.payment_status);
  const sColor = getStatusColor(order.status);
  
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(30,35,30,0.6)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div 
        className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl overflow-hidden anim-modal"
        style={{ background: '#fff', boxShadow: '0 24px 60px rgba(79,95,82,0.18)', border: '1px solid rgba(242,237,228,0.8)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: `1px solid ${CREAM}`, background: `linear-gradient(135deg, rgba(79,95,82,0.04), rgba(255,243,217,0.3))` }}>
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: SAGE, letterSpacing: '-0.01em' }}>
              Order Details 
              <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: CREAM, color: SAGE }}>{order.order_number}</span>
            </h3>
            <p className="text-sm mt-1 flex flex-wrap items-center gap-4" style={{ color: MUTED_GRAY }}>
              <span className="flex items-center gap-1"><Calendar size={14}/> {new Date(order.order_date).toLocaleString()}</span>
              <span className="flex items-center gap-1"><User size={14}/> {order.customer_name || 'Walk-in'}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl transition-colors" style={{ color: MUTED_GRAY, background: 'transparent', border: 'none', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = CREAM} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Status Bar */}
          <div className="flex flex-wrap gap-6 p-4 rounded-xl" style={{ background: CREAM, border: `1px solid rgba(166,162,154,0.2)` }}>
             <div>
               <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: SAGE }}>Payment Status</p>
               <span style={{ display: 'inline-flex', alignItems: 'center', borderRadius: 999, padding: '3px 10px', fontSize: '0.7rem', fontWeight: 700, background: pColor.bg, color: pColor.color, border: `1px solid ${pColor.border}`, textTransform: 'capitalize' }}>
                  {order.payment_status?.replace('_', ' ')}
               </span>
             </div>
             <div>
               <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: SAGE }}>Order Status</p>
               <span style={{ display: 'inline-flex', alignItems: 'center', borderRadius: 999, padding: '3px 10px', fontSize: '0.7rem', fontWeight: 700, background: sColor.bg, color: sColor.color, border: `1px solid ${sColor.border}`, textTransform: 'capitalize' }}>
                  {order.status}
               </span>
             </div>
             {order.pickup_date && (
               <div>
                 <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: SAGE }}>Pickup Schedule</p>
                 <p className="text-sm font-semibold flex items-center gap-1" style={{ color: SAGE }}>
                   <Clock size={14} style={{ color: MUTED_GRAY }}/> {order.pickup_date} at {order.pickup_time}
                 </p>
               </div>
             )}
             {order.pickup_method && (
               <div>
                 <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: SAGE }}>Pickup Method</p>
                 <p className="text-sm font-semibold flex items-center gap-1 capitalize" style={{ color: SAGE }}>
                   <Truck size={14} style={{ color: MUTED_GRAY }}/> {order.pickup_method}
                 </p>
               </div>
             )}
          </div>

          {/* Order Items */}
          <div>
            <h4 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: SAGE }}>
              <Tag size={16} /> Items Ordered
            </h4>
            <div className="rounded-xl overflow-hidden" style={{ border: `1px solid rgba(166,162,154,0.3)` }}>
              <table className="w-full text-left text-sm">
                <thead style={{ background: `linear-gradient(135deg, ${CREAM}, rgba(255,243,217,0.5))`, borderBottom: `1px solid rgba(166,162,154,0.3)` }}>
                  <tr>
                    <th className="py-3 px-4 font-bold text-xs uppercase tracking-wider" style={{ color: SAGE }}>Item</th>
                    <th className="py-3 px-4 font-bold text-xs uppercase tracking-wider" style={{ color: SAGE }}>Details</th>
                    <th className="py-3 px-4 font-bold text-xs uppercase tracking-wider text-center" style={{ color: SAGE }}>Qty</th>
                    <th className="py-3 px-4 font-bold text-xs uppercase tracking-wider text-right" style={{ color: SAGE }}>Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: `rgba(242,237,228,0.8)` }}>
                  {order.items?.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <p className="font-bold" style={{ color: SAGE }}>{item.menu?.name || 'Custom Cake'}</p>
                        <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: item.cake_type === 'custom' ? '#7A5B8A' : '#5B7A8A' }}>
                          {item.cake_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs" style={{ color: MUTED_GRAY }}>
                        {item.cake_size && <div>Size: {item.cake_size.size_name}</div>}
                        {item.cake_flavor && <div>Flavor: {item.cake_flavor.flavor_name}</div>}
                        {item.custom_flavor && <div>Custom Flavor: {item.custom_flavor}</div>}
                        {item.drink_size && <div>Size: {item.drink_size.size_name}</div>}
                        {item.custom_design && <div className="font-semibold" style={{ color: '#5B7A8A' }}>Design: {item.custom_design.design_name || 'Custom'}</div>}
                      </td>
                      <td className="py-3 px-4 text-center font-bold" style={{ color: SAGE }}>{item.quantity}</td>
                      <td className="py-3 px-4 text-right font-bold" style={{ color: SAGE }}>
                        ₱{Number(item.total_price || item.subtotal).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: SAGE }}>
                <CreditCard size={16} /> Payment Details
              </h4>
              <div className="rounded-xl p-4 space-y-2 text-sm" style={{ background: CREAM, border: `1px solid rgba(166,162,154,0.2)` }}>
                {order.payments && order.payments.length > 0 ? (
                  order.payments.map((p, idx) => (
                    <div key={idx} className="flex justify-between items-center pb-2 border-b last:border-0 last:pb-0" style={{ borderColor: 'rgba(166,162,154,0.2)' }}>
                      <span className="capitalize" style={{ color: MUTED_GRAY }}>{p.payment_method} ({p.payment_type})</span>
                      <span className="font-bold" style={{ color: '#1a7a3c' }}>₱{Number(p.amount_paid).toFixed(2)}</span>
                    </div>
                  ))
                ) : (
                  <p className="italic" style={{ color: MUTED_GRAY }}>No payment records found.</p>
                )}
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: SAGE }}>
                <CheckCircle2 size={16} /> Order Summary
              </h4>
              <div className="rounded-xl p-4 space-y-2 text-sm" style={{ background: CREAM, border: `1px solid rgba(166,162,154,0.2)` }}>
                <div className="flex justify-between" style={{ color: MUTED_GRAY }}>
                  <span>Subtotal</span>
                  <span>₱{Number(order.subtotal).toFixed(2)}</span>
                </div>
                {Number(order.discount_total) > 0 && (
                  <div className="flex justify-between font-semibold" style={{ color: '#1a7a3c' }}>
                    <span>Discount {order.discount?.discount_name ? `(${order.discount.discount_name})` : ''}</span>
                    <span>-₱{Number(order.discount_total).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base pt-2 border-t" style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE }}>
                  <span>Total Amount</span>
                  <span>₱{Number(order.total_amount).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Images Section */}
          {(order.progress_images_with_urls?.length > 0 || order.pickup_proof_images_with_urls?.length > 0 || order.rider_photo_url) && (
            <div>
               <h4 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: SAGE }}>
                <ImageIcon size={16} /> Attached Images
              </h4>
              <div className="flex flex-wrap gap-4">
                {order.rider_photo_url && (
                  <div className="w-24">
                    <p className="text-xs font-semibold mb-1" style={{ color: MUTED_GRAY }}>Rider Photo</p>
                    <img src={order.rider_photo_url} alt="Rider" className="w-24 h-24 object-cover rounded-xl" style={{ border: `1.5px solid ${CREAM}`, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} />
                  </div>
                )}
                {order.progress_images_with_urls?.map((img, idx) => (
                  <div key={`prog-${idx}`} className="w-24">
                    <p className="text-xs font-semibold mb-1" style={{ color: MUTED_GRAY }}>Progress {idx + 1}</p>
                    <img src={img.image_url} alt="Progress" className="w-24 h-24 object-cover rounded-xl" style={{ border: `1.5px solid ${CREAM}`, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} />
                  </div>
                ))}
                {order.pickup_proof_images_with_urls?.map((img, idx) => (
                  <div key={`pickup-${idx}`} className="w-24">
                    <p className="text-xs font-semibold mb-1" style={{ color: MUTED_GRAY }}>Pickup Proof {idx + 1}</p>
                    <img src={img.image_url} alt="Pickup Proof" className="w-24 h-24 object-cover rounded-xl" style={{ border: `1.5px solid ${CREAM}`, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} />
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
        
        {/* Modal Footer */}
        <div className="px-6 py-4 flex justify-end rounded-b-3xl" style={{ borderTop: `1px solid ${CREAM}`, background: `linear-gradient(135deg, rgba(242,237,228,0.5), rgba(255,243,217,0.2))` }}>
           <button 
             onClick={onClose} 
             className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all"
             style={{ background: `linear-gradient(135deg, ${SAGE}, #3e4c42)`, color: '#fff', boxShadow: '0 4px 14px rgba(79,95,82,0.28)', border: 'none', cursor: 'pointer' }}
             onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
             onMouseLeave={e => e.currentTarget.style.transform = 'none'}
           >
             Close Details
           </button>
        </div>
      </div>
    </div>
  );
}