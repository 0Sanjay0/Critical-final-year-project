import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DASH = {
  patient:'/patient/dashboard', doctor:'/doctor/dashboard',
  hospital:'/hospital/dashboard', lab:'/lab/dashboard', admin:'/admin/dashboard',
};

const QRIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/>
    <path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
    <rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/>
    <rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>
  </svg>
);

const PublicLayout = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-white" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2v20M2 12h20" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="font-display font-bold text-slate-900">EDIAM</span>
          </Link>

          {/* Nav */}
          <nav className="flex items-center gap-1.5 sm:gap-2">
            {isAuthenticated ? (
              <>
                <button onClick={() => navigate(DASH[user?.role])}
                  className="btn-primary btn btn-sm text-xs sm:text-sm px-3 sm:px-4">
                  Dashboard
                </button>
                <button onClick={logout}
                  className="btn-ghost btn btn-sm text-xs sm:text-sm px-2 sm:px-3 text-slate-500">
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link to="/scan-qr"
                  className="hidden sm:flex btn-ghost btn btn-sm items-center gap-1.5 text-slate-600">
                  <QRIcon/>Scan QR
                </Link>
                {/* Mobile: only show Scan QR icon */}
                <Link to="/scan-qr"
                  className="sm:hidden p-2 text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                  <QRIcon/>
                </Link>
                <Link to="/login"
                  className="btn-ghost btn btn-sm text-xs sm:text-sm px-2 sm:px-3">
                  Sign in
                </Link>
                <Link to="/register"
                  className="btn-primary btn btn-sm text-xs sm:text-sm px-3 sm:px-4">
                  <span className="hidden sm:inline">Get started</span>
                  <span className="sm:hidden">Register</span>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1"><Outlet/></main>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs sm:text-sm text-slate-400">
        © {new Date().getFullYear()} EDIAM — Emergency Data & Information Access Model
      </footer>
    </div>
  );
};

export default PublicLayout;
