import React, { useState, useEffect } from 'react';
import { Users as UsersIcon, Loader, AlertCircle, CheckCircle, XCircle, Plus, X, Shield, User, Edit2 } from 'lucide-react';
import axios from '/api/axios';

export default function Users() {
  const [userList, setUserList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
    expires_at: '2099-12-31'
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    fetchAllUsers();
  }, []);

  const fetchAllUsers = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/admin/users');
      setUserList(response.data.users || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching users:', err);
      if (err.response?.status === 401) {
        setError('Unauthorized. Please login again.');
      } else if (err.response?.status === 403) {
        setError('Access denied. Admin privileges required.');
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to load users');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }));
    }
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
      expires_at: '2099-12-31'
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
      expires_at: user.expires_at || '2099-12-31'
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

    try {
      if (editMode && editingUser) {
        // Update existing user
        await axios.put(`/admin/users/${editingUser.id}`, formData);
        setFormSuccess('User updated successfully!');
      } else {
        // Create new user
        await axios.post('/admin/users', formData);
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
        <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
          <Shield size={12} /> Admin
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
        <User size={12} /> Staff
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader className="animate-spin text-green-600" size={36} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 flex items-center gap-2">
        <AlertCircle size={20} />
        <span>Error loading users: {error}</span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
          <p className="text-gray-600 text-sm">View and manage all system users (Admins & Staff)</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus size={18} />
          <span>Add New User</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {userList.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    <UsersIcon className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                    No users found.
                  </td>
                </tr>
              ) : (
                userList.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">#{user.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {user.first_name} {user.last_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.phone}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getRoleBadge(user.role)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => openEditModal(user)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit user"
                      >
                        <Edit2 size={18} />
                      </button>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">
                {editMode ? 'Edit User' : 'Add New User'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg transition">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{formError}</div>}
              {formSuccess && <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm">{formSuccess}</div>}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                  <select name="role" value={formData.role} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                  </select>
                  {fieldErrors.role && <p className="text-red-500 text-xs mt-1">{fieldErrors.role[0]}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                  <input type="text" name="first_name" value={formData.first_name} onChange={handleInputChange} required className={`w-full px-3 py-2 border rounded-lg ${fieldErrors.first_name ? 'border-red-500' : 'border-gray-300'}`} />
                  {fieldErrors.first_name && <p className="text-red-500 text-xs mt-1">{fieldErrors.first_name[0]}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                  <input type="text" name="last_name" value={formData.last_name} onChange={handleInputChange} required className={`w-full px-3 py-2 border rounded-lg ${fieldErrors.last_name ? 'border-red-500' : 'border-gray-300'}`} />
                  {fieldErrors.last_name && <p className="text-red-500 text-xs mt-1">{fieldErrors.last_name[0]}</p>}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input type="email" name="email" value={formData.email} onChange={handleInputChange} required className={`w-full px-3 py-2 border rounded-lg ${fieldErrors.email ? 'border-red-500' : 'border-gray-300'}`} />
                  {fieldErrors.email && <p className="text-red-500 text-xs mt-1">{fieldErrors.email[0]}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password {!editMode && '*'}</label>
                  <input type="password" name="password" value={formData.password} onChange={handleInputChange} required={!editMode} className={`w-full px-3 py-2 border rounded-lg ${fieldErrors.password ? 'border-red-500' : 'border-gray-300'}`} />
                  {fieldErrors.password && <p className="text-red-500 text-xs mt-1">{fieldErrors.password[0]}</p>}
                  {editMode && <p className="text-xs text-gray-500 mt-1">Leave blank to keep current password</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password {!editMode && '*'}</label>
                  <input type="password" name="password_confirmation" value={formData.password_confirmation} onChange={handleInputChange} required={!editMode} className={`w-full px-3 py-2 border rounded-lg ${fieldErrors.password_confirmation ? 'border-red-500' : 'border-gray-300'}`} />
                  {fieldErrors.password_confirmation && <p className="text-red-500 text-xs mt-1">{fieldErrors.password_confirmation[0]}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                  <input type="text" name="phone" value={formData.phone} onChange={handleInputChange} required className={`w-full px-3 py-2 border rounded-lg ${fieldErrors.phone ? 'border-red-500' : 'border-gray-300'}`} />
                  {fieldErrors.phone && <p className="text-red-500 text-xs mt-1">{fieldErrors.phone[0]}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Birth Date *</label>
                  <input type="date" name="birth_date" value={formData.birth_date} onChange={handleInputChange} required className={`w-full px-3 py-2 border rounded-lg ${fieldErrors.birth_date ? 'border-red-500' : 'border-gray-300'}`} />
                  {fieldErrors.birth_date && <p className="text-red-500 text-xs mt-1">{fieldErrors.birth_date[0]}</p>}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                  <textarea name="address" value={formData.address} onChange={handleInputChange} required rows="2" className={`w-full px-3 py-2 border rounded-lg ${fieldErrors.address ? 'border-red-500' : 'border-gray-300'}`} />
                  {fieldErrors.address && <p className="text-red-500 text-xs mt-1">{fieldErrors.address[0]}</p>}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2">
                  {submitting && <Loader size={16} className="animate-spin" />}
                  {submitting ? (editMode ? 'Updating...' : 'Adding...') : (editMode ? 'Update User' : 'Add User')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}