import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Filter, Calendar, Download, ChevronDown,
  TrendingUp, DollarSign, Package
} from 'lucide-react';

// Color palette
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

// Combined transaction data from all periods
const allTransactions = [
  // Weekly transactions
  { id: 1, date: '2024-03-30', company: 'Walk-in Customer', amount: 28450, invoiceValue: 28450, afterTax: 25605, status: 'paid', invoiceNo: 'INV-001', type: 'Daily Sales' },
  { id: 2, date: '2024-03-29', company: 'Various Customers', amount: 34100, invoiceValue: 34100, afterTax: 30690, status: 'paid', invoiceNo: 'INV-002', type: 'Daily Sales' },
  { id: 3, date: '2024-03-28', company: 'Various Customers', amount: 26800, invoiceValue: 26800, afterTax: 24120, status: 'paid', invoiceNo: 'INV-003', type: 'Daily Sales' },
  { id: 4, date: '2024-03-27', company: 'Wedding Event', amount: 31200, invoiceValue: 31200, afterTax: 28080, status: 'paid', invoiceNo: 'INV-004', type: 'Daily Sales' },
  { id: 5, date: '2024-03-26', company: 'Various Customers', amount: 15600, invoiceValue: 15600, afterTax: 14040, status: 'paid', invoiceNo: 'INV-005', type: 'Daily Sales' },
  // Top products as separate entries
  { id: 6, date: '2024-03-30', company: 'Classic Birthday Cake', amount: 27000, invoiceValue: 27000, afterTax: 24300, status: 'paid', invoiceNo: 'INV-006', type: 'Product Sale' },
  { id: 7, date: '2024-03-29', company: 'Elegant Wedding Cake', amount: 75000, invoiceValue: 75000, afterTax: 67500, status: 'paid', invoiceNo: 'INV-007', type: 'Product Sale' },
  { id: 8, date: '2024-03-28', company: 'Assorted Cupcakes', amount: 14400, invoiceValue: 14400, afterTax: 12960, status: 'paid', invoiceNo: 'INV-008', type: 'Product Sale' },
  // Monthly category sales
  { id: 9, date: '2024-03-15', company: 'Birthday Cakes', amount: 156000, invoiceValue: 156000, afterTax: 140400, status: 'paid', invoiceNo: 'INV-009', type: 'Category Sale' },
  { id: 10, date: '2024-03-10', company: 'Wedding Cakes', amount: 189000, invoiceValue: 189000, afterTax: 170100, status: 'paid', invoiceNo: 'INV-010', type: 'Category Sale' },
  { id: 11, date: '2024-03-05', company: 'Custom Cakes', amount: 124000, invoiceValue: 124000, afterTax: 111600, status: 'pending', invoiceNo: 'INV-011', type: 'Category Sale' },
  { id: 12, date: '2024-03-20', company: 'Coffee Sales', amount: 45200, invoiceValue: 45200, afterTax: 40680, status: 'paid', invoiceNo: 'INV-012', type: 'Category Sale' },
];

// Yearly summary transactions
const yearlyTransactions = [
  { id: 13, date: '2024-02-20', company: 'Birthday Cakes', amount: 212000, invoiceValue: 212000, afterTax: 190800, status: 'paid', invoiceNo: 'INV-013', type: 'Standard Cakes' },
  { id: 14, date: '2024-02-14', company: 'Custom Cakes', amount: 313000, invoiceValue: 313000, afterTax: 281700, status: 'paid', invoiceNo: 'INV-014', type: 'Custom Cakes' },
  { id: 15, date: '2024-02-10', company: 'Other Products', amount: 129200, invoiceValue: 129200, afterTax: 116280, status: 'pending', invoiceNo: 'INV-015', type: 'Other Products' },
];

