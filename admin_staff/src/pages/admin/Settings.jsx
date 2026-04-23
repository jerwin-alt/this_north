import { useState } from 'react';
import Layout from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

export default function AdminSettings() {
  const { user } = useAuth();
  const [profile, setProfile] = useState({ first_name: user?.first_name || '', last_name: user?.last_name || '', email: user?.email || '' });
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', new_password_confirmation: '' });
  const [store, setStore] = useState({ store_name: 'North Cakes CDO', address: '', phone: '' });
  const [message, setMessage] = useState('');

  const updateProfile = async () => {
    try {
      await api.put('/user/profile', profile);
      setMessage('Profile updated successfully');
    } catch (err) { setMessage('Error updating profile'); }
  };
  const updatePassword = async () => {
    if (passwordForm.new_password !== passwordForm.new_password_confirmation) { setMessage('Passwords do not match'); return; }
    try {
      await api.put('/user/password', passwordForm);
      setMessage('Password changed');
      setPasswordForm({ current_password: '', new_password: '', new_password_confirmation: '' });
    } catch (err) { setMessage('Error changing password'); }
  };
  const updateStore = async () => {
    try {
      await api.put('/settings/store', store);
      setMessage('Store settings saved');
    } catch (err) { setMessage('Error saving store settings'); }
  };

  return (
    <Layout title="Settings">
      {message && <div className="bg-green/20 text-green p-3 rounded-lg mb-4">{message}</div>}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-cream-white rounded-xl p-6 border border-warm-gray/10">
          <h3 className="font-playfair font-bold text-lg mb-4">Profile Information</h3>
          <div className="space-y-3">
            <input type="text" placeholder="First Name" value={profile.first_name} onChange={e => setProfile({...profile, first_name: e.target.value})} className="w-full border rounded-lg p-2" />
            <input type="text" placeholder="Last Name" value={profile.last_name} onChange={e => setProfile({...profile, last_name: e.target.value})} className="w-full border rounded-lg p-2" />
            <input type="email" placeholder="Email" value={profile.email} onChange={e => setProfile({...profile, email: e.target.value})} className="w-full border rounded-lg p-2" />
            <button onClick={updateProfile} className="bg-sage text-white px-4 py-2 rounded-lg">Update Profile</button>
          </div>
        </div>
        <div className="bg-cream-white rounded-xl p-6 border border-warm-gray/10">
          <h3 className="font-playfair font-bold text-lg mb-4">Change Password</h3>
          <div className="space-y-3">
            <input type="password" placeholder="Current Password" value={passwordForm.current_password} onChange={e => setPasswordForm({...passwordForm, current_password: e.target.value})} className="w-full border rounded-lg p-2" />
            <input type="password" placeholder="New Password" value={passwordForm.new_password} onChange={e => setPasswordForm({...passwordForm, new_password: e.target.value})} className="w-full border rounded-lg p-2" />
            <input type="password" placeholder="Confirm New Password" value={passwordForm.new_password_confirmation} onChange={e => setPasswordForm({...passwordForm, new_password_confirmation: e.target.value})} className="w-full border rounded-lg p-2" />
            <button onClick={updatePassword} className="bg-sage text-white px-4 py-2 rounded-lg">Change Password</button>
          </div>
        </div>
        <div className="bg-cream-white rounded-xl p-6 border border-warm-gray/10 lg:col-span-2">
          <h3 className="font-playfair font-bold text-lg mb-4">Store Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" placeholder="Store Name" value={store.store_name} onChange={e => setStore({...store, store_name: e.target.value})} className="border rounded-lg p-2" />
            <input type="text" placeholder="Phone" value={store.phone} onChange={e => setStore({...store, phone: e.target.value})} className="border rounded-lg p-2" />
            <textarea placeholder="Address" value={store.address} onChange={e => setStore({...store, address: e.target.value})} className="border rounded-lg p-2 md:col-span-2" rows="2" />
            <button onClick={updateStore} className="bg-sage text-white px-4 py-2 rounded-lg md:col-span-2">Save Store Settings</button>
          </div>
        </div>
      </div>
    </Layout>
  );
}