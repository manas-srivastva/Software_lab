# 🏥 MediQueue — Smart Medical Appointment & Queue Management System

MediQueue is a full-stack, responsive healthcare web application designed to eliminate chaotic hospital waiting rooms. It enables patients to explore medical specialists, book verified appointment slots with zero double-booking, check in on arrival to receive sequential queue tokens, and track real-time queue positions with automated wait-time forecasting.

---

## 🌟 Key Features

### 1. Patient Authentication & Security
- **Patient Registration & Login:** Name, email, phone number, and password validation.
- **Secure Password Hashing:** 10-round salted passwords using `bcryptjs`.
- **JWT-Based Authorization:** Secure token issuance with automatic session persistence and expiration handling.
- **Role-Based Access Control:** Prevents privilege escalation during registration. Only authenticated `patient` users can book appointments; `admin`, `doctor`, and `receptionist` booking attempts are rejected by the API. Staff-only appointment management and queue operations remain restricted by role.
- **Protected Routes:** Automatic redirection and loading skeletons for unauthenticated visitors.

### 2. Doctor Directory & Conflict-Free Booking
- **Specialist Directory:** Search and filter approved doctors by department, affiliated organisation, city, or address.
- **Organisation affiliations:** Organisations and doctor affiliations store location and organisation-specific availability, fees, and room details. The public directory includes active organisation affiliations while preserving legacy doctor records.
- **Tenant administration:** Organisation accounts register for review; a separately provisioned `superadmin` approves them. `orgAdmin` users can manage only their own affiliations, appointments, and queues. Independent doctor registration creates a pending practice and grants the doctor both doctor and org-admin permissions.
- **Tenant-scoped bookings:** New appointments and queue entries store their organisation ID. Booking and live slot availability use that affiliation's schedule; the patient directory can filter by city or address.
- **Live Slot Availability:** Queries available vs. booked consultation slots for any selected date in real time.
- **Concurrency & Double-Booking Protection:** Guaranteed through MongoDB compound unique partial indexes (`{ doctorId: 1, date: 1, time: 1 }` excluding cancelled appointments).
- **Booking Confirmation & Cancellation:** Interactive confirmation summaries and safe cancellation modals that instantly free up slots for other patients.
- **Staff Appointment Management:** Receptionists and administrators can review and cancel eligible bookings from the Staff Desk. The staff workflow does not create appointments.

### 3. Queue & Token Management
- **Sequential Token Generation:** Generates unique, strictly sequential queue tokens (`#1, #2, #3...`) partitioned by doctor and date upon check-in.
- **Duplicate Prevention:** Prevents multiple queue tokens from being issued for the same appointment.
- **Live Waiting Forecast:** Dynamically calculates patients ahead in line and estimates wait time based on the doctor's average consultation duration.
- **Role-Based Queue Flow:** Receptionists check in and call patients, doctors complete their assigned consultations, and org admins manage transitions only within their organisation. Patients cannot advance queue entries.

## 👥 End-to-End Role Workflows

### Role-permission matrix

| Capability | Guest | Patient | Admin | Superadmin | Org admin | Doctor | Receptionist |
|---|---|---|---|---|---|---|---|
| Register / log in | Yes | Yes | Yes | Provisioned | Yes | Yes | Yes |
| Browse doctors and availability | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Create appointment | No | Yes | No | No | No | No | No |
| Read appointments | No | Own | Platform-wide | Platform-wide | Own organisation | Assigned only | Platform-wide |
| Cancel appointment | No | Own eligible booking | Eligible bookings | Eligible bookings | Own organisation | No | Eligible bookings |
| Manage own organisation doctors / queues | No | No | No | No | Yes | Own queue | No |
| Approve organisations | No | No | No | Yes | No | No | No |

### Patient
1. Register or log in, then find a doctor and review available appointment slots.
2. Book an available slot on or after the current date when the doctor's weekday schedule is open. The server derives the patient identity from the authenticated account; client-supplied patient IDs or roles are not trusted.
3. Check in to the confirmed appointment on its scheduled date. Only then does the patient receive a queue token and become eligible to track the serving token and estimated wait.
4. Attend the consultation. A patient may cancel an eligible appointment, but not while its consultation is in progress. Rescheduling is done by cancelling an eligible booking and booking a new slot; there is no separate reschedule endpoint.

