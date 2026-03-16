import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { verificationService, doctorAffiliationService } from '../../services/other.service';
import api from '../../services/api';
import { authService } from '../../services/auth.service';
import { User, Upload, File, X, Check, Settings, Loader, Building2, LogOut, Search, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const cap  = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

const DoctorProfile = () => {
  const { user, refreshUser } = useAuth();

  // profileStatus: 'loading' | 'none' | 'loaded'
  const [profileStatus, setProfileStatus] = useState('loading');
  const [profile,       setProfile]       = useState(null);
  const [saving,        setSaving]        = useState(false);
  const [savingBasic,   setSavingBasic]   = useState(false);
  const [editBasic,     setEditBasic]     = useState(false);
  const [files, setFiles] = useState({ registration: null, license: null, authorization: null });

  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName:  user?.lastName  || '',
    phone:     user?.phone     || '',
  });

  const [profForm, setProfForm] = useState({
    specialization: '', qualifications: '', licenseNumber: '',
    consultationFee: '', experience: '', availableDays: [],
  });

  const [basicEdit, setBasicEdit] = useState({
    consultationFee: '', experience: '', availableDays: [],
  });

  // ── Affiliation state ──────────────────────────────────
  const [affiliation,   setAffiliation]   = useState(null); // full affiliation status
  const [hospitals,     setHospitals]     = useState([]);
  const [hospSearch,    setHospSearch]    = useState('');
  const [affiliating,   setAffiliating]   = useState(false);
  const [leaving,       setLeaving]       = useState(false);
  const [responding,    setResponding]    = useState({}); // {hospitalId: true}

  // Load approved hospitals list + doctor's affiliation status
  const loadAffiliation = () => {
    doctorAffiliationService.getStatus()
      .then(r => setAffiliation(r.data.data))
      .catch(() => {});
    api.get('/appointments/hospitals/list?limit=100')
      .then(r => setHospitals(r.data.data?.hospitals || []))
      .catch(() => {});
  };

  useEffect(() => {
    if (user?.verificationStatus === 'approved') loadAffiliation();
  }, [user?.verificationStatus]);

  const handleRequestJoin = async (hospitalUserId) => {
    setAffiliating(true);
    try {
      await doctorAffiliationService.requestJoin(hospitalUserId);
      toast.success('Request sent! Awaiting hospital approval.');
      loadAffiliation();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed.'); }
    finally { setAffiliating(false); }
  };

  const handleAcceptInvite = async (hospitalUserId, name) => {
    setResponding(r => ({ ...r, [hospitalUserId]: true }));
    try {
      await doctorAffiliationService.acceptInvite(hospitalUserId);
      toast.success(`You are now affiliated with ${name}!`);
      loadAffiliation();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed.'); }
    finally { setResponding(r => ({ ...r, [hospitalUserId]: false })); }
  };

  const handleDeclineInvite = async (hospitalUserId) => {
    setResponding(r => ({ ...r, [hospitalUserId]: true }));
    try {
      await doctorAffiliationService.declineInvite(hospitalUserId);
      toast.success('Invitation declined.');
      loadAffiliation();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed.'); }
    finally { setResponding(r => ({ ...r, [hospitalUserId]: false })); }
  };

  const handleLeave = async () => {
    if (!window.confirm('Leave your current hospital?')) return;
    setLeaving(true);
    try {
      await doctorAffiliationService.leaveHospital();
      toast.success('You have left the hospital.');
      loadAffiliation();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed.'); }
    finally { setLeaving(false); }
  };

  const loadProfile = () => {
    setProfileStatus('loading');
    verificationService.getProfile()
      .then(r => {
        const p = r.data.data?.profile;
        if (p) {
          const days = (p.availableDays || []).map(cap);
          setProfForm({
            specialization:  p.specialization  || '',
            qualifications:  Array.isArray(p.qualifications) ? p.qualifications.join(', ') : (p.qualifications || ''),
            licenseNumber:   p.licenseNumber   || '',
            consultationFee: p.consultationFee != null ? String(p.consultationFee) : '',
            experience:      p.experience      != null ? String(p.experience)      : '',
            availableDays:   days,
          });
          setBasicEdit({
            consultationFee: p.consultationFee != null ? String(p.consultationFee) : '',
            experience:      p.experience      != null ? String(p.experience)      : '',
            availableDays:   days,
          });
          setProfile(p);
          setProfileStatus('loaded');
        } else {
          setProfile(null);
          setProfileStatus('none');
        }
      })
      .catch(() => {
        setProfile(null);
        setProfileStatus('none');
      });
  };

  useEffect(() => {
    if (user?.role === 'doctor') loadProfile();
  }, [user?._id]);

  // Sync name/phone form when user loads
  useEffect(() => {
    setForm({
      firstName: user?.firstName || '',
      lastName:  user?.lastName  || '',
      phone:     user?.phone     || '',
    });
  }, [user?.firstName, user?.lastName, user?.phone]);

  const savePersonal = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await authService.updateProfile(form);
      await refreshUser();
      toast.success('Personal info updated.');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed.'); }
    finally { setSaving(false); }
  };

  const saveBasicDetails = async (e) => {
    e.preventDefault();
    setSavingBasic(true);
    try {
      const fd = new FormData();
      fd.append('specialization',  profForm.specialization);
      fd.append('licenseNumber',   profForm.licenseNumber);
      const quals = profForm.qualifications
        ? profForm.qualifications.split(',').map(q => q.trim()).filter(Boolean) : [];
      fd.append('qualifications',  JSON.stringify(quals));
      fd.append('consultationFee', basicEdit.consultationFee || '');
      fd.append('experience',      basicEdit.experience      || '');
      fd.append('availableDays',   JSON.stringify(basicEdit.availableDays.map(d => d.toLowerCase())));
      await verificationService.setupDoctor(fd);
      toast.success('Practice details updated successfully!');
      setEditBasic(false);
      loadProfile();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to update.'); }
    finally { setSavingBasic(false); }
  };

  const submitVerification = async (e) => {
    e.preventDefault();
    if (!profForm.specialization.trim() || !profForm.licenseNumber.trim()) {
      toast.error('Specialization and license number are required.'); return;
    }
    if (profileStatus === 'none' && (!files.registration || !files.license || !files.authorization)) {
      toast.error('All 3 documents are required for first-time submission.'); return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('specialization',  profForm.specialization.trim());
      fd.append('licenseNumber',   profForm.licenseNumber.trim());
      const quals = profForm.qualifications
        ? profForm.qualifications.split(',').map(q => q.trim()).filter(Boolean) : [];
      fd.append('qualifications',  JSON.stringify(quals));
      if (profForm.consultationFee) fd.append('consultationFee', profForm.consultationFee);
      if (profForm.experience)      fd.append('experience',      profForm.experience);
      fd.append('availableDays',    JSON.stringify(profForm.availableDays.map(d => d.toLowerCase())));
      if (files.registration)  fd.append('registrationDoc',  files.registration);
      if (files.license)       fd.append('licenseDoc',       files.license);
      if (files.authorization) fd.append('authorizationDoc', files.authorization);
      await verificationService.setupDoctor(fd);
      toast.success('Profile submitted for verification!');
      await refreshUser();
      loadProfile();
    } catch (err) { toast.error(err.response?.data?.message || 'Submission failed.'); }
    finally { setSaving(false); }
  };

  const toggleDay = (day, target) => {
    if (target === 'basic') {
      setBasicEdit(f => ({
        ...f,
        availableDays: f.availableDays.includes(day)
          ? f.availableDays.filter(d => d !== day) : [...f.availableDays, day],
      }));
    } else {
      setProfForm(f => ({
        ...f,
        availableDays: f.availableDays.includes(day)
          ? f.availableDays.filter(d => d !== day) : [...f.availableDays, day],
      }));
    }
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
            <span className="text-xs font-medium text-slate-700 truncate max-w-[120px]">{files[fileKey].name}</span>
            <button type="button" onClick={() => setFiles(f => ({ ...f, [fileKey]: null }))} className="text-slate-400 hover:text-red-500"><X size={14}/></button>
          </div>
        ) : (
          <label className="cursor-pointer">
            <Upload size={18} className="text-slate-300 mx-auto mb-1"/>
            <p className="text-xs text-slate-400">Click to upload</p>
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
      <h1 className="font-display text-2xl font-bold text-slate-900">Doctor Profile</h1>

      {/* Status banner */}
      <div className={`border rounded-xl p-4 flex items-start gap-3
        ${isApproved ? 'bg-green-50 border-green-200 text-green-800'
          : user?.verificationStatus === 'rejected' ? 'bg-red-50 border-red-200 text-red-800'
          : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
        <span className="text-lg flex-shrink-0">
          {isApproved ? '✅' : user?.verificationStatus === 'rejected' ? '❌' : '⏳'}
        </span>
        <div>
          <p className="font-semibold text-sm">
            {isApproved ? 'Verified Doctor — Full Access'
              : user?.verificationStatus === 'rejected' ? 'Verification Rejected'
              : profileStatus === 'none' ? 'Profile Not Submitted'
              : 'Verification Pending Review'}
          </p>
          <p className="text-xs mt-0.5 opacity-80">
            {isApproved && 'You can update your consultation fee, experience and available days below.'}
            {user?.verificationStatus === 'pending'  && 'Your documents are under admin review. No changes needed.'}
            {user?.verificationStatus === 'rejected' && `Reason: ${user.rejectionReason || 'Please resubmit your documents.'}`}
            {profileStatus === 'none' && user?.verificationStatus !== 'rejected' && 'Submit the form below to begin verification.'}
          </p>
        </div>
      </div>

      {/* ── Personal Information ─────────────────────────────── */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-5">
          <User size={18} className="text-primary-600"/>
          <h2 className="font-display font-semibold text-slate-900">Personal Information</h2>
        </div>
        <form onSubmit={savePersonal} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="label">First Name</label>
              <input className="input" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}/>
            </div>
            <div className="form-group">
              <label className="label">Last Name</label>
              <input className="input" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}/>
            </div>
            <div className="form-group">
              <label className="label">Phone</label>
              <input className="input" value={form.phone} placeholder="+91 98765 43210" onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}/>
            </div>
          </div>
          <button type="submit" disabled={saving} className="btn-primary btn gap-2">
            {saving ? <Loader size={16} className="animate-spin"/> : <Check size={16}/>}
            Save Changes
          </button>
        </form>
      </div>

      {/* ── APPROVED: Practice Details editor ───────────────── */}
      {isApproved && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Settings size={18} className="text-primary-600"/>
              <h2 className="font-display font-semibold text-slate-900">Practice Details</h2>
            </div>
            {profileStatus === 'loading' && <Loader size={16} className="animate-spin text-slate-400"/>}
            {profileStatus === 'loaded' && !editBasic && (
              <button onClick={() => setEditBasic(true)} className="btn-secondary btn btn-sm">Edit</button>
            )}
          </div>

          {profileStatus === 'loading' && (
            <div className="space-y-3">
              {[...Array(3)].map((_,i) => <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse"/>)}
            </div>
          )}

          {profileStatus === 'none' && (
            <div className="text-center py-6 text-slate-400 text-sm">
              No profile data found. Submit your verification below first.
            </div>
          )}

          {profileStatus === 'loaded' && !editBasic && (
            /* Read-only view */
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                ['Specialization',   profile?.specialization || '—'],
                ['License No.',      profile?.licenseNumber  || '—'],
                ['Qualifications',   Array.isArray(profile?.qualifications) ? profile.qualifications.join(', ') : (profile?.qualifications || '—')],
                ['Experience',       profile?.experience != null ? `${profile.experience} years` : '—'],
                ['Consultation Fee', profile?.consultationFee != null ? `₹${profile.consultationFee}` : '—'],
                ['Available Days',   profile?.availableDays?.map(cap).join(', ') || '—'],
              ].map(([l, v]) => (
                <div key={l} className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-400">{l}</p>
                  <p className="text-sm font-semibold text-slate-900 mt-0.5">{v}</p>
                </div>
              ))}
            </div>
          )}

          {profileStatus === 'loaded' && editBasic && (
            /* Edit form — only fee, experience, days */
            <form onSubmit={saveBasicDetails} className="space-y-5">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
                These fields can be updated without re-verification. Specialization and license are read-only after approval.
              </div>

              {/* Read-only fields */}
              <div className="grid sm:grid-cols-2 gap-4 opacity-60 pointer-events-none">
                <div className="form-group">
                  <label className="label">Specialization (locked)</label>
                  <input className="input bg-slate-100" value={profForm.specialization} readOnly/>
                </div>
                <div className="form-group">
                  <label className="label">License Number (locked)</label>
                  <input className="input bg-slate-100" value={profForm.licenseNumber} readOnly/>
                </div>
              </div>

              {/* Editable fields */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="label">Consultation Fee (₹)</label>
                  <input type="number" min="0" className="input" placeholder="e.g. 500"
                    value={basicEdit.consultationFee}
                    onChange={e => setBasicEdit(f => ({ ...f, consultationFee: e.target.value }))}/>
                </div>
                <div className="form-group">
                  <label className="label">Years of Experience</label>
                  <input type="number" min="0" max="70" className="input" placeholder="e.g. 5"
                    value={basicEdit.experience}
                    onChange={e => setBasicEdit(f => ({ ...f, experience: e.target.value }))}/>
                </div>
              </div>

              <div className="form-group">
                <label className="label">Available Days</label>
                <p className="text-xs text-slate-400 mb-2">Click to toggle days you are available</p>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map(d => (
                    <button key={d} type="button" onClick={() => toggleDay(d, 'basic')}
                      className={`btn btn-sm ${basicEdit.availableDays.includes(d) ? 'btn-primary' : 'btn-secondary'}`}>
                      {d.slice(0, 3)}
                    </button>
                  ))}
                </div>
                {basicEdit.availableDays.length > 0 && (
                  <p className="text-xs text-slate-500 mt-2">Selected: {basicEdit.availableDays.join(', ')}</p>
                )}
              </div>

              <div className="flex gap-2">
                <button type="submit" disabled={savingBasic} className="btn-primary btn gap-2">
                  {savingBasic ? <Loader size={16} className="animate-spin"/> : <Check size={16}/>}
                  Save Changes
                </button>
                <button type="button" onClick={() => setEditBasic(false)} className="btn-secondary btn">
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ── NOT approved: full verification form ───────────── */}
      {!isApproved && (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-1">
            <Upload size={18} className="text-primary-600"/>
            <h2 className="font-display font-semibold text-slate-900">
              {user?.verificationStatus === 'pending' ? 'Submitted Profile' : 'Professional Details & Documents'}
            </h2>
          </div>

          {user?.verificationStatus === 'pending' ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-3">
              <p className="text-sm text-amber-800 font-semibold">Documents under review</p>
              <p className="text-xs text-amber-700 mt-1">
                Your verification is pending admin approval. You will be notified once reviewed.
                If you need to make changes, you can resubmit below — this will reset your status to pending.
              </p>
              <button className="btn-secondary btn btn-sm mt-3"
                onClick={() => { /* show form */ document.getElementById('resubmit-form')?.classList.remove('hidden'); }}>
                Resubmit Documents
              </button>
            </div>
          ) : null}

          <div id="resubmit-form" className={user?.verificationStatus === 'pending' ? 'hidden mt-4' : 'mt-4'}>
            <p className="text-xs text-slate-400 mb-5">
              {profileStatus === 'loaded' ? 'Resubmitting will reset your status to "pending".' : 'All 3 documents required for first submission.'}
            </p>
            <form onSubmit={submitVerification} className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="label">Specialization *</label>
                  <input className="input" placeholder="e.g. Cardiology"
                    value={profForm.specialization} onChange={e => setProfForm(f => ({ ...f, specialization: e.target.value }))}/>
                </div>
                <div className="form-group">
                  <label className="label">License Number *</label>
                  <input className="input" placeholder="e.g. MCI-12345"
                    value={profForm.licenseNumber} onChange={e => setProfForm(f => ({ ...f, licenseNumber: e.target.value }))}/>
                </div>
                <div className="form-group">
                  <label className="label">Qualifications <span className="text-slate-400 font-normal">(comma separated)</span></label>
                  <input className="input" placeholder="e.g. MBBS, MD"
                    value={profForm.qualifications} onChange={e => setProfForm(f => ({ ...f, qualifications: e.target.value }))}/>
                </div>
                <div className="form-group">
                  <label className="label">Years of Experience</label>
                  <input type="number" min="0" className="input" placeholder="5"
                    value={profForm.experience} onChange={e => setProfForm(f => ({ ...f, experience: e.target.value }))}/>
                </div>
                <div className="form-group">
                  <label className="label">Consultation Fee (₹)</label>
                  <input type="number" min="0" className="input" placeholder="500"
                    value={profForm.consultationFee} onChange={e => setProfForm(f => ({ ...f, consultationFee: e.target.value }))}/>
                </div>
              </div>
              <div className="form-group">
                <label className="label">Available Days</label>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map(d => (
                    <button key={d} type="button" onClick={() => toggleDay(d, 'prof')}
                      className={`btn btn-sm ${profForm.availableDays.includes(d) ? 'btn-primary' : 'btn-secondary'}`}>
                      {d.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="label mb-1">Verification Documents *</p>
                <p className="text-xs text-slate-400 mb-3">PDF, JPG, PNG — max 10MB each</p>
                <div className="grid sm:grid-cols-3 gap-4">
                  <FileInput label="Registration Document" fileKey="registration" hint="Hospital/clinic registration"/>
                  <FileInput label="Medical License"       fileKey="license"      hint="Valid practitioner license"/>
                  <FileInput label="Authorization Letter"  fileKey="authorization" hint="Govt ID or authorization"/>
                </div>
              </div>
              <button type="submit" disabled={saving} className="btn-primary btn gap-2">
                {saving ? <Loader size={16} className="animate-spin"/> : <Upload size={16}/>}
                {profileStatus === 'loaded' ? 'Resubmit Profile' : 'Submit for Verification'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
      {/* ── Hospital Affiliation Card ────────────────────────── */}
      {user?.verificationStatus === 'approved' && (
        <div className="card p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Building2 size={18} className="text-primary-600"/>
            <h2 className="font-display font-semibold text-slate-900">Hospital Affiliation</h2>
          </div>

          {/* ── Pending invitations from hospitals ─────────── */}
          {affiliation?.pendingInvites?.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Hospital Invitations ({affiliation.pendingInvites.length})
              </p>
              {affiliation.pendingInvites.map(inv => (
                <div key={inv.hospital?._id || inv.hospital}
                  className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Building2 size={18} className="text-blue-600"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 text-sm">{inv.hospitalName}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {inv.hospitalType && <span className="capitalize">{inv.hospitalType} · </span>}
                      {inv.city && <span>{inv.city} · </span>}
                      Invited {new Date(inv.invitedAt).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-blue-600 font-medium mt-0.5">🏥 Wants you to join their hospital</p>
                  </div>
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => handleAcceptInvite(inv.hospital?._id || inv.hospital, inv.hospitalName)}
                      disabled={responding[inv.hospital?._id || inv.hospital]}
                      className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-60">
                      {responding[inv.hospital?._id || inv.hospital]
                        ? <Loader size={11} className="animate-spin"/> : <Check size={11}/>}
                      Accept
                    </button>
                    <button
                      onClick={() => handleDeclineInvite(inv.hospital?._id || inv.hospital)}
                      disabled={responding[inv.hospital?._id || inv.hospital]}
                      className="flex items-center gap-1 text-red-500 hover:text-red-700 text-xs font-medium transition-colors justify-center">
                      <X size={11}/>Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Currently affiliated ─────────────────────────── */}
          {affiliation?.affiliationStatus === 'approved' && affiliation?.currentHospital && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Current Hospital</p>
              <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Building2 size={22} className="text-emerald-600"/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900">
                    {affiliation.currentHospitalProfile?.hospitalName
                      || affiliation.currentHospital?.firstName
                      || 'Hospital'}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-1 text-xs text-slate-500">
                    {affiliation.currentHospitalProfile?.hospitalType && (
                      <span className="capitalize">{affiliation.currentHospitalProfile.hospitalType}</span>
                    )}
                    {affiliation.currentHospitalProfile?.address?.city && (
                      <span>· {affiliation.currentHospitalProfile.address.city}</span>
                    )}
                    {affiliation.currentHospitalProfile?.contactPhone && (
                      <span>· {affiliation.currentHospitalProfile.contactPhone}</span>
                    )}
                  </div>
                  <p className="text-xs text-emerald-600 font-medium mt-1">✓ Actively affiliated</p>
                </div>
                <button onClick={handleLeave} disabled={leaving}
                  className="flex items-center gap-1.5 text-red-400 hover:text-red-600 text-xs font-medium transition-colors flex-shrink-0">
                  {leaving ? <Loader size={12} className="animate-spin"/> : <LogOut size={12}/>}
                  Leave
                </button>
              </div>
            </div>
          )}

          {/* ── Pending request sent by doctor ───────────────── */}
          {affiliation?.affiliationStatus === 'pending' && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Request Sent</p>
              <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                <Clock size={22} className="text-amber-500 flex-shrink-0"/>
                <div className="flex-1">
                  <p className="font-semibold text-slate-900 text-sm">
                    {affiliation.currentHospitalProfile?.hospitalName
                      || affiliation.currentHospital?.firstName
                      || 'Hospital'}
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Your request is pending hospital approval.
                  </p>
                </div>
                <button onClick={handleLeave} disabled={leaving}
                  className="text-xs text-red-500 hover:text-red-700 font-medium flex-shrink-0 transition-colors">
                  Withdraw
                </button>
              </div>
            </div>
          )}

          {/* ── No affiliation — search hospitals ────────────── */}
          {(!affiliation || affiliation.affiliationStatus === 'none') && affiliation?.pendingInvites?.length === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-slate-500">
                Search for a hospital to request affiliation, or wait for a hospital to invite you.
              </p>
            </div>
          )}

          {/* ── Search to request join ────────────────────────── */}
          {(!affiliation || ['none'].includes(affiliation.affiliationStatus)) && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Request to Join a Hospital
              </p>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                <input className="input pl-9 text-sm" placeholder="Search hospital by name or city…"
                  value={hospSearch} onChange={e => setHospSearch(e.target.value)}/>
              </div>
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {hospitals
                  .filter(h => {
                    const s = hospSearch.toLowerCase();
                    return !s
                      || (h.profile?.hospitalName || '').toLowerCase().includes(s)
                      || (h.profile?.address?.city || '').toLowerCase().includes(s);
                  })
                  .slice(0, 8)
                  .map(h => (
                    <div key={h.user._id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-primary-200 hover:bg-primary-50 transition-all">
                      <div className="w-9 h-9 bg-violet-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Building2 size={15} className="text-violet-600"/>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-slate-900 truncate">
                          {h.profile?.hospitalName || h.user.firstName}
                        </p>
                        <p className="text-xs text-slate-400">
                          {h.profile?.hospitalType} · {h.profile?.address?.city || '—'}
                        </p>
                      </div>
                      <button onClick={() => handleRequestJoin(h.user._id)} disabled={affiliating}
                        className="btn-primary btn btn-sm flex-shrink-0 gap-1">
                        {affiliating ? <Loader size={12} className="animate-spin"/> : <Check size={12}/>}
                        Request
                      </button>
                    </div>
                  ))}
                {hospitals.length === 0 && (
                  <p className="text-center text-slate-400 text-sm py-4">No hospitals found.</p>
                )}
              </div>
            </div>
          )}

          {/* ── Past affiliations history ─────────────────────── */}
          {affiliation?.hospitalHistory?.filter(h => h.leftAt).length > 0 && (
            <div className="pt-3 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Past Affiliations</p>
              <div className="space-y-1.5">
                {affiliation.hospitalHistory.filter(h => h.leftAt).map((h, i) => (
                  <div key={i} className="flex items-center justify-between text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2">
                    <span className="font-medium text-slate-600">{h.name || 'Hospital'}</span>
                    <span>{new Date(h.joinedAt).toLocaleDateString()} — {new Date(h.leftAt).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

};

export default DoctorProfile;
