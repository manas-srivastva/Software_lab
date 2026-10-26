import React, { useEffect, useState } from 'react';
import { appointmentAPI, doctorAPI, queueAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import StatusBadge from '../components/StatusBadge';
import {
  Calendar,
  Clock,
  RefreshCw,
  Save,
  Stethoscope,
  MapPin,
  Award,
  Phone,
  CheckCircle2,
  AlertCircle,
  Building2,
  FileText,
} from 'lucide-react';

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
  const [resubmitting, setResubmitting] = useState(false);
  const [resubmitNotes, setResubmitNotes] = useState('');
  const [showResubmitBox, setShowResubmitBox] = useState(false);

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

  const handleResubmit = async (event) => {
    event.preventDefault();
    if (!resubmitNotes.trim()) {
      toastError('Please provide notes explaining the updates made to your application.');
      return;
    }
    setResubmitting(true);
    try {
      const res = await doctorAPI.resubmitApplication({
        resubmissionNotes: resubmitNotes.trim(),
      });
      success(res.data.message || 'Application resubmitted successfully!');
      setShowResubmitBox(false);
      setResubmitNotes('');
      await loadDoctorData();
    } catch (err) {
      toastError(err.message || 'Failed to resubmit application.');
    } finally {
      setResubmitting(false);
    }
  };

  if (loading && !doctor) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-sm text-slate-500">
        <RefreshCw className="w-6 h-6 animate-spin mr-2 text-teal-600" />
        Loading physician workspace...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6 sm:space-y-8">
      {/* Workspace Header */}
      <header className="relative overflow-hidden bg-gradient-to-br from-white via-white to-sky-50/90 p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute -right-10 -top-16 w-52 h-52 rounded-full bg-sky-100/60 blur-3xl pointer-events-none" />
        <div className="relative space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider font-bold text-sky-800 bg-sky-50 px-3 py-1 rounded-full border border-sky-200">
              <Stethoscope className="w-3.5 h-3.5 text-sky-600" /> Physician Consultation Desk
            </span>
            {doctor?.verificationStatus && (
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                {doctor.verificationStatus}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            {doctor?.name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-semibold text-teal-700">{doctor?.specialization}</span>
            <span className="text-slate-300">•</span>
            <span>{doctor?.department}</span>
            <span className="text-slate-300">•</span>
            <span>Room: {doctor?.roomNumber || 'Consultation Room'}</span>
          </p>
        </div>

        <button
          type="button"
          onClick={loadDoctorData}
          disabled={loading}
          className="relative px-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-slate-700 hover:text-teal-700 hover:bg-slate-50 text-xs font-bold transition flex items-center gap-2 shadow-sm self-start md:self-center"
          aria-label="Refresh doctor workspace"
        >
          <RefreshCw className={`w-4 h-4 text-teal-600 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </header>

      {/* Doctor Onboarding & Application Status Alert */}
      {doctor?.verificationStatus !== 'APPROVED' && (
        <section className={`rounded-3xl p-6 sm:p-7 border shadow-sm ${
          doctor?.verificationStatus === 'NEEDS_CHANGES'
            ? 'bg-amber-50/90 border-amber-200 text-amber-900'
            : doctor?.verificationStatus === 'REJECTED' || doctor?.verificationStatus === 'SUSPENDED'
            ? 'bg-rose-50/90 border-rose-200 text-rose-900'
            : 'bg-sky-50/90 border-sky-200 text-sky-900'
        }`}>
          <div className="flex items-start gap-4">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
              doctor?.verificationStatus === 'NEEDS_CHANGES'
                ? 'bg-amber-100 text-amber-700 border-amber-300'
                : doctor?.verificationStatus === 'REJECTED' || doctor?.verificationStatus === 'SUSPENDED'
                ? 'bg-rose-100 text-rose-700 border-rose-300'
                : 'bg-sky-100 text-sky-700 border-sky-300'
            }`}>
              <AlertCircle className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-extrabold tracking-tight">
                  {doctor?.verificationStatus === 'PENDING' && 'Application Pending Administrative Review'}
                  {doctor?.verificationStatus === 'NEEDS_CHANGES' && 'Action Required: Application Updates Requested'}
                  {doctor?.verificationStatus === 'REJECTED' && 'Application Rejected by Administration'}
                  {doctor?.verificationStatus === 'SUSPENDED' && 'Doctor Account Suspended'}
                </h2>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-white/80 border border-current">
                  Status: {doctor?.verificationStatus}
                </span>
              </div>

              <p className="text-xs sm:text-sm leading-relaxed opacity-90">
                {doctor?.verificationStatus === 'PENDING' &&
                  'Your medical registration, credentials, and verification documents are currently undergoing review by the hospital administration. Once approved, your profile will be listed publicly, you can configure consultation availability, and begin accepting patient appointments.'}
                {(doctor?.verificationStatus === 'NEEDS_CHANGES' ||
                  doctor?.verificationStatus === 'REJECTED' ||
                  doctor?.verificationStatus === 'SUSPENDED') && (
                  <span>
                    <strong className="font-bold">Official Administration Notes: </strong>
                    {doctor?.statusReason || 'Please review your application information.'}
                  </span>
                )}
              </p>

              {doctor?.verificationStatus === 'NEEDS_CHANGES' && (
                <div className="pt-2">
                  {!showResubmitBox ? (
                    <button
                      type="button"
                      onClick={() => setShowResubmitBox(true)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 shadow-sm transition"
                    >
                      Update &amp; Resubmit Application
                    </button>
                  ) : (
                    <form onSubmit={handleResubmit} className="space-y-3 pt-2 bg-white/70 p-4 rounded-2xl border border-amber-200">
                      <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Resubmission Notes for Reviewer
                      </label>
                      <textarea
                        value={resubmitNotes}
                        onChange={(e) => setResubmitNotes(e.target.value)}
                        placeholder="Explain the updates made (e.g. updated registration certificate copy, corrected room number or clinic address)..."
                        rows={3}
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                        required
                      />
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={resubmitting}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 disabled:opacity-50 transition shadow-sm"
                        >
                          {resubmitting ? 'Submitting...' : 'Confirm Resubmission'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowResubmitBox(false)}
                          className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Schedule & Availability Settings Form */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-5">
        <div className="border-b border-slate-100 pb-4">
          <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-teal-600" />
            Clinic Schedule &amp; Availability Settings
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure your active OPD consultation days, daily time slot templates, room number, and consultation pace.
          </p>
        </div>

        <form onSubmit={saveAvailability} className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Available Days (Comma-Separated)
            </label>
            <input
              value={availableDays}
              onChange={(event) => setAvailableDays(event.target.value)}
              placeholder="e.g. Monday, Tuesday, Wednesday, Friday"
              className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-sm font-medium text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              required
            />
            <p className="text-[11px] text-slate-400 mt-1 font-medium">Days of the week you accept scheduled consultations.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Available Time Slots (Comma-Separated)
            </label>
            <input
              value={availableSlots}
              onChange={(event) => setAvailableSlots(event.target.value)}
              placeholder="e.g. 09:00 AM, 10:00 AM, 11:30 AM, 02:00 PM"
              className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-sm font-medium text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              required
            />
            <p className="text-[11px] text-slate-400 mt-1 font-medium">Slot templates available for booking on practice days.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Consultation Room / Office
            </label>
            <input
              value={roomNumber}
              onChange={(event) => setRoomNumber(event.target.value)}
              placeholder="e.g. Room 204, Pavilion B"
              className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-sm font-medium text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Average Consultation Time (Minutes)
            </label>
            <input
              type="number"
              min="5"
              max="60"
              value={averageConsultationMinutes}
              onChange={(event) => setAverageConsultationMinutes(event.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-sm font-medium text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              required
            />
            <p className="text-[11px] text-slate-400 mt-1 font-medium">Used to compute live waiting interval forecasts for queue tokens.</p>
          </div>

          <div className="md:col-span-2 pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <button
              type="submit"
              disabled={saving || doctor?.verificationStatus !== 'APPROVED'}
              className="px-6 py-3 rounded-2xl text-xs sm:text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 shadow-md shadow-teal-700/20 transition hover:-translate-y-0.5"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving Changes...' : 'Save Availability Settings'}
            </button>
            {doctor?.verificationStatus !== 'APPROVED' && (
              <span className="text-xs font-semibold text-amber-700 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                Availability unlocks after administrative approval.
              </span>
            )}
          </div>
        </form>
      </section>

      {/* Assigned Appointments & Consultation Queue */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-teal-600" />
              Assigned Patients &amp; Consultation Queue
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review your patient records, OPD token progression, and complete active consultations.
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 self-start sm:self-center">
            {appointments.length} Total Patients
          </span>
        </div>

        {appointments.length === 0 ? (
          <div className="py-14 text-center border border-dashed border-slate-200 rounded-3xl p-6">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No appointments assigned</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
              When patients book consultations with your profile, their booking details and queue tokens will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-y border-slate-100">
                <tr>
                  <th className="py-3.5 px-4">Patient Contact</th>
                  <th className="py-3.5 px-4">Date &amp; Time</th>
                  <th className="py-3.5 px-4">Clinical Reason</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Consultation Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {appointments.map((appointment) => {
                  const queueEntry = appointment.queueEntry;
                  const canComplete = queueEntry?.status === 'in-consultation';
                  const isCurrent = canComplete;

                  return (
                    <tr
                      key={appointment._id}
                      className={`transition ${isCurrent ? 'bg-teal-50/50 font-semibold' : 'hover:bg-slate-50/70'}`}
                    >
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {appointment.patientId?.name || 'Patient'}
                        <p className="text-[11px] text-slate-400 font-normal flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" />
                          {appointment.patientId?.phone || 'On file'}
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-800">{appointment.date}</span>
                        <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 font-medium">
                          <Clock className="w-3 h-3 text-teal-600" /> {appointment.time}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs truncate text-slate-600">
                        {appointment.reason}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={appointment.status} />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {canComplete ? (
                          <button
                            type="button"
                            onClick={() => completeConsultation(queueEntry._id)}
                            disabled={completingId === queueEntry._id}
                            className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 shadow-sm transition"
                          >
                            {completingId === queueEntry._id ? 'Updating...' : 'Complete Visit'}
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-500 font-medium">
                            {queueEntry?.tokenNumber ? (
                              <span className="font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md">
                                Token #{queueEntry.tokenNumber}
                              </span>
                            ) : (
                              'Awaiting check-in'
                            )}
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
