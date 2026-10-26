import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Activity,
  Calendar,
  Clock,
  User as UserIcon,
  LogOut,
  Menu,
  X,
  Stethoscope,
  Building2,
  LayoutDashboard,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';

const Navbar = () => {
  const { user, isAuthenticated, logout, isPatient } = useAuth();
  const isAdmin = ['admin', 'superadmin'].includes(user?.role);
  const isOrgAdmin = user?.role === 'orgAdmin' || user?.roles?.includes('orgAdmin');
  const isDoctor = user?.role === 'doctor';
  const isReceptionist = user?.role === 'receptionist';
  const canUseStaffDesk =
    ['receptionist', 'orgAdmin'].includes(user?.role) ||
    user?.roles?.includes('orgAdmin');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
    setMobileMenuOpen(false);
  };

  const navLinkClass = ({ isActive }) =>
    `text-sm font-semibold transition px-3 py-2 rounded-lg flex items-center gap-1.5 ${
      isActive
        ? 'text-teal-700 bg-teal-50'
        : 'text-slate-600 hover:text-teal-600 hover:bg-slate-50'
    }`;

  const mobileNavLinkClass = ({ isActive }) =>
    `text-base font-medium px-4 py-3 rounded-xl flex items-center gap-2.5 ${
      isActive
        ? 'text-teal-700 bg-teal-50 font-semibold'
        : 'text-slate-700 hover:bg-slate-50'
    }`;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 rounded-lg p-1"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-teal-400 flex items-center justify-center text-white shadow-md shadow-teal-500/20">
              <Activity className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-slate-900">
                Medi<span className="text-teal-600">Queue</span>
              </span>
              <span className="hidden sm:inline-block text-[10px] font-semibold tracking-wider uppercase text-slate-400 block -mt-1">
                Smart Care System
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <NavLink to="/" className={navLinkClass}>
              Home
            </NavLink>
            {(!isAuthenticated || isPatient) && (
              <>
                <NavLink to="/doctors" className={navLinkClass}>
                  <Stethoscope className="w-4 h-4" />
                  Find Doctors
                </NavLink>
                <NavLink to="/queue" className={navLinkClass}>
                  <Clock className="w-4 h-4" />
                  Track Queue
                </NavLink>
              </>
            )}
            {isPatient && (
              <>
                <NavLink to="/book-appointment" className={navLinkClass}>
                  <Calendar className="w-4 h-4" />
                  Book Appointment
                </NavLink>
                <NavLink to="/appointments" className={navLinkClass}>
                  My Appointments
                </NavLink>
                <NavLink to="/dashboard" className={navLinkClass}>
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </NavLink>
              </>
            )}
            {isDoctor && (
              <NavLink to="/doctor/dashboard" className={navLinkClass}>
                <LayoutDashboard className="w-4 h-4" />
                Doctor Desk
              </NavLink>
            )}
            {canUseStaffDesk && (
              <NavLink
                to="/staff/queue"
                className="text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 px-3 py-2 rounded-lg flex items-center gap-1.5 border border-purple-200 transition"
              >
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                Staff Desk
              </NavLink>
            )}
            {isAdmin && (
              <NavLink
                to="/admin/doctors"
                className="text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-lg flex items-center gap-1.5 border border-indigo-200 transition"
              >
                <ShieldAlert className="w-4 h-4 text-indigo-600" />
                Manage Doctors
              </NavLink>
            )}
            {isOrgAdmin && (
              <NavLink to="/org/dashboard" className={navLinkClass}>
                <Building2 className="w-4 h-4" />
                Organisation
              </NavLink>
            )}
            {user?.role === 'superadmin' && (
              <NavLink to="/admin/organisations" className={navLinkClass}>
                <ShieldCheck className="w-4 h-4" />
                Approve Organisations
              </NavLink>
            )}
          </nav>

          {/* Auth Actions (Desktop) */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200">
                  <div className="w-7 h-7 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-xs uppercase">
                    {user?.name ? user.name.charAt(0) : 'U'}
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-slate-800 leading-tight">
                      {user?.name}
                    </p>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-teal-600">
                      {user?.role}
                    </span>
                  </div>
                  {isReceptionist && (
                    <span className="ml-1 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-bold">
                      <ShieldAlert className="w-3 h-3" /> Staff
                    </span>
                  )}
                </div>

                <button
                  onClick={handleLogout}
                  title="Logout"
                  className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/join-as-doctor"
                  className="px-4 py-2 text-sm font-semibold text-teal-700 hover:text-teal-800 hover:bg-teal-50 rounded-xl transition border border-teal-200"
                >
                  Join as Doctor
                </Link>
                <Link
                  to="/register-organisation"
                  className="px-4 py-2 text-sm font-semibold text-indigo-700 hover:text-indigo-800 hover:bg-indigo-50 rounded-xl transition border border-indigo-200"
                >
                  Register Organisation
                </Link>
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-teal-600 hover:bg-slate-50 rounded-xl transition"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-sm shadow-teal-600/30 transition"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-1">
          {isAuthenticated && (
            <div className="flex items-center gap-3 p-3 mb-2 rounded-xl bg-slate-50 border border-slate-200">
              <div className="w-10 h-10 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-sm uppercase">
                {user?.name ? user.name.charAt(0) : 'U'}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">{user?.name}</p>
                <p className="text-xs text-slate-500">{user?.email}</p>
                <span className="text-[10px] font-bold uppercase text-teal-600">
                  Role: {user?.role}
                </span>
              </div>
            </div>
          )}

          <NavLink to="/" onClick={() => setMobileMenuOpen(false)} className={mobileNavLinkClass}>
            Home
          </NavLink>
          {(!isAuthenticated || isPatient) && (
            <NavLink
              to="/doctors"
              onClick={() => setMobileMenuOpen(false)}
              className={mobileNavLinkClass}
            >
              <Stethoscope className="w-4 h-4 text-teal-600" />
              Find Doctors
            </NavLink>
          )}
          {isPatient && (
            <>
              <NavLink to="/book-appointment" onClick={() => setMobileMenuOpen(false)} className={mobileNavLinkClass}>
                <Calendar className="w-4 h-4 text-teal-600" />
                Book Appointment
              </NavLink>
              <NavLink
                to="/appointments"
                onClick={() => setMobileMenuOpen(false)}
                className={mobileNavLinkClass}
              >
                <Calendar className="w-4 h-4 text-teal-600" />
                My Appointments
              </NavLink>
              <NavLink to="/dashboard" onClick={() => setMobileMenuOpen(false)} className={mobileNavLinkClass}>
                <LayoutDashboard className="w-4 h-4 text-teal-600" />
                Patient Dashboard
              </NavLink>
            </>
          )}
          {(!isAuthenticated || isPatient) && (
            <NavLink
              to="/queue"
              onClick={() => setMobileMenuOpen(false)}
              className={mobileNavLinkClass}
            >
              <Clock className="w-4 h-4 text-teal-600" />
              Track Queue
            </NavLink>
          )}

          {isAuthenticated ? (
            <>
              {isDoctor && (
                <NavLink
                  to="/doctor/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className={mobileNavLinkClass}
                >
                  <LayoutDashboard className="w-4 h-4 text-teal-600" />
                  Doctor Desk
                </NavLink>
              )}
              {canUseStaffDesk && (
                <NavLink
                  to="/staff/queue"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-base font-bold px-4 py-3 rounded-xl flex items-center gap-2.5 text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition"
                >
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                  Staff Queue Desk
                </NavLink>
              )}
              {isAdmin && (
                <NavLink
                  to="/admin/doctors"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-base font-bold px-4 py-3 rounded-xl flex items-center gap-2.5 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition"
                >
                  <ShieldAlert className="w-4 h-4 text-indigo-600" />
                  Manage Doctors
                </NavLink>
              )}
              {isOrgAdmin && (
                <NavLink
                  to="/org/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className={mobileNavLinkClass}
                >
                  <Building2 className="w-4 h-4 text-teal-600" />
                  Organisation Dashboard
                </NavLink>
              )}
              {user?.role === 'superadmin' && (
                <NavLink
                  to="/admin/organisations"
                  onClick={() => setMobileMenuOpen(false)}
                  className={mobileNavLinkClass}
                >
                  Approve Organisations
                </NavLink>
              )}
              <button
                onClick={handleLogout}
                className="w-full text-left font-medium px-4 py-3 rounded-xl flex items-center gap-2.5 text-rose-600 hover:bg-rose-50 transition"
              >
                <LogOut className="w-4 h-4" />
                Log Out
              </button>
            </>
          ) : (
            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
              <Link
                to="/join-as-doctor"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-xl font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition"
              >
                Join as Doctor
              </Link>
              <Link
                to="/register-organisation"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-xl font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition"
              >
                Register Organisation
              </Link>
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-xl font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
              >
                Log In
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-xl font-semibold text-white bg-teal-600 hover:bg-teal-700 transition"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
};

export default Navbar;
