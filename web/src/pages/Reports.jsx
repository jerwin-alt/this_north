import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Filter, Calendar, Download, ChevronDown,
  TrendingUp, DollarSign, Package, FileText, SlidersHorizontal
} from 'lucide-react';

// Color palette
const SAGE = '#4F5F52';
const CREAM = '#F2EDE4';
const MUTED_GRAY = '#A6A29A';
const SOFT_WHITE = '#FFF3D9';

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } }
};

const allTransactions = [
  { id: 1,  date: '2024-03-30', company: 'Walk-in Customer',      amount: 28450,  invoiceValue: 28450,  afterTax: 25605,  status: 'paid',    invoiceNo: 'INV-001', type: 'Daily Sales'   },
  { id: 2,  date: '2024-03-29', company: 'Various Customers',     amount: 34100,  invoiceValue: 34100,  afterTax: 30690,  status: 'paid',    invoiceNo: 'INV-002', type: 'Daily Sales'   },
  { id: 3,  date: '2024-03-28', company: 'Various Customers',     amount: 26800,  invoiceValue: 26800,  afterTax: 24120,  status: 'paid',    invoiceNo: 'INV-003', type: 'Daily Sales'   },
  { id: 4,  date: '2024-03-27', company: 'Wedding Event',         amount: 31200,  invoiceValue: 31200,  afterTax: 28080,  status: 'paid',    invoiceNo: 'INV-004', type: 'Daily Sales'   },
  { id: 5,  date: '2024-03-26', company: 'Various Customers',     amount: 15600,  invoiceValue: 15600,  afterTax: 14040,  status: 'paid',    invoiceNo: 'INV-005', type: 'Daily Sales'   },
  { id: 6,  date: '2024-03-30', company: 'Classic Birthday Cake', amount: 27000,  invoiceValue: 27000,  afterTax: 24300,  status: 'paid',    invoiceNo: 'INV-006', type: 'Product Sale'  },
  { id: 7,  date: '2024-03-29', company: 'Elegant Wedding Cake',  amount: 75000,  invoiceValue: 75000,  afterTax: 67500,  status: 'paid',    invoiceNo: 'INV-007', type: 'Product Sale'  },
  { id: 8,  date: '2024-03-28', company: 'Assorted Cupcakes',     amount: 14400,  invoiceValue: 14400,  afterTax: 12960,  status: 'paid',    invoiceNo: 'INV-008', type: 'Product Sale'  },
  { id: 9,  date: '2024-03-15', company: 'Birthday Cakes',        amount: 156000, invoiceValue: 156000, afterTax: 140400, status: 'paid',    invoiceNo: 'INV-009', type: 'Category Sale' },
  { id: 10, date: '2024-03-10', company: 'Wedding Cakes',         amount: 189000, invoiceValue: 189000, afterTax: 170100, status: 'paid',    invoiceNo: 'INV-010', type: 'Category Sale' },
  { id: 11, date: '2024-03-05', company: 'Custom Cakes',          amount: 124000, invoiceValue: 124000, afterTax: 111600, status: 'pending', invoiceNo: 'INV-011', type: 'Category Sale' },
  { id: 12, date: '2024-03-20', company: 'Coffee Sales',          amount: 45200,  invoiceValue: 45200,  afterTax: 40680,  status: 'paid',    invoiceNo: 'INV-012', type: 'Category Sale' },
];

const yearlyTransactions = [
  { id: 13, date: '2024-02-20', company: 'Birthday Cakes', amount: 212000, invoiceValue: 212000, afterTax: 190800, status: 'paid',    invoiceNo: 'INV-013', type: 'Standard Cakes' },
  { id: 14, date: '2024-02-14', company: 'Custom Cakes',   amount: 313000, invoiceValue: 313000, afterTax: 281700, status: 'paid',    invoiceNo: 'INV-014', type: 'Custom Cakes'   },
  { id: 15, date: '2024-02-10', company: 'Other Products', amount: 129200, invoiceValue: 129200, afterTax: 116280, status: 'pending', invoiceNo: 'INV-015', type: 'Other Products' },
];

