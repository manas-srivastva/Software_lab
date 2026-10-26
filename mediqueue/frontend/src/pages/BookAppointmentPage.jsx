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
} from 'lucide-react';

const BookAppointmentPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, isStaff } = useAuth();
  const { success, error: toastError } = useToast();

  const preselectedDoctorId = searchParams.get('doctorId') || '';

  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState(preselectedDoctorId);
  const [selectedDoctor, setSelectedDoctor] = useState(null);

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

  // 1. Fetch active doctors
  useEffect(() => {
    const loadDoctors = async () => {
      try {
        const res = await doctorAPI.getDoctors();
        const docs = res.data.doctors || [];
        setDoctors(docs);

        if (preselectedDoctorId) {
          const match = docs.find((d) => d._id === preselectedDoctorId);
          if (match) setSelectedDoctor(match);
        } else if (docs.length > 0) {
          setSelectedDoctorId(docs[0]._id);
          setSelectedDoctor(docs[0]);
        }
      } catch (err) {
        toastError('Failed to load doctors list');
      } finally {
        setLoadingDoctors(false);
      }
    };

    loadDoctors();
  }, [preselectedDoctorId]);

  // Update selectedDoctor when dropdown changes
  const handleDoctorChange = (e) => {
    const docId = e.target.value;
    setSelectedDoctorId(docId);
    const found = doctors.find((d) => d._id === docId);
    setSelectedDoctor(found || null);
    setSelectedSlot('');
  };

  // 2. Fetch slots whenever doctorId or date changes
  useEffect(() => {
    if (!selectedDoctorId || !date) return;

    const fetchSlots = async () => {
      setLoadingSlots(true);
      setSelectedSlot('');
      try {
        const res = await doctorAPI.getDoctorSlots(selectedDoctorId, date);
        setSlots(res.data.slots || []);
        setDoctorAvailable(res.data.doctorAvailable);
      } catch (err) {
        setSlots([]);
        setDoctorAvailable(false);
        toastError(err.message || 'Failed to load availability. Please try again.');
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [selectedDoctorId, date, selectedDoctor]);

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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="text-center space-y-2">
        <span className="text-xs uppercase tracking-wider font-bold text-teal-600 bg-teal-50 px-3 py-1 rounded-full border border-teal-100">
          Online Appointment Booking
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Reserve Your Doctor Consultation
        </h1>
        <p className="text-sm text-slate-500 max-w-lg mx-auto">
          Choose a specialist, check live availability, and confirm your visit without scheduling conflicts.
        </p>
      </div>

      {/* If logged-in user is staff (admin or receptionist) */}
      {isStaff ? (
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-purple-200 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mx-auto shadow-sm">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div className="space-y-2 max-w-md mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-3 py-1 rounded-full border border-purple-200">
              Staff Account Notice
            </span>
            <h2 className="text-2xl font-black text-slate-900">
              Appointment Booking is for Patients
            </h2>
            <p className="text-sm text-slate-600">
              You are signed in with a <strong className="capitalize">{user?.role}</strong> role ({user?.name}). Staff accounts manage hospital queues and clinical records rather than booking personal appointments.
            </p>
          </div>
          <div className="pt-2 flex justify-center">
            <Link
              to="/staff/queue"
              className="px-6 py-3 rounded-xl font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-md shadow-purple-600/20 transition text-sm flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              Open Staff Queue Operations
            </Link>
          </div>
        </div>
      ) : bookingConfirmation ? (
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-teal-200 shadow-xl space-y-6 text-center animate-in zoom-in-95 duration-300">
          <div className="w-16 h-16 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-600">
              Booking Confirmed
            </span>
            <h2 className="text-2xl font-black text-slate-900">
              Your Appointment is Reserved!
            </h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              We have saved your consultation in the MediQueue system. You can check in on your appointment date to receive your live queue token.
            </p>
          </div>

          {/* Details Summary Card */}
          <div className="max-w-md mx-auto bg-slate-50 rounded-2xl p-6 border border-slate-200/80 text-left space-y-3 text-sm">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <span className="text-slate-500 font-medium">Doctor</span>
              <span className="font-bold text-slate-900">{bookingConfirmation.doctorId?.name}</span>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <span className="text-slate-500 font-medium">Department</span>
              <span className="font-semibold text-teal-700">{bookingConfirmation.doctorId?.department}</span>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <span className="text-slate-500 font-medium">Date & Time</span>
              <span className="font-bold text-slate-900">
                {bookingConfirmation.date} at {bookingConfirmation.time}
              </span>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <span className="text-slate-500 font-medium">Consultation Room</span>
              <span className="font-semibold text-slate-700">{bookingConfirmation.doctorId?.roomNumber || 'Consultation Room'}</span>
            </div>

            <div className="flex justify-between items-start pt-1">
              <span className="text-slate-500 font-medium">Reason</span>
              <span className="font-medium text-slate-800 text-right max-w-xs">{bookingConfirmation.reason}</span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link
              to="/appointments"
              className="px-6 py-3 rounded-xl font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-md shadow-teal-600/30 transition text-sm flex items-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              View My Appointments
            </Link>

            <Link
              to="/queue"
              className="px-6 py-3 rounded-xl font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 transition text-sm flex items-center gap-2"
            >
              <Clock className="w-4 h-4 text-teal-600" />
              Go to Live Queue Tracker
            </Link>

            <button
              onClick={() => {
                setBookingConfirmation(null);
                setReason('');
                setSelectedSlot('');
              }}
              className="px-6 py-3 rounded-xl font-semibold text-slate-500 hover:text-slate-800 transition text-sm"
            >
              Book Another Appointment
            </button>
          </div>
        </div>
      ) : (
        /* Booking Form Card */
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/80 shadow-xl">
          {validationError && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <span>{validationError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 1. Doctor Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Stethoscope className="w-4 h-4 text-teal-600" />
                Select Medical Specialist
              </label>

              {loadingDoctors ? (
                <div className="p-3 text-sm text-slate-400 bg-slate-50 rounded-xl">
                  Loading available physicians...
                </div>
              ) : (
                <select
                  value={selectedDoctorId}
                  onChange={handleDoctorChange}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 bg-white"
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
                <div className="mt-2.5 p-3 rounded-xl bg-teal-50/70 border border-teal-100 flex items-center justify-between text-xs text-teal-900">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span>Location: {selectedDoctor.roomNumber}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span>Avg. Consultation: ~{selectedDoctor.averageConsultationMinutes} min</span>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Date Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-teal-600" />
                Select Appointment Date
              </label>
              <input
                type="date"
                value={date}
                min={getTodayDate()}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 bg-white"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                You may schedule visits for today or any upcoming date.
              </p>
            </div>

            {/* 3. Slot Selection with Live Conflict Indication */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-teal-600" />
                  Available Consultation Slots ({date})
                </span>
                {loadingSlots && (
                  <span className="text-[10px] text-slate-400 font-normal flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin text-teal-600" /> Checking slots...
                  </span>
                )}
              </label>

              {loadingSlots ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Checking real-time doctor availability...
                </div>
              ) : slots.length === 0 ? (
                <div className="p-4 text-xs text-amber-700 bg-amber-50 rounded-xl border border-amber-200">
                  No consultation slots configured for this doctor on this day.
                </div>
              ) : (
                <>
                  {!doctorAvailable && (
                    <div className="mb-3 p-4 text-xs text-amber-700 bg-amber-50 rounded-xl border border-amber-200">
                      This doctor is not available on the selected date.
                    </div>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {slots.map((slotObj) => {
                    const isAvailable = slotObj.isAvailable;
                    const isSelected = selectedSlot === slotObj.time;

                    return (
                      <button
                        key={slotObj.time}
                        type="button"
                        disabled={!isAvailable}
                        onClick={() => setSelectedSlot(slotObj.time)}
                        className={`p-3 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center gap-1 ${
                          isSelected
                            ? 'bg-teal-600 text-white shadow-md ring-2 ring-teal-600 ring-offset-2'
                            : isAvailable
                            ? 'bg-white hover:bg-teal-50 text-slate-800 border border-slate-200 hover:border-teal-300'
                            : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60 line-through'
                        }`}
                      >
                        <span>{slotObj.time}</span>
                        <span
                          className={`text-[9px] font-semibold uppercase ${
                            isSelected
                              ? 'text-teal-100'
                              : isAvailable
                              ? 'text-teal-600'
                              : 'text-rose-500'
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
                Reason for Visit / Symptoms
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Briefly describe your symptoms or reason for clinical visit (e.g., Routine blood pressure follow-up, persistent migraine for 3 days)..."
                rows={3}
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              />
            </div>

            {/* Submit Action */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting || !selectedSlot}
                className="w-full py-4 rounded-xl font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-lg shadow-teal-600/30 transition disabled:opacity-50 flex items-center justify-center gap-2 text-base"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Locking Slot & Reserving Appointment...
                  </>
                ) : (
                  <>
                    Confirm & Reserve Appointment Slot
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>

              {!isAuthenticated && (
                <p className="text-xs text-center text-slate-500 mt-3">
                  Note: You will be asked to sign in or create a patient profile before completing the reservation.
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
