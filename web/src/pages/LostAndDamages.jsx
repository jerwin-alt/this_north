// web/src/pages/LostAndDamages.jsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from '/api/axios';
import {
  AlertTriangle, Loader, AlertCircle, Plus, X, Search,
  Check, Ban, Trash2, Eye, Package, Box, Calendar,
  TrendingDown, CheckCircle2, XCircle, ChevronDown, Zap,
} from 'lucide-react';

const SAGE = '#4F5F52';
const CREAM = '#F2EDE4';
const MUTED_GRAY = '#A6A29A';
const SOFT_WHITE = '#FFF3D9';

// ── Palette for damage types ──
const DAMAGE_TYPE_STYLE = {
  spoilage:       { bg: 'rgba(212,160,61,0.1)',  border: 'rgba(212,160,61,0.25)',  color: '#92670a', label: 'Spoilage' },
  breakage:       { bg: 'rgba(199,91,91,0.1)',   border: 'rgba(199,91,91,0.25)',   color: '#c0392b', label: 'Breakage' },
  expired:        { bg: 'rgba(122,91,138,0.1)',  border: 'rgba(122,91,138,0.25)',  color: '#6b3f8a', label: 'Expired' },
  misproduction:  { bg: 'rgba(91,122,138,0.1)',  border: 'rgba(91,122,138,0.25)',  color: '#3d6b82', label: 'Misproduction' },
};

const STATUS_STYLE = {
  pending:  { bg: 'rgba(212,160,61,0.1)',  border: 'rgba(212,160,61,0.25)',  color: '#92670a', label: 'Pending' },
  approved: { bg: 'rgba(52,196,104,0.1)',  border: 'rgba(52,196,104,0.25)',  color: '#1a7a3c', label: 'Approved' },
  rejected: { bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.2)',    color: '#c0392b', label: 'Rejected' },
};

const ITEM_TYPE_OPTIONS = [
  { value: 'product',    label: 'Product' },
  { value: 'ingredient', label: 'Ingredient' },
];

const DAMAGE_TYPE_OPTIONS = [
  { value: 'spoilage',      label: 'Spoilage' },
  { value: 'breakage',      label: 'Breakage' },
  { value: 'expired',       label: 'Expired' },
  { value: 'misproduction', label: 'Misproduction' },
];

