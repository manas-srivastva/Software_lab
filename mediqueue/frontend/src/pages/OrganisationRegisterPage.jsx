import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2 } from 'lucide-react';
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
    <div className="max-w-2xl mx-auto px-4 py-10">
      <form onSubmit={submit} className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-xl space-y-5">
        <div>
          <Building2 className="w-8 h-8 text-teal-600 mb-3" />
          <h1 className="text-2xl font-extrabold text-slate-900">Register an organisation</h1>
          <p className="text-sm text-slate-500 mt-1">A platform superadmin must approve the organisation before it appears in doctor search.</p>
        </div>
        {error && <p role="alert" className="p-3 bg-rose-50 text-rose-800 rounded-lg text-sm">{error}</p>}
        <div className="grid sm:grid-cols-2 gap-4">
          <input className="border rounded-xl p-3 text-sm" name="name" value={form.name} onChange={update} placeholder="Administrator name" required />
          <input className="border rounded-xl p-3 text-sm" name="email" type="email" value={form.email} onChange={update} placeholder="Administrator email" required />
          <input className="border rounded-xl p-3 text-sm" name="phone" value={form.phone} onChange={update} placeholder="Phone" required />
          <input className="border rounded-xl p-3 text-sm" name="password" type="password" minLength="6" value={form.password} onChange={update} placeholder="Password (min. 6 characters)" required />
          <input className="border rounded-xl p-3 text-sm" name="orgName" value={form.orgName} onChange={update} placeholder="Organisation name" required />
          <select className="border rounded-xl p-3 text-sm bg-white" name="type" value={form.type} onChange={update}>
            <option value="clinic">Clinic</option>
            <option value="hospital">Hospital</option>
          </select>
          <input className="border rounded-xl p-3 text-sm" name="city" value={form.city} onChange={update} placeholder="City" />
          <input className="border rounded-xl p-3 text-sm" name="address" value={form.address} onChange={update} placeholder="Street address" />
        </div>
        <button disabled={submitting} className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl p-3 font-bold">
          {submitting ? 'Submitting...' : 'Submit for approval'}
        </button>
        <p className="text-sm text-center text-slate-500">Already registered? <Link className="text-teal-700 font-semibold" to="/login">Log in</Link></p>
      </form>
    </div>
  );
};

export default OrganisationRegisterPage;
