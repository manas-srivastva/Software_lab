require('dotenv').config({ path: __dirname + '/../.env' });
const http = require('http');
const assert = require('assert');
const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../config/db');
const app = require('../app');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const Queue = require('../models/Queue');
const Organisation = require('../models/Organisation');
const DoctorAffiliation = require('../models/DoctorAffiliation');
const generateToken = require('../utils/generateToken');

const request = (port, path, options = {}, body = null) =>
  new Promise((resolve, reject) => {
    const requestOptions = {
      host: 'localhost',
      port,
      path: `/api${path}`,
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    };
    const req = http.request(requestOptions, (response) => {
      let data = '';
      response.on('data', (chunk) => (data += chunk));
      response.on('end', () => {
        try {
          resolve({ status: response.statusCode, data: JSON.parse(data) });
        } catch (error) {
          reject(error);
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });

let tenantPort;

const runTenantWorkflowTests = async () => {
  await connectDB();
  const superadmin = await User.create({
    name: 'Tenant Test Superadmin',
    email: `tenant-superadmin-${Date.now()}@example.com`,
    phone: '555-010221',
    password: 'password123',
    role: 'superadmin',
  });
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  tenantPort = server.address().port;

  const createdUserIds = [superadmin._id];
  const createdOrgIds = [];
  let doctorId;
  let appointmentId;
  let queueId;

  try {
    const superadminLogin = await request(tenantPort, '/auth/login', { method: 'POST' }, {
      email: superadmin.email,
      password: 'password123',
    });
    assert.strictEqual(superadminLogin.status, 200);
    const superadminHeaders = { Authorization: `Bearer ${superadminLogin.data.token}` };

    const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const unassignedOrgAdmin = await User.create({
      name: `Unassigned Org Admin ${suffix}`,
      email: `unassigned-org-admin-${suffix}@example.com`,
      phone: '555-010220',
      password: 'password123',
      role: 'orgAdmin',
    });
    createdUserIds.push(unassignedOrgAdmin._id);
    const unassignedOrgAdminHeaders = {
      Authorization: `Bearer ${generateToken(unassignedOrgAdmin._id, unassignedOrgAdmin.role)}`,
    };
    const unscopedAppointments = await request(tenantPort, '/appointments/all', {
      headers: unassignedOrgAdminHeaders,
    });
    assert.strictEqual(unscopedAppointments.status, 403);
    const unscopedOrganisationDoctors = await request(tenantPort, '/organisations/me/doctors', {
      headers: unassignedOrgAdminHeaders,
    });
    assert.strictEqual(unscopedOrganisationDoctors.status, 403);
    const unscopedQueue = await request(
      tenantPort,
      '/queue/doctor/000000000000000000000000',
      { headers: unassignedOrgAdminHeaders }
    );
    assert.strictEqual(unscopedQueue.status, 403);

    const orgA = await request(tenantPort, '/organisations/register', { method: 'POST' }, {
      name: `Org Admin ${suffix}`,
      email: `org-admin-a-${suffix}@example.com`,
      phone: '555-010222',
      password: 'password123',
      type: 'clinic',
      orgName: `Tenant Clinic A ${suffix}`,
      city: `TenantCity${suffix}`,
      address: '1 Tenant Street',
    });
    assert.strictEqual(orgA.status, 201);
    createdUserIds.push(orgA.data.user._id);
    createdOrgIds.push(orgA.data.organisation._id);
    assert.strictEqual(orgA.data.organisation.isActive, false);

    const orgB = await request(tenantPort, '/organisations/register', { method: 'POST' }, {
      name: `Org Admin B ${suffix}`,
      email: `org-admin-b-${suffix}@example.com`,
      phone: '555-010223',
      password: 'password123',
      type: 'hospital',
      orgName: `Tenant Hospital B ${suffix}`,
      city: 'Other City',
      address: '2 Tenant Street',
    });
    assert.strictEqual(orgB.status, 201);
    createdUserIds.push(orgB.data.user._id);
    createdOrgIds.push(orgB.data.organisation._id);

    const pending = await request(tenantPort, '/organisations/superadmin/pending', {
      headers: superadminHeaders,
    });
    assert(pending.data.organisations.some((org) => org._id === orgA.data.organisation._id));

    const deniedReview = await request(
      tenantPort,
      `/organisations/superadmin/${orgA.data.organisation._id}/approve`,
      { method: 'PATCH', headers: { Authorization: `Bearer ${orgA.data.token}` } }
    );
    assert.strictEqual(deniedReview.status, 403);

    for (const orgId of createdOrgIds) {
      const approval = await request(
        tenantPort,
        `/organisations/superadmin/${orgId}/approve`,
        { method: 'PATCH', headers: superadminHeaders }
      );
      assert.strictEqual(approval.status, 200);
    }

    const patient = await request(tenantPort, '/auth/register', { method: 'POST' }, {
      name: `Tenant Patient ${suffix}`,
      email: `tenant-patient-${suffix}@example.com`,
      phone: '555-010224',
      password: 'password123',
    });
    assert.strictEqual(patient.status, 201);
    createdUserIds.push(patient.data.user._id);
    const patientHeaders = { Authorization: `Bearer ${patient.data.token}` };
    const orgAHeaders = { Authorization: `Bearer ${orgA.data.token}` };
    const orgBHeaders = { Authorization: `Bearer ${orgB.data.token}` };

    const weekday = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const doctor = await Doctor.create({
      name: `Dr Tenant ${suffix}`,
      specialization: 'General Physician',
      department: 'General Medicine',
      medicalRegistrationNumber: `TENANT-${suffix}`,
      verificationStatus: 'APPROVED',
      isActive: true,
      availableDays: [weekday],
      availableSlots: ['09:00 AM'],
    });
    doctorId = doctor._id;

    const affiliation = await request(
      tenantPort,
      '/organisations/me/doctors',
      { method: 'POST', headers: orgAHeaders },
      { doctorId: doctorId.toString(), orgId: orgB.data.organisation._id, consultationFee: 90 }
    );
    assert.strictEqual(affiliation.status, 201);
    assert.strictEqual(affiliation.data.affiliation.orgId, orgA.data.organisation._id);

    const orgAAppointments = await request(tenantPort, '/appointments/all', {
      headers: orgAHeaders,
    });
    assert.strictEqual(orgAAppointments.status, 200);
    assert.strictEqual(orgAAppointments.data.count, 0);

    const today = new Date();
    const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const booking = await request(tenantPort, '/appointments', {
      method: 'POST',
      headers: patientHeaders,
    }, {
      doctorId: doctorId.toString(),
      orgId: orgA.data.organisation._id,
      date,
      time: '09:00 AM',
      reason: 'Tenant-scoped appointment',
    });
    assert.strictEqual(booking.status, 201, JSON.stringify(booking.data));
    appointmentId = booking.data.appointment._id;
    assert.strictEqual(booking.data.appointment.orgId._id, orgA.data.organisation._id);

    const checkedIn = await request(
      tenantPort,
      `/queue/check-in/${appointmentId}`,
      { method: 'POST', headers: patientHeaders }
    );
    assert.strictEqual(checkedIn.status, 201, JSON.stringify(checkedIn.data));
    queueId = checkedIn.data.queue._id;
    assert.strictEqual(checkedIn.data.queue.orgId._id, orgA.data.organisation._id);

    const ownAppointments = await request(tenantPort, '/appointments/all', {
      headers: orgAHeaders,
    });
    assert.strictEqual(ownAppointments.data.count, 1);
    const attemptedCrossOrgFilter = await request(
      tenantPort,
      `/appointments/all?orgId=${orgB.data.organisation._id}`,
      { headers: orgAHeaders }
    );
    assert.strictEqual(attemptedCrossOrgFilter.data.count, 1);
    assert(attemptedCrossOrgFilter.data.appointments.every(
      (appointment) => appointment.orgId._id === orgA.data.organisation._id
    ));

    const ownQueue = await request(
      tenantPort,
      `/queue/doctor/${doctorId}?date=${date}&orgId=${orgB.data.organisation._id}`,
      { headers: orgAHeaders }
    );
    assert.strictEqual(ownQueue.status, 200);
    assert.strictEqual(ownQueue.data.queueEntries.length, 1);
    assert(ownQueue.data.queueEntries.every((entry) => entry.orgId.toString() === orgA.data.organisation._id));

    const blockedQueueAdvance = await request(
      tenantPort,
      `/queue/${queueId}/advance`,
      { method: 'PATCH', headers: orgBHeaders },
      { targetStatus: 'in-consultation' }
    );
    assert.strictEqual(blockedQueueAdvance.status, 403);

    const orgAdminCall = await request(
      tenantPort,
      `/queue/${queueId}/advance`,
      { method: 'PATCH', headers: orgAHeaders },
      { targetStatus: 'in-consultation' }
    );
    assert.strictEqual(orgAdminCall.status, 200);
    const orgAdminComplete = await request(
      tenantPort,
      `/queue/${queueId}/advance`,
      { method: 'PATCH', headers: orgAHeaders },
      { targetStatus: 'completed' }
    );
    assert.strictEqual(orgAdminComplete.status, 200);

    const blockedAffiliationUpdate = await request(
      tenantPort,
      `/organisations/me/doctors/${affiliation.data.affiliation._id}`,
      { method: 'PATCH', headers: orgBHeaders },
      { consultationFee: 1 }
    );
    assert.strictEqual(blockedAffiliationUpdate.status, 404);

    const otherOrgAppointments = await request(tenantPort, '/appointments/all', {
      headers: orgBHeaders,
    });
    assert.strictEqual(otherOrgAppointments.status, 200);
    assert.strictEqual(otherOrgAppointments.data.count, 0);

    console.log('Organisation approval, scoping, appointment, and queue tests passed.');
  } finally {
    if (queueId) await Queue.deleteOne({ _id: queueId });
    if (appointmentId) await Appointment.deleteOne({ _id: appointmentId });
    if (doctorId) {
      await DoctorAffiliation.deleteMany({ doctorId });
      await Doctor.deleteOne({ _id: doctorId });
    }
    if (createdOrgIds.length) await Organisation.deleteMany({ _id: { $in: createdOrgIds } });
    await User.deleteMany({ _id: { $in: createdUserIds } });
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
    await disconnectDB();
  }
};

runTenantWorkflowTests().catch(async (error) => {
  console.error(error);
  if (mongoose.connection.readyState !== 0) await disconnectDB();
  process.exitCode = 1;
});
