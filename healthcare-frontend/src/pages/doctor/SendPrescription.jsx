import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doctorService } from '../../services/other.service';
import { FileText, Upload, File, X, Send } from 'lucide-react';
import toast from 'react-hot-toast';

const SendPrescription = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [mode,    setMode]    = useState('text'); // 'text' | 'file'
  const [text,    setText]    = useState('');
  const [file,    setFile]    = useState(null);
  const [notes,   setNotes]   = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    if (mode === 'text' && !text.trim()) { toast.error('Prescription text is required.'); return; }
    if (mode === 'file' && !file)        { toast.error('Please select a file.'); return; }
    setSending(true);
    try {
      const fd = new FormData();
      fd.append('notes', notes);
      if (mode === 'text') {
        fd.append('prescriptionText', text);
      } else {
        fd.append('file', file);
      }
      await doctorService.sendPrescription(id, fd);
      toast.success('Prescription sent successfully!');
      navigate('/doctor/appointments');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send prescription.');
    } finally { setSending(false); }
  };

  return (
    <div className="page-container animate-fade-in max-w-2xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-slate-900">Send Prescription</h1>
        <p className="text-slate-400 text-sm mt-1">This will be added to the patient's medical records and mark the appointment as completed.</p>
      </div>

      <div className="card p-6 space-y-5">
        {/* Mode toggle */}
        <div>
          <label className="label">Prescription Type</label>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={()=>setMode('text')}
              className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${mode==='text'?'border-primary-500 bg-primary-50 text-primary-700':'border-slate-200 hover:border-slate-300 text-slate-600'}`}>
              <FileText size={18} className="mx-auto mb-1"/>Text Prescription
            </button>
            <button type="button" onClick={()=>setMode('file')}
              className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${mode==='file'?'border-primary-500 bg-primary-50 text-primary-700':'border-slate-200 hover:border-slate-300 text-slate-600'}`}>
              <Upload size={18} className="mx-auto mb-1"/>Upload File
            </button>
          </div>
        </div>

        <form onSubmit={handleSend} className="space-y-4">
          {mode === 'text' ? (
            <div className="form-group">
              <label className="label">Prescription Details *</label>
              <textarea className="input h-48 resize-none font-mono text-sm"
                placeholder={`Medicine Name - Dosage - Frequency\n\nExample:\nParacetamol 500mg - 1 tablet - Twice daily after meals\nAmoxicillin 250mg - 1 capsule - Three times daily for 5 days`}
                value={text} onChange={e=>setText(e.target.value)}/>
            </div>
          ) : (
            <div className="form-group">
              <label className="label">Prescription File *</label>
              <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${file?'border-primary-400 bg-primary-50':'border-slate-200 hover:border-slate-300'}`}>
                {file ? (
                  <div className="flex items-center justify-center gap-3">
                    <File size={20} className="text-primary-600"/>
                    <span className="text-sm font-medium text-slate-700">{file.name}</span>
                    <button type="button" onClick={()=>setFile(null)} className="text-slate-400 hover:text-red-500"><X size={16}/></button>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <Upload size={28} className="text-slate-300 mx-auto mb-2"/>
                    <p className="text-sm text-slate-500">Click to select prescription file</p>
                    <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG up to 10MB</p>
                    <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png"
                      onChange={e=>setFile(e.target.files[0])}/>
                  </label>
                )}
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="label">Additional Notes <span className="text-slate-400 font-normal">(optional)</span></label>
            <textarea className="input h-24 resize-none" placeholder="Follow-up instructions, dietary advice, etc."
              value={notes} onChange={e=>setNotes(e.target.value)}/>
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={sending} className="btn-primary btn btn-lg gap-2">
              {sending ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <Send size={18}/>}
              {sending ? 'Sending...' : 'Send Prescription'}
            </button>
            <button type="button" onClick={()=>navigate(-1)} className="btn-secondary btn btn-lg">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SendPrescription;
