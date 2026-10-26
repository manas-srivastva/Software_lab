import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Mail,
  Lock,
  ArrowRight,
  Activity,
  Loader2,
  AlertCircle,
  UserCheck,
  ShieldCheck,
} from 'lucide-react';

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If redirected from expired session or protected route
  const fromLocation = location.state?.from?.pathname || '/dashboard';
  const queryParams = new URLSearchParams(location.search);
  const isExpired = queryParams.get('expired') === '1';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errorMsg) setErrorMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email.trim() || !formData.password) {
      setErrorMsg('Please enter both email and password');
      return;
    }

    setIsSubmitting(true);
    const result = await login(formData.email.trim(), formData.password);
    setIsSubmitting(false);

    if (result.success) {
      navigate(fromLocation, { replace: true });
    } else {
      setErrorMsg(result.message || 'Invalid email or password');
    }
  };

  const handleFillDemo = (email, password) => {
    setFormData({ email, password });
    setErrorMsg('');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 sm:p-10 shadow-xl border border-slate-100">
        <div className="text-center mb-8">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 items-center justify-center mb-3">
            <Activity className="w-6 h-6 stroke-[2.5]" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Sign In to MediQueue
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Access your patient portal, appointments, and live token status
          </p>
        </div>

        {isExpired && !errorMsg && (
          <div className="mb-6 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Your session has expired. Please sign in again.</span>
          </div>
        )}

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm transition focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm transition focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-4 py-3 rounded-xl font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-md shadow-teal-600/30 transition disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Signing In...
              </>
            ) : (
              <>
                Sign In
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Logins for instant evaluation */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 text-center">
            One-Click Demo Credentials
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleFillDemo('john.doe@example.com', 'password123')}
              className="p-2.5 rounded-xl bg-slate-50 hover:bg-teal-50 text-slate-700 hover:text-teal-800 border border-slate-200 hover:border-teal-300 font-semibold transition text-left flex items-center gap-2"
            >
              <UserCheck className="w-4 h-4 text-teal-600 shrink-0" />
              <div>
                <p className="font-bold">Patient Demo</p>
                <p className="text-[10px] text-slate-400 font-normal">john.doe@example.com</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleFillDemo('receptionist@mediqueue.com', 'password123')}
              className="p-2.5 rounded-xl bg-slate-50 hover:bg-purple-50 text-slate-700 hover:text-purple-800 border border-slate-200 hover:border-purple-300 font-semibold transition text-left flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
              <div>
                <p className="font-bold">Staff Demo</p>
                <p className="text-[10px] text-slate-400 font-normal">receptionist@mediqueue.com</p>
              </div>
            </button>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-slate-600">
            Don't have an account yet?{' '}
            <Link to="/register" className="font-bold text-teal-600 hover:text-teal-700">
              Create Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