### Admin
1. Log in to manage doctors and patients, review appointments, and view reports/departments using the existing admin features.
2. Admins cannot book appointments or advance queue consultations. They may cancel eligible appointments under the existing staff permissions.

### Doctor
1. Log in to update availability, room details, and average consultation duration.
2. Review appointments assigned to the doctor's profile.
3. Consult patients called in by the receptionist, then mark the active consultation completed. A doctor can only complete queue entries assigned to their own doctor profile.

### Receptionist
1. Log in to review appointments and doctor queues.
2. Confirm check-in for an existing confirmed appointment; the system generates its queue token. Walk-in appointment creation is disabled.
3. Call the next waiting token. Receptionists cannot mark a consultation completed.

## ⏱️ Queue and Status Rules

- Queue tokens are unique per doctor and appointment date, and are assigned in check-in order. Queue position is ordered by token number.
- Check-in is limited to the appointment's scheduled local date. Availability queries and booking validate real calendar dates and the doctor's configured weekday schedule.
- A patient waiting behind earlier tokens is estimated to wait `(earlier waiting tokens + 1 if a consultation is active ahead) × the doctor's average consultation minutes`. A patient already in consultation has an estimated wait of zero.
- Queue transitions are `waiting → in-consultation → completed`. Only receptionists can call the earliest waiting token, and only the assigned doctor can complete the active consultation. A second patient cannot be called until the active consultation is completed.
- A new booking is `confirmed`; check-in changes the appointment to `checked-in`; consultation completion changes it to `completed`. Eligible confirmed or checked-in appointments can be cancelled, but not after completion or while a consultation is active. `cancelled` and `completed` are terminal states. `pending` remains a legacy model value and is not created by the current booking flow.
- Organisation registration, approval, doctor affiliations, and organisation-scoped appointment/queue operations are available through the API and the organisation dashboards. The legacy admin interface remains platform-wide for backwards compatibility.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React.js (Vite), JavaScript, Tailwind CSS, React Router DOM v6, Axios, Lucide React |
| **Backend** | Node.js, Express.js, REST API Architecture |
| **Database** | MongoDB with Mongoose ODM (Zero-config embedded fallback + MongoDB Atlas/Local support) |
| **Authentication** | JSON Web Tokens (`jsonwebtoken`), `bcryptjs` password hashing |
| **Tooling** | PostCSS, Autoprefixer, Dotenv, CORS |

---

## 📂 Project Folder Structure

