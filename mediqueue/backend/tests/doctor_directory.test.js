require('dotenv').config({ path: __dirname + '/../.env' });
const http = require('http');
const assert = require('assert');
const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../config/db');
const app = require('../app');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Organisation = require('../models/Organisation');
const DoctorAffiliation = require('../models/DoctorAffiliation');

const request = (port, path) =>
  new Promise((resolve, reject) => {
    http.get({ host: 'localhost', port, path: `/api${path}` }, (response) => {
      let data = '';
      response.on('data', (chunk) => (data += chunk));
      response.on('end', () => {
        try {
          resolve({ status: response.statusCode, data: JSON.parse(data) });
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', reject);
  });

const runDoctorDirectoryTests = async () => {
  await connectDB();
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const port = server.address().port;
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let userId;
  let doctorId;
  let organisationId;

  try {
    const user = await User.create({
      name: 'Directory Test Admin',
      email: `directory-admin-${suffix}@example.com`,
      phone: '555-0100',
      password: 'password123',
      role: 'admin',
    });
    userId = user._id;

    const doctor = await Doctor.create({
      name: 'Dr. Directory Test',
      specialization: 'Cardiologist',
      department: 'Cardiology',
      medicalRegistrationNumber: `DIRECTORY-${suffix}`,
      clinicHospitalName: 'Legacy Clinic',
      clinicAddress: '',
      verificationStatus: 'APPROVED',
      isActive: true,
    });
    doctorId = doctor._id;

    const city = `DirectoryCity${suffix}`;
    const organisationName = `Directory Hospital ${suffix}`;
    const organisation = await Organisation.create({
      type: 'hospital',
      name: organisationName,
      city,
      address: '100 Test Avenue',
      orgAdmin: userId,
      isActive: true,
      approvalStatus: 'approved',
    });
    organisationId = organisation._id;

    await DoctorAffiliation.create({
      doctorId,
      orgId: organisationId,
      availableDays: ['Monday'],
      availableSlots: ['09:00 AM'],
      consultationFee: 125,
      roomNumber: 'Test Room 1',
    });

    const byCity = await request(port, `/doctors?city=${encodeURIComponent(city)}`);
    assert.strictEqual(byCity.status, 200);
    assert.strictEqual(byCity.data.count, 1);
    assert.strictEqual(byCity.data.doctors[0].organisations[0].name, organisationName);
    assert.strictEqual(byCity.data.doctors[0].organisations[0].city, city);

    const byLocation = await request(port, `/doctors?location=${encodeURIComponent(city)}`);
    assert.strictEqual(byLocation.status, 200);
    assert.strictEqual(byLocation.data.doctors[0]._id, doctorId.toString());

    const byOrganisation = await request(
      port,
      `/doctors?search=${encodeURIComponent(organisationName)}`
    );
    assert.strictEqual(byOrganisation.status, 200);
    assert.strictEqual(byOrganisation.data.doctors[0]._id, doctorId.toString());

    console.log('Doctor directory organisation and location tests passed.');
  } finally {
    if (doctorId) await DoctorAffiliation.deleteMany({ doctorId });
    if (organisationId) await Organisation.deleteOne({ _id: organisationId });
    if (doctorId) await Doctor.deleteOne({ _id: doctorId });
    if (userId) await User.deleteOne({ _id: userId });
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
    await disconnectDB();
  }
};

runDoctorDirectoryTests().catch(async (error) => {
  console.error(error);
  if (mongoose.connection.readyState !== 0) {
    await disconnectDB();
  }
  process.exitCode = 1;
});
