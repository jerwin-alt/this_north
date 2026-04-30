import React, { useState, useEffect } from 'react';
import axios from '/api/axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Edit2, Trash2, X, Image as ImageIcon, 
  Package, Layers, AlertCircle, Loader, Search, Eye,
  Coffee, Sparkles, Sandwich, Cookie, Cake
} from 'lucide-react';

// Color palette (matching your brand)
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
  rest: { y: 0, boxShadow: '0 2px 8px rgba(79, 95, 82, 0.08)' },
  hover: { y: -4, boxShadow: '0 8px 24px rgba(79, 95, 82, 0.15)' }
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
  // ---------- State (unchanged) ----------
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

  // Product modal
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

  // ---------- Fetch Data (unchanged) ----------
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

  // Filter products by selected category
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory ? p.category_id === selectedCategory.id : true;
    return matchesSearch && matchesCategory;
  });

  // ---------- Category Handlers (unchanged) ----------
  const openAddCategory = () => {
    setCatEditMode(false);
    setCurrentCategory(null);
    setCatForm({ name: '', description: '', is_active: true });
    setShowCatModal(true);
  };

  const openEditCategory = (cat) => {
    setCatEditMode(true);
    setCurrentCategory(cat);
    setCatForm({
      name: cat.name,
      description: cat.description || '',
      is_active: cat.is_active,
    });
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

  // ---------- Product Handlers (unchanged) ----------
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
    if (prodForm.sku) formData.append('sku', prodForm.sku);
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader className="animate-spin" style={{ color: SAGE }} size={36} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-lg flex items-center gap-2" style={{ background: '#FEF2F2', color: '#DC2626' }}>
        <AlertCircle size={20} /> <span>Error: {error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6" style={{ background: CREAM, minHeight: '100vh', padding: '32px 24px' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header with Buttons */}
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          className="flex flex-wrap justify-between items-center gap-4 mb-6"
        >
          <div>
            <h1 className="text-2xl font-bold" style={{ color: SAGE }}>Menu Management</h1>
            <p className="text-sm" style={{ color: MUTED_GRAY }}>Manage categories and menu items</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={openAddCategory}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm transition-colors"
              style={{ background: MUTED_GRAY }}
              onMouseEnter={e => e.currentTarget.style.background = '#8f8b82'}
              onMouseLeave={e => e.currentTarget.style.background = MUTED_GRAY}
            >
              <Plus size={18} /> Add Category
            </button>
            <button
              onClick={openAddProduct}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm transition-colors"
              style={{ background: SAGE }}
              onMouseEnter={e => e.currentTarget.style.background = '#3e4c42'}
              onMouseLeave={e => e.currentTarget.style.background = SAGE}
            >
              <Plus size={18} /> Add Product
            </button>
          </div>
        </motion.div>

        {/* Search Bar */}
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          className="relative w-full md:w-96 mb-6"
        >
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: MUTED_GRAY }} />
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-sage/20"
            style={{ borderColor: CREAM, color: SAGE }}
          />
        </motion.div>

        {/* Category Tabs - Like the image */}
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
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive 
                    ? 'bg-sage text-white shadow-md' 
                    : 'bg-white text-gray-700 border hover:border-sage/40'
                }`}
                style={isActive ? { background: SAGE } : { borderColor: CREAM }}
              >
                <Icon size={18} />
                {category.name}
              </button>
            );
          })}
          {categories.filter(c => c.is_active).length === 0 && (
            <p className="text-sm" style={{ color: MUTED_GRAY }}>No categories available. Click "Add Category" to create one.</p>
          )}
        </motion.div>

        {/* Products Grid – Card Layout like the image */}
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredProducts.length === 0 ? (
            <div className="col-span-full text-center py-12" style={{ color: MUTED_GRAY }}>
              <Package className="mx-auto h-12 w-12 mb-2" style={{ color: MUTED_GRAY }} />
              No products found in this category.
            </div>
          ) : (
            filteredProducts.map(product => (
              <motion.div
                key={product.id}
                variants={cardHover}
                initial="rest"
                whileHover="hover"
                animate="rest"
                className="bg-white rounded-2xl border shadow-sm overflow-hidden"
                style={{ borderColor: CREAM }}
              >
                {/* Image area */}
                <div className="aspect-square bg-cream-light relative overflow-hidden">
                  {product.image_url ? (
                    <img 
                      src={product.image_url.startsWith('http') ? product.image_url : `http://10.49.5.170:8000${product.image_url}`} 
                      alt={product.name} 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-16 h-16" style={{ color: MUTED_GRAY, opacity: 0.5 }} />
                    </div>
                  )}
                  <div className="absolute top-3 right-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      product.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {product.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                {/* Content - Like the image layout */}
                <div className="p-5">
                  <div className="mb-3">
                    <h3 className="text-xl font-semibold" style={{ color: SAGE }}>{product.name}</h3>
                    <p className="text-2xl font-bold mt-1" style={{ color: SAGE }}>₱{parseFloat(product.base_price).toLocaleString()}</p>
                  </div>
                  {product.description && (
                    <p className="text-sm mt-2 line-clamp-2" style={{ color: MUTED_GRAY }}>{product.description}</p>
                  )}
                  
                  {/* Size options - if available */}
                  {product.has_size_options && (
                    <div className="mt-4">
                      <p className="text-xs font-medium mb-2" style={{ color: MUTED_GRAY }}>Size</p>
                      <div className="flex gap-2">
                        <span className="text-xs px-3 py-1 rounded-full border" style={{ borderColor: CREAM, color: SAGE }}>Small</span>
                        <span className="text-xs px-3 py-1 rounded-full border" style={{ borderColor: CREAM, color: MUTED_GRAY }}>Large</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Stock info */}
                  <div className="flex items-center justify-between mt-4 pt-3 border-t" style={{ borderColor: CREAM }}>
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4" style={{ color: MUTED_GRAY }} />
                      <span className={`text-xs ${product.stock_quantity <= product.min_stock_level ? 'text-red-600' : ''}`} style={{ color: MUTED_GRAY }}>
                        {product.stock_quantity} in stock
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEditProduct(product)}
                        className="p-1.5 rounded-lg transition-colors hover:bg-sage/10"
                        style={{ color: SAGE }}
                        title="Edit product"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => deleteProduct(product.id)}
                        className="p-1.5 rounded-lg transition-colors hover:bg-red-50"
                        style={{ color: '#EF4444' }}
                        title="Delete product"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </motion.div>
      </div>

      {/* ------ Category Modal (unchanged) ------ */}
      <AnimatePresence>
        {showCatModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <motion.div
              variants={modalAnimation}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-white rounded-2xl w-full max-w-md shadow-xl"
            >
              <div className="flex justify-between items-center p-5 border-b" style={{ borderColor: CREAM }}>
                <h3 className="text-lg font-semibold" style={{ color: SAGE }}>{catEditMode ? 'Edit Category' : 'Add Category'}</h3>
                <button onClick={() => setShowCatModal(false)} className="p-1.5 rounded-lg hover:bg-cream" style={{ color: MUTED_GRAY }}><X size={20} /></button>
              </div>
              <form onSubmit={handleCatSubmit} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: SAGE }}>Name *</label>
                  <input type="text" value={catForm.name} onChange={e => setCatForm({...catForm, name: e.target.value})} required className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-sage/20" style={{ borderColor: CREAM, color: SAGE }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: SAGE }}>Description</label>
                  <textarea value={catForm.description} onChange={e => setCatForm({...catForm, description: e.target.value})} rows={2} className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-sage/20" style={{ borderColor: CREAM, color: SAGE }} />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="catActive" checked={catForm.is_active} onChange={e => setCatForm({...catForm, is_active: e.target.checked})} className="w-4 h-4 rounded" />
                  <label htmlFor="catActive" className="text-sm" style={{ color: SAGE }}>Active</label>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowCatModal(false)} className="px-4 py-2 rounded-xl border text-sm transition-colors" style={{ borderColor: CREAM, color: MUTED_GRAY }}>Cancel</button>
                  <button type="submit" disabled={catSubmitting} className="px-4 py-2 rounded-xl text-white text-sm disabled:opacity-50 transition-colors" style={{ background: SAGE }}>
                    {catSubmitting ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ------ Product Modal (unchanged) ------ */}
      <AnimatePresence>
        {showProdModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <motion.div
              variants={modalAnimation}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl"
            >
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center" style={{ borderColor: CREAM }}>
                <h3 className="text-xl font-bold" style={{ color: SAGE }}>{editMode ? 'Edit Product' : 'Add New Product'}</h3>
                <button onClick={() => setShowProdModal(false)} className="p-1.5 rounded-lg hover:bg-cream" style={{ color: MUTED_GRAY }}><X size={20} /></button>
              </div>
              <form onSubmit={handleProdSubmit} className="p-6 space-y-5">
                {prodFormError && <div className="p-3 rounded-lg text-sm" style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FEE2E2' }}>{prodFormError}</div>}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium mb-1" style={{ color: SAGE }}>Category *</label>
                    <select name="category_id" value={prodForm.category_id} onChange={handleProdInputChange} required className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-sage/20" style={{ borderColor: CREAM, color: SAGE }}>
                      <option value="">Select category</option>
                      {categories.filter(c => c.is_active).map(cat => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium mb-1" style={{ color: SAGE }}>Product Name *</label>
                    <input type="text" name="name" value={prodForm.name} onChange={handleProdInputChange} required className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-sage/20" style={{ borderColor: CREAM, color: SAGE }} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium mb-1" style={{ color: SAGE }}>Description</label>
                    <textarea name="description" value={prodForm.description} onChange={handleProdInputChange} rows={2} className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-sage/20" style={{ borderColor: CREAM, color: SAGE }} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: SAGE }}>Base Price *</label>
                    <input type="number" step="0.01" name="base_price" value={prodForm.base_price} onChange={handleProdInputChange} required className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-sage/20" style={{ borderColor: CREAM, color: SAGE }} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: SAGE }}>Stock Quantity</label>
                    <input type="number" name="stock_quantity" value={prodForm.stock_quantity} onChange={handleProdInputChange} className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-sage/20" style={{ borderColor: CREAM, color: SAGE }} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: SAGE }}>SKU (optional)</label>
                    <input type="text" name="sku" value={prodForm.sku} onChange={handleProdInputChange} className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-sage/20" style={{ borderColor: CREAM, color: SAGE }} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: SAGE }}>Expiration Date</label>
                    <input type="date" name="expiration_date" value={prodForm.expiration_date} onChange={handleProdInputChange} className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-sage/20" style={{ borderColor: CREAM, color: SAGE }} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium mb-1" style={{ color: SAGE }}>Product Image {!editMode && '*'}</label>
                    <input type="file" name="image" accept="image/*" onChange={handleProdInputChange} required={!editMode} className="w-full mt-1 text-sm" />
                  </div>
                  <div className="flex items-center gap-3 col-span-2">
                    <label className="flex items-center gap-2 text-sm" style={{ color: SAGE }}><input type="checkbox" name="is_active" checked={prodForm.is_active} onChange={handleProdInputChange} className="rounded" /> Active</label>
                    <label className="flex items-center gap-2 text-sm" style={{ color: SAGE }}><input type="checkbox" name="track_stock" checked={prodForm.track_stock} onChange={handleProdInputChange} className="rounded" /> Track Stock</label>
                    <label className="flex items-center gap-2 text-sm" style={{ color: SAGE }}><input type="checkbox" name="has_size_options" checked={prodForm.has_size_options} onChange={handleProdInputChange} className="rounded" /> Has Sizes</label>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: CREAM }}>
                  <button type="button" onClick={() => setShowProdModal(false)} className="px-4 py-2 rounded-xl border text-sm transition-colors" style={{ borderColor: CREAM, color: MUTED_GRAY }}>Cancel</button>
                  <button type="submit" disabled={prodSubmitting} className="px-4 py-2 rounded-xl text-white text-sm disabled:opacity-50 flex items-center gap-2 transition-colors" style={{ background: SAGE }}>
                    {prodSubmitting && <Loader size={16} className="animate-spin" />}
                    {prodSubmitting ? (editMode ? 'Updating...' : 'Creating...') : (editMode ? 'Update Product' : 'Create Product')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: none; }
        }
      `}</style>
    </div>
  );
}