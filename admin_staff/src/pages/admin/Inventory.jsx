import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import api from '../../services/api';
import { Plus, Edit, Check, X, AlertTriangle } from 'lucide-react';

export default function AdminInventory() {
  const [ingredients, setIngredients] = useState([]);
  const [damages, setDamages] = useState([]);
  const [tab, setTab] = useState('ingredients');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', unit: 'kg', current_stock: '', reorder_level: '', cost_per_unit: '' });

  useEffect(() => {
    fetchIngredients();
    fetchDamages();
  }, []);

  const fetchIngredients = async () => {
    const res = await api.get('/ingredients');
    setIngredients(res.data);
  };
  const fetchDamages = async () => {
    const res = await api.get('/damages');
    setDamages(res.data);
  };

  const saveIngredient = async () => {
    if (editing) {
      await api.put(`/ingredients/${editing.id}`, form);
    } else {
      await api.post('/ingredients', form);
    }
    fetchIngredients();
    setModalOpen(false);
    setEditing(null);
    setForm({ name: '', unit: 'kg', current_stock: '', reorder_level: '', cost_per_unit: '' });
  };

  const approveDamage = async (id) => {
    await api.patch(`/damages/${id}`, { status: 'approved' });
    fetchDamages();
    fetchIngredients(); // refresh stock after deduction
  };
  const rejectDamage = async (id) => {
    await api.patch(`/damages/${id}`, { status: 'rejected' });
    fetchDamages();
  };

  return (
    <Layout title="Inventory Management">
      <div className="flex gap-2 mb-6 border-b border-warm-gray/20">
        <button onClick={() => setTab('ingredients')} className={`px-4 py-2 font-medium ${tab === 'ingredients' ? 'border-b-2 border-sage text-sage' : 'text-warm-gray'}`}>📦 Ingredients</button>
        <button onClick={() => setTab('damages')} className={`px-4 py-2 font-medium ${tab === 'damages' ? 'border-b-2 border-sage text-sage' : 'text-warm-gray'}`}>⚠️ Lost & Damages</button>
      </div>

      {tab === 'ingredients' && (
        <>
          <div className="flex justify-end mb-4">
            <button onClick={() => { setEditing(null); setForm({ name: '', unit: 'kg', current_stock: '', reorder_level: '', cost_per_unit: '' }); setModalOpen(true); }} className="bg-sage text-white px-4 py-2 rounded-lg flex items-center gap-2"><Plus size={16} /> Add Ingredient</button>
          </div>
          <div className="bg-cream-white rounded-xl overflow-hidden border border-warm-gray/10">
            <table className="w-full">
              <thead className="bg-cream/50">
                <tr><th className="p-3 text-left">Name</th><th>Unit</th><th>Stock</th><th>Reorder Level</th><th>Cost/Unit</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {ingredients.map(ing => {
                  const isLow = ing.current_stock <= ing.reorder_level;
                  return (
                    <tr key={ing.id} className="border-t border-warm-gray/10">
                      <td className="p-3 font-medium">{ing.name}</td>
                      <td className="p-3">{ing.unit}</td>
                      <td className="p-3"><span className={isLow ? 'text-red font-semibold' : ''}>{ing.current_stock}</span> {isLow && <AlertTriangle size={14} className="inline ml-1 text-red" />}</td>
                      <td className="p-3">{ing.reorder_level}</td>
                      <td className="p-3">₱{ing.cost_per_unit}</td>
                      <td className="p-3"><button onClick={() => { setEditing(ing); setForm(ing); setModalOpen(true); }}><Edit size={16} className="text-sage" /></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'damages' && (
        <div className="bg-cream-white rounded-xl overflow-hidden border border-warm-gray/10">
          <table className="w-full">
            <thead className="bg-cream/50"><tr><th className="p-3">Item</th><th>Type</th><th>Quantity</th><th>Damage Type</th><th>Est. Cost</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {damages.map(d => (
                <tr key={d.id} className="border-t border-warm-gray/10">
                  <td className="p-3">{d.item_name}</td><td className="p-3">{d.item_type}</td><td className="p-3">{d.quantity} {d.unit}</td><td className="p-3">{d.damage_type}</td><td className="p-3">₱{d.estimated_cost}</td>
                  <td className="p-3"><span className={`text-xs px-2 py-1 rounded-full ${d.status === 'approved' ? 'bg-green/20 text-green' : d.status === 'rejected' ? 'bg-red/20 text-red' : 'bg-amber/20 text-amber'}`}>{d.status}</span></td>
                  <td className="p-3">{d.status === 'pending' && <div className="flex gap-2"><button onClick={() => approveDamage(d.id)} className="bg-green text-white px-2 py-1 rounded text-xs"><Check size={12} /></button><button onClick={() => rejectDamage(d.id)} className="bg-red text-white px-2 py-1 rounded text-xs"><X size={12} /></button></div>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-cream-white rounded-xl p-6 w-full max-w-md">
            <h3 className="font-playfair font-bold text-lg mb-4">{editing ? 'Edit Ingredient' : 'Add Ingredient'}</h3>
            <div className="space-y-3">
              <input type="text" placeholder="Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full border rounded-lg p-2" />
              <select value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} className="w-full border rounded-lg p-2"><option>kg</option><option>g</option><option>L</option><option>pcs</option></select>
              <input type="number" placeholder="Current Stock" value={form.current_stock} onChange={e => setForm({...form, current_stock: e.target.value})} className="w-full border rounded-lg p-2" />
              <input type="number" placeholder="Reorder Level" value={form.reorder_level} onChange={e => setForm({...form, reorder_level: e.target.value})} className="w-full border rounded-lg p-2" />
              <input type="number" placeholder="Cost per Unit" value={form.cost_per_unit} onChange={e => setForm({...form, cost_per_unit: e.target.value})} className="w-full border rounded-lg p-2" />
              <button onClick={saveIngredient} className="w-full bg-sage text-white py-2 rounded-lg">Save</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}