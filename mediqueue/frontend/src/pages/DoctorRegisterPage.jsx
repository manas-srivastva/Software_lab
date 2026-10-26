import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import {
  Stethoscope,
  Mail,
  Lock,
  User,
  Phone,
  FileCheck2,
  Building2,
  Calendar,
  Clock,
  Award,
  AlertCircle,
  Loader2,
  CheckCircle,
} from 'lucide-react';

const DoctorRegisterPage = () => {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    specialization: '',
    department: 'General Medicine',
    medicalRegistrationNumber: '',
    qualifications: '',
    experienceYears: 5,
    clinicHospitalName: 'MediQueue Health Center',
    clinicAddress: '',
    city: '',
    roomNumber: 'Room 101',
    availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    availableSlots: ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM'],
    averageConsultationMinutes: 15,
    licenseDocumentUrl: '',
    licenseDocumentName: '',
  });

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const daysList = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const allSlots = [
    '08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '01:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM'
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFormError('');
  };

  const handleDayToggle = (day) => {
    setFormData((prev) => {
      const exists = prev.availableDays.includes(day);
      return {
        ...prev,
        availableDays: exists
          ? prev.availableDays.filter((d) => d !== day)
          : [...prev.availableDays, day],
      };
    });
  };

  const handleSlotToggle = (slot) => {
    setFormData((prev) => {
      const exists = prev.availableSlots.includes(slot);
      return {
        ...prev,
        availableSlots: exists
          ? prev.availableSlots.filter((s) => s !== slot)
          : [...prev.availableSlots, slot],
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (formData.password.length < 6) {
      setFormError('Password must be at least 6 characters long.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    if (!formData.medicalRegistrationNumber.trim()) {
      setFormError('Medical registration/license number is required for verification.');
      return;
    }

    if (formData.availableDays.length === 0) {
      setFormError('Please select at least one consultation day.');
      return;
    }

    if (formData.availableSlots.length === 0) {
      setFormError('Please select at least one consultation time slot.');
      return;
    }

    const verificationDocuments = [
      {
        documentType: 'medical_license',
        documentUrl: formData.licenseDocumentUrl.trim() || 'https://mediqueue.health/docs/sample_license.pdf',
        documentName: formData.licenseDocumentName.trim() || `${formData.name.replace(/\s+/g, '_')}_License.pdf`,
      },
    ];

    setLoading(true);
    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        password: formData.password,
        specialization: formData.specialization.trim(),
        department: formData.department.trim(),
        medicalRegistrationNumber: formData.medicalRegistrationNumber.trim(),
        qualifications: formData.qualifications.trim(),
        experienceYears: Number(formData.experienceYears) || 0,
        clinicHospitalName: formData.clinicHospitalName.trim(),
        clinicAddress: formData.clinicAddress.trim(),
        city: formData.city.trim(),
        roomNumber: formData.roomNumber.trim(),
        availableDays: formData.availableDays,
        availableSlots: formData.availableSlots,
        averageConsultationMinutes: Number(formData.averageConsultationMinutes) || 15,
        verificationDocuments,
      };

      const res = await authAPI.registerDoctor(payload);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));

      success('Application submitted! Your doctor profile is currently under review.');
      navigate('/doctor/dashboard');
    } catch (err) {
      setFormError(err.message || 'Failed to submit doctor application.');
      toastError(err.message || 'Submission error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl overflow-hidden">
        {/* Header banner */}
        <div className="bg-gradient-to-r from-teal-700 via-teal-600 to-cyan-600 px-6 sm:px-10 py-8 text-white">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-bold tracking-wider uppercase backdrop-blur-sm mb-3">
            <Stethoscope className="w-4 h-4" /> Doctor Onboarding
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Join as a Medical Specialist</h1>
          <p className="text-teal-100 text-sm mt-1 max-w-xl">
            Submit your professional application to join MediQueue. Our clinical administration team verifies every doctor before activation.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-10 space-y-8">
          {formError && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {/* Section 1: Account details */}
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
              <User className="w-4 h-4 text-teal-600" /> Account & Personal Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name (with Dr. prefix)</label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g. Dr. Alex Morgan"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="doctor@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  name="phone"
                  required
                  placeholder="+1 555-0199"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Medical Registration / License #</label>
                <input
                  type="text"
                  name="medicalRegistrationNumber"
                  required
                  placeholder="e.g. MED-REG-49201"
                  value={formData.medicalRegistrationNumber}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Password (min 6 chars)</label>
                <input
                  type="password"
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Professional qualifications */}
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
              <Award className="w-4 h-4 text-teal-600" /> Professional Credentials & Practice
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Specialization</label>
                <input
                  type="text"
                  name="specialization"
                  required
                  placeholder="e.g. Cardiologist, Dermatologist"
                  value={formData.specialization}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Clinical Department</label>
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 bg-white"
                >
                  <option value="General Medicine">General Medicine</option>
                  <option value="Cardiology">Cardiology</option>
                  <option value="Dermatology">Dermatology</option>
                  <option value="Pediatrics">Pediatrics</option>
                  <option value="Orthopedics">Orthopedics</option>
                  <option value="Neurology">Neurology</option>
                  <option value="Oncology">Oncology</option>
                  <option value="Ophthalmology">Ophthalmology</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Degrees & Qualifications</label>
                <input
                  type="text"
                  name="qualifications"
                  required
                  placeholder="e.g. MBBS, MD, Board Certified"
                  value={formData.qualifications}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Years of Experience</label>
                <input
                  type="number"
                  name="experienceYears"
                  min="0"
                  max="60"
                  value={formData.experienceYears}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Clinic / Hospital Affiliation</label>
                <input
                  type="text"
                  name="clinicHospitalName"
                  placeholder="MediQueue Central Hospital"
                  value={formData.clinicHospitalName}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Consultation Room</label>
                <input
                  type="text"
                  name="roomNumber"
                  placeholder="OPD Suite 204"
                  value={formData.roomNumber}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Practice City</label>
                <input
                  type="text"
                  name="city"
                  placeholder="City"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Availability & timings */}
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
              <Calendar className="w-4 h-4 text-teal-600" /> Consultation Timings
            </h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Available Consultation Days</label>
                <div className="flex flex-wrap gap-2">
                  {daysList.map((day) => {
                    const isSelected = formData.availableDays.includes(day);
                    return (
                      <button
                        type="button"
                        key={day}
                        onClick={() => handleDayToggle(day)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
                          isSelected
                            ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Available Time Slots</label>
                <div className="flex flex-wrap gap-2">
                  {allSlots.map((slot) => {
                    const isSelected = formData.availableSlots.includes(slot);
                    return (
                      <button
                        type="button"
                        key={slot}
                        onClick={() => handleSlotToggle(slot)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition border ${
                          isSelected
                            ? 'bg-teal-600 text-white border-teal-600'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Average Consultation Duration (Minutes)
                </label>
                <input
                  type="number"
                  name="averageConsultationMinutes"
                  min="5"
                  max="60"
                  value={formData.averageConsultationMinutes}
                  onChange={handleChange}
                  className="w-40 px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Verification Document */}
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
              <FileCheck2 className="w-4 h-4 text-teal-600" /> Verification Document Reference
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  License Document Name / Label
                </label>
                <input
                  type="text"
                  name="licenseDocumentName"
                  placeholder="State_Medical_Council_License.pdf"
                  value={formData.licenseDocumentName}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Document URL / Verification Link
                </label>
                <input
                  type="text"
                  name="licenseDocumentUrl"
                  placeholder="https://docs.mediqueue.health/license.pdf"
                  value={formData.licenseDocumentUrl}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between gap-4 border-t border-slate-100">
            <Link to="/login" className="text-xs font-semibold text-slate-500 hover:text-slate-800">
              Already have an account? Log in
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-xl font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-md shadow-teal-600/20 disabled:opacity-50 flex items-center gap-2 text-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Submitting Application...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" /> Submit Doctor Application
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DoctorRegisterPage;
