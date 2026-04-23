import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import api from '../../services/api';
import { Search, Plus, Edit, Power, X } from 'lucide-react';

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: '',
    category_id: '',
    base_price: '',
    stock_quantity: '',
    min_stock_level: 5,
    is_active: true,
    description: '',
  });

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    const res = await api.get('/products');
    setProducts(res.data);
  };

  const fetchCategories = async () => {
    const res = await api.get('/categories');
    setCategories(res.data);
  };

  const handleSave = async () => {
    if (editing) {
      await api.put(`/products/${editing.id}`, form);
    } else {
      await api.post('/products', form);
    }
    fetchProducts();
    setModalOpen(false);
    resetForm();
  };

  const toggleActive = async (product) => {
    await api.patch(`/products/${product.id}`, { is_active: !product.is_active });
    fetchProducts();
  };

  const resetForm = () => {
    setEditing(null);
    setForm({ name: '', category_id: '', base_price: '', stock_quantity: '', min_stock_level: 5, is_active: true, description: '' });
  };

  const openEdit = (product) => {
    setEditing(product);
    setForm({
      name: product.name,
      category_id: product.category_id,
      base_price: product.base_price,
      stock_quantity: product.stock_quantity,
      min_stock_level: product.min_stock_level,
      is_active: product.is_active,
      description: product.description || '',
    });
    setModalOpen(true);
  };

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <Layout title="Product Management">
      <div className="flex justify-between items-center mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-gray" size={16} />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 border border-warm-gray/30 rounded-lg w-64"
          />
        </div>
        <button onClick={() => { resetForm(); setModalOpen(true); }} className="bg-sage text-white px-4 py-2 rounded-lg flex items-center gap-2">
          <Plus size={16} /> Add Product
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(product => (
          <div key={product.id} className="bg-cream-white rounded-xl overflow-hidden shadow-sm border border-warm-gray/10">
            <div className="h-32 bg-cream flex items-center justify-center text-4xl">
              {product.image_url ? <img src={product.image_url} className="h-full w-full object-cover" alt={product.name} /> : '🍰'}
            </div>
            <div className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-sage-dark">{product.name}</h3>
                  <p className="text-warm-gray text-xs">{categories.find(c => c.id === product.category_id)?.name || 'Uncategorized'}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${product.is_active ? 'bg-green/20 text-green' : 'bg-red/20 text-red'}`}>
                  {product.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="mt-3 flex justify-between items-center">
                <span className="text-xl font-bold text-sage">₱{product.base_price}</span>
                <span className="text-sm text-warm-gray">Stock: {product.stock_quantity}</span>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => openEdit(product)} className="flex-1 bg-sage/10 text-sage py-1.5 rounded-lg flex items-center justify-center gap-1"><Edit size={14} /> Edit</button>
                <button onClick={() => toggleActive(product)} className="flex-1 border border-warm-gray/30 py-1.5 rounded-lg flex items-center justify-center gap-1"><Power size={14} /> {product.is_active ? 'Deactivate' : 'Activate'}</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-cream-white rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-playfair font-bold text-lg">{editing ? 'Edit Product' : 'Add Product'}</h3>
              <button onClick={() => setModalOpen(false)}><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <input type="text" placeholder="Product Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full border rounded-lg p-2" />
              <select value={form.category_id} onChange={e => setForm({...form, category_id: e.target.value})} className="w-full border rounded-lg p-2">
                <option value="">Select Category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input type="number" placeholder="Base Price" value={form.base_price} onChange={e => setForm({...form, base_price: e.target.value})} className="w-full border rounded-lg p-2" />
              <input type="number" placeholder="Stock Quantity" value={form.stock_quantity} onChange={e => setForm({...form, stock_quantity: e.target.value})} className="w-full border rounded-lg p-2" />
              <input type="number" placeholder="Min Stock Level" value={form.min_stock_level} onChange={e => setForm({...form, min_stock_level: e.target.value})} className="w-full border rounded-lg p-2" />
              <textarea placeholder="Description" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full border rounded-lg p-2" rows="2" />
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})} /> Active</label>
              <button onClick={handleSave} className="w-full bg-sage text-white py-2 rounded-lg">Save Product</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}