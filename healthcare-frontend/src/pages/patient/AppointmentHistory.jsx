import { useEffect, useState } from 'react';
import { appointmentService } from '../../services/other.service';
import { Calendar, Clock, Building2, User, ChevronDown, ChevronUp, Video, MapPin, X, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_META = {
  pending_hospital: { label: 'Awaiting Hospital', color: 'bg-amber-100 text-amber-700' },
  scheduled:        { label: 'Scheduled',         color: 'bg-blue-100 text-blue-700' },
  confirmed:        { label: 'Confirmed',          color: 'bg-emerald-100 text-emerald-700' },
  in_progress:      { label: 'In Progress',        color: 'bg-violet-100 text-violet-700' },
  completed:        { label: 'Completed',          color: 'bg-slate-100 text-slate-600' },
  cancelled:        { label: 'Cancelled',          color: 'bg-red-100 text-red-600' },
  rescheduled:      { label: 'Reschedule Req.',    color: 'bg-orange-100 text-orange-700' },
};

const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';

const ApptCard = ({ appt, onCancel }) => {
  const [open, setOpen] = useState(false);
  const meta   = STATUS_META[appt.status] || { label: appt.status, color: 'bg-slate-100 text-slate-600' };
  const canCancel = ['pending_hospital','scheduled','confirmed'].includes(appt.status);
  const hasPrescription = appt.prescription?.text || appt.prescription?.filePath;

  return (
    <div className="card overflow-hidden">
      <div className="p-4 flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${appt.mode === 'online' ? 'bg-violet-100' : 'bg-blue-100'}`}>
          {appt.mode === 'online' ? <Video size={18} className="text-violet-600"/> : <MapPin size={18} className="text-blue-600"/>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <p className="font-semibold text-sm text-slate-900">
                {appt.hospital?.firstName || 'Hospital'}
                {appt.doctor && <span className="text-slate-400 font-normal"> · Dr. {appt.doctor.firstName} {appt.doctor.lastName}</span>}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-400">
                {appt.appointmentDate
                  ? <span className="flex items-center gap-1"><Calendar size={11}/>{new Date(appt.appointmentDate).toLocaleDateString()}</span>
                  : <span className="text-amber-500">Awaiting schedule</span>}
                {appt.appointmentTime && <span className="flex items-center gap-1"><Clock size={11}/>{appt.appointmentTime}</span>}
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium capitalize ${appt.mode === 'online' ? 'bg-violet-50 text-violet-600' : 'bg-blue-50 text-blue-600'}`}>
                  {appt.mode}
                </span>
              </div>
            </div>
            <span className={`badge text-xs ${meta.color} flex-shrink-0`}>{meta.label}</span>
          </div>
          <p className="text-xs text-slate-500 mt-1 truncate">{appt.reasonForVisit}</p>
        </div>
        <button onClick={() => setOpen(o => !o)} className="text-slate-300 hover:text-slate-500 flex-shrink-0 mt-1">
          {open ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}
        </button>
      </div>

      {open && (
        <div className="border-t border-slate-100 p-4 bg-slate-50 space-y-3 animate-fade-in text-sm">
          {appt.symptoms && <div><p className="text-xs text-slate-400 mb-0.5">Symptoms</p><p className="text-slate-700">{appt.symptoms}</p></div>}

          {/* Online meeting link */}
          {appt.mode === 'online' && appt.meetingLink && (
            <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-violet-800">Online Meeting Link</p>
                <p className="text-xs text-violet-600 truncate mt-0.5">{appt.meetingLink}</p>
              </div>
              <a href={appt.meetingLink} target="_blank" rel="noreferrer"
                className="bg-violet-600 hover:bg-violet-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium flex-shrink-0 transition-colors">
                Join Call
              </a>
            </div>
          )}

          {/* Reschedule notice */}
          {appt.status === 'rescheduled' && appt.rescheduleRequest?.requestedDate && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-orange-800">Reschedule Requested by Doctor</p>
              <p className="text-xs text-orange-700 mt-0.5">
                Requested: {new Date(appt.rescheduleRequest.requestedDate).toLocaleDateString()} at {appt.rescheduleRequest.requestedTime}
              </p>
              {appt.rescheduleRequest.note && <p className="text-xs text-orange-600 mt-0.5">Note: {appt.rescheduleRequest.note}</p>}
            </div>
          )}

          {/* Doctor notes */}
          {appt.doctorNotes && <div><p className="text-xs text-slate-400 mb-0.5">Doctor Notes</p><p className="text-slate-700">{appt.doctorNotes}</p></div>}

          {/* Prescription */}
          {hasPrescription && (
            <div className="bg-white border border-slate-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5"><FileText size={13}/>Prescription</p>
              {appt.prescription.text && <pre className="text-sm text-slate-800 whitespace-pre-wrap font-sans">{appt.prescription.text}</pre>}
              {appt.prescription.filePath && (
                <a href={appt.prescription.filePath.startsWith('http') ? appt.prescription.filePath : `${serverUrl}/${appt.prescription.filePath.replace(/^\/+/,'')}`}
                  target="_blank" rel="noreferrer" className="btn-secondary btn btn-sm mt-2 gap-1.5">
                  <FileText size={13}/>View Prescription Image
                </a>
              )}
            </div>
          )}

          {appt.followUpDate && <div><p className="text-xs text-slate-400">Follow-up</p><p className="text-sm text-slate-700">{new Date(appt.followUpDate).toLocaleDateString()}</p></div>}

          {canCancel && (
            <button onClick={() => onCancel(appt._id)}
              className="flex items-center gap-1.5 text-red-500 hover:text-red-700 text-xs font-medium transition-colors mt-1">
              <X size={13}/>Cancel Appointment
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const AppointmentHistory = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('all');

  const load = () => {
    setLoading(true);
    appointmentService.getAll()
      .then(r => setAppointments(r.data.data?.appointments || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this appointment?')) return;
    try {
      await appointmentService.cancel(id);
      toast.success('Appointment cancelled.');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed.'); }
  };

  const filtered = filter === 'all' ? appointments : appointments.filter(a => a.status === filter);
  const tabs = ['all','pending_hospital','scheduled','confirmed','completed','cancelled'];

  return (
    <div className="page-container animate-fade-in space-y-5">
      <h1 className="font-display text-2xl font-bold text-slate-900">My Appointments</h1>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map(t => (
          <button key={t} onClick={() => setFilter(t)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${filter === t ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {t === 'all' ? 'All' : STATUS_META[t]?.label || t}
            <span className="ml-1.5 text-[10px] opacity-70">
              {t === 'all' ? appointments.length : appointments.filter(a => a.status === t).length}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_,i) => <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse"/>)}</div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Calendar size={40} className="text-slate-200 mx-auto mb-3"/>
          <p className="text-slate-400">No appointments found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(a => <ApptCard key={a._id} appt={a} onCancel={handleCancel}/>)}
        </div>
      )}
    </div>
  );
};

export default AppointmentHistory;
