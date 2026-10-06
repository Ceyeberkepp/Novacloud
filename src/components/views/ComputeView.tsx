import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Plus,
  Play,
  Square,
  RotateCw,
  Terminal,
  KeyRound,
  Trash2,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  Layers,
  ArrowUpDown,
  Download,
  Disc,
  Copy,
  Check,
  Shield,
  Upload,
  HardDrive,
  Users,
  Key,
  Server,
  RefreshCw,
} from 'lucide-react';
import { VMInstance } from '../../types';

interface ComputeViewProps {
  vms?: VMInstance[];
  onSelectVM: (vm: VMInstance) => void;
  onOpenCreateInstance: () => void;
  onToggleStatus: (id: string) => void;
  themeMode: 'dark' | 'light';
  activeSubTab?: string;
  onTabChange?: (tab: string) => void;
}

type ComputeTab = 'vms' | 'images' | 'snapshots' | 'instance-groups' | 'ssh-keys';

interface OSImage {
  id: string;
  name: string;
  distribution: string;
  version: string;
  arch: 'x86_64' | 'arm64';
  size: string;
  type: 'Public Golden' | 'Custom AMI';
  status: 'Ready';
}

interface Snapshot {
  id: string;
  name: string;
  sourceVm: string;
  sizeGb: number;
  created: string;
  encryption: string;
  status: 'Available' | 'Creating';
}

interface InstanceGroup {
  id: string;
  name: string;
  minSize: number;
  desiredSize: number;
  maxSize: number;
  healthyCount: number;
  scalingPolicy: string;
  region: string;
  status: 'Healthy' | 'Scaling';
}

interface SSHKey {
  id: string;
  name: string;
  fingerprint: string;
  type: 'ED25519' | 'RSA-4096';
  created: string;
  lastUsed: string;
}

const INITIAL_IMAGES: OSImage[] = [];
const INITIAL_SNAPSHOTS: Snapshot[] = [];
const INITIAL_GROUPS: InstanceGroup[] = [];
const INITIAL_KEYS: SSHKey[] = [];

