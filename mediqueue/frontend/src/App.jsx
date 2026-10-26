import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';

import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';

import HomePage from './pages/HomePage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import FindDoctorPage from './pages/FindDoctorPage';
import BookAppointmentPage from './pages/BookAppointmentPage';
import MyAppointmentsPage from './pages/MyAppointmentsPage';
import QueueTrackingPage from './pages/QueueTrackingPage';
import StaffQueuePage from './pages/StaffQueuePage';
import DoctorDashboardPage from './pages/DoctorDashboardPage';
import DoctorRegisterPage from './pages/DoctorRegisterPage';
import AdminDoctorManagementPage from './pages/AdminDoctorManagementPage';
import NotFoundPage from './pages/NotFoundPage';

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Router>
          <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
            <Navbar />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/doctors" element={<FindDoctorPage />} />
                <Route
                  path="/book-appointment"
                  element={
                    <ProtectedRoute allowedRoles={['patient']}>
                      <BookAppointmentPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/book"
                  element={
                    <ProtectedRoute allowedRoles={['patient']}>
                      <BookAppointmentPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="/queue" element={<QueueTrackingPage />} />

                {/* Protected Patient Routes (All authenticated patients) */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute allowedRoles={['patient']}>
                      <DashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/doctor/dashboard"
                  element={
                    <ProtectedRoute allowedRoles={['doctor']}>
                      <DoctorDashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/appointments"
                  element={
                    <ProtectedRoute allowedRoles={['patient']}>
                      <MyAppointmentsPage />
                    </ProtectedRoute>
                  }
                />

                {/* Protected Staff Route: Strictly restricted to receptionist and admin roles */}
                <Route
                  path="/staff/queue"
                  element={
                    <ProtectedRoute allowedRoles={['receptionist', 'admin']}>
                      <StaffQueuePage />
                    </ProtectedRoute>
                  }
                />

                {/* Doctor public registration */}
                <Route path="/join-as-doctor" element={<DoctorRegisterPage />} />

                {/* Admin only routes */}
                <Route
                  path="/admin/doctors"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminDoctorManagementPage />
                    </ProtectedRoute>
                  }
                />

                {/* 404 Route */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </Router>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
