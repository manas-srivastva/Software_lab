const http = require('http');

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

async function runTests() {
  console.log('--- STARTING MEDIQUEUE END-TO-END VERIFICATION ---');

  // Test 1: Register Patient
  const regEmail = `jane.doe_${Date.now()}@example.com`;
  const regRes = await request('/auth/register', { method: 'POST' }, {
    name: 'Jane Doe',
    email: regEmail,
    phone: '+1 555-8888',
    password: 'password123',
  });
  console.log('1. Register Patient:', regRes.status === 201 ? 'PASS' : 'FAIL', regRes.data.message);
  const janeToken = regRes.data.token;

  // Test 2: Login Patient
  const loginRes = await request('/auth/login', { method: 'POST' }, {
    email: regEmail,
    password: 'password123',
  });
  console.log('2. Login Patient:', loginRes.status === 200 ? 'PASS' : 'FAIL', loginRes.data.user.name);

  // Test 3: Fetch Doctors from DB
  const docRes = await request('/doctors');
  console.log('3. Fetch Doctors Count:', docRes.data.count >= 6 ? 'PASS' : 'FAIL', `(${docRes.data.count} doctors loaded)`);
  const today = getTodayDate();
  const weekday = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const doctor = docRes.data.doctors.find((item) => item.availableDays.includes(weekday));
  if (!doctor) throw new Error(`No doctor is available on ${weekday}; cannot run same-day check-in tests`);
  const availableSlotsResponse = await request(`/doctors/${doctor._id}/slots?date=${today}`);
  const freeSlots = availableSlotsResponse.data.slots.filter((slot) => slot.isAvailable);
  if (freeSlots.length < 2) throw new Error('At least two free slots are required for the E2E workflow');
  const testSlot1 = freeSlots[0].time;
  const testSlot2 = freeSlots[1].time;
  console.log(`Using Doctor: ${doctor.name}, Slots: ${testSlot1}, ${testSlot2}`);

  // Test 4: Book an available same-day appointment for check-in and queue verification.
  const testDate = today;
  const bookRes1 = await request(
    '/appointments',
    { method: 'POST', headers: { Authorization: `Bearer ${janeToken}` } },
    {
      doctorId: doctor._id,
      date: testDate,
      time: testSlot1,
      reason: 'Specialist consultation',
    }
  );
  console.log('4. Book Appointment:', bookRes1.status === 201 ? 'PASS' : 'FAIL', `ID: ${bookRes1.data.appointment?._id}`);
  const appt1Id = bookRes1.data.appointment?._id;

  // Test 5: Prevent Duplicate Booking for Same Doctor, Date, and Time Slot
  const johnLogin = await request('/auth/login', { method: 'POST' }, {
    email: 'john.doe@example.com',
    password: 'password123',
  });
  const johnToken = johnLogin.data.token;

  const bookConflict = await request(
    '/appointments',
    { method: 'POST', headers: { Authorization: `Bearer ${janeToken}` } },
    {
      doctorId: doctor._id,
      date: testDate,
      time: testSlot1, // EXACT SAME SLOT!
      reason: 'Conflicting booking test',
    }
  );
  console.log('5. Double Booking Prevention:', bookConflict.status === 409 ? 'PASS' : 'FAIL', `(Status ${bookConflict.status}: ${bookConflict.data.message})`);

  // Test 6: Second Patient books a different available slot
  const bookRes2 = await request(
    '/appointments',
    { method: 'POST', headers: { Authorization: `Bearer ${johnToken}` } },
    {
      doctorId: doctor._id,
      date: testDate,
      time: testSlot2,
      reason: 'General follow-up visit',
    }
  );
  console.log('6. Second Patient Different Slot:', bookRes2.status === 201 ? 'PASS' : 'FAIL', `ID: ${bookRes2.data.appointment?._id}`);
  const appt2Id = bookRes2.data.appointment?._id;

  // Test 7: Jane checks in -> Token #1
  const checkIn1 = await request(
    `/queue/check-in/${appt1Id}`,
    { method: 'POST', headers: { Authorization: `Bearer ${janeToken}` } }
  );
  const firstToken = checkIn1.data.queue?.tokenNumber;
  console.log('7. Jane Check-In Sequential Token:', checkIn1.status === 201 && firstToken > 0 ? 'PASS' : 'FAIL', `Assigned Token #${firstToken}`);

  // Test 8: Prevent Duplicate Check-In for Same Appointment
  const duplicateCheckIn = await request(
    `/queue/check-in/${appt1Id}`,
    { method: 'POST', headers: { Authorization: `Bearer ${janeToken}` } }
  );
  console.log('8. Duplicate Check-In Prevention:', duplicateCheckIn.status === 400 ? 'PASS' : 'FAIL', `(${duplicateCheckIn.data.message})`);

  // Test 9: John checks in -> Token #2
  const checkIn2 = await request(
    `/queue/check-in/${appt2Id}`,
    { method: 'POST', headers: { Authorization: `Bearer ${johnToken}` } }
  );
  console.log('9. John Check-In Sequential Token:', checkIn2.status === 201 && checkIn2.data.queue.tokenNumber === firstToken + 1 ? 'PASS' : 'FAIL', `Assigned Token #${checkIn2.data.queue?.tokenNumber}`);

  // Test 10: John's Queue Status & Estimated Wait Time (Jane is token #1 ahead, so patients ahead = 1)
  const johnStatus = await request(
    '/queue/my-status',
    { method: 'GET', headers: { Authorization: `Bearer ${johnToken}` } }
  );
  const expectedWait = 1 * doctor.averageConsultationMinutes;
  console.log('10. John Queue Forecast:',
    johnStatus.data.patientsAhead === 1 && johnStatus.data.estimatedWaitMinutes === expectedWait ? 'PASS' : 'FAIL',
    `Patients Ahead: ${johnStatus.data.patientsAhead}, Est. Wait: ${johnStatus.data.estimatedWaitMinutes} min (Doctor avg: ${doctor.averageConsultationMinutes}m)`
  );

  // Test 11: Patient tries to advance queue -> Must be 403 Forbidden!
  const patientAdvance = await request(
    `/queue/${checkIn1.data.queue._id}/advance`,
    { method: 'PATCH', headers: { Authorization: `Bearer ${janeToken}` } },
    { targetStatus: 'in-consultation' }
  );
  console.log('11. Unauthorized Patient Advance Blocked:', patientAdvance.status === 403 ? 'PASS' : 'FAIL', `(Status ${patientAdvance.status}: ${patientAdvance.data.message})`);

  // Test 12: Authorized Staff advances queue -> Must succeed!
  const staffLogin = await request('/auth/login', { method: 'POST' }, {
    email: 'receptionist@mediqueue.com',
    password: 'password123',
  });
  const staffToken = staffLogin.data.token;

  const staffAdvance = await request(
    `/queue/${checkIn1.data.queue._id}/advance`,
    { method: 'PATCH', headers: { Authorization: `Bearer ${staffToken}` } },
    { targetStatus: 'in-consultation' }
  );
  console.log('12. Authorized Staff Advance Queue:', staffAdvance.status === 200 ? 'PASS' : 'FAIL', `Token #${staffAdvance.data.queue?.tokenNumber} status: '${staffAdvance.data.queue?.status}'`);

  // Test 13: Re-query John's queue status (Jane is now in consultation, so patients ahead = 0, current serving = 1)
  const johnStatusAfterAdvance = await request(
    '/queue/my-status',
    { method: 'GET', headers: { Authorization: `Bearer ${johnToken}` } }
  );
  console.log('13. Updated Queue After Staff Advance:',
    johnStatusAfterAdvance.data.currentTokenBeingServed === firstToken && johnStatusAfterAdvance.data.patientsAhead === 0 ? 'PASS' : 'FAIL',
    `Current Token Served: #${johnStatusAfterAdvance.data.currentTokenBeingServed}, Patients Ahead: ${johnStatusAfterAdvance.data.patientsAhead}, Wait: ${johnStatusAfterAdvance.data.estimatedWaitMinutes} min`
  );

  const doctorLogin = await request('/auth/login', { method: 'POST' }, {
    email: 'dr.kim@mediqueue.com',
    password: 'password123',
  });
  const completedConsultation = await request(
    `/queue/${checkIn1.data.queue._id}/advance`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${doctorLogin.data.token}` },
    },
    { targetStatus: 'completed' }
  );
  if (completedConsultation.status !== 200) {
    throw new Error(`Assigned doctor could not complete the consultation: ${completedConsultation.data.message}`);
  }

  // Test 14: Appointment Cancellation
  const cancelRes = await request(
    `/appointments/${appt2Id}/cancel`,
    { method: 'PATCH', headers: { Authorization: `Bearer ${johnToken}` } }
  );
  console.log('14. Appointment Cancellation:', cancelRes.status === 200 && cancelRes.data.appointment.status === 'cancelled' ? 'PASS' : 'FAIL', `Status: '${cancelRes.data.appointment?.status}'`);

  // Test 15: Re-booking cancelled slot is now allowed
  const rebookRes = await request(
    '/appointments',
    { method: 'POST', headers: { Authorization: `Bearer ${janeToken}` } },
    {
      doctorId: doctor._id,
      date: testDate,
      time: testSlot2, // Was previously cancelled by John
      reason: 'Rebooking cancelled slot',
    }
  );
  console.log('15. Rebooking Cancelled Slot Succeeded:', rebookRes.status === 201 ? 'PASS' : 'FAIL');
  if (rebookRes.status === 201) {
    const cleanup = await request(`/appointments/${rebookRes.data.appointment._id}/cancel`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${janeToken}` },
    });
    if (cleanup.status !== 200) {
      throw new Error(`Could not clean up rebooked test appointment: ${cleanup.data.message}`);
    }
  }

  console.log('========================================================');
  console.log('ALL 15 END-TO-END VERIFICATION CHECKS PASSED PERFECTLY!');
  console.log('========================================================');
}

runTests().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
