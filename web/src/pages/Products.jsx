import React, { useState, useEffect } from 'react';
import axios from '/api/axios';
import { 
  Plus, Edit2, Trash2, X, Image as ImageIcon, 
  Package, Tag, DollarSign, Layers, AlertCircle,
  Loader, CheckCircle, XCircle
} from 'lucide-react';

export default function Products() {
  // ---------- State ----------
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
  stock_quantity: '0',          // default 0
  is_ready_made: true,
  expiration_date: '',
  min_stock_level: '',
  sku: '',
  image: null,
});

// Product edit mode
const [editMode, setEditMode] = useState(false);
const [editingProduct, setEditingProduct] = useState(null);
const [prodFormError, setProdFormError] = useState('');

  // ---------- Fetch Data ----------
  const fetchCategories = async () => {
    try {
      const res = await axios.get('/categories');
      setCategories(res.data.categories || []);
    } catch (err) {
      console.error('Failed to fetch categories', err);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      // Assume backend has GET /api/menu or /api/admin/menu to list all products
      // If not, adjust URL accordingly.

    //   const res = await axios.get('/menu'); 

      // Inside fetchProducts function
        const res = await axios.get('/admin/menu');   // was '/menu'
      setProducts(res.data.products || res.data.menu || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching products:', err);
      if (err.response?.status === 401) setError('Unauthorized. Please login again.');
      else if (err.response?.status === 403) setError('Access denied. Admin privileges required.');
      else setError(err.response?.data?.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, []);

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
      console.error('Category save error', err);
      alert(err.response?.data?.message || 'Error saving category');
    } finally {
      setCatSubmitting(false);
    }
  };

  const deleteCategory = async (id) => {
    if (!window.confirm('Delete this category? Products under it will not be deleted but category will be removed.')) return;
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
    category_id: categories[0]?.id || '',
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
    image: null, // new image is optional on edit
  });
  setProdFormError('');
  setShowProdModal(true);
};

  const handleProdInputChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    if (type === 'file') {
      setProdForm(prev => ({ ...prev, image: files[0] }));
    } else if (type === 'checkbox') {
      setProdForm(prev => ({ ...prev, [name]: checked }));
    } else {
      setProdForm(prev => ({ ...prev, [name]: value }));
    }
  };

