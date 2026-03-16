import { useEffect, useState } from 'react';
import api from '../../services/api';
import { ShieldAlert, RefreshCw, Eye, User, Building2, Stethoscope, Search } from 'lucide-react';

const LEVEL_STYLE = {
  full:                'bg-blue-100 text-blue-700',
  emergency_essential: 'bg-violet-100 text-violet-700',
  public_emergency:    'bg-slate-100 text-slate-600',
};
const LEVEL_LABEL = {
  full:                'Full Access',
  emergency_essential: 'Hospital Essential',
  public_emergency:    'Public',
};
const ROLE_ICON = {
  doctor:   <Stethoscope size={13}/>,
  hospital: <Building2 size={13}/>,
  patient:  <User size={13}/>,
  public:   <Eye size={13}/>,
};

const EmergencyLogs = () => {
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('');   // role filter
  const [search,  setSearch]  = useState('');
  const [page,    setPage]    = useState(1);
  const [total,   setTotal]   = useState(0);
  const LIMIT = 20;

  const load = async (p = 1, role = filter) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, limit: LIMIT });
      if (role) params.append('role', role);
      const res = await api.get(`/emergency/logs?${params}`);
      setLogs(res.data.data.logs || []);
      setTotal(res.data.data.pagination?.total || 0);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { load(1); }, [filter]);

  const filtered = search
    ? logs.filter(l => {
        const pat = l.patient ? `${l.patient.firstName} ${l.patient.lastName} ${l.patient.email}`.toLowerCase() : '';
        const acc = l.accessorName?.toLowerCase() || '';
        return pat.includes(search.toLowerCase()) || acc.includes(search.toLowerCase());
      })
    : logs;

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="page-container animate-fade-in space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Emergency QR Access Logs</h1>
          <p className="text-slate-400 text-sm mt-1">
            Audit trail of every QR code scan. Total: <strong>{total}</strong> scans.
          </p>
        </div>
        <button onClick={()=>load(page)} className="btn-secondary btn btn-sm gap-1.5">
          <RefreshCw size={14}/>Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input className="input pl-9" placeholder="Search patient or accessor…"
            value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <div className="flex gap-2">
          {[['','All'],['public','Public'],['doctor','Doctor'],['hospital','Hospital'],['patient','Patient']].map(([v,l])=>(
            <button key={v} onClick={()=>{ setFilter(v); setPage(1); }}
              className={`btn btn-sm ${filter===v?'btn-primary':'btn-secondary'}`}>{l}</button>
          ))}
        </div>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label:'Full (Doctor)',      level:'full',                icon:<Stethoscope size={16}/>, color:'bg-blue-100 text-blue-700' },
          { label:'Hospital Essential', level:'emergency_essential', icon:<Building2 size={16}/>,   color:'bg-violet-100 text-violet-700' },
          { label:'Public Scans',       level:'public_emergency',    icon:<Eye size={16}/>,          color:'bg-slate-100 text-slate-700' },
        ].map(({ label, level, icon, color }) => {
          const count = logs.filter(l => l.accessLevel === level).length;
          return (
            <div key={level} className="card p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>{icon}</div>
              <div>
                <p className="text-lg font-display font-bold text-slate-900">{count}</p>
                <p className="text-xs text-slate-400">{label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Time','Patient','Accessed By','Role','Access Level','IP'].map(h=>(
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [...Array(5)].map((_,i)=>(
                  <tr key={i}><td colSpan={6} className="px-4 py-3">
                    <div className="h-6 bg-slate-100 rounded animate-pulse"/>
                  </td></tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center">
                  <ShieldAlert size={32} className="text-slate-200 mx-auto mb-2"/>
                  <p className="text-slate-400">No access logs found.</p>
                </td></tr>
              ) : filtered.map(log => (
                <tr key={log._id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className="text-xs font-medium text-slate-900">
                      {new Date(log.accessedAt).toLocaleDateString()}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {new Date(log.accessedAt).toLocaleTimeString()}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {log.patient ? (
                      <div>
                        <p className="font-medium text-slate-900 text-xs">{log.patient.firstName} {log.patient.lastName}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{log.patient.qrId?.slice(0,8)}…</p>
                      </div>
                    ) : <span className="text-slate-400 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-slate-900">{log.accessorName || 'Anonymous'}</p>
                    {log.accessedBy?.email && <p className="text-[10px] text-slate-400">{log.accessedBy.email}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-xs text-slate-600 capitalize">
                      {ROLE_ICON[log.accessorRole]}{log.accessorRole}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge text-[10px] ${LEVEL_STYLE[log.accessLevel]||'bg-slate-100 text-slate-600'}`}>
                      {LEVEL_LABEL[log.accessLevel]||log.accessLevel}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-mono text-slate-400">{log.ipAddress || '—'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
            <p className="text-xs text-slate-400">Page {page} of {totalPages} · {total} total</p>
            <div className="flex gap-2">
              <button disabled={page===1} onClick={()=>{ setPage(p=>p-1); load(page-1); }}
                className="btn-secondary btn btn-sm disabled:opacity-40">Prev</button>
              <button disabled={page===totalPages} onClick={()=>{ setPage(p=>p+1); load(page+1); }}
                className="btn-secondary btn btn-sm disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmergencyLogs;
