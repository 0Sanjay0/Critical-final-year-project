import { useEffect, useState } from 'react';
import { adminService } from '../../services/other.service';
import api from '../../services/api';
import { Search, ToggleLeft, ToggleRight, User, Trash2, Shield, ShieldOff, AlertTriangle, X, Loader } from 'lucide-react';
import toast from 'react-hot-toast';

const ROLE_COLOR = {
  patient:  'bg-blue-100 text-blue-700',
  doctor:   'bg-emerald-100 text-emerald-700',
  hospital: 'bg-violet-100 text-violet-700',
  lab:      'bg-amber-100 text-amber-700',
  admin:    'bg-red-100 text-red-700',
};
const ROLE_ICON = { patient:'🧑', doctor:'👨‍⚕️', hospital:'🏥', lab:'🔬', admin:'🛡️' };

const DeleteModal = ({ user, onConfirm, onClose, deleting }) => (
  <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
    <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md p-5 sm:p-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-11 h-11 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <AlertTriangle size={20} className="text-red-600"/>
        </div>
        <div>
          <h3 className="font-display font-bold text-slate-900">Delete User</h3>
          <p className="text-xs text-slate-500">This cannot be undone</p>
        </div>
        <button onClick={onClose} className="ml-auto p-1 text-slate-400"><X size={18}/></button>
      </div>
      <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-sm space-y-1">
        <p className="font-semibold text-red-800">Will permanently delete:</p>
        <p className="text-red-700">• {user.firstName} {user.lastName} ({user.role})</p>
        {user.role === 'patient'  && <p className="text-red-700">• All medical records & emergency logs</p>}
        {user.role === 'doctor'   && <p className="text-red-700">• Doctor profile & hospital affiliation</p>}
        {user.role === 'hospital' && <p className="text-red-700">• Hospital profile & managed doctors</p>}
        <p className="text-red-700">• All associated appointments</p>
      </div>
      <div className="flex gap-3">
        <button onClick={onClose} className="btn-secondary btn flex-1">Cancel</button>
        <button onClick={onConfirm} disabled={deleting}
          className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 px-4 rounded-xl flex-1 flex items-center justify-center gap-2 transition-colors disabled:opacity-60">
          {deleting ? <Loader size={15} className="animate-spin"/> : <Trash2 size={15}/>}
          {deleting ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </div>
  </div>
);

// Mobile card view for each user
const UserCard = ({ u, onToggle, onDelete, toggling }) => (
  <div className={`card p-4 ${!u.isActive ? 'opacity-60' : ''}`}>
    <div className="flex items-start gap-3">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${ROLE_COLOR[u.role]}`}>
        {u.firstName?.[0]}{u.lastName?.[0]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-slate-900 text-sm">{u.firstName} {u.lastName}</p>
            <p className="text-xs text-slate-400 truncate">{u.email}</p>
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${ROLE_COLOR[u.role]}`}>
            {ROLE_ICON[u.role]} {u.role}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${u.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
            {u.isActive ? <Shield size={9}/> : <ShieldOff size={9}/>}
            {u.isActive ? 'Active' : 'Inactive'}
          </span>
          {['doctor','hospital','lab'].includes(u.role) && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${
              u.verificationStatus === 'approved' ? 'bg-emerald-100 text-emerald-700' :
              u.verificationStatus === 'rejected' ? 'bg-red-100 text-red-600' :
              'bg-amber-100 text-amber-700'}`}>
              {u.verificationStatus}
            </span>
          )}
          <span className="text-[10px] text-slate-400">{new Date(u.createdAt).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
    {u.role !== 'admin' && (
      <div className="flex gap-3 mt-3 pt-3 border-t border-slate-100">
        <button onClick={() => onToggle(u)} disabled={toggling[u._id]}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors border ${u.isActive ? 'border-amber-200 text-amber-600 hover:bg-amber-50' : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`}>
          {toggling[u._id] ? <Loader size={13} className="animate-spin"/> : u.isActive ? <ToggleRight size={15}/> : <ToggleLeft size={15}/>}
          {u.isActive ? 'Deactivate' : 'Activate'}
        </button>
        <button onClick={() => onDelete(u)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border border-red-200 text-red-500 hover:bg-red-50 transition-colors">
          <Trash2 size={13}/>Delete
        </button>
      </div>
    )}
  </div>
);

