import React, { useState, useEffect } from 'react';
import axios from '/api/axios';
import {
  Plus, Edit2, Trash2, X, Package, AlertCircle,
  Loader, Box, CheckCircle, XCircle
} from 'lucide-react';

// Color palette
const SAGE = '#4F5F52';
const CREAM = '#F2EDE4';
const MUTED_GRAY = '#A6A29A';
const SOFT_WHITE = '#FFF3D9';

export default function Ingredients() {
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    unit: '',
    scale_per_uni: '',
    current_stock: 0,
    is_active: true,
  });

  // Fetch all ingredients
  const fetchIngredients = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/ingredients');
      setIngredients(res.data.ingredients || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching ingredients:', err);
      if (err.response?.status === 401) {
        setError('Unauthorized. Please login again.');
      } else if (err.response?.status === 403) {
        setError('Access denied. Admin privileges required.');
      } else {
        setError(err.response?.data?.message || 'Failed to load ingredients');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIngredients();
  }, []);

  // Reset modal form
  const resetForm = () => {
    setFormData({
      name: '',
      unit: '',
      scale_per_uni: '',
      current_stock: 0,
      is_active: true,
    });
    setFieldErrors({});
    setFormError('');
  };

  // Open modal for adding
  const openAddModal = () => {
    resetForm();
    setEditMode(false);
    setEditingIngredient(null);
    setShowModal(true);
  };

  // Open modal for editing
  const openEditModal = (ingredient) => {
    setEditMode(true);
    setEditingIngredient(ingredient);
    setFormData({
      name: ingredient.name,
      unit: ingredient.unit,
      scale_per_uni: ingredient.scale_per_uni || '',
      current_stock: ingredient.current_stock,
      is_active: ingredient.is_active,
    });
    setFieldErrors({});
    setFormError('');
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

    try {
      if (editMode && editingIngredient) {
        await axios.put(`/ingredients/${editingIngredient.id}`, formData);
      } else {
        await axios.post('/ingredients', formData);
      }
      await fetchIngredients();
      setShowModal(false);
      resetForm();
    } catch (err) {
      console.error('Save error:', err);
      if (err.response?.status === 422 && err.response?.data?.errors) {
        setFieldErrors(err.response.data.errors);
        setFormError('Please correct the errors below.');
      } else if (err.response?.data?.message) {
        setFormError(err.response.data.message);
      } else {
        setFormError(editMode ? 'Failed to update ingredient' : 'Failed to create ingredient');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Delete ingredient
  const deleteIngredient = async (id, name) => {
    if (!window.confirm(`Delete ingredient "${name}"? This will fail if it's used in any product recipe.`)) return;
    try {
      await axios.delete(`/ingredients/${id}`);
      await fetchIngredients();
    } catch (err) {
      const msg = err.response?.data?.message || 'Delete failed';
      alert(msg);
    }
  };

  // Helper for active badge (using palette)
  const ActiveBadge = ({ isActive }) => (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
      isActive ? 'bg-sage/20 text-sage-dark' : 'bg-muted-gray/20 text-muted-gray'
    }`}>
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );

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
        <span>Error loading ingredients: {error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6" style={{ background: CREAM, minHeight: '100vh', padding: '32px 24px' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: SAGE }}>Ingredient Management</h1>
            <p className="text-sm" style={{ color: MUTED_GRAY }}>Manage raw materials and stock inventory</p>
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm transition-colors"
            style={{ background: SAGE }}
            onMouseEnter={e => e.currentTarget.style.background = '#3e4c42'}
            onMouseLeave={e => e.currentTarget.style.background = SAGE}
          >
            <Plus size={18} /> Add Ingredient
          </button>
        </div>

        {/* Ingredients Table */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden" style={{ borderColor: CREAM }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ background: CREAM }}>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: SAGE }}>ID</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: SAGE }}>Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: SAGE }}>Unit</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: SAGE }}>Scale per Unit</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: SAGE }}>Current Stock</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: SAGE }}>Status</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide" style={{ color: SAGE }}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: CREAM }}>
                {ingredients.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-12" style={{ color: MUTED_GRAY }}>
                      <Package className="mx-auto h-12 w-12 mb-2" style={{ color: MUTED_GRAY }} />
                      No ingredients found
                    </td>
                  </tr>
                ) : (
                  ingredients.map(ing => (
                    <tr key={ing.id} className="hover:bg-[#F2EDE4] transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-xs" style={{ color: MUTED_GRAY }}>#{ing.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap font-medium" style={{ color: SAGE }}>{ing.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: MUTED_GRAY }}>{ing.unit}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: MUTED_GRAY }}>{ing.scale_per_uni || '—'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={ing.current_stock > 0 ? 'text-green-700 font-medium' : 'text-red-500'}>
                          {ing.current_stock} {ing.unit}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap"><ActiveBadge isActive={ing.is_active} /></td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => openEditModal(ing)}
                          className="p-1.5 rounded-lg transition-colors hover:bg-sage/10 mr-2"
                          style={{ color: SAGE }}
                          title="Edit ingredient"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => deleteIngredient(ing.id, ing.name)}
                          className="p-1.5 rounded-lg transition-colors hover:bg-red-50"
                          style={{ color: '#EF4444' }}
                          title="Delete ingredient"
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

      {/* Add/Edit Modal - refined */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl" style={{ animation: 'modalIn 0.2s ease' }}>
            <div className="flex justify-between items-center p-5 border-b" style={{ borderColor: CREAM }}>
              <h3 className="text-xl font-bold" style={{ color: SAGE }}>
                {editMode ? 'Edit Ingredient' : 'Add Ingredient'}
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
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: SAGE }}>Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className={`w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-sage/20 ${fieldErrors.name ? 'border-red-500' : ''}`}
                  style={{ borderColor: CREAM, color: SAGE }}
                />
                {fieldErrors.name && <p className="text-red-500 text-xs mt-1">{fieldErrors.name[0]}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: SAGE }}>Unit *</label>
                <input
                  type="text"
                  name="unit"
                  value={formData.unit}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., kg, pcs, liters"
                  className={`w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-sage/20 ${fieldErrors.unit ? 'border-red-500' : ''}`}
                  style={{ borderColor: CREAM, color: SAGE }}
                />
                {fieldErrors.unit && <p className="text-red-500 text-xs mt-1">{fieldErrors.unit[0]}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: SAGE }}>Scale per Unit (optional)</label>
                <input
                  type="text"
                  name="scale_per_uni"
                  value={formData.scale_per_uni}
                  onChange={handleInputChange}
                  placeholder="e.g., per bag, per box"
                  className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-sage/20"
                  style={{ borderColor: CREAM, color: SAGE }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: SAGE }}>Current Stock</label>
                <input
                  type="number"
                  step="0.01"
                  name="current_stock"
                  value={formData.current_stock}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-sage/20"
                  style={{ borderColor: CREAM, color: SAGE }}
                />
                <p className="text-xs mt-1" style={{ color: MUTED_GRAY }}>Initial stock quantity. Can be adjusted later.</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleInputChange}
                  id="is_active"
                  className="w-4 h-4 rounded"
                />
                <label htmlFor="is_active" className="text-sm" style={{ color: SAGE }}>Active (available for use)</label>
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
                  {submitting ? (editMode ? 'Updating...' : 'Creating...') : (editMode ? 'Update Ingredient' : 'Create Ingredient')}
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