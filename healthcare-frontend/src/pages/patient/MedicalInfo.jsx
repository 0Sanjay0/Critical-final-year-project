import { useEffect, useState } from 'react';
import { patientService } from '../../services/patient.service';
import { AlertTriangle, Pill, Activity, Phone, Heart, Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Reusable inline form ────────────────────────────────────
const AddForm = ({ fields, onSave, onCancel, loading }) => {
  const [vals, setVals] = useState(() => Object.fromEntries(fields.map(f => [f.key, f.default || ''])));
  return (
    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {fields.map(f => (
          <div key={f.key} className={f.full ? 'col-span-2' : ''}>
            <label className="label">{f.label}</label>
            {f.type === 'select' ? (
              <select className="input" value={vals[f.key]} onChange={e => setVals(v => ({ ...v, [f.key]: e.target.value }))}>
                {f.options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input type={f.type || 'text'} className="input" placeholder={f.placeholder}
                value={vals[f.key]} onChange={e => setVals(v => ({ ...v, [f.key]: e.target.value }))} />
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <button onClick={() => onSave(vals)} disabled={loading}
          className="btn-primary btn btn-sm gap-1"><Check size={14}/>Save</button>
        <button onClick={onCancel} className="btn-secondary btn btn-sm gap-1"><X size={14}/>Cancel</button>
      </div>
    </div>
  );
};

// ── Section wrapper ─────────────────────────────────────────
const Section = ({ icon: Icon, title, color, onAdd, children }) => (
  <div className="card p-6">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center`}><Icon size={16}/></div>
        <h2 className="font-display font-semibold text-slate-900">{title}</h2>
      </div>
      {onAdd && (
        <button onClick={onAdd} className="btn-secondary btn btn-sm gap-1"><Plus size={14}/>Add</button>
      )}
    </div>
    {children}
  </div>
);

const MedicalInfo = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [show, setShow] = useState({ allergy: false, disease: false, medication: false, contact: false });

  // Core profile edit state
  const [coreForm, setCoreForm] = useState(null);
  const [editingCore, setEditingCore] = useState(false);

  useEffect(() => {
    patientService.getProfile().then(res => {
      const p = res.data.data.profile;
      setProfile(p);
      if (p) setCoreForm({
        bloodGroup: p.bloodGroup || 'unknown',
        height: p.height || '', weight: p.weight || '',
        isOrganDonor: p.isOrganDonor || false,
        insuranceProvider: p.insuranceProvider || '',
        insurancePolicyNo: p.insurancePolicyNo || '',
        notes: p.notes || '',
      });
    }).finally(() => setLoading(false));
  }, []);

  const refresh = () => patientService.getProfile().then(r => setProfile(r.data.data.profile));

  const saveCore = async () => {
    setSaving(true);
    try {
      await patientService.updateProfile(coreForm);
      await refresh();
      setEditingCore(false);
      toast.success('Medical profile updated.');
    } catch { toast.error('Failed to update.'); }
    finally { setSaving(false); }
  };

  const handleAdd = async (type, data) => {
    setSaving(true);
    try {
      const map = {
        allergy:   () => patientService.addAllergy(data),
        disease:   () => patientService.addDisease(data),
        medication:() => patientService.addMedication(data),
        contact:   () => patientService.addEmergencyContact(data),
      };
      await map[type]();
      await refresh();
      setShow(s => ({ ...s, [type]: false }));
      toast.success('Added successfully.');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed.'); }
    finally { setSaving(false); }
  };

  const handleRemove = async (type, id) => {
    if (!window.confirm('Remove this entry?')) return;
    try {
      const map = {
        allergy:   () => patientService.removeAllergy(id),
        disease:   () => patientService.removeDisease(id),
        medication:() => patientService.removeMedication(id),
        contact:   () => patientService.removeEmergencyContact(id),
      };
      await map[type]();
      await refresh();
      toast.success('Removed.');
    } catch { toast.error('Failed to remove.'); }
  };

  if (loading) return <div className="page-container"><div className="card p-10 text-center text-slate-400">Loading...</div></div>;

  const SEV = { mild:'badge-pending', moderate:'bg-orange-100 text-orange-700', severe:'badge-rejected' };

  return (
    <div className="page-container space-y-5 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">Medical Information</h1>
        <p className="text-slate-400 text-sm mt-1">Keep your health data up to date for better emergency response.</p>
      </div>

      {/* Core medical info */}
      <Section icon={Heart} title="Basic Health Info" color="bg-red-100 text-red-600">
        {!editingCore ? (
          <div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {[
                ['Blood Group', profile?.bloodGroup || '—'],
                ['Height',      profile?.height ? `${profile.height} cm` : '—'],
                ['Weight',      profile?.weight ? `${profile.weight} kg` : '—'],
                ['BMI',         profile?.bmi || '—'],
              ].map(([l, v]) => (
                <div key={l} className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-400">{l}</p>
                  <p className="font-semibold text-slate-900 mt-0.5">{v}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-3 text-sm text-slate-600">
              <span className={profile?.isOrganDonor ? 'text-green-600 font-medium' : ''}>
                {profile?.isOrganDonor ? '✓ Organ Donor' : 'Not an organ donor'}
              </span>
              {profile?.insuranceProvider && <span>· {profile.insuranceProvider}</span>}
            </div>
            <button onClick={() => setEditingCore(true)} className="btn-secondary btn btn-sm mt-4 gap-1"><Edit2 size={14}/>Edit</button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="label">Blood Group</label>
                <select className="input" value={coreForm.bloodGroup} onChange={e => setCoreForm(f=>({...f,bloodGroup:e.target.value}))}>
                  {['unknown','A+','A-','B+','B-','AB+','AB-','O+','O-'].map(b => <option key={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Height (cm)</label>
                <input type="number" className="input" value={coreForm.height} onChange={e=>setCoreForm(f=>({...f,height:e.target.value}))} placeholder="175"/>
              </div>
              <div>
                <label className="label">Weight (kg)</label>
                <input type="number" className="input" value={coreForm.weight} onChange={e=>setCoreForm(f=>({...f,weight:e.target.value}))} placeholder="70"/>
              </div>
              <div>
                <label className="label">Organ Donor</label>
                <select className="input" value={coreForm.isOrganDonor} onChange={e=>setCoreForm(f=>({...f,isOrganDonor:e.target.value==='true'}))}>
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </div>
              <div>
                <label className="label">Insurance Provider</label>
                <input className="input" value={coreForm.insuranceProvider} onChange={e=>setCoreForm(f=>({...f,insuranceProvider:e.target.value}))} placeholder="Provider name"/>
              </div>
              <div>
                <label className="label">Policy Number</label>
                <input className="input" value={coreForm.insurancePolicyNo} onChange={e=>setCoreForm(f=>({...f,insurancePolicyNo:e.target.value}))} placeholder="Policy #"/>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={saveCore} disabled={saving} className="btn-primary btn btn-sm gap-1"><Check size={14}/>Save</button>
              <button onClick={()=>setEditingCore(false)} className="btn-secondary btn btn-sm gap-1"><X size={14}/>Cancel</button>
            </div>
          </div>
        )}
      </Section>

      {/* Allergies */}
      <Section icon={AlertTriangle} title="Allergies" color="bg-red-100 text-red-600"
        onAdd={() => setShow(s=>({...s,allergy:!s.allergy}))}>
        {show.allergy && (
          <div className="mb-4">
            <AddForm
              fields={[
                {key:'allergen',   label:'Allergen',  placeholder:'e.g. Penicillin'},
                {key:'reaction',   label:'Reaction',  placeholder:'e.g. Rash'},
                {key:'severity',   label:'Severity',  type:'select', options:['mild','moderate','severe'], default:'mild'},
              ]}
              onSave={d=>handleAdd('allergy',d)} onCancel={()=>setShow(s=>({...s,allergy:false}))} loading={saving}
            />
          </div>
        )}
        {profile?.allergies?.length ? (
          <div className="space-y-2">
            {profile.allergies.map(a => (
              <div key={a._id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <span className="font-medium text-slate-900 text-sm">{a.allergen}</span>
                  {a.reaction && <span className="text-slate-400 text-xs ml-2">— {a.reaction}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`badge ${SEV[a.severity]||'badge-gray'}`}>{a.severity}</span>
                  <button onClick={()=>handleRemove('allergy',a._id)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={15}/></button>
                </div>
              </div>
            ))}
          </div>
        ) : <p className="text-slate-400 text-sm">No allergies recorded.</p>}
      </Section>

      {/* Chronic diseases */}
      <Section icon={Activity} title="Chronic Diseases / Conditions" color="bg-orange-100 text-orange-600"
        onAdd={() => setShow(s=>({...s,disease:!s.disease}))}>
        {show.disease && (
          <div className="mb-4">
            <AddForm
              fields={[
                {key:'name',          label:'Condition',    placeholder:'e.g. Type 2 Diabetes', full:true},
                {key:'diagnosedDate', label:'Diagnosed',    type:'date'},
                {key:'notes',         label:'Notes',        placeholder:'Optional notes'},
              ]}
              onSave={d=>handleAdd('disease',d)} onCancel={()=>setShow(s=>({...s,disease:false}))} loading={saving}
            />
          </div>
        )}
        {profile?.chronicDiseases?.length ? (
          <div className="space-y-2">
            {profile.chronicDiseases.map(d => (
              <div key={d._id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <span className="font-medium text-slate-900 text-sm">{d.name}</span>
                  {d.diagnosedDate && <span className="text-slate-400 text-xs ml-2">since {new Date(d.diagnosedDate).getFullYear()}</span>}
                </div>
                <button onClick={()=>handleRemove('disease',d._id)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={15}/></button>
              </div>
            ))}
          </div>
        ) : <p className="text-slate-400 text-sm">No conditions recorded.</p>}
      </Section>

      {/* Medications */}
      <Section icon={Pill} title="Current Medications" color="bg-violet-100 text-violet-600"
        onAdd={() => setShow(s=>({...s,medication:!s.medication}))}>
        {show.medication && (
          <div className="mb-4">
            <AddForm
              fields={[
                {key:'name',      label:'Medication',  placeholder:'e.g. Metformin'},
                {key:'dosage',    label:'Dosage',      placeholder:'e.g. 500mg'},
                {key:'frequency', label:'Frequency',   placeholder:'e.g. Twice daily'},
                {key:'startDate', label:'Start Date',  type:'date'},
              ]}
              onSave={d=>handleAdd('medication',d)} onCancel={()=>setShow(s=>({...s,medication:false}))} loading={saving}
            />
          </div>
        )}
        {profile?.medications?.length ? (
          <div className="space-y-2">
            {profile.medications.map(m => (
              <div key={m._id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <span className="font-medium text-slate-900 text-sm">{m.name}</span>
                  {m.dosage && <span className="text-slate-400 text-xs ml-2">{m.dosage} — {m.frequency}</span>}
                </div>
                <button onClick={()=>handleRemove('medication',m._id)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={15}/></button>
              </div>
            ))}
          </div>
        ) : <p className="text-slate-400 text-sm">No medications recorded.</p>}
      </Section>

      {/* Emergency contacts */}
      <Section icon={Phone} title="Emergency Contacts" color="bg-green-100 text-green-600"
        onAdd={() => setShow(s=>({...s,contact:!s.contact}))}>
        {show.contact && (
          <div className="mb-4">
            <AddForm
              fields={[
                {key:'name',         label:'Name',         placeholder:'Full name'},
                {key:'relationship', label:'Relationship', placeholder:'e.g. Spouse'},
                {key:'phone',        label:'Phone',        placeholder:'+1 234 567 8900'},
                {key:'email',        label:'Email',        placeholder:'optional', type:'email'},
              ]}
              onSave={d=>handleAdd('contact',d)} onCancel={()=>setShow(s=>({...s,contact:false}))} loading={saving}
            />
          </div>
        )}
        {profile?.emergencyContacts?.length ? (
          <div className="space-y-2">
            {profile.emergencyContacts.map(c => (
              <div key={c._id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <span className="font-medium text-slate-900 text-sm">{c.name}</span>
                  <span className="text-slate-400 text-xs ml-2 capitalize">{c.relationship}</span>
                  <span className="text-slate-500 text-xs ml-2">{c.phone}</span>
                </div>
                <button onClick={()=>handleRemove('contact',c._id)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={15}/></button>
              </div>
            ))}
          </div>
        ) : <p className="text-slate-400 text-sm">No emergency contacts added.</p>}
      </Section>
    </div>
  );
};

export default MedicalInfo;