const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const formatMoney = (n) =>
  `₱${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ─── Section Header ────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, count, countLabel = 'record' }) {
  return (
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
        <Icon size={13} color="#fff" />
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
          {count} {countLabel}{count !== 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
}

// ─── Empty State for a section ────────────────────────────────────────
function SectionEmpty({ icon: Icon, message }) {
  return (
    <div style={{ padding: '40px 24px', textAlign: 'center', color: MUTED_GRAY }}>
      <div style={{
        width: 56, height: 56, background: 'rgba(166,162,154,0.1)', borderRadius: 16,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 12px', border: '1.5px dashed rgba(166,162,154,0.3)',
      }}>
        <Icon size={24} style={{ color: MUTED_GRAY, opacity: 0.4 }} />
      </div>
      <p style={{ fontSize: '0.85rem' }}>{message}</p>
    </div>
  );
}

// ─── Table header columns (shared by both sections) ───────────────────
const TABLE_COLUMNS = ['Reported', 'Item', 'Type', 'Quantity', 'Damage', 'Est. Cost', 'Reported By', 'Status', 'Actions'];

export default function LostAndDamages() {
  // ── Data state ──
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState({
    total: 0, pending: 0, approved: 0, rejected: 0, total_estimated_loss: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Toast (auto-dismissing notification) ──
  const [toast, setToast] = useState({ show: false, type: 'success', message: '' });

  useEffect(() => {
    if (!toast.show) return;
    const timer = setTimeout(() => setToast((t) => ({ ...t, show: false })), 2800);
    return () => clearTimeout(timer);
  }, [toast.show]);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ show: true, type, message });
  }, []);

  // ── Filters ──
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [itemTypeFilter, setItemTypeFilter] = useState('all');
  const [damageTypeFilter, setDamageTypeFilter] = useState('all');
  const [startDate] = useState('');
  const [endDate] = useState('');

  // ── Pagination ──
  const [pagination, setPagination] = useState({
    currentPage: 1, perPage: 25, totalPages: 1, totalItems: 0,
  });

  // ── Create modal ──
  const [showCreate, setShowCreate] = useState(false);
  const [products, setProducts] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [form, setForm] = useState({
    item_type: 'product',
    item_id: '',
    quantity: '',
    unit: '',
    estimated_cost: '',
    damage_type: 'spoilage',
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // ── Action modals ──
  const [approveModal, setApproveModal] = useState({ show: false, record: null });
  const [rejectModal, setRejectModal]   = useState({ show: false, record: null, reason: '' });
  const [deleteModal, setDeleteModal]   = useState({ show: false, record: null });
  const [viewModal, setViewModal]       = useState({ show: false, record: null });
  const [actionLoading, setActionLoading] = useState(false);

  // ── Debounce search ──
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPagination((p) => ({ ...p, currentPage: 1 }));
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  // ── Fetch records ──
  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.currentPage,
        per_page: pagination.perPage,
      };
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (statusFilter !== 'all') params.status = statusFilter;
      if (itemTypeFilter !== 'all') params.item_type = itemTypeFilter;
      if (damageTypeFilter !== 'all') params.damage_type = damageTypeFilter;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const res = await axios.get('/admin/lost-and-damages', { params });

      const paginator = res.data.records || {};
      const currentPage = paginator.current_page || 1;
      const lastPage = paginator.last_page || 1;
      if (currentPage > lastPage) {
        setPagination((p) => ({ ...p, currentPage: lastPage }));
        return;
      }

      setRecords(Array.isArray(paginator.data) ? paginator.data : []);
      setPagination((p) => ({
        ...p,
        currentPage,
        totalPages: lastPage,
        totalItems: paginator.total || 0,
      }));

      if (res.data.stats) setStats(res.data.stats);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch lost & damages:', err);
      setError(err.response?.data?.message || 'Failed to load records');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [
    pagination.currentPage, pagination.perPage,
    debouncedSearch, statusFilter, itemTypeFilter, damageTypeFilter,
    startDate, endDate,
  ]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  // ── Fetch products + ingredients when create modal opens ──
  const fetchItems = useCallback(async () => {
    setItemsLoading(true);
    try {
      const [prodRes, ingRes] = await Promise.all([
        axios.get('/admin/menu'),
        axios.get('/ingredients'),
      ]);
      setProducts(prodRes.data.products || []);
      setIngredients(ingRes.data.ingredients || []);
    } catch (err) {
      console.error('Failed to load items', err);
    } finally {
      setItemsLoading(false);
    }
  }, []);

  const openCreate = () => {
    setForm({
      item_type: 'product',
      item_id: '',
      quantity: '',
      unit: '',
      estimated_cost: '',
      damage_type: 'spoilage',
      description: '',
    });
    setFormError('');
    setShowCreate(true);
    if (products.length === 0 || ingredients.length === 0) fetchItems();
  };

  // ── Auto-fill unit when item is selected ──
  const handleItemSelect = (itemId) => {
    const idNum = Number(itemId);
    let unit = '';
    if (form.item_type === 'product') {
      const p = products.find((x) => x.id === idNum);
      unit = p ? 'PCS' : '';
    } else {
      const i = ingredients.find((x) => x.id === idNum);
      unit = i?.unit || '';
    }
    setForm((f) => ({ ...f, item_id: itemId, unit }));
  };

  // ── Create handler ──
  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!form.item_id) { setFormError('Please select an item.'); return; }
    if (!form.quantity || Number(form.quantity) <= 0) { setFormError('Quantity must be greater than zero.'); return; }
    if (!form.unit) { setFormError('Unit is required.'); return; }
    if (form.estimated_cost === '' || Number(form.estimated_cost) < 0) {
      setFormError('Estimated cost is required.');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post('/admin/lost-and-damages', {
        item_id: Number(form.item_id),
        item_type: form.item_type,
        quantity: Number(form.quantity),
        unit: form.unit,
        estimated_cost: Number(form.estimated_cost),
        damage_type: form.damage_type,
        description: form.description || null,
      });
      setShowCreate(false);
      await fetchRecords();
      showToast('Loss/damage report created successfully.', 'success');
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create record.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Approve ──
  const handleApprove = async () => {
    if (!approveModal.record) return;
    setActionLoading(true);
    try {
      await axios.put(`/admin/lost-and-damages/${approveModal.record.id}/approve`);
      setApproveModal({ show: false, record: null });
      await fetchRecords();
      showToast('Loss/damage approved successfully. Stock deducted.', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Approval failed.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Reject ──
  const handleReject = async () => {
    if (!rejectModal.record) return;
    if (!rejectModal.reason.trim()) {
      showToast('Please provide a rejection reason.', 'error');
      return;
    }
    setActionLoading(true);
    try {
      await axios.put(`/admin/lost-and-damages/${rejectModal.record.id}/reject`, {
        reason: rejectModal.reason.trim(),
      });
      setRejectModal({ show: false, record: null, reason: '' });
      await fetchRecords();
      showToast('Loss/damage report rejected.', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Rejection failed.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Delete ──
  const handleDelete = async () => {
    if (!deleteModal.record) return;
    setActionLoading(true);
    try {
      await axios.delete(`/admin/lost-and-damages/${deleteModal.record.id}`);
      setDeleteModal({ show: false, record: null });
      await fetchRecords();
      showToast('Record deleted successfully.', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Delete failed.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Pagination helpers ──
  const goToPage = (p) => {
    if (p < 1 || p > pagination.totalPages) return;
    setPagination((prev) => ({ ...prev, currentPage: p }));
  };

  const handlePerPageChange = (e) => {
    const n = parseInt(e.target.value, 10);
    setPagination((prev) => ({ ...prev, perPage: n, currentPage: 1 }));
  };

  const renderPageNumbers = () => {
    const { currentPage, totalPages } = pagination;
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

  // ── Derived stats cards ──
  const statCards = useMemo(() => ([
    { label: 'Total Records',    value: stats.total,    icon: AlertTriangle, accent: SAGE },
    { label: 'Pending Approval', value: stats.pending,  icon: TrendingDown,  accent: '#D4A03D' },
    { label: 'Approved',         value: stats.approved, icon: CheckCircle2,  accent: '#34c468' },
    { label: 'Rejected',         value: stats.rejected, icon: XCircle,       accent: '#ef4444' },
  ]), [stats]);

  // ─── Split current page's roots into two sections ───
  const isFilteringIngredients = itemTypeFilter === 'ingredient';

  const productRoots = useMemo(
    () => records.filter((r) => r.item_type === 'product'),
    [records]
  );

  const ingredientRows = useMemo(() => {
    // Ingredient filter mode: backend returns ALL ingredient rows flat.
    if (isFilteringIngredients) {
      return records
        .filter((r) => r.item_type === 'ingredient')
        .map((r) => ({
          ...r,
          _is_auto_generated: !!r.parent_id,
          _parent_product_name: r.parent_item_name || null,
        }));
    }

    // Default mode: direct ingredient roots + BOM children extracted from product roots.
    const directIngredients = records.filter((r) => r.item_type === 'ingredient');
    const bomChildren = [];
    records.forEach((p) => {
      if (p.item_type !== 'product') return;
      const kids = Array.isArray(p.children) ? p.children : [];
      kids.forEach((c) => {
        bomChildren.push({
          ...c,
          _is_auto_generated: true,
          _parent_product_name: p.item_name || `#${p.item_id}`,
        });
      });
    });
    return [...directIngredients, ...bomChildren];
  }, [records, isFilteringIngredients]);

  const { currentPage, perPage, totalItems, totalPages } = pagination;
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * perPage + 1;
  const endItem = Math.min(currentPage * perPage, totalItems);

  // ─── Row renderer (reused for both sections) ──────────────────────
  const renderRow = (r, idx, isChild = false) => {
    const dtStyle = DAMAGE_TYPE_STYLE[r.damage_type] || DAMAGE_TYPE_STYLE.spoilage;
    const stStyle = STATUS_STYLE[r.status] || STATUS_STYLE.pending;
    const isPending = !isChild && r.status === 'pending';
    const childrenCount = !isChild && Array.isArray(r.children) ? r.children.length : 0;
    const parentProductName = isChild ? r._parent_product_name : null;

    return (
      <tr
        key={`${isChild ? 'child' : 'root'}-${r.id}`}
        className={isChild ? 'bom-child-row' : 'root-row'}
        style={{
          borderTop: idx === 0 && !isChild ? 'none' : `1px solid rgba(242,237,228,0.8)`,
        }}
      >
        <td style={{ padding: '13px 18px', color: MUTED_GRAY, fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
          {formatDateTime(r.reported_at)}
        </td>
        <td style={{ padding: '13px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8, flexShrink: 0,
              background: r.item_type === 'product'
                ? 'rgba(79,95,82,0.08)'
                : 'rgba(91,122,138,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `1px solid ${r.item_type === 'product' ? 'rgba(79,95,82,0.12)' : 'rgba(91,122,138,0.15)'}`,
            }}>
              {r.item_type === 'product'
                ? <Package size={13} style={{ color: SAGE }} />
                : <Box size={13} style={{ color: '#5B7A8A' }} />}
            </div>
            <div>
              <p style={{ color: SAGE, fontWeight: 600, fontSize: '0.85rem', margin: 0 }}>
                {r.item_name || `#${r.item_id}`}
              </p>
              {r.item_sku && (
                <p style={{ color: MUTED_GRAY, fontSize: '0.68rem', margin: 0, fontFamily: 'monospace' }}>
                  {r.item_sku}
                </p>
              )}
              {parentProductName && (
                <p style={{ color: MUTED_GRAY, fontSize: '0.68rem', margin: 0, fontStyle: 'italic' }}>
                  Auto-deducted via BOM from <strong style={{ color: '#3d6b82' }}>{parentProductName}</strong>
                </p>
              )}
              {childrenCount > 0 && (
                <p style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  marginTop: 4, margin: 0,
                  fontSize: '0.65rem', fontWeight: 700,
                  color: '#3d6b82',
                  background: 'rgba(91,122,138,0.1)',
                  border: '1px solid rgba(91,122,138,0.2)',
                  borderRadius: 999, padding: '1px 8px',
                }}>
                  <Zap size={10} strokeWidth={2.5} />
                  {childrenCount} ingredient{childrenCount !== 1 ? 's' : ''} deducted
                </p>
              )}
            </div>
          </div>
        </td>
        <td style={{ padding: '13px 18px' }}>
          <span style={{
            display: 'inline-block',
            background: r.item_type === 'product' ? 'rgba(79,95,82,0.07)' : 'rgba(91,122,138,0.08)',
            color: r.item_type === 'product' ? SAGE : '#3d6b82',
            borderRadius: 6, padding: '2px 9px',
            fontSize: '0.72rem', fontWeight: 600, textTransform: 'capitalize',
          }}>
            {r.item_type_label || r.item_type}
          </span>
        </td>
        <td style={{ padding: '13px 18px', whiteSpace: 'nowrap' }}>
          <span style={{ fontWeight: 700, color: SAGE }}>
            {Number(r.quantity).toLocaleString()}
          </span>
          <span style={{ color: MUTED_GRAY, marginLeft: 4, fontSize: '0.75rem' }}>
            {r.unit}
          </span>
        </td>
        <td style={{ padding: '13px 18px' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '3px 10px', borderRadius: 999,
            fontSize: '0.68rem', fontWeight: 600,
            background: dtStyle.bg, color: dtStyle.color,
            border: `1px solid ${dtStyle.border}`,
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%',
              background: dtStyle.color, display: 'inline-block' }} />
            {dtStyle.label}
          </span>
        </td>
        <td style={{ padding: '13px 18px', fontWeight: 700, color: SAGE, whiteSpace: 'nowrap' }}>
          {isChild ? (
            <span style={{ color: MUTED_GRAY, fontWeight: 400 }}>—</span>
          ) : (
            formatMoney(r.estimated_cost)
          )}
        </td>
        <td style={{ padding: '13px 18px', color: MUTED_GRAY, fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
          {r.reported_by?.first_name} {r.reported_by?.last_name}
        </td>
        <td style={{ padding: '13px 18px' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '3px 10px', borderRadius: 999,
            fontSize: '0.68rem', fontWeight: 600,
            background: stStyle.bg, color: stStyle.color,
            border: `1px solid ${stStyle.border}`, textTransform: 'capitalize',
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%',
              background: stStyle.color, display: 'inline-block' }} />
            {stStyle.label}
          </span>
        </td>
        <td style={{ padding: '13px 18px', whiteSpace: 'nowrap' }}>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              onClick={() => setViewModal({ show: true, record: r })}
              className="action-btn"
              style={{ padding: 7, background: 'rgba(79,95,82,0.08)', color: SAGE }}
              title="View details"
            >
              <Eye size={14} />
            </button>

            {isPending && (
              <>
                <button
                  onClick={() => setApproveModal({ show: true, record: r })}
                  className="action-btn"
                  style={{ padding: 7, background: 'rgba(52,196,104,0.1)', color: '#1a7a3c' }}
                  title="Approve (will deduct stock)"
                >
                  <Check size={14} />
                </button>
                <button
                  onClick={() => setRejectModal({ show: true, record: r, reason: '' })}
                  className="action-btn"
                  style={{ padding: 7, background: 'rgba(234,179,8,0.1)', color: '#92670a' }}
                  title="Reject"
                >
                  <Ban size={14} />
                </button>
                <button
                  onClick={() => setDeleteModal({ show: true, record: r })}
                  className="action-btn"
                  style={{ padding: 7, background: 'rgba(239,68,68,0.07)', color: '#EF4444' }}
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </>
            )}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div style={{ background: CREAM, minHeight: '100vh', padding: '36px 28px' }}>
      <style>{`
        .grain-overlay { position: fixed; inset: 0; pointer-events: none; z-index: 0; opacity: 0.028;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
          background-repeat: repeat; background-size: 128px; }
        .divider-line { height: 1px; background: linear-gradient(90deg, transparent, rgba(79,95,82,0.15), transparent); }
        .ld-table tbody tr { transition: background 0.15s ease; }
        .ld-table tbody tr.root-row:hover { background: rgba(242,237,228,0.7); }
        .ld-table tbody tr.bom-child-row { background: rgba(91,122,138,0.05); }
        .ld-table tbody tr.bom-child-row:hover { background: rgba(91,122,138,0.1); }
        .stat-card { transition: box-shadow 0.3s ease, transform 0.3s ease; position: relative; overflow: hidden; }
        .stat-card:hover { transform: translateY(-4px); box-shadow: 0 14px 30px rgba(79,95,82,0.12) !important; }
        .filter-input:focus { box-shadow: 0 0 0 3px rgba(79,95,82,0.12); border-color: #4F5F52 !important; outline: none; }
        .modal-input:focus { box-shadow: 0 0 0 3px rgba(79,95,82,0.12); border-color: #4F5F52 !important; outline: none; }
        .action-btn { transition: all 0.18s ease; border-radius: 10px; border: none; cursor: pointer; }
        .action-btn:hover:not(:disabled) { transform: scale(1.12); }
        .action-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .primary-btn { transition: all 0.22s ease; border: none; cursor: pointer; }
        .primary-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(79,95,82,0.3); }
        .sec-btn { transition: all 0.2s ease; cursor: pointer; }
        .sec-btn:hover { background: rgba(79,95,82,0.07) !important; transform: translateY(-1px); }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
        .fade-in   { animation: fadeInUp 0.4s ease both; }
        .fade-in-1 { animation: fadeInUp 0.4s 0.05s ease both; }
        .fade-in-2 { animation: fadeInUp 0.4s 0.10s ease both; }
        @keyframes modalIn { from { opacity: 0; transform: scale(0.96) translateY(12px); } to { opacity: 1; transform: none; } }
        .anim-modal { animation: modalIn 0.25s cubic-bezier(0.25,0.46,0.45,0.94); }
        @keyframes toastIn { from { opacity: 0; transform: translate(-50%, -20px); } to { opacity: 1; transform: translate(-50%, 0); } }
        .toast-anim { animation: toastIn 0.3s cubic-bezier(0.25,0.46,0.45,0.94) both; }
        .pagination-btn { transition: all 0.2s ease; border: 1px solid rgba(166,162,154,0.3);
          background: #fff; padding: 6px 12px; border-radius: 6px; font-size: 0.8rem;
          font-weight: 600; color: ${SAGE}; cursor: pointer; margin: 0 2px; }
        .pagination-btn:hover:not(:disabled) { background: ${SAGE}; color: #fff; border-color: ${SAGE}; }
        .pagination-btn.active { background: ${SAGE}; color: #fff; border-color: ${SAGE}; }
        .pagination-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .per-page-select { border: 1px solid rgba(166,162,154,0.3); border-radius: 6px;
          padding: 4px 8px; font-size: 0.8rem; color: ${SAGE}; background: #fff; outline: none; }
      `}</style>

      <div className="grain-overlay" />

      <div className="max-w-7xl mx-auto relative" style={{ zIndex: 1 }}>
        {/* ── Header ── */}
        <div className="flex flex-wrap justify-between items-start gap-4 mb-8 fade-in">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div style={{
                width: 36, height: 36,
                background: 'linear-gradient(135deg, #D4A03D, #b8872e)',
                borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(212,160,61,0.3)',
                flexShrink: 0,
              }}>
                <AlertTriangle size={18} color="#fff" />
              </div>
              <h1 style={{ color: SAGE, fontSize: '1.55rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
                Lost & Damages
              </h1>
            </div>
            <p style={{ color: MUTED_GRAY, fontSize: '0.82rem', letterSpacing: '0.03em', marginLeft: 48 }}>
              Track product and ingredient losses — approve to deduct stock
            </p>
          </div>

          <button
            onClick={openCreate}
            className="primary-btn flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium"
            style={{
              background: `linear-gradient(135deg, ${SAGE} 0%, #3e4c42 100%)`,
              boxShadow: '0 4px 14px rgba(79,95,82,0.28)',
            }}
          >
            <Plus size={16} strokeWidth={2.2} />
            Report Loss / Damage
          </button>
        </div>

        <div className="divider-line mb-7" />

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-7 fade-in-1">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="stat-card"
                style={{
                  background: '#fff',
                  borderRadius: 20,
                  border: '1.5px solid rgba(242,237,228,0.9)',
                  boxShadow: '0 2px 12px rgba(79,95,82,0.06)',
                  padding: '22px 22px 18px',
                }}
              >
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                  background: `linear-gradient(90deg, ${card.accent}, ${card.accent}cc)`,
                }} />
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{
                      color: MUTED_GRAY, fontSize: '0.72rem', fontWeight: 500,
                      letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8,
                    }}>
                      {card.label}
                    </p>
                    <p style={{
                      color: SAGE, fontSize: '2rem', fontWeight: 800,
                      letterSpacing: '-0.03em', lineHeight: 1,
                    }}>
                      {card.value}
                    </p>
                  </div>
                  <div style={{
                    width: 44, height: 44, borderRadius: 14,
                    background: `linear-gradient(135deg, ${card.accent}22, ${card.accent}0c)`,
                    border: `1.5px solid ${card.accent}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Icon size={20} style={{ color: card.accent }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Filters ── */}
        <div className="fade-in-2 mb-6" style={{
          background: '#fff', borderRadius: 20,
          border: '1.5px solid rgba(242,237,228,0.9)',
          boxShadow: '0 2px 12px rgba(79,95,82,0.06)',
          padding: '18px 22px',
        }}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{
                position: 'absolute', left: 11, top: '50%',
                transform: 'translateY(-50%)', color: MUTED_GRAY, pointerEvents: 'none',
              }} />
              <input
                type="text"
                placeholder="Search item or description…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="filter-input w-full rounded-xl border text-sm"
                style={{
                  borderColor: 'rgba(166,162,154,0.3)', color: SAGE,
                  background: '#fafafa', padding: '9px 12px 9px 32px',
                }}
              />
            </div>

            {/* Status */}
            <div style={{ position: 'relative' }}>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPagination((p) => ({ ...p, currentPage: 1 })); }}
                className="filter-input w-full rounded-xl border text-sm appearance-none"
                style={{
                  borderColor: 'rgba(166,162,154,0.3)', color: SAGE,
                  background: '#fafafa', padding: '9px 32px 9px 14px', cursor: 'pointer',
                }}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
              <ChevronDown size={13} style={{
                position: 'absolute', right: 10, top: '50%',
                transform: 'translateY(-50%)', color: MUTED_GRAY, pointerEvents: 'none',
              }} />
            </div>

            {/* Item type */}
            <div style={{ position: 'relative' }}>
              <select
                value={itemTypeFilter}
                onChange={(e) => { setItemTypeFilter(e.target.value); setPagination((p) => ({ ...p, currentPage: 1 })); }}
                className="filter-input w-full rounded-xl border text-sm appearance-none"
                style={{
                  borderColor: 'rgba(166,162,154,0.3)', color: SAGE,
                  background: '#fafafa', padding: '9px 32px 9px 14px', cursor: 'pointer',
                }}
              >
                <option value="all">All Item Types</option>
                <option value="product">Products</option>
                <option value="ingredient">Ingredients</option>
              </select>
              <ChevronDown size={13} style={{
                position: 'absolute', right: 10, top: '50%',
                transform: 'translateY(-50%)', color: MUTED_GRAY, pointerEvents: 'none',
              }} />
            </div>

            {/* Damage type */}
            <div style={{ position: 'relative' }}>
              <select
                value={damageTypeFilter}
                onChange={(e) => { setDamageTypeFilter(e.target.value); setPagination((p) => ({ ...p, currentPage: 1 })); }}
                className="filter-input w-full rounded-xl border text-sm appearance-none"
                style={{
                  borderColor: 'rgba(166,162,154,0.3)', color: SAGE,
                  background: '#fafafa', padding: '9px 32px 9px 14px', cursor: 'pointer',
                }}
              >
                <option value="all">All Damage Types</option>
                {DAMAGE_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <ChevronDown size={13} style={{
                position: 'absolute', right: 10, top: '50%',
                transform: 'translateY(-50%)', color: MUTED_GRAY, pointerEvents: 'none',
              }} />
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/*  SECTION 1 — PRODUCT LOSS / DAMAGE                              */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <div className="fade-in-2 mb-6" style={{
          background: '#fff', borderRadius: 20,
          border: '1.5px solid rgba(242,237,228,0.9)',
          boxShadow: '0 2px 12px rgba(79,95,82,0.06)',
          overflow: 'hidden',
        }}>
          <SectionHeader
            icon={Package}
            title="Product Loss / Damage"
            count={productRoots.length}
            countLabel="record"
          />

          <div className="overflow-x-auto">
            <table className="ld-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'rgba(242,237,228,0.35)' }}>
                  {TABLE_COLUMNS.map((col) => (
                    <th key={col} style={{
                      padding: '13px 18px', textAlign: 'left',
                      fontSize: '0.68rem', fontWeight: 700, color: SAGE,
                      letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap',
                    }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="9" style={{ padding: '40px 24px', textAlign: 'center' }}>
                      <Loader className="animate-spin" size={24} style={{ color: SAGE, display: 'inline-block' }} />
                      <p style={{ color: MUTED_GRAY, fontSize: '0.85rem', marginTop: 10 }}>Loading…</p>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan="9" style={{ padding: '40px 24px', textAlign: 'center' }}>
                      <AlertCircle size={22} style={{ color: '#DC2626', display: 'inline-block' }} />
                      <p style={{ color: '#DC2626', fontSize: '0.85rem', marginTop: 8 }}>{error}</p>
                    </td>
                  </tr>
                ) : productRoots.length === 0 ? (
                  <tr>
                    <td colSpan="9">
                      <SectionEmpty icon={Package} message="No product loss or damage records on this page" />
                    </td>
                  </tr>
                ) : (
                  productRoots.map((r, idx) => renderRow(r, idx, false))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/*  SECTION 2 — INGREDIENT LOSS / DAMAGE                           */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <div className="fade-in-2" style={{
          background: '#fff', borderRadius: 20,
          border: '1.5px solid rgba(242,237,228,0.9)',
          boxShadow: '0 2px 12px rgba(79,95,82,0.06)',
          overflow: 'hidden',
        }}>
          <SectionHeader
            icon={Box}
            title="Ingredient Loss / Damage"
            count={ingredientRows.length}
            countLabel="record"
          />

          <div className="overflow-x-auto">
            <table className="ld-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'rgba(242,237,228,0.35)' }}>
                  {TABLE_COLUMNS.map((col) => (
                    <th key={col} style={{
                      padding: '13px 18px', textAlign: 'left',
                      fontSize: '0.68rem', fontWeight: 700, color: SAGE,
                      letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap',
                    }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="9" style={{ padding: '40px 24px', textAlign: 'center' }}>
                      <Loader className="animate-spin" size={24} style={{ color: SAGE, display: 'inline-block' }} />
                      <p style={{ color: MUTED_GRAY, fontSize: '0.85rem', marginTop: 10 }}>Loading…</p>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan="9" style={{ padding: '40px 24px', textAlign: 'center' }}>
                      <AlertCircle size={22} style={{ color: '#DC2626', display: 'inline-block' }} />
                      <p style={{ color: '#DC2626', fontSize: '0.85rem', marginTop: 8 }}>{error}</p>
                    </td>
                  </tr>
                ) : ingredientRows.length === 0 ? (
                  <tr>
                    <td colSpan="9">
                      <SectionEmpty icon={Box} message="No ingredient loss or damage records on this page" />
                    </td>
                  </tr>
                ) : (
                  ingredientRows.map((r, idx) => {
                    const isChild = !!r._is_auto_generated;
                    return renderRow(r, idx, isChild);
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Pagination ── */}
        {totalItems > 0 && (
          <div className="fade-in-2 mt-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-sm" style={{ color: MUTED_GRAY }}>
              <span>
                Showing <strong>{startItem}</strong> – <strong>{endItem}</strong> of <strong>{totalItems}</strong> records
              </span>
              <div className="flex items-center gap-2">
                <span>Per page:</span>
                <select value={perPage} onChange={handlePerPageChange} className="per-page-select">
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="pagination-btn"
              >
                Previous
              </button>
              {renderPageNumbers().map((p, idx) =>
                p === '...' ? (
                  <span key={idx} style={{ padding: '0 8px', color: MUTED_GRAY }}>…</span>
                ) : (
                  <button
                    key={idx}
                    onClick={() => goToPage(p)}
                    className={`pagination-btn ${currentPage === p ? 'active' : ''}`}
                  >
                    {p}
                  </button>
                )
              )}
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="pagination-btn"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ══ Create Modal ══ */}
      {showCreate && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(30,35,30,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 50, padding: 16, backdropFilter: 'blur(4px)',
        }}>
          <div className="anim-modal" style={{
            background: '#fff', borderRadius: 22,
            width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 24px 60px rgba(79,95,82,0.18)',
            border: '1px solid rgba(242,237,228,0.8)',
          }}>
            <div style={{
              position: 'sticky', top: 0, zIndex: 10,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '20px 24px', borderBottom: `1px solid ${CREAM}`,
              background: `linear-gradient(135deg, rgba(79,95,82,0.04), rgba(255,243,217,0.3))`,
              backdropFilter: 'blur(8px)',
            }}>
              <div className="flex items-center gap-3">
                <div style={{
                  width: 34, height: 34,
                  background: 'linear-gradient(135deg, #D4A03D, #b8872e)',
                  borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 3px 10px rgba(212,160,61,0.3)',
                }}>
                  <AlertTriangle size={16} color="#fff" />
                </div>
                <h3 style={{ color: SAGE, fontWeight: 700, fontSize: '1.05rem' }}>
                  Report Loss / Damage
                </h3>
              </div>
              <button
                onClick={() => setShowCreate(false)}
                style={{ color: MUTED_GRAY, padding: 7, borderRadius: 10, background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleCreate} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {formError && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '11px 14px', borderRadius: 12, fontSize: '0.82rem',
                  background: '#FEF2F2', color: '#DC2626', border: '1px solid #FEE2E2',
                }}>
                  <AlertCircle size={15} /> {formError}
                </div>
              )}

              {/* Item type toggle */}
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: SAGE, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8 }}>
                  Item Type *
                </label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {ITEM_TYPE_OPTIONS.map((opt) => {
                    const active = form.item_type === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, item_type: opt.value, item_id: '', unit: '' }))}
                        style={{
                          flex: 1, padding: '10px 14px', borderRadius: 12,
                          fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                          transition: 'all 0.2s',
                          background: active ? SAGE : '#fafafa',
                          color: active ? '#fff' : MUTED_GRAY,
                          border: `1.5px solid ${active ? SAGE : 'rgba(166,162,154,0.3)'}`,
                          boxShadow: active ? '0 4px 12px rgba(79,95,82,0.2)' : 'none',
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Item select */}
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: SAGE, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>
                  {form.item_type === 'product' ? 'Product' : 'Ingredient'} *
                </label>
                <select
                  value={form.item_id}
                  onChange={(e) => handleItemSelect(e.target.value)}
                  required
                  disabled={itemsLoading}
                  className="modal-input w-full px-3.5 py-2.5 rounded-xl border text-sm"
                  style={{
                    borderColor: 'rgba(166,162,154,0.3)', color: SAGE,
                    background: '#fafafa', cursor: itemsLoading ? 'wait' : 'pointer',
                  }}
                >
                  <option value="">
                    {itemsLoading ? 'Loading…' : `Select ${form.item_type}`}
                  </option>
                  {(form.item_type === 'product' ? products : ingredients).map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.name}
                      {form.item_type === 'product' && it.sku ? ` (${it.sku})` : ''}
                      {form.item_type === 'ingredient' && it.unit ? ` — ${it.unit}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity + unit */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: SAGE, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>
                    Quantity *
                  </label>
                  <input
                    type="number" step="0.01" min="0.01"
                    value={form.quantity}
                    onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                    required
                    className="modal-input w-full px-3.5 py-2.5 rounded-xl border text-sm"
                    style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: SAGE, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>
                    Unit *
                  </label>
                  <input
                    type="text"
                    value={form.unit}
                    onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                    required
                    placeholder="e.g., PCS, G, ML"
                    className="modal-input w-full px-3.5 py-2.5 rounded-xl border text-sm"
                    style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa' }}
                  />
                </div>
              </div>

              {/* Est cost + damage type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: SAGE, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>
                    Estimated Cost (₱) *
                  </label>
                  <input
                    type="number" step="0.01" min="0"
                    value={form.estimated_cost}
                    onChange={(e) => setForm((f) => ({ ...f, estimated_cost: e.target.value }))}
                    required
                    className="modal-input w-full px-3.5 py-2.5 rounded-xl border text-sm"
                    style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: SAGE, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>
                    Damage Type *
                  </label>
                  <select
                    value={form.damage_type}
                    onChange={(e) => setForm((f) => ({ ...f, damage_type: e.target.value }))}
                    required
                    className="modal-input w-full px-3.5 py-2.5 rounded-xl border text-sm"
                    style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa', cursor: 'pointer' }}
                  >
                    {DAMAGE_TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: SAGE, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  placeholder="Explain what happened…"
                  className="modal-input w-full px-3.5 py-2.5 rounded-xl border text-sm resize-none"
                  style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa' }}
                />
              </div>

              <div className="divider-line" />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="sec-btn px-5 py-2.5 rounded-xl border text-sm font-medium"
                  style={{ borderColor: 'rgba(166,162,154,0.3)', color: MUTED_GRAY, background: 'transparent' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="primary-btn flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50"
                  style={{ background: `linear-gradient(135deg, ${SAGE}, #3e4c42)` }}
                >
                  {submitting ? <Loader size={15} className="animate-spin" /> : <Plus size={15} />}
                  {submitting ? 'Submitting…' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ Approve Confirm ══ */}
      {approveModal.show && approveModal.record && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(30,35,30,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 50, padding: 16, backdropFilter: 'blur(4px)',
        }}>
          <div className="anim-modal" style={{
            background: '#fff', borderRadius: 22, padding: '32px 28px',
            maxWidth: 420, width: '100%', textAlign: 'center',
            boxShadow: '0 24px 60px rgba(79,95,82,0.18)',
            border: '1px solid rgba(242,237,228,0.8)',
          }}>
            <div style={{
              width: 60, height: 60, background: 'rgba(52,196,104,0.1)',
              borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 18px', border: '1.5px solid rgba(52,196,104,0.2)',
            }}>
              <Check size={26} style={{ color: '#1a7a3c' }} />
            </div>
            <h3 style={{ color: SAGE, fontWeight: 700, fontSize: '1.1rem', marginBottom: 8 }}>
              Approve this loss?
            </h3>
            <p style={{ color: MUTED_GRAY, fontSize: '0.83rem', lineHeight: 1.6, marginBottom: 20 }}>
              Approving will permanently deduct{' '}
              <strong style={{ color: SAGE }}>
                {Number(approveModal.record.quantity).toLocaleString()} {approveModal.record.unit}
              </strong>{' '}
              of <strong style={{ color: SAGE }}>{approveModal.record.item_name}</strong>
              {approveModal.record.item_type === 'product' && (
                <> — its BOM ingredients will be deducted and added as rows</>
              )}.
              {' '}This cannot be undone.
            </p>
            <div className="divider-line mb-6" />
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={() => setApproveModal({ show: false, record: null })}
                className="sec-btn px-5 py-2.5 rounded-xl border text-sm font-medium"
                style={{ borderColor: 'rgba(166,162,154,0.3)', color: MUTED_GRAY, background: 'transparent' }}
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="primary-btn flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium"
                style={{ background: 'linear-gradient(135deg, #34c468, #1a7a3c)' }}
              >
                {actionLoading ? <Loader size={14} className="animate-spin" /> : <Check size={14} />}
                Yes, approve & deduct
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Reject Modal ══ */}
      {rejectModal.show && rejectModal.record && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(30,35,30,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 50, padding: 16, backdropFilter: 'blur(4px)',
        }}>
          <div className="anim-modal" style={{
            background: '#fff', borderRadius: 22, width: '100%', maxWidth: 480,
            boxShadow: '0 24px 60px rgba(79,95,82,0.18)',
            border: '1px solid rgba(242,237,228,0.8)', overflow: 'hidden',
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '20px 24px', borderBottom: `1px solid ${CREAM}`,
              background: `linear-gradient(135deg, rgba(79,95,82,0.04), rgba(255,243,217,0.3))`,
            }}>
              <h3 style={{ color: SAGE, fontWeight: 700, fontSize: '1.05rem' }}>Reject Report</h3>
              <button
                onClick={() => setRejectModal({ show: false, record: null, reason: '' })}
                style={{ color: MUTED_GRAY, padding: 7, borderRadius: 10, background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '22px 24px' }}>
              <p style={{ marginBottom: 14, color: SAGE, fontSize: '0.9rem' }}>
                Provide a reason for rejecting this loss report.
              </p>
              <textarea
                value={rejectModal.reason}
                onChange={(e) => setRejectModal((m) => ({ ...m, reason: e.target.value }))}
                rows={4}
                placeholder="Enter reason…"
                className="modal-input w-full px-3.5 py-2.5 rounded-xl border text-sm resize-none"
                style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa', minHeight: 100 }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20 }}>
                <button
                  onClick={() => setRejectModal({ show: false, record: null, reason: '' })}
                  className="sec-btn px-5 py-2.5 rounded-xl border text-sm font-medium"
                  style={{ borderColor: 'rgba(166,162,154,0.3)', color: MUTED_GRAY, background: 'transparent' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={actionLoading}
                  className="primary-btn flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium"
                  style={{ background: 'linear-gradient(135deg, #D4A03D, #92670a)' }}
                >
                  {actionLoading ? <Loader size={14} className="animate-spin" /> : <Ban size={14} />}
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ Delete Confirm ══ */}
      {deleteModal.show && deleteModal.record && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(30,35,30,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 50, padding: 16, backdropFilter: 'blur(4px)',
        }}>
          <div className="anim-modal" style={{
            background: '#fff', borderRadius: 22, padding: '32px 28px',
            maxWidth: 400, width: '100%', textAlign: 'center',
            boxShadow: '0 24px 60px rgba(79,95,82,0.18)',
            border: '1px solid rgba(242,237,228,0.8)',
          }}>
            <div style={{
              width: 60, height: 60, background: 'rgba(239,68,68,0.08)',
              borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 18px', border: '1.5px solid rgba(239,68,68,0.15)',
            }}>
              <Trash2 size={26} style={{ color: '#EF4444' }} />
            </div>
            <h3 style={{ color: SAGE, fontWeight: 700, fontSize: '1.1rem', marginBottom: 8 }}>
              Delete this record?
            </h3>
            <p style={{ color: MUTED_GRAY, fontSize: '0.83rem', lineHeight: 1.6, marginBottom: 22 }}>
              The pending loss report for{' '}
              <strong style={{ color: SAGE }}>{deleteModal.record.item_name}</strong> will be permanently removed.
            </p>
            <div className="divider-line mb-6" />
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={() => setDeleteModal({ show: false, record: null })}
                className="sec-btn px-5 py-2.5 rounded-xl border text-sm font-medium"
                style={{ borderColor: 'rgba(166,162,154,0.3)', color: MUTED_GRAY, background: 'transparent' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={actionLoading}
                className="primary-btn flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium"
                style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)' }}
              >
                {actionLoading ? <Loader size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Yes, delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ View Details Modal ══ */}
      {viewModal.show && viewModal.record && (() => {
        const r = viewModal.record;
        const dtStyle = DAMAGE_TYPE_STYLE[r.damage_type] || DAMAGE_TYPE_STYLE.spoilage;
        const stStyle = STATUS_STYLE[r.status] || STATUS_STYLE.pending;
        const children = Array.isArray(r.children) ? r.children : [];
        return (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(30,35,30,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 50, padding: 16, backdropFilter: 'blur(4px)',
          }}>
            <div className="anim-modal" style={{
              background: '#fff', borderRadius: 22, width: '100%', maxWidth: 560,
              maxHeight: '90vh', overflowY: 'auto',
              boxShadow: '0 24px 60px rgba(79,95,82,0.18)',
              border: '1px solid rgba(242,237,228,0.8)', padding: '24px',
            }}>
              <div className="flex justify-between items-center mb-5">
                <div className="flex items-center gap-3">
                  <div style={{
                    width: 34, height: 34,
                    background: 'linear-gradient(135deg, #D4A03D, #b8872e)',
                    borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <AlertTriangle size={16} color="#fff" />
                  </div>
                  <h3 style={{ color: SAGE, fontWeight: 700, fontSize: '1.1rem' }}>
                    Loss / Damage Details
                  </h3>
                </div>
                <button
                  onClick={() => setViewModal({ show: false, record: null })}
                  style={{ color: MUTED_GRAY, padding: 7, borderRadius: 10, background: 'transparent', border: 'none', cursor: 'pointer' }}
                >
                  <X size={22} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <Field label="Item" value={r.item_name || `#${r.item_id}`} />
                <Field label="Item Type" value={r.item_type_label || r.item_type} />
                {r.item_sku && <Field label="SKU" value={r.item_sku} />}
                {r.order_number && <Field label="Order #" value={r.order_number} />}
                <Field label="Quantity" value={`${Number(r.quantity).toLocaleString()} ${r.unit}`} />
                <Field label="Estimated Cost" value={formatMoney(r.estimated_cost)} />
                <Field label="Damage Type" value={dtStyle.label} />
                <Field label="Reported By" value={`${r.reported_by?.first_name || ''} ${r.reported_by?.last_name || ''}`} />
                <Field label="Reported At" value={formatDateTime(r.reported_at)} />
                <Field label="Status" value={stStyle.label} />
                {r.approved_by && (
                  <>
                    <Field label="Reviewed By" value={`${r.approved_by.first_name || ''} ${r.approved_by.last_name || ''}`} />
                    <Field label="Reviewed At" value={formatDateTime(r.approved_at)} />
                  </>
                )}
              </div>

              {r.description && (
                <div style={{ marginTop: 20 }}>
                  <p style={{
                    fontSize: '0.7rem', fontWeight: 700, color: SAGE,
                    letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6,
                  }}>
                    Description
                  </p>
                  <div style={{
                    padding: '12px 14px', background: 'rgba(242,237,228,0.5)',
                    borderRadius: 10, border: '1px solid rgba(242,237,228,0.9)',
                    fontSize: '0.85rem', color: SAGE, whiteSpace: 'pre-wrap', lineHeight: 1.5,
                  }}>
                    {r.description}
                  </div>
                </div>
              )}

              {children.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <p style={{
                    fontSize: '0.7rem', fontWeight: 700, color: SAGE,
                    letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8,
                  }}>
                    Ingredients deducted (via BOM)
                  </p>
                  <div style={{
                    borderRadius: 12, overflow: 'hidden',
                    border: '1px solid rgba(242,237,228,0.9)',
                    background: 'rgba(242,237,228,0.4)',
                  }}>
                    {children.map((c, i) => (
                      <div key={c.id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 14px',
                        borderTop: i === 0 ? 'none' : '1px solid rgba(166,162,154,0.15)',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Box size={12} style={{ color: '#5B7A8A' }} />
                          <span style={{ color: SAGE, fontWeight: 600, fontSize: '0.83rem' }}>
                            {c.item_name || `#${c.item_id}`}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ color: SAGE, fontWeight: 700, fontSize: '0.83rem' }}>
                            {Number(c.quantity).toLocaleString()}
                          </span>
                          <span style={{ color: MUTED_GRAY, fontSize: '0.72rem' }}>
                            {c.unit}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p style={{ fontSize: '0.68rem', color: MUTED_GRAY, marginTop: 6, fontStyle: 'italic' }}>
                    These ingredients were automatically deducted from inventory when this product loss was approved. They also appear in the <strong>Ingredient Loss / Damage</strong> section above.
                  </p>
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setViewModal({ show: false, record: null })}
                  className="primary-btn px-5 py-2.5 rounded-xl text-white text-sm font-medium"
                  style={{ background: `linear-gradient(135deg, ${SAGE}, #3e4c42)` }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ══ Toast (auto-dismissing notification) ══ */}
      {toast.show && (
        <div
          role="status"
          aria-live="polite"
          className="toast-anim"
          style={{
            position: 'fixed',
            top: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 20px',
            borderRadius: 14,
            background: toast.type === 'error' ? '#FEF2F2' : '#ECFDF5',
            color: toast.type === 'error' ? '#DC2626' : '#059669',
            border: `1px solid ${toast.type === 'error' ? '#FEE2E2' : '#D1FAE5'}`,
            boxShadow: '0 12px 32px rgba(79,95,82,0.18)',
            fontSize: '0.9rem',
            fontWeight: 600,
            letterSpacing: '0.01em',
            pointerEvents: 'none',
            maxWidth: '90vw',
          }}
        >
          {toast.type === 'error' ? (
            <AlertCircle size={18} />
          ) : (
            <CheckCircle2 size={18} />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}

// ── Small reusable field row for the details modal ──
function Field({ label, value }) {
  return (
    <div>
      <p style={{
        fontSize: '0.7rem', fontWeight: 700, color: SAGE,
        letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 4,
      }}>
        {label}
      </p>
      <p style={{ fontSize: '0.85rem', color: MUTED_GRAY, margin: 0, wordBreak: 'break-word' }}>
        {value}
      </p>
    </div>
  );
}