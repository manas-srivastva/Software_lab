require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../config/db');
const Doctor = require('../models/Doctor');
const User = require('../models/User');

const sampleDoctors = [
  {
    name: 'Dr. Sarah Jenkins',
    specialization: 'Cardiologist',
    department: 'Cardiology',
    medicalRegistrationNumber: 'MED-REG-10101',
    clinicHospitalName: 'MediQueue Central Hospital',
    clinicAddress: '100 Medical Plaza, Healthcare District',
    verificationStatus: 'APPROVED',
    availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    availableSlots: [
      '09:00 AM',
      '09:30 AM',
      '10:00 AM',
      '10:30 AM',
      '11:00 AM',
      '11:30 AM',
      '02:00 PM',
      '02:30 PM',
      '03:00 PM',
      '03:30 PM',
    ],
    averageConsultationMinutes: 15,
    qualifications: 'MD, FACC, Harvard Medical School',
    experienceYears: 14,
    roomNumber: 'Cardio Suite 201',
    isActive: true,
    verificationDocuments: [
      {
        documentType: 'medical_license',
        documentUrl: 'https://docs.mediqueue.health/licenses/jenkins-sarah-med10101.pdf',
        documentName: 'Medical_Council_License_Jenkins.pdf',
      },
      {
        documentType: 'degree_certificate',
        documentUrl: 'https://docs.mediqueue.health/degrees/jenkins-harvard-md.pdf',
        documentName: 'Harvard_MD_Cardiology_Degree.pdf',
      },
    ],
    statusHistory: [
      {
        fromStatus: 'PENDING',
        toStatus: 'APPROVED',
        changedByName: 'Hospital Administrator',
        reason: 'Credentials and medical registration verified with Medical Council',
      },
    ],
  },
  {
    name: 'Dr. Marcus Chen',
    specialization: 'General Physician',
    department: 'General Medicine',
    medicalRegistrationNumber: 'MED-REG-10102',
    clinicHospitalName: 'MediQueue Central Hospital',
    clinicAddress: '100 Medical Plaza, Healthcare District',
    verificationStatus: 'APPROVED',
    availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    availableSlots: [
      '08:30 AM',
      '09:00 AM',
      '09:30 AM',
      '10:00 AM',
      '10:30 AM',
      '11:00 AM',
      '01:30 PM',
      '02:00 PM',
      '02:30 PM',
      '03:00 PM',
    ],
    averageConsultationMinutes: 12,
    qualifications: 'MBBS, MD (Internal Medicine)',
    experienceYears: 10,
    roomNumber: 'OPD Clinic 105',
    isActive: true,
    verificationDocuments: [
      {
        documentType: 'medical_license',
        documentUrl: 'https://docs.mediqueue.health/licenses/chen-marcus-med10102.pdf',
        documentName: 'State_Medical_License_Chen.pdf',
      },
    ],
    statusHistory: [
      {
        fromStatus: 'PENDING',
        toStatus: 'APPROVED',
        changedByName: 'Hospital Administrator',
        reason: 'Board certification and registration verified',
      },
    ],
  },
  {
    name: 'Dr. Emily Rodriguez',
    specialization: 'Pediatrician',
    department: 'Pediatrics',
    medicalRegistrationNumber: 'MED-REG-10103',
    clinicHospitalName: 'MediQueue Central Hospital',
    clinicAddress: '100 Medical Plaza, Healthcare District',
    verificationStatus: 'APPROVED',
    availableDays: ['Monday', 'Tuesday', 'Thursday', 'Friday'],
    availableSlots: [
      '09:30 AM',
      '10:00 AM',
      '10:30 AM',
      '11:00 AM',
      '11:30 AM',
      '02:00 PM',
      '02:30 PM',
      '03:00 PM',
      '03:30 PM',
      '04:00 PM',
    ],
    averageConsultationMinutes: 20,
    qualifications: 'MD (Pediatrics), FAAP',
    experienceYears: 11,
    roomNumber: 'Pediatrics Wing 304',
    isActive: true,
    verificationDocuments: [
      {
        documentType: 'medical_license',
        documentUrl: 'https://docs.mediqueue.health/licenses/rodriguez-emily-med10103.pdf',
        documentName: 'Pediatric_Board_License.pdf',
      },
    ],
    statusHistory: [
      {
        fromStatus: 'PENDING',
        toStatus: 'APPROVED',
        changedByName: 'Hospital Administrator',
        reason: 'Pediatric credentials and hospital privileges confirmed',
      },
    ],
  },
  {
    name: 'Dr. David Kim',
    specialization: 'Dermatologist',
    department: 'Dermatology',
    medicalRegistrationNumber: 'MED-REG-10104',
    clinicHospitalName: 'MediQueue Central Hospital',
    clinicAddress: '100 Medical Plaza, Healthcare District',
    verificationStatus: 'APPROVED',
    availableDays: ['Monday', 'Wednesday', 'Friday', 'Saturday'],
    availableSlots: [
      '10:00 AM',
      '10:30 AM',
      '11:00 AM',
      '11:30 AM',
      '01:00 PM',
      '01:30 PM',
      '02:00 PM',
      '02:30 PM',
    ],
    averageConsultationMinutes: 15,
    qualifications: 'MD, Board Certified Dermatologist',
    experienceYears: 9,
    roomNumber: 'Derma Center 112',
    isActive: true,
    verificationDocuments: [
      {
        documentType: 'medical_license',
        documentUrl: 'https://docs.mediqueue.health/licenses/kim-david-med10104.pdf',
        documentName: 'Dermatology_Board_License.pdf',
      },
    ],
    statusHistory: [
      {
        fromStatus: 'PENDING',
        toStatus: 'APPROVED',
        changedByName: 'Hospital Administrator',
        reason: 'Dermatology specialty board certification verified',
      },
    ],
  },
  {
    name: 'Dr. Priya Patel',
    specialization: 'Orthopedic Surgeon',
    department: 'Orthopedics',
    medicalRegistrationNumber: 'MED-REG-10105',
    clinicHospitalName: 'MediQueue Central Hospital',
    clinicAddress: '100 Medical Plaza, Healthcare District',
    verificationStatus: 'APPROVED',
    availableDays: ['Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    availableSlots: [
      '09:00 AM',
      '09:30 AM',
      '10:00 AM',
      '10:30 AM',
      '11:00 AM',
      '02:30 PM',
      '03:00 PM',
      '03:30 PM',
    ],
    averageConsultationMinutes: 20,
    qualifications: 'MS (Ortho), Fellowship Joint Reconstruction',
    experienceYears: 16,
    roomNumber: 'Surgical Wing 402',
    isActive: true,
    verificationDocuments: [
      {
        documentType: 'medical_license',
        documentUrl: 'https://docs.mediqueue.health/licenses/patel-priya-med10105.pdf',
        documentName: 'Orthopedic_Surgical_Council_License.pdf',
      },
    ],
    statusHistory: [
      {
        fromStatus: 'PENDING',
        toStatus: 'APPROVED',
        changedByName: 'Hospital Administrator',
        reason: 'Surgical credentials verified',
      },
    ],
  },
  {
    name: 'Dr. Robert Harrison',
    specialization: 'Neurologist',
    department: 'Neurology',
    medicalRegistrationNumber: 'MED-REG-10106',
    clinicHospitalName: 'MediQueue Central Hospital',
    clinicAddress: '100 Medical Plaza, Healthcare District',
    verificationStatus: 'APPROVED',
    availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Friday'],
    availableSlots: [
      '10:00 AM',
      '10:45 AM',
      '11:30 AM',
      '02:00 PM',
      '02:45 PM',
      '03:30 PM',
    ],
    averageConsultationMinutes: 25,
    qualifications: 'MD, PhD (Neuroscience), Johns Hopkins',
    experienceYears: 18,
    roomNumber: 'Neuro Suite 501',
    isActive: true,
    verificationDocuments: [
      {
        documentType: 'medical_license',
        documentUrl: 'https://docs.mediqueue.health/licenses/harrison-robert-med10106.pdf',
        documentName: 'Neurology_Board_License.pdf',
      },
    ],
    statusHistory: [
      {
        fromStatus: 'PENDING',
        toStatus: 'APPROVED',
        changedByName: 'Hospital Administrator',
        reason: 'Neurology credentials verified',
      },
    ],
  },
  {
    name: 'Dr. Alex Morgan',
    specialization: 'Endocrinologist',
    department: 'Endocrinology',
    medicalRegistrationNumber: 'MED-REG-20201',
    clinicHospitalName: 'Metro Health Clinic',
    clinicAddress: '450 Wellness Way',
    verificationStatus: 'PENDING',
    availableDays: ['Monday', 'Wednesday', 'Thursday'],
    availableSlots: ['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM'],
    averageConsultationMinutes: 20,
    qualifications: 'MD (Endocrinology), Stanford Medicine',
    experienceYears: 7,
    roomNumber: 'Room 310',
    isActive: false,
    verificationDocuments: [
      {
        documentType: 'medical_license',
        documentUrl: 'https://docs.mediqueue.health/licenses/alex-morgan-med20201.pdf',
        documentName: 'Medical_Registration_Alex_Morgan.pdf',
      },
      {
        documentType: 'id_proof',
        documentUrl: 'https://docs.mediqueue.health/ids/alex-morgan-id.pdf',
        documentName: 'Passport_ID_Proof.pdf',
      },
    ],
    statusHistory: [
      {
        fromStatus: 'NONE',
        toStatus: 'PENDING',
        changedByName: 'Dr. Alex Morgan',
        reason: 'Public onboarding application submitted for admin review',
      },
    ],
  },
  {
    name: 'Dr. Lisa Ray',
    specialization: 'Ophthalmologist',
    department: 'Ophthalmology',
    medicalRegistrationNumber: 'MED-REG-20202',
    clinicHospitalName: 'Vision Care Institute',
    clinicAddress: '780 Sight Boulevard',
    verificationStatus: 'NEEDS_CHANGES',
    statusReason: 'Please upload a clearer copy of your surgical accreditation certificate and verify clinic address.',
    availableDays: ['Tuesday', 'Thursday'],
    availableSlots: ['10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM'],
    averageConsultationMinutes: 15,
    qualifications: 'MS (Ophthalmology), FACS',
    experienceYears: 6,
    roomNumber: 'Eye Clinic 202',
    isActive: false,
    verificationDocuments: [
      {
        documentType: 'medical_license',
        documentUrl: 'https://docs.mediqueue.health/licenses/lisa-ray-med20202.pdf',
        documentName: 'State_Ophthalmology_License.pdf',
      },
    ],
    statusHistory: [
      {
        fromStatus: 'NONE',
        toStatus: 'PENDING',
        changedByName: 'Dr. Lisa Ray',
        reason: 'Public onboarding application submitted',
      },
      {
        fromStatus: 'PENDING',
        toStatus: 'NEEDS_CHANGES',
        changedByName: 'Hospital Administrator',
        reason: 'Please upload a clearer copy of your surgical accreditation certificate and verify clinic address.',
      },
    ],
  },
];

