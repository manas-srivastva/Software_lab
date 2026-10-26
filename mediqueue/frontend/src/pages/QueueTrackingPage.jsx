import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { queueAPI, doctorAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import StatusBadge from '../components/StatusBadge';
import {
  Clock,
  RefreshCw,
  Users,
  CheckCircle2,
  AlertCircle,
  PlayCircle,
  Stethoscope,
  ArrowRight,
  ShieldAlert,
  ChevronRight,
  MapPin,
  Calendar,
  Sparkles,
  Info,
  Building2,
} from 'lucide-react';

const QueueTrackingPage = () => {
  const { user, isStaff, isAuthenticated, isPatient } = useAuth();
  const canCallNext =
    ['receptionist', 'orgAdmin'].includes(user?.role) ||
    user?.roles?.includes('orgAdmin');
  const canCompleteConsultation = user?.role === 'doctor';
  const isDoctor = canCompleteConsultation;
  const { success, error: toastError } = useToast();

  const [queueData, setQueueData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Doctor board state for hospital live board / staff management
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [doctorQueue, setDoctorQueue] = useState(null);
  const [loadingDoctorQueue, setLoadingDoctorQueue] = useState(false);
  const [advancingQueueId, setAdvancingQueueId] = useState(null);

  // Fetch patient personal queue status
  const fetchMyStatus = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      if (isPatient) {
        const res = await queueAPI.getMyStatus();
        setQueueData(res.data);
      }
    } catch (err) {
      if (isManual) toastError('Failed to refresh queue status');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch doctors list for hospital board
  const fetchDoctors = async () => {
    try {
      const res = await doctorAPI.getDoctors();
      const list = res.data.doctors || [];
      setDoctors(list);
      if (list.length > 0 && !selectedDoctorId) {
        setSelectedDoctorId(list[0]._id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch doctor board queue
  const fetchDoctorQueue = async (docId) => {
    if (!docId) return;
    setLoadingDoctorQueue(true);
    try {
      const res = await queueAPI.getDoctorQueue(docId);
      setDoctorQueue(res.data);
    } catch (err) {
      console.error('Error fetching doctor queue:', err);
    } finally {
      setLoadingDoctorQueue(false);
    }
  };

  useEffect(() => {
    fetchMyStatus();
    fetchDoctors();
  }, [isPatient]);

  useEffect(() => {
    if (selectedDoctorId) {
      fetchDoctorQueue(selectedDoctorId);
    }
  }, [selectedDoctorId]);

  // Handle Staff advancing the queue
  const handleAdvanceQueue = async (queueId, targetStatus) => {
    setAdvancingQueueId(queueId);
    try {
      const res = await queueAPI.advanceQueue(queueId, { targetStatus });
      success(res.data.message || 'Queue advanced successfully!');
      // Refresh both views
      await fetchDoctorQueue(selectedDoctorId);
      if (isPatient) await fetchMyStatus(true);
    } catch (err) {
      toastError(err.message || 'Failed to advance queue (Requires Staff authorization)');
    } finally {
      setAdvancingQueueId(null);
    }
  };

  const hasTicket = queueData?.hasActiveQueue && queueData?.queue;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
      {/* Page Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-white via-white to-teal-50/80 p-6 sm:p-8 rounded-3xl border border-teal-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="absolute -right-10 -top-20 h-56 w-56 rounded-full bg-teal-100/60 blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider font-bold text-teal-800 bg-teal-50 px-3 py-1 rounded-full border border-teal-200/80">
              Live Patient Queue Monitor
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
              </span>
              Live Sync
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-3">
            Real-Time Token Tracking
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
            Monitor your position in line, estimated wait times, and hospital OPD room progression.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            fetchMyStatus(true);
            if (selectedDoctorId) fetchDoctorQueue(selectedDoctorId);
          }}
          disabled={refreshing}
          className="relative px-5 py-3 rounded-xl border border-slate-200 bg-white/90 text-slate-700 hover:text-teal-700 hover:bg-white hover:border-teal-200 font-bold text-xs transition-all flex items-center gap-2 shadow-sm shrink-0 disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 text-teal-600 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing Status...' : 'Refresh Live Status'}
        </button>
      </div>

      {/* Main Section: Patient's Personal Token Banner */}
      {!isAuthenticated ? (
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/90 shadow-sm text-center max-w-xl mx-auto space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-100 text-teal-600 flex items-center justify-center mx-auto">
            <Clock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900">
            Sign In to Track Your Personal Token
          </h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            Log in to view your personalized queue ticket number, current token being served, and live waiting forecast.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Link
              to="/login"
              className="px-6 py-2.5 rounded-xl font-bold text-white bg-teal-600 hover:bg-teal-700 text-xs shadow-md shadow-teal-700/20 transition"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="px-6 py-2.5 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 text-xs transition"
            >
              Register
            </Link>
          </div>
        </div>
      ) : !isPatient ? (
        <div className="bg-white rounded-3xl p-8 border border-slate-200/90 shadow-sm text-center max-w-xl mx-auto space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center mx-auto border border-purple-100">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Staff &amp; Admin Queue Overview
          </h2>
          <p className="text-sm text-slate-500">
            You are signed in as hospital staff. Use the live OPD board below or open the Staff Desk to advance patient tokens.
          </p>
          <div className="pt-2">
            <Link
              to="/staff/queue"
              className="px-5 py-2.5 rounded-xl font-bold text-white bg-purple-700 hover:bg-purple-800 text-xs shadow-sm transition inline-flex items-center gap-2"
            >
              Open Staff Queue Desk <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      ) : loading ? (
        <div className="py-20 text-center text-slate-400 text-sm">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-teal-600" />
          Retrieving live queue ticket data...
        </div>
      ) : hasTicket ? (
        /* Spotlight: Prominent Patient Token Display Card */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
          {/* Big Token Ticket (Left 7 Cols) */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-lg shadow-slate-200/40 flex flex-col justify-between space-y-6">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-100 text-teal-700 flex items-center justify-center font-black text-xs shrink-0">
                  OPD
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Dr. {queueData.queue?.doctorId?.name}
                  </h3>
                  <p className="text-xs font-semibold text-teal-700">
                    {queueData.queue?.doctorId?.specialization} • {queueData.queue?.doctorId?.department}
                  </p>
                </div>
              </div>

              <StatusBadge status={queueData.queue?.status} />
            </div>

            {/* Huge Prominent Token Visual */}
            <div className="py-8 px-6 rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 text-white text-center shadow-inner relative overflow-hidden">
              <div className="absolute top-3 right-4 text-[10px] uppercase font-bold tracking-widest text-teal-400/80">
                Date: {queueData.queue?.date}
              </div>

              <span className="text-xs uppercase tracking-widest font-extrabold text-teal-300">
                YOUR ISSUED TOKEN NUMBER
              </span>

              <div className="text-7xl sm:text-8xl font-black tracking-tight text-white my-2">
                #{queueData.queue?.tokenNumber}
              </div>

              <p className="text-xs text-slate-300 max-w-sm mx-auto">
                Room: <span className="font-bold text-white">{queueData.queue?.doctorId?.roomNumber || 'Consultation Room'}</span>
                {' '}• Please remain in or near the OPD lounge.
              </p>
            </div>

            {/* Waiting metrics summary */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Currently Serving
                </p>
                <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-0.5">
                  #{queueData.currentTokenBeingServed || 0}
                </p>
                <span className="text-[10px] text-teal-700 font-semibold block truncate">In Consultation</span>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-100">
                <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-amber-800">
                  Patients Ahead
                </p>
                <p className="text-2xl sm:text-3xl font-black text-amber-700 mt-0.5">
                  {queueData.patientsAhead}
                </p>
                <span className="text-[10px] text-amber-600 font-semibold block truncate">Waiting before you</span>
              </div>

              <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-100">
                <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-teal-900">
                  Est. Wait Time
                </p>
                <p className="text-2xl sm:text-3xl font-black text-teal-700 mt-0.5">
                  ~{queueData.estimatedWaitMinutes} <span className="text-xs sm:text-sm font-bold">min</span>
                </p>
                <span className="text-[10px] text-teal-700 font-semibold block truncate">
                  Avg: {queueData.averageConsultationMinutes}m / pt
                </span>
              </div>
            </div>
          </div>

          {/* Queue Guidance & Live Tips (Right 5 Cols) */}
          <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-teal-600" />
                Queue Guidelines &amp; Protocol
              </h3>

              <div className="space-y-3 text-xs text-slate-600">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center shrink-0 font-bold text-[11px]">
                    1
                  </div>
                  <div>
                    <span className="font-bold text-slate-800">Automated Queue Sync:</span> Tokens advance as doctors complete patient consultations. Refresh this screen anytime to see your updated rank.
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center shrink-0 font-bold text-[11px]">
                    2
                  </div>
                  <div>
                    <span className="font-bold text-slate-800">Turn Alert:</span> When 1 patient is ahead, please move directly to the consultation room door.
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center shrink-0 font-bold text-[11px]">
                    3
                  </div>
                  <div>
                    <span className="font-bold text-slate-800">Assigned Room:</span> Proceed to {queueData.queue?.doctorId?.roomNumber || 'Consultation Room'} when your number is called.
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-teal-50/80 border border-teal-200 text-xs text-teal-950 space-y-2">
              <p className="font-bold flex items-center gap-1.5 text-teal-900">
                <Info className="w-4 h-4 text-teal-600" /> Need Assistance?
              </p>
              <p className="text-[11px] text-teal-800 leading-relaxed">
                If you require wheelchair access, lab diagnostics, or pharmacy guidance, please notify the central reception desk.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Empty Queue State: No ticket */
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/90 shadow-sm text-center max-w-xl mx-auto space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 text-slate-400 flex items-center justify-center mx-auto">
            <Clock className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">No Active Queue Token</h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
            You don't currently have an active waiting token. Go to "My Appointments" to check in and receive a sequential token number.
          </p>
          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <Link
              to="/appointments"
              className="px-5 py-2.5 rounded-xl font-bold text-white bg-teal-600 hover:bg-teal-700 text-xs shadow-md shadow-teal-700/20 transition"
            >
              Go to My Appointments
            </Link>
            {isPatient && (
              <Link
                to="/book-appointment"
                className="px-5 py-2.5 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 text-xs transition"
              >
                Book New Visit
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Hospital Live OPD Board */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                Hospital OPD Live Queue Board
              </h2>
              {isStaff || isDoctor ? (
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  {isDoctor ? 'Doctor Mode (Assigned Consultations)' : 'Staff Mode (Queue Management)'}
                </span>
              ) : (
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  Public Board View
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Select any doctor to view their live token sequence for today
            </p>
          </div>

          {/* Doctor selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 shrink-0">Doctor:</span>
            <select
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              aria-label="Filter board by Doctor"
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-teal-500 bg-white"
            >
              {doctors.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name} ({d.specialization})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Doctor Queue Metrics Summary */}
        {doctorQueue && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-center">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Tokens</p>
              <p className="text-2xl font-black text-slate-900 mt-0.5">{doctorQueue.summary?.totalTokens || 0}</p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-100">
              <p className="text-[10px] text-amber-800 font-bold uppercase tracking-wider">Waiting</p>
              <p className="text-2xl font-black text-amber-700 mt-0.5">{doctorQueue.summary?.waitingCount || 0}</p>
            </div>

            <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-100">
              <p className="text-[10px] text-teal-900 font-bold uppercase tracking-wider">Currently Serving</p>
              <p className="text-2xl font-black text-teal-700 mt-0.5">
                {doctorQueue.summary?.currentServingToken ? `#${doctorQueue.summary.currentServingToken}` : 'None'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-100/80 border border-slate-200">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Completed</p>
              <p className="text-2xl font-black text-slate-700 mt-0.5">{doctorQueue.summary?.completedCount || 0}</p>
            </div>
          </div>
        )}

        {/* Live Tokens Table */}
        {loadingDoctorQueue ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-teal-600" />
            Loading doctor queue table...
          </div>
        ) : !doctorQueue || doctorQueue.queueEntries?.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-2xl">
            No patients checked into this doctor's queue for today yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-y border-slate-100">
                <tr>
                  <th className="py-3 px-4">Token #</th>
                  <th className="py-3 px-4">Patient Name</th>
                  <th className="py-3 px-4">Slot Time</th>
                  <th className="py-3 px-4">Queue Status</th>
                  <th className="py-3 px-4 text-right">
                    {canCallNext || canCompleteConsultation ? 'Queue Action' : 'Status'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {doctorQueue.queueEntries.map((item) => {
                  const isCurrent = item.status === 'in-consultation';
                  const isWaiting = item.status === 'waiting';

                  return (
                    <tr
                      key={item._id}
                      className={`transition ${
                        isCurrent ? 'bg-teal-50/50 font-semibold' : 'hover:bg-slate-50/70'
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <span
                          className={`font-black text-sm px-2.5 py-1 rounded-xl ${
                            isCurrent
                              ? 'bg-teal-600 text-white shadow-sm'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          #{item.tokenNumber}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {item.patientId?.name || 'Patient'}
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-slate-700">
                        {item.appointmentId?.time || '—'}
                      </td>

                      <td className="py-3.5 px-4">
                        <StatusBadge status={item.status} />
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {canCallNext || canCompleteConsultation ? (
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            {isWaiting && canCallNext && (
                              <button
                                type="button"
                                onClick={() => handleAdvanceQueue(item._id, 'in-consultation')}
                                disabled={advancingQueueId === item._id}
                                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 transition disabled:opacity-50 shadow-sm"
                              >
                                {advancingQueueId === item._id ? 'Updating...' : 'Call In'}
                              </button>
                            )}

                            {isCurrent && canCompleteConsultation && (
                              <button
                                type="button"
                                onClick={() => handleAdvanceQueue(item._id, 'completed')}
                                disabled={advancingQueueId === item._id}
                                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition disabled:opacity-50 shadow-sm"
                              >
                                {advancingQueueId === item._id ? 'Updating...' : 'Complete Visit'}
                              </button>
                            )}

                            {(!isWaiting && !isCurrent) ||
                              (isWaiting && canCompleteConsultation) ||
                              (isCurrent && canCallNext) ? (
                              <span className="text-[11px] text-slate-400 font-semibold">Done</span>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">
                            {item.status === 'in-consultation' ? 'Now inside' : 'Patient view'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Hint on testing role permissions */}
        {isPatient && (
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 flex items-start gap-3">
            <ShieldAlert className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-800">Testing Staff Queue Controls?</span>{' '}
              Queue advancement is strictly role-protected on the backend: receptionists and organisation admins call the next patient, while assigned doctors complete consultations. To test queue controls, sign in with staff credentials:{' '}
              <span className="font-bold text-purple-700">receptionist@mediqueue.com</span> (Password:{' '}
              <span className="font-bold">password123</span>).
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QueueTrackingPage;
