import React, { useCallback, useEffect, useState } from 'react';
import { adminAPI, organisationAPI } from '../services/api';
import {
  Building2,
  Users,
  Stethoscope,
  CalendarDays,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ShieldCheck,
  MapPin,
  Mail,
  Loader2,
} from 'lucide-react';

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
    setOrganisations(pendingResult.value.data.organisations || []);
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6 sm:space-y-8">
      {/* Platform Admin Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute -right-8 -top-16 w-56 h-56 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
        <div className="relative space-y-2">
          <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider font-bold text-indigo-200 bg-white/10 px-3 py-1 rounded-full border border-white/15">
            <ShieldCheck className="w-3.5 h-3.5" /> Platform Governance &amp; Administration
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-2">
            Platform Overview &amp; Organisation Approval
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            Review healthcare institution onboarding applications, inspect administrator credentials, and monitor MediQueue-wide activity.
          </p>
        </div>
      </div>

      {reportsError && (
        <div role="status" className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl text-xs sm:text-sm flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <span>{reportsError}</span>
        </div>
      )}

      {/* Platform High-Level Statistics */}
      {platformStats && (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Pending Approvals', organisations.length, Building2, 'indigo'],
            ['Total Doctors', platformStats.totalDoctors, Stethoscope, 'teal'],
            ['Registered Patients', platformStats.totalPatients, Users, 'sky'],
            ['Appointments Today', platformStats.todayAppointments, CalendarDays, 'amber'],
          ].map(([label, value, Icon, color]) => (
            <article
              key={label}
              className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-md transition"
            >
              <span
                className={`inline-flex w-12 h-12 items-center justify-center rounded-2xl ${
                  color === 'indigo'
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                    : color === 'teal'
                    ? 'bg-teal-50 text-teal-700 border border-teal-100'
                    : color === 'sky'
                    ? 'bg-sky-50 text-sky-700 border border-sky-100'
                    : 'bg-amber-50 text-amber-700 border border-amber-100'
                }`}
              >
                <Icon className="w-6 h-6 stroke-[2.2]" />
              </span>
              <p className="text-[10px] sm:text-[11px] uppercase font-bold tracking-wider text-slate-500 mt-4">
                {label}
              </p>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-0.5">{value}</p>
            </article>
          ))}
        </section>
      )}

      {/* Organisation Approval Queue */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200/80 pb-3">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
              Organisation Approval Queue
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Approved healthcare organizations gain active directory listings and staff queue controls.
            </p>
          </div>
          <span className="shrink-0 text-xs font-bold text-indigo-800 bg-indigo-50 border border-indigo-200 rounded-full px-3 py-1 self-start sm:self-auto">
            {organisations.length} Applications Pending
          </span>
        </div>

        {error && (
          <div role="alert" className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-sm flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {organisations.length === 0 ? (
          <div className="bg-white border border-slate-200/90 rounded-3xl p-12 text-center shadow-sm space-y-3">
            <span className="inline-flex w-14 h-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </span>
            <p className="font-extrabold text-slate-900 text-lg">You're all caught up</p>
            <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
              No pending organisation applications currently require verification or superadmin review.
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {organisations.map((organisation) => (
              <article
                key={organisation._id}
                className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 hover:border-indigo-200 transition"
              >
                <div className="flex gap-4 min-w-0">
                  <span className="hidden sm:flex w-12 h-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700">
                    <Building2 className="w-6 h-6 stroke-[2.2]" />
                  </span>
                  <div className="min-w-0 space-y-1">
                    <h3 className="font-extrabold text-base sm:text-lg text-slate-900 flex items-center gap-2 flex-wrap">
                      {organisation.name}
                      <span className="font-bold text-[10px] uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-full px-2.5 py-0.5">
                        {organisation.type?.replace(/_/g, ' ') || 'Facility'}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-600 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      {organisation.city} · {organisation.address}
                    </p>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5 pt-0.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      Admin: <strong className="text-slate-700">{organisation.orgAdmin?.name}</strong> ({organisation.orgAdmin?.email})
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <button
                    type="button"
                    disabled={!!reviewingId}
                    onClick={() => review(organisation._id, 'approve')}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-sm transition disabled:opacity-50"
                  >
                    {reviewingId === organisation._id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" /> Approve
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={!!reviewingId}
                    onClick={() => review(organisation._id, 'reject')}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 text-xs sm:text-sm font-bold transition disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperAdminOrganisationPage;
