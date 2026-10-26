import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { appointmentAPI, organisationAPI } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import {
  CalendarDays,
  Users,
  ListChecks,
  Building2,
  ArrowUpRight,
  PlusCircle,
  Clock,
  MapPin,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

const OrganisationDashboardPage = () => {
  const [organisation, setOrganisation] = useState(null);
  const [affiliations, setAffiliations] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [doctorId, setDoctorId] = useState('');
  const [consultationFee, setConsultationFee] = useState('0');
  const [roomNumber, setRoomNumber] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [orgResponse, doctorsResponse, appointmentsResponse] = await Promise.all([
        organisationAPI.getMyOrganisation(),
        organisationAPI.getMyDoctors(),
        appointmentAPI.getAllAppointments(),
      ]);
      setOrganisation(orgResponse.data.organisation);
      setAffiliations(doctorsResponse.data.affiliations || []);
      setAppointments(appointmentsResponse.data.appointments || []);
      setError('');
    } catch (requestError) {
      setError(requestError.message || 'Unable to load organisation details');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const addDoctor = async (event) => {
    event.preventDefault();
    try {
      await organisationAPI.addDoctor({
        doctorId,
        consultationFee: Number(consultationFee),
        roomNumber,
      });
      setDoctorId('');
      setConsultationFee('0');
      setRoomNumber('');
      await load();
    } catch (requestError) {
      setError(requestError.message || 'Unable to affiliate doctor');
    }
  };

  const updateAffiliation = async (event, affiliationId) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    try {
      await organisationAPI.updateDoctorAffiliation(affiliationId, {
        consultationFee: Number(values.get('consultationFee')),
        roomNumber: values.get('roomNumber'),
        availableDays: values.get('availableDays').split(',').map((value) => value.trim()).filter(Boolean),
        availableSlots: values.get('availableSlots').split(',').map((value) => value.trim()).filter(Boolean),
      });
      await load();
    } catch (requestError) {
      setError(requestError.message || 'Unable to update doctor affiliation');
    }
  };

  const activeAppointments = appointments.filter((appointment) =>
    ['confirmed', 'checked-in', 'in-consultation'].includes(appointment.status)
  );
  const checkedInAppointments = appointments.filter((appointment) =>
    ['checked-in', 'in-consultation'].includes(appointment.status)
  );

  if (loading && !organisation) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-sm text-slate-500">
        <RefreshCw className="w-6 h-6 animate-spin mr-2 text-teal-600" />
        Loading organisation dashboard...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6 sm:space-y-8">
      {/* Header Banner */}
      <header className="relative overflow-hidden bg-gradient-to-br from-white via-white to-teal-50/90 rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div className="absolute -right-8 -top-12 w-48 h-48 rounded-full bg-teal-100/50 blur-3xl pointer-events-none" />
        <div className="relative space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider font-bold text-teal-800 bg-teal-50 px-3 py-1 rounded-full border border-teal-200/80">
              <Building2 className="w-3.5 h-3.5 text-teal-600" /> Organisation Workspace
            </span>
            <span className={`text-xs font-bold capitalize px-2.5 py-0.5 rounded-full border ${
              organisation?.approvalStatus === 'approved'
                ? 'text-emerald-800 bg-emerald-50 border-emerald-200'
                : 'text-amber-800 bg-amber-50 border-amber-200'
            }`}>
              {organisation?.approvalStatus || 'pending'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            {organisation?.name || 'Organisation Dashboard'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            {[organisation?.city, organisation?.address].filter(Boolean).join(' · ') || 'Facility location on file'}
          </p>
        </div>

        <Link
          to="/staff/queue"
          className="relative self-start sm:self-center inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-teal-600 text-white font-bold text-xs sm:text-sm shadow-md shadow-teal-700/20 hover:bg-teal-700 hover:-translate-y-0.5 transition"
        >
          Manage Queue &amp; Bookings <ArrowUpRight className="w-4 h-4" />
        </Link>
      </header>

      {error && (
        <div role="alert" className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-sm flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Metrics Row */}
      <section className="grid gap-4 sm:grid-cols-3">
        <article className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 flex items-center gap-4 shadow-sm hover:shadow-md transition">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6 text-teal-600" />
          </div>
          <div>
            <p className="text-[10px] sm:text-[11px] uppercase font-bold tracking-wider text-slate-500">
              Affiliated Doctors
            </p>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-0.5">
              {affiliations.length}
            </p>
          </div>
        </article>

        <article className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 flex items-center gap-4 shadow-sm hover:shadow-md transition">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center shrink-0">
            <CalendarDays className="w-6 h-6 text-sky-600" />
          </div>
          <div>
            <p className="text-[10px] sm:text-[11px] uppercase font-bold tracking-wider text-slate-500">
              Active Appointments
            </p>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-0.5">
              {activeAppointments.length}
            </p>
          </div>
        </article>

        <article className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 flex items-center gap-4 shadow-sm hover:shadow-md transition">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
            <ListChecks className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <p className="text-[10px] sm:text-[11px] uppercase font-bold tracking-wider text-slate-500">
              Checked Into Queue
            </p>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-0.5">
              {checkedInAppointments.length}
            </p>
          </div>
        </article>
      </section>

      {/* Recent Appointments */}
      <section className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-8 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="font-extrabold text-lg text-slate-900">Recent Facility Appointments</h2>
            <p className="text-xs text-slate-500 mt-0.5">Patient consultations scheduled for this organisation.</p>
          </div>
          <Link className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1" to="/staff/queue">
            Open Queue Desk <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {appointments.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
            No appointments have been booked for this organisation yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="text-[11px] uppercase font-bold text-slate-500 bg-slate-50 border-y border-slate-100">
                <tr>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Doctor</th>
                  <th className="py-3 px-4">Date &amp; Time</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {appointments.slice(0, 5).map((appointment) => (
                  <tr key={appointment._id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">{appointment.patientId?.name || 'Patient'}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{appointment.doctorId?.name || 'Doctor'}</td>
                    <td className="py-3 px-4 font-medium">{appointment.date} · {appointment.time}</td>
                    <td className="py-3 px-4"><StatusBadge status={appointment.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Add Doctor Affiliation Form */}
      <form onSubmit={addDoctor} className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 grid sm:grid-cols-2 gap-4 shadow-sm">
        <div className="sm:col-span-2 border-b border-slate-100 pb-3">
          <h2 className="font-extrabold text-lg text-slate-900 flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-teal-600" />
            Add Doctor Affiliation
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Connect an approved physician profile to practice at your facility.</p>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Doctor Profile ID
          </label>
          <input
            className="w-full border border-slate-200 rounded-2xl p-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            value={doctorId}
            onChange={(event) => setDoctorId(event.target.value)}
            placeholder="e.g. 64b8f... (MongoDB ID)"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Consultation Fee ($)
          </label>
          <input
            className="w-full border border-slate-200 rounded-2xl p-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            type="number"
            min="0"
            step="0.01"
            value={consultationFee}
            onChange={(event) => setConsultationFee(event.target.value)}
            placeholder="0.00"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Assigned Room / Suite
          </label>
          <input
            className="w-full border border-slate-200 rounded-2xl p-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            value={roomNumber}
            onChange={(event) => setRoomNumber(event.target.value)}
            placeholder="e.g. Suite 301, Wing C"
          />
        </div>

        <div className="sm:col-span-2 pt-2">
          <button
            type="submit"
            disabled={organisation?.approvalStatus !== 'approved'}
            className="px-6 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm disabled:opacity-50 shadow-md shadow-teal-700/20 transition hover:-translate-y-0.5"
          >
            Affiliate Doctor to Facility
          </button>
          {organisation?.approvalStatus !== 'approved' && (
            <p className="text-[11px] text-amber-700 mt-2 font-medium">
              * Organisation must be approved by platform superadmin before affiliating doctors.
            </p>
          )}
        </div>
      </form>

      {/* Affiliated Doctors List & Configuration */}
      <section className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm space-y-5">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="font-extrabold text-lg text-slate-900">Affiliated Doctors ({affiliations.length})</h2>
          <p className="text-xs text-slate-500 mt-0.5">Facility schedule, consultation fee, and room management for affiliated medical staff.</p>
        </div>

        {affiliations.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
            No doctors affiliated with this organisation yet.
          </div>
        ) : (
          <div className="space-y-4">
            {affiliations.map((affiliation) => (
              <div
                key={affiliation._id}
                className="p-5 rounded-2xl border border-slate-200/90 bg-slate-50/50 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900">{affiliation.doctorId?.name || 'Doctor profile'}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {affiliation.doctorId?.specialization} · <span className="font-semibold text-teal-700">{affiliation.doctorId?.verificationStatus}</span>
                    </p>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-700 shadow-sm">
                    Fee: ${affiliation.consultationFee || 0}
                  </span>
                </div>

                <form
                  onSubmit={(event) => updateAffiliation(event, affiliation._id)}
                  className="grid sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-200/60"
                >
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Fee ($)</label>
                    <input
                      name="consultationFee"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={affiliation.consultationFee}
                      className="w-full border border-slate-200 bg-white rounded-xl p-2.5 text-xs font-medium focus:border-teal-500 focus:outline-none"
                      aria-label="Consultation fee"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Room / Suite</label>
                    <input
                      name="roomNumber"
                      defaultValue={affiliation.roomNumber}
                      className="w-full border border-slate-200 bg-white rounded-xl p-2.5 text-xs font-medium focus:border-teal-500 focus:outline-none"
                      aria-label="Room number"
                      placeholder="Room number"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Available Days</label>
                    <input
                      name="availableDays"
                      defaultValue={affiliation.availableDays?.join(', ')}
                      className="w-full border border-slate-200 bg-white rounded-xl p-2.5 text-xs font-medium focus:border-teal-500 focus:outline-none"
                      aria-label="Available days"
                      placeholder="e.g. Monday, Tuesday"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Available Slots</label>
                    <input
                      name="availableSlots"
                      defaultValue={affiliation.availableSlots?.join(', ')}
                      className="w-full border border-slate-200 bg-white rounded-xl p-2.5 text-xs font-medium focus:border-teal-500 focus:outline-none"
                      aria-label="Available slots"
                      placeholder="e.g. 09:00 AM, 10:00 AM"
                    />
                  </div>

                  <div className="sm:col-span-2 pt-1">
                    <button
                      type="submit"
                      disabled={organisation?.approvalStatus !== 'approved'}
                      className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold disabled:opacity-50 transition shadow-sm flex items-center gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5" /> Save Affiliation Details
                    </button>
                  </div>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default OrganisationDashboardPage;
