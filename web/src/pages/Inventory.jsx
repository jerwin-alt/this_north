// web/src/pages/Inventory.jsx

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from '/api/axios';
import {
  Loader, AlertCircle, Package, Box, Layers,
  TrendingDown, RefreshCw, ChevronDown, Filter
} from 'lucide-react';

const SAGE = '#4F5F52';
const CREAM = '#F2EDE4';
const MUTED_GRAY = '#A6A29A';

// Fallback used when a product has no explicit min_stock_level configured.
// Adjust this single number to change the "Low Stock" warning for all
// products that never had a min level set by the admin.
const DEFAULT_MIN_STOCK = 2;

/* ─────────────────────────────────────────────────────────
 * Helpers — classify a stock row into one of three buckets.
 *   'out'       → current stock = 0
 *   'low'       → current stock > 0 AND stock <= effective min
 *   'in'        → current stock > effective min
 * The three buckets never overlap, so "In Stock" excludes "Low Stock".
 * ───────────────────────────────────────────────────────── */
const getProductBucket = (product) => {
  if (!product.track_stock) return 'not-tracked';
  const stock = product.stock_quantity ?? 0;
  const rawMin = product.min_stock_level ?? 0;
  const min = rawMin > 0 ? rawMin : DEFAULT_MIN_STOCK;
  if (stock <= 0)   return 'out';
  if (stock <= min) return 'low';
  return 'in';
};

const getIngredientBucket = (ingredient) => {
  const stock = parseFloat(ingredient.current_stock) || 0;
  if (stock <= 0) return 'out';
  if (stock <= DEFAULT_MIN_STOCK) return 'low';
  return 'in';
};

/* ─────────────────────────────────────────────────────────
 * Menu Stocks section — category tabs + status filter + table
 * ───────────────────────────────────────────────────────── */