export default function Reports() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [dateRange, setDateRange] = useState('2024');
  const [timePeriod, setTimePeriod] = useState('whole');

  const filteredTransactions = allTransactions.filter(t => 
    (filterType === 'all' || t.type === filterType) &&
    (t.company.toLowerCase().includes(searchTerm.toLowerCase()) || 
     t.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredYearly = yearlyTransactions.filter(t => 
    t.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate totals
  const totalIncome = allTransactions.reduce((sum, t) => sum + t.amount, 0);
  const totalTransactions = allTransactions.length + yearlyTransactions.length;
  const avgTransaction = totalIncome / allTransactions.length;

  return (
    <div className="space-y-6" style={{ background: CREAM, minHeight: '100vh', padding: '32px 24px' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="mb-6">
          <h1 className="text-2xl font-bold" style={{ color: SAGE }}>Financial Reports</h1>
          <p className="text-sm" style={{ color: MUTED_GRAY }}>Track income, sales, and transactions</p>
        </motion.div>

        {/* Stats Cards */}
        <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <div className="bg-white rounded-2xl p-5 border shadow-sm" style={{ borderColor: CREAM }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: MUTED_GRAY }}>Total Income</p>
                <p className="text-3xl font-bold mt-1" style={{ color: SAGE }}>₱{totalIncome.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${SAGE}10` }}>
                <TrendingUp className="w-6 h-6" style={{ color: SAGE }} />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 border shadow-sm" style={{ borderColor: CREAM }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: MUTED_GRAY }}>Total Transactions</p>
                <p className="text-3xl font-bold mt-1" style={{ color: SAGE }}>{totalTransactions}</p>
              </div>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${SAGE}10` }}>
                <Package className="w-6 h-6" style={{ color: SAGE }} />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 border shadow-sm" style={{ borderColor: CREAM }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: MUTED_GRAY }}>Average Transaction</p>
                <p className="text-3xl font-bold mt-1" style={{ color: SAGE }}>₱{Math.round(avgTransaction).toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${SAGE}10` }}>
                <DollarSign className="w-6 h-6" style={{ color: SAGE }} />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Filters Bar */}
        <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="bg-white rounded-2xl border shadow-sm p-5 mb-6" style={{ borderColor: CREAM }}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: MUTED_GRAY }} />
              <input
                type="text"
                placeholder="Search by company or invoice..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-sage/20"
                style={{ borderColor: CREAM, color: SAGE }}
              />
            </div>

            {/* Filter by type */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: MUTED_GRAY }} />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full pl-10 pr-8 py-2.5 rounded-xl border text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-sage/20"
                style={{ borderColor: CREAM, color: SAGE }}
              >
                <option value="all">All Types</option>
                <option value="Daily Sales">Daily Sales</option>
                <option value="Product Sale">Product Sales</option>
                <option value="Category Sale">Category Sales</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: MUTED_GRAY }} />
            </div>

            {/* Date Range */}
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: MUTED_GRAY }} />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full pl-10 pr-8 py-2.5 rounded-xl border text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-sage/20"
                style={{ borderColor: CREAM, color: SAGE }}
              >
                <option value="2024">2024 y.</option>
                <option value="2023">2023 y.</option>
                <option value="2022">2022 y.</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: MUTED_GRAY }} />
            </div>

            {/* Time Period */}
            <div className="relative">
              <select
                value={timePeriod}
                onChange={(e) => setTimePeriod(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-sage/20"
                style={{ borderColor: CREAM, color: SAGE }}
              >
                <option value="whole">Whole period</option>
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: MUTED_GRAY }} />
            </div>
          </div>
        </motion.div>

        {/* Activity Income List - Main Transactions */}
        <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="bg-white rounded-2xl border shadow-sm overflow-hidden mb-8" style={{ borderColor: CREAM }}>
          <div className="px-6 py-4 border-b" style={{ borderColor: CREAM, background: SOFT_WHITE }}>
            <h2 className="text-lg font-semibold" style={{ color: SAGE }}>Activity Income</h2>
          </div>
          <div className="divide-y" style={{ borderColor: CREAM }}>
            {filteredTransactions.map((transaction) => (
              <div key={transaction.id} className="hover:bg-[#F2EDE4] transition-colors">
                {/* Main row */}
                <div className="px-6 py-4">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    {/* Left side - PDF and invoice info */}
                    <div className="flex items-start gap-3 min-w-[180px]">
                      <Download size={20} style={{ color: SAGE }} className="mt-0.5" />
                      <div>
                        <p className="text-sm font-mono" style={{ color: SAGE }}>{transaction.invoiceNo}</p>
                        <p className="text-xs" style={{ color: MUTED_GRAY }}>{transaction.date}</p>
                      </div>
                    </div>

                    {/* Center - Company info */}
                    <div className="flex-1">
                      <p className="font-semibold text-base" style={{ color: SAGE }}>{transaction.company}</p>
                      <p className="text-xs mt-0.5" style={{ color: MUTED_GRAY }}>{transaction.type}</p>
                    </div>

                    {/* Right side - Amounts */}
                    <div className="text-right">
                      <p className="text-xl font-bold" style={{ color: SAGE }}>₱{transaction.amount.toLocaleString()}</p>
                      <p className="text-xs" style={{ color: MUTED_GRAY }}>Invoice value</p>
                      <p className="text-sm font-medium mt-1" style={{ color: SAGE }}>₱{transaction.afterTax.toLocaleString()}</p>
                      <p className="text-xs" style={{ color: MUTED_GRAY }}>After tax</p>
                    </div>
                  </div>
                </div>

                {/* Footer row with fix payment / paid info */}
                <div className="px-6 py-3 border-t" style={{ borderColor: CREAM, background: CREAM }}>
                  <div className="flex justify-between items-center">
                    <button className="flex items-center gap-2 text-sm font-medium" style={{ color: SAGE }}>
                      + Fix payment
                      <ChevronDown size={16} />
                    </button>
                    {transaction.status === 'paid' && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm" style={{ color: MUTED_GRAY }}>Paid: {transaction.date}</span>
                        <ChevronDown size={16} style={{ color: MUTED_GRAY }} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {filteredTransactions.length === 0 && (
              <div className="px-6 py-12 text-center" style={{ color: MUTED_GRAY }}>
                No transactions found
              </div>
            )}
          </div>
        </motion.div>

        {/* Yearly Summary Section */}
        <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="bg-white rounded-2xl border shadow-sm overflow-hidden" style={{ borderColor: CREAM }}>
          <div className="px-6 py-4 border-b" style={{ borderColor: CREAM, background: SOFT_WHITE }}>
            <h2 className="text-lg font-semibold" style={{ color: SAGE }}>2024 y. Summary</h2>
          </div>
          <div className="divide-y" style={{ borderColor: CREAM }}>
            {filteredYearly.map((transaction) => (
              <div key={transaction.id} className="hover:bg-[#F2EDE4] transition-colors">
                {/* Main row */}
                <div className="px-6 py-4">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-[180px]">
                      <Download size={20} style={{ color: SAGE }} className="mt-0.5" />
                      <div>
                        <p className="text-sm font-mono" style={{ color: SAGE }}>{transaction.invoiceNo}</p>
                        <p className="text-xs" style={{ color: MUTED_GRAY }}>{transaction.date}</p>
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-base" style={{ color: SAGE }}>{transaction.company}</p>
                      <p className="text-xs mt-0.5" style={{ color: MUTED_GRAY }}>{transaction.type}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold" style={{ color: SAGE }}>₱{transaction.amount.toLocaleString()}</p>
                      <p className="text-xs" style={{ color: MUTED_GRAY }}>Invoice value</p>
                      <p className="text-sm font-medium mt-1" style={{ color: SAGE }}>₱{transaction.afterTax.toLocaleString()}</p>
                      <p className="text-xs" style={{ color: MUTED_GRAY }}>After tax</p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t" style={{ borderColor: CREAM, background: CREAM }}>
                  <div className="flex justify-end items-center gap-2">
                    <span className="text-sm" style={{ color: MUTED_GRAY }}>Paid: {transaction.date}</span>
                    <ChevronDown size={16} style={{ color: MUTED_GRAY }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: none; }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.4s ease forwards;
        }
      `}</style>
    </div>
  );
}