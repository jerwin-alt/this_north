// web/src/pages/Orders.jsx

import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from '/api/axios';
import {
  Loader,
  AlertCircle,
  X,
  Check,
  Search,
  ShoppingBag,
  CheckCircle,
  XCircle,
  Eye,
  Play,
  Ban,
  AlertTriangle,
  Edit3, Plus, Trash2, Cake,
} from 'lucide-react';

// ── Import cake background and strawberry fallback ──
// import cakeBackground from '../assets/CUSTOMIZE_CAKE7_YES.png';
import strawberryImage from '../assets/CUSTOMIZE_CAKE5.jpg';
import SvgDecorationWeb from '../components/SvgDecorationWeb';
import CakePreviewShared from '../components/CakePreviewShared';
import { API_ORIGIN } from '../utils/apiBase';
import { initWebEcho } from '/services/echo';

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

// const API_BASE_URL = axios.defaults.baseURL?.replace('/api', '') || 'http://10.90.129.170:8000';
const API_BASE_URL = API_ORIGIN;
const getFullImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

function getFallbackUrl(elementName) {
  const key = elementName?.toLowerCase().replace(/\s/g, '') || '';
  if (key === 'strawberry') return strawberryImage;
  return null;   // No more wrong Flaticon icons
}

// ── CakePreviewWeb ──
// function CakePreviewWeb({ design, size = 150 }) {
//   const decorations = design?.decorations_with_elements || [];
//   const canvasSize = 400;
//   if (!decorations || decorations.length === 0) {
//     return (
//       <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f0ea', borderRadius: 8, border: '1px solid #ddd', color: MUTED_GRAY, fontSize: '0.8rem' }}>
//         No decorations
//       </div>
//     );
//   }
//   return (
//     <div style={{ width: size, height: size, position: 'relative', overflow: 'hidden', borderRadius: 8, background: '#f5f0ea', border: '1px solid #ddd' }}>
//       {/* Base cake — SVG from public/ */}
//       <img
//         src="/cake-base.svg"
//         alt="Cake base"
//         style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }}
//         onError={(e) => (e.target.style.display = 'none')}
//       />
//       {decorations.map((dec, idx) => {
//         const decSize = size * 0.4 * (dec.scale ?? 1);
//         const x = (dec.x / canvasSize) * size;
//         const y = (dec.y / canvasSize) * size;
//         return (
//           <div
//             key={idx}
//             style={{
//               position: 'absolute',
//               left: x - decSize / 2,
//               top: y - decSize / 2,
//               width: decSize,
//               height: decSize,
//               pointerEvents: 'none',
//             }}
//           >
//             <SvgDecorationWeb
//               svgSource={dec.svg_source}
//               imageUrl={getFullImageUrl(dec.image_url)}
//               fallbackUrl={getFallbackUrl(dec.element_name)}
//               size={decSize}
//               color={dec.color}
//               colors={dec.colors}
//             />
//           </div>
//         );
//       })}
//     </div>
//   );
// }

