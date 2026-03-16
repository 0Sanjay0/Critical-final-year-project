import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/auth.service';
import { User, Lock, Check, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

const PatientProfile = () => {
  const { user, refreshUser } = useAuth();
  const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';

  const [form, setForm] = useState({
    firstName: user?.firstName || '', lastName: user?.lastName || '',
    phone: user?.phone || '', gender: user?.gender || '',
    dateOfBirth: user?.dateOfBirth ? user.dateOfBirth.split('T')[0] : '',
  });
  const [pw, setPw] = useState({ currentPassword:'', newPassword:'', confirmPassword:'' });
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await authService.updateProfile(form);
      await refreshUser();
      toast.success('Profile updated.');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed.'); }
    finally { setSaving(false); }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    if (pw.newPassword !== pw.confirmPassword) { toast.error('Passwords do not match.'); return; }
    if (pw.newPassword.length < 8) { toast.error('Password must be at least 8 characters.'); return; }
    setSaving(true);
    try {
      await authService.changePassword({ currentPassword: pw.currentPassword, newPassword: pw.newPassword });
      toast.success('Password changed.');
      setPw({ currentPassword:'', newPassword:'', confirmPassword:'' });
    } catch (err) { toast.error(err.response?.data?.message || 'Failed.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="page-container animate-fade-in space-y-6">
      <h1 className="font-display text-2xl font-bold text-slate-900">My Profile</h1>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Avatar */}
        <div className="card p-6 flex flex-col items-center gap-4 text-center lg:col-span-1">
          <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center text-white font-display font-bold text-3xl">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div>
            <p className="font-display font-bold text-lg text-slate-900">{user?.firstName} {user?.lastName}</p>
            <p className="text-slate-400 text-sm">{user?.email}</p>
            <span className="badge-approved badge mt-2">Patient</span>
          </div>
          <div className="w-full text-left space-y-2 border-t border-slate-100 pt-4">
            {user?.phone && <p className="text-xs text-slate-500">📱 {user.phone}</p>}
            {user?.gender && <p className="text-xs text-slate-500 capitalize">👤 {user.gender}</p>}
          </div>
        </div>

        <div className="space-y-5 lg:col-span-2">
          {/* Edit profile */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-5">
              <User size={18} className="text-primary-600"/>
              <h2 className="font-display font-semibold text-slate-900">Personal Information</h2>
            </div>
            <form onSubmit={saveProfile} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="label">First Name</label>
                  <input className="input" value={form.firstName} onChange={e=>setForm(f=>({...f,firstName:e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label className="label">Last Name</label>
                  <input className="input" value={form.lastName} onChange={e=>setForm(f=>({...f,lastName:e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label className="label">Phone</label>
                  <input className="input" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} placeholder="+1 234 567 8900"/>
                </div>
                <div className="form-group">
                  <label className="label">Gender</label>
                  <select className="input" value={form.gender} onChange={e=>setForm(f=>({...f,gender:e.target.value}))}>
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Date of Birth</label>
                  <input type="date" className="input" value={form.dateOfBirth} onChange={e=>setForm(f=>({...f,dateOfBirth:e.target.value}))}/>
                </div>
              </div>
              <button type="submit" disabled={saving} className="btn-primary btn gap-2">
                {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <Check size={16}/>}
                Save Changes
              </button>
            </form>
          </div>

          {/* Change password */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-5">
              <Lock size={18} className="text-primary-600"/>
              <h2 className="font-display font-semibold text-slate-900">Change Password</h2>
            </div>
            <form onSubmit={savePassword} className="space-y-4">
              {[
                ['currentPassword','Current Password'],
                ['newPassword','New Password'],
                ['confirmPassword','Confirm New Password'],
              ].map(([key, label]) => (
                <div key={key} className="form-group">
                  <label className="label">{label}</label>
                  <div className="relative">
                    <input type={showPw?'text':'password'} className="input pr-10"
                      value={pw[key]} onChange={e=>setPw(p=>({...p,[key]:e.target.value}))}/>
                    <button type="button" onClick={()=>setShowPw(s=>!s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      {showPw?<EyeOff size={16}/>:<Eye size={16}/>}
                    </button>
                  </div>
                </div>
              ))}
              <button type="submit" disabled={saving} className="btn-primary btn gap-2">
                {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <Lock size={16}/>}
                Update Password
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientProfile;
