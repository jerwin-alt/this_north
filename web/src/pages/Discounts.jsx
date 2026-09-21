import React, { useState, useEffect } from 'react';
import axios from '/api/axios';
import {
  Percent, AlertCircle, Loader
} from 'lucide-react';

const SAGE = '#4F5F52';
const CREAM = '#F2EDE4';
const MUTED_GRAY = '#A6A29A';
const SOFT_WHITE = '#FFF3D9';

export default function Discounts() {
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all discounts
  const fetchDiscounts = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/discounts');
      setDiscounts(res.data.discounts || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching discounts:', err);
      if (err.response?.status === 401) setError('Unauthorized. Please login again.');
      else if (err.response?.status === 403) setError('Access denied. Admin privileges required.');
      else setError(err.response?.data?.message || 'Failed to load discounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscounts();
  }, []);

  if (loading) {
    return (
      <div style={{ background: CREAM, minHeight: '100vh' }} className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader className="animate-spin" style={{ color: SAGE }} size={36} />
          <p style={{ color: MUTED_GRAY, fontSize: '0.85rem', letterSpacing: '0.05em' }}>
            Loading discounts...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-2xl flex items-center gap-3 m-6" style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FEE2E2' }}>
        <AlertCircle size={20} />
        <span>Error loading discounts: {error}</span>
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
        .discount-card {
          transition: box-shadow 0.3s ease, transform 0.3s ease;
          background: #fff;
          border-radius: 20px;
          border: 1.5px solid rgba(242,237,228,0.9);
          box-shadow: 0 2px 12px rgba(79,95,82,0.06);
          overflow: hidden;
        }
        .discount-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 20px 40px rgba(79,95,82,0.18) !important;
        }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
        .fade-in { animation: fadeInUp 0.4s ease both; }
        .fade-in-1 { animation: fadeInUp 0.4s 0.05s ease both; }
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
                Discount Management
              </h1>
            </div>
            <p style={{ color: MUTED_GRAY, fontSize: '0.82rem', letterSpacing: '0.03em', marginLeft: 48 }}>
              View all configured discounts (read‑only)
            </p>
          </div>
        </div>

        <div className="divider-line mb-7" />

        {/* ── Count ── */}
        {discounts.length > 0 && (
          <p className="fade-in-1" style={{ color: MUTED_GRAY, fontSize: '0.78rem', marginBottom: '1.25rem', letterSpacing: '0.04em' }}>
            {discounts.length} discount{discounts.length !== 1 ? 's' : ''} configured
          </p>
        )}

        {/* ── Discounts Grid ── */}
        {discounts.length === 0 ? (
          <div className="fade-in-1" style={{
            background: '#fff',
            borderRadius: 20,
            border: '1.5px solid rgba(242,237,228,0.9)',
            boxShadow: '0 2px 12px rgba(79,95,82,0.06)',
            padding: '48px 20px',
            textAlign: 'center',
          }}>
            <div style={{
              width: 64, height: 64,
              background: 'rgba(166,162,154,0.1)',
              borderRadius: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 14px',
              border: '1.5px dashed rgba(166,162,154,0.35)',
            }}>
              <Percent size={28} style={{ color: MUTED_GRAY, opacity: 0.4 }} />
            </div>
            <p style={{ color: MUTED_GRAY, fontSize: '0.9rem' }}>
              No discounts available.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 fade-in-2">
            {discounts.map(discount => (
              <div key={discount.id} className="discount-card">
                {/* Card top accent strip */}
                <div style={{
                  height: 4,
                  background: discount.is_active
                    ? `linear-gradient(90deg, ${SAGE}, #3e4c42)`
                    : `linear-gradient(90deg, ${MUTED_GRAY}50, ${MUTED_GRAY}20)`,
                  transition: 'background 0.3s ease',
                }} />

                <div style={{ padding: '20px 22px 18px' }}>
                  {/* Card Header: Icon */}
                  <div className="flex items-start justify-between mb-5">
                    <div style={{
                      width: 46, height: 46,
                      background: discount.is_active
                        ? `linear-gradient(135deg, rgba(79,95,82,0.12), rgba(79,95,82,0.06))`
                        : 'rgba(166,162,154,0.1)',
                      borderRadius: 14,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: `1.5px solid ${discount.is_active ? 'rgba(79,95,82,0.15)' : 'rgba(166,162,154,0.2)'}`,
                    }}>
                      <Percent size={20} style={{ color: discount.is_active ? SAGE : MUTED_GRAY }} />
                    </div>
                    {/* Status badge only (no toggle) */}
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '3px 10px', borderRadius: 999,
                      fontSize: '0.68rem', fontWeight: 600,
                      background: discount.is_active ? 'rgba(52,196,104,0.1)' : 'rgba(166,162,154,0.1)',
                      color: discount.is_active ? '#1a7a3c' : MUTED_GRAY,
                      border: `1px solid ${discount.is_active ? 'rgba(52,196,104,0.2)' : 'rgba(166,162,154,0.2)'}`,
                    }}>
                      <span style={{
                        width: 5, height: 5, borderRadius: '50%',
                        background: discount.is_active ? '#34c468' : MUTED_GRAY,
                        display: 'inline-block',
                      }} />
                      {discount.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 style={{ color: SAGE, fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.01em', marginBottom: 4 }}>
                    {discount.discount_name}
                  </h3>
                  <p style={{ color: MUTED_GRAY, fontSize: '0.78rem', lineHeight: 1.55, minHeight: 36 }}>
                    {discount.description || 'No description provided.'}
                  </p>

                  {/* Value display */}
                  <div style={{
                    margin: '14px 0',
                    padding: '10px 14px',
                    background: discount.is_active ? 'rgba(79,95,82,0.05)' : 'rgba(166,162,154,0.07)',
                    borderRadius: 12,
                    border: `1px solid ${discount.is_active ? 'rgba(79,95,82,0.1)' : 'rgba(166,162,154,0.15)'}`,
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <span style={{
                      fontSize: '1.4rem', fontWeight: 800,
                      color: discount.is_active ? SAGE : MUTED_GRAY,
                      letterSpacing: '-0.03em', lineHeight: 1,
                    }}>
                      {discount.discount_type === 'percentage'
                        ? `${discount.discount_value}%`
                        : `₱${parseFloat(discount.discount_value).toLocaleString()}`
                      }
                    </span>
                    <span style={{
                      fontSize: '0.72rem', fontWeight: 600,
                      color: MUTED_GRAY, letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                    }}>
                      {discount.discount_type.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2">
                    {discount.requires_verification && (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontSize: '0.68rem', fontWeight: 600,
                        padding: '3px 9px', borderRadius: 999,
                        background: 'rgba(234,179,8,0.1)',
                        color: '#92670a',
                        border: '1px solid rgba(234,179,8,0.2)',
                      }}>
                        ID Required
                      </span>
                    )}
                  </div>

                  {/* Divider */}
                  <div style={{ height: 1, background: `linear-gradient(90deg, transparent, rgba(79,95,82,0.1), transparent)`, marginTop: 14 }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}