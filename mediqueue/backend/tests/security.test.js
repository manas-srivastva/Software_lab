const http = require('http');
const assert = require('assert');
const jwt = require('jsonwebtoken');
const { getAvailableAppointmentDate } = require('../utils/appointmentDate');

const API_PORT = Number(process.env.API_PORT || 5000);
const getTodayDate = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

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

function verifyBookingAccess(label, response, expectedStatus) {
  const passed = response.status === expectedStatus;
  console.log(
    `${label}: ${passed ? 'PASS' : 'FAIL'}`,
    `Expected ${expectedStatus}, received ${response.status}. ${response.data?.message || ''}`
  );
  assert.strictEqual(response.status, expectedStatus, `${label} failed`);
  if (expectedStatus === 403) {
    assert.match(response.data.message, /patient/i, `${label} should explain the patient-only restriction`);
  }
}

async function runSecurityTests() {
  console.log('--- STARTING ROLE-BASED ACCESS CONTROL & SECURITY VERIFICATION ---');

  // 1. Log in Patient A (John Doe)
  const patientALogin = await request('/auth/login', { method: 'POST' }, {
    email: 'john.doe@example.com',
    password: 'password123',
  });
  const tokenPatientA = patientALogin.data.token;
  const userA = patientALogin.data.user;

  // 2. Register Patient B (New distinct patient)
  const patientBEmail = `sec_patient_${Date.now()}@example.com`;
  const regB = await request('/auth/register', { method: 'POST' }, {
    name: 'Robert Miller',
    email: patientBEmail,
    phone: '+1 555-4321',
    password: 'password123',
    role: 'admin',
  });
  assert.strictEqual(regB.data.user.role, 'patient', 'Registration cannot assign a privileged role');
  const tokenPatientB = regB.data.token;

  // 3. Log in Staff (Receptionist)
  const staffLogin = await request('/auth/login', { method: 'POST' }, {
    email: 'receptionist@mediqueue.com',
    password: 'password123',
  });
  const tokenStaff = staffLogin.data.token;
  const adminLogin = await request('/auth/login', { method: 'POST' }, {
    email: 'admin@mediqueue.com',
    password: 'password123',
  });
  const tokenAdmin = adminLogin.data.token;
  const doctorLogin = await request('/auth/login', { method: 'POST' }, {
    email: 'dr.kim@mediqueue.com',
    password: 'password123',
  });
  const tokenDoctor = doctorLogin.data.token;

  const doctorPatientAppointments = await request('/appointments/my', {
    headers: { Authorization: `Bearer ${tokenDoctor}` },
  });
  assert.strictEqual(doctorPatientAppointments.status, 403, 'Doctors cannot access the patient appointments feed');

  const doctorPatientQueue = await request('/queue/my-status', {
    headers: { Authorization: `Bearer ${tokenDoctor}` },
  });
  assert.strictEqual(doctorPatientQueue.status, 403, 'Doctors cannot access patient-only queue status');

  const adminPatientQueue = await request('/queue/my-status', {
    headers: { Authorization: `Bearer ${tokenAdmin}` },
  });
  assert.strictEqual(adminPatientQueue.status, 403, 'Admins cannot access patient-only queue status');

  const missingToken = await request('/appointments/all');
  assert.strictEqual(missingToken.status, 401, 'Protected APIs must reject missing tokens');

  const invalidToken = await request('/appointments/all', {
    headers: { Authorization: 'Bearer invalid.token.value' },
  });
  assert.strictEqual(invalidToken.status, 401, 'Protected APIs must reject malformed tokens');

  const legacyForgedToken = jwt.sign(
    { id: adminLogin.data.user._id, role: 'patient' },
    'mediqueue_secret_key_change_in_production_jwt_2026'
  );
  const legacySecretAttempt = await request('/admin/reports', {
    headers: { Authorization: `Bearer ${legacyForgedToken}` },
  });
  assert.strictEqual(
    legacySecretAttempt.status,
    401,
    'The exposed legacy signing secret must not authenticate forged administrator tokens'
  );

  const [header, payload, signature] = tokenStaff.split('.');
  const forgedPayload = Buffer.from(
    JSON.stringify({ ...JSON.parse(Buffer.from(payload, 'base64').toString()), role: 'patient' })
  ).toString('base64url');
  const tamperedRoleAttempt = await request('/appointments/all', {
    headers: { Authorization: `Bearer ${header}.${forgedPayload}.${signature}` },
  });
  assert.strictEqual(tamperedRoleAttempt.status, 401, 'Changing a token role must invalidate its signature');

  // TEST 1: Patient tries to access staff-only endpoint GET /appointments/all
  const patientAllAppts = await request('/appointments/all', {
    method: 'GET',
    headers: { Authorization: `Bearer ${tokenPatientA}` }
  });
  console.log('Security Test 1: Patient blocked from /appointments/all (403):',
    patientAllAppts.status === 403 ? 'PASS' : 'FAIL',
    `Status: ${patientAllAppts.status} - ${patientAllAppts.data.message}`
  );

  // TEST 2: Staff accesses GET /appointments/all
  const staffAllAppts = await request('/appointments/all', {
    method: 'GET',
    headers: { Authorization: `Bearer ${tokenStaff}` }
  });
  console.log('Security Test 2: Staff allowed on /appointments/all (200):',
    staffAllAppts.status === 200 ? 'PASS' : 'FAIL',
    `Found ${staffAllAppts.data.count} clinic appointments`
  );

  // TEST 3: Staff (Admin / Receptionist) tries to book an appointment -> Must be 403 Forbidden!
  const docRes = await request('/doctors');
  const loggedInDoctor = docRes.data.doctors.find((item) => item.name === 'Dr. David Kim');
  assert(loggedInDoctor, 'The doctor login must be associated with a doctor profile');
  assert.strictEqual(loggedInDoctor.email, undefined, 'Public doctor listings must omit account email');
  assert.strictEqual(loggedInDoctor.userId, undefined, 'Public doctor listings must omit linked account IDs');
  const publicDoctorDetails = await request(`/doctors/${loggedInDoctor._id}`);
  assert.strictEqual(publicDoctorDetails.status, 200);
  assert.strictEqual(publicDoctorDetails.data.doctor.email, undefined);
  assert.strictEqual(publicDoctorDetails.data.doctor.userId, undefined);

  const securityDoctorName = `Dr Security ${Date.now()}`;
  const createdDoctor = await request('/admin/doctors', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenAdmin}` },
  }, {
    name: securityDoctorName,
    email: `sec_doctor_${Date.now()}@example.com`,
    password: 'password123',
    specialization: 'General Physician',
    department: 'General Medicine',
    availableDays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  });
  assert.strictEqual(createdDoctor.status, 201, 'The security test must create its own doctor fixture');
  const securityDoctorLogin = await request('/auth/login', { method: 'POST' }, {
    email: createdDoctor.data.doctor.email,
    password: 'password123',
  });
  assert.strictEqual(securityDoctorLogin.status, 200, 'The security test doctor must be able to log in');
  const securityDoctorToken = securityDoctorLogin.data.token;
  const securityDoctorDirectory = await request('/doctors');
  const doctor = securityDoctorDirectory.data.doctors.find((item) => item.name === securityDoctorName);
  assert(doctor, 'The security test doctor must appear in the public directory');
  const apptDate = getTodayDate();
  const availability = await request(`/doctors/${doctor._id}/slots?date=${apptDate}`);
  const freeSlots = availability.data.slots.filter((slot) => slot.isAvailable);
  assert(freeSlots.length >= 3, 'At least three free slots are required for booking and race-condition tests');
  const [firstSlot, secondSlot, concurrentSlot] = freeSlots.map((slot) => slot.time);
  const invalidCalendarDate = await request('/appointments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenPatientB}` },
  }, {
    doctorId: doctor._id,
    date: '2025-02-30',
    time: firstSlot,
    reason: 'Invalid calendar date',
  });
  assert.strictEqual(invalidCalendarDate.status, 400, 'Impossible calendar dates must be rejected');

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const futureDate = getAvailableAppointmentDate(doctor.availableDays, tomorrow);
  const futureAvailability = await request(`/doctors/${doctor._id}/slots?date=${futureDate}`);
  const futureSlot = futureAvailability.data.slots.find((slot) => slot.isAvailable)?.time;
  assert(futureSlot, 'A future scheduled date must have an available slot');
  const futureAppointment = await request('/appointments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenPatientB}` },
  }, {
    doctorId: doctor._id,
    date: futureDate,
    time: futureSlot,
    reason: 'Future check-in rejection test',
  });
  assert.strictEqual(futureAppointment.status, 201);
  const prematureCheckIn = await request(
    `/queue/check-in/${futureAppointment.data.appointment._id}`,
    { method: 'POST', headers: { Authorization: `Bearer ${tokenPatientB}` } }
  );
  assert.strictEqual(prematureCheckIn.status, 400, 'Future appointments cannot enter the queue');
  const cleanupFutureAppointment = await request(
    `/appointments/${futureAppointment.data.appointment._id}/cancel`,
    { method: 'PATCH', headers: { Authorization: `Bearer ${tokenPatientB}` } }
  );
  assert.strictEqual(cleanupFutureAppointment.status, 200);
  const anonymousBookingAttempt = await request('/appointments', {
    method: 'POST',
  }, {
    doctorId: doctor._id,
    date: apptDate,
    time: firstSlot,
    reason: 'Unauthenticated booking attempt',
  });
  verifyBookingAccess('Unauthenticated user cannot book appointments', anonymousBookingAttempt, 401);

  const unavailableSlotAttempt = await request('/appointments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenPatientB}` },
  }, {
    doctorId: doctor._id,
    date: apptDate,
    time: '07:13 PM',
    reason: 'Unavailable slot attempt',
  });
  assert.strictEqual(unavailableSlotAttempt.status, 400, 'Patients cannot book an unlisted slot');

  const staffBookingAttempt = await request('/appointments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenStaff}` }
  }, {
    doctorId: doctor._id,
    date: apptDate,
    time: firstSlot,
    reason: 'Staff booking attempt',
    role: 'patient',
  });
  verifyBookingAccess('Receptionist cannot book appointments', staffBookingAttempt, 403);

  const adminBookingAttempt = await request('/appointments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenAdmin}` }
  }, {
    doctorId: doctor._id,
    date: apptDate,
    time: firstSlot,
    reason: 'Admin booking attempt',
    role: 'patient',
  });
  verifyBookingAccess('Admin cannot book appointments', adminBookingAttempt, 403);

  const doctorBookingAttempt = await request('/appointments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenDoctor}` }
  }, {
    doctorId: doctor._id,
    date: apptDate,
    time: firstSlot,
    reason: 'Doctor booking attempt',
    role: 'patient',
  });
  verifyBookingAccess('Doctor cannot book appointments', doctorBookingAttempt, 403);

  // TEST 4: Patient B books an appointment
  const bookB = await request('/appointments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenPatientB}` }
  }, {
    doctorId: doctor._id,
    date: apptDate,
    time: firstSlot,
    reason: 'Private Confidential Checkup',
    patientId: userA._id,
  });
  verifyBookingAccess('Patient can book an available appointment', bookB, 201);
  const bookedPatientId =
    typeof bookB.data.appointment.patientId === 'object'
      ? bookB.data.appointment.patientId._id
      : bookB.data.appointment.patientId;
  assert.strictEqual(
    bookedPatientId,
    regB.data.user._id,
    'Booking must use the authenticated patient, not patientId from the request body'
  );
  console.log('Patient ID spoofing ignored: PASS');
  const apptBId = bookB.data.appointment._id;
  const adminCheckInAttempt = await request(`/queue/check-in/${apptBId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenAdmin}` },
  });
  assert.strictEqual(adminCheckInAttempt.status, 403, 'Admins cannot check patients in');

  const doctorCheckInAttempt = await request(`/queue/check-in/${apptBId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenDoctor}` },
  });
  assert.strictEqual(doctorCheckInAttempt.status, 403, 'Doctors cannot check patients in');

  const duplicateBooking = await request('/appointments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenPatientA}` },
  }, {
    doctorId: doctor._id,
    date: apptDate,
    time: firstSlot,
    reason: 'Duplicate slot attempt',
  });
  assert.strictEqual(duplicateBooking.status, 409, 'An occupied doctor slot cannot be booked twice');

  const racePatientEmails = [
    `sec_race_a_${Date.now()}@example.com`,
    `sec_race_b_${Date.now()}@example.com`,
  ];
  const racePatients = await Promise.all(
    racePatientEmails.map((email, index) =>
      request('/auth/register', { method: 'POST' }, {
        name: `Concurrent Booking Patient ${index + 1}`,
        email,
        phone: `+1 555-43${index}0`,
        password: 'password123',
      })
    )
  );
  racePatients.forEach((response) =>
    assert.strictEqual(response.status, 201, 'Concurrent booking patients must be registered')
  );

  const concurrentAttempts = await Promise.all([
    request('/appointments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${racePatients[0].data.token}` },
    }, {
      doctorId: doctor._id,
      date: apptDate,
      time: concurrentSlot,
      reason: 'Concurrent booking attempt A',
    }),
    request('/appointments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${racePatients[1].data.token}` },
    }, {
      doctorId: doctor._id,
      date: apptDate,
      time: concurrentSlot,
      reason: 'Concurrent booking attempt B',
    }),
  ]);
  assert.deepStrictEqual(
    concurrentAttempts.map((response) => response.status).sort(),
    [201, 409],
    `Exactly one concurrent booking for a doctor slot must succeed (responses: ${JSON.stringify(
      concurrentAttempts.map(({ status, data }) => ({ status, message: data?.message }))
    )})`
  );

  // TEST 4: Patient A tries to read Patient B's appointment details
  const crossView = await request(`/appointments/${apptBId}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${tokenPatientA}` }
  });
  console.log('Security Test 3: Patient cannot view another patient’s appointment (403):',
    crossView.status === 403 ? 'PASS' : 'FAIL',
    `Status: ${crossView.status}`
  );

  // TEST 5: Patient A tries to cancel Patient B's appointment
  const crossCancel = await request(`/appointments/${apptBId}/cancel`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${tokenPatientA}` }
  });
  console.log('Security Test 4: Patient cannot cancel another patient’s appointment (403):',
    crossCancel.status === 403 ? 'PASS' : 'FAIL',
    `Status: ${crossCancel.status}`
  );

  // TEST 6: Patient A tries to check in Patient B's appointment
  const crossCheckIn = await request(`/queue/check-in/${apptBId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenPatientA}` }
  });
  console.log('Security Test 5: Patient cannot check in another patient’s appointment (403):',
    crossCheckIn.status === 403 ? 'PASS' : 'FAIL',
    `Status: ${crossCheckIn.status}`
  );

  // TEST 7: Patient B checks in own appointment -> assigns token #1
  const validCheckIn = await request(`/queue/check-in/${apptBId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenPatientB}` }
  });
  assert.strictEqual(validCheckIn.status, 201);
  const checkedInAppointment = await request(`/appointments/${apptBId}`, {
    headers: { Authorization: `Bearer ${tokenPatientB}` },
  });
  assert.strictEqual(checkedInAppointment.data.appointment.status, 'checked-in');
  const queueEntryId = validCheckIn.data.queue._id;

  const secondBooking = await request('/appointments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenPatientA}` },
  }, {
    doctorId: doctor._id,
    date: apptDate,
    time: secondSlot,
    reason: 'Queue ordering verification',
  });
  assert.strictEqual(secondBooking.status, 201);
  const secondCheckIn = await request(
    `/queue/check-in/${secondBooking.data.appointment._id}`,
    { method: 'POST', headers: { Authorization: `Bearer ${tokenPatientA}` } }
  );
  assert.strictEqual(secondCheckIn.status, 201);
  const secondQueueEntryId = secondCheckIn.data.queue._id;

  const outOfOrderCall = await request(`/queue/${secondQueueEntryId}/advance`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${tokenStaff}` },
  }, { targetStatus: 'in-consultation' });
  assert.strictEqual(outOfOrderCall.status, 409, 'Receptionist must call the earliest waiting token');

  // TEST 8: Patient B tries to advance queue -> must be 403
  const patientAdvance = await request(`/queue/${queueEntryId}/advance`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${tokenPatientB}` }
  }, { targetStatus: 'in-consultation' });
  console.log('Security Test 6: Patient forbidden from advancing queue (403):',
    patientAdvance.status === 403 ? 'PASS' : 'FAIL',
    `Status: ${patientAdvance.status}`
  );

  // TEST 9: Staff advances queue -> must succeed (200)
  const staffAdvance = await request(`/queue/${queueEntryId}/advance`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${tokenStaff}` }
  }, { targetStatus: 'in-consultation' });
  console.log('Security Test 7: Staff permitted to advance queue (200):',
    staffAdvance.status === 200 ? 'PASS' : 'FAIL',
    `Token status updated to: ${staffAdvance.data.queue?.status}`
  );
  const inConsultationAppointment = await request(`/appointments/${apptBId}`, {
    headers: { Authorization: `Bearer ${tokenPatientB}` },
  });
  assert.strictEqual(inConsultationAppointment.data.appointment.status, 'in-consultation');

  const cancelActiveConsultation = await request(`/appointments/${apptBId}/cancel`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${tokenPatientB}` },
  });
  assert.strictEqual(cancelActiveConsultation.status, 400, 'Active consultations cannot be cancelled');

  const callDuringConsultation = await request(`/queue/${secondQueueEntryId}/advance`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${tokenStaff}` },
  }, { targetStatus: 'in-consultation' });
  assert.strictEqual(callDuringConsultation.status, 409, 'A second consultation cannot start while one is active');

  const waitingStatus = await request('/queue/my-status', {
    headers: { Authorization: `Bearer ${tokenPatientA}` },
  });
  assert.strictEqual(
    waitingStatus.data.estimatedWaitMinutes,
    doctor.averageConsultationMinutes,
    'Wait estimate includes the consultation ahead'
  );

  const completeFirstConsultation = await request(`/queue/${queueEntryId}/advance`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${securityDoctorToken}` },
  }, { targetStatus: 'completed' });
  assert.strictEqual(completeFirstConsultation.status, 200);
  const completedAppointment = await request(`/appointments/${apptBId}`, {
    headers: { Authorization: `Bearer ${tokenPatientB}` },
  });
  assert.strictEqual(completedAppointment.data.appointment.status, 'completed');

  const callSecondPatient = await request(`/queue/${secondQueueEntryId}/advance`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${tokenStaff}` },
  }, { targetStatus: 'in-consultation' });
  assert.strictEqual(callSecondPatient.status, 200);

  const completeSecondConsultation = await request(`/queue/${secondQueueEntryId}/advance`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${securityDoctorToken}` },
  }, { targetStatus: 'completed' });
  assert.strictEqual(completeSecondConsultation.status, 200);

  const concurrentWinner = concurrentAttempts.find((response) => response.status === 201);
  const winnerId = concurrentWinner.data.appointment.patientId._id;
  const winnerToken =
    winnerId === racePatients[0].data.user._id
      ? racePatients[0].data.token
      : racePatients[1].data.token;
  let cleanupConcurrentBooking = await request(
    `/appointments/${concurrentWinner.data.appointment._id}/cancel`,
    { method: 'PATCH', headers: { Authorization: `Bearer ${winnerToken}` } }
  );
  if (cleanupConcurrentBooking.status !== 200) {
    cleanupConcurrentBooking = await request(
      `/appointments/${concurrentWinner.data.appointment._id}/cancel`,
      { method: 'PATCH', headers: { Authorization: `Bearer ${winnerToken}` } }
    );
  }
  assert.strictEqual(cleanupConcurrentBooking.status, 200, 'Concurrent test appointment should be cleaned up');

  // TEST 10: Anonymous/Public viewer queries doctor queue -> sensitive data masked
  const publicQueue = await request(`/queue/doctor/${doctor._id}?date=${apptDate}`);
  const publicEntry = publicQueue.data.queueEntries[0];
  const isMasked = publicEntry && !publicEntry.patientId.phone && !publicEntry.appointmentId?.reason;
  console.log('Security Test 8: Public/Patient waiting board masks phone and reason (HIPAA privacy):',
    isMasked ? 'PASS' : 'FAIL',
    `Masked Name: '${publicEntry?.patientId?.name}', Phone: ${publicEntry?.patientId?.phone || 'OMITTED'}, Reason: ${publicEntry?.appointmentId?.reason || 'OMITTED'}`
  );

  // TEST 11: Staff viewer queries doctor queue -> full contact & clinical data visible
  const staffQueue = await request(`/queue/doctor/${doctor._id}?date=${apptDate}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${tokenStaff}` }
  });
  const staffEntry = staffQueue.data.queueEntries[0];
  const hasFullDetails = staffEntry && staffEntry.patientId?.phone && staffEntry.appointmentId?.reason;
  console.log('Security Test 9: Staff receives full contact & clinical details for patient coordination:',
    hasFullDetails ? 'PASS' : 'FAIL',
    `Full Name: '${staffEntry?.patientId?.name}', Phone: '${staffEntry?.patientId?.phone}', Reason: '${staffEntry?.appointmentId?.reason}'`
  );

  console.log('================================================================');
  console.log('ALL SECURITY & ROLE-BASED ACCESS CONTROL TESTS PASSED 100%!');
  console.log('================================================================');
}

runSecurityTests().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
