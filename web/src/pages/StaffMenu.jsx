// web/src/pages/StaffMenu.jsx

import React, { useState, useEffect } from 'react';
import axios from '/api/axios';
import {
  Loader, AlertCircle, ShoppingBag, Plus, Minus, Trash2,
  X, Check, Coffee, Sparkles, Sandwich, Cookie, Cake
} from 'lucide-react';
import { useAuth } from '../contexts/auth-context';

// ── Palette ──
const SAGE = '#4F5F52';
const CREAM = '#F2EDE4';
const MUTED_GRAY = '#A6A29A';
const SOFT_WHITE = '#FFF3D9';

// ── Category icon mapping ──
const categoryIcons = {
  'Coffee': Coffee,
  'Non Coffee': Sparkles,
  'Food': Sandwich,
  'Snack': Cookie,
  'Dessert': Cake,
};

// ── Helper for image URL ──
const getImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const base = axios.defaults.baseURL?.replace('/api', '') || 'http://10.213.162.170:8000';
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
};

// ── Product image with fallback ──
function ProductImage({ imageUrl, name }) {
  const [error, setError] = useState(false);
  const url = getImageUrl(imageUrl);
  if (!url || error) {
    return (
      <div style={{
        width: '100%', height: '100%',
        background: CREAM,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 12,
      }}>
        <ShoppingBag size={28} style={{ color: MUTED_GRAY, opacity: 0.3 }} />
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={name}
      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }}
      onError={() => setError(true)}
    />
  );
}

