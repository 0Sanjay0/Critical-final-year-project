import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { labService } from '../../services/other.service';
import { Upload, Search, FlaskConical, File, X, Check, Loader, User, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';

const UploadReport = () => {
  const { user } = useAuth();
  const [step, setStep]           = useState(1); // 1=find patient, 2=fill form
  const [searchEmail, setSearch]  = useState('');
  const [searching,   setSearching] = useState(false);
  const [patient,     setPatient]   = useState(null);
  const [file,        setFile]      = useState(null);
  const [uploading,   setUploading] = useState(false);
  const [uploaded,    setUploaded]  = useState(null); // last uploaded record

  const [recentReports, setRecentReports] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [form, setForm] = useState({
    title: '', testName: '', description: '', recordDate: new Date().toISOString().slice(0,10),
  });

  // Load recent reports on mount
  useState(() => {
    setLoadingHistory(true);
    labService.getUploadedReports({ limit: 10 })
      .then(r => setRecentReports(r.data.data?.reports || []))
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  });

  const searchPatient = async (e) => {
    e?.preventDefault();
    if (!searchEmail.trim()) { toast.error('Enter patient email.'); return; }
    setSearching(true);
    setPatient(null);
    try {
      const res = await labService.searchPatient(searchEmail.trim());
      setPatient(res.data.data.patient);
      setStep(2);
      toast.success(`Patient found: ${res.data.data.patient.firstName} ${res.data.data.patient.lastName}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Patient not found.');
    } finally { setSearching(false); }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file)    { toast.error('Select a report file.'); return; }
    if (!patient) { toast.error('Find a patient first.'); return; }
    if (!form.title.trim() && !form.testName.trim()) {
      toast.error('Enter a title or test name.'); return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file',         file);
      fd.append('patientEmail', patient.email);
      fd.append('title',        form.title   || `${form.testName} — ${user?.firstName} Lab`);
      fd.append('testName',     form.testName);
      fd.append('description',  form.description);
      fd.append('recordDate',   form.recordDate);
      const res = await labService.uploadReport(fd);
      const record = res.data.data?.record;
      setUploaded(record);
      toast.success('Report uploaded and sent to patient!');
      // Reset form
      setFile(null);
      setForm({ title:'', testName:'', description:'', recordDate: new Date().toISOString().slice(0,10) });
      // Refresh recent
      labService.getUploadedReports({ limit: 10 })
        .then(r => setRecentReports(r.data.data?.reports || []));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed.');
    } finally { setUploading(false); }
  };

  const reset = () => { setStep(1); setPatient(null); setFile(null); setUploaded(null); };

  return (
    <div className="page-container animate-fade-in space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">Upload Lab Report</h1>
        <p className="text-slate-400 text-sm mt-1">Find a patient by email and upload their lab report directly.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* LEFT — upload flow */}
        <div className="space-y-4">

          {/* Step 1 — find patient */}
          <div className={`card p-6 ${step === 2 ? 'opacity-60' : ''}`}>
            <div className="flex items-center gap-2 mb-4">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                ${patient ? 'bg-emerald-500 text-white' : 'bg-primary-600 text-white'}`}>
                {patient ? <Check size={14}/> : '1'}
              </div>
              <h2 className="font-display font-semibold text-slate-900">Find Patient</h2>
              {patient && (
                <button onClick={reset} className="ml-auto text-xs text-slate-400 hover:text-red-500">Change</button>
              )}
            </div>

            {patient ? (
              <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center font-semibold text-emerald-700">
                  {patient.firstName?.[0]}{patient.lastName?.[0]}
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">{patient.firstName} {patient.lastName}</p>
                  <p className="text-xs text-slate-400">{patient.email}</p>
                </div>
                <Check size={16} className="text-emerald-500 ml-auto"/>
              </div>
            ) : (
              <form onSubmit={searchPatient} className="space-y-3">
                <div className="form-group">
                  <label className="label">Patient Email Address</label>
                  <div className="flex gap-2">
                    <input className="input flex-1" type="email" placeholder="patient@email.com"
                      value={searchEmail} onChange={e => setSearch(e.target.value)}/>
                    <button type="submit" disabled={searching} className="btn-primary btn gap-1.5 flex-shrink-0">
                      {searching ? <Loader size={15} className="animate-spin"/> : <Search size={15}/>}
                      Find
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-400">The patient must be registered on Critical.</p>
              </form>
            )}
          </div>

          {/* Step 2 — fill report details */}
          <div className={`card p-6 ${step === 1 ? 'opacity-40 pointer-events-none' : ''}`}>
            <div className="flex items-center gap-2 mb-4">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                ${uploaded ? 'bg-emerald-500 text-white' : 'bg-primary-600 text-white'}`}>
                {uploaded ? <Check size={14}/> : '2'}
              </div>
              <h2 className="font-display font-semibold text-slate-900">Report Details</h2>
            </div>

            <form onSubmit={handleUpload} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="label">Report Title</label>
                  <input className="input" placeholder="e.g. CBC Report"
                    value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}/>
                </div>
                <div className="form-group">
                  <label className="label">Test Name</label>
                  <input className="input" placeholder="e.g. Complete Blood Count"
                    value={form.testName} onChange={e => setForm(f => ({ ...f, testName: e.target.value }))}/>
                </div>
                <div className="form-group">
                  <label className="label">Report Date</label>
                  <input type="date" className="input"
                    value={form.recordDate} onChange={e => setForm(f => ({ ...f, recordDate: e.target.value }))}/>
                </div>
                <div className="form-group">
                  <label className="label">Notes <span className="text-slate-400 font-normal">(optional)</span></label>
                  <input className="input" placeholder="Additional notes…"
                    value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}/>
                </div>
              </div>

              {/* File upload */}
              <div>
                <label className="label">Report File *</label>
                <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors
                  ${file ? 'border-primary-400 bg-primary-50' : 'border-slate-200 hover:border-slate-300'}`}>
                  {file ? (
                    <div className="flex items-center justify-center gap-3">
                      <File size={20} className="text-primary-600"/>
                      <span className="text-sm font-medium text-slate-700">{file.name}</span>
                      <button type="button" onClick={() => setFile(null)} className="text-slate-400 hover:text-red-500">
                        <X size={16}/>
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <Upload size={28} className="text-slate-300 mx-auto mb-2"/>
                      <p className="text-sm text-slate-500 font-medium">Click to select report file</p>
                      <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG up to 10MB</p>
                      <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png"
                        onChange={e => setFile(e.target.files[0])}/>
                    </label>
                  )}
                </div>
              </div>

              <button type="submit" disabled={uploading || !patient} className="btn-primary btn w-full gap-2 justify-center">
                {uploading ? <Loader size={16} className="animate-spin"/> : <Upload size={16}/>}
                {uploading ? 'Uploading…' : 'Upload Report'}
              </button>
            </form>

            {/* Success message */}
            {uploaded && (
              <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <p className="text-sm font-semibold text-emerald-800 flex items-center gap-2">
                  <Check size={16}/>Report sent to patient successfully!
                </p>
                <p className="text-xs text-emerald-700 mt-1">
                  The report has been added to the patient's medical records.
                </p>
                <button onClick={() => setUploaded(null)} className="btn-secondary btn btn-sm mt-2">
                  Upload Another
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — recent uploads */}
        <div className="card p-6">
          <h2 className="font-display font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <FlaskConical size={17} className="text-emerald-600"/>Recent Uploads
          </h2>

          {loadingHistory ? (
            <div className="space-y-3">{[...Array(4)].map((_,i) => <div key={i} className="h-14 bg-slate-100 rounded-lg animate-pulse"/>)}</div>
          ) : recentReports.length === 0 ? (
            <div className="text-center py-10">
              <FlaskConical size={32} className="text-slate-200 mx-auto mb-2"/>
              <p className="text-slate-400 text-sm">No reports uploaded yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentReports.map(r => {
                const url = r.filePath
                  ? r.filePath.startsWith('http') ? r.filePath : `${serverUrl}/${r.filePath.replace(/^\/+/, '')}`
                  : null;
                return (
                  <div key={r._id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                    <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <File size={15} className="text-emerald-600"/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{r.title}</p>
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <User size={11}/>
                        {r.patient?.firstName} {r.patient?.lastName} · {new Date(r.recordDate).toLocaleDateString()}
                      </p>
                    </div>
                    {url && (
                      <a href={url} target="_blank" rel="noreferrer"
                        className="flex-shrink-0 flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800
                          bg-primary-50 hover:bg-primary-100 px-2 py-1 rounded-lg transition-colors">
                        <ExternalLink size={11}/>View
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadReport;
