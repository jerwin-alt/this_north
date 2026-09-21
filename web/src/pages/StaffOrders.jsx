// web/src/pages/StaffOrders.jsx

import React, { useState, useEffect } from 'react';
import axios from '/api/axios';
import {
  Loader, AlertCircle, Search, ShoppingBag, Plus, X, Check,
  Eye, Trash2, AlertTriangle,
} from 'lucide-react';

// ── Imports and helpers ──
// import cakeBackground from '../assets/CUSTOMIZE_CAKE7_YES.png';
import strawberryImage from '../assets/CUSTOMIZE_CAKE5.jpg';
import SvgDecorationWeb from '../components/SvgDecorationWeb';

const SAGE = '#4F5F52';
const CREAM = '#F2EDE4';
const MUTED_GRAY = '#A6A29A';

const statusColors = {
  pending: '#D4A03D',
  confirmed: '#5B7A8A',
  preparing: '#7A5B8A',
  ready: '#5B8A5E',
  completed: '#4F5F52',
  cancelled: '#C75B5B',
};
const statusBg = {
  pending: 'rgba(212,160,61,0.1)',
  confirmed: 'rgba(91,122,138,0.1)',
  preparing: 'rgba(122,91,138,0.1)',
  ready: 'rgba(91,138,94,0.1)',
  completed: 'rgba(79,95,82,0.1)',
  cancelled: 'rgba(199,91,91,0.1)',
};

// ── Date formatting helpers ──
const formatDisplayDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const formatShortDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const API_BASE_URL = axios.defaults.baseURL?.replace('/api', '') || 'http://10.48.240.170:8000';
const getFullImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

function getFallbackUrl(elementName) {
  const key = elementName?.toLowerCase().replace(/\s/g, '') || '';
  if (key === 'strawberry') return strawberryImage;
  const map = {
    cherry: 'https://cdn-icons-png.flaticon.com/512/744/744530.png',
    blueberry: 'https://cdn-icons-png.flaticon.com/512/744/744531.png',
    chocolate: 'https://cdn-icons-png.flaticon.com/512/744/744532.png',
    sprinkles: 'https://cdn-icons-png.flaticon.com/512/744/744533.png',
    flower: 'https://cdn-icons-png.flaticon.com/512/744/744534.png',
    candle: 'https://cdn-icons-png.flaticon.com/512/744/744535.png',
    macaron: 'https://cdn-icons-png.flaticon.com/512/744/744536.png',
    drip: 'https://cdn-icons-png.flaticon.com/512/744/744537.png',
    frosting: 'https://cdn-icons-png.flaticon.com/512/744/744538.png',
  };
  return map[key] || 'https://via.placeholder.com/40?text=?';
}

function CakePreviewWeb({ design, size = 150 }) {
  const decorations = design?.decorations_with_elements || [];
  const canvasSize = 400;
  if (!decorations || decorations.length === 0) {
    return (
      <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f0ea', borderRadius: 8, border: '1px solid #ddd', color: MUTED_GRAY, fontSize: '0.8rem' }}>
        No decorations
      </div>
    );
  }
  return (
    <div style={{ width: size, height: size, position: 'relative', overflow: 'hidden', borderRadius: 8, background: '#f5f0ea', border: '1px solid #ddd' }}>
      {/* Base cake — SVG from public/ */}
      <img
        src="/cake-base.svg"
        alt="Cake base"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }}
        onError={(e) => (e.target.style.display = 'none')}
      />
      {decorations.map((dec, idx) => {
        const decSize = size * 0.4 * (dec.scale ?? 1);
        const x = (dec.x / canvasSize) * size;
        const y = (dec.y / canvasSize) * size;
        return (
          <div
            key={idx}
            style={{
              position: 'absolute',
              left: x - decSize / 2,
              top: y - decSize / 2,
              width: decSize,
              height: decSize,
              pointerEvents: 'none',
            }}
          >
            <SvgDecorationWeb
              svgSource={dec.svg_source}
              imageUrl={getFullImageUrl(dec.image_url)}
              fallbackUrl={getFallbackUrl(dec.element_name)}
              size={decSize}
              color={dec.color}
              colors={dec.colors}
            />
          </div>
        );
      })}
    </div>
  );
}