// ── Main Component ──
export default function StaffMenu() {
  const { user } = useAuth();

  // ── State ──
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cart state
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  // Product modal state
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [modalQuantity, setModalQuantity] = useState(1);

  // ── Data fetching ──
  const fetchCategories = async () => {
    try {
      const res = await axios.get('/categories');
      const active = (res.data.categories || []).filter(c => c.is_active);
      setCategories(active);
      if (active.length && !selectedCategory) {
        setSelectedCategory(active[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch categories', err);
    }
  };

  const fetchProducts = async (categoryId) => {
    if (!categoryId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get('/menu', { params: { category: categoryId } });
      setProducts(res.data.products || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      fetchProducts(selectedCategory);
    }
  }, [selectedCategory]);

  // ── Cart functions ──
  const addToCart = (product, quantity) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { ...product, quantity }];
    });
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId, delta) => {
    setCart(prev => {
      const item = prev.find(i => i.id === productId);
      if (!item) return prev;
      const newQty = item.quantity + delta;
      if (newQty <= 0) {
        return prev.filter(i => i.id !== productId);
      }
      return prev.map(i =>
        i.id === productId ? { ...i, quantity: newQty } : i
      );
    });
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.base_price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // ── Product modal handlers ──
  const openProductModal = (product) => {
    setSelectedProduct(product);
    setModalQuantity(1);
    setShowProductModal(true);
  };

  const closeProductModal = () => {
    setShowProductModal(false);
    setSelectedProduct(null);
    setModalQuantity(1);
  };

  const handleConfirmProduct = () => {
    if (!selectedProduct) return;
    if (modalQuantity < 1) {
      alert('Quantity must be at least 1.');
      return;
    }
    addToCart(selectedProduct, modalQuantity);
    closeProductModal();
  };

  // ── Submit walk‑in order ──
  const handlePlaceOrder = async () => {
    if (!customerName.trim()) {
      alert('Please enter customer name.');
      return;
    }
    if (cart.length === 0) {
      alert('Cart is empty.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        customer_name: customerName.trim(),
        customer_phone: '',
        pickup_date: null,
        pickup_time: null,
        notes: '',
        items: cart.map(item => ({
          menu_id: item.id,
          quantity: item.quantity,
        })),
      };

      await axios.post('/staff/orders', payload);

      // Success – clear cart and show success
      setCart([]);
      setCustomerName('');
      setOrderSuccess(true);
      setTimeout(() => setOrderSuccess(false), 4000);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ──
  return (
    <div style={{ background: CREAM, minHeight: '100vh', padding: '36px 28px' }}>
      <style>{`
        .grain-overlay {
          position: fixed; inset: 0; pointer-events: none; z-index: 0; opacity: 0.028;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
          background-repeat: repeat; background-size: 128px;
        }
        .divider-line { height: 1px; background: linear-gradient(90deg, transparent, rgba(79,95,82,0.15), transparent); }
        .tab-btn {
          border: none; background: none; padding: 8px 20px; border-radius: 999px;
          font-size: 0.85rem; font-weight: 600; transition: all 0.2s;
          cursor: pointer; white-space: nowrap;
        }
        .tab-btn.active {
          background: ${SAGE}; color: #fff;
          box-shadow: 0 4px 14px rgba(79,95,82,0.28);
        }
        .tab-btn:not(.active) {
          background: rgba(255,255,255,0.8); color: ${MUTED_GRAY};
          border: 1.5px solid rgba(166,162,154,0.25);
        }
        .product-card {
          background: #fff; border-radius: 18px; overflow: hidden;
          border: 1.5px solid rgba(242,237,228,0.9);
          box-shadow: 0 2px 12px rgba(79,95,82,0.06);
          transition: box-shadow 0.2s, transform 0.2s;
          cursor: pointer;
        }
        .product-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 28px rgba(79,95,82,0.14);
        }
        .modal-overlay {
          position: fixed; inset: 0;
          background: rgba(20,28,22,0.5);
          display: flex; align-items: center; justify-content: center;
          z-index: 50;
          padding: 16px;
        }
        .modal-content {
          background: #fff; border-radius: 24px;
          width: 100%; max-width: 420px;
          max-height: 80vh; overflow-y: auto;
          padding: 24px;
          box-shadow: 0 24px 60px rgba(79,95,82,0.18);
        }
        .summary-sidebar {
          background: #fff; border-radius: 20px;
          border: 1.5px solid rgba(242,237,228,0.9);
          box-shadow: 0 2px 12px rgba(79,95,82,0.06);
          padding: 20px;
          max-height: calc(100vh - 120px);
          overflow-y: auto;
          position: sticky;
          top: 20px;
        }
        .cart-item {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 0; border-bottom: 1px solid rgba(242,237,228,0.8);
        }
        .cart-item:last-child { border-bottom: none; }
        @media (max-width: 1024px) {
          .summary-sidebar { position: relative; top: 0; max-height: none; }
        }
      `}</style>

      <div className="grain-overlay" />

      <div className="max-w-7xl mx-auto relative" style={{ zIndex: 1 }}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div style={{
            width: 36, height: 36,
            background: `linear-gradient(135deg, ${SAGE}, #3e4c42)`,
            borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(79,95,82,0.25)'
          }}>
            <ShoppingBag size={18} color="#fff" />
          </div>
          <div>
            <h1 style={{ color: SAGE, fontSize: '1.55rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
              Create Walk‑in Order
            </h1>
            <p style={{ color: MUTED_GRAY, fontSize: '0.82rem' }}>
              Select products for the customer
            </p>
          </div>
        </div>

        <div className="divider-line mb-6" />

        {/* Success banner */}
        {orderSuccess && (
          <div style={{
            background: '#ECFDF5', color: '#059669',
            padding: '12px 16px', borderRadius: 12,
            border: '1px solid #D1FAE5',
            display: 'flex', alignItems: 'center', gap: 8,
            marginBottom: 20
          }}>
            <Check size={18} />
            <span>Order placed successfully! View it in <strong>Orders</strong>.</span>
          </div>
        )}

        {/* Two‑column layout: products + summary */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left: Products */}
          <div className="lg:col-span-3">
            {/* Category tabs */}
            <div style={{ display: 'flex', flexWrap: 'nowrap', overflowX: 'auto', gap: 8, paddingBottom: 12, marginBottom: 16 }}>
              {categories.map(cat => {
                const Icon = categoryIcons[cat.name] || ShoppingBag;
                const active = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`tab-btn ${active ? 'active' : ''}`}
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <Icon size={16} strokeWidth={active ? 2.2 : 1.8} />
                    {cat.name}
                  </button>
                );
              })}
            </div>

            {/* Products grid */}
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
                <Loader className="animate-spin" size={36} style={{ color: SAGE }} />
              </div>
            ) : error ? (
              <div style={{ padding: 24, color: '#DC2626', background: '#FEF2F2', borderRadius: 12 }}>
                <AlertCircle size={20} style={{ display: 'inline', marginRight: 8 }} />
                {error}
              </div>
            ) : products.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 48, color: MUTED_GRAY }}>
                <div style={{
                  width: 64, height: 64,
                  background: 'rgba(166,162,154,0.1)',
                  borderRadius: 16, margin: '0 auto 12px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1.5px dashed rgba(166,162,154,0.3)'
                }}>
                  <ShoppingBag size={28} style={{ opacity: 0.4 }} />
                </div>
                <p>No products in this category</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16 }}>
                {products.map(product => (
                  <div key={product.id} className="product-card" onClick={() => openProductModal(product)}>
                    <div style={{ aspectRatio: '1/1', background: CREAM, overflow: 'hidden' }}>
                      <ProductImage imageUrl={product.image_url} name={product.name} />
                    </div>
                    <div style={{ padding: '12px 14px 14px' }}>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: SAGE, marginBottom: 2 }}>
                        {product.name}
                      </h3>
                      <p style={{ fontSize: '0.7rem', color: MUTED_GRAY, marginBottom: 6 }}>
                        {product.description?.slice(0, 40) || ''}
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 800, color: SAGE, fontSize: '1.1rem' }}>
                          ₱{parseFloat(product.base_price).toLocaleString()}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); openProductModal(product); }}
                          style={{
                            background: SAGE, border: 'none', borderRadius: 8,
                            width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', color: '#fff'
                          }}
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Order Summary */}
          <div className="lg:col-span-1">
            <div className="summary-sidebar">
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: SAGE, marginBottom: 12 }}>
                Order Summary
              </h2>

              {cart.length === 0 ? (
                <p style={{ color: MUTED_GRAY, fontSize: '0.85rem', textAlign: 'center', padding: 20 }}>
                  No items added yet.
                </p>
              ) : (
                <>
                  <div style={{ maxHeight: '40vh', overflowY: 'auto', marginBottom: 12 }}>
                    {cart.map(item => (
                      <div key={item.id} className="cart-item">
                        <div style={{ width: 40, height: 40, borderRadius: 8, overflow: 'hidden', background: CREAM, flexShrink: 0 }}>
                          <ProductImage imageUrl={item.image_url} name={item.name} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontWeight: 600, color: SAGE, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.name}
                          </p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                            <button
                              onClick={() => updateQuantity(item.id, -1)}
                              style={{ background: 'rgba(79,95,82,0.08)', border: 'none', borderRadius: 4, width: 20, height: 20, cursor: 'pointer' }}
                            >
                              <Minus size={12} color={SAGE} />
                            </button>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: SAGE, minWidth: 20, textAlign: 'center' }}>
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.id, 1)}
                              style={{ background: 'rgba(79,95,82,0.08)', border: 'none', borderRadius: 4, width: 20, height: 20, cursor: 'pointer' }}
                            >
                              <Plus size={12} color={SAGE} />
                            </button>
                            <button
                              onClick={() => removeFromCart(item.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 4 }}
                            >
                              <Trash2 size={12} color="#EF4444" />
                            </button>
                          </div>
                        </div>
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: SAGE }}>
                          ₱{parseFloat(item.base_price * item.quantity).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="divider-line" style={{ margin: '8px 0' }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: MUTED_GRAY }}>Total</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: SAGE }}>
                      ₱{cartTotal.toLocaleString()}
                    </span>
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: SAGE, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 4 }}>
                      Customer Name *
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Enter customer's name"
                      style={{
                        width: '100%', padding: '8px 12px',
                        borderRadius: 10, border: '1.5px solid rgba(166,162,154,0.3)',
                        fontSize: '0.9rem', color: SAGE, background: '#fafafa',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <button
                    onClick={handlePlaceOrder}
                    disabled={submitting}
                    style={{
                      width: '100%', padding: '12px',
                      background: `linear-gradient(135deg, ${SAGE}, #3e4c42)`,
                      border: 'none', borderRadius: 12,
                      color: '#fff', fontWeight: 700, fontSize: '0.95rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      cursor: submitting ? 'not-allowed' : 'pointer',
                      opacity: submitting ? 0.7 : 1,
                      boxShadow: '0 4px 14px rgba(79,95,82,0.28)'
                    }}
                  >
                    {submitting ? <Loader size={18} className="animate-spin" /> : <Check size={18} />}
                    {submitting ? 'Placing Order...' : 'Place Walk‑in Order'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Product Modal ── */}
      {showProductModal && selectedProduct && (
        <div className="modal-overlay" onClick={closeProductModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: SAGE }}>
                  {selectedProduct.name}
                </h3>
                <p style={{ fontSize: '0.9rem', color: MUTED_GRAY, marginTop: 4 }}>
                  ₱{parseFloat(selectedProduct.base_price).toLocaleString()} each
                </p>
                {selectedProduct.description && (
                  <p style={{ fontSize: '0.8rem', color: MUTED_GRAY, marginTop: 6 }}>
                    {selectedProduct.description}
                  </p>
                )}
              </div>
              <button onClick={closeProductModal} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} style={{ color: MUTED_GRAY }} />
              </button>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: SAGE, marginBottom: 6 }}>
                Quantity
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  onClick={() => setModalQuantity(prev => Math.max(1, prev - 1))}
                  style={{ background: 'rgba(79,95,82,0.08)', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer' }}
                >
                  <Minus size={16} color={SAGE} />
                </button>
                <span style={{ fontSize: '1.2rem', fontWeight: 700, color: SAGE, minWidth: 40, textAlign: 'center' }}>
                  {modalQuantity}
                </span>
                <button
                  onClick={() => setModalQuantity(prev => prev + 1)}
                  style={{ background: 'rgba(79,95,82,0.08)', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer' }}
                >
                  <Plus size={16} color={SAGE} />
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={closeProductModal}
                style={{
                  flex: 1, padding: '10px', borderRadius: 12,
                  border: '1.5px solid rgba(166,162,154,0.3)',
                  background: 'transparent', color: MUTED_GRAY, fontWeight: 600, cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmProduct}
                style={{
                  flex: 2, padding: '10px', borderRadius: 12,
                  background: `linear-gradient(135deg, ${SAGE}, #3e4c42)`,
                  border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(79,95,82,0.25)'
                }}
              >
                Confirm & Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}