export const ComputeView: React.FC<ComputeViewProps> = ({
  vms = [],
  onSelectVM,
  onOpenCreateInstance,
  onToggleStatus,
  themeMode,
  activeSubTab,
  onTabChange,
}) => {
  const [currentTab, setCurrentTab] = useState<ComputeTab>(
    (activeSubTab as ComputeTab) || 'vms'
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Running' | 'Stopped'>('All');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sub-items states
  const [images] = useState<OSImage[]>(INITIAL_IMAGES);
  const [snapshots, setSnapshots] = useState<Snapshot[]>(INITIAL_SNAPSHOTS);
  const [groups] = useState<InstanceGroup[]>(INITIAL_GROUPS);
  const [keys, setKeys] = useState<SSHKey[]>(INITIAL_KEYS);

  // Modals
  const [showAddKeyModal, setShowAddKeyModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newPublicKey, setNewPublicKey] = useState('');
  const [showCreateSnapModal, setShowCreateSnapModal] = useState(false);
  const [newSnapName, setNewSnapName] = useState('');
  const [newSnapVm, setNewSnapVm] = useState('vm-01');

  const isLight = themeMode === 'light';

  // Synchronize when activeSubTab prop changes
  useEffect(() => {
    if (activeSubTab && ['vms', 'images', 'snapshots', 'instance-groups', 'ssh-keys'].includes(activeSubTab)) {
      setCurrentTab(activeSubTab as ComputeTab);
    }
  }, [activeSubTab]);

  const handleTabSelect = (tab: ComputeTab) => {
    setCurrentTab(tab);
    onTabChange?.(tab);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleBulkTerminate = () => {
    const count = selectedIds.length;
    showToast(`Requested graceful ACPI termination signal for ${count} instance(s).`);
    setSelectedIds([]);
  };

  const handleAddSSHKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    const newKey: SSHKey = {
      id: `key-${Date.now().toString(36)}`,
      name: newKeyName.trim(),
      fingerprint: `SHA256:${Math.random().toString(36).substring(2, 15)}...`,
      type: newPublicKey.includes('ssh-rsa') ? 'RSA-4096' : 'ED25519',
      created: 'Just now',
      lastUsed: 'Never',
    };
    setKeys([newKey, ...keys]);
    setShowAddKeyModal(false);
    setNewKeyName('');
    setNewPublicKey('');
    showToast(`Public SSH key "${newKey.name}" registered across cloud-init infrastructure.`);
  };

  const handleCreateSnapshot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSnapName.trim()) return;
    const newSnap: Snapshot = {
      id: `snap-${Date.now().toString(36).substring(0, 8)}`,
      name: newSnapName.trim(),
      sourceVm: `${newSnapVm} (Live)`,
      sizeGb: 100,
      created: 'Just now',
      encryption: 'AES-256-XTS',
      status: 'Available',
    };
    setSnapshots([newSnap, ...snapshots]);
    setShowCreateSnapModal(false);
    setNewSnapName('');
    showToast(`Point-in-time snapshot "${newSnap.name}" created successfully.`);
  };

  const safeVms = Array.isArray(vms) ? vms : [];

  // Metrics
  const totalCount = safeVms.length;
  const runningCount = safeVms.filter((v) => v.status === 'Running').length;
  const stoppedCount = safeVms.filter((v) => v.status === 'Stopped').length;
  const avgCpu = Math.round(
    safeVms.reduce((acc, v) => acc + (v.metrics?.cpu || 0), 0) / (totalCount || 1)
  );
  const avgRam = Math.round(
    safeVms.reduce((acc, v) => acc + (v.metrics?.ram || 0), 0) / (totalCount || 1)
  );

  const filteredVms = safeVms.filter((vm) => {
    const matchesSearch =
      vm.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vm.ip.includes(searchTerm) ||
      vm.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || vm.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSelectAll = () => {
    if (selectedIds.length === filteredVms.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredVms.map((v) => v.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast feedback */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-lg shadow-xl border text-xs font-semibold animate-in fade-in slide-in-from-bottom-3 ${
            isLight
              ? 'bg-white border-emerald-300 text-emerald-900 shadow-emerald-500/10'
              : 'bg-slate-900 border-emerald-500/40 text-emerald-300 shadow-black/50'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-cyan-400" />
            <h1 className={`text-xl font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Compute Engine
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Manage high-performance virtual machines, gold machine images, block volume snapshots, and autoscaling groups.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {currentTab === 'snapshots' && (
            <button
              onClick={() => setShowCreateSnapModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs rounded-lg transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Snapshot</span>
            </button>
          )}
          {currentTab === 'ssh-keys' && (
            <button
              onClick={() => setShowAddKeyModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs rounded-lg transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Import SSH Key</span>
            </button>
          )}
          <button
            id="compute-create-instance-btn"
            onClick={onOpenCreateInstance}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg shadow-sm hover:shadow-cyan-500/25 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Launch Instance</span>
          </button>
        </div>
      </div>

      {/* Compute Submenu Tab Bar */}
      <div
        className={`flex items-center gap-1 border-b pb-px overflow-x-auto ${
          isLight ? 'border-slate-200' : 'border-slate-800'
        }`}
      >
        <button
          id="tab-compute-vms"
          onClick={() => handleTabSelect('vms')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 cursor-pointer whitespace-nowrap ${
            currentTab === 'vms'
              ? isLight
                ? 'border-cyan-600 text-cyan-700 bg-cyan-50/50'
                : 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
              : isLight
              ? 'border-transparent text-slate-500 hover:text-slate-800'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Server className="w-3.5 h-3.5" />
          <span>Virtual Machines</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
              currentTab === 'vms'
                ? isLight
                  ? 'bg-cyan-200 text-cyan-900'
                  : 'bg-cyan-500/30 text-cyan-200'
                : isLight
                ? 'bg-slate-200 text-slate-700'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {totalCount}
          </span>
        </button>

        <button
          id="tab-compute-images"
          onClick={() => handleTabSelect('images')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 cursor-pointer whitespace-nowrap ${
            currentTab === 'images'
              ? isLight
                ? 'border-cyan-600 text-cyan-700 bg-cyan-50/50'
                : 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
              : isLight
              ? 'border-transparent text-slate-500 hover:text-slate-800'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Disc className="w-3.5 h-3.5" />
          <span>Images & Templates</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
              currentTab === 'images'
                ? isLight
                  ? 'bg-cyan-200 text-cyan-900'
                  : 'bg-cyan-500/30 text-cyan-200'
                : isLight
                ? 'bg-slate-200 text-slate-700'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {images.length}
          </span>
        </button>

        <button
          id="tab-compute-snapshots"
          onClick={() => handleTabSelect('snapshots')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 cursor-pointer whitespace-nowrap ${
            currentTab === 'snapshots'
              ? isLight
                ? 'border-cyan-600 text-cyan-700 bg-cyan-50/50'
                : 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
              : isLight
              ? 'border-transparent text-slate-500 hover:text-slate-800'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <HardDrive className="w-3.5 h-3.5" />
          <span>Snapshots & Disks</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
              currentTab === 'snapshots'
                ? isLight
                  ? 'bg-cyan-200 text-cyan-900'
                  : 'bg-cyan-500/30 text-cyan-200'
                : isLight
                ? 'bg-slate-200 text-slate-700'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {snapshots.length}
          </span>
        </button>

        <button
          id="tab-compute-instance-groups"
          onClick={() => handleTabSelect('instance-groups')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 cursor-pointer whitespace-nowrap ${
            currentTab === 'instance-groups'
              ? isLight
                ? 'border-cyan-600 text-cyan-700 bg-cyan-50/50'
                : 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
              : isLight
              ? 'border-transparent text-slate-500 hover:text-slate-800'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Instance Groups</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
              currentTab === 'instance-groups'
                ? isLight
                  ? 'bg-cyan-200 text-cyan-900'
                  : 'bg-cyan-500/30 text-cyan-200'
                : isLight
                ? 'bg-slate-200 text-slate-700'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {groups.length}
          </span>
        </button>

        <button
          id="tab-compute-ssh-keys"
          onClick={() => handleTabSelect('ssh-keys')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 cursor-pointer whitespace-nowrap ${
            currentTab === 'ssh-keys'
              ? isLight
                ? 'border-cyan-600 text-cyan-700 bg-cyan-50/50'
                : 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
              : isLight
              ? 'border-transparent text-slate-500 hover:text-slate-800'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Key className="w-3.5 h-3.5" />
          <span>SSH Keys & Access</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
              currentTab === 'ssh-keys'
                ? isLight
                  ? 'bg-cyan-200 text-cyan-900'
                  : 'bg-cyan-500/30 text-cyan-200'
                : isLight
                ? 'bg-slate-200 text-slate-700'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {keys.length}
          </span>
        </button>
      </div>

      {/* TAB 1: VIRTUAL MACHINES */}
      {currentTab === 'vms' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div
              className={`p-3 rounded-xl border ${
                isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-900 border-slate-800'
              }`}
            >
              <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Total Instances</div>
              <div className="text-xl font-bold font-mono mt-1">{totalCount}</div>
            </div>
            <div
              className={`p-3 rounded-xl border ${
                isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-900 border-slate-800'
              }`}
            >
              <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Running</div>
              <div className="text-xl font-bold font-mono text-emerald-500 mt-1">{runningCount}</div>
            </div>
            <div
              className={`p-3 rounded-xl border ${
                isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-900 border-slate-800'
              }`}
            >
              <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Stopped</div>
              <div className="text-xl font-bold font-mono text-slate-400 mt-1">{stoppedCount}</div>
            </div>
            <div
              className={`p-3 rounded-xl border ${
                isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-900 border-slate-800'
              }`}
            >
              <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Avg CPU Load</div>
              <div className="text-xl font-bold font-mono text-cyan-400 mt-1">{avgCpu}%</div>
            </div>
            <div
              className={`p-3 rounded-xl border ${
                isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-900 border-slate-800'
              }`}
            >
              <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Avg RAM Used</div>
              <div className="text-xl font-bold font-mono text-indigo-400 mt-1">{avgRam}%</div>
            </div>
          </div>

          {/* Filters & Actions Bar */}
          <div
            className={`p-3 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-3 ${
              isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-900/60 border-slate-800'
            }`}
          >
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter by name, IP, type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border focus:outline-none focus:ring-1 ${
                    isLight
                      ? 'bg-slate-50 border-slate-200 text-slate-900 focus:ring-cyan-500'
                      : 'bg-slate-950 border-slate-800 text-white focus:ring-cyan-500'
                  }`}
                />
              </div>

              <div className="flex items-center gap-1 border-l pl-3 border-slate-700/50">
                {(['All', 'Running', 'Stopped'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                      statusFilter === st
                        ? isLight
                          ? 'bg-cyan-50 text-cyan-700 border border-cyan-300'
                          : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        : isLight
                        ? 'text-slate-500 hover:text-slate-900'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-mono">
                  {selectedIds.length} selected
                </span>
                <button
                  onClick={handleBulkTerminate}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-md transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Terminate</span>
                </button>
              </div>
            )}
          </div>

          {/* Instances Table */}
          <div
            className={`rounded-xl border overflow-hidden ${
              isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-900/60 border-slate-800'
            }`}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr
                    className={`border-b text-[11px] font-mono uppercase tracking-wider ${
                      isLight ? 'bg-slate-50/70 border-slate-200 text-slate-500' : 'bg-slate-950/40 border-slate-800 text-slate-400'
                    }`}
                  >
                    <th className="py-3 px-4 w-8">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === filteredVms.length && filteredVms.length > 0}
                        onChange={handleSelectAll}
                        className="rounded accent-cyan-500 cursor-pointer"
                      />
                    </th>
                    <th className="py-3 px-3">Instance</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Type / Spec</th>
                    <th className="py-3 px-3">Public IPv4</th>
                    <th className="py-3 px-3">Live CPU / RAM</th>
                    <th className="py-3 px-3">Zone</th>
                    <th className="py-3 px-3">Uptime</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800/60'}`}>
                  {filteredVms.map((vm) => {
                    const isSelected = selectedIds.includes(vm.id);
                    return (
                      <tr
                        key={vm.id}
                        onClick={() => onSelectVM(vm)}
                        className={`transition-colors cursor-pointer ${
                          isSelected
                            ? isLight
                              ? 'bg-cyan-50/70'
                              : 'bg-cyan-500/10'
                            : isLight
                            ? 'hover:bg-slate-50'
                            : 'hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOne(vm.id)}
                            className="rounded accent-cyan-500 cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold">{vm.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{vm.id}</div>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              vm.status === 'Running'
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                                : 'bg-slate-500/15 text-slate-400 border border-slate-500/25'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                vm.status === 'Running' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'
                              }`}
                            />
                            {vm.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-300">
                          {vm.type}
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-300">
                          {vm.ip}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] text-cyan-400">
                              CPU: {vm.metrics?.cpu || 0}%
                            </span>
                            <span className="text-slate-600">|</span>
                            <span className="font-mono text-[10px] text-indigo-400">
                              RAM: {vm.metrics?.ram || 0}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-400">
                          {vm.zone}
                        </td>
                        <td className="py-3 px-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                          {vm.created.split(' ')[0]}
                        </td>
                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => onToggleStatus(vm.id)}
                              className={`p-1 rounded transition-colors cursor-pointer ${
                                isLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                              }`}
                              title={vm.status === 'Running' ? 'Stop instance' : 'Start instance'}
                            >
                              {vm.status === 'Running' ? (
                                <Square className="w-3.5 h-3.5 text-amber-500 fill-amber-500/30" />
                              ) : (
                                <Play className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500/30" />
                              )}
                            </button>
                            <button
                              onClick={() => onSelectVM(vm)}
                              className={`px-2 py-1 font-semibold rounded text-[11px] transition-colors cursor-pointer ${
                                isLight
                                  ? 'bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border border-cyan-200'
                                  : 'bg-slate-800 hover:bg-slate-700 text-cyan-400'
                              }`}
                            >
                              Inspect
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: IMAGES & TEMPLATES */}
      {currentTab === 'images' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Verified operating system images and customized gold images preloaded with developer runtimes and hypervisor tools.
            </p>
            <button
              onClick={() => showToast('Connecting to image registry... Direct QCOW2/RAW upload enabled.')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import Custom Image</span>
            </button>
          </div>

          <div
            className={`rounded-xl border overflow-hidden ${
              isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-900/60 border-slate-800'
            }`}
          >
            <table className="w-full text-left text-xs">
              <thead>
                <tr
                  className={`border-b text-[11px] font-mono uppercase tracking-wider ${
                    isLight ? 'bg-slate-50/70 border-slate-200 text-slate-500' : 'bg-slate-950/40 border-slate-800 text-slate-400'
                  }`}
                >
                  <th className="py-3 px-4">Image Name</th>
                  <th className="py-3 px-3">Distribution</th>
                  <th className="py-3 px-3">Version</th>
                  <th className="py-3 px-3">Architecture</th>
                  <th className="py-3 px-3">Min Disk</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800/60'}`}>
                {images.map((img) => (
                  <tr
                    key={img.id}
                    className={`transition-colors ${
                      isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-200">{img.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{img.id}</div>
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-300">{img.distribution}</td>
                    <td className="py-3 px-3 font-mono text-slate-400">{img.version}</td>
                    <td className="py-3 px-3 font-mono text-cyan-400">{img.arch}</td>
                    <td className="py-3 px-3 font-mono text-slate-300">{img.size}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          img.type === 'Custom AMI'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : 'bg-slate-500/20 text-slate-300 border border-slate-600/30'
                        }`}
                      >
                        {img.type}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        {img.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={onOpenCreateInstance}
                        className="px-2.5 py-1 text-xs font-semibold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded transition-colors cursor-pointer"
                      >
                        Deploy
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SNAPSHOTS & DISKS */}
      {currentTab === 'snapshots' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Point-in-time incremental backups of root and attached NVMe block storage volumes.
            </p>
            <button
              onClick={() => setShowCreateSnapModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Snapshot</span>
            </button>
          </div>

          <div
            className={`rounded-xl border overflow-hidden ${
              isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-900/60 border-slate-800'
            }`}
          >
            <table className="w-full text-left text-xs">
              <thead>
                <tr
                  className={`border-b text-[11px] font-mono uppercase tracking-wider ${
                    isLight ? 'bg-slate-50/70 border-slate-200 text-slate-500' : 'bg-slate-950/40 border-slate-800 text-slate-400'
                  }`}
                >
                  <th className="py-3 px-4">Snapshot Name</th>
                  <th className="py-3 px-3">Source Instance</th>
                  <th className="py-3 px-3">Size</th>
                  <th className="py-3 px-3">Encryption</th>
                  <th className="py-3 px-3">Created</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800/60'}`}>
                {snapshots.map((snap) => (
                  <tr
                    key={snap.id}
                    className={`transition-colors ${
                      isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-200">{snap.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{snap.id}</div>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-300">{snap.sourceVm}</td>
                    <td className="py-3 px-3 font-mono text-cyan-400">{snap.sizeGb} GB</td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                        <Shield className="w-3 h-3" />
                        {snap.encryption}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">{snap.created}</td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        {snap.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => showToast(`Restoring volume from snapshot ${snap.id}...`)}
                          className="px-2.5 py-1 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded transition-colors cursor-pointer"
                        >
                          Restore
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: INSTANCE GROUPS */}
      {currentTab === 'instance-groups' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Autoscaling instance groups ensure high availability, automatic replacement of unhealthy nodes, and dynamic elasticity.
            </p>
            <button
              onClick={() => showToast('Opening Autoscaling Group creation wizard...')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Instance Group</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groups.map((grp) => (
              <div
                key={grp.id}
                className={`p-4 rounded-xl border space-y-3 ${
                  isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-900/70 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-200">{grp.name}</h3>
                    <span className="text-[10px] text-slate-400 font-mono">{grp.id} · {grp.region}</span>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    {grp.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/60 text-center">
                  <div className="p-2 rounded bg-slate-950/50 border border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase">Min / Max</div>
                    <div className="font-mono font-bold text-slate-200 mt-0.5">
                      {grp.minSize} / {grp.maxSize}
                    </div>
                  </div>
                  <div className="p-2 rounded bg-slate-950/50 border border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase">Desired Pool</div>
                    <div className="font-mono font-bold text-cyan-400 mt-0.5">{grp.desiredSize} Nodes</div>
                  </div>
                  <div className="p-2 rounded bg-slate-950/50 border border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase">Healthy</div>
                    <div className="font-mono font-bold text-emerald-400 mt-0.5">{grp.healthyCount} / {grp.desiredSize}</div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                  <span>Policy: <strong className="text-slate-200">{grp.scalingPolicy}</strong></span>
                  <button
                    onClick={() => showToast(`Triggered manual pool evaluation for ${grp.name}.`)}
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-medium cursor-pointer"
                  >
                    Edit Policy
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: SSH KEYS & ACCESS */}
      {currentTab === 'ssh-keys' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">
              SSH public keys are automatically injected into <code className="text-cyan-400 font-mono">~/.ssh/authorized_keys</code> via cloud-init upon instance boot.
            </p>
            <button
              onClick={() => setShowAddKeyModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Import SSH Key</span>
            </button>
          </div>

          <div
            className={`rounded-xl border overflow-hidden ${
              isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-900/60 border-slate-800'
            }`}
          >
            <table className="w-full text-left text-xs">
              <thead>
                <tr
                  className={`border-b text-[11px] font-mono uppercase tracking-wider ${
                    isLight ? 'bg-slate-50/70 border-slate-200 text-slate-500' : 'bg-slate-950/40 border-slate-800 text-slate-400'
                  }`}
                >
                  <th className="py-3 px-4">Key Name</th>
                  <th className="py-3 px-3">Algorithm</th>
                  <th className="py-3 px-3">Fingerprint</th>
                  <th className="py-3 px-3">Date Added</th>
                  <th className="py-3 px-3">Last Activity</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800/60'}`}>
                {keys.map((k) => (
                  <tr
                    key={k.id}
                    className={`transition-colors ${
                      isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-200 flex items-center gap-2">
                        <Key className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        {k.name}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">{k.id}</div>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-300">{k.type}</td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-400">
                      {k.fingerprint}
                    </td>
                    <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">{k.created}</td>
                    <td className="py-3 px-3 text-slate-300 font-mono text-[11px]">{k.lastUsed}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          setKeys(keys.filter((item) => item.id !== k.id));
                          showToast(`Revoked key ${k.name}.`);
                        }}
                        className="px-2 py-1 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors cursor-pointer"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: ADD SSH KEY */}
      {showAddKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div
            className={`w-full max-w-md p-5 rounded-xl border shadow-2xl space-y-4 ${
              isLight ? 'bg-white border-slate-300' : 'bg-slate-900 border-slate-700 text-slate-100'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Key className="w-4 h-4 text-cyan-400" />
                Import SSH Public Key
              </h3>
              <button
                onClick={() => setShowAddKeyModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddSSHKey} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Key Name / Tag
                </label>
                <input
                  type="text"
                  placeholder="e.g. dev-laptop-ed25519"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Public Key Data (ssh-rsa or ssh-ed25519)
                </label>
                <textarea
                  rows={4}
                  placeholder="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI... user@host"
                  value={newPublicKey}
                  onChange={(e) => setNewPublicKey(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddKeyModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold cursor-pointer"
                >
                  Register Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE SNAPSHOT */}
      {showCreateSnapModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div
            className={`w-full max-w-md p-5 rounded-xl border shadow-2xl space-y-4 ${
              isLight ? 'bg-white border-slate-300' : 'bg-slate-900 border-slate-700 text-slate-100'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-cyan-400" />
                Create Point-in-time Snapshot
              </h3>
              <button
                onClick={() => setShowCreateSnapModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateSnapshot} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Snapshot Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. web-frontend-snapshot-v2"
                  value={newSnapName}
                  onChange={(e) => setNewSnapName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Source Instance
                </label>
                <select
                  value={newSnapVm}
                  onChange={(e) => setNewSnapVm(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                >
                  {safeVms.map((v) => (
                    <option key={v.id} value={v.name}>
                      {v.name} ({v.type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateSnapModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold cursor-pointer"
                >
                  Take Snapshot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