function MenuStocksSection({
  categories, products, loading, error,
  selectedCategory, onCategoryChange,
  stockFilter, onStockFilterChange,
}) {
  const filteredProducts = useMemo(() => {
    let list = products;
    if (selectedCategory !== 'all') {
      list = list.filter(p => p.category_id === selectedCategory);
    }
    if (stockFilter !== 'all') {
      list = list.filter(p => {
        const bucket = getProductBucket(p);
        return bucket === stockFilter;
      });
    }
    return list;
  }, [products, selectedCategory, stockFilter]);

  const getStockState = (product) => {
    if (!product.track_stock) return { label: 'Not Tracked', color: MUTED_GRAY, bg: 'rgba(166,162,154,0.1)', border: 'rgba(166,162,154,0.2)' };

    const stock = product.stock_quantity ?? 0;
    const rawMin = product.min_stock_level ?? 0;
    const min = rawMin > 0 ? rawMin : DEFAULT_MIN_STOCK;

    if (stock <= 0)   return { label: 'Out of Stock', color: '#c0392b', bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.15)' };
    if (stock <= min) return { label: 'Low Stock',    color: '#92670a', bg: 'rgba(212,160,61,0.1)',  border: 'rgba(212,160,61,0.2)'  };
    return { label: 'In Stock', color: '#1a7a3c', bg: 'rgba(52,196,104,0.1)', border: 'rgba(52,196,104,0.2)' };
  };

  return (
    <div style={{ marginBottom: 36 }}>
      {/* Section header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: `linear-gradient(135deg, ${SAGE}, #3e4c42)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(79,95,82,0.2)',
        }}>
          <Layers size={13} color="#fff" />
        </div>
        <h2 style={{ color: SAGE, fontSize: '1.05rem', fontWeight: 700, letterSpacing: '-0.01em' }}>
          Menu Stocks
        </h2>
        {!loading && products.length > 0 && (
          <span style={{
            fontSize: '0.65rem', fontWeight: 600, color: MUTED_GRAY,
            background: 'rgba(166,162,154,0.12)', border: '1px solid rgba(166,162,154,0.2)',
            borderRadius: 999, padding: '2px 8px',
          }}>
            {products.length} product{products.length !== 1 ? 's' : ''}
          </span>
        )}

        {/* Stock status filter — right aligned */}
        <div style={{ marginLeft: 'auto', position: 'relative' }}>
          <Filter size={13} style={{
            position: 'absolute', left: 11, top: '50%',
            transform: 'translateY(-50%)', color: MUTED_GRAY, pointerEvents: 'none',
          }} />
          <select
            value={stockFilter}
            onChange={(e) => onStockFilterChange(e.target.value)}
            aria-label="Menu Stock Status"
            style={{
              borderRadius: 10, padding: '7px 32px 7px 30px',
              fontSize: '0.78rem', fontWeight: 600, appearance: 'none',
              border: '1px solid rgba(166,162,154,0.3)', color: SAGE,
              background: '#fff', outline: 'none', cursor: 'pointer',
            }}
          >
            <option value="all">All Menu Stocks</option>
            <option value="in">In Stock</option>
            <option value="low">Low Stock</option>
            <option value="out">Out of Stock</option>
          </select>
          <ChevronDown size={13} style={{
            position: 'absolute', right: 10, top: '50%',
            transform: 'translateY(-50%)', color: MUTED_GRAY, pointerEvents: 'none',
          }} />
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap items-center" style={{ gap: 8, marginBottom: 16 }}>
        <button
          className={`stock-tab ${selectedCategory === 'all' ? 'active' : ''}`}
          onClick={() => onCategoryChange('all')}
        >
          All Categories
        </button>
        {categories.filter(c => c.is_active).map(cat => (
          <button
            key={cat.id}
            className={`stock-tab ${selectedCategory === cat.id ? 'active' : ''}`}
            onClick={() => onCategoryChange(cat.id)}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{
        background: '#fff', borderRadius: 20,
        border: '1.5px solid rgba(242,237,228,0.9)',
        boxShadow: '0 2px 12px rgba(79,95,82,0.06)',
        overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <Loader className="animate-spin" size={28} style={{ color: SAGE }} />
            <p style={{ color: MUTED_GRAY, fontSize: '0.85rem' }}>Loading menu stocks…</p>
          </div>
        ) : error ? (
          <div className="flex items-center gap-3 p-4 m-6 rounded-xl"
            style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FEE2E2' }}>
            <AlertCircle size={18} />
            <span style={{ fontSize: '0.85rem' }}>{error}</span>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: MUTED_GRAY }}>
            <div style={{
              width: 56, height: 56, background: 'rgba(166,162,154,0.1)', borderRadius: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 12px', border: '1.5px dashed rgba(166,162,154,0.3)',
            }}>
              <Package size={24} style={{ color: MUTED_GRAY, opacity: 0.4 }} />
            </div>
            <p style={{ fontSize: '0.85rem' }}>No products match the current filters.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="inv-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: `linear-gradient(135deg, ${CREAM}, rgba(255,243,217,0.5))` }}>
                  {['SKU', 'Product', 'Category', 'Min Stock', 'Current Stock', 'Status'].map(col => (
                    <th key={col} style={{
                      padding: '13px 20px', textAlign: 'left',
                      fontSize: '0.68rem', fontWeight: 700, color: SAGE,
                      letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap',
                    }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody style={{ borderTop: `1px solid ${CREAM}` }}>
                {filteredProducts.map((p, idx) => {
                  const state = getStockState(p);
                  const rawMin = p.min_stock_level ?? 0;
                  const isDefault = !(rawMin > 0);
                  return (
                    <tr key={p.id} style={{ borderTop: idx === 0 ? 'none' : `1px solid rgba(242,237,228,0.8)` }}>
                      <td style={{
                        padding: '13px 20px', fontWeight: 600, color: SAGE,
                        fontSize: '0.82rem', fontFamily: 'monospace', whiteSpace: 'nowrap',
                      }}>
                        {p.sku || '—'}
                      </td>
                      <td style={{ padding: '13px 20px', fontWeight: 600, color: SAGE }}>
                        {p.name}
                      </td>
                      <td style={{ padding: '13px 20px' }}>
                        <span style={{
                          display: 'inline-block',
                          background: 'rgba(79,95,82,0.07)', color: SAGE,
                          borderRadius: 6, padding: '2px 9px',
                          fontSize: '0.75rem', fontWeight: 500,
                        }}>
                          {p.category?.name || '—'}
                        </span>
                      </td>
                      <td style={{ padding: '13px 20px' }}>
                        <span
                          title={isDefault ? `No explicit minimum set — using default of ${DEFAULT_MIN_STOCK}` : undefined}
                          style={{
                            fontSize: '0.95rem',
                            fontWeight: 600,
                            color: SAGE,
                            cursor: isDefault ? 'help' : 'default',
                          }}
                        >
                          {isDefault ? DEFAULT_MIN_STOCK : rawMin}
                        </span>
                      </td>
                      <td style={{ padding: '13px 20px' }}>
                        <span style={{
                          fontSize: '1rem', fontWeight: 800, color: SAGE,
                          letterSpacing: '-0.02em',
                        }}>
                          {p.stock_quantity ?? 0}
                        </span>
                      </td>
                      <td style={{ padding: '13px 20px' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '3px 10px', borderRadius: 999,
                          fontSize: '0.7rem', fontWeight: 600,
                          background: state.bg, color: state.color,
                          border: `1px solid ${state.border}`,
                        }}>
                          <span style={{
                            width: 5, height: 5, borderRadius: '50%',
                            background: state.color, display: 'inline-block',
                          }} />
                          {state.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
 * Ingredient Stocks section — status filter + table
 * ───────────────────────────────────────────────────────── */
function IngredientStocksSection({
  ingredients, loading, error,
  stockFilter, onStockFilterChange,
}) {
  const filteredIngredients = useMemo(() => {
    if (stockFilter === 'all') return ingredients;
    return ingredients.filter(i => getIngredientBucket(i) === stockFilter);
  }, [ingredients, stockFilter]);

  const getStockState = (ing) => {
    const stock = parseFloat(ing.current_stock) || 0;
    if (stock <= 0) return { label: 'Out of Stock', color: '#c0392b', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.15)' };
    if (stock <= DEFAULT_MIN_STOCK) return { label: 'Low Stock', color: '#92670a', bg: 'rgba(212,160,61,0.1)', border: 'rgba(212,160,61,0.2)' };
    return { label: 'In Stock', color: '#1a7a3c', bg: 'rgba(52,196,104,0.1)', border: 'rgba(52,196,104,0.2)' };
  };

  return (
    <div>
      {/* Section header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: `linear-gradient(135deg, ${SAGE}, #3e4c42)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(79,95,82,0.2)',
        }}>
          <Box size={13} color="#fff" />
        </div>
        <h2 style={{ color: SAGE, fontSize: '1.05rem', fontWeight: 700, letterSpacing: '-0.01em' }}>
          Ingredient Stocks
        </h2>
        {!loading && ingredients.length > 0 && (
          <span style={{
            fontSize: '0.65rem', fontWeight: 600, color: MUTED_GRAY,
            background: 'rgba(166,162,154,0.12)', border: '1px solid rgba(166,162,154,0.2)',
            borderRadius: 999, padding: '2px 8px',
          }}>
            {ingredients.length} ingredient{ingredients.length !== 1 ? 's' : ''}
          </span>
        )}

        {/* Stock status filter — right aligned */}
        <div style={{ marginLeft: 'auto', position: 'relative' }}>
          <Filter size={13} style={{
            position: 'absolute', left: 11, top: '50%',
            transform: 'translateY(-50%)', color: MUTED_GRAY, pointerEvents: 'none',
          }} />
          <select
            value={stockFilter}
            onChange={(e) => onStockFilterChange(e.target.value)}
            aria-label="Ingredient Stock Status"
            style={{
              borderRadius: 10, padding: '7px 32px 7px 30px',
              fontSize: '0.78rem', fontWeight: 600, appearance: 'none',
              border: '1px solid rgba(166,162,154,0.3)', color: SAGE,
              background: '#fff', outline: 'none', cursor: 'pointer',
            }}
          >
            <option value="all">All Ingredient Stocks</option>
            <option value="in">In Stock</option>
            <option value="low">Low Stock</option>
            <option value="out">Out of Stock</option>
          </select>
          <ChevronDown size={13} style={{
            position: 'absolute', right: 10, top: '50%',
            transform: 'translateY(-50%)', color: MUTED_GRAY, pointerEvents: 'none',
          }} />
        </div>
      </div>

      {/* Table */}
      <div style={{
        background: '#fff', borderRadius: 20,
        border: '1.5px solid rgba(242,237,228,0.9)',
        boxShadow: '0 2px 12px rgba(79,95,82,0.06)',
        overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <Loader className="animate-spin" size={28} style={{ color: SAGE }} />
            <p style={{ color: MUTED_GRAY, fontSize: '0.85rem' }}>Loading ingredient stocks…</p>
          </div>
        ) : error ? (
          <div className="flex items-center gap-3 p-4 m-6 rounded-xl"
            style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FEE2E2' }}>
            <AlertCircle size={18} />
            <span style={{ fontSize: '0.85rem' }}>{error}</span>
          </div>
        ) : filteredIngredients.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: MUTED_GRAY }}>
            <div style={{
              width: 56, height: 56, background: 'rgba(166,162,154,0.1)', borderRadius: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 12px', border: '1.5px dashed rgba(166,162,154,0.3)',
            }}>
              <Box size={24} style={{ color: MUTED_GRAY, opacity: 0.4 }} />
            </div>
            <p style={{ fontSize: '0.85rem' }}>No ingredients match the current filter.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="inv-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: `linear-gradient(135deg, ${CREAM}, rgba(255,243,217,0.5))` }}>
                  {['Ingredient', 'Unit', 'Scale per Unit', 'Current Stock', 'Last Updated', 'Status'].map(col => (
                    <th key={col} style={{
                      padding: '13px 20px', textAlign: 'left',
                      fontSize: '0.68rem', fontWeight: 700, color: SAGE,
                      letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap',
                    }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody style={{ borderTop: `1px solid ${CREAM}` }}>
                {filteredIngredients.map((ing, idx) => {
                  const state = getStockState(ing);
                  return (
                    <tr key={ing.id} style={{ borderTop: idx === 0 ? 'none' : `1px solid rgba(242,237,228,0.8)` }}>
                      <td style={{ padding: '13px 20px', fontWeight: 600, color: SAGE, whiteSpace: 'nowrap' }}>
                        {ing.name}
                      </td>
                      <td style={{ padding: '13px 20px' }}>
                        <span style={{
                          display: 'inline-block',
                          background: 'rgba(79,95,82,0.07)', color: SAGE,
                          borderRadius: 6, padding: '2px 9px',
                          fontSize: '0.75rem', fontWeight: 500,
                        }}>
                          {ing.unit || '—'}
                        </span>
                      </td>
                      <td style={{ padding: '13px 20px', color: MUTED_GRAY, fontSize: '0.82rem' }}>
                        {ing.scale_per_uni || '—'}
                      </td>
                      <td style={{ padding: '13px 20px' }}>
                        <span style={{
                          fontSize: '1rem', fontWeight: 800, color: SAGE,
                          letterSpacing: '-0.02em',
                        }}>
                          {ing.current_stock ?? 0}
                        </span>
                      </td>
                      <td style={{ padding: '13px 20px', color: MUTED_GRAY, fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                        {ing.updated_at ? new Date(ing.updated_at).toLocaleString() : '—'}
                      </td>
                      <td style={{ padding: '13px 20px' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '3px 10px', borderRadius: 999,
                          fontSize: '0.7rem', fontWeight: 600,
                          background: state.bg, color: state.color,
                          border: `1px solid ${state.border}`,
                        }}>
                          <span style={{
                            width: 5, height: 5, borderRadius: '50%',
                            background: state.color, display: 'inline-block',
                          }} />
                          {state.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
 * Main Inventory component
 * ───────────────────────────────────────────────────────── */
export default function Inventory() {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [products, setProducts] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── New: independent stock-status filters per section ──
  const [menuStockFilter, setMenuStockFilter] = useState('all');
  const [ingredientStockFilter, setIngredientStockFilter] = useState('all');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [catRes, menuRes, ingRes] = await Promise.all([
        axios.get('/categories'),
        axios.get('/admin/menu'),
        axios.get('/ingredients'),
      ]);
      setCategories(catRes.data.categories || []);
      setProducts(menuRes.data.products || menuRes.data.menu || []);
      setIngredients(ingRes.data.ingredients || []);
      setError(null);
    } catch (err) {
      console.error('Inventory fetch failed:', err);
      if (err.response?.status === 401) setError('Unauthorized. Please login again.');
      else if (err.response?.status === 403) setError('Access denied.');
      else setError(err.response?.data?.message || 'Failed to load inventory stocks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ── Summary stat cards ──
   * Low-stock counts INCLUDE out-of-stock items: any product/ingredient at
   * or below its effective minimum counts as needing attention.
   */
  const totalProducts     = products.length;
  const totalIngredients  = ingredients.length;

  const lowStockProducts = products.filter(p => {
    if (!p.track_stock) return false;
    const bucket = getProductBucket(p);
    return bucket === 'low' || bucket === 'out';
  }).length;

  const lowStockIngredients = ingredients.filter(i => {
    const bucket = getIngredientBucket(i);
    return bucket === 'low' || bucket === 'out';
  }).length;

  return (
    <div style={{ background: CREAM, minHeight: '100vh', padding: '36px 28px' }}>
      <style>{`
        .grain-overlay { position: fixed; inset: 0; pointer-events: none; z-index: 0; opacity: 0.028;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
          background-repeat: repeat; background-size: 128px; }
        .divider-line { height: 1px; background: linear-gradient(90deg, transparent, rgba(79,95,82,0.15), transparent); }
        .inv-table tbody tr { transition: background 0.15s ease; }
        .inv-table tbody tr:hover { background: rgba(242,237,228,0.7); }
        .stock-tab {
          border: none; cursor: pointer; padding: 8px 16px; border-radius: 999px;
          font-size: 0.78rem; font-weight: 600; transition: all 0.2s ease; margin-right: 0;
        }
        .stock-tab.active { background: ${SAGE}; color: #fff; box-shadow: 0 4px 14px rgba(79,95,82,0.25); }
        .stock-tab:not(.active) { background: rgba(166,162,154,0.1); color: ${MUTED_GRAY}; }
        .stock-tab:not(.active):hover { background: rgba(79,95,82,0.1); color: ${SAGE}; }
        .stat-card { transition: box-shadow 0.3s ease, transform 0.3s ease; }
        .stat-card:hover { transform: translateY(-4px); box-shadow: 0 14px 30px rgba(79,95,82,0.12) !important; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
        .fade-in   { animation: fadeInUp 0.4s ease both; }
        .fade-in-1 { animation: fadeInUp 0.4s 0.05s ease both; }
        .fade-in-2 { animation: fadeInUp 0.4s 0.10s ease both; }
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
                <Package size={18} color="#fff" />
              </div>
              <h1 style={{ color: SAGE, fontSize: '1.55rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
                Inventory Stock
              </h1>
            </div>
            <p style={{ color: MUTED_GRAY, fontSize: '0.82rem', letterSpacing: '0.03em', marginLeft: 48 }}>
              Current stock levels of your products and ingredients
            </p>
          </div>

          <button
            onClick={fetchAll}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
            style={{
              background: '#fff', color: SAGE,
              border: '1.5px solid rgba(79,95,82,0.2)',
              boxShadow: '0 2px 8px rgba(79,95,82,0.06)',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        <div className="divider-line mb-7" />

        {/* ── Overview stat cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8 fade-in-1">
          {[
            { label: 'Total Products',        value: totalProducts,       icon: Package,      positive: true  },
            { label: 'Total Ingredients',     value: totalIngredients,    icon: Box,          positive: true  },
            { label: 'Low Stock Products',    value: lowStockProducts,    icon: TrendingDown, positive: false },
            { label: 'Low Stock Ingredients', value: lowStockIngredients, icon: TrendingDown, positive: false },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="stat-card"
                style={{
                  background: '#fff', borderRadius: 20,
                  border: '1.5px solid rgba(242,237,228,0.9)',
                  boxShadow: '0 2px 12px rgba(79,95,82,0.06)',
                  padding: '20px 22px 16px', position: 'relative', overflow: 'hidden',
                }}
              >
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                  background: card.positive
                    ? `linear-gradient(90deg, ${SAGE}, #3e4c42)`
                    : `linear-gradient(90deg, #D4A03D, #b8872e)`,
                }} />
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{
                      color: MUTED_GRAY, fontSize: '0.7rem', fontWeight: 500,
                      letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8,
                    }}>
                      {card.label}
                    </p>
                    <p style={{
                      color: SAGE, fontSize: '1.75rem', fontWeight: 800,
                      letterSpacing: '-0.03em', lineHeight: 1,
                    }}>
                      {card.value}
                    </p>
                  </div>
                  <div style={{
                    width: 40, height: 40, borderRadius: 12,
                    background: card.positive
                      ? 'linear-gradient(135deg, rgba(79,95,82,0.12), rgba(79,95,82,0.06))'
                      : 'linear-gradient(135deg, rgba(212,160,61,0.14), rgba(212,160,61,0.06))',
                    border: `1.5px solid ${card.positive ? 'rgba(79,95,82,0.12)' : 'rgba(212,160,61,0.15)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Icon size={18} style={{ color: card.positive ? SAGE : '#D4A03D' }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Menu Stocks ── */}
        <div className="fade-in-2">
          <MenuStocksSection
            categories={categories}
            products={products}
            loading={loading}
            error={error}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            stockFilter={menuStockFilter}
            onStockFilterChange={setMenuStockFilter}
          />
        </div>

        {/* ── Ingredient Stocks ── */}
        <div className="fade-in-2">
          <IngredientStocksSection
            ingredients={ingredients}
            loading={loading}
            error={error}
            stockFilter={ingredientStockFilter}
            onStockFilterChange={setIngredientStockFilter}
          />
        </div>
      </div>
    </div>
  );
}