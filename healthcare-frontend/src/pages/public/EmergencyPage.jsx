import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { emergencyService } from '../../services/other.service';
import { AlertTriangle, User, Droplets, Phone, Pill, Activity, Heart,
         FileText, FileImage, File, ExternalLink, ClipboardList, Shield } from 'lucide-react';

const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';
const SEV_COLOR = { mild:'bg-yellow-100 text-yellow-700', moderate:'bg-orange-100 text-orange-700', severe:'bg-red-100 text-red-700' };

const Section = ({ icon: Icon, title, color = 'text-slate-700', badge, children }) => (
  <div className="card p-5">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <Icon size={18} className={color}/>
        <h3 className="font-display font-semibold text-slate-900">{title}</h3>
      </div>
      {badge && <span className="badge badge-info text-xs">{badge}</span>}
    </div>
    {children}
  </div>
);

const buildFileUrl = (r) => {
  if (!r?.filePath) return null;
  if (r.filePath.startsWith('http')) return r.filePath;
  return `${serverUrl}/${r.filePath.replace(/^\/+/, '')}`;
};

const RecordRow = ({ record }) => {
  const url    = buildFileUrl(record);
  const isText = !record.filePath && record.description;
  const typeColor = {
    prescription: 'bg-blue-100 text-blue-700',
    lab_report:   'bg-emerald-100 text-emerald-700',
    document:     'bg-slate-100 text-slate-600',
  };

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <div className="flex items-start gap-3 p-3">
        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
          {isText
            ? <ClipboardList size={14} className="text-blue-500"/>
            : record.mimeType?.startsWith('image/')
              ? <FileImage size={14} className="text-indigo-500"/>
              : <FileText size={14} className="text-red-500"/>}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">{record.title}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium uppercase ${typeColor[record.recordType]||'bg-slate-100 text-slate-600'}`}>
              {record.recordType?.replace('_',' ')}
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
      </div>
      {isText && record.description && (
        <div className="px-3 pb-3 bg-slate-50 border-t border-slate-100">
          <p className="text-[10px] text-slate-400 uppercase tracking-wide font-medium mt-2 mb-1.5">Prescription Content</p>
          <div className="bg-white border border-slate-200 rounded-lg p-3">
            <pre className="text-sm text-slate-800 whitespace-pre-wrap font-sans leading-relaxed">{record.description}</pre>
          </div>
        </div>
      )}
    </div>
  );
};

