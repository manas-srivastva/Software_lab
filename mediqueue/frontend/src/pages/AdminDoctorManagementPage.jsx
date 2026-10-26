import React, { useEffect, useState } from 'react';
import { adminAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import {
  Search, RefreshCw, CheckCircle, XCircle, AlertCircle,
  PauseCircle, X, Clock, User, FileText, Eye,
} from 'lucide-react';

const TABS = ['Pending', 'Approved', 'All'];
const STATUS_MAP = { Pending: 'PENDING', Approved: 'APPROVED', All: '' };

/* ── small inline badge, no external StatusBadge dependency ── */
const VBadge = ({ status }) => {
  const cfg = {
    APPROVED:      'bg-emerald-50 text-emerald-700 border-emerald-200',
    PENDING:       'bg-blue-50 text-blue-700 border-blue-200',
    NEEDS_CHANGES: 'bg-amber-50 text-amber-700 border-amber-200',
    REJECTED:      'bg-rose-50 text-rose-700 border-rose-200',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900">{title}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          rows={4}
          placeholder="Provide a clear reason (min 3 characters)..."
          className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
        />
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={reason.trim().length < 3 || submitting}
            className="px-4 py-2 text-sm font-semibold rounded-xl text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-40"
          >
            {submitting ? 'Submitting…' : 'Confirm'}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* header */}
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <div>
            <p className="font-bold text-slate-900">{doctor.name}</p>
            <p className="text-xs text-slate-500">{doctor.specialization} · {doctor.department}</p>
          </div>
          <div className="flex items-center gap-3">
            <VBadge status={s} />
            <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
          </div>
        </div>

        <div className="p-6 space-y-5 text-sm">
          {/* basic info */}
          <div className="grid grid-cols-2 gap-3">
            {[
              ['Email', doctor.email],
              ['Phone', doctor.phone || '—'],
              ['Reg. No.', doctor.medicalRegistrationNumber || '—'],
              ['Experience', doctor.experience ? `${doctor.experience} yrs` : doctor.experienceYears ? `${doctor.experienceYears} yrs` : '—'],
              ['Qualifications', doctor.qualifications || '—', true],
              ['Clinic', doctor.clinicHospitalName || '—'],
              ['Address', doctor.clinicAddress || '—'],
            ].map(([label, val, full]) => (
              <div key={label} className={full ? 'col-span-2' : ''}>
                <p className="text-[10px] uppercase font-bold text-slate-400">{label}</p>
                <p className="font-medium text-slate-800 mt-0.5">{val}</p>
              </div>
            ))}
          </div>

          {/* documents */}
          {doctor.verificationDocuments?.length > 0 && (
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 mb-2">Documents</p>
              <ul className="space-y-1.5">
                {doctor.verificationDocuments.map((doc, i) => (
                  <li key={i} className="flex items-center gap-2 text-slate-700">
                    <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="text-xs">{doc.documentName || doc.name || doc}</span>
                    {doc.documentUrl && (
                      <a href={doc.documentUrl} target="_blank" rel="noreferrer"
                        className="ml-auto text-teal-600 hover:underline text-xs flex items-center gap-1">
                        <Eye className="w-3 h-3" /> View
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* reason */}
          {doctor.statusReason && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
              <p className="text-[10px] uppercase font-bold text-amber-600 mb-1">Last Status Reason</p>
              <p className="text-sm text-slate-700">{doctor.statusReason}</p>
            </div>
          )}

          {/* audit trail */}
          {doctor.statusHistory?.length > 0 && (
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 mb-2 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Audit Trail
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {doctor.statusHistory.map((h, i) => (
                  <div key={i} className="flex gap-2 text-xs text-slate-600">
                    <span className="w-2 h-2 rounded-full bg-teal-400 mt-1 shrink-0" />
                    <div>
                      <span className="font-semibold">{h.fromStatus} → {h.toStatus}</span>
                      {h.reason && <span className="text-slate-400"> · "{h.reason}"</span>}
                      {(h.changedAt || h.timestamp) && (
                        <p className="text-slate-400">{new Date(h.changedAt || h.timestamp).toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* actions */}
          <div className="border-t border-slate-100 pt-4 flex flex-wrap gap-2">
            {s !== 'APPROVED' && (
              <button onClick={() => onAction('approve', doctor._id)} disabled={acting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-40">
                <CheckCircle className="w-4 h-4" /> Approve
              </button>
            )}
            {s !== 'NEEDS_CHANGES' && (
              <button onClick={() => onAction('request-changes', doctor._id)} disabled={acting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 disabled:opacity-40">
                <AlertCircle className="w-4 h-4" /> Request Changes
              </button>
            )}
            {s !== 'REJECTED' && (
              <button onClick={() => onAction('reject', doctor._id)} disabled={acting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 disabled:opacity-40">
                <XCircle className="w-4 h-4" /> Reject
              </button>
            )}
            {s === 'APPROVED' && (
              <button onClick={() => onAction('suspend', doctor._id)} disabled={acting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 disabled:opacity-40">
                <PauseCircle className="w-4 h-4" /> Suspend
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════
   Main page
══════════════════════════════════════════════════════ */
const AdminDoctorManagementPage = () => {
  const { success, error: toastError } = useToast();

  const [doctors, setDoctors]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [fetchError, setFetchError]     = useState('');
  const [activeTab, setActiveTab]       = useState('Pending');
  const [search, setSearch]             = useState('');
  const [selected, setSelected]         = useState(null);
  const [reasonModal, setReasonModal]   = useState(null); // { action, doctorId }
  const [acting, setActing]             = useState(false);

  /* ── fetch ── */
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

  /* ── action handler ── */
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

  /* approve doesn't need reason; others do */
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

      {/* page header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Doctor Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">Review applications, approve, reject, or suspend doctor accounts.</p>
        </div>
        <button onClick={() => fetchDoctors(activeTab, search)} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 self-start">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* tabs + search bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${activeTab === tab ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {tab}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearch} className="flex gap-2 w-full sm:w-72">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search name, specialty…"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <button type="submit"
            className="px-3 py-2 rounded-xl text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700">
            Go
          </button>
        </form>
      </div>

      {/* error banner */}
      {fetchError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 rounded-xl">
          ⚠ {fetchError}
        </div>
      )}

      {/* table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400 text-sm gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" /> Loading doctors…
          </div>
        ) : doctors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-sm">
            <User className="w-10 h-10 mb-3 text-slate-200" />
            No doctors found for this filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-100">
                <tr>
                  <th className="py-3 px-5">Doctor</th>
                  <th className="py-3 px-5">Specialization</th>
                  <th className="py-3 px-5">Reg. No.</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {doctors.map(doc => (
                  <tr key={doc._id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-5">
                      <p className="font-semibold text-slate-900">{doc.name}</p>
                      <p className="text-xs text-slate-400">{doc.email}</p>
                    </td>
                    <td className="py-3.5 px-5 text-slate-600">
                      <p>{doc.specialization}</p>
                      <p className="text-xs text-slate-400">{doc.department}</p>
                    </td>
                    <td className="py-3.5 px-5 text-xs font-mono text-slate-500">
                      {doc.medicalRegistrationNumber || '—'}
                    </td>
                    <td className="py-3.5 px-5">
                      <VBadge status={doc.verificationStatus} />
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => setSelected(doc)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-100">
                          Review
                        </button>
                        {doc.verificationStatus !== 'APPROVED' && (
                          <button onClick={() => initiateAction('approve', doc._id)} disabled={acting}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-40">
                            Approve
                          </button>
                        )}
                        {doc.verificationStatus === 'APPROVED' && (
                          <button onClick={() => initiateAction('suspend', doc._id)} disabled={acting}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 disabled:opacity-40">
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

      {/* detail modal */}
      {selected && (
        <DetailModal
          doctor={selected}
          onClose={() => setSelected(null)}
          onAction={initiateAction}
          acting={acting}
        />
      )}

      {/* reason modal */}
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
