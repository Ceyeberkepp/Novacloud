import React, { useEffect, useMemo, useState } from 'react';
import { Download, FileText, RefreshCw, Search } from 'lucide-react';

interface LogsViewProps {
  themeMode?: 'dark' | 'light';
}

interface AuditEvent {
  id: string;
  actor: string;
  action: string;
  resource: string;
  status: string;
  ip?: string | null;
  timestamp: string;
}

export const LogsView: React.FC<LogsViewProps> = ({ themeMode = 'dark' }) => {
  const isLight = themeMode === 'light';
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/activity');
      if (!response.ok) throw new Error('Unable to load activity');
      setEvents(await response.json());
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return events;
    return events.filter((event) =>
      [event.actor, event.action, event.resource, event.status, event.ip || '']
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [events, search]);

  const download = () => {
    const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `novacloud-audit-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-500" />
            <h1 className="text-xl font-bold">Audit Logs</h1>
          </div>
          <p className={`text-xs mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            Real NovaCloud activity stored in PostgreSQL.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} disabled={loading} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button onClick={download} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      <div className={`rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900/70 border-slate-800'}`}>
        <div className="p-4 border-b border-slate-800/40">
          <div className="relative max-w-xl">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search actor, action, resource, status or IP"
              className={`w-full pl-9 pr-3 py-2 rounded-lg border text-sm outline-none ${isLight ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-800'}`}
            />
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className={`p-8 text-center text-sm ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            No audit events have been recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className={isLight ? 'bg-slate-50' : 'bg-slate-950/60'}>
                <tr className="text-left text-xs text-slate-500">
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Resource</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Source IP</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((event) => (
                  <tr key={event.id} className="border-t border-slate-800/40">
                    <td className="px-4 py-3 text-xs font-mono">{new Date(event.timestamp).toLocaleString()}</td>
                    <td className="px-4 py-3">{event.actor}</td>
                    <td className="px-4 py-3">{event.action}</td>
                    <td className="px-4 py-3 font-mono text-xs">{event.resource}</td>
                    <td className="px-4 py-3">{event.status}</td>
                    <td className="px-4 py-3 font-mono text-xs">{event.ip || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
