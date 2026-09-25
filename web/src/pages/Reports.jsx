// web/src/pages/Reports.jsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from '/api/axios';
import { motion } from 'framer-motion';
import * as XLSX from 'xlsx';
import {
  Search, Filter, Calendar, ChevronDown,
  TrendingUp, DollarSign, Package, FileText, SlidersHorizontal,
  Loader, AlertCircle, ClipboardList, Box, UserCheck, Percent,
  Printer, FileSpreadsheet, ShoppingBag
} from 'lucide-react';

// ── Palette ──
const SAGE = '#4F5F52';
const CREAM = '#F2EDE4';
const MUTED_GRAY = '#A6A29A';

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } }
};

const MONTHS = [
  { value: 1,  label: 'January' }, { value: 2,  label: 'February' },
  { value: 3,  label: 'March' },   { value: 4,  label: 'April' },
  { value: 5,  label: 'May' },     { value: 6,  label: 'June' },
  { value: 7,  label: 'July' },    { value: 8,  label: 'August' },
  { value: 9,  label: 'September' },{ value: 10, label: 'October' },
  { value: 11, label: 'November' }, { value: 12, label: 'December' },
];

const DAYS = [
  { value: 0, label: 'Monday' },    { value: 1, label: 'Tuesday' },
  { value: 2, label: 'Wednesday' }, { value: 3, label: 'Thursday' },
  { value: 4, label: 'Friday' },    { value: 5, label: 'Saturday' },
  { value: 6, label: 'Sunday' },
];