const handleProdSubmit = async (e) => {
  e.preventDefault();
  setProdSubmitting(true);
  setProdFormError('');

  // Basic validation
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

  // Image is required only when creating a new product
  if (!editMode && !prodForm.image) {
    setProdFormError('Product image is required');
    setProdSubmitting(false);
    return;
  }

  // Client‑side image validation (only if a file is selected)
  if (prodForm.image) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml'];
    if (!allowedTypes.includes(prodForm.image.type)) {
      setProdFormError('Please select a valid image file (JPEG, PNG, GIF, WebP, BMP, SVG)');
      setProdSubmitting(false);
      return;
    }
    if (prodForm.image.size > 10 * 1024 * 1024) {
      setProdFormError('Image must be smaller than 10MB');
      setProdSubmitting(false);
      return;
    }
  }

  const formData = new FormData();

  // Required fields
  formData.append('category_id', prodForm.category_id);
  formData.append('name', prodForm.name);
  if (prodForm.description) formData.append('description', prodForm.description);
  formData.append('base_price', prodForm.base_price);
  formData.append('menu_type', prodForm.menu_type);

  // Booleans → '1' or '0'
  formData.append('has_size_options', prodForm.has_size_options ? '1' : '0');
  formData.append('is_active', prodForm.is_active ? '1' : '0');
  formData.append('track_stock', prodForm.track_stock ? '1' : '0');
  formData.append('is_ready_made', prodForm.is_ready_made ? '1' : '0');

  // Stock quantity
  const stockQty = prodForm.stock_quantity === '' ? 0 : prodForm.stock_quantity;
  formData.append('stock_quantity', stockQty);

  // min_stock_level – default to 0 if empty
  const minStock = prodForm.min_stock_level === '' ? 0 : (prodForm.min_stock_level || 0);
  formData.append('min_stock_level', minStock);

  // Expiration date (optional)
  if (prodForm.expiration_date) {
    formData.append('expiration_date', prodForm.expiration_date);
  }

  // SKU (optional)
  if (prodForm.sku) {
    formData.append('sku', prodForm.sku);
  }

  // Image – only if a new file is selected (on edit, it's optional)
  if (prodForm.image) {
    formData.append('image', prodForm.image);
  }

  try {
    if (editMode && editingProduct) {
      // Update existing product – use POST with _method=PUT
      formData.append('_method', 'PUT');
      await axios.post(`/admin/menu/${editingProduct.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    } else {
      // Create new product
      await axios.post('/admin/menu', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    }
    await fetchProducts();
    setShowProdModal(false);
    // Reset form
    setProdForm({
      category_id: categories[0]?.id || '',
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
    setEditMode(false);
    setEditingProduct(null);
  } catch (err) {
    console.error('Product save error', err.response?.data);
    if (err.response?.data?.errors) {
      const firstError = Object.values(err.response.data.errors)[0]?.[0];
      setProdFormError(firstError || 'Validation failed');
    } else if (err.response?.data?.message) {
      setProdFormError(err.response.data.message);
    } else {
      setProdFormError(editMode ? 'Failed to update product' : 'Failed to create product');
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

  // Helper to get category name
  const getCategoryName = (catId) => {
    const cat = categories.find(c => c.id === catId);
    return cat ? cat.name : '—';
  };

  // ---------- Render ----------
  return (
    <div className="bg-[#F2EDE4] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#4F5F52]">Product Management</h1>
            <p className="text-[#A6A29A] text-sm">Manage categories and menu items</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={openAddCategory}
              className="flex items-center gap-2 px-4 py-2 bg-[#A6A29A] text-white rounded-lg hover:bg-[#8f8b82] transition-colors"
            >
              <Plus size={18} /> Add Category
            </button>
            <button
              onClick={openAddProduct}
              className="flex items-center gap-2 px-4 py-2 bg-[#4F5F52] text-white rounded-lg hover:bg-[#3e4c42] transition-colors"
            >
              <Plus size={18} /> Add Product
            </button>
          </div>
        </div>

        {/* Categories Section */}
        <div className="mb-10 bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-[#FFF3D9]">
            <h2 className="text-lg font-semibold text-[#4F5F52] flex items-center gap-2">
              <Layers size={20} /> Product Categories
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#A6A29A] uppercase">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#A6A29A] uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#A6A29A] uppercase">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#A6A29A] uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-[#A6A29A] uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {categories.length === 0 ? (
                  <tr><td colSpan="5" className="text-center py-8 text-[#A6A29A]">No categories yet</td></tr>
                ) : (
                  categories.map(cat => (
                    <tr key={cat.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 text-sm text-gray-500">#{cat.id}</td>
                      <td className="px-6 py-3 font-medium text-gray-800">{cat.name}</td>
                      <td className="px-6 py-3 text-sm text-gray-500">{cat.description || '—'}</td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${cat.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {cat.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                        <td className="px-6 py-4 text-right">
                        <button onClick={() => openEditCategory(cat)} className="p-1 text-blue-600 hover:bg-blue-50 rounded mr-2">
                            <Edit2 size={16} />
                        </button>
                        <button onClick={() => deleteCategory(cat.id)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                            <Trash2 size={16} />
                        </button>
                        </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Products Section */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-[#FFF3D9]">
            <h2 className="text-lg font-semibold text-[#4F5F52]">All Product List</h2>
          </div>
          {loading ? (
            <div className="flex justify-center items-center h-64"><Loader className="animate-spin text-[#4F5F52]" size={36} /></div>
          ) : error ? (
            <div className="p-6 text-red-600 flex items-center gap-2"><AlertCircle size={20} />{error}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#A6A29A] uppercase">Image</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#A6A29A] uppercase">Product Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#A6A29A] uppercase">Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#A6A29A] uppercase">Stock</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#A6A29A] uppercase">Category</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-[#A6A29A] uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {products.length === 0 ? (
                    <tr><td colSpan="6" className="text-center py-12 text-[#A6A29A]">No products available</td></tr>
                  ) : (
                    products.map(prod => (
                      <tr key={prod.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          {prod.image_url ? (
                            <img src={prod.image_url} alt={prod.name} className="w-12 h-12 object-cover rounded-lg border border-gray-200" />
                          ) : (
                            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center"><ImageIcon size={20} className="text-gray-400" /></div>
                          )}
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-800">{prod.name}</td>
                        <td className="px-6 py-4 text-gray-700">₱{parseFloat(prod.base_price).toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <span className={prod.stock_quantity > 0 ? 'text-green-700' : 'text-red-500'}>
                            {prod.stock_quantity} left
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{getCategoryName(prod.category_id)}</td>
                        <td className="px-6 py-4 text-right">
                        <button onClick={() => openEditProduct(prod)} className="p-1 text-blue-600 hover:bg-blue-50 rounded mr-2">
                            <Edit2 size={16} />
                        </button>
                        <button onClick={() => deleteProduct(prod.id)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                            <Trash2 size={16} />
                        </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ------ Category Modal ------ */}
      {showCatModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex justify-between items-center p-5 border-b">
              <h3 className="text-lg font-semibold text-[#4F5F52]">{catEditMode ? 'Edit Category' : 'Add Category'}</h3>
              <button onClick={() => setShowCatModal(false)} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
            </div>
            <form onSubmit={handleCatSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name *</label>
                <input type="text" value={catForm.name} onChange={e => setCatForm({...catForm, name: e.target.value})} required className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea value={catForm.description} onChange={e => setCatForm({...catForm, description: e.target.value})} rows={2} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="catActive" checked={catForm.is_active} onChange={e => setCatForm({...catForm, is_active: e.target.checked})} className="w-4 h-4" />
                <label htmlFor="catActive" className="text-sm text-gray-700">Active</label>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowCatModal(false)} className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg">Cancel</button>
                <button type="submit" disabled={catSubmitting} className="px-4 py-2 bg-[#4F5F52] text-white rounded-lg disabled:opacity-50">
                  {catSubmitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------ Product Modal ------ */}
      {showProdModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-[#4F5F52]">
                {editMode ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button onClick={() => setShowProdModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleProdSubmit} className="p-6 space-y-5">
              {prodFormError && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{prodFormError}</div>}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Category *</label>
                  <select name="category_id" value={prodForm.category_id} onChange={handleProdInputChange} required className="w-full mt-1 px-3 py-2 border rounded-lg">
                    <option value="">Select category</option>
                    {categories.filter(c => c.is_active).map(cat => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Product Name *</label>
                  <input type="text" name="name" value={prodForm.name} onChange={handleProdInputChange} required className="w-full mt-1 px-3 py-2 border rounded-lg" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea name="description" value={prodForm.description} onChange={handleProdInputChange} rows={2} className="w-full mt-1 px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Base Price *</label>
                  <input type="number" step="0.01" name="base_price" value={prodForm.base_price} onChange={handleProdInputChange} required className="w-full mt-1 px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Stock Quantity</label>
                  <input type="number" name="stock_quantity" value={prodForm.stock_quantity} onChange={handleProdInputChange} className="w-full mt-1 px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">SKU (optional)</label>
                  <input type="text" name="sku" value={prodForm.sku} onChange={handleProdInputChange} className="w-full mt-1 px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Expiration Date</label>
                  <input type="date" name="expiration_date" value={prodForm.expiration_date} onChange={handleProdInputChange} className="w-full mt-1 px-3 py-2 border rounded-lg" />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Product Image *</label>
                    <input type="file" name="image" accept="image/*" onChange={handleProdInputChange} required className="w-full mt-1" />
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_active" checked={prodForm.is_active} onChange={handleProdInputChange} /> Active</label>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="track_stock" checked={prodForm.track_stock} onChange={handleProdInputChange} /> Track Stock</label>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="has_size_options" checked={prodForm.has_size_options} onChange={handleProdInputChange} /> Has Sizes</label>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setShowProdModal(false)} className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg">Cancel</button>
                    <button type="submit" disabled={prodSubmitting} className="px-4 py-2 bg-[#4F5F52] text-white rounded-lg disabled:opacity-50">
                    {prodSubmitting ? <Loader size={16} className="animate-spin inline mr-1" /> : null}
                    {prodSubmitting ? (editMode ? 'Updating...' : 'Creating...') : (editMode ? 'Update Product' : 'Create Product')}
                    </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}