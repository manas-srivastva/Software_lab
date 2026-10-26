require('dotenv').config({ path: __dirname + '/../.env' });
const http = require('http');
const assert = require('assert');
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const app = require('../app');

let API_PORT = 5000;
let serverInstance = null;

async function request(path, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: 'localhost',
        port: API_PORT,
        path: `/api${path}`,
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, raw: data });
          }
        });
      }
    );
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runOnboardingTests() {
  await connectDB();
  const superadminEmail = `superadmin_${Date.now()}@example.com`;
  const superadmin = await User.create({
    name: 'Test Platform Superadmin',
    email: superadminEmail,
    phone: '555-010101',
    password: 'password123',
    role: 'superadmin',
  });
  serverInstance = await new Promise((resolve) => {
    const s = app.listen(0, () => {
      API_PORT = s.address().port;
      resolve(s);
    });
  });

  try {
    console.log('========================================================================');
    console.log('--- STARTING DOCTOR ONBOARDING, VERIFICATION & RBAC TEST SUITE ---');
    console.log('========================================================================');

  // 1. Log in Admin
  const adminLogin = await request('/auth/login', { method: 'POST' }, {
    email: 'admin@mediqueue.com',
    password: 'password123',
  });
  assert.strictEqual(adminLogin.status, 200, 'Admin login should succeed');
  const adminToken = adminLogin.data.token;
  console.log('✓ 1. Admin authenticated successfully');

  const superadminLogin = await request('/auth/login', { method: 'POST' }, {
    email: superadminEmail,
    password: 'password123',
  });
  assert.strictEqual(superadminLogin.status, 200, 'Superadmin login should succeed');
  const superadminToken = superadminLogin.data.token;

  // 2. Register a Patient
  const patientEmail = `patient_verify_${Date.now()}@example.com`;
  const patientReg = await request('/auth/register', { method: 'POST' }, {
    name: 'Samuel Patient',
    email: patientEmail,
    phone: '+1 555-4433',
    password: 'password123',
  });
  assert.strictEqual(patientReg.status, 201, `Patient registration failed: ${JSON.stringify(patientReg)}`);
  const patientToken = patientReg.data.token;
  console.log('✓ 2. Patient registered and authenticated successfully');

  // 3. Workflow 2: Doctor Onboarding Application (Validation & Tamper Prevention)
  const timestamp = Date.now();
  const doctorEmail = `dr.applicant.${timestamp}@example.com`;
  const docRegNumber = `MED-REG-${timestamp.toString().slice(-6)}`;

  // 3a. Validation: missing required fields
  const invalidApp = await request('/auth/doctor/register', { method: 'POST' }, {
    name: 'Dr. Incomplete',
    email: doctorEmail,
  });
  assert.strictEqual(invalidApp.status, 400, 'Should reject registration with missing required fields');
  console.log('✓ 3a. Rejects registration with missing required fields (400)');

  // 3b. Attempt privilege escalation: client tries to pass role: 'admin', verificationStatus: 'APPROVED', isActive: true
  const docApp = await request('/auth/doctor/register', { method: 'POST' }, {
    name: 'Dr. Jane Foster',
    email: doctorEmail,
    phone: '+1 555-8765',
    password: 'password123',
    specialization: 'Oncologist',
    department: 'Oncology',
    qualifications: 'MD, PhD (Oncology), Johns Hopkins',
    experienceYears: 12,
    medicalRegistrationNumber: docRegNumber,
    clinicHospitalName: 'North Oncology Pavilion',
    clinicAddress: '550 Health Science Drive',
    roomNumber: 'Suite 405',
    verificationDocuments: [
      {
        documentType: 'medical_license',
        documentUrl: 'https://docs.mediqueue.health/licenses/foster-jane-lic.pdf',
        documentName: 'State_Medical_License_Foster.pdf',
      },
      {
        documentType: 'degree_certificate',
        documentUrl: 'https://docs.mediqueue.health/degrees/foster-md-degree.pdf',
        documentName: 'Johns_Hopkins_MD.pdf',
      },
    ],
    // Malicious inputs to test security
    role: 'admin',
    verificationStatus: 'APPROVED',
    isActive: true,
  });

  assert.strictEqual(docApp.status, 201, 'Doctor application should be accepted');
  const doctorToken = docApp.data.token;
  const appliedDoctor = docApp.data.doctor;
  const appliedUser = docApp.data.user;

  // Verify server ignored client-supplied role, status, and isActive
  assert.strictEqual(appliedUser.role, 'doctor', 'Role must strictly default to doctor');
  assert(appliedUser.roles.includes('orgAdmin'), 'Independent doctor must also have orgAdmin permissions');
  assert(appliedUser.orgId, 'Independent doctor must own an auto-created practice');
  assert.strictEqual(appliedDoctor.verificationStatus, 'PENDING', 'Status must strictly default to PENDING');
  assert.strictEqual(appliedDoctor.isActive, false, 'Doctor must strictly default to inactive until approved');
  console.log('✓ 3b. Privilege escalation thwarted: doctor defaults to PENDING & inactive (201)');

  // 3c. Duplicate registration check
  const duplicateApp = await request('/auth/doctor/register', { method: 'POST' }, {
    name: 'Dr. Jane Foster Clone',
    email: doctorEmail,
    phone: '+1 555-8765',
    password: 'password123',
    specialization: 'Oncologist',
    department: 'Oncology',
    qualifications: 'MD',
    experienceYears: 10,
    medicalRegistrationNumber: docRegNumber,
    verificationDocuments: [{ documentType: 'medical_license', documentUrl: 'https://test.pdf' }],
  });
  assert.strictEqual(duplicateApp.status, 400, 'Duplicate email should be rejected');
  console.log('✓ 3c. Duplicate email application rejected (400)');

  // 4. Listing and Booking Rules for Unapproved Doctor
  // 4a. Doctor must NOT appear in patient search
  const patientSearch = await request(`/doctors?search=Foster`);
  assert.strictEqual(patientSearch.status, 200);
  const foundInPublic = patientSearch.data.doctors.some((d) => d._id === appliedDoctor._id);
  assert.strictEqual(foundInPublic, false, 'Pending doctor must NOT appear in patient search');
  console.log('✓ 4a. Pending doctor is hidden from patient-facing search results');

  // 4b. Slot lookup for unapproved doctor should fail
  const slotLookup = await request(`/doctors/${appliedDoctor._id}/slots?date=2027-10-20`);
  assert.strictEqual(slotLookup.status, 404, 'Slot lookup for unapproved doctor must return 404');
  console.log('✓ 4b. Slot lookup for unapproved doctor returns 404');

  // 4c. Patient cannot book appointment with unapproved doctor
  const bookingAttempt = await request('/appointments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${patientToken}` }
  }, {
    doctorId: appliedDoctor._id,
    date: '2027-10-20',
    time: '10:00 AM',
    reason: 'Initial consultation',
  });
  assert.strictEqual(bookingAttempt.status, 404, 'Booking with unapproved doctor must return 404');
  console.log('✓ 4c. Booking attempt with unapproved doctor blocked (404)');

  // 4d. Unapproved doctor cannot configure availability
  const availabilityAttempt = await request('/doctors/me/availability', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${doctorToken}` }
  }, {
    availableDays: ['Monday', 'Tuesday'],
    availableSlots: ['09:00 AM', '10:00 AM'],
  });
  assert.strictEqual(availabilityAttempt.status, 403, 'Unapproved doctor cannot configure availability');
  console.log('✓ 4d. Unapproved doctor cannot configure availability (403)');

  // 5. Strict RBAC: Non-admin cannot approve or manage doctor status
  const unauthorizedApproval = await request(`/admin/doctors/${appliedDoctor._id}/approve`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${patientToken}` }
  });
  assert.strictEqual(unauthorizedApproval.status, 403, 'Patient cannot approve doctor');

  const doctorSelfApproval = await request(`/admin/doctors/${appliedDoctor._id}/approve`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${doctorToken}` }
  });
  assert.strictEqual(doctorSelfApproval.status, 403, 'Doctor cannot approve themselves');
  console.log('✓ 5. Non-admins strictly forbidden from approving applications (403)');

  // 6. Verification and Approval Workflow
  // 6a. Admin views pending applications
  const pendingDocs = await request('/admin/doctors?status=PENDING', {
    method: 'GET',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.strictEqual(pendingDocs.status, 200);
  const isFoundInPending = pendingDocs.data.doctors.some((d) => d._id === appliedDoctor._id);
  assert.strictEqual(isFoundInPending, true, 'Doctor should be listed in admin pending list');
  console.log('✓ 6a. Admin lists pending applications with verification documents');

  // 6b. Admin requests changes (NEEDS_CHANGES)
  const changeReason = 'Please provide official hospital affiliation letter and specify room number';
  const requestChange = await request(`/admin/doctors/${appliedDoctor._id}/request-changes`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` }
  }, { reason: changeReason });
  assert.strictEqual(requestChange.status, 200, 'Admin can request changes');
  assert.strictEqual(requestChange.data.doctor.verificationStatus, 'NEEDS_CHANGES');
  console.log('✓ 6b. Admin requests changes (status -> NEEDS_CHANGES)');

  // 6c. Doctor checks their profile & notifications
  const docProfile = await request('/doctors/me', {
    method: 'GET',
    headers: { Authorization: `Bearer ${doctorToken}` }
  });
  assert.strictEqual(docProfile.status, 200);
  assert.strictEqual(docProfile.data.doctor.verificationStatus, 'NEEDS_CHANGES');
  assert.strictEqual(docProfile.data.doctor.statusReason, changeReason);

  const docNotifications = await request('/notifications', {
    method: 'GET',
    headers: { Authorization: `Bearer ${doctorToken}` }
  });
  assert.strictEqual(docNotifications.status, 200);
  assert(docNotifications.data.notifications.length > 0, 'Doctor should receive notification of change request');
  console.log('✓ 6c. Doctor profile shows NEEDS_CHANGES and in-app notification is received');

  // 6d. Doctor updates profile and resubmits application
  const updateProfile = await request('/doctors/me', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${doctorToken}` }
  }, {
    roomNumber: 'Suite 405-B',
    clinicAddress: '550 Health Science Drive, Cancer Center Wing',
  });
  assert.strictEqual(updateProfile.status, 200, 'Doctor can update their profile information');

  const resubmitApp = await request('/doctors/me/resubmit', {
    method: 'POST',
    headers: { Authorization: `Bearer ${doctorToken}` }
  }, {
    resubmissionNotes: 'Updated room number and added clinical center address as requested.',
  });
  assert.strictEqual(resubmitApp.status, 200, 'Doctor can resubmit application');
  assert.strictEqual(resubmitApp.data.doctor.verificationStatus, 'PENDING');
  console.log('✓ 6d. Doctor updates details and resubmits application (status -> PENDING)');

  // 6e. Admin approves doctor
  const approveRes = await request(`/admin/doctors/${appliedDoctor._id}/approve`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` }
  }, { reason: 'All documents and medical council registration verified successfully' });
  assert.strictEqual(approveRes.status, 200, 'Admin approval succeeds');
  assert.strictEqual(approveRes.data.doctor.verificationStatus, 'APPROVED');
  assert.strictEqual(approveRes.data.doctor.isActive, true);
  console.log('✓ 6e. Admin approves doctor (status -> APPROVED, isActive -> true)');

  const pendingPracticeSearch = await request(`/doctors?search=Foster`);
  assert.strictEqual(
    pendingPracticeSearch.data.doctors.some((doctor) => doctor._id === appliedDoctor._id),
    false,
    'Doctor must remain hidden until their practice is approved'
  );

  const organisationApproval = await request(
    `/organisations/superadmin/${appliedUser.orgId}/approve`,
    { method: 'PATCH', headers: { Authorization: `Bearer ${superadminToken}` } }
  );
  assert.strictEqual(organisationApproval.status, 200, 'Superadmin approves independent practice');
  assert.strictEqual(organisationApproval.data.organisation.isActive, true);

  // 7. Approved Doctor Listing, Availability & Booking Rules
  // 7a. Approved doctor now appears in patient search
  const patientSearchAfter = await request(`/doctors?search=Foster`);
  assert.strictEqual(patientSearchAfter.status, 200);
  const foundInPublicAfter = patientSearchAfter.data.doctors.some((d) => d._id === appliedDoctor._id);
  assert.strictEqual(foundInPublicAfter, true, 'Approved doctor must now appear in patient search');
  console.log('✓ 7a. Approved doctor is now visible in patient search');

  // 7b. Approved doctor can configure availability
  const updateAvail = await request('/doctors/me/availability', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${doctorToken}` }
  }, {
    availableDays: ['Monday', 'Wednesday', 'Friday'],
    availableSlots: ['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM'],
    averageConsultationMinutes: 20,
    roomNumber: 'Suite 405-B',
  });
  assert.strictEqual(updateAvail.status, 200, 'Approved doctor can configure availability');
  console.log('✓ 7b. Approved doctor successfully configures availability');

  // 7c. Patient can now view slots for approved doctor
  // Find a valid future date on doctor's available day (e.g. next Monday)
  const testDate = '2027-10-18'; // Monday
  const slotsRes = await request(`/doctors/${appliedDoctor._id}/slots?date=${testDate}`);
  assert.strictEqual(slotsRes.status, 200);
  assert(slotsRes.data.slots.length > 0, 'Slots should be returned for approved doctor');
  console.log('✓ 7c. Patient can view consultation slots for approved doctor');

  // 7d. Patient books appointment with approved doctor
  const validBooking = await request('/appointments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${patientToken}` }
  }, {
    doctorId: appliedDoctor._id,
    date: testDate,
    time: '09:00 AM',
    reason: 'Oncology second opinion',
  });
  assert.strictEqual(validBooking.status, 201, 'Patient can book appointment with approved doctor');
  const appointmentId = validBooking.data.appointment._id;
  console.log('✓ 7d. Patient books appointment with approved doctor (201)');

  // 7e. Concurrency / Duplicate booking prevention: second patient cannot book same slot
  const secondPatientEmail = `patient_second_${Date.now()}@example.com`;
  const patient2Reg = await request('/auth/register', { method: 'POST' }, {
    name: 'Arthur Dent',
    email: secondPatientEmail,
    phone: '+1 555-9988',
    password: 'password123',
  });
  const patient2Token = patient2Reg.data.token;

  const doubleBookingAttempt = await request('/appointments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${patient2Token}` }
  }, {
    doctorId: appliedDoctor._id,
    date: testDate,
    time: '09:00 AM', // same slot!
    reason: 'Conflicting appointment attempt',
  });
  assert.strictEqual(doubleBookingAttempt.status, 409, 'Double booking must be prevented with 409 Conflict');
  console.log('✓ 7e. Double booking prevention strictly enforced (409 Conflict)');

  // 8. Suspension Workflow
  const suspendRes = await request(`/admin/doctors/${appliedDoctor._id}/suspend`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` }
  }, { reason: 'Temporary suspension pending clinical audit' });
  assert.strictEqual(suspendRes.status, 200);
  assert.strictEqual(suspendRes.data.doctor.verificationStatus, 'SUSPENDED');
  assert.strictEqual(suspendRes.data.doctor.isActive, false);

  // Suspended doctor must immediately be hidden from search
  const patientSearchSuspended = await request(`/doctors?search=Foster`);
  const foundWhenSuspended = patientSearchSuspended.data.doctors.some((d) => d._id === appliedDoctor._id);
  assert.strictEqual(foundWhenSuspended, false, 'Suspended doctor must be hidden from patient search');

  // Booking attempt on suspended doctor must be blocked
  const bookingSuspended = await request('/appointments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${patient2Token}` }
  }, {
    doctorId: appliedDoctor._id,
    date: testDate,
    time: '09:30 AM',
    reason: 'Attempt booking suspended doctor',
  });
  assert.strictEqual(bookingSuspended.status, 404, 'Booking suspended doctor must be blocked with 404');
  console.log('✓ 8. Suspension verified: doctor hidden from search and bookings blocked');

  // 9. Admin Direct Onboarding (Workflow 1)
  const adminCreatedDocReg = `MED-INV-${Date.now().toString().slice(-6)}`;
  const adminDocRes = await request('/admin/doctors', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` }
  }, {
    name: 'Dr. Bruce Banner',
    email: `dr.banner.${Date.now()}@example.com`,
    phone: '+1 555-1122',
    specialization: 'Biochemist & Radiologist',
    department: 'Radiology',
    medicalRegistrationNumber: adminCreatedDocReg,
    qualifications: 'MD, PhD',
    experienceYears: 15,
    roomNumber: 'Rad Lab 101',
    verificationStatus: 'APPROVED',
  });
  assert.strictEqual(adminDocRes.status, 201, 'Admin can onboard doctor directly');
  assert.strictEqual(adminDocRes.data.doctor.verificationStatus, 'APPROVED');
  assert.strictEqual(adminDocRes.data.doctor.medicalRegistrationNumber, adminCreatedDocReg);
  console.log('✓ 9. Admin direct onboarding (Workflow 1) verified (201)');

  // 10. Audit Trail Verification
  const auditRes = await request(`/admin/doctors/${appliedDoctor._id}/audit-trail`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.strictEqual(auditRes.status, 200);
  assert(auditRes.data.auditTrail.length >= 4, 'Audit trail must record all status transitions');
  const transitions = auditRes.data.auditTrail.map((entry) => `${entry.fromStatus}->${entry.toStatus}`);
  console.log('✓ 10. Complete status audit trail recorded:', transitions.join(', '));

  console.log('========================================================================');
  console.log('ALL DOCTOR ONBOARDING, VERIFICATION & RBAC TESTS PASSED 100%!');
  console.log('========================================================================');
  } finally {
    if (serverInstance) {
      serverInstance.close();
    }
    await User.deleteOne({ _id: superadmin._id });
    await disconnectDB();
  }
}

runOnboardingTests().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
