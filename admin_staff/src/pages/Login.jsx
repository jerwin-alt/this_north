import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const role = await login(email, password);
      navigate(role === 'admin' ? '/admin/dashboard' : '/staff/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 bg-gradient-to-br from-sage-dark to-sage flex flex-col justify-end p-10 text-white">
        <div className="max-w-md">
          <div className="text-6xl mb-4">🎂</div>
          <h1 className="text-4xl font-playfair font-bold">North Cakes CDO</h1>
          <p className="text-white/80 mt-2">Operational Management System</p>
          <p className="text-white/50 text-sm mt-4">Streamline your bakery operations — from order management to inventory control.</p>
        </div>
      </div>
      <div className="w-[480px] bg-cream-white p-10 rounded-2xl shadow-2xl m-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-sage rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3">🎂</div>
          <h2 className="text-2xl font-playfair font-bold text-sage-dark">Welcome Back</h2>
          <p className="text-warm-gray text-sm">Sign in to manage your pastry shop</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <div className="bg-red/10 border border-red/30 rounded-lg p-3 text-red text-sm">{error}</div>}
          <div>
            <label className="block text-sage-dark text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-warm-gray/30 rounded-lg px-4 py-2.5 focus:outline-none focus:border-sage"
              placeholder="admin@northcakes.com"
              required
            />
          </div>
          <div className="relative">
            <label className="block text-sage-dark text-sm font-medium mb-1">Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-warm-gray/30 rounded-lg px-4 py-2.5 pr-10 focus:outline-none focus:border-sage"
              placeholder="••••••••"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-9 text-warm-gray"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-sage text-white py-2.5 rounded-lg font-semibold hover:bg-sage-light transition disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p className="text-center text-warm-gray text-xs mt-6">
          Demo: admin@northcakes.com / admin123  |  sarah@northcakes.com / staff123
        </p>
      </div>
    </div>
  );
}