// ── Main StaffOrders ──
export default function StaffOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [menuItems, setMenuItems] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ── View Order Details Modal ──
  const [viewOrderModal, setViewOrderModal] = useState({ show: false, order: null });

  // ── Image Preview Modal State ──
  const [imagePreviewModal, setImagePreviewModal] = useState({ show: false, url: null });

  // ── Pickup Proof Upload State ──
  const [selectedPickupFiles, setSelectedPickupFiles] = useState([]);
  const [pickupPreviews, setPickupPreviews] = useState([]);
  const [uploadingPickup, setUploadingPickup] = useState(false);

  // ── Row-level Report Loss / Damage Modal State ──
  const [reportModal, setReportModal] = useState({
    show: false,
    order: null,
    items: [],
    form: {
      order_item_id: '',
      quantity: 1,
      unit: 'PCS',
      estimated_cost: '',
      damage_type: 'spoilage',
      description: '',
    },
  });
  const [reportSubmitting, setReportSubmitting] = useState(false);

  // ── General Report Loss / Damage Modal State (top-level button) ──
  const [generalReportModal, setGeneralReportModal] = useState({
    show: false,
    itemsLoading: false,
    products: [],
    ingredients: [],
    form: {
      item_type: 'product',
      item_id: '',
      quantity: '',
      unit: '',
      estimated_cost: '',
      damage_type: 'spoilage',
      description: '',
    },
  });
  const [generalReportSubmitting, setGeneralReportSubmitting] = useState(false);
  const [generalReportError, setGeneralReportError] = useState('');

  // ── Pagination State ──
  const [pagination, setPagination] = useState({
    currentPage: 1,
    perPage: 50,
    totalPages: 1,
    totalItems: 0,
  });

  const [createForm, setCreateForm] = useState({
    customer_name: '',
    customer_phone: '',
    pickup_date: '',
    pickup_time: '',
    notes: '',
    items: [{ menu_id: '', quantity: 1 }],
  });

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = { page: pagination.currentPage, per_page: pagination.perPage };
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      const res = await axios.get('/staff/orders', { params });
      const ordersData = res.data.orders?.data || res.data.orders || [];
      setOrders(ordersData);
      if (res.data.orders && typeof res.data.orders === 'object') {
        const p = res.data.orders;
        setPagination(prev => ({
          ...prev,
          currentPage: p.current_page || 1,
          totalPages: p.last_page || 1,
          totalItems: p.total || 0,
        }));
      }
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchMenu = async () => {
    try {
      const res = await axios.get('/menu');
      setMenuItems(res.data.products || res.data.menu || []);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchOrders();
    fetchMenu();
  }, [statusFilter, search, pagination.currentPage, pagination.perPage]);

  const addItemToCreate = () => setCreateForm(prev => ({
    ...prev, items: [...prev.items, { menu_id: '', quantity: 1 }]
  }));
  const removeItemFromCreate = (idx) => {
    if (createForm.items.length <= 1) return;
    setCreateForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));
  };
  const updateItemCreate = (idx, field, value) => {
    const items = [...createForm.items];
    items[idx][field] = value;
    setCreateForm(prev => ({ ...prev, items }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post('/staff/orders', createForm);
      setShowCreateModal(false);
      setCreateForm({
        customer_name: '', customer_phone: '', pickup_date: '', pickup_time: '', notes: '',
        items: [{ menu_id: '', quantity: 1 }],
      });
      fetchOrders();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  };

  // ── View Order Details (fetch fresh data) ──
  const handleViewOrder = async (order) => {
    setViewOrderModal({ show: true, order });
    try {
      const res = await axios.get(`/staff/orders/${order.id}`);
      setViewOrderModal({ show: true, order: res.data.order });
      setSelectedPickupFiles([]);
      setPickupPreviews([]);
      setUploadingPickup(false);
    } catch (err) {
      console.error('Failed to fetch order details', err);
      alert('Could not load fresh order details, showing cached data.');
    }
  };

  // ── Handle pickup proof file selection (multiple) ──
  const handlePickupFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setSelectedPickupFiles(files);
    const previews = files.map(file => URL.createObjectURL(file));
    setPickupPreviews(previews);
    e.target.value = '';
  };

  // ── Handle pickup proof upload ──
  const handleUploadPickupProof = async () => {
    if (selectedPickupFiles.length === 0) return;
    setUploadingPickup(true);
    try {
      const formData = new FormData();
      selectedPickupFiles.forEach(file => {
        formData.append('images[]', file);
      });
      await axios.post(`/staff/orders/${viewOrderModal.order.id}/pickup-proof`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const res = await axios.get(`/staff/orders/${viewOrderModal.order.id}`);
      setViewOrderModal(prev => ({ ...prev, order: res.data.order }));
      setSelectedPickupFiles([]);
      setPickupPreviews([]);
      alert('Pickup proof images uploaded successfully.');
    } catch (err) {
      alert(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploadingPickup(false);
    }
  };

  // ─── ROW-LEVEL REPORT LOSS / DAMAGE (from a specific order item) ───

  const openReportModal = (order) => {
    const reportableItems = (order.items || []).filter((i) => i.menu_id && i.menu);
    if (reportableItems.length === 0) {
      alert('This order has no reportable products.');
      return;
    }
    const first = reportableItems[0];
    setReportModal({
      show: true,
      order,
      items: reportableItems,
      form: {
        order_item_id: first.id,
        quantity: 1,
        unit: 'PCS',
        estimated_cost: parseFloat(first.unit_price || 0).toFixed(2),
        damage_type: 'spoilage',
        description: '',
      },
    });
  };

  const handleReportItemChange = (itemId) => {
    const item = reportModal.items.find((i) => String(i.id) === String(itemId));
    if (!item) return;
    setReportModal((prev) => ({
      ...prev,
      form: {
        ...prev.form,
        order_item_id: item.id,
        quantity: 1,
        unit: 'PCS',
        estimated_cost: parseFloat(item.unit_price || 0).toFixed(2),
      },
    }));
  };

  const handleReportQuantityChange = (qty) => {
    const item = reportModal.items.find(
      (i) => String(i.id) === String(reportModal.form.order_item_id)
    );
    if (!item) return;
    const maxQty = parseInt(item.quantity, 10) || 1;
    const clampedQty = Math.max(1, Math.min(maxQty, parseInt(qty, 10) || 1));
    setReportModal((prev) => ({
      ...prev,
      form: {
        ...prev.form,
        quantity: clampedQty,
        estimated_cost: (parseFloat(item.unit_price || 0) * clampedQty).toFixed(2),
      },
    }));
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    const item = reportModal.items.find(
      (i) => String(i.id) === String(reportModal.form.order_item_id)
    );
    if (!item || !reportModal.order) return;

    setReportSubmitting(true);
    try {
      await axios.post('/staff/lost-and-damages', {
        item_id: item.menu_id,
        item_type: 'product',
        quantity: Number(reportModal.form.quantity),
        unit: reportModal.form.unit,
        estimated_cost: Number(reportModal.form.estimated_cost),
        damage_type: reportModal.form.damage_type,
        description: reportModal.form.description || null,
        order_id: reportModal.order.id,
        order_item_id: item.id,
      });
      setReportModal({
        show: false,
        order: null,
        items: [],
        form: {
          order_item_id: '',
          quantity: 1,
          unit: 'PCS',
          estimated_cost: '',
          damage_type: 'spoilage',
          description: '',
        },
      });
      alert('Loss/damage report submitted. Waiting for admin approval.');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit report.');
    } finally {
      setReportSubmitting(false);
    }
  };

  // ─── GENERAL REPORT LOSS / DAMAGE (top-level button — no order context) ───

  const openGeneralReportModal = async () => {
    setGeneralReportError('');
    setGeneralReportModal({
      show: true,
      itemsLoading: true,
      products: [],
      ingredients: [],
      form: {
        item_type: 'product',
        item_id: '',
        quantity: '',
        unit: '',
        estimated_cost: '',
        damage_type: 'spoilage',
        description: '',
      },
    });

    try {
      const res = await axios.get('/staff/lost-and-damages/items');
      setGeneralReportModal(prev => ({
        ...prev,
        itemsLoading: false,
        products: res.data.products || [],
        ingredients: res.data.ingredients || [],
      }));
    } catch (err) {
      setGeneralReportModal(prev => ({ ...prev, itemsLoading: false }));
      setGeneralReportError('Failed to load products and ingredients.');
    }
  };

  const handleGeneralReportItemSelect = (itemId) => {
    const { item_type, products, ingredients } = generalReportModal;
    const idNum = Number(itemId);
    let unit = '';
    if (item_type === 'product') {
      const p = products.find((x) => x.id === idNum);
      unit = p?.unit || 'PCS';
    } else {
      const i = ingredients.find((x) => x.id === idNum);
      unit = i?.unit || '';
    }
    setGeneralReportModal(prev => ({
      ...prev,
      form: { ...prev.form, item_id: itemId, unit },
    }));
  };

  const handleGeneralReportSubmit = async (e) => {
    e.preventDefault();
    const { form } = generalReportModal;
    setGeneralReportError('');

    if (!form.item_id) { setGeneralReportError('Please select an item.'); return; }
    if (!form.quantity || Number(form.quantity) <= 0) { setGeneralReportError('Quantity must be greater than zero.'); return; }
    if (!form.unit) { setGeneralReportError('Unit is required.'); return; }
    if (form.estimated_cost === '' || Number(form.estimated_cost) < 0) { setGeneralReportError('Estimated cost is required.'); return; }

    setGeneralReportSubmitting(true);
    try {
      await axios.post('/staff/lost-and-damages', {
        item_id: Number(form.item_id),
        item_type: form.item_type,
        quantity: Number(form.quantity),
        unit: form.unit,
        estimated_cost: Number(form.estimated_cost),
        damage_type: form.damage_type,
        description: form.description || null,
      });
      setGeneralReportModal(prev => ({ ...prev, show: false }));
      alert('Loss/damage report submitted. Waiting for admin approval.');
    } catch (err) {
      setGeneralReportError(err.response?.data?.message || 'Failed to submit report.');
    } finally {
      setGeneralReportSubmitting(false);
    }
  };

  // ── Pagination Helpers ──
  const goToPage = (page) => {
    if (page < 1 || page > pagination.totalPages) return;
    setPagination(prev => ({ ...prev, currentPage: page }));
  };

  const handlePerPageChange = (e) => {
    const newPerPage = parseInt(e.target.value, 10);
    setPagination(prev => ({ ...prev, perPage: newPerPage, currentPage: 1 }));
  };

  const renderPageNumbers = () => {
    const { currentPage, totalPages } = pagination;
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);

    if (start > 1) {
      pages.push(1);
      if (start > 2) pages.push('...');
    }
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages) {
      if (end < totalPages - 1) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  if (loading) {
    return (
      <div style={{ background: CREAM, minHeight: '100vh' }} className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader className="animate-spin" style={{ color: SAGE }} size={36} />
          <p style={{ color: MUTED_GRAY, fontSize: '0.85rem' }}>Loading orders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-2xl flex items-center gap-3 m-6" style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FEE2E2' }}>
        <AlertCircle size={20} />
        <span>{error}</span>
      </div>
    );
  }

  const { currentPage, perPage, totalItems, totalPages } = pagination;
  const startItem = (currentPage - 1) * perPage + 1;
  const endItem = Math.min(currentPage * perPage, totalItems);

  return (
    <div style={{ background: CREAM, minHeight: '100vh', padding: '36px 28px' }}>
      <style>{`
        .grain-overlay { position: fixed; inset: 0; pointer-events: none; z-index: 0; opacity: 0.028; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E"); background-repeat: repeat; background-size: 128px; }
        .divider-line { height: 1px; background: linear-gradient(90deg, transparent, rgba(79,95,82,0.15), transparent); }
        .order-row { transition: background 0.15s ease; }
        .order-row:hover { background: rgba(242,237,228,0.7) !important; }
        .action-btn { transition: all 0.18s ease; border: none; cursor: pointer; border-radius: 10px; }
        .action-btn:hover { transform: scale(1.12); }
        .primary-btn { position: relative; overflow: hidden; transition: all 0.22s cubic-bezier(0.4,0,0.2,1); border: none; cursor: pointer; }
        .primary-btn::before { content: ''; position: absolute; inset: 0; background: rgba(255,255,255,0.1); opacity: 0; transition: opacity 0.2s; }
        .primary-btn:hover::before { opacity: 1; }
        .primary-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(79,95,82,0.3); }
        .primary-btn:active { transform: translateY(0); }
        .sec-btn { transition: all 0.2s ease; cursor: pointer; }
        .sec-btn:hover { background: rgba(79,95,82,0.07) !important; transform: translateY(-1px); }
        .modal-input:focus { box-shadow: 0 0 0 3px rgba(79,95,82,0.12); border-color: #4F5F52 !important; outline: none; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
        .fade-in { animation: fadeInUp 0.4s ease both; }
        .fade-in-1 { animation: fadeInUp 0.4s 0.05s ease both; }
        @keyframes modalIn { from { opacity: 0; transform: scale(0.96) translateY(12px); } to { opacity: 1; transform: none; } }
        .anim-modal { animation: modalIn 0.25s cubic-bezier(0.25,0.46,0.45,0.94); }
        .progress-thumb { transition: transform 0.2s ease; cursor: pointer; }
        .progress-thumb:hover { transform: scale(1.05); }
        .image-preview-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.8);
          display: flex; align-items: center; justify-content: center;
          z-index: 100; cursor: pointer;
        }
        .image-preview-overlay img {
          max-width: 90vw; max-height: 90vh; object-fit: contain;
          border-radius: 8px; box-shadow: 0 4px 30px rgba(0,0,0,0.3);
        }
        .pickup-proof-thumb { transition: transform 0.2s ease; cursor: pointer; }
        .pickup-proof-thumb:hover { transform: scale(1.05); }
        .pagination-btn {
          transition: all 0.2s ease;
          border: 1px solid rgba(166,162,154,0.3);
          background: #fff; padding: 6px 12px; border-radius: 6px;
          font-size: 0.8rem; font-weight: 600; color: ${SAGE};
          cursor: pointer; margin: 0 2px;
        }
        .pagination-btn:hover:not(:disabled) { background: ${SAGE}; color: #fff; border-color: ${SAGE}; transform: translateY(-1px); }
        .pagination-btn.active { background: ${SAGE}; color: #fff; border-color: ${SAGE}; }
        .pagination-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .per-page-select {
          border: 1px solid rgba(166,162,154,0.3);
          border-radius: 6px; padding: 4px 8px;
          font-size: 0.8rem; color: ${SAGE};
          background: #fff; outline: none;
        }
        .per-page-select:focus { border-color: ${SAGE}; }
        .rider-photo-thumb {
          transition: transform 0.2s ease; cursor: pointer;
          border-radius: 8px; overflow: hidden;
          border: 1.5px solid rgba(166,162,154,0.3);
          max-width: 200px;
        }
        .rider-photo-thumb:hover { transform: scale(1.03); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
        .rider-photo-thumb img { width: 100%; height: auto; display: block; }
        .pickup-method-section {
          background: #f8f7f4; border-radius: 12px;
          padding: 16px; margin-top: 12px;
          border: 1px solid rgba(242,237,228,0.8);
        }
        .pickup-method-section .label { font-weight: 600; color: ${SAGE}; font-size: 0.85rem; }
        .pickup-method-section .value { color: ${MUTED_GRAY}; font-size: 0.85rem; }
        .pickup-method-section .photo-label { font-weight: 600; color: ${SAGE}; font-size: 0.85rem; margin-top: 8px; margin-bottom: 4px; }
      `}</style>

      <div className="grain-overlay" />
      <div className="max-w-7xl mx-auto relative" style={{ zIndex: 1 }}>
        {/* Header */}
        <div className="flex flex-wrap justify-between items-start gap-4 mb-8 fade-in">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div style={{ width: 36, height: 36, background: `linear-gradient(135deg, ${SAGE}, #3e4c42)`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(79,95,82,0.25)', flexShrink: 0 }}>
                <ShoppingBag size={18} color="#fff" />
              </div>
              <h1 style={{ color: SAGE, fontSize: '1.55rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Order Management</h1>
            </div>
            <p style={{ color: MUTED_GRAY, fontSize: '0.82rem', letterSpacing: '0.03em', marginLeft: 48 }}>Create and process customer orders</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={openGeneralReportModal}
              className="primary-btn flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium"
              style={{
                background: 'linear-gradient(135deg, #D4A03D 0%, #b8872e 100%)',
                boxShadow: '0 4px 14px rgba(212,160,61,0.28)',
              }}
            >
              <AlertTriangle size={16} strokeWidth={2.2} />
              Report Loss / Damage
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="primary-btn flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium"
              style={{
                background: `linear-gradient(135deg, ${SAGE} 0%, #3e4c42 100%)`,
                boxShadow: '0 4px 14px rgba(79,95,82,0.28)',
              }}
            >
              <Plus size={16} strokeWidth={2.2} />
              New Walk‑in Order
            </button>
          </div>
        </div>

        <div className="divider-line mb-7" />

        {/* Filters */}
        <div className="fade-in-1 flex flex-wrap gap-4 mb-8">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: MUTED_GRAY }} />
            <input type="text" placeholder="Search order # or customer name…" value={search} onChange={(e) => setSearch(e.target.value)} className="modal-input w-full pl-10 pr-4 py-2.5 rounded-xl border bg-white text-sm" style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE }} />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="modal-input px-4 py-2.5 rounded-xl border bg-white text-sm" style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE }}>
            <option value="">All Status</option>
            {Object.keys(statusColors).map((s) => (<option key={s} value={s} className="capitalize">{s}</option>))}
          </select>
        </div>

        {/* Orders Table */}
        <div className="fade-in-1" style={{ background: '#fff', borderRadius: 20, border: '1.5px solid rgba(242,237,228,0.9)', boxShadow: '0 2px 12px rgba(79,95,82,0.06)', overflow: 'hidden' }}>
          <div className="overflow-x-auto">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: `linear-gradient(135deg, ${CREAM}, rgba(255,243,217,0.5))`, borderBottom: `1.5px solid ${CREAM}` }}>
                  {['Order #', 'Customer', 'Date', 'Pickup', 'Total', 'Status', 'Items', 'Actions'].map(col => (
                    <th key={col} style={{ padding: '13px 20px', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, color: SAGE, letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '48px 20px', color: MUTED_GRAY }}>
                      <div style={{ width: 56, height: 56, background: 'rgba(166,162,154,0.1)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', border: '1.5px dashed rgba(166,162,154,0.3)' }}>
                        <ShoppingBag size={24} style={{ color: MUTED_GRAY, opacity: 0.4 }} />
                      </div>
                      <p style={{ fontSize: '0.85rem' }}>No orders found</p>
                    </td>
                  </tr>
                ) : (
                  orders.map((order, idx) => (
                    <tr key={order.id} className="order-row" style={{ borderTop: idx === 0 ? 'none' : `1px solid rgba(242,237,228,0.8)` }}>
                      <td style={{ padding: '13px 20px', fontWeight: 700, color: SAGE, whiteSpace: 'nowrap', fontSize: '0.85rem' }}>{order.order_number}</td>
                      <td style={{ padding: '13px 20px' }}>
                        <p style={{ fontWeight: 600, color: SAGE, margin: 0 }}>{order.customer_name}</p>
                        {order.customer_phone && <p style={{ fontSize: '0.72rem', color: MUTED_GRAY, margin: 0 }}>{order.customer_phone}</p>}
                      </td>
                      <td style={{ padding: '13px 20px', color: MUTED_GRAY, fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{formatShortDate(order.order_date)}</td>
                      <td style={{ padding: '13px 20px', whiteSpace: 'nowrap' }}>
                        {order.pickup_date ? (
                          <div>
                            <span style={{ color: SAGE, fontWeight: 600 }}>{formatDisplayDate(order.pickup_date)}</span>
                            {order.pickup_time && <span style={{ color: MUTED_GRAY, marginLeft: 4 }}>{order.pickup_time.slice(0, 5)}</span>}
                          </div>
                        ) : <span style={{ color: MUTED_GRAY, fontSize: '0.78rem' }}>—</span>}
                      </td>
                      <td style={{ padding: '13px 20px', fontWeight: 700, color: SAGE, whiteSpace: 'nowrap' }}>₱{parseFloat(order.total_amount).toLocaleString()}</td>
                      <td style={{ padding: '13px 20px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 999, fontSize: '0.68rem', fontWeight: 600, background: statusBg[order.status] || 'rgba(166,162,154,0.1)', color: statusColors[order.status] || MUTED_GRAY, border: `1px solid ${statusColors[order.status]}33`, textTransform: 'capitalize' }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: statusColors[order.status] || MUTED_GRAY, display: 'inline-block' }} /> {order.status}
                        </span>
                      </td>
                      <td style={{ padding: '13px 20px' }}>
                        <div className="flex flex-wrap gap-1">
                          {order.items?.map(item => (
                            <span key={item.id} style={{ display: 'inline-block', background: 'rgba(79,95,82,0.07)', color: SAGE, borderRadius: 5, padding: '2px 6px', fontSize: '0.72rem', marginBottom: 2 }}>{item.menu?.name || 'Custom Cake'} ×{item.quantity}</span>
                          ))}
                        </div>
                      </td>

                      <td style={{ padding: '6px 10px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                          <button
                            onClick={() => handleViewOrder(order)}
                            className="action-btn"
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '3px',
                              padding: '4px 10px', borderRadius: '16px',
                              fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.02em',
                              background: '#5B7A8A', color: '#fff',
                              border: '1.5px solid #5B7A8A',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                              whiteSpace: 'nowrap', transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)';
                              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'none';
                              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
                            }}
                            title="View order details"
                          >
                            <Eye size={11} strokeWidth={2.2} />
                            View
                          </button>

                          {/* ── Row-level Report Loss / Damage ── */}
                          {['confirmed', 'preparing', 'ready', 'completed'].includes(order.status) &&
                            order.items?.some((i) => i.menu_id) && (
                              <button
                                onClick={() => openReportModal(order)}
                                className="action-btn"
                                style={{
                                  display: 'inline-flex', alignItems: 'center', gap: '3px',
                                  padding: '4px 10px', borderRadius: '16px',
                                  fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.02em',
                                  background: '#D4A03D', color: '#fff',
                                  border: '1.5px solid #D4A03D',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                                  whiteSpace: 'nowrap', transition: 'all 0.15s ease',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)';
                                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform = 'none';
                                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
                                }}
                                title="Report loss / damage for this order"
                              >
                                <AlertTriangle size={11} strokeWidth={2.2} />
                                Report
                              </button>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ─── Pagination Controls ─── */}
        {totalItems > 0 && (
          <div className="fade-in-1 mt-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-sm" style={{ color: MUTED_GRAY }}>
              <span>Showing <strong>{startItem}</strong> – <strong>{endItem}</strong> of <strong>{totalItems}</strong> orders</span>
              <div className="flex items-center gap-2">
                <span>Per page:</span>
                <select value={perPage} onChange={handlePerPageChange} className="per-page-select">
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                  <option value="200">200</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} className="pagination-btn">Previous</button>
              {renderPageNumbers().map((p, idx) =>
                p === '...' ? (
                  <span key={idx} className="px-2 text-muted" style={{ color: MUTED_GRAY }}>…</span>
                ) : (
                  <button key={idx} onClick={() => goToPage(p)} className={`pagination-btn ${currentPage === p ? 'active' : ''}`}>{p}</button>
                )
              )}
              <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} className="pagination-btn">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Create Order Modal */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(30,35,30,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16, backdropFilter: 'blur(4px)' }}>
          <div className="anim-modal" style={{ background: '#fff', borderRadius: 22, width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(79,95,82,0.18), 0 4px 16px rgba(0,0,0,0.08)', border: '1px solid rgba(242,237,228,0.8)' }}>
            <div style={{ position: 'sticky', top: 0, zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: `1px solid ${CREAM}`, background: `linear-gradient(135deg, rgba(79,95,82,0.04), rgba(255,243,217,0.3))`, backdropFilter: 'blur(8px)' }}>
              <div className="flex items-center gap-3">
                <div style={{ width: 32, height: 32, background: `linear-gradient(135deg, ${SAGE}, #3e4c42)`, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 10px rgba(79,95,82,0.25)' }}><Plus size={15} color="#fff" /></div>
                <h3 style={{ color: SAGE, fontWeight: 700, fontSize: '1.05rem' }}>New Walk‑in Order</h3>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="hover:bg-cream/50 p-1.5 rounded-lg" style={{ color: MUTED_GRAY }}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-xs font-semibold mb-1" style={{ color: SAGE }}>Customer Name *</label><input type="text" value={createForm.customer_name} onChange={e => setCreateForm({...createForm, customer_name: e.target.value})} required className="modal-input w-full px-3.5 py-2.5 rounded-xl border text-sm" style={{ borderColor:'rgba(166,162,154,0.3)', color:SAGE, background:'#fafafa' }} /></div>
                <div><label className="block text-xs font-semibold mb-1" style={{ color: SAGE }}>Phone (optional)</label><input type="text" value={createForm.customer_phone} onChange={e => setCreateForm({...createForm, customer_phone: e.target.value})} className="modal-input w-full px-3.5 py-2.5 rounded-xl border text-sm" style={{ borderColor:'rgba(166,162,154,0.3)', color:SAGE, background:'#fafafa' }} /></div>
                <div><label className="block text-xs font-semibold mb-1" style={{ color: SAGE }}>Pickup Date</label><input type="date" value={createForm.pickup_date} onChange={e => setCreateForm({...createForm, pickup_date: e.target.value})} className="modal-input w-full px-3.5 py-2.5 rounded-xl border text-sm" style={{ borderColor:'rgba(166,162,154,0.3)', color:SAGE, background:'#fafafa' }} /></div>
                <div><label className="block text-xs font-semibold mb-1" style={{ color: SAGE }}>Pickup Time</label><input type="time" value={createForm.pickup_time} onChange={e => setCreateForm({...createForm, pickup_time: e.target.value})} className="modal-input w-full px-3.5 py-2.5 rounded-xl border text-sm" style={{ borderColor:'rgba(166,162,154,0.3)', color:SAGE, background:'#fafafa' }} /></div>
                <div className="md:col-span-2"><label className="block text-xs font-semibold mb-1" style={{ color: SAGE }}>Notes</label><textarea value={createForm.notes} onChange={e => setCreateForm({...createForm, notes: e.target.value})} rows={2} className="modal-input w-full px-3.5 py-2.5 rounded-xl border text-sm resize-none" style={{ borderColor:'rgba(166,162,154,0.3)', color:SAGE, background:'#fafafa' }} /></div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2"><span className="text-xs font-semibold" style={{ color: SAGE }}>Items *</span><button type="button" onClick={addItemToCreate} className="text-xs flex items-center gap-1 px-3 py-1 rounded-lg" style={{ color: SAGE, background: 'rgba(79,95,82,0.08)' }}><Plus size={12} /> Add Item</button></div>
                {createForm.items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 mb-2">
                    <select value={item.menu_id} onChange={e => updateItemCreate(idx, 'menu_id', e.target.value)} required className="flex-1 modal-input px-3 py-2 rounded-xl border text-sm" style={{ borderColor:'rgba(166,162,154,0.3)', color:SAGE, background:'#fafafa' }}><option value="">Select product</option>{menuItems.filter(m => m.is_active).map(m => (<option key={m.id} value={m.id}>{m.name} — ₱{parseFloat(m.base_price).toLocaleString()}</option>))}</select>
                    <input type="number" min="1" value={item.quantity} onChange={e => updateItemCreate(idx, 'quantity', e.target.value)} required className="w-20 modal-input px-3 py-2 rounded-xl border text-sm" style={{ borderColor:'rgba(166,162,154,0.3)', color:SAGE, background:'#fafafa' }} />
                    <button type="button" onClick={() => removeItemFromCreate(idx)} className="p-1.5 rounded-lg" style={{ color: '#EF4444' }}><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
              <div className="divider-line" />
              <div className="flex justify-end gap-3"><button type="button" onClick={() => setShowCreateModal(false)} className="sec-btn px-5 py-2.5 rounded-xl border text-sm" style={{ borderColor:'rgba(166,162,154,0.3)', color:MUTED_GRAY }}>Cancel</button><button type="submit" disabled={submitting} className="primary-btn flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm disabled:opacity-50" style={{ background:`linear-gradient(135deg, ${SAGE}, #3e4c42)` }}>{submitting ? <Loader size={15} className="animate-spin" /> : <Check size={16} />}{submitting ? 'Creating…' : 'Create Order'}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* ─── View Order Details Modal ─── */}
      {viewOrderModal.show && viewOrderModal.order && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(30,35,30,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16, backdropFilter: 'blur(4px)' }}>
          <div className="anim-modal" style={{ background: '#fff', borderRadius: 22, width: '100%', maxWidth: 700, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(79,95,82,0.18), 0 4px 16px rgba(0,0,0,0.08)', border: '1px solid rgba(242,237,228,0.8)', padding: '24px' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 style={{ color: SAGE, fontWeight: 700, fontSize: '1.2rem' }}>Order Details</h3>
              <button onClick={() => setViewOrderModal({ show: false, order: null })} style={{ color: MUTED_GRAY, padding: 7, borderRadius: 10, background: 'transparent', cursor: 'pointer' }}><X size={24} /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left column – Order Information */}
              <div>
                <h4 style={{ fontWeight: 700, color: SAGE, marginBottom: 8 }}>Order Information</h4>
                <p><strong>Order #:</strong> {viewOrderModal.order.order_number}</p>
                <p><strong>Customer:</strong> {viewOrderModal.order.customer_name}</p>
                <p><strong>Phone:</strong> {viewOrderModal.order.customer_phone || 'N/A'}</p>
                <p><strong>Pickup:</strong> {viewOrderModal.order.pickup_date ? `${formatDisplayDate(viewOrderModal.order.pickup_date)} ${viewOrderModal.order.pickup_time ? viewOrderModal.order.pickup_time.slice(0,5) : ''}` : 'Not set'}</p>
                <p><strong>Status:</strong> <span className="capitalize">{viewOrderModal.order.status}</span></p>
                <p><strong>Payment:</strong> {viewOrderModal.order.payment_status?.replace('_', ' ') || 'Unpaid'}</p>

                {/* ── Subtotal ── */}
                <p><strong>Subtotal:</strong> ₱{parseFloat(viewOrderModal.order.subtotal || 0).toLocaleString()}</p>

                {/* ── Discount (if any) ── */}
                {viewOrderModal.order.discount_total > 0 && (
                  <p><strong>Discount:</strong> <span style={{ color: '#16a34a' }}>-₱{parseFloat(viewOrderModal.order.discount_total).toLocaleString()}</span></p>
                )}

                <p><strong>Total:</strong> ₱{parseFloat(viewOrderModal.order.total_amount).toLocaleString()}</p>

                {viewOrderModal.order.notes && <p><strong>Notes:</strong> {viewOrderModal.order.notes}</p>}

                <div className="mt-4 p-3 rounded-lg" style={{ background: CREAM }}>
                  <h5 style={{ fontWeight: 600, color: SAGE, marginBottom: 4 }}>Items</h5>
                  {viewOrderModal.order.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between border-b border-gray-200 py-1">
                      <span>{item.menu?.name || 'Custom Cake'} × {item.quantity}</span>
                      <span>₱{parseFloat(item.total_price || item.unit_price * item.quantity).toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                {viewOrderModal.order.payments && viewOrderModal.order.payments.length > 0 && (
                  <div className="mt-4">
                    <h4 style={{ fontWeight: 700, color: SAGE, marginBottom: 8 }}>Payments</h4>
                    {viewOrderModal.order.payments.map((payment, idx) => (
                      <div key={idx} style={{ padding: 10, background: '#f8f7f4', borderRadius: 8, marginBottom: 8 }}>
                        <p><strong>Amount:</strong> ₱{parseFloat(payment.amount_paid).toLocaleString()}</p>
                        <p><strong>Method:</strong> {payment.payment_method}</p>
                        <p><strong>Reference:</strong> {payment.reference_number || 'N/A'}</p>
                        {payment.proof_image_url && (
                          <div>
                            <p><strong>Payment Proof:</strong></p>
                            <img
                              src={payment.proof_image_url}
                              alt="Payment proof"
                              style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, border: '1px solid #ddd' }}
                            />
                          </div>
                        )}
                        <p><strong>Date:</strong> {new Date(payment.payment_date).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* ─── CUSTOMER FEEDBACK ─── */}
                <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: '#f8f7f4', border: '1px solid rgba(79,95,82,0.15)' }}>
                  <h4 style={{ fontWeight: 700, color: SAGE, marginBottom: 8, fontSize: 14 }}>Customer Feedback</h4>
                  {viewOrderModal.order.feedback ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ color: MUTED_GRAY, fontSize: 13, marginRight: 8 }}>Rating:</span>
                        <div style={{ display: 'flex' }}>
                          {[1, 2, 3, 4, 5].map(star => (
                            <span key={star} style={{ color: star <= viewOrderModal.order.feedback.rating ? '#F5A623' : MUTED_GRAY, fontSize: 16, marginRight: 2 }}>
                              {star <= viewOrderModal.order.feedback.rating ? '★' : '☆'}
                            </span>
                          ))}
                        </div>
                      </div>
                      {viewOrderModal.order.feedback.comment && (
                        <div style={{ marginBottom: 4 }}>
                          <span style={{ color: MUTED_GRAY, fontSize: 13 }}>Comment:</span>
                          <p style={{ color: SAGE, fontSize: 13, marginTop: 2 }}>{viewOrderModal.order.feedback.comment}</p>
                        </div>
                      )}
                      <span style={{ color: MUTED_GRAY, fontSize: 11, marginTop: 4, display: 'block' }}>
                        Submitted: {new Date(viewOrderModal.order.feedback.created_at).toLocaleString()}
                      </span>
                    </>
                  ) : (
                    <span style={{ color: MUTED_GRAY, fontSize: 13 }}>No customer feedback has been submitted yet.</span>
                  )}
                </div>

                {/* ─── Pickup Method (with Rider Photo) ─── */}
                {viewOrderModal.order.pickup_method && (
                  <div className="mt-4 pickup-method-section">
                    <h4 style={{ fontWeight: 700, color: SAGE, marginBottom: 8 }}>Pickup Method</h4>
                    <div>
                      <p><span className="label">Method:</span> <span className="value">{viewOrderModal.order.pickup_method === 'customer' ? 'Customer Pickup' : 'Rider Pickup'}</span></p>

                      {viewOrderModal.order.pickup_method === 'rider' && (
                        <>
                          {viewOrderModal.order.rider_photo_url && (
                            <div className="mt-2">
                              <p className="photo-label">Rider Information Photo:</p>
                              <div
                                className="rider-photo-thumb"
                                onClick={() => setImagePreviewModal({ show: true, url: viewOrderModal.order.rider_photo_url })}
                              >
                                <img
                                  src={viewOrderModal.order.rider_photo_url}
                                  alt="Rider information"
                                  style={{ maxWidth: '200px', maxHeight: '150px', objectFit: 'contain' }}
                                />
                              </div>
                            </div>
                          )}

                          <p><span className="label">Rider Name:</span> <span className="value">{viewOrderModal.order.rider_name || 'Not provided'}</span></p>
                          <p><span className="label">Rider Phone:</span> <span className="value">{viewOrderModal.order.rider_phone || 'Not provided'}</span></p>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right column – Cake Design, then Pickup Proof, then Cake Progress */}
              <div>
                {viewOrderModal.order.items && viewOrderModal.order.items.length > 0 ? (
                  <>
                    <h4 style={{ fontWeight: 700, color: SAGE, marginBottom: 8 }}>Items Preview</h4>
                    {viewOrderModal.order.items.map((item, idx) => {
                      const isCustom = item.cake_type === 'custom' && item.custom_design;

                      // ─── Custom Cake ───
                      if (isCustom) {
                        const design = item.custom_design;
                        return (
                          <div key={idx} className="mt-4">
                            <CakePreviewWeb design={design} size={300} />
                            <div className="mt-3 p-3 rounded-lg" style={{ background: CREAM }}>
                              <p style={{ fontWeight: 600, color: SAGE, marginBottom: 4 }}>
                                Custom Cake × {item.quantity}
                              </p>
                              <p><strong>Size:</strong> {design.cake_size?.size_name || 'N/A'}</p>
                              <p><strong>Flavor:</strong> {design.cake_flavor?.flavor_name || 'N/A'}</p>
                              <p><strong>Frosting:</strong> {design.frosting_flavor || 'N/A'}</p>
                              <p><strong>Decorations:</strong> {design.decorations_with_elements?.length || 0}</p>
                              {design.special_instructions && (
                                <p><strong>Instructions:</strong> {design.special_instructions}</p>
                              )}
                            </div>
                          </div>
                        );
                      }

                      // ─── Standard Product ───
                      const productName = item.menu?.name || 'Product';
                      const rawImg = item.menu?.image_url || null;
                      const fullImg = getFullImageUrl(rawImg);

                      return (
                        <div
                          key={idx}
                          className="mt-4"
                          style={{
                            display: 'flex',
                            gap: 12,
                            padding: 12,
                            background: CREAM,
                            borderRadius: 12,
                            alignItems: 'center',
                          }}
                        >
                          {fullImg ? (
                            <img
                              src={fullImg}
                              alt={productName}
                              style={{
                                width: 80,
                                height: 80,
                                objectFit: 'cover',
                                borderRadius: 8,
                                flexShrink: 0,
                                border: '1px solid rgba(166,162,154,0.2)',
                              }}
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.parentElement.insertAdjacentHTML(
                                  'afterbegin',
                                  `<div style="width:80px;height:80px;background:#E8E2D8;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:1.5rem;flex-shrink:0;">🍰</div>`
                                );
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: 80,
                                height: 80,
                                background: '#E8E2D8',
                                borderRadius: 8,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.5rem',
                                flexShrink: 0,
                              }}
                            >
                              🍰
                            </div>
                          )}
                          <div style={{ flex: 1 }}>
                            <p style={{ fontWeight: 600, color: SAGE, margin: 0 }}>
                              {productName}
                            </p>
                            <p style={{ fontSize: '0.85rem', color: MUTED_GRAY, margin: '4px 0 0' }}>
                              Qty: {item.quantity}
                            </p>
                            <p style={{ fontSize: '0.85rem', color: MUTED_GRAY, margin: '2px 0 0' }}>
                              ₱{parseFloat(item.unit_price || 0).toLocaleString()} each
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </>
                ) : (
                  <div className="w-full max-w-[300px] aspect-square flex items-center justify-center bg-gray-100 rounded-lg text-gray-400 text-sm">
                    No items in this order
                  </div>

                )}

                {/* ─── Pickup Proof (upload + display) ─── */}
                {viewOrderModal.order.pickup_method === 'rider' && (
                  <div className="mt-6">
                    <h4 style={{ fontWeight: 700, color: SAGE, marginBottom: 8 }}>Pickup Proof</h4>

                    {/* Upload section */}
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handlePickupFileSelect}
                          style={{ padding: '6px' }}
                        />
                        {pickupPreviews.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {pickupPreviews.map((url, idx) => (
                              <img key={idx} src={url} alt={`Preview ${idx+1}`} style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4, border: '1px solid #ddd' }} />
                            ))}
                            <button
                              onClick={() => { setSelectedPickupFiles([]); setPickupPreviews([]); }}
                              className="action-btn p-1 rounded-lg"
                              style={{ color: '#EF4444', background: 'transparent' }}
                              title="Clear selection"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        )}
                        <button
                          onClick={handleUploadPickupProof}
                          disabled={selectedPickupFiles.length === 0 || uploadingPickup}
                          className="primary-btn flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50"
                          style={{
                            background: `linear-gradient(135deg, ${SAGE}, #3e4c42)`,
                            alignSelf: 'flex-start',
                            border: 'none',
                            cursor: uploadingPickup || selectedPickupFiles.length === 0 ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {uploadingPickup ? <Loader size={14} className="animate-spin" /> : <Check size={14} />}
                          {uploadingPickup ? 'Uploading...' : `Upload ${selectedPickupFiles.length} photo${selectedPickupFiles.length > 1 ? 's' : ''}`}
                        </button>
                      </div>
                    </div>

                    {/* Display existing pickup proof images */}
                    {viewOrderModal.order.pickup_proof_images_with_urls && viewOrderModal.order.pickup_proof_images_with_urls.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {viewOrderModal.order.pickup_proof_images_with_urls.map((img, idx) => (
                          <div
                            key={idx}
                            className="pickup-proof-thumb"
                            style={{ position: 'relative', width: 80, height: 80, borderRadius: 6, overflow: 'hidden', border: '1px solid #ddd' }}
                            onClick={() => setImagePreviewModal({ show: true, url: img.image_url })}
                          >
                            <img
                              src={img.image_url}
                              alt={`Pickup proof ${idx + 1}`}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            <span style={{ position: 'absolute', bottom: 2, right: 4, fontSize: '0.55rem', background: 'rgba(0,0,0,0.5)', color: '#fff', padding: '1px 4px', borderRadius: 2 }}>
                              {new Date(img.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: MUTED_GRAY, fontSize: '0.85rem' }}>No pickup proof images uploaded yet.</p>
                    )}
                  </div>
                )}

                {/* ─── Cake Progress (view‑only) ─── */}
                {viewOrderModal.order.items?.some(item => item.cake_type === 'custom') && (
                  <div className="mt-6">
                    <h4 style={{ fontWeight: 700, color: SAGE, marginBottom: 8 }}>Cake Progress</h4>
                    {viewOrderModal.order.progress_images_with_urls && viewOrderModal.order.progress_images_with_urls.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {viewOrderModal.order.progress_images_with_urls.map((img, idx) => (
                          <div
                            key={idx}
                            className="progress-thumb"
                            style={{ position: 'relative', width: 80, height: 80, borderRadius: 6, overflow: 'hidden', border: '1px solid #ddd' }}
                            onClick={() => setImagePreviewModal({ show: true, url: img.image_url })}
                          >
                            <img
                              src={img.image_url}
                              alt={`Progress ${idx + 1}`}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            <span style={{ position: 'absolute', bottom: 2, right: 4, fontSize: '0.55rem', background: 'rgba(0,0,0,0.5)', color: '#fff', padding: '1px 4px', borderRadius: 2 }}>
                              {new Date(img.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: MUTED_GRAY, fontSize: '0.85rem' }}>No progress images uploaded yet.</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button onClick={() => setViewOrderModal({ show: false, order: null })} className="px-5 py-2.5 rounded-xl text-white font-medium" style={{ background: `linear-gradient(135deg, ${SAGE}, #3e4c42)` }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Image Preview Modal ─── */}
      {imagePreviewModal.show && (
        <div className="image-preview-overlay" onClick={() => setImagePreviewModal({ show: false, url: null })}>
          <img src={imagePreviewModal.url} alt="Preview" />
        </div>
      )}

      {/* ═══ Row-level Report Loss / Damage Modal ═══ */}
      {reportModal.show && reportModal.order && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(30,35,30,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16, backdropFilter: 'blur(4px)' }}>
          <div className="anim-modal" style={{ background: '#fff', borderRadius: 22, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(79,95,82,0.18)', border: '1px solid rgba(242,237,228,0.8)' }}>
            <div style={{ position: 'sticky', top: 0, zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: `1px solid ${CREAM}`, background: `linear-gradient(135deg, rgba(79,95,82,0.04), rgba(255,243,217,0.3))`, backdropFilter: 'blur(8px)' }}>
              <div className="flex items-center gap-3">
                <div style={{ width: 34, height: 34, background: 'linear-gradient(135deg, #D4A03D, #b8872e)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 10px rgba(212,160,61,0.3)' }}>
                  <AlertTriangle size={16} color="#fff" />
                </div>
                <div>
                  <h3 style={{ color: SAGE, fontWeight: 700, fontSize: '1.05rem' }}>Report Loss / Damage</h3>
                  <p style={{ color: MUTED_GRAY, fontSize: '0.72rem', marginTop: 2 }}>Order {reportModal.order.order_number} — {reportModal.order.customer_name}</p>
                </div>
              </div>
              <button onClick={() => setReportModal((m) => ({ ...m, show: false }))} style={{ color: MUTED_GRAY, padding: 7, borderRadius: 10, background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleReportSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: SAGE, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>Product *</label>
                <select value={reportModal.form.order_item_id} onChange={(e) => handleReportItemChange(e.target.value)} className="modal-input w-full px-3.5 py-2.5 rounded-xl border text-sm" style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa', cursor: 'pointer' }}>
                  {reportModal.items.map((it) => (
                    <option key={it.id} value={it.id}>{it.menu.name} — ordered {it.quantity} pcs</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: SAGE, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>Quantity *</label>
                  <input type="number" min="1" step="1" max={reportModal.items.find((i) => String(i.id) === String(reportModal.form.order_item_id))?.quantity || 1} value={reportModal.form.quantity} onChange={(e) => handleReportQuantityChange(e.target.value)} className="modal-input w-full px-3.5 py-2.5 rounded-xl border text-sm" style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa' }} />
                  <p style={{ color: MUTED_GRAY, fontSize: '0.7rem', marginTop: 4 }}>Max: {reportModal.items.find((i) => String(i.id) === String(reportModal.form.order_item_id))?.quantity || 1}</p>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: SAGE, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>Unit *</label>
                  <input type="text" value={reportModal.form.unit} onChange={(e) => setReportModal((m) => ({ ...m, form: { ...m.form, unit: e.target.value } }))} className="modal-input w-full px-3.5 py-2.5 rounded-xl border text-sm" style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa' }} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: SAGE, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>Estimated Cost (₱) *</label>
                  <input type="number" step="0.01" min="0" value={reportModal.form.estimated_cost} onChange={(e) => setReportModal((m) => ({ ...m, form: { ...m.form, estimated_cost: e.target.value } }))} className="modal-input w-full px-3.5 py-2.5 rounded-xl border text-sm" style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: SAGE, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>Damage Type *</label>
                  <select value={reportModal.form.damage_type} onChange={(e) => setReportModal((m) => ({ ...m, form: { ...m.form, damage_type: e.target.value } }))} className="modal-input w-full px-3.5 py-2.5 rounded-xl border text-sm" style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa', cursor: 'pointer' }}>
                    <option value="spoilage">Spoilage</option>
                    <option value="breakage">Breakage</option>
                    <option value="expired">Expired</option>
                    <option value="misproduction">Misproduction</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: SAGE, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>Description (Optional)</label>
                <textarea value={reportModal.form.description} onChange={(e) => setReportModal((m) => ({ ...m, form: { ...m.form, description: e.target.value } }))} rows={3} placeholder="Explain what happened…" className="modal-input w-full px-3.5 py-2.5 rounded-xl border text-sm resize-none" style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa' }} />
              </div>

              <div className="divider-line" />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button type="button" onClick={() => setReportModal((m) => ({ ...m, show: false }))} className="sec-btn px-5 py-2.5 rounded-xl border text-sm font-medium" style={{ borderColor: 'rgba(166,162,154,0.3)', color: MUTED_GRAY, background: 'transparent' }}>Cancel</button>
                <button type="submit" disabled={reportSubmitting} className="primary-btn flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #D4A03D, #92670a)' }}>
                  {reportSubmitting ? <Loader size={15} className="animate-spin" /> : <AlertTriangle size={15} />}
                  {reportSubmitting ? 'Submitting…' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ GENERAL Report Loss / Damage Modal (top-level button) ═══ */}
      {generalReportModal.show && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(30,35,30,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16, backdropFilter: 'blur(4px)' }}>
          <div className="anim-modal" style={{ background: '#fff', borderRadius: 22, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(79,95,82,0.18)', border: '1px solid rgba(242,237,228,0.8)' }}>
            <div style={{ position: 'sticky', top: 0, zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: `1px solid ${CREAM}`, background: `linear-gradient(135deg, rgba(79,95,82,0.04), rgba(255,243,217,0.3))`, backdropFilter: 'blur(8px)' }}>
              <div className="flex items-center gap-3">
                <div style={{ width: 34, height: 34, background: 'linear-gradient(135deg, #D4A03D, #b8872e)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 10px rgba(212,160,61,0.3)' }}>
                  <AlertTriangle size={16} color="#fff" />
                </div>
                <h3 style={{ color: SAGE, fontWeight: 700, fontSize: '1.05rem' }}>Report Loss / Damage</h3>
              </div>
              <button onClick={() => setGeneralReportModal((m) => ({ ...m, show: false }))} style={{ color: MUTED_GRAY, padding: 7, borderRadius: 10, background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleGeneralReportSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {generalReportError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 12, fontSize: '0.82rem', background: '#FEF2F2', color: '#DC2626', border: '1px solid #FEE2E2' }}>
                  <AlertCircle size={15} /> {generalReportError}
                </div>
              )}

              {/* Item Type Toggle */}
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: SAGE, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8 }}>Item Type *</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[
                    { value: 'product', label: 'Product' },
                    { value: 'ingredient', label: 'Ingredient' },
                  ].map((opt) => {
                    const active = generalReportModal.form.item_type === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setGeneralReportModal((m) => ({
                          ...m,
                          form: { ...m.form, item_type: opt.value, item_id: '', unit: '' },
                        }))}
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

              {/* Item Select */}
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: SAGE, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>
                  {generalReportModal.form.item_type === 'product' ? 'Product' : 'Ingredient'} *
                </label>
                <select
                  value={generalReportModal.form.item_id}
                  onChange={(e) => handleGeneralReportItemSelect(e.target.value)}
                  required
                  disabled={generalReportModal.itemsLoading}
                  className="modal-input w-full px-3.5 py-2.5 rounded-xl border text-sm"
                  style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa', cursor: generalReportModal.itemsLoading ? 'wait' : 'pointer' }}
                >
                  <option value="">
                    {generalReportModal.itemsLoading
                      ? 'Loading…'
                      : `Select ${generalReportModal.form.item_type}`}
                  </option>
                  {(generalReportModal.form.item_type === 'product'
                    ? generalReportModal.products
                    : generalReportModal.ingredients
                  ).map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.name}
                      {generalReportModal.form.item_type === 'product' && it.sku ? ` (${it.sku})` : ''}
                      {generalReportModal.form.item_type === 'ingredient' && it.unit ? ` — ${it.unit}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity + Unit */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: SAGE, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>Quantity *</label>
                  <input type="number" step="0.01" min="0.01" value={generalReportModal.form.quantity} onChange={(e) => setGeneralReportModal((m) => ({ ...m, form: { ...m.form, quantity: e.target.value } }))} required className="modal-input w-full px-3.5 py-2.5 rounded-xl border text-sm" style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: SAGE, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>Unit *</label>
                  <input type="text" value={generalReportModal.form.unit} onChange={(e) => setGeneralReportModal((m) => ({ ...m, form: { ...m.form, unit: e.target.value } }))} required placeholder="e.g., PCS, G, ML" className="modal-input w-full px-3.5 py-2.5 rounded-xl border text-sm" style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa' }} />
                </div>
              </div>

              {/* Est cost + Damage type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: SAGE, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>Estimated Cost (₱) *</label>
                  <input type="number" step="0.01" min="0" value={generalReportModal.form.estimated_cost} onChange={(e) => setGeneralReportModal((m) => ({ ...m, form: { ...m.form, estimated_cost: e.target.value } }))} required className="modal-input w-full px-3.5 py-2.5 rounded-xl border text-sm" style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: SAGE, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>Damage Type *</label>
                  <select value={generalReportModal.form.damage_type} onChange={(e) => setGeneralReportModal((m) => ({ ...m, form: { ...m.form, damage_type: e.target.value } }))} required className="modal-input w-full px-3.5 py-2.5 rounded-xl border text-sm" style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa', cursor: 'pointer' }}>
                    <option value="spoilage">Spoilage</option>
                    <option value="breakage">Breakage</option>
                    <option value="expired">Expired</option>
                    <option value="misproduction">Misproduction</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: SAGE, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>Description (Optional)</label>
                <textarea value={generalReportModal.form.description} onChange={(e) => setGeneralReportModal((m) => ({ ...m, form: { ...m.form, description: e.target.value } }))} rows={3} placeholder="Explain what happened…" className="modal-input w-full px-3.5 py-2.5 rounded-xl border text-sm resize-none" style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa' }} />
              </div>

              <div className="divider-line" />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button type="button" onClick={() => setGeneralReportModal((m) => ({ ...m, show: false }))} className="sec-btn px-5 py-2.5 rounded-xl border text-sm font-medium" style={{ borderColor: 'rgba(166,162,154,0.3)', color: MUTED_GRAY, background: 'transparent' }}>
                  Cancel
                </button>
                <button type="submit" disabled={generalReportSubmitting || generalReportModal.itemsLoading} className="primary-btn flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #D4A03D, #92670a)' }}>
                  {generalReportSubmitting ? <Loader size={15} className="animate-spin" /> : <AlertTriangle size={15} />}
                  {generalReportSubmitting ? 'Submitting…' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}