function TransactionSection({ title, transactions, count }) {
  return (
    <motion.div
      variants={fadeInUp} initial="hidden" animate="visible"
      style={{
        background: '#fff',
        borderRadius: 20,
        border: '1.5px solid rgba(242,237,228,0.9)',
        boxShadow: '0 2px 12px rgba(79,95,82,0.06)',
        overflow: 'hidden',
      }}
    >
      {/* Section header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '16px 24px',
        borderBottom: `1px solid ${CREAM}`,
        background: `linear-gradient(135deg, ${CREAM}, rgba(255,243,217,0.5))`,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: `linear-gradient(135deg, ${SAGE}, #3e4c42)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(79,95,82,0.2)',
        }}>
          <FileText size={13} color="#fff" />
        </div>
        <h2 style={{ color: SAGE, fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.01em' }}>
          {title}
        </h2>
        {count > 0 && (
          <span style={{
            fontSize: '0.65rem', fontWeight: 600, color: MUTED_GRAY,
            background: 'rgba(166,162,154,0.12)', border: '1px solid rgba(166,162,154,0.2)',
            borderRadius: 999, padding: '2px 8px',
          }}>
            {count} record{count !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {transactions.length === 0 ? (
        <div style={{ padding: '48px 24px', textAlign: 'center', color: MUTED_GRAY }}>
          <div style={{
            width: 52, height: 52, background: 'rgba(166,162,154,0.1)', borderRadius: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px', border: '1.5px dashed rgba(166,162,154,0.3)',
          }}>
            <FileText size={22} style={{ color: MUTED_GRAY, opacity: 0.4 }} />
          </div>
          <p style={{ fontSize: '0.85rem' }}>No transactions found</p>
        </div>
      ) : (
        transactions.map((t, idx) => (
          <div
            key={t.id}
            className="txn-row"
            style={{ borderTop: idx === 0 ? 'none' : `1px solid rgba(242,237,228,0.8)` }}
          >
            <div style={{ padding: '18px 24px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>

                {/* Invoice info */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, minWidth: 160 }}>
                  <button className="download-btn" style={{
                    width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                    background: 'rgba(79,95,82,0.07)', border: '1px solid rgba(79,95,82,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  }}>
                    <Download size={15} style={{ color: SAGE }} />
                  </button>
                  <div>
                    <p style={{ fontSize: '0.78rem', fontFamily: 'monospace', fontWeight: 700, color: SAGE, letterSpacing: '0.02em' }}>
                      {t.invoiceNo}
                    </p>
                    <p style={{ fontSize: '0.7rem', color: MUTED_GRAY, marginTop: 2 }}>{t.date}</p>
                  </div>
                </div>

                {/* Company + type badge */}
                <div style={{ flex: 1, minWidth: 140 }}>
                  <p style={{ fontWeight: 700, fontSize: '0.95rem', color: SAGE, letterSpacing: '-0.01em' }}>
                    {t.company}
                  </p>
                  <span style={{
                    display: 'inline-block', marginTop: 5,
                    fontSize: '0.65rem', fontWeight: 600,
                    background: 'rgba(79,95,82,0.07)', color: SAGE,
                    borderRadius: 5, padding: '2px 8px', letterSpacing: '0.03em',
                  }}>
                    {t.type}
                  </span>
                </div>

                {/* Amounts + status */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontSize: '1.35rem', fontWeight: 800, color: SAGE, letterSpacing: '-0.03em', lineHeight: 1 }}>
                    ₱{t.amount.toLocaleString()}
                  </p>
                  <p style={{ fontSize: '0.65rem', color: MUTED_GRAY, marginTop: 2 }}>Invoice value</p>
                  <p style={{ fontSize: '0.85rem', fontWeight: 700, color: SAGE, marginTop: 6, letterSpacing: '-0.01em' }}>
                    ₱{t.afterTax.toLocaleString()}
                  </p>
                  <p style={{ fontSize: '0.65rem', color: MUTED_GRAY, marginTop: 1 }}>After tax</p>
                  <div style={{ marginTop: 8 }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '3px 9px', borderRadius: 999, fontSize: '0.65rem', fontWeight: 600,
                      background: t.status === 'paid' ? 'rgba(52,196,104,0.1)' : 'rgba(212,160,61,0.1)',
                      color: t.status === 'paid' ? '#1a7a3c' : '#92670a',
                      border: `1px solid ${t.status === 'paid' ? 'rgba(52,196,104,0.2)' : 'rgba(212,160,61,0.2)'}`,
                    }}>
                      <span style={{
                        width: 5, height: 5, borderRadius: '50%',
                        background: t.status === 'paid' ? '#34c468' : '#D4A03D',
                        display: 'inline-block',
                      }} />
                      {t.status === 'paid' ? 'Paid' : 'Pending'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer row */}
            <div style={{
              padding: '10px 24px', borderTop: `1px solid rgba(242,237,228,0.9)`,
              background: 'rgba(242,237,228,0.35)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <button className="fix-btn" style={{
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: '0.78rem', fontWeight: 600, color: SAGE,
                background: 'transparent', border: 'none', cursor: 'pointer',
              }}>
                <span style={{ fontSize: '0.9rem', lineHeight: 1 }}>+</span> Fix payment
                <ChevronDown size={13} style={{ color: MUTED_GRAY }} />
              </button>
              {t.status === 'paid' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: '0.72rem', color: MUTED_GRAY, fontWeight: 500 }}>Paid: {t.date}</span>
                  <ChevronDown size={13} style={{ color: MUTED_GRAY }} />
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </motion.div>
  );
}

