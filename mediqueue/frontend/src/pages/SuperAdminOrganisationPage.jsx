import React, { useCallback, useEffect, useState } from 'react';
import { adminAPI, organisationAPI } from '../services/api';
import { Building2, Users, Stethoscope, CalendarDays, CheckCircle2, XCircle } from 'lucide-react';

const SuperAdminOrganisationPage = () => {
  const [organisations, setOrganisations] = useState([]);
  const [platformStats, setPlatformStats] = useState(null);
  const [reportsError, setReportsError] = useState('');
  const [error, setError] = useState('');
  const [reviewingId, setReviewingId] = useState('');

  const load = useCallback(async () => {
    const [pendingResult, reportsResult] = await Promise.allSettled([
      organisationAPI.getPending(),
      adminAPI.getReports(),
    ]);
    if (pendingResult.status === 'rejected') {
      setError(pendingResult.reason.message || 'Unable to load approval queue');
      return;
    }
    setOrganisations(pendingResult.value.data.organisations);
    setError('');
    if (reportsResult.status === 'fulfilled') {
      setPlatformStats(reportsResult.value.data.stats);
      setReportsError('');
    } else {
      setReportsError(reportsResult.reason.message || 'Unable to load platform summary');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const review = async (id, decision) => {
    setReviewingId(id);
    try {
      await organisationAPI.review(id, decision);
      await load();
    } catch (requestError) {
      setError(requestError.message || 'Unable to review organisation');
    } finally {
      setReviewingId('');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-7">
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-lg">
        <div className="absolute -right-8 -top-16 w-56 h-56 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider font-bold text-indigo-100 bg-white/10 px-2.5 py-1 rounded-full border border-white/15"><Building2 className="w-3.5 h-3.5" /> Platform administration</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-3">Platform overview</h1>
          <p className="text-sm text-slate-300 mt-1">Review organisation applications and monitor MediQueue-wide activity.</p>
        </div>
      </div>
      {reportsError && <p role="status" className="p-3 bg-amber-50 text-amber-800 rounded-lg text-sm">{reportsError}</p>}
      {platformStats && (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Organisations pending', organisations.length, Building2, 'indigo'],
            ['Doctors', platformStats.totalDoctors, Stethoscope, 'teal'],
            ['Patients', platformStats.totalPatients, Users, 'sky'],
            ['Appointments today', platformStats.todayAppointments, CalendarDays, 'amber'],
          ].map(([label, value, Icon, color]) => (
            <article key={label} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition">
              <span className={`inline-flex w-10 h-10 items-center justify-center rounded-xl ${
                color === 'indigo' ? 'bg-indigo-50 text-indigo-600' :
                color === 'teal' ? 'bg-teal-50 text-teal-600' :
                color === 'sky' ? 'bg-sky-50 text-sky-600' : 'bg-amber-50 text-amber-600'
              }`}><Icon className="w-5 h-5" /></span>
              <p className="text-xs uppercase font-bold tracking-wide text-slate-500 mt-4">{label}</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{value}</p>
            </article>
          ))}
        </section>
      )}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Organisation approval queue</h2>
          <p className="text-sm text-slate-500 mt-1">Approve an organisation to activate its directory listings and management tools.</p>
        </div>
        <span className="shrink-0 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1.5">{organisations.length} pending</span>
      </div>
      {error && <p role="alert" className="p-3 bg-rose-50 text-rose-800 rounded-lg text-sm">{error}</p>}
      {organisations.length === 0 ? <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center shadow-sm"><span className="inline-flex w-12 h-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><CheckCircle2 className="w-6 h-6" /></span><p className="font-bold text-slate-800 mt-3">You’re all caught up</p><p className="text-sm text-slate-500 mt-1">No pending organisations need review.</p></div> : (
        <div className="space-y-3">
          {organisations.map((organisation) => (
            <article key={organisation._id} className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
              <div className="flex gap-4 min-w-0">
                <span className="hidden sm:flex w-11 h-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><Building2 className="w-5 h-5" /></span>
                <div className="min-w-0">
                <h2 className="font-bold text-slate-900">{organisation.name} <span className="font-medium text-xs capitalize text-indigo-700 bg-indigo-50 rounded-full px-2 py-1 ml-1">{organisation.type.replace(/_/g, ' ')}</span></h2>
                <p className="text-sm text-slate-600">{organisation.city} · {organisation.address}</p>
                <p className="text-xs text-slate-500 mt-1">Administrator: {organisation.orgAdmin?.name} · {organisation.orgAdmin?.email}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button disabled={!!reviewingId} onClick={() => review(organisation._id, 'approve')} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition disabled:opacity-50"><CheckCircle2 className="w-4 h-4" /> {reviewingId === organisation._id ? 'Saving…' : 'Approve'}</button>
                <button disabled={!!reviewingId} onClick={() => review(organisation._id, 'reject')} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 text-sm font-bold transition disabled:opacity-50"><XCircle className="w-4 h-4" /> Reject</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default SuperAdminOrganisationPage;
