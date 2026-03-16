import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DASH = {
  patient: '/patient/dashboard', doctor: '/doctor/dashboard',
  hospital: '/hospital/dashboard', lab: '/lab/dashboard', admin: '/admin/dashboard',
};

const PublicLayout = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-white" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2v20M2 12h20" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="font-display font-bold text-slate-900 text-lg">Critical</span>
          </Link>
          <nav className="flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <button onClick={() => navigate(DASH[user?.role])}
                  className="btn-secondary btn btn-sm">Dashboard</button>
                <button onClick={logout}
                  className="btn-ghost btn btn-sm">Sign out</button>
              </>
            ) : (
              <>
                <Link to="/scan-qr"  className="btn-ghost btn btn-sm flex items-center gap-1.5"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>Scan QR</Link>
                <Link to="/login"    className="btn-ghost btn btn-sm">Sign in</Link>
                <Link to="/register" className="btn-primary btn btn-sm">Get started</Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1"><Outlet /></main>
      <footer className="border-t border-slate-200 bg-white py-5 text-center text-sm text-slate-400">
        © {new Date().getFullYear()} Critical Healthcare System
      </footer>
    </div>
  );
};

export default PublicLayout;
