// web/src/pages/Inventory.jsx

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from '/api/axios';
import {
  Loader, AlertCircle, Package, SlidersHorizontal, TrendingUp,
  ClipboardList, X, History
} from 'lucide-react';

const SAGE = '#4F5F52';
const CREAM = '#F2EDE4';
const MUTED_GRAY = '#A6A29A';

/* ── Debounce helper ── */
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

/* ── SingleValueSlider – picks the END date, START is always Jan 1 ── */
function SingleValueSlider({ endDay, onChange, min = 0, max }) {
  const fillPercent = max > min ? ((endDay - min) / (max - min)) * 100 : 0;

  const year = new Date().getFullYear();
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 0, 1 + endDay);

  const fmt = (d) => d.toISOString().slice(0, 10);

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: SAGE }}>{fmt(startDate)}</span>
        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: SAGE }}>{fmt(endDate)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={endDay}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          width: '100%', height: 4, appearance: 'none',
          background: `linear-gradient(to right, ${SAGE} 0%, ${SAGE} ${fillPercent}%, rgba(166,162,154,0.2) ${fillPercent}%, rgba(166,162,154,0.2) 100%)`,
          borderRadius: 2, outline: 'none',
        }}
        className="single-slider"
      />
      <style>{`
        .single-slider::-webkit-slider-thumb { appearance: none; width: 18px; height: 18px; border-radius: 50%; background: #fff; border: 2px solid ${SAGE}; cursor: pointer; box-shadow: 0 1px 4px rgba(0,0,0,0.2); }
        .single-slider::-moz-range-thumb { width: 18px; height: 18px; border-radius: 50%; background: #fff; border: 2px solid ${SAGE}; cursor: pointer; box-shadow: 0 1px 4px rgba(0,0,0,0.2); }
      `}</style>
    </div>
  );
}