function getWeekOptions(year) {
  const weeks = [];
  const jan1 = new Date(year, 0, 1);
  const dow = jan1.getDay();
  const offsetToMonday = dow === 1 ? 0 : (8 - dow) % 7 || 7;
  const firstMonday = new Date(year, 0, 1 + offsetToMonday);
  let cursor = new Date(firstMonday);
  let weekNum = 1;
  while (cursor.getFullYear() === year) {
    const start = new Date(cursor);
    const end   = new Date(cursor);
    end.setDate(end.getDate() + 6);
    const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    weeks.push({
      value: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`,
      label: `Week ${weekNum} (${fmt(start)} – ${fmt(end)})`,
    });
    cursor.setDate(cursor.getDate() + 7);
    weekNum++;
  }
  return weeks;
}

/* ─────────── Pagination controls ─────────── */
function PaginationControls({ currentPage, totalPages, onPageChange, perPage, onPerPageChange }) {
  const renderPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);
    if (start > 1) { pages.push(1); if (start > 2) pages.push('...'); }
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages) { if (end < totalPages - 1) pages.push('...'); pages.push(totalPages); }
    return pages;
  };

  const btn = (disabled) => ({
    border: '1px solid rgba(166,162,154,0.3)', background: '#fff',
    padding: '6px 12px', borderRadius: 6, fontSize: '0.8rem', fontWeight: 600,
    color: SAGE, cursor: disabled ? 'not-allowed' : 'pointer',
    margin: '0 2px', opacity: disabled ? 0.4 : 1,
  });

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 mt-4 print-hide">
      <div className="flex items-center gap-3 text-sm" style={{ color: MUTED_GRAY }}>
        <span>Page {currentPage} of {totalPages}</span>
        <div className="flex items-center gap-2">
          <span>Per page:</span>
          <select value={perPage} onChange={(e) => onPerPageChange(Number(e.target.value))}
            style={{ border: '1px solid rgba(166,162,154,0.3)', borderRadius: 6,
              padding: '4px 8px', fontSize: '0.8rem', color: SAGE, background: '#fff', outline: 'none' }}>
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>
      </div>
      <div className="flex items-center gap-1 flex-wrap">
        <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} style={btn(currentPage === 1)}>Previous</button>
        {renderPageNumbers().map((p, idx) => p === '...'
          ? <span key={idx} className="px-2" style={{ color: MUTED_GRAY }}>…</span>
          : <button key={idx} onClick={() => onPageChange(p)}
              style={{ ...btn(false),
                background: currentPage === p ? SAGE : '#fff',
                color: currentPage === p ? '#fff' : SAGE,
                borderColor: currentPage === p ? SAGE : 'rgba(166,162,154,0.3)' }}>{p}</button>)}
        <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} style={btn(currentPage === totalPages)}>Next</button>
      </div>
    </div>
  );
}

/* ─────────── Sales section ─────────── */
function SalesTransactionsSection({ transactions, loading, error, pagination, onPageChange, onPerPageChange, summary }) {
  return (
    <motion.div variants={fadeInUp} initial="hidden" animate="visible"
      className="report-section"
      style={{ background: '#fff', borderRadius: 20, border: '1.5px solid rgba(242,237,228,0.9)',
        boxShadow: '0 2px 12px rgba(79,95,82,0.06)', overflow: 'hidden', marginBottom: 24 }}>
      <div className="section-header" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 24px',
        borderBottom: `1px solid ${CREAM}`,
        background: `linear-gradient(135deg, ${CREAM}, rgba(255,243,217,0.5))` }}>
        <div style={{ width: 28, height: 28, borderRadius: 8,
          background: `linear-gradient(135deg, ${SAGE}, #3e4c42)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(79,95,82,0.2)' }}>
          <FileText size={13} color="#fff" />
        </div>
        <h2 style={{ color: SAGE, fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.01em' }}>Sales Transactions</h2>
        {pagination.totalItems > 0 && (
          <span style={{ fontSize: '0.65rem', fontWeight: 600, color: MUTED_GRAY,
            background: 'rgba(166,162,154,0.12)', border: '1px solid rgba(166,162,154,0.2)',
            borderRadius: 999, padding: '2px 8px' }}>
            {pagination.totalItems} record{pagination.totalItems !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {loading ? (
        <div style={{ padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <Loader className="animate-spin" size={28} style={{ color: SAGE }} />
          <p style={{ color: MUTED_GRAY, fontSize: '0.85rem' }}>Loading sales…</p>
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 p-4 m-6 rounded-xl"
          style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FEE2E2' }}>
          <AlertCircle size={18} /><span style={{ fontSize: '0.85rem' }}>{error}</span>
        </div>
      ) : transactions.length === 0 ? (
        <div style={{ padding: '48px 24px', textAlign: 'center', color: MUTED_GRAY }}>
          <div style={{ width: 52, height: 52, background: 'rgba(166,162,154,0.1)', borderRadius: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px', border: '1.5px dashed rgba(166,162,154,0.3)' }}>
            <FileText size={22} style={{ color: MUTED_GRAY, opacity: 0.4 }} />
          </div>
          <p style={{ fontSize: '0.85rem' }}>No sales found</p>
        </div>
      ) : (
        transactions.map((t, idx) => (
          <div key={t.id} className="txn-row" style={{ borderTop: idx === 0 ? 'none' : `1px solid rgba(242,237,228,0.8)` }}>
            <div style={{ padding: '18px 24px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, minWidth: 160 }}>
                  <div className="product-icon" style={{
                    width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                    background: 'rgba(79,95,82,0.07)', border: '1px solid rgba(79,95,82,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Package size={15} style={{ color: SAGE }} />
                  </div>
                  <div>
                    <p style={{ fontSize: '0.78rem', fontFamily: 'monospace', fontWeight: 700, color: SAGE, letterSpacing: '0.02em' }}>
                      {t.order_number}
                    </p>
                    <p style={{ fontSize: '0.7rem', color: MUTED_GRAY, marginTop: 2 }}>{t.date}</p>
                  </div>
                </div>

                <div style={{ flex: 1, minWidth: 180 }}>
                  <p style={{ fontWeight: 700, fontSize: '0.95rem', color: SAGE, letterSpacing: '-0.01em' }}>{t.product_name}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: '0.65rem', fontWeight: 600,
                      background: 'rgba(79,95,82,0.08)', color: SAGE, borderRadius: 5, padding: '2px 8px', letterSpacing: '0.03em' }}>
                      {t.category_name}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: '0.65rem', fontWeight: 600,
                      background: 'rgba(91,122,138,0.10)', color: '#5B7A8A', borderRadius: 5, padding: '2px 8px', letterSpacing: '0.03em' }}>
                      {t.order_type}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.7rem', color: MUTED_GRAY, marginTop: 6 }}>
                    Qty: {t.quantity} × ₱{Number(t.unit_price).toLocaleString()}
                  </p>
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 110 }}>
                  <p style={{ fontSize: '1.35rem', fontWeight: 800, color: SAGE, letterSpacing: '-0.03em', lineHeight: 1 }}>
                    ₱{Number(t.line_total).toLocaleString()}
                  </p>
                  <p style={{ fontSize: '0.65rem', color: MUTED_GRAY, marginTop: 2 }}>Line total</p>
                  <div style={{ marginTop: 8 }}>
                    <span title="Payment status — all rows in this report come from completed orders."
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '3px 9px', borderRadius: 999, fontSize: '0.65rem', fontWeight: 600,
                        background: t.payment_status === 'paid' ? 'rgba(52,196,104,0.1)' : 'rgba(212,160,61,0.1)',
                        color: t.payment_status === 'paid' ? '#1a7a3c' : '#92670a',
                        border: `1px solid ${t.payment_status === 'paid' ? 'rgba(52,196,104,0.2)' : 'rgba(212,160,61,0.2)'}` }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%',
                        background: t.payment_status === 'paid' ? '#34c468' : '#D4A03D', display: 'inline-block' }} />
                      {t.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))
      )}

      {!loading && !error && pagination.totalItems > 0 && (
        <div style={{ padding: '0 24px 20px' }}>
          <PaginationControls
            currentPage={pagination.currentPage} totalPages={pagination.totalPages}
            onPageChange={onPageChange} perPage={pagination.perPage} onPerPageChange={onPerPageChange} />
        </div>
      )}

      {/* ─── Total Amount — reflects ALL filtered transactions, not just current page ─── */}
      {!loading && !error && summary && (
        <div
          style={{
            padding: '16px 24px 22px',
            borderTop: '1.5px solid rgba(242,237,228,0.9)',
            background: `linear-gradient(135deg, rgba(242,237,228,0.4), rgba(255,243,217,0.3))`,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div>
            <p style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              color: SAGE,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              margin: 0,
            }}>
              Total Amount
            </p>
            <p style={{
              fontSize: '0.72rem',
              color: MUTED_GRAY,
              marginTop: 3,
              marginBottom: 0,
            }}>
              Across all {summary.total_transactions || 0} filtered transaction{summary.total_transactions === 1 ? '' : 's'}
            </p>
          </div>
          <span style={{
            fontSize: '1.55rem',
            fontWeight: 800,
            color: SAGE,
            letterSpacing: '-0.03em',
            lineHeight: 1,
          }}>
            ₱{Number(summary.total_income || 0).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
      )}
    </motion.div>
  );
}

/* ─────────── Menu Transactions section ─────────── */
function MenuTransactionsSection({ transactions, loading, error, pagination, onPageChange, onPerPageChange }) {
  const typeStyles = {
    'Stock In':  { bg: 'rgba(52,196,104,0.10)', color: '#1a7a3c', border: 'rgba(52,196,104,0.2)' },
    'Stock Out': { bg: 'rgba(239,68,68,0.08)', color: '#c0392b', border: 'rgba(239,68,68,0.15)' },
  };

  return (
    <motion.div variants={fadeInUp} initial="hidden" animate="visible"
      className="report-section"
      style={{ background: '#fff', borderRadius: 20, border: '1.5px solid rgba(242,237,228,0.9)',
        boxShadow: '0 2px 12px rgba(79,95,82,0.06)', overflow: 'hidden', marginBottom: 24 }}>
      <div className="section-header" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 24px',
        borderBottom: `1px solid ${CREAM}`,
        background: `linear-gradient(135deg, ${CREAM}, rgba(255,243,217,0.5))` }}>
        <div style={{ width: 28, height: 28, borderRadius: 8,
          background: `linear-gradient(135deg, ${SAGE}, #3e4c42)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(79,95,82,0.2)' }}>
          <ClipboardList size={13} color="#fff" />
        </div>
        <h2 style={{ color: SAGE, fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.01em' }}>Menu Transactions</h2>
        {pagination.totalItems > 0 && (
          <span style={{ fontSize: '0.65rem', fontWeight: 600, color: MUTED_GRAY,
            background: 'rgba(166,162,154,0.12)', border: '1px solid rgba(166,162,154,0.2)',
            borderRadius: 999, padding: '2px 8px' }}>
            {pagination.totalItems} record{pagination.totalItems !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {loading ? (
        <div style={{ padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <Loader className="animate-spin" size={28} style={{ color: SAGE }} />
          <p style={{ color: MUTED_GRAY, fontSize: '0.85rem' }}>Loading menu transactions…</p>
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 p-4 m-6 rounded-xl"
          style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FEE2E2' }}>
          <AlertCircle size={18} /><span style={{ fontSize: '0.85rem' }}>{error}</span>
        </div>
      ) : transactions.length === 0 ? (
        <div style={{ padding: '48px 24px', textAlign: 'center', color: MUTED_GRAY }}>
          <div style={{ width: 52, height: 52, background: 'rgba(166,162,154,0.1)', borderRadius: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px', border: '1.5px dashed rgba(166,162,154,0.3)' }}>
            <ClipboardList size={22} style={{ color: MUTED_GRAY, opacity: 0.4 }} />
          </div>
          <p style={{ fontSize: '0.85rem' }}>No menu transactions found</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: `linear-gradient(135deg, ${CREAM}, rgba(255,243,217,0.5))` }}>
                {['Date & Time', 'SKU', 'Product', 'Type', 'Past Stock', 'Added Stock', 'Current Stock', 'Qty Sold'].map(col => (
                  <th key={col} style={{ padding: '13px 20px', textAlign: 'left',
                    fontSize: '0.68rem', fontWeight: 700, color: SAGE,
                    letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transactions.map((t, idx) => {
                const st = typeStyles[t.type] || typeStyles['Stock In'];
                return (
                  <tr key={idx} style={{ borderTop: idx === 0 ? 'none' : `1px solid rgba(242,237,228,0.8)` }}>
                    <td style={{ padding: '13px 20px', color: MUTED_GRAY, fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                      {t.created_at ? new Date(t.created_at).toLocaleString() : '—'}
                    </td>
                    <td style={{ padding: '13px 20px', fontWeight: 600, color: SAGE, fontSize: '0.82rem', fontFamily: 'monospace' }}>{t.sku}</td>
                    <td style={{ padding: '13px 20px', fontWeight: 600, color: SAGE }}>{t.product_name}</td>
                    <td style={{ padding: '13px 20px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '3px 10px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600,
                        background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: st.color, display: 'inline-block' }} />
                        {t.type}
                      </span>
                    </td>
                    <td style={{ padding: '13px 20px', color: MUTED_GRAY }}>{t.past_stock ?? '—'}</td>
                    <td style={{ padding: '13px 20px', color: t.added_stock > 0 ? '#1a7a3c' : MUTED_GRAY, fontWeight: t.added_stock > 0 ? 600 : 400 }}>
                      {t.added_stock ?? '—'}
                    </td>
                    <td style={{ padding: '13px 20px', color: SAGE, fontWeight: 600 }}>{t.current_stock ?? '—'}</td>
                    <td style={{ padding: '13px 20px', color: t.qty_sold > 0 ? '#c0392b' : MUTED_GRAY, fontWeight: t.qty_sold > 0 ? 600 : 400 }}>
                      {t.qty_sold ?? '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && pagination.totalItems > 0 && (
        <div style={{ padding: '0 24px 20px' }}>
          <PaginationControls
            currentPage={pagination.currentPage} totalPages={pagination.totalPages}
            onPageChange={onPageChange} perPage={pagination.perPage} onPerPageChange={onPerPageChange} />
        </div>
      )}
    </motion.div>
  );
}

/* ─────────── Ingredient Transactions section ─────────── */
function IngredientTransactionsSection({ transactions, loading, error, pagination, onPageChange, onPerPageChange }) {
  const typeStyles = {
    purchase:   { bg: 'rgba(52,196,104,0.10)', color: '#1a7a3c', border: 'rgba(52,196,104,0.2)' },
    usage:      { bg: 'rgba(239,68,68,0.08)',  color: '#c0392b', border: 'rgba(239,68,68,0.15)' },
    adjustment: { bg: 'rgba(79,130,222,0.10)', color: '#2c5eb0', border: 'rgba(79,130,222,0.2)' },
  };

  return (
    <motion.div variants={fadeInUp} initial="hidden" animate="visible"
      className="report-section"
      style={{ background: '#fff', borderRadius: 20, border: '1.5px solid rgba(242,237,228,0.9)',
        boxShadow: '0 2px 12px rgba(79,95,82,0.06)', overflow: 'hidden' }}>
      <div className="section-header" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 24px',
        borderBottom: `1px solid ${CREAM}`,
        background: `linear-gradient(135deg, ${CREAM}, rgba(255,243,217,0.5))` }}>
        <div style={{ width: 28, height: 28, borderRadius: 8,
          background: `linear-gradient(135deg, ${SAGE}, #3e4c42)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(79,95,82,0.2)' }}>
          <Box size={13} color="#fff" />
        </div>
        <h2 style={{ color: SAGE, fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.01em' }}>Ingredient Transactions</h2>
        {pagination.totalItems > 0 && (
          <span style={{ fontSize: '0.65rem', fontWeight: 600, color: MUTED_GRAY,
            background: 'rgba(166,162,154,0.12)', border: '1px solid rgba(166,162,154,0.2)',
            borderRadius: 999, padding: '2px 8px' }}>
            {pagination.totalItems} record{pagination.totalItems !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {loading ? (
        <div style={{ padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <Loader className="animate-spin" size={28} style={{ color: SAGE }} />
          <p style={{ color: MUTED_GRAY, fontSize: '0.85rem' }}>Loading ingredient transactions…</p>
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 p-4 m-6 rounded-xl"
          style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FEE2E2' }}>
          <AlertCircle size={18} /><span style={{ fontSize: '0.85rem' }}>{error}</span>
        </div>
      ) : transactions.length === 0 ? (
        <div style={{ padding: '48px 24px', textAlign: 'center', color: MUTED_GRAY }}>
          <div style={{ width: 52, height: 52, background: 'rgba(166,162,154,0.1)', borderRadius: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px', border: '1.5px dashed rgba(166,162,154,0.3)' }}>
            <Box size={22} style={{ color: MUTED_GRAY, opacity: 0.4 }} />
          </div>
          <p style={{ fontSize: '0.85rem' }}>No ingredient transactions found</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: `linear-gradient(135deg, ${CREAM}, rgba(255,243,217,0.5))` }}>
                {['Date & Time', 'Ingredient', 'Type', 'Quantity', 'Stock Change', 'Reference', 'Created By'].map(col => (
                  <th key={col} style={{ padding: '13px 20px', textAlign: 'left',
                    fontSize: '0.68rem', fontWeight: 700, color: SAGE,
                    letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transactions.map((t, idx) => {
                const st = typeStyles[t.transaction_type] || typeStyles.adjustment;
                return (
                  <tr key={t.id} style={{ borderTop: idx === 0 ? 'none' : `1px solid rgba(242,237,228,0.8)` }}>
                    <td style={{ padding: '13px 20px', color: MUTED_GRAY, fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                      {t.created_at ? new Date(t.created_at).toLocaleString() : '—'}
                    </td>
                    <td style={{ padding: '13px 20px', whiteSpace: 'nowrap' }}>
                      <span style={{ fontWeight: 600, color: SAGE, fontSize: '0.85rem' }}>{t.ingredient?.name || '—'}</span>
                      {t.ingredient?.unit && (
                        <span style={{ marginLeft: 6, fontSize: '0.68rem', fontWeight: 500,
                          color: MUTED_GRAY, background: 'rgba(166,162,154,0.1)',
                          borderRadius: 4, padding: '1px 6px' }}>{t.ingredient.unit}</span>
                      )}
                    </td>
                    <td style={{ padding: '13px 20px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '3px 10px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600,
                        background: st.bg, color: st.color, border: `1px solid ${st.border}`, textTransform: 'capitalize' }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: st.color, display: 'inline-block' }} />
                        {t.transaction_type}
                      </span>
                    </td>
                    <td style={{ padding: '13px 20px', color: MUTED_GRAY, fontWeight: 500 }}>{t.quantity}</td>
                    <td style={{ padding: '13px 20px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
                        fontSize: '0.78rem', fontWeight: 600, padding: '2px 8px', borderRadius: 6,
                        background: t.new_stock > t.previous_stock ? 'rgba(52,196,104,0.08)' : 'rgba(239,68,68,0.07)',
                        color: t.new_stock > t.previous_stock ? '#1a7a3c' : '#c0392b' }}>
                        {t.previous_stock}<span style={{ opacity: 0.5, fontSize: '0.7rem' }}>→</span>{t.new_stock}
                      </span>
                    </td>
                    <td style={{ padding: '13px 20px', color: MUTED_GRAY, fontSize: '0.78rem' }}>
                      {t.reference_type ? (
                        <span style={{ background: 'rgba(79,95,82,0.06)', borderRadius: 6,
                          padding: '2px 8px', fontWeight: 500, color: SAGE }}>
                          {t.reference_type} #{t.reference_id}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '13px 20px', color: MUTED_GRAY, fontSize: '0.78rem', fontWeight: 500 }}>
                      {t.created_by?.first_name || 'System'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && pagination.totalItems > 0 && (
        <div style={{ padding: '0 24px 20px' }}>
          <PaginationControls
            currentPage={pagination.currentPage} totalPages={pagination.totalPages}
            onPageChange={onPageChange} perPage={pagination.perPage} onPerPageChange={onPerPageChange} />
        </div>
      )}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────
 * Main Reports component
 * ───────────────────────────────────────────────────────── */
export default function Reports() {
  // ─────────── SHARED FILTERS ───────────
  const [searchTerm, setSearchTerm]         = useState('');
  const [debouncedSearch, setDebounced]     = useState('');
  const [selectedYear, setSelectedYear]     = useState(2026);
  const [period, setPeriod]                 = useState('whole');
  const [selectedMonth, setSelectedMonth]   = useState(new Date().getMonth() + 1);
  const [selectedWeek, setSelectedWeek]     = useState('');
  const [selectedDay, setSelectedDay]       = useState('');
  const [selectedCashier, setSelectedCashier]   = useState('all');
  const [selectedDiscount, setSelectedDiscount] = useState('all');
  const [selectedOrderType, setSelectedOrderType] = useState('all');   
  const [activeTab, setActiveTab] = useState('sales'); // 'sales' | 'menu' | 'ingredient'


  // ─────────── CASHIERS ───────────
  const [cashiers, setCashiers]               = useState([]);
  const [cashiersLoading, setCashiersLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await axios.get('/admin/staff');
        if (cancelled) return;
        const list = res.data.users || res.data.staff || [];
        setCashiers(list.filter(u => u.is_active !== false));
      } catch (err) {
        console.error('Failed to load cashiers', err);
        setCashiers([]);
      } finally {
        if (!cancelled) setCashiersLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ─────────── SECTION-SPECIFIC FILTERS ───────────
  const [filterType, setFilterType]             = useState('all');
  const [menuFilter, setMenuFilter]             = useState('all');
  const [ingredientFilter, setIngredientFilter] = useState('all');

  // ─────────── SALES STATE ───────────
  const [summary, setSummary]                     = useState({ total_income: 0, total_transactions: 0, average_transaction: 0 });
  const [salesTransactions, setSalesTransactions] = useState([]);
  const [availableYears, setAvailableYears]       = useState([2026]);
  const [salesLoading, setSalesLoading]           = useState(true);
  const [salesError, setSalesError]               = useState(null);
  const [salesPage, setSalesPage]                 = useState(1);
  const [salesPerPage, setSalesPerPage]           = useState(20);
  const [salesTotalPages, setSalesTotalPages]     = useState(1);
  const [salesTotalItems, setSalesTotalItems]     = useState(0);

  // ─────────── MENU STATE ───────────
  const [menuTransactions, setMenuTransactions] = useState([]);
  const [menuLoading, setMenuLoading]           = useState(true);
  const [menuError, setMenuError]               = useState(null);
  const [menuPage, setMenuPage]                 = useState(1);
  const [menuPerPage, setMenuPerPage]           = useState(20);
  const [menuTotalPages, setMenuTotalPages]     = useState(1);
  const [menuTotalItems, setMenuTotalItems]     = useState(0);

  // ─────────── INGREDIENT STATE ───────────
  const [ingredientTransactions, setIngredientTransactions] = useState([]);
  const [ingredientLoading, setIngredientLoading]           = useState(true);
  const [ingredientError, setIngredientError]               = useState(null);
  const [ingredientPage, setIngredientPage]                 = useState(1);
  const [ingredientPerPage, setIngredientPerPage]           = useState(20);
  const [ingredientTotalPages, setIngredientTotalPages]     = useState(1);
  const [ingredientTotalItems, setIngredientTotalItems]     = useState(0);

  // ─────────── EXPORT STATE ───────────
  const [exporting, setExporting] = useState(false);

  const weekOptions = useMemo(() => getWeekOptions(selectedYear), [selectedYear]);

  useEffect(() => {
    if (weekOptions.length > 0 && !weekOptions.some(w => w.value === selectedWeek)) {
      setSelectedWeek(weekOptions[0].value);
    }
  }, [weekOptions]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(searchTerm);
      setSalesPage(1);
      setMenuPage(1);
      setIngredientPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const resetAllPages = () => { setSalesPage(1); setMenuPage(1); setIngredientPage(1); };

  const handleYearChange      = (v) => { setSelectedYear(v);     resetAllPages(); };
  const handlePeriodChange    = (v) => { setPeriod(v);           resetAllPages(); };
  const handleMonthChange     = (v) => { setSelectedMonth(v);    resetAllPages(); };
  const handleWeekChange      = (v) => { setSelectedWeek(v);     resetAllPages(); };
  const handleDayChange       = (v) => { setSelectedDay(v);      resetAllPages(); };
  const handleCashierChange   = (v) => { setSelectedCashier(v);  resetAllPages(); };
  const handleDiscountChange  = (v) => { setSelectedDiscount(v); setSalesPage(1); };
  const handleOrderTypeChange = (v) => { setSelectedOrderType(v); setSalesPage(1); };  // NEW

  const buildSharedParams = () => {
    const p = { year: selectedYear };
    if (debouncedSearch.trim()) p.search = debouncedSearch.trim();
    if (selectedCashier !== 'all') p.cashier_id = selectedCashier;
    if (selectedOrderType !== 'all') p.order_type_filter = selectedOrderType; 
    if (period === 'monthly') p.month = selectedMonth;
    if (period === 'weekly' && selectedWeek) {
      p.week_start = selectedWeek;
      if (selectedDay !== '') p.day_offset = selectedDay;
    }
    return p;
  };

  /* ───── SALES fetch ───── */
  const fetchSales = useCallback(async () => {
    setSalesLoading(true);
    try {
      const params = {
        ...buildSharedParams(),
        type: filterType,
        period,
        page: salesPage,
        per_page: salesPerPage,
      };
      if (selectedDiscount !== 'all') params.discount_filter = selectedDiscount;

      const res = await axios.get('/admin/reports', { params });
      setSummary(res.data.summary || { total_income: 0, total_transactions: 0, average_transaction: 0 });

      const paginator = res.data.transactions || {};
      const currentPage = paginator.current_page || 1;
      const lastPage    = paginator.last_page || 1;
      if (currentPage > lastPage) { setSalesPage(lastPage); return; }

      setSalesTransactions(Array.isArray(paginator.data) ? paginator.data : []);
      setSalesTotalPages(lastPage);
      setSalesTotalItems(paginator.total || 0);

      if (Array.isArray(res.data.available_years) && res.data.available_years.length > 0) {
        setAvailableYears(res.data.available_years);
      }
      setSalesError(null);
    } catch (err) {
      console.error('Sales fetch failed:', err);
      setSalesError(err.response?.data?.message || 'Failed to load sales');
      setSummary({ total_income: 0, total_transactions: 0, average_transaction: 0 });
      setSalesTransactions([]);
      setSalesTotalPages(1);
      setSalesTotalItems(0);
    } finally {
      setSalesLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType, selectedYear, period, selectedMonth, selectedWeek, selectedDay, selectedCashier, selectedDiscount, selectedOrderType, debouncedSearch, salesPage, salesPerPage]);

  useEffect(() => { fetchSales(); }, [fetchSales]);

  /* ───── MENU fetch ───── */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setMenuLoading(true);
      try {
        const params = {
          ...buildSharedParams(),
          page: menuPage,
          per_page: menuPerPage,
        };
        if (menuFilter !== 'all') params.type = menuFilter;

        const res = await axios.get('/admin/menu-transactions', { params });
        if (cancelled) return;
        const data = res.data.transactions || { data: [] };
        setMenuTransactions(data.data || []);
        setMenuTotalPages(data.last_page || 1);
        setMenuTotalItems(data.total || 0);
        setMenuError(null);
      } catch (err) {
        if (cancelled) return;
        setMenuError(err.response?.data?.message || 'Failed to load menu transactions');
        setMenuTransactions([]);
        setMenuTotalPages(1);
        setMenuTotalItems(0);
      } finally {
        if (!cancelled) setMenuLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuFilter, selectedYear, period, selectedMonth, selectedWeek, selectedDay, selectedCashier, selectedOrderType, debouncedSearch, menuPage, menuPerPage]);

  /* ───── INGREDIENT fetch ───── */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIngredientLoading(true);
      try {
        const params = {
          ...buildSharedParams(),
          page: ingredientPage,
          per_page: ingredientPerPage,
        };
        if (ingredientFilter !== 'all') params.type = ingredientFilter;

        const res = await axios.get('/inventory/ingredient-transactions', { params });
        if (cancelled) return;
        const data = res.data.transactions || { data: [] };
        setIngredientTransactions(data.data || []);
        setIngredientTotalPages(data.last_page || 1);
        setIngredientTotalItems(data.total || 0);
        setIngredientError(null);
      } catch (err) {
        if (cancelled) return;
        setIngredientError(err.response?.data?.message || 'Failed to load ingredient transactions');
        setIngredientTransactions([]);
        setIngredientTotalPages(1);
        setIngredientTotalItems(0);
      } finally {
        if (!cancelled) setIngredientLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ingredientFilter, selectedYear, period, selectedMonth, selectedWeek, selectedDay, selectedCashier, selectedOrderType, debouncedSearch, ingredientPage, ingredientPerPage]);

  // ─── Pagination handlers ───
  const handleSalesPageChange = (p) => { if (p < 1 || p > salesTotalPages) return; setSalesPage(p); };
  const handleSalesPerPageChange = (n) => { setSalesPerPage(n); setSalesPage(1); };

  const handleMenuPageChange = (p) => { if (p < 1 || p > menuTotalPages) return; setMenuPage(p); };
  const handleMenuPerPageChange = (n) => { setMenuPerPage(n); setMenuPage(1); };

  const handleIngredientPageChange = (p) => { if (p < 1 || p > ingredientTotalPages) return; setIngredientPage(p); };
  const handleIngredientPerPageChange = (n) => { setIngredientPerPage(n); setIngredientPage(1); };

  /* ───── PRINT ───── */
  const handlePrint = () => {
    // The @media print rules already hide every `.print-hide` element and
    // the layout chrome (sidebar + topbar). Nothing else to prepare — the
    // currently-rendered DOM is exactly what we want on paper.
    setTimeout(() => window.print(), 50);
  };

  /* ───── EXCEL EXPORT ─────
   * Re-fetches all three sections with the current filters applied and a
   * huge per_page so we get EVERY matching record (not just the visible
   * page). Then builds a real .xlsx workbook with three sheets.
   */
  const handleExportExcel = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const shared = buildSharedParams();

      const [salesRes, menuRes, ingRes] = await Promise.all([
        axios.get('/admin/reports', {
          params: {
            ...shared,
            type: filterType,
            period,
            page: 1,
            per_page: 10000,
            ...(selectedDiscount !== 'all' && { discount_filter: selectedDiscount }),
          },
        }),
        axios.get('/admin/menu-transactions', {
          params: {
            ...shared,
            page: 1,
            per_page: 10000,
            ...(menuFilter !== 'all' && { type: menuFilter }),
          },
        }),
        axios.get('/inventory/ingredient-transactions', {
          params: {
            ...shared,
            page: 1,
            per_page: 10000,
            ...(ingredientFilter !== 'all' && { type: ingredientFilter }),
          },
        }),
      ]);

      const salesRows = (salesRes.data.transactions?.data || []).map(t => ({
        'Order #':        t.order_number || '',
        'Date':           t.date || '',
        'Product':        t.product_name || '',
        'Category':       t.category_name || '',
        'Order Type':     t.order_type || '',
        'Quantity':       Number(t.quantity || 0),
        'Unit Price':     Number(t.unit_price || 0),
        'Line Total':     Number(t.line_total || 0),
        'Payment Status': t.payment_status || '',
        'Customer':       t.customer_name || '',
      }));

      const menuRows = (menuRes.data.transactions?.data || []).map(t => ({
        'Date & Time':   t.created_at || '',
        'SKU':           t.sku || '',
        'Product':       t.product_name || '',
        'Type':          t.type || '',
        'Past Stock':    t.past_stock ?? '',
        'Added Stock':   t.added_stock ?? '',
        'Current Stock': t.current_stock ?? '',
        'Qty Sold':      t.qty_sold ?? '',
      }));

      const ingRows = (ingRes.data.transactions?.data || []).map(t => ({
        'Date & Time':    t.created_at || '',
        'Ingredient':     t.ingredient?.name || '',
        'Unit':           t.ingredient?.unit || '',
        'Type':           t.transaction_type || '',
        'Quantity':       Number(t.quantity || 0),
        'Previous Stock': Number(t.previous_stock || 0),
        'New Stock':      Number(t.new_stock || 0),
        'Reference':      t.reference_type ? `${t.reference_type} #${t.reference_id}` : '',
        'Created By':     t.created_by?.first_name || 'System',
      }));

      const wb = XLSX.utils.book_new();

      // Sheet 1 — Sales
      const wsSales = salesRows.length
        ? XLSX.utils.json_to_sheet(salesRows)
        : XLSX.utils.aoa_to_sheet([['No sales records matched the current filters.']]);
      XLSX.utils.book_append_sheet(wb, wsSales, 'Sales Transactions');

      // Sheet 2 — Menu
      const wsMenu = menuRows.length
        ? XLSX.utils.json_to_sheet(menuRows)
        : XLSX.utils.aoa_to_sheet([['No menu transactions matched the current filters.']]);
      XLSX.utils.book_append_sheet(wb, wsMenu, 'Menu Transactions');

      // Sheet 3 — Ingredient
      const wsIng = ingRows.length
        ? XLSX.utils.json_to_sheet(ingRows)
        : XLSX.utils.aoa_to_sheet([['No ingredient transactions matched the current filters.']]);
      XLSX.utils.book_append_sheet(wb, wsIng, 'Ingredient Transactions');

      // Meaningful filename — includes year + optional month + generation date
      const now = new Date();
      const yy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const periodPart = `${selectedYear}${period === 'monthly' ? '-' + String(selectedMonth).padStart(2, '0') : ''}`;
      const filename = `Admin_Report_${periodPart}_${yy}${mm}${dd}.xlsx`;

      XLSX.writeFile(wb, filename);
    } catch (err) {
      console.error('Excel export failed:', err);
      alert('Failed to export Excel: ' + (err.response?.data?.message || err.message || 'Unknown error'));
    } finally {
      setExporting(false);
    }
  };

  const statCards = [
    { label: 'Total Income',        value: `₱${Number(summary.total_income || 0).toLocaleString()}`,           icon: TrendingUp },
    { label: 'Total Transactions',  value: summary.total_transactions || 0,                                    icon: Package    },
    { label: 'Average Transaction', value: `₱${Math.round(summary.average_transaction || 0).toLocaleString()}`, icon: DollarSign },
  ];

  // Human-readable period label used in the print header
  const printPeriodLabel = useMemo(() => {
    if (period === 'monthly') {
      const m = MONTHS.find(x => x.value === selectedMonth);
      return `${m?.label || ''} ${selectedYear}`;
    }
    if (period === 'weekly' && selectedWeek) {
      const w = weekOptions.find(x => x.value === selectedWeek);
      return w ? `${w.label}, ${selectedYear}` : `${selectedWeek}, ${selectedYear}`;
    }
    return `Whole Year ${selectedYear}`;
  }, [period, selectedMonth, selectedYear, selectedWeek, weekOptions]);

  return (
    <div className="reports-root" style={{ background: CREAM, minHeight: '100vh', padding: '36px 28px' }}>
      <style>{`
        .grain-overlay { position: fixed; inset: 0; pointer-events: none; z-index: 0; opacity: 0.028;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
          background-repeat: repeat; background-size: 128px; }
        .divider-line { height: 1px; background: linear-gradient(90deg, transparent, rgba(79,95,82,0.15), transparent); }
        .stat-card { transition: box-shadow 0.3s ease, transform 0.3s ease; }
        .stat-card:hover { transform: translateY(-5px); box-shadow: 0 16px 36px rgba(79,95,82,0.14) !important; }
        .filter-input { transition: all 0.2s ease; outline: none; }
        .filter-input:focus { box-shadow: 0 0 0 3px rgba(79,95,82,0.12); border-color: #4F5F52 !important; }
        .txn-row { transition: background 0.15s ease; }
        .txn-row:hover { background: rgba(242,237,228,0.55) !important; }

        /* Hide inner scrollbars (kept from earlier fix) */
        .reports-root, .reports-root * { scrollbar-width: none; -ms-overflow-style: none; }
        .reports-root *::-webkit-scrollbar { width: 0; height: 0; display: none; }

        /* ───── Header action buttons ───── */
        .action-btn-lg {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 9px 16px; border-radius: 12px;
          font-size: 0.82rem; font-weight: 600;
          border: 1.5px solid rgba(79,95,82,0.2);
          background: #fff; color: ${SAGE};
          cursor: pointer; transition: all 0.18s ease;
        }
        .action-btn-lg:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(79,95,82,0.12); background: #fff; }
        .action-btn-lg:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }
        .action-btn-lg.primary {
          background: linear-gradient(135deg, ${SAGE}, #3e4c42);
          color: #fff; border-color: transparent;
        }
        .action-btn-lg.primary:hover { box-shadow: 0 6px 18px rgba(79,95,82,0.35); }

        /* ───── Print-only header ───── */
        .print-header { display: none; }

        /* ───── @media print ───── */
        @media print {
          @page { size: A4; margin: 12mm; }

          /* Hide app chrome */
          aside,
          header { display: none !important; }

          /* Flatten the flex layout so <main> becomes the sole content */
          .flex.h-screen        { display: block !important; height: auto !important; overflow: visible !important; }
          .flex-1.flex.flex-col { display: block !important; overflow: visible !important; }
          main                  { overflow: visible !important; height: auto !important; padding: 0 !important; background: #fff !important; }

          /* Hide interactive/report-chrome elements */
          .print-hide { display: none !important; }

          /* Remove shadows/borders for cleaner print */
          .stat-card,
          .reports-root > div > div,
          .report-section { box-shadow: none !important; border-color: rgba(0,0,0,0.1) !important; }
          .reports-root { padding: 0 !important; background: #fff !important; }

          /* Show print-only header */
          .print-header {
            display: block !important;
            margin-bottom: 12px;
            padding-bottom: 10px;
            border-bottom: 2px solid ${SAGE};
          }
          .print-header h1 { font-size: 20pt; color: #000 !important; margin: 0 0 4px 0; }
          .print-header .meta { font-size: 10pt; color: #333 !important; margin: 2px 0; }

          /* Keep transaction rows from splitting across pages */
          .txn-row,
          tr { break-inside: avoid; page-break-inside: avoid; }

          /* Table header row repeat on page breaks (modern browsers) */
          thead { display: table-header-group; }

          /* Colors — force dark text on light background */
          body, html { background: #fff !important; }
          * { color: #000 !important; }
        }
      `}</style>
      <div className="grain-overlay print-hide" />

      {/* ── Print-only header (invisible on screen) ── */}
      <div className="print-header">
        <h1>North Cakes — Admin Reports</h1>
        <p className="meta"><strong>Report Period:</strong> {printPeriodLabel}</p>
        <p className="meta"><strong>Generated:</strong> {new Date().toLocaleString()}</p>
        <p className="meta">
          <strong>Filters:</strong>{' '}
          Cashier: {selectedCashier === 'all' ? 'All' : (cashiers.find(c => String(c.id) === String(selectedCashier))?.first_name + ' ' + (cashiers.find(c => String(c.id) === String(selectedCashier))?.last_name || ''))}
          {' · '}
          Discount: {selectedDiscount === 'all' ? 'All' : selectedDiscount === 'pwd' ? 'PWD' : 'Senior Citizen'}
          {' · '}
          Sales Type: {filterType === 'all' ? 'All Sales Reports' : filterType}
          {' · '}
          Search: {debouncedSearch.trim() || 'None'}
          {' · '}
          Menu Type: {menuFilter === 'all' ? 'All Menu Transactions' : menuFilter}
          {' · '}
          Ingredient Type: {ingredientFilter === 'all' ? 'All Ingredient Transactions' : ingredientFilter}
        </p>
      </div>

      <div className="max-w-7xl mx-auto relative" style={{ zIndex: 1 }}>
        {/* ── Header with Print / Export buttons ── */}
        <motion.div variants={fadeInUp} initial="hidden" animate="visible"
          style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ width: 36, height: 36,
              background: `linear-gradient(135deg, ${SAGE}, #3e4c42)`, borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(79,95,82,0.25)', flexShrink: 0, marginTop: 2 }}>
              <FileText size={18} color="#fff" />
            </div>
            <div>
              <h1 style={{ color: SAGE, fontSize: '1.55rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Reports</h1>
              <p style={{ color: MUTED_GRAY, fontSize: '0.82rem', letterSpacing: '0.03em' }}>
                Sales, menu stock movements, and ingredient stock movements
              </p>
            </div>
          </div>

          <div className="print-hide" style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              className="action-btn-lg"
              onClick={handlePrint}
              title="Print the current report"
            >
              <Printer size={16} />
              Print
            </button>
            <button
              type="button"
              className="action-btn-lg primary"
              onClick={handleExportExcel}
              disabled={exporting}
              title="Download all filtered transactions as Excel"
            >
              {exporting ? <Loader size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
              {exporting ? 'Exporting…' : 'Export Excel'}
            </button>
          </div>
        </motion.div>

        <div className="divider-line print-hide" style={{ marginBottom: 28 }} />

        {/* Stat cards */}
        <motion.div variants={fadeInUp} initial="hidden" animate="visible"
          className="grid grid-cols-1 md:grid-cols-3 gap-5" style={{ marginBottom: 24 }}>
          {statCards.map(({ label, value, icon: Icon }) => (
            <div key={label} className="stat-card" style={{
              background: '#fff', borderRadius: 20,
              border: '1.5px solid rgba(242,237,228,0.9)',
              boxShadow: '0 2px 12px rgba(79,95,82,0.06)',
              padding: '22px 22px 18px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                background: `linear-gradient(90deg, ${SAGE}, #3e4c42)` }} />
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ color: MUTED_GRAY, fontSize: '0.75rem', fontWeight: 500,
                    letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8 }}>{label}</p>
                  <p style={{ color: SAGE, fontSize: '2rem', fontWeight: 800,
                    letterSpacing: '-0.03em', lineHeight: 1 }}>{value}</p>
                </div>
                <div style={{ width: 44, height: 44, borderRadius: 14,
                  background: 'linear-gradient(135deg, rgba(79,95,82,0.12), rgba(79,95,82,0.06))',
                  border: '1.5px solid rgba(79,95,82,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={20} style={{ color: SAGE }} />
                </div>
              </div>
            </div>
          ))}
        </motion.div>

        {/* ─────────── MAIN FILTER BAR (hidden on print) ─────────── */}
        <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="print-hide" style={{
          background: '#fff', borderRadius: 20,
          border: '1.5px solid rgba(242,237,228,0.9)',
          boxShadow: '0 2px 12px rgba(79,95,82,0.06)',
          padding: '20px 24px', marginBottom: 24,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
            <SlidersHorizontal size={13} style={{ color: MUTED_GRAY }} />
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: MUTED_GRAY,
              letterSpacing: '0.08em', textTransform: 'uppercase' }}>Sales Filters</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" style={{ marginBottom: 20 }}>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 11, top: '50%',
                transform: 'translateY(-50%)', color: MUTED_GRAY, pointerEvents: 'none' }} />
              <input type="text"
                placeholder={
                  filterType === 'category' ? 'Search category…'
                  : filterType === 'product' ? 'Search product…'
                  : 'Search product or category…'
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="filter-input w-full rounded-xl border text-sm"
                style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa',
                  padding: '9px 12px 9px 32px' }} />
            </div>

            {/* Cashier */}
            <div style={{ position: 'relative' }}>
              <UserCheck size={14} style={{ position: 'absolute', left: 11, top: '50%',
                transform: 'translateY(-50%)', color: MUTED_GRAY, pointerEvents: 'none' }} />
              <select value={selectedCashier} onChange={(e) => handleCashierChange(e.target.value)}
                disabled={cashiersLoading}
                className="filter-input w-full rounded-xl border text-sm appearance-none"
                style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa',
                  padding: '9px 32px 9px 32px', cursor: cashiersLoading ? 'wait' : 'pointer' }}>
                <option value="all">{cashiersLoading ? 'Loading cashiers…' : 'All Cashiers'}</option>
                {cashiers.map(c => (
                  <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                ))}
              </select>
              <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%',
                transform: 'translateY(-50%)', color: MUTED_GRAY, pointerEvents: 'none' }} />
            </div>

            {/* Discount */}
            <div style={{ position: 'relative' }}>
              <Percent size={14} style={{ position: 'absolute', left: 11, top: '50%',
                transform: 'translateY(-50%)', color: MUTED_GRAY, pointerEvents: 'none' }} />
              <select value={selectedDiscount} onChange={(e) => handleDiscountChange(e.target.value)}
                className="filter-input w-full rounded-xl border text-sm appearance-none"
                style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa',
                  padding: '9px 32px 9px 32px' }}>
                <option value="all">All Discounts</option>
                <option value="pwd">PWD</option>
                <option value="senior_citizen">Senior Citizen</option>
              </select>
              <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%',
                transform: 'translateY(-50%)', color: MUTED_GRAY, pointerEvents: 'none' }} />
            </div>

            {/* Sales Report Type */}
            <div style={{ position: 'relative' }}>
              <Filter size={14} style={{ position: 'absolute', left: 11, top: '50%',
                transform: 'translateY(-50%)', color: MUTED_GRAY, pointerEvents: 'none' }} />
              <select value={filterType} onChange={(e) => { setFilterType(e.target.value); setSalesPage(1); }}
                className="filter-input w-full rounded-xl border text-sm appearance-none"
                style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa',
                  padding: '9px 32px 9px 32px' }}>
                <option value="all">All Sales Reports</option>
                <option value="daily">Daily Sales</option>
                <option value="product">Product Sales</option>
                <option value="category">Category Sales</option>
              </select>
              <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%',
                transform: 'translateY(-50%)', color: MUTED_GRAY, pointerEvents: 'none' }} />
            </div>


            {/* Order Type Filter */}
            <div style={{ position: 'relative' }}>
              <ShoppingBag size={14} style={{ position: 'absolute', left: 11, top: '50%',
                transform: 'translateY(-50%)', color: MUTED_GRAY, pointerEvents: 'none' }} />
              <select value={selectedOrderType} onChange={(e) => handleOrderTypeChange(e.target.value)}
                className="filter-input w-full rounded-xl border text-sm appearance-none"
                style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa',
                  padding: '9px 32px 9px 32px' }}>
                <option value="all">All Orders</option>
                <option value="walk_in">Walk-In Orders</option>
                <option value="online">Online Orders</option>
                <option value="custom_cake">Custom Cake Orders</option>
              </select>
              <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%',
                transform: 'translateY(-50%)', color: MUTED_GRAY, pointerEvents: 'none' }} />
            </div>

            {/* Year */}
            <div style={{ position: 'relative' }}>
              <Calendar size={14} style={{ position: 'absolute', left: 11, top: '50%',
                transform: 'translateY(-50%)', color: MUTED_GRAY, pointerEvents: 'none' }} />
              <select value={selectedYear} onChange={(e) => handleYearChange(Number(e.target.value))}
                className="filter-input w-full rounded-xl border text-sm appearance-none"
                style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa',
                  padding: '9px 32px 9px 32px' }}>
                {availableYears.map(y => (<option key={y} value={y}>{y}</option>))}
              </select>
              <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%',
                transform: 'translateY(-50%)', color: MUTED_GRAY, pointerEvents: 'none' }} />
            </div>

            {/* Period */}
            <div style={{ position: 'relative' }}>
              <select value={period} onChange={(e) => handlePeriodChange(e.target.value)}
                className="filter-input w-full rounded-xl border text-sm appearance-none"
                style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa',
                  padding: '9px 32px 9px 14px' }}>
                <option value="whole">Whole Year</option>
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
              </select>
              <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%',
                transform: 'translateY(-50%)', color: MUTED_GRAY, pointerEvents: 'none' }} />
            </div>

            {period === 'monthly' && (
              <div style={{ position: 'relative' }}>
                <select value={selectedMonth} onChange={(e) => handleMonthChange(Number(e.target.value))}
                  className="filter-input w-full rounded-xl border text-sm appearance-none"
                  style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa',
                    padding: '9px 32px 9px 14px' }}>
                  {MONTHS.map(m => (<option key={m.value} value={m.value}>{m.label}</option>))}
                </select>
                <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%',
                  transform: 'translateY(-50%)', color: MUTED_GRAY, pointerEvents: 'none' }} />
              </div>
            )}

            {period === 'weekly' && (
              <>
                <div style={{ position: 'relative' }}>
                  <select value={selectedWeek} onChange={(e) => handleWeekChange(e.target.value)}
                    className="filter-input w-full rounded-xl border text-sm appearance-none"
                    style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa',
                      padding: '9px 32px 9px 14px' }}>
                    {weekOptions.map(w => (<option key={w.value} value={w.value}>{w.label}</option>))}
                  </select>
                  <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%',
                    transform: 'translateY(-50%)', color: MUTED_GRAY, pointerEvents: 'none' }} />
                </div>

                <div style={{ position: 'relative' }}>
                  <select value={selectedDay} onChange={(e) => handleDayChange(e.target.value)}
                    className="filter-input w-full rounded-xl border text-sm appearance-none"
                    style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa',
                      padding: '9px 32px 9px 14px' }}>
                    <option value="">All Days</option>
                    {DAYS.map(d => (<option key={d.value} value={d.value}>{d.label}</option>))}
                  </select>
                  <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%',
                    transform: 'translateY(-50%)', color: MUTED_GRAY, pointerEvents: 'none' }} />
                </div>
              </>
            )}
          </div>

          <div className="divider-line" style={{ margin: '4px 0 16px' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
            <Box size={13} style={{ color: MUTED_GRAY }} />
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: MUTED_GRAY,
              letterSpacing: '0.08em', textTransform: 'uppercase' }}>Inventory Transaction Filters</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 600,
                color: SAGE, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6 }}>
                Menu Transaction Type
              </label>
              <div style={{ position: 'relative' }}>
                <select value={menuFilter} onChange={(e) => { setMenuFilter(e.target.value); setMenuPage(1); }}
                  className="filter-input w-full rounded-xl border text-sm appearance-none"
                  style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa',
                    padding: '9px 32px 9px 14px' }}>
                  <option value="all">All Menu Transactions</option>
                  <option value="stock_in">Stock-In</option>
                  <option value="stock_out">Stock-Out</option>
                  <option value="sold">Sold</option>
                </select>
                <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%',
                  transform: 'translateY(-50%)', color: MUTED_GRAY, pointerEvents: 'none' }} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 600,
                color: SAGE, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6 }}>
                Ingredient Transaction Type
              </label>
              <div style={{ position: 'relative' }}>
                <select value={ingredientFilter} onChange={(e) => { setIngredientFilter(e.target.value); setIngredientPage(1); }}
                  className="filter-input w-full rounded-xl border text-sm appearance-none"
                  style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa',
                    padding: '9px 32px 9px 14px' }}>
                  <option value="all">All Ingredient Transactions</option>
                  <option value="purchase">Purchase</option>
                  <option value="usage">Usage</option>
                  <option value="adjustment">Adjustment</option>
                </select>
                <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%',
                  transform: 'translateY(-50%)', color: MUTED_GRAY, pointerEvents: 'none' }} />
              </div>
            </div>
          </div>
        </motion.div>


        {/* ─── Transaction Tabs ─── */}
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          className="print-hide"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            marginBottom: 20,
          }}
        >
          {[
            { key: 'sales',      label: 'Sales Transactions'      },
            { key: 'menu',       label: 'Menu Transactions'       },
            { key: 'ingredient', label: 'Ingredient Transactions' },
          ].map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '11px 22px',
                  borderRadius: 12,
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  border: isActive ? '1.5px solid transparent' : '1.5px solid rgba(166,162,154,0.3)',
                  background: isActive
                    ? `linear-gradient(135deg, ${SAGE}, #3e4c42)`
                    : '#fff',
                  color: isActive ? '#fff' : SAGE,
                  boxShadow: isActive
                    ? '0 4px 14px rgba(79,95,82,0.28)'
                    : '0 2px 8px rgba(79,95,82,0.06)',
                  letterSpacing: '-0.01em',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </motion.div>

        {/* 1. Sales Section — visible only when Sales tab is active */}
        {activeTab === 'sales' && (
          <SalesTransactionsSection
            transactions={salesTransactions}
            loading={salesLoading}
            error={salesError}
            summary={summary}
            pagination={{
              currentPage: salesPage, totalPages: salesTotalPages,
              perPage: salesPerPage, totalItems: salesTotalItems,
            }}
            onPageChange={handleSalesPageChange}
            onPerPageChange={handleSalesPerPageChange}
          />
        )}

        {/* 2. Menu Section — visible only when Menu tab is active */}
        {activeTab === 'menu' && (
          <MenuTransactionsSection
            transactions={menuTransactions}
            loading={menuLoading}
            error={menuError}
            pagination={{
              currentPage: menuPage, totalPages: menuTotalPages,
              perPage: menuPerPage, totalItems: menuTotalItems,
            }}
            onPageChange={handleMenuPageChange}
            onPerPageChange={handleMenuPerPageChange}
          />
        )}

        {/* 3. Ingredient Section — visible only when Ingredient tab is active */}
        {activeTab === 'ingredient' && (
          <IngredientTransactionsSection
            transactions={ingredientTransactions}
            loading={ingredientLoading}
            error={ingredientError}
            pagination={{
              currentPage: ingredientPage, totalPages: ingredientTotalPages,
              perPage: ingredientPerPage, totalItems: ingredientTotalItems,
            }}
            onPageChange={handleIngredientPageChange}
            onPerPageChange={handleIngredientPerPageChange}
          />
        )}
      </div>
    </div>
  );
}