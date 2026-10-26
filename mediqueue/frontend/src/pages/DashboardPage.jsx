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
  User,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Stethoscope,
  Activity,
  Layers,
  Phone,
  MapPin,
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Profile Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider font-bold text-teal-600 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-100">
              Patient Portal
            </span>
            <span className="text-xs text-slate-400 font-medium">
              ID: {user?._id?.substring(user?._id?.length - 6).toUpperCase()}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Welcome back, {user?.name || 'Patient'}!
          </h1>
          <p className="text-sm text-slate-500">
            Manage your medical consultations, appointments, and live queue tracking.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            title="Refresh dashboard"
            className="p-3 rounded-xl border border-slate-200 text-slate-600 hover:text-teal-600 hover:bg-slate-50 transition"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {isPatient && <Link
            to="/book-appointment"
            className="px-5 py-3 rounded-xl font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-md shadow-teal-600/30 transition flex items-center gap-2 text-sm"
          >
            <PlusCircle className="w-4 h-4" />
            Book Appointment
          </Link>}
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card 1: Upcoming */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
            <Calendar className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Upcoming Visits
            </p>
            <p className="text-3xl font-black text-slate-900 mt-1">
              {upcomingAppointments.length}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">Active medical bookings</p>
          </div>
        </div>

        {/* Card 2: Total History */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
            <Layers className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Appointments
            </p>
            <p className="text-3xl font-black text-slate-900 mt-1">
              {totalAppointments}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">Lifetime consultations</p>
          </div>
        </div>

        {/* Card 3: Live Queue Status */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex items-center gap-4 sm:col-span-2 lg:col-span-1">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Clock className="w-7 h-7" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Active Queue Token
            </p>
            {queueStatus?.hasActiveQueue ? (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-3xl font-black text-teal-600">
                  #{queueStatus.queue?.tokenNumber}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
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
              className="text-xs font-bold text-teal-600 hover:text-teal-700 inline-flex items-center gap-1 mt-1"
            >
              View live board <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Active Queue Banner if user has waiting token */}
      {queueStatus?.hasActiveQueue && (
        <div className="p-6 rounded-3xl bg-gradient-to-r from-teal-900 to-slate-900 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-400 shrink-0">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold border border-teal-500/30 mb-1">
                Live Queue In Progress
              </div>
              <h3 className="text-xl font-bold text-white">
                Token #{queueStatus.queue?.tokenNumber} for Dr. {queueStatus.queue?.doctorId?.name}
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                Currently Serving: Token #{queueStatus.currentTokenBeingServed || 0} • Estimated wait: ~{queueStatus.estimatedWaitMinutes} minutes
              </p>
            </div>
          </div>

          <Link
            to="/queue"
            className="px-6 py-3 rounded-xl font-bold text-slate-900 bg-teal-400 hover:bg-teal-300 transition text-sm flex items-center justify-center gap-2 shrink-0"
          >
            Open Live Token Screen
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Patient's Appointments List */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              Recent Appointments
            </h2>
            <p className="text-xs text-slate-500">
              Your scheduled clinic visits and status
            </p>
          </div>
          <Link
            to="/appointments"
            className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1"
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
          <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No appointments scheduled</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-5">
              You haven't booked any medical appointments yet. Choose a doctor and reserve a time slot.
            </p>
            {isPatient && <Link
              to="/book-appointment"
              className="px-5 py-2.5 rounded-xl font-bold text-white bg-teal-600 hover:bg-teal-700 text-xs inline-flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              Book Now
            </Link>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider border-y border-slate-100">
                <tr>
                  <th className="py-3 px-4">Doctor & Department</th>
                  <th className="py-3 px-4">Date & Slot</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {appointments.slice(0, 5).map((appt) => {
                  const isCheckedIn = appt.status === 'checked-in' || !!appt.queueEntry;
                  const canCheckIn =
                    appt.status === 'confirmed' &&
                    appt.date === getTodayDate() &&
                    !isCheckedIn;

                  return (
                    <tr key={appt._id} className="hover:bg-slate-50/70 transition">
                      <td className="py-4 px-4 font-medium text-slate-900">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs shrink-0">
                            Dr
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{appt.doctorId?.name}</p>
                            <p className="text-xs text-slate-500">
                              {appt.doctorId?.specialization} • {appt.doctorId?.department}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="font-semibold text-slate-800">{appt.date}</div>
                        <div className="text-xs text-slate-500">{appt.time}</div>
                      </td>

                      <td className="py-4 px-4 max-w-xs truncate text-xs text-slate-600">
                        {appt.reason}
                      </td>

                      <td className="py-4 px-4">
                        <StatusBadge status={appt.status} />
                      </td>

                      <td className="py-4 px-4 text-right">
                        {canCheckIn ? (
                          <button
                            onClick={() => handleCheckIn(appt._id)}
                            disabled={checkingInId === appt._id}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-sm transition disabled:opacity-50"
                          >
                            {checkingInId === appt._id ? 'Generating...' : 'Check In'}
                          </button>
                        ) : isCheckedIn ? (
                          <Link
                            to="/queue"
                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition"
                          >
                            Track Token
                          </Link>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">None</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