```text
mediqueue/
├── backend/
│   ├── config/
│   │   └── db.js                 # Database connection (supports MONGODB_URI & zero-config embedded fallback)
│   ├── controllers/
│   │   ├── authController.js     # Register, login, profile me
│   │   ├── organisationController.js # Organisation signup, review, and affiliation management
│   │   ├── doctorController.js   # Listing, search, filtering, and slot availability
│   │   ├── appointmentController.js # Booking, conflict validation, list, cancel
│   │   └── queueController.js    # Check-in, sequential tokens, wait forecast, advance queue
│   ├── services/
│   │   ├── doctorService.js      # Organisation-aware doctor directory queries
│   │   └── organisationService.js # Organisation-specific booking affiliation resolution
│   ├── middleware/
│   │   ├── authMiddleware.js     # JWT verification & req.user attachment
│   │   ├── roleMiddleware.js     # Enforces receptionist/admin authorization
│   │   └── errorMiddleware.js    # Safe duplicate key & validation error formatter
│   ├── models/
│   │   ├── User.js               # User schema with bcrypt pre-save hook
│   │   ├── Doctor.js             # Doctor schema with slots and average consultation time
│   │   ├── Organisation.js       # Organisation details and organisation administrator
│   │   ├── DoctorAffiliation.js  # Organisation-specific doctor availability and fees
│   │   ├── Appointment.js        # Appointment schema with compound unique index
│   │   └── Queue.js              # Queue schema with sequential token index
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── organisationRoutes.js
│   │   ├── doctorRoutes.js
│   │   ├── appointmentRoutes.js
│   │   └── queueRoutes.js
│   ├── tests/
│   │   ├── e2e.test.js           # Appointment and queue integration test suite
│   │   └── tenant_workflow.test.js # Organisation approval and tenant isolation suite
│   ├── utils/
│   │   ├── generateToken.js      # JWT signing utility
│   │   └── seedData.js           # Auto-seeder for doctors and demo accounts
│   ├── app.js                    # Express app configuration & middleware
│   ├── server.js                 # Server entrypoint with bootstrap auto-seeding
│   ├── .env                      # Active backend configuration
│   ├── .env.example              # Example environment configuration
│   └── package.json
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ConfirmModal.jsx  # Reusable confirmation modal for cancellations
│   │   │   ├── Footer.jsx        # Clinical information and emergency contacts
│   │   │   ├── Navbar.jsx        # Responsive navigation with role indicators
│   │   │   ├── ProtectedRoute.jsx# Auth route guard
│   │   │   └── StatusBadge.jsx   # Color-coded appointment/queue status indicators
│   │   ├── context/
│   │   │   ├── AuthContext.jsx   # Global user state, login, register, logout
│   │   │   └── ToastContext.jsx  # Floating toast notifications (success/error/info)
│   │   ├── pages/
│   │   │   ├── HomePage.jsx      # Medical landing page with hero & token mockup
│   │   │   ├── RegisterPage.jsx  # Patient registration form with validation
│   │   │   ├── LoginPage.jsx     # Login with one-click demo presets
│   │   │   ├── DashboardPage.jsx # Metrics cards, recent bookings, check-in CTA
│   │   │   ├── FindDoctorPage.jsx# Organisation-aware doctor search and location filter
│   │   │   ├── BookAppointmentPage.jsx # Slot picker, conflict warning, confirmation
│   │   │   ├── MyAppointmentsPage.jsx  # Appointment history, check-in, cancel modal
│   │   │   ├── QueueTrackingPage.jsx   # Prominent token screen, wait forecast, staff controls
│   │   │   └── NotFoundPage.jsx  # Friendly 404 page
│   │   ├── services/
│   │   │   └── api.js            # Axios client with JWT interceptor & endpoints
│   │   ├── App.jsx               # React Router layout setup
│   │   ├── index.css             # Tailwind base and custom styles
│   │   └── main.jsx              # React DOM entrypoint
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── .env                      # Frontend environment variable (VITE_API_URL)
│   ├── .env.example
│   └── package.json
│
├── package.json                  # Root runner scripts
└── README.md                     # Documentation
```

---

## ⚡ Quick Start & Installation

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **MongoDB**: (Optional) A local MongoDB daemon or MongoDB Atlas cluster. *If no external MongoDB instance is running, MediQueue automatically boots an embedded in-memory MongoDB engine with full Mongoose compatibility so you can test immediately with zero configuration!*

### 1. Clone or Open the Project
```bash
cd C:\Users\Lenovo\.gemini\antigravity\scratch\mediqueue
```

### 2. Install Dependencies
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 3. Configure Environment Variables

**Backend (`backend/.env`):**
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/mediqueue
JWT_SECRET=<unique-random-secret-at-least-32-characters>
NODE_ENV=development
CLIENT_URL=http://localhost:5173
AVG_CONSULTATION_MINUTES=15
SUPERADMIN_EMAIL=<platform-superadmin-email>
SUPERADMIN_PASSWORD=<strong-unique-password>
```

Generate a unique secret (do not reuse the old demo secret) with:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
The backend refuses to start if `JWT_SECRET` is missing, too short, or equals the exposed legacy demo secret. Replacing that legacy value invalidates existing login tokens; users must sign in again.
When both superadmin variables are set, startup creates that account if it does not exist; it refuses to promote an existing non-superadmin account. Keep the credentials private and remove them from the runtime environment after provisioning.

**Frontend (`frontend/.env`):**
```env
VITE_API_URL=http://localhost:5000/api
```

### 4. Seed the Database
MediQueue automatically checks and seeds sample doctors and demo accounts on server startup. You can also manually trigger seeding anytime:
```bash
cd backend
npm run seed
```

### 5. Start the Application

Open two terminal windows:

**Terminal 1 — Backend:**
```bash
cd backend
npm start
# Server starts on http://localhost:5000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
# Frontend starts on http://localhost:5173
```

---

## 🔑 Demo Accounts for Immediate Testing

You can click the one-click demo login buttons on the **Login Page** or enter the following credentials:

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Patient** | `john.doe@example.com` | `password123` | Book slots, view dashboard, check-in, track personal queue |
| **Receptionist (Staff)** | `receptionist@mediqueue.com` | `password123` | View all doctor queues, call next patient, advance tokens |
| **Doctor** | `dr.kim@mediqueue.com` | `password123` | Manage availability, view assigned appointments, complete consultations |
| **Hospital Admin** | `admin@mediqueue.com` | `password123` | Manage doctors/patients, view appointments and reports; cannot book or advance the queue |

---

## 📡 REST API Documentation

### Authentication (`/api/auth`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register patient (`name`, `email`, `phone`, `password`). Enforces patient role. |
| `POST` | `/api/auth/login` | Public | Authenticate patient/staff with `email` and `password`. Returns JWT. |
| `GET` | `/api/auth/me` | Protected | Returns profile of authenticated user. |

### Doctors (`/api/doctors`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/doctors` | Public | List active doctors. Query params: `search`, `department`, `specialization`. |
| `GET` | `/api/doctors/:id` | Public | Retrieve single doctor details. |
| `GET` | `/api/doctors/:id/slots` | Public | Returns slots for a doctor on a specific `?date=YYYY-MM-DD` with `isAvailable` flags. |

