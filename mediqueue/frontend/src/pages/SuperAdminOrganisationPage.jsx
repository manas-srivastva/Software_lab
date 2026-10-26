import React, { useCallback, useEffect, useState } from 'react';
import { organisationAPI } from '../services/api';

const SuperAdminOrganisationPage = () => {
  const [organisations, setOrganisations] = useState([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const response = await organisationAPI.getPending();
      setOrganisations(response.data.organisations);
      setError('');
    } catch (requestError) {
      setError(requestError.message || 'Unable to load approval queue');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const review = async (id, decision) => {
    try {
      await organisationAPI.review(id, decision);
      await load();
    } catch (requestError) {
      setError(requestError.message || 'Unable to review organisation');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold">Organisation approvals</h1>
        <p className="text-sm text-slate-500 mt-1">Approve an organisation to activate its directory listings and management tools.</p>
      </div>
      {error && <p role="alert" className="p-3 bg-rose-50 text-rose-800 rounded-lg text-sm">{error}</p>}
      {organisations.length === 0 ? <div className="bg-white border rounded-2xl p-8 text-center text-slate-500">No pending organisations.</div> : (
        <div className="space-y-3">
          {organisations.map((organisation) => (
            <article key={organisation._id} className="bg-white border rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="font-bold">{organisation.name} <span className="font-normal text-slate-500">({organisation.type})</span></h2>
                <p className="text-sm text-slate-600">{organisation.city} · {organisation.address}</p>
                <p className="text-xs text-slate-500 mt-1">Administrator: {organisation.orgAdmin?.name} · {organisation.orgAdmin?.email}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => review(organisation._id, 'approve')} className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-bold">Approve</button>
                <button onClick={() => review(organisation._id, 'reject')} className="px-4 py-2 rounded-lg bg-rose-600 text-white text-sm font-bold">Reject</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default SuperAdminOrganisationPage;
