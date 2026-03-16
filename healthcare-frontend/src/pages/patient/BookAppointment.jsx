import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { appointmentService } from '../../services/other.service';
import { patientService } from '../../services/patient.service';
import { Building2, User, Search, Check, ChevronRight, Calendar, FileText, Video, MapPin, Stethoscope, LayoutGrid } from 'lucide-react';
import toast from 'react-hot-toast';

const STEPS = ['Browse', 'Details', 'Records', 'Review'];

// Common medical specializations for category browsing
const SPECIALIZATIONS = [
  { key: 'general',         label: 'General Medicine',  icon: '🩺', color: 'bg-slate-100' },
  { key: 'cardiology',      label: 'Cardiology',        icon: '❤️',  color: 'bg-red-50' },
  { key: 'neurology',       label: 'Neurology',         icon: '🧠',  color: 'bg-purple-50' },
  { key: 'orthopedics',     label: 'Orthopedics',       icon: '🦴',  color: 'bg-orange-50' },
  { key: 'pediatrics',      label: 'Pediatrics',        icon: '👶',  color: 'bg-blue-50' },
  { key: 'gynecology',      label: 'Gynecology',        icon: '🌸',  color: 'bg-pink-50' },
  { key: 'dermatology',     label: 'Dermatology',       icon: '✨',  color: 'bg-yellow-50' },
  { key: 'ent',             label: 'ENT',               icon: '👂',  color: 'bg-teal-50' },
  { key: 'ophthalmology',   label: 'Ophthalmology',     icon: '👁️',  color: 'bg-cyan-50' },
  { key: 'psychiatry',      label: 'Psychiatry',        icon: '🧘',  color: 'bg-indigo-50' },
  { key: 'oncology',        label: 'Oncology',          icon: '🔬',  color: 'bg-rose-50' },
  { key: 'radiology',       label: 'Radiology',         icon: '📡',  color: 'bg-violet-50' },
];

