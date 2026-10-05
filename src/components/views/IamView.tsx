import React, { useEffect, useState } from 'react';
import { RefreshCw, Users } from 'lucide-react';

interface IamViewProps {
  themeMode?: 'dark' | 'light';
  activeSubTab?: string;
  onTabChange?: (tab: string) => void;
}

interface UserRecord {
  id: string;
  email: string;
  displayName: string;
  role: string;
  active: boolean;
  createdAt: string;
  lastLoginAt?: string | null;
}

export const IamView: React.FC<IamViewProps> = ({ themeMode = 'dark' }) => {
  const isLight = themeMode === 'light';
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/iam/users');
      if (!response.ok) throw new Error('Unable to load users');
      setUsers(await response.json());
    } catch {
      setUsers([]);
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
            <Users className="w-5 h-5 text-cyan-500" />
            <h1 className="text-xl font-bold">Identity & Access Management</h1>
          </div>
          <p className={`text-xs mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            Active accounts stored in the NovaCloud PostgreSQL database.
          </p>
        </div>
        <button onClick={load} disabled={loading} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <div className={`rounded-xl border overflow-hidden ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900/70 border-slate-800'}`}>
        {users.length === 0 ? (
          <div className={`p-8 text-center text-sm ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            No users found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className={isLight ? 'bg-slate-50' : 'bg-slate-950/60'}>
                <tr className="text-left text-xs text-slate-500">
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Last Login</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t border-slate-800/40">
                    <td className="px-4 py-3">
                      <div className="font-semibold">{user.displayName}</div>
                      <div className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{user.email}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{user.role}</td>
                    <td className="px-4 py-3">{user.active ? 'Active' : 'Disabled'}</td>
                    <td className="px-4 py-3 text-xs font-mono">{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-xs font-mono">{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}</td>
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
