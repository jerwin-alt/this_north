// web/src/pages/StaffMenu.jsx

import React, { useState, useEffect, useMemo } from 'react';
import axios from '/api/axios';
import {
  Loader, AlertCircle, ShoppingBag, Plus, Minus, Trash2,
  X, Check, Coffee, Sparkles, Sandwich, Cookie, Cake, Percent
} from 'lucide-react';
import { useAuth } from '../contexts/auth-context';

import { API_ORIGIN } from '../utils/apiBase';

import { useToast, ToastContainer } from '../hooks/useToast';

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
  const { toast, showToast } = useToast();

  // Cart state
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  // Product modal state
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [modalQuantity, setModalQuantity] = useState(1);
  const [modalSizeId, setModalSizeId] = useState(null);

  // Discount state
  const [discountId, setDiscountId] = useState(null);
  const [discountApplied, setDiscountApplied] = useState(false);
  const [discountedItemKey, setDiscountedItemKey] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountValue, setDiscountValue] = useState(0);

  const getCartKey = (item) => `${item.id}::${item.sizeId ?? 'none'}`;

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
  const addToCart = (product, quantity, sizeId = null) => {
    const hasSizes = product.has_size_options && (product.drinkSizes?.length || 0) > 0;
    const size = hasSizes && sizeId
      ? product.drinkSizes.find((s) => s.id === sizeId)
      : null;

    const unitPrice = size
      ? Number(size.price_modifier) || 0
      : Number(product.base_price) || 0;

    const sizeName = size?.size_name || null;

    setCart((prev) => {
      const existing = prev.find(
        (item) => item.id === product.id && (item.sizeId ?? null) === (sizeId ?? null)
      );

      if (existing) {
        return prev.map((item) =>
          item.id === product.id && (item.sizeId ?? null) === (sizeId ?? null)
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }

      return [
        ...prev,
        { ...product, quantity, sizeId: sizeId ?? null, sizeName, unitPrice },
      ];
    });

    // Auto-clear discount if applied (unchanged behaviour)
    if (discountApplied) removeDiscount();
  };


  const removeFromCart = (key) => {
    setCart((prev) => prev.filter((item) => getCartKey(item) !== key));
    if (discountApplied && discountedItemKey === key) removeDiscount();
  };

  const updateQuantity = (key, delta) => {
    setCart((prev) => {
      const item = prev.find((i) => getCartKey(i) === key);
      if (!item) return prev;
      const newQty = item.quantity + delta;
      if (newQty <= 0) {
        if (discountApplied && discountedItemKey === key) removeDiscount();
        return prev.filter((i) => getCartKey(i) !== key);
      }
      const updated = prev.map((i) =>
        getCartKey(i) === key ? { ...i, quantity: newQty } : i
      );
      if (discountApplied) removeDiscount();
      return updated;
    });
  };

  // ── Discount functions ──
  const applyDiscount = () => {
    if (cart.length === 0) {
      showToast('Add at least one product to apply discount.', 'error');
      return;
    }
    if (discountApplied) {
      showToast('Discount already applied.', 'error');
      return;
    }
    if (!discountId) {
      showToast('No active PWD/Senior Citizen discount found.', 'error');
      return;
    }

    let lowestItem = null;
    let lowestTotal = Infinity;
    cart.forEach((item) => {
      const itemTotal = (item.unitPrice || item.base_price) * item.quantity;
      if (itemTotal < lowestTotal) {
        lowestTotal = itemTotal;
        lowestItem = item;
      }
    });

    if (!lowestItem) {
      showToast('No items to discount.', 'error');
      return;
    }

    const discountAmt = Math.round(lowestTotal * (discountValue / 100) * 100) / 100;
    setDiscountedItemKey(getCartKey(lowestItem));
    setDiscountAmount(discountAmt);
    setDiscountApplied(true);
  };

  const removeDiscount = () => {
    setDiscountedItemKey(null);
    setDiscountAmount(0);
    setDiscountApplied(false);
  };

  // ── Computed totals (including discount) ──
const subtotal = useMemo(() => {
  return cart.reduce(
    (sum, item) => sum + (item.unitPrice || item.base_price) * item.quantity,
    0
  );
}, [cart]);

const cartTotal = useMemo(() => {
  return subtotal - (discountApplied ? discountAmount : 0);
}, [subtotal, discountApplied, discountAmount]);

const cartCount = useMemo(
  () => cart.reduce((sum, item) => sum + item.quantity, 0),
  [cart]
);

  // ── Product modal handlers ──
  const openProductModal = (product) => {
    console.log('[size-check]', {
      name: product.name,
      has_size_options: product.has_size_options,
      drinkSizes_count: product.drinkSizes?.length,
      drinkSizes: product.drinkSizes,
    });
    setSelectedProduct(product);
    setModalQuantity(1);
    setModalSizeId(null);
    setShowProductModal(true);
  };


  

  const closeProductModal = () => {
    setShowProductModal(false);
    setSelectedProduct(null);
    setModalQuantity(1);
    setModalSizeId(null);
  };

  const handleConfirmProduct = () => {
    if (!selectedProduct) return;
    if (modalQuantity < 1) {
      showToast('Quantity must be at least 1.', 'error');
      return;
    }

    const hasSizes =
      selectedProduct.has_size_options &&
      (selectedProduct.drinkSizes?.length || 0) > 0;

    if (hasSizes && !modalSizeId) {
      showToast('Please select a size before adding this product.', 'error');
      return;
    }

    addToCart(selectedProduct, modalQuantity, modalSizeId);
    closeProductModal();
  };

  // ── Submit walk‑in order ──
  const handlePlaceOrder = async () => {
    if (!customerName.trim()) {
      showToast('Please enter customer name.', 'error');
      return;
    }
    if (cart.length === 0) {
      showToast('Cart is empty.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        source: 'staff_menu',   // ← NEW: distinguishes this flow from Staff Orders
        customer_name: customerName.trim(),
        customer_phone: '',
        pickup_date: null,
        pickup_time: null,
        notes: '',
        items: cart.map(item => ({
          menu_id: item.id,
          quantity: item.quantity,
          size_id: item.sizeId || null, 
        })),
      };

      // Include discount data if applied
      if (discountApplied && discountId && discountedItemKey) {
        const match = cart.find((c) => getCartKey(c) === discountedItemKey);
        if (match) {
          payload.discount_id = discountId;
          payload.discounted_menu_id = match.id;
          // pass the size too so the backend targets the right line item
          payload.discounted_size_id = match.sizeId || null;
        }
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
      showToast(err.response?.data?.message || 'Failed to create order', 'error');
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
                  {cart.map((item) => {
                    const cartKey = getCartKey(item);
                    const unitPrice = item.unitPrice || item.base_price;
                    const itemTotal = unitPrice * item.quantity;
                    const isDiscounted =
                      discountApplied && item === cart.find((c) => getCartKey(c) === discountedItemKey);
                    const displayTotal = isDiscounted ? itemTotal - discountAmount : itemTotal;

                    return (
                      <div key={cartKey} className="cart-item">
                        <div className="cart-item-row">
                          <div className="cart-item-thumb">
                            <ProductImage imageUrl={item.image_url} name={item.name} />
                          </div>
                          <div className="cart-item-details">
                            <div className="cart-item-name">{item.name}</div>
                            {item.sizeName && (
                              <div
                                style={{
                                  fontSize: '0.72rem',
                                  color: MUTED_GRAY,
                                  fontWeight: 500,
                                  marginTop: 2,
                                }}
                              >
                                Size: {item.sizeName}
                              </div>
                            )}
                            <div className="cart-item-price">
                              ₱{parseFloat(unitPrice).toLocaleString()} each
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
                            onClick={() => removeFromCart(cartKey)}
                            className="cart-item-remove"
                            title="Remove item"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="cart-item-controls">
                          <button
                            onClick={() => updateQuantity(cartKey, -1)}
                            className="cart-item-qty-btn"
                          >
                            <Minus size={12} color={SAGE} />
                          </button>
                          <span className="cart-item-qty">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(cartKey, 1)}
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

            {/* ── Size selector (only for products with sizes) ── */}
            {selectedProduct.has_size_options &&
            selectedProduct.drinkSizes &&
            selectedProduct.drinkSizes.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: SAGE,
                    marginBottom: 8,
                  }}
                >
                  Choose Size <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {selectedProduct.drinkSizes.map((size) => {
                    const active = modalSizeId === size.id;
                    return (
                      <button
                        key={size.id}
                        type="button"
                        onClick={() => setModalSizeId(size.id)}
                        style={{
                          padding: '8px 14px',
                          borderRadius: 10,
                          cursor: 'pointer',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          transition: 'all 0.15s',
                          background: active ? SAGE : '#fafafa',
                          color: active ? '#fff' : MUTED_GRAY,
                          border: `1.5px solid ${active ? SAGE : 'rgba(166,162,154,0.3)'}`,
                          boxShadow: active ? '0 3px 10px rgba(79,95,82,0.2)' : 'none',
                        }}
                      >
                        <span style={{ display: 'block' }}>{size.size_name}</span>
                        <span
                          style={{
                            display: 'block',
                            fontSize: '0.7rem',
                            marginTop: 2,
                            color: active ? 'rgba(255,255,255,0.85)' : SAGE,
                            fontWeight: 500,
                          }}
                        >
                          ₱{parseFloat(size.price_modifier).toLocaleString()}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

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
      
      <ToastContainer toast={toast} />

    </div>
  );
}