const EmergencyPage = () => {
  const { qrId } = useParams();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    emergencyService.getByQrId(qrId)
      .then(res => setData(res.data.data))
      .catch(err => setError(err.response?.data?.message || 'Failed to load patient data.'))
      .finally(() => setLoading(false));
  }, [qrId]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-red-50">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"/>
        <p className="text-red-600 font-medium">Loading emergency data…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="card p-8 text-center max-w-sm">
        <AlertTriangle size={40} className="text-red-500 mx-auto mb-3"/>
        <h2 className="font-display font-bold text-slate-900 mb-2">Invalid QR Code</h2>
        <p className="text-slate-500 text-sm">{error}</p>
        <Link to="/scan-qr" className="btn-primary btn mt-4 btn-sm">Try Again</Link>
      </div>
    </div>
  );

  const { patient, records, accessLevel, note } = data;
  const isFull     = accessLevel === 'full';
  const isHospital = accessLevel === 'emergency_essential';

  const accessBadge = isFull
    ? { label:'🩺 Full Access (Doctor)',     bg:'bg-blue-700' }
    : isHospital
    ? { label:'🏥 Hospital Essential',        bg:'bg-violet-700' }
    : { label:'👁️ Public Emergency View',    bg:'bg-slate-700' };

  return (
    <div className="min-h-screen bg-red-50">
      {/* Emergency banner */}
      <div className="bg-red-600 text-white py-4 px-4 text-center">
        <div className="flex items-center justify-center gap-2 font-bold text-lg">
          <AlertTriangle size={22}/>EMERGENCY MEDICAL INFORMATION<AlertTriangle size={22}/>
        </div>
        <div className="flex items-center justify-center gap-2 mt-1.5">
          <span className={`text-xs px-3 py-1 rounded-full font-semibold ${accessBadge.bg} bg-opacity-80`}>
            {accessBadge.label}
          </span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* Patient identity */}
        <Section icon={User} title="Patient Identity" color="text-blue-600">
          <div className="grid grid-cols-2 gap-3">
            <div><p className="text-xs text-slate-400">Full Name</p><p className="font-bold text-slate-900 text-lg">{patient.fullName}</p></div>
            {patient.age         && <div><p className="text-xs text-slate-400">Age</p><p className="font-semibold">{patient.age} yrs</p></div>}
            {patient.gender      && <div><p className="text-xs text-slate-400">Gender</p><p className="font-semibold capitalize">{patient.gender}</p></div>}
            {patient.dateOfBirth && <div><p className="text-xs text-slate-400">DOB</p><p className="font-semibold">{new Date(patient.dateOfBirth).toLocaleDateString()}</p></div>}
            {isFull && patient.email && <div><p className="text-xs text-slate-400">Email</p><p className="font-semibold text-sm">{patient.email}</p></div>}
            {isFull && patient.phone && <div><p className="text-xs text-slate-400">Phone</p><p className="font-semibold">{patient.phone}</p></div>}
          </div>
        </Section>

        {/* Blood group */}
        <Section icon={Droplets} title="Blood Group" color="text-red-600">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center border-4 border-red-200">
              <span className="font-display font-bold text-2xl text-red-600">{patient.bloodGroup}</span>
            </div>
            {patient.isOrganDonor && (
              <div className="bg-green-100 text-green-700 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                <Heart size={16}/> Organ Donor
              </div>
            )}
            {isFull && patient.height && patient.weight && (
              <div className="text-sm text-slate-500 space-y-1">
                <p>{patient.height} cm · {patient.weight} kg</p>
                {patient.bmi && <p>BMI: {patient.bmi}</p>}
              </div>
            )}
          </div>
        </Section>

        {/* Allergies */}
        {patient.allergies?.length > 0 && (
          <Section icon={AlertTriangle} title="⚠️ Allergies" color="text-orange-600" badge={`${patient.allergies.length} known`}>
            <div className="space-y-2">
              {patient.allergies.map((a,i) => (
                <div key={i} className="flex items-center justify-between p-2.5 bg-orange-50 rounded-lg border border-orange-200">
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{a.allergen}</p>
                    {a.reaction && <p className="text-xs text-slate-500">Reaction: {a.reaction}</p>}
                  </div>
                  <span className={`badge text-xs ${SEV_COLOR[a.severity]||'bg-slate-100 text-slate-600'}`}>{a.severity}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Medications */}
        {patient.medications?.length > 0 && (
          <Section icon={Pill} title="Current Medications" color="text-violet-600">
            <div className="space-y-2">
              {patient.medications.map((m,i) => (
                <div key={i} className="p-2.5 bg-violet-50 rounded-lg">
                  <p className="font-semibold text-sm text-slate-900">{m.name}</p>
                  {m.dosage && <p className="text-xs text-slate-500">{m.dosage}{m.frequency ? ` — ${m.frequency}` : ''}</p>}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Chronic diseases */}
        {patient.chronicDiseases?.length > 0 && (
          <Section icon={Activity} title="Medical Conditions" color="text-slate-600">
            <div className="flex flex-wrap gap-2">
              {patient.chronicDiseases.map((d,i) => (
                <span key={i} className="badge badge-gray">{d.name}{d.diagnosedYear ? ` (${d.diagnosedYear})` : ''}</span>
              ))}
            </div>
          </Section>
        )}

        {/* Emergency contacts */}
        {patient.emergencyContacts?.length > 0 && (
          <Section icon={Phone} title="Emergency Contacts" color="text-green-600">
            <div className="space-y-3">
              {patient.emergencyContacts.map((c,i) => (
                <div key={i} className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm text-slate-900">{c.name}</p>
                    <p className="text-xs text-slate-400 capitalize">{c.relationship}</p>
                  </div>
                  <a href={`tel:${c.phone}`} className="btn-primary btn btn-sm gap-1.5">
                    <Phone size={13}/>{c.phone}
                  </a>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ── FULL ACCESS: Doctor records ── */}
        {isFull && records && (
          <>
            {records.prescriptions?.length > 0 && (
              <Section icon={ClipboardList} title="Prescriptions" color="text-blue-600" badge={`${records.prescriptions.length}`}>
                <div className="space-y-3">
                  {records.prescriptions.map(r => <RecordRow key={r._id} record={r}/>)}
                </div>
              </Section>
            )}

            {records.labReports?.length > 0 && (
              <Section icon={Activity} title="Lab Reports" color="text-emerald-600" badge={`${records.labReports.length}`}>
                <div className="space-y-3">
                  {records.labReports.map(r => <RecordRow key={r._id} record={r}/>)}
                </div>
              </Section>
            )}

            {records.documents?.length > 0 && (
              <Section icon={FileText} title="Documents" color="text-slate-600" badge={`${records.documents.length}`}>
                <div className="space-y-3">
                  {records.documents.map(r => <RecordRow key={r._id} record={r}/>)}
                </div>
              </Section>
            )}

            {records.prescriptions?.length === 0 && records.labReports?.length === 0 && records.documents?.length === 0 && (
              <div className="card p-6 text-center">
                <FileText size={28} className="text-slate-200 mx-auto mb-2"/>
                <p className="text-slate-400 text-sm">No medical records uploaded yet.</p>
              </div>
            )}
          </>
        )}

        {/* Hospital or public note */}
        {note && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-2.5">
            <Shield size={16} className="text-amber-500 flex-shrink-0 mt-0.5"/>
            <p className="text-xs text-amber-700">{note}</p>
          </div>
        )}

        <p className="text-center text-xs text-slate-400 pb-4">
          Critical Emergency Access · Data accurate as of last patient update
        </p>
      </div>
    </div>
  );
};

export default EmergencyPage;
