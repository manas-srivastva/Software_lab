const roleDashboards = {
  patient: '/dashboard',
  doctor: '/doctor/dashboard',
  receptionist: '/staff/queue',
  admin: '/admin/doctors',
  orgAdmin: '/org/dashboard',
  superadmin: '/admin/organisations',
};

const getRoleDashboard = (role) => roleDashboards[role] || '/dashboard';

export default getRoleDashboard;
