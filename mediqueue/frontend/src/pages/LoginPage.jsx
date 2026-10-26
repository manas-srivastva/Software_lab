import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import getRoleDashboard from '../utils/roleDashboard';
import {
  Mail,
  Lock,
  ArrowRight,
  Activity,
  Loader2,
  AlertCircle,
  UserCheck,
  ShieldCheck,
  Stethoscope,
  Building2,
} from 'lucide-react';

const demoAccounts = [
  { label: 'Patient', status: 'Standard patient', email: 'john.doe@example.com' },
  { label: 'Doctor · David Kim', status: 'Approved & active', email: 'dr.kim@mediqueue.com' },
  { label: 'Doctor · Sarah Jenkins', status: 'Approved & active', email: 'dr.jenkins@mediqueue.com' },
  { label: 'Doctor · Alex Morgan', status: 'Pending review', email: 'dr.pending@mediqueue.com' },
  { label: 'Doctor · Lisa Ray', status: 'Needs changes', email: 'dr.changes@mediqueue.com' },
  { label: 'Receptionist', status: 'Staff desk access', email: 'receptionist@mediqueue.com' },
  { label: 'Admin', status: 'Hospital administrator', email: 'admin@mediqueue.com' },
];

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
  const fromLocation = location.state?.from?.pathname;
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
      navigate(fromLocation || getRoleDashboard(result.user?.role), { replace: true });
    } else {
      setErrorMsg(result.message || 'Invalid email or password');
    }
  };

  const handleFillDemo = (email, password) => {
    setFormData({ email, password });
    setErrorMsg('');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-10 sm:py-14">
      <div className="w-full max-w-2xl overflow-hidden bg-white rounded-3xl shadow-xl shadow-slate-900/5 border border-slate-200">
        <div className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-700 to-cyan-800 px-7 py-7 sm:px-10 sm:py-8 text-white">
          <div className="absolute -right-8 -top-16 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 text-white flex items-center justify-center">
              <Activity className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] font-bold text-teal-100">
                MediQueue portal
              </p>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">
                Welcome back
              </h1>
            </div>
          </div>
          <p className="relative text-sm text-teal-50 mt-4 max-w-lg">
            Sign in to continue to the workspace designed for your role.
          </p>
        </div>

        <div className="p-6 sm:p-9">
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
                  autoComplete="username"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm transition focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
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
                  autoComplete="current-password"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm transition focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-4 py-3 rounded-xl font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-md shadow-teal-700/20 hover:-translate-y-0.5 transition disabled:opacity-60 disabled:hover:translate-y-0 flex items-center justify-center gap-2"
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

          <section className="mt-7 pt-6 border-t border-slate-100">
            <div className="flex items-end justify-between gap-3 mb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-800">Explore a demo workspace</h2>
                <p className="text-xs text-slate-500 mt-0.5">Select an account to fill the form; sign in manually.</p>
              </div>
              <span className="hidden sm:inline-flex text-[10px] font-semibold text-slate-400 bg-slate-50 border border-slate-100 rounded-full px-2.5 py-1">
                Demo access
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {demoAccounts.map((account) => {
                const isPatientAccount = account.label === 'Patient';
                const isDoctorAccount = account.label.startsWith('Doctor');
                const Icon = isPatientAccount
                  ? UserCheck
                  : isDoctorAccount
                    ? Stethoscope
                    : account.label === 'Receptionist'
                      ? ShieldCheck
                      : Building2;
                const accentClasses = isPatientAccount
                  ? 'hover:bg-teal-50 hover:text-teal-800 hover:border-teal-300 text-teal-600'
                  : isDoctorAccount
                    ? 'hover:bg-sky-50 hover:text-sky-800 hover:border-sky-300 text-sky-600'
                    : account.label === 'Receptionist'
                      ? 'hover:bg-purple-50 hover:text-purple-800 hover:border-purple-300 text-purple-600'
                      : 'hover:bg-indigo-50 hover:text-indigo-800 hover:border-indigo-300 text-indigo-600';

                return (
                  <button
                    key={account.email}
                    type="button"
                    onClick={() => handleFillDemo(account.email, 'password123')}
                    className={`min-h-16 p-3 rounded-xl bg-white border border-slate-200 font-semibold transition text-left flex items-center gap-3 hover:shadow-sm ${accentClasses}`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="min-w-0">
                      <span className="block font-bold">{account.label}</span>
                      <span className="block text-[10px] text-slate-500 font-normal">{account.status}</span>
                      <span className="block text-[10px] text-slate-400 font-normal truncate mt-0.5">
                        {account.email}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-[11px] text-slate-400 text-center">
              Demo password:{' '}
              <span className="font-semibold text-slate-500">password123</span>. Demo accounts must
              exist in the configured database.
            </p>
          </section>

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
    </div>
  );
};

export default LoginPage;
