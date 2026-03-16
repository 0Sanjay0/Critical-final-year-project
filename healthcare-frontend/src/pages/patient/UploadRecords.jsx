import { useEffect, useState } from 'react';
import { patientService } from '../../services/patient.service';
import { FileText, Upload, Trash2, Download, Filter, Plus, File, X, ClipboardList } from 'lucide-react';
import toast from 'react-hot-toast';

const TYPE_LABELS = { prescription: 'Prescription', lab_report: 'Lab Report', document: 'Document' };
const TYPE_COLORS = {
  prescription: 'badge-info',
  lab_report:   'badge-approved',
  document:     'badge-gray',
};

const UploadRecords = () => {
  const [records,    setRecords]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [uploading,  setUploading]  = useState(false);
  const [filter,     setFilter]     = useState('');
  const [showForm,   setShowForm]   = useState(false);
  const [form, setForm] = useState({ title:'', recordType:'prescription', description:'', issuedBy:'', recordDate:'' });
  const [file, setFile] = useState(null);

  const load = (type='') => {
    setLoading(true);
    patientService.getRecords(type || undefined)
      .then(r => setRecords(r.data.data.records || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleFilter = (t) => { setFilter(t); load(t); };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) { toast.error('Please select a file.'); return; }
    if (!form.title) { toast.error('Title is required.'); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      Object.entries(form).forEach(([k,v]) => v && fd.append(k, v));
      await patientService.uploadRecord(fd);
      toast.success('Record uploaded successfully.');
      setShowForm(false);
      setFile(null);
      setForm({ title:'', recordType:'prescription', description:'', issuedBy:'', recordDate:'' });
      load(filter);
    } catch (err) { toast.error(err.response?.data?.message || 'Upload failed.'); }
    finally { setUploading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this record?')) return;
    try {
      await patientService.deleteRecord(id);
      toast.success('Record deleted.');
      load(filter);
    } catch { toast.error('Failed to delete.'); }
  };

  const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';

  return (
    <div className="page-container animate-fade-in space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Medical Records</h1>
          <p className="text-slate-400 text-sm mt-1">Upload and manage your prescriptions, lab reports, and documents.</p>
        </div>
        <button onClick={() => setShowForm(s => !s)} className="btn-primary btn gap-1.5">
          <Plus size={16}/>{showForm ? 'Cancel' : 'Upload Record'}
        </button>
      </div>

      {/* Upload form */}
      {showForm && (
        <div className="card p-6 animate-fade-in">
          <h3 className="font-display font-semibold text-slate-900 mb-4">Upload New Record</h3>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="form-group">
                <label className="label">Title *</label>
                <input className="input" placeholder="e.g. Blood Test Results" value={form.title}
                  onChange={e=>setForm(f=>({...f,title:e.target.value}))} required/>
              </div>
              <div className="form-group">
                <label className="label">Record Type *</label>
                <select className="input" value={form.recordType} onChange={e=>setForm(f=>({...f,recordType:e.target.value}))}>
                  <option value="prescription">Prescription</option>
                  <option value="lab_report">Lab Report</option>
                  <option value="document">Document</option>
                </select>
              </div>
              <div className="form-group">
                <label className="label">Issued By</label>
                <input className="input" placeholder="Doctor/Lab name" value={form.issuedBy}
                  onChange={e=>setForm(f=>({...f,issuedBy:e.target.value}))}/>
              </div>
              <div className="form-group">
                <label className="label">Record Date</label>
                <input type="date" className="input" value={form.recordDate}
                  onChange={e=>setForm(f=>({...f,recordDate:e.target.value}))}/>
              </div>
              <div className="form-group sm:col-span-2">
                <label className="label">Description</label>
                <input className="input" placeholder="Optional description" value={form.description}
                  onChange={e=>setForm(f=>({...f,description:e.target.value}))}/>
              </div>
            </div>

            {/* File drop zone */}
            <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${file ? 'border-primary-400 bg-primary-50' : 'border-slate-200 hover:border-slate-300'}`}>
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <File size={20} className="text-primary-600"/>
                  <span className="text-sm font-medium text-slate-700">{file.name}</span>
                  <button type="button" onClick={()=>setFile(null)} className="text-slate-400 hover:text-red-500"><X size={16}/></button>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <Upload size={24} className="text-slate-300 mx-auto mb-2"/>
                  <p className="text-sm text-slate-500">Click to select a file or drag & drop</p>
                  <p className="text-xs text-slate-400 mt-1">PDF, images up to 10MB</p>
                  <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png"
                    onChange={e=>setFile(e.target.files[0])}/>
                </label>
              )}
            </div>

            <button type="submit" disabled={uploading} className="btn-primary btn gap-2">
              {uploading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <Upload size={16}/>}
              {uploading ? 'Uploading...' : 'Upload Record'}
            </button>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {[['', 'All'], ['prescription','Prescriptions'], ['lab_report','Lab Reports'], ['document','Documents']].map(([v,l]) => (
          <button key={v} onClick={()=>handleFilter(v)}
            className={`btn btn-sm ${filter===v ? 'btn-primary' : 'btn-secondary'}`}>{l}</button>
        ))}
      </div>

      {/* Records list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_,i)=><div key={i} className="card h-20 animate-pulse bg-slate-100"/>)}
        </div>
      ) : records.length === 0 ? (
        <div className="card p-12 text-center">
          <FileText size={40} className="text-slate-200 mx-auto mb-3"/>
          <p className="text-slate-400">No records found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map(r => {
            const isText = !r.filePath && r.description;
            const fileUrl = r.filePath
              ? r.filePath.startsWith('http') ? r.filePath : `${serverUrl}/${r.filePath.replace(/^\/+/, '')}`
              : null;
            return (
              <div key={r._id} className="card overflow-hidden">
                <div className="p-4 flex items-start gap-4">
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    {isText
                      ? <ClipboardList size={18} className="text-blue-500"/>
                      : <FileText size={18} className="text-slate-400"/>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm text-slate-900">{r.title}</p>
                      <span className={`badge ${TYPE_COLORS[r.recordType]}`}>{TYPE_LABELS[r.recordType]}</span>
                      {isText && <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium">Text</span>}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {r.issuedBy && `By ${r.issuedBy} · `}
                      {new Date(r.recordDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {fileUrl && (
                      <a href={fileUrl} target="_blank" rel="noreferrer"
                        className="btn-secondary btn btn-sm gap-1"><Download size={14}/>Open</a>
                    )}
                    <button onClick={()=>handleDelete(r._id)}
                      className="btn-ghost btn btn-sm text-slate-400 hover:text-red-500"><Trash2 size={15}/></button>
                  </div>
                </div>
                {/* Text prescription — show full content */}
                {isText && (
                  <div className="px-4 pb-4 bg-slate-50 border-t border-slate-100">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide font-medium mt-3 mb-1.5">Prescription Content</p>
                    <div className="bg-white border border-slate-200 rounded-lg p-3">
                      <pre className="text-sm text-slate-800 whitespace-pre-wrap font-sans leading-relaxed">{r.description}</pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default UploadRecords;
