import React, { useState, useEffect } from 'react';
import {
  HardDrive,
  Plus,
  Lock,
  Globe,
  Database,
  ArrowUpRight,
  CheckCircle2,
  Copy,
  Folder,
  File,
  Upload,
  Download,
  Check,
  X,
  Disc,
  Shield,
  Layers,
  Archive,
  RefreshCw,
} from 'lucide-react';
import { StorageItem } from '../../types';

interface StorageViewProps {
  storage: StorageItem[];
  themeMode: 'dark' | 'light';
  activeSubTab?: string;
  onTabChange?: (tab: string) => void;
}

type StorageSubTab = 'buckets' | 'volumes' | 'snapshots';

interface NVMeVolume {
  id: string;
  name: string;
  sizeGb: number;
  iops: number;
  throughput: string;
  attachedTo: string;
  mountPoint: string;
  zone: string;
  status: 'In-Use' | 'Available';
}

interface StorageSnapshot {
  id: string;
  name: string;
  sourceResource: string;
  sizeGb: number;
  tier: 'Standard S3' | 'Glacier Instant' | 'Glacier Deep Archive';
  created: string;
  retention: string;
}

const INITIAL_VOLUMES: NVMeVolume[] = [];
const INITIAL_STORAGE_SNAPSHOTS: StorageSnapshot[] = [];

