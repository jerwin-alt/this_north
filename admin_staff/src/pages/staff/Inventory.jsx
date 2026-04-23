import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import api from '../../services/api';
import { AlertTriangle } from 'lucide-react';

export default function StaffInventory() {
  const [ingredients, setIngredients] = useState([]);

  useEffect(() => { fetchIngredients(); }, []);

  const fetchIngredients = async () => {
    const res = await api.get('/ingredients');
    setIngredients(res.data);
  };

  return (
    <Layout title="Inventory (View Only)">
      <div className="bg-cream-white rounded-xl overflow-hidden border border-warm-gray/10">
        <table className="w-full">
          <thead className="bg-cream/50"><tr><th className="p-3">Ingredient</th><th>Stock</th><th>Unit</th><th>Status</th></tr></thead>
          <tbody>
            {ingredients.map(ing => (
              <tr key={ing.id} className="border-t">
                <td className="p-3 font-medium">{ing.name}</td>
                <td className="p-3">{ing.current_stock}</td>
                <td className="p-3">{ing.unit}</td>
                <td className="p-3">{ing.current_stock <= ing.reorder_level ? <span className="text-red flex items-center gap-1"><AlertTriangle size={14} /> Low Stock</span> : 'OK'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}