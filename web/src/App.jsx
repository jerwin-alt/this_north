// App.jsx - With mock login (no API needed)
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from './contexts/auth-context'; 
import { useNavigate } from 'react-router-dom';


export default function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLocalLoading, setIsLocalLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
  e.preventDefault();
  
  if (!email || !password) {
    alert("Please enter email and password");
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    alert("Please enter a valid email address");
    return;
  }
  
  setIsLocalLoading(true);

  try {
    console.log("1. Calling login API...");
    await login({ email, password });
    console.log("2. Login API completed");

    console.log("3. Checking for user data...");
    let currentUser = useAuth.getState().user;
    console.log("Initial user:", currentUser);
    
    let retries = 0;
    while (!currentUser && retries < 10) {
      await new Promise(resolve => setTimeout(resolve, 500));
      currentUser = useAuth.getState().user;
      retries++;
      console.log(`Waiting for user data... attempt ${retries}, user:`, currentUser);
    }

    console.log("4. Final user after polling:", currentUser);

    if (currentUser) {
      console.log("5. User role:", currentUser.role);
      console.log("6. User full data:", currentUser);
      
      if (currentUser.role === 'admin' || currentUser.role === 'owner') {
        console.log("7. Access granted, navigating to dashboard...");
        navigate('/pages/Dashboard');
      } else {
        console.log("7. Access denied - role is:", currentUser.role);
        alert("Access Denied. Owner Access Only.");
        await useAuth.getState().logout();
      }
    } else {
      console.log("5. No user found after login");
      alert("Login Failed: Unable to Fetch User Information");
    }

  } catch (error) {
    console.error("Login error:", error);
    let errorMessage = "Invalid Email or Password";
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    alert(errorMessage);
  } finally {
    setIsLocalLoading(false);
  }
};

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="flex-1 bg-gradient-to-br from-green-900 to-green-700 flex flex-col justify-end p-10 text-white">
        <div className="max-w-md">
          <div className="text-6xl mb-4">🎂</div>
          <h1 className="text-4xl font-bold">North Cakes CDO</h1>
          <p className="text-white/80 mt-2">Operational Management System</p>
          <p className="text-white/50 text-sm mt-4">
            Streamline your bakery operations — from order management to inventory control.
          </p>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-[480px] bg-white p-10 rounded-2xl shadow-2xl m-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-700 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3">
            🎂
          </div>
          <h2 className="text-2xl font-bold text-green-900">Welcome Back</h2>
          <p className="text-gray-600 text-sm">Sign in to manage your pastry shop</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          {error && (
            <div className="bg-red-100 border border-red-400 rounded-lg p-3 text-red-700 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-green-900 text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:border-green-600"
              placeholder="admin@northcakes.com"
              required
            />
          </div>

          <div className="relative">
            <label className="block text-green-900 text-sm font-medium mb-1">Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 pr-10 focus:outline-none focus:border-green-600"
              placeholder="••••••••"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-9 text-gray-500"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-700 text-white py-2.5 rounded-lg font-semibold hover:bg-green-600 transition disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-gray-500 text-xs mt-6">
          Demo: admin@northcakes.com / admin123 | sarah@northcakes.com / staff123
        </p>
      </div>
    </div>
  );
}