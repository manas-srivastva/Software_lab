import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { doctorAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import {
  Search,
  Stethoscope,
  Clock,
  MapPin,
  Award,
  Calendar,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  Filter,
  Building2,
} from 'lucide-react';

const FindDoctorPage = () => {
  const { isPatient } = useAuth();
  const { error: toastError } = useToast();

  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [locationTerm, setLocationTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [departments, setDepartments] = useState(['All']);

  const fetchDoctors = async (filters = {}) => {
    setLoading(true);
    try {
      const params = {};
      const nextSearchTerm = filters.search ?? searchTerm;
      const nextLocationTerm = filters.location ?? locationTerm;
      const nextDepartment = filters.department ?? selectedDept;
      if (nextSearchTerm.trim()) params.search = nextSearchTerm.trim();
      if (nextLocationTerm.trim()) params.location = nextLocationTerm.trim();
      if (nextDepartment !== 'All') params.department = nextDepartment;

      const res = await doctorAPI.getDoctors(params);
      const list = res.data.doctors || [];
      setDoctors(list);

      // Collect unique departments
      if (departments.length === 1 && list.length > 0) {
        const uniqueDepts = ['All', ...new Set(list.map((d) => d.department))];
        setDepartments(uniqueDepts);
      }
    } catch (err) {
      toastError('Failed to load doctor directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, [selectedDept]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchDoctors();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-white via-white to-teal-50 p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute -right-8 -top-16 w-56 h-56 rounded-full bg-teal-100/50 blur-3xl pointer-events-none" />
        <div className="relative space-y-2">
          <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-100">
            <Stethoscope className="w-3.5 h-3.5" /> Medical staff directory
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Find the right specialist
          </h1>
          <p className="text-sm text-slate-500 max-w-lg">
            Browse doctors by specialty and location, then choose a time that works for you.
          </p>
        </div>

        {/* Search input */}
        <form onSubmit={handleSearchSubmit} className="relative flex flex-col sm:flex-row items-center gap-2 max-w-xl w-full">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or specialty..."
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white/90 text-sm transition focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
            />
          </div>
          <div className="relative flex-1 w-full">
            <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={locationTerm}
              onChange={(e) => setLocationTerm(e.target.value)}
              placeholder="City or address..."
              aria-label="Filter by city or address"
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white/90 text-sm transition focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
            />
          </div>
          <button
            type="submit"
            className="w-full sm:w-auto px-5 py-3 rounded-xl font-bold text-white bg-teal-600 hover:bg-teal-700 text-sm shadow-md shadow-teal-700/20 hover:-translate-y-0.5 transition"
          >
            Search
          </button>
        </form>
      </div>

      {/* Department Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
          <Filter className="w-3.5 h-3.5" /> Department:
        </span>
        {departments.map((dept) => (
          <button
            key={dept}
            onClick={() => setSelectedDept(dept)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${
              selectedDept === dept
                ? 'bg-teal-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {dept}
          </button>
        ))}
      </div>

      {/* Doctor Cards Grid */}
      {!loading && doctors.length > 0 && (
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <p className="text-sm font-semibold text-slate-700">
            {doctors.length} {doctors.length === 1 ? 'specialist' : 'specialists'} available
          </p>
          <p className="text-xs text-slate-400">Verified care providers</p>
        </div>
      )}
      {loading ? (
        <div className="py-20 text-center text-slate-400 text-sm">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-teal-600" />
          Fetching medical specialists...
        </div>
      ) : doctors.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-slate-200/80 p-8">
          <Stethoscope className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800">No doctors found</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto mb-4">
            No specialists match your search criteria. Try selecting another department or clearing search terms.
          </p>
          <button
            onClick={() => {
              setSearchTerm('');
              setLocationTerm('');
              setSelectedDept('All');
              fetchDoctors({ search: '', location: '', department: 'All' });
            }}
            className="px-4 py-2 rounded-xl text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {doctors.map((doc) => (
            <div
              key={doc._id}
              className="group bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-teal-200 transition duration-200 flex flex-col justify-between"
            >
              <div className="space-y-4">
                {/* Doctor Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-100 text-teal-700 flex items-center justify-center font-extrabold text-base shrink-0 shadow-sm group-hover:scale-105 transition">
                      Dr
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                        {doc.name}
                      </h3>
                      <p className="text-xs font-bold text-teal-600 mt-0.5">
                        {doc.specialization}
                      </p>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Available
                  </span>
                </div>

                <div className="flex items-start gap-2 text-xs text-slate-600">
                  <Building2 className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    {(doc.organisations?.length
                      ? doc.organisations
                      : [{ _id: 'legacy', name: doc.clinicHospitalName, city: '' }]
                    ).map((organisation) => (
                      <p key={organisation._id}>
                        <span className="font-semibold text-slate-700">{organisation.name}</span>
                        {organisation.city ? ` · ${organisation.city}` : ''}
                      </p>
                    ))}
                  </div>
                </div>

                {/* Badges / Credentials */}
                <div className="space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="truncate">{doc.qualifications || 'MBBS, MD'}</span>
                    <span className="text-slate-300">•</span>
                    <span>{doc.experienceYears || 8} yrs exp</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>{doc.roomNumber || 'Consultation Room'}</span>
                    <span className="text-slate-300">•</span>
                    <span className="font-semibold text-slate-700">{doc.department}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Avg. Consultation: ~{doc.averageConsultationMinutes} min</span>
                  </div>
                </div>

                {/* Available Days */}
                <div className="pt-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" /> Clinic Days
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {doc.availableDays?.map((day) => (
                      <span
                        key={day}
                        className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600"
                      >
                        {day.substring(0, 3)}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Slots Preview */}
                <div className="pt-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Sample Daily Slots
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {doc.availableSlots?.slice(0, 4).map((s) => (
                      <span
                        key={s}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-100"
                      >
                        {s}
                      </span>
                    ))}
                    {doc.availableSlots?.length > 4 && (
                      <span className="text-[10px] text-slate-400 px-1 py-0.5">
                        +{doc.availableSlots.length - 4} more
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              {isPatient && <div className="mt-6 pt-4 border-t border-slate-100">
                <Link
                  to={`/book-appointment?doctorId=${doc._id}${
                    doc.organisations?.[0]?._id ? `&orgId=${doc.organisations[0]._id}` : ''
                  }`}
                  className="w-full py-3 rounded-xl font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-sm transition text-xs flex items-center justify-center gap-2"
                >
                  Book with Dr. {doc.name.replace('Dr. ', '')}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FindDoctorPage;
