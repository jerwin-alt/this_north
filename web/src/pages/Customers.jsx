// src/pages/Customers.jsx
import React, { useState, useEffect } from 'react';
import { Users as UsersIcon, Loader, AlertCircle, Search, Stamp } from 'lucide-react';
import axios from '/api/axios';

// Color palette
const SAGE = '#4F5F52';
const CREAM = '#F2EDE4';
const MUTED_GRAY = '#A6A29A';
const SOFT_WHITE = '#FFF3D9';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/admin/customers');
      setCustomers(response.data.customers || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching customers:', err);
      if (err.response?.status === 401) setError('Unauthorized. Please login again.');
      else if (err.response?.status === 403) setError('Access denied. Admin privileges required.');
      else setError(err.response?.data?.message || 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const filteredCustomers = customers.filter(customer =>
    (customer.first_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (customer.last_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (customer.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (customer.phone || '').includes(searchTerm)
  );

  if (loading) {
    return (
      <div style={{ background: CREAM, minHeight: '100vh' }} className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader className="animate-spin" style={{ color: SAGE }} size={36} />
          <p style={{ color: MUTED_GRAY, fontSize: '0.85rem', letterSpacing: '0.05em' }}>Loading customers...</p>
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
        .cust-table tbody tr {
          transition: background 0.15s ease;
        }
        .cust-table tbody tr:hover {
          background: rgba(242,237,228,0.7);
        }
        .search-input {
          transition: all 0.2s ease;
          outline: none;
        }
        .search-input:focus {
          box-shadow: 0 0 0 3px rgba(79,95,82,0.12);
          border-color: #4F5F52 !important;
        }
        .avatar-ring {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: linear-gradient(135deg, #4F5F52, #3e4c42);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-size: 0.75rem;
          font-weight: 700;
          color: #fff;
          letter-spacing: 0.02em;
          box-shadow: 0 2px 8px rgba(79,95,82,0.2);
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: none; }
        }
        .fade-in   { animation: fadeInUp 0.4s ease both; }
        .fade-in-1 { animation: fadeInUp 0.4s 0.05s ease both; }
        .fade-in-2 { animation: fadeInUp 0.4s 0.10s ease both; }
        .fade-in-3 { animation: fadeInUp 0.4s 0.15s ease both; }
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
                <UsersIcon size={18} color="#fff" />
              </div>
              <h1 style={{ color: SAGE, fontSize: '1.55rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
                Customer Management
              </h1>
            </div>
            <p style={{ color: MUTED_GRAY, fontSize: '0.82rem', letterSpacing: '0.03em', marginLeft: 48 }}>
              View registered customer details
            </p>
          </div>

          {/* Customer count pill */}
          {customers.length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: '#fff',
              border: '1.5px solid rgba(242,237,228,0.9)',
              borderRadius: 14,
              padding: '8px 16px',
              boxShadow: '0 2px 8px rgba(79,95,82,0.06)',
            }}>
              <UsersIcon size={14} style={{ color: MUTED_GRAY }} />
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: SAGE }}>{customers.length}</span>
              <span style={{ fontSize: '0.78rem', color: MUTED_GRAY }}>total customers</span>
            </div>
          )}
        </div>

        {/* ── Divider ── */}
        <div className="divider-line mb-7" />

        {/* ── Search Bar ── */}
        <div className="relative w-full md:w-96 mb-7 fade-in-1">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2"
            style={{ color: MUTED_GRAY }}
            size={15}
          />
          <input
            type="text"
            placeholder="Search by name, email, or phone…"
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

        {/* Results count */}
        {filteredCustomers.length > 0 && (
          <p className="fade-in-1" style={{ color: MUTED_GRAY, fontSize: '0.78rem', marginBottom: '1.25rem', letterSpacing: '0.04em' }}>
            {filteredCustomers.length} customer{filteredCustomers.length !== 1 ? 's' : ''} found
          </p>
        )}

        {/* ── Customers Table ── */}
        <div className="fade-in-2" style={{
          background: '#fff',
          borderRadius: 20,
          border: '1.5px solid rgba(242,237,228,0.9)',
          boxShadow: '0 2px 12px rgba(79,95,82,0.06)',
          overflow: 'hidden',
        }}>
          <div className="overflow-x-auto">
            <table className="cust-table w-full text-sm">
              <thead>
                <tr style={{ background: `linear-gradient(135deg, ${CREAM}, rgba(255,243,217,0.5))` }}>
                  {['Name', 'Email', 'Phone', 'Birth Date', 'Address', 'Verification', 'Stamps', 'Status'].map(col => (
                    <th key={col} style={{
                      padding: '13px 20px',
                      textAlign: 'left',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      color: SAGE,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                    }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody style={{ borderTop: `1px solid ${CREAM}` }}>
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '48px 20px', color: MUTED_GRAY }}>
                      <div style={{
                        width: 56, height: 56,
                        background: 'rgba(166,162,154,0.1)',
                        borderRadius: 16,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 12px',
                        border: '1.5px dashed rgba(166,162,154,0.3)',
                      }}>
                        <UsersIcon size={24} style={{ color: MUTED_GRAY, opacity: 0.4 }} />
                      </div>
                      <p style={{ fontSize: '0.85rem' }}>No customers found</p>
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer, idx) => {
                    const initials = `${(customer.first_name || '')[0] || ''}${(customer.last_name || '')[0] || ''}`.toUpperCase();
                    return (
                      <tr key={customer.id} style={{ borderTop: idx === 0 ? 'none' : `1px solid rgba(242,237,228,0.8)` }}>

                        {/* Name + avatar */}
                        <td style={{ padding: '13px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div className="avatar-ring">{initials || '?'}</div>
                            <span style={{ fontWeight: 600, color: SAGE, fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                              {customer.first_name} {customer.last_name}
                            </span>
                          </div>
                        </td>

                        {/* Email */}
                        <td style={{ padding: '13px 20px', color: MUTED_GRAY, fontSize: '0.82rem' }}>
                          {customer.email}
                        </td>

                        {/* Phone */}
                        <td style={{ padding: '13px 20px', color: MUTED_GRAY, fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                          {customer.phone || '—'}
                        </td>

                        {/* Birth Date */}
                        <td style={{ padding: '13px 20px', color: MUTED_GRAY, fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                          {customer.birth_date || '—'}
                        </td>

                        {/* Address */}
                        <td style={{ padding: '13px 20px', color: MUTED_GRAY, fontSize: '0.78rem', maxWidth: 200 }}>
                          <span style={{
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {customer.address || '—'}
                          </span>
                        </td>

                        {/* Verification */}
                        <td style={{ padding: '13px 20px' }}>
                          {customer.verification_type ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                <span style={{
                                  fontSize: '0.72rem', fontWeight: 600, color: SAGE,
                                  background: 'rgba(79,95,82,0.07)',
                                  borderRadius: 5,
                                  padding: '1px 7px',
                                  textTransform: 'capitalize',
                                }}>
                                  {customer.verification_type.replace('_', ' ')}
                                </span>
                                <span style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 4,
                                  fontSize: '0.68rem', fontWeight: 600,
                                  padding: '2px 8px', borderRadius: 999,
                                  background: customer.verification_status === 'approved'
                                    ? 'rgba(52,196,104,0.1)'
                                    : customer.verification_status === 'rejected'
                                      ? 'rgba(239,68,68,0.08)'
                                      : 'rgba(234,179,8,0.1)',
                                  color: customer.verification_status === 'approved'
                                    ? '#1a7a3c'
                                    : customer.verification_status === 'rejected'
                                      ? '#c0392b'
                                      : '#92670a',
                                  border: `1px solid ${customer.verification_status === 'approved'
                                    ? 'rgba(52,196,104,0.2)'
                                    : customer.verification_status === 'rejected'
                                      ? 'rgba(239,68,68,0.15)'
                                      : 'rgba(234,179,8,0.2)'}`,
                                }}>
                                  <span style={{
                                    width: 5, height: 5, borderRadius: '50%',
                                    background: customer.verification_status === 'approved' ? '#34c468' : customer.verification_status === 'rejected' ? '#ef4444' : '#eab308',
                                    display: 'inline-block',
                                  }} />
                                  {customer.verification_status}
                                </span>
                              </div>
                              {customer.id_number && (
                                <p style={{ fontSize: '0.7rem', color: MUTED_GRAY, margin: 0 }}>ID: {customer.id_number}</p>
                              )}
                              {customer.expires_at && (
                                <p style={{ fontSize: '0.7rem', color: MUTED_GRAY, margin: 0 }}>Exp: {customer.expires_at}</p>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: MUTED_GRAY }}>—</span>
                          )}
                        </td>

                        {/* Stamps */}
                        <td style={{ padding: '13px 20px' }}>
                          <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            background: (customer.signature_stamps ?? 0) > 0
                              ? 'rgba(79,95,82,0.07)'
                              : 'rgba(166,162,154,0.08)',
                            borderRadius: 8,
                            padding: '3px 10px',
                          }}>
                            <span style={{
                              fontSize: '0.82rem',
                              fontWeight: 700,
                              color: (customer.signature_stamps ?? 0) > 0 ? SAGE : MUTED_GRAY,
                              letterSpacing: '-0.01em',
                            }}>
                              {customer.signature_stamps ?? 0}
                            </span>
                            <span style={{ fontSize: '0.68rem', color: MUTED_GRAY, fontWeight: 500 }}>stamps</span>
                          </div>
                        </td>

                        {/* Status */}
                        <td style={{ padding: '13px 20px' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              padding: '3px 10px', borderRadius: 999,
                              fontSize: '0.68rem', fontWeight: 600,
                              background: customer.is_active ? 'rgba(52,196,104,0.1)' : 'rgba(239,68,68,0.08)',
                              color: customer.is_active ? '#1a7a3c' : '#c0392b',
                              border: `1px solid ${customer.is_active ? 'rgba(52,196,104,0.2)' : 'rgba(239,68,68,0.15)'}`,
                            }}>
                              <span style={{
                                width: 5, height: 5, borderRadius: '50%',
                                background: customer.is_active ? '#34c468' : '#ef4444',
                                display: 'inline-block',
                              }} />
                              {customer.is_active ? 'Active' : 'Inactive'}
                            </span>
                            {customer.is_walk_in_customer && (
                              <span style={{
                                display: 'inline-flex', alignItems: 'center',
                                padding: '3px 9px', borderRadius: 999,
                                fontSize: '0.68rem', fontWeight: 600,
                                background: 'rgba(79,130,222,0.1)',
                                color: '#2c5eb0',
                                border: '1px solid rgba(79,130,222,0.2)',
                              }}>
                                Walk-in
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}