import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { verificationService } from '../../services/other.service';
import { authService } from '../../services/auth.service';
import { Building2, Upload, File, X, Check, Loader, User } from 'lucide-react';
import toast from 'react-hot-toast';

const HOSPITAL_TYPES = ['government','private','clinic','specialty','teaching','other'];

const HospitalProfile = () => {
  const { user, refreshUser } = useAuth();
  const [profileStatus, setProfileStatus] = useState('loading');
  const [profile,       setProfile]       = useState(null);
  const [saving,        setSaving]        = useState(false);
  const [savingPersonal, setSavingPersonal] = useState(false);
  const [files, setFiles] = useState({ registration: null, license: null, authorization: null });

  const [personal, setPersonal] = useState({
    firstName: user?.firstName || '',
    lastName:  user?.lastName  || '',
    phone:     user?.phone     || '',
  });

  const [form, setForm] = useState({
    hospitalName: '', registrationNumber: '', hospitalType: 'private',
    specialties: '',
  });

  useEffect(() => {
    setPersonal({ firstName: user?.firstName||'', lastName: user?.lastName||'', phone: user?.phone||'' });
  }, [user?.firstName]);

  const loadProfile = () => {
    setProfileStatus('loading');
    verificationService.getProfile()
      .then(r => {
        const p = r.data.data?.profile;
        if (p) {
          setForm({
            hospitalName:       p.hospitalName       || '',
            registrationNumber: p.registrationNumber || '',
            hospitalType:       p.hospitalType       || 'private',
            specialties:        Array.isArray(p.specialties) ? p.specialties.join(', ') : (p.specialties || ''),
          });
          setProfile(p);
          setProfileStatus('loaded');
        } else {
          setProfileStatus('none');
        }
      })
      .catch(() => setProfileStatus('none'));
  };

  useEffect(() => { loadProfile(); }, [user?._id]);

  const savePersonal = async (e) => {
    e.preventDefault();
    setSavingPersonal(true);
    try {
      await authService.updateProfile(personal);
      await refreshUser();
      toast.success('Personal info updated.');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed.'); }
    finally { setSavingPersonal(false); }
  };

  const submitProfile = async (e) => {
    e.preventDefault();
    if (!form.hospitalName.trim() || !form.registrationNumber.trim()) {
      toast.error('Hospital name and registration number are required.'); return;
    }
    if (profileStatus === 'none' && (!files.registration || !files.license || !files.authorization)) {
      toast.error('All 3 documents are required for first submission.'); return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('hospitalName',       form.hospitalName.trim());
      fd.append('registrationNumber', form.registrationNumber.trim());
      fd.append('hospitalType',       form.hospitalType);
      const specs = form.specialties ? form.specialties.split(',').map(s => s.trim()).filter(Boolean) : [];
      fd.append('specialties', JSON.stringify(specs));
      if (files.registration)  fd.append('registrationDoc',  files.registration);
      if (files.license)       fd.append('licenseDoc',       files.license);
      if (files.authorization) fd.append('authorizationDoc', files.authorization);
      await verificationService.setupHospital(fd);
      toast.success('Profile submitted for verification!');
      await refreshUser();
      loadProfile();
    } catch (err) { toast.error(err.response?.data?.message || 'Submission failed.'); }
    finally { setSaving(false); }
  };

  const FileInput = ({ label, fileKey, hint }) => (
    <div>
      <label className="label">{label} *</label>
      {hint && <p className="text-xs text-slate-400 mb-1">{hint}</p>}
      <div className={`border-2 border-dashed rounded-lg p-3 text-center transition-colors
        ${files[fileKey] ? 'border-primary-400 bg-primary-50' : 'border-slate-200 hover:border-slate-300'}`}>
        {files[fileKey] ? (
          <div className="flex items-center justify-center gap-2">
            <File size={15} className="text-primary-600"/>
            <span className="text-xs font-medium text-slate-700 truncate max-w-[130px]">{files[fileKey].name}</span>
            <button type="button" onClick={() => setFiles(f => ({ ...f, [fileKey]: null }))} className="text-slate-400 hover:text-red-500"><X size={14}/></button>
          </div>
        ) : (
          <label className="cursor-pointer">
            <Upload size={18} className="text-slate-300 mx-auto mb-1"/>
            <p className="text-xs text-slate-400">Click to upload (PDF, JPG, PNG)</p>
            <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png"
              onChange={e => setFiles(f => ({ ...f, [fileKey]: e.target.files[0] }))}/>
          </label>
        )}
      </div>
    </div>
  );

  const isApproved = user?.verificationStatus === 'approved';

  return (
    <div className="page-container animate-fade-in space-y-6">
      <h1 className="font-display text-2xl font-bold text-slate-900">Hospital Profile</h1>

      {/* Status banner */}
      <div className={`border rounded-xl p-4 flex items-start gap-3
        ${isApproved ? 'bg-green-50 border-green-200'
          : user?.verificationStatus === 'rejected' ? 'bg-red-50 border-red-200'
          : 'bg-amber-50 border-amber-200'}`}>
        <span className="text-lg flex-shrink-0">
          {isApproved ? '✅' : user?.verificationStatus === 'rejected' ? '❌' : '⏳'}
        </span>
        <div>
          <p className={`font-semibold text-sm ${isApproved?'text-green-800':user?.verificationStatus==='rejected'?'text-red-800':'text-amber-800'}`}>
            {isApproved ? 'Verified Hospital — Emergency Access Enabled'
              : user?.verificationStatus === 'rejected' ? 'Verification Rejected'
              : profileStatus === 'none' ? 'Profile Not Submitted'
              : 'Verification Pending Review'}
          </p>
          <p className={`text-xs mt-0.5 ${isApproved?'text-green-700':user?.verificationStatus==='rejected'?'text-red-700':'text-amber-700'}`}>
            {isApproved && 'Your hospital can now scan patient QR codes in emergencies.'}
            {user?.verificationStatus === 'pending' && 'Documents are under admin review.'}
            {user?.verificationStatus === 'rejected' && `Reason: ${user.rejectionReason || 'Resubmit below.'}`}
            {profileStatus === 'none' && user?.verificationStatus !== 'rejected' && 'Submit your hospital details to get verified.'}
          </p>
        </div>
      </div>

      {/* Personal info */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-5">
          <User size={18} className="text-primary-600"/>
          <h2 className="font-display font-semibold text-slate-900">Contact Person</h2>
        </div>
        <form onSubmit={savePersonal} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="form-group"><label className="label">First Name</label>
              <input className="input" value={personal.firstName} onChange={e => setPersonal(f => ({ ...f, firstName: e.target.value }))}/></div>
            <div className="form-group"><label className="label">Last Name</label>
              <input className="input" value={personal.lastName} onChange={e => setPersonal(f => ({ ...f, lastName: e.target.value }))}/></div>
            <div className="form-group"><label className="label">Phone</label>
              <input className="input" value={personal.phone} placeholder="+91 98765 43210" onChange={e => setPersonal(f => ({ ...f, phone: e.target.value }))}/></div>
          </div>
          <button type="submit" disabled={savingPersonal} className="btn-primary btn gap-2">
            {savingPersonal ? <Loader size={16} className="animate-spin"/> : <Check size={16}/>}Save Changes
          </button>
        </form>
      </div>

      {/* Hospital verification form */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-2">
          <Building2 size={18} className="text-primary-600"/>
          <h2 className="font-display font-semibold text-slate-900">Hospital Details & Documents</h2>
        </div>

        {/* Approved: read-only view */}
        {isApproved && profileStatus === 'loaded' && (
          <div className="space-y-3 mt-4">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                ['Hospital Name',    profile?.hospitalName],
                ['Type',             profile?.hospitalType],
                ['Registration No.', profile?.registrationNumber],
                ['Specialties',      Array.isArray(profile?.specialties) ? profile.specialties.join(', ') : profile?.specialties],
              ].filter(([,v]) => v).map(([l, v]) => (
                <div key={l} className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-400">{l}</p>
                  <p className="text-sm font-semibold text-slate-900 mt-0.5">{v}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400">To update hospital details after verification, contact an admin.</p>
          </div>
        )}

        {/* Not approved: editable form */}
        {!isApproved && (
          <form onSubmit={submitProfile} className="space-y-5 mt-4">
            <p className="text-xs text-slate-400">
              {profileStatus === 'loaded' ? 'Resubmitting will reset status to "pending".' : 'All 3 documents are required for first submission.'}
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="form-group">
                <label className="label">Hospital Name *</label>
                <input className="input" placeholder="e.g. Apollo Hospitals"
                  value={form.hospitalName} onChange={e => setForm(f => ({ ...f, hospitalName: e.target.value }))}/>
              </div>
              <div className="form-group">
                <label className="label">Registration Number *</label>
                <input className="input" placeholder="e.g. HOS-12345"
                  value={form.registrationNumber} onChange={e => setForm(f => ({ ...f, registrationNumber: e.target.value }))}/>
              </div>
              <div className="form-group">
                <label className="label">Hospital Type</label>
                <select className="input" value={form.hospitalType} onChange={e => setForm(f => ({ ...f, hospitalType: e.target.value }))}>
                  {HOSPITAL_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="label">Specialties <span className="text-slate-400 font-normal">(comma separated)</span></label>
                <input className="input" placeholder="e.g. Cardiology, Neurology"
                  value={form.specialties} onChange={e => setForm(f => ({ ...f, specialties: e.target.value }))}/>
              </div>
            </div>

            <div>
              <p className="label mb-1">Verification Documents *</p>
              <p className="text-xs text-slate-400 mb-3">PDF, JPG or PNG — max 10MB each</p>
              <div className="grid sm:grid-cols-3 gap-4">
                <FileInput label="Registration Document" fileKey="registration" hint="Hospital registration cert."/>
                <FileInput label="Operating License"     fileKey="license"      hint="Valid operating license"/>
                <FileInput label="Authorization Letter"  fileKey="authorization" hint="Govt authorization"/>
              </div>
            </div>

            <button type="submit" disabled={saving} className="btn-primary btn gap-2">
              {saving ? <Loader size={16} className="animate-spin"/> : <Upload size={16}/>}
              {profileStatus === 'loaded' ? 'Resubmit for Verification' : 'Submit for Verification'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default HospitalProfile;
