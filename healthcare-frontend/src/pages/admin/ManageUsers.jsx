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

// ── Delete confirmation modal ─────────────────────────────
const DeleteModal = ({ user, onConfirm, onClose, deleting }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <AlertTriangle size={22} className="text-red-600"/>
        </div>
        <div>
          <h3 className="font-display font-bold text-slate-900">Permanently Delete User</h3>
          <p className="text-sm text-slate-500">This action cannot be undone</p>
        </div>
      </div>

      <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 space-y-1.5 text-sm">
        <p className="font-semibold text-red-800">This will permanently delete:</p>
        <ul className="text-red-700 space-y-1">
          <li>• User account: <strong>{user.firstName} {user.lastName}</strong> ({user.role})</li>
          {user.role === 'patient'  && <li>• All medical records and emergency logs</li>}
          {user.role === 'doctor'   && <li>• Doctor profile and hospital affiliation</li>}
          {user.role === 'hospital' && <li>• Hospital profile and all managed doctors</li>}
          {user.role === 'lab'      && <li>• Lab profile and all uploaded reports</li>}
          <li>• All associated appointments</li>
        </ul>
      </div>

      <p className="text-sm text-slate-600 mb-4">
        Are you sure you want to delete <strong>{user.firstName} {user.lastName}</strong> ({user.email})?
      </p>

      <div className="flex gap-3">
        <button onClick={onClose} className="btn-secondary btn flex-1">Cancel</button>
        <button onClick={onConfirm} disabled={deleting}
          className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 px-4 rounded-xl flex-1 flex items-center justify-center gap-2 transition-colors disabled:opacity-60">
          {deleting ? <Loader size={16} className="animate-spin"/> : <Trash2 size={16}/>}
          {deleting ? 'Deleting…' : 'Delete Permanently'}
        </button>
      </div>
    </div>
  </div>
);

const ManageUsers = () => {
  const [users,       setUsers]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [role,        setRole]        = useState('');
  const [toDelete,    setToDelete]    = useState(null); // user object
  const [deleting,    setDeleting]    = useState(false);
  const [toggling,    setToggling]    = useState({}); // { [userId]: true }

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
      toast.success(`${toDelete.firstName} ${toDelete.lastName} deleted permanently.`);
      setUsers(prev => prev.filter(u => u._id !== toDelete._id));
      setToDelete(null);
    } catch (err) { toast.error(err.response?.data?.message || 'Delete failed.'); }
    finally { setDeleting(false); }
  };

  const filtered = users.filter(u => {
    const s = search.toLowerCase();
    return !s || `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(s);
  });

  // Group by role for summary
  const counts = users.reduce((acc, u) => { acc[u.role] = (acc[u.role] || 0) + 1; return acc; }, {});
  const inactive = users.filter(u => !u.isActive).length;

  return (
    <div className="page-container animate-fade-in space-y-5">
      {toDelete && (
        <DeleteModal
          user={toDelete}
          onConfirm={handleDelete}
          onClose={() => setToDelete(null)}
          deleting={deleting}
        />
      )}

      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">Manage Users</h1>
        <p className="text-slate-400 text-sm mt-1">View, deactivate, or permanently remove system users.</p>
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(counts).map(([r, n]) => (
          <button key={r} onClick={() => setRole(role === r ? '' : r)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border ${role === r ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}>
            <span>{ROLE_ICON[r]}</span>{r} <span className="opacity-60">({n})</span>
          </button>
        ))}
        {inactive > 0 && (
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-200">
            <ShieldOff size={12}/>{inactive} inactive
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input className="input pl-9 text-sm" placeholder="Search by name or email…"
            value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
        <select className="input w-auto text-sm" value={role} onChange={e => setRole(e.target.value)}>
          <option value="">All Roles ({users.length})</option>
          {['patient','doctor','hospital','lab','admin'].map(r => (
            <option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)} ({counts[r]||0})</option>
          ))}
        </select>
        {(search || role) && (
          <button onClick={() => { setSearch(''); setRole(''); }} className="btn-secondary btn text-sm gap-1.5">
            <X size={14}/>Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['User', 'Role', 'Status', 'Verification', 'Joined', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [...Array(6)].map((_,i) => (
                  <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-8 bg-slate-100 rounded animate-pulse"/></td></tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <User size={32} className="mx-auto mb-2 text-slate-200"/>
                    <p className="text-slate-400">No users found.</p>
                  </td>
                </tr>
              ) : filtered.map(u => (
                <tr key={u._id} className={`hover:bg-slate-50 transition-colors ${!u.isActive ? 'opacity-60' : ''}`}>
                  {/* User */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${ROLE_COLOR[u.role]}`}>
                        {u.firstName?.[0]}{u.lastName?.[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 whitespace-nowrap">{u.firstName} {u.lastName}</p>
                        <p className="text-xs text-slate-400">{u.email}</p>
                        {u.phone && <p className="text-xs text-slate-300">{u.phone}</p>}
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-semibold ${ROLE_COLOR[u.role]}`}>
                      <span>{ROLE_ICON[u.role]}</span>{u.role}
                    </span>
                  </td>

                  {/* Active status */}
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${u.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                      {u.isActive ? <Shield size={10}/> : <ShieldOff size={10}/>}
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>

                  {/* Verification */}
                  <td className="px-4 py-3">
                    {['doctor','hospital','lab'].includes(u.role) ? (
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        u.verificationStatus === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                        u.verificationStatus === 'rejected' ? 'bg-red-100 text-red-600' :
                        'bg-amber-100 text-amber-700'}`}>
                        {u.verificationStatus}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </td>

                  {/* Joined */}
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    {u.role !== 'admin' && (
                      <div className="flex items-center gap-3">
                        {/* Toggle active */}
                        <button
                          onClick={() => handleToggle(u)}
                          disabled={toggling[u._id]}
                          title={u.isActive ? 'Deactivate' : 'Activate'}
                          className={`flex items-center gap-1 text-xs font-medium transition-colors ${u.isActive ? 'text-amber-500 hover:text-amber-700' : 'text-emerald-600 hover:text-emerald-800'} disabled:opacity-50`}>
                          {toggling[u._id]
                            ? <Loader size={15} className="animate-spin"/>
                            : u.isActive ? <ToggleRight size={18}/> : <ToggleLeft size={18}/>}
                          <span className="hidden sm:inline">{u.isActive ? 'Deactivate' : 'Activate'}</span>
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => setToDelete(u)}
                          title="Delete permanently"
                          className="flex items-center gap-1 text-xs font-medium text-red-400 hover:text-red-700 transition-colors">
                          <Trash2 size={15}/>
                          <span className="hidden sm:inline">Delete</span>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer count */}
        {!loading && filtered.length > 0 && (
          <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 text-xs text-slate-400">
            Showing {filtered.length} of {users.length} users
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageUsers;
