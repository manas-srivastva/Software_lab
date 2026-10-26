import React, { useEffect, useState } from 'react';
import { appointmentAPI, doctorAPI, queueAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import StatusBadge from '../components/StatusBadge';
import { Calendar, Clock, RefreshCw, Save, Stethoscope } from 'lucide-react';

const DoctorDashboardPage = () => {
  const { success, error: toastError } = useToast();
  const [doctor, setDoctor] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [availableDays, setAvailableDays] = useState('');
  const [availableSlots, setAvailableSlots] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [averageConsultationMinutes, setAverageConsultationMinutes] = useState(15);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completingId, setCompletingId] = useState(null);

  const loadDoctorData = async () => {
    setLoading(true);
    try {
      const [profileResponse, appointmentsResponse] = await Promise.all([
        doctorAPI.getMyProfile(),
        appointmentAPI.getDoctorAppointments(),
      ]);
      const profile = profileResponse.data.doctor;
      setDoctor(profile);
      setAvailableDays(profile.availableDays.join(', '));
      setAvailableSlots(profile.availableSlots.join(', '));
      setRoomNumber(profile.roomNumber || '');
      setAverageConsultationMinutes(profile.averageConsultationMinutes);
      setAppointments(appointmentsResponse.data.appointments || []);
    } catch (err) {
      toastError(err.message || 'Failed to load your doctor dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDoctorData();
  }, []);

  const saveAvailability = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await doctorAPI.updateMyAvailability({
        availableDays: availableDays.split(',').map((day) => day.trim()).filter(Boolean),
        availableSlots: availableSlots.split(',').map((slot) => slot.trim()).filter(Boolean),
        roomNumber: roomNumber.trim(),
        averageConsultationMinutes: Number(averageConsultationMinutes),
      });
      setDoctor(response.data.doctor);
      success(response.data.message || 'Availability updated.');
    } catch (err) {
      toastError(err.message || 'Failed to update availability.');
    } finally {
      setSaving(false);
    }
  };

  const completeConsultation = async (queueEntryId) => {
    setCompletingId(queueEntryId);
    try {
      const response = await queueAPI.advanceQueue(queueEntryId, {
        targetStatus: 'completed',
      });
      success(response.data.message || 'Consultation completed.');
      await loadDoctorData();
    } catch (err) {
      toastError(err.message || 'Failed to complete consultation.');
    } finally {
      setCompletingId(null);
    }
  };

  if (loading && !doctor) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-sm text-slate-500">
        <RefreshCw className="w-5 h-5 animate-spin mr-2 text-teal-600" />
        Loading doctor desk...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <header className="relative overflow-hidden bg-gradient-to-br from-white via-white to-sky-50 p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm">
        <div className="absolute -right-10 -top-16 w-52 h-52 rounded-full bg-sky-100/60 blur-3xl pointer-events-none" />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-100">
            <Stethoscope className="w-3.5 h-3.5" /> Doctor workspace
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-3">
            {doctor?.name}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Update your schedule, review assigned appointments, and complete consultations.
          </p>
        </div>
      </header>

      <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-5">
          <Calendar className="w-5 h-5 text-teal-600" />
          Availability
        </h2>
        <form onSubmit={saveAvailability} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="text-xs font-semibold text-slate-600">
            Available days (comma-separated)
            <input
              value={availableDays}
              onChange={(event) => setAvailableDays(event.target.value)}
              className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm"
              required
            />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Available time slots (comma-separated)
            <input
              value={availableSlots}
              onChange={(event) => setAvailableSlots(event.target.value)}
              className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm"
              required
            />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Consultation room
            <input
              value={roomNumber}
              onChange={(event) => setRoomNumber(event.target.value)}
              className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Average consultation minutes
            <input
              type="number"
              min="5"
              max="60"
              value={averageConsultationMinutes}
              onChange={(event) => setAverageConsultationMinutes(event.target.value)}
              className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm"
              required
            />
          </label>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Availability'}
            </button>
          </div>
        </form>
      </section>

      <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-teal-600" />
              Appointments &amp; Consultation Queue
            </h2>
            <p className="text-xs text-slate-500 mt-1">Review your patients, queue tokens, and active consultations.</p>
          </div>
          <button
            type="button"
            onClick={loadDoctorData}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-teal-600 disabled:opacity-50"
            aria-label="Refresh appointments"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {appointments.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-400">
            No appointments are currently assigned to your profile.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
                <tr>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Date &amp; Time</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Consultation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {appointments.map((appointment) => {
                  const queueEntry = appointment.queueEntry;
                  const canComplete = queueEntry?.status === 'in-consultation';
                  return (
                    <tr key={appointment._id}>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {appointment.patientId?.name || 'Patient'}
                        <p className="text-[10px] text-slate-400 font-normal">{appointment.patientId?.phone}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        {appointment.date}
                        <p className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {appointment.time}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs truncate">{appointment.reason}</td>
                      <td className="py-3.5 px-4"><StatusBadge status={appointment.status} /></td>
                      <td className="py-3.5 px-4 text-right">
                        {canComplete ? (
                          <button
                            type="button"
                            onClick={() => completeConsultation(queueEntry._id)}
                            disabled={completingId === queueEntry._id}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 disabled:opacity-50"
                          >
                            {completingId === queueEntry._id ? 'Updating...' : 'Complete Visit'}
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-500">
                            {queueEntry?.tokenNumber ? `Token #${queueEntry.tokenNumber} · ` : ''}
                            {queueEntry?.status || 'Awaiting check-in'}
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
      </section>
    </div>
  );
};

export default DoctorDashboardPage;