// ── Main Admin Orders ──
export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);   // ← NEW: only first load shows full spinner
  const [isFetching, setIsFetching] = useState(false);    // ← NEW: background fetches (search/page)
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState(''); // ← NEW
  const [statusFilter, setStatusFilter] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  // ── Toast (auto-dismissing notification) ──
  const [toast, setToast] = useState({ show: false, type: 'success', message: '' });

  // ── Approve Confirmation Modal ──
  const [approveConfirm, setApproveConfirm] = useState({ show: false, order: null });

  // ── Rejection Modal ──
  const [rejectModal, setRejectModal] = useState({ show: false, orderId: null });
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  // ── Cancel Modal ──
  const [cancelModal, setCancelModal] = useState({ show: false, orderId: null, orderNumber: '' });
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // ── Order Detail View Modal ──
  const [viewModal, setViewModal] = useState({ show: false, order: null });

  // ── Progress Image Upload State ──
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);

  // ── Image Preview Modal State ──
  const [imagePreviewModal, setImagePreviewModal] = useState({ show: false, url: null, design: null });

  // ── Admin Reply State ──
  const [replyInput, setReplyInput] = useState({});
  const [replyingFeedbackId, setReplyingFeedbackId] = useState(null);
  const [submittingReply, setSubmittingReply] = useState(false);

  // ── Report Loss / Damage Modal State ──
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

  // ── Pagination State ──
  const [pagination, setPagination] = useState({
    currentPage: 1,
    perPage: 50,
    totalPages: 1,
    totalItems: 0,
  });




  // ── Edit Custom Cake Modal ──
  const [customCakeModal, setCustomCakeModal] = useState({
    show: false,
    order: null,
    loading: false,
    submitting: false,
    isStaffWalkin: false,
    paymentStatus: '',
    bomLocked: false,
    form: { total_amount: '', payment_status: '', bom: [] },
  });
  const [ingredientsList, setIngredientsList] = useState([]);
  const [ingredientsLoading, setIngredientsLoading] = useState(false);



  // ── Live filter snapshot for the WebSocket listener ──
  const filtersRef = useRef({ statusFilter, debouncedSearch });
  useEffect(() => {
    filtersRef.current = { statusFilter, debouncedSearch };
  }, [statusFilter, debouncedSearch]);

  // ── Toast auto-dismiss ──
  useEffect(() => {
    if (!toast.show) return;
    const timer = setTimeout(() => {
      setToast((t) => ({ ...t, show: false }));
    }, 2800);
    return () => clearTimeout(timer);
  }, [toast.show]);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ show: true, type, message });
  }, []);

  const extractOrdersArray = (responseData) => {
    if (Array.isArray(responseData)) return responseData;
    if (responseData?.data && Array.isArray(responseData.data)) return responseData.data;
    if (responseData?.orders) {
      if (Array.isArray(responseData.orders)) return responseData.orders;
      if (responseData.orders?.data && Array.isArray(responseData.orders.data)) return responseData.orders.data;
    }
    return [];
  };

  // Debounce the search input so we don't fetch on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      // Reset to page 1 whenever the (debounced) search changes
      setPagination((prev) =>
        prev.currentPage === 1 ? prev : { ...prev, currentPage: 1 }
      );
    }, 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const fetchOrders = useCallback(async () => {
    // Full-page spinner only on the very first load; otherwise a
    // lightweight background fetch that keeps the table visible.
    if (initialLoad) {
      setLoading(true);
    } else {
      setIsFetching(true);
    }
    setError(null);

    try {
      const params = {
        page: pagination.currentPage,
        per_page: pagination.perPage,
      };
      if (statusFilter) params.status = statusFilter;
      if (debouncedSearch) params.search = debouncedSearch;   // ← use debounced value

      const response = await axios.get('/admin/orders', { params });
      const ordersArray = extractOrdersArray(response.data);
      setOrders(ordersArray);

      if (response.data.orders && typeof response.data.orders === 'object') {
        const p = response.data.orders;
        setPagination((prev) => ({
          ...prev,
          currentPage: p.current_page || 1,
          totalPages: p.last_page || 1,
          totalItems: p.total || 0,
        }));
      }

      if (initialLoad) setInitialLoad(false);   // ← mark first successful load done
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) setError('Unauthorized. Please login again.');
      else if (err.response?.status === 403) setError('Access denied.');
      else setError(err.response?.data?.message || 'Failed to load orders');
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  }, [
    statusFilter,
    debouncedSearch,               // ← replace searchTerm
    pagination.currentPage,
    pagination.perPage,
    initialLoad,
  ]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);


  // ─────────────────────────────────────────────────────────────
  // Real-time new-order listener (Reverb / WebSocket)
  // Subscribes once, prepends matching orders as they are created.
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let channel = null;
    let cancelled = false;

    (async () => {
      const echo = initWebEcho();
      if (!echo || cancelled) return;

      // 1) Subscribe to the private admin channel ONCE
      channel = echo.private('admin.orders');

      // 2) Confirm subscription (real signal — not the optimistic one below)
      channel.subscribed(() => {
        console.log('✅ CHANNEL CONFIRMED: admin.orders');
      });

      // 3) Surface subscription errors
      channel.error((err) => {
        console.error('❌ CHANNEL SUBSCRIPTION ERROR on admin.orders:', err);
      });

      // 4) Register the event listener ONCE
      channel.listen('.order.created', (payload) => {
        console.log('🔔 New order received:', payload);

        const newOrder = payload?.order;
        if (!newOrder?.id) return;

        const f = filtersRef.current;

        // Respect the active status filter
        if (f.statusFilter && newOrder.status !== f.statusFilter) return;

        // Respect the active search term
        if (f.debouncedSearch) {
          const s = f.debouncedSearch.toLowerCase();
          const matches =
            (newOrder.order_number || '').toLowerCase().includes(s) ||
            (newOrder.customer_name || '').toLowerCase().includes(s);
          if (!matches) return;
        }

        // Prepend without duplicates
        setOrders((prev) => {
          if (prev.some((o) => o.id === newOrder.id)) return prev;
          return [newOrder, ...prev];
        });

        // Keep the pagination counter honest
        setPagination((prev) => ({
          ...prev,
          totalItems: prev.totalItems + 1,
        }));
      });

      console.log('✅ Admin subscribed to admin.orders');
    })();

    return () => {
      cancelled = true;
      if (channel) {
        try { channel.stopListening('.order.created'); } catch {}
      }
    };
  }, []);

  // ── Handlers ──

  // Approve — now opens a modal instead of using window.confirm
  const openApproveConfirm = (order) => {
    setApproveConfirm({ show: true, order });
  };

  const handleApprove = async () => {
    const order = approveConfirm.order;
    if (!order) return;
    const orderId = order.id;
    setApproveConfirm({ show: false, order: null });
    setActionLoading(orderId);
    try {
      await axios.put(`/admin/orders/${orderId}/approve`);
      await fetchOrders();
      showToast('Order approved successfully.', 'success');
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to approve order.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAdminStatusChange = async (orderId, newStatus) => {
    try {
      await axios.put(`/admin/orders/${orderId}/status`, { status: newStatus });
      await fetchOrders();
      showToast(`Order status updated to ${newStatus}.`, 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Status update failed.', 'error');
    }
  };

  const handleCancelOrder = async () => {
    if (!cancelModal.orderId) return;
    if (!cancelReason.trim()) {
      showToast('Please provide a cancellation reason.', 'error');
      return;
    }
    setCancelling(true);
    try {
      await axios.put(`/admin/orders/${cancelModal.orderId}/cancel`, { reason: cancelReason.trim() });
      await fetchOrders();
      setCancelModal({ show: false, orderId: null, orderNumber: '' });
      setCancelReason('');
      showToast('Order cancelled successfully.', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to cancel order.', 'error');
    } finally {
      setCancelling(false);
    }
  };

  // ── View Order Details (fetch fresh data) ──
  const handleViewOrder = async (order) => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploading(false);
    setViewModal({ show: true, order });

    try {
      const response = await axios.get(`/admin/orders/${order.id}`);
      setViewModal(prev => ({ ...prev, order: response.data.order }));
    } catch (err) {
      console.error('Failed to fetch order details:', err);
      showToast('Could not load order details. Showing cached data.', 'error');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleUploadProgress = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      const response = await axios.post(`/admin/orders/${viewModal.order.id}/progress-image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const newImage = response.data.image;
      const imageUrl = `${API_BASE_URL}/storage/${newImage.path}`;
      const newImageWithUrl = { ...newImage, image_url: imageUrl };

      const updatedOrder = { ...viewModal.order };
      if (!updatedOrder.progress_images) updatedOrder.progress_images = [];
      if (!updatedOrder.progress_images_with_urls) updatedOrder.progress_images_with_urls = [];
      updatedOrder.progress_images = [...updatedOrder.progress_images, newImage];
      updatedOrder.progress_images_with_urls = [...updatedOrder.progress_images_with_urls, newImageWithUrl];
      setViewModal(prev => ({ ...prev, order: updatedOrder }));

      setSelectedFile(null);
      setPreviewUrl(null);
      showToast('Progress image uploaded successfully.', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Upload failed.', 'error');
    } finally {
      setUploading(false);
    }
  };

  // ── Admin Reply Handler ──
  const handleReplySubmit = async (feedbackId) => {
    const replyText = replyInput[feedbackId]?.trim();
    if (!replyText) {
      showToast('Please enter a reply.', 'error');
      return;
    }

    setSubmittingReply(true);
    try {
      const response = await axios.post(`/admin/feedback/${feedbackId}/reply`, {
        reply: replyText,
      });

      const updatedOrder = { ...viewModal.order };
      updatedOrder.feedback = response.data.feedback;
      setViewModal(prev => ({ ...prev, order: updatedOrder }));

      setReplyInput(prev => ({ ...prev, [feedbackId]: '' }));
      setReplyingFeedbackId(null);
      showToast('Reply submitted successfully.', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to submit reply.', 'error');
    } finally {
      setSubmittingReply(false);
    }
  };

  // ─── REPORT LOSS / DAMAGE HELPERS ───────────────────────────────
  const openReportModal = (order) => {
    const reportableItems = (order.items || []).filter((i) => i.menu_id && i.menu);
    if (reportableItems.length === 0) {
      showToast('This order has no reportable products.', 'error');
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


  const openCustomCakeReportModal = async (order) => {
    const customItem = order.items?.find((i) => i.cake_type === 'custom');
    if (!customItem) {
      showToast('This order has no custom cake.', 'error');
      return;
    }

    setCustomCakeReportModal({
      show: true, order, loading: true, bom: [],
      damage_type: 'spoilage', description: '', submitting: false,
    });

    try {
      // Admin endpoint already returns the BOM for this order
      const res = await axios.get(`/admin/orders/${order.id}/custom-cake`);
      const bomRows = res.data?.bom || [];

      if (bomRows.length === 0) {
        setCustomCakeReportModal((m) => ({ ...m, loading: false }));
        showToast('This custom cake has no BOM. Add BOM in Edit Custom Cake first.', 'error');
        return;
      }

      const bom = bomRows.map((b) => ({
        ingredient_id: b.ingredient_id,
        ingredient_name: b.ingredient_name || `Ingredient #${b.ingredient_id}`,
        unit: b.unit || '',
        quantity_needed: parseFloat(b.quantity_needed) || 0,
        report_quantity: '',
        estimated_cost: '',
        is_checked: false,
      }));

      setCustomCakeReportModal((m) => ({ ...m, loading: false, bom }));
    } catch (err) {
      showToast('Failed to load custom cake BOM.', 'error');
      setCustomCakeReportModal((m) => ({ ...m, show: false, loading: false }));
    }
  };

  const toggleBomIngredient = (idx) => {
    setCustomCakeReportModal((m) => {
      const bom = [...m.bom];
      bom[idx] = { ...bom[idx], is_checked: !bom[idx].is_checked };
      return { ...m, bom };
    });
  };

  const updateBomField = (idx, field, value) => {
    setCustomCakeReportModal((m) => {
      const bom = [...m.bom];
      bom[idx] = { ...bom[idx], [field]: value };
      return { ...m, bom };
    });
  };

  const handleCustomCakeReportSubmit = async (e) => {
    e.preventDefault();
    const { order, bom, damage_type, description } = customCakeReportModal;
    if (!order) return;

    const selected = bom.filter((b) => b.is_checked);
    if (selected.length === 0) {
      showToast('Please select at least one BOM ingredient.', 'error');
      return;
    }
    const invalid = selected.find((b) => !b.report_quantity || parseFloat(b.report_quantity) <= 0);
    if (invalid) {
      showToast(`Please enter a valid quantity for ${invalid.ingredient_name}.`, 'error');
      return;
    }

    setCustomCakeReportModal((m) => ({ ...m, submitting: true }));
    try {
      await axios.post('/admin/lost-and-damages', {
        order_id: order.id,
        items: selected.map((b) => ({
          item_id: Number(b.ingredient_id),
          quantity: Number(b.report_quantity),
          unit: b.unit,
          estimated_cost: Number(b.estimated_cost || 0),
        })),
        damage_type,
        description: description || null,
      });

      setCustomCakeReportModal({
        show: false, order: null, loading: false, bom: [],
        damage_type: 'spoilage', description: '', submitting: false,
      });
      showToast('Custom cake loss/damage report submitted. Waiting for admin approval.', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to submit report.', 'error');
      setCustomCakeReportModal((m) => ({ ...m, submitting: false }));
    }
  };


  
  const [customCakeReportModal, setCustomCakeReportModal] = useState({
  show: false,
  order: null,
  loading: false,
  bom: [],
  damage_type: 'spoilage',
  description: '',
  submitting: false,
});


  // Detect a custom cake order from the already-loaded items
  const isCustomCakeOrder = (order) =>
    Array.isArray(order?.items) &&
    order.items.some((i) => i.cake_type === 'custom');

  const fetchIngredients = useCallback(async () => {
    if (ingredientsList.length > 0) return;
    setIngredientsLoading(true);
    try {
      const res = await axios.get('/ingredients');
      setIngredientsList(res.data.ingredients || []);
    } catch (err) {
      console.error('Failed to load ingredients', err);
    } finally {
      setIngredientsLoading(false);
    }
  }, [ingredientsList.length]);

  const openCustomCakeModal = async (order) => {
    setCustomCakeModal({
      show: true,
      order,
      loading: true,
      submitting: false,
      isStaffWalkin: false,
      paymentStatus: '',
      bomLocked: false,
      form: { total_amount: '', bom: [] },
    });

    fetchIngredients();

    try {
      const res = await axios.get(`/admin/orders/${order.id}/custom-cake`);
      const d = res.data;
      setCustomCakeModal((prev) => ({
        ...prev,
        loading: false,
        isStaffWalkin: d.is_staff_walkin,
        paymentStatus: d.payment_status,
        bomLocked: d.bom_already_deducted,
        form: {
          total_amount: String(d.total_amount ?? ''),
          payment_status: d.payment_status || 'partially_paid',   // ← add this
          bom: (d.bom || []).map((b) => ({
            ingredient_id: b.ingredient_id,
            ingredient_name: b.ingredient_name,
            quantity_needed: String(b.quantity_needed ?? ''),
            unit: b.unit || '',
          })),
        },
      }));
    } catch (err) {
      setCustomCakeModal((prev) => ({ ...prev, loading: false, show: false }));
      showToast(err.response?.data?.message || 'Failed to load custom cake details.', 'error');
    }
  };

  const addBomRow = () => {
    setCustomCakeModal((m) => ({
      ...m,
      form: {
        ...m.form,
        bom: [...m.form.bom, { ingredient_id: '', quantity_needed: '', unit: '' }],
      },
    }));
  };

  const removeBomRow = (idx) => {
    setCustomCakeModal((m) => ({
      ...m,
      form: { ...m.form, bom: m.form.bom.filter((_, i) => i !== idx) },
    }));
  };

  const updateBomRow = (idx, field, value) => {
    setCustomCakeModal((m) => {
      const bom = [...m.form.bom];
      bom[idx] = { ...bom[idx], [field]: value };
      if (field === 'ingredient_id' && value) {
        const ing = ingredientsList.find((x) => String(x.id) === String(value));
        if (ing) bom[idx].unit = ing.unit || '';
      }
      return { ...m, form: { ...m.form, bom } };
    });
  };

  const submitCustomCake = async (e) => {
    e.preventDefault();
    const { order, form, bomLocked } = customCakeModal;
    if (!order) return;

    if (!form.total_amount || Number(form.total_amount) < 0) {
      showToast('Please enter a valid final price.', 'error');
      return;
    }
    if (!bomLocked) {
      const bad = form.bom.find(
        (r) => !r.ingredient_id || !r.quantity_needed || Number(r.quantity_needed) <= 0 || !r.unit
      );
      if (bad) {
        showToast('Please complete every BOM row (ingredient, quantity, unit).', 'error');
        return;
      }
    }

    setCustomCakeModal((m) => ({ ...m, submitting: true }));
    try {
      const payload = { total_amount: Number(form.total_amount) };

      // Only send payment_status for Staff Walk-In custom cakes
      if (customCakeModal.isStaffWalkin && form.payment_status) {
        payload.payment_status = form.payment_status;
      }

      if (!bomLocked) {
        payload.bom = form.bom.map((r) => ({
          ingredient_id: Number(r.ingredient_id),
          quantity_needed: Number(r.quantity_needed),
          unit: r.unit,
        }));
      }

      await axios.put(`/admin/orders/${order.id}/custom-cake`, payload);
      await fetchOrders();
      setCustomCakeModal((m) => ({ ...m, show: false, submitting: false }));
      showToast('Custom cake updated successfully.', 'success');
    } catch (err) {
      setCustomCakeModal((m) => ({ ...m, submitting: false }));
      showToast(err.response?.data?.message || 'Failed to update custom cake.', 'error');
    }
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
      await axios.post('/admin/lost-and-damages', {
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
      showToast('Loss/damage report submitted. Waiting for admin approval.', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to submit report.', 'error');
    } finally {
      setReportSubmitting(false);
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

  if (initialLoad) {
    return (
      <div style={{ background: CREAM, minHeight: '100vh' }} className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader className="animate-spin" style={{ color: SAGE }} size={36} />
          <p style={{ color: MUTED_GRAY, fontSize: '0.85rem', letterSpacing: '0.05em' }}>Loading orders…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-2xl m-6" style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FEE2E2' }}>
        <AlertCircle size={20} />
        <span style={{ fontSize: '0.875rem' }}>{error}</span>
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
        .action-btn { transition: all 0.18s ease; border-radius: 10px; border: none; cursor: pointer; }
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
        @keyframes toastIn { from { opacity: 0; transform: translate(-50%, -20px); } to { opacity: 1; transform: translate(-50%, 0); } }
        @keyframes toastOut { from { opacity: 1; transform: translate(-50%, 0); } to { opacity: 0; transform: translate(-50%, -20px); } }
        .toast-anim { animation: toastIn 0.3s cubic-bezier(0.25,0.46,0.45,0.94) both; }
        .progress-thumb { transition: transform 0.2s ease; cursor: pointer; }
        .progress-thumb:hover { transform: scale(1.05); }
        .image-preview-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.8);
          display: flex; align-items: center; justify-content: center;
          z-index: 100; cursor: pointer;
        }
        .image-preview-overlay img {
          max-width: 90vw;
          max-height: 90vh;
          object-fit: contain;
          border-radius: 8px;
          box-shadow: 0 4px 30px rgba(0,0,0,0.3);
        }
        .pagination-btn {
          transition: all 0.2s ease;
          border: 1px solid rgba(166,162,154,0.3);
          background: #fff;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 600;
          color: ${SAGE};
          cursor: pointer;
          margin: 0 2px;
        }
        .pagination-btn:hover:not(:disabled) {
          background: ${SAGE};
          color: #fff;
          border-color: ${SAGE};
          transform: translateY(-1px);
        }
        .pagination-btn.active {
          background: ${SAGE};
          color: #fff;
          border-color: ${SAGE};
        }
        .pagination-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .per-page-select {
          border: 1px solid rgba(166,162,154,0.3);
          border-radius: 6px;
          padding: 4px 8px;
          font-size: 0.8rem;
          color: ${SAGE};
          background: #fff;
          outline: none;
        }
        .per-page-select:focus {
          border-color: ${SAGE};
        }
        .rider-photo-thumb {
          transition: transform 0.2s ease;
          cursor: pointer;
          border-radius: 8px;
          overflow: hidden;
          border: 1.5px solid rgba(166,162,154,0.3);
          max-width: 200px;
        }
        .rider-photo-thumb:hover {
          transform: scale(1.03);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .rider-photo-thumb img {
          width: 100%;
          height: auto;
          display: block;
        }
        .pickup-method-section {
          background: #f8f7f4;
          border-radius: 12px;
          padding: 16px;
          margin-top: 12px;
          border: 1px solid rgba(242,237,228,0.8);
        }
        .pickup-method-section .label {
          font-weight: 600;
          color: ${SAGE};
          font-size: 0.85rem;
        }
        .pickup-method-section .value {
          color: ${MUTED_GRAY};
          font-size: 0.85rem;
        }
        .pickup-method-section .photo-label {
          font-weight: 600;
          color: ${SAGE};
          font-size: 0.85rem;
          margin-top: 8px;
          margin-bottom: 4px;
        }
        .pickup-proof-thumb {
          transition: transform 0.2s ease;
          cursor: pointer;
        }
        .pickup-proof-thumb:hover {
          transform: scale(1.05);
        }
        .feedback-section {
          background: #f8f7f4;
          border-radius: 12px;
          padding: 16px;
          margin-top: 16px;
          border: 1px solid rgba(79,95,82,0.15);
        }
        .feedback-section .feedback-label {
          font-weight: 700;
          color: ${SAGE};
          font-size: 14px;
          margin-bottom: 8px;
        }
        .feedback-section .feedback-rating {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
        }
        .feedback-section .feedback-rating-label {
          color: ${MUTED_GRAY};
          font-size: 13px;
        }
        .feedback-section .feedback-comment {
          margin-bottom: 6px;
        }
        .feedback-section .feedback-comment-label {
          color: ${MUTED_GRAY};
          font-size: 13px;
        }
        .feedback-section .feedback-comment-text {
          color: ${SAGE};
          font-size: 13px;
          margin-top: 2px;
        }
        .feedback-section .feedback-date {
          color: ${MUTED_GRAY};
          font-size: 11px;
          margin-top: 4px;
        }
        .feedback-section .feedback-empty {
          color: ${MUTED_GRAY};
          font-size: 13px;
        }
        .feedback-section .admin-reply {
          margin-top: 12px;
          padding: 10px;
          background-color: #e8f0e8;
          border-radius: 8px;
          border-left: 3px solid ${SAGE};
        }
        .feedback-section .admin-reply-label {
          font-weight: 600;
          color: ${SAGE};
          font-size: 13px;
        }
        .feedback-section .admin-reply-text {
          color: ${SAGE};
          font-size: 13px;
          margin-top: 4px;
        }
        .feedback-section .admin-reply-date {
          color: ${MUTED_GRAY};
          font-size: 11px;
          margin-top: 4px;
        }
        .reply-textarea {
          width: 100%;
          padding: 8px;
          border-radius: 8px;
          border: 1px solid #ddd;
          font-size: 13px;
          color: ${SAGE};
          resize: vertical;
          min-height: 60px;
        }
        .reply-actions {
          display: flex;
          gap: 8px;
          margin-top: 8px;
        }
        .reply-btn {
          padding: 6px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: all 0.2s ease;
        }
        .reply-btn-primary {
          background: ${SAGE};
          color: #fff;
        }
        .reply-btn-primary:hover {
          background: #3e4c42;
        }
        .reply-btn-secondary {
          background: transparent;
          border: 1px solid #ddd;
          color: ${MUTED_GRAY};
        }
        .reply-btn-secondary:hover {
          background: #f0f0f0;
        }
        .reply-toggle-btn {
          margin-top: 10px;
          padding: 4px 12px;
          border-radius: 6px;
          border: 1px solid ${SAGE};
          background: transparent;
          color: ${SAGE};
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          transition: all 0.2s ease;
        }
        .reply-toggle-btn:hover {
          background: ${SAGE}10;
        }
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
            <p style={{ color: MUTED_GRAY, fontSize: '0.82rem', letterSpacing: '0.03em', marginLeft: 48 }}>View customer orders, approve/reject, and manage statuses</p>
          </div>
        </div>

        <div className="divider-line mb-7" />

        <div className="fade-in-1 flex flex-wrap gap-4 mb-8">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: MUTED_GRAY }} />
            <input
              type="text"
              placeholder="Search order # or customer name…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="modal-input w-full pl-10 pr-4 py-2.5 rounded-xl border bg-white text-sm"
              style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE }}
            />
            {isFetching && (
              <Loader
                size={14}
                className="animate-spin"
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: SAGE,
                }}
              />
            )}
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="modal-input px-4 py-2.5 rounded-xl border bg-white text-sm"
            style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE }}
          >
            <option value="">All Status</option>
            {Object.keys(statusColors).map((s) => (<option key={s} value={s} className="capitalize">{s}</option>))}
          </select>
        </div>

        <div className="fade-in-1" style={{ background: '#fff', borderRadius: 20, border: '1.5px solid rgba(242,237,228,0.9)', boxShadow: '0 2px 12px rgba(79,95,82,0.06)', overflow: 'hidden' }}>
          <div className="overflow-x-auto">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: `linear-gradient(135deg, ${CREAM}, rgba(255,243,217,0.5))`, borderBottom: `1.5px solid ${CREAM}` }}>
                  {['Order #', 'Customer', 'Date', 'Pickup', 'Total', 'Status', 'Payment', 'Items', 'Actions'].map(col => (
                    <th key={col} style={{ padding: '13px 20px', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, color: SAGE, letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '48px 20px', color: MUTED_GRAY }}>
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
                      <td style={{ padding: '13px 20px', color: MUTED_GRAY, fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                        {formatShortDate(order.order_date)}
                      </td>
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
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 999, fontSize: '0.68rem', fontWeight: 600, background: order.payment_status === 'paid' ? 'rgba(52,196,104,0.1)' : order.payment_status === 'partially_paid' ? 'rgba(234,179,8,0.1)' : 'rgba(239,68,68,0.08)', color: order.payment_status === 'paid' ? '#1a7a3c' : order.payment_status === 'partially_paid' ? '#92670a' : '#c0392b', border: `1px solid ${order.payment_status === 'paid' ? 'rgba(52,196,104,0.2)' : order.payment_status === 'partially_paid' ? 'rgba(234,179,8,0.2)' : 'rgba(239,68,68,0.15)'}` }}>
                          {order.payment_status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '13px 20px' }}>
                        <div className="flex flex-wrap gap-1">
                          {order.items?.map((item) => (
                            <span key={item.id} style={{ display: 'inline-block', background: 'rgba(79,95,82,0.07)', color: SAGE, borderRadius: 5, padding: '2px 6px', fontSize: '0.72rem', marginBottom: 2 }}>{item.menu?.name || 'Custom Cake'} ×{item.quantity}</span>
                          ))}
                        </div>
                      </td>

                      <td style={{ padding: '13px 20px', whiteSpace: 'nowrap' }}>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewOrder(order)}
                            className="action-btn p-1.5 rounded-lg"
                            style={{ background: 'rgba(79,95,82,0.08)', color: SAGE }}
                            title="View order details"
                          >
                            <Eye size={14} />
                          </button>

                          {/* ── Report Loss / Damage ── */}
                          {['confirmed', 'preparing', 'ready', 'completed'].includes(order.status) &&
                            (order.items?.some((i) => i.menu_id) || order.items?.some((i) => i.cake_type === 'custom')) && (
                              <button
                                onClick={() => {
                                  const hasCustom = order.items?.some((i) => i.cake_type === 'custom');
                                  if (hasCustom) openCustomCakeReportModal(order);
                                  else openReportModal(order);
                                }}
                                className="action-btn p-1.5 rounded-lg"
                                style={{ background: 'rgba(212,160,61,0.12)', color: '#92670a' }}
                                title="Report loss / damage"
                              >
                                <AlertTriangle size={14} />
                              </button>
                            )}


                            {isCustomCakeOrder(order) && (
                            <button
                              onClick={() => openCustomCakeModal(order)}
                              className="action-btn p-1.5 rounded-lg"
                              style={{ background: 'rgba(122,91,138,0.12)', color: '#7A5B8A' }}
                              title="Edit custom cake (price & BOM)"
                            >
                              <Cake size={14} />
                            </button>
                          )}

                          {order.customer_id !== null && (
                            <>
                              {order.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => openApproveConfirm(order)}
                                    disabled={actionLoading === order.id}
                                    className="action-btn p-1.5 rounded-lg"
                                    style={{ background: 'rgba(52,196,104,0.1)', color: '#1a7a3c' }}
                                    title="Approve order"
                                  >
                                    {actionLoading === order.id ? <Loader size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                                  </button>
                                  <button
                                    onClick={() => setRejectModal({ show: true, orderId: order.id })}
                                    className="action-btn p-1.5 rounded-lg"
                                    style={{ background: 'rgba(239,68,68,0.1)', color: '#dc2626' }}
                                    title="Reject order"
                                  >
                                    <XCircle size={14} />
                                  </button>
                                </>
                              )}
                            </>
                          )}

                          {order.customer_id === null && order.status === 'pending' && (
                            <button
                              onClick={() => handleAdminStatusChange(order.id, 'preparing')}
                              className="action-btn p-1.5 rounded-lg"
                              style={{ background: '#7A5B8A', color: '#fff', cursor: 'pointer' }}
                              title="Start Preparing (Walk‑in)"
                            >
                              <Play size={14} />
                            </button>
                          )}

                          {order.status === 'confirmed' && (
                            <button
                              onClick={() => handleAdminStatusChange(order.id, 'preparing')}
                              disabled={order.payment_status === 'unpaid'}
                              className="action-btn p-1.5 rounded-lg"
                              style={{
                                background: order.payment_status === 'unpaid' ? '#ccc' : '#7A5B8A',
                                color: '#fff',
                                cursor: order.payment_status === 'unpaid' ? 'not-allowed' : 'pointer',
                                opacity: order.payment_status === 'unpaid' ? 0.5 : 1,
                              }}
                              title={order.payment_status === 'unpaid' ? 'Order must be paid or partially paid to start preparing' : 'Start Preparing'}
                            >
                              <Play size={14} />
                            </button>
                          )}
                          {order.status === 'preparing' && (
                            <button
                              onClick={() => handleAdminStatusChange(order.id, 'ready')}
                              disabled={order.payment_status === 'unpaid'}
                              className="action-btn p-1.5 rounded-lg"
                              style={{
                                background: order.payment_status === 'unpaid' ? '#ccc' : '#5B8A5E',
                                color: '#fff',
                                cursor: order.payment_status === 'unpaid' ? 'not-allowed' : 'pointer',
                                opacity: order.payment_status === 'unpaid' ? 0.5 : 1,
                              }}
                              title={order.payment_status === 'unpaid' ? 'Order must be paid or partially paid to mark ready' : 'Mark Ready'}
                            >
                              <CheckCircle size={14} />
                            </button>
                          )}
                          {order.status === 'ready' && (
                            <button
                              onClick={() => handleAdminStatusChange(order.id, 'completed')}
                              disabled={order.payment_status === 'unpaid'}
                              className="action-btn p-1.5 rounded-lg"
                              style={{
                                background: order.payment_status === 'unpaid' ? '#ccc' : SAGE,
                                color: '#fff',
                                cursor: order.payment_status === 'unpaid' ? 'not-allowed' : 'pointer',
                                opacity: order.payment_status === 'unpaid' ? 0.5 : 1,
                              }}
                              title={order.payment_status === 'unpaid' ? 'Order must be paid or partially paid to complete' : 'Complete'}
                            >
                              <Check size={14} />
                            </button>
                          )}

                          {['confirmed', 'preparing', 'ready'].includes(order.status) && (
                            <button
                              onClick={() => setCancelModal({ show: true, orderId: order.id, orderNumber: order.order_number })}
                              className="action-btn p-1.5 rounded-lg"
                              style={{ background: 'rgba(199,91,91,0.1)', color: '#C75B5B' }}
                              title="Cancel order"
                            >
                              <Ban size={14} />
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
              <span>
                Showing <strong>{startItem}</strong> – <strong>{endItem}</strong> of <strong>{totalItems}</strong> orders
              </span>
              <div className="flex items-center gap-2">
                <span>Per page:</span>
                <select
                  value={perPage}
                  onChange={handlePerPageChange}
                  className="per-page-select"
                >
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                  <option value="200">200</option>
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
                  <span key={idx} className="px-2 text-muted" style={{ color: MUTED_GRAY }}>…</span>
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

      {/* ═══ Approve Confirmation Modal ═══ */}
      {approveConfirm.show && approveConfirm.order && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(30,35,30,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 16, backdropFilter: 'blur(4px)' }}>
          <div className="anim-modal" style={{ background: '#fff', borderRadius: 22, padding: '32px 28px', maxWidth: 440, width: '100%', textAlign: 'center', boxShadow: '0 24px 60px rgba(79,95,82,0.18)', border: '1px solid rgba(242,237,228,0.8)' }}>
            <div style={{ width: 60, height: 60, background: 'rgba(52,196,104,0.1)', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', border: '1.5px solid rgba(52,196,104,0.2)' }}>
              <CheckCircle size={26} style={{ color: '#1a7a3c' }} />
            </div>
            <h3 style={{ color: SAGE, fontWeight: 700, fontSize: '1.15rem', marginBottom: 8 }}>
              Approve this order?
            </h3>
            <p style={{ color: MUTED_GRAY, fontSize: '0.85rem', lineHeight: 1.6, marginBottom: 6 }}>
              You are about to approve order{' '}
              <strong style={{ color: SAGE }}>{approveConfirm.order.order_number}</strong>
              {approveConfirm.order.customer_name && (
                <> for <strong style={{ color: SAGE }}>{approveConfirm.order.customer_name}</strong></>
              )}.
            </p>
            <p style={{ color: MUTED_GRAY, fontSize: '0.8rem', lineHeight: 1.5, marginBottom: 20 }}>
              The pickup schedule will be confirmed and the customer will be notified.
            </p>
            <div className="divider-line mb-6" />
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={() => setApproveConfirm({ show: false, order: null })}
                className="sec-btn px-5 py-2.5 rounded-xl border text-sm font-medium"
                style={{ borderColor: 'rgba(166,162,154,0.3)', color: MUTED_GRAY, background: 'transparent' }}
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={actionLoading === approveConfirm.order.id}
                className="primary-btn flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium"
                style={{ background: 'linear-gradient(135deg, #34c468, #1a7a3c)' }}
              >
                {actionLoading === approveConfirm.order.id ? (
                  <Loader size={14} className="animate-spin" />
                ) : (
                  <Check size={14} />
                )}
                Yes, approve order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Rejection Modal ═══ */}
      {rejectModal.show && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(30,35,30,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16, backdropFilter: 'blur(4px)' }}>
          <div className="anim-modal" style={{ background: '#fff', borderRadius: 22, width: '100%', maxWidth: 480, boxShadow: '0 24px 60px rgba(79,95,82,0.18)', border: '1px solid rgba(242,237,228,0.8)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: `1px solid ${CREAM}`, background: `linear-gradient(135deg, rgba(79,95,82,0.04), rgba(255,243,217,0.3))` }}>
              <h3 style={{ color: SAGE, fontWeight: 700, fontSize: '1.1rem' }}>Reject Order</h3>
              <button onClick={() => { setRejectModal({ show: false, orderId: null }); setRejectReason(''); }} style={{ color: MUTED_GRAY, padding: 7, borderRadius: 10, background: 'transparent', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ padding: '24px' }}>
              <p style={{ marginBottom: 16, color: SAGE, fontSize: '0.95rem' }}>Please provide a reason for rejecting this order.</p>
              <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Enter rejection reason..." rows={4} style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1.5px solid rgba(166,162,154,0.3)', color: SAGE, fontSize: '0.9rem', resize: 'vertical', minHeight: '100px', outline: 'none' }} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20 }}>
                <button onClick={() => { setRejectModal({ show: false, orderId: null }); setRejectReason(''); }} className="sec-btn px-5 py-2.5 rounded-xl border text-sm font-medium" style={{ borderColor: 'rgba(166,162,154,0.3)', color: MUTED_GRAY }}>Cancel</button>
                <button onClick={async () => {
                  if (!rejectReason.trim()) { showToast('Please provide a rejection reason.', 'error'); return; }
                  setRejecting(true);
                  try {
                    await axios.put(`/admin/orders/${rejectModal.orderId}/reject`, { reason: rejectReason.trim() });
                    await fetchOrders();
                    setRejectModal({ show: false, orderId: null });
                    setRejectReason('');
                    showToast('Order rejected successfully.', 'success');
                  } catch (err) { showToast(err.response?.data?.message || 'Failed to reject order.', 'error'); } finally { setRejecting(false); }
                }} disabled={rejecting} className="primary-btn flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50" style={{ background: `linear-gradient(135deg, ${SAGE}, #3e4c42)` }}>{rejecting ? <Loader size={15} className="animate-spin" /> : 'Confirm Rejection'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Cancel Modal ─── */}
      {cancelModal.show && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(30,35,30,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16, backdropFilter: 'blur(4px)' }}>
          <div className="anim-modal" style={{ background: '#fff', borderRadius: 22, width: '100%', maxWidth: 480, boxShadow: '0 24px 60px rgba(79,95,82,0.18)', border: '1px solid rgba(242,237,228,0.8)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: `1px solid ${CREAM}`, background: `linear-gradient(135deg, rgba(79,95,82,0.04), rgba(255,243,217,0.3))` }}>
              <h3 style={{ color: SAGE, fontWeight: 700, fontSize: '1.1rem' }}>Cancel Order</h3>
              <button onClick={() => { setCancelModal({ show: false, orderId: null, orderNumber: '' }); setCancelReason(''); }} style={{ color: MUTED_GRAY, padding: 7, borderRadius: 10, background: 'transparent', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ padding: '24px' }}>
              <p style={{ marginBottom: 16, color: SAGE, fontSize: '0.95rem' }}>You are about to cancel order <strong>{cancelModal.orderNumber}</strong>. Please provide a reason.</p>
              <textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Enter cancellation reason..." rows={4} style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1.5px solid rgba(166,162,154,0.3)', color: SAGE, fontSize: '0.9rem', resize: 'vertical', minHeight: '100px', outline: 'none' }} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20 }}>
                <button onClick={() => { setCancelModal({ show: false, orderId: null, orderNumber: '' }); setCancelReason(''); }} className="sec-btn px-5 py-2.5 rounded-xl border text-sm font-medium" style={{ borderColor: 'rgba(166,162,154,0.3)', color: MUTED_GRAY }}>Cancel</button>
                <button onClick={handleCancelOrder} disabled={cancelling} className="primary-btn flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #C75B5B, #a14747)' }}>{cancelling ? <Loader size={15} className="animate-spin" /> : <Ban size={15} />}{cancelling ? 'Cancelling…' : 'Cancel Order'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Order Details View Modal ─── */}
      {viewModal.show && viewModal.order && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(30,35,30,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16, backdropFilter: 'blur(4px)' }}>
          <div className="anim-modal" style={{ background: '#fff', borderRadius: 22, width: '100%', maxWidth: 700, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(79,95,82,0.18), 0 4px 16px rgba(0,0,0,0.08)', border: '1px solid rgba(242,237,228,0.8)', padding: '24px' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 style={{ color: SAGE, fontWeight: 700, fontSize: '1.2rem' }}>Order Details</h3>
              <button onClick={() => setViewModal({ show: false, order: null })} style={{ color: MUTED_GRAY, padding: 7, borderRadius: 10, background: 'transparent', cursor: 'pointer' }}><X size={24} /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Order Information */}
              <div>
                <h4 style={{ fontWeight: 700, color: SAGE, marginBottom: 8 }}>Order Information</h4>
                <p><strong>Order #:</strong> {viewModal.order.order_number}</p>
                <p><strong>Customer:</strong> {viewModal.order.customer_name}</p>
                <p><strong>Phone:</strong> {viewModal.order.customer_phone || 'N/A'}</p>
                <p><strong>Pickup:</strong> {viewModal.order.pickup_date ? `${formatDisplayDate(viewModal.order.pickup_date)} ${viewModal.order.pickup_time ? viewModal.order.pickup_time.slice(0,5) : ''}` : 'Not set'}</p>
                <p><strong>Status:</strong> <span className="capitalize">{viewModal.order.status}</span></p>
                <p><strong>Payment:</strong> {viewModal.order.payment_status?.replace('_', ' ') || 'Unpaid'}</p>

                {/* ── Subtotal ── */}
                <p><strong>Subtotal:</strong> ₱{parseFloat(viewModal.order.subtotal || 0).toLocaleString()}</p>

                {/* ── Discount (if any) ── */}
                {viewModal.order.discount_total > 0 && (
                  <p><strong>Discount:</strong> <span style={{ color: '#16a34a' }}>-₱{parseFloat(viewModal.order.discount_total).toLocaleString()}</span></p>
                )}

                {/* ── Total (final) ── */}
                <p><strong>Total:</strong> ₱{parseFloat(viewModal.order.total_amount).toLocaleString()}</p>
                {viewModal.order.notes && <p><strong>Notes:</strong> {viewModal.order.notes}</p>}

                <div className="mt-4 p-3 rounded-lg" style={{ background: CREAM }}>
                  <h5 style={{ fontWeight: 600, color: SAGE, marginBottom: 4 }}>Items</h5>
                  {viewModal.order.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between border-b border-gray-200 py-1">
                      <span>{item.menu?.name || 'Custom Cake'} × {item.quantity}</span>
                      <span>₱{parseFloat(item.total_price || item.unit_price * item.quantity).toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                {viewModal.order.payments && viewModal.order.payments.length > 0 && (
                  <div className="mt-4">
                    <h4 style={{ fontWeight: 700, color: SAGE, marginBottom: 8 }}>Payments</h4>
                    {viewModal.order.payments.map((payment, idx) => (
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
                              onClick={() => setImagePreviewModal({ show: true, url: payment.proof_image_url })}
                              style={{
                                maxWidth: '100%',
                                maxHeight: 200,
                                borderRadius: 8,
                                border: '1px solid #ddd',
                                cursor: 'pointer',
                              }}
                            />
                          </div>
                        )}
                        <p><strong>Date:</strong> {new Date(payment.payment_date).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* ─── Customer Feedback Section ─── */}
                <div className="feedback-section">
                  <div className="feedback-label">Customer Feedback</div>
                  {viewModal.order.feedback ? (
                    <>
                      <div className="feedback-rating">
                        <span className="feedback-rating-label">Rating:</span>
                        <div style={{ display: 'flex', gap: '2px' }}>
                          {[1, 2, 3, 4, 5].map(star => (
                            <span key={star} style={{ color: star <= viewModal.order.feedback.rating ? '#F5A623' : MUTED_GRAY }}>
                              {star <= viewModal.order.feedback.rating ? '★' : '☆'}
                            </span>
                          ))}
                        </div>
                      </div>
                      {viewModal.order.feedback.comment && (
                        <div className="feedback-comment">
                          <div className="feedback-comment-label">Comment:</div>
                          <div className="feedback-comment-text">{viewModal.order.feedback.comment}</div>
                        </div>
                      )}
                      <div className="feedback-date">
                        Submitted: {new Date(viewModal.order.feedback.created_at).toLocaleString()}
                      </div>

                      {/* ── Admin Reply ── */}
                      {viewModal.order.feedback.admin_reply ? (
                        <div className="admin-reply">
                          <div className="admin-reply-label">Admin Reply:</div>
                          <div className="admin-reply-text">{viewModal.order.feedback.admin_reply}</div>
                          <div className="admin-reply-date">
                            Replied: {new Date(viewModal.order.feedback.admin_replied_at).toLocaleString()}
                          </div>
                        </div>
                      ) : (
                        <>
                          {replyingFeedbackId === viewModal.order.feedback.id ? (
                            <div style={{ marginTop: 12 }}>
                              <textarea
                                value={replyInput[viewModal.order.feedback.id] || ''}
                                onChange={(e) => setReplyInput(prev => ({ ...prev, [viewModal.order.feedback.id]: e.target.value }))}
                                placeholder="Write your reply..."
                                rows={3}
                                className="reply-textarea"
                              />
                              <div className="reply-actions">
                                <button
                                  onClick={() => handleReplySubmit(viewModal.order.feedback.id)}
                                  disabled={submittingReply}
                                  className="reply-btn reply-btn-primary"
                                >
                                  {submittingReply ? 'Submitting...' : 'Submit Reply'}
                                </button>
                                <button
                                  onClick={() => { setReplyingFeedbackId(null); setReplyInput(prev => ({ ...prev, [viewModal.order.feedback.id]: '' })); }}
                                  className="reply-btn reply-btn-secondary"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => setReplyingFeedbackId(viewModal.order.feedback.id)}
                              className="reply-toggle-btn"
                            >
                              Reply
                            </button>
                          )}
                        </>
                      )}
                    </>
                  ) : (
                    <div className="feedback-empty">No customer feedback has been submitted yet.</div>
                  )}
                </div>

                {/* ─── Pickup Method (with Rider Photo) ─── */}
                {viewModal.order.pickup_method && (
                  <div className="mt-4 pickup-method-section">
                    <h4 style={{ fontWeight: 700, color: SAGE, marginBottom: 8 }}>Pickup Method</h4>
                    <div>
                      <p><span className="label">Method:</span> <span className="value">{viewModal.order.pickup_method === 'customer' ? 'Customer Pickup' : 'Rider Pickup'}</span></p>

                      {viewModal.order.pickup_method === 'rider' && (
                        <>
                          {viewModal.order.rider_photo_url && (
                            <div className="mt-2">
                              <p className="photo-label">Rider Information Photo:</p>
                              <div
                                className="rider-photo-thumb"
                                onClick={() => setImagePreviewModal({ show: true, url: viewModal.order.rider_photo_url })}
                              >
                                <img
                                  src={viewModal.order.rider_photo_url}
                                  alt="Rider information"
                                  style={{ maxWidth: '200px', maxHeight: '150px', objectFit: 'contain' }}
                                />
                              </div>
                            </div>
                          )}

                          <p><span className="label">Rider Name:</span> <span className="value">{viewModal.order.rider_name || 'Not provided'}</span></p>
                          <p><span className="label">Rider Phone:</span> <span className="value">{viewModal.order.rider_phone || 'Not provided'}</span></p>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Cake Design, Pickup Proof, & Cake Progress */}
              <div>
                {viewModal.order.items && viewModal.order.items.length > 0 ? (
                  <>
                    <h4 style={{ fontWeight: 700, color: SAGE, marginBottom: 8 }}>Items Preview</h4>
                    {viewModal.order.items.map((item, idx) => {
                      const isCustom = item.cake_type === 'custom' && item.custom_design;

                      // ─── Custom Cake ───
                      if (isCustom) {
                        const design = item.custom_design;
                        return (
                          <div key={idx} className="mt-4">
                            <div
                              onClick={() => setImagePreviewModal({ show: true, url: null, design })}
                              style={{ cursor: 'pointer', display: 'inline-block' }}
                              title="Click to enlarge"
                            >
                              <CakePreviewShared
                                design={design}
                                size={300}
                                getFullImageUrl={getFullImageUrl}
                                getFallbackUrl={getFallbackUrl}
                                emptyState={
                                  <div className="w-full max-w-[300px] aspect-square flex items-center justify-center bg-gray-100 rounded-lg text-gray-400 text-sm">
                                    No custom design
                                  </div>
                                }
                              />
                            </div>
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

                            {/* Customer Reference Image — ONLY for customer mobile custom cakes (walk-in orders use the main preview instead) */}
                            {viewModal.order.customer_id != null &&
                            design?.reference_image_url &&
                            !design.reference_image_url.includes('payment_proofs') && (
                              <div className="mt-4">
                                <h4 style={{ fontWeight: 700, color: SAGE, marginBottom: 8, fontSize: '0.9rem' }}>
                                  Customer Reference Image
                                </h4>
                                <img
                                  src={getFullImageUrl(design.reference_image_url)}
                                  alt="Customer reference"
                                  onClick={() => setImagePreviewModal({ show: true, url: getFullImageUrl(design.reference_image_url) })}
                                  style={{
                                    maxWidth: '100%',
                                    maxHeight: 240,
                                    borderRadius: 8,
                                    border: '1px solid rgba(166,162,154,0.3)',
                                    objectFit: 'contain',
                                    background: '#f5f0ea',
                                    cursor: 'pointer',
                                  }}
                                />
                              </div>
                            )}
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
                              onClick={() => setImagePreviewModal({ show: true, url: fullImg })}
                              style={{
                                width: 80,
                                height: 80,
                                objectFit: 'cover',
                                borderRadius: 8,
                                flexShrink: 0,
                                border: '1px solid rgba(166,162,154,0.2)',
                                cursor: 'pointer',
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

                {/* ─── Pickup Proof Display ─── */}
                {viewModal.order.pickup_method === 'rider' &&
                 viewModal.order.pickup_proof_images_with_urls &&
                 viewModal.order.pickup_proof_images_with_urls.length > 0 && (
                  <div className="mt-6">
                    <h4 style={{ fontWeight: 700, color: SAGE, marginBottom: 8 }}>Pickup Proof</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {viewModal.order.pickup_proof_images_with_urls.map((img, idx) => (
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
                  </div>
                )}

                {/* ─── Cake Progress ─── */}
                {viewModal.order.items?.some(item => item.cake_type === 'custom') && (
                  <div className="mt-6">
                    <h4 style={{ fontWeight: 700, color: SAGE, marginBottom: 8 }}>Cake Progress</h4>

                    <div style={{ marginBottom: 12 }}>
                      <label htmlFor="progressImage" style={{ display: 'block', fontWeight: 600, color: SAGE, marginBottom: 4, fontSize: '0.85rem' }}>
                        Upload Progress Photo
                      </label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <input
                          type="file"
                          id="progressImage"
                          accept="image/*"
                          onChange={handleFileSelect}
                          style={{ padding: '6px' }}
                        />
                        {previewUrl && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f8f7f4', padding: 8, borderRadius: 8 }}>
                            <img src={previewUrl} alt="Preview" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4 }} />
                            <span style={{ fontSize: '0.8rem', color: SAGE, flex: 1 }}>{selectedFile?.name}</span>
                            <button
                              onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
                              className="action-btn p-1 rounded-lg"
                              style={{ color: '#EF4444', background: 'transparent' }}
                              title="Remove selection"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        )}
                        <button
                          onClick={handleUploadProgress}
                          disabled={!selectedFile || uploading}
                          className="primary-btn flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50"
                          style={{
                            background: `linear-gradient(135deg, ${SAGE}, #3e4c42)`,
                            alignSelf: 'flex-start',
                            border: 'none',
                            cursor: uploading || !selectedFile ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {uploading ? <Loader size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                          {uploading ? 'Uploading...' : 'Upload'}
                        </button>
                      </div>
                    </div>

                    {viewModal.order.progress_images_with_urls && viewModal.order.progress_images_with_urls.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {viewModal.order.progress_images_with_urls.map((img, idx) => (
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
              <button onClick={() => setViewModal({ show: false, order: null })} className="px-5 py-2.5 rounded-xl text-white font-medium" style={{ background: `linear-gradient(135deg, ${SAGE}, #3e4c42)` }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {imagePreviewModal.show && (
        <div
          className="image-preview-overlay"
          onClick={() => setImagePreviewModal({ show: false, url: null, design: null })}
        >
          {imagePreviewModal.design ? (
            (() => {
              const previewSize = Math.min(
                typeof window !== 'undefined' ? window.innerWidth * 0.85 : 500,
                typeof window !== 'undefined' ? window.innerHeight * 0.85 : 500,
                600
              );
              return (
                <div
                  style={{
                    width: previewSize,
                    height: previewSize,
                    background: '#f5f0ea',
                    borderRadius: 8,
                    boxShadow: '0 4px 30px rgba(0,0,0,0.3)',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <CakePreviewShared
                    design={imagePreviewModal.design}
                    size={previewSize}
                    getFullImageUrl={getFullImageUrl}
                    getFallbackUrl={getFallbackUrl}
                    emptyState={
                      <div style={{ padding: 40, color: '#A6A29A', textAlign: 'center' }}>
                        No custom design
                      </div>
                    }
                  />
                </div>
              );
            })()
          ) : (
            <img src={imagePreviewModal.url} alt="Preview" />
          )}
        </div>
      )}




      {/* ═══ Edit Custom Cake Modal ═══ */}
      {customCakeModal.show && customCakeModal.order && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(30,35,30,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 16, backdropFilter: 'blur(4px)' }}>
          <div className="anim-modal" style={{ background: '#fff', borderRadius: 22, width: '100%', maxWidth: 640, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(79,95,82,0.18)', border: '1px solid rgba(242,237,228,0.8)' }}>
            {/* Header */}
            <div style={{ position: 'sticky', top: 0, zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: `1px solid ${CREAM}`, background: `linear-gradient(135deg, rgba(122,91,138,0.06), rgba(255,243,217,0.3))`, backdropFilter: 'blur(8px)' }}>
              <div className="flex items-center gap-3">
                <div style={{ width: 34, height: 34, background: 'linear-gradient(135deg, #7A5B8A, #5B3A6A)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 10px rgba(122,91,138,0.3)' }}>
                  <Cake size={16} color="#fff" />
                </div>
                <div>
                  <h3 style={{ color: SAGE, fontWeight: 700, fontSize: '1.05rem' }}>
                    Edit Custom Cake
                  </h3>
                  <p style={{ color: MUTED_GRAY, fontSize: '0.72rem', marginTop: 2 }}>
                    Order {customCakeModal.order.order_number} — {customCakeModal.isStaffWalkin ? 'Staff Walk-In' : 'Customer Mobile'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCustomCakeModal((m) => ({ ...m, show: false }))}
                style={{ color: MUTED_GRAY, padding: 7, borderRadius: 10, background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                <X size={19} />
              </button>
            </div>

            {/* Info banner */}
            <div style={{ padding: '12px 24px 0' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '3px 10px', borderRadius: 999, background: customCakeModal.isStaffWalkin ? 'rgba(91,122,138,0.1)' : 'rgba(79,95,82,0.08)', color: customCakeModal.isStaffWalkin ? '#3d6b82' : SAGE, border: `1px solid ${customCakeModal.isStaffWalkin ? 'rgba(91,122,138,0.25)' : 'rgba(79,95,82,0.2)'}` }}>
                  {customCakeModal.isStaffWalkin ? 'Walk-In (auto-paid on completion)' : 'Customer Mobile (payment preserved)'}
                </span>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '3px 10px', borderRadius: 999, background: customCakeModal.paymentStatus === 'paid' ? 'rgba(52,196,104,0.1)' : customCakeModal.paymentStatus === 'partially_paid' ? 'rgba(234,179,8,0.1)' : 'rgba(239,68,68,0.08)', color: customCakeModal.paymentStatus === 'paid' ? '#1a7a3c' : customCakeModal.paymentStatus === 'partially_paid' ? '#92670a' : '#c0392b', border: '1px solid rgba(166,162,154,0.2)' }}>
                  Payment: {customCakeModal.paymentStatus?.replace('_', ' ')}
                </span>
                {customCakeModal.bomLocked && (
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '3px 10px', borderRadius: 999, background: 'rgba(239,68,68,0.08)', color: '#c0392b', border: '1px solid rgba(239,68,68,0.2)' }}>
                    BOM already deducted — frozen
                  </span>
                )}
              </div>
            </div>

            {customCakeModal.loading ? (
              <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
                <Loader className="animate-spin" size={26} style={{ color: SAGE }} />
              </div>
            ) : (
              <form onSubmit={submitCustomCake} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Final Price */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: SAGE, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>
                    Final / Fixed Price (₱) *
                  </label>
                  <input
                    type="number" step="0.01" min="0"
                    value={customCakeModal.form.total_amount}
                    onChange={(e) => setCustomCakeModal((m) => ({ ...m, form: { ...m.form, total_amount: e.target.value } }))}
                    required
                    className="modal-input w-full px-3.5 py-2.5 rounded-xl border text-sm"
                    style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa' }}
                  />
                  <p style={{ color: MUTED_GRAY, fontSize: '0.7rem', marginTop: 5 }}>
                    This updates the order total. Existing payments and the payment status are preserved.
                  </p>
                </div>


                {customCakeModal.isStaffWalkin && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: SAGE, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>
                      Payment Status
                    </label>
                    <select
                      value={customCakeModal.form.payment_status}
                      onChange={(e) =>
                        setCustomCakeModal((m) => ({ ...m, form: { ...m.form, payment_status: e.target.value } }))
                      }
                      className="modal-input w-full px-3.5 py-2.5 rounded-xl border text-sm"
                      style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa', cursor: 'pointer' }}
                    >
                      <option value="partially_paid">Partially Paid</option>
                      <option value="paid">Paid</option>
                    </select>
                    <p style={{ color: MUTED_GRAY, fontSize: '0.7rem', marginTop: 5 }}>
                      Only Staff Walk-In custom cakes can be marked Paid here. Customer Mobile orders keep their customer-driven payment state.
                    </p>
                    <div className="divider-line" style={{ marginTop: 12 }} />
                  </div>
                )}

                <div className="divider-line" />

                {/* BOM */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: SAGE, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                      Bill of Materials (Ingredients)
                    </label>
                    <button
                      type="button"
                      onClick={addBomRow}
                      disabled={customCakeModal.bomLocked}
                      style={{ fontSize: '0.72rem', padding: '4px 10px', borderRadius: 8, background: customCakeModal.bomLocked ? 'rgba(166,162,154,0.15)' : 'rgba(79,95,82,0.08)', color: customCakeModal.bomLocked ? MUTED_GRAY : SAGE, border: 'none', cursor: customCakeModal.bomLocked ? 'not-allowed' : 'pointer' }}
                    >
                      + Add Ingredient
                    </button>
                  </div>

                  {customCakeModal.bomLocked && (
                    <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', marginBottom: 10 }}>
                      <p style={{ color: '#c0392b', fontSize: '0.75rem', margin: 0 }}>
                        BOM was already deducted at completion. It is read-only to protect inventory history.
                      </p>
                    </div>
                  )}

                  {customCakeModal.form.bom.length === 0 && !customCakeModal.bomLocked && (
                    <p style={{ color: MUTED_GRAY, fontSize: '0.8rem', fontStyle: 'italic' }}>
                      No ingredients yet. Add at least one so stock is deducted on completion.
                    </p>
                  )}

                  {customCakeModal.form.bom.map((row, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center', padding: '6px 8px', borderRadius: 12, background: 'rgba(242,237,228,0.35)', border: '1px solid rgba(166,162,154,0.2)' }}>
                      <select
                        value={row.ingredient_id}
                        onChange={(e) => updateBomRow(idx, 'ingredient_id', e.target.value)}
                        disabled={customCakeModal.bomLocked}
                        className="modal-input"
                        style={{ flex: 1, padding: '8px 12px', borderRadius: 10, border: '1px solid rgba(166,162,154,0.3)', background: '#fff', color: SAGE, fontSize: '0.85rem' }}
                      >
                        <option value="">{ingredientsLoading ? 'Loading…' : 'Select ingredient'}</option>
                        {ingredientsList.filter((i) => i.is_active !== false).map((ing) => (
                          <option key={ing.id} value={ing.id}>{ing.name}</option>
                        ))}
                      </select>

                      <input
                        type="number" min="0.01" step="0.01"
                        value={row.quantity_needed}
                        onChange={(e) => updateBomRow(idx, 'quantity_needed', e.target.value)}
                        placeholder="Qty"
                        disabled={customCakeModal.bomLocked}
                        className="modal-input"
                        style={{ width: 80, padding: '8px 12px', borderRadius: 10, border: '1px solid rgba(166,162,154,0.3)', background: '#fff', color: SAGE, textAlign: 'center', fontSize: '0.85rem' }}
                      />

                      <span style={{ minWidth: 55, padding: '8px 10px', borderRadius: 10, background: 'rgba(79,95,82,0.08)', color: SAGE, fontSize: '0.75rem', fontWeight: 600, textAlign: 'center', border: '1px solid rgba(79,95,82,0.15)', whiteSpace: 'nowrap' }}>
                        {row.unit || '—'}
                      </span>

                      <button
                        type="button"
                        onClick={() => removeBomRow(idx)}
                        disabled={customCakeModal.bomLocked}
                        style={{ background: 'transparent', border: 'none', color: customCakeModal.bomLocked ? 'rgba(239,68,68,0.3)' : '#EF4444', cursor: customCakeModal.bomLocked ? 'not-allowed' : 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="divider-line" />

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                  <button
                    type="button"
                    onClick={() => setCustomCakeModal((m) => ({ ...m, show: false }))}
                    className="sec-btn px-5 py-2.5 rounded-xl border text-sm font-medium"
                    style={{ borderColor: 'rgba(166,162,154,0.3)', color: MUTED_GRAY, background: 'transparent' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={customCakeModal.submitting}
                    className="primary-btn flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #7A5B8A, #5B3A6A)' }}
                  >
                    {customCakeModal.submitting ? <Loader size={15} className="animate-spin" /> : <Check size={15} />}
                    {customCakeModal.submitting ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ═══ Report Loss / Damage Modal ═══ */}
      {reportModal.show && reportModal.order && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(30,35,30,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16, backdropFilter: 'blur(4px)' }}>
          <div className="anim-modal" style={{ background: '#fff', borderRadius: 22, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(79,95,82,0.18)', border: '1px solid rgba(242,237,228,0.8)' }}>
            <div style={{ position: 'sticky', top: 0, zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: `1px solid ${CREAM}`, background: `linear-gradient(135deg, rgba(79,95,82,0.04), rgba(255,243,217,0.3))`, backdropFilter: 'blur(8px)' }}>
              <div className="flex items-center gap-3">
                <div style={{ width: 34, height: 34, background: 'linear-gradient(135deg, #D4A03D, #b8872e)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 10px rgba(212,160,61,0.3)' }}>
                  <AlertTriangle size={16} color="#fff" />
                </div>
                <div>
                  <h3 style={{ color: SAGE, fontWeight: 700, fontSize: '1.05rem' }}>
                    Report Loss / Damage
                  </h3>
                  <p style={{ color: MUTED_GRAY, fontSize: '0.72rem', marginTop: 2 }}>
                    Order {reportModal.order.order_number} — {reportModal.order.customer_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReportModal((m) => ({ ...m, show: false }))}
                style={{ color: MUTED_GRAY, padding: 7, borderRadius: 10, background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleReportSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: SAGE, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>
                  Product *
                </label>
                <select
                  value={reportModal.form.order_item_id}
                  onChange={(e) => handleReportItemChange(e.target.value)}
                  className="modal-input w-full px-3.5 py-2.5 rounded-xl border text-sm"
                  style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa', cursor: 'pointer' }}
                >
                  {reportModal.items.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.menu.name} — ordered {it.quantity} pcs
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: SAGE, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>
                    Quantity *
                  </label>
                  <input
                    type="number" min="1" step="1"
                    max={reportModal.items.find((i) => String(i.id) === String(reportModal.form.order_item_id))?.quantity || 1}
                    value={reportModal.form.quantity}
                    onChange={(e) => handleReportQuantityChange(e.target.value)}
                    className="modal-input w-full px-3.5 py-2.5 rounded-xl border text-sm"
                    style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa' }}
                  />
                  <p style={{ color: MUTED_GRAY, fontSize: '0.7rem', marginTop: 4 }}>
                    Max: {reportModal.items.find((i) => String(i.id) === String(reportModal.form.order_item_id))?.quantity || 1}
                  </p>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: SAGE, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>
                    Unit *
                  </label>
                  <input
                    type="text"
                    value={reportModal.form.unit}
                    onChange={(e) => setReportModal((m) => ({ ...m, form: { ...m.form, unit: e.target.value } }))}
                    className="modal-input w-full px-3.5 py-2.5 rounded-xl border text-sm"
                    style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa' }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: SAGE, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>
                    Estimated Cost (₱) *
                  </label>
                  <input
                    type="number" step="0.01" min="0"
                    value={reportModal.form.estimated_cost}
                    onChange={(e) => setReportModal((m) => ({ ...m, form: { ...m.form, estimated_cost: e.target.value } }))}
                    className="modal-input w-full px-3.5 py-2.5 rounded-xl border text-sm"
                    style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: SAGE, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>
                    Damage Type *
                  </label>
                  <select
                    value={reportModal.form.damage_type}
                    onChange={(e) => setReportModal((m) => ({ ...m, form: { ...m.form, damage_type: e.target.value } }))}
                    className="modal-input w-full px-3.5 py-2.5 rounded-xl border text-sm"
                    style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa', cursor: 'pointer' }}
                  >
                    <option value="spoilage">Spoilage</option>
                    <option value="breakage">Breakage</option>
                    <option value="expired">Expired</option>
                    <option value="misproduction">Misproduction</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: SAGE, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>
                  Description (Optional)
                </label>
                <textarea
                  value={reportModal.form.description}
                  onChange={(e) => setReportModal((m) => ({ ...m, form: { ...m.form, description: e.target.value } }))}
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
                  onClick={() => setReportModal((m) => ({ ...m, show: false }))}
                  className="sec-btn px-5 py-2.5 rounded-xl border text-sm font-medium"
                  style={{ borderColor: 'rgba(166,162,154,0.3)', color: MUTED_GRAY, background: 'transparent' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reportSubmitting}
                  className="primary-btn flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #D4A03D, #92670a)' }}
                >
                  {reportSubmitting ? <Loader size={15} className="animate-spin" /> : <AlertTriangle size={15} />}
                  {reportSubmitting ? 'Submitting…' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}




      {/* ═══ Custom Cake Report Loss / Damage Modal ═══ */}
      {customCakeReportModal.show && customCakeReportModal.order && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(30,35,30,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 16, backdropFilter: 'blur(4px)' }}>
          <div className="anim-modal" style={{ background: '#fff', borderRadius: 22, width: '100%', maxWidth: 620, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(79,95,82,0.18)', border: '1px solid rgba(242,237,228,0.8)' }}>
            {/* Header */}
            <div style={{ position: 'sticky', top: 0, zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: `1px solid ${CREAM}`, background: `linear-gradient(135deg, rgba(122,91,138,0.06), rgba(255,243,217,0.3))`, backdropFilter: 'blur(8px)' }}>
              <div className="flex items-center gap-3">
                <div style={{ width: 34, height: 34, background: 'linear-gradient(135deg, #7A5B8A, #5B3A6A)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 10px rgba(122,91,138,0.3)' }}>
                  <AlertTriangle size={16} color="#fff" />
                </div>
                <div>
                  <h3 style={{ color: SAGE, fontWeight: 700, fontSize: '1.05rem' }}>
                    Report Custom Cake Loss / Damage
                  </h3>
                  <p style={{ color: MUTED_GRAY, fontSize: '0.72rem', marginTop: 2 }}>
                    Order {customCakeReportModal.order.order_number}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCustomCakeReportModal((m) => ({ ...m, show: false }))}
                style={{ color: MUTED_GRAY, padding: 7, borderRadius: 10, background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                <X size={19} />
              </button>
            </div>

            {customCakeReportModal.loading ? (
              <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
                <Loader className="animate-spin" size={26} style={{ color: SAGE }} />
              </div>
            ) : (
              <form onSubmit={handleCustomCakeReportSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* BOM Ingredient Selection */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: SAGE, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                      BOM Ingredients * <span style={{ color: MUTED_GRAY, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(tick the ones lost / damaged)</span>
                    </label>
                  </div>

                  {customCakeReportModal.bom.map((row, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                        padding: '10px 12px',
                        borderRadius: 12,
                        marginBottom: 8,
                        background: row.is_checked ? 'rgba(122,91,138,0.06)' : 'rgba(242,237,228,0.35)',
                        border: `1px solid ${row.is_checked ? 'rgba(122,91,138,0.3)' : 'rgba(166,162,154,0.2)'}`,
                      }}
                    >
                      <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={row.is_checked}
                          onChange={() => toggleBomIngredient(idx)}
                          style={{ width: 16, height: 16, accentColor: '#7A5B8A', cursor: 'pointer' }}
                        />
                        <span style={{ fontWeight: 600, color: SAGE, fontSize: '0.88rem', flex: 1 }}>
                          {row.ingredient_name}
                        </span>
                        <span style={{
                          fontSize: '0.72rem', fontWeight: 600, color: MUTED_GRAY,
                          background: 'rgba(79,95,82,0.07)', padding: '2px 8px', borderRadius: 6,
                        }}>
                          BOM: {row.quantity_needed} {row.unit}
                        </span>
                      </label>

                      {row.is_checked && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 600, color: SAGE, marginBottom: 4 }}>
                              Lost/Damaged Qty ({row.unit})
                            </label>
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={row.report_quantity}
                              onChange={(e) => updateBomField(idx, 'report_quantity', e.target.value)}
                              placeholder="0.00"
                              className="modal-input w-full px-3 py-2 rounded-xl border text-sm"
                              style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE, background: '#fff' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 600, color: SAGE, marginBottom: 4 }}>
                              Est. Cost (₱)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={row.estimated_cost}
                              onChange={(e) => updateBomField(idx, 'estimated_cost', e.target.value)}
                              placeholder="0.00"
                              className="modal-input w-full px-3 py-2 rounded-xl border text-sm"
                              style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE, background: '#fff' }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Damage Type */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: SAGE, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>
                    Damage Type *
                  </label>
                  <select
                    value={customCakeReportModal.damage_type}
                    onChange={(e) => setCustomCakeReportModal((m) => ({ ...m, damage_type: e.target.value }))}
                    required
                    className="modal-input w-full px-3.5 py-2.5 rounded-xl border text-sm"
                    style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa', cursor: 'pointer' }}
                  >
                    <option value="spoilage">Spoilage</option>
                    <option value="breakage">Breakage</option>
                    <option value="expired">Expired</option>
                    <option value="misproduction">Misproduction</option>
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: SAGE, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>
                    Description (Optional)
                  </label>
                  <textarea
                    value={customCakeReportModal.description}
                    onChange={(e) => setCustomCakeReportModal((m) => ({ ...m, description: e.target.value }))}
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
                    onClick={() => setCustomCakeReportModal((m) => ({ ...m, show: false }))}
                    className="sec-btn px-5 py-2.5 rounded-xl border text-sm font-medium"
                    style={{ borderColor: 'rgba(166,162,154,0.3)', color: MUTED_GRAY, background: 'transparent' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={customCakeReportModal.submitting}
                    className="primary-btn flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #7A5B8A, #5B3A6A)' }}
                  >
                    {customCakeReportModal.submitting ? <Loader size={15} className="animate-spin" /> : <AlertTriangle size={15} />}
                    {customCakeReportModal.submitting ? 'Submitting…' : 'Submit Report'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ═══ Toast (auto-dismissing notification) ═══ */}
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
            <CheckCircle size={18} />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}