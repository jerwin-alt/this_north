import React, { useState, useEffect } from 'react';
import axios from '/api/axios';
import { Loader, AlertCircle, Package, Search, CalendarDays, SlidersHorizontal, TrendingUp, ClipboardList } from 'lucide-react';

const SAGE = '#4F5F52';
const CREAM = '#F2EDE4';
const MUTED_GRAY = '#A6A29A';
const SOFT_WHITE = '#FFF3D9';

export default function Inventory() {
  const [sales, setSales] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [startDate, setStartDate] = useState(
    new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [typeFilter, setTypeFilter] = useState('all');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [salesRes, transRes] = await Promise.all([
        axios.get('/inventory/product-sales', { params: { start: startDate, end: endDate } }),
        axios.get('/inventory/ingredient-transactions', {
          params: { start: startDate, end: endDate, type: typeFilter !== 'all' ? typeFilter : undefined }
        })
      ]);
      setSales(salesRes.data.sales || []);
      setTransactions(transRes.data.transactions || []);
      setError(null);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) setError('Unauthorized. Please login again.');
      else if (err.response?.status === 403) setError('Access denied. Admin privileges required.');
      else setError(err.response?.data?.message || 'Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate, typeFilter]);

  if (loading) {
    return (
      <div style={{ background: CREAM, minHeight: '100vh' }} className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader className="animate-spin" style={{ color: SAGE }} size={36} />
          <p style={{ color: MUTED_GRAY, fontSize: '0.85rem', letterSpacing: '0.05em' }}>Loading inventory...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-2xl flex items-center gap-3 m-6" style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FEE2E2' }}>
        <AlertCircle size={20} />
        <span>Error: {error}</span>
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
        .divider-line {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(79,95,82,0.15), transparent);
        }
        .inv-table tbody tr {
          transition: background 0.15s ease;
        }
        .inv-table tbody tr:hover {
          background: rgba(242,237,228,0.7);
        }
        .filter-input {
          transition: all 0.2s ease;
          outline: none;
        }
        .filter-input:focus {
          box-shadow: 0 0 0 3px rgba(79,95,82,0.12);
          border-color: #4F5F52 !important;
        }
        .type-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 10px;
          border-radius: 999px;
          font-size: 0.68rem;
          font-weight: 600;
          letter-spacing: 0.04em;
        }
        .stock-arrow {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 0.78rem;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 6px;
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: none; }
        }
        .fade-in { animation: fadeInUp 0.4s ease forwards; }
        .fade-in-1 { animation: fadeInUp 0.4s 0.05s ease both; }
        .fade-in-2 { animation: fadeInUp 0.4s 0.1s ease both; }
        .fade-in-3 { animation: fadeInUp 0.4s 0.15s ease both; }
        .fade-in-4 { animation: fadeInUp 0.4s 0.2s ease both; }
      `}</style>

      <div className="grain-overlay" />

      <div className="max-w-7xl mx-auto relative" style={{ zIndex: 1 }}>

        {/* ── Header ── */}
        <div className="flex flex-wrap justify-between items-start gap-4 mb-8 fade-in">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div style={{
                width: 36, height: 36,
                background: `linear-gradient(135deg, ${SAGE}, #3e4c42)`,
                borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(79,95,82,0.25)',
                flexShrink: 0,
              }}>
                <ClipboardList size={18} color="#fff" />
              </div>
              <h1 style={{ color: SAGE, fontSize: '1.55rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
                Inventory Records
              </h1>
            </div>
            <p style={{ color: MUTED_GRAY, fontSize: '0.82rem', letterSpacing: '0.03em', marginLeft: 48 }}>
              Automatically updated when orders are confirmed and ingredients are adjusted
            </p>
          </div>
        </div>

        {/* ── Divider ── */}
        <div className="divider-line mb-7" />

        {/* ── Filters ── */}
        <div className="fade-in-1" style={{
          background: '#fff',
          borderRadius: 20,
          border: '1.5px solid rgba(242,237,228,0.9)',
          boxShadow: '0 2px 12px rgba(79,95,82,0.06)',
          padding: '20px 24px',
          marginBottom: 32,
        }}>
          <div className="flex items-center gap-2 mb-4">
            <SlidersHorizontal size={14} style={{ color: MUTED_GRAY }} />
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: MUTED_GRAY, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Filter Records
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: SAGE, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
                Start Date
              </label>
              <div style={{ position: 'relative' }}>
                <CalendarDays size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: MUTED_GRAY, pointerEvents: 'none' }} />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="filter-input w-full rounded-xl border text-sm"
                  style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa', padding: '9px 12px 9px 32px' }}
                />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: SAGE, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
                End Date
              </label>
              <div style={{ position: 'relative' }}>
                <CalendarDays size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: MUTED_GRAY, pointerEvents: 'none' }} />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="filter-input w-full rounded-xl border text-sm"
                  style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa', padding: '9px 12px 9px 32px' }}
                />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: SAGE, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
                Transaction Type
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="filter-input w-full rounded-xl border text-sm"
                style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa', padding: '9px 12px' }}
              >
                <option value="all">All Types</option>
                <option value="purchase">Purchase</option>
                <option value="usage">Usage</option>
                <option value="adjustment">Adjustment</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Product Sales Table ── */}
        <div className="mb-10 fade-in-2">
          <div className="flex items-center gap-2.5 mb-4">
            <div style={{
              width: 28, height: 28,
              background: `linear-gradient(135deg, ${SAGE}, #3e4c42)`,
              borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(79,95,82,0.2)',
            }}>
              <TrendingUp size={13} color="#fff" />
            </div>
            <h2 style={{ color: SAGE, fontSize: '1.05rem', fontWeight: 700, letterSpacing: '-0.01em' }}>
              Product Sales
            </h2>
            <span style={{
              fontSize: '0.68rem', fontWeight: 600,
              color: MUTED_GRAY,
              background: 'rgba(166,162,154,0.12)',
              border: '1px solid rgba(166,162,154,0.2)',
              borderRadius: 999,
              padding: '2px 8px',
              letterSpacing: '0.04em',
            }}>
              from confirmed orders
            </span>
          </div>

          <div style={{
            background: '#fff',
            borderRadius: 20,
            border: '1.5px solid rgba(242,237,228,0.9)',
            boxShadow: '0 2px 12px rgba(79,95,82,0.06)',
            overflow: 'hidden',
          }}>
            <div className="overflow-x-auto">
              <table className="inv-table w-full text-sm">
                <thead>
                  <tr style={{ background: `linear-gradient(135deg, ${CREAM}, rgba(255,243,217,0.5))` }}>
                    <th style={{ padding: '13px 20px', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, color: SAGE, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Product</th>
                    <th style={{ padding: '13px 20px', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, color: SAGE, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Category</th>
                    <th style={{ padding: '13px 20px', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, color: SAGE, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Qty Sold</th>
                    <th style={{ padding: '13px 20px', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, color: SAGE, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Revenue</th>
                  </tr>
                </thead>
                <tbody style={{ borderTop: `1px solid ${CREAM}` }}>
                  {sales.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '48px 20px', color: MUTED_GRAY }}>
                        <div style={{
                          width: 56, height: 56,
                          background: 'rgba(166,162,154,0.1)',
                          borderRadius: 16,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          margin: '0 auto 12px',
                          border: '1.5px dashed rgba(166,162,154,0.3)',
                        }}>
                          <Package size={24} style={{ color: MUTED_GRAY, opacity: 0.4 }} />
                        </div>
                        <p style={{ fontSize: '0.85rem' }}>No sales in this period</p>
                      </td>
                    </tr>
                  ) : (
                    sales.map((item, idx) => (
                      <tr key={idx} style={{ borderTop: idx === 0 ? 'none' : `1px solid rgba(242,237,228,0.8)` }}>
                        <td style={{ padding: '13px 20px', fontWeight: 600, color: SAGE, fontSize: '0.85rem' }}>{item.product_name}</td>
                        <td style={{ padding: '13px 20px' }}>
                          <span style={{
                            display: 'inline-block',
                            background: 'rgba(79,95,82,0.07)',
                            color: SAGE,
                            borderRadius: 6,
                            padding: '2px 9px',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                          }}>
                            {item.category_name || '—'}
                          </span>
                        </td>
                        <td style={{ padding: '13px 20px', color: SAGE, fontWeight: 600, fontSize: '0.85rem' }}>{item.total_quantity}</td>
                        <td style={{ padding: '13px 20px' }}>
                          <span style={{ color: SAGE, fontWeight: 800, fontSize: '0.95rem', letterSpacing: '-0.01em' }}>
                            ₱{parseFloat(item.total_revenue).toLocaleString()}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── Ingredient Transactions Table ── */}
        <div className="fade-in-3">
          <div className="flex items-center gap-2.5 mb-4">
            <div style={{
              width: 28, height: 28,
              background: `linear-gradient(135deg, ${SAGE}, #3e4c42)`,
              borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(79,95,82,0.2)',
            }}>
              <Package size={13} color="#fff" />
            </div>
            <h2 style={{ color: SAGE, fontSize: '1.05rem', fontWeight: 700, letterSpacing: '-0.01em' }}>
              Ingredient Transactions
            </h2>
            {transactions.length > 0 && (
              <span style={{
                fontSize: '0.68rem', fontWeight: 600,
                color: MUTED_GRAY,
                background: 'rgba(166,162,154,0.12)',
                border: '1px solid rgba(166,162,154,0.2)',
                borderRadius: 999,
                padding: '2px 8px',
                letterSpacing: '0.04em',
              }}>
                {transactions.length} record{transactions.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div style={{
            background: '#fff',
            borderRadius: 20,
            border: '1.5px solid rgba(242,237,228,0.9)',
            boxShadow: '0 2px 12px rgba(79,95,82,0.06)',
            overflow: 'hidden',
          }}>
            <div className="overflow-x-auto">
              <table className="inv-table w-full text-sm">
                <thead>
                  <tr style={{ background: `linear-gradient(135deg, ${CREAM}, rgba(255,243,217,0.5))` }}>
                    {['Ingredient', 'Type', 'Quantity', 'Stock Change', 'Reference', 'Created By', 'Date'].map(col => (
                      <th key={col} style={{ padding: '13px 20px', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, color: SAGE, letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody style={{ borderTop: `1px solid ${CREAM}` }}>
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '48px 20px', color: MUTED_GRAY }}>
                        <div style={{
                          width: 56, height: 56,
                          background: 'rgba(166,162,154,0.1)',
                          borderRadius: 16,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          margin: '0 auto 12px',
                          border: '1.5px dashed rgba(166,162,154,0.3)',
                        }}>
                          <Package size={24} style={{ color: MUTED_GRAY, opacity: 0.4 }} />
                        </div>
                        <p style={{ fontSize: '0.85rem' }}>No transactions found</p>
                      </td>
                    </tr>
                  ) : (
                    transactions.map((trans, idx) => (
                      <tr key={trans.id} style={{ borderTop: idx === 0 ? 'none' : `1px solid rgba(242,237,228,0.8)` }}>
                        <td style={{ padding: '13px 20px', whiteSpace: 'nowrap' }}>
                          <span style={{ fontWeight: 600, color: SAGE, fontSize: '0.85rem' }}>
                            {trans.ingredient?.name || '—'}
                          </span>
                          {trans.ingredient?.unit && (
                            <span style={{
                              marginLeft: 6,
                              fontSize: '0.68rem',
                              fontWeight: 500,
                              color: MUTED_GRAY,
                              background: 'rgba(166,162,154,0.1)',
                              borderRadius: 4,
                              padding: '1px 6px',
                            }}>
                              {trans.ingredient.unit}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '13px 20px' }}>
                          <span className="type-badge" style={{
                            background: trans.transaction_type === 'purchase'
                              ? 'rgba(52,196,104,0.1)'
                              : trans.transaction_type === 'usage'
                                ? 'rgba(239,68,68,0.08)'
                                : 'rgba(79,130,222,0.1)',
                            color: trans.transaction_type === 'purchase'
                              ? '#1a7a3c'
                              : trans.transaction_type === 'usage'
                                ? '#c0392b'
                                : '#2c5eb0',
                            border: `1px solid ${trans.transaction_type === 'purchase'
                              ? 'rgba(52,196,104,0.2)'
                              : trans.transaction_type === 'usage'
                                ? 'rgba(239,68,68,0.15)'
                                : 'rgba(79,130,222,0.2)'}`,
                          }}>
                            <span style={{
                              width: 5, height: 5, borderRadius: '50%',
                              background: trans.transaction_type === 'purchase' ? '#34c468' : trans.transaction_type === 'usage' ? '#ef4444' : '#4f82de',
                              display: 'inline-block',
                              flexShrink: 0,
                            }} />
                            {trans.transaction_type}
                          </span>
                        </td>
                        <td style={{ padding: '13px 20px', color: MUTED_GRAY, fontSize: '0.85rem', fontWeight: 500 }}>
                          {trans.quantity}
                        </td>
                        <td style={{ padding: '13px 20px' }}>
                          <span className="stock-arrow" style={{
                            background: trans.new_stock > trans.previous_stock
                              ? 'rgba(52,196,104,0.08)'
                              : 'rgba(239,68,68,0.07)',
                            color: trans.new_stock > trans.previous_stock ? '#1a7a3c' : '#c0392b',
                          }}>
                            {trans.previous_stock}
                            <span style={{ opacity: 0.5, fontSize: '0.7rem' }}>→</span>
                            {trans.new_stock}
                          </span>
                        </td>
                        <td style={{ padding: '13px 20px', color: MUTED_GRAY, fontSize: '0.78rem' }}>
                          {trans.reference_type ? (
                            <span style={{
                              background: 'rgba(79,95,82,0.06)',
                              borderRadius: 6,
                              padding: '2px 8px',
                              fontWeight: 500,
                              color: SAGE,
                            }}>
                              {trans.reference_type} #{trans.reference_id}
                            </span>
                          ) : '—'}
                        </td>
                        <td style={{ padding: '13px 20px', color: MUTED_GRAY, fontSize: '0.78rem', fontWeight: 500 }}>
                          {trans.created_by?.first_name || 'System'}
                        </td>
                        <td style={{ padding: '13px 20px', color: MUTED_GRAY, fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                          {new Date(trans.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}