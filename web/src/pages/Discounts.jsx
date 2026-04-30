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

export default function Discounts() {
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');

  // Form data
  const [formData, setFormData] = useState({
    discount_name: '',
    discount_type: 'percentage',
    discount_value: '',
    description: '',
    is_active: true,
    requires_verification: false,
  });

  // Fetch all discounts
  const fetchDiscounts = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/discounts');
      setDiscounts(res.data.discounts || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching discounts:', err);
      if (err.response?.status === 401) {
        setError('Unauthorized. Please login again.');
      } else if (err.response?.status === 403) {
        setError('Access denied. Admin privileges required.');
      } else {
        setError(err.response?.data?.message || 'Failed to load discounts');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscounts();
  }, []);

  // Reset modal form
  const resetForm = () => {
    setFormData({
      discount_name: '',
      discount_type: 'percentage',
      discount_value: '',
      description: '',
      is_active: true,
      requires_verification: false,
    });
    setFieldErrors({});
    setFormError('');
    setSuccessMessage('');
  };

  // Open modal for adding
  const openAddModal = () => {
    resetForm();
    setEditMode(false);
    setEditingDiscount(null);
    setShowModal(true);
  };

  // Open modal for editing
  const openEditModal = (discount) => {
    setEditMode(true);
    setEditingDiscount(discount);
    setFormData({
      discount_name: discount.discount_name,
      discount_type: discount.discount_type,
      discount_value: discount.discount_value,
      description: discount.description || '',
      is_active: discount.is_active,
      requires_verification: discount.requires_verification,
    });
    setFieldErrors({});
    setFormError('');
    setSuccessMessage('');
    setShowModal(true);
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Submit create/update
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    setFieldErrors({});

    if (!formData.discount_name.trim()) {
      setFormError('Discount name is required');
      setSubmitting(false);
      return;
    }
    if (!formData.discount_type.trim()) {
      setFormError('Discount type is required');
      setSubmitting(false);
      return;
    }
    if (formData.discount_value === '' || isNaN(parseFloat(formData.discount_value)) || parseFloat(formData.discount_value) < 0) {
      setFormError('Discount value must be a positive number');
      setSubmitting(false);
      return;
    }

    const payload = {
      ...formData,
      discount_value: parseFloat(formData.discount_value),
    };

    try {
      if (editMode && editingDiscount) {
        await axios.put(`/discounts/${editingDiscount.id}`, payload);
        setSuccessMessage('Discount updated successfully!');
      } else {
        await axios.post('/discounts', payload);
        setSuccessMessage('Discount created successfully!');
      }
      await fetchDiscounts();
      setTimeout(() => {
        setShowModal(false);
        resetForm();
        setSuccessMessage('');
      }, 1200);
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

  // Delete discount
  const deleteDiscount = async (id, name) => {
    if (!window.confirm(`Delete discount "${name}"? This action cannot be undone.`)) return;
    try {
      await axios.delete(`/discounts/${id}`);
      await fetchDiscounts();
    } catch (err) {
      const msg = err.response?.data?.message || 'Delete failed';
      alert(msg);
    }
  };

  // Toggle active status (inline switch)
  const toggleActive = async (id, currentActive) => {
    try {
      await axios.put(`/discounts/${id}`, { is_active: !currentActive });
      await fetchDiscounts();
    } catch (err) {
      console.error('Toggle failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader className="animate-spin" style={{ color: SAGE }} size={36} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-lg flex items-center gap-2" style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FEE2E2' }}>
        <AlertCircle size={20} />
        <span>Error loading discounts: {error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6" style={{ background: CREAM, minHeight: '100vh', padding: '32px 24px' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: SAGE }}>Discount Management</h1>
            <p className="text-sm" style={{ color: MUTED_GRAY }}>Create and manage promotional discounts</p>
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm transition-colors"
            style={{ background: SAGE }}
            onMouseEnter={e => e.currentTarget.style.background = '#3e4c42'}
            onMouseLeave={e => e.currentTarget.style.background = SAGE}
          >
            <Plus size={18} /> Add Discount
          </button>
        </div>

        {/* Discounts Grid (card layout) */}
        {discounts.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center" style={{ border: `1px solid ${CREAM}` }}>
            <Percent className="mx-auto h-12 w-12 mb-3" style={{ color: MUTED_GRAY }} />
            <p style={{ color: MUTED_GRAY }}>No discounts found. Click "Add Discount" to create one.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {discounts.map(discount => (
              <div
                key={discount.id}
                className="bg-white rounded-2xl p-5 border shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-200"
                style={{ borderColor: CREAM }}
              >
                {/* Card Header: Icon + Toggle */}
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${SAGE}10` }}>
                    <Percent className="w-6 h-6" style={{ color: SAGE }} />
                  </div>
                  <button
                    onClick={() => toggleActive(discount.id, discount.is_active)}
                    className="relative inline-flex items-center cursor-pointer"
                  >
                    <span
                      className={`w-10 h-5 rounded-full transition-colors duration-200 ${discount.is_active ? 'bg-sage' : 'bg-muted-gray/30'}`}
                      style={{ backgroundColor: discount.is_active ? SAGE : `${MUTED_GRAY}30` }}
                    />
                    <span
                      className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${discount.is_active ? 'translate-x-5' : 'translate-x-0'}`}
                    />
                  </button>
                </div>

                {/* Title & Description */}
                <h3 className="font-semibold" style={{ color: SAGE }}>{discount.discount_name}</h3>
                <p className="text-xs mt-1" style={{ color: MUTED_GRAY }}>{discount.description || 'No description'}</p>

                {/* Badges */}
                <div className="flex flex-wrap gap-2 mt-4">
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${SAGE}10`, color: SAGE }}>
                    {discount.discount_type === 'percentage' ? `${discount.discount_value}% off` : discount.discount_type}
                  </span>
                  {discount.requires_verification && (
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#FEF3C7', color: '#D97706' }}>
                      ID Required
                    </span>
                  )}
                  {!discount.is_active && (
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${MUTED_GRAY}10`, color: MUTED_GRAY }}>
                      Inactive
                    </span>
                  )}
                </div>

                {/* Action Buttons (Edit / Delete) */}
                <div className="flex justify-end gap-2 mt-5 pt-3 border-t" style={{ borderColor: CREAM }}>
                  <button
                    onClick={() => openEditModal(discount)}
                    className="p-1.5 rounded-lg transition-colors hover:bg-sage/10"
                    style={{ color: SAGE }}
                    title="Edit discount"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => deleteDiscount(discount.id, discount.discount_name)}
                    className="p-1.5 rounded-lg transition-colors hover:bg-red-50"
                    style={{ color: '#EF4444' }}
                    title="Delete discount"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal – refined style (identical functionality) */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl" style={{ animation: 'modalIn 0.2s ease' }}>
            <div className="flex justify-between items-center p-5 border-b" style={{ borderColor: CREAM }}>
              <h3 className="text-xl font-bold" style={{ color: SAGE }}>
                {editMode ? 'Edit Discount' : 'Add New Discount'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-cream transition-colors" style={{ color: MUTED_GRAY }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg text-sm" style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FEE2E2' }}>
                  {formError}
                </div>
              )}
              {successMessage && (
                <div className="p-3 rounded-lg text-sm" style={{ background: '#ECFDF5', color: '#059669', border: '1px solid #D1FAE5' }}>
                  {successMessage}
                </div>
              )}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: SAGE }}>Discount Name *</label>
                <input
                  type="text"
                  name="discount_name"
                  value={formData.discount_name}
                  onChange={handleInputChange}
                  required
                  className={`w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-sage/20 ${fieldErrors.discount_name ? 'border-red-500' : ''}`}
                  style={{ borderColor: CREAM, color: SAGE }}
                />
                {fieldErrors.discount_name && <p className="text-red-500 text-xs mt-1">{fieldErrors.discount_name[0]}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: SAGE }}>Discount Type *</label>
                <input
                  type="text"
                  name="discount_type"
                  value={formData.discount_type}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., percentage, fixed, buy_1_take_1"
                  className={`w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-sage/20 ${fieldErrors.discount_type ? 'border-red-500' : ''}`}
                  style={{ borderColor: CREAM, color: SAGE }}
                />
                <p className="text-xs mt-1" style={{ color: MUTED_GRAY }}>You can enter any custom type</p>
                {fieldErrors.discount_type && <p className="text-red-500 text-xs mt-1">{fieldErrors.discount_type[0]}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: SAGE }}>Discount Value *</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    name="discount_value"
                    value={formData.discount_value}
                    onChange={handleInputChange}
                    required
                    className={`w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-sage/20 ${fieldErrors.discount_value ? 'border-red-500' : ''}`}
                    style={{ borderColor: CREAM, color: SAGE }}
                  />
                  <span className="absolute inset-y-0 right-3 flex items-center text-sm" style={{ color: MUTED_GRAY }}>
                    {formData.discount_type === 'percentage' ? '%' : '₱'}
                  </span>
                </div>
                <p className="text-xs mt-1" style={{ color: MUTED_GRAY }}/>
                  {fieldErrors.discount_value && <p className="text-red-500 text-xs mt-1">{fieldErrors.discount_value[0]}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: SAGE }}>Description (optional)</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="2"
                  className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-sage/20"
                  style={{ borderColor: CREAM, color: SAGE }}
                />
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm" style={{ color: SAGE }}>
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleInputChange}
                    className="w-4 h-4 rounded"
                  />
                  Active (discount can be used)
                </label>
                <label className="flex items-center gap-2 text-sm" style={{ color: SAGE }}>
                  <input
                    type="checkbox"
                    name="requires_verification"
                    checked={formData.requires_verification}
                    onChange={handleInputChange}
                    className="w-4 h-4 rounded"
                  />
                  Requires verification
                </label>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: CREAM }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border text-sm transition-colors"
                  style={{ borderColor: CREAM, color: MUTED_GRAY }}
                  onMouseEnter={e => e.currentTarget.style.background = CREAM}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl text-white text-sm flex items-center gap-2 disabled:opacity-50 transition-colors"
                  style={{ background: SAGE }}
                  onMouseEnter={e => e.currentTarget.style.background = '#3e4c42'}
                  onMouseLeave={e => e.currentTarget.style.background = SAGE}
                >
                  {submitting && <Loader size={16} className="animate-spin" />}
                  {submitting ? (editMode ? 'Updating...' : 'Creating...') : (editMode ? 'Update Discount' : 'Create Discount')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: none; }
        }
      `}</style>
    </div>
  );
}