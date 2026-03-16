import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { appointmentService, doctorService } from '../../services/other.service';
import { CalendarCheck, Users, Clock, CheckCircle, ArrowRight, AlertTriangle } from 'lucide-react';

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="card p-5">
    <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
      <Icon size={19} />
    </div>
    <p className="text-2xl font-display font-bold text-slate-900">{value}</p>
    <p className="text-sm text-slate-400 mt-0.5">{label}</p>
  </div>
);

const DoctorDashboard = () => {
  const { user, isApproved } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [patients,     setPatients]     = useState([]);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    if (!isApproved) { setLoading(false); return; }
    Promise.all([
      appointmentService.getAll(),
      doctorService.getMyPatients(),
    ]).then(([aRes, pRes]) => {
      setAppointments(aRes.data.data.appointments || []);
      setPatients(pRes.data.data.patients || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [isApproved]);

  if (!isApproved) return (
    <div className="page-container animate-fade-in">
      <div className="card p-10 text-center max-w-lg mx-auto">
        <AlertTriangle size={48} className="text-amber-400 mx-auto mb-4" />
        <h2 className="font-display text-xl font-bold text-slate-900 mb-2">Verification Pending</h2>
        <p className="text-slate-500 text-sm leading-relaxed">
          Your doctor account is awaiting admin verification. Once approved, you'll have full access
          to patient appointments and records. You'll be notified when your account is verified.
        </p>
        <Link to="/doctor/profile" className="btn-primary btn mt-6">Complete your profile</Link>
      </div>
    </div>
  );

  const pending   = appointments.filter(a => a.status === 'pending').length;
  const confirmed = appointments.filter(a => a.status === 'confirmed').length;
  const completed = appointments.filter(a => a.status === 'completed').length;
  const upcoming  = appointments
    .filter(a => ['pending','confirmed'].includes(a.status))
    .sort((a,b) => new Date(a.appointmentDate) - new Date(b.appointmentDate))
    .slice(0, 5);

  return (
    <div className="page-container space-y-6 animate-fade-in stagger">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">
          Welcome, Dr. {user?.firstName} 👋
        </h1>
        <p className="text-slate-400 text-sm mt-1">Here's your practice overview.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users}        label="Total Patients"  value={patients.length} color="bg-emerald-100 text-emerald-600" />
        <StatCard icon={Clock}        label="Pending"         value={pending}         color="bg-amber-100 text-amber-600" />
        <StatCard icon={CalendarCheck}label="Confirmed"       value={confirmed}       color="bg-blue-100 text-blue-600" />
        <StatCard icon={CheckCircle}  label="Completed"       value={completed}       color="bg-slate-100 text-slate-600" />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Upcoming appointments */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-slate-900">Upcoming Appointments</h2>
            <Link to="/doctor/appointments" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
              View all <ArrowRight size={12}/>
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3">{[...Array(3)].map((_,i)=><div key={i} className="h-14 bg-slate-100 rounded-lg animate-pulse"/>)}</div>
          ) : upcoming.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-6">No upcoming appointments.</p>
          ) : (
            <div className="space-y-2">
              {upcoming.map(a => (
                <Link key={a._id} to={`/doctor/appointments/${a._id}`}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors group">
                  <div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-semibold text-sm flex-shrink-0">
                    {a.patient?.firstName?.[0]}{a.patient?.lastName?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {a.patient?.firstName} {a.patient?.lastName}
                    </p>
                    <p className="text-xs text-slate-400">
                      {new Date(a.appointmentDate).toLocaleDateString()} · {a.appointmentTime}
                    </p>
                  </div>
                  <span className={`badge flex-shrink-0 ${a.status==='pending'?'badge-pending':'badge-info'}`}>{a.status}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent patients */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-slate-900">Recent Patients</h2>
          </div>
          {loading ? (
            <div className="space-y-3">{[...Array(3)].map((_,i)=><div key={i} className="h-14 bg-slate-100 rounded-lg animate-pulse"/>)}</div>
          ) : patients.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-6">No patients yet.</p>
          ) : (
            <div className="space-y-2">
              {patients.slice(0,5).map(p => (
                <div key={p._id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                  <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold text-sm flex-shrink-0">
                    {p.firstName?.[0]}{p.lastName?.[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{p.firstName} {p.lastName}</p>
                    <p className="text-xs text-slate-400 truncate">{p.email}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DoctorDashboard;