export const StorageView: React.FC<StorageViewProps> = ({
  storage: initialStorage,
  themeMode,
  activeSubTab,
  onTabChange,
}) => {
  const [currentTab, setCurrentTab] = useState<StorageSubTab>(
    (activeSubTab as StorageSubTab) || 'buckets'
  );
  const [storageItems, setStorageItems] = useState<StorageItem[]>(initialStorage);
  const [volumes, setVolumes] = useState<NVMeVolume[]>(INITIAL_VOLUMES);
  const [archives] = useState<StorageSnapshot[]>(INITIAL_STORAGE_SNAPSHOTS);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeBrowseItem, setActiveBrowseItem] = useState<StorageItem | null>(null);
  const [newStorageName, setNewStorageName] = useState('');
  const [newStorageType, setNewStorageType] = useState('S3 Bucket');
  const [newStorageRegion, setNewStorageRegion] = useState('US East (Atlanta)');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [bucketFiles, setBucketFiles] = useState<Array<{ name: string; size: string; modified: string; type: string }>>([]);

  const isLight = themeMode === 'light';

  useEffect(() => {
    if (activeSubTab && ['buckets', 'volumes', 'snapshots'].includes(activeSubTab)) {
      setCurrentTab(activeSubTab as StorageSubTab);
    }
  }, [activeSubTab]);

  const handleTabSelect = (tab: StorageSubTab) => {
    setCurrentTab(tab);
    onTabChange?.(tab);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCreateStorage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStorageName.trim()) return;
    const newItem: StorageItem = {
      id: `stor-${Date.now().toString().slice(-4)}`,
      name: newStorageName,
      type: newStorageType,
      region: newStorageRegion,
      capacityGb: 5000,
      usedGb: 4,
      objectsCount: 1,
    };
    setStorageItems((prev) => [newItem, ...prev]);
    setIsCreateOpen(false);
    showToast(`Storage ${newStorageName} (${newStorageType}) provisioned with KMS AES-256.`);
    setNewStorageName('');
  };

  const handleUploadFile = () => {
    showToast('No storage provider is connected. Connect a provider before uploading files.');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
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
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-cyan-500" />
            <h1 className={`text-xl font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Storage Engine
            </h1>
          </div>
          <p className={`text-xs mt-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            S3-compatible scalable object storage buckets, ultra low-latency NVMe block volumes, and immutable Glacier archives.
          </p>
        </div>

        <button
          id="storage-create-resource-btn"
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg shadow cursor-pointer transition-colors"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Create Bucket / Volume</span>
        </button>
      </div>

      {/* Storage Submenu Tab Bar */}
      <div
        className={`flex items-center gap-1 border-b pb-px overflow-x-auto ${
          isLight ? 'border-slate-200' : 'border-slate-800'
        }`}
      >
        <button
          id="tab-storage-buckets"
          onClick={() => handleTabSelect('buckets')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 cursor-pointer whitespace-nowrap ${
            currentTab === 'buckets'
              ? isLight
                ? 'border-cyan-600 text-cyan-700 bg-cyan-50/50'
                : 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
              : isLight
              ? 'border-transparent text-slate-500 hover:text-slate-800'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Object Storage (S3)</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
              currentTab === 'buckets'
                ? isLight
                  ? 'bg-cyan-200 text-cyan-900'
                  : 'bg-cyan-500/30 text-cyan-200'
                : isLight
                ? 'bg-slate-200 text-slate-700'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {storageItems.length}
          </span>
        </button>

        <button
          id="tab-storage-volumes"
          onClick={() => handleTabSelect('volumes')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 cursor-pointer whitespace-nowrap ${
            currentTab === 'volumes'
              ? isLight
                ? 'border-cyan-600 text-cyan-700 bg-cyan-50/50'
                : 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
              : isLight
              ? 'border-transparent text-slate-500 hover:text-slate-800'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <HardDrive className="w-3.5 h-3.5" />
          <span>Block Volumes (NVMe)</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
              currentTab === 'volumes'
                ? isLight
                  ? 'bg-cyan-200 text-cyan-900'
                  : 'bg-cyan-500/30 text-cyan-200'
                : isLight
                ? 'bg-slate-200 text-slate-700'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {volumes.length}
          </span>
        </button>

        <button
          id="tab-storage-snapshots"
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
          <Archive className="w-3.5 h-3.5" />
          <span>Snapshots & Archives</span>
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
            {archives.length}
          </span>
        </button>
      </div>

      {/* TAB 1: BUCKETS (S3) */}
      {currentTab === 'buckets' && (
        <div className="space-y-6">
          {/* Storage Items Table */}
          <div
            className={`rounded-xl border overflow-hidden transition-colors shadow-xs ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-900/80 border-slate-800'
            }`}
          >
            <div
              className={`px-5 py-3.5 border-b flex items-center justify-between ${
                isLight ? 'border-slate-200 bg-slate-50/50' : 'border-slate-800'
              }`}
            >
              <h2 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Active Object Storage Buckets
              </h2>
              <span className={`text-xs font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                {storageItems.length} Buckets Provisioned
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr
                    className={`border-b text-[11px] font-mono uppercase tracking-wider ${
                      isLight ? 'bg-slate-50 border-slate-200 text-slate-500' : 'bg-slate-950/40 border-slate-800 text-slate-400'
                    }`}
                  >
                    <th className="py-3 px-4">Bucket Name</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3">Region</th>
                    <th className="py-3 px-3">Stored Objects</th>
                    <th className="py-3 px-3">Capacity & Usage</th>
                    <th className="py-3 px-3">Security</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800/60'}`}>
                  {storageItems.map((item) => {
                    const usagePct = Math.min(100, Math.round((item.usedGb / item.capacityGb) * 100));
                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors ${isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/40'}`}
                      >
                        <td className="py-3.5 px-4 font-semibold text-slate-200">
                          <div className="flex items-center gap-2">
                            <Folder className="w-4 h-4 text-cyan-400 shrink-0" />
                            <span>{item.name}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">{item.id}</div>
                        </td>
                        <td className="py-3.5 px-3">
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded font-mono ${
                              isLight ? 'bg-slate-100 text-slate-700' : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {item.type}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-slate-400 font-mono text-[11px]">{item.region}</td>
                        <td className="py-3.5 px-3 font-mono text-slate-300">{item.objectsCount.toLocaleString()} items</td>
                        <td className="py-3.5 px-3">
                          <div className="w-36 space-y-1">
                            <div className="flex justify-between text-[10px] font-mono">
                              <span className="text-slate-400">{item.usedGb} GB</span>
                              <span className="text-slate-500">of {item.capacityGb} GB</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-cyan-400 rounded-full"
                                style={{ width: `${Math.max(5, usagePct)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            <Lock className="w-3 h-3" />
                            AES-256 (KMS)
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setActiveBrowseItem(item)}
                            className="px-2.5 py-1 text-xs font-semibold bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 rounded transition-colors cursor-pointer"
                          >
                            Browse Objects
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Active Bucket Object Browser */}
          {activeBrowseItem && (
            <div
              className={`p-5 rounded-xl border space-y-4 ${
                isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-900/90 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                <div className="flex items-center gap-2">
                  <Folder className="w-5 h-5 text-cyan-400" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-100">
                      Object Browser: <code className="text-cyan-400 font-mono">{activeBrowseItem.name}</code>
                    </h3>
                    <p className="text-[11px] text-slate-400">Endpoint: s3://us-atl-1.cyverax.cloud/{activeBrowseItem.name}/</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleUploadFile}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Upload Object</span>
                  </button>
                  <button
                    onClick={() => setActiveBrowseItem(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-[11px] font-mono text-slate-400 uppercase">
                      <th className="py-2.5 px-3">File Key / Object Name</th>
                      <th className="py-2.5 px-3">Size</th>
                      <th className="py-2.5 px-3">Last Modified</th>
                      <th className="py-2.5 px-3">Storage Class</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {bucketFiles.map((file, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-slate-200 flex items-center gap-2">
                          <File className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{file.name}</span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-300">{file.size}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">{file.modified}</td>
                        <td className="py-2.5 px-3">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                            STANDARD
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => showToast(`Initiated direct stream download for ${file.name}`)}
                            className="p-1 rounded text-slate-400 hover:text-cyan-400 hover:bg-slate-800 cursor-pointer"
                            title="Download file"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: BLOCK VOLUMES (NVMe) */}
      {currentTab === 'volumes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Low-latency NVMe-oF (NVMe over Fabrics) block storage disks attached directly to virtual machines.
            </p>
            <button
              onClick={() => showToast('Opening NVMe Block Volume provisioning wizard...')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Block Volume</span>
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
                  <th className="py-3 px-4">Volume Name</th>
                  <th className="py-3 px-3">Size</th>
                  <th className="py-3 px-3">Provisioned IOPS</th>
                  <th className="py-3 px-3">Max Bandwidth</th>
                  <th className="py-3 px-3">Attached Instance</th>
                  <th className="py-3 px-3">Mount Point</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800/60'}`}>
                {volumes.map((vol) => (
                  <tr
                    key={vol.id}
                    className={`transition-colors ${isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/40'}`}
                  >
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-200 flex items-center gap-2">
                        <HardDrive className="w-4 h-4 text-cyan-400 shrink-0" />
                        {vol.name}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">{vol.id}</div>
                    </td>
                    <td className="py-3 px-3 font-mono text-cyan-400">{vol.sizeGb} GB NVMe</td>
                    <td className="py-3 px-3 font-mono text-emerald-400">{vol.iops.toLocaleString()} IOPS</td>
                    <td className="py-3 px-3 font-mono text-slate-300">{vol.throughput}</td>
                    <td className="py-3 px-3 font-mono text-slate-200">{vol.attachedTo}</td>
                    <td className="py-3 px-3 font-mono text-slate-400 text-[11px]">{vol.mountPoint}</td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/25">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        {vol.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => showToast(`Resizing disk ${vol.name}... Enter desired capacity.`)}
                        className="px-2.5 py-1 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded transition-colors cursor-pointer"
                      >
                        Expand
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SNAPSHOTS & ARCHIVES */}
      {currentTab === 'snapshots' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Immutable regulatory storage archives with automated lifecycle transitions to Glacier Deep Archive for long-term compliance.
            </p>
            <button
              onClick={() => showToast('Creating Glacier cold storage snapshot rule...')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Lifecycle Rule</span>
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
                  <th className="py-3 px-4">Archive Identifier</th>
                  <th className="py-3 px-3">Source Bucket</th>
                  <th className="py-3 px-3">Archived Size</th>
                  <th className="py-3 px-3">Storage Class</th>
                  <th className="py-3 px-3">Date Archived</th>
                  <th className="py-3 px-3">Retention Policy</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800/60'}`}>
                {archives.map((arc) => (
                  <tr
                    key={arc.id}
                    className={`transition-colors ${isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/40'}`}
                  >
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-200 flex items-center gap-2">
                        <Archive className="w-4 h-4 text-cyan-400 shrink-0" />
                        {arc.name}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">{arc.id}</div>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-300">{arc.sourceResource}</td>
                    <td className="py-3 px-3 font-mono text-cyan-400">{arc.sizeGb} GB</td>
                    <td className="py-3 px-3">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        {arc.tier}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">{arc.created}</td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        <Shield className="w-3 h-3" />
                        {arc.retention}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => showToast(`Initiated expedited retrieval job for ${arc.name}.`)}
                        className="px-2.5 py-1 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded transition-colors cursor-pointer"
                      >
                        Retrieve
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE STORAGE MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div
            className={`w-full max-w-md p-6 rounded-xl border shadow-2xl space-y-4 ${
              isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-900 border-slate-700 text-slate-100'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-cyan-400" />
                Provision Storage Resource
              </h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateStorage} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Resource Name (Unique Key)
                </label>
                <input
                  type="text"
                  placeholder="e.g. s3-media-lake-production"
                  value={newStorageName}
                  onChange={(e) => setNewStorageName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Storage Type
                </label>
                <select
                  value={newStorageType}
                  onChange={(e) => setNewStorageType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                >
                  <option value="S3 Bucket">S3-Compatible Object Bucket (Global)</option>
                  <option value="Block Storage">Persistent NVMe Block Disk (High-IOPS)</option>
                  <option value="Shared NFS">Managed Distributed NFS Share</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Target Region / Availability Zone
                </label>
                <select
                  value={newStorageRegion}
                  onChange={(e) => setNewStorageRegion(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                >
                  <option value="US East (Atlanta)">US East (Atlanta - us-atl-1)</option>
                  <option value="US West (Silicon Valley)">US West (Silicon Valley - us-sjc-1)</option>
                  <option value="EU Central (Frankfurt)">EU Central (Frankfurt - eu-fra-1)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold cursor-pointer"
                >
                  Provision Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
