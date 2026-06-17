// web/src/pages/Ingredients.jsx

import React, { useState, useEffect } from 'react';
import axios from '/api/axios';
import {
  Plus, Edit2, Trash2, X, Package, AlertCircle,
  Loader, Box, ArrowUpCircle
} from 'lucide-react';

const SAGE = '#4F5F52';
const CREAM = '#F2EDE4';
const MUTED_GRAY = '#A6A29A';
const SOFT_WHITE = '#FFF3D9';

export default function Ingredients() {
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Add/Edit Modal state ──
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  // Form data for add/edit
  const [formData, setFormData] = useState({
    name: '',
    unit: '',
    scale_per_uni: '',
    current_stock: 0,
    is_active: true,
  });

  // ── Adjust Stock Modal state ──
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockIngredient, setStockIngredient] = useState(null);
  const [stockForm, setStockForm] = useState({
    transaction_type: 'purchase',
    quantity: '',
    notes: ''
  });
  const [stockSubmitting, setStockSubmitting] = useState(false);
  const [stockError, setStockError] = useState('');

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

  // ── Add/Edit Handlers ──
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

  const openAddModal = () => {
    resetForm();
    setEditMode(false);
    setEditingIngredient(null);
    setShowModal(true);
  };

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

  // ── Adjust Stock Handlers ──
  const openAdjustStock = (ingredient) => {
    setStockIngredient(ingredient);
    setStockForm({
      transaction_type: 'purchase',
      quantity: '',
      notes: ''
    });
    setStockError('');
    setShowStockModal(true);
  };

  const handleStockSubmit = async (e) => {
    e.preventDefault();
    if (!stockForm.quantity || parseFloat(stockForm.quantity) <= 0) {
      setStockError('Quantity must be a positive number');
      return;
    }

    setStockSubmitting(true);
    setStockError('');

    try {
      await axios.post(`/ingredients/${stockIngredient.id}/adjust-stock`, {
        transaction_type: stockForm.transaction_type,
        quantity: parseFloat(stockForm.quantity),
        notes: stockForm.notes
      });

      await fetchIngredients();
      setShowStockModal(false);
      setStockIngredient(null);
    } catch (err) {
      const msg = err.response?.data?.message || 'Stock adjustment failed';
      setStockError(msg);
    } finally {
      setStockSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ background: CREAM, minHeight: '100vh' }} className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader className="animate-spin" style={{ color: SAGE }} size={36} />
          <p style={{ color: MUTED_GRAY, fontSize: '0.85rem', letterSpacing: '0.05em' }}>Loading ingredients…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-2xl m-6" style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FEE2E2' }}>
        <AlertCircle size={20} />
        <span style={{ fontSize: '0.875rem' }}>Error loading ingredients: {error}</span>
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
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
        .anim-up { animation: fadeInUp 0.4s cubic-bezier(0.25,0.46,0.45,0.94) forwards; }
        .anim-up-delay { animation: fadeInUp 0.4s 0.08s cubic-bezier(0.25,0.46,0.45,0.94) both; }
        @keyframes modalIn { from { opacity: 0; transform: scale(0.96) translateY(12px); } to { opacity: 1; transform: none; } }
        .anim-modal { animation: modalIn 0.25s cubic-bezier(0.25,0.46,0.45,0.94); }
        .divider-line { height: 1px; background: linear-gradient(90deg, transparent, rgba(79,95,82,0.15), transparent); }
        .table-row-hover { transition: background 0.15s ease; }
        .table-row-hover:hover { background: rgba(242,237,228,0.65) !important; }
        .action-btn { transition: all 0.18s ease; border-radius: 10px; border: none; cursor: pointer; }
        .action-btn:hover { transform: scale(1.12); }
        .primary-btn { position: relative; overflow: hidden; transition: all 0.22s cubic-bezier(0.4,0,0.2,1); border: none; cursor: pointer; }
        .primary-btn::before { content: ''; position: absolute; inset: 0; background: rgba(255,255,255,0.1); opacity: 0; transition: opacity 0.2s; }
        .primary-btn:hover::before { opacity: 1; }
        .primary-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(79,95,82,0.3); }
        .primary-btn:active { transform: translateY(0); }
        .sec-btn { transition: all 0.2s ease; cursor: pointer; }
        .sec-btn:hover { background: rgba(79,95,82,0.07) !important; transform: translateY(-1px); }
        .modal-input:focus { box-shadow: 0 0 0 3px rgba(79,95,82,0.12); border-color: #4F5F52 !important; outline: none; }
        .checkbox-custom { accent-color: #4F5F52; }
        .stock-pill-ok { background: rgba(52,211,104,0.1); color: #1a7a3a; border: 1px solid rgba(52,211,104,0.2); }
        .stock-pill-empty { background: rgba(239,68,68,0.08); color: #dc2626; border: 1px solid rgba(239,68,68,0.18); }
      `}</style>

      <div className="grain-overlay" />

      <div className="max-w-7xl mx-auto relative" style={{ zIndex: 1 }}>
        {/* ── Header ── */}
        <div className="anim-up flex flex-wrap justify-between items-start gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div style={{
                width: 36, height: 36,
                background: `linear-gradient(135deg, ${SAGE}, #3e4c42)`,
                borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(79,95,82,0.25)',
              }}>
                <Box size={18} color="#fff" />
              </div>
              <h1 style={{ color: SAGE, fontSize: '1.55rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
                Ingredient Management
              </h1>
            </div>
            <p style={{ color: MUTED_GRAY, fontSize: '0.82rem', letterSpacing: '0.03em', marginLeft: 48 }}>
              {ingredients.length} ingredient{ingredients.length !== 1 ? 's' : ''} in inventory
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
            Add Ingredient
          </button>
        </div>

        {/* ── Divider ── */}
        <div className="divider-line mb-7" />

        {/* ── Table Card ── */}
        <div className="anim-up-delay rounded-2xl overflow-hidden" style={{
          background: '#fff',
          border: '1.5px solid rgba(242,237,228,0.9)',
          boxShadow: '0 4px 24px rgba(79,95,82,0.07)',
        }}>
          <div className="overflow-x-auto">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{
                  background: `linear-gradient(135deg, rgba(242,237,228,0.9), rgba(255,243,217,0.4))`,
                  borderBottom: '1.5px solid rgba(242,237,228,1)',
                }}>
                  {['ID', 'Name', 'Unit', 'Scale / Unit', 'Current Stock', 'Actions'].map((h, i) => (
                    <th key={h} style={{
                      padding: '14px 20px',
                      textAlign: i === 5 ? 'right' : 'left',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: SAGE,
                      whiteSpace: 'nowrap',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ingredients.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '64px 24px' }}>
                      <div style={{
                        width: 64, height: 64,
                        background: 'rgba(166,162,154,0.1)',
                        borderRadius: 18,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '1.5px dashed rgba(166,162,154,0.35)',
                        margin: '0 auto 12px',
                      }}>
                        <Package size={28} style={{ color: MUTED_GRAY, opacity: 0.4 }} />
                      </div>
                      <p style={{ color: MUTED_GRAY, fontSize: '0.875rem' }}>No ingredients found.</p>
                    </td>
                  </tr>
                ) : (
                  ingredients.map((ing, idx) => (
                    <tr key={ing.id} className="table-row-hover" style={{
                      borderBottom: idx < ingredients.length - 1 ? '1px solid rgba(242,237,228,0.8)' : 'none',
                    }}>
                      {/* ID */}
                      <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
                        <span style={{
                          fontSize: '0.7rem', fontWeight: 700,
                          color: MUTED_GRAY, letterSpacing: '0.05em',
                          background: 'rgba(166,162,154,0.1)',
                          padding: '2px 8px', borderRadius: 6,
                        }}>
                          #{ing.id}
                        </span>
                      </td>

                      {/* Name */}
                      <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                            background: `linear-gradient(135deg, rgba(79,95,82,0.12), rgba(79,95,82,0.06))`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: '1px solid rgba(79,95,82,0.12)',
                          }}>
                            <Box size={13} style={{ color: SAGE }} />
                          </div>
                          <span style={{ color: SAGE, fontWeight: 600, fontSize: '0.875rem' }}>
                            {ing.name}
                          </span>
                        </div>
                      </td>

                      {/* Unit */}
                      <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
                        <span style={{
                          fontSize: '0.75rem', fontWeight: 600,
                          color: SAGE,
                          background: 'rgba(79,95,82,0.07)',
                          border: '1px solid rgba(79,95,82,0.12)',
                          padding: '3px 10px', borderRadius: 8,
                          letterSpacing: '0.03em',
                        }}>
                          {ing.unit}
                        </span>
                      </td>

                      {/* Scale per unit */}
                      <td style={{ padding: '14px 20px', whiteSpace: 'nowrap', color: MUTED_GRAY, fontSize: '0.8rem' }}>
                        {ing.scale_per_uni || (
                          <span style={{ opacity: 0.4 }}>—</span>
                        )}
                      </td>

                      {/* Current stock */}
                      <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
                        <span className={ing.current_stock > 0 ? 'stock-pill-ok' : 'stock-pill-empty'} style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '3px 10px', borderRadius: 8,
                          fontSize: '0.75rem', fontWeight: 700,
                        }}>
                          <span style={{
                            width: 6, height: 6, borderRadius: '50%',
                            background: ing.current_stock > 0 ? '#34d468' : '#ef4444',
                            display: 'inline-block', flexShrink: 0,
                          }} />
                          {ing.current_stock} {ing.unit}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 20px', whiteSpace: 'nowrap', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                          <button
                            onClick={() => openAdjustStock(ing)}
                            className="action-btn"
                            style={{ padding: '7px', color: '#0d9488', background: 'rgba(13,148,136,0.1)' }}
                            title="Adjust stock"
                          >
                            <ArrowUpCircle size={14} strokeWidth={2} />
                          </button>
                          <button
                            onClick={() => openEditModal(ing)}
                            className="action-btn"
                            style={{ padding: '7px', color: SAGE, background: 'rgba(79,95,82,0.08)' }}
                            title="Edit ingredient"
                          >
                            <Edit2 size={14} strokeWidth={2} />
                          </button>
                          <button
                            onClick={() => deleteIngredient(ing.id, ing.name)}
                            className="action-btn"
                            style={{ padding: '7px', color: '#EF4444', background: 'rgba(239,68,68,0.07)' }}
                            title="Delete ingredient"
                          >
                            <Trash2 size={14} strokeWidth={2} />
                          </button>
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

      {/* ══ Add/Edit Modal ══ */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(30,35,30,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 50, padding: 16, backdropFilter: 'blur(4px)',
        }}>
          <div className="anim-modal" style={{
            background: '#fff',
            borderRadius: 22,
            width: '100%', maxWidth: 460,
            boxShadow: '0 24px 60px rgba(79,95,82,0.18), 0 4px 16px rgba(0,0,0,0.08)',
            border: '1px solid rgba(242,237,228,0.8)',
            overflow: 'hidden',
          }}>
            {/* Modal header */}
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
                  <Box size={16} color="#fff" />
                </div>
                <h3 style={{ color: SAGE, fontWeight: 700, fontSize: '1.05rem', letterSpacing: '-0.01em' }}>
                  {editMode ? 'Edit Ingredient' : 'New Ingredient'}
                </h3>
              </div>
              <button onClick={() => setShowModal(false)} style={{
                color: MUTED_GRAY, padding: 7, borderRadius: 10,
                transition: 'all 0.15s', background: 'transparent', border: 'none', cursor: 'pointer',
              }} onMouseEnter={e => e.currentTarget.style.background = CREAM} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <X size={19} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {formError && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '11px 14px', borderRadius: 12, fontSize: '0.82rem',
                  background: '#FEF2F2', color: '#DC2626', border: '1px solid #FEE2E2',
                }}>
                  <AlertCircle size={15} /> {formError}
                </div>
              )}
              {/* Name */}
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: SAGE, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>Name *</label>
                <input type="text" name="name" value={formData.name} onChange={handleInputChange} required className="modal-input w-full px-3.5 py-2.5 rounded-xl border text-sm" style={{ borderColor: fieldErrors.name ? '#EF4444' : 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa' }} />
                {fieldErrors.name && <p style={{ color: '#EF4444', fontSize: '0.72rem', marginTop: 4 }}>{fieldErrors.name[0]}</p>}
              </div>

              {/* Unit - DROPDOWN */}
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: SAGE, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>Unit *</label>
                <select
                  name="unit"
                  value={formData.unit}
                  onChange={handleInputChange}
                  required
                  className="modal-input w-full px-3.5 py-2.5 rounded-xl border text-sm"
                  style={{ borderColor: fieldErrors.unit ? '#EF4444' : 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa' }}
                >
                  <option value="">Select unit</option>
                  <option value="Grams (G)">Grams (G)</option>
                  <option value="Kilograms (KG)">Kilograms (KG)</option>
                  <option value="Ounces (OZ)">Ounces (OZ)</option>
                  <option value="Pieces (PCS)">Pieces (PCS)</option>
                  <option value="Milliliter (ML)">Milliliter (ML)</option>
                  <option value="Liter (L)">Liter (L)</option>
                  <option value="Pack (P)">Pack (P)</option>
                  <option value="Gallon (GL)">Gallon (GL)</option>
                </select>
                {fieldErrors.unit && <p style={{ color: '#EF4444', fontSize: '0.72rem', marginTop: 4 }}>{fieldErrors.unit[0]}</p>}
              </div>

              {/* Scale per Unit - DROPDOWN */}
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: SAGE, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>
                  Scale per Unit <span style={{ color: MUTED_GRAY, fontWeight: 400, textTransform: 'none', fontSize: '0.68rem' }}>(optional)</span>
                </label>
                <select
                  name="scale_per_uni"
                  value={formData.scale_per_uni}
                  onChange={handleInputChange}
                  className="modal-input w-full px-3.5 py-2.5 rounded-xl border text-sm"
                  style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa' }}
                >
                  <option value="">Select scale (optional)</option>
                  <option value="Per Bag">Per Bag</option>
                  <option value="Per Box">Per Box</option>
                  <option value="Per Tray">Per Tray</option>
                  <option value="Per Sack">Per Sack</option>
                  <option value="Per Can">Per Can</option>
                </select>
              </div>

              {/* Current Stock */}
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: SAGE, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>Current Stock</label>
                <input type="number" step="0.01" name="current_stock" value={formData.current_stock} onChange={handleInputChange} className="modal-input w-full px-3.5 py-2.5 rounded-xl border text-sm" style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa' }} />
                <p style={{ color: MUTED_GRAY, fontSize: '0.7rem', marginTop: 5 }}>Initial quantity — adjustable later.</p>
              </div>

              {/* Active checkbox */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" name="is_active" checked={formData.is_active} onChange={handleInputChange} id="is_active" className="checkbox-custom" style={{ width: 16, height: 16, borderRadius: 4 }} />
                <span style={{ fontSize: '0.85rem', color: SAGE, fontWeight: 500 }}>
                  Active <span style={{ color: MUTED_GRAY, fontWeight: 400 }}>(available for use)</span>
                </span>
              </label>

              <div className="divider-line" />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" onClick={() => setShowModal(false)} className="sec-btn px-5 py-2.5 rounded-xl border text-sm font-medium" style={{ borderColor: 'rgba(166,162,154,0.3)', color: MUTED_GRAY, background: 'transparent' }}>Cancel</button>
                <button type="submit" disabled={submitting} className="primary-btn flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50" style={{ background: `linear-gradient(135deg, ${SAGE}, #3e4c42)` }}>
                  {submitting && <Loader size={15} className="animate-spin" />}
                  {submitting ? (editMode ? 'Updating…' : 'Creating…') : (editMode ? 'Update Ingredient' : 'Create Ingredient')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ Adjust Stock Modal (unchanged) ══ */}
      {showStockModal && stockIngredient && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(30,35,30,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 50, padding: 16, backdropFilter: 'blur(4px)',
        }}>
          <div className="anim-modal" style={{
            background: '#fff',
            borderRadius: 22,
            width: '100%', maxWidth: 420,
            boxShadow: '0 24px 60px rgba(79,95,82,0.18), 0 4px 16px rgba(0,0,0,0.08)',
            border: '1px solid rgba(242,237,228,0.8)',
            overflow: 'hidden',
          }}>
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
                }}>
                  <ArrowUpCircle size={16} color="#fff" />
                </div>
                <h3 style={{ color: SAGE, fontWeight: 700, fontSize: '1.05rem' }}>
                  Adjust Stock: {stockIngredient.name}
                </h3>
              </div>
              <button onClick={() => setShowStockModal(false)} style={{ color: MUTED_GRAY, padding: 7, borderRadius: 10, transition: 'all 0.15s', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleStockSubmit} style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {stockError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 12, fontSize: '0.82rem', background: '#FEF2F2', color: '#DC2626', border: '1px solid #FEE2E2' }}>
                  <AlertCircle size={15} /> {stockError}
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: SAGE, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>Transaction Type *</label>
                <select
                  value={stockForm.transaction_type}
                  onChange={(e) => setStockForm({ ...stockForm, transaction_type: e.target.value })}
                  required
                  className="modal-input w-full px-3.5 py-2.5 rounded-xl border text-sm"
                  style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa' }}
                >
                  <option value="purchase">Purchase (add)</option>
                  <option value="usage">Usage (subtract)</option>
                  <option value="adjustment">Adjustment (add)</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: SAGE, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>Quantity *</label>
                <input
                  type="number" step="0.01" min="0"
                  value={stockForm.quantity}
                  onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })}
                  placeholder="0.00"
                  required
                  className="modal-input w-full px-3.5 py-2.5 rounded-xl border text-sm"
                  style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: SAGE, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>Notes</label>
                <textarea
                  value={stockForm.notes}
                  onChange={(e) => setStockForm({ ...stockForm, notes: e.target.value })}
                  rows={2}
                  className="modal-input w-full px-3.5 py-2.5 rounded-xl border text-sm resize-none"
                  style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa' }}
                />
              </div>

              <div className="divider-line" />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" onClick={() => setShowStockModal(false)} className="sec-btn px-5 py-2.5 rounded-xl border text-sm font-medium" style={{ borderColor: 'rgba(166,162,154,0.3)', color: MUTED_GRAY }}>Cancel</button>
                <button type="submit" disabled={stockSubmitting} className="primary-btn flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50" style={{ background: `linear-gradient(135deg, ${SAGE}, #3e4c42)` }}>
                  {stockSubmitting ? <Loader size={15} className="animate-spin" /> : 'Adjust Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}