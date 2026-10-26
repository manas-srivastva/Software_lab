import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  CheckCircle2,
  Users,
  ArrowRight,
  Activity,
  Sparkles,
  Search,
  Stethoscope,
  MapPin,
  Award,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { doctorAPI, queueAPI } from '../services/api';

const HomePage = () => {
  const { isAuthenticated, isPatient } = useAuth();
  const [featuredDoctors, setFeaturedDoctors] = useState([]);
  const [liveQueueData, setLiveQueueData] = useState(null);
  const [loadingLive, setLoadingLive] = useState(true);

  useEffect(() => {
    const fetchLiveHomeData = async () => {
      try {
        // 1. Fetch real doctors from MongoDB database
        const docRes = await doctorAPI.getDoctors();
        const docs = docRes.data.doctors || [];
        setFeaturedDoctors(docs);

        // 2. If authenticated, check if patient has a real personal active token
        if (isPatient) {
          try {
            const myStatusRes = await queueAPI.getMyStatus();
            if (myStatusRes.data.hasActiveQueue) {
              setLiveQueueData({
                type: 'personal',
                data: myStatusRes.data,
              });
              setLoadingLive(false);
              return;
            }
          } catch (e) {
            // Fall through to public queue
          }
        }

        // 3. Otherwise, fetch real live queue for the first doctor in the database
        if (docs.length > 0) {
          const firstDoctor = docs[0];
          const queueRes = await queueAPI.getDoctorQueue(firstDoctor._id);
          setLiveQueueData({
            type: 'public',
            doctor: firstDoctor,
            summary: queueRes.data.summary,
            queueEntries: queueRes.data.queueEntries || [],
          });
        }
      } catch (err) {
        console.error('Error fetching live home data:', err);
      } finally {
        setLoadingLive(false);
      }
    };

    fetchLiveHomeData();
  }, [isPatient]);

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-teal-50/70 via-white to-slate-50 pt-12 pb-20 lg:pt-20 lg:pb-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Messaging */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-100/80 text-teal-800 text-xs font-semibold tracking-wide border border-teal-200 shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                Live OPD Queue & Specialist Booking
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
                Say goodbye to crowded hospital waiting rooms.
              </h1>

              <p className="text-lg sm:text-xl text-slate-600 max-w-2xl leading-relaxed">
                <span className="font-semibold text-slate-800">MediQueue</span> connects directly to live clinic records, allowing patients to schedule appointments with certified specialists, check in on arrival, and monitor real-time queue tokens and wait times.
              </p>

              {/* Primary Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                {isPatient ? (
                  <Link
                    to="/book-appointment"
                    className="px-6 py-3.5 rounded-xl font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-lg shadow-teal-600/30 transition transform hover:-translate-y-0.5 flex items-center gap-2"
                  >
                    <Calendar className="w-5 h-5" />
                    Book an Appointment
                  </Link>
                ) : !isAuthenticated ? (
                  <Link
                    to="/register"
                    className="px-6 py-3.5 rounded-xl font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-lg shadow-teal-600/30 transition transform hover:-translate-y-0.5 flex items-center gap-2"
                  >
                    Get Started
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                ) : null}

                <Link
                  to="/queue"
                  className="px-6 py-3.5 rounded-xl font-bold text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 shadow-sm transition transform hover:-translate-y-0.5 flex items-center gap-2"
                >
                  <Clock className="w-5 h-5 text-teal-600" />
                  Track My Queue
                </Link>
              </div>

              {/* Quick Trust Badges */}
              <div className="pt-6 border-t border-slate-200 grid grid-cols-3 gap-4 text-xs font-semibold text-slate-600">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>Real-time Doctor Sync</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>Sequential Tokens</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>Zero Double-Booking</span>
                </div>
              </div>
            </div>

            {/* Right Column: Real-Time Live Database Queue Card */}
            <div className="lg:col-span-5">
              <div className="relative mx-auto max-w-md">
                {/* Glow Backdrop */}
                <div className="absolute -inset-1.5 bg-gradient-to-r from-teal-500 to-sky-500 rounded-3xl blur-xl opacity-25"></div>

                {/* Card Container with Real Live Data from MongoDB */}
                <div className="relative bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
                        <Activity className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">
                          {liveQueueData?.type === 'personal'
                            ? 'Your Active Ticket'
                            : 'Live OPD Queue'}
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          {liveQueueData?.type === 'personal'
                            ? `Dr. ${liveQueueData.data.queue?.doctorId?.name} • ${liveQueueData.data.queue?.doctorId?.department}`
                            : liveQueueData?.doctor
                            ? `Dr. ${liveQueueData.doctor.name} • ${liveQueueData.doctor.department}`
                            : 'Connecting to hospital database...'}
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                      OPD Live
                    </span>
                  </div>

                  {/* Token Spotlight: Personal or Live Doctor Queue */}
                  {loadingLive ? (
                    <div className="my-8 py-12 text-center text-slate-400 text-xs">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-600" />
                      Connecting to MongoDB queue records...
                    </div>
                  ) : liveQueueData?.type === 'personal' ? (
                    <>
                      <div className="my-6 text-center py-6 px-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 text-white shadow-inner">
                        <span className="text-xs uppercase tracking-widest font-semibold text-teal-400">
                          Your Active Token
                        </span>
                        <div className="text-6xl font-black tracking-tight text-white mt-1 mb-2">
                          #{liveQueueData.data.queue?.tokenNumber}
                        </div>
                        <div className="inline-block px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-medium border border-teal-500/30">
                          Status: {liveQueueData.data.queue?.status}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-center">
                        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                          <p className="text-xs text-slate-500 font-medium">Currently Serving</p>
                          <p className="text-2xl font-bold text-slate-900 mt-0.5">
                            {liveQueueData.data.currentTokenBeingServed
                              ? `#${liveQueueData.data.currentTokenBeingServed}`
                              : 'None'}
                          </p>
                          <span className="text-[10px] text-teal-600 font-semibold">
                            {liveQueueData.data.queue?.doctorId?.roomNumber}
                          </span>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-teal-50/60 border border-teal-100">
                          <p className="text-xs text-teal-800 font-medium">Est. Wait Time</p>
                          <p className="text-2xl font-bold text-teal-700 mt-0.5">
                            ~{liveQueueData.data.estimatedWaitMinutes} min
                          </p>
                          <span className="text-[10px] text-slate-500 font-medium">
                            {liveQueueData.data.patientsAhead} patients ahead
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="my-6 text-center py-6 px-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 text-white shadow-inner">
                        <span className="text-xs uppercase tracking-widest font-semibold text-teal-400">
                          Current Token Serving
                        </span>
                        <div className="text-6xl font-black tracking-tight text-white mt-1 mb-2">
                          {liveQueueData?.summary?.currentServingToken
                            ? `#${liveQueueData.summary.currentServingToken}`
                            : '#--'}
                        </div>
                        <div className="inline-block px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-medium border border-teal-500/30">
                          {liveQueueData?.summary?.waitingCount > 0
                            ? `${liveQueueData.summary.waitingCount} in waiting line`
                            : 'Queue Open for Consultations'}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-center">
                        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                          <p className="text-xs text-slate-500 font-medium">Consultation Room</p>
                          <p className="text-base font-bold text-slate-900 mt-1 truncate">
                            {liveQueueData?.doctor?.roomNumber || 'Room 101'}
                          </p>
                          <span className="text-[10px] text-teal-600 font-semibold">
                            {liveQueueData?.doctor?.department}
                          </span>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-teal-50/60 border border-teal-100">
                          <p className="text-xs text-teal-800 font-medium">Total Checked-In</p>
                          <p className="text-2xl font-bold text-teal-700 mt-0.5">
                            {liveQueueData?.summary?.totalTokens || 0}
                          </p>
                          <span className="text-[10px] text-slate-500 font-medium">
                            Avg: {liveQueueData?.doctor?.averageConsultationMinutes || 15}m / patient
                          </span>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-teal-600" /> Database-synchronized
                    </span>
                    <Link
                      to="/queue"
                      className="font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1"
                    >
                      Open Live Board <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Doctors Section: Loaded Dynamically from MongoDB */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-teal-600">
              Verified Medical Staff
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
              Featured Hospital Specialists
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Book guaranteed appointment slots directly with certified physicians.
            </p>
          </div>
          <Link
            to="/doctors"
            className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1"
          >
            Browse all {featuredDoctors.length} doctors <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featuredDoctors.slice(0, 3).map((doc) => (
            <div
              key={doc._id}
              className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 text-teal-700 flex items-center justify-center font-black text-sm shrink-0">
                      Dr
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base leading-tight">
                        {doc.name}
                      </h3>
                      <p className="text-xs font-bold text-teal-600">{doc.specialization}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Accepting
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-500 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <Award className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{doc.qualifications}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{doc.roomNumber} ({doc.department})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Avg. Consultation: ~{doc.averageConsultationMinutes} min</span>
                  </div>
                </div>
              </div>

              {isPatient && (
                <Link
                  to={`/book-appointment?doctorId=${doc._id}`}
                  className="w-full py-2.5 rounded-xl font-bold text-white bg-teal-600 hover:bg-teal-700 text-xs shadow-sm transition flex items-center justify-center gap-2"
                >
                  Book with Dr. {doc.name.replace('Dr. ', '')}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Feature Cards Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <h2 className="text-xs font-bold uppercase tracking-wider text-teal-600 mb-2">
            Engineered for Modern Healthcare
          </h2>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Seamless Patient Care from Booking to Consultation
          </h3>
          <p className="mt-3 text-base text-slate-600">
            A purpose-built suite that eliminates manual reception bottlenecks, prevents scheduling conflicts, and keeps patients informed every minute.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white rounded-2xl p-8 border border-slate-200/80 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center mb-6">
              <Calendar className="w-6 h-6" />
            </div>
            <h4 className="text-xl font-bold text-slate-900 mb-3">
              1. Easy Specialist Booking
            </h4>
            <p className="text-slate-600 text-sm leading-relaxed mb-4">
              Explore doctors across Cardiology, Pediatrics, Dermatology, and more. Pick your preferred date and verified available time slot without conflicts.
            </p>
            <ul className="text-xs space-y-2 text-slate-500 font-medium">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" /> Verified slot availability
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" /> Database-backed conflict protection
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-2xl p-8 border border-slate-200/80 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center mb-6">
              <Clock className="w-6 h-6" />
            </div>
            <h4 className="text-xl font-bold text-slate-900 mb-3">
              2. Reduced Waiting Time
            </h4>
            <p className="text-slate-600 text-sm leading-relaxed mb-4">
              Stop sitting for hours in cold waiting areas. MediQueue calculates live estimated waiting intervals based on doctor-specific average consultation durations.
            </p>
            <ul className="text-xs space-y-2 text-slate-500 font-medium">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-sky-600" /> Dynamic minutes forecast
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-sky-600" /> Real-time "patients ahead" counter
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-2xl p-8 border border-slate-200/80 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-6">
              <Users className="w-6 h-6" />
            </div>
            <h4 className="text-xl font-bold text-slate-900 mb-3">
              3. Smart Queue & Tokens
            </h4>
            <p className="text-slate-600 text-sm leading-relaxed mb-4">
              Generate an orderly, sequential token upon check-in. Receptionists advance queue statuses securely while patients track progress with one click.
            </p>
            <ul className="text-xs space-y-2 text-slate-500 font-medium">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" /> Unique sequential tokens per doctor/date
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" /> Staff authorization controls
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Call to Action for Patients */}
      {!isAuthenticated && (
        <section className="max-w-4xl mx-auto px-4 text-center">
          <div className="p-8 sm:p-10 rounded-3xl bg-teal-50 border border-teal-200/80 space-y-4">
            <h3 className="text-2xl font-bold text-slate-900">
              Ready to experience modern healthcare queueing?
            </h3>
            <p className="text-slate-600 text-sm max-w-lg mx-auto">
              Create your patient account in under 30 seconds to schedule appointments and receive digital queue tokens.
            </p>
            <div className="pt-2 flex justify-center gap-3">
              <Link
                to="/register"
                className="px-6 py-3 rounded-xl font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-md shadow-teal-600/30 transition"
              >
                Register as Patient
              </Link>
              <Link
                to="/login"
                className="px-6 py-3 rounded-xl font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition"
              >
                Log In
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default HomePage;
