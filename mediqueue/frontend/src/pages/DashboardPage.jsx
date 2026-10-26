import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { appointmentAPI, queueAPI } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import {
  Calendar,
  Clock,
  PlusCircle,
  RefreshCw,
  ArrowRight,
  Activity,
  Layers,
  MapPin,
  Sparkles,
  Stethoscope,
  ChevronRight,
} from 'lucide-react';

const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const DashboardPage = () => {
  const { user, isPatient } = useAuth();
  const { success, error: toastError } = useToast();

  const [appointments, setAppointments] = useState([]);
  const [queueStatus, setQueueStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkingInId, setCheckingInId] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [apptRes, queueRes] = await Promise.allSettled([
        appointmentAPI.getMyAppointments(),
        queueAPI.getMyStatus(),
      ]);

      if (apptRes.status === 'fulfilled') {
        setAppointments(apptRes.value.data.appointments || []);
      }

      if (queueRes.status === 'fulfilled') {
        setQueueStatus(queueRes.value.data);
      }
    } catch (err) {
      toastError('Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCheckIn = async (appointmentId) => {
    setCheckingInId(appointmentId);
    try {
      const res = await queueAPI.checkIn(appointmentId);
      success(res.data.message || 'Checked in successfully!');
      await fetchData();
    } catch (err) {
      toastError(err.message || 'Check-in failed');
    } finally {
      setCheckingInId(null);
    }
  };

  // Metrics
  const upcomingAppointments = appointments.filter(
    (a) => ['confirmed', 'checked-in', 'in-consultation'].includes(a.status)
  );
  const totalAppointments = appointments.length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6 sm:space-y-8">
      {/* Header Profile Greeting */}
      <div className="relative overflow-hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 bg-gradient-to-br from-white via-white to-teal-50/90 p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-sm">
        <div className="absolute -right-10 -top-16 w-56 h-56 rounded-full bg-teal-100/60 blur-3xl pointer-events-none" />
        <div className="relative space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider font-bold text-teal-800 bg-teal-50 px-3 py-1 rounded-full border border-teal-200/80">
              <Sparkles className="w-3.5 h-3.5 text-teal-600" /> Patient Portal
            </span>
            <span className="text-xs text-slate-400 font-medium">
              ID: {user?._id?.substring(user?._id?.length - 6).toUpperCase()}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Welcome back, {user?.name || 'Patient'}
          </h1>
          <p className="text-sm text-slate-500 max-w-xl">
            Your personal healthcare dashboard. Review upcoming appointments, check in on arrival, and monitor your OPD queue position in real time.
          </p>
        </div>

        <div className="relative flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={fetchData}
            title="Refresh dashboard"
            aria-label="Refresh dashboard data"
            className="p-3 rounded-2xl border border-slate-200 bg-white text-slate-600 hover:text-teal-700 hover:bg-slate-50 transition shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {isPatient && (
            <Link
              to="/book-appointment"
              className="px-5 py-3 rounded-2xl font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-md shadow-teal-700/20 transition hover:-translate-y-0.5 flex items-center gap-2 text-xs sm:text-sm"
            >
              <PlusCircle className="w-4 h-4" />
              Book Appointment
            </Link>
          )}
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {/* Card 1: Upcoming */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm flex items-center gap-4 hover:shadow-md transition">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 text-teal-700 flex items-center justify-center shrink-0">
            <Calendar className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Upcoming Visits
            </p>
            <p className="text-3xl font-black text-slate-900 mt-0.5">
              {upcomingAppointments.length}
            </p>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">Active clinic bookings</p>
          </div>
        </div>

        {/* Card 2: Total History */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm flex items-center gap-4 hover:shadow-md transition">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-100 text-sky-700 flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total Appointments
            </p>
            <p className="text-3xl font-black text-slate-900 mt-0.5">
              {totalAppointments}
            </p>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">Lifetime consultations</p>
          </div>
        </div>

        {/* Card 3: Live Queue Status */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm flex items-center gap-4 sm:col-span-2 lg:col-span-1 hover:shadow-md transition">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Active Queue Token
            </p>
            {queueStatus?.hasActiveQueue ? (
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-3xl font-black text-teal-700">
                  #{queueStatus.queue?.tokenNumber}
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                  {queueStatus.patientsAhead} ahead
                </span>
              </div>
            ) : (
              <p className="text-sm font-semibold text-slate-600 mt-1">
                No active token
              </p>
            )}
            <Link
              to="/queue"
              className="text-xs font-bold text-teal-700 hover:text-teal-900 inline-flex items-center gap-1 mt-1"
            >
              View live board <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Active Queue Banner if user has waiting token */}
      {queueStatus?.hasActiveQueue && (
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-teal-950 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />
          <div className="flex items-start gap-4 relative">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-400 shrink-0">
              <Activity className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold border border-teal-500/30 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                Live OPD Queue in Progress
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white">
                Token #{queueStatus.queue?.tokenNumber} • Dr. {queueStatus.queue?.doctorId?.name}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                Currently Serving: <strong className="text-white">Token #{queueStatus.currentTokenBeingServed || 0}</strong> • Estimated wait: ~{queueStatus.estimatedWaitMinutes} min
              </p>
            </div>
          </div>

          <Link
            to="/queue"
            className="px-6 py-3.5 rounded-2xl font-bold text-slate-950 bg-teal-400 hover:bg-teal-300 transition shadow-lg shadow-teal-400/20 text-xs sm:text-sm flex items-center justify-center gap-2 shrink-0 relative"
          >
            Open Live Token Screen
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Patient's Appointments List */}
      <div className="bg-white rounded-3xl p-5 sm:p-8 border border-slate-200/90 shadow-sm space-y-5 sm:space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
              Your Appointments
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Recent doctor visits, check-in status, and medical records
            </p>
          </div>
          <Link
            to="/appointments"
            className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1"
          >
            View All ({appointments.length}) <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-600" />
            Loading appointments...
          </div>
        ) : appointments.length === 0 ? (
          <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-3xl p-6">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No appointments scheduled</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-5 leading-relaxed">
              You haven't booked any medical appointments yet. Choose a specialist and reserve a time slot.
            </p>
            {isPatient && (
              <Link
                to="/book-appointment"
                className="px-5 py-2.5 rounded-xl font-bold text-white bg-teal-600 hover:bg-teal-700 text-xs inline-flex items-center gap-2 shadow-sm"
              >
                <PlusCircle className="w-4 h-4" />
                Book Now
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {appointments.slice(0, 5).map((appt) => {
              const isCheckedIn = appt.status === 'checked-in' || !!appt.queueEntry;
              const canCheckIn =
                appt.status === 'confirmed' &&
                appt.date === getTodayDate() &&
                !isCheckedIn;

              return (
                <article
                  key={appt._id}
                  className="group rounded-2xl border border-slate-200/90 p-4 sm:p-5 hover:border-teal-200 hover:shadow-md transition-all bg-white"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-100 text-teal-700 flex items-center justify-center font-extrabold text-xs shrink-0 shadow-sm">
                        Dr
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate">
                          {appt.doctorId?.name || 'Physician'}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {appt.doctorId?.specialization || 'Medical Specialist'}
                          {appt.doctorId?.department ? ` · ${appt.doctorId.department}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:flex sm:items-center gap-3 sm:gap-6 pl-14 sm:pl-0">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Date &amp; Time</p>
                        <p className="text-xs font-bold text-slate-800 mt-0.5">{appt.date} · {appt.time}</p>
                      </div>
                      <div className="sm:min-w-32">
                        <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Status</p>
                        <StatusBadge status={appt.status} />
                      </div>
                    </div>

                    <div className="sm:ml-auto pl-14 sm:pl-0">
                      {canCheckIn ? (
                        <button
                          type="button"
                          onClick={() => handleCheckIn(appt._id)}
                          disabled={checkingInId === appt._id}
                          className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-sm transition disabled:opacity-50"
                        >
                          {checkingInId === appt._id ? 'Generating...' : 'Check In'}
                        </button>
                      ) : isCheckedIn ? (
                        <Link
                          to="/queue"
                          className="inline-flex items-center justify-center gap-1.5 w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition"
                        >
                          Track token <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">Upcoming</span>
                      )}
                    </div>
                  </div>

                  {appt.reason && (
                    <p className="mt-3 sm:ml-14 text-xs text-slate-500 border-t border-slate-100 pt-3">
                      <span className="font-semibold text-slate-700">Clinical reason:</span> {appt.reason}
                    </p>
                  )}

                  {appt.orgId?.name && (
                    <p className="mt-2 sm:ml-14 flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {appt.orgId.name}
                      {appt.orgId.city ? ` · ${appt.orgId.city}` : ''}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