export default function Reports() {
  const [searchTerm,  setSearchTerm]  = useState('');
  const [filterType,  setFilterType]  = useState('all');
  const [dateRange,   setDateRange]   = useState('2024');
  const [timePeriod,  setTimePeriod]  = useState('whole');

  const filteredTransactions = allTransactions.filter(t =>
    (filterType === 'all' || t.type === filterType) &&
    (t.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
     t.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredYearly = yearlyTransactions.filter(t =>
    t.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalIncome       = allTransactions.reduce((sum, t) => sum + t.amount, 0);
  const totalTransactions = allTransactions.length + yearlyTransactions.length;
  const avgTransaction    = totalIncome / allTransactions.length;

  return (
    <div style={{ background: CREAM, minHeight: '100vh', padding: '36px 28px' }}>
      <style>{`
        .grain-overlay {
          position: fixed; inset: 0; pointer-events: none; z-index: 0; opacity: 0.028;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
          background-repeat: repeat; background-size: 128px;
        }
        .divider-line {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(79,95,82,0.15), transparent);
        }
        .stat-card { transition: box-shadow 0.3s ease, transform 0.3s ease; }
        .stat-card:hover { transform: translateY(-5px); box-shadow: 0 16px 36px rgba(79,95,82,0.14) !important; }
        .filter-input { transition: all 0.2s ease; outline: none; }
        .filter-input:focus { box-shadow: 0 0 0 3px rgba(79,95,82,0.12); border-color: #4F5F52 !important; }
        .txn-row { transition: background 0.15s ease; }
        .txn-row:hover { background: rgba(242,237,228,0.55) !important; }
        .download-btn { transition: all 0.18s ease; }
        .download-btn:hover { background: rgba(79,95,82,0.14) !important; transform: scale(1.08); }
        .fix-btn { transition: all 0.18s ease; border-radius: 8px; padding: 3px 10px; }
        .fix-btn:hover { background: rgba(79,95,82,0.08); }
      `}</style>

      <div className="grain-overlay" />

      <div className="max-w-7xl mx-auto relative" style={{ zIndex: 1 }}>

        {/* ── Header ── */}
        <motion.div variants={fadeInUp} initial="hidden" animate="visible"
          style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 32 }}
        >
          <div style={{
            width: 36, height: 36,
            background: `linear-gradient(135deg, ${SAGE}, #3e4c42)`,
            borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(79,95,82,0.25)',
            flexShrink: 0, marginTop: 2,
          }}>
            <FileText size={18} color="#fff" />
          </div>
          <div>
            <h1 style={{ color: SAGE, fontSize: '1.55rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
              Financial Reports
            </h1>
            <p style={{ color: MUTED_GRAY, fontSize: '0.82rem', letterSpacing: '0.03em' }}>
              Track income, sales, and transactions
            </p>
          </div>
        </motion.div>

        <div className="divider-line" style={{ marginBottom: 28 }} />

        {/* ── Stat Cards ── */}
        <motion.div variants={fadeInUp} initial="hidden" animate="visible"
          className="grid grid-cols-1 md:grid-cols-3 gap-5"
          style={{ marginBottom: 28 }}
        >
          {[
            { label: 'Total Income',        value: `₱${totalIncome.toLocaleString()}`,               icon: TrendingUp },
            { label: 'Total Transactions',  value: totalTransactions,                                  icon: Package    },
            { label: 'Average Transaction', value: `₱${Math.round(avgTransaction).toLocaleString()}`, icon: DollarSign },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="stat-card" style={{
              background: '#fff', borderRadius: 20,
              border: '1.5px solid rgba(242,237,228,0.9)',
              boxShadow: '0 2px 12px rgba(79,95,82,0.06)',
              padding: '22px 22px 18px', position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${SAGE}, #3e4c42)` }} />
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ color: MUTED_GRAY, fontSize: '0.75rem', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8 }}>
                    {label}
                  </p>
                  <p style={{ color: SAGE, fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1 }}>
                    {value}
                  </p>
                </div>
                <div style={{
                  width: 44, height: 44, borderRadius: 14,
                  background: 'linear-gradient(135deg, rgba(79,95,82,0.12), rgba(79,95,82,0.06))',
                  border: '1.5px solid rgba(79,95,82,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Icon size={20} style={{ color: SAGE }} />
                </div>
              </div>
            </div>
          ))}
        </motion.div>

        {/* ── Filters ── */}
        <motion.div variants={fadeInUp} initial="hidden" animate="visible" style={{
          background: '#fff', borderRadius: 20,
          border: '1.5px solid rgba(242,237,228,0.9)',
          boxShadow: '0 2px 12px rgba(79,95,82,0.06)',
          padding: '20px 24px', marginBottom: 28,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
            <SlidersHorizontal size={13} style={{ color: MUTED_GRAY }} />
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: MUTED_GRAY, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Filter Reports
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: MUTED_GRAY, pointerEvents: 'none' }} />
              <input
                type="text" placeholder="Search by company or invoice…"
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                className="filter-input w-full rounded-xl border text-sm"
                style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa', padding: '9px 12px 9px 32px' }}
              />
            </div>
            {/* Type filter */}
            <div style={{ position: 'relative' }}>
              <Filter size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: MUTED_GRAY, pointerEvents: 'none' }} />
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
                className="filter-input w-full rounded-xl border text-sm appearance-none"
                style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa', padding: '9px 32px 9px 32px' }}
              >
                <option value="all">All Types</option>
                <option value="Daily Sales">Daily Sales</option>
                <option value="Product Sale">Product Sales</option>
                <option value="Category Sale">Category Sales</option>
              </select>
              <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: MUTED_GRAY, pointerEvents: 'none' }} />
            </div>
            {/* Date range */}
            <div style={{ position: 'relative' }}>
              <Calendar size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: MUTED_GRAY, pointerEvents: 'none' }} />
              <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}
                className="filter-input w-full rounded-xl border text-sm appearance-none"
                style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa', padding: '9px 32px 9px 32px' }}
              >
                <option value="2024">2024 y.</option>
                <option value="2023">2023 y.</option>
                <option value="2022">2022 y.</option>
              </select>
              <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: MUTED_GRAY, pointerEvents: 'none' }} />
            </div>
            {/* Time period */}
            <div style={{ position: 'relative' }}>
              <select value={timePeriod} onChange={(e) => setTimePeriod(e.target.value)}
                className="filter-input w-full rounded-xl border text-sm appearance-none"
                style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa', padding: '9px 32px 9px 14px' }}
              >
                <option value="whole">Whole period</option>
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
              </select>
              <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: MUTED_GRAY, pointerEvents: 'none' }} />
            </div>
          </div>
        </motion.div>

        {/* ── Transaction Sections ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <TransactionSection title="Activity Income"        transactions={filteredTransactions} count={filteredTransactions.length} />
          <TransactionSection title={`${dateRange} Summary`} transactions={filteredYearly}       count={filteredYearly.length} />
        </div>
      </div>
    </div>
  );
}