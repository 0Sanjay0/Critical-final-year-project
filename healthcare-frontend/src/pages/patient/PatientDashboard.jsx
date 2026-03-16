import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { patientService } from '../../services/patient.service';
import { emergencyService } from '../../services/other.service';
import {
  QrCode, Calendar, FileText, AlertTriangle,
  Pill, Activity, ArrowRight, Heart, Plus
} from 'lucide-react';

const StatCard = ({ icon: Icon, label, value, color, to }) => (
  <Link to={to} className="card p-5 hover:-translate-y-0.5 transition-transform duration-200 group">
    <div className="flex items-start justify-between">
      <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}>
        <Icon size={19} />
      </div>
      <ArrowRight size={15} className="text-slate-300 group-hover:text-slate-500 transition-colors mt-1" />
    </div>
    <p className="text-2xl font-display font-bold text-slate-900 mt-3">{value}</p>
    <p className="text-sm text-slate-400 mt-0.5">{label}</p>
  </Link>
);

const PatientDashboard = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [records, setRecords] = useState([]);
  const [qrInfo,  setQrInfo]  = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      patientService.getSummary(),
      patientService.getRecords(),
      emergencyService.getMyQRInfo(),
    ]).then(([sumRes, recRes, qrRes]) => {
      setProfile(sumRes.data.data.profile);
      setRecords(recRes.data.data.records || []);
      setQrInfo(qrRes.data.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="page-container">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card p-5 animate-pulse h-28 bg-slate-100" />
        ))}
      </div>
    </div>
  );

  const allergies       = profile?.allergies?.length       || 0;
  const medications     = profile?.medications?.length     || 0;
  const chronicDiseases = profile?.chronicDiseases?.length || 0;
  const totalRecords    = records.length;

  const isProfileComplete = profile?.bloodGroup && profile?.bloodGroup !== 'unknown';

  return (
    <div className="page-container space-y-6 stagger">

      {/* Welcome */}
      <div className="animate-fade-in">
        <h1 className="font-display text-2xl font-bold text-slate-900">
          Good day, {user?.firstName} 👋
        </h1>
        <p className="text-slate-400 text-sm mt-1">Here's an overview of your health profile.</p>
      </div>

      {/* Profile incomplete banner */}
      {!isProfileComplete && (
        <div className="animate-fade-in bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">Complete your medical profile</p>
            <p className="text-xs text-amber-600 mt-0.5">Add your blood group, allergies, and emergency contacts so first responders can help you in an emergency.</p>
          </div>
          <Link to="/patient/medical-info" className="btn btn-sm bg-amber-500 text-white hover:bg-amber-600 flex-shrink-0">
            Complete now
          </Link>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
        <StatCard icon={FileText}       label="Medical Records"  value={totalRecords}    color="bg-blue-100 text-blue-600"    to="/patient/records" />
        <StatCard icon={AlertTriangle}  label="Allergies"        value={allergies}       color="bg-red-100 text-red-600"      to="/patient/medical-info" />
        <StatCard icon={Pill}           label="Medications"      value={medications}     color="bg-violet-100 text-violet-600" to="/patient/medical-info" />
        <StatCard icon={Activity}       label="Conditions"       value={chronicDiseases} color="bg-emerald-100 text-emerald-600" to="/patient/medical-info" />
      </div>

      <div className="grid lg:grid-cols-3 gap-5 animate-fade-in">
        {/* QR Card */}
        <div className="card p-6 flex flex-col items-center text-center gap-4">
          <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-xl flex items-center justify-center">
            <QrCode size={24} />
          </div>
          <div>
            <p className="font-display font-semibold text-slate-900">Emergency QR Code</p>
            <p className="text-xs text-slate-400 mt-1">
              {qrInfo ? 'Your QR code is active.' : 'QR code not generated yet.'}
            </p>
          </div>
          <Link to="/patient/qr-code" className="btn-primary btn w-full btn-sm">
            View QR Code
          </Link>
        </div>

        {/* Quick medical summary */}
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <p className="font-display font-semibold text-slate-900">Medical Summary</p>
            <Link to="/patient/medical-info" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
              Edit <ArrowRight size={12} />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Blood group */}
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-400 mb-1">Blood Group</p>
              <div className="flex items-center gap-2">
                <Heart size={14} className="text-red-500" />
                <span className="font-display font-bold text-slate-900">
                  {profile?.bloodGroup && profile.bloodGroup !== 'unknown' ? profile.bloodGroup : '—'}
                </span>
              </div>
            </div>

            {/* BMI */}
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-400 mb-1">BMI</p>
              <span className="font-display font-bold text-slate-900">
                {profile?.bmi || '—'}
              </span>
            </div>

            {/* Organ donor */}
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-400 mb-1">Organ Donor</p>
              <span className={`text-sm font-semibold ${profile?.isOrganDonor ? 'text-green-600' : 'text-slate-400'}`}>
                {profile?.isOrganDonor ? '✓ Yes' : 'No'}
              </span>
            </div>

            {/* Emergency contacts */}
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-400 mb-1">Emergency Contacts</p>
              <span className="font-display font-bold text-slate-900">
                {profile?.emergencyContacts?.length || 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="animate-fade-in">
        <p className="font-display font-semibold text-slate-900 mb-3">Quick Actions</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { to: '/patient/book-appointment', icon: Calendar,  label: 'Book Appointment', color: 'text-blue-600 bg-blue-50' },
            { to: '/patient/records',          icon: Plus,       label: 'Upload Record',    color: 'text-emerald-600 bg-emerald-50' },
            { to: '/patient/medical-info',     icon: Activity,   label: 'Update Medical',   color: 'text-violet-600 bg-violet-50' },
            { to: '/patient/qr-code',          icon: QrCode,     label: 'My QR Code',       color: 'text-amber-600 bg-amber-50' },
          ].map(({ to, icon: Icon, label, color }) => (
            <Link key={to} to={to}
              className="card p-4 flex flex-col items-center gap-2 text-center hover:-translate-y-0.5 transition-transform duration-200">
              <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center`}>
                <Icon size={17} />
              </div>
              <span className="text-xs font-medium text-slate-700">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;
