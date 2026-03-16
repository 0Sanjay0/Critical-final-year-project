import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { verificationService } from '../../services/other.service';
import { Building2, ScanLine, AlertTriangle, CheckCircle, Clock, ArrowRight, QrCode } from 'lucide-react';

const HospitalDashboard = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const isApproved = user?.verificationStatus === 'approved';

  useEffect(() => {
    verificationService.getProfile()
      .then(r => setProfile(r.data.data?.profile))
      .catch(() => {});
  }, []);

  if (!isApproved) {
    return (
      <div className="page-container animate-fade-in">
        <div className="max-w-lg mx-auto mt-10 card p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto">
            {user?.verificationStatus === 'rejected'
              ? <AlertTriangle size={32} className="text-red-500"/>
              : <Clock size={32} className="text-amber-600"/>}
          </div>
          <h2 className="font-display text-xl font-bold text-slate-900">
            {user?.verificationStatus === 'rejected' ? 'Verification Rejected' : 'Pending Verification'}
          </h2>
          <p className="text-slate-400 text-sm">
            {user?.verificationStatus === 'rejected'
              ? `Reason: ${user.rejectionReason || 'Please resubmit your documents.'}`
              : 'Your hospital documents are under admin review. You will have emergency access once approved.'}
          </p>
          <Link to="/hospital/profile" className="btn-primary btn gap-2 w-full justify-center">
            <Building2 size={16}/>
            {user?.verificationStatus === 'rejected' ? 'Resubmit Profile' : 'View Profile'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container animate-fade-in space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Welcome, {profile?.hospitalName || user?.firstName}
          </h1>
          <p className="text-slate-400 text-sm mt-1">{profile?.hospitalType || 'Healthcare Facility'}</p>
        </div>
        <span className="badge badge-approved flex items-center gap-1.5">
          <CheckCircle size={13}/>Verified Hospital
        </span>
      </div>

      {/* Quick action cards */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Link to="/scan-qr"
          className="card p-6 flex items-center gap-4 hover:border-red-300 hover:shadow-md transition-all group border-2 border-transparent">
          <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center flex-shrink-0">
            <ScanLine size={28} className="text-red-600"/>
          </div>
          <div className="flex-1">
            <p className="font-display font-bold text-slate-900">Scan Patient QR</p>
            <p className="text-slate-400 text-sm">Access emergency patient data</p>
          </div>
          <ArrowRight size={18} className="text-slate-300 group-hover:text-red-400 transition-colors"/>
        </Link>

        <Link to="/hospital/profile"
          className="card p-6 flex items-center gap-4 hover:border-violet-300 hover:shadow-md transition-all group border-2 border-transparent">
          <div className="w-14 h-14 bg-violet-100 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Building2 size={28} className="text-violet-600"/>
          </div>
          <div className="flex-1">
            <p className="font-display font-bold text-slate-900">Hospital Profile</p>
            <p className="text-slate-400 text-sm">View and manage your details</p>
          </div>
          <ArrowRight size={18} className="text-slate-300 group-hover:text-violet-400 transition-colors"/>
        </Link>
      </div>

      {/* Hospital details */}
      {profile && (
        <div className="card p-6">
          <h2 className="font-display font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Building2 size={17} className="text-violet-600"/>Hospital Details
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              ['Hospital Name',    profile.hospitalName],
              ['Type',             profile.hospitalType],
              ['Registration No.', profile.registrationNumber],
              ['Specialties',      Array.isArray(profile.specialties) ? profile.specialties.join(', ') : profile.specialties],
            ].filter(([,v]) => v).map(([l, v]) => (
              <div key={l} className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-400">{l}</p>
                <p className="text-sm font-semibold text-slate-900 mt-0.5">{v}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Emergency access guide */}
      <div className="card p-6">
        <h2 className="font-display font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <QrCode size={17} className="text-red-500"/>Your Emergency Access
        </h2>
        <div className="space-y-2">
          {[
            { icon:'🩸', label:'Blood group & organ donor status' },
            { icon:'⚠️', label:'All known allergies with severity' },
            { icon:'💊', label:'Current medications and dosages' },
            { icon:'🏥', label:'Chronic conditions and diseases' },
            { icon:'📞', label:'Emergency contacts with phone numbers' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-lg">
              <span className="text-base">{item.icon}</span>
              <p className="text-sm text-slate-700">{item.label}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          📋 Full prescriptions and documents are restricted to verified doctors only.
        </div>
        <Link to="/scan-qr" className="btn-primary btn gap-2 mt-4 w-full justify-center">
          <ScanLine size={15}/>Open QR Scanner
        </Link>
      </div>
    </div>
  );
};

export default HospitalDashboard;
