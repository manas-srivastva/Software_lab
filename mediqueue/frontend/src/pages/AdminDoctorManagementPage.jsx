import React, { useEffect, useState } from 'react';
import { adminAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import {
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  PauseCircle,
  X,
  Clock,
  User,
  FileText,
  Eye,
  ShieldAlert,
  Award,
  Building2,
} from 'lucide-react';

const TABS = ['Pending', 'Approved', 'All'];
const STATUS_MAP = { Pending: 'PENDING', Approved: 'APPROVED', All: '' };

/* ── small inline badge ── */
const VBadge = ({ status }) => {
  const cfg = {
    APPROVED:      'bg-emerald-50 text-emerald-800 border-emerald-200',
    PENDING:       'bg-sky-50 text-sky-800 border-sky-200',
    NEEDS_CHANGES: 'bg-amber-50 text-amber-800 border-amber-200',
    REJECTED:      'bg-rose-50 text-rose-800 border-rose-200',
    SUSPENDED:     'bg-slate-100 text-slate-600 border-slate-300',
    DRAFT:         'bg-slate-50 text-slate-500 border-slate-200',
  };
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${cfg[status] || 'bg-slate-50 text-slate-500 border-slate-200'}`}>
      {status || '—'}
    </span>
  );
};

/* ── reason modal ── */
const ReasonModal = ({ title, onConfirm, onClose, submitting }) => {
  const [reason, setReason] = useState('');
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md p-6 sm:p-7 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-slate-900 text-base">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close reason modal"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          placeholder="Provide a clear, detailed clinical verification reason (min 3 characters)..."
          className="w-full px-4 py-3 text-sm rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none font-medium text-slate-800"
        />
        <div className="flex gap-2.5 justify-end pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reason)}
            disabled={reason.trim().length < 3 || submitting}
            className="px-5 py-2.5 text-xs font-bold rounded-xl text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-40 transition shadow-sm shadow-teal-700/20"
          >
            {submitting ? 'Submitting…' : 'Confirm Action'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── doctor detail modal ── */
const DetailModal = ({ doctor, onClose, onAction, acting }) => {
  const s = doctor.verificationStatus;
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-slate-100 px-6 sm:px-7 py-4 flex items-center justify-between z-10">
          <div>
            <p className="font-extrabold text-base sm:text-lg text-slate-900 leading-tight">{doctor.name}</p>
            <p className="text-xs text-slate-500 mt-0.5">{doctor.specialization} · {doctor.department}</p>
          </div>
          <div className="flex items-center gap-3">
            <VBadge status={s} />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close details"
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 sm:p-7 space-y-5 text-sm">
          {/* basic info */}
          <div className="grid grid-cols-2 gap-3.5 bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
            {[
              ['Email', doctor.email],
              ['Phone', doctor.phone || '—'],
              ['Medical License Reg. No.', doctor.medicalRegistrationNumber || '—'],
              ['Clinical Experience', doctor.experience ? `${doctor.experience} yrs` : doctor.experienceYears ? `${doctor.experienceYears} yrs` : '—'],
              ['Qualifications', doctor.qualifications || '—', true],
              ['Hospital / Clinic', doctor.clinicHospitalName || '—'],
              ['Address & City', [doctor.clinicAddress, doctor.city].filter(Boolean).join(', ') || '—'],
            ].map(([label, val, full]) => (
              <div key={label} className={full ? 'col-span-2' : ''}>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{label}</p>
                <p className="font-semibold text-slate-900 mt-0.5 text-xs sm:text-sm">{val}</p>
              </div>
            ))}
          </div>

          {/* documents */}
          {doctor.verificationDocuments?.length > 0 && (
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">Submitted Verification Documents</p>
              <ul className="space-y-2">
                {doctor.verificationDocuments.map((doc, i) => (
                  <li key={i} className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-white text-slate-700">
                    <FileText className="w-4 h-4 text-teal-600 shrink-0" />
                    <span className="text-xs font-semibold">{doc.documentName || doc.name || doc}</span>
                    {doc.documentUrl && (
                      <a
                        href={doc.documentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-auto text-teal-700 hover:text-teal-900 text-xs font-bold flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> View
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* reason */}
          {doctor.statusReason && (
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
              <p className="text-[10px] uppercase font-bold text-amber-800 tracking-wider mb-1">Last Status Reason</p>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">{doctor.statusReason}</p>
            </div>
          )}

          {/* audit trail */}
          {doctor.statusHistory?.length > 0 && (
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-teal-600" /> Audit Trail &amp; Verification History
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto p-3 rounded-2xl bg-slate-50 border border-slate-100">
                {doctor.statusHistory.map((h, i) => (
                  <div key={i} className="flex gap-2 text-xs text-slate-600">
                    <span className="w-2 h-2 rounded-full bg-teal-500 mt-1 shrink-0" />
                    <div>
                      <span className="font-bold text-slate-900">{h.fromStatus} → {h.toStatus}</span>
                      {h.reason && <span className="text-slate-500"> · "{h.reason}"</span>}
                      {(h.changedAt || h.timestamp) && (
                        <p className="text-[11px] text-slate-400 mt-0.5">{new Date(h.changedAt || h.timestamp).toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* actions */}
          <div className="border-t border-slate-100 pt-4 flex flex-wrap gap-2 justify-end">
            {s !== 'APPROVED' && (
              <button
                type="button"
                onClick={() => onAction('approve', doctor._id)}
                disabled={acting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-40 transition shadow-sm"
              >
                <CheckCircle className="w-4 h-4" /> Approve
              </button>
            )}
            {s !== 'NEEDS_CHANGES' && (
              <button
                type="button"
                onClick={() => onAction('request-changes', doctor._id)}
                disabled={acting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 disabled:opacity-40 transition"
              >
                <AlertCircle className="w-4 h-4" /> Request Changes
              </button>
            )}
            {s !== 'REJECTED' && (
              <button
                type="button"
                onClick={() => onAction('reject', doctor._id)}
                disabled={acting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 disabled:opacity-40 transition"
              >
                <XCircle className="w-4 h-4" /> Reject
              </button>
            )}
            {s === 'APPROVED' && (
              <button
                type="button"
                onClick={() => onAction('suspend', doctor._id)}
                disabled={acting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 disabled:opacity-40 transition"
              >
                <PauseCircle className="w-4 h-4" /> Suspend
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const AdminDoctorManagementPage = () => {
  const { success, error: toastError } = useToast();

  const [doctors, setDoctors]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [fetchError, setFetchError]     = useState('');
  const [activeTab, setActiveTab]       = useState('Pending');
  const [search, setSearch]             = useState('');
  const [selected, setSelected]         = useState(null);
  const [reasonModal, setReasonModal]   = useState(null);
  const [acting, setActing]             = useState(false);

  const fetchDoctors = async (tab, q) => {
    setLoading(true);
    setFetchError('');
    try {
      const params = {};
      const vs = STATUS_MAP[tab];
      if (vs) params.verificationStatus = vs;
      if (q && q.trim()) params.search = q.trim();
      const res = await adminAPI.getDoctors(params);
      setDoctors(res.data.doctors || []);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to load doctors';
      setFetchError(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDoctors(activeTab, search); }, [activeTab]);

  const handleSearch = (e) => { e.preventDefault(); fetchDoctors(activeTab, search); };

  const doAction = async (action, doctorId, reason) => {
    setActing(true);
    try {
      let res;
      if (action === 'approve')
        res = await adminAPI.approveDoctor(doctorId);
      else if (action === 'request-changes')
        res = await adminAPI.requestChanges(doctorId, { reason });
      else if (action === 'reject')
        res = await adminAPI.rejectDoctor(doctorId, { reason });
      else if (action === 'suspend')
        res = await adminAPI.suspendDoctor(doctorId, { reason });

      success(res?.data?.message || 'Action completed.');
      setReasonModal(null);
      setSelected(null);
      fetchDoctors(activeTab, search);
    } catch (err) {
      toastError(err.response?.data?.message || err.message || 'Action failed.');
    } finally {
      setActing(false);
    }
  };

  const initiateAction = (action, doctorId) => {
    if (action === 'approve') {
      doAction('approve', doctorId);
    } else {
      setReasonModal({ action, doctorId });
    }
  };

  const ACTION_LABELS = {
    'request-changes': 'Request Changes — Provide Reason',
    reject: 'Reject Application — Provide Reason',
    suspend: 'Suspend Doctor — Provide Reason',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6 sm:space-y-8">
      {/* Page Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-white via-white to-indigo-50/90 p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="absolute -right-8 -top-16 w-52 h-52 rounded-full bg-indigo-100/50 blur-3xl pointer-events-none" />
        <div className="relative space-y-1.5">
          <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider font-bold text-indigo-800 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
            <ShieldAlert className="w-3.5 h-3.5 text-indigo-600" /> Hospital Staff Verification
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Doctor Directory &amp; Credentialing
          </h1>
          <p className="text-sm text-slate-500 max-w-xl">
            Review incoming physician registration applications, verify state licenses, and manage doctor activation status.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchDoctors(activeTab, search)}
          disabled={loading}
          className="relative px-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-slate-700 hover:text-indigo-700 hover:bg-slate-50 text-xs font-bold transition flex items-center gap-2 shadow-sm self-start sm:self-center"
        >
          <RefreshCw className={`w-4 h-4 text-indigo-600 ${loading ? 'animate-spin' : ''}`} /> Refresh Roster
        </button>
      </div>

      {/* Tabs + Search Filter Bar */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-1.5 bg-slate-100/90 p-1.5 rounded-2xl">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === tab
                  ? 'bg-white text-teal-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearch} className="flex gap-2 w-full sm:w-80">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, specialty..."
              aria-label="Search doctor roster"
              className="w-full pl-10 pr-3 py-2.5 text-xs font-medium rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 rounded-2xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-sm transition"
          >
            Filter
          </button>
        </form>
      </div>

      {/* Error banner */}
      {fetchError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-sm px-4 py-3 rounded-2xl flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{fetchError}</span>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400 text-sm gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-teal-600" /> Loading physicians...
          </div>
        ) : doctors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 text-sm">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-2">
              <User className="w-6 h-6 text-slate-300" />
            </div>
            <p className="font-bold text-slate-700">No doctors match this filter</p>
            <p className="text-xs text-slate-400 mt-0.5">Try searching with a different keyword or tab.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3.5 px-5">Doctor Name &amp; Contact</th>
                  <th className="py-3.5 px-5">Specialty &amp; Dept</th>
                  <th className="py-3.5 px-5">Registration No.</th>
                  <th className="py-3.5 px-5">Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {doctors.map((doc) => (
                  <tr key={doc._id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-5">
                      <p className="font-bold text-slate-900">{doc.name}</p>
                      <p className="text-[11px] text-slate-400 font-normal">{doc.email}</p>
                    </td>
                    <td className="py-3.5 px-5">
                      <p className="font-bold text-slate-800">{doc.specialization}</p>
                      <p className="text-[11px] text-teal-700 font-semibold">{doc.department}</p>
                    </td>
                    <td className="py-3.5 px-5 text-xs font-mono font-semibold text-slate-600">
                      {doc.medicalRegistrationNumber || '—'}
                    </td>
                    <td className="py-3.5 px-5">
                      <VBadge status={doc.verificationStatus} />
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center gap-1.5 justify-end">
                        <button
                          type="button"
                          onClick={() => setSelected(doc)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition shadow-sm"
                        >
                          Review Dossier
                        </button>
                        {doc.verificationStatus !== 'APPROVED' && (
                          <button
                            type="button"
                            onClick={() => initiateAction('approve', doc._id)}
                            disabled={acting}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-40 transition shadow-sm"
                          >
                            Approve
                          </button>
                        )}
                        {doc.verificationStatus === 'APPROVED' && (
                          <button
                            type="button"
                            onClick={() => initiateAction('suspend', doc._id)}
                            disabled={acting}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 disabled:opacity-40 transition"
                          >
                            Suspend
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <DetailModal
          doctor={selected}
          onClose={() => setSelected(null)}
          onAction={initiateAction}
          acting={acting}
        />
      )}

      {/* Reason modal */}
      {reasonModal && (
        <ReasonModal
          title={ACTION_LABELS[reasonModal.action] || 'Provide Reason'}
          submitting={acting}
          onClose={() => setReasonModal(null)}
          onConfirm={(reason) => doAction(reasonModal.action, reasonModal.doctorId, reason)}
        />
      )}
    </div>
  );
};

export default AdminDoctorManagementPage;
