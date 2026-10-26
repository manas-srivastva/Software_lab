const http = require('http');
const assert = require('assert');

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

async function testAllFourActors() {
  console.log('=================================================================');
  console.log('--- STARTING 4-ACTOR FUNCTIONALITY & ROLE-BASED VERIFICATION ---');
  console.log('=================================================================');

  // ==========================================
  // ACTOR 1: PATIENT
  // ==========================================
  console.log('\n[ACTOR 1: PATIENT]');
  const patientEmail = `patient_actor_${Date.now()}@test.com`;
  const regPatient = await request('/auth/register', { method: 'POST' }, {
    name: 'Emily Watson',
    email: patientEmail,
    phone: '+1 555-9090',
    password: 'password123',
  });
  console.log('1.1 Patient Registration:', regPatient.status === 201 ? 'PASS' : 'FAIL', regPatient.data.user?.email);
  const patientToken = regPatient.data.token;

  const adminLogin = await request('/auth/login', { method: 'POST' }, {
    email: 'admin@mediqueue.com',
    password: 'password123',
  });
  assert.strictEqual(adminLogin.status, 200, 'The test administrator must be able to log in');
  const testDoctorName = `Dr. Four Actor ${Date.now()}`;
  const testDoctorEmail = `four_actor_doctor_${Date.now()}@test.com`;
  const createTestDoctor = await request('/admin/doctors', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminLogin.data.token}` },
  }, {
    name: testDoctorName,
    email: testDoctorEmail,
    password: 'password123',
    specialization: 'General Physician',
    department: 'General Medicine',
    availableDays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    availableSlots: ['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM'],
  });
  assert.strictEqual(createTestDoctor.status, 201, 'The workflow must create its own doctor fixture');
  const testDoctorId = createTestDoctor.data.doctor._id;

  // Search doctors
  const searchDocs = await request(`/doctors?search=${encodeURIComponent(testDoctorName)}`);
  const doctor = searchDocs.data.doctors.find((item) => item._id === testDoctorId);
  console.log('1.2 Patient Searches Doctors:', searchDocs.status === 200 && doctor ? 'PASS' : 'FAIL', `Found Dr. ${doctor.name}`);

  // Book appointment
  const testDate = getTodayDate();
  const availability = await request(`/doctors/${doctor._id}/slots?date=${testDate}`);
  const freeSlots = availability.data.slots.filter((slot) => slot.isAvailable);
  assert(freeSlots.length > 0, 'The doctor must have a free slot today for same-day check-in');
  const bookAppt = await request('/appointments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${patientToken}` }
  }, {
    doctorId: doctor._id,
    date: testDate,
    time: freeSlots[0].time,
    reason: 'Skin rash and allergy consultation',
  });
  console.log('1.3 Patient Books Appointment:', bookAppt.status === 201 ? 'PASS' : 'FAIL', `Appt ID: ${bookAppt.data.appointment?._id}`);
  const patientApptId = bookAppt.data.appointment?._id;

  // Check in appointment
  const checkIn = await request(`/queue/check-in/${patientApptId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${patientToken}` }
  });
  console.log('1.4 Patient Checks In & Gets Token:', checkIn.status === 201 ? 'PASS' : 'FAIL', `Assigned Token #${checkIn.data.queue?.tokenNumber}`);
  const queueEntryId = checkIn.data.queue?._id;
  assert.strictEqual(bookAppt.status, 201, 'Patients should be able to book available appointments');
  assert.strictEqual(checkIn.status, 201, 'Patients should be able to check in to their appointment');

  // Track queue
  const queueStatus = await request('/queue/my-status', {
    method: 'GET',
    headers: { Authorization: `Bearer ${patientToken}` }
  });
  console.log('1.5 Patient Tracks Queue Status:', queueStatus.status === 200 ? 'PASS' : 'FAIL', `Token #${queueStatus.data.queue?.tokenNumber}, Ahead: ${queueStatus.data.patientsAhead}`);

  // ==========================================
  // ACTOR 2: DOCTOR
  // ==========================================
  console.log('\n[ACTOR 2: DOCTOR]');
  const docLogin = await request('/auth/login', { method: 'POST' }, {
    email: testDoctorEmail,
    password: 'password123',
  });
  console.log('2.1 Doctor Logs In:', docLogin.status === 200 ? 'PASS' : 'FAIL', docLogin.data.user?.name);
  const doctorToken = docLogin.data.token;

  // Doctor updates availability without changing the existing schedule.
  const doctorProfile = await request('/doctors/me', {
    method: 'GET',
    headers: { Authorization: `Bearer ${doctorToken}` }
  });
  assert.strictEqual(doctorProfile.status, 200);
  const updateAvail = await request('/doctors/me/availability', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${doctorToken}` }
  }, {
    roomNumber: doctorProfile.data.doctor.roomNumber,
    averageConsultationMinutes: doctorProfile.data.doctor.averageConsultationMinutes,
    availableDays: doctorProfile.data.doctor.availableDays,
    availableSlots: doctorProfile.data.doctor.availableSlots,
  });
  assert.strictEqual(updateAvail.status, 200, updateAvail.data.message);
  console.log('2.2 Doctor Manages Availability/Settings:', updateAvail.status === 200 ? 'PASS' : 'FAIL', `New Room: ${updateAvail.data.doctor?.roomNumber}, Avg Consult: ${updateAvail.data.doctor?.averageConsultationMinutes}m`);

  // Doctor views appointments
  const docAppts = await request(`/appointments/doctor/me?date=${testDate}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${doctorToken}` }
  });
  assert.strictEqual(docAppts.status, 200);
  console.log('2.3 Doctor Views Scheduled Appointments:', docAppts.status === 200 ? 'PASS' : 'FAIL', `Found ${docAppts.data.count} appts for date ${testDate}`);

  // Doctor consults patient & advances consultation status
  const docAdvance1 = await request(`/queue/${queueEntryId}/advance`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${doctorToken}` }
  }, { targetStatus: 'in-consultation' });
  console.log('2.4 Doctor Cannot Call Waiting Patients:', docAdvance1.status === 403 ? 'PASS' : 'FAIL');
  assert.strictEqual(docAdvance1.status, 403, 'Doctors must not call waiting patients');

  const docAdvance2 = await request(`/queue/${queueEntryId}/advance`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${doctorToken}` }
  }, { targetStatus: 'completed' });
  console.log('2.5 Doctor Cannot Complete Before Consultation:', docAdvance2.status === 400 ? 'PASS' : 'FAIL');
  assert.strictEqual(docAdvance2.status, 400, 'A waiting consultation cannot be completed');

  // ==========================================
  // ACTOR 3: RECEPTIONIST
  // ==========================================
  console.log('\n[ACTOR 3: RECEPTIONIST]');
  const recepLogin = await request('/auth/login', { method: 'POST' }, {
    email: 'receptionist@mediqueue.com',
    password: 'password123',
  });
  console.log('3.1 Receptionist Logs In:', recepLogin.status === 200 ? 'PASS' : 'FAIL', recepLogin.data.user?.name);
  const recepToken = recepLogin.data.token;

  // Receptionist cannot create appointments; check-in applies to an existing patient booking.
  const walkinRes = await request('/receptionist/walk-in', {
    method: 'POST',
    headers: { Authorization: `Bearer ${recepToken}` }
  }, {
    name: 'Walkin Visitor',
    phone: `+1 555-77${Math.floor(Math.random() * 90) + 10}`,
    doctorId: doctor._id,
    reason: 'Emergency walk-in skin burn',
  });
  console.log('3.2 Receptionist Cannot Create Walk-in Appointment:', walkinRes.status === 403 ? 'PASS' : 'FAIL');
  assert.strictEqual(walkinRes.status, 403, 'Receptionists must not create walk-in appointments');

  const receptionistCall = await request(`/queue/${queueEntryId}/advance`, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer ' + recepToken }
  }, { targetStatus: 'in-consultation' });
  console.log('3.3 Receptionist Confirms Check-in & Calls Patient:', receptionistCall.status === 200 ? 'PASS' : 'FAIL');
  assert.strictEqual(receptionistCall.status, 200, 'Receptionists should call checked-in patients');

  const receptionistComplete = await request(`/queue/${queueEntryId}/advance`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${recepToken}` }
  }, { targetStatus: 'completed' });
  console.log('3.4 Receptionist Cannot Complete Consultation:', receptionistComplete.status === 403 ? 'PASS' : 'FAIL');
  assert.strictEqual(receptionistComplete.status, 403, 'Receptionists must not complete consultations');

  const doctorComplete = await request(`/queue/${queueEntryId}/advance`, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer ' + doctorToken }
  }, { targetStatus: 'completed' });
  console.log('3.5 Assigned Doctor Completes Consultation:', doctorComplete.status === 200 ? 'PASS' : 'FAIL');
  assert.strictEqual(doctorComplete.status, 200, 'The assigned doctor should complete an active consultation');

  // Receptionist views live doctor queue
  const recepQueue = await request(`/queue/doctor/${doctor._id}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${recepToken}` }
  });
  assert.strictEqual(recepQueue.status, 200);
  console.log('3.6 Receptionist Manages Doctor Queue:', recepQueue.status === 200 ? 'PASS' : 'FAIL', `Queue count: ${recepQueue.data.queueEntries?.length}`);

  // ==========================================
  // ACTOR 4: ADMINISTRATOR (ADMIN)
  // ==========================================
  console.log('\n[ACTOR 4: ADMINISTRATOR]');
  console.log('4.1 Admin Logs In:', adminLogin.status === 200 ? 'PASS' : 'FAIL', adminLogin.data.user?.name);
  const adminToken = adminLogin.data.token;

  const adminAdvance = await request(`/queue/${queueEntryId}/advance`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` }
  }, { targetStatus: 'in-consultation' });
  console.log('4.2 Admin Cannot Advance Queue:', adminAdvance.status === 403 ? 'PASS' : 'FAIL');
  assert.strictEqual(adminAdvance.status, 403, 'Admins must not advance queue consultations');

  // System reports
  const reports = await request('/admin/reports', {
    method: 'GET',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.strictEqual(reports.status, 200);
  console.log('4.3 Admin Views System Reports:', reports.status === 200 ? 'PASS' : 'FAIL',
    `Patients: ${reports.data.stats?.totalPatients}, Doctors: ${reports.data.stats?.totalDoctors}, Total Appts: ${reports.data.stats?.totalAppointments}`
  );

  // Admin updates an existing doctor and toggles its state back to avoid persistent test changes.
  const adminDoctors = await request('/admin/doctors', {
    method: 'GET',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const doctorToUpdate = adminDoctors.data.doctors[0];
  const doctorUpdate = await request(`/admin/doctors/${doctorToUpdate._id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` }
  }, { roomNumber: doctorToUpdate.roomNumber });
  assert.strictEqual(doctorUpdate.status, 200, doctorUpdate.data.message);
  console.log('4.4 Admin Updates Doctor:', doctorUpdate.status === 200 ? 'PASS' : 'FAIL');

  const toggleDoc = await request(`/admin/doctors/${doctorToUpdate._id}/toggle`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const restoreDoctor = await request(`/admin/doctors/${doctorToUpdate._id}/toggle`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.strictEqual(toggleDoc.status, 200);
  assert.strictEqual(restoreDoctor.status, 200);
  console.log('4.5 Admin Toggles and Restores Doctor Status:', toggleDoc.status === 200 && restoreDoctor.status === 200 ? 'PASS' : 'FAIL');

  // Admin manages patients
  const adminPatients = await request('/admin/patients', {
    method: 'GET',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.strictEqual(adminPatients.status, 200);
  console.log('4.6 Admin Views Registered Patients List:', adminPatients.status === 200 ? 'PASS' : 'FAIL', `Found ${adminPatients.data.count} patients`);

  // Admin manages departments
  const adminDepts = await request('/admin/departments', {
    method: 'GET',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.strictEqual(adminDepts.status, 200);
  console.log('4.7 Admin Views Departments Summary:', adminDepts.status === 200 ? 'PASS' : 'FAIL', `Found ${adminDepts.data.departments?.length} departments`);

  // Admin views clinic-wide appointments
  const adminAllAppts = await request('/appointments/all', {
    method: 'GET',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.strictEqual(adminAllAppts.status, 200);
  console.log('4.8 Admin Views All Clinic Appointments:', adminAllAppts.status === 200 ? 'PASS' : 'FAIL', `Found ${adminAllAppts.data.count} clinic appointments`);

  console.log('\n=================================================================');
  console.log('ALL 4 ACTORS (PATIENT, DOCTOR, RECEPTIONIST, ADMIN) VERIFIED 100%!');
  console.log('=================================================================');
}

testAllFourActors().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
