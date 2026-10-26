import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, Phone, Mail, MapPin, Clock, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Footer = () => {
  const { user, isAuthenticated, isPatient } = useAuth();
  const isOrgAdmin = user?.role === 'orgAdmin' || user?.roles?.includes('orgAdmin');
  let quickLinksHeading = 'Administration';
  let quickLinks = [{ label: 'Doctor Management', to: '/admin/doctors' }];

  if (!isAuthenticated || isPatient) {
    quickLinksHeading = 'Patient Services';
    quickLinks = [
      { label: 'Find Medical Specialists', to: '/doctors' },
      ...(isPatient ? [{ label: 'Book Appointment Slot', to: '/book-appointment' }] : []),
      { label: 'Live Queue Token Tracker', to: '/queue' },
      ...(isPatient
        ? [
            { label: 'My Booking History', to: '/appointments' },
            { label: 'Patient Health Portal', to: '/dashboard' },
          ]
        : []),
    ];
  } else if (user?.role === 'doctor') {
    quickLinksHeading = 'Doctor Workspace';
    quickLinks = [{ label: 'Doctor Workspace', to: '/doctor/dashboard' }];
  } else if (user?.role === 'receptionist') {
    quickLinksHeading = 'Reception Tools';
    quickLinks = [{ label: 'Reception Queue Desk', to: '/staff/queue' }];
  } else if (isOrgAdmin) {
    quickLinksHeading = 'Organisation Tools';
    quickLinks = [
      { label: 'Organisation Dashboard', to: '/org/dashboard' },
      { label: 'Organisation Queue Desk', to: '/staff/queue' },
    ];
  } else if (user?.role === 'superadmin') {
    quickLinksHeading = 'Platform Tools';
    quickLinks = [{ label: 'Platform Administration', to: '/admin/organisations' }];
  }

  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-teal-500 flex items-center justify-center text-slate-900 shadow-md">
                <Activity className="w-5 h-5 stroke-[2.5]" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">
                Medi<span className="text-teal-400">Queue</span>
              </span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              Transforming outpatient medical visits with transparent token queuing, automated waiting forecasts, and effortless specialist booking.
            </p>
            <div className="flex items-center gap-2 text-xs text-teal-400 font-medium">
              <ShieldCheck className="w-4 h-4" />
              <span>Privacy-conscious access and secure account sign-in</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white mb-4">
              {quickLinksHeading}
            </h4>
            <ul className="space-y-2.5 text-sm">
              {quickLinks.map(({ label, to }) => (
                <li key={to}>
                  <Link to={to} className="hover:text-teal-400 transition">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Departments */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white mb-4">
              Key Departments
            </h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>Cardiology & Heart Care</li>
              <li>General Medicine & OPD</li>
              <li>Pediatrics & Neonatal Care</li>
              <li>Dermatology & Skin Center</li>
              <li>Orthopedics & Joint Surgery</li>
              <li>Neurology & Cognitive Health</li>
            </ul>
          </div>

          {/* Contact Details */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white mb-4">
              Hospital Contact
            </h4>
            <div className="space-y-3 text-sm text-slate-400">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                <span>450 Healthcare Pavilion Way, Medical City, Suite 100</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-teal-400 shrink-0" />
                <span>Emergency: +1 (800) 555-CARE (2273)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-teal-400 shrink-0" />
                <span>support@mediqueue.healthcare</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-teal-400 shrink-0" />
                <span>OPD Hours: Mon - Sat (8:00 AM - 6:00 PM)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} MediQueue Healthcare Technologies Inc. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span className="hover:text-slate-400 transition cursor-pointer">Privacy Policy</span>
            <span className="hover:text-slate-400 transition cursor-pointer">Terms of Service</span>
            <span className="hover:text-slate-400 transition cursor-pointer">Patient Bill of Rights</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
