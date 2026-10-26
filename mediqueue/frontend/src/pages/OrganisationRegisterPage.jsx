import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, AlertCircle, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const OrganisationRegisterPage = () => {
  const navigate = useNavigate();
  const { registerOrganisation } = useAuth();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    orgName: '',
    type: 'clinic',
    address: '',
    city: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = (event) =>
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    const result = await registerOrganisation(form);
    if (result.success) {
      navigate('/org/dashboard');
    } else {
      setError(result.message);
    }
    setSubmitting(false);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      <form
        onSubmit={submit}
        className="bg-white rounded-3xl border border-slate-200/90 p-7 sm:p-10 shadow-xl shadow-slate-900/5 space-y-6"
      >
        <div className="text-center sm:text-left">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center mb-3 mx-auto sm:mx-0 shadow-sm">
            <Building2 className="w-6 h-6 stroke-[2.2]" />
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider font-bold text-indigo-800 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200 mb-2">
            Facility Onboarding
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Register a Healthcare Organisation
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl leading-relaxed">
            Register your hospital or clinic. Once submitted, a platform administrator reviews and approves the facility to activate its specialist listings.
          </p>
        </div>

        {error && (
          <div role="alert" className="p-4 bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl text-xs sm:text-sm flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Administrator Name
            </label>
            <input
              className="w-full border border-slate-200 rounded-2xl p-3 text-sm font-medium focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              name="name"
              value={form.name}
              onChange={update}
              placeholder="e.g. Dr. Arthur Vance"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Administrator Email
            </label>
            <input
              className="w-full border border-slate-200 rounded-2xl p-3 text-sm font-medium focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              name="email"
              type="email"
              value={form.email}
              onChange={update}
              placeholder="admin@clinic.org"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Contact Phone
            </label>
            <input
              className="w-full border border-slate-200 rounded-2xl p-3 text-sm font-medium focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              name="phone"
              value={form.phone}
              onChange={update}
              placeholder="+1 555-0100"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Password (min. 6 chars)
            </label>
            <input
              className="w-full border border-slate-200 rounded-2xl p-3 text-sm font-medium focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              name="password"
              type="password"
              minLength="6"
              value={form.password}
              onChange={update}
              placeholder="••••••••"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Organisation / Facility Name
            </label>
            <input
              className="w-full border border-slate-200 rounded-2xl p-3 text-sm font-medium focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              name="orgName"
              value={form.orgName}
              onChange={update}
              placeholder="e.g. Metro Medical Pavilion"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Facility Type
            </label>
            <select
              className="w-full border border-slate-200 rounded-2xl p-3 text-sm font-medium bg-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              name="type"
              value={form.type}
              onChange={update}
            >
              <option value="clinic">Outpatient Clinic</option>
              <option value="hospital">General Hospital</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              City
            </label>
            <input
              className="w-full border border-slate-200 rounded-2xl p-3 text-sm font-medium focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              name="city"
              value={form.city}
              onChange={update}
              placeholder="City"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Street Address
            </label>
            <input
              className="w-full border border-slate-200 rounded-2xl p-3 text-sm font-medium focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              name="address"
              value={form.address}
              onChange={update}
              placeholder="Street Address, Suite"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white rounded-2xl p-3.5 font-bold shadow-md shadow-indigo-700/20 transition-all flex items-center justify-center gap-2 text-sm hover:-translate-y-0.5"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Submitting Application...
            </>
          ) : (
            <>
              Submit Organisation for Review <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        <p className="text-xs text-center text-slate-500 pt-1">
          Already registered?{' '}
          <Link className="text-indigo-700 hover:text-indigo-900 font-bold" to="/login">
            Log in to your workspace
          </Link>
        </p>
      </form>
    </div>
  );
};

export default OrganisationRegisterPage;
