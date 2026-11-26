import React, { useState, useEffect } from 'react';
import axios from '../api/axios'; // ✅ CORRECT: Uses your configured axios with the Railway URL
import { Trash2, CheckCircle, XCircle, AlertCircle, Inbox } from 'lucide-react';

// ❌ REMOVED: const API_BASE_URL = 'http://localhost:8000'; 

const TABS = [
  { key: 'all', label: 'All Deleted Items' },
  { key: 'products', label: 'Products' },
  { key: 'categories', label: 'Categories' },
  { key: 'ingredients', label: 'Ingredients' },
  { key: 'customers', label: 'Customers' },
  { key: 'users', label: 'Users' },
  { key: 'orders', label: 'Orders' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'feedback', label: 'Feedback' },
  { key: 'lost_and_damages', label: 'Lost & Damages' },
];

export default function RecycleBinPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [records, setRecords] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [targetId, setTargetId] = useState(null);
  const [toast, setToast] = useState(null); 
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (type, message) => setToast({ type, message });

  useEffect(() => {
    fetchRecords();
  }, [activeTab]);

  const fetchRecords = async () => {
    setIsLoading(true);
    try {
      // ✅ CORRECT: No hardcoded URL. Global axios handles the token and baseURL.
      const res = await axios.get(`/admin/recycle-bin?tab=${activeTab}`);
      
      if (activeTab === 'all') {
         const allData = res.data.data;
         let flatData = [];
         Object.keys(allData).forEach(key => {
            flatData = [...flatData, ...allData[key].map(r => ({ ...r, category_key: key }))];
         });
         setRecords(flatData);
      } else {
         setRecords(res.data.data.data || res.data.data); 
      }
      setSelectedIds([]);
    } catch (err) {
      console.error("Recycle Bin Error:", err.response?.data || err.message);
      const detailedError = err.response?.data?.message 
        || err.response?.data?.error 
        || "Check your browser console (F12) for details.";
      showToast('error', `Failed: ${detailedError}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = (id) => {
    setTargetId(id);
    setConfirmAction('single');
    setShowConfirm(true);
  };

  const handleBulkRestore = () => {
    if (selectedIds.length === 0) return;
    setConfirmAction('bulk');
    setShowConfirm(true);
  };

  const confirmRestore = async () => {
    setShowConfirm(false);
    
    if (confirmAction === 'bulk' && selectedIds.length === 0) {
        showToast('error', 'Please select at least one record.');
        return;
    }

    setIsLoading(true);
    try {
      if (confirmAction === 'single' && targetId) {
        const categoryToSend = activeTab === 'all' 
            ? records.find(r => r.id === targetId)?.category_key 
            : activeTab;

        // ✅ CORRECT: Uses relative path
        await axios.post('/admin/recycle-bin/restore', {
          category: categoryToSend,
          id: targetId,
        });
        showToast('success', 'Record restored successfully');
      } else if (confirmAction === 'bulk') {
        
        let payload = {};

        if (activeTab === 'all') {
            const groupedIds = {};
            selectedIds.forEach(id => {
                const record = records.find(r => r.id === id);
                if (record && record.category_key) {
                    if (!groupedIds[record.category_key]) {
                        groupedIds[record.category_key] = [];
                    }
                    groupedIds[record.category_key].push(id);
                }
            });
            
            if (Object.keys(groupedIds).length === 0) {
                showToast('error', 'Could not identify record categories.');
                setIsLoading(false);
                return;
            }

            payload = { category: 'all', grouped_ids: groupedIds };
        } else {
            payload = { category: activeTab, ids: selectedIds };
        }

        // ✅ CORRECT: Uses relative path
        const res = await axios.post('/admin/recycle-bin/bulk-restore', payload);
        
        const { restored, failed } = res.data;
        
        if (Object.keys(failed).length > 0) {
          showToast('error', `${Object.keys(failed).length} record(s) could not be restored.`);
        }
        if (restored.length > 0) {
          showToast('success', `${restored.length} record(s) restored successfully.`);
        }
      }
      fetchRecords();
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Restore failed');
    } finally {
      setTargetId(null);
      setConfirmAction(null);
      setIsLoading(false);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === records.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(records.map(r => r.id));
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto relative font-sans">
      
      {/* ─── TOAST NOTIFICATION ─── */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-lg border text-sm font-medium transition-all animate-fadeUp ${
          toast.type === 'success' 
            ? 'bg-green-50 text-green-800 border-green-200' 
            : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-5 h-5 text-green-600" /> : <XCircle className="w-5 h-5 text-red-600" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* ─── HEADER ─── */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#4F5F52] flex items-center gap-3">
          <div className="p-2.5 bg-[#4F5F52]/10 rounded-xl">
            <Trash2 className="w-6 h-6 text-[#4F5F52]" />
          </div>
          Recycle Bin
        </h1>
        <p className="text-gray-500 mt-2 ml-14">
          Manage and restore deleted records from across the admin dashboard.
        </p>
      </div>

      {/* ─── TABS ─── */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 custom-scrollbar">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
              activeTab === tab.key
                ? 'bg-[#4F5F52] text-[#FFF3D9] shadow-md'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── BULK ACTIONS BAR ─── */}
      {selectedIds.length > 0 && (
        <div className="bg-[#FFF3D9] border border-[#e5c97b]/50 p-4 rounded-xl mb-6 flex items-center justify-between shadow-sm animate-fadeUp">
          <div className="flex items-center gap-3">
            <span className="bg-[#4F5F52] text-white px-2.5 py-1 rounded-md text-xs font-bold">
              {selectedIds.length}
            </span>
            <span className="text-[#4F5F52] font-medium text-sm">record(s) selected for restoration</span>
          </div>
          <button
            onClick={handleBulkRestore}
            disabled={isLoading}
            className="bg-[#4F5F52] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#3b473d] transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4" /> Restore Selected
          </button>
        </div>
      )}

      {/* ─── TABLE ─── */}
      <div className="overflow-hidden bg-white rounded-2xl shadow-sm border border-gray-200">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-[#FFF3D9]/40 border-b border-gray-200 text-[#4F5F52]">
              <th className="p-4 w-12 text-center border-b">
                <input
                  type="checkbox"
                  checked={selectedIds.length === records.length && records.length > 0}
                  onChange={toggleSelectAll}
                  className="cursor-pointer w-4 h-4 rounded border-gray-300 text-[#4F5F52] focus:ring-[#4F5F52]"
                />
              </th>
              <th className="p-4 font-bold text-sm tracking-wide border-b">RECORD NAME / INFO</th>
              <th className="p-4 font-bold text-sm tracking-wide border-b">CATEGORY</th>
              <th className="p-4 font-bold text-sm tracking-wide border-b">DELETED AT</th>
              <th className="p-4 font-bold text-sm tracking-wide text-center border-b">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && records.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-12 text-center text-gray-500">Loading records...</td>
              </tr>
            ) : records.length > 0 ? (
              records.map(record => (
                <tr key={`${record.category_key || activeTab}-${record.id}`} className="border-b border-gray-100 hover:bg-gray-50 transition-colors duration-150 group">
                  <td className="p-4 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(record.id)}
                      onChange={() => toggleSelect(record.id)}
                      className="cursor-pointer w-4 h-4 rounded border-gray-300 text-[#4F5F52] focus:ring-[#4F5F52]"
                    />
                  </td>
                  <td className="p-4 text-sm text-gray-800 font-semibold">
                    {record.name || 
                     (record.first_name && `${record.first_name} ${record.last_name}`) || 
                     record.order_number || 
                     record.damage_type || 
                     `Record #${record.id}`}
                  </td>
                  <td className="p-4 text-sm text-gray-500 capitalize">
                    <span className="bg-gray-100 px-2.5 py-1 rounded-md text-xs font-medium text-gray-600">
                      {record.category_key ? record.category_key.replace('_', ' ') : activeTab}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-gray-500">
                    {new Date(record.deleted_at).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short'
                    })}
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => handleRestore(record.id)}
                      className="text-[#4F5F52] bg-[#4F5F52]/10 hover:bg-[#4F5F52] hover:text-white transition-colors duration-200 text-xs font-bold px-4 py-2 rounded-lg"
                    >
                      Restore
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                {/* ─── FIXED CENTERED EMPTY STATE ─── */}
                <td colSpan={5} className="p-0">
                  <div className="flex flex-col items-center justify-center w-full min-h-[300px] text-center p-8">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                      <Inbox className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-700 mb-1">No deleted records found</h3>
                    <p className="text-gray-500 text-sm max-w-sm">
                      This category is currently empty. Any deleted records will appear here for you to restore.
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ─── CONFIRMATION MODAL ─── */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4 animate-fadeUp border border-gray-100">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-[#FFF3D9] rounded-full flex items-center justify-center mb-5">
                <AlertCircle className="w-8 h-8 text-[#e5c97b]" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {confirmAction === 'bulk' ? 'Bulk Restore Records' : 'Restore Record'}
              </h3>
              <p className="text-gray-500 mb-8">
                {confirmAction === 'bulk'
                  ? `Are you sure you want to restore ${selectedIds.length} selected record(s) back to their original pages?`
                  : 'Are you sure you want to restore this record? It will become visible again on its original page.'}
              </p>
              
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmRestore}
                  disabled={isLoading}
                  className="flex-1 px-4 py-3 bg-[#4F5F52] text-white rounded-xl hover:bg-[#3b473d] font-semibold transition disabled:opacity-50 shadow-md"
                >
                  {isLoading ? 'Restoring...' : 'Yes, Restore'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Animations & Scrollbar styling */}
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        .animate-fadeUp { animation: fadeUp 0.25s ease-out forwards; }
        
        .custom-scrollbar::-webkit-scrollbar { height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  );
}