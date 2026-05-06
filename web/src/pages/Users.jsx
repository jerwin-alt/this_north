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
const SOFT_WHITE = '#FFF3D9';

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
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '3px 10px', borderRadius: 999,
          fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.05em',
          background: `linear-gradient(135deg, ${SAGE}22, ${SAGE}10)`,
          color: SAGE,
          border: `1.5px solid ${SAGE}30`,
        }}>
          <Shield size={11} strokeWidth={2.2} /> Admin
        </span>
      );
    }
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '3px 10px', borderRadius: 999,
        fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.05em',
        background: 'rgba(166,162,154,0.12)',
        color: MUTED_GRAY,
        border: '1.5px solid rgba(166,162,154,0.25)',
      }}>
        <User size={11} strokeWidth={2.2} /> Staff
      </span>
    );
  };

  if (loading) {
    return (
      <div style={{ background: CREAM, minHeight: '100vh' }} className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader className="animate-spin" style={{ color: SAGE }} size={36} />
          <p style={{ color: MUTED_GRAY, fontSize: '0.85rem', letterSpacing: '0.05em' }}>Loading users…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-2xl m-6" style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FEE2E2' }}>
        <AlertCircle size={20} />
        <span style={{ fontSize: '0.875rem' }}>Error loading users: {error}</span>
      </div>
    );
  }

  return (
    <div style={{ padding: '36px 28px', background: CREAM, minHeight: '100vh' }}>
      <style>{`
        .grain-overlay {
          position: fixed; inset: 0; pointer-events: none; z-index: 0; opacity: 0.028;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
          background-repeat: repeat; background-size: 128px;
        }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
        .anim-up { animation: fadeInUp 0.4s cubic-bezier(0.25,0.46,0.45,0.94) forwards; }
        .anim-up-delay { animation: fadeInUp 0.4s 0.08s cubic-bezier(0.25,0.46,0.45,0.94) both; }
        @keyframes modalIn { from { opacity: 0; transform: scale(0.96) translateY(12px); } to { opacity: 1; transform: none; } }
        .anim-modal { animation: modalIn 0.25s cubic-bezier(0.25,0.46,0.45,0.94); }
        .divider-line { height: 1px; background: linear-gradient(90deg, transparent, rgba(79,95,82,0.15), transparent); }
        .table-row-hover { transition: background 0.15s ease; }
        .table-row-hover:hover { background: rgba(242,237,228,0.65) !important; }
        .action-btn { transition: all 0.18s ease; border-radius: 10px; }
        .action-btn:hover:not(:disabled) { transform: scale(1.12); }
        .primary-btn { position: relative; overflow: hidden; transition: all 0.22s cubic-bezier(0.4,0,0.2,1); }
        .primary-btn::before { content: ''; position: absolute; inset: 0; background: rgba(255,255,255,0.1); opacity: 0; transition: opacity 0.2s; }
        .primary-btn:hover::before { opacity: 1; }
        .primary-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(79,95,82,0.3); }
        .primary-btn:active { transform: translateY(0); }
        .sec-btn { transition: all 0.2s ease; }
        .sec-btn:hover { background: rgba(79,95,82,0.07) !important; transform: translateY(-1px); }
        .modal-input:focus { box-shadow: 0 0 0 3px rgba(79,95,82,0.12); border-color: #4F5F52 !important; outline: none; }
        .toggle-track { transition: background-color 0.2s ease; }
        .toggle-thumb { transition: transform 0.2s ease; }
        .checkbox-custom { accent-color: #4F5F52; }
        .avatar-ring { box-shadow: 0 0 0 2px #fff, 0 0 0 3.5px rgba(79,95,82,0.2); }
      `}</style>

      <div className="grain-overlay" />

      <div className="max-w-7xl mx-auto" style={{ position: 'relative', zIndex: 1 }}>

        {/* ── Header ── */}
        <div className="anim-up flex flex-wrap justify-between items-start gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div style={{
                width: 36, height: 36,
                background: `linear-gradient(135deg, ${SAGE}, #3e4c42)`,
                borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(79,95,82,0.25)',
              }}>
                <UsersIcon size={18} color="#fff" />
              </div>
              <h1 style={{ color: SAGE, fontSize: '1.55rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
                User Management
              </h1>
            </div>
            <p style={{ color: MUTED_GRAY, fontSize: '0.82rem', letterSpacing: '0.03em', marginLeft: 48 }}>
              {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} listed
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowInactive(!showInactive)}
              className="sec-btn flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
              style={{
                background: showInactive ? 'rgba(79,95,82,0.1)' : 'rgba(166,162,154,0.12)',
                color: SAGE,
                border: `1.5px solid ${showInactive ? 'rgba(79,95,82,0.25)' : 'rgba(166,162,154,0.25)'}`,
              }}
              title={showInactive ? 'Hide inactive users' : 'Show inactive users'}
            >
              {showInactive ? <EyeOff size={15} strokeWidth={2} /> : <Eye size={15} strokeWidth={2} />}
              {showInactive ? 'Hide Inactive' : 'Show All'}
            </button>

            <button
              onClick={openAddModal}
              className="primary-btn flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium"
              style={{
                background: `linear-gradient(135deg, ${SAGE} 0%, #3e4c42 100%)`,
                boxShadow: '0 4px 14px rgba(79,95,82,0.28)',
              }}
            >
              <Plus size={16} strokeWidth={2.2} />
              Add Staff Account
            </button>
          </div>
        </div>

        {/* ── Divider ── */}
        <div className="divider-line mb-7" />

        {/* ── Users Table Card ── */}
        <div
          className="anim-up-delay rounded-2xl overflow-hidden"
          style={{
            background: '#fff',
            border: '1.5px solid rgba(242,237,228,0.9)',
            boxShadow: '0 4px 24px rgba(79,95,82,0.07)',
          }}
        >
          <div className="overflow-x-auto">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{
                  background: `linear-gradient(135deg, rgba(242,237,228,0.9), rgba(255,243,217,0.4))`,
                  borderBottom: `1.5px solid rgba(242,237,228,1)`,
                }}>
                  {['User', 'Email', 'Role', 'Status', 'Joined', 'Actions'].map((h, i) => (
                    <th
                      key={h}
                      style={{
                        padding: '14px 18px',
                        textAlign: i === 5 ? 'right' : 'left',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: SAGE,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '64px 24px' }}>
                      <div style={{
                        width: 64, height: 64,
                        background: 'rgba(166,162,154,0.1)',
                        borderRadius: 18,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '1.5px dashed rgba(166,162,154,0.35)',
                        margin: '0 auto 12px',
                      }}>
                        <UsersIcon size={28} style={{ color: MUTED_GRAY, opacity: 0.4 }} />
                      </div>
                      <p style={{ color: MUTED_GRAY, fontSize: '0.875rem' }}>No users found.</p>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user, idx) => (
                    <tr
                      key={user.id}
                      className="table-row-hover"
                      style={{
                        borderBottom: idx < filteredUsers.length - 1 ? `1px solid rgba(242,237,228,0.8)` : 'none',
                        opacity: user.is_active ? 1 : 0.55,
                      }}
                    >
                      {/* User */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div
                            className="avatar-ring"
                            style={{
                              width: 36, height: 36,
                              borderRadius: '50%',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              flexShrink: 0,
                              background: user.is_active
                                ? `linear-gradient(135deg, ${SAGE}, #3e4c42)`
                                : 'rgba(166,162,154,0.35)',
                              fontSize: '0.72rem', fontWeight: 700, color: '#fff',
                              letterSpacing: '0.02em',
                            }}
                          >
                            {user.first_name?.[0]}{user.last_name?.[0]}
                          </div>
                          <span style={{ color: SAGE, fontWeight: 600, fontSize: '0.875rem' }}>
                            {user.first_name} {user.last_name}
                          </span>
                        </div>
                      </td>

                      {/* Email */}
                      <td style={{ padding: '14px 18px', color: MUTED_GRAY, fontSize: '0.78rem' }}>
                        {user.email}
                      </td>

                      {/* Role */}
                      <td style={{ padding: '14px 18px' }}>
                        {getRoleBadge(user.role)}
                      </td>

                      {/* Status toggle */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button
                            onClick={() => toggleUserStatus(user.id, user.is_active)}
                            style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
                          >
                            <span
                              className="toggle-track"
                              style={{
                                width: 38, height: 20, borderRadius: 10, display: 'block',
                                background: user.is_active
                                  ? `linear-gradient(135deg, ${SAGE}, #3e4c42)`
                                  : 'rgba(166,162,154,0.25)',
                                boxShadow: user.is_active ? '0 2px 8px rgba(79,95,82,0.3)' : 'none',
                              }}
                            />
                            <span
                              className="toggle-thumb"
                              style={{
                                position: 'absolute',
                                top: 2, left: 2,
                                width: 16, height: 16,
                                background: '#fff',
                                borderRadius: '50%',
                                boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
                                transform: user.is_active ? 'translateX(18px)' : 'translateX(0)',
                              }}
                            />
                          </button>
                          <span style={{
                            fontSize: '0.72rem', fontWeight: 600,
                            color: user.is_active ? SAGE : MUTED_GRAY,
                            letterSpacing: '0.03em',
                          }}>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </td>

                      {/* Joined */}
                      <td style={{ padding: '14px 18px', color: MUTED_GRAY, fontSize: '0.75rem' }}>
                        {user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                          <button
                            onClick={() => openEditModal(user)}
                            disabled={!user.is_active}
                            className="action-btn"
                            style={{
                              padding: '7px',
                              color: SAGE,
                              background: 'rgba(79,95,82,0.08)',
                              opacity: user.is_active ? 1 : 0.4,
                              cursor: user.is_active ? 'pointer' : 'not-allowed',
                              border: 'none',
                            }}
                            title={user.is_active ? 'Edit user' : 'Cannot edit deactivated user'}
                          >
                            <Edit2 size={14} strokeWidth={2} />
                          </button>
                          <button
                            onClick={() => user.is_active && setDeleteConfirm({ show: true, user })}
                            disabled={!user.is_active}
                            className="action-btn"
                            style={{
                              padding: '7px',
                              color: '#EF4444',
                              background: 'rgba(239,68,68,0.07)',
                              opacity: user.is_active ? 1 : 0.4,
                              cursor: user.is_active ? 'pointer' : 'not-allowed',
                              border: 'none',
                            }}
                            title={user.is_active ? 'Deactivate user' : 'User already deactivated'}
                          >
                            <Trash2 size={14} strokeWidth={2} />
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
      </div>

      {/* ══ Add/Edit User Modal ══ */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(30,35,30,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 50, padding: 16, backdropFilter: 'blur(4px)',
        }}>
          <div
            className="anim-modal"
            style={{
              background: '#fff',
              borderRadius: 22,
              width: '100%', maxWidth: 680,
              maxHeight: '90vh', overflowY: 'auto',
              boxShadow: '0 24px 60px rgba(79,95,82,0.18), 0 4px 16px rgba(0,0,0,0.08)',
              border: '1px solid rgba(242,237,228,0.8)',
            }}
          >
            {/* Modal header */}
            <div style={{
              position: 'sticky', top: 0, zIndex: 10,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '20px 26px',
              borderBottom: `1px solid ${CREAM}`,
              background: `linear-gradient(135deg, rgba(79,95,82,0.04), rgba(255,243,217,0.3))`,
              backdropFilter: 'blur(8px)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 34, height: 34,
                  background: `linear-gradient(135deg, ${SAGE}, #3e4c42)`,
                  borderRadius: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 3px 10px rgba(79,95,82,0.25)',
                }}>
                  <UsersIcon size={16} color="#fff" />
                </div>
                <h2 style={{ color: SAGE, fontWeight: 700, fontSize: '1.1rem', letterSpacing: '-0.01em' }}>
                  {editMode ? 'Edit User' : 'Add Staff Account'}
                </h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  color: MUTED_GRAY, padding: 7, borderRadius: 10,
                  transition: 'all 0.15s', background: 'transparent', border: 'none', cursor: 'pointer',
                }}
                onMouseEnter={e => e.currentTarget.style.background = CREAM}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: 26, display: 'flex', flexDirection: 'column', gap: 18 }}>
              {formError && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px 14px', borderRadius: 12, fontSize: '0.82rem',
                  background: '#FEF2F2', color: '#DC2626', border: '1px solid #FEE2E2',
                }}>
                  <AlertCircle size={16} /> {formError}
                </div>
              )}
              {formSuccess && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px 14px', borderRadius: 12, fontSize: '0.82rem',
                  background: '#ECFDF5', color: '#059669', border: '1px solid #D1FAE5',
                }}>
                  ✓ {formSuccess}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Role (edit only) */}
                {editMode && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: SAGE, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>Role *</label>
                    <select
                      name="role"
                      value={formData.role}
                      onChange={handleInputChange}
                      required
                      className="modal-input w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all"
                      style={{ borderColor: 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa' }}
                    >
                      <option value="staff">Staff</option>
                      <option value="admin">Admin</option>
                    </select>
                    {fieldErrors.role && <p style={{ color: '#EF4444', fontSize: '0.72rem', marginTop: 4 }}>{fieldErrors.role[0]}</p>}
                  </div>
                )}

                {/* First Name */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: SAGE, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>First Name *</label>
                  <input
                    type="text" name="first_name" value={formData.first_name}
                    onChange={handleInputChange} required
                    className="modal-input w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all"
                    style={{ borderColor: fieldErrors.first_name ? '#EF4444' : 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa' }}
                  />
                  {fieldErrors.first_name && <p style={{ color: '#EF4444', fontSize: '0.72rem', marginTop: 4 }}>{fieldErrors.first_name[0]}</p>}
                </div>

                {/* Last Name */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: SAGE, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>Last Name *</label>
                  <input
                    type="text" name="last_name" value={formData.last_name}
                    onChange={handleInputChange} required
                    className="modal-input w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all"
                    style={{ borderColor: fieldErrors.last_name ? '#EF4444' : 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa' }}
                  />
                  {fieldErrors.last_name && <p style={{ color: '#EF4444', fontSize: '0.72rem', marginTop: 4 }}>{fieldErrors.last_name[0]}</p>}
                </div>

                {/* Email */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: SAGE, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>Email *</label>
                  <input
                    type="email" name="email" value={formData.email}
                    onChange={handleInputChange} required
                    className="modal-input w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all"
                    style={{ borderColor: fieldErrors.email ? '#EF4444' : 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa' }}
                  />
                  {fieldErrors.email && <p style={{ color: '#EF4444', fontSize: '0.72rem', marginTop: 4 }}>{fieldErrors.email[0]}</p>}
                </div>

                {/* Password */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: SAGE, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>
                    Password {!editMode && '*'}
                  </label>
                  <input
                    type="password" name="password" value={formData.password}
                    onChange={handleInputChange} required={!editMode}
                    className="modal-input w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all"
                    style={{ borderColor: fieldErrors.password ? '#EF4444' : 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa' }}
                  />
                  {fieldErrors.password && <p style={{ color: '#EF4444', fontSize: '0.72rem', marginTop: 4 }}>{fieldErrors.password[0]}</p>}
                  {editMode && <p style={{ color: MUTED_GRAY, fontSize: '0.7rem', marginTop: 4 }}>Leave blank to keep current password</p>}
                </div>

                {/* Confirm Password */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: SAGE, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>
                    Confirm Password {!editMode && '*'}
                  </label>
                  <input
                    type="password" name="password_confirmation" value={formData.password_confirmation}
                    onChange={handleInputChange} required={!editMode}
                    className="modal-input w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all"
                    style={{ borderColor: fieldErrors.password_confirmation ? '#EF4444' : 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa' }}
                  />
                  {fieldErrors.password_confirmation && <p style={{ color: '#EF4444', fontSize: '0.72rem', marginTop: 4 }}>{fieldErrors.password_confirmation[0]}</p>}
                </div>

                {/* Phone */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: SAGE, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>Phone *</label>
                  <input
                    type="text" name="phone" value={formData.phone}
                    onChange={handleInputChange} required
                    className="modal-input w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all"
                    style={{ borderColor: fieldErrors.phone ? '#EF4444' : 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa' }}
                  />
                  {fieldErrors.phone && <p style={{ color: '#EF4444', fontSize: '0.72rem', marginTop: 4 }}>{fieldErrors.phone[0]}</p>}
                </div>

                {/* Birth Date */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: SAGE, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>Birth Date *</label>
                  <input
                    type="date" name="birth_date" value={formData.birth_date}
                    onChange={handleInputChange} required
                    className="modal-input w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all"
                    style={{ borderColor: fieldErrors.birth_date ? '#EF4444' : 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa' }}
                  />
                  {fieldErrors.birth_date && <p style={{ color: '#EF4444', fontSize: '0.72rem', marginTop: 4 }}>{fieldErrors.birth_date[0]}</p>}
                </div>

                {/* Address */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: SAGE, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>Address *</label>
                  <textarea
                    name="address" value={formData.address}
                    onChange={handleInputChange} required rows={2}
                    className="modal-input w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all"
                    style={{ borderColor: fieldErrors.address ? '#EF4444' : 'rgba(166,162,154,0.3)', color: SAGE, background: '#fafafa', resize: 'none' }}
                  />
                  {fieldErrors.address && <p style={{ color: '#EF4444', fontSize: '0.72rem', marginTop: 4 }}>{fieldErrors.address[0]}</p>}
                </div>
              </div>

              {/* Divider */}
              <div className="divider-line" />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="sec-btn px-5 py-2.5 rounded-xl border text-sm font-medium"
                  style={{ borderColor: 'rgba(166,162,154,0.3)', color: MUTED_GRAY, background: 'transparent', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="primary-btn flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50"
                  style={{
                    background: `linear-gradient(135deg, ${SAGE}, #3e4c42)`,
                    border: 'none', cursor: submitting ? 'not-allowed' : 'pointer',
                  }}
                >
                  {submitting && <Loader size={15} className="animate-spin" />}
                  {submitting
                    ? (editMode ? 'Updating…' : 'Adding…')
                    : (editMode ? 'Update User' : 'Add Staff')
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ Delete Confirmation Modal ══ */}
      {deleteConfirm.show && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(30,35,30,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 50, padding: 16, backdropFilter: 'blur(4px)',
        }}>
          <div
            className="anim-modal"
            style={{
              background: '#fff',
              borderRadius: 22,
              padding: '32px 28px',
              maxWidth: 380, width: '100%',
              textAlign: 'center',
              boxShadow: '0 24px 60px rgba(79,95,82,0.18), 0 4px 16px rgba(0,0,0,0.08)',
              border: '1px solid rgba(242,237,228,0.8)',
            }}
          >
            {/* Icon */}
            <div style={{
              width: 60, height: 60,
              background: 'rgba(239,68,68,0.08)',
              borderRadius: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 18px',
              border: '1.5px solid rgba(239,68,68,0.15)',
            }}>
              <Trash2 size={26} style={{ color: '#EF4444' }} />
            </div>

            <h3 style={{ color: SAGE, fontWeight: 700, fontSize: '1.1rem', marginBottom: 8 }}>
              Deactivate User?
            </h3>
            <p style={{ color: MUTED_GRAY, fontSize: '0.83rem', lineHeight: 1.6, marginBottom: 24 }}>
              This will deactivate{' '}
              <strong style={{ color: SAGE }}>
                {deleteConfirm.user.first_name} {deleteConfirm.user.last_name}
              </strong>
              . They won't be able to log in until reactivated.
            </p>

            <div className="divider-line mb-6" />

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={() => setDeleteConfirm({ show: false, user: null })}
                className="sec-btn px-5 py-2.5 rounded-xl border text-sm font-medium"
                style={{ borderColor: 'rgba(166,162,154,0.3)', color: MUTED_GRAY, background: 'transparent', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={() => softDeleteUser(deleteConfirm.user)}
                className="primary-btn px-5 py-2.5 rounded-xl text-white text-sm font-medium"
                style={{
                  background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                  border: 'none', cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(239,68,68,0.3)',
                }}
              >
                Yes, deactivate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}