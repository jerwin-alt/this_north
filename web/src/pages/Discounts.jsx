import React, { useState, useEffect } from 'react';
import axios from '/api/axios';
import {
  Plus, Edit2, Trash2, X, Percent, AlertCircle,
  Loader, CheckCircle, Info
} from 'lucide-react';

// Color palette
const SAGE = '#4F5F52';
const CREAM = '#F2EDE4';
const MUTED_GRAY = '#A6A29A';
const SOFT_WHITE = '#FFF3D9';

export default function Discounts() {
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');

  const [formData, setFormData] = useState({
    discount_name: '',
    discount_type: 'percentage',
    discount_value: '',
    description: '',
    is_active: true,
    requires_verification: false,
  });

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

  useEffect(() => { fetchDiscounts(); }, []);

  const resetForm = () => {
    setFormData({ discount_name: '', discount_type: 'percentage', discount_value: '', description: '', is_active: true, requires_verification: false });
    setFieldErrors({});
    setFormError('');
    setSuccessMessage('');
  };

  const openAddModal = () => { resetForm(); setEditMode(false); setEditingDiscount(null); setShowModal(true); };

  const openEditModal = (discount) => {
    setEditMode(true);
    setEditingDiscount(discount);
    setFormData({ discount_name: discount.discount_name, discount_type: discount.discount_type, discount_value: discount.discount_value, description: discount.description || '', is_active: discount.is_active, requires_verification: discount.requires_verification });
    setFieldErrors({});
    setFormError('');
    setSuccessMessage('');
    setShowModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (fieldErrors[name]) setFieldErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    setFieldErrors({});

    if (!formData.discount_name.trim()) { setFormError('Discount name is required'); setSubmitting(false); return; }
    if (!formData.discount_type.trim()) { setFormError('Discount type is required'); setSubmitting(false); return; }
    if (formData.discount_value === '' || isNaN(parseFloat(formData.discount_value)) || parseFloat(formData.discount_value) < 0) {
      setFormError('Discount value must be a positive number'); setSubmitting(false); return;
    }

    const payload = { ...formData, discount_value: parseFloat(formData.discount_value) };

    try {
      if (editMode && editingDiscount) {
        await axios.put(`/discounts/${editingDiscount.id}`, payload);
        setSuccessMessage('Discount updated successfully!');
      } else {
        await axios.post('/discounts', payload);
        setSuccessMessage('Discount created successfully!');
      }
      await fetchDiscounts();
      setTimeout(() => { setShowModal(false); resetForm(); setSuccessMessage(''); }, 1200);
    } catch (err) {
      console.error('Save error:', err);
      if (err.response?.status === 422 && err.response?.data?.errors) {
        setFieldErrors(err.response.data.errors);
        setFormError('Please correct the errors below.');
      } else if (err.response?.data?.message) {
        setFormError(err.response.data.message);
      } else {
        setFormError(editMode ? 'Failed to update discount' : 'Failed to create discount');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const deleteDiscount = async (id, name) => {
    if (!window.confirm(`Delete discount "${name}"? This action cannot be undone.`)) return;
    try {
      await axios.delete(`/discounts/${id}`);
      await fetchDiscounts();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  const toggleActive = async (id, currentActive) => {
    try {
      await axios.put(`/discounts/${id}`, { is_active: !currentActive });
      await fetchDiscounts();
    } catch (err) { console.error('Toggle failed:', err); }
  };

  if (loading) {
    return (
      <div style={{ background: CREAM, minHeight: '100vh' }} className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader className="animate-spin" style={{ color: SAGE }} size={36} />
          <p style={{ color: MUTED_GRAY, fontSize: '0.85rem', letterSpacing: '0.05em' }}>Loading discounts...</p>
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
        .primary-btn {
          position: relative; overflow: hidden;
          transition: all 0.22s cubic-bezier(0.4,0,0.2,1);
        }
        .primary-btn::before {
          content: ''; position: absolute; inset: 0;
          background: rgba(255,255,255,0.1); opacity: 0; transition: opacity 0.2s;
        }
        .primary-btn:hover::before { opacity: 1; }
        .primary-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(79,95,82,0.3); }
        .primary-btn:active { transform: translateY(0); }
        .sec-btn { transition: all 0.2s ease; }
        .sec-btn:hover { background: rgba(79,95,82,0.07) !important; transform: translateY(-1px); }
        .action-btn { transition: all 0.18s ease; }
        .action-btn:hover { transform: scale(1.12); }
        .discount-card {
          transition: box-shadow 0.3s ease, transform 0.3s ease;
        }
        .discount-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 20px 40px rgba(79,95,82,0.18) !important;
        }
        .toggle-track {
          width: 38px; height: 22px; border-radius: 999px;
          position: relative; cursor: pointer;
          transition: background 0.25s ease;
          border: 1.5px solid transparent;
        }
        .toggle-thumb {
          position: absolute; top: 2px; left: 2px;
          width: 16px; height: 16px; border-radius: 50%;
          background: #fff;
          box-shadow: 0 1px 4px rgba(0,0,0,0.18);
          transition: transform 0.25s cubic-bezier(0.4,0,0.2,1);
        }
        .modal-input { transition: all 0.2s ease; outline: none; }
        .modal-input:focus {
          box-shadow: 0 0 0 3px rgba(79,95,82,0.12);
          border-color: #4F5F52 !important;
        }
        .checkbox-custom { accent-color: #4F5F52; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
        .fade-in   { animation: fadeInUp 0.4s ease both; }
        .fade-in-1 { animation: fadeInUp 0.4s 0.05s ease both; }
        .fade-in-2 { animation: fadeInUp 0.4s 0.10s ease both; }
        @keyframes modalIn {
          from { opacity: 0; scale: 0.95; transform: translateY(16px); }
          to { opacity: 1; scale: 1; transform: none; }
        }
        .modal-enter { animation: modalIn 0.25s cubic-bezier(0.25,0.46,0.45,0.94) both; }
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
              Create and manage promotional discounts
            </p>
          </div>

          <button
            onClick={openAddModal}
            className="primary-btn flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium"
            style={{
              background: `linear-gradient(135deg, ${SAGE} 0%, #3e4c42 100%)`,
              boxShadow: '0 4px 14px rgba(79,95,82,0.28)',
            }}
          >
            <Plus size={16} strokeWidth={2.2} />
            Add Discount
          </button>
        </div>

        {/* ── Divider ── */}
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
              No discounts yet. Click "Add Discount" to create one.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 fade-in-2">
            {discounts.map(discount => (
              <div
                key={discount.id}
                className="discount-card"
                style={{
                  background: '#fff',
                  borderRadius: 20,
                  border: '1.5px solid rgba(242,237,228,0.9)',
                  boxShadow: '0 2px 12px rgba(79,95,82,0.06)',
                  overflow: 'hidden',
                }}
              >
                {/* Card top accent strip */}
                <div style={{
                  height: 4,
                  background: discount.is_active
                    ? `linear-gradient(90deg, ${SAGE}, #3e4c42)`
                    : `linear-gradient(90deg, ${MUTED_GRAY}50, ${MUTED_GRAY}20)`,
                  transition: 'background 0.3s ease',
                }} />

                <div style={{ padding: '20px 22px 18px' }}>
                  {/* Card Header: Icon + Toggle */}
                  <div className="flex items-start justify-between mb-5">
                    <div style={{
                      width: 46, height: 46,
                      background: discount.is_active
                        ? `linear-gradient(135deg, rgba(79,95,82,0.12), rgba(79,95,82,0.06))`
                        : 'rgba(166,162,154,0.1)',
                      borderRadius: 14,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: `1.5px solid ${discount.is_active ? 'rgba(79,95,82,0.15)' : 'rgba(166,162,154,0.2)'}`,
                      transition: 'all 0.3s ease',
                    }}>
                      <Percent size={20} style={{ color: discount.is_active ? SAGE : MUTED_GRAY }} />
                    </div>

                    {/* Toggle switch */}
                    <button
                      onClick={() => toggleActive(discount.id, discount.is_active)}
                      title={discount.is_active ? 'Deactivate' : 'Activate'}
                    >
                      <div
                        className="toggle-track"
                        style={{
                          background: discount.is_active ? SAGE : 'rgba(166,162,154,0.3)',
                          borderColor: discount.is_active ? 'rgba(79,95,82,0.2)' : 'rgba(166,162,154,0.2)',
                        }}
                      >
                        <div
                          className="toggle-thumb"
                          style={{ transform: discount.is_active ? 'translateX(16px)' : 'translateX(0)' }}
                        />
                      </div>
                    </button>
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
                        : `₱${parseFloat(discount.discount_value).toLocaleString()}`}
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
                  <div className="flex flex-wrap gap-2 mb-4">
                    {discount.requires_verification && (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontSize: '0.68rem', fontWeight: 600,
                        padding: '3px 9px', borderRadius: 999,
                        background: 'rgba(234,179,8,0.1)',
                        color: '#92670a',
                        border: '1px solid rgba(234,179,8,0.2)',
                      }}>
                        <Info size={10} />
                        ID Required
                      </span>
                    )}
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      fontSize: '0.68rem', fontWeight: 600,
                      padding: '3px 9px', borderRadius: 999,
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

                  {/* Divider */}
                  <div style={{ height: 1, background: `linear-gradient(90deg, transparent, rgba(79,95,82,0.1), transparent)`, marginBottom: 14 }} />

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-1.5">
                    <button
                      onClick={() => openEditModal(discount)}
                      className="action-btn p-2 rounded-xl"
                      style={{ color: SAGE, background: 'rgba(79,95,82,0.08)' }}
                      title="Edit discount"
                    >
                      <Edit2 size={14} strokeWidth={2} />
                    </button>
                    <button
                      onClick={() => deleteDiscount(discount.id, discount.discount_name)}
                      className="action-btn p-2 rounded-xl"
                      style={{ color: '#EF4444', background: 'rgba(239,68,68,0.07)' }}
                      title="Delete discount"
                    >
                      <Trash2 size={14} strokeWidth={2} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ══ Add / Edit Modal ══ */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(30,35,30,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 50, padding: 16, backdropFilter: 'blur(4px)',
        }}>
          <div
            className="modal-enter"
            style={{
              background: '#fff',
              borderRadius: 22,
              width: '100%',
              maxWidth: 480,
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 24px 60px rgba(79,95,82,0.18), 0 4px 16px rgba(0,0,0,0.08)',
              border: '1px solid rgba(242,237,228,0.8)',
            }}
          >
            {/* Modal header */}
            <div style={{
              position: 'sticky', top: 0,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '20px 26px',
              borderBottom: `1px solid ${CREAM}`,
              background: `linear-gradient(135deg, rgba(79,95,82,0.04), rgba(255,243,217,0.3))`,
              backdropFilter: 'blur(8px)',
              zIndex: 10,
            }}>
              <div className="flex items-center gap-3">
                <div style={{
                  width: 32, height: 32,
                  background: `linear-gradient(135deg, ${SAGE}, #3e4c42)`,
                  borderRadius: 9,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 3px 10px rgba(79,95,82,0.25)',
                }}>
                  <Percent size={15} color="#fff" />
                </div>
                <h3 style={{ color: SAGE, fontWeight: 700, fontSize: '1.05rem', letterSpacing: '-0.01em' }}>
                  {editMode ? 'Edit Discount' : 'New Discount'}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{ color: MUTED_GRAY, padding: 7, borderRadius: 10, transition: 'all 0.15s', background: 'transparent' }}
                onMouseEnter={e => e.currentTarget.style.background = CREAM}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '24px 26px', display: 'flex', flexDirection: 'column', gap: 18 }}>
              {formError && (
                <div className="flex items-center gap-2.5 p-3.5 rounded-xl text-sm" style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FEE2E2' }}>
                  <AlertCircle size={15} /> {formError}
                </div>
              )}
              {successMessage && (
                <div className="flex items-center gap-2.5 p-3.5 rounded-xl text-sm" style={{ background: '#ECFDF5', color: '#059669', border: '1px solid #D1FAE5' }}>
                  <CheckCircle size={15} /> {successMessage}
                </div>
              )}

              {/* Discount Name */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: SAGE, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
                  Discount Name *
                </label>
                <input
                  type="text"
                  name="discount_name"
                  value={formData.discount_name}
                  onChange={handleInputChange}
                  required
                  className="modal-input w-full px-3.5 py-2.5 rounded-xl border text-sm"
                  style={{ borderColor: fieldErrors.discount_name ? '#ef4444' : 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa' }}
                />
                {fieldErrors.discount_name && <p style={{ color: '#ef4444', fontSize: '0.72rem', marginTop: 4 }}>{fieldErrors.discount_name[0]}</p>}
              </div>

              {/* Discount Type */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: SAGE, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
                  Discount Type *
                </label>
                <input
                  type="text"
                  name="discount_type"
                  value={formData.discount_type}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., percentage, fixed, buy_1_take_1"
                  className="modal-input w-full px-3.5 py-2.5 rounded-xl border text-sm"
                  style={{ borderColor: fieldErrors.discount_type ? '#ef4444' : 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa' }}
                />
                <p style={{ fontSize: '0.7rem', color: MUTED_GRAY, marginTop: 4 }}>You can enter any custom type</p>
                {fieldErrors.discount_type && <p style={{ color: '#ef4444', fontSize: '0.72rem', marginTop: 4 }}>{fieldErrors.discount_type[0]}</p>}
              </div>

              {/* Discount Value */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: SAGE, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
                  Discount Value *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    step="0.01"
                    name="discount_value"
                    value={formData.discount_value}
                    onChange={handleInputChange}
                    required
                    className="modal-input w-full px-3.5 pr-10 py-2.5 rounded-xl border text-sm"
                    style={{ borderColor: fieldErrors.discount_value ? '#ef4444' : 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa' }}
                  />
                  <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: MUTED_GRAY, fontSize: '0.85rem', fontWeight: 600, pointerEvents: 'none' }}>
                    {formData.discount_type === 'percentage' ? '%' : '₱'}
                  </span>
                </div>
                {fieldErrors.discount_value && <p style={{ color: '#ef4444', fontSize: '0.72rem', marginTop: 4 }}>{fieldErrors.discount_value[0]}</p>}
              </div>

              {/* Description */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: SAGE, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
                  Description <span style={{ color: MUTED_GRAY, fontWeight: 400 }}>(optional)</span>
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={2}
                  className="modal-input w-full px-3.5 py-2.5 rounded-xl border text-sm"
                  style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa', resize: 'none' }}
                />
              </div>

              {/* Checkboxes */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
                {[
                  { name: 'is_active', label: 'Active', checked: formData.is_active },
                  { name: 'requires_verification', label: 'Requires Verification', checked: formData.requires_verification },
                ].map(({ name, label, checked }) => (
                  <label key={name} className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      name={name}
                      checked={checked}
                      onChange={handleInputChange}
                      className="checkbox-custom w-4 h-4 rounded"
                    />
                    <span style={{ fontSize: '0.85rem', color: SAGE, fontWeight: 500 }}>{label}</span>
                  </label>
                ))}
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: `linear-gradient(90deg, transparent, rgba(79,95,82,0.15), transparent)` }} />

              {/* Footer buttons */}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="sec-btn px-5 py-2.5 rounded-xl border text-sm font-medium"
                  style={{ borderColor: 'rgba(166,162,154,0.3)', color: MUTED_GRAY, background: 'transparent' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="primary-btn flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50"
                  style={{ background: `linear-gradient(135deg, ${SAGE}, #3e4c42)` }}
                >
                  {submitting && <Loader size={15} className="animate-spin" />}
                  {submitting
                    ? (editMode ? 'Updating…' : 'Creating…')
                    : (editMode ? 'Update Discount' : 'Create Discount')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}