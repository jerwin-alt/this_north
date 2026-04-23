import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import api from '../../services/api';

export default function StaffOrders() {
  const [orders, setOrders] = useState([]);
  const [paymentModal, setPaymentModal] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [receipt, setReceipt] = useState(null);

  useEffect(() => { fetchOrders(); }, []);

  const fetchOrders = async () => {
    const res = await api.get('/orders');
    setOrders(res.data);
  };

  const updateStatus = async (id, status) => {
    await api.patch(`/orders/${id}/status`, { status });
    fetchOrders();
  };

  const processPayment = async () => {
    const payload = { order_id: paymentModal.id, payment_method: paymentMethod, amount_paid: parseFloat(amountPaid) };
    const res = await api.post('/payments', payload);
    setReceipt(res.data);
    setPaymentModal(null);
    fetchOrders();
  };

  const statusGroups = { pending: [], confirmed: [], preparing: [], ready: [] };
  orders.forEach(o => { if (statusGroups[o.status]) statusGroups[o.status].push(o); });

  return (
    <Layout title="Process Orders">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Object.entries(statusGroups).map(([status, items]) => (
          <div key={status} className="bg-cream-white rounded-xl p-4 border border-warm-gray/10">
            <h3 className="font-semibold capitalize mb-3">{status} ({items.length})</h3>
            <div className="space-y-2">
              {items.map(o => (
                <div key={o.id} className="bg-cream p-3 rounded-lg">
                  <p className="font-medium">{o.order_number}</p>
                  <p className="text-sm text-warm-gray">{o.customer_name}</p>
                  <p className="text-sm font-bold mt-1">₱{o.total_amount}</p>
                  {status === 'ready' && <button onClick={() => setPaymentModal(o)} className="mt-2 w-full bg-green text-white py-1 rounded text-sm">Payment</button>}
                  {status !== 'completed' && status !== 'cancelled' && <button onClick={() => updateStatus(o.id, getNextStatus(status))} className="mt-2 w-full bg-sage text-white py-1 rounded text-sm">Advance</button>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {paymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-cream-white rounded-xl p-6 w-full max-w-md">
            <h3 className="font-playfair font-bold text-lg mb-4">Payment for {paymentModal.order_number}</h3>
            <p className="text-2xl font-bold text-sage mb-4">Total: ₱{paymentModal.total_amount}</p>
            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full border rounded-lg p-2 mb-3"><option value="cash">Cash</option><option value="gcash">GCash</option></select>
            <input type="number" placeholder="Amount Paid" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} className="w-full border rounded-lg p-2 mb-4" />
            <div className="flex gap-3"><button onClick={() => setPaymentModal(null)} className="flex-1 border border-warm-gray rounded-lg py-2">Cancel</button><button onClick={processPayment} className="flex-1 bg-sage text-white rounded-lg py-2">Confirm Payment</button></div>
          </div>
        </div>
      )}

      {receipt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm text-center">
            <h2 className="font-playfair text-xl font-bold">🧾 Receipt</h2>
            <p>Order: {receipt.order.order_number}</p>
            <p>Amount Paid: ₱{receipt.amount_paid}</p>
            <p>Change: ₱{receipt.change_amount}</p>
            <button onClick={() => setReceipt(null)} className="mt-4 bg-sage text-white px-4 py-2 rounded-lg">Close</button>
          </div>
        </div>
      )}
    </Layout>
  );
}
function getNextStatus(status) {
  const flow = ['pending', 'confirmed', 'preparing', 'ready', 'completed'];
  const idx = flow.indexOf(status);
  return flow[idx + 1] || status;
}