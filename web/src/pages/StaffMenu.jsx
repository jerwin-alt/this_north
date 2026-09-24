// web/src/pages/StaffMenu.jsx

import React, { useState, useEffect, useMemo } from 'react';
import axios from '/api/axios';
import {
  Loader, AlertCircle, ShoppingBag, Plus, Minus, Trash2,
  X, Check, Coffee, Sparkles, Sandwich, Cookie, Cake, Percent
} from 'lucide-react';
import { useAuth } from '../contexts/auth-context';

import { API_ORIGIN } from '../utils/apiBase';

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
// const getImageUrl = (path) => {
//   if (!path) return null;
//   if (path.startsWith('http')) return path;
//   const base = axios.defaults.baseURL?.replace('/api', '') || 'http://10.90.129.170:8000';
//   return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
// };

const getImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${API_ORIGIN}${path.startsWith('/') ? '' : '/'}${path}`;
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
        borderRadius: 8,
      }}>
        <ShoppingBag size={20} style={{ color: MUTED_GRAY, opacity: 0.3 }} />
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={name}
      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }}
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

  // Discount state
  const [discountId, setDiscountId] = useState(null);
  const [discountApplied, setDiscountApplied] = useState(false);
  const [discountedItemId, setDiscountedItemId] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountValue, setDiscountValue] = useState(0);

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

  // Fetch the PWD/Senior Citizen discount
  const fetchDiscount = async () => {
    try {
      const res = await axios.get('/staff/discounts');
      const discounts = res.data.discounts || [];
      const pwdDiscount = discounts.find(
        d => d.requires_verification && d.discount_type === 'percentage' && Number(d.discount_value) === 30 && d.is_active
      );
      if (pwdDiscount) {
        setDiscountId(pwdDiscount.id);
        setDiscountValue(Number(pwdDiscount.discount_value));
      } else {
        console.warn('No PWD/Senior Citizen discount found');
      }
    } catch (err) {
      console.error('Failed to fetch discounts', err);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchDiscount();
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
    // Auto‑clear discount if applied (to avoid inconsistencies)
    if (discountApplied) {
      removeDiscount();
    }
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.id !== productId));
    // If the discounted item was removed, clear discount
    if (discountApplied && discountedItemId === productId) {
      removeDiscount();
    }
  };

  const updateQuantity = (productId, delta) => {
    setCart(prev => {
      const item = prev.find(i => i.id === productId);
      if (!item) return prev;
      const newQty = item.quantity + delta;
      if (newQty <= 0) {
        const updated = prev.filter(i => i.id !== productId);
        if (discountApplied && discountedItemId === productId) {
          removeDiscount();
        }
        return updated;
      }
      const updated = prev.map(i =>
        i.id === productId ? { ...i, quantity: newQty } : i
      );
      // If discount applied and quantity changed, clear discount to avoid inconsistencies
      if (discountApplied) {
        removeDiscount();
      }
      return updated;
    });
  };

  // ── Discount functions ──
  const applyDiscount = () => {
    if (cart.length === 0) {
      alert('Add at least one product to apply discount.');
      return;
    }
    if (discountApplied) {
      alert('Discount already applied.');
      return;
    }
    if (!discountId) {
      alert('No active PWD/Senior Citizen discount found.');
      return;
    }

    // Find the item with the lowest total price (base_price * quantity)
    let lowestItem = null;
    let lowestTotal = Infinity;
    cart.forEach(item => {
      const itemTotal = item.base_price * item.quantity;
      if (itemTotal < lowestTotal) {
        lowestTotal = itemTotal;
        lowestItem = item;
      }
    });

    if (!lowestItem) {
      alert('No items to discount.');
      return;
    }

    const discountAmt = Math.round(lowestTotal * (discountValue / 100) * 100) / 100;
    setDiscountedItemId(lowestItem.id);
    setDiscountAmount(discountAmt);
    setDiscountApplied(true);
  };

  const removeDiscount = () => {
    setDiscountedItemId(null);
    setDiscountAmount(0);
    setDiscountApplied(false);
  };

  // ── Computed totals (including discount) ──
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.base_price * item.quantity, 0);
  }, [cart]);

  const cartTotal = useMemo(() => {
    return subtotal - (discountApplied ? discountAmount : 0);
  }, [subtotal, discountApplied, discountAmount]);

  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

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

      // Include discount data if applied
      if (discountApplied && discountId) {
        payload.discount_id = discountId;
        payload.discounted_menu_id = discountedItemId;
      }

      await axios.post('/staff/orders', payload);

      setCart([]);
      setCustomerName('');
      setOrderSuccess(true);
      setTimeout(() => setOrderSuccess(false), 4000);
      // Reset discount state
      setDiscountApplied(false);
      setDiscountedItemId(null);
      setDiscountAmount(0);
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
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 12px 0;
          border-bottom: 1px solid rgba(242,237,228,0.8);
        }
        .cart-item:last-child { border-bottom: none; }
        .cart-item-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .cart-item-thumb {
          width: 50px; height: 50px;
          border-radius: 8px;
          overflow: hidden;
          background: ${CREAM};
          flex-shrink: 0;
        }
        .cart-item-details {
          flex: 1;
          min-width: 0;
        }
        .cart-item-name {
          font-weight: 600;
          color: ${SAGE};
          font-size: 0.9rem;
          line-height: 1.3;
        }
        .cart-item-price {
          font-size: 0.8rem;
          color: ${MUTED_GRAY};
          margin-top: 2px;
        }
        .cart-item-controls {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 4px;
        }
        .cart-item-qty-btn {
          background: rgba(79,95,82,0.08);
          border: none;
          border-radius: 6px;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.2s;
        }
        .cart-item-qty-btn:hover {
          background: rgba(79,95,82,0.15);
        }
        .cart-item-qty {
          font-weight: 700;
          color: ${SAGE};
          font-size: 0.9rem;
          min-width: 24px;
          text-align: center;
        }
        .cart-item-total-price {
          font-weight: 700;
          color: ${SAGE};
          font-size: 1rem;
          margin-left: auto;
          white-space: nowrap;
        }
        .cart-item-remove {
          background: none;
          border: none;
          cursor: pointer;
          color: #EF4444;
          padding: 4px;
          transition: transform 0.2s;
        }
        .cart-item-remove:hover {
          transform: scale(1.1);
        }
        .summary-footer {
          border-top: 1.5px solid rgba(242,237,228,0.8);
          padding-top: 16px;
          margin-top: 8px;
        }
        .summary-total-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.95rem;
          color: ${SAGE};
          padding: 4px 0;
        }
        .summary-total-label {
          color: ${MUTED_GRAY};
          font-weight: 500;
        }
        .summary-total-value {
          font-weight: 600;
          letter-spacing: -0.01em;
        }
        .summary-total-final {
          font-size: 1.2rem;
          font-weight: 700;
          color: ${SAGE};
          border-top: 1.5px solid rgba(242,237,228,0.8);
          padding-top: 10px;
          margin-top: 4px;
        }
        .summary-total-final .summary-total-label {
          color: ${SAGE};
          font-weight: 700;
        }
        .summary-total-final .summary-total-value {
          font-weight: 800;
          font-size: 1.3rem;
        }
        .category-tabs {
          display: flex;
          flex-wrap: nowrap;
          overflow-x: auto;
          gap: 8px;
          padding-bottom: 12px;
          margin-bottom: 16px;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .category-tabs::-webkit-scrollbar { display: none; }
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Products (2/3) */}
          <div className="lg:col-span-2">
            {/* Category tabs */}
            <div className="category-tabs">
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

          {/* Right: Order Summary (1/3) */}
          <div className="lg:col-span-1">
            <div className="summary-sidebar">
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: SAGE, marginBottom: 16 }}>
                Order Summary
              </h2>

              {cart.length === 0 ? (
                <p style={{ color: MUTED_GRAY, fontSize: '0.85rem', textAlign: 'center', padding: 20 }}>
                  No items added yet.
                </p>
              ) : (
                <>
                  <div style={{ maxHeight: '40vh', overflowY: 'auto', marginBottom: 12 }}>
                    {cart.map(item => {
                      const itemTotal = item.base_price * item.quantity;
                      const isDiscounted = discountApplied && item.id === discountedItemId;
                      const displayTotal = isDiscounted ? itemTotal - discountAmount : itemTotal;
                      return (
                        <div key={item.id} className="cart-item">
                          <div className="cart-item-row">
                            <div className="cart-item-thumb">
                              <ProductImage imageUrl={item.image_url} name={item.name} />
                            </div>
                            <div className="cart-item-details">
                              <div className="cart-item-name">{item.name}</div>
                              <div className="cart-item-price">
                                ₱{parseFloat(item.base_price).toLocaleString()} each
                              </div>
                              {isDiscounted && (
                                <div style={{ fontSize: '0.75rem', color: '#D4A03D' }}>
                                  <span style={{ textDecoration: 'line-through', color: MUTED_GRAY }}>
                                    ₱{itemTotal.toLocaleString()}
                                  </span>
                                  {' → '}
                                  <span style={{ fontWeight: 700, color: SAGE }}>
                                    ₱{displayTotal.toLocaleString()}
                                  </span>
                                  <span style={{ color: '#16a34a', marginLeft: 4 }}>
                                    (-₱{discountAmount.toLocaleString()})
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="cart-item-total-price">
                              ₱{displayTotal.toLocaleString()}
                            </div>
                            <button
                              onClick={() => removeFromCart(item.id)}
                              className="cart-item-remove"
                              title="Remove item"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          <div className="cart-item-controls">
                            <button
                              onClick={() => updateQuantity(item.id, -1)}
                              className="cart-item-qty-btn"
                            >
                              <Minus size={12} color={SAGE} />
                            </button>
                            <span className="cart-item-qty">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.id, 1)}
                              className="cart-item-qty-btn"
                            >
                              <Plus size={12} color={SAGE} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* ─── Discount Section ─── */}
                  <div style={{ marginBottom: 12 }}>
                    {discountApplied ? (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'rgba(212,160,61,0.1)',
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: '1px solid rgba(212,160,61,0.3)'
                      }}>
                        <div>
                          <span style={{ fontWeight: 600, color: SAGE }}>30% Discount Applied</span>
                          <span style={{ marginLeft: 8, fontSize: '0.8rem', color: '#16a34a' }}>
                            -₱{discountAmount.toLocaleString()}
                          </span>
                        </div>
                        <button
                          onClick={removeDiscount}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#EF4444',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            padding: '4px 8px',
                            borderRadius: 4,
                            transition: 'background 0.15s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={applyDiscount}
                        disabled={!discountId || cart.length === 0}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          padding: '8px 0',
                          borderRadius: 8,
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          background: discountId && cart.length > 0 ? 'rgba(79,95,82,0.08)' : 'rgba(166,162,154,0.1)',
                          color: discountId && cart.length > 0 ? SAGE : MUTED_GRAY,
                          border: `1.5px solid ${discountId && cart.length > 0 ? 'rgba(79,95,82,0.2)' : 'rgba(166,162,154,0.2)'}`,
                          cursor: discountId && cart.length > 0 ? 'pointer' : 'not-allowed',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          if (discountId && cart.length > 0) {
                            e.currentTarget.style.background = 'rgba(79,95,82,0.15)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (discountId && cart.length > 0) {
                            e.currentTarget.style.background = 'rgba(79,95,82,0.08)';
                          }
                        }}
                      >
                        <Percent size={16} />
                        Apply Discount (30% PWD/Senior)
                      </button>
                    )}
                  </div>

                  <div className="summary-footer">
                    {/* ── Subtotal ── */}
                    <div className="summary-total-row">
                      <span className="summary-total-label">Subtotal</span>
                      <span className="summary-total-value">₱{subtotal.toLocaleString()}</span>
                    </div>

                    {/* ── Discount (if applied) ── */}
                    {discountApplied && (
                      <div className="summary-total-row" style={{ color: '#16a34a' }}>
                        <span className="summary-total-label">Discount (30%)</span>
                        <span className="summary-total-value">-₱{discountAmount.toLocaleString()}</span>
                      </div>
                    )}

                    {/* ── Total (final) ── */}
                    <div className="summary-total-row summary-total-final">
                      <span className="summary-total-label">Total</span>
                      <span className="summary-total-value">₱{cartTotal.toLocaleString()}</span>
                    </div>

                    <div style={{ marginTop: 12 }}>
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
                  </div>
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