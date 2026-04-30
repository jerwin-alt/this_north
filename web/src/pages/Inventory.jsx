import React, { useState, useEffect } from 'react';
import axios from '/api/axios';
import {
  Plus, Edit2, Trash2, X, Package, AlertCircle,
  Loader, TrendingUp, TrendingDown, Minus, Calendar,
  User, FileText, Hash
} from 'lucide-react';

// Color palette (matches your brand)
const SAGE = '#4F5F52';
const CREAM = '#F2EDE4';
const MUTED_GRAY = '#A6A29A';
const SOFT_WHITE = '#FFF3D9';

export default function Inventory() {
  const [transactions, setTransactions] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal state (unchanged)
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');

  // Form data (unchanged)
  const [formData, setFormData] = useState({
    ingredient_id: '',
    transaction_type: 'purchase',
    quantity: '',
    reference_type: '',
    reference_id: '',
    notes: '',
  });

  // Fetch data (unchanged)
  const fetchData = async () => {
    setLoading(true);
    try {
      const [transRes, ingRes] = await Promise.all([
        axios.get('/inventory-transactions'),
        axios.get('/ingredients')
      ]);
      setTransactions(transRes.data.transactions || []);
      setIngredients(ingRes.data.ingredients || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching data:', err);
      if (err.response?.status === 401) setError('Unauthorized. Please login again.');
      else if (err.response?.status === 403) setError('Access denied. Admin privileges required.');
      else setError(err.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Reset form (unchanged)
  const resetForm = () => {
    setFormData({
      ingredient_id: '',
      transaction_type: 'purchase',
      quantity: '',
      reference_type: '',
      reference_id: '',
      notes: '',
    });
    setFieldErrors({});
    setFormError('');
    setSuccessMessage('');
  };

  const openAddModal = () => {
    resetForm();
    setEditMode(false);
    setEditingTransaction(null);
    setShowModal(true);
  };

  const openEditModal = (transaction) => {
    setEditMode(true);
    setEditingTransaction(transaction);
    setFormData({
      ingredient_id: transaction.ingredient_id,
      transaction_type: transaction.transaction_type,
      quantity: transaction.quantity,
      reference_type: transaction.reference_type || '',
      reference_id: transaction.reference_id || '',
      notes: transaction.notes || '',
    });
    setFieldErrors({});
    setFormError('');
    setSuccessMessage('');
    setShowModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    setFieldErrors({});

    if (!formData.ingredient_id) {
      setFormError('Please select an ingredient');
      setSubmitting(false);
      return;
    }
    if (!formData.transaction_type) {
      setFormError('Transaction type is required');
      setSubmitting(false);
      return;
    }
    if (!formData.quantity || isNaN(parseFloat(formData.quantity)) || parseFloat(formData.quantity) <= 0) {
      setFormError('Quantity must be a positive number');
      setSubmitting(false);
      return;
    }

    const payload = {
      ...formData,
      quantity: parseFloat(formData.quantity),
      reference_id: formData.reference_id ? parseInt(formData.reference_id) : null,
    };

    try {
      if (editMode && editingTransaction) {
        await axios.put(`/inventory-transactions/${editingTransaction.id}`, payload);
        setSuccessMessage('Transaction updated successfully!');
      } else {
        await axios.post('/inventory-transactions', payload);
        setSuccessMessage('Transaction created successfully!');
      }
      await fetchData();
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
        setFormError(editMode ? 'Failed to update transaction' : 'Failed to create transaction');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const deleteTransaction = async (id) => {
    if (!window.confirm('Delete this transaction? This will reverse its effect on ingredient stock.')) return;
    try {
      await axios.delete(`/inventory-transactions/${id}`);
      await fetchData();
    } catch (err) {
      const msg = err.response?.data?.message || 'Delete failed';
      alert(msg);
    }
  };

  const getIngredientName = (id) => {
    const ing = ingredients.find(i => i.id === id);
    return ing ? ing.name : '—';
  };

  const TypeBadge = ({ type }) => {
    const config = {
      purchase: { icon: TrendingUp, text: 'Purchase', color: 'bg-green-100 text-green-700' },
      usage: { icon: TrendingDown, text: 'Usage', color: 'bg-red-100 text-red-700' },
      adjustment: { icon: Minus, text: 'Adjustment', color: 'bg-blue-100 text-blue-700' },
    };
    const { icon: Icon, text, color } = config[type] || { icon: Package, text: type, color: 'bg-gray-100 text-gray-700' };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
        <Icon size={12} /> {text}
      </span>
    );
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
        <span>Error: {error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6" style={{ background: CREAM, minHeight: '100vh', padding: '32px 24px' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header with title and button – animated */}
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6 animate-fade-in-up">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: SAGE }}>Inventory Transactions</h1>
            <p className="text-sm" style={{ color: MUTED_GRAY }}>Record purchases, usage, and stock adjustments</p>
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm transition-colors"
            style={{ background: SAGE }}
            onMouseEnter={e => e.currentTarget.style.background = '#3e4c42'}
            onMouseLeave={e => e.currentTarget.style.background = SAGE}
          >
            <Plus size={18} /> Add Transaction
          </button>
        </div>

        {/* Main Card – matching reference style */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden animate-fade-in-up" style={{ borderColor: CREAM }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-cream-light" style={{ background: CREAM }}>
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: SAGE }}>ID</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: SAGE }}>Ingredient</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: SAGE }}>Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: SAGE }}>Quantity</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: SAGE }}>Stock Change</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: SAGE }}>Reference</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: SAGE }}>Created By</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: SAGE }}>Date</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: SAGE }}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: CREAM }}>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-12" style={{ color: MUTED_GRAY }}>
                      <Package className="mx-auto h-12 w-12 mb-2" style={{ color: MUTED_GRAY }} />
                      No transactions yet
                    </td>
                  </tr>
                ) : (
                  transactions.map(trans => (
                    <tr key={trans.id} className="hover:bg-[#F2EDE4] transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-xs" style={{ color: MUTED_GRAY }}>#{trans.id}</td>
                      <td className="px-4 py-3 whitespace-nowrap font-medium" style={{ color: SAGE }}>
                        {getIngredientName(trans.ingredient_id)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap"><TypeBadge type={trans.transaction_type} /></td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm" style={{ color: MUTED_GRAY }}>
                        {trans.quantity} {trans.ingredient?.unit || ''}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <span className={trans.new_stock > trans.previous_stock ? 'text-green-600' : 'text-red-600'}>
                          {trans.previous_stock} → {trans.new_stock}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm" style={{ color: MUTED_GRAY }}>
                        {trans.reference_type ? `${trans.reference_type} #${trans.reference_id}` : '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm" style={{ color: MUTED_GRAY }}>
                        {trans.created_by?.first_name || 'System'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm" style={{ color: MUTED_GRAY }}>
                        {new Date(trans.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <button
                          onClick={() => openEditModal(trans)}
                          className="p-1.5 rounded-lg transition-colors hover:bg-sage/10 mr-2"
                          style={{ color: SAGE }}
                          title="Edit transaction"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => deleteTransaction(trans.id)}
                          className="p-1.5 rounded-lg transition-colors hover:bg-red-50"
                          style={{ color: '#EF4444' }}
                          title="Delete transaction"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal – unchanged (already refined) */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl animate-modal-in">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center" style={{ borderColor: CREAM }}>
              <h3 className="text-xl font-bold" style={{ color: SAGE }}>
                {editMode ? 'Edit Transaction' : 'New Transaction'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-cream transition-colors" style={{ color: MUTED_GRAY }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium mb-1" style={{ color: SAGE }}>Ingredient *</label>
                  <select
                    name="ingredient_id"
                    value={formData.ingredient_id}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-sage/20"
                    style={{ borderColor: CREAM, color: SAGE }}
                  >
                    <option value="">Select ingredient</option>
                    {ingredients.map(ing => (
                      <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>
                    ))}
                  </select>
                  {fieldErrors.ingredient_id && <p className="text-red-500 text-xs mt-1">{fieldErrors.ingredient_id[0]}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: SAGE }}>Transaction Type *</label>
                  <select
                    name="transaction_type"
                    value={formData.transaction_type}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-sage/20"
                    style={{ borderColor: CREAM, color: SAGE }}
                  >
                    <option value="purchase">Purchase (adds stock)</option>
                    <option value="usage">Usage (deducts stock)</option>
                    <option value="adjustment">Adjustment (adds stock)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: SAGE }}>Quantity *</label>
                  <input
                    type="number"
                    step="0.01"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-sage/20"
                    style={{ borderColor: CREAM, color: SAGE }}
                  />
                  <p className="text-xs mt-1" style={{ color: MUTED_GRAY }}>Positive number only</p>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: SAGE }}>Reference Type</label>
                  <select
                    name="reference_type"
                    value={formData.reference_type}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-sage/20"
                    style={{ borderColor: CREAM, color: SAGE }}
                  >
                    <option value="">None</option>
                    <option value="order">Order</option>
                    <option value="purchase_order">Purchase Order</option>
                    <option value="adjustment">Adjustment</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: SAGE }}>Reference ID</label>
                  <input
                    type="number"
                    name="reference_id"
                    value={formData.reference_id}
                    onChange={handleInputChange}
                    placeholder="Optional"
                    className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-sage/20"
                    style={{ borderColor: CREAM, color: SAGE }}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium mb-1" style={{ color: SAGE }}>Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows="2"
                    className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-sage/20"
                    style={{ borderColor: CREAM, color: SAGE }}
                  />
                </div>
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
                  {submitting ? (editMode ? 'Updating...' : 'Creating...') : (editMode ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: none; }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.4s ease forwards;
        }
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: none; }
        }
        .animate-modal-in {
          animation: modalIn 0.2s ease;
        }
      `}</style>
    </div>
  );
}