### Appointments (`/api/appointments`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/appointments` | Protected (Patient) | Book an appointment (`doctorId`, `date`, `time`, `reason`). Validates conflicts. |
| `GET` | `/api/appointments/my` | Protected (Patient) | List authenticated patient's appointments and associated queue tickets. |
| `GET` | `/api/appointments/:id` | Protected | Get appointment by ID (ownership enforced). |
| `PATCH` | `/api/appointments/:id/cancel` | Protected | Cancel appointment and free up the slot for other patients. |

### Queue & Tokens (`/api/queue`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/queue/check-in/:appointmentId` | Protected (Appointment owner or receptionist) | Check in an existing confirmed appointment; issues a sequential token. |
| `GET` | `/api/queue/my-status` | Protected (Patient) | Current token, serving token, patients ahead, estimated wait time. |
| `GET` | `/api/queue/doctor/:doctorId` | Public / Staff | View live queue board for a doctor on a date (`?date=YYYY-MM-DD`). |
| `PATCH` | `/api/queue/:id/advance` | **Receptionist or assigned doctor** | Receptionist calls the next waiting token; assigned doctor completes the consultation. |

---

## 🧪 Automated Testing

MediQueue includes a 15-step automated integration test suite that tests the main appointment and queue flows end-to-end:
```bash
cd backend
npm run test:e2e
```

**Verified Test Scenarios:**
1. Patient registration with input validation.
2. Patient authentication and JWT generation.
3. Seeding and loading 6 verified specialists from MongoDB.
4. Appointment booking with doctor and slot validation.
5. Atomic double-booking prevention (`409 Conflict`) when two patients attempt the same slot.
6. Second patient booking an alternate available slot.
7. Sequential Token `#1` issuance upon patient check-in.
8. Rejection of duplicate check-ins for the same appointment (`400 Bad Request`).
9. Sequential Token `#2` issuance for patient 2.
10. Live forecast calculation: `patientsAhead: 1`, `estimatedWaitMinutes: 15 min`.
11. Security check: patient attempting to advance queue is blocked with `403 Forbidden`.
12. Receptionist authorization: receptionist calls token `#1` to `in-consultation`.
13. Updated queue broadcast: serving token `#1`, patients ahead for patient 2 decreases to `0`.
14. Safe appointment cancellation.
15. Re-booking the previously cancelled slot succeeds immediately.

The role workflow suite is available from the project root:
```bash
npm run test:workflows
```
It verifies patient booking/check-in, doctor-only consultation completion, receptionist-only check-in and call-next behavior, walk-in rejection, and admin queue restrictions. Booking/API role and patient-identity checks are available with `npm run test:security`.
JWT configuration validation is covered by `npm run test:auth-config`.

---

## 📱 Responsive User Interface

- **Color Palette:** Clinical Teal (`#0d9488`, `#14b8a6`) and Blue accents on soft Slate backgrounds (`#f8fafc`).
- **Typography:** Plus Jakarta Sans for legibility across mobile, tablet, and desktop viewports.
- **Micro-Interactions:** Pulsing live queue badges, gentle spin loading indicators, and sliding toast alerts.
- **Accessibility:** Readable contrast ratios, clear validation feedback, and destructive action confirmations.

---

*MediQueue — Built with precision for modern healthcare facilities.*
