import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { appointmentAPI, organisationAPI } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import { CalendarDays, Users, ListChecks, Building2, ArrowUpRight } from 'lucide-react';

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
      setAffiliations(doctorsResponse.data.affiliations);
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

  if (loading) return <div className="p-10 text-center text-slate-500">Loading organisation...</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-6">
      <header className="relative overflow-hidden bg-gradient-to-br from-white via-white to-teal-50 rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
        <div className="absolute -right-8 -top-12 w-48 h-48 rounded-full bg-teal-100/50 blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-100">
              <Building2 className="w-3.5 h-3.5" /> Organisation workspace
            </span>
            <span className={`text-xs font-bold capitalize px-2.5 py-1 rounded-full border ${
              organisation?.approvalStatus === 'approved'
                ? 'text-emerald-700 bg-emerald-50 border-emerald-100'
                : 'text-amber-700 bg-amber-50 border-amber-100'
            }`}>
              {organisation?.approvalStatus || 'pending'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            {organisation?.name || 'Organisation dashboard'}
          </h1>
          <p className="text-sm text-slate-500 mt-2">{[organisation?.city, organisation?.address].filter(Boolean).join(' · ')}</p>
        </div>
        <Link className="relative self-start sm:self-center inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-teal-600 text-white font-bold text-sm shadow-md shadow-teal-700/20 hover:bg-teal-700 hover:-translate-y-0.5 transition" to="/staff/queue">
          Manage appointments &amp; queue <ArrowUpRight className="w-4 h-4" />
        </Link>
      </header>
      {error && <p role="alert" className="p-3 bg-rose-50 text-rose-800 rounded-lg text-sm">{error}</p>}
      <section className="grid gap-4 sm:grid-cols-3">
        <article className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition">
          <span className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center"><Users className="w-6 h-6 text-teal-600" /></span>
          <div><p className="text-xs uppercase font-bold tracking-wide text-slate-500">Affiliated doctors</p><p className="text-2xl font-black text-slate-900 mt-1">{affiliations.length}</p></div>
        </article>
        <article className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition">
          <span className="w-12 h-12 rounded-xl bg-sky-50 flex items-center justify-center"><CalendarDays className="w-6 h-6 text-sky-600" /></span>
          <div><p className="text-xs uppercase font-bold tracking-wide text-slate-500">Active appointments</p><p className="text-2xl font-black text-slate-900 mt-1">{activeAppointments.length}</p></div>
        </article>
        <article className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition">
          <span className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center"><ListChecks className="w-6 h-6 text-indigo-600" /></span>
          <div><p className="text-xs uppercase font-bold tracking-wide text-slate-500">Checked into queue</p><p className="text-2xl font-black text-slate-900 mt-1">{checkedInAppointments.length}</p></div>
        </article>
      </section>
      <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="font-bold text-lg">Recent organisation appointments</h2>
            <p className="text-xs text-slate-500 mt-1">Patient bookings and queue status for your organisation.</p>
          </div>
          <Link className="text-sm font-bold text-teal-700 hover:text-teal-900" to="/staff/queue">Open queue desk</Link>
        </div>
        {appointments.length === 0 ? (
          <p className="py-6 text-sm text-slate-500">No appointments have been booked for this organisation yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-500 bg-slate-50">
                <tr><th className="p-3">Patient</th><th className="p-3">Doctor</th><th className="p-3">Date &amp; time</th><th className="p-3">Status</th></tr>
              </thead>
              <tbody className="divide-y">
                {appointments.slice(0, 5).map((appointment) => (
                  <tr key={appointment._id}>
                    <td className="p-3 font-semibold">{appointment.patientId?.name || 'Patient'}</td>
                    <td className="p-3">{appointment.doctorId?.name || 'Doctor'}</td>
                    <td className="p-3">{appointment.date} · {appointment.time}</td>
                    <td className="p-3"><StatusBadge status={appointment.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <form onSubmit={addDoctor} className="bg-white rounded-2xl border border-slate-200 p-6 grid sm:grid-cols-2 gap-3 shadow-sm">
        <div className="sm:col-span-2">
          <h2 className="font-bold text-lg">Add a doctor affiliation</h2>
          <p className="text-xs text-slate-500 mt-1">Connect an approved doctor profile and set organisation-specific details.</p>
        </div>
        <input className="border rounded-xl p-3 text-sm" value={doctorId} onChange={(event) => setDoctorId(event.target.value)} placeholder="Doctor profile ID to affiliate" required />
        <input className="border rounded-xl p-3 text-sm" type="number" min="0" step="0.01" value={consultationFee} onChange={(event) => setConsultationFee(event.target.value)} placeholder="Consultation fee" />
        <input className="border rounded-xl p-3 text-sm" value={roomNumber} onChange={(event) => setRoomNumber(event.target.value)} placeholder="Organisation room" />
        <button disabled={organisation?.approvalStatus !== 'approved'} className="px-5 py-3 rounded-xl bg-teal-600 text-white font-bold text-sm disabled:opacity-50">Add doctor</button>
      </form>
      <section className="bg-white rounded-2xl border p-6">
        <h2 className="font-bold text-lg mb-4">Affiliated doctors</h2>
        {affiliations.length === 0 ? <p className="text-sm text-slate-500">No doctors affiliated yet.</p> : (
          <div className="divide-y">
            {affiliations.map((affiliation) => (
              <div key={affiliation._id} className="py-4">
                <p className="font-semibold">{affiliation.doctorId?.name || 'Doctor profile'}</p>
                <p className="text-xs text-slate-500 mb-3">{affiliation.doctorId?.specialization} · {affiliation.doctorId?.verificationStatus}</p>
                <form onSubmit={(event) => updateAffiliation(event, affiliation._id)} className="grid sm:grid-cols-2 gap-2">
                  <input name="consultationFee" type="number" min="0" step="0.01" defaultValue={affiliation.consultationFee} className="border rounded-lg p-2 text-sm" aria-label="Consultation fee" />
                  <input name="roomNumber" defaultValue={affiliation.roomNumber} className="border rounded-lg p-2 text-sm" aria-label="Room number" placeholder="Room number" />
                  <input name="availableDays" defaultValue={affiliation.availableDays?.join(', ')} className="border rounded-lg p-2 text-sm" aria-label="Available days" placeholder="Days, comma separated" />
                  <input name="availableSlots" defaultValue={affiliation.availableSlots?.join(', ')} className="border rounded-lg p-2 text-sm" aria-label="Available slots" placeholder="Slots, comma separated" />
                  <button disabled={organisation?.approvalStatus !== 'approved'} className="sm:col-span-2 justify-self-start px-4 py-2 rounded-lg bg-slate-800 text-white text-xs font-bold disabled:opacity-50">Save affiliation</button>
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
