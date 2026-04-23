import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import api from '../../services/api';
import { Download } from 'lucide-react';

export default function AdminReports() {
  const [reportType, setReportType] = useState('sales');
  const [salesData, setSalesData] = useState([]);
  const [inventoryData, setInventoryData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (reportType === 'sales') fetchSales();
    else fetchInventory();
  }, [reportType]);

  const fetchSales = async () => {
    setLoading(true);
    const res = await api.get('/reports/sales');
    setSalesData(res.data);
    setLoading(false);
  };
  const fetchInventory = async () => {
    setLoading(true);
    const res = await api.get('/reports/inventory');
    setInventoryData(res.data);
    setLoading(false);
  };

  return (
    <Layout title="Reports">
      <div className="flex gap-3 mb-6">
        <select value={reportType} onChange={e => setReportType(e.target.value)} className="border rounded-lg px-3 py-2">
          <option value="sales">Sales Report</option>
          <option value="inventory">Inventory Report</option>
        </select>
        <button className="border border-sage text-sage px-4 py-2 rounded-lg flex items-center gap-2"><Download size={16} /> Export</button>
      </div>

      {loading && <p>Loading...</p>}

      {reportType === 'sales' && !loading && (
        <div className="bg-cream-white rounded-xl p-6 border border-warm-gray/10">
          <h3 className="font-playfair font-bold text-lg mb-4">Sales Overview</h3>
          <div className="space-y-3">
            {salesData.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-24 text-warm-gray">{item.date}</span>
                <div className="flex-1 h-8 bg-cream rounded-full overflow-hidden">
                  <div className="h-full bg-sage rounded-full" style={{ width: `${(item.amount / Math.max(...salesData.map(d => d.amount))) * 100}%` }}></div>
                </div>
                <span className="w-24 text-right font-semibold">₱{item.amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="bg-cream p-4 rounded-lg"><p className="text-warm-gray text-sm">Total Revenue</p><p className="text-2xl font-bold text-sage">₱{salesData.reduce((sum, d) => sum + d.amount, 0).toLocaleString()}</p></div>
            <div className="bg-cream p-4 rounded-lg"><p className="text-warm-gray text-sm">Total Orders</p><p className="text-2xl font-bold text-sage">{salesData.reduce((sum, d) => sum + d.orders, 0)}</p></div>
          </div>
        </div>
      )}

      {reportType === 'inventory' && !loading && (
        <div className="bg-cream-white rounded-xl p-6 border border-warm-gray/10">
          <h3 className="font-playfair font-bold text-lg mb-4">Inventory Status</h3>
          <table className="w-full">
            <thead><tr className="border-b"><th className="p-2 text-left">Ingredient</th><th>Stock</th><th>Reorder Level</th><th>Status</th></tr></thead>
            <tbody>
              {inventoryData.map(ing => (
                <tr key={ing.id} className="border-b"><td className="p-2">{ing.name}</td><td>{ing.current_stock} {ing.unit}</td><td>{ing.reorder_level}</td><td>{ing.current_stock <= ing.reorder_level ? <span className="text-red">Low Stock</span> : <span className="text-green">OK</span>}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}