const BookAppointment = () => {
  const navigate = useNavigate();
  const [browseMode, setBrowseMode]   = useState('hospital'); // hospital | category
  const [step, setStep]               = useState(0);
  const [hospitals, setHospitals]     = useState([]);
  const [doctors,   setDoctors]       = useState([]);
  const [records,   setRecords]       = useState([]);
  const [loading,   setLoading]       = useState(true);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [booking,   setBooking]       = useState(false);
  const [search,    setSearch]        = useState('');
  const [selectedSpec, setSelectedSpec] = useState(null);

  const [selectedHospital, setSelectedHospital] = useState(null);
  const [selectedDoctor,   setSelectedDoctor]   = useState(null);
  const [sharedRecords,    setSharedRecords]     = useState([]);
  const [form, setForm] = useState({
    reasonForVisit: '', symptoms: '',
    preferredDate: '', preferredTime: '',
    mode: 'offline',
  });

  useEffect(() => {
    Promise.all([
      appointmentService.getHospitals({ limit: 50 }),
      patientService.getRecords(),
    ]).then(([hRes, rRes]) => {
      setHospitals(hRes.data.data?.hospitals || []);
      setRecords(rRes.data.data?.records || []);
    }).finally(() => setLoading(false));
  }, []);

  // Load doctors when hospital selected or spec selected
  const loadDoctors = async (hospitalId, spec) => {
    setLoadingDoctors(true);
    try {
      const params = {};
      if (hospitalId) params.hospitalId     = hospitalId;
      if (spec)       params.specialization = spec;
      const res = await appointmentService.getDoctors(params);
      setDoctors(res.data.data?.doctors || []);
    } catch (_) {}
    finally { setLoadingDoctors(false); }
  };

  const handleSelectHospital = (h) => {
    setSelectedHospital(h);
    setSelectedDoctor(null);
    setSearch('');
    loadDoctors(h.user._id, null);
    setStep(0.5); // intermediate step — pick doctor within hospital
  };

  const handleSelectSpec = (spec) => {
    setSelectedSpec(spec);
    setSelectedHospital(null);
    setSelectedDoctor(null);
    setSearch('');
    loadDoctors(null, spec.key);
    setStep(0.5);
  };

  const handleSelectDoctor = (d) => {
    setSelectedDoctor(d);
    setSearch('');
    setStep(1);
  };

  const handleSkipDoctor = () => {
    setSelectedDoctor(null);
    setStep(1);
  };

  const toggleRecord = id => setSharedRecords(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const handleBook = async () => {
    if (!selectedHospital && !selectedDoctor) { toast.error('Please select a hospital or doctor.'); return; }
    if (!form.reasonForVisit.trim()) { toast.error('Please enter a reason for visit.'); return; }
    // If only doctor selected (category mode), get hospital from doctor profile
    const hospitalId = selectedHospital?.user._id
      || (selectedDoctor?.profile?.currentHospital?._id || selectedDoctor?.profile?.currentHospital);
    if (!hospitalId) { toast.error('Could not determine hospital. Please select via hospital mode.'); return; }

    setBooking(true);
    try {
      await appointmentService.book({
        hospitalId,
        doctorId:        selectedDoctor?.user._id || undefined,
        reasonForVisit:  form.reasonForVisit,
        symptoms:        form.symptoms,
        preferredDate:   form.preferredDate,
        preferredTime:   form.preferredTime,
        mode:            form.mode,
        sharedRecordIds: sharedRecords,
      });
      toast.success('Request sent! Hospital will schedule your appointment shortly.');
      navigate('/patient/appointments');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Booking failed.');
    } finally { setBooking(false); }
  };

  const filteredHospitals = hospitals.filter(h => {
    const s = search.toLowerCase();
    return !s
      || (h.profile?.hospitalName || '').toLowerCase().includes(s)
      || (h.profile?.address?.city || '').toLowerCase().includes(s)
      || (h.profile?.specialties || []).join(' ').toLowerCase().includes(s);
  });

  const filteredDoctors = doctors.filter(d => {
    const s = search.toLowerCase();
    return !s
      || `${d.user?.firstName} ${d.user?.lastName}`.toLowerCase().includes(s)
      || (d.profile?.specialization || '').toLowerCase().includes(s);
  });

  return (
    <div className="page-container animate-fade-in space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">Book Appointment</h1>
        <p className="text-slate-400 text-sm mt-1">Find the right care for you.</p>
      </div>

      {/* ── Step 0: Browse mode ─────────────────────────── */}
      {step === 0 && (
        <div className="space-y-5">
          {/* Mode toggle */}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setBrowseMode('hospital')}
              className={`p-4 rounded-2xl border-2 text-left transition-all ${browseMode === 'hospital' ? 'border-primary-500 bg-primary-50' : 'border-slate-200 hover:border-slate-300'}`}>
              <Building2 size={22} className={browseMode === 'hospital' ? 'text-primary-600 mb-2' : 'text-slate-400 mb-2'}/>
              <p className={`font-semibold text-sm ${browseMode === 'hospital' ? 'text-primary-700' : 'text-slate-700'}`}>By Hospital</p>
              <p className="text-xs text-slate-400 mt-0.5">Choose hospital first, then pick a doctor</p>
            </button>
            <button onClick={() => setBrowseMode('category')}
              className={`p-4 rounded-2xl border-2 text-left transition-all ${browseMode === 'category' ? 'border-primary-500 bg-primary-50' : 'border-slate-200 hover:border-slate-300'}`}>
              <LayoutGrid size={22} className={browseMode === 'category' ? 'text-primary-600 mb-2' : 'text-slate-400 mb-2'}/>
              <p className={`font-semibold text-sm ${browseMode === 'category' ? 'text-primary-700' : 'text-slate-700'}`}>By Specialization</p>
              <p className="text-xs text-slate-400 mt-0.5">Choose specialty, see matching doctors</p>
            </button>
          </div>

          {/* By Hospital */}
          {browseMode === 'hospital' && (
            <div className="card p-5 space-y-4">
              <h2 className="font-display font-semibold text-slate-900 flex items-center gap-2">
                <Building2 size={17} className="text-primary-600"/>Select a Hospital
              </h2>
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                <input className="input pl-9" placeholder="Search by name, city, or specialty…"
                  value={search} onChange={e => setSearch(e.target.value)}/>
              </div>
              {loading ? (
                <div className="space-y-2">{[...Array(3)].map((_,i) => <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse"/>)}</div>
              ) : filteredHospitals.length === 0 ? (
                <p className="text-center text-slate-400 py-6">No hospitals found.</p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {filteredHospitals.map(h => (
                    <button key={h.user._id} onClick={() => handleSelectHospital(h)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-slate-200 hover:border-primary-300 hover:bg-primary-50 text-left transition-all">
                      <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Building2 size={17} className="text-violet-600"/>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-slate-900">{h.profile?.hospitalName || h.user.firstName}</p>
                        <p className="text-xs text-slate-400 truncate">
                          {h.profile?.hospitalType} · {h.profile?.address?.city || '—'}
                          {h.profile?.specialties?.length > 0 && ` · ${h.profile.specialties.slice(0,2).join(', ')}`}
                        </p>
                      </div>
                      {h.profile?.emergencyServices && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium flex-shrink-0">24/7 ER</span>}
                      <ChevronRight size={16} className="text-slate-300 flex-shrink-0"/>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* By Specialization */}
          {browseMode === 'category' && (
            <div className="card p-5 space-y-4">
              <h2 className="font-display font-semibold text-slate-900 flex items-center gap-2">
                <Stethoscope size={17} className="text-primary-600"/>Select Specialization
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {SPECIALIZATIONS.map(s => (
                  <button key={s.key} onClick={() => handleSelectSpec(s)}
                    className={`p-3 rounded-xl border-2 border-slate-200 hover:border-primary-300 hover:bg-primary-50 text-left transition-all ${s.color}`}>
                    <span className="text-2xl block mb-1">{s.icon}</span>
                    <p className="font-semibold text-xs text-slate-800">{s.label}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Step 0.5: Pick doctor ───────────────────────── */}
      {step === 0.5 && (
        <div className="card p-5 space-y-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <button onClick={() => { setStep(0); setSearch(''); }} className="hover:text-primary-600 transition-colors">Browse</button>
            <ChevronRight size={12}/>
            <span className="text-slate-700 font-medium">
              {selectedHospital ? selectedHospital.profile?.hospitalName || selectedHospital.user.firstName
               : selectedSpec?.label}
            </span>
          </div>

          <h2 className="font-display font-semibold text-slate-900 flex items-center gap-2">
            <User size={17} className="text-primary-600"/>
            {selectedHospital ? 'Doctors at this Hospital' : `${selectedSpec?.label} Doctors`}
            <span className="text-slate-400 font-normal text-sm">(optional)</span>
          </h2>

          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input className="input pl-9" placeholder="Search doctor by name…"
              value={search} onChange={e => setSearch(e.target.value)}/>
          </div>

          {loadingDoctors ? (
            <div className="space-y-2">{[...Array(3)].map((_,i) => <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse"/>)}</div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {/* No preference */}
              {selectedHospital && (
                <button onClick={handleSkipDoctor}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-dashed border-slate-200 hover:border-primary-300 hover:bg-primary-50 text-left transition-all">
                  <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center"><User size={17} className="text-slate-400"/></div>
                  <div>
                    <p className="font-semibold text-sm text-slate-700">No preference</p>
                    <p className="text-xs text-slate-400">Hospital will assign the best available doctor</p>
                  </div>
                </button>
              )}

              {filteredDoctors.length === 0 && !loadingDoctors ? (
                <div className="text-center py-8 space-y-2">
                  <p className="text-slate-400 text-sm">No doctors found{selectedHospital ? ' at this hospital' : ' for this specialization'}.</p>
                  {selectedHospital && <button onClick={handleSkipDoctor} className="btn-primary btn btn-sm">Continue anyway →</button>}
                </div>
              ) : (
                filteredDoctors.map(d => (
                  <button key={d.user._id} onClick={() => handleSelectDoctor(d)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-slate-200 hover:border-primary-300 hover:bg-primary-50 text-left transition-all">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-blue-700 text-sm">
                      {d.user.firstName?.[0]}{d.user.lastName?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-slate-900">Dr. {d.user.firstName} {d.user.lastName}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-500 capitalize">{d.profile?.specialization || 'General'}</span>
                        {d.profile?.experience && <span className="text-xs text-slate-400">{d.profile.experience} yrs</span>}
                        {d.profile?.consultationFee && <span className="text-xs text-slate-400">₹{d.profile.consultationFee}</span>}
                      </div>
                      {d.profile?.currentHospital && !selectedHospital && (
                        <p className="text-xs text-slate-400 mt-0.5 truncate">
                          🏥 {d.profile.currentHospital?.firstName || 'Hospital'}
                        </p>
                      )}
                    </div>
                    <ChevronRight size={16} className="text-slate-300 flex-shrink-0"/>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Step 1: Appointment Details ─────────────────── */}
      {step === 1 && (
        <div className="space-y-4">
          {/* Summary breadcrumb */}
          <div className="card p-3 flex items-center gap-2 text-xs text-slate-500">
            <Building2 size={13} className="text-violet-500"/>
            <span>{selectedHospital?.profile?.hospitalName || (selectedDoctor?.profile?.currentHospital?.firstName) || 'Hospital'}</span>
            {selectedDoctor && <><ChevronRight size={12}/><span>Dr. {selectedDoctor.user.firstName} {selectedDoctor.user.lastName}</span></>}
            {selectedSpec && !selectedHospital && <><ChevronRight size={12}/><span>{selectedSpec.label}</span></>}
            <button onClick={() => setStep(0.5)} className="ml-auto text-primary-600 hover:text-primary-800 transition-colors">Change</button>
          </div>

          <div className="card p-5 space-y-4">
            <h2 className="font-display font-semibold text-slate-900">Appointment Details</h2>

            {/* Mode */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { v:'offline', label:'In-Person', icon:<MapPin size={14}/>,  desc:'Visit the hospital' },
                { v:'online',  label:'Online',    icon:<Video size={14}/>,   desc:'Video consultation' },
              ].map(m => (
                <button key={m.v} type="button" onClick={() => setForm(f => ({...f, mode: m.v}))}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${form.mode === m.v ? 'border-primary-500 bg-primary-50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <div className={`flex items-center gap-1.5 font-semibold text-sm ${form.mode === m.v ? 'text-primary-700' : 'text-slate-700'}`}>
                    {m.icon}{m.label}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{m.desc}</p>
                </button>
              ))}
            </div>

            <div className="form-group">
              <label className="label">Reason for Visit *</label>
              <input className="input" placeholder="e.g. Fever for 3 days, chest pain, routine check-up…"
                value={form.reasonForVisit} onChange={e => setForm(f => ({...f, reasonForVisit: e.target.value}))}/>
            </div>
            <div className="form-group">
              <label className="label">Symptoms <span className="text-slate-400 font-normal">(optional)</span></label>
              <textarea className="input h-20 resize-none" placeholder="Describe your symptoms in detail…"
                value={form.symptoms} onChange={e => setForm(f => ({...f, symptoms: e.target.value}))}/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="form-group">
                <label className="label">Preferred Date <span className="text-slate-400 font-normal">(optional)</span></label>
                <input type="date" className="input" min={new Date().toISOString().split('T')[0]}
                  value={form.preferredDate} onChange={e => setForm(f => ({...f, preferredDate: e.target.value}))}/>
              </div>
              <div className="form-group">
                <label className="label">Preferred Time <span className="text-slate-400 font-normal">(optional)</span></label>
                <input type="time" className="input"
                  value={form.preferredTime} onChange={e => setForm(f => ({...f, preferredTime: e.target.value}))}/>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => setStep(0.5)} className="btn-secondary btn">← Back</button>
            <button onClick={() => setStep(2)} disabled={!form.reasonForVisit.trim()} className="btn-primary btn flex-1 disabled:opacity-50">
              Next: Share Records →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Share Records ────────────────────────── */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="card p-5 space-y-3">
            <h2 className="font-display font-semibold text-slate-900 flex items-center gap-2">
              <FileText size={17} className="text-primary-600"/>Share Medical Records
              <span className="text-slate-400 font-normal text-sm">(optional)</span>
            </h2>
            <p className="text-xs text-slate-400">Selected records will be visible to the assigned doctor during the appointment.</p>

            {records.length === 0 ? (
              <p className="text-slate-400 text-sm py-4 text-center">No records to share. You can proceed without sharing.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {records.map(r => (
                  <label key={r._id} className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${sharedRecords.includes(r._id) ? 'bg-primary-50 border border-primary-200' : 'border border-slate-100 hover:bg-slate-50'}`}>
                    <input type="checkbox" className="accent-primary-600 flex-shrink-0" checked={sharedRecords.includes(r._id)} onChange={() => toggleRecord(r._id)}/>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{r.title}</p>
                      <p className="text-xs text-slate-400">{r.recordType} · {new Date(r.recordDate).toLocaleDateString()}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setStep(1)} className="btn-secondary btn">← Back</button>
            <button onClick={() => setStep(3)} className="btn-primary btn flex-1">Review & Submit →</button>
          </div>
        </div>
      )}

      {/* ── Step 3: Review ──────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="card p-5 space-y-4">
            <h2 className="font-display font-semibold text-slate-900">Review Your Request</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                ['Hospital',  selectedHospital?.profile?.hospitalName || selectedDoctor?.profile?.currentHospital?.firstName || '—'],
                ['Doctor',    selectedDoctor ? `Dr. ${selectedDoctor.user.firstName} ${selectedDoctor.user.lastName}` : 'No preference'],
                ['Mode',      form.mode === 'online' ? '🎥 Online' : '🏥 In-Person'],
                ['Preferred', form.preferredDate ? `${form.preferredDate} ${form.preferredTime || ''}` : 'Flexible'],
                ['Records',   sharedRecords.length > 0 ? `${sharedRecords.length} shared` : 'None'],
              ].map(([l, v]) => (
                <div key={l} className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-400">{l}</p>
                  <p className="text-sm font-semibold text-slate-900 mt-0.5">{v}</p>
                </div>
              ))}
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-400">Reason</p>
              <p className="text-sm text-slate-800 mt-0.5">{form.reasonForVisit}</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
              💡 After submitting, the hospital will schedule a date and time and assign a doctor. You'll see the update in My Appointments.
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setStep(2)} className="btn-secondary btn">← Back</button>
            <button onClick={handleBook} disabled={booking} className="btn-primary btn flex-1 gap-2">
              {booking ? 'Submitting…' : '✓ Submit Request'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookAppointment;
