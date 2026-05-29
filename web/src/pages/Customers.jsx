
import React, { useState, useEffect } from 'react';
import { Users as UsersIcon, Loader, AlertCircle, Search, CheckCircle, XCircle, Image as ImageIcon, Eye, X, CameraOff } from 'lucide-react';
import axios from '/api/axios';

const SAGE = '#4F5F52';
const CREAM = '#F2EDE4';
const MUTED_GRAY = '#A6A29A';
const SOFT_WHITE = '#FFF3D9';

// Helper to build full image URL – uses the same base URL as your API
const getImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const baseUrl = axios.defaults.baseURL?.replace('/api', '') || 'http://10.95.250.170:8000';
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
};


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

  // Modal state
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);

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
    } catch (err) {
      alert('Approval failed: ' + (err.response?.data?.message || ''));
    }
  };

  const handleReject = async (id) => {
    try {
      await axios.patch(`/admin/customers/${id}/reject`);
      await fetchCustomers();
      if (selectedCustomer && selectedCustomer.id === id) {
        setSelectedCustomer(prev => ({ ...prev, verification_status: 'rejected' }));
      }
    } catch (err) {
      alert('Rejection failed: ' + (err.response?.data?.message || ''));
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
          <div className="overflow-x-auto">
            <table className="cust-table w-full text-sm">
              <thead>
                <tr style={{ background: `linear-gradient(135deg, ${CREAM}, rgba(255,243,217,0.5))` }}>
                  {['Name', 'Email', 'Phone', 'Birth Date', 'Address', 'Verification', 'Stamps', 'Status', 'Actions'].map(col => (
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
                    <td colSpan="9" style={{ textAlign: 'center', padding: '48px 20px', color: MUTED_GRAY }}>
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
                      
                      {/* Name */}
                      <td style={{ padding: '13px 20px' }}>
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
                        <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                                borderRadius: 5, padding: '1px 7px',
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
                                border: `1px solid ${
                                  customer.verification_status === 'approved'
                                    ? 'rgba(52,196,104,0.2)'
                                    : customer.verification_status === 'rejected'
                                      ? 'rgba(239,68,68,0.15)'
                                      : 'rgba(234,179,8,0.2)'
                                }`,
                              }}>
                                <span style={{
                                  width: 5, height: 5, borderRadius: '50%',
                                  background: customer.verification_status === 'approved' ? '#34c468'
                                    : customer.verification_status === 'rejected' ? '#ef4444'
                                    : '#eab308',
                                  display: 'inline-block',
                                }} />
                                {customer.verification_status}
                              </span>
                            </div>
                            {customer.id_number && (
                              <p style={{ fontSize: '0.7rem', color: MUTED_GRAY, margin: 0 }}>ID: {customer.id_number}</p>
                            )}
                            {customer.image && (
                              <a
                                href={getImageUrl(customer.image)}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ display: 'flex', alignItems: 'center', gap: 4, color: SAGE, fontSize: '0.7rem', marginTop: 2 }}
                              >
                                <ImageIcon size={12} /> View ID
                              </a>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: MUTED_GRAY }}>Regular</span>
                        )}
                      </td>

                      {/* Stamps */}
                      <td style={{ padding: '13px 20px' }}>
                        <div style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          background: (customer.signature_stamps ?? 0) > 0
                            ? 'rgba(79,95,82,0.07)' : 'rgba(166,162,154,0.08)',
                          borderRadius: 8, padding: '3px 10px',
                        }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: (customer.signature_stamps ?? 0) > 0 ? SAGE : MUTED_GRAY }}>
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

                      {/* Actions */}
                      <td style={{ padding: '13px 20px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <button
                            onClick={() => openDetailsModal(customer)}
                            className="action-btn p-1.5 rounded-lg"
                            style={{ background: 'rgba(79,95,82,0.1)', color: SAGE }}
                            title="View customer details"
                          >
                            <Eye size={14} />
                          </button>
                          {customer.verification_status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(customer.id)}
                                className="action-btn p-1.5 rounded-lg"
                                style={{ background: 'rgba(22,163,74,0.1)', color: '#16a34a' }}
                                title="Approve verification"
                              >
                                <CheckCircle size={14} />
                              </button>
                              <button
                                onClick={() => handleReject(customer.id)}
                                className="action-btn p-1.5 rounded-lg"
                                style={{ background: 'rgba(220,38,38,0.1)', color: '#dc2626' }}
                                title="Reject verification"
                              >
                                <XCircle size={14} />
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

      {/* Customer Details Modal */}
      {showModal && selectedCustomer && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-content anim-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '20px 24px',
              borderBottom: `1px solid ${CREAM}`,
              background: `linear-gradient(135deg, rgba(79,95,82,0.04), rgba(255,243,217,0.3))`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 34, height: 34,
                  background: `linear-gradient(135deg, ${SAGE}, #3e4c42)`,
                  borderRadius: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 3px 10px rgba(79,95,82,0.25)',
                }}>
                  <UsersIcon size={16} color="#fff" />
                </div>
                <h3 style={{ color: SAGE, fontWeight: 700, fontSize: '1.05rem', letterSpacing: '-0.01em' }}>
                  Customer Details
                </h3>
              </div>
              <button
                onClick={closeModal}
                style={{ color: MUTED_GRAY, padding: 7, borderRadius: 10, background: 'transparent', border: 'none', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = CREAM}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* ID Image Section – always visible with placeholder if missing */}
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '0.7rem', fontWeight: 700, color: SAGE, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8 }}>
                  Uploaded ID Document
                </p>
                {selectedCustomer.image ? (
                  <div>
                    <img
                      src={getImageUrl(selectedCustomer.image) || ''}
                      alt="Customer ID"
                      style={{
                        maxWidth: '100%',
                        maxHeight: 220,
                        borderRadius: 12,
                        border: `1.5px solid rgba(166,162,154,0.3)`,
                        objectFit: 'contain',
                        background: CREAM,
                        margin: '0 auto',
                      }}
                      onError={() => setImageLoadError(true)}
                    />
                    {imageLoadError && (
                      <p style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: 8 }}>
                        ⚠️ Failed to load image. The file may be missing or the URL is incorrect.
                      </p>
                    )}
                    {/* Debug info – remove after testing */}
                    <p style={{ fontSize: '0.65rem', color: MUTED_GRAY, marginTop: 6, wordBreak: 'break-all' }}>
                      Path: {selectedCustomer.image}
                    </p>
                  </div>
                ) : (
                  <div style={{
                    padding: '32px 16px',
                    background: CREAM,
                    borderRadius: 12,
                    border: `1.5px dashed rgba(166,162,154,0.4)`,
                    textAlign: 'center',
                  }}>
                    <CameraOff size={32} style={{ color: MUTED_GRAY, marginBottom: 8 }} />
                    <p style={{ fontSize: '0.8rem', color: MUTED_GRAY }}>No ID image uploaded</p>
                  </div>
                )}
              </div>

              {/* Customer Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <InfoItem key="fullName" label="Full Name" value={`${selectedCustomer.first_name} ${selectedCustomer.last_name}`} />
                <InfoItem key="email" label="Email" value={selectedCustomer.email} />
                <InfoItem key="phone" label="Phone" value={selectedCustomer.phone || '—'} />
                <InfoItem key="birthDate" label="Birth Date" value={selectedCustomer.birth_date || '—'} />
                <InfoItem key="address" label="Address" value={selectedCustomer.address || '—'} />
                <InfoItem key="verificationType" label="Verification Type" value={selectedCustomer.verification_type ? selectedCustomer.verification_type.replace('_', ' ') : 'Regular'} />
                <InfoItem key="idNumber" label="ID Number" value={selectedCustomer.id_number || '—'} />
                <InfoItem key="stamps" label="Signature Stamps" value={selectedCustomer.signature_stamps ?? 0} />
                <InfoItem key="walkin" label="Walk-in Customer" value={selectedCustomer.is_walk_in_customer ? 'Yes' : 'No'} />
                <InfoItem key="registeredAt" label="Registered At" value={new Date(selectedCustomer.created_at).toLocaleString()} />
              </div>

              {/* Verification Status & Action Buttons */}
              <div className="divider-line my-2" />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <p style={{ fontSize: '0.7rem', fontWeight: 700, color: SAGE, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 4 }}>
                    Verification Status
                  </p>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '4px 12px', borderRadius: 999,
                    fontSize: '0.75rem', fontWeight: 600,
                    background: selectedCustomer.verification_status === 'approved'
                      ? 'rgba(52,196,104,0.1)'
                      : selectedCustomer.verification_status === 'rejected'
                        ? 'rgba(239,68,68,0.08)'
                        : 'rgba(234,179,8,0.1)',
                    color: selectedCustomer.verification_status === 'approved'
                      ? '#1a7a3c'
                      : selectedCustomer.verification_status === 'rejected'
                        ? '#c0392b'
                        : '#92670a',
                    border: `1px solid ${
                      selectedCustomer.verification_status === 'approved'
                        ? 'rgba(52,196,104,0.2)'
                        : selectedCustomer.verification_status === 'rejected'
                          ? 'rgba(239,68,68,0.15)'
                          : 'rgba(234,179,8,0.2)'
                    }`,
                  }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: selectedCustomer.verification_status === 'approved' ? '#34c468'
                        : selectedCustomer.verification_status === 'rejected' ? '#ef4444'
                        : '#eab308',
                      display: 'inline-block',
                    }} />
                    {selectedCustomer.verification_status}
                  </span>
                </div>

                {selectedCustomer.verification_status === 'pending' && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => handleApprove(selectedCustomer.id)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
                      style={{ background: 'rgba(22,163,74,0.15)', color: '#16a34a', border: '1px solid rgba(22,163,74,0.3)', cursor: 'pointer' }}
                    >
                      <CheckCircle size={14} /> Approve
                    </button>
                    <button
                      onClick={() => handleReject(selectedCustomer.id)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
                      style={{ background: 'rgba(220,38,38,0.12)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.3)', cursor: 'pointer' }}
                    >
                      <XCircle size={14} /> Reject
                    </button>
                  </div>
                )}
              </div>

              <div className="divider-line mt-2" />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={closeModal}
                  className="px-5 py-2 rounded-xl text-white text-sm font-medium"
                  style={{ background: `linear-gradient(135deg, ${SAGE}, #3e4c42)`, border: 'none', cursor: 'pointer' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}