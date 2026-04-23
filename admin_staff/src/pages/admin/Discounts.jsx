import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import api from '../../services/api';
import { Plus, Edit, Power } from 'lucide-react';

export default function AdminDiscounts() {
  const [discounts, setDiscounts] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ discount_name: '', discount_type: 'percentage', discount_value: '', description: '', is_active: true, requires_verification: false });
  const [editing, setEditing] = useState(null);

  useEffect(() => { fetchDiscounts(); }, []);

  const fetchDiscounts = async () => {
    const res = await api.get('/discounts');
    setDiscounts(res.data);
  };

  const saveDiscount = async () => {
    if (editing) {
      await api.put(`/discounts/${editing.id}`, form);
    } else {
      await api.post('/discounts', form);
    }
    fetchDiscounts();
    setModalOpen(false);
    setEditing(null);
    setForm({ discount_name: '', discount_type: 'percentage', discount_value: '', description: '', is_active: true, requires_verification: false });
  };

  const toggleActive = async (discount) => {
    await api.patch(`/discounts/${discount.id}`, { is_active: !discount.is_active });
    fetchDiscounts();
  };

  return (
    <Layout title="Discounts & Loyalty">
      <div className="flex justify-end mb-6">
        <button onClick={() => { setEditing(null); setForm({ discount_name: '', discount_type: 'percentage', discount_value: '', description: '', is_active: true, requires_verification: false }); setModalOpen(true); }} className="bg-sage text-white px-4 py-2 rounded-lg flex items-center gap-2"><Plus size={16} /> Add Discount</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {discounts.map(d => (
          <div key={d.id} className="bg-cream-white rounded-xl p-4 shadow-sm border border-warm-gray/10">
            <div className="flex justify-between items-start">
              <div><h3 className="font-semibold text-sage-dark">{d.discount_name}</h3><p className="text-warm-gray text-xs">{d.discount_type === 'percentage' ? `${d.discount_value}% off` : d.discount_type}</p></div>
              <span className={`text-xs px-2 py-1 rounded-full ${d.is_active ? 'bg-green/20 text-green' : 'bg-red/20 text-red'}`}>{d.is_active ? 'Active' : 'Inactive'}</span>
            </div>
            <p className="text-sm mt-2">{d.description}</p>
            {d.requires_verification && <span className="inline-block mt-2 text-xs bg-amber/20 text-amber px-2 py-0.5 rounded">Requires verification</span>}
            <div className="flex gap-2 mt-4">
              <button onClick={() => { setEditing(d); setForm(d); setModalOpen(true); }} className="flex-1 bg-sage/10 text-sage py-1.5 rounded-lg flex items-center justify-center gap-1"><Edit size={14} /> Edit</button>
              <button onClick={() => toggleActive(d)} className="flex-1 border border-warm-gray/30 py-1.5 rounded-lg flex items-center justify-center gap-1"><Power size={14} /> {d.is_active ? 'Disable' : 'Enable'}</button>
            </div>
          </div>
        ))}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-cream-white rounded-xl p-6 w-full max-w-md">
            <h3 className="font-playfair font-bold text-lg mb-4">{editing ? 'Edit Discount' : 'Add Discount'}</h3>
            <div className="space-y-3">
              <input type="text" placeholder="Discount Name" value={form.discount_name} onChange={e => setForm({...form, discount_name: e.target.value})} className="w-full border rounded-lg p-2" />
              <select value={form.discount_type} onChange={e => setForm({...form, discount_type: e.target.value})} className="w-full border rounded-lg p-2"><option value="percentage">Percentage</option><option value="free_product">Free Product</option><option value="buy 1 take 1">Buy 1 Take 1</option></select>
              {form.discount_type === 'percentage' && <input type="number" placeholder="Discount Value (%)" value={form.discount_value} onChange={e => setForm({...form, discount_value: e.target.value})} className="w-full border rounded-lg p-2" />}
              <textarea placeholder="Description" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full border rounded-lg p-2" rows="2" />
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.requires_verification} onChange={e => setForm({...form, requires_verification: e.target.checked})} /> Requires Verification</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})} /> Active</label>
              <button onClick={saveDiscount} className="w-full bg-sage text-white py-2 rounded-lg">Save</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}