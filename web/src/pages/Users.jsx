import React, { useState, useEffect } from 'react';
import {
  Users as UsersIcon, Loader, AlertCircle, Plus, X, Shield, User, Edit2,
  Trash2, Eye, EyeOff
} from 'lucide-react';
import axios from '/api/axios';

// Color palette
const SAGE = '#4F5F52';
const CREAM = '#F2EDE4';
const MUTED_GRAY = '#A6A29A';

export default function Users() {
  const [userList, setUserList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showInactive, setShowInactive] = useState(true);

  // Modal state (add/edit)
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    role: 'staff',
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    password_confirmation: '',
    phone: '',
    birth_date: '',
    address: '',
    verification_type: 'senior_citizen',
    verification_status: 'pending',
    id_number: 'N/A',
    expires_at: '2099-12-31',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, user: null });

  // Fetch all users
  const fetchAllUsers = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/admin/users');
      setUserList(response.data.users || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching users:', err);
      if (err.response?.status === 401) setError('Unauthorized. Please login again.');
      else if (err.response?.status === 403) setError('Access denied. Admin privileges required.');
      else setError(err.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllUsers();
  }, []);

  // Toggle user active status
  const toggleUserStatus = async (id, currentStatus) => {
    try {
      await axios.patch(`/admin/users/${id}/toggle-status`, { is_active: !currentStatus });
      await fetchAllUsers();
    } catch (err) {
      console.error('Toggle status error:', err);
      alert('Failed to update user status');
    }
  };

  // Soft delete (deactivate) a user
  const softDeleteUser = async (user) => {
    try {
      await axios.delete(`/admin/users/${user.id}`);
      setDeleteConfirm({ show: false, user: null });
      await fetchAllUsers();
    } catch (err) {
      console.error('Delete error:', err);
      alert(err.response?.data?.message || 'Failed to delete user');
    }
  };

  // Filtering based on showInactive toggle
  const filteredUsers = showInactive ? userList : userList.filter(u => u.is_active);

  // --- Form handlers ---
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) setFieldErrors(prev => ({ ...prev, [name]: '' }));
  };

  const resetForm = () => {
    setFormData({
      role: 'staff',
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      password_confirmation: '',
      phone: '',
      birth_date: '',
      address: '',
      verification_type: 'senior_citizen',
      verification_status: 'pending',
      id_number: 'N/A',
      expires_at: '2099-12-31',
    });
    setFieldErrors({});
    setFormError(null);
    setFormSuccess(null);
  };

  const openAddModal = () => {
    resetForm();
    setEditMode(false);
    setEditingUser(null);
    setShowModal(true);
  };

  const openEditModal = (user) => {
    if (!user.is_active) return;
    setEditMode(true);
    setEditingUser(user);
    setFormData({
      role: user.role,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      password: '',
      password_confirmation: '',
      phone: user.phone,
      birth_date: user.birth_date,
      address: user.address,
      verification_type: user.verification_type || 'senior_citizen',
      verification_status: user.verification_status || 'pending',
      id_number: user.id_number || 'N/A',
      expires_at: user.expires_at || '2099-12-31',
    });
    setFieldErrors({});
    setFormError(null);
    setFormSuccess(null);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setFormSuccess(null);
    setFieldErrors({});

    const payload = {
      ...formData,
      role: editMode ? formData.role : 'staff',
    };

    try {
      if (editMode && editingUser) {
        await axios.put(`/admin/users/${editingUser.id}`, payload);
        setFormSuccess('User updated successfully!');
      } else {
        await axios.post('/admin/users', payload);
        setFormSuccess('User added successfully!');
      }
      resetForm();
      await fetchAllUsers();
      setTimeout(() => {
        setShowModal(false);
        setFormSuccess(null);
        setEditMode(false);
        setEditingUser(null);
      }, 1500);
    } catch (err) {
      console.error('Error saving user:', err);
      if (err.response?.status === 422 && err.response?.data?.errors) {
        setFieldErrors(err.response.data.errors);
        setFormError('Please correct the errors below.');
      } else if (err.response?.data?.message) {
        setFormError(err.response.data.message);
      } else {
        setFormError(editMode ? 'Failed to update user.' : 'Failed to add user.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleBadge = (role) => {
    if (role === 'admin') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: `${SAGE}20`, color: SAGE }}>
          <Shield size={12} className="mr-1" /> Admin
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: '#A6A29A20', color: '#A6A29A' }}>
        <User size={12} className="mr-1" /> Staff
      </span>
    );
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
      <div className="p-4 rounded-lg flex items-center gap-2" style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FEE2E2' }}>
        <AlertCircle size={20} />
        <span>Error loading users: {error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4 animate-fade-in-up">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowInactive(!showInactive)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-colors"
            style={{ borderColor: CREAM, color: SAGE, backgroundColor: showInactive ? CREAM : 'transparent' }}
            title={showInactive ? 'Hide inactive users' : 'Show inactive users'}
          >
            {showInactive ? <EyeOff size={16} /> : <Eye size={16} />}
            {showInactive ? 'Hide Inactive' : 'Show All'}
          </button>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm transition-colors"
          style={{ background: SAGE }}
          onMouseEnter={e => e.currentTarget.style.background = '#3e4c42'}
          onMouseLeave={e => e.currentTarget.style.background = SAGE}
        >
          <Plus size={18} /> Add Staff Account
        </button>
      </div>

      {/* Users Table Card */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden animate-fade-in-up" style={{ borderColor: CREAM }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead style={{ background: CREAM }}>
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: SAGE }}>User</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: SAGE }}>Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: SAGE }}>Role</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: SAGE }}>Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: SAGE }}>Joined</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: SAGE }}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: CREAM }}>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-12" style={{ color: MUTED_GRAY }}>
                    <UsersIcon className="mx-auto h-12 w-12 mb-2" style={{ color: MUTED_GRAY }} />
                    No users found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-[#F2EDE4] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: SAGE }}>
                          {user.first_name?.[0]}{user.last_name?.[0]}
                        </div>
                        <span className="font-medium" style={{ color: SAGE }}>{user.first_name} {user.last_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: MUTED_GRAY }}>{user.email}</td>
                    <td className="px-4 py-3">{getRoleBadge(user.role)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleUserStatus(user.id, user.is_active)}
                          className="relative inline-flex items-center cursor-pointer"
                        >
                          <span
                            className="w-10 h-5 rounded-full transition-colors duration-200"
                            style={{ backgroundColor: user.is_active ? SAGE : `${MUTED_GRAY}30` }}
                          />
                          <span
                            className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${user.is_active ? 'translate-x-5' : 'translate-x-0'}`}
                          />
                        </button>
                        <span className="text-xs" style={{ color: user.is_active ? SAGE : MUTED_GRAY }}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: MUTED_GRAY }}>
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(user)}
                          disabled={!user.is_active}
                          className={`p-1.5 rounded-lg transition-colors ${
                            user.is_active ? 'hover:bg-sage/10' : 'opacity-50 cursor-not-allowed'
                          }`}
                          style={{ color: SAGE }}
                          title={user.is_active ? "Edit user" : "Cannot edit deactivated user"}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => user.is_active && setDeleteConfirm({ show: true, user })}
                          disabled={!user.is_active}
                          className={`p-1.5 rounded-lg transition-colors ${
                            user.is_active ? 'hover:bg-red-50' : 'opacity-50 cursor-not-allowed'
                          }`}
                          style={{ color: '#EF4444' }}
                          title={user.is_active ? "Soft delete (deactivate)" : "User already deactivated"}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl animate-modal-in">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between" style={{ borderColor: CREAM }}>
              <h2 className="text-xl font-bold" style={{ color: SAGE }}>
                {editMode ? 'Edit User' : 'Add Staff Account'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-cream transition-colors" style={{ color: MUTED_GRAY }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg text-sm" style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FEE2E2' }}>
                  {formError}
                </div>
              )}
              {formSuccess && (
                <div className="p-3 rounded-lg text-sm" style={{ background: '#ECFDF5', color: '#059669', border: '1px solid #D1FAE5' }}>
                  {formSuccess}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {editMode && (
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium mb-1" style={{ color: SAGE }}>Role *</label>
                    <select
                      name="role"
                      value={formData.role}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2"
                      style={{ borderColor: CREAM, color: SAGE }}
                    >
                      <option value="staff">Staff</option>
                      <option value="admin">Admin</option>
                    </select>
                    {fieldErrors.role && <p className="text-red-500 text-xs mt-1">{fieldErrors.role[0]}</p>}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: SAGE }}>First Name *</label>
                  <input type="text" name="first_name" value={formData.first_name} onChange={handleInputChange} required className={`w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 ${fieldErrors.first_name ? 'border-red-500' : ''}`} style={{ borderColor: CREAM, color: SAGE }} />
                  {fieldErrors.first_name && <p className="text-red-500 text-xs mt-1">{fieldErrors.first_name[0]}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: SAGE }}>Last Name *</label>
                  <input type="text" name="last_name" value={formData.last_name} onChange={handleInputChange} required className={`w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 ${fieldErrors.last_name ? 'border-red-500' : ''}`} style={{ borderColor: CREAM, color: SAGE }} />
                  {fieldErrors.last_name && <p className="text-red-500 text-xs mt-1">{fieldErrors.last_name[0]}</p>}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium mb-1" style={{ color: SAGE }}>Email *</label>
                  <input type="email" name="email" value={formData.email} onChange={handleInputChange} required className={`w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 ${fieldErrors.email ? 'border-red-500' : ''}`} style={{ borderColor: CREAM, color: SAGE }} />
                  {fieldErrors.email && <p className="text-red-500 text-xs mt-1">{fieldErrors.email[0]}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: SAGE }}>Password {!editMode && '*'}</label>
                  <input type="password" name="password" value={formData.password} onChange={handleInputChange} required={!editMode} className={`w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 ${fieldErrors.password ? 'border-red-500' : ''}`} style={{ borderColor: CREAM, color: SAGE }} />
                  {fieldErrors.password && <p className="text-red-500 text-xs mt-1">{fieldErrors.password[0]}</p>}
                  {editMode && <p className="text-xs mt-1" style={{ color: MUTED_GRAY }}>Leave blank to keep current password</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: SAGE }}>Confirm Password {!editMode && '*'}</label>
                  <input type="password" name="password_confirmation" value={formData.password_confirmation} onChange={handleInputChange} required={!editMode} className={`w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 ${fieldErrors.password_confirmation ? 'border-red-500' : ''}`} style={{ borderColor: CREAM, color: SAGE }} />
                  {fieldErrors.password_confirmation && <p className="text-red-500 text-xs mt-1">{fieldErrors.password_confirmation[0]}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: SAGE }}>Phone *</label>
                  <input type="text" name="phone" value={formData.phone} onChange={handleInputChange} required className={`w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 ${fieldErrors.phone ? 'border-red-500' : ''}`} style={{ borderColor: CREAM, color: SAGE }} />
                  {fieldErrors.phone && <p className="text-red-500 text-xs mt-1">{fieldErrors.phone[0]}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: SAGE }}>Birth Date *</label>
                  <input type="date" name="birth_date" value={formData.birth_date} onChange={handleInputChange} required className={`w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 ${fieldErrors.birth_date ? 'border-red-500' : ''}`} style={{ borderColor: CREAM, color: SAGE }} />
                  {fieldErrors.birth_date && <p className="text-red-500 text-xs mt-1">{fieldErrors.birth_date[0]}</p>}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium mb-1" style={{ color: SAGE }}>Address *</label>
                  <textarea name="address" value={formData.address} onChange={handleInputChange} required rows="2" className={`w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 ${fieldErrors.address ? 'border-red-500' : ''}`} style={{ borderColor: CREAM, color: SAGE }} />
                  {fieldErrors.address && <p className="text-red-500 text-xs mt-1">{fieldErrors.address[0]}</p>}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: CREAM }}>
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl border text-sm transition-colors" style={{ borderColor: CREAM, color: MUTED_GRAY }}
                  onMouseEnter={e => e.currentTarget.style.background = CREAM}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="px-4 py-2 rounded-xl text-white text-sm flex items-center gap-2 disabled:opacity-50 transition-colors" style={{ background: SAGE }}
                  onMouseEnter={e => e.currentTarget.style.background = '#3e4c42'}
                  onMouseLeave={e => e.currentTarget.style.background = SAGE}>
                  {submitting && <Loader size={16} className="animate-spin" />}
                  {submitting ? (editMode ? 'Updating...' : 'Adding...') : (editMode ? 'Update User' : 'Add Staff')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl text-center animate-modal-in">
            <div className="flex justify-center mb-4">
              <Trash2 size={40} style={{ color: '#EF4444' }} />
            </div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: SAGE }}>Deactivate User?</h3>
            <p className="text-sm mb-4" style={{ color: MUTED_GRAY }}>
              This will set <strong>{deleteConfirm.user.first_name} {deleteConfirm.user.last_name}</strong> as inactive.
              The user will no longer be able to log in until reactivated.
            </p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setDeleteConfirm({ show: false, user: null })} className="px-4 py-2 rounded-xl border text-sm transition-colors" style={{ borderColor: CREAM, color: MUTED_GRAY }}>
                Cancel
              </button>
              <button onClick={() => softDeleteUser(deleteConfirm.user)} className="px-4 py-2 rounded-xl text-white text-sm transition-colors" style={{ background: '#EF4444' }}
                onMouseEnter={e => e.currentTarget.style.background = '#DC2626'}
                onMouseLeave={e => e.currentTarget.style.background = '#EF4444'}>
                Yes, deactivate
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: none; } }
        .animate-fade-in-up { animation: fadeInUp 0.4s ease forwards; }
        @keyframes modalIn { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: none; } }
        .animate-modal-in { animation: modalIn 0.2s ease; }
      `}</style>
    </div>
  );
}