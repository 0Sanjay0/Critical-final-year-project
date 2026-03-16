import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { appointmentService } from '../../services/other.service';
import { FileText, AlertTriangle, Pill, Activity, ArrowLeft, Calendar,
         ExternalLink, FileImage, File, ClipboardList } from 'lucide-react';

const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';

const buildFileUrl = (record) => {
  if (!record?.filePath) return null;
  if (record.filePath.startsWith('http')) return record.filePath;
  return `${serverUrl}/${record.filePath.replace(/^\/+/, '')}`;
};

const RecordCard = ({ record }) => {
  const url     = buildFileUrl(record);
  const isText  = !record.filePath && (record.description || record.mimeType === 'text/plain');
  const typeColor = {
    prescription: 'bg-blue-100 text-blue-700',
    lab_report:   'bg-emerald-100 text-emerald-700',
    document:     'bg-slate-100 text-slate-600',
  };

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden hover:border-primary-300 transition-colors">
      {/* Header row */}
      <div className="flex items-start gap-3 p-3 bg-white">
        <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
          {!record.filePath
            ? <ClipboardList size={16} className="text-blue-500"/>
            : record.mimeType?.startsWith('image/')
              ? <FileImage size={16} className="text-indigo-500"/>
              : <FileText size={16} className="text-red-500"/>
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">{record.title}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wide ${typeColor[record.recordType] || 'bg-slate-100 text-slate-600'}`}>
              {record.recordType?.replace('_', ' ')}
            </span>
            <span className="text-xs text-slate-400">{new Date(record.recordDate).toLocaleDateString()}</span>
            {record.issuedBy && <span className="text-xs text-slate-400">by {record.issuedBy}</span>}
          </div>
        </div>
        {url && (
          <a href={url} target="_blank" rel="noreferrer"
            className="flex-shrink-0 flex items-center gap-1 text-xs font-medium text-primary-600
              hover:text-primary-800 bg-primary-50 hover:bg-primary-100 px-2.5 py-1.5 rounded-lg transition-colors">
            <ExternalLink size={12}/>Open
          </a>
        )}
        {isText && !url && (
          <span className="flex-shrink-0 text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">Text</span>
        )}
      </div>

      {/* Text prescription content — always visible */}
      {isText && record.description && (
        <div className="px-3 pb-3 bg-slate-50 border-t border-slate-100">
          <p className="text-xs text-slate-400 mb-1.5 mt-2 font-medium uppercase tracking-wide">Prescription Content</p>
          <div className="bg-white border border-slate-200 rounded-lg p-3">
            <pre className="text-sm text-slate-800 whitespace-pre-wrap font-sans leading-relaxed">
              {record.description}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

const PatientDetails = () => {
  const { id } = useParams();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    Promise.all([
      appointmentService.getById(id),
      appointmentService.getPatientRecords(id),
    ]).then(([aRes, rRes]) => {
      setData({ appointment: aRes.data.data.appointment, records: rRes.data.data });
    }).catch(err => setError(err.response?.data?.message || 'Failed to load.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="page-container"><div className="card p-10 text-center text-slate-400">Loading patient details…</div></div>;
  if (error)   return <div className="page-container"><div className="card p-10 text-center text-red-400">{error}</div></div>;

  const { appointment, records } = data;
  const patient       = appointment.patient;
  const profile       = records?.patient || {};
  const sharedRecords = records?.sharedRecords || [];
  const SEV = { mild:'bg-yellow-100 text-yellow-700', moderate:'bg-orange-100 text-orange-700', severe:'badge-rejected' };

  return (
    <div className="page-container animate-fade-in space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <Link to="/doctor/appointments" className="btn-ghost btn btn-sm gap-1.5"><ArrowLeft size={15}/>Back</Link>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold text-slate-900">{patient?.firstName} {patient?.lastName}</h1>
          <p className="text-slate-400 text-sm flex items-center gap-2">
            <Calendar size={13}/>
            {new Date(appointment.appointmentDate).toLocaleDateString()} · {appointment.appointmentTime}
            <span className={`badge ${appointment.status==='confirmed'?'badge-info':appointment.status==='completed'?'badge-approved':'badge-pending'}`}>
              {appointment.status}
            </span>
          </p>
        </div>
        {appointment.status === 'confirmed' && (
          <Link to={`/doctor/appointments/${id}/prescription`} className="btn-primary btn gap-1.5">
            <FileText size={16}/>Send Prescription
          </Link>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="space-y-4">
          <div className="card p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center font-display font-bold text-blue-700 text-lg">
                {patient?.firstName?.[0]}{patient?.lastName?.[0]}
              </div>
              <div>
                <p className="font-semibold text-slate-900">{patient?.firstName} {patient?.lastName}</p>
                <p className="text-xs text-slate-400">{patient?.email}</p>
                {patient?.phone && <p className="text-xs text-slate-400">{patient.phone}</p>}
              </div>
            </div>
            <div className="space-y-2">
              {[
                ['Blood Group', profile?.bloodGroup],
                ['Gender',      patient?.gender],
                ['BMI',         profile?.bmi],
                ['Organ Donor', typeof profile?.isOrganDonor === 'boolean' ? (profile.isOrganDonor ? '✓ Yes' : 'No') : null],
              ].filter(([,v])=>v).map(([l,v])=>(
                <div key={l} className="flex justify-between text-sm">
                  <span className="text-slate-400">{l}</span>
                  <span className="font-medium text-slate-900">{v}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <h3 className="font-display font-semibold text-slate-900 mb-3 text-sm flex items-center gap-2"><Calendar size={14}/>Visit Reason</h3>
            {appointment.reasonForVisit && <p className="text-sm text-slate-700 mb-2">{appointment.reasonForVisit}</p>}
            {appointment.symptoms && <div className="mt-2"><p className="text-xs text-slate-400 mb-1">Symptoms</p><p className="text-sm text-slate-700">{appointment.symptoms}</p></div>}
            {!appointment.reasonForVisit && !appointment.symptoms && <p className="text-xs text-slate-400">No reason specified.</p>}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {profile?.allergies?.length > 0 && (
            <div className="card p-5">
              <h3 className="font-display font-semibold text-slate-900 mb-3 flex items-center gap-2 text-sm"><AlertTriangle size={15} className="text-red-500"/>Allergies</h3>
              <div className="flex flex-wrap gap-2">
                {profile.allergies.map((a,i)=>(
                  <div key={i} className={`badge ${SEV[a.severity]||'badge-gray'} flex items-center gap-1`}>
                    {a.allergen}<span className="opacity-60 text-[10px]">({a.severity})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {profile?.medications?.length > 0 && (
            <div className="card p-5">
              <h3 className="font-display font-semibold text-slate-900 mb-3 flex items-center gap-2 text-sm"><Pill size={15} className="text-violet-600"/>Current Medications</h3>
              <div className="space-y-2">
                {profile.medications.map((m,i)=>(
                  <div key={i} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg text-sm">
                    <span className="font-medium text-slate-900">{m.name}</span>
                    {m.dosage && <span className="text-slate-400">{m.dosage} · {m.frequency}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {profile?.chronicDiseases?.length > 0 && (
            <div className="card p-5">
              <h3 className="font-display font-semibold text-slate-900 mb-3 flex items-center gap-2 text-sm"><Activity size={15}/>Conditions</h3>
              <div className="flex flex-wrap gap-2">
                {profile.chronicDiseases.map((d,i)=>(
                  <span key={i} className="badge badge-gray">{d.name}</span>
                ))}
              </div>
            </div>
          )}

          {/* Shared Records — text prescriptions fully readable */}
          <div className="card p-5">
            <h3 className="font-display font-semibold text-slate-900 mb-3 flex items-center gap-2 text-sm">
              <FileText size={15}/>Shared Records
              <span className="ml-auto text-xs font-normal text-slate-400">{sharedRecords.length} record{sharedRecords.length!==1?'s':''}</span>
            </h3>
            {sharedRecords.length === 0 ? (
              <div className="text-center py-6">
                <FileText size={28} className="text-slate-200 mx-auto mb-2"/>
                <p className="text-sm text-slate-400">No records shared with this appointment.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sharedRecords.map(r => <RecordCard key={r._id} record={r}/>)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientDetails;