export default function Inventory() {
  // ── State ──
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [menuTransactions, setMenuTransactions] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // History modal state – menu
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Ingredient history modal state
  const [showIngredientHistoryModal, setShowIngredientHistoryModal] = useState(false);

  // Date range – single slider end day
  const year = new Date().getFullYear();
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const maxDay = isLeap ? 365 : 364;

  const todayDayOfYear = useMemo(() => {
    const now = new Date();
    const start = new Date(year, 0, 1);
    return Math.floor((now - start) / (1000 * 60 * 60 * 24));
  }, [year]);

  const [endDay, setEndDay] = useState(todayDayOfYear);
  const [typeFilter, setTypeFilter] = useState('all');

  const startDateString = useMemo(() => `${year}-01-01`, [year]);
  const endDateString = useMemo(() => {
    const d = new Date(year, 0, 1 + endDay);
    return d.toISOString().slice(0, 10);
  }, [year, endDay]);

  const debouncedEndDay = useDebounce(endDay, 500);
  const debouncedType = useDebounce(typeFilter, 500);

  // ── Fetch categories ──
  useEffect(() => {
    axios.get('/categories')
      .then(res => setCategories(res.data.categories || []))
      .catch(console.error);
  }, []);

  // ── Fetch ingredient transactions ──
  const fetchIngredientTransactions = useCallback(async () => {
    try {
      const res = await axios.get('/inventory/ingredient-transactions', {
        params: {
          start: startDateString,
          end: endDateString,
          type: debouncedType !== 'all' ? debouncedType : undefined,
        },
      });
      setTransactions(res.data.transactions || []);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) setError('Unauthorized.');
      else if (err.response?.status === 403) setError('Access denied.');
      else setError(err.response?.data?.message || 'Failed to load ingredient transactions');
    }
  }, [startDateString, endDateString, debouncedType]);

  // ── Fetch menu transactions from the new endpoint (no migration needed) ──
  const fetchMenuTransactions = useCallback(async () => {
    try {
      const res = await axios.get('/admin/menu-transactions', {
        params: {
          start_date: startDateString,
          end_date: endDateString,
          category_id: selectedCategory !== 'all' ? selectedCategory : undefined,
        }
      });
      setMenuTransactions(res.data.transactions || []);
    } catch (err) {
      console.error('Error fetching menu transactions:', err);
      setMenuTransactions([]);
    }
  }, [startDateString, endDateString, selectedCategory]);

  // ── Fetch history data (placeholder) ──
  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      // Replace with real API call when backend is ready
      setHistoryData([
        {
          id: 1,
          date_time: '2026-05-01 08:30',
          action: 'Stock In',
          quantity: 10,
          previous_stock: 20,
          new_stock: 30,
          notes: 'Initial delivery'
        },
        {
          id: 2,
          date_time: '2026-05-03 14:10',
          action: 'Stock In',
          quantity: 5,
          previous_stock: 30,
          new_stock: 35,
          notes: 'Supplier restock'
        }
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // ── Initial load ──
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setError(null);
      try {
        await Promise.all([fetchMenuTransactions(), fetchIngredientTransactions()]);
      } catch (e) { /* handled inside each fetch */ }
      finally { setLoading(false); }
    };
    init();
  }, []); // eslint-disable-line

  // ── Refresh when debounced filters change ──
  useEffect(() => {
    fetchMenuTransactions();
    fetchIngredientTransactions();
  }, [debouncedEndDay, debouncedType, selectedCategory, fetchMenuTransactions, fetchIngredientTransactions]);

  // ── Render ──
  if (loading) {
    return (
      <div style={{ background: CREAM, minHeight: '100vh' }} className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader className="animate-spin" style={{ color: SAGE }} size={36} />
          <p style={{ color: MUTED_GRAY, fontSize: '0.85rem' }}>Loading inventory...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-2xl flex items-center gap-3 m-6"
        style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FEE2E2' }}>
        <AlertCircle size={20} />
        <span>Error: {error}</span>
      </div>
    );
  }

  return (
    <div style={{ background: CREAM, minHeight: '100vh', padding: '36px 28px' }}>
      <style>{`
        .grain-overlay { position: fixed; inset: 0; pointer-events: none; z-index: 0; opacity: 0.028;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
          background-repeat: repeat; background-size: 128px;
        }
        .divider-line { height: 1px; background: linear-gradient(90deg, transparent, rgba(79,95,82,0.15), transparent); }
        .inv-table tbody tr { transition: background 0.15s ease; }
        .inv-table tbody tr:hover { background: rgba(242,237,228,0.7); }
        .filter-input { transition: all 0.2s ease; outline: none; }
        .filter-input:focus { box-shadow: 0 0 0 3px rgba(79,95,82,0.12); border-color: #4F5F52 !important; }
        .type-badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 999px; font-size: 0.68rem; font-weight: 600; letter-spacing: 0.04em; }
        .stock-arrow { display: inline-flex; align-items: center; gap: 5px; font-size: 0.78rem; font-weight: 600; padding: 2px 8px; border-radius: 6px; }
        .tab-btn { border: none; background: none; cursor: pointer; padding: 8px 16px; border-radius: 999px; font-size: 0.78rem; font-weight: 600; transition: all 0.2s; margin-right: 8px; }
        .tab-btn.active { background: ${SAGE}; color: #fff; }
        .tab-btn:not(.active) { background: rgba(166,162,154,0.1); color: ${MUTED_GRAY}; }
        .tab-btn:not(.active):hover { background: rgba(79,95,82,0.1); }
        .history-btn { display: flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 999px; border: none; background: rgba(79,95,82,0.1); color: ${SAGE}; font-size: 0.78rem; font-weight: 600; cursor: pointer; transition: all 0.2s; margin-left: auto; }
        .history-btn:hover { background: rgba(79,95,82,0.18); }
        .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 50; padding: 16px; backdrop-filter: blur(4px); }
        .modal-content { background: #fff; border-radius: 22px; width: 100%; max-height: 80vh; overflow-y: auto; box-shadow: 0 24px 60px rgba(79,95,82,0.18); border: 1px solid rgba(242,237,228,0.8); }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
        .fade-in { animation: fadeInUp 0.4s ease forwards; }
        .fade-in-1 { animation: fadeInUp 0.4s 0.05s ease both; }
        .fade-in-2 { animation: fadeInUp 0.4s 0.1s ease both; }
        .fade-in-3 { animation: fadeInUp 0.4s 0.15s ease both; }
      `}</style>

      <div className="grain-overlay" />
      <div className="max-w-7xl mx-auto relative" style={{ zIndex: 1 }}>

        {/* ── Header ── */}
        <div className="flex flex-wrap justify-between items-start gap-4 mb-8 fade-in">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div style={{ width: 36, height: 36, background: `linear-gradient(135deg, ${SAGE}, #3e4c42)`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(79,95,82,0.25)', flexShrink: 0 }}>
                <ClipboardList size={18} color="#fff" />
              </div>
              <h1 style={{ color: SAGE, fontSize: '1.55rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Inventory Records</h1>
            </div>
            <p style={{ color: MUTED_GRAY, fontSize: '0.82rem', letterSpacing: '0.03em', marginLeft: 48 }}>
              Automatically updated when orders are confirmed and ingredients are adjusted
            </p>
          </div>
        </div>

        <div className="divider-line mb-7" />

        {/* ── Filters ── */}
        <div className="fade-in-1" style={{ background: '#fff', borderRadius: 20, border: '1.5px solid rgba(242,237,228,0.9)', boxShadow: '0 2px 12px rgba(79,95,82,0.06)', padding: '20px 24px', marginBottom: 32 }}>
          <div className="flex items-center gap-2 mb-4">
            <SlidersHorizontal size={14} style={{ color: MUTED_GRAY }} />
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: MUTED_GRAY, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Filter Records</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-1">
              <SingleValueSlider endDay={endDay} onChange={(newVal) => setEndDay(newVal)} min={0} max={maxDay} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: SAGE, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Transaction Type</label>
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="filter-input w-full rounded-xl border text-sm" style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa', padding: '9px 12px' }}>
                <option value="all">All Types</option>
                <option value="purchase">Purchase</option>
                <option value="usage">Usage</option>
                <option value="adjustment">Adjustment</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Menu Transactions ── */}
        <div className="mb-10 fade-in-2">
          <div className="flex items-center gap-2.5 mb-4">
            <div style={{ width: 28, height: 28, background: `linear-gradient(135deg, ${SAGE}, #3e4c42)`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(79,95,82,0.2)' }}>
              <TrendingUp size={13} color="#fff" />
            </div>
            <h2 style={{ color: SAGE, fontSize: '1.05rem', fontWeight: 700, letterSpacing: '-0.01em' }}>Menu Transactions</h2>
          </div>

          {/* Category Tabs + History Button */}
          <div className="mb-4 flex flex-wrap items-center" style={{ gap: 8 }}>
            <button
              className={`tab-btn ${selectedCategory === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('all')}
            >
              All Categories
            </button>
            {categories.filter(c => c.is_active).map(cat => (
              <button
                key={cat.id}
                className={`tab-btn ${selectedCategory === cat.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat.id)}
              >
                {cat.name}
              </button>
            ))}
            <button
              className="history-btn"
              onClick={() => { setShowHistoryModal(true); fetchHistory(); }}
            >
              <History size={16} />
              History
            </button>
          </div>

          {/* Table */}
          <div style={{ background: '#fff', borderRadius: 20, border: '1.5px solid rgba(242,237,228,0.9)', boxShadow: '0 2px 12px rgba(79,95,82,0.06)', overflow: 'hidden' }}>
            <div className="overflow-x-auto">
              <table className="inv-table w-full text-sm">
                <thead>
                  <tr style={{ background: `linear-gradient(135deg, ${CREAM}, rgba(255,243,217,0.5))` }}>
                    <th style={{ padding: '13px 20px', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, color: SAGE, letterSpacing: '0.08em', textTransform: 'uppercase' }}>SKU</th>
                    <th style={{ padding: '13px 20px', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, color: SAGE, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Product</th>
                    <th style={{ padding: '13px 20px', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, color: SAGE, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Type</th>
                    <th style={{ padding: '13px 20px', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, color: SAGE, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Past Stock</th>
                    <th style={{ padding: '13px 20px', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, color: SAGE, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Added Stock</th>
                    <th style={{ padding: '13px 20px', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, color: SAGE, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Current Stock</th>
                    <th style={{ padding: '13px 20px', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, color: SAGE, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Qty Sold</th>
                  </tr>
                </thead>
                <tbody style={{ borderTop: `1px solid ${CREAM}` }}>
                  {menuTransactions.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '48px 20px', color: MUTED_GRAY }}>
                        <div style={{ width: 56, height: 56, background: 'rgba(166,162,154,0.1)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', border: '1.5px dashed rgba(166,162,154,0.3)' }}>
                          <Package size={24} style={{ color: MUTED_GRAY, opacity: 0.4 }} />
                        </div>
                        <p style={{ fontSize: '0.85rem' }}>No menu transactions yet. Add stock from the Products page to see records.</p>
                      </td>
                    </tr>
                  ) : (
                    menuTransactions.map((item, idx) => (
                      <tr key={idx} style={{ borderTop: idx === 0 ? 'none' : `1px solid rgba(242,237,228,0.8)` }}>
                        <td style={{ padding: '13px 20px', fontWeight: 600, color: SAGE, fontSize: '0.85rem' }}>{item.sku}</td>
                        <td style={{ padding: '13px 20px', fontWeight: 600, color: SAGE, fontSize: '0.85rem' }}>{item.product_name}</td>
                        <td style={{ padding: '13px 20px' }}><span style={{ display: 'inline-block', background: 'rgba(79,95,82,0.07)', color: SAGE, borderRadius: 6, padding: '2px 9px', fontSize: '0.75rem', fontWeight: 500 }}>{item.type || 'Stock In'}</span></td>
                        <td style={{ padding: '13px 20px', color: MUTED_GRAY, fontSize: '0.85rem' }}>{item.past_stock ?? '—'}</td>
                        <td style={{ padding: '13px 20px', color: '#1a7a3c', fontSize: '0.85rem', fontWeight: 600 }}>{item.added_stock ?? '—'}</td>
                        <td style={{ padding: '13px 20px', color: SAGE, fontSize: '0.85rem', fontWeight: 600 }}>{item.current_stock ?? '—'}</td>
                        <td style={{ padding: '13px 20px', color: SAGE, fontSize: '0.85rem', fontWeight: 600 }}>{item.qty_sold ?? '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── Ingredient Transactions ── */}
        <div className="fade-in-3">
          <div className="flex items-center gap-2.5 mb-4">
            <div style={{ width: 28, height: 28, background: `linear-gradient(135deg, ${SAGE}, #3e4c42)`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(79,95,82,0.2)' }}>
              <Package size={13} color="#fff" />
            </div>
            <h2 style={{ color: SAGE, fontSize: '1.05rem', fontWeight: 700, letterSpacing: '-0.01em' }}>Ingredient Transactions</h2>
            {transactions.length > 0 && (
              <span style={{ fontSize: '0.68rem', fontWeight: 600, color: MUTED_GRAY, background: 'rgba(166,162,154,0.12)', border: '1px solid rgba(166,162,154,0.2)', borderRadius: 999, padding: '2px 8px', letterSpacing: '0.04em' }}>
                {transactions.length} record{transactions.length !== 1 ? 's' : ''}
              </span>
            )}
            {/* Ingredient History Button */}
            <button
              className="history-btn"
              onClick={() => setShowIngredientHistoryModal(true)}
              style={{ marginLeft: 'auto' }}
            >
              <History size={16} />
              History
            </button>
          </div>

          <div style={{ background: '#fff', borderRadius: 20, border: '1.5px solid rgba(242,237,228,0.9)', boxShadow: '0 2px 12px rgba(79,95,82,0.06)', overflow: 'hidden' }}>
            <div className="overflow-x-auto">
              <table className="inv-table w-full text-sm">
                <thead>
                  <tr style={{ background: `linear-gradient(135deg, ${CREAM}, rgba(255,243,217,0.5))` }}>
                    {['Ingredient', 'Type', 'Quantity', 'Stock Change', 'Reference', 'Created By', 'Date'].map(col => (
                      <th key={col} style={{ padding: '13px 20px', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, color: SAGE, letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody style={{ borderTop: `1px solid ${CREAM}` }}>
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '48px 20px', color: MUTED_GRAY }}>
                        <div style={{ width: 56, height: 56, background: 'rgba(166,162,154,0.1)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', border: '1.5px dashed rgba(166,162,154,0.3)' }}>
                          <Package size={24} style={{ color: MUTED_GRAY, opacity: 0.4 }} />
                        </div>
                        <p style={{ fontSize: '0.85rem' }}>No transactions found</p>
                      </td>
                    </tr>
                  ) : (
                    transactions.map((trans, idx) => (
                      <tr key={trans.id} style={{ borderTop: idx === 0 ? 'none' : `1px solid rgba(242,237,228,0.8)` }}>
                        <td style={{ padding: '13px 20px', whiteSpace: 'nowrap' }}>
                          <span style={{ fontWeight: 600, color: SAGE, fontSize: '0.85rem' }}>{trans.ingredient?.name || '—'}</span>
                          {trans.ingredient?.unit && <span style={{ marginLeft: 6, fontSize: '0.68rem', fontWeight: 500, color: MUTED_GRAY, background: 'rgba(166,162,154,0.1)', borderRadius: 4, padding: '1px 6px' }}>{trans.ingredient.unit}</span>}
                        </td>
                        <td style={{ padding: '13px 20px' }}>
                          <span className="type-badge" style={{ background: trans.transaction_type === 'purchase' ? 'rgba(52,196,104,0.1)' : trans.transaction_type === 'usage' ? 'rgba(239,68,68,0.08)' : 'rgba(79,130,222,0.1)', color: trans.transaction_type === 'purchase' ? '#1a7a3c' : trans.transaction_type === 'usage' ? '#c0392b' : '#2c5eb0', border: `1px solid ${trans.transaction_type === 'purchase' ? 'rgba(52,196,104,0.2)' : trans.transaction_type === 'usage' ? 'rgba(239,68,68,0.15)' : 'rgba(79,130,222,0.2)'}` }}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: trans.transaction_type === 'purchase' ? '#34c468' : trans.transaction_type === 'usage' ? '#ef4444' : '#4f82de', display: 'inline-block' }} /> {trans.transaction_type}
                          </span>
                        </td>
                        <td style={{ padding: '13px 20px', color: MUTED_GRAY, fontSize: '0.85rem', fontWeight: 500 }}>{trans.quantity}</td>
                        <td style={{ padding: '13px 20px' }}>
                          <span className="stock-arrow" style={{ background: trans.new_stock > trans.previous_stock ? 'rgba(52,196,104,0.08)' : 'rgba(239,68,68,0.07)', color: trans.new_stock > trans.previous_stock ? '#1a7a3c' : '#c0392b' }}>
                            {trans.previous_stock} <span style={{ opacity: 0.5, fontSize: '0.7rem' }}>→</span> {trans.new_stock}
                          </span>
                        </td>
                        <td style={{ padding: '13px 20px', color: MUTED_GRAY, fontSize: '0.78rem' }}>
                          {trans.reference_type ? <span style={{ background: 'rgba(79,95,82,0.06)', borderRadius: 6, padding: '2px 8px', fontWeight: 500, color: SAGE }}>{trans.reference_type} #{trans.reference_id}</span> : '—'}
                        </td>
                        <td style={{ padding: '13px 20px', color: MUTED_GRAY, fontSize: '0.78rem', fontWeight: 500 }}>{trans.created_by?.first_name || 'System'}</td>
                        <td style={{ padding: '13px 20px', color: MUTED_GRAY, fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{new Date(trans.created_at).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ── Menu History Modal ── */}
      {showHistoryModal && (
        <div className="modal-backdrop" onClick={() => setShowHistoryModal(false)}>
          <div className="modal-content" style={{ maxWidth: '800px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: `1px solid ${CREAM}`, background: `linear-gradient(135deg, rgba(79,95,82,0.04), rgba(255,243,217,0.3))` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 32, height: 32, background: `linear-gradient(135deg, ${SAGE}, #3e4c42)`, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 10px rgba(79,95,82,0.25)' }}>
                  <History size={16} color="#fff" />
                </div>
                <h3 style={{ color: SAGE, fontWeight: 700, fontSize: '1.05rem' }}>History</h3>
              </div>
              <button onClick={() => setShowHistoryModal(false)} style={{ color: MUTED_GRAY, padding: 7, borderRadius: 10, background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px 24px' }}>
              {historyLoading ? (
                <div className="flex justify-center py-8">
                  <Loader className="animate-spin" style={{ color: SAGE }} size={32} />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="inv-table w-full text-sm">
                    <thead>
                      <tr style={{ background: `linear-gradient(135deg, ${CREAM}, rgba(255,243,217,0.5))` }}>
                        <th style={{ padding: '13px 20px', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, color: SAGE, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Date &amp; Time</th>
                        <th style={{ padding: '13px 20px', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, color: SAGE, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Action</th>
                        <th style={{ padding: '13px 20px', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, color: SAGE, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Quantity</th>
                        <th style={{ padding: '13px 20px', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, color: SAGE, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Previous Stock</th>
                        <th style={{ padding: '13px 20px', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, color: SAGE, letterSpacing: '0.08em', textTransform: 'uppercase' }}>New Stock</th>
                        <th style={{ padding: '13px 20px', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, color: SAGE, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Notes</th>
                      </tr>
                    </thead>
                    <tbody style={{ borderTop: `1px solid ${CREAM}` }}>
                      {historyData.length === 0 ? (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', padding: '48px 20px', color: MUTED_GRAY }}>
                            <div style={{ width: 48, height: 48, background: 'rgba(166,162,154,0.1)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', border: '1.5px dashed rgba(166,162,154,0.3)' }}>
                              <History size={20} style={{ color: MUTED_GRAY, opacity: 0.4 }} />
                            </div>
                            <p style={{ fontSize: '0.85rem' }}>No history records found</p>
                          </td>
                        </tr>
                      ) : (
                        historyData.map(record => (
                          <tr key={record.id} style={{ borderTop: `1px solid rgba(242,237,228,0.8)` }}>
                            <td style={{ padding: '13px 20px', color: MUTED_GRAY, fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{record.date_time}</td>
                            <td style={{ padding: '13px 20px' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600, background: 'rgba(79,95,82,0.1)', color: SAGE }}>
                                {record.action}
                              </span>
                            </td>
                            <td style={{ padding: '13px 20px', color: SAGE, fontWeight: 600 }}>{record.quantity}</td>
                            <td style={{ padding: '13px 20px', color: MUTED_GRAY }}>{record.previous_stock}</td>
                            <td style={{ padding: '13px 20px', color: SAGE, fontWeight: 600 }}>{record.new_stock}</td>
                            <td style={{ padding: '13px 20px', color: MUTED_GRAY }}>{record.notes}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Ingredient Transactions History Modal ── */}
      {showIngredientHistoryModal && (
        <div className="modal-backdrop" onClick={() => setShowIngredientHistoryModal(false)}>
          <div className="modal-content" style={{ maxWidth: '90%', width: '1200px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: `1px solid ${CREAM}`, background: `linear-gradient(135deg, rgba(79,95,82,0.04), rgba(255,243,217,0.3))` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 32, height: 32, background: `linear-gradient(135deg, ${SAGE}, #3e4c42)`, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 10px rgba(79,95,82,0.25)' }}>
                  <History size={16} color="#fff" />
                </div>
                <h3 style={{ color: SAGE, fontWeight: 700, fontSize: '1.05rem' }}>History</h3>
              </div>
              <button onClick={() => setShowIngredientHistoryModal(false)} style={{ color: MUTED_GRAY, padding: 7, borderRadius: 10, background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px 24px' }}>
              <div className="overflow-x-auto">
                <table className="inv-table w-full text-sm">
                  <thead>
                    <tr style={{ background: `linear-gradient(135deg, ${CREAM}, rgba(255,243,217,0.5))` }}>
                      <th style={{ padding: '13px 20px', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, color: SAGE, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Ingredient</th>
                      <th style={{ padding: '13px 20px', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, color: SAGE, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Type</th>
                      <th style={{ padding: '13px 20px', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, color: SAGE, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Quantity</th>
                      <th style={{ padding: '13px 20px', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, color: SAGE, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Stock Change</th>
                      <th style={{ padding: '13px 20px', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, color: SAGE, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Reference</th>
                      <th style={{ padding: '13px 20px', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, color: SAGE, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Created By</th>
                      <th style={{ padding: '13px 20px', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, color: SAGE, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Date</th>
                    </tr>
                  </thead>
                  <tbody style={{ borderTop: `1px solid ${CREAM}` }}>
                    {transactions.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '48px 20px', color: MUTED_GRAY }}>
                          <div style={{ width: 48, height: 48, background: 'rgba(166,162,154,0.1)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', border: '1.5px dashed rgba(166,162,154,0.3)' }}>
                            <History size={20} style={{ color: MUTED_GRAY, opacity: 0.4 }} />
                          </div>
                          <p style={{ fontSize: '0.85rem' }}>No transactions found</p>
                        </td>
                      </tr>
                    ) : (
                      transactions.map((trans, idx) => (
                        <tr key={trans.id} style={{ borderTop: idx === 0 ? 'none' : `1px solid rgba(242,237,228,0.8)` }}>
                          <td style={{ padding: '13px 20px', whiteSpace: 'nowrap' }}>
                            <span style={{ fontWeight: 600, color: SAGE, fontSize: '0.85rem' }}>{trans.ingredient?.name || '—'}</span>
                            {trans.ingredient?.unit && <span style={{ marginLeft: 6, fontSize: '0.68rem', fontWeight: 500, color: MUTED_GRAY, background: 'rgba(166,162,154,0.1)', borderRadius: 4, padding: '1px 6px' }}>{trans.ingredient.unit}</span>}
                          </td>
                          <td style={{ padding: '13px 20px' }}>
                            <span className="type-badge" style={{ background: trans.transaction_type === 'purchase' ? 'rgba(52,196,104,0.1)' : trans.transaction_type === 'usage' ? 'rgba(239,68,68,0.08)' : 'rgba(79,130,222,0.1)', color: trans.transaction_type === 'purchase' ? '#1a7a3c' : trans.transaction_type === 'usage' ? '#c0392b' : '#2c5eb0', border: `1px solid ${trans.transaction_type === 'purchase' ? 'rgba(52,196,104,0.2)' : trans.transaction_type === 'usage' ? 'rgba(239,68,68,0.15)' : 'rgba(79,130,222,0.2)'}` }}>
                              <span style={{ width: 5, height: 5, borderRadius: '50%', background: trans.transaction_type === 'purchase' ? '#34c468' : trans.transaction_type === 'usage' ? '#ef4444' : '#4f82de', display: 'inline-block' }} /> {trans.transaction_type}
                            </span>
                          </td>
                          <td style={{ padding: '13px 20px', color: MUTED_GRAY, fontSize: '0.85rem', fontWeight: 500 }}>{trans.quantity}</td>
                          <td style={{ padding: '13px 20px' }}>
                            <span className="stock-arrow" style={{ background: trans.new_stock > trans.previous_stock ? 'rgba(52,196,104,0.08)' : 'rgba(239,68,68,0.07)', color: trans.new_stock > trans.previous_stock ? '#1a7a3c' : '#c0392b' }}>
                              {trans.previous_stock} <span style={{ opacity: 0.5, fontSize: '0.7rem' }}>→</span> {trans.new_stock}
                            </span>
                          </td>
                          <td style={{ padding: '13px 20px', color: MUTED_GRAY, fontSize: '0.78rem' }}>
                            {trans.reference_type ? <span style={{ background: 'rgba(79,95,82,0.06)', borderRadius: 6, padding: '2px 8px', fontWeight: 500, color: SAGE }}>{trans.reference_type} #{trans.reference_id}</span> : '—'}
                          </td>
                          <td style={{ padding: '13px 20px', color: MUTED_GRAY, fontSize: '0.78rem', fontWeight: 500 }}>{trans.created_by?.first_name || 'System'}</td>
                          <td style={{ padding: '13px 20px', color: MUTED_GRAY, fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{new Date(trans.created_at).toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}