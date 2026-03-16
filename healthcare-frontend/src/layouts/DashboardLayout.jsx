import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, User, FileText, QrCode, Calendar,
  CalendarCheck, Users, LogOut, Menu, X,
  Building2, Stethoscope, FlaskConical, ScanLine, ShieldAlert,
} from 'lucide-react';
import { useState } from 'react';

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
    { to: '/hospital/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/hospital/profile',      icon: Building2,       label: 'Profile' },
    { to: '/hospital/appointments',  icon: Calendar,        label: 'Appointments' },
    { to: '/hospital/doctors',       icon: Stethoscope,     label: 'Manage Doctors' },
    { to: '/scan-qr',            icon: ScanLine,        label: 'Scan Patient QR' },
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
    <div className="h-16 flex items-center gap-3 px-5 border-b border-slate-100">
      <div className={`w-8 h-8 ${color} rounded-lg flex items-center justify-center`}>
        <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-white" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 2v20M2 12h20" strokeLinecap="round"/>
        </svg>
      </div>
      <span className="font-display font-bold text-slate-900">Critical</span>
      {mobile && (
        <button onClick={onClose} className="ml-auto p-1 text-slate-400 hover:text-slate-700">
          <X size={18}/>
        </button>
      )}
    </div>

    <div className="px-4 py-4 border-b border-slate-100">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 ${color} rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0`}>
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

    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
      {navItems.map(({ to, icon: Icon, label }) => (
        <NavLink key={to} to={to} onClick={onClose}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive ? `${color} text-white` : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`
          }>
          <Icon size={17}/>{label}
        </NavLink>
      ))}
    </nav>

    <div className="px-3 py-4 border-t border-slate-100">
      <button onClick={onLogout}
        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors">
        <LogOut size={17}/>Sign out
      </button>
    </div>
  </aside>
);

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const navItems = NAV[user?.role] || [];
  const color    = ROLE_COLOR[user?.role] || 'bg-primary-600';
  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <div className="hidden md:block flex-shrink-0">
        <Sidebar user={user} navItems={navItems} color={color} onLogout={handleLogout}/>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={()=>setOpen(false)}/>
          <div className="relative">
            <Sidebar user={user} navItems={navItems} color={color} onLogout={handleLogout}
              mobile onClose={()=>setOpen(false)}/>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="md:hidden h-14 bg-white border-b border-slate-200 flex items-center px-4 gap-3 flex-shrink-0">
          <button onClick={()=>setOpen(true)} className="p-2 text-slate-500"><Menu size={20}/></button>
          <span className="font-display font-bold text-slate-900">Critical</span>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="animate-fade-in"><Outlet/></div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
