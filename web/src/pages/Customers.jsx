// src/pages/Customers.jsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users as UsersIcon, Loader, AlertCircle, Search, CheckCircle, XCircle,
  Image as ImageIcon, Eye, X, CameraOff, CheckCircle2, History, AlertTriangle
} from 'lucide-react';
import axios from '/api/axios';
import CustomerOrderHistoryModal from '../components/admin/CustomerOrderHistoryModal';
import { getFullImageUrl } from '../utils/apiBase';

const SAGE = '#4F5F52';
const CREAM = '#F2EDE4';
const MUTED_GRAY = '#A6A29A';
const SOFT_WHITE = '#FFF3D9';

// InfoItem component for consistent detail display
function InfoItem({ label, value }) {
  return (
    <div>
      <p style={{ fontSize: '0.7rem', fontWeight: 700, color: SAGE, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 4 }}>
        {label}
      </p>
      <p style={{ fontSize: '0.85rem', color: MUTED_GRAY, margin: 0, wordBreak: 'break-word' }}>
        {value}
      </p>
    </div>
  );
}

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // ── Toast (auto-dismissing notification) ──
  const [toast, setToast] = useState({ show: false, type: 'success', message: '' });

  useEffect(() => {
    if (!toast.show) return;
    const timer = setTimeout(() => setToast((t) => ({ ...t, show: false })), 2800);
    return () => clearTimeout(timer);
  }, [toast.show]);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ show: true, type, message });
  }, []);

  // Modal state
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [orderHistoryOpen, setOrderHistoryOpen] = useState(false);   
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // NEW: State for the confirmation modal
  const [confirmAction, setConfirmAction] = useState({ show: false, type: null, customer: null });

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

  const handleApprove = async (id) => {
    try {
      await axios.patch(`/admin/customers/${id}/approve`);
      await fetchCustomers();
      if (selectedCustomer && selectedCustomer.id === id) {
        setSelectedCustomer(prev => ({ ...prev, verification_status: 'approved' }));
      }
      showToast('Customer approved successfully.', 'success');
    } catch (err) {
      showToast('Approval failed: ' + (err.response?.data?.message || ''), 'error');
    } finally {
      setConfirmAction({ show: false, type: null, customer: null }); // Close confirm modal
    }
  };

  const handleReject = async (id) => {
    try {
      await axios.patch(`/admin/customers/${id}/reject`);
      await fetchCustomers();
      if (selectedCustomer && selectedCustomer.id === id) {
        setSelectedCustomer(prev => ({ ...prev, verification_status: 'rejected' }));
      }
      showToast('Customer rejected.', 'success');
    } catch (err) {
      showToast('Rejection failed: ' + (err.response?.data?.message || ''), 'error');
    } finally {
      setConfirmAction({ show: false, type: null, customer: null }); // Close confirm modal
    }
  };

  const openDetailsModal = (customer) => {
    setSelectedCustomer(customer);
    setImageLoadError(false);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedCustomer(null);
    setImageLoadError(false);
    setOrderHistoryOpen(false); 
    setLightboxOpen(false); 
    setConfirmAction({ show: false, type: null, customer: null }); // Ensure confirm modal closes too
  };

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
          position: fixed; inset: 0; pointer-events: none; z-index: 0; opacity: 0.028;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
          background-repeat: repeat; background-size: 128px;
        }
        .divider-line { height: 1px; background: linear-gradient(90deg, transparent, rgba(79,95,82,0.15), transparent); }
        .cust-table tbody tr { transition: background 0.15s ease; }
        .cust-table tbody tr:hover { background: rgba(242,237,228,0.7); }
        .search-input { transition: all 0.2s ease; outline: none; }
        .search-input:focus { box-shadow: 0 0 0 3px rgba(79,95,82,0.12); border-color: #4F5F52 !important; }
        .action-btn { transition: all 0.18s ease; border-radius: 10px; border: none; cursor: pointer; }
        .action-btn:hover { transform: scale(1.12); }
        .modal-backdrop {
          position: fixed; inset: 0; background: rgba(30,35,30,0.45);
          display: flex; align-items: center; justify-content: center;
          z-index: 50; padding: 16px; backdrop-filter: blur(4px);
        }
        .modal-content {
          background: white; border-radius: 22px; width: 100%; max-width: 560px;
          max-height: 85vh; overflow-y: auto; box-shadow: 0 24px 60px rgba(79,95,82,0.18);
          border: 1px solid rgba(242,237,228,0.8);
        }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
        .fade-in   { animation: fadeInUp 0.4s ease both; }
        .fade-in-1 { animation: fadeInUp 0.4s 0.05s ease both; }
        .fade-in-2 { animation: fadeInUp 0.4s 0.10s ease both; }
        .fade-in-3 { animation: fadeInUp 0.4s 0.15s ease both; }
        @keyframes modalIn { from { opacity: 0; transform: scale(0.96) translateY(12px); } to { opacity: 1; transform: none; } }
        .anim-modal { animation: modalIn 0.25s cubic-bezier(0.25,0.46,0.45,0.94); }
        @keyframes toastIn { from { opacity: 0; transform: translate(-50%, -20px); } to { opacity: 1; transform: translate(-50%, 0); } }
        .toast-anim { animation: toastIn 0.3s cubic-bezier(0.25,0.46,0.45,0.94) both; }
      `}</style>

      <div className="grain-overlay" />

      <div className="max-w-7xl mx-auto relative" style={{ zIndex: 1 }}>

        {/* Header */}
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
              View registered customers &amp; manage verifications
            </p>
          </div>

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

        <div className="divider-line mb-7" />

        {/* Search bar */}
        <div className="relative w-full md:w-96 mb-7 fade-in-1">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2"
            style={{ color: MUTED_GRAY }} size={15}
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

        {filteredCustomers.length > 0 && (
          <p className="fade-in-1" style={{ color: MUTED_GRAY, fontSize: '0.78rem', marginBottom: '1.25rem', letterSpacing: '0.04em' }}>
            {filteredCustomers.length} customer{filteredCustomers.length !== 1 ? 's' : ''} found
          </p>
        )}

        {/* Customers Table */}
        <div className="fade-in-2" style={{
          background: '#fff',
          borderRadius: 20,
          border: '1.5px solid rgba(242,237,228,0.9)',
          boxShadow: '0 2px 12px rgba(79,95,82,0.06)',
          overflow: 'hidden',
        }}>
          <div className="w-full">
            <table className="cust-table w-full text-sm" style={{ tableLayout: 'fixed' }}>
              <thead>
                <tr style={{ background: `linear-gradient(135deg, ${CREAM}, rgba(255,243,217,0.5))` }}>
                  {[
                    { label: 'Customer', width: '22%' },
                    { label: 'Contact', width: '16%' },
                    { label: 'Address', width: '18%' },
                    { label: 'Verification', width: '20%' },
                    { label: 'Status', width: '10%' },
                    { label: 'Actions', width: '14%', align: 'right' }
                  ].map(col => (
                    <th key={col.label} style={{
                      padding: '14px 16px',
                      textAlign: col.align || 'left',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      color: SAGE,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      width: col.width,
                    }}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody style={{ borderTop: `1px solid ${CREAM}` }}>
                {filteredCustomers.length === 0 ? (
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
                        <UsersIcon size={24} style={{ color: MUTED_GRAY, opacity: 0.4 }} />
                      </div>
                      <p style={{ fontSize: '0.85rem' }}>No customers found</p>
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer, idx) => (
                    <tr key={customer.id} style={{ borderTop: idx === 0 ? 'none' : `1px solid rgba(242,237,228,0.8)` }}>
                      
                      {/* 1. Customer (Avatar, Name, Email) */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 34, height: 34,
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #4F5F52, #3e4c42)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.75rem', fontWeight: 700, color: '#fff',
                            boxShadow: '0 2px 8px rgba(79,95,82,0.2)',
                            flexShrink: 0,
                          }}>
                            {(customer.first_name?.[0] || '')}{(customer.last_name?.[0] || '')}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontWeight: 600, color: SAGE, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {customer.first_name} {customer.last_name}
                            </p>
                            <p style={{ color: MUTED_GRAY, fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={customer.email}>
                              {customer.email || '—'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* 2. Contact (Phone, Birth Date) */}
                      <td style={{ padding: '14px 16px' }}>
                        <p style={{ color: SAGE, fontSize: '0.8rem', fontWeight: 500 }}>{customer.phone || '—'}</p>
                        <p style={{ color: MUTED_GRAY, fontSize: '0.75rem' }}>Born: {customer.birth_date || '—'}</p>
                      </td>

                      {/* 3. Address (Truncated) */}
                      <td style={{ padding: '14px 16px' }}>
                        <p 
                          style={{ color: MUTED_GRAY, fontSize: '0.78rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                          title={customer.address || '—'}
                        >
                          {customer.address || '—'}
                        </p>
                      </td>

                      {/* 4. Verification (Type, Status, ID) */}
                      <td style={{ padding: '14px 16px' }}>
                        {customer.verification_type ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <span style={{
                                fontSize: '0.68rem', fontWeight: 600, color: SAGE,
                                background: 'rgba(79,95,82,0.07)',
                                borderRadius: 5, padding: '1px 7px',
                                textTransform: 'capitalize',
                              }}>
                                {customer.verification_type.replace('_', ' ')}
                              </span>
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                fontSize: '0.68rem', fontWeight: 600,
                                padding: '2px 8px', borderRadius: 999,
                                background: customer.verification_status === 'approved' ? 'rgba(52,196,104,0.1)' : customer.verification_status === 'rejected' ? 'rgba(239,68,68,0.08)' : 'rgba(234,179,8,0.1)',
                                color: customer.verification_status === 'approved' ? '#1a7a3c' : customer.verification_status === 'rejected' ? '#c0392b' : '#92670a',
                                border: `1px solid ${customer.verification_status === 'approved' ? 'rgba(52,196,104,0.2)' : customer.verification_status === 'rejected' ? 'rgba(239,68,68,0.15)' : 'rgba(234,179,8,0.2)'}`,
                                textTransform: 'capitalize',
                              }}>
                                {customer.verification_status}
                              </span>
                            </div>
                            {customer.id_number && (
                              <span style={{ fontSize: '0.7rem', color: MUTED_GRAY }}>
                                ID: {customer.id_number}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: MUTED_GRAY, fontStyle: 'italic' }}>Regular</span>
                        )}
                      </td>

                      {/* 5. Status & Stamps */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                           <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                fontSize: '0.7rem', fontWeight: 600, color: customer.is_active ? '#1a7a3c' : MUTED_GRAY,
                              }}>
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: customer.is_active ? '#34C468' : MUTED_GRAY, display: 'inline-block' }} />
                                {customer.is_active ? 'Active' : 'Inactive'}
                           </span>
                           <span style={{
                             fontSize: '0.68rem', fontWeight: 600, color: SAGE, background: 'rgba(79,95,82,0.07)',
                             borderRadius: 5, padding: '2px 7px'
                           }}>
                             {customer.signature_stamps || 0} stamps
                           </span>
                        </div>
                      </td>

                      {/* 6. Actions (View, Approve, Reject) */}
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                          <button
                            onClick={() => openDetailsModal(customer)}
                            title="View Details"
                            className="action-btn"
                            style={{ padding: '6px', color: SAGE, background: 'rgba(79,95,82,0.08)' }}
                          >
                            <Eye size={16} />
                          </button>

                          {customer.verification_status === 'pending' && (
                            <>
                              <button
                                onClick={() => setConfirmAction({ show: true, type: 'approve', customer })} // Trigger Confirm
                                title="Approve Verification"
                                className="action-btn"
                                style={{ padding: '6px', color: '#1a7a3c', background: 'rgba(52,196,104,0.1)' }}
                              >
                                <CheckCircle size={16} />
                              </button>
                              <button
                                onClick={() => setConfirmAction({ show: true, type: 'reject', customer })} // Trigger Confirm
                                title="Reject Verification"
                                className="action-btn"
                                style={{ padding: '6px', color: '#c0392b', background: 'rgba(239,68,68,0.08)' }}
                              >
                                <XCircle size={16} />
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

      {/* ══ Customer Details Modal ══ */}
      {showModal && selectedCustomer && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-content anim-modal" onClick={(e) => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '20px 24px', borderBottom: `1px solid ${CREAM}`,
              background: `linear-gradient(135deg, rgba(79,95,82,0.04), rgba(255,243,217,0.3))`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: `linear-gradient(135deg, ${SAGE}, #3e4c42)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.85rem', fontWeight: 700, color: '#fff',
                  boxShadow: '0 2px 8px rgba(79,95,82,0.25)',
                }}>
                  {(selectedCustomer.first_name?.[0] || '')}{(selectedCustomer.last_name?.[0] || '')}
                </div>
                <div>
                  <h2 style={{ color: SAGE, fontWeight: 700, fontSize: '1.1rem', margin: 0 }}>
                    {selectedCustomer.first_name} {selectedCustomer.last_name}
                  </h2>
                  <p style={{ color: MUTED_GRAY, fontSize: '0.8rem', margin: 0 }}>Customer Details</p>
                </div>
              </div>
              <button
                onClick={closeModal}
                style={{ color: MUTED_GRAY, padding: 6, borderRadius: 8, background: 'transparent', border: 'none', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = CREAM}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px' }}>
              
              {/* Image Section */}
              <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'center' }}>
                {selectedCustomer.image && !imageLoadError ? (
                  <img
                    src={getFullImageUrl(selectedCustomer.image)}
                    alt="Verification ID"
                    onError={() => setImageLoadError(true)}
                    onClick={() => setLightboxOpen(true)}
                    style={{
                      width: '100%',
                      maxHeight: 320,
                      objectFit: 'contain',
                      borderRadius: 14,
                      border: `1.5px solid ${CREAM}`,
                      cursor: 'zoom-in',
                      background: '#f8f8f8',
                      padding: '8px',
                    }}
                  />
                ) : (
                  <div style={{
                    width: '100%', height: 140, background: CREAM, borderRadius: 14,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    border: `1.5px dashed rgba(166,162,154,0.3)`
                  }}>
                    <CameraOff size={24} style={{ color: MUTED_GRAY, opacity: 0.5, marginBottom: 8 }} />
                    <p style={{ color: MUTED_GRAY, fontSize: '0.8rem' }}>No ID image uploaded</p>
                  </div>
                )}
              </div>

              {/* Details Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 16px' }}>
                <InfoItem label="Email" value={selectedCustomer.email || '—'} />
                <InfoItem label="Phone" value={selectedCustomer.phone || '—'} />
                <InfoItem label="Birth Date" value={selectedCustomer.birth_date || '—'} />
                <InfoItem label="Status" value={selectedCustomer.is_active ? 'Active' : 'Inactive'} />
                <div style={{ gridColumn: '1 / -1' }}>
                  <InfoItem label="Address" value={selectedCustomer.address || '—'} />
                </div>
                <InfoItem label="Verification Type" value={selectedCustomer.verification_type ? selectedCustomer.verification_type.replace('_', ' ') : 'Regular'} />
                <InfoItem label="Verification Status" value={selectedCustomer.verification_status || '—'} />
                {selectedCustomer.id_number && (
                  <InfoItem label="ID Number" value={selectedCustomer.id_number} />
                )}
                {selectedCustomer.expires_at && (
                  <InfoItem label="Expires At" value={selectedCustomer.expires_at} />
                )}
              </div>

              {/* Actions Footer */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 28 }}>
                {selectedCustomer.verification_status === 'pending' && (
                  <>
                    <button
                      onClick={() => setConfirmAction({ show: true, type: 'approve', customer: selectedCustomer })} // Trigger Confirm
                      style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        padding: '10px', borderRadius: 12, fontSize: '0.85rem', fontWeight: 600,
                        background: 'rgba(52,196,104,0.1)', color: '#1a7a3c', border: '1px solid rgba(52,196,104,0.2)',
                        cursor: 'pointer', transition: 'all 0.15s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(52,196,104,0.2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(52,196,104,0.1)'}
                    >
                      <CheckCircle size={16} /> Approve
                    </button>
                    <button
                      onClick={() => setConfirmAction({ show: true, type: 'reject', customer: selectedCustomer })} // Trigger Confirm
                      style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        padding: '10px', borderRadius: 12, fontSize: '0.85rem', fontWeight: 600,
                        background: 'rgba(239,68,68,0.08)', color: '#c0392b', border: '1px solid rgba(239,68,68,0.15)',
                        cursor: 'pointer', transition: 'all 0.15s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.15)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                    >
                      <XCircle size={16} /> Reject
                    </button>
                  </>
                )}
                
                <button
                  onClick={() => setOrderHistoryOpen(true)}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '10px', borderRadius: 12, fontSize: '0.85rem', fontWeight: 600,
                    background: 'rgba(79,95,82,0.08)', color: SAGE, border: '1px solid rgba(79,95,82,0.15)',
                    cursor: 'pointer', transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(79,95,82,0.15)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(79,95,82,0.08)'}
                >
                  <History size={16} /> Order History
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ NEW: Confirmation Modal ══ */}
      {confirmAction.show && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100, // Higher z-index to sit above details modal
          background: 'rgba(30,35,30,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16, backdropFilter: 'blur(4px)'
        }} onClick={() => setConfirmAction({ show: false, type: null, customer: null })}>
          <div
            className="anim-modal"
            style={{
              background: '#fff', borderRadius: 22, padding: '32px 28px',
              maxWidth: 380, width: '100%', textAlign: 'center',
              boxShadow: '0 24px 60px rgba(79,95,82,0.18), 0 4px 16px rgba(0,0,0,0.08)',
              border: '1px solid rgba(242,237,228,0.8)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon */}
            <div style={{
              width: 60, height: 60,
              background: confirmAction.type === 'approve' ? 'rgba(52,196,104,0.1)' : 'rgba(239,68,68,0.08)',
              borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 18px', border: `1.5px solid ${confirmAction.type === 'approve' ? 'rgba(52,196,104,0.2)' : 'rgba(239,68,68,0.15)'}`,
            }}>
              {confirmAction.type === 'approve' ? (
                <CheckCircle size={26} style={{ color: '#1a7a3c' }} />
              ) : (
                <AlertTriangle size={26} style={{ color: '#c0392b' }} />
              )}
            </div>

            <h3 style={{ color: SAGE, fontWeight: 700, fontSize: '1.1rem', marginBottom: 8 }}>
              {confirmAction.type === 'approve' ? 'Approve Customer?' : 'Reject Customer?'}
            </h3>
            <p style={{ color: MUTED_GRAY, fontSize: '0.83rem', lineHeight: 1.6, marginBottom: 24 }}>
              Are you sure you want to {confirmAction.type}{' '}
              <strong style={{ color: SAGE }}>
                {confirmAction.customer?.first_name} {confirmAction.customer?.last_name}
              </strong>
              ?
            </p>

            <div className="divider-line mb-6" />

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={() => setConfirmAction({ show: false, type: null, customer: null })}
                style={{
                  flex: 1, padding: '10px', borderRadius: 12, fontSize: '0.85rem', fontWeight: 600,
                  border: `1px solid rgba(166,162,154,0.3)`, color: MUTED_GRAY, background: 'transparent', cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = CREAM}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirmAction.type === 'approve') {
                    handleApprove(confirmAction.customer.id);
                  } else {
                    handleReject(confirmAction.customer.id);
                  }
                }}
                style={{
                  flex: 1, padding: '10px', borderRadius: 12, fontSize: '0.85rem', fontWeight: 600,
                  color: '#fff', border: 'none', cursor: 'pointer',
                  background: confirmAction.type === 'approve' ? 'linear-gradient(135deg, #34C468, #1a7a3c)' : 'linear-gradient(135deg, #EF4444, #DC2626)',
                  boxShadow: confirmAction.type === 'approve' ? '0 4px 14px rgba(52,196,104,0.3)' : '0 4px 14px rgba(239,68,68,0.3)',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'none'}
              >
                Yes, {confirmAction.type === 'approve' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Full Screen Image Lightbox ══ */}
      {lightboxOpen && selectedCustomer?.image && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
          }}
          onClick={() => setLightboxOpen(false)}
        >
          <button
            onClick={() => setLightboxOpen(false)}
            style={{
              position: 'absolute', top: 24, right: 24,
              background: 'rgba(255,255,255,0.1)', color: '#fff',
              border: 'none', borderRadius: '50%', padding: 10, cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          >
            <X size={24} />
          </button>
          <img
            src={getFullImageUrl(selectedCustomer.image)}
            alt="Verification ID Full Size"
            style={{
              maxWidth: '100%', maxHeight: '90vh',
              objectFit: 'contain', borderRadius: 8,
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Order History Modal */}
      {orderHistoryOpen && selectedCustomer && (
         <CustomerOrderHistoryModal 
            isOpen={orderHistoryOpen}
            customerId={selectedCustomer.id}
            customerName={`${selectedCustomer.first_name} ${selectedCustomer.last_name}`}
            onClose={() => setOrderHistoryOpen(false)}
         />
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div
          role="status"
          className="toast-anim"
          style={{
            position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 9999,
            display: 'inline-flex', alignItems: 'center', gap: 10, padding: '12px 20px', borderRadius: 14,
            background: toast.type === 'error' ? '#FEF2F2' : '#ECFDF5',
            color: toast.type === 'error' ? '#DC2626' : '#059669',
            border: `1px solid ${toast.type === 'error' ? '#FEE2E2' : '#D1FAE5'}`,
            boxShadow: '0 12px 32px rgba(79,95,82,0.18)', fontSize: '0.9rem', fontWeight: 600,
            pointerEvents: 'none',
          }}
        >
          {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}