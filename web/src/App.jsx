import { useState } from 'react';
import { Eye, EyeOff, Cake, Loader2 } from 'lucide-react';
import { useAuth } from './contexts/auth-context';
import { useNavigate } from 'react-router-dom';

// Color palette (unchanged)
const SAGE = '#4F5F52';
const CREAM = '#F2EDE4';
const MUTED_GRAY = '#A6A29A';

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
    setLoading(true);
    setError('');

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
        } else if (currentUser.role === 'staff') {
          console.log("8. Access granted, navigating to dashboard...");
          navigate('/pages/staff-dashboard');
        } else {
          alert('Access Denied. Unknown role.');
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
      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setIsLocalLoading(false);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex overflow-hidden">
      {/* Left decorative panel – now w-1/2 to match right side */}
      <div 
        className="hidden lg:flex lg:w-1/2 relative" 
        style={{ 
          backgroundImage: `url('/background_northckase2.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="absolute inset-0 overflow-hidden opacity-10">
          {Array.from({ length: 12 }).map((_, i) => (
            <Cake
              key={i}
              className="absolute text-white"
              style={{
                left: `${(i % 4) * 26 + 3}%`,
                top: `${Math.floor(i / 4) * 32 + 4}%`,
                width: 72,
                height: 72,
              }}
            />
          ))}
        </div>
        {/* Gradient overlay remains for readability */}
        <div className="absolute inset-0 bg-gradient-to-r" style={{ background: `linear-gradient(to right, ${SAGE}95, ${SAGE}60)` }} />
        <div className="absolute bottom-14 left-14 text-white">
          {/* REMOVED the logo div here - now only the heading */}
          <div className="mb-4" style={{ animation: 'fadeSlideUp 0.6s 0.3s both' }}>
            <h1 className="text-5xl font-bold" style={{ color: '#69ce73' }}>North Cakes CDO</h1>
          </div>
          <p className="text-xl text-white/75 ml-1" style={{ animation: 'fadeSlideUp 0.6s 0.45s both' }}>Operational Management System</p>
          <div className="flex gap-4 mt-6 ml-1" style={{ animation: 'fadeSlideUp 0.6s 0.55s both' }}>
            {['Admin Portal', 'Staff Portal', 'Live Reports'].map(label => (
              <span key={label} className="bg-white/15 text-white/80 text-xs px-3 py-1.5 rounded-full">
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Right side – login form, now w-1/2 to match left side */}
      <div className="flex-1 lg:w-1/2 flex items-center justify-center p-8 overflow-y-auto" style={{ background: CREAM }}>
        <div className="w-full max-w-md" style={{ animation: 'fadeSlideRight 0.5s 0.2s both' }}>
          <div className="text-center mb-10">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg overflow-hidden" style={{ background: SAGE }}>
              <img 
                src="/northcakes_logo.jpg" 
                alt="North Cakes Logo" 
                className="w-full h-full object-cover"
              />
            </div>
            <h2 className="text-3xl font-bold" style={{ color: SAGE }}>Welcome Back</h2>
            <p className="mt-2" style={{ color: MUTED_GRAY }}>Sign in to manage your pastry shop</p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl text-sm" style={{ background: '#DC262610', border: '1px solid #DC262630', color: '#DC2626' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: SAGE }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="w-full h-12 px-4 rounded-xl border bg-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all"
                style={{ borderColor: `${MUTED_GRAY}30`, color: SAGE }}
                onFocus={(e) => { e.target.style.borderColor = SAGE; e.target.style.ringColor = `${SAGE}30`; }}
                onBlur={(e) => e.target.style.borderColor = `${MUTED_GRAY}30`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: SAGE }}>Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full h-12 px-4 pr-12 rounded-xl border bg-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all"
                  style={{ borderColor: `${MUTED_GRAY}30`, color: SAGE }}
                  onFocus={(e) => { e.target.style.borderColor = SAGE; e.target.style.ringColor = `${SAGE}30`; }}
                  onBlur={(e) => e.target.style.borderColor = `${MUTED_GRAY}30`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: MUTED_GRAY }}
                  onMouseEnter={(e) => e.currentTarget.style.color = SAGE}
                  onMouseLeave={(e) => e.currentTarget.style.color = MUTED_GRAY}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-60"
              style={{ background: SAGE }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#3e4c42'}
              onMouseLeave={(e) => e.currentTarget.style.background = SAGE}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Signing in…
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
          <p className="text-center text-sm mt-6" style={{ color: MUTED_GRAY }}>
            Admin &amp; Staff portal 
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: none; }
        }
        @keyframes fadeSlideRight {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: none; }
        }
      `}</style>
    </div>
  );
}