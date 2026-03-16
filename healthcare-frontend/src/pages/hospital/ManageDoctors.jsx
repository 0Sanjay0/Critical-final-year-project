import { useEffect, useState } from 'react';
import { hospitalManagementService, appointmentService } from '../../services/other.service';
import { Building2, User, Check, X, Search, UserPlus, Clock, Stethoscope, Loader, Users } from 'lucide-react';
import toast from 'react-hot-toast';

const SPEC_COLORS = {
  cardiology:'bg-red-100 text-red-700', neurology:'bg-purple-100 text-purple-700',
  orthopedics:'bg-orange-100 text-orange-700', pediatrics:'bg-blue-100 text-blue-700',
  general:'bg-slate-100 text-slate-600', gynecology:'bg-pink-100 text-pink-700',
  dermatology:'bg-yellow-100 text-yellow-700', radiology:'bg-cyan-100 text-cyan-700',
};
const specColor = s => SPEC_COLORS[(s||'').toLowerCase()] || 'bg-emerald-100 text-emerald-700';

// ── Affiliated doctor card ────────────────────────────────
const DoctorCard = ({ doctor, type, onRefresh }) => {
  const [acting, setActing] = useState(false);
  const u = doctor.user; const p = doctor;

  const handleApprove = async () => {
    setActing(true);
    try { await hospitalManagementService.approveDoctor(u._id); toast.success(`Dr. ${u.firstName} approved!`); onRefresh(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed.'); }
    finally { setActing(false); }
  };

  const handleRemove = async () => {
    if (!window.confirm(`Remove Dr. ${u.firstName} ${u.lastName}?`)) return;
    setActing(true);
    try { await hospitalManagementService.removeDoctor(u._id); toast.success('Doctor removed.'); onRefresh(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed.'); }
    finally { setActing(false); }
  };

  return (
    <div className="card p-4 flex items-start gap-3">
      <div className="w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-blue-700 text-sm">
        {u.firstName?.[0]}{u.lastName?.[0]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-900 text-sm">Dr. {u.firstName} {u.lastName}</p>
        <p className="text-xs text-slate-400">{u.email}</p>
        <div className="flex flex-wrap gap-2 mt-1.5">
          {p.specialization && <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium capitalize ${specColor(p.specialization)}`}>{p.specialization}</span>}
          {p.experience     && <span className="text-xs text-slate-400">{p.experience} yrs</span>}
          {p.consultationFee && <span className="text-xs text-slate-400">₹{p.consultationFee}</span>}
        </div>
        {p.availableDays?.length > 0 && (
          <p className="text-xs text-slate-400 mt-1">{p.availableDays.map(d => d.slice(0,3).charAt(0).toUpperCase()+d.slice(1,3)).join(', ')}</p>
        )}
      </div>
      <div className="flex flex-col gap-1.5 flex-shrink-0">
        {type === 'pending' && (
          <button onClick={handleApprove} disabled={acting}
            className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition-colors">
            {acting ? <Loader size={12} className="animate-spin"/> : <Check size={12}/>}Approve
          </button>
        )}
        <button onClick={handleRemove} disabled={acting}
          className="flex items-center gap-1 text-red-500 hover:text-red-700 text-xs font-medium transition-colors">
          <X size={12}/>{type === 'pending' ? 'Decline' : 'Remove'}
        </button>
      </div>
    </div>
  );
};

// ── Find & invite doctors tab ─────────────────────────────
const FindDoctors = ({ affiliatedIds, onRefresh }) => {
  const [query,    setQuery]    = useState('');
  const [invited,  setInvited]  = useState({});
  const [results,  setResults]  = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [acting,   setActing]   = useState({});

  const handleSearch = async () => {
    if (!query.trim() && !searched) {
      // Load all doctors on first empty search
    }
    setLoading(true); setSearched(true);
    try {
      const res = await appointmentService.getDoctors(query.trim() ? { specialization: query } : {});
      setResults(res.data.data?.doctors || []);
    } catch { toast.error('Search failed.'); }
    finally { setLoading(false); }
  };

  // Load all on mount
  useEffect(() => { handleSearch(); }, []);

  const [inviting, setInviting] = useState({});

  const handleInvite = async (doctorUserId, name) => {
    setInviting(s => ({ ...s, [doctorUserId]: true }));
    try {
      await hospitalManagementService.inviteDoctor(doctorUserId);
      toast.success(`Invitation sent to Dr. ${name}! They can accept from their profile.`);
      setInvited(s => ({ ...s, [doctorUserId]: true }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send invite.');
    } finally {
      setInviting(s => ({ ...s, [doctorUserId]: false }));
    }
  };

  const filteredResults = results.filter(d => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return `${d.user?.firstName} ${d.user?.lastName}`.toLowerCase().includes(q)
        || (d.profile?.specialization || '').toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
        <p className="font-semibold mb-0.5">How affiliation works</p>
        Doctors request to join your hospital from their profile page. Once they send a request it appears in the <strong>Pending</strong> tab for you to approve. You can share your hospital name with doctors so they can find and request to join you.
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input className="input pl-9 text-sm" placeholder="Search by name or specialization…"
            value={query} onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}/>
        </div>
        <button onClick={handleSearch} disabled={loading} className="btn-primary btn gap-1.5">
          {loading ? <Loader size={14} className="animate-spin"/> : <Search size={14}/>}Search
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(4)].map((_,i) => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse"/>)}</div>
      ) : filteredResults.length === 0 && searched ? (
        <div className="text-center py-8 text-slate-400">No doctors found matching your search.</div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredResults.map(d => {
            const isAffiliated = affiliatedIds.includes(d.user._id);
            const isPending    = d.profile?.affiliationStatus === 'pending';
            return (
              <div key={d.user._id} className={`card p-3 flex items-center gap-3 ${isAffiliated ? 'opacity-60' : ''}`}>
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-blue-700 text-xs">
                  {d.user.firstName?.[0]}{d.user.lastName?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-slate-900">Dr. {d.user.firstName} {d.user.lastName}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-0.5">
                    {d.profile?.specialization && (
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium capitalize ${specColor(d.profile.specialization)}`}>
                        {d.profile.specialization}
                      </span>
                    )}
                    {d.profile?.experience && <span className="text-xs text-slate-400">{d.profile.experience} yrs</span>}
                    {d.profile?.currentHospital && !isAffiliated && (
                      <span className="text-xs text-amber-600">Currently at another hospital</span>
                    )}
                  </div>
                </div>
                <div className="flex-shrink-0 text-xs">
                  {isAffiliated ? (
                    <span className="text-emerald-600 font-medium flex items-center gap-1 text-xs"><Check size={12}/>Your Doctor</span>
                  ) : isPending ? (
                    <span className="text-amber-600 font-medium flex items-center gap-1 text-xs"><Clock size={12}/>Pending</span>
                  ) : invited[d.user._id] ? (
                    <span className="text-blue-600 font-medium flex items-center gap-1 text-xs"><Check size={12}/>Invited</span>
                  ) : (
                    <button
                      onClick={() => handleInvite(d.user._id, `${d.user.firstName} ${d.user.lastName}`)}
                      disabled={inviting[d.user._id]}
                      className="flex items-center gap-1 bg-primary-600 hover:bg-primary-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-60">
                      {inviting[d.user._id] ? <Loader size={11} className="animate-spin"/> : <UserPlus size={11}/>}
                      Invite
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────
const ManageDoctors = () => {
  const [approved, setApproved] = useState([]);
  const [pending,  setPending]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState('approved');
  const [search,   setSearch]   = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([
      hospitalManagementService.getDoctors({ status: 'approved' }),
      hospitalManagementService.getDoctors({ status: 'pending' }),
    ]).then(([aRes, pRes]) => {
      setApproved(aRes.data.data?.doctors || []);
      setPending(pRes.data.data?.doctors  || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const affiliatedIds = approved.map(d => d.user?._id);

  const filterDocs = list => {
    if (!search) return list;
    const s = search.toLowerCase();
    return list.filter(d => `${d.user?.firstName} ${d.user?.lastName}`.toLowerCase().includes(s) || (d.specialization||'').toLowerCase().includes(s));
  };

  const bySpec = {};
  filterDocs(approved).forEach(d => {
    const s = (d.specialization || 'General').toLowerCase();
    if (!bySpec[s]) bySpec[s] = [];
    bySpec[s].push(d);
  });

  return (
    <div className="page-container animate-fade-in space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">Manage Doctors</h1>
        <p className="text-slate-400 text-sm mt-1">Doctors affiliated with your hospital.</p>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { label:'Affiliated Doctors', value: approved.length, icon: Stethoscope, color:'bg-blue-100 text-blue-600' },
          { label:'Pending Requests',   value: pending.length,  icon: Clock,       color: pending.length > 0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400' },
          { label:'Specializations',    value: new Set(approved.map(d=>d.specialization).filter(Boolean)).size, icon: Building2, color:'bg-emerald-100 text-emerald-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}><Icon size={20}/></div>
            <div><p className="text-xl font-display font-bold text-slate-900">{value}</p><p className="text-xs text-slate-400">{label}</p></div>
          </div>
        ))}
      </div>

      {/* Pending banner */}
      {pending.length > 0 && tab !== 'pending' && (
        <button onClick={() => setTab('pending')}
          className="w-full bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2 text-amber-700 hover:bg-amber-100 transition-colors">
          <Clock size={16}/><span className="font-semibold text-sm">{pending.length} affiliation request{pending.length > 1 ? 's' : ''} waiting for approval</span>
          <span className="ml-auto text-xs">Review →</span>
        </button>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {[
          { key:'approved', label:`Affiliated (${approved.length})` },
          { key:'pending',  label:`Pending (${pending.length})`, badge: pending.length },
          { key:'find',     label:'Find Doctors' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${tab === t.key ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
            {t.label}
            {t.badge > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full text-[10px] text-white flex items-center justify-center">{t.badge}</span>}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab !== 'find' && (
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input className="input pl-9 text-sm w-full sm:w-72" placeholder="Filter by name or specialization…"
            value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
      )}

      {loading && tab !== 'find' ? (
        <div className="space-y-3">{[...Array(3)].map((_,i) => <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse"/>)}</div>
      ) : tab === 'find' ? (
        <FindDoctors affiliatedIds={affiliatedIds} onRefresh={load}/>
      ) : tab === 'approved' ? (
        Object.keys(bySpec).length === 0 ? (
          <div className="card p-12 text-center">
            <UserPlus size={40} className="text-slate-200 mx-auto mb-3"/>
            <p className="font-semibold text-slate-400 mb-1">No affiliated doctors yet</p>
            <p className="text-xs text-slate-300">Doctors who request to join your hospital will appear here once approved.</p>
            <button onClick={() => setTab('find')} className="btn-primary btn btn-sm mt-4 gap-1.5"><Search size={13}/>Find Doctors</button>
          </div>
        ) : (
          <div className="space-y-5">
            {Object.entries(bySpec).sort().map(([spec, docs]) => (
              <div key={spec}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs px-2 py-1 rounded-full font-semibold capitalize ${specColor(spec)}`}>{spec}</span>
                  <span className="text-xs text-slate-400">{docs.length} doctor{docs.length > 1 ? 's' : ''}</span>
                </div>
                <div className="space-y-2">
                  {docs.map(d => <DoctorCard key={d.user._id} doctor={d} type="approved" onRefresh={load}/>)}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        filterDocs(pending).length === 0 ? (
          <div className="card p-12 text-center">
            <Clock size={40} className="text-slate-200 mx-auto mb-3"/>
            <p className="text-slate-400">No pending requests.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filterDocs(pending).map(d => <DoctorCard key={d.user._id} doctor={d} type="pending" onRefresh={load}/>)}
          </div>
        )
      )}
    </div>
  );
};

export default ManageDoctors;
