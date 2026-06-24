import React, { useState, useEffect } from 'react';
import axios from '/api/axios';
import { motion } from 'framer-motion';
import {
  Package, Loader, AlertCircle, Search,
  Coffee, Sparkles, Sandwich, Cookie, Cake
} from 'lucide-react';

// Color palette (same as admin)
const SAGE = '#4F5F52';
const CREAM = '#F2EDE4';
const MUTED_GRAY = '#A6A29A';
const SOFT_WHITE = '#FFF3D9';

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }
  }
};

const cardHover = {
  rest: { y: 0, boxShadow: '0 2px 12px rgba(79, 95, 82, 0.06)' },
  hover: { y: -6, boxShadow: '0 20px 40px rgba(79, 95, 82, 0.18)' }
};

// Category icon mapping (same as admin)
const categoryIcons = {
  'Coffee': Coffee,
  'Non Coffee': Sparkles,
  'Food': Sandwich,
  'Snack': Cookie,
  'Dessert': Cake,
};

export default function StaffProducts() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);

  const fetchCategories = async () => {
    try {
      const res = await axios.get('/categories');
      setCategories(res.data.categories || []);
      if (res.data.categories?.length > 0 && !selectedCategory) {
        setSelectedCategory(res.data.categories[0]);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      // Public endpoint that returns only active products
      const res = await axios.get('/menu');
      setProducts(res.data.products || []);
      setError(null);
    } catch (err) {
      if (err.response?.status === 401) setError('Unauthorized. Please login again.');
      else if (err.response?.status === 403) setError('Access denied.');
      else setError(err.response?.data?.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, []);

  // Filter products by search & selected category
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory ? p.category_id === selectedCategory.id : true;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div style={{ background: CREAM, minHeight: '100vh' }} className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader className="animate-spin" style={{ color: SAGE }} size={36} />
          <p style={{ color: MUTED_GRAY, fontSize: '0.85rem', letterSpacing: '0.05em' }}>Loading products…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-2xl m-6" style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FEE2E2' }}>
        <AlertCircle size={20} />
        <span style={{ fontSize: '0.875rem' }}>Error loading products: {error}</span>
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
        .tab-btn {
          position: relative; overflow: hidden;
          transition: all 0.25s cubic-bezier(0.4,0,0.2,1);
        }
        .tab-btn::after {
          content: ''; position: absolute; inset: 0;
          background: rgba(79,95,82,0.06); opacity: 0; transition: opacity 0.2s;
        }
        .tab-btn:hover::after { opacity: 1; }
        .tab-btn.active::after { display: none; }
        .product-card-img {
          transition: transform 0.5s cubic-bezier(0.25,0.46,0.45,0.94);
        }
        .product-card:hover .product-card-img { transform: scale(1.04); }
        .search-input:focus {
          box-shadow: 0 0 0 3px rgba(79,95,82,0.12);
          border-color: #4F5F52 !important;
        }
        .divider-line {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(79,95,82,0.15), transparent);
        }
      `}</style>

      <div className="grain-overlay" />

      <div className="max-w-7xl mx-auto relative" style={{ zIndex: 1 }}>
        {/* ── Header ── */}
        <motion.div variants={fadeInUp} initial="hidden" animate="visible"
          className="flex flex-wrap justify-between items-start gap-4 mb-8"
        >
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div style={{
                width: 36, height: 36,
                background: `linear-gradient(135deg, ${SAGE}, #3e4c42)`,
                borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(79,95,82,0.25)'
              }}>
                <Package size={18} color="#fff" />
              </div>
              <h1 style={{ color: SAGE, fontSize: '1.55rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
                Available Products
              </h1>
            </div>
            <p style={{ color: MUTED_GRAY, fontSize: '0.82rem', letterSpacing: '0.03em', marginLeft: 48 }}>
              Browse menu items 
            </p>
          </div>
        </motion.div>

        <div className="divider-line mb-7" />

        {/* ── Search Bar ── */}
        <motion.div variants={fadeInUp} initial="hidden" animate="visible"
          className="relative w-full md:w-80 mb-7"
        >
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2"
            style={{ color: MUTED_GRAY }} size={15}
          />
          <input
            type="text"
            placeholder="Search products or SKU…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input w-full pl-10 pr-4 py-2.5 rounded-xl border bg-white text-sm transition-all"
            style={{
              borderColor: 'rgba(166,162,154,0.3)',
              color: SAGE,
              boxShadow: '0 1px 4px rgba(79,95,82,0.06)',
            }}
          />
        </motion.div>

        {/* ── Category Tabs ── */}
        <motion.div variants={fadeInUp} initial="hidden" animate="visible"
          className="flex flex-wrap gap-2 mb-8"
        >
          {categories.filter(c => c.is_active).map(category => {
            const Icon = categoryIcons[category.name] || Package;
            const isActive = selectedCategory?.id === category.id;
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category)}
                className={`tab-btn flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium ${isActive ? 'active' : ''}`}
                style={isActive ? {
                  background: `linear-gradient(135deg, ${SAGE} 0%, #3e4c42 100%)`,
                  color: '#fff',
                  boxShadow: '0 4px 14px rgba(79,95,82,0.28)',
                  border: '1.5px solid transparent',
                } : {
                  background: 'rgba(255,255,255,0.8)',
                  color: MUTED_GRAY,
                  border: '1.5px solid rgba(166,162,154,0.25)',
                  backdropFilter: 'blur(4px)',
                }}
              >
                <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8} />
                {category.name}
              </button>
            );
          })}
          {categories.filter(c => c.is_active).length === 0 && (
            <p style={{ color: MUTED_GRAY, fontSize: '0.83rem' }}>
              No categories available.
            </p>
          )}
        </motion.div>

        {/* ── Products Count ── */}
        {filteredProducts.length > 0 && (
          <motion.p variants={fadeInUp} initial="hidden" animate="visible"
            style={{ color: MUTED_GRAY, fontSize: '0.78rem', marginBottom: '1.25rem', letterSpacing: '0.04em' }}
          >
            {filteredProducts.length} item{filteredProducts.length !== 1 ? 's' : ''} found
          </motion.p>
        )}

        {/* ── Products Grid ── */}
        <motion.div variants={fadeInUp} initial="hidden" animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredProducts.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20 gap-4">
              <div style={{
                width: 72, height: 72,
                background: 'rgba(166,162,154,0.1)',
                borderRadius: 20,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1.5px dashed rgba(166,162,154,0.35)'
              }}>
                <Package size={30} style={{ color: MUTED_GRAY, opacity: 0.5 }} />
              </div>
              <p style={{ color: MUTED_GRAY, fontSize: '0.9rem' }}>No products found in this category.</p>
            </div>
          ) : (
            filteredProducts.map(product => (
              <motion.div
                key={product.id}
                variants={cardHover}
                initial="rest"
                whileHover="hover"
                animate="rest"
                className="product-card rounded-2xl overflow-hidden"
                style={{
                  background: '#fff',
                  border: '1.5px solid rgba(242,237,228,0.9)',
                  boxShadow: '0 2px 12px rgba(79,95,82,0.06)',
                  transition: 'box-shadow 0.3s ease, transform 0.3s ease',
                }}
              >
                {/* Image */}
                <div style={{ aspectRatio: '4/3', background: CREAM, position: 'relative', overflow: 'hidden' }}>
                  {product.image_url ? (
                    <img
                      src={product.image_url.startsWith('http') ? product.image_url : `http://10.213.162.170:8000${product.image_url}`}
                      alt={product.name}
                      className="product-card-img w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${CREAM}, ${SOFT_WHITE})` }}>
                      <Package style={{ color: MUTED_GRAY, opacity: 0.3 }} size={48} />
                    </div>
                  )}

                  {/* Gradient overlay */}
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    height: '50%',
                    background: 'linear-gradient(to top, rgba(0,0,0,0.18), transparent)',
                    pointerEvents: 'none',
                  }} />

                  {/* Stock badge */}
                  <div style={{ position: 'absolute', top: 12, right: 12 }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '3px 10px',
                      borderRadius: 999,
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      letterSpacing: '0.04em',
                      background: product.stock_quantity > 0 ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.35)',
                      color: product.stock_quantity > 0 ? '#2d7a45' : '#888',
                      backdropFilter: 'blur(6px)',
                      boxShadow: '0 1px 6px rgba(0,0,0,0.1)',
                    }}>
                      <span style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: product.stock_quantity > 0 ? '#34d468' : '#aaa',
                        display: 'inline-block',
                      }} />
                      {product.track_stock ? `${product.stock_quantity} in stock` : 'Available'}
                    </span>
                  </div>
                </div>

                {/* Card content */}
                <div style={{ padding: '18px 20px 16px' }}>
                  <div className="mb-2">
                    <h3 style={{ color: SAGE, fontWeight: 700, fontSize: '1.08rem', letterSpacing: '-0.01em', lineHeight: 1.3 }}>
                      {product.name}
                    </h3>
                    {product.sku && (
                      <p style={{ color: MUTED_GRAY, fontSize: '0.68rem', letterSpacing: '0.08em', marginTop: 2, textTransform: 'uppercase' }}>
                        SKU: {product.sku}
                      </p>
                    )}
                  </div>

                  <p style={{ color: SAGE, fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 6 }}>
                    ₱{parseFloat(product.base_price).toLocaleString()}
                  </p>

                  {product.description && (
                    <p style={{ color: MUTED_GRAY, fontSize: '0.78rem', lineHeight: 1.55, marginBottom: 10 }}
                       className="line-clamp-2">
                      {product.description}
                    </p>
                  )}

                  {/* Size Pills (if has sizes) */}
                  {product.has_size_options && (
                    <div className="mt-3 mb-3">
                      <p style={{ color: MUTED_GRAY, fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>
                        Sizes
                      </p>
                      <div className="flex gap-2">
                        <span style={{
                          fontSize: '0.72rem', padding: '3px 12px',
                          borderRadius: 999, border: `1.5px solid ${SAGE}`,
                          color: SAGE, fontWeight: 600
                        }}>S</span>
                        <span style={{
                          fontSize: '0.72rem', padding: '3px 12px',
                          borderRadius: 999, border: `1.5px solid ${CREAM}`,
                          color: MUTED_GRAY
                        }}>L</span>
                      </div>
                    </div>
                  )}

                  <div className="divider-line my-3" />

                  {/* Footer: stock info only (no action buttons) */}
                  <div className="flex items-center justify-between">
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: product.stock_quantity <= (product.min_stock_level || 0)
                        ? 'rgba(239,68,68,0.08)' : 'rgba(79,95,82,0.07)',
                      borderRadius: 8, padding: '4px 10px',
                    }}>
                      <Package size={13} style={{
                        color: product.stock_quantity <= (product.min_stock_level || 0) ? '#ef4444' : SAGE
                      }} />
                      <span style={{
                        fontSize: '0.72rem', fontWeight: 600,
                        color: product.stock_quantity <= (product.min_stock_level || 0) ? '#ef4444' : SAGE,
                        letterSpacing: '0.02em',
                      }}>
                        {product.stock_quantity} in stock
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </motion.div>
      </div>
    </div>
  );
}