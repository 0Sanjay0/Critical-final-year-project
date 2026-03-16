import { useEffect, useState } from 'react';
import { appointmentService } from '../../services/other.service';
import { Calendar, Clock, User, ChevronDown, ChevronUp, Video, MapPin, Search, Check, X, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_META = {
  pending_hospital: { label: 'Needs Scheduling', color: 'bg-amber-100 text-amber-700' },
  rescheduled:      { label: 'Reschedule Req.',  color: 'bg-orange-100 text-orange-700' },
  scheduled:        { label: 'Scheduled',        color: 'bg-blue-100 text-blue-700' },
  confirmed:        { label: 'Confirmed',        color: 'bg-emerald-100 text-emerald-700' },
  in_progress:      { label: 'In Progress',      color: 'bg-violet-100 text-violet-700' },
  completed:        { label: 'Completed',        color: 'bg-slate-100 text-slate-600' },
  cancelled:        { label: 'Cancelled',        color: 'bg-red-100 text-red-600' },
};

const ScheduleForm = ({ appt, doctors, onScheduled, onCancel }) => {
  const [form, setForm] = useState({
    doctorId:        appt.doctor?._id || '',
    appointmentDate: '',
    appointmentTime: '',
    duration:        '30',
    mode:            appt.mode || 'offline',
    meetingLink:     '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.doctorId || !form.appointmentDate || !form.appointmentTime) {
      toast.error('Doctor, date, and time are required.'); return;
    }
    setSaving(true);
    try {
      await appointmentService.schedule(appt._id, form);
      toast.success('Appointment scheduled!');
      onScheduled();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed.'); }
    finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white border border-slate-200 rounded-xl p-4 mt-3">
      <p className="font-semibold text-sm text-slate-900">Schedule This Appointment</p>

      {/* Patient preferred date/time hint */}
      {(appt.preferredDate || appt.preferredTime) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 text-xs text-blue-700">
          Patient preference: {appt.preferredDate || 'Any date'} {appt.preferredTime && `at ${appt.preferredTime}`}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="form-group sm:col-span-2">
          <label className="label">Assign Doctor *</label>
          <select className="input" value={form.doctorId} onChange={e => setForm(f => ({...f, doctorId: e.target.value}))}>
            <option value="">Select a doctor…</option>
            {doctors.map(d => (
              <option key={d.user._id} value={d.user._id}>
                Dr. {d.user.firstName} {d.user.lastName} — {d.profile?.specialization || 'General'}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="label">Date *</label>
          <input type="date" className="input" min={new Date().toISOString().split('T')[0]}
            value={form.appointmentDate} onChange={e => setForm(f => ({...f, appointmentDate: e.target.value}))}/>
        </div>
        <div className="form-group">
          <label className="label">Time *</label>
          <input type="time" className="input" value={form.appointmentTime} onChange={e => setForm(f => ({...f, appointmentTime: e.target.value}))}/>
        </div>
        <div className="form-group">
          <label className="label">Duration (min)</label>
          <select className="input" value={form.duration} onChange={e => setForm(f => ({...f, duration: e.target.value}))}>
            {['15','20','30','45','60'].map(d => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="label">Mode</label>
          <select className="input" value={form.mode} onChange={e => setForm(f => ({...f, mode: e.target.value}))}>
            <option value="offline">In-Person</option>
            <option value="online">Online (Video)</option>
          </select>
        </div>
        {form.mode === 'online' && (
          <div className="form-group sm:col-span-2">
            <label className="label">Meeting Link</label>
            <input className="input" placeholder="https://meet.google.com/… or Zoom link"
              value={form.meetingLink} onChange={e => setForm(f => ({...f, meetingLink: e.target.value}))}/>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="btn-primary btn gap-2">
          <Check size={15}/>{saving ? 'Scheduling…' : 'Confirm Schedule'}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary btn">Cancel</button>
      </div>
    </form>
  );
};

const ApptCard = ({ appt, doctors, onRefresh }) => {
  const [open, setOpen]           = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const meta = STATUS_META[appt.status] || { label: appt.status, color: 'bg-slate-100 text-slate-600' };

  const handleCancel = async () => {
    if (!window.confirm('Cancel this appointment?')) return;
    try {
      await appointmentService.cancel(appt._id);
      toast.success('Cancelled.'); onRefresh();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed.'); }
  };

  const handleApplyReschedule = async () => {
    try {
      await appointmentService.applyReschedule(appt._id);
      toast.success('Reschedule applied!'); onRefresh();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed.'); }
  };

  return (
    <div className="card overflow-hidden">
      <div className="p-4 flex items-start gap-3">
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <User size={18} className="text-blue-600"/>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <p className="font-semibold text-sm text-slate-900">
                {appt.patient?.firstName} {appt.patient?.lastName}
              </p>
              <p className="text-xs text-slate-400 mt-0.5 truncate">{appt.reasonForVisit}</p>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-400">
                {appt.doctor && <span>Dr. {appt.doctor.firstName} {appt.doctor.lastName}</span>}
                {appt.appointmentDate
                  ? <span className="flex items-center gap-1"><Calendar size={11}/>{new Date(appt.appointmentDate).toLocaleDateString()} {appt.appointmentTime && `@ ${appt.appointmentTime}`}</span>
                  : <span className="text-amber-500 font-medium">Not yet scheduled</span>}
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium capitalize ${appt.mode === 'online' ? 'bg-violet-50 text-violet-600' : 'bg-slate-50 text-slate-500'}`}>
                  {appt.mode}
                </span>
              </div>
            </div>
            <span className={`badge text-xs ${meta.color} flex-shrink-0`}>{meta.label}</span>
          </div>
        </div>
        <button onClick={() => setOpen(o => !o)} className="text-slate-300 hover:text-slate-500 flex-shrink-0">
          {open ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}
        </button>
      </div>

      {open && (
        <div className="border-t border-slate-100 p-4 bg-slate-50 space-y-3 text-sm">
          {appt.symptoms && <div><p className="text-xs text-slate-400">Symptoms</p><p className="text-slate-700 mt-0.5">{appt.symptoms}</p></div>}
          {(appt.preferredDate || appt.preferredTime) && (
            <div><p className="text-xs text-slate-400">Patient Preference</p>
              <p className="text-slate-700 mt-0.5">{appt.preferredDate || 'Any date'} {appt.preferredTime && `at ${appt.preferredTime}`}</p>
            </div>
          )}

          {/* Reschedule request */}
          {appt.status === 'rescheduled' && appt.rescheduleRequest?.requestedDate && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-orange-800">Doctor Reschedule Request</p>
              <p className="text-xs text-orange-700 mt-1">
                Requested: {new Date(appt.rescheduleRequest.requestedDate).toLocaleDateString()} at {appt.rescheduleRequest.requestedTime}
              </p>
              {appt.rescheduleRequest.note && <p className="text-xs text-orange-600 mt-0.5">Note: {appt.rescheduleRequest.note}</p>}
              <div className="flex gap-2 mt-2">
                <button onClick={handleApplyReschedule}
                  className="bg-orange-600 hover:bg-orange-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1">
                  <RefreshCw size={12}/>Apply Reschedule
                </button>
                <button onClick={() => { setShowSchedule(true); setOpen(false); }}
                  className="bg-white border border-orange-300 text-orange-700 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors">
                  Assign Different Time
                </button>
              </div>
            </div>
          )}

          {/* Schedule/Reschedule button */}
          {['pending_hospital'].includes(appt.status) && !showSchedule && (
            <button onClick={() => setShowSchedule(true)}
              className="btn-primary btn btn-sm gap-1.5 w-full justify-center">
              <Calendar size={14}/>Schedule This Appointment
            </button>
          )}

          {showSchedule && (
            <ScheduleForm appt={appt} doctors={doctors}
              onScheduled={() => { setShowSchedule(false); onRefresh(); }}
              onCancel={() => setShowSchedule(false)}/>
          )}

          {['pending_hospital','scheduled','confirmed'].includes(appt.status) && (
            <button onClick={handleCancel}
              className="flex items-center gap-1.5 text-red-500 hover:text-red-700 text-xs font-medium transition-colors">
              <X size={13}/>Cancel Appointment
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const HospitalAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [doctors,      setDoctors]      = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('all');
  const [search,  setSearch]  = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([
      appointmentService.getAll(),
      appointmentService.getDoctors(),
    ]).then(([aRes, dRes]) => {
      setAppointments(aRes.data.data?.appointments || []);
      setDoctors(dRes.data.data?.doctors || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = appointments
    .filter(a => filter === 'all' || a.status === filter)
    .filter(a => {
      if (!search) return true;
      const name = `${a.patient?.firstName} ${a.patient?.lastName}`.toLowerCase();
      return name.includes(search.toLowerCase());
    });

  const pending = appointments.filter(a => a.status === 'pending_hospital').length;
  const reschedule = appointments.filter(a => a.status === 'rescheduled').length;

  return (
    <div className="page-container animate-fade-in space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Appointments</h1>
          <p className="text-slate-400 text-sm mt-1">Manage and schedule patient appointments.</p>
        </div>
        {(pending + reschedule) > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-700 font-medium">
            {pending > 0 && `${pending} pending`}{pending > 0 && reschedule > 0 && ' · '}{reschedule > 0 && `${reschedule} reschedule req.`}
          </div>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input className="input pl-8 text-sm" placeholder="Search patient name…" value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {['all','pending_hospital','rescheduled','scheduled','confirmed','completed'].map(t => (
            <button key={t} onClick={() => setFilter(t)}
              className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${filter === t ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {t === 'all' ? 'All' : STATUS_META[t]?.label || t}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_,i) => <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse"/>)}</div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Calendar size={40} className="text-slate-200 mx-auto mb-3"/>
          <p className="text-slate-400">No appointments found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(a => <ApptCard key={a._id} appt={a} doctors={doctors} onRefresh={load}/>)}
        </div>
      )}
    </div>
  );
};

export default HospitalAppointments;
