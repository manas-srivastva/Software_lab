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
  Stethoscope,
  MapPin,
  Award,
  ShieldCheck,
  Building2,
  ChevronRight,
  UserCheck,
  AlertCircle,
  UserPlus,
  LogIn,
  BarChart3,
  CheckSquare,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { doctorAPI, queueAPI, appointmentAPI, adminAPI } from '../services/api';
import StatusBadge from '../components/StatusBadge';

const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const HomePage = () => {
  const { user, isAuthenticated } = useAuth();
  const userRole = user?.role;

  // Shared state
  const [featuredDoctors, setFeaturedDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Patient state
  const [patientQueueStatus, setPatientQueueStatus] = useState(null);
  const [patientAppointments, setPatientAppointments] = useState([]);

  // Doctor state
  const [doctorProfile, setDoctorProfile] = useState(null);
  const [doctorAppointments, setDoctorAppointments] = useState([]);

  // Receptionist state
  const [clinicAppointments, setClinicAppointments] = useState([]);
  const [receptionQueueSummary, setReceptionQueueSummary] = useState(null);

  // Admin state
  const [adminStats, setAdminStats] = useState(null);
  const [pendingDoctors, setPendingDoctors] = useState([]);

  // Guest public queue state
  const [publicQueueData, setPublicQueueData] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadRoleData = async () => {
      setLoading(true);
      try {
        // Load approved public doctors for guest and patient
        const docRes = await doctorAPI.getDoctors();
        const docs = docRes.data.doctors || [];
        if (isMounted) setFeaturedDoctors(docs);

        if (!isAuthenticated) {
          // Guest: Fetch public OPD queue preview for the first doctor
          if (docs.length > 0) {
            try {
              const queueRes = await queueAPI.getDoctorQueue(docs[0]._id);
              if (isMounted) {
                setPublicQueueData({
                  doctor: docs[0],
                  summary: queueRes.data.summary,
                  queueEntries: queueRes.data.queueEntries || [],
                });
              }
            } catch (e) {
              console.warn('Could not load public queue preview:', e.message);
            }
          }
        } else if (userRole === 'patient') {
          // Patient: Fetch active queue status and upcoming appointments
          const [statusRes, apptRes] = await Promise.allSettled([
            queueAPI.getMyStatus(),
            appointmentAPI.getMyAppointments(),
          ]);

          if (isMounted && statusRes.status === 'fulfilled' && statusRes.value.data.hasActiveQueue) {
            setPatientQueueStatus(statusRes.value.data);
          }
          if (isMounted && apptRes.status === 'fulfilled') {
            setPatientAppointments(apptRes.value.data.appointments || []);
          }
        } else if (userRole === 'doctor') {
          // Doctor: Fetch profile, verification status, and today's assigned appointments
          const [profRes, apptRes] = await Promise.allSettled([
            doctorAPI.getMyProfile(),
            appointmentAPI.getDoctorAppointments(),
          ]);

          if (isMounted && profRes.status === 'fulfilled') {
            setDoctorProfile(profRes.value.data.doctor);
          }
          if (isMounted && apptRes.status === 'fulfilled') {
            setDoctorAppointments(apptRes.value.data.appointments || []);
          }
        } else if (userRole === 'receptionist') {
          // Receptionist: Fetch today's clinic appointments and doctor queue summary
          const today = getTodayDate();
          const apptRes = await appointmentAPI.getAllAppointments({ date: today }).catch(() => null);
          if (isMounted && apptRes?.data) {
            setClinicAppointments(apptRes.data.appointments || []);
          }
          if (docs.length > 0) {
            try {
              const qRes = await queueAPI.getDoctorQueue(docs[0]._id, { date: today });
              if (isMounted) {
                setReceptionQueueSummary({
                  doctor: docs[0],
                  summary: qRes.data.summary,
                });
              }
            } catch (e) {
              // ignore
            }
          }
        } else if (userRole === 'admin' || userRole === 'superadmin' || userRole === 'orgAdmin') {
          // Admin: Fetch reports and pending doctor applications
          const promises = [adminAPI.getDoctors({ status: 'PENDING' })];
          // getReports is only for admin/superadmin, not orgAdmin
          if (userRole === 'admin' || userRole === 'superadmin') {
            promises.unshift(adminAPI.getReports());
          }
          const results = await Promise.allSettled(promises);
          const reportsRes = (userRole === 'admin' || userRole === 'superadmin') ? results[0] : null;
          const pendingDocsRes = (userRole === 'admin' || userRole === 'superadmin') ? results[1] : results[0];

          if (isMounted && reportsRes && reportsRes.status === 'fulfilled') {
            setAdminStats(reportsRes.value.data.summary || reportsRes.value.data);
          }
          if (isMounted && pendingDocsRes && pendingDocsRes.status === 'fulfilled') {
            setPendingDoctors(pendingDocsRes.value.data.doctors || []);
          }
        }
      } catch (err) {
        console.error('Home data load error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadRoleData();
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, userRole]);

  // Derived patient metrics
  const upcomingPatientAppointments = patientAppointments.filter(
    (a) => ['confirmed', 'checked-in', 'in-consultation'].includes(a.status)
  );
  const nextAppointment = upcomingPatientAppointments[0] || null;

  // Derived doctor metrics
  const todayDateStr = getTodayDate();
  const todayDoctorAppointments = doctorAppointments.filter((a) => a.date === todayDateStr);
  const activeDoctorConsultation = doctorAppointments.find(
    (a) => a.queueEntry?.status === 'in-consultation'
  );

  return (
    <div className="space-y-14 sm:space-y-16 pb-20">
      {/* ============================================================== */}
      {/* 1. GUEST HOMEPAGE HERO                                         */}
      {/* ============================================================== */}
      {!isAuthenticated && (
        <section className="relative overflow-hidden bg-gradient-to-b from-teal-50/80 via-white to-slate-50/70 pt-10 pb-16 sm:pt-16 sm:pb-24 lg:pt-20 lg:pb-28 border-b border-slate-200/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
              {/* Left Column: Guest Overview & Call-to-Actions */}
              <div className="lg:col-span-7 space-y-6 sm:space-y-7">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-100/90 text-teal-900 text-xs font-bold tracking-wide border border-teal-200 shadow-sm">
                  <Sparkles className="w-3.5 h-3.5 text-teal-700" />
                  Hospital Outpatient Booking &amp; Queue Management
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.12]">
                  Say goodbye to crowded hospital waiting rooms.
                </h1>

                <p className="text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed">
                  <span className="font-semibold text-slate-900">MediQueue</span> reduces outpatient wait times, eliminates booking conflicts, and organizes hospital queues with certified specialist discovery, scheduled appointments, and real-time token tracking.
                </p>

                {/* Primary Action Buttons for Guests */}
                <div className="flex flex-wrap items-center gap-3.5 pt-2">
                  <Link
                    to="/register"
                    className="px-6 py-3.5 rounded-2xl font-bold text-sm text-white bg-teal-600 hover:bg-teal-700 shadow-lg shadow-teal-700/25 transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    Register as Patient
                  </Link>

                  <Link
                    to="/login"
                    className="px-6 py-3.5 rounded-2xl font-bold text-sm text-slate-800 bg-white hover:bg-slate-50 border border-slate-200/90 shadow-sm transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                  >
                    <LogIn className="w-4 h-4 text-teal-600" />
                    Log In to Account
                  </Link>

                  <Link
                    to="/join-as-doctor"
                    className="px-5 py-3.5 rounded-2xl font-bold text-sm text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition flex items-center gap-1.5"
                  >
                    <Stethoscope className="w-4 h-4 text-teal-700" />
                    Join as Doctor
                  </Link>

                  <Link
                    to="/doctors"
                    className="px-4 py-3.5 rounded-2xl font-bold text-sm text-slate-600 hover:text-teal-700 transition flex items-center gap-1.5"
                  >
                    Browse Specialists <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>

                {/* Quick Trust Badges */}
                <div className="pt-6 border-t border-slate-200/80 grid grid-cols-3 gap-3 sm:gap-4 text-xs font-semibold text-slate-600">
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
                    <span>No Double-Booking</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Public OPD Live Queue Card */}
              <div className="lg:col-span-5">
                <div className="relative mx-auto max-w-md">
                  <div className="absolute -inset-1.5 bg-gradient-to-r from-teal-500/25 to-sky-500/25 rounded-3xl blur-xl opacity-75"></div>

                  <div className="relative bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200/80 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-100 text-teal-700 flex items-center justify-center">
                          <Activity className="w-5 h-5 stroke-[2.2]" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 leading-tight">Live OPD Queue Board</h4>
                          <p className="text-xs text-slate-500 truncate max-w-[190px]">
                            {publicQueueData?.doctor ? `Dr. ${publicQueueData.doctor.name}` : 'Hospital Outpatient Records'}
                          </p>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        OPD Live
                      </span>
                    </div>

                    <div className="my-4 text-center py-6 px-4 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 text-white shadow-inner relative overflow-hidden">
                      <span className="text-[11px] uppercase tracking-widest font-extrabold text-teal-300">
                        Currently Serving
                      </span>
                      <div className="text-6xl font-black tracking-tight text-white my-1">
                        {publicQueueData?.summary?.currentServingToken ? `#${publicQueueData.summary.currentServingToken}` : '#--'}
                      </div>
                      <div className="inline-block px-3 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-xs font-semibold border border-teal-500/30">
                        {publicQueueData?.summary?.waitingCount > 0
                          ? `${publicQueueData.summary.waitingCount} in waiting lounge`
                          : 'Queue open for consultations'}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-center">
                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                        <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Department</p>
                        <p className="text-sm font-bold text-slate-900 mt-1 truncate">
                          {publicQueueData?.doctor?.department || 'General OPD'}
                        </p>
                        <span className="text-[10px] text-teal-700 font-bold truncate block">
                          {publicQueueData?.doctor?.roomNumber || 'Room 101'}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-teal-50/70 border border-teal-100">
                        <p className="text-[11px] text-teal-900 font-bold uppercase tracking-wider">Checked In</p>
                        <p className="text-2xl font-black text-teal-700 mt-0.5">
                          {publicQueueData?.summary?.totalTokens || 0}
                        </p>
                        <span className="text-[10px] text-slate-500 font-medium">
                          Avg: {publicQueueData?.doctor?.averageConsultationMinutes || 15}m / patient
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Clock className="w-3.5 h-3.5 text-teal-600" /> Database-synchronized
                      </span>
                      <Link to="/queue" className="font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1">
                        Open Live Board <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ============================================================== */}
      {/* 2. PATIENT ROLE HOMEPAGE                                       */}
      {/* ============================================================== */}
      {isAuthenticated && userRole === 'patient' && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-8">
          {/* Patient Welcome Banner */}
          <div className="relative overflow-hidden bg-gradient-to-br from-white via-white to-teal-50/90 p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 text-teal-800 text-xs font-bold border border-teal-200">
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                Verified Patient Portal
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Welcome back, {user?.name || 'Patient'}
              </h1>
              <p className="text-sm text-slate-600 max-w-xl">
                Manage your hospital visits, schedule specialist appointments with verified availability, and track live queue wait times in real time.
              </p>
            </div>

            {/* Patient Primary Action Hub */}
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/book-appointment"
                className="px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm text-white bg-teal-600 hover:bg-teal-700 shadow-md shadow-teal-700/25 transition flex items-center gap-2"
              >
                <Calendar className="w-4 h-4" />
                Book Appointment
              </Link>
              <Link
                to="/doctors"
                className="px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 shadow-sm transition flex items-center gap-2"
              >
                <Stethoscope className="w-4 h-4 text-teal-600" />
                Search Doctors
              </Link>
              <Link
                to="/appointments"
                className="px-4 py-3 rounded-2xl font-bold text-xs sm:text-sm text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition flex items-center gap-1.5"
              >
                <Clock className="w-4 h-4" />
                My History ({patientAppointments.length})
              </Link>
            </div>
          </div>

          {/* Patient Quick Widgets Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Live Queue Ticket Widget */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-700 flex items-center gap-1.5">
                    <Activity className="w-4 h-4" /> Live Queue Status
                  </span>
                  {patientQueueStatus?.hasActiveQueue && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 animate-pulse">
                      Active
                    </span>
                  )}
                </div>

                {patientQueueStatus?.hasActiveQueue ? (
                  <div className="mt-4 space-y-3">
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-teal-950 text-white text-center">
                      <span className="text-[10px] uppercase tracking-widest font-extrabold text-teal-300">
                        Your Token Number
                      </span>
                      <p className="text-4xl font-black text-white mt-0.5">
                        #{patientQueueStatus.queue?.tokenNumber}
                      </p>
                      <span className="text-xs text-teal-300 font-semibold">
                        Status: {patientQueueStatus.queue?.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-center text-xs">
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-slate-400 font-medium block">Serving Now</span>
                        <strong className="text-base text-slate-800">
                          {patientQueueStatus.currentTokenBeingServed ? `#${patientQueueStatus.currentTokenBeingServed}` : 'None'}
                        </strong>
                      </div>
                      <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-100">
                        <span className="text-teal-800 font-medium block">Est. Wait</span>
                        <strong className="text-base text-teal-700">
                          ~{patientQueueStatus.estimatedWaitMinutes} min
                        </strong>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="my-6 text-center text-xs text-slate-500 space-y-1">
                    <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No active queue token right now</p>
                    <p className="text-slate-400">Tokens are generated when you check in on the day of your appointment.</p>
                  </div>
                )}
              </div>

              <Link
                to="/queue"
                className="w-full py-2.5 rounded-xl text-xs font-bold text-center text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition flex items-center justify-center gap-1.5"
              >
                Open Queue Tracking <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Upcoming Appointments Summary Widget */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-teal-600" /> Upcoming Visits
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    {upcomingPatientAppointments.length} Active
                  </span>
                </div>

                {nextAppointment ? (
                  <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm">
                        Dr. {nextAppointment.doctorId?.name?.replace('Dr. ', '')}
                      </span>
                      <StatusBadge status={nextAppointment.status} />
                    </div>
                    <p className="text-teal-700 font-semibold">{nextAppointment.doctorId?.specialization}</p>
                    <div className="flex items-center gap-3 text-slate-600 pt-1 border-t border-slate-200/70">
                      <span className="flex items-center gap-1 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" /> {nextAppointment.date}
                      </span>
                      <span className="flex items-center gap-1 font-medium">
                        <Clock className="w-3.5 h-3.5 text-slate-400" /> {nextAppointment.time}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="my-6 text-center text-xs text-slate-500 space-y-1">
                    <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No upcoming appointments</p>
                    <p className="text-slate-400">Schedule your next consultation with one of our certified specialists.</p>
                  </div>
                )}
              </div>

              <Link
                to="/appointments"
                className="w-full py-2.5 rounded-xl text-xs font-bold text-center text-slate-700 bg-slate-100 hover:bg-slate-200 transition flex items-center justify-center gap-1.5"
              >
                View All Appointments <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Quick Doctor Discovery Widget */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Stethoscope className="w-4 h-4 text-teal-600" /> Certified Specialists
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {featuredDoctors.length} Available
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-xs">
                  {featuredDoctors.slice(0, 2).map((doc) => (
                    <div key={doc._id} className="p-3 rounded-2xl border border-slate-100 hover:border-teal-200 bg-slate-50/70 flex items-center justify-between gap-3">
                      <div className="truncate">
                        <p className="font-bold text-slate-900 truncate">{doc.name}</p>
                        <p className="text-slate-500 text-[11px] truncate">{doc.specialization} • {doc.department}</p>
                      </div>
                      <Link
                        to={`/book-appointment?doctorId=${doc._id}`}
                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-white bg-teal-600 hover:bg-teal-700 shrink-0 transition"
                      >
                        Book
                      </Link>
                    </div>
                  ))}
                </div>
              </div>

              <Link
                to="/doctors"
                className="w-full py-2.5 rounded-xl text-xs font-bold text-center text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition flex items-center justify-center gap-1.5"
              >
                Browse All Doctors <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ============================================================== */}
      {/* 3. DOCTOR ROLE HOMEPAGE                                        */}
      {/* ============================================================== */}
      {isAuthenticated && userRole === 'doctor' && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-8">
          {/* Doctor Header Banner */}
          <div className="relative overflow-hidden bg-gradient-to-br from-white via-white to-sky-50/90 p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 text-sky-800 text-xs font-bold border border-sky-200">
                  <Stethoscope className="w-3.5 h-3.5 text-sky-600" />
                  Physician Consultation Workspace
                </span>
                {doctorProfile?.verificationStatus && (
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                    doctorProfile.verificationStatus === 'APPROVED'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : doctorProfile.verificationStatus === 'NEEDS_CHANGES'
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-sky-50 text-sky-800 border-sky-200'
                  }`}>
                    {doctorProfile.verificationStatus}
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Welcome, {doctorProfile?.name || user?.name}
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-semibold text-teal-700">{doctorProfile?.specialization || 'Specialist'}</span>
                <span className="text-slate-300">•</span>
                <span>{doctorProfile?.department || 'Outpatient Clinic'}</span>
                <span className="text-slate-300">•</span>
                <span>Room: {doctorProfile?.roomNumber || 'Consultation Room'}</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/doctor/dashboard"
                className="px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm text-white bg-teal-600 hover:bg-teal-700 shadow-md shadow-teal-700/25 transition flex items-center gap-2"
              >
                <Stethoscope className="w-4 h-4" />
                Go to Physician Desk
              </Link>
              <Link
                to="/queue"
                className="px-4 py-3 rounded-2xl font-bold text-xs sm:text-sm text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 shadow-sm transition flex items-center gap-1.5"
              >
                <Activity className="w-4 h-4 text-teal-600" />
                Live Clinic Queue
              </Link>
            </div>
          </div>

          {/* Application Review Status Alert if not APPROVED */}
          {doctorProfile && doctorProfile.verificationStatus !== 'APPROVED' && (
            <div className={`p-5 rounded-3xl border shadow-sm flex items-start gap-3.5 ${
              doctorProfile.verificationStatus === 'NEEDS_CHANGES'
                ? 'bg-amber-50/90 border-amber-200 text-amber-900'
                : 'bg-sky-50/90 border-sky-200 text-sky-900'
            }`}>
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs sm:text-sm">
                <strong className="font-bold block">
                  Application Status: {doctorProfile.verificationStatus}
                </strong>
                <p className="leading-relaxed opacity-90">
                  {doctorProfile.verificationStatus === 'PENDING' &&
                    'Your credentials and medical license are under administrative review. You can configure availability once approved.'}
                  {doctorProfile.verificationStatus === 'NEEDS_CHANGES' &&
                    `Changes requested: "${doctorProfile.statusReason}". Please review and resubmit in your Physician Desk.`}
                </p>
                <Link to="/doctor/dashboard" className="inline-block font-bold underline mt-1">
                  Open Physician Desk to view details →
                </Link>
              </div>
            </div>
          )}

          {/* Doctor Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span>Today's Assigned Consultations</span>
                <Calendar className="w-4 h-4 text-teal-600" />
              </div>
              <p className="text-3xl font-black text-slate-900">{todayDoctorAppointments.length}</p>
              <p className="text-xs text-slate-500">
                {activeDoctorConsultation
                  ? `In consultation with ${activeDoctorConsultation.patientId?.name || 'Patient'}`
                  : 'No active patient in consultation right now'}
              </p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span>Total Assigned Patients</span>
                <Users className="w-4 h-4 text-sky-600" />
              </div>
              <p className="text-3xl font-black text-slate-900">{doctorAppointments.length}</p>
              <p className="text-xs text-slate-500">Total appointments booked through MediQueue</p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span>Configured Practice Days</span>
                <Clock className="w-4 h-4 text-indigo-600" />
              </div>
              <p className="text-sm font-bold text-slate-800 truncate">
                {doctorProfile?.availableDays?.join(', ') || 'Not configured'}
              </p>
              <p className="text-xs text-slate-500">
                Avg duration: {doctorProfile?.averageConsultationMinutes || 15} min / consultation
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ============================================================== */}
      {/* 4. RECEPTIONIST ROLE HOMEPAGE                                  */}
      {/* ============================================================== */}
      {isAuthenticated && userRole === 'receptionist' && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-8">
          {/* Receptionist Header Banner */}
          <div className="relative overflow-hidden bg-gradient-to-br from-white via-white to-teal-50/90 p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 text-teal-800 text-xs font-bold border border-teal-200">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                Hospital Reception &amp; Outpatient Desk
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Reception Operations Console
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 max-w-xl">
                Check in arriving patients, issue sequential OPD queue tokens, monitor doctor queues, and oversee today's outpatient flow.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/staff/queue"
                className="px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm text-white bg-teal-600 hover:bg-teal-700 shadow-md shadow-teal-700/25 transition flex items-center gap-2"
              >
                <UserCheck className="w-4 h-4" />
                Open Staff Queue Desk
              </Link>
              <Link
                to="/queue"
                className="px-4 py-3 rounded-2xl font-bold text-xs sm:text-sm text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 shadow-sm transition flex items-center gap-1.5"
              >
                <Activity className="w-4 h-4 text-teal-600" />
                Live OPD Board
              </Link>
            </div>
          </div>

          {/* Receptionist OPD Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span>Today's Total Bookings</span>
                <Calendar className="w-4 h-4 text-teal-600" />
              </div>
              <p className="text-3xl font-black text-slate-900">{clinicAppointments.length}</p>
              <p className="text-xs text-slate-500">Scheduled outpatient appointments for today</p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span>Checked-In &amp; In Queue</span>
                <Clock className="w-4 h-4 text-sky-600" />
              </div>
              <p className="text-3xl font-black text-sky-700">
                {clinicAppointments.filter((a) => ['checked-in', 'in-consultation'].includes(a.status)).length}
              </p>
              <p className="text-xs text-slate-500">Patients currently waiting or in consultation</p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span>Awaiting Patient Arrival</span>
                <AlertCircle className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-3xl font-black text-amber-700">
                {clinicAppointments.filter((a) => a.status === 'confirmed').length}
              </p>
              <p className="text-xs text-slate-500">Confirmed appointments pending check-in confirmation</p>
            </div>
          </div>
        </section>
      )}

      {/* ============================================================== */}
      {/* 5. ADMIN ROLE HOMEPAGE                                         */}
      {/* ============================================================== */}
      {isAuthenticated && (userRole === 'admin' || userRole === 'superadmin' || userRole === 'orgAdmin') && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-8">
          {/* Admin Header Banner */}
          <div className="relative overflow-hidden bg-gradient-to-br from-white via-white to-teal-50/90 p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 text-teal-800 text-xs font-bold border border-teal-200">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                Hospital Governance &amp; Administration
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Hospital Administration Overview
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 max-w-xl">
                Oversee clinical onboarding, review medical credentials, manage active doctors, and monitor hospital appointment statistics.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/admin/doctors"
                className="px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm text-white bg-teal-600 hover:bg-teal-700 shadow-md shadow-teal-700/25 transition flex items-center gap-2"
              >
                <CheckSquare className="w-4 h-4" />
                Doctor Approvals ({pendingDoctors.length})
              </Link>
              {userRole === 'superadmin' && (
                <Link
                  to="/admin/organisations"
                  className="px-4 py-3 rounded-2xl font-bold text-xs sm:text-sm text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 shadow-sm transition flex items-center gap-1.5"
                >
                  <Building2 className="w-4 h-4 text-teal-600" />
                  Organisations
                </Link>
              )}
            </div>
          </div>

          {/* Admin Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span>Pending Doctor Applications</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-3xl font-black text-amber-700">{pendingDoctors.length}</p>
              <Link to="/admin/doctors?tab=pending" className="text-xs font-bold text-teal-700 hover:text-teal-900 inline-flex items-center gap-1">
                Review credential applications <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span>Active Approved Doctors</span>
                <Stethoscope className="w-4 h-4 text-teal-600" />
              </div>
              <p className="text-3xl font-black text-slate-900">{featuredDoctors.length}</p>
              <Link to="/admin/doctors?tab=approved" className="text-xs font-bold text-teal-700 hover:text-teal-900 inline-flex items-center gap-1">
                Manage doctor directory <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span>System Administration</span>
                <BarChart3 className="w-4 h-4 text-sky-600" />
              </div>
              <p className="text-sm font-bold text-slate-800">Hospital Platform Healthy</p>
              <Link to="/admin/doctors" className="text-xs font-bold text-teal-700 hover:text-teal-900 inline-flex items-center gap-1">
                View platform management <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ============================================================== */}
      {/* 6. APPROVED DOCTORS DIRECTORY (All Users & Guests)             */}
      {/* ============================================================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-100">
              <Stethoscope className="w-3.5 h-3.5" /> Approved Medical Specialists
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-2">
              Featured Hospital Specialists
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Only verified and approved doctors with configured availability slots can receive patient bookings.
            </p>
          </div>
          <Link
            to="/doctors"
            className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1"
          >
            Browse all {featuredDoctors.length} doctors <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featuredDoctors.slice(0, 3).map((doc) => (
            <div
              key={doc._id}
              className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm hover:shadow-md hover:border-teal-200 transition-all flex flex-col justify-between space-y-5"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-100 text-teal-700 flex items-center justify-center font-extrabold text-sm shrink-0 shadow-sm">
                      Dr
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base leading-tight">
                        {doc.name}
                      </h3>
                      <p className="text-xs font-bold text-teal-700">{doc.specialization}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                    Approved
                  </span>
                </div>

                <div className="space-y-2 text-xs text-slate-600 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <Award className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{doc.qualifications || 'MBBS, MD'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{doc.roomNumber || 'Room 101'} ({doc.department})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Avg. Consultation: ~{doc.averageConsultationMinutes || 15} min</span>
                  </div>
                </div>
              </div>

              {userRole === 'patient' ? (
                <Link
                  to={`/book-appointment?doctorId=${doc._id}`}
                  className="w-full py-2.5 rounded-xl font-bold text-white bg-teal-600 hover:bg-teal-700 text-xs shadow-sm transition flex items-center justify-center gap-2"
                >
                  Book with Dr. {doc.name.replace('Dr. ', '')}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              ) : (
                <Link
                  to="/doctors"
                  className="w-full py-2.5 rounded-xl font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 text-xs transition flex items-center justify-center gap-2"
                >
                  View Profile &amp; Slots
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ============================================================== */}
      {/* 7. SYSTEM FEATURES & ARCHITECTURE                              */}
      {/* ============================================================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-14">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-3 py-1 rounded-full border border-teal-100 mb-3">
            <ShieldCheck className="w-3.5 h-3.5" /> Engineered for Modern Outpatient Care
          </span>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Seamless Patient Journey from Booking to Consultation
          </h3>
          <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
            A purpose-built suite that eliminates manual reception bottlenecks, prevents double-booking, and keeps patients informed at every step.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          <div className="bg-white rounded-3xl p-7 sm:p-8 border border-slate-200/90 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mb-6 border border-teal-100">
              <Calendar className="w-6 h-6 stroke-[2.2]" />
            </div>
            <h4 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">
              1. Easy Specialist Booking
            </h4>
            <p className="text-slate-600 text-sm leading-relaxed mb-4">
              Explore doctors across Cardiology, Pediatrics, Dermatology, and more. Pick your preferred date and verified available time slot without conflicts.
            </p>
            <ul className="text-xs space-y-2 text-slate-500 font-semibold">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" /> Verified slot availability
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" /> Database-backed conflict protection
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-3xl p-7 sm:p-8 border border-slate-200/90 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center mb-6 border border-sky-100">
              <Clock className="w-6 h-6 stroke-[2.2]" />
            </div>
            <h4 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">
              2. Reduced Waiting Time
            </h4>
            <p className="text-slate-600 text-sm leading-relaxed mb-4">
              Stop waiting indefinitely in hospital lounges. MediQueue calculates live estimated waiting intervals based on doctor-specific average consultation durations.
            </p>
            <ul className="text-xs space-y-2 text-slate-500 font-semibold">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-sky-600" /> Dynamic minutes forecast
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-sky-600" /> Real-time "patients ahead" counter
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-3xl p-7 sm:p-8 border border-slate-200/90 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center mb-6 border border-indigo-100">
              <Users className="w-6 h-6 stroke-[2.2]" />
            </div>
            <h4 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">
              3. Smart Queue &amp; Tokens
            </h4>
            <p className="text-slate-600 text-sm leading-relaxed mb-4">
              Generate an orderly, sequential token upon check-in. Receptionists advance queue statuses securely while patients track progress with one click.
            </p>
            <ul className="text-xs space-y-2 text-slate-500 font-semibold">
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

      {/* ============================================================== */}
      {/* 8. GUEST CALL-TO-ACTION (JOIN AS DOCTOR / PATIENT)             */}
      {/* ============================================================== */}
      {!isAuthenticated && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Patient Registration CTA */}
            <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-br from-teal-50 via-white to-sky-50 border border-teal-200/80 shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-800 bg-teal-100/70 px-3 py-1 rounded-full border border-teal-200 inline-block">
                  For Patients
                </span>
                <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  Schedule Your Outpatient Visit
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Register in 30 seconds to choose your doctor, book guaranteed appointment slots without conflicts, and receive a digital queue token on arrival.
                </p>
              </div>
              <div className="pt-2 flex flex-wrap gap-3">
                <Link
                  to="/register"
                  className="px-6 py-3 rounded-2xl font-bold text-xs sm:text-sm text-white bg-teal-600 hover:bg-teal-700 shadow-md shadow-teal-700/25 transition"
                >
                  Create Patient Account
                </Link>
                <Link
                  to="/login"
                  className="px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition"
                >
                  Log In
                </Link>
              </div>
            </div>

            {/* Doctor Self-Registration CTA */}
            <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-teal-950 text-white shadow-xl space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-300 bg-teal-500/20 px-3 py-1 rounded-full border border-teal-500/30 inline-block">
                  For Medical Professionals
                </span>
                <h3 className="text-2xl font-extrabold text-white tracking-tight">
                  Join as a Practicing Doctor
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Submit your professional credentials and medical registration for administrative review. Once approved, configure your clinic hours and manage OPD patients smoothly.
                </p>
              </div>
              <div className="pt-2 flex flex-wrap gap-3">
                <Link
                  to="/join-as-doctor"
                  className="px-6 py-3 rounded-2xl font-bold text-xs sm:text-sm text-slate-950 bg-teal-400 hover:bg-teal-300 shadow-md transition flex items-center gap-2"
                >
                  <Stethoscope className="w-4 h-4" />
                  Join as Doctor
                </Link>
                <Link
                  to="/login"
                  className="px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm text-white/90 bg-white/10 hover:bg-white/20 border border-white/20 transition"
                >
                  Doctor Sign In
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default HomePage;