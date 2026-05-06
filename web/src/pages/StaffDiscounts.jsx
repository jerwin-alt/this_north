// src/pages/StaffDiscounts.jsx
import React, { useState, useEffect } from 'react';
import axios from '/api/axios';
import { Percent, Loader, AlertCircle, Search } from 'lucide-react';

const SAGE = '#4F5F52';
const CREAM = '#F2EDE4';
const MUTED_GRAY = '#A6A29A';
const SOFT_WHITE = '#FFF3D9';

export default function StaffDiscounts() {
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'inactive'

  const fetchDiscounts = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/staff/discounts');
      setDiscounts(res.data.discounts || []);
      setError(null);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) setError('Unauthorized. Please login again.');
      else if (err.response?.status === 403) setError('Access denied. Staff privileges required.');
      else setError(err.response?.data?.message || 'Failed to load discounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscounts();
  }, []);

  // Filter discounts
  const filteredDiscounts = discounts.filter(discount => {
    const matchesSearch =
      discount.discount_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      discount.discount_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && discount.is_active) ||
      (statusFilter === 'inactive' && !discount.is_active);
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div style={{ background: CREAM, minHeight: '100vh' }} className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader className="animate-spin" style={{ color: SAGE }} size={36} />
          <p style={{ color: MUTED_GRAY, fontSize: '0.85rem', letterSpacing: '0.05em' }}>Loading discounts…</p>
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
        .grain-overlay {
          position: fixed; inset: 0; pointer-events: none; z-index: 0; opacity: 0.028;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
          background-repeat: repeat; background-size: 128px;
        }
        .divider-line {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(79,95,82,0.15), transparent);
        }
        .discount-table tbody tr {
          transition: background 0.15s ease;
        }
        .discount-table tbody tr:hover {
          background: rgba(242,237,228,0.7);
        }
        .search-input:focus {
          box-shadow: 0 0 0 3px rgba(79,95,82,0.12);
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: none; }
        }
        .fade-in { animation: fadeInUp 0.4s ease both; }
        .fade-in-1 { animation: fadeInUp 0.4s 0.05s ease both; }
        .fade-in-2 { animation: fadeInUp 0.4s 0.1s ease both; }
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
                <Percent size={18} color="#fff" />
              </div>
              <h1 style={{ color: SAGE, fontSize: '1.55rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
                Available Discounts
              </h1>
            </div>
            <p style={{ color: MUTED_GRAY, fontSize: '0.82rem', letterSpacing: '0.03em', marginLeft: 48 }}>
              View discounts created by admin – you cannot edit them.
            </p>
          </div>
        </div>

        <div className="divider-line mb-7" />

        {/* ── Filters ── */}
        <div className="fade-in-1 flex flex-wrap gap-4 mb-8">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: MUTED_GRAY }} />
            <input
              type="text"
              placeholder="Search by name or type…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input w-full pl-10 pr-4 py-2.5 rounded-xl border bg-white text-sm"
              style={{
                borderColor: 'rgba(166,162,154,0.3)',
                color: SAGE,
                boxShadow: '0 1px 4px rgba(79,95,82,0.06)',
              }}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl border bg-white text-sm"
            style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE }}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <span style={{
            display: 'flex', alignItems: 'center',
            fontSize: '0.78rem', color: MUTED_GRAY, fontWeight: 500
          }}>
            {filteredDiscounts.length} discount{filteredDiscounts.length !== 1 ? 's' : ''} found
          </span>
        </div>

        {/* ── Discount Table ── */}
        <div className="fade-in-2" style={{
          background: '#fff',
          borderRadius: 20,
          border: '1.5px solid rgba(242,237,228,0.9)',
          boxShadow: '0 2px 12px rgba(79,95,82,0.06)',
          overflow: 'hidden',
        }}>
          <div className="overflow-x-auto">
            <table className="discount-table w-full text-sm">
              <thead>
                <tr style={{ background: `linear-gradient(135deg, ${CREAM}, rgba(255,243,217,0.5))` }}>
                  {['Discount Name', 'Type', 'Value', 'Verification', 'Status', 'Description'].map(col => (
                    <th key={col} style={{
                      padding: '13px 20px', textAlign: 'left',
                      fontSize: '0.68rem', fontWeight: 700, color: SAGE,
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                    }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody style={{ borderTop: `1px solid ${CREAM}` }}>
                {filteredDiscounts.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '48px 20px', color: MUTED_GRAY }}>
                      <div style={{
                        width: 56, height: 56,
                        background: 'rgba(166,162,154,0.1)',
                        borderRadius: 16,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 12px',
                        border: '1.5px dashed rgba(166,162,154,0.3)',
                      }}>
                        <Percent size={24} style={{ color: MUTED_GRAY, opacity: 0.4 }} />
                      </div>
                      <p style={{ fontSize: '0.85rem' }}>No discounts found</p>
                    </td>
                  </tr>
                ) : (
                  filteredDiscounts.map((discount, idx) => (
                    <tr key={discount.id} style={{ borderTop: idx === 0 ? 'none' : `1px solid rgba(242,237,228,0.8)` }}>
                      <td style={{ padding: '13px 20px', fontWeight: 600, color: SAGE, fontSize: '0.85rem' }}>
                        {discount.discount_name}
                      </td>
                      <td style={{ padding: '13px 20px' }}>
                        <span style={{
                          display: 'inline-block',
                          background: 'rgba(79,95,82,0.07)',
                          color: SAGE,
                          borderRadius: 6,
                          padding: '2px 9px',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          textTransform: 'capitalize'
                        }}>
                          {discount.discount_type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '13px 20px', fontWeight: 700, color: SAGE, fontSize: '0.95rem', letterSpacing: '-0.01em' }}>
                        {discount.discount_type === 'percentage'
                          ? `${discount.discount_value}%`
                          : `₱${parseFloat(discount.discount_value).toLocaleString()}`
                        }
                      </td>
                      <td style={{ padding: '13px 20px' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '3px 10px', borderRadius: 999,
                          fontSize: '0.68rem', fontWeight: 600,
                          background: discount.requires_verification
                            ? 'rgba(234,179,8,0.1)'
                            : 'rgba(52,196,104,0.1)',
                          color: discount.requires_verification ? '#92670a' : '#1a7a3c',
                          border: `1px solid ${discount.requires_verification ? 'rgba(234,179,8,0.2)' : 'rgba(52,196,104,0.2)'}`,
                        }}>
                          {discount.requires_verification ? 'ID Required' : 'Standard'}
                        </span>
                      </td>
                      <td style={{ padding: '13px 20px' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '3px 10px', borderRadius: 999,
                          fontSize: '0.68rem', fontWeight: 600,
                          background: discount.is_active ? 'rgba(52,196,104,0.1)' : 'rgba(239,68,68,0.08)',
                          color: discount.is_active ? '#1a7a3c' : '#c0392b',
                          border: `1px solid ${discount.is_active ? 'rgba(52,196,104,0.2)' : 'rgba(239,68,68,0.15)'}`,
                        }}>
                          <span style={{
                            width: 5, height: 5, borderRadius: '50%',
                            background: discount.is_active ? '#34c468' : '#ef4444',
                            display: 'inline-block',
                          }} />
                          {discount.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ padding: '13px 20px', color: MUTED_GRAY, fontSize: '0.82rem', maxWidth: 200 }}>
                        <span className="block truncate" title={discount.description}>
                          {discount.description || '—'}
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
    </div>
  );
}