const seedDatabase = async () => {
  try {
    console.log('Seeding database with doctors and initial demo accounts...');
    await connectDB();

    // Seed doctors (upsert or refresh)
    await Doctor.deleteMany({});
    const createdDoctors = await Doctor.insertMany(sampleDoctors);
    console.log(`✓ Successfully seeded ${createdDoctors.length} sample doctors`);

    // Ensure demo accounts exist for all 4 actors
    const demoUsers = [
      {
        name: 'John Patient',
        email: 'john.doe@example.com',
        phone: '+1 555-0199',
        password: 'password123',
        role: 'patient',
      },
      {
        name: 'Dr. David Kim',
        email: 'dr.kim@mediqueue.com',
        phone: '+1 555-0144',
        password: 'password123',
        role: 'doctor',
      },
      {
        name: 'Dr. Sarah Jenkins',
        email: 'dr.jenkins@mediqueue.com',
        phone: '+1 555-0155',
        password: 'password123',
        role: 'doctor',
      },
      {
        name: 'Dr. Alex Morgan',
        email: 'dr.pending@mediqueue.com',
        phone: '+1 555-0166',
        password: 'password123',
        role: 'doctor',
      },
      {
        name: 'Dr. Lisa Ray',
        email: 'dr.changes@mediqueue.com',
        phone: '+1 555-0177',
        password: 'password123',
        role: 'doctor',
      },
      {
        name: 'Rachel Receptionist',
        email: 'receptionist@mediqueue.com',
        phone: '+1 555-0100',
        password: 'password123',
        role: 'receptionist',
      },
      {
        name: 'Hospital Administrator',
        email: 'admin@mediqueue.com',
        phone: '+1 555-0101',
        password: 'password123',
        role: 'admin',
      },
    ];

    for (const u of demoUsers) {
      let user = await User.findOne({ email: u.email });
      if (!user) {
        user = await User.create(u);
        console.log(`✓ Created demo user: ${u.email} [${u.role}]`);
      } else {
        user.role = u.role;
        await user.save();
        console.log(`- Demo user updated: ${u.email} [${u.role}]`);
      }

      // Link doctor accounts to corresponding Doctor model document
      if (u.role === 'doctor') {
        const docDoc = createdDoctors.find((d) => d.name === u.name);
        if (docDoc) {
          user.doctorId = docDoc._id;
          await user.save();
          docDoc.userId = user._id;
          docDoc.email = u.email;
          await docDoc.save();
          console.log(`  -> Linked ${u.name} user account with Doctor document ID ${docDoc._id}`);
        }
      }
    }

    console.log('✓ Database seeding complete with all 4 actors ready!');
    return true;
  } catch (error) {
    console.error('Seeding error:', error);
    throw error;
  }
};

if (require.main === module) {
  seedDatabase()
    .then(async () => {
      await disconnectDB();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error(err);
      await disconnectDB();
      process.exit(1);
    });
}

module.exports = seedDatabase;
