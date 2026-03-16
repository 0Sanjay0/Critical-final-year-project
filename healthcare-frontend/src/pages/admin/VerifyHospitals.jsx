import { useEffect, useState } from 'react';
import { adminService } from '../../services/other.service';
import { Check, X, ChevronDown, ChevronUp, FileText, Download, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';

const UserCard = ({ user, profile, verificationDocs, onVerify }) => {
  const [expanded,  setExpanded]  = useState(false);
  const [rejReason, setRejReason] = useState('');
  const [loading,   setLoading]   = useState(false);

  const handle = async (status) => {
    if (status === 'rejected' && !rejReason.trim()) { toast.error('Please provide a rejection reason.'); return; }
    setLoading(true);
    try { await onVerify(user._id, status, rejReason); } finally { setLoading(false); }
  };

  const STATUS = { pending:'badge-pending', approved:'badge-approved', rejected:'badge-rejected' };
  const nameField = profile?.hospitalName || profile?.labName || '—';

  return (
    <div className="card overflow-hidden">
      <div className="p-4 flex items-start gap-4">
        <div className="w-10 h-10 bg-violet-100 rounded-full flex items-center justify-center font-semibold text-violet-700 flex-shrink-0 text-sm">
          {user.firstName?.[0]}{user.lastName?.[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-slate-900 text-sm">{user.firstName} {user.lastName}</p>
              <p className="text-xs text-slate-400">{user.email}</p>
            </div>
            <span className={`badge ${STATUS[user.verificationStatus]} flex-shrink-0`}>{user.verificationStatus}</span>
          </div>
          {profile
            ? <p className="text-xs text-slate-500 mt-1">{nameField} · Reg: {profile.registrationNumber}</p>
            : <p className="text-xs text-amber-500 mt-1">⚠ No profile submitted yet</p>
          }
        </div>
        <button onClick={()=>setExpanded(e=>!e)} className="text-slate-300 hover:text-slate-500 flex-shrink-0 mt-1">
          {expanded ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 p-4 bg-slate-50 space-y-4 animate-fade-in">
          {profile ? (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Details</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Name',            nameField],
                  ['Registration No.',profile.registrationNumber],
                  ['Type',            profile.hospitalType || profile.labType],
                  ['Specialties',     profile.specialties?.join(', ')],
                  ['Tests Offered',   profile.testsOffered?.join(', ')],
                ].filter(([,v])=>v).map(([l,v])=>(
                  <div key={l}><p className="text-xs text-slate-400">{l}</p><p className="text-sm font-medium text-slate-800">{v}</p></div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Hospital has not submitted their profile yet.</p>
          )}

          {verificationDocs?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Documents ({verificationDocs.length})</p>
              <div className="space-y-1.5">
                {verificationDocs.map((doc,i)=>(
                  <a key={i} href={`${serverUrl}/${doc.filePath}`} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-slate-200 hover:border-primary-300 transition-colors text-sm group">
                    <FileText size={15} className="text-primary-600 flex-shrink-0"/>
                    <span className="flex-1 capitalize text-slate-700">{doc.docType?.replace(/_/g,' ') || `Document ${i+1}`}</span>
                    <Download size={14} className="text-slate-400 group-hover:text-primary-600 transition-colors"/>
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3 pt-1">
            {user.verificationStatus !== 'approved' && (
              <div className="form-group">
                <label className="label">Rejection reason <span className="text-slate-400 font-normal">(required if rejecting)</span></label>
                <input className="input" placeholder="e.g. Documents incomplete" value={rejReason} onChange={e=>setRejReason(e.target.value)}/>
              </div>
            )}
            <div className="flex gap-2">
              {user.verificationStatus !== 'approved' && (
                <button onClick={()=>handle('approved')} disabled={loading} className="btn btn-sm bg-green-600 text-white hover:bg-green-700 gap-1.5">
                  {loading?<span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"/>:<Check size={14}/>}Approve
                </button>
              )}
              {user.verificationStatus !== 'rejected' && (
                <button onClick={()=>handle('rejected')} disabled={loading} className="btn-danger btn btn-sm gap-1.5"><X size={14}/>Reject</button>
              )}
              {user.verificationStatus === 'approved' && <span className="badge-approved badge">✓ Already approved</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const VerifyHospitals = () => {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('pending');

  const load = async () => {
    setLoading(true);
    try {
      if (filter === 'pending' || filter === '') {
        const res = await adminService.getPending();
        let results = (res.data.data.results || []).filter(r => r.user.role === 'hospital');
        if (filter === '') {
          const allRes = await adminService.getUsers({ role: 'hospital' });
          const allUsers = (allRes.data.data.users || []).filter(u => u.verificationStatus !== 'pending');
          const withProfiles = await Promise.all(allUsers.map(async u => {
            try {
              const r = await adminService.getUserById(u._id);
              return { user: r.data.data.user, profile: r.data.data.profile, verificationDocs: r.data.data.profile?.verificationDocs||[] };
            } catch { return { user: u, profile: null, verificationDocs: [] }; }
          }));
          results = [...results.map(r=>({ user:r.user, profile:r.profile, verificationDocs:r.profile?.verificationDocs||[] })), ...withProfiles];
        } else {
          results = results.map(r=>({ user:r.user, profile:r.profile, verificationDocs:r.profile?.verificationDocs||[] }));
        }
        setItems(results);
      } else {
        const allRes = await adminService.getUsers({ role: 'hospital', verificationStatus: filter });
        const allUsers = allRes.data.data.users || [];
        const withProfiles = await Promise.all(allUsers.map(async u => {
          try {
            const r = await adminService.getUserById(u._id);
            return { user:r.data.data.user, profile:r.data.data.profile, verificationDocs:r.data.data.profile?.verificationDocs||[] };
          } catch { return { user:u, profile:null, verificationDocs:[] }; }
        }));
        setItems(withProfiles);
      }
    } catch { toast.error('Failed to load.'); }
    finally { setLoading(false); }
  };

  useEffect(()=>{ load(); },[filter]);

  const verify = async (userId, status, rejectionReason) => {
    try { await adminService.verifyAccount(userId,{status,rejectionReason}); toast.success(`Hospital ${status}.`); load(); }
    catch(err){ toast.error(err.response?.data?.message||'Failed.'); }
  };

  return (
    <div className="page-container animate-fade-in space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Verify Hospitals</h1>
          <p className="text-slate-400 text-sm mt-1">Review hospital applications and verification documents.</p>
        </div>
        <button onClick={load} className="btn-secondary btn btn-sm gap-1.5"><RefreshCw size={14}/>Refresh</button>
      </div>
      <div className="flex gap-2">
        {[['pending','Pending'],['approved','Approved'],['rejected','Rejected'],['','All']].map(([v,l])=>(
          <button key={v} onClick={()=>setFilter(v)} className={`btn btn-sm ${filter===v?'btn-primary':'btn-secondary'}`}>{l}</button>
        ))}
      </div>
      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_,i)=><div key={i} className="card h-20 animate-pulse bg-slate-100"/>)}</div>
      ) : items.length===0 ? (
        <div className="card p-12 text-center"><p className="text-slate-400">No hospitals found.</p></div>
      ) : (
        <div className="space-y-3">
          {items.map(({user,profile,verificationDocs})=>(
            <UserCard key={user._id} user={user} profile={profile} verificationDocs={verificationDocs} onVerify={verify}/>
          ))}
        </div>
      )}
    </div>
  );
};

export default VerifyHospitals;
