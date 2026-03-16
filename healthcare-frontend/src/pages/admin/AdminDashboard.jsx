import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../services/other.service';
import { Users, Stethoscope, Building2, FlaskConical, Clock, ArrowRight, ShieldCheck } from 'lucide-react';

const StatCard = ({ icon: Icon, label, value, color, to }) => (
  <Link to={to} className="card p-5 hover:-translate-y-0.5 transition-transform duration-200 group">
    <div className="flex items-start justify-between mb-3">
      <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}><Icon size={19}/></div>
      <ArrowRight size={15} className="text-slate-300 group-hover:text-slate-500 transition-colors"/>
    </div>
    <p className="text-2xl font-display font-bold text-slate-900">{value ?? '—'}</p>
    <p className="text-sm text-slate-400 mt-0.5">{label}</p>
  </Link>
);

const ROLE_LINK = { doctor:'/admin/verify/doctors', hospital:'/admin/verify/hospitals', lab:'/admin/verify/labs' };
const ROLE_COLOR = { doctor:'bg-emerald-100 text-emerald-700', hospital:'bg-violet-100 text-violet-700', lab:'bg-amber-100 text-amber-700' };
const ROLE_BADGE = { doctor:'badge-info', hospital:'bg-violet-100 text-violet-700', lab:'bg-amber-100 text-amber-700' };

const AdminDashboard = () => {
  const [stats,   setStats]   = useState(null);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([adminService.getStats(), adminService.getPending()])
      .then(([sRes, pRes]) => {
        // Stats shape: { data: { users: { totalDoctors, totalHospitals, totalLabs, totalPatients }, pending, approved } }
        setStats(sRes.data.data);
        // Pending shape: { data: { results: [ { user, profile } ] } }
        setPending(pRes.data.data.results || []);
      }).catch(()=>{}).finally(()=>setLoading(false));
  }, []);

  const totalUsers = stats
    ? (stats.users?.totalPatients||0) + (stats.users?.totalDoctors||0) + (stats.users?.totalHospitals||0) + (stats.users?.totalLabs||0)
    : null;

  return (
    <div className="page-container space-y-6 animate-fade-in stagger">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">Admin Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">System overview and pending verifications.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users}        label="Total Users"  value={totalUsers}                      color="bg-blue-100 text-blue-600"       to="/admin/users"/>
        <StatCard icon={Stethoscope}  label="Doctors"      value={stats?.users?.totalDoctors}      color="bg-emerald-100 text-emerald-600" to="/admin/verify/doctors"/>
        <StatCard icon={Building2}    label="Hospitals"    value={stats?.users?.totalHospitals}    color="bg-violet-100 text-violet-600"   to="/admin/verify/hospitals"/>
        <StatCard icon={FlaskConical} label="Labs"         value={stats?.users?.totalLabs}         color="bg-amber-100 text-amber-600"     to="/admin/verify/labs"/>
      </div>

      {/* Pending breakdown */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          {[
            ['Doctors Pending',   stats.pending?.doctors,   'text-emerald-600', '/admin/verify/doctors'],
            ['Hospitals Pending', stats.pending?.hospitals, 'text-violet-600',  '/admin/verify/hospitals'],
            ['Labs Pending',      stats.pending?.labs,      'text-amber-600',   '/admin/verify/labs'],
          ].map(([l, v, c, to]) => (
            <Link key={l} to={to} className="card p-4 text-center hover:-translate-y-0.5 transition-transform duration-200">
              <p className={`text-2xl font-display font-bold ${c}`}>{v ?? 0}</p>
              <p className="text-xs text-slate-400 mt-0.5">{l}</p>
            </Link>
          ))}
        </div>
      )}

      {/* Pending verifications list */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-5">
          <Clock size={18} className="text-amber-500"/>
          <h2 className="font-display font-semibold text-slate-900">Pending Verifications</h2>
          {pending.length > 0 && (
            <span className="w-5 h-5 bg-amber-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
              {pending.length}
            </span>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">{[...Array(3)].map((_,i)=><div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse"/>)}</div>
        ) : pending.length === 0 ? (
          <div className="text-center py-8">
            <ShieldCheck size={36} className="text-green-400 mx-auto mb-2"/>
            <p className="text-slate-400 text-sm">All caught up! No pending verifications.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pending.map(({ user, profile }) => (
              <Link key={user._id} to={ROLE_LINK[user.role] || '#'}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0 ${ROLE_COLOR[user.role]}`}>
                  {user.firstName?.[0]}{user.lastName?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{user.firstName} {user.lastName}</p>
                  <p className="text-xs text-slate-400 truncate">
                    {user.email}
                    {profile?.specialization && ` · ${profile.specialization}`}
                    {profile?.hospitalName   && ` · ${profile.hospitalName}`}
                    {profile?.labName        && ` · ${profile.labName}`}
                  </p>
                </div>
                <span className={`badge flex-shrink-0 ${ROLE_BADGE[user.role]}`}>{user.role}</span>
                <ArrowRight size={14} className="text-slate-300 flex-shrink-0"/>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
