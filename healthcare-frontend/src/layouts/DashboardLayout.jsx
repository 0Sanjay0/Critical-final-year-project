import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, User, FileText, QrCode, Calendar,
  CalendarCheck, Users, LogOut, Menu, X,
  Building2, Stethoscope, FlaskConical, ScanLine, ShieldAlert,
} from 'lucide-react';
import { useState, useEffect } from 'react';

const NAV = {
  patient: [
    { to: '/patient/dashboard',        icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/patient/profile',          icon: User,            label: 'My Profile' },
    { to: '/patient/medical-info',     icon: FileText,        label: 'Medical Info' },
    { to: '/patient/records',          icon: FileText,        label: 'My Records' },
    { to: '/patient/qr-code',          icon: QrCode,          label: 'My QR Code' },
    { to: '/patient/book-appointment', icon: Calendar,        label: 'Book Appointment' },
    { to: '/patient/appointments',     icon: CalendarCheck,   label: 'Appointments' },
  ],
  doctor: [
    { to: '/doctor/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/doctor/profile',      icon: User,            label: 'My Profile' },
    { to: '/doctor/appointments', icon: CalendarCheck,   label: 'Appointments' },
    { to: '/doctor/hospital',     icon: Building2,       label: 'My Hospital' },
    { to: '/scan-qr',             icon: ScanLine,        label: 'Scan Patient QR' },
  ],
  hospital: [
    { to: '/hospital/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/hospital/profile',      icon: Building2,       label: 'Profile' },
    { to: '/hospital/appointments', icon: Calendar,        label: 'Appointments' },
    { to: '/hospital/doctors',      icon: Stethoscope,     label: 'Manage Doctors' },
    { to: '/scan-qr',               icon: ScanLine,        label: 'Scan Patient QR' },
  ],
  lab: [
    { to: '/lab/dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/lab/profile',       icon: FlaskConical,    label: 'Profile' },
    { to: '/lab/upload-report', icon: FileText,        label: 'Upload Report' },
  ],
  admin: [
    { to: '/admin/dashboard',        icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/verify/doctors',   icon: Stethoscope,     label: 'Verify Doctors' },
    { to: '/admin/verify/hospitals', icon: Building2,       label: 'Verify Hospitals' },
    { to: '/admin/verify/labs',      icon: FlaskConical,    label: 'Verify Labs' },
    { to: '/admin/users',            icon: Users,           label: 'Manage Users' },
    { to: '/admin/emergency-logs',   icon: ShieldAlert,     label: 'Emergency Logs' },
  ],
};

const ROLE_COLOR = {
  patient: 'bg-blue-600',   doctor:   'bg-emerald-600',
  hospital:'bg-violet-600', lab:      'bg-amber-500',
  admin:   'bg-rose-600',
};

const Sidebar = ({ user, navItems, color, onLogout, onClose, mobile }) => (
  <aside className="flex flex-col h-full w-64 bg-white border-r border-slate-200">
    {/* Logo */}
    <div className="h-16 flex items-center gap-3 px-5 border-b border-slate-100 flex-shrink-0">
      <div className={`w-8 h-8 ${color} rounded-lg flex items-center justify-center`}>
        <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-white" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 2v20M2 12h20" strokeLinecap="round"/>
        </svg>
      </div>
      <span className="font-display font-bold text-slate-900">Critical</span>
      {mobile && (
        <button onClick={onClose} className="ml-auto p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100">
          <X size={18}/>
        </button>
      )}
    </div>

    {/* User info */}
    <div className="px-4 py-4 border-b border-slate-100 flex-shrink-0">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 ${color} rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
          {user?.firstName?.[0]}{user?.lastName?.[0]}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">{user?.firstName} {user?.lastName}</p>
          <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
        </div>
      </div>
      {user?.verificationStatus === 'pending'  && <div className="mt-2 badge-pending  badge text-xs">⏳ Pending verification</div>}
      {user?.verificationStatus === 'rejected' && <div className="mt-2 badge-rejected badge text-xs">❌ Verification rejected</div>}
    </div>

    {/* Nav */}
    <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
      {navItems.map(({ to, icon: Icon, label }) => (
        <NavLink key={to} to={to} onClick={onClose}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
              isActive ? `${color} text-white shadow-sm` : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`
          }>
          <Icon size={17} className="flex-shrink-0"/>{label}
        </NavLink>
      ))}
    </nav>

    {/* Sign out */}
    <div className="px-3 py-4 border-t border-slate-100 flex-shrink-0">
      <button onClick={onLogout}
        className="flex items-center gap-3 w-full px-3 py-3 rounded-lg text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors">
        <LogOut size={17}/>Sign out
      </button>
    </div>
  </aside>
);

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  // Close sidebar on route change (mobile)
  useEffect(() => { setOpen(false); }, [location.pathname]);

  // Prevent body scroll when sidebar open
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else      document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const navItems = NAV[user?.role] || [];
  const color    = ROLE_COLOR[user?.role] || 'bg-primary-600';
  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-col flex-shrink-0 h-full">
        <Sidebar user={user} navItems={navItems} color={color} onLogout={handleLogout}/>
      </div>

      {/* Mobile sidebar overlay */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          {/* Drawer */}
          <div className="relative w-64 h-full shadow-2xl animate-slide-in flex-shrink-0">
            <Sidebar user={user} navItems={navItems} color={color}
              onLogout={handleLogout} mobile onClose={() => setOpen(false)}/>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <header className="md:hidden h-14 bg-white border-b border-slate-200 flex items-center px-3 gap-3 flex-shrink-0 z-10">
          <button
            onClick={() => setOpen(true)}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Open menu">
            <Menu size={22}/>
          </button>
          <div className={`w-6 h-6 ${color} rounded-md flex items-center justify-center`}>
            <svg viewBox="0 0 24 24" fill="none" className="w-3 h-3 text-white" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2v20M2 12h20" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="font-display font-bold text-slate-900 text-sm">Critical</span>
          {/* Current page label on right */}
          <span className="ml-auto text-xs text-slate-400 truncate max-w-[120px]">
            {navItems.find(n => location.pathname.startsWith(n.to))?.label || ''}
          </span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <Outlet/>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
