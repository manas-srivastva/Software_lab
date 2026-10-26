import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { organisationAPI } from '../services/api';

const OrganisationDashboardPage = () => {
  const [organisation, setOrganisation] = useState(null);
  const [affiliations, setAffiliations] = useState([]);
  const [doctorId, setDoctorId] = useState('');
  const [consultationFee, setConsultationFee] = useState('0');
  const [roomNumber, setRoomNumber] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [orgResponse, doctorsResponse] = await Promise.all([
        organisationAPI.getMyOrganisation(),
        organisationAPI.getMyDoctors(),
      ]);
      setOrganisation(orgResponse.data.organisation);
      setAffiliations(doctorsResponse.data.affiliations);
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

  if (loading) return <div className="p-10 text-center text-slate-500">Loading organisation...</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-6">
      <header className="bg-white rounded-2xl border p-6 flex flex-col sm:flex-row sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">{organisation?.name || 'Organisation dashboard'}</h1>
          <p className="text-sm text-slate-500 mt-1">{organisation?.city} {organisation?.address}</p>
          <p className="text-sm mt-2">Approval: <strong>{organisation?.approvalStatus}</strong></p>
        </div>
        <Link className="self-start px-4 py-2 rounded-xl bg-teal-600 text-white font-bold text-sm" to="/staff/queue">Manage organisation queue</Link>
      </header>
      {error && <p role="alert" className="p-3 bg-rose-50 text-rose-800 rounded-lg text-sm">{error}</p>}
      <form onSubmit={addDoctor} className="bg-white rounded-2xl border p-6 grid sm:grid-cols-2 gap-3">
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
