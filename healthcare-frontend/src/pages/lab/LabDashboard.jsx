import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { labService, verificationService } from '../../services/other.service';
import { FlaskConical, Upload, FileText, CheckCircle, Clock, AlertTriangle, ArrowRight, TrendingUp } from 'lucide-react';

const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';

const LabDashboard = () => {
  const { user } = useAuth();
  const [profile,  setProfile]  = useState(null);
  const [reports,  setReports]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const isApproved = user?.verificationStatus === 'approved';

  useEffect(() => {
    verificationService.getProfile()
      .then(r => setProfile(r.data.data?.profile))
      .catch(() => {});
    if (isApproved) {
      labService.getUploadedReports({ limit: 5 })
        .then(r => setReports(r.data.data?.reports || []))
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [isApproved]);

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
              : 'Your lab documents are under admin review. You can upload reports once approved.'}
          </p>
          <Link to="/lab/profile" className="btn-primary btn gap-2 w-full justify-center">
            <FlaskConical size={16}/>
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
            Welcome, {profile?.labName || user?.firstName}
          </h1>
          <p className="text-slate-400 text-sm mt-1">{profile?.labType || 'Diagnostic Lab'}</p>
        </div>
        <span className="badge badge-approved flex items-center gap-1.5">
          <CheckCircle size={13}/>Verified Lab
        </span>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <FileText size={22} className="text-emerald-600"/>
          </div>
          <div>
            <p className="text-2xl font-display font-bold text-slate-900">{reports.length}</p>
            <p className="text-xs text-slate-400">Recent Reports</p>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <TrendingUp size={22} className="text-blue-600"/>
          </div>
          <div>
            <p className="text-2xl font-display font-bold text-slate-900">
              {new Set(reports.map(r => r.patient?._id)).size}
            </p>
            <p className="text-xs text-slate-400">Patients Served</p>
          </div>
        </div>
        <Link to="/lab/upload-report"
          className="card p-5 flex items-center gap-4 hover:border-primary-300 transition-all group border-2 border-transparent">
          <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Upload size={22} className="text-primary-600"/>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-slate-900">Upload Report</p>
            <p className="text-xs text-slate-400">Send to patient</p>
          </div>
          <ArrowRight size={16} className="text-slate-300 group-hover:text-primary-500 transition-colors"/>
        </Link>
      </div>

      {/* Recent reports */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-slate-900 flex items-center gap-2">
            <FileText size={17} className="text-emerald-600"/>Recent Uploads
          </h2>
          <Link to="/lab/upload-report" className="btn-primary btn btn-sm gap-1.5">
            <Upload size={14}/>Upload Report
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">{[...Array(3)].map((_,i) => <div key={i} className="h-14 bg-slate-100 rounded-lg animate-pulse"/>)}</div>
        ) : reports.length === 0 ? (
          <div className="text-center py-10">
            <FileText size={36} className="text-slate-200 mx-auto mb-3"/>
            <p className="text-slate-400 text-sm">No reports uploaded yet.</p>
            <Link to="/lab/upload-report" className="btn-primary btn btn-sm mt-3 gap-1.5">
              <Upload size={14}/>Upload First Report
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {reports.map(r => {
              const fileUrl = r.filePath
                ? r.filePath.startsWith('http') ? r.filePath : `${serverUrl}/${r.filePath.replace(/^\/+/, '')}`
                : null;
              return (
                <div key={r._id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                  <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText size={16} className="text-emerald-600"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{r.title}</p>
                    <p className="text-xs text-slate-400">
                      {r.patient?.firstName} {r.patient?.lastName} · {new Date(r.recordDate).toLocaleDateString()}
                    </p>
                  </div>
                  {fileUrl && (
                    <a href={fileUrl} target="_blank" rel="noreferrer"
                      className="btn-secondary btn btn-sm flex-shrink-0">View</a>
                  )}
                </div>
              );
            })}
            <Link to="/lab/upload-report" className="block text-center text-xs text-primary-600 hover:underline pt-2">
              View all reports →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default LabDashboard;
