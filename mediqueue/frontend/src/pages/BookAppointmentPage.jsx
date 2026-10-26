import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { doctorAPI, appointmentAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Calendar,
  Clock,
  User,
  Stethoscope,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  MapPin,
  Sparkles,
  ShieldCheck,
  Building2,
} from 'lucide-react';

const BookAppointmentPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, isStaff } = useAuth();
  const { success, error: toastError } = useToast();

  const preselectedDoctorId = searchParams.get('doctorId') || '';
  const preselectedOrgId = searchParams.get('orgId') || '';

  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState(preselectedDoctorId);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedOrgId, setSelectedOrgId] = useState(preselectedOrgId);

  // Default to today's date in YYYY-MM-DD
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [date, setDate] = useState(getTodayDate());
  const [slots, setSlots] = useState([]);
  const [doctorAvailable, setDoctorAvailable] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [reason, setReason] = useState('');

  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bookingConfirmation, setBookingConfirmation] = useState(null);
  const [validationError, setValidationError] = useState('');
  const currentBookingStep = !selectedDoctorId ? 1 : !selectedSlot ? 2 : 3;

  // 1. Fetch active doctors
  useEffect(() => {
    const loadDoctors = async () => {
      try {
        const res = await doctorAPI.getDoctors();
        const docs = res.data.doctors || [];
        setDoctors(docs);

        if (preselectedDoctorId) {
          const match = docs.find((d) => d._id === preselectedDoctorId);
          if (match) {
            setSelectedDoctor(match);
            setSelectedOrgId(
              preselectedOrgId || match.organisations?.[0]?._id || ''
            );
          }
        } else if (docs.length > 0) {
          setSelectedDoctorId(docs[0]._id);
          setSelectedDoctor(docs[0]);
          setSelectedOrgId(docs[0].organisations?.[0]?._id || '');
        }
      } catch (err) {
        toastError('Failed to load doctors list');
      } finally {
        setLoadingDoctors(false);
      }
    };

    loadDoctors();
  }, [preselectedDoctorId, preselectedOrgId]);

  // Update selectedDoctor when dropdown changes
  const handleDoctorChange = (e) => {
    const docId = e.target.value;
    setSelectedDoctorId(docId);
    const found = doctors.find((d) => d._id === docId);
    setSelectedDoctor(found || null);
    setSelectedOrgId(found?.organisations?.[0]?._id || '');
    setSelectedSlot('');
  };

  // 2. Fetch slots whenever doctorId or date changes
  useEffect(() => {
    if (!selectedDoctorId || !date) return;

    const fetchSlots = async () => {
      setLoadingSlots(true);
      setSelectedSlot('');
      try {
        const res = await doctorAPI.getDoctorSlots(selectedDoctorId, date, selectedOrgId || undefined);
        setSlots(res.data.slots || []);
        setDoctorAvailable(res.data.doctorAvailable);
        if (res.data.orgId && res.data.orgId !== selectedOrgId) {
          setSelectedOrgId(res.data.orgId);
        }
      } catch (err) {
        setSlots([]);
        setDoctorAvailable(false);
        toastError(err.message || 'Failed to load availability. Please try again.');
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [selectedDoctorId, date, selectedDoctor, selectedOrgId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');

    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: '/book-appointment' } } });
      return;
    }

    if (!selectedDoctorId) {
      setValidationError('Please select a doctor');
      return;
    }

    if (!date) {
      setValidationError('Please choose an appointment date');
      return;
    }

    if (!selectedSlot) {
      setValidationError('Please choose an available time slot');
      return;
    }

    if (!reason.trim()) {
      setValidationError('Please provide the clinical reason for your visit');
      return;
    }

    setSubmitting(true);
    try {
      const res = await appointmentAPI.createAppointment({
        doctorId: selectedDoctorId,
        ...(selectedOrgId ? { orgId: selectedOrgId } : {}),
        date,
        time: selectedSlot,
        reason: reason.trim(),
      });

      success('Appointment booked successfully!');
      setBookingConfirmation(res.data.appointment);
    } catch (err) {
      setValidationError(err.message || 'Failed to book appointment');
      toastError(err.message || 'Slot conflict or booking failure');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6 sm:space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-teal-100 bg-gradient-to-br from-white via-white to-teal-50/90 p-6 sm:p-8 shadow-sm">
        <div className="absolute -right-12 -top-20 h-56 w-56 rounded-full bg-teal-100/60 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-200/90 bg-teal-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-teal-800">
              <Calendar className="h-3.5 w-3.5 text-teal-600" />
              Online Specialist Booking
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Reserve your consultation
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-slate-600">
              Choose a medical specialist, select your verified consultation slot, and receive immediate booking confirmation.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-white/90 bg-white/90 px-4 py-3 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700 border border-teal-100">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Zero Conflict</p>
              <p className="text-[11px] text-slate-500 font-medium">Real-time slot lock</p>
            </div>
          </div>
        </div>
      </div>

      {/* 3-Step Progress Indicator */}
      {!isStaff && !bookingConfirmation && (
        <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-4 shadow-sm">
          <ol
            aria-label="Appointment booking steps"
            className="grid grid-cols-3 gap-2 sm:gap-4"
          >
            {[
              { number: 1, label: 'Doctor & Facility' },
              { number: 2, label: 'Date & Slot' },
              { number: 3, label: 'Visit Details' },
            ].map((step) => {
              const isComplete = step.number < currentBookingStep;
              const isCurrent = step.number === currentBookingStep;

              return (
                <li
                  key={step.number}
                  aria-current={isCurrent ? 'step' : undefined}
                  className={`flex items-center gap-2 rounded-xl px-2 py-1.5 sm:gap-3 sm:px-3 transition-colors ${
                    isCurrent
                      ? 'bg-teal-50 text-teal-900 font-bold'
                      : isComplete
                      ? 'text-teal-700 font-semibold'
                      : 'text-slate-400 font-medium'
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-xl text-xs font-extrabold transition-colors ${
                      isCurrent || isComplete
                        ? 'bg-teal-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {isComplete ? <CheckCircle2 className="h-4 w-4" /> : step.number}
                  </span>
                  <span className="text-xs sm:text-sm truncate">{step.label}</span>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {/* If logged-in user is staff (admin or receptionist) */}
      {isStaff ? (
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-purple-200 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-purple-50 border border-purple-100 text-purple-700 flex items-center justify-center mx-auto shadow-sm">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div className="space-y-2 max-w-md mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-3 py-1 rounded-full border border-purple-200">
              Staff Account Notice
            </span>
            <h2 className="text-2xl font-extrabold text-slate-900">
              Appointment Booking is for Patients
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              You are signed in with a <strong className="capitalize">{user?.role}</strong> role ({user?.name}). Staff accounts manage hospital queues and clinic bookings from the Staff Desk.
            </p>
          </div>
          <div className="pt-2 flex justify-center">
            <Link
              to="/staff/queue"
              className="px-6 py-3 rounded-2xl font-bold text-white bg-purple-700 hover:bg-purple-800 shadow-md shadow-purple-700/20 transition text-sm flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              Open Staff Queue Operations
            </Link>
          </div>
        </div>
      ) : bookingConfirmation ? (
        /* Booking Confirmation Receipt */
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-teal-200 shadow-xl space-y-6 text-center animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Booking Confirmed
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
              Your Appointment is Reserved!
            </h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Your consultation is registered in the hospital database. Check in on your appointment date to receive your live queue token.
            </p>
          </div>

          {/* Details Summary Card */}
          <div className="max-w-md mx-auto bg-slate-50/90 rounded-2xl p-6 border border-slate-200/90 text-left space-y-3 text-sm">
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-200/80">
              <span className="text-slate-500 font-medium">Physician</span>
              <span className="font-bold text-slate-900">{bookingConfirmation.doctorId?.name}</span>
            </div>

            <div className="flex justify-between items-center pb-2.5 border-b border-slate-200/80">
              <span className="text-slate-500 font-medium">Department</span>
              <span className="font-bold text-teal-800">{bookingConfirmation.doctorId?.department}</span>
            </div>

            <div className="flex justify-between items-center pb-2.5 border-b border-slate-200/80">
              <span className="text-slate-500 font-medium">Date &amp; Time</span>
              <span className="font-bold text-slate-900">
                {bookingConfirmation.date} at {bookingConfirmation.time}
              </span>
            </div>

            <div className="flex justify-between items-center pb-2.5 border-b border-slate-200/80">
              <span className="text-slate-500 font-medium">Location</span>
              <span className="font-semibold text-slate-700">{bookingConfirmation.doctorId?.roomNumber || 'Consultation Room'}</span>
            </div>

            <div className="flex justify-between items-start pt-1">
              <span className="text-slate-500 font-medium shrink-0">Reason</span>
              <span className="font-medium text-slate-800 text-right max-w-xs">{bookingConfirmation.reason}</span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
            <Link
              to="/appointments"
              className="px-6 py-3 rounded-2xl font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-md shadow-teal-700/25 transition text-sm flex items-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              View My Appointments
            </Link>

            <Link
              to="/queue"
              className="px-6 py-3 rounded-2xl font-bold text-slate-800 bg-white hover:bg-slate-50 border border-slate-200/90 transition text-sm flex items-center gap-2"
            >
              <Clock className="w-4 h-4 text-teal-600" />
              Live Queue Tracker
            </Link>

            <button
              type="button"
              onClick={() => {
                setBookingConfirmation(null);
                setReason('');
                setSelectedSlot('');
              }}
              className="px-5 py-3 rounded-2xl font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition text-sm"
            >
              Book Another Visit
            </button>
          </div>
        </div>
      ) : (
        /* Booking Form Card */
        <div className="bg-white rounded-3xl p-6 sm:p-8 lg:p-10 border border-slate-200/90 shadow-sm">
          {validationError && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-sm flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <span>{validationError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 1. Doctor Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Stethoscope className="w-4 h-4 text-teal-600" />
                Step 1: Select Medical Specialist
              </label>

              {loadingDoctors ? (
                <div className="p-4 text-sm text-slate-500 bg-slate-50 rounded-2xl border border-slate-200">
                  <Loader2 className="inline h-4 w-4 animate-spin mr-2 text-teal-600" />
                  Loading available physicians...
                </div>
              ) : doctors.length === 0 ? (
                <div className="p-4 text-sm text-slate-700 bg-amber-50 rounded-2xl border border-amber-200">
                  No specialists are currently available. Browse the{' '}
                  <Link to="/doctors" className="font-bold text-teal-700 underline underline-offset-2">
                    doctor directory
                  </Link>
                  .
                </div>
              ) : (
                <select
                  value={selectedDoctorId}
                  onChange={handleDoctorChange}
                  required
                  aria-label="Select Doctor"
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 bg-white"
                >
                  {doctors.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name} — {d.specialization} ({d.department})
                    </option>
                  ))}
                </select>
              )}

              {/* Selected doctor summary badge */}
              {selectedDoctor && (
                <div className="mt-3 p-3.5 rounded-2xl bg-teal-50/80 border border-teal-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-teal-950 font-medium">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-teal-700 shrink-0" />
                    <span>
                      Room / Facility:{' '}
                      <strong>
                        {selectedDoctor.organisations?.find((org) => org._id === selectedOrgId)?.name ||
                          selectedDoctor.clinicHospitalName ||
                          selectedDoctor.roomNumber}
                      </strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-teal-700 shrink-0" />
                    <span>Avg. Duration: <strong>~{selectedDoctor.averageConsultationMinutes} min</strong></span>
                  </div>
                </div>
              )}

              {selectedDoctor?.organisations?.length > 1 && (
                <div className="mt-3">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-teal-600" />
                    Select Hospital / Clinic Facility
                  </label>
                  <select
                    value={selectedOrgId}
                    onChange={(event) => setSelectedOrgId(event.target.value)}
                    aria-label="Select Organisation Facility"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm font-semibold text-slate-800 focus:outline-none focus:border-teal-500 bg-white"
                  >
                    {selectedDoctor.organisations.map((organisation) => (
                      <option key={organisation._id} value={organisation._id}>
                        {organisation.name}{organisation.city ? ` — ${organisation.city}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* 2. Date Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-teal-600" />
                Step 2: Choose Consultation Date
              </label>
              <input
                type="date"
                value={date}
                min={getTodayDate()}
                onChange={(e) => setDate(e.target.value)}
                required
                aria-label="Appointment date"
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 bg-white"
              />
              <p className="text-[11px] text-slate-400 mt-1 font-medium">
                Choose today for walk-in OPD queuing or schedule an upcoming date.
              </p>
            </div>

            {/* 3. Slot Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-teal-600" />
                  Available Time Slots ({date})
                </label>
                {loadingSlots && (
                  <span className="text-[11px] text-teal-700 font-semibold flex items-center gap-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600" /> Checking slots...
                  </span>
                )}
              </div>

              {loadingSlots ? (
                <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-teal-600" />
                  Checking real-time doctor availability...
                </div>
              ) : slots.length === 0 ? (
                <div className="p-4 text-xs text-amber-800 bg-amber-50 rounded-2xl border border-amber-200">
                  No consultation slots configured for this doctor on this day.
                </div>
              ) : (
                <>
                  {!doctorAvailable && (
                    <div className="mb-3 p-3.5 text-xs font-medium text-amber-800 bg-amber-50 rounded-2xl border border-amber-200">
                      This doctor does not typically practice on this day.
                    </div>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                    {slots.map((slotObj) => {
                      const isAvailable = slotObj.isAvailable;
                      const isSelected = selectedSlot === slotObj.time;

                      return (
                        <button
                          key={slotObj.time}
                          type="button"
                          disabled={!isAvailable}
                          onClick={() => setSelectedSlot(slotObj.time)}
                          className={`p-3 rounded-2xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 border ${
                            isSelected
                              ? 'bg-teal-600 text-white shadow-md shadow-teal-700/25 border-teal-600 ring-2 ring-teal-500 ring-offset-2'
                              : isAvailable
                              ? 'bg-white hover:bg-teal-50 text-slate-800 border-slate-200 hover:border-teal-300'
                              : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60 line-through'
                          }`}
                        >
                          <span className="font-extrabold">{slotObj.time}</span>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider ${
                              isSelected
                                ? 'text-teal-100'
                                : isAvailable
                                ? 'text-teal-700'
                                : 'text-slate-400'
                            }`}
                          >
                            {isAvailable ? 'Available' : doctorAvailable ? 'Booked' : 'Unavailable'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* 4. Reason for Visit */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-teal-600" />
                Step 3: Clinical Reason for Visit / Symptoms
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Briefly describe your symptoms or reason for clinical visit (e.g., Routine blood pressure follow-up, persistent migraine for 3 days)..."
                rows={3}
                required
                aria-label="Reason for visit"
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              />
            </div>

            {/* Submit Action */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting || !selectedSlot}
                className="w-full py-4 rounded-2xl font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-lg shadow-teal-700/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-base hover:-translate-y-0.5"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Locking Slot &amp; Reserving Appointment...
                  </>
                ) : (
                  <>
                    Confirm &amp; Reserve Appointment Slot
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>

              {!isAuthenticated && (
                <p className="text-xs text-center text-slate-500 mt-3 font-medium">
                  Note: You will be prompted to sign in or create an account to confirm your reservation.
                </p>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default BookAppointmentPage;
