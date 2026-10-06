import React, { useEffect, useState } from 'react';
import { Activity, Cpu, Database, HardDrive, MemoryStick, Network, RefreshCw, Server } from 'lucide-react';

interface MonitoringViewProps {
  themeMode: 'dark' | 'light';
  activeSubTab?: string;
  onTabChange?: (tab: string) => void;
}

interface SystemSummary {
  hostname: string;
  platform: string;
  release: string;
  architecture: string;
  cpuModel: string;
  cpuCount: number;
  loadAverage: number[];
  uptimeSeconds: number;
  memory: {
    totalBytes: number;
    usedBytes: number;
    freeBytes: number;
    usedPercent: number;
  };
  disk: {
    totalBytes: number;
    usedBytes: number;
    freeBytes: number;
  };
  database: {
    resources: number;
    activeUsers: number;
    activityEvents: number;
  };
  network: Array<{ name: string; address: string; cidr?: string | null }>;
  timestamp: string;
}

const formatBytes = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index >= 3 ? 1 : 0)} ${units[index]}`;
};

const formatUptime = (seconds: number) => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${days}d ${hours}h ${minutes}m`;
};

export const MonitoringView: React.FC<MonitoringViewProps> = ({ themeMode }) => {
  const [summary, setSummary] = useState<SystemSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isLight = themeMode === 'light';

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/system/summary');
      if (!response.ok) throw new Error('Unable to load live telemetry');
      setSummary(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load live telemetry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 15000);
    return () => window.clearInterval(timer);
  }, []);

  const card = isLight
    ? 'bg-white border-slate-200'
    : 'bg-slate-900/70 border-slate-800';
  const muted = isLight ? 'text-slate-500' : 'text-slate-400';

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-500" />
            <h1 className="text-xl font-bold">Live Monitoring</h1>
          </div>
          <p className={`text-xs mt-1 ${muted}`}>
            Real telemetry from this NovaCloud container and its PostgreSQL database.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold cursor-pointer disabled:opacity-50 ${card}`}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {!summary && loading ? (
        <div className={`rounded-xl border p-8 text-center ${card} ${muted}`}>
          Loading live telemetry…
        </div>
      ) : summary ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              {
                label: 'Host',
                value: summary.hostname,
                detail: `${summary.platform} ${summary.release} • ${summary.architecture}`,
                icon: Server,
              },
              {
                label: 'CPU',
                value: `${summary.cpuCount} cores`,
                detail: `Load 1m: ${summary.loadAverage?.[0]?.toFixed(2) ?? '0.00'}`,
                icon: Cpu,
              },
              {
                label: 'Memory',
                value: `${summary.memory.usedPercent}% used`,
                detail: `${formatBytes(summary.memory.usedBytes)} / ${formatBytes(summary.memory.totalBytes)}`,
                icon: MemoryStick,
              },
              {
                label: 'Root Disk',
                value: formatBytes(summary.disk.usedBytes),
                detail: `${formatBytes(summary.disk.freeBytes)} free of ${formatBytes(summary.disk.totalBytes)}`,
                icon: HardDrive,
              },
            ].map(({ label, value, detail, icon: Icon }) => (
              <div key={label} className={`rounded-xl border p-4 ${card}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold uppercase tracking-wide ${muted}`}>{label}</span>
                  <Icon className="w-4 h-4 text-cyan-500" />
                </div>
                <div className="mt-3 text-lg font-bold font-mono">{value}</div>
                <div className={`mt-1 text-[11px] font-mono ${muted}`}>{detail}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className={`rounded-xl border p-5 ${card}`}>
              <div className="flex items-center gap-2 mb-4">
                <Database className="w-4 h-4 text-cyan-500" />
                <h2 className="font-semibold">NovaCloud Database</h2>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <div className="text-2xl font-bold font-mono">{summary.database.resources}</div>
                  <div className={`text-[11px] ${muted}`}>Resources</div>
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono">{summary.database.activeUsers}</div>
                  <div className={`text-[11px] ${muted}`}>Active users</div>
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono">{summary.database.activityEvents}</div>
                  <div className={`text-[11px] ${muted}`}>Activity events</div>
                </div>
              </div>
              <div className={`mt-4 pt-4 border-t text-xs ${isLight ? 'border-slate-200' : 'border-slate-800'} ${muted}`}>
                Container uptime: {formatUptime(summary.uptimeSeconds)}
              </div>
            </div>

            <div className={`rounded-xl border p-5 ${card}`}>
              <div className="flex items-center gap-2 mb-4">
                <Network className="w-4 h-4 text-cyan-500" />
                <h2 className="font-semibold">Network Interfaces</h2>
              </div>
              {summary.network.length === 0 ? (
                <div className={`text-sm ${muted}`}>No non-loopback IPv4 interfaces detected.</div>
              ) : (
                <div className="space-y-3">
                  {summary.network.map((entry) => (
                    <div key={`${entry.name}-${entry.address}`} className="flex items-center justify-between gap-4">
                      <div className="font-semibold text-sm">{entry.name}</div>
                      <div className={`font-mono text-xs ${muted}`}>{entry.cidr || entry.address}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className={`text-[11px] font-mono ${muted}`}>
            Last sampled: {new Date(summary.timestamp).toLocaleString()}
          </div>
        </>
      ) : null}
    </div>
  );
};
