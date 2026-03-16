import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { doctorAffiliationService, appointmentService } from '../../services/other.service';
import {
  Building2, Search, Check, X, LogOut, Clock,
  Loader, AlertTriangle, MapPin, Phone, Mail,
  Stethoscope, ChevronRight, History,
} from 'lucide-react';
import toast from 'react-hot-toast';

const DoctorHospital = () => {
  const { user } = useAuth();

  const [affiliation,  setAffiliation]  = useState(null);
  const [hospitals,    setHospitals]    = useState([]);
  const [loadingAff,   setLoadingAff]   = useState(true);
  const [loadingHosp,  setLoadingHosp]  = useState(true);

  const [hospSearch,   setHospSearch]   = useState('');
  const [tab,          setTab]          = useState('current'); // current | find | history

  const [affiliating,  setAffiliating]  = useState(false);
  const [leaving,      setLeaving]      = useState(false);
  const [responding,   setResponding]   = useState({}); // { hospitalId: true }

  // ── Load affiliation state ──────────────────────────────
  const loadAffiliation = () => {
    setLoadingAff(true);
    doctorAffiliationService.getStatus()
      .then(r => setAffiliation(r.data.data))
      .catch(() => toast.error('Failed to load affiliation status.'))
      .finally(() => setLoadingAff(false));
  };

  const loadHospitals = () => {
    setLoadingHosp(true);
    appointmentService.getHospitals({ limit: 100 })
      .then(r => setHospitals(r.data.data?.hospitals || []))
      .catch(() => {})
      .finally(() => setLoadingHosp(false));
  };

  useEffect(() => {
    loadAffiliation();
    loadHospitals();
  }, []);

  // ── Actions ─────────────────────────────────────────────
  const handleRequest = async (hospitalUserId, hospitalName) => {
    setAffiliating(true);
    try {
      await doctorAffiliationService.requestJoin(hospitalUserId);
      toast.success(`Request sent to ${hospitalName}! Awaiting approval.`);
      loadAffiliation();
      setTab('current');
    } catch (err) { toast.error(err.response?.data?.message || 'Request failed.'); }
    finally { setAffiliating(false); }
  };

  const handleLeave = async () => {
    const name = affiliation?.currentHospitalProfile?.hospitalName
      || affiliation?.currentHospital?.firstName || 'this hospital';
    if (!window.confirm(`Leave ${name}?`)) return;
    setLeaving(true);
    try {
      await doctorAffiliationService.leaveHospital();
      toast.success('You have left the hospital.');
      loadAffiliation();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed.'); }
    finally { setLeaving(false); }
  };

  const handleAccept = async (hospitalUserId, name) => {
    setResponding(r => ({ ...r, [hospitalUserId]: true }));
    try {
      await doctorAffiliationService.acceptInvite(hospitalUserId);
      toast.success(`You are now affiliated with ${name}!`);
      loadAffiliation();
      setTab('current');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed.'); }
    finally { setResponding(r => ({ ...r, [hospitalUserId]: false })); }
  };

  const handleDecline = async (hospitalUserId) => {
    setResponding(r => ({ ...r, [hospitalUserId]: true }));
    try {
      await doctorAffiliationService.declineInvite(hospitalUserId);
      toast.success('Invitation declined.');
      loadAffiliation();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed.'); }
    finally { setResponding(r => ({ ...r, [hospitalUserId]: false })); }
  };

  // ── Not approved yet ─────────────────────────────────────
  if (user?.verificationStatus !== 'approved') {
    return (
      <div className="page-container animate-fade-in">
        <h1 className="font-display text-2xl font-bold text-slate-900 mb-6">My Hospital</h1>
        <div className="card p-10 text-center max-w-md mx-auto">
          <AlertTriangle size={40} className="text-amber-400 mx-auto mb-3"/>
          <p className="font-semibold text-slate-800 mb-1">Verification Required</p>
          <p className="text-slate-400 text-sm">
            Your account must be verified by admin before you can manage hospital affiliation.
          </p>
        </div>
      </div>
    );
  }

  const isApproved = affiliation?.affiliationStatus === 'approved';
  const isPending  = affiliation?.affiliationStatus === 'pending';
  const hasInvites = (affiliation?.pendingInvites?.length || 0) > 0;
  const h = affiliation?.currentHospitalProfile;
  const hUser = affiliation?.currentHospital;

  const filteredHospitals = hospitals.filter(hosp => {
    const s = hospSearch.toLowerCase();
    return !s
      || (hosp.profile?.hospitalName || '').toLowerCase().includes(s)
      || (hosp.profile?.address?.city || '').toLowerCase().includes(s)
      || (hosp.profile?.specialties || []).join(' ').toLowerCase().includes(s);
  });

  return (
    <div className="page-container animate-fade-in space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">My Hospital</h1>
        <p className="text-slate-400 text-sm mt-1">Manage where you work and your hospital affiliation.</p>
      </div>

      {/* ── Pending invitations banner ───────────────────── */}
      {hasInvites && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-3">
          <p className="font-semibold text-blue-800 flex items-center gap-2">
            <Building2 size={16}/>{affiliation.pendingInvites.length} Hospital Invitation{affiliation.pendingInvites.length > 1 ? 's' : ''}
          </p>
          {affiliation.pendingInvites.map(inv => {
            const hid = inv.hospital?._id || inv.hospital;
            return (
              <div key={hid} className="flex items-center gap-3 bg-white rounded-xl p-3 border border-blue-100">
                <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Building2 size={18} className="text-violet-600"/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 text-sm">{inv.hospitalName}</p>
                  <div className="flex flex-wrap gap-2 text-xs text-slate-500 mt-0.5">
                    {inv.hospitalType && <span className="capitalize">{inv.hospitalType}</span>}
                    {inv.city && <span>· {inv.city}</span>}
                    <span>· Invited {new Date(inv.invitedAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => handleAccept(hid, inv.hospitalName)}
                    disabled={responding[hid]}
                    className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-2 rounded-lg font-medium transition-colors disabled:opacity-60">
                    {responding[hid] ? <Loader size={12} className="animate-spin"/> : <Check size={12}/>}
                    Accept
                  </button>
                  <button onClick={() => handleDecline(hid)}
                    disabled={responding[hid]}
                    className="flex items-center gap-1 border border-red-200 text-red-500 hover:bg-red-50 text-xs px-3 py-2 rounded-lg font-medium transition-colors">
                    <X size={12}/>Decline
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Tabs ─────────────────────────────────────────── */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {[
          { key: 'current', label: isApproved ? 'Current Hospital' : isPending ? 'Pending Request' : 'My Hospital' },
          { key: 'find',    label: 'Find & Join Hospital' },
          { key: 'history', label: 'History' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${tab === t.key ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Current Hospital ─────────────────────────── */}
      {tab === 'current' && (
        <div>
          {loadingAff ? (
            <div className="card p-8 flex items-center justify-center">
              <Loader size={24} className="animate-spin text-slate-300"/>
            </div>
          ) : isApproved && hUser ? (
            <div className="space-y-4">
              {/* Hospital card */}
              <div className="card overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                        <Building2 size={28} className="text-white"/>
                      </div>
                      <div>
                        <p className="text-white font-display font-bold text-xl">
                          {h?.hospitalName || hUser.firstName}
                        </p>
                        <p className="text-emerald-100 text-sm capitalize">
                          {h?.hospitalType} {h?.address?.city && `· ${h.address.city}`}
                        </p>
                      </div>
                    </div>
                    <span className="bg-white/20 text-white text-xs px-3 py-1.5 rounded-full font-semibold">
                      ✓ Affiliated
                    </span>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  {/* Hospital details */}
                  <div className="grid sm:grid-cols-2 gap-3">
                    {h?.specialties?.length > 0 && (
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-xs text-slate-400 mb-1.5 flex items-center gap-1"><Stethoscope size={11}/>Specialties</p>
                        <div className="flex flex-wrap gap-1">
                          {h.specialties.map(s => (
                            <span key={s} className="text-xs bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded-full capitalize">{s}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {(h?.totalBeds || h?.emergencyServices) && (
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-xs text-slate-400 mb-1.5">Facilities</p>
                        {h?.totalBeds && <p className="text-sm text-slate-700">{h.totalBeds} Beds</p>}
                        {h?.emergencyServices && <p className="text-xs text-red-500 font-medium mt-0.5">🚨 24/7 Emergency</p>}
                      </div>
                    )}
                    {h?.contactPhone && (
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-xs text-slate-400 mb-1 flex items-center gap-1"><Phone size={11}/>Contact</p>
                        <p className="text-sm text-slate-700">{h.contactPhone}</p>
                        {h.contactEmail && <p className="text-xs text-slate-500 mt-0.5">{h.contactEmail}</p>}
                      </div>
                    )}
                    {h?.address?.city && (
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-xs text-slate-400 mb-1 flex items-center gap-1"><MapPin size={11}/>Address</p>
                        <p className="text-sm text-slate-700">
                          {[h.address.street, h.address.city, h.address.state].filter(Boolean).join(', ')}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Joined date */}
                  {affiliation?.hospitalHistory?.length > 0 && (() => {
                    const last = [...affiliation.hospitalHistory].reverse().find(e => !e.leftAt);
                    return last?.joinedAt ? (
                      <p className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock size={11}/>Joined {new Date(last.joinedAt).toLocaleDateString()}
                      </p>
                    ) : null;
                  })()}

                  {/* Leave button */}
                  <div className="pt-2 border-t border-slate-100">
                    <button onClick={handleLeave} disabled={leaving}
                      className="flex items-center gap-2 text-red-500 hover:text-red-700 text-sm font-medium transition-colors">
                      {leaving ? <Loader size={15} className="animate-spin"/> : <LogOut size={15}/>}
                      Leave Hospital
                    </button>
                    <p className="text-xs text-slate-400 mt-1">
                      Leaving will remove you from this hospital. You can join another hospital afterwards.
                    </p>
                  </div>
                </div>
              </div>
            </div>

          ) : isPending ? (
            /* Pending request card */
            <div className="card p-6 space-y-4">
              <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                <Clock size={28} className="text-amber-500 flex-shrink-0"/>
                <div className="flex-1">
                  <p className="font-semibold text-slate-900">Request Pending Approval</p>
                  <p className="text-sm text-slate-600 mt-0.5">
                    Your request to join <strong>{h?.hospitalName || hUser?.firstName || 'the hospital'}</strong> is under review.
                    The hospital will approve or reject your request.
                  </p>
                  <p className="text-xs text-amber-600 font-medium mt-1.5">⏳ Waiting for hospital to approve</p>
                </div>
              </div>
              <button onClick={handleLeave} disabled={leaving}
                className="flex items-center gap-2 text-red-500 hover:text-red-700 text-sm font-medium transition-colors">
                {leaving ? <Loader size={14} className="animate-spin"/> : <X size={14}/>}
                Withdraw Request
              </button>
            </div>

          ) : (
            /* No affiliation */
            <div className="card p-10 text-center space-y-4">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto">
                <Building2 size={30} className="text-slate-300"/>
              </div>
              <div>
                <p className="font-display font-semibold text-slate-700 text-lg">Not Affiliated with Any Hospital</p>
                <p className="text-slate-400 text-sm mt-1">
                  Search for a hospital and send a request to join, or wait for a hospital to invite you.
                </p>
              </div>
              {hasInvites ? (
                <p className="text-sm text-blue-600 font-medium">
                  You have {affiliation.pendingInvites.length} pending invitation{affiliation.pendingInvites.length > 1 ? 's' : ''} above ↑
                </p>
              ) : (
                <button onClick={() => setTab('find')}
                  className="btn-primary btn gap-2 mx-auto">
                  <Search size={16}/>Find a Hospital
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Find & Join Hospital ─────────────────────── */}
      {tab === 'find' && (
        <div className="space-y-4">
          {isApproved && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
              You are currently affiliated with <strong>{h?.hospitalName || hUser?.firstName}</strong>. Joining a new hospital will send a request — you will be moved once approved.
            </div>
          )}
          {isPending && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
              You have a pending request. You can withdraw it and request a different hospital.
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input className="input pl-9" placeholder="Search by hospital name, city, or specialty…"
              value={hospSearch} onChange={e => setHospSearch(e.target.value)}/>
          </div>

          {loadingHosp ? (
            <div className="space-y-2">{[...Array(4)].map((_,i) => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse"/>)}</div>
          ) : filteredHospitals.length === 0 ? (
            <p className="text-center text-slate-400 py-8">No hospitals found.</p>
          ) : (
            <div className="space-y-2">
              {filteredHospitals.map(hosp => {
                const isCurrentHosp = hUser?._id === hosp.user._id || hUser === hosp.user._id;
                const alreadyRequested = isPending && (hUser?._id === hosp.user._id || hUser === hosp.user._id);
                return (
                  <div key={hosp.user._id}
                    className={`card p-4 flex items-center gap-3 transition-all ${isCurrentHosp ? 'border-emerald-300 bg-emerald-50' : ''}`}>
                    <div className="w-11 h-11 bg-violet-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Building2 size={20} className="text-violet-600"/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900">{hosp.profile?.hospitalName || hosp.user.firstName}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-slate-400">
                        {hosp.profile?.hospitalType && <span className="capitalize">{hosp.profile.hospitalType}</span>}
                        {hosp.profile?.address?.city && <span>· {hosp.profile.address.city}</span>}
                        {hosp.profile?.totalBeds && <span>· {hosp.profile.totalBeds} beds</span>}
                        {hosp.profile?.emergencyServices && <span className="text-red-500">· 24/7 ER</span>}
                      </div>
                      {hosp.profile?.specialties?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {hosp.profile.specialties.slice(0,3).map(s => (
                            <span key={s} className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded capitalize">{s}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      {isCurrentHosp && isApproved ? (
                        <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                          <Check size={13}/>Current
                        </span>
                      ) : alreadyRequested ? (
                        <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                          <Clock size={13}/>Requested
                        </span>
                      ) : (
                        <button
                          onClick={() => handleRequest(hosp.user._id, hosp.profile?.hospitalName || hosp.user.firstName)}
                          disabled={affiliating}
                          className="flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs px-3 py-2 rounded-xl font-medium transition-colors disabled:opacity-60">
                          {affiliating ? <Loader size={12} className="animate-spin"/> : <ChevronRight size={13}/>}
                          Request Join
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: History ─────────────────────────────────── */}
      {tab === 'history' && (
        <div>
          {loadingAff ? (
            <div className="card p-8 flex items-center justify-center">
              <Loader size={24} className="animate-spin text-slate-300"/>
            </div>
          ) : (affiliation?.hospitalHistory?.length || 0) === 0 ? (
            <div className="card p-10 text-center">
              <History size={36} className="text-slate-200 mx-auto mb-3"/>
              <p className="text-slate-400">No hospital history yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Past & Current Affiliations</p>
              {[...(affiliation.hospitalHistory || [])].reverse().map((entry, i) => (
                <div key={i} className={`card p-4 flex items-center gap-3 ${!entry.leftAt ? 'border-emerald-200 bg-emerald-50' : ''}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${!entry.leftAt ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                    <Building2 size={18} className={!entry.leftAt ? 'text-emerald-600' : 'text-slate-400'}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 text-sm">{entry.name || 'Hospital'}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Joined {entry.joinedAt ? new Date(entry.joinedAt).toLocaleDateString() : '—'}
                      {entry.leftAt
                        ? ` · Left ${new Date(entry.leftAt).toLocaleDateString()}`
                        : ' · Present'}
                    </p>
                  </div>
                  {!entry.leftAt ? (
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium">Current</span>
                  ) : (
                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-full">Past</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DoctorHospital;
