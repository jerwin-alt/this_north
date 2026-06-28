// web/src/pages/Products.jsx

import React, { useState, useEffect } from 'react';
import axios from '/api/axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Edit2, Trash2, X, Image as ImageIcon,
  Package, Layers, AlertCircle, Loader, Search, Eye,
  Coffee, Sparkles, Sandwich, Cookie, Cake
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

const cardHover = {
  rest: { y: 0, boxShadow: '0 2px 12px rgba(79, 95, 82, 0.06)' },
  hover: { y: -6, boxShadow: '0 20px 40px rgba(79, 95, 82, 0.18)' }
};

const modalAnimation = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } }
};

// Category icon mapping
const categoryIcons = {
  'Coffee': Coffee,
  'Non Coffee': Sparkles,
  'Food': Sandwich,
  'Snack': Cookie,
  'Dessert': Cake,
};

export default function Products() {
  // ---------- State ----------
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Category modal
  const [showCatModal, setShowCatModal] = useState(false);
  const [catEditMode, setCatEditMode] = useState(false);
  const [currentCategory, setCurrentCategory] = useState(null);
  const [catForm, setCatForm] = useState({ name: '', description: '', is_active: true });
  const [catSubmitting, setCatSubmitting] = useState(false);

  // Product modal (edit/add)
  const [showProdModal, setShowProdModal] = useState(false);
  const [prodSubmitting, setProdSubmitting] = useState(false);
  const [prodForm, setProdForm] = useState({
    category_id: '',
    name: '',
    description: '',
    base_price: '',
    menu_type: 'standard',
    has_size_options: false,
    is_active: true,
    track_stock: true,
    stock_quantity: '0',
    is_ready_made: true,
    expiration_date: '',
    min_stock_level: '',
    sku: '',
    image: null,
  });
  const [editMode, setEditMode] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [prodFormError, setProdFormError] = useState('');

  // SKU preview
  const [skuPreview, setSkuPreview] = useState('');

  // ---------- Add Stock Modal State ----------
  const [stockModal, setStockModal] = useState({ show: false, product: null });
  const [stockQuantity, setStockQuantity] = useState(1);
  const [addingStock, setAddingStock] = useState(false);

  // ---------- Fetch Data ----------
  const fetchCategories = async () => {
    try {
      const res = await axios.get('/categories');
      setCategories(res.data.categories || []);
      if (res.data.categories?.length > 0 && !selectedCategory) {
        setSelectedCategory(res.data.categories[0]);
      }
    } catch (err) { console.error(err); }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/admin/menu');
      setProducts(res.data.products || res.data.menu || []);
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

  // Auto SKU preview
  useEffect(() => {
    if (prodForm.category_id) {
      const catId = prodForm.category_id;
      const cat = categories.find(c => c.id == catId);
      if (!cat) return;

      const words = cat.name.trim().split(/\s+/);
      let prefix;
      if (words.length === 1) {
        prefix = words[0].substring(0, 2).toUpperCase();
      } else {
        let initials = '';
        for (const w of words) {
          if (w) {
            initials += w[0];
            if (initials.length >= 2) break;
          }
        }
        prefix = initials.toUpperCase().padEnd(2, (words[0][1] || '').toUpperCase());
      }

      const relevantProducts = products.filter(
        p => p.category_id == catId && p.sku && p.sku.startsWith(prefix + '-')
      );
      let maxNum = 0;
      relevantProducts.forEach(p => {
        const parts = p.sku.split('-');
        if (parts.length === 2) {
          const num = parseInt(parts[1], 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      });
      const nextNum = maxNum + 1;
      const generated = prefix + '-' + String(nextNum).padStart(4, '0');
      setSkuPreview(generated);
    } else {
      setSkuPreview('');
    }
  }, [prodForm.category_id, categories, products]);

  // Filter products
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory ? p.category_id === selectedCategory.id : true;
    return matchesSearch && matchesCategory;
  });

  // ---------- Category Handlers ----------
  const openAddCategory = () => {
    setCatEditMode(false);
    setCurrentCategory(null);
    setCatForm({ name: '', description: '', is_active: true });
    setShowCatModal(true);
  };

  const openEditCategory = (cat) => {
    setCatEditMode(true);
    setCurrentCategory(cat);
    setCatForm({ name: cat.name, description: cat.description || '', is_active: cat.is_active });
    setShowCatModal(true);
  };

  const handleCatSubmit = async (e) => {
    e.preventDefault();
    setCatSubmitting(true);
    try {
      if (catEditMode && currentCategory) {
        await axios.put(`/categories/${currentCategory.id}`, catForm);
      } else {
        await axios.post('/categories', catForm);
      }
      await fetchCategories();
      setShowCatModal(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Error saving category');
    } finally {
      setCatSubmitting(false);
    }
  };

  const deleteCategory = async (id) => {
    if (!window.confirm('Delete this category? Products under it will not be deleted.')) return;
    try {
      await axios.delete(`/categories/${id}`);
      await fetchCategories();
    } catch (err) {
      alert(err.response?.data?.message || 'Cannot delete category (maybe has products)');
    }
  };

  // ---------- Product Handlers ----------
  const openAddProduct = () => {
    setEditMode(false);
    setEditingProduct(null);
    setProdForm({
      category_id: selectedCategory?.id || categories[0]?.id || '',
      name: '',
      description: '',
      base_price: '',
      menu_type: 'standard',
      has_size_options: false,
      is_active: true,
      track_stock: true,
      stock_quantity: '0',
      is_ready_made: true,
      expiration_date: '',
      min_stock_level: '',
      sku: '',
      image: null,
    });
    setProdFormError('');
    setShowProdModal(true);
  };

  const openEditProduct = (product) => {
    setEditMode(true);
    setEditingProduct(product);
    setProdForm({
      category_id: product.category_id,
      name: product.name,
      description: product.description || '',
      base_price: product.base_price,
      menu_type: product.menu_type,
      has_size_options: product.has_size_options,
      is_active: product.is_active,
      track_stock: product.track_stock,
      stock_quantity: product.stock_quantity ?? '0',
      is_ready_made: product.is_ready_made,
      expiration_date: product.expiration_date || '',
      min_stock_level: product.min_stock_level ?? '',
      sku: product.sku || '',
      image: null,
    });
    setProdFormError('');
    setShowProdModal(true);
  };

  const handleProdInputChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    if (type === 'file') setProdForm(prev => ({ ...prev, image: files[0] }));
    else if (type === 'checkbox') setProdForm(prev => ({ ...prev, [name]: checked }));
    else setProdForm(prev => ({ ...prev, [name]: value }));
  };

  const handleProdSubmit = async (e) => {
    e.preventDefault();
    setProdSubmitting(true);
    setProdFormError('');

    if (!prodForm.category_id) {
      setProdFormError('Please select a category');
      setProdSubmitting(false);
      return;
    }
    if (!prodForm.name || !prodForm.base_price) {
      setProdFormError('Name and price are required');
      setProdSubmitting(false);
      return;
    }
    if (!editMode && !prodForm.image) {
      setProdFormError('Product image is required');
      setProdSubmitting(false);
      return;
    }

    const formData = new FormData();
    formData.append('category_id', prodForm.category_id);
    formData.append('name', prodForm.name);
    if (prodForm.description) formData.append('description', prodForm.description);
    formData.append('base_price', prodForm.base_price);
    formData.append('menu_type', prodForm.menu_type);
    formData.append('has_size_options', prodForm.has_size_options ? '1' : '0');
    formData.append('is_active', prodForm.is_active ? '1' : '0');
    formData.append('track_stock', prodForm.track_stock ? '1' : '0');
    formData.append('is_ready_made', prodForm.is_ready_made ? '1' : '0');
    formData.append('stock_quantity', prodForm.stock_quantity === '' ? 0 : prodForm.stock_quantity);
    formData.append('min_stock_level', prodForm.min_stock_level === '' ? 0 : (prodForm.min_stock_level || 0));
    if (prodForm.expiration_date) formData.append('expiration_date', prodForm.expiration_date);
    if (prodForm.image) formData.append('image', prodForm.image);

    try {
      if (editMode && editingProduct) {
        formData.append('_method', 'PUT');
        await axios.post(`/admin/menu/${editingProduct.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await axios.post('/admin/menu', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      await fetchProducts();
      setShowProdModal(false);
      setProdForm({
        category_id: categories[0]?.id || '',
        name: '', description: '', base_price: '', menu_type: 'standard',
        has_size_options: false, is_active: true, track_stock: true,
        stock_quantity: '0', is_ready_made: true, expiration_date: '',
        min_stock_level: '', sku: '', image: null,
      });
      setEditMode(false);
      setEditingProduct(null);
    } catch (err) {
      if (err.response?.data?.errors) {
        const firstError = Object.values(err.response.data.errors)[0]?.[0];
        setProdFormError(firstError || 'Validation failed');
      } else {
        setProdFormError(err.response?.data?.message || (editMode ? 'Failed to update product' : 'Failed to create product'));
      }
    } finally {
      setProdSubmitting(false);
    }
  };

  const deleteProduct = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      await axios.delete(`/admin/menu/${id}`);
      await fetchProducts();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  // ---------- Add Stock Handlers ----------
  const openStockModal = (product) => {
    setStockModal({ show: true, product });
    setStockQuantity(1);
  };

  const closeStockModal = () => {
    setStockModal({ show: false, product: null });
    setStockQuantity(1);
  };

  const handleAddStock = async () => {
    if (!stockModal.product) return;
    if (!stockQuantity || stockQuantity < 1) {
      alert('Please enter a valid quantity.');
      return;
    }
    setAddingStock(true);
    try {
      await axios.post(`/admin/menu/${stockModal.product.id}/add-stock`, {
        quantity: stockQuantity
      });
      await fetchProducts(); // refresh product list
      closeStockModal();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add stock');
    } finally {
      setAddingStock(false);
    }
  };

  if (loading) {
    return (
      <div style={{ background: CREAM, minHeight: '100vh' }} className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader className="animate-spin" style={{ color: SAGE }} size={36} />
          <p style={{ color: MUTED_GRAY, fontSize: '0.85rem', letterSpacing: '0.05em' }}>Loading menu...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-2xl flex items-center gap-3 m-6" style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FEE2E2' }}>
        <AlertCircle size={20} /> <span>{error}</span>
      </div>
    );
  }

  return (
    <div style={{ background: CREAM, minHeight: '100vh', padding: '36px 28px' }}>
      <style>{`
        .products-root {
          --sage: #4F5F52;
          --cream: #F2EDE4;
          --muted: #A6A29A;
          --soft-white: #FFF3D9;
        }
        .grain-overlay {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          opacity: 0.028;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
          background-repeat: repeat;
          background-size: 128px;
        }
        .tab-btn {
          position: relative;
          overflow: hidden;
          transition: all 0.25s cubic-bezier(0.4,0,0.2,1);
        }
        .tab-btn::after {
          content: '';
          position: absolute;
          inset: 0;
          background: rgba(79,95,82,0.06);
          opacity: 0;
          transition: opacity 0.2s;
        }
        .tab-btn:hover::after { opacity: 1; }
        .tab-btn.active::after { display: none; }
        .product-card-img {
          transition: transform 0.5s cubic-bezier(0.25,0.46,0.45,0.94);
        }
        .product-card:hover .product-card-img {
          transform: scale(1.04);
        }
        .action-btn {
          transition: all 0.18s ease;
        }
        .action-btn:hover {
          transform: scale(1.12);
        }
        .search-input:focus {
          box-shadow: 0 0 0 3px rgba(79,95,82,0.12);
        }
        .modal-input:focus {
          box-shadow: 0 0 0 3px rgba(79,95,82,0.12);
          border-color: #4F5F52 !important;
          outline: none;
        }
        .primary-btn {
          position: relative;
          overflow: hidden;
          transition: all 0.22s cubic-bezier(0.4,0,0.2,1);
        }
        .primary-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: rgba(255,255,255,0.1);
          opacity: 0;
          transition: opacity 0.2s;
        }
        .primary-btn:hover::before { opacity: 1; }
        .primary-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(79,95,82,0.3); }
        .primary-btn:active { transform: translateY(0); }
        .sec-btn {
          transition: all 0.2s ease;
        }
        .sec-btn:hover {
          background: rgba(79,95,82,0.07) !important;
          transform: translateY(-1px);
        }
        .divider-line {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(79,95,82,0.15), transparent);
        }
        .stat-pill {
          transition: all 0.2s ease;
        }
        .checkbox-custom {
          accent-color: #4F5F52;
        }
      `}</style>

      <div className="grain-overlay" />

      <div className="max-w-7xl mx-auto relative" style={{ zIndex: 1 }}>

        {/* ── Header ── */}

        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
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
                Menu Management
              </h1>
            </div>
            <p style={{ color: MUTED_GRAY, fontSize: '0.82rem', letterSpacing: '0.03em', marginLeft: 48 }}>
              Manage categories and menu items
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={openAddCategory}
              className="sec-btn flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
              style={{
                background: 'rgba(166,162,154,0.15)',
                color: SAGE,
                border: `1.5px solid rgba(166,162,154,0.3)`,
                backdropFilter: 'blur(4px)',
              }}
            >
              <Plus size={16} strokeWidth={2.2} />
              Add Category
            </button>
            <button
              onClick={openAddProduct}
              className="primary-btn flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium"
              style={{
                background: `linear-gradient(135deg, ${SAGE} 0%, #3e4c42 100%)`,
                boxShadow: '0 4px 14px rgba(79,95,82,0.28)',
              }}
            >
              <Plus size={16} strokeWidth={2.2} />
              Add Product
            </button>
          </div>
        </motion.div>

        {/* ── Divider ── */}
        <div className="divider-line mb-7" />

        {/* ── Search Bar ── */}
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          className="relative w-full md:w-80 mb-7"
        >
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2"
            style={{ color: MUTED_GRAY }}
            size={15}
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
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
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
              No categories yet. Click "Add Category" to create one.
            </p>
          )}
        </motion.div>

        {/* ── Products Count ── */}
        {filteredProducts.length > 0 && (
          <motion.p
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            style={{ color: MUTED_GRAY, fontSize: '0.78rem', marginBottom: '1.25rem', letterSpacing: '0.04em' }}
          >
            {filteredProducts.length} item{filteredProducts.length !== 1 ? 's' : ''} found
          </motion.p>
        )}

        {/* ── Products Grid ── */}
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
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
            filteredProducts.map((product, idx) => (
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
                      src={product.image_url.startsWith('http') ? product.image_url : `http://10.130.48.170:8000${product.image_url}`}
                      alt={product.name}
                      className="product-card-img w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${CREAM}, ${SOFT_WHITE})` }}>
                      <Package style={{ color: MUTED_GRAY, opacity: 0.3 }} size={48} />
                    </div>
                  )}

                  {/* Gradient overlay at bottom of image */}
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    height: '50%',
                    background: 'linear-gradient(to top, rgba(0,0,0,0.18), transparent)',
                    pointerEvents: 'none',
                  }} />

                  {/* Status badge */}
                  <div style={{ position: 'absolute', top: 12, right: 12 }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '3px 10px',
                      borderRadius: 999,
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      letterSpacing: '0.04em',
                      background: product.is_active ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.35)',
                      color: product.is_active ? '#2d7a45' : '#888',
                      backdropFilter: 'blur(6px)',
                      boxShadow: '0 1px 6px rgba(0,0,0,0.1)',
                    }}>
                      <span style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: product.is_active ? '#34d468' : '#aaa',
                        display: 'inline-block',
                      }} />
                      {product.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                {/* Content */}
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

                  {/* Size Pills */}
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

                  {/* Divider */}
                  <div className="divider-line my-3" />

                  {/* Footer row with stock info and action buttons (including Add Stock) */}
                  <div className="flex items-center justify-between">
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: product.stock_quantity <= (product.min_stock_level || 0)
                        ? 'rgba(239,68,68,0.08)'
                        : 'rgba(79,95,82,0.07)',
                      borderRadius: 8,
                      padding: '4px 10px',
                    }}>
                      <Package size={13} style={{
                        color: product.stock_quantity <= (product.min_stock_level || 0) ? '#ef4444' : SAGE
                      }} />
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        color: product.stock_quantity <= (product.min_stock_level || 0) ? '#ef4444' : SAGE,
                        letterSpacing: '0.02em',
                      }}>
                        {product.stock_quantity} in stock
                      </span>
                    </div>

                    <div className="flex gap-1">
                      {/* Add Stock Button */}
                      <button
                        onClick={() => openStockModal(product)}
                        className="action-btn p-2 rounded-xl"
                        style={{ color: '#0d9488', background: 'rgba(13,148,136,0.1)' }}
                        title="Add stock"
                      >
                        <Plus size={14} strokeWidth={2} />
                      </button>
                      {/* Edit Button */}
                      <button
                        onClick={() => openEditProduct(product)}
                        className="action-btn p-2 rounded-xl"
                        style={{ color: SAGE, background: 'rgba(79,95,82,0.08)' }}
                        title="Edit product"
                      >
                        <Edit2 size={14} strokeWidth={2} />
                      </button>
                      {/* Delete Button */}
                      <button
                        onClick={() => deleteProduct(product.id)}
                        className="action-btn p-2 rounded-xl"
                        style={{ color: '#EF4444', background: 'rgba(239,68,68,0.07)' }}
                        title="Delete product"
                      >
                        <Trash2 size={14} strokeWidth={2} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </motion.div>
      </div>

      {/* ══ Category Modal (unchanged) ══ */}
      <AnimatePresence>
        {showCatModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(30,35,30,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16, backdropFilter: 'blur(4px)' }}>
            <motion.div
              variants={modalAnimation}
              initial="hidden"
              animate="visible"
              exit="exit"
              style={{
                background: '#fff',
                borderRadius: 20,
                width: '100%',
                maxWidth: 440,
                boxShadow: '0 24px 60px rgba(79,95,82,0.18), 0 4px 16px rgba(0,0,0,0.08)',
                overflow: 'hidden',
                border: '1px solid rgba(242,237,228,0.8)',
              }}
            >
              {/* Modal header */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '18px 22px',
                borderBottom: `1px solid ${CREAM}`,
                background: `linear-gradient(135deg, rgba(79,95,82,0.04), rgba(255,243,217,0.3))`,
              }}>
                <div className="flex items-center gap-2.5">
                  <div style={{
                    width: 30, height: 30,
                    background: `linear-gradient(135deg, ${SAGE}, #3e4c42)`,
                    borderRadius: 8,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Layers size={14} color="#fff" />
                  </div>
                  <h3 style={{ color: SAGE, fontWeight: 700, fontSize: '1rem' }}>
                    {catEditMode ? 'Edit Category' : 'New Category'}
                  </h3>
                </div>
                <button
                  onClick={() => setShowCatModal(false)}
                  style={{ color: MUTED_GRAY, padding: 6, borderRadius: 8, transition: 'all 0.15s', background: 'transparent' }}
                  onMouseEnter={e => e.currentTarget.style.background = CREAM}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCatSubmit} style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: SAGE, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Name *</label>
                  <input
                    type="text"
                    value={catForm.name}
                    onChange={e => setCatForm({...catForm, name: e.target.value})}
                    required
                    className="modal-input w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all"
                    style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: SAGE, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Description</label>
                  <textarea
                    value={catForm.description}
                    onChange={e => setCatForm({...catForm, description: e.target.value})}
                    rows={2}
                    className="modal-input w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all"
                    style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa', resize: 'none' }}
                  />
                </div>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    id="catActive"
                    checked={catForm.is_active}
                    onChange={e => setCatForm({...catForm, is_active: e.target.checked})}
                    className="checkbox-custom w-4 h-4 rounded"
                  />
                  <span style={{ fontSize: '0.85rem', color: SAGE }}>Active</span>
                </label>

                <div className="divider-line" />

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCatModal(false)}
                    className="sec-btn px-4 py-2 rounded-xl border text-sm font-medium"
                    style={{ borderColor: 'rgba(166,162,154,0.3)', color: MUTED_GRAY }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={catSubmitting}
                    className="primary-btn px-5 py-2 rounded-xl text-white text-sm font-medium disabled:opacity-50"
                    style={{ background: `linear-gradient(135deg, ${SAGE}, #3e4c42)` }}
                  >
                    {catSubmitting ? 'Saving…' : 'Save Category'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ══ Product Modal (Add/Edit) ══ */}
      <AnimatePresence>
        {showProdModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(30,35,30,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16, overflowY: 'auto', backdropFilter: 'blur(4px)' }}>
            <motion.div
              variants={modalAnimation}
              initial="hidden"
              animate="visible"
              exit="exit"
              style={{
                background: '#fff',
                borderRadius: 22,
                width: '100%',
                maxWidth: 680,
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 24px 60px rgba(79,95,82,0.18), 0 4px 16px rgba(0,0,0,0.08)',
                border: '1px solid rgba(242,237,228,0.8)',
              }}
            >
              {/* Modal header */}
              <div style={{
                position: 'sticky', top: 0,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '20px 26px',
                borderBottom: `1px solid ${CREAM}`,
                background: `linear-gradient(135deg, rgba(79,95,82,0.04), rgba(255,243,217,0.3))`,
                backdropFilter: 'blur(8px)',
                zIndex: 10,
              }}>
                <div className="flex items-center gap-3">
                  <div style={{
                    width: 34, height: 34,
                    background: `linear-gradient(135deg, ${SAGE}, #3e4c42)`,
                    borderRadius: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 3px 10px rgba(79,95,82,0.25)',
                  }}>
                    <Package size={16} color="#fff" />
                  </div>
                  <h3 style={{ color: SAGE, fontWeight: 700, fontSize: '1.1rem', letterSpacing: '-0.01em' }}>
                    {editMode ? 'Edit Product' : 'New Product'}
                  </h3>
                </div>
                <button
                  onClick={() => setShowProdModal(false)}
                  style={{ color: MUTED_GRAY, padding: 7, borderRadius: 10, transition: 'all 0.15s', background: 'transparent' }}
                  onMouseEnter={e => e.currentTarget.style.background = CREAM}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <X size={19} />
                </button>
              </div>

              <form onSubmit={handleProdSubmit} style={{ padding: '26px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                {prodFormError && (
                  <div className="flex items-center gap-2.5 p-3.5 rounded-xl text-sm" style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FEE2E2' }}>
                    <AlertCircle size={16} />
                    {prodFormError}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Category */}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: SAGE, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
                      Category *
                    </label>
                    <select
                      name="category_id"
                      value={prodForm.category_id}
                      onChange={handleProdInputChange}
                      required
                      className="modal-input w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all"
                      style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa' }}
                    >
                      <option value="">Select category</option>
                      {categories.filter(c => c.is_active).map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Product Name */}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: SAGE, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
                      Product Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={prodForm.name}
                      onChange={handleProdInputChange}
                      required
                      className="modal-input w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all"
                      style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa' }}
                    />
                  </div>

                  {/* Description */}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: SAGE, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
                      Description
                    </label>
                    <textarea
                      name="description"
                      value={prodForm.description}
                      onChange={handleProdInputChange}
                      rows={2}
                      className="modal-input w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all"
                      style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa', resize: 'none' }}
                    />
                  </div>

                  {/* Base Price */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: SAGE, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
                      Base Price *
                    </label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: MUTED_GRAY, fontSize: '0.85rem', fontWeight: 600 }}>₱</span>
                      <input
                        type="number"
                        step="0.01"
                        name="base_price"
                        value={prodForm.base_price}
                        onChange={handleProdInputChange}
                        required
                        className="modal-input w-full pl-8 pr-3.5 py-2.5 rounded-xl border text-sm transition-all"
                        style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa' }}
                      />
                    </div>
                  </div>

                  {/* Stock Quantity */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: SAGE, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
                      Stock Quantity
                    </label>
                    <input
                      type="number"
                      name="stock_quantity"
                      value={prodForm.stock_quantity}
                      onChange={handleProdInputChange}
                      className="modal-input w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all"
                      style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa' }}
                    />
                  </div>

                  {/* SKU preview */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: SAGE, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
                      SKU <span style={{ color: MUTED_GRAY, fontWeight: 400 }}>(auto‑generated)</span>
                    </label>
                    <input
                      type="text"
                      value={editMode ? prodForm.sku : skuPreview}
                      disabled
                      className="modal-input w-full px-3.5 py-2.5 rounded-xl border text-sm"
                      style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE, background: '#f0f0f0' }}
                    />
                    <p style={{ color: MUTED_GRAY, fontSize: '0.7rem', marginTop: 4 }}>
                      SKU is set automatically based on the selected category
                    </p>
                  </div>

                  {/* Expiration Date */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: SAGE, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
                      Expiration Date
                    </label>
                    <input
                      type="date"
                      name="expiration_date"
                      value={prodForm.expiration_date}
                      onChange={handleProdInputChange}
                      className="modal-input w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all"
                      style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa' }}
                    />
                  </div>

                  {/* Image upload */}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: SAGE, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
                      Product Image {!editMode && '*'}
                    </label>
                    <div style={{
                      border: `2px dashed rgba(166,162,154,0.35)`,
                      borderRadius: 14,
                      padding: '16px 20px',
                      background: 'rgba(242,237,228,0.25)',
                      display: 'flex', alignItems: 'center', gap: 12,
                    }}>
                      <div style={{
                        width: 36, height: 36,
                        background: CREAM,
                        borderRadius: 10,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <ImageIcon size={16} style={{ color: MUTED_GRAY }} />
                      </div>
                      <input
                        type="file"
                        name="image"
                        accept="image/*"
                        onChange={handleProdInputChange}
                        required={!editMode}
                        className="w-full text-sm"
                        style={{ color: SAGE }}
                      />
                    </div>
                  </div>

                  {/* Checkboxes */}
                  <div style={{ gridColumn: '1 / -1', display: 'flex', flexWrap: 'wrap', gap: 20 }}>
                    {[
                      { name: 'is_active', label: 'Active', checked: prodForm.is_active },
                      { name: 'track_stock', label: 'Track Stock', checked: prodForm.track_stock },
                      { name: 'has_size_options', label: 'Has Sizes', checked: prodForm.has_size_options },
                    ].map(({ name, label, checked }) => (
                      <label key={name} className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          name={name}
                          checked={checked}
                          onChange={handleProdInputChange}
                          className="checkbox-custom w-4 h-4 rounded"
                        />
                        <span style={{ fontSize: '0.85rem', color: SAGE, fontWeight: 500 }}>{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="divider-line" />

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowProdModal(false)}
                    className="sec-btn px-5 py-2.5 rounded-xl border text-sm font-medium"
                    style={{ borderColor: 'rgba(166,162,154,0.3)', color: MUTED_GRAY }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={prodSubmitting}
                    className="primary-btn flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50"
                    style={{ background: `linear-gradient(135deg, ${SAGE}, #3e4c42)` }}
                  >
                    {prodSubmitting && <Loader size={15} className="animate-spin" />}
                    {prodSubmitting
                      ? (editMode ? 'Updating…' : 'Creating…')
                      : (editMode ? 'Update Product' : 'Create Product')
                    }
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ══ Add Stock Modal ══ */}
      {stockModal.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" style={{ backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-xl font-bold text-[#4F5F52] mb-4">Add Stock</h3>
            <p className="text-gray-600 mb-2">Product: <strong>{stockModal.product?.name}</strong></p>
            <p className="text-gray-600 mb-4">Current stock: <strong>{stockModal.product?.stock_quantity}</strong></p>
            <label className="block text-sm font-semibold mb-1 text-[#4F5F52]">Quantity to add</label>
            <input
              type="number"
              min="1"
              value={stockQuantity}
              onChange={(e) => setStockQuantity(parseInt(e.target.value) || 0)}
              className="w-full border rounded-xl px-4 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-[#4F5F52]"
            />
            <div className="flex justify-end gap-3">
              <button onClick={closeStockModal} className="px-4 py-2 rounded-lg border text-gray-600 hover:bg-gray-100">Cancel</button>
              <button
                onClick={handleAddStock}
                disabled={addingStock}
                className="px-4 py-2 rounded-lg bg-[#4F5F52] text-white hover:bg-[#3e4c42] disabled:opacity-50"
              >
                {addingStock ? 'Adding...' : 'Add Stock'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}