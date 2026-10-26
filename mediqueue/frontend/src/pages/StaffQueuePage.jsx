import React, { useState, useEffect, useRef } from 'react';
import { doctorAPI, queueAPI, appointmentAPI, organisationAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import StatusBadge from '../components/StatusBadge';
import ConfirmModal from '../components/ConfirmModal';
import {
  ShieldCheck,
  RefreshCw,
  Clock,
  Phone,
  FileText,
  CheckCircle2,
  PlayCircle,
  Stethoscope,
  Filter,
  Calendar,
  AlertCircle,
  UserCheck,
  ChevronRight,
  XCircle,
} from 'lucide-react';

const StaffQueuePage = () => {
  const { user } = useAuth();
  const { success, info, error: toastError } = useToast();

  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [doctorQueue, setDoctorQueue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [advancingId, setAdvancingId] = useState(null);

  // Tab: 'queue' or 'appointments'
  const [activeTab, setActiveTab] = useState('queue');
  const [allAppointments, setAllAppointments] = useState([]);
  const [loadingAppts, setLoadingAppts] = useState(false);
  const [appointmentsError, setAppointmentsError] = useState('');
  const [appointmentToCancel, setAppointmentToCancel] = useState(null);
  const [cancellingAppointmentId, setCancellingAppointmentId] = useState(null);
  const knownAppointmentIds = useRef(null);
  const isOrgAdmin = user?.role === 'orgAdmin' || user?.roles?.includes('orgAdmin');

  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [selectedDate, setSelectedDate] = useState(getTodayDate());

  // Load doctors
  useEffect(() => {
    const loadDoctors = async () => {
      try {
        const isOrgAdmin = user?.role === 'orgAdmin' || user?.roles?.includes('orgAdmin');
        const res = isOrgAdmin
          ? await organisationAPI.getMyDoctors()
          : await doctorAPI.getDoctors();
        const list = isOrgAdmin
          ? (res.data.affiliations || []).map((affiliation) => affiliation.doctorId).filter(Boolean)
          : res.data.doctors || [];
        setDoctors(list);
        if (list.length > 0) {
          setSelectedDoctorId(list[0]._id);
        }
      } catch (err) {
        toastError('Failed to load doctors list');
      } finally {
        setLoading(false);
      }
    };
    loadDoctors();
  }, [user]);

  // Fetch queue for doctor & date
  const fetchQueue = async (docId, date) => {
    if (!docId) return;
    setLoading(true);
    try {
      const res = await queueAPI.getDoctorQueue(docId, date);
      setDoctorQueue(res.data);
    } catch (err) {
      toastError('Failed to load queue details');
    } finally {
      setLoading(false);
    }
  };

  // Fetch all clinic appointments (Staff clearance)
  const fetchAppointments = async ({ notifyNew = false } = {}) => {
    setLoadingAppts(true);
    try {
      const res = await appointmentAPI.getAllAppointments();
      const appointments = res.data.appointments || [];

      if (notifyNew && knownAppointmentIds.current) {
        appointments
          .filter((appointment) => !knownAppointmentIds.current.has(appointment._id))
          .forEach((appointment) => {
            info(
              `New appointment: ${appointment.patientId?.name || 'A patient'} with ${
                appointment.doctorId?.name || 'a doctor'
              } at ${appointment.time}.`
            );
          });
      }

      knownAppointmentIds.current = new Set(appointments.map((appointment) => appointment._id));
      setAllAppointments(appointments.filter((appointment) => appointment.date === selectedDate));
      setAppointmentsError('');
    } catch (err) {
      setAppointmentsError(
        err.message || `Failed to load ${isOrgAdmin ? 'organisation' : 'clinic'} bookings.`
      );
    } finally {
      setLoadingAppts(false);
    }
  };

  useEffect(() => {
    if (selectedDoctorId) {
      fetchQueue(selectedDoctorId, selectedDate);
    }
  }, [selectedDoctorId, selectedDate]);

  useEffect(() => {
    fetchAppointments();
    const intervalId = setInterval(() => {
      fetchAppointments({ notifyNew: true });
    }, 15000);

    return () => clearInterval(intervalId);
  }, [selectedDate]);

  const handleConfirmCancel = async () => {
    if (!appointmentToCancel) return;
    setCancellingAppointmentId(appointmentToCancel._id);
    try {
      const res = await appointmentAPI.cancelAppointment(appointmentToCancel._id);
      success(res.data.message || 'Appointment cancelled successfully.');
      await fetchAppointments({ notifyNew: true });
    } catch (err) {
      toastError(err.message || 'Failed to cancel appointment.');
    } finally {
      setCancellingAppointmentId(null);
      setAppointmentToCancel(null);
    }
  };

  const handleCheckIn = async (appointment) => {
    try {
      const response = await queueAPI.checkIn(appointment._id);
      success(response.data.message || 'Patient checked in and added to the queue.');
      await Promise.all([
        fetchAppointments({ notifyNew: true }),
        fetchQueue(selectedDoctorId, selectedDate),
      ]);
    } catch (err) {
      toastError(err.message || 'Failed to confirm patient check-in.');
    }
  };

  // Advance queue handler
  const handleAdvance = async (queueId, targetStatus) => {
    setAdvancingId(queueId);
    try {
      const res = await queueAPI.advanceQueue(queueId, { targetStatus });
      success(res.data.message || 'Queue status updated');
      await fetchQueue(selectedDoctorId, selectedDate);
    } catch (err) {
      toastError(err.message || 'Advance failed');
    } finally {
      setAdvancingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Staff Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-white via-white to-purple-50 p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="absolute -right-10 -top-16 w-56 h-56 rounded-full bg-purple-100/60 blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200 inline-flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-purple-600" />
              {isOrgAdmin ? 'Organisation Queue Operations' : 'Reception & OPD Operations'}
            </span>
            <span className="text-xs font-semibold text-slate-400">
              Clearance: {user?.role?.toUpperCase()}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-3">
            {isOrgAdmin ? 'Organisation Queue Desk' : 'Clinic Queue Control Desk'}
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Manage patient bookings, advance consultation tokens, and coordinate clinic flow.
          </p>
        </div>

        {/* Doctor & Date Controls */}
        <div className="relative grid grid-cols-1 sm:grid-cols-[1fr_1.4fr_auto] items-center gap-2 w-full lg:w-auto lg:min-w-[470px]">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            aria-label="Queue date"
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
          />

          <select
            value={selectedDoctorId}
            onChange={(e) => setSelectedDoctorId(e.target.value)}
            aria-label="Select doctor"
            disabled={doctors.length === 0}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white disabled:bg-slate-100 focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
          >
            {doctors.length === 0 && <option value="">No doctors available</option>}
            {doctors.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name} ({d.specialization})
              </option>
            ))}
          </select>

          <button
            onClick={() => fetchQueue(selectedDoctorId, selectedDate)}
            disabled={!selectedDoctorId || loading}
            className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-purple-700 hover:bg-purple-50 transition disabled:opacity-50"
            title="Refresh"
            aria-label="Refresh queue"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
        <button
          onClick={() => setActiveTab('queue')}
          className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'queue'
              ? 'bg-purple-700 text-white shadow-sm shadow-purple-700/20'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Live Token Management
        </button>
        <button
          onClick={() => setActiveTab('appointments')}
          className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'appointments'
              ? 'bg-purple-700 text-white shadow-sm shadow-purple-700/20'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          {isOrgAdmin ? 'Organisation Bookings' : 'Clinic Bookings'} ({allAppointments.length})
        </button>
      </div>

      {activeTab === 'queue' ? (
        <div className="space-y-6">
          {/* Summary metrics */}
          {doctorQueue && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Tokens</p>
                <p className="text-2xl font-black text-slate-900 mt-1">{doctorQueue.summary?.totalTokens || 0}</p>
                <span className="text-[10px] text-slate-500">Checked in today</span>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Waiting in Line</p>
                <p className="text-2xl font-black text-amber-600 mt-1">{doctorQueue.summary?.waitingCount || 0}</p>
                <span className="text-[10px] text-slate-500">Awaiting consultation</span>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-wider text-teal-700">Currently Serving</p>
                <p className="text-2xl font-black text-teal-600 mt-1">
                  {doctorQueue.summary?.currentServingToken ? `#${doctorQueue.summary.currentServingToken}` : 'None'}
                </p>
                <span className="text-[10px] text-slate-500">{doctorQueue.doctor?.roomNumber}</span>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Completed</p>
                <p className="text-2xl font-black text-slate-700 mt-1">{doctorQueue.summary?.completedCount || 0}</p>
                <span className="text-[10px] text-slate-500">Visits concluded</span>
              </div>
            </div>
          )}

          {/* Tokens Table with Staff Controls */}
          <div className="bg-white rounded-3xl p-5 sm:p-8 border border-slate-200 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <p className="text-xs uppercase tracking-wider font-bold text-purple-700">Live queue</p>
                <h2 className="text-lg font-bold text-slate-900 mt-1">
                  {doctorQueue?.doctor?.name || 'Select a doctor'}
                </h2>
              </div>
              <span className="text-xs font-semibold text-slate-500">{selectedDate}</span>
            </div>

            {loading ? (
              <div className="py-12 text-center text-xs text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-600" />
                Updating tokens...
              </div>
            ) : !selectedDoctorId ? (
              <div className="py-12 text-center text-sm text-slate-500 border border-dashed border-slate-200 rounded-2xl">
                No doctor profiles are available for this workspace.
              </div>
            ) : !doctorQueue?.queueEntries || doctorQueue.queueEntries.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500 border border-dashed border-slate-200 rounded-2xl">
                No patients have checked in to this queue for {selectedDate}.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-y border-slate-100">
                    <tr>
                      <th className="py-3 px-4">Token</th>
                      <th className="py-3 px-4">Patient Contact</th>
                      <th className="py-3 px-4">Slot Time</th>
                      <th className="py-3 px-4">Reason / Notes</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Staff Control</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {doctorQueue.queueEntries.map((item) => {
                      const isCurrent = item.status === 'in-consultation';
                      const isWaiting = item.status === 'waiting';

                      return (
                        <tr
                          key={item._id}
                          className={`transition ${isCurrent ? 'bg-teal-50/60 font-semibold' : 'hover:bg-slate-50/70'}`}
                        >
                          <td className="py-3.5 px-4">
                            <span
                              className={`text-sm font-black px-2.5 py-1 rounded-lg ${
                                isCurrent
                                  ? 'bg-teal-600 text-white'
                                  : 'bg-slate-100 text-slate-800'
                              }`}
                            >
                              #{item.tokenNumber}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <p className="font-bold text-slate-900">{item.patientId?.name || 'Patient'}</p>
                            <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {item.patientId?.phone || 'On file'}
                            </p>
                          </td>

                          <td className="py-3.5 px-4 font-semibold text-slate-700">
                            {item.appointmentId?.time || '—'}
                          </td>

                          <td className="py-3.5 px-4 max-w-xs truncate text-slate-600">
                            {item.appointmentId?.reason || 'General Visit'}
                          </td>

                          <td className="py-3.5 px-4">
                            <StatusBadge status={item.status} />
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center gap-2 justify-end">
                              {isWaiting && (user?.role === 'receptionist' || isOrgAdmin) && (
                                <button
                                  onClick={() => handleAdvance(item._id, 'in-consultation')}
                                  disabled={advancingId === item._id}
                                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-sm transition disabled:opacity-50 flex items-center gap-1"
                                >
                                  <PlayCircle className="w-3.5 h-3.5" />
                                  Call In
                                </button>
                              )}

                              {isCurrent && (
                                isOrgAdmin ? (
                                  <button
                                    onClick={() => handleAdvance(item._id, 'completed')}
                                    disabled={advancingId === item._id}
                                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
                                  >
                                    Complete
                                  </button>
                                ) : (
                                  <span className="text-[11px] font-semibold text-slate-500">
                                    Doctor consultation in progress
                                  </span>
                                )
                              )}

                              {(!isWaiting && !isCurrent) ||
                                (isWaiting && user?.role !== 'receptionist' && !isOrgAdmin) ? (
                                <span className="text-[11px] font-semibold text-slate-400">Done</span>
                              ) : null}
                            </div>
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
      ) : (
        /* All Hospital Bookings View (Staff Only) */
        <div className="bg-white rounded-3xl p-5 sm:p-8 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-900">
              All Hospital Bookings for {selectedDate}
            </h2>
            <button
              onClick={() => fetchAppointments({ notifyNew: true })}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:text-teal-600"
            >
              Refresh Bookings
            </button>
          </div>

          {appointmentsError ? (
            <div className="py-6 px-4 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-2xl">
              {appointmentsError}
            </div>
          ) : loadingAppts && allAppointments.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-600" />
              Loading hospital bookings...
            </div>
          ) : allAppointments.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
              No appointments registered for {selectedDate}.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-y border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Patient</th>
                    <th className="py-3 px-4">Doctor</th>
                    <th className="py-3 px-4">Slot</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Manage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allAppointments.map((appt) => (
                    <tr key={appt._id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {appt.patientId?.name}
                        <p className="text-[10px] text-slate-400 font-normal">{appt.patientId?.phone}</p>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {appt.doctorId?.name}
                        <p className="text-[10px] text-teal-600 font-normal">{appt.doctorId?.department}</p>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">{appt.time}</td>
                      <td className="py-3.5 px-4 max-w-xs truncate text-slate-600">{appt.reason}</td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={appt.status} />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-2 justify-end">
                          {user?.role === 'receptionist' &&
                            appt.status === 'confirmed' &&
                            appt.date === selectedDate && (
                            <button
                              onClick={() => handleCheckIn(appt)}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-teal-600 hover:bg-teal-700"
                            >
                              Confirm Check-in
                            </button>
                          )}
                          {!['cancelled', 'completed', 'in-consultation'].includes(appt.status) && (
                            <button
                              onClick={() => setAppointmentToCancel(appt)}
                              disabled={cancellingAppointmentId === appt._id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 disabled:opacity-50"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Cancel
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
          <ConfirmModal
            isOpen={!!appointmentToCancel}
            onClose={() => setAppointmentToCancel(null)}
            onConfirm={handleConfirmCancel}
            title="Cancel this appointment?"
            message={
              appointmentToCancel
                ? `Cancel ${appointmentToCancel.patientId?.name || 'this patient'}'s appointment with ${
                    appointmentToCancel.doctorId?.name || 'the selected doctor'
                  } on ${appointmentToCancel.date} at ${appointmentToCancel.time}?`
                : ''
            }
            confirmText="Cancel Appointment"
          />
        </div>
      )}
    </div>
  );
};

export default StaffQueuePage;
