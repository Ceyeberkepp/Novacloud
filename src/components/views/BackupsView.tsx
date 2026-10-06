import React, { useEffect, useState } from 'react';
import { Archive, RefreshCw } from 'lucide-react';

interface BackupsViewProps {
  themeMode?: 'dark' | 'light';
}

interface ResourceRecord {
  id: string;
  provider?: string | null;
  external_id?: string | null;
  data?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export const BackupsView: React.FC<BackupsViewProps> = ({ themeMode = 'dark' }) => {
  const isLight = themeMode === 'light';
  const [items, setItems] = useState<ResourceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/resources?type=snapshot');
      if (!res.ok) throw new Error('Failed to load snapshots');
      setItems(await res.json());
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Archive className="w-5 h-5 text-cyan-500" />
            <h1 className="text-xl font-bold">Backups & Snapshots</h1>
          </div>
          <p className={`text-xs mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            Inventory from connected providers and persisted NovaCloud resources only.
          </p>
        </div>
        <button onClick={load} disabled={loading} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <div className={`rounded-xl border overflow-hidden ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900/70 border-slate-800'}`}>
        {items.length === 0 ? (
          <div className={`p-8 text-center text-sm ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            No real snapshots have been discovered or created yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/40">
            {items.map((item) => (
              <div key={item.id} className="p-4 flex items-center justify-between gap-4">
                <div>
                  <div className="font-semibold">{String(item.data?.name || item.external_id || item.id)}</div>
                  <div className={`text-xs mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    Provider: {item.provider || 'local'}
                  </div>
                </div>
                <div className={`text-xs font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  {item.updated_at ? new Date(item.updated_at).toLocaleString() : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
