import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Activity,
  Calendar,
  Clock,
  LogOut,
  Menu,
  X,
  Stethoscope,
  Building2,
  LayoutDashboard,
  ShieldAlert,
  ShieldCheck,
  User as UserIcon,
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
    `relative text-xs sm:text-sm font-semibold transition-all px-3 py-2 rounded-xl flex items-center gap-1.5 ${
      isActive
        ? 'text-teal-900 bg-teal-50/90 shadow-sm border border-teal-100 font-bold'
        : 'text-slate-600 hover:text-teal-700 hover:bg-slate-100/70'
    }`;

  const mobileNavLinkClass = ({ isActive }) =>
    `text-sm font-semibold px-4 py-3 rounded-xl flex items-center gap-3 transition-colors ${
      isActive
        ? 'text-teal-900 bg-teal-50 font-bold border border-teal-100'
        : 'text-slate-700 hover:bg-slate-50'
    }`;

  // Helper for role tag styling
  const getRoleBadgeStyle = (role) => {
    switch (role) {
      case 'doctor':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'receptionist':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'orgAdmin':
        return 'bg-teal-50 text-teal-800 border-teal-200';
      case 'superadmin':
      case 'admin':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-sm shadow-slate-200/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link
            to="/"
            className="flex items-center gap-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 rounded-xl p-1 -ml-1 transition-transform hover:scale-[1.01]"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-700 via-teal-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-teal-600/25 ring-1 ring-teal-400/30">
              <Activity className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-slate-900">
                Medi<span className="text-teal-600">Queue</span>
              </span>
              <span className="hidden sm:block text-[10px] font-bold tracking-wider uppercase text-slate-400 -mt-1">
                Hospital Queue & Care
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-1.5" aria-label="Main Navigation">
            <NavLink to="/" className={navLinkClass}>
              Home
            </NavLink>
            {(!isAuthenticated || isPatient) && (
              <>
                <NavLink to="/doctors" className={navLinkClass}>
                  <Stethoscope className="w-4 h-4 text-teal-600" />
                  Find Doctors
                </NavLink>
                <NavLink to="/queue" className={navLinkClass}>
                  <Clock className="w-4 h-4 text-teal-600" />
                  Track Queue
                </NavLink>
              </>
            )}
            {isPatient && (
              <>
                <NavLink to="/book-appointment" className={navLinkClass}>
                  <Calendar className="w-4 h-4 text-teal-600" />
                  Book Appointment
                </NavLink>
                <NavLink to="/appointments" className={navLinkClass}>
                  My Appointments
                </NavLink>
                <NavLink to="/dashboard" className={navLinkClass}>
                  <LayoutDashboard className="w-4 h-4 text-teal-600" />
                  Dashboard
                </NavLink>
              </>
            )}
            {isDoctor && (
              <NavLink to="/doctor/dashboard" className={navLinkClass}>
                <LayoutDashboard className="w-4 h-4 text-teal-600" />
                Doctor Desk
              </NavLink>
            )}
            {canUseStaffDesk && (
              <NavLink
                to="/staff/queue"
                className="text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100/80 px-3 py-2 rounded-xl flex items-center gap-1.5 border border-purple-200 transition shadow-sm"
              >
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                Staff Desk
              </NavLink>
            )}
            {isAdmin && (
              <NavLink
                to="/admin/doctors"
                className="text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100/80 px-3 py-2 rounded-xl flex items-center gap-1.5 border border-indigo-200 transition shadow-sm"
              >
                <ShieldAlert className="w-4 h-4 text-indigo-600" />
                Manage Doctors
              </NavLink>
            )}
            {isOrgAdmin && (
              <NavLink to="/org/dashboard" className={navLinkClass}>
                <Building2 className="w-4 h-4 text-teal-600" />
                Organisation
              </NavLink>
            )}
            {user?.role === 'superadmin' && (
              <NavLink to="/admin/organisations" className={navLinkClass}>
                <ShieldCheck className="w-4 h-4 text-teal-600" />
                Approve Organisations
              </NavLink>
            )}
          </nav>

          {/* Auth Actions (Desktop) */}
          <div className="hidden md:flex items-center gap-2.5">
            {isAuthenticated ? (
              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full bg-slate-100/90 border border-slate-200/90">
                  <div className="w-7 h-7 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                    {user?.name ? user.name.charAt(0) : 'U'}
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-slate-800 leading-none max-w-[120px] truncate">
                      {user?.name}
                    </p>
                    <span className={`inline-block text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border mt-0.5 ${getRoleBadgeStyle(user?.role)}`}>
                      {user?.role === 'orgAdmin' ? 'Org Admin' : user?.role}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  title="Logout"
                  aria-label="Log out of account"
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition border border-transparent hover:border-rose-100"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/join-as-doctor"
                  className="px-3 py-2 text-xs font-bold text-teal-700 hover:text-teal-800 hover:bg-teal-50 rounded-xl transition border border-teal-200"
                >
                  Join as Doctor
                </Link>
                <Link
                  to="/register-organisation"
                  className="px-3 py-2 text-xs font-bold text-indigo-700 hover:text-indigo-800 hover:bg-indigo-50 rounded-xl transition border border-indigo-200"
                >
                  Organisation
                </Link>
                <Link
                  to="/login"
                  className="px-3.5 py-2 text-xs font-bold text-slate-700 hover:text-teal-700 hover:bg-slate-100 rounded-xl transition"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-sm shadow-teal-700/20 transition hover:-translate-y-0.5"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu toggle */}
          <div className="md:hidden flex items-center">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition border border-slate-200"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white/98 backdrop-blur-md px-4 pt-3 pb-6 space-y-1 shadow-lg animate-in slide-in-from-top-2 duration-150">
          {isAuthenticated && (
            <div className="flex items-center gap-3 p-3.5 mb-3 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-sm uppercase shadow-sm">
                {user?.name ? user.name.charAt(0) : 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900 truncate">{user?.name}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border mt-1 ${getRoleBadgeStyle(user?.role)}`}>
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
                  className="text-sm font-bold px-4 py-3 rounded-xl flex items-center gap-3 text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition"
                >
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                  Staff Queue Desk
                </NavLink>
              )}
              {isAdmin && (
                <NavLink
                  to="/admin/doctors"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-sm font-bold px-4 py-3 rounded-xl flex items-center gap-3 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition"
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
                  <ShieldCheck className="w-4 h-4 text-teal-600" />
                  Approve Organisations
                </NavLink>
              )}
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full text-left font-bold text-sm px-4 py-3 rounded-xl flex items-center gap-3 text-rose-600 hover:bg-rose-50 transition"
                >
                  <LogOut className="w-4 h-4" />
                  Log Out
                </button>
              </div>
            </>
          ) : (
            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
              <Link
                to="/join-as-doctor"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-xl font-bold text-xs text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition"
              >
                Join as Doctor
              </Link>
              <Link
                to="/register-organisation"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-xl font-bold text-xs text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition"
              >
                Register Organisation
              </Link>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 rounded-xl font-bold text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 rounded-xl font-bold text-xs text-white bg-teal-600 hover:bg-teal-700 transition shadow-sm"
                >
                  Get Started
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </header>
  );
};

export default Navbar;
