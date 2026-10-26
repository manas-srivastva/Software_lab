import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { appointmentAPI, queueAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import StatusBadge from '../components/StatusBadge';
import ConfirmModal from '../components/ConfirmModal';
import {
  Calendar,
  Clock,
  MapPin,
  RefreshCw,
  PlusCircle,
  XCircle,
  CheckCircle2,
  FileText,
  AlertCircle,
  Loader2,
  ArrowRight,
  Filter,
  Stethoscope,
} from 'lucide-react';

const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const MyAppointmentsPage = () => {
  const { success, error: toastError } = useToast();

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState('all'); // 'all', 'upcoming', 'completed', 'cancelled'
  const [checkingInId, setCheckingInId] = useState(null);

  // Cancellation Modal State
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const res = await appointmentAPI.getMyAppointments();
      setAppointments(res.data.appointments || []);
    } catch (err) {
      toastError('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleCheckIn = async (appointmentId) => {
    setCheckingInId(appointmentId);
    try {
      const res = await queueAPI.checkIn(appointmentId);
      success(res.data.message || 'Checked in successfully! Token generated.');
      await fetchAppointments();
    } catch (err) {
      toastError(err.message || 'Check-in failed');
    } finally {
      setCheckingInId(null);
    }
  };

  const openCancelModal = (appointment) => {
    setAppointmentToCancel(appointment);
    setCancelModalOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!appointmentToCancel) return;
    setCancelling(true);
    try {
      const res = await appointmentAPI.cancelAppointment(appointmentToCancel._id);
      success('Appointment cancelled successfully.');
      await fetchAppointments();
    } catch (err) {
      toastError(err.message || 'Cancellation failed');
    } finally {
      setCancelling(false);
      setAppointmentToCancel(null);
    }
  };

  // Filter appointments according to selected tab
  const filteredAppointments = appointments.filter((appt) => {
    if (filterTab === 'upcoming') {
      return ['confirmed', 'checked-in', 'in-consultation'].includes(appt.status);
    }
    if (filterTab === 'completed') {
      return appt.status === 'completed';
    }
    if (filterTab === 'cancelled') {
      return appt.status === 'cancelled';
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6 sm:space-y-8">
      {/* Page Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-white via-white to-sky-50/80 p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="absolute -right-10 -top-16 w-56 h-56 rounded-full bg-sky-100/60 blur-3xl pointer-events-none" />
        <div className="relative space-y-1.5">
          <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider font-bold text-teal-800 bg-teal-50 px-3 py-1 rounded-full border border-teal-200/80">
            <Calendar className="w-3.5 h-3.5 text-teal-600" />
            Patient Consultation Log
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            My Appointments
          </h1>
          <p className="text-sm text-slate-500 max-w-xl">
            Review your upcoming and past doctor visits, check in on arrival to receive queue tokens, and track consultation progress.
          </p>
        </div>

        <div className="relative flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={fetchAppointments}
            title="Refresh appointments"
            aria-label="Refresh appointments"
            className="p-3 rounded-2xl border border-slate-200 bg-white text-slate-600 hover:text-teal-700 hover:bg-slate-50 transition shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <Link
            to="/book-appointment"
            className="px-5 py-3 rounded-2xl font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-md shadow-teal-700/20 transition hover:-translate-y-0.5 flex items-center gap-2 text-xs sm:text-sm"
          >
            <PlusCircle className="w-4 h-4" />
            Book New Visit
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-sm">
        {[
          { id: 'all', label: `All Visits (${appointments.length})` },
          {
            id: 'upcoming',
            label: `Upcoming (${
              appointments.filter((a) =>
                ['confirmed', 'checked-in', 'in-consultation'].includes(a.status)
              ).length
            })`,
          },
          {
            id: 'completed',
            label: `Completed (${appointments.filter((a) => a.status === 'completed').length})`,
          },
          {
            id: 'cancelled',
            label: `Cancelled (${appointments.filter((a) => a.status === 'cancelled').length})`,
          },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilterTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              filterTab === tab.id
                ? 'bg-teal-600 text-white shadow-sm shadow-teal-700/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Appointment Cards List */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 text-sm">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-teal-600" />
          Loading your medical appointments...
        </div>
      ) : filteredAppointments.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-slate-200/90 p-8 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-100 text-teal-600 mx-auto mb-4 flex items-center justify-center">
            <Calendar className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No appointments found</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto mb-5 leading-relaxed">
            {filterTab === 'all'
              ? 'You have not booked any appointments yet.'
              : `You have no appointments in the '${filterTab}' status.`}
          </p>
          <Link
            to="/book-appointment"
            className="px-5 py-2.5 rounded-xl font-bold text-white bg-teal-600 hover:bg-teal-700 text-xs inline-flex items-center gap-2 shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            Book an Appointment
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAppointments.map((appt) => {
            const isCheckedIn = appt.status === 'checked-in' || !!appt.queueEntry;
            const canCancel = ['pending', 'confirmed', 'checked-in'].includes(appt.status);
            const canCheckIn =
              appt.status === 'confirmed' &&
              appt.date === getTodayDate() &&
              !isCheckedIn;

            return (
              <div
                key={appt._id}
                className="group bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm hover:shadow-md hover:border-teal-200/90 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                {/* Doctor and Visit Details */}
                <div className="space-y-3.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <StatusBadge status={appt.status} />
                    <span className="text-[11px] font-semibold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-150">
                      Ref #{appt._id.substring(appt._id.length - 6).toUpperCase()}
                    </span>
                    {appt.queueEntry && (
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-900 border border-teal-200 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-teal-700" />
                        Queue Token #{appt.queueEntry.tokenNumber}
                      </span>
                    )}
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-100 text-teal-700 flex items-center justify-center font-extrabold text-sm shrink-0 shadow-sm">
                      Dr
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight truncate">
                        {appt.doctorId?.name || 'Medical Specialist'}
                      </h3>
                      <p className="text-xs font-bold text-teal-700 mt-0.5">
                        {appt.doctorId?.specialization} • {appt.doctorId?.department}
                      </p>
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {appt.orgId?.name || appt.doctorId?.roomNumber || 'Consultation Room'}
                      </p>
                    </div>
                  </div>

                  {/* Date, Time, and Reason */}
                  <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600 pt-1">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-teal-600 shrink-0" />
                      <span className="font-bold text-slate-800">{appt.date}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-teal-600 shrink-0" />
                      <span className="font-bold text-slate-800">{appt.time}</span>
                    </div>

                    {appt.reason && (
                      <div className="flex items-center gap-1.5 max-w-md truncate">
                        <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="italic text-slate-500 truncate">"{appt.reason}"</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions Button Bar */}
                <div className="flex flex-wrap items-center gap-2.5 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 shrink-0">
                  {canCheckIn && (
                    <button
                      type="button"
                      onClick={() => handleCheckIn(appt._id)}
                      disabled={checkingInId === appt._id}
                      className="px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-teal-600 hover:bg-teal-700 shadow-sm shadow-teal-700/20 transition disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {checkingInId === appt._id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Checking In...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          Check In &amp; Get Token
                        </>
                      )}
                    </button>
                  )}

                  {isCheckedIn && (
                    <Link
                      to="/queue"
                      className="px-4 py-2.5 rounded-xl font-bold text-xs text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition flex items-center gap-1.5"
                    >
                      <Clock className="w-4 h-4 text-teal-600" />
                      Track Live Token
                    </Link>
                  )}

                  {canCancel && (
                    <button
                      type="button"
                      onClick={() => openCancelModal(appt)}
                      className="px-4 py-2.5 rounded-xl font-bold text-xs text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition flex items-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4" />
                      Cancel Visit
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal for Cancellation */}
      <ConfirmModal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        onConfirm={handleConfirmCancel}
        title="Cancel This Appointment?"
        message={`Are you sure you want to cancel your appointment with ${appointmentToCancel?.doctorId?.name} on ${appointmentToCancel?.date} at ${appointmentToCancel?.time}? This will release the slot for other patients.`}
        confirmText={cancelling ? 'Cancelling...' : 'Yes, Cancel Appointment'}
        confirmButtonClass="bg-rose-600 hover:bg-rose-700 text-white"
      />
    </div>
  );
};

export default MyAppointmentsPage;
