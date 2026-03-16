import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { appointmentService } from '../../services/other.service';
import { Calendar, Clock, User, ChevronDown, ChevronUp, Video, MapPin, FileText, Upload, X, Check, RefreshCw, ExternalLink, Loader } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_META = {
  pending_hospital: { label: 'Awaiting Hospital', color: 'bg-amber-100 text-amber-700' },
  scheduled:        { label: 'Scheduled',         color: 'bg-blue-100 text-blue-700' },
  confirmed:        { label: 'Confirmed',          color: 'bg-emerald-100 text-emerald-700' },
  in_progress:      { label: 'In Progress',        color: 'bg-violet-100 text-violet-700' },
  completed:        { label: 'Completed',          color: 'bg-slate-100 text-slate-600' },
  cancelled:        { label: 'Cancelled',          color: 'bg-red-100 text-red-600' },
  rescheduled:      { label: 'Reschedule Sent',    color: 'bg-orange-100 text-orange-700' },
};

const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';

// ── Prescription panel ────────────────────────────────────
const PrescriptionPanel = ({ appt, onDone }) => {
  const [mode, setMode]       = useState('text'); // text | file
  const [text, setText]       = useState('');
  const [file, setFile]       = useState(null);
  const [notes, setNotes]     = useState('');
  const [followUp, setFollowUp] = useState('');
  const [saving, setSaving]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (mode === 'text' && !text.trim()) { toast.error('Enter prescription text.'); return; }
    if (mode === 'file' && !file) { toast.error('Select a prescription file.'); return; }

    setSaving(true);
    try {
      const fd = new FormData();
      if (mode === 'text') fd.append('prescriptionText', text);
      if (mode === 'file') fd.append('prescriptionFile', file);
      if (notes)    fd.append('doctorNotes', notes);
      if (followUp) fd.append('followUpDate', followUp);
      await appointmentService.complete(appt._id, fd);
      toast.success('Appointment completed and prescription sent!');
      onDone();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed.'); }
    finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-4 space-y-4 mt-3">
      <p className="font-semibold text-sm text-slate-900 flex items-center gap-1.5"><FileText size={15}/>Complete & Send Prescription</p>

      {/* Prescription mode toggle */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { v:'text', label:'Type Prescription', icon:<FileText size={14}/> },
          { v:'file', label:'Upload Image/PDF',  icon:<Upload size={14}/> },
        ].map(m => (
          <button key={m.v} type="button" onClick={() => setMode(m.v)}
            className={`p-2.5 rounded-lg border-2 text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${mode === m.v ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-600'}`}>
            {m.icon}{m.label}
          </button>
        ))}
      </div>

      {mode === 'text' && (
        <div className="form-group">
          <label className="label">Prescription *</label>
          <textarea className="input h-32 resize-none font-mono text-sm"
            placeholder={"Medication: Paracetamol 500mg\nDose: 1 tablet twice daily\nDuration: 5 days\n\nAdvice: Rest and drink fluids"}
            value={text} onChange={e => setText(e.target.value)}/>
        </div>
      )}

      {mode === 'file' && (
        <div>
          <label className="label">Prescription File *</label>
          <div className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors cursor-pointer ${file ? 'border-primary-400 bg-primary-50' : 'border-slate-200 hover:border-slate-300'}`}>
            {file ? (
              <div className="flex items-center justify-center gap-2">
                <FileText size={16} className="text-primary-600"/>
                <span className="text-sm font-medium text-slate-700 truncate max-w-[180px]">{file.name}</span>
                <button type="button" onClick={() => setFile(null)} className="text-slate-400 hover:text-red-500"><X size={14}/></button>
              </div>
            ) : (
              <label className="cursor-pointer block">
                <Upload size={22} className="text-slate-300 mx-auto mb-1"/>
                <p className="text-sm text-slate-400">Click to upload handwritten or printed prescription</p>
                <p className="text-xs text-slate-300 mt-0.5">JPG, PNG, PDF</p>
                <input type="file" className="hidden" accept=".jpg,.jpeg,.png,.pdf" onChange={e => setFile(e.target.files[0])}/>
              </label>
            )}
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="form-group sm:col-span-2">
          <label className="label">Doctor Notes <span className="text-slate-400 font-normal">(optional)</span></label>
          <textarea className="input h-16 resize-none text-sm" placeholder="Internal notes, diagnosis summary…"
            value={notes} onChange={e => setNotes(e.target.value)}/>
        </div>
        <div className="form-group">
          <label className="label">Follow-up Date <span className="text-slate-400 font-normal">(optional)</span></label>
          <input type="date" className="input" value={followUp} onChange={e => setFollowUp(e.target.value)}/>
        </div>
      </div>

      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="btn-primary btn gap-2">
          {saving ? <Loader size={15} className="animate-spin"/> : <Check size={15}/>}
          {saving ? 'Saving…' : 'Complete & Send'}
        </button>
        <button type="button" onClick={onDone} className="btn-secondary btn">Cancel</button>
      </div>
    </form>
  );
};

// ── Reschedule request panel ──────────────────────────────
const ReschedulePanel = ({ appt, onDone }) => {
  const [form, setForm] = useState({ requestedDate:'', requestedTime:'', note:'' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.requestedDate || !form.requestedTime) { toast.error('Date and time required.'); return; }
    setSaving(true);
    try {
      await appointmentService.rescheduleReq(appt._id, form);
      toast.success('Reschedule request sent to hospital.');
      onDone();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed.'); }
    finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-orange-200 rounded-xl p-4 space-y-3 mt-3">
      <p className="font-semibold text-sm text-orange-800 flex items-center gap-1.5"><RefreshCw size={14}/>Request Reschedule</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="form-group">
          <label className="label">Preferred Date *</label>
          <input type="date" className="input" min={new Date().toISOString().split('T')[0]}
            value={form.requestedDate} onChange={e => setForm(f => ({...f, requestedDate: e.target.value}))}/>
        </div>
        <div className="form-group">
          <label className="label">Preferred Time *</label>
          <input type="time" className="input" value={form.requestedTime} onChange={e => setForm(f => ({...f, requestedTime: e.target.value}))}/>
        </div>
        <div className="form-group col-span-2">
          <label className="label">Reason <span className="text-slate-400 font-normal">(optional)</span></label>
          <input className="input" placeholder="e.g. Prior surgery scheduled" value={form.note} onChange={e => setForm(f => ({...f, note: e.target.value}))}/>
        </div>
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="btn-primary btn btn-sm gap-1.5">
          <RefreshCw size={13}/>{saving ? 'Sending…' : 'Send Request'}
        </button>
        <button type="button" onClick={onDone} className="btn-secondary btn btn-sm">Cancel</button>
      </div>
    </form>
  );
};

// ── Appointment card ──────────────────────────────────────
const ApptCard = ({ appt, onRefresh }) => {
  const [open, setOpen]           = useState(false);
  const [panel, setPanel]         = useState(null); // null | prescription | reschedule
  const meta = STATUS_META[appt.status] || { label: appt.status, color: 'bg-slate-100 text-slate-600' };

  const handleAction = async (action) => {
    try {
      if (action === 'confirm') { await appointmentService.confirm(appt._id); toast.success('Appointment confirmed!'); }
      if (action === 'start')   { await appointmentService.start(appt._id);   toast.success('Appointment started!'); }
      onRefresh();
    } catch (err) { toast.error(err.response?.data?.message || 'Action failed.'); }
  };

  const hasPrescription = appt.prescription?.text || appt.prescription?.filePath;
  const isOnline = appt.mode === 'online';

  return (
    <div className="card overflow-hidden">
      <div className="p-4 flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isOnline ? 'bg-violet-100' : 'bg-blue-100'}`}>
          {isOnline ? <Video size={18} className="text-violet-600"/> : <MapPin size={18} className="text-blue-600"/>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <p className="font-semibold text-sm text-slate-900">
                {appt.patient?.firstName} {appt.patient?.lastName}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-400">
                {appt.appointmentDate
                  ? <span className="flex items-center gap-1"><Calendar size={11}/>{new Date(appt.appointmentDate).toLocaleDateString()}</span>
                  : <span className="text-amber-500">Not scheduled yet</span>}
                {appt.appointmentTime && <span className="flex items-center gap-1"><Clock size={11}/>{appt.appointmentTime}</span>}
                {appt.duration && <span>{appt.duration} min</span>}
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium capitalize ${isOnline ? 'bg-violet-50 text-violet-600' : 'bg-slate-50 text-slate-500'}`}>
                  {appt.mode}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 truncate">{appt.reasonForVisit}</p>
            </div>
            <span className={`badge text-xs ${meta.color} flex-shrink-0`}>{meta.label}</span>
          </div>
        </div>
        <button onClick={() => setOpen(o => !o)} className="text-slate-300 hover:text-slate-500 flex-shrink-0">
          {open ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}
        </button>
      </div>

      {open && (
        <div className="border-t border-slate-100 p-4 bg-slate-50 space-y-3">
          {appt.symptoms && <div><p className="text-xs text-slate-400">Symptoms</p><p className="text-sm text-slate-700 mt-0.5">{appt.symptoms}</p></div>}

          {/* Online meeting link */}
          {isOnline && appt.meetingLink && (
            <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-violet-800">Online Meeting</p>
                <p className="text-xs text-violet-600 truncate">{appt.meetingLink}</p>
              </div>
              <a href={appt.meetingLink} target="_blank" rel="noreferrer"
                className="bg-violet-600 hover:bg-violet-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium flex items-center gap-1 flex-shrink-0 transition-colors">
                <ExternalLink size={12}/>Join
              </a>
            </div>
          )}

          {/* View full patient details */}
          <Link to={`/doctor/appointments/${appt._id}`}
            className="flex items-center gap-1.5 text-primary-600 hover:text-primary-800 text-xs font-medium transition-colors">
            <User size={13}/>View full patient details & shared records
          </Link>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            {appt.status === 'scheduled' && (
              <>
                <button onClick={() => handleAction('confirm')} className="btn-primary btn btn-sm gap-1.5">
                  <Check size={13}/>Confirm
                </button>
                <button onClick={() => { setPanel(p => p === 'reschedule' ? null : 'reschedule'); }}
                  className="btn-secondary btn btn-sm gap-1.5">
                  <RefreshCw size={13}/>Request Reschedule
                </button>
              </>
            )}
            {appt.status === 'confirmed' && (
              <>
                <button onClick={() => handleAction('start')} className="bg-emerald-600 hover:bg-emerald-700 text-white btn btn-sm gap-1.5 transition-colors">
                  <Check size={13}/>Start Appointment
                </button>
                <button onClick={() => { setPanel(p => p === 'reschedule' ? null : 'reschedule'); }}
                  className="btn-secondary btn btn-sm gap-1.5">
                  <RefreshCw size={13}/>Reschedule
                </button>
              </>
            )}
            {appt.status === 'in_progress' && (
              <button onClick={() => setPanel(p => p === 'prescription' ? null : 'prescription')}
                className="btn-primary btn btn-sm gap-1.5 w-full justify-center">
                <FileText size={13}/>Complete & Send Prescription
              </button>
            )}
          </div>

          {/* Completed prescription view */}
          {hasPrescription && appt.status === 'completed' && (
            <div className="bg-white border border-slate-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-slate-700 mb-2">Prescription Sent</p>
              {appt.prescription.text && <pre className="text-sm text-slate-800 whitespace-pre-wrap font-sans">{appt.prescription.text}</pre>}
              {appt.prescription.filePath && (
                <a href={appt.prescription.filePath.startsWith('http') ? appt.prescription.filePath : `${serverUrl}/${appt.prescription.filePath.replace(/^\/+/,'')}`}
                  target="_blank" rel="noreferrer" className="btn-secondary btn btn-sm gap-1.5 mt-1">
                  <FileText size={13}/>View Prescription File
                </a>
              )}
            </div>
          )}

          {panel === 'prescription' && <PrescriptionPanel appt={appt} onDone={() => { setPanel(null); onRefresh(); }}/>}
          {panel === 'reschedule'   && <ReschedulePanel   appt={appt} onDone={() => { setPanel(null); onRefresh(); }}/>}
        </div>
      )}
    </div>
  );
};

const DoctorAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('active');

  const load = () => {
    setLoading(true);
    appointmentService.getAll()
      .then(r => setAppointments(r.data.data?.appointments || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const ACTIVE = ['scheduled','confirmed','in_progress'];
  const filtered = filter === 'active'
    ? appointments.filter(a => ACTIVE.includes(a.status))
    : filter === 'all'
    ? appointments
    : appointments.filter(a => a.status === filter);

  return (
    <div className="page-container animate-fade-in space-y-5">
      <h1 className="font-display text-2xl font-bold text-slate-900">My Appointments</h1>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { key:'active',    label:'Active' },
          { key:'all',       label:'All' },
          { key:'completed', label:'Completed' },
          { key:'cancelled', label:'Cancelled' },
        ].map(t => (
          <button key={t.key} onClick={() => setFilter(t.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${filter === t.key ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {t.label}
            <span className="ml-1.5 text-[10px] opacity-70">
              {t.key === 'active' ? appointments.filter(a => ACTIVE.includes(a.status)).length
               : t.key === 'all' ? appointments.length
               : appointments.filter(a => a.status === t.key).length}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_,i) => <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse"/>)}</div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Calendar size={40} className="text-slate-200 mx-auto mb-3"/>
          <p className="text-slate-400">No appointments in this view.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(a => <ApptCard key={a._id} appt={a} onRefresh={load}/>)}
        </div>
      )}
    </div>
  );
};

export default DoctorAppointments;