const ManageUsers = () => {
  const [users,    setUsers]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [role,     setRole]     = useState('');
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState({});

  const load = () => {
    setLoading(true);
    adminService.getUsers({ role: role || undefined, limit: 100 })
      .then(r => setUsers(r.data.data?.users || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [role]);

  const handleToggle = async (user) => {
    setToggling(t => ({ ...t, [user._id]: true }));
    try {
      await adminService.toggleActive(user._id);
      toast.success(`${user.firstName} ${user.isActive ? 'deactivated' : 'activated'}.`);
      setUsers(prev => prev.map(u => u._id === user._id ? { ...u, isActive: !u.isActive } : u));
    } catch (err) { toast.error(err.response?.data?.message || 'Failed.'); }
    finally { setToggling(t => ({ ...t, [user._id]: false })); }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/users/${toDelete._id}`, { data: { confirm: 'DELETE' } });
      toast.success(`${toDelete.firstName} ${toDelete.lastName} deleted.`);
      setUsers(prev => prev.filter(u => u._id !== toDelete._id));
      setToDelete(null);
    } catch (err) { toast.error(err.response?.data?.message || 'Delete failed.'); }
    finally { setDeleting(false); }
  };

  const filtered = users.filter(u => {
    const s = search.toLowerCase();
    return !s || `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(s);
  });

  const counts = users.reduce((acc, u) => { acc[u.role] = (acc[u.role] || 0) + 1; return acc; }, {});

  return (
    <div className="page-container animate-fade-in space-y-5">
      {toDelete && <DeleteModal user={toDelete} onConfirm={handleDelete} onClose={() => setToDelete(null)} deleting={deleting}/>}

      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">Manage Users</h1>
        <p className="text-slate-400 text-sm mt-1">View, deactivate, or remove users.</p>
      </div>

      {/* Role chips */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(counts).map(([r, n]) => (
          <button key={r} onClick={() => setRole(role === r ? '' : r)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border ${role === r ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-slate-200 bg-white text-slate-600'}`}>
            {ROLE_ICON[r]} {r} <span className="opacity-60">({n})</span>
          </button>
        ))}
      </div>

      {/* Search + filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input className="input pl-9 text-sm" placeholder="Search name or email…"
            value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
        {(search || role) && (
          <button onClick={() => { setSearch(''); setRole(''); }} className="btn-secondary btn text-sm px-3">
            <X size={14}/>
          </button>
        )}
      </div>

      {/* Mobile: card list | Desktop: table */}
      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_,i) => <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse"/>)}</div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <User size={32} className="mx-auto mb-2 text-slate-200"/>
          <p className="text-slate-400">No users found.</p>
        </div>
      ) : (
        <>
          {/* Mobile cards (hidden on md+) */}
          <div className="space-y-3 md:hidden">
            {filtered.map(u => (
              <UserCard key={u._id} u={u} onToggle={handleToggle} onDelete={setToDelete} toggling={toggling}/>
            ))}
          </div>

          {/* Desktop table (hidden on mobile) */}
          <div className="card overflow-hidden hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['User','Role','Status','Verification','Joined','Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(u => (
                    <tr key={u._id} className={`hover:bg-slate-50 transition-colors ${!u.isActive ? 'opacity-60' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${ROLE_COLOR[u.role]}`}>
                            {u.firstName?.[0]}{u.lastName?.[0]}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{u.firstName} {u.lastName}</p>
                            <p className="text-xs text-slate-400">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${ROLE_COLOR[u.role]}`}>
                          {ROLE_ICON[u.role]} {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1 w-fit ${u.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                          {u.isActive ? <Shield size={10}/> : <ShieldOff size={10}/>}{u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {['doctor','hospital','lab'].includes(u.role) ? (
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            u.verificationStatus === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                            u.verificationStatus === 'rejected' ? 'bg-red-100 text-red-600' :
                            'bg-amber-100 text-amber-700'}`}>
                            {u.verificationStatus}
                          </span>
                        ) : <span className="text-xs text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        {u.role !== 'admin' && (
                          <div className="flex items-center gap-3">
                            <button onClick={() => handleToggle(u)} disabled={toggling[u._id]}
                              className={`flex items-center gap-1 text-xs font-medium transition-colors disabled:opacity-50 ${u.isActive ? 'text-amber-500 hover:text-amber-700' : 'text-emerald-600 hover:text-emerald-800'}`}>
                              {toggling[u._id] ? <Loader size={14} className="animate-spin"/> : u.isActive ? <ToggleRight size={17}/> : <ToggleLeft size={17}/>}
                              {u.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                            <button onClick={() => setToDelete(u)}
                              className="flex items-center gap-1 text-xs font-medium text-red-400 hover:text-red-700 transition-colors">
                              <Trash2 size={14}/>Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 text-xs text-slate-400">
              Showing {filtered.length} of {users.length} users
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ManageUsers;
