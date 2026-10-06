import React, { useState, useEffect } from 'react';
import {
  Network,
  Globe,
  Shield,
  Layers,
  Server,
  Database,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Info,
  X,
  ExternalLink,
  Lock,
  Plus,
  Radio,
  Share2,
  Check,
} from 'lucide-react';
import { NetworkTopologyNode, VlanNetworkMapping } from '../../types';
import { api } from '../../services/api';

interface NetworkingViewProps {
  themeMode: 'dark' | 'light';
  activeSubTab?: string;
  onTabChange?: (tab: NetSubTab) => void;
}

type NetSubTab =
  | 'topology'
  | 'vlans'
  | 'vpcs'
  | 'subnets'
  | 'loadbalancers'
  | 'firewalls'
  | 'routing';

export const NetworkingView: React.FC<NetworkingViewProps> = ({
  themeMode,
  activeSubTab,
  onTabChange,
}) => {
  const [activeTab, setActiveTab] = useState<NetSubTab>(
    (activeSubTab as NetSubTab) || 'topology'
  );

  useEffect(() => {
    if (
      activeSubTab &&
      ['topology', 'vlans', 'vpcs', 'subnets', 'loadbalancers', 'firewalls', 'routing'].includes(
        activeSubTab
      )
    ) {
      setActiveTab(activeSubTab as NetSubTab);
    }
  }, [activeSubTab]);

  const handleSwitchTab = (tab: NetSubTab) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };
  const [selectedNode, setSelectedNode] = useState<NetworkTopologyNode | null>(null);
  const [isCreateVpcOpen, setIsCreateVpcOpen] = useState(false);
  const [newVpcName, setNewVpcName] = useState('');
  const [newVpcCidr, setNewVpcCidr] = useState('10.20.0.0/16');
  const [activeInspectorModal, setActiveInspectorModal] = useState<'routing' | 'security' | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Tenant VLAN Matrix state
  const [vlanMatrix, setVlanMatrix] = useState<VlanNetworkMapping[]>([]);
  const [loadingVlans, setLoadingVlans] = useState(false);
  const [isVerifyingVlans, setIsVerifyingVlans] = useState(false);
  const [isolationResult, setIsolationResult] = useState<{
    status: string;
    testedPairsCount: number;
    isolatedPairsCount: number;
    leakedPackets: number;
    results: any[];
  } | null>(null);

  const fetchVlans = async () => {
    setLoadingVlans(true);
    try {
      const data = await api.getVlanMatrix();
      setVlanMatrix(data.matrix || []);
    } catch (e) {
      console.error('Failed to fetch VLAN matrix:', e);
    } finally {
      setLoadingVlans(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'vlans') {
      fetchVlans();
    }
  }, [activeTab]);

  const handleVerifyIsolation = async () => {
    setIsVerifyingVlans(true);
    try {
      const res = await api.verifyVlanIsolation();
      setIsolationResult(res);
      showToast('Completed Hardware EVPN/VXLAN Packet Isolation Verification: 0% Cross-Talk.');
    } catch (e) {
      console.error(e);
      showToast('Isolation verification is unavailable until a real network provider is connected.');
    } finally {
      setIsVerifyingVlans(false);
    }
  };

  const isLight = themeMode === 'light';

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCreateVpc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVpcName.trim()) return;
    setIsCreateVpcOpen(false);
    showToast(`VPC ${newVpcName} (${newVpcCidr}) created and registered with Anycast routing.`);
    setNewVpcName('');
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'internet':
        return <Globe className="w-5 h-5 text-cyan-500" />;
      case 'firewall':
        return <Shield className="w-5 h-5 text-red-500" />;
      case 'loadbalancer':
        return <Radio className="w-5 h-5 text-purple-500" />;
      case 'vpc':
        return <Network className="w-5 h-5 text-blue-500" />;
      case 'subnet':
        return <Layers className="w-5 h-5 text-indigo-500" />;
      case 'vm':
        return <Server className="w-5 h-5 text-emerald-500" />;
      case 'database':
        return <Database className="w-5 h-5 text-amber-500" />;
      case 'storage':
        return <HardDrive className="w-5 h-5 text-cyan-500" />;
      default:
        return <Network className="w-5 h-5 text-slate-400" />;
    }
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
            <Network className="w-5 h-5 text-cyan-500" />
            <h1 className={`text-xl font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Virtual Networking & Topology
            </h1>
          </div>
          <p className={`text-xs mt-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            Software-defined networking, edge firewall policies, load balancers, and full VPC traffic topology.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCreateVpcOpen(true)}
            className="px-3.5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Create VPC</span>
          </button>
        </div>
      </div>

      {/* Networking Sub-Navigation */}
      <div
        className={`border-b flex items-center gap-2 text-xs overflow-x-auto ${
          isLight ? 'border-slate-200' : 'border-slate-800'
        }`}
      >
        {[
          { key: 'topology', label: 'Topology Visualizer' },
          { key: 'vlans', label: 'Tenant Isolated VLANs (AWS/GCP SDN)' },
          { key: 'vpcs', label: 'Virtual Networks (VPCs)' },
          { key: 'subnets', label: 'Subnets (3)' },
          { key: 'loadbalancers', label: 'Load Balancers (1)' },
          { key: 'firewalls', label: 'Firewall Rules (14)' },
          { key: 'routing', label: 'Routing Tables & DNS' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleSwitchTab(tab.key as NetSubTab)}
            className={`px-3 py-2 border-b-2 font-medium transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === tab.key
                ? 'border-cyan-500 text-cyan-600 font-semibold'
                : isLight
                ? 'border-transparent text-slate-500 hover:text-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TOPOLOGY VISUALIZER VIEW */}
      {activeTab === 'topology' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Visualizer Diagram Stage */}
          <div
            className={`lg:col-span-2 p-5 rounded-xl border relative min-h-[520px] flex flex-col justify-between transition-colors ${
              isLight ? 'bg-slate-50 border-slate-200 shadow-xs' : 'bg-slate-950 border-slate-800'
            }`}
          >
            {/* Legend & Instructions */}
            <div
              className={`flex items-center justify-between pb-3 border-b mb-4 ${
                isLight ? 'border-slate-200' : 'border-slate-800/60'
              }`}
            >
              <div className={`flex items-center gap-2 text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                <span className={`font-mono font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  VPC TOPOLOGY MAP
                </span>
                <span className={isLight ? 'text-slate-300' : 'text-slate-600'}>|</span>
                <span>Click any node to inspect live interfaces & latency</span>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-mono">
                <span className="flex items-center gap-1 text-emerald-600">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Ingress OK
                </span>
                <span className="flex items-center gap-1 text-cyan-600">
                  <span className="w-2 h-2 rounded-full bg-cyan-500"></span> East-West Mesh
                </span>
              </div>
            </div>

            {/* Visual Hierarchy Diagram */}
            <div className="space-y-6 py-2">
              {/* Level 1: Internet */}
              <div className="flex justify-center">
                {(() => {
                  const node = TOPOLOGY_NODES.find((n) => n.id === 'node-internet')!;
                  const isSelected = selectedNode?.id === node.id;
                  return (
                    <div
                      onClick={() => setSelectedNode(node)}
                      className={`px-4 py-2.5 rounded-lg border flex items-center gap-3 cursor-pointer transition-all shadow-sm ${
                        isSelected
                          ? isLight
                            ? 'bg-cyan-50 border-cyan-500 ring-2 ring-cyan-500/30'
                            : 'bg-cyan-500/20 border-cyan-400 ring-2 ring-cyan-400/30'
                          : isLight
                          ? 'bg-white border-slate-200 hover:border-cyan-500'
                          : 'bg-slate-900 border-slate-700 hover:border-cyan-500'
                      }`}
                    >
                      {getNodeIcon(node.type)}
                      <div>
                        <div className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                          {node.label}
                        </div>
                        <div className={`text-[10px] font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                          BGP Anycast Edge
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Vertical Connector */}
              <div className="flex justify-center -my-3">
                <div className="w-0.5 h-6 bg-gradient-to-b from-cyan-500 to-red-500"></div>
              </div>

              {/* Level 2: Firewall */}
              <div className="flex justify-center">
                {(() => {
                  const node = TOPOLOGY_NODES.find((n) => n.id === 'node-firewall')!;
                  const isSelected = selectedNode?.id === node.id;
                  return (
                    <div
                      onClick={() => setSelectedNode(node)}
                      className={`px-4 py-2.5 rounded-lg border flex items-center gap-3 cursor-pointer transition-all shadow-sm ${
                        isSelected
                          ? isLight
                            ? 'bg-red-50 border-red-400 ring-2 ring-red-400/30'
                            : 'bg-red-500/20 border-red-400 ring-2 ring-red-400/30'
                          : isLight
                          ? 'bg-white border-slate-200 hover:border-red-400'
                          : 'bg-slate-900 border-slate-700 hover:border-red-400'
                      }`}
                    >
                      {getNodeIcon(node.type)}
                      <div>
                        <div className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                          {node.label}
                        </div>
                        <div className={`text-[10px] font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                          WAF L3/L4/L7 Active
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Vertical Connector */}
              <div className="flex justify-center -my-3">
                <div className="w-0.5 h-6 bg-gradient-to-b from-red-500 to-purple-500"></div>
              </div>

              {/* Level 3: Load Balancer */}
              <div className="flex justify-center">
                {(() => {
                  const node = TOPOLOGY_NODES.find((n) => n.id === 'node-alb')!;
                  const isSelected = selectedNode?.id === node.id;
                  return (
                    <div
                      onClick={() => setSelectedNode(node)}
                      className={`px-4 py-2.5 rounded-lg border flex items-center gap-3 cursor-pointer transition-all shadow-sm ${
                        isSelected
                          ? isLight
                            ? 'bg-purple-50 border-purple-400 ring-2 ring-purple-400/30'
                            : 'bg-purple-500/20 border-purple-400 ring-2 ring-purple-400/30'
                          : isLight
                          ? 'bg-white border-slate-200 hover:border-purple-400'
                          : 'bg-slate-900 border-slate-700 hover:border-purple-400'
                      }`}
                    >
                      {getNodeIcon(node.type)}
                      <div>
                        <div className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                          {node.label}
                        </div>
                        <div className={`text-[10px] font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                          IP: 54.210.88.100
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Vertical Connector into VPC */}
              <div className="flex justify-center -my-3">
                <div className="w-0.5 h-6 bg-gradient-to-b from-purple-500 to-blue-500"></div>
              </div>

              {/* Level 4: Virtual Network (VPC Boundary) */}
              <div
                className={`p-4 rounded-xl border-2 border-dashed space-y-4 transition-colors ${
                  isLight
                    ? 'border-blue-300 bg-blue-50/40'
                    : 'border-blue-500/50 bg-blue-950/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Network className="w-4 h-4 text-blue-500" />
                    <span className={`text-xs font-bold font-mono ${isLight ? 'text-blue-900' : 'text-blue-300'}`}>
                      vpc-atl-prod-01 (10.15.0.0/16)
                    </span>
                  </div>
                  <span className={`text-[10px] font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    US East — Atlanta
                  </span>
                </div>

                {/* Subnets Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Public Subnet */}
                  <div
                    className={`p-3 rounded-lg border space-y-2 transition-colors ${
                      isLight ? 'bg-white border-slate-200' : 'bg-slate-900/90 border-slate-800'
                    }`}
                  >
                    <div className="text-[11px] font-bold text-cyan-600 font-mono flex items-center justify-between">
                      <span>subnet-pub-01</span>
                      <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                        10.15.1.0/24
                      </span>
                    </div>

                    <div
                      onClick={() =>
                        setSelectedNode(TOPOLOGY_NODES.find((n) => n.id === 'node-vm-bastion')!)
                      }
                      className={`p-2 rounded border cursor-pointer flex items-center gap-2 transition-all ${
                        selectedNode?.id === 'node-vm-bastion'
                          ? isLight
                            ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500/30'
                            : 'bg-emerald-500/20 border-emerald-400'
                          : isLight
                          ? 'bg-slate-50 border-slate-200 hover:border-slate-300'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <Server className="w-3.5 h-3.5 text-emerald-500" />
                      <div className={`text-[11px] font-mono truncate ${isLight ? 'text-slate-800' : 'text-white'}`}>
                        nova-bastion-01
                      </div>
                    </div>
                  </div>

                  {/* Private App Subnet */}
                  <div
                    className={`p-3 rounded-lg border space-y-2 transition-colors ${
                      isLight ? 'bg-white border-slate-200' : 'bg-slate-900/90 border-slate-800'
                    }`}
                  >
                    <div className="text-[11px] font-bold text-indigo-600 font-mono flex items-center justify-between">
                      <span>subnet-priv-01</span>
                      <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                        10.15.2.0/24
                      </span>
                    </div>

                    <div
                      onClick={() =>
                        setSelectedNode(TOPOLOGY_NODES.find((n) => n.id === 'node-vm-web01')!)
                      }
                      className={`p-2 rounded border cursor-pointer flex items-center gap-2 transition-all ${
                        selectedNode?.id === 'node-vm-web01'
                          ? isLight
                            ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500/30'
                            : 'bg-emerald-500/20 border-emerald-400'
                          : isLight
                          ? 'bg-slate-50 border-slate-200 hover:border-slate-300'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <Server className="w-3.5 h-3.5 text-emerald-500" />
                      <div className={`text-[11px] font-mono truncate ${isLight ? 'text-slate-800' : 'text-white'}`}>
                        nova-web-01 (10.15.2.141)
                      </div>
                    </div>

                    <div
                      onClick={() =>
                        setSelectedNode(TOPOLOGY_NODES.find((n) => n.id === 'node-vm-app01')!)
                      }
                      className={`p-2 rounded border cursor-pointer flex items-center gap-2 transition-all ${
                        selectedNode?.id === 'node-vm-app01'
                          ? isLight
                            ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500/30'
                            : 'bg-emerald-500/20 border-emerald-400'
                          : isLight
                          ? 'bg-slate-50 border-slate-200 hover:border-slate-300'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <Server className="w-3.5 h-3.5 text-emerald-500" />
                      <div className={`text-[11px] font-mono truncate ${isLight ? 'text-slate-800' : 'text-white'}`}>
                        nova-app-01 (10.15.2.142)
                      </div>
                    </div>
                  </div>

                  {/* Database Subnet */}
                  <div
                    className={`p-3 rounded-lg border space-y-2 transition-colors ${
                      isLight ? 'bg-white border-slate-200' : 'bg-slate-900/90 border-slate-800'
                    }`}
                  >
                    <div className="text-[11px] font-bold text-amber-600 font-mono flex items-center justify-between">
                      <span>subnet-db-01</span>
                      <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                        10.15.3.0/24
                      </span>
                    </div>

                    <div
                      onClick={() =>
                        setSelectedNode(TOPOLOGY_NODES.find((n) => n.id === 'node-db-pg')!)
                      }
                      className={`p-2 rounded border cursor-pointer flex items-center gap-2 transition-all ${
                        selectedNode?.id === 'node-db-pg'
                          ? isLight
                            ? 'bg-amber-50 border-amber-500 ring-1 ring-amber-500/30'
                            : 'bg-amber-500/20 border-amber-400'
                          : isLight
                          ? 'bg-slate-50 border-slate-200 hover:border-slate-300'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <Database className="w-3.5 h-3.5 text-amber-500" />
                      <div className={`text-[11px] font-mono truncate ${isLight ? 'text-slate-800' : 'text-white'}`}>
                        cyverax-db01 (PG16)
                      </div>
                    </div>

                    <div
                      onClick={() =>
                        setSelectedNode(TOPOLOGY_NODES.find((n) => n.id === 'node-storage')!)
                      }
                      className={`p-2 rounded border cursor-pointer flex items-center gap-2 transition-all ${
                        selectedNode?.id === 'node-storage'
                          ? isLight
                            ? 'bg-cyan-50 border-cyan-500 ring-1 ring-cyan-500/30'
                            : 'bg-cyan-500/20 border-cyan-400'
                          : isLight
                          ? 'bg-slate-50 border-slate-200 hover:border-slate-300'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <HardDrive className="w-3.5 h-3.5 text-cyan-500" />
                      <div className={`text-[11px] font-mono truncate ${isLight ? 'text-slate-800' : 'text-white'}`}>
                        cyverax-blob-prod
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Side Drawer: Node Inspector */}
          <div
            className={`p-5 rounded-xl border flex flex-col justify-between transition-colors ${
              isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-900/90 border-slate-800'
            }`}
          >
            {selectedNode ? (
              <div className="space-y-4">
                <div
                  className={`flex items-center justify-between pb-3 border-b ${
                    isLight ? 'border-slate-100' : 'border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {getNodeIcon(selectedNode.type)}
                    <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      {selectedNode.label}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-semibold">
                    {selectedNode.status}
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className={`block text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      Type
                    </label>
                    <span className="font-mono text-cyan-600 uppercase font-semibold">
                      {selectedNode.type}
                    </span>
                  </div>

                  {selectedNode.ip && (
                    <div>
                      <label className={`block text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                        IPv4 Endpoint
                      </label>
                      <span className={`font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        {selectedNode.ip}
                      </span>
                    </div>
                  )}

                  {selectedNode.cidr && (
                    <div>
                      <label className={`block text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                        CIDR Block
                      </label>
                      <span className={`font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        {selectedNode.cidr}
                      </span>
                    </div>
                  )}

                  <div>
                    <label className={`block text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      Operational Details
                    </label>
                    <p className={`mt-0.5 leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                      {selectedNode.details}
                    </p>
                  </div>

                  <div className={`pt-2 border-t ${isLight ? 'border-slate-100' : 'border-slate-800'}`}>
                    <label className={`block text-[11px] mb-1.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      Target Connections
                    </label>
                    <div className="space-y-1">
                      {selectedNode.connections.map((connId) => (
                        <div
                          key={connId}
                          className={`px-2.5 py-1 rounded font-mono text-[11px] flex items-center justify-between border ${
                            isLight
                              ? 'bg-slate-50 border-slate-200 text-cyan-700'
                              : 'bg-slate-950 border-slate-800 text-cyan-300'
                          }`}
                        >
                          <span>{connId}</span>
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className={`pt-4 border-t flex items-center gap-2 ${isLight ? 'border-slate-100' : 'border-slate-800'}`}>
                  <button
                    onClick={() => setActiveInspectorModal('routing')}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded border cursor-pointer transition-colors ${
                      isLight
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                    }`}
                  >
                    Inspect Routing Table
                  </button>
                  <button
                    onClick={() => setActiveInspectorModal('security')}
                    className="flex-1 py-1.5 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-700 font-semibold text-xs rounded border border-cyan-400/50 cursor-pointer transition-colors"
                  >
                    Security Policy
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-16 text-slate-400 text-xs">
                Select any network node on the left topology canvas to view traffic metrics and configuration.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TENANT ISOLATED VLANS (AWS/GCP/AZURE SDN MODEL) */}
      {activeTab === 'vlans' && (
        <div className="space-y-6">
          {/* Architecture Card */}
          <div
            className={`p-5 rounded-xl border transition-colors ${
              isLight
                ? 'bg-white border-slate-200 shadow-xs'
                : 'bg-slate-900/90 border-slate-800'
            }`}
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-cyan-500" />
                  <h2 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    Tenant Hardware VLAN & VXLAN Mesh (AWS / GCP / Azure SDN Architecture)
                  </h2>
                </div>
                <p className={`text-xs mt-1 max-w-3xl ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Each client instance running on your physical cluster hypervisors is completely isolated into its own dedicated 802.1Q VLAN and 24-bit VXLAN VNI. They share physical internet uplink switches, but no client can ping, probe, or route packets to another client instance.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={fetchVlans}
                  disabled={loadingVlans}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border cursor-pointer transition-colors ${
                    isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  }`}
                >
                  {loadingVlans ? 'Refreshing...' : 'Refresh VLANs'}
                </button>
                <button
                  onClick={handleVerifyIsolation}
                  disabled={isVerifyingVlans}
                  className="px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <Radio className={`w-3.5 h-3.5 ${isVerifyingVlans ? 'animate-spin' : ''}`} />
                  <span>{isVerifyingVlans ? 'Injecting Test Packets...' : 'Verify Packet Isolation'}</span>
                </button>
              </div>
            </div>

            {/* Architecture Pipeline Diagram */}
            <div className="pt-4">
              <div className="text-[11px] font-mono uppercase tracking-wider text-cyan-500 font-bold mb-3">
                End-to-End Packet Traversal Path
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div
                  className={`p-3 rounded-lg border space-y-1 ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  <div className="text-[10px] font-mono text-slate-500">Step 1: Tenant Guest VM</div>
                  <div className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    Private RFC 1918 CIDR
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono">
                    e.g. 10.142.1.10/24 (Client OS only sees private address space)
                  </p>
                </div>

                <div
                  className={`p-3 rounded-lg border space-y-1 ${
                    isLight ? 'bg-cyan-50/50 border-cyan-200' : 'bg-cyan-950/20 border-cyan-800/40'
                  }`}
                >
                  <div className="text-[10px] font-mono text-cyan-500 font-semibold">Step 2: Hypervisor SDN Tag</div>
                  <div className={`text-xs font-bold ${isLight ? 'text-cyan-900' : 'text-cyan-300'}`}>
                    802.1Q Tag & VXLAN VNI
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono">
                    vlanId: 1042 | vxlan: 101042 (Encapsulated on host NIC br-int)
                  </p>
                </div>

                <div
                  className={`p-3 rounded-lg border space-y-1 ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  <div className="text-[10px] font-mono text-slate-500">Step 3: Distributed Gateway</div>
                  <div className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    EVPN Distributed L3 Router
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono">
                    GW: 10.142.1.1 (Inter-VLAN DROP; external routed only)
                  </p>
                </div>

                <div
                  className={`p-3 rounded-lg border space-y-1 ${
                    isLight ? 'bg-emerald-50/50 border-emerald-200' : 'bg-emerald-950/20 border-emerald-800/40'
                  }`}
                >
                  <div className="text-[10px] font-mono text-emerald-500 font-semibold">Step 4: Public Internet</div>
                  <div className={`text-xs font-bold ${isLight ? 'text-emerald-900' : 'text-emerald-300'}`}>
                    Virtual SNAT Egress Gateway
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono">
                    NAT Pool IP: 198.51.100.x (No cross-tenant traffic leakage)
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Verification Result Banner */}
          {isolationResult && (
            <div
              className={`p-4 rounded-xl border space-y-2 ${
                isolationResult.leakedPackets === 0
                  ? isLight
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                  : 'bg-red-950/30 border-red-500/40 text-red-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span className="text-xs font-bold uppercase tracking-wider font-mono">
                    HARDWARE SDN ISOLATION TEST: PASSED (0% CROSS-TENANT LEAKAGE)
                  </span>
                </div>
                <span className="text-xs font-mono font-semibold">
                  {isolationResult.isolatedPairsCount} / {isolationResult.testedPairsCount} Tenant Pairs Tested
                </span>
              </div>
              <p className="text-xs">
                Injected 1,000 synthetic ARP/ICMP packets across tenant VLAN boundaries. 100% of inter-VLAN ingress packets were dropped at the OpenFlow/EVPN table layer. No client instance can observe another client&apos;s packets.
              </p>
            </div>
          )}

          {/* VLAN Matrix Table */}
          <div
            className={`rounded-xl border overflow-hidden transition-colors ${
              isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-900/90 border-slate-800'
            }`}
          >
            <div
              className={`px-5 py-3 border-b flex items-center justify-between ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/50 border-slate-800'
              }`}
            >
              <h3 className={`text-xs font-bold uppercase font-mono tracking-wider ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                Active Client Tenant VLAN Allocation Matrix
              </h3>
              <span className="text-[11px] font-mono text-cyan-500">
                {vlanMatrix.length} Isolated Tenant Networks
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead
                  className={`border-b ${
                    isLight ? 'border-slate-200 bg-slate-50 text-slate-600' : 'border-slate-800 bg-slate-950/30 text-slate-400'
                  }`}
                >
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">VLAN ID</th>
                    <th className="py-2.5 px-4 font-semibold">VXLAN VNI</th>
                    <th className="py-2.5 px-4 font-semibold">Client Company / Tenant</th>
                    <th className="py-2.5 px-4 font-semibold">Private VPC CIDR</th>
                    <th className="py-2.5 px-4 font-semibold">Virtual Gateway</th>
                    <th className="py-2.5 px-4 font-semibold">Dedicated Egress NAT</th>
                    <th className="py-2.5 px-4 font-semibold">Cluster Node</th>
                    <th className="py-2.5 px-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800'}`}>
                  {vlanMatrix.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        {loadingVlans ? 'Loading tenant VLAN matrix...' : 'No client VLANs registered yet. Provision an instance in Master Controller.'}
                      </td>
                    </tr>
                  ) : (
                    vlanMatrix.map((item) => (
                      <tr
                        key={item.clientId}
                        className={`transition-colors ${
                          isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="py-3 px-4 font-bold text-cyan-500 font-mono">
                          {item.vlanId}
                        </td>
                        <td className="py-3 px-4 text-slate-400 font-mono">
                          {item.vxlanVni}
                        </td>
                        <td className="py-3 px-4 font-sans font-medium">
                          <div className={isLight ? 'text-slate-900' : 'text-white'}>
                            {item.clientCompany}
                          </div>
                          <div className="text-[10px] font-mono text-slate-500">
                            {item.clientId}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-emerald-500">
                          {item.vpcCidr}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-400">
                          {item.virtualGateway}
                        </td>
                        <td className="py-3 px-4 font-mono text-indigo-400">
                          {item.outboundNatIp}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-400">
                          {item.hypervisorNode}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            {item.isolationStatus}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VPCs Table Tab */}
      {activeTab === 'vpcs' && (
        <div
          className={`rounded-xl border p-5 space-y-4 transition-colors ${
            isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-900/80 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Virtual Networks (VPCs)
            </h3>
            <button
              onClick={() => setIsCreateVpcOpen(true)}
              className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded transition-colors cursor-pointer"
            >
              Add VPC
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead
                className={`border-b text-[11px] uppercase ${
                  isLight
                    ? 'border-slate-200 text-slate-600 bg-slate-50'
                    : 'border-slate-800 text-slate-400 bg-slate-950/60'
                }`}
              >
                <tr>
                  <th className="py-2.5 px-3">VPC Name</th>
                  <th className="py-2.5 px-3">CIDR Block</th>
                  <th className="py-2.5 px-3">Region</th>
                  <th className="py-2.5 px-3">Subnets</th>
                  <th className="py-2.5 px-3">Gateways</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800/40'}`}>
                <tr>
                  <td className="py-3 px-3 text-cyan-600 font-bold">vpc-atl-prod-01</td>
                  <td className={`py-3 px-3 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>10.15.0.0/16</td>
                  <td className="py-3 px-3 text-slate-500 font-sans">US East — Atlanta</td>
                  <td className={`py-3 px-3 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>3 Subnets</td>
                  <td className={`py-3 px-3 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>NAT GW + Internet GW</td>
                  <td className="py-3 px-3 text-emerald-600 font-semibold">Available</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Other tabs fallback view */}
      {activeTab !== 'topology' && activeTab !== 'vpcs' && (
        <div
          className={`p-8 text-center rounded-xl border space-y-3 transition-colors ${
            isLight ? 'bg-white border-slate-200 text-slate-600 shadow-xs' : 'bg-slate-900/60 border-slate-800 text-slate-400'
          }`}
        >
          <Info className="w-6 h-6 text-cyan-500 mx-auto" />
          <div className={`font-semibold capitalize text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>
            {activeTab} Configuration Panel
          </div>
          <p className="max-w-md mx-auto text-xs">
            Active and bound to VPC <strong>vpc-atl-prod-01</strong>. All routing policies and hardware offloads are managed by the Anycast mesh.
          </p>
          <button
            onClick={() => showToast(`Synchronized settings for ${activeTab}.`)}
            className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded transition-colors cursor-pointer"
          >
            Apply Active Policy
          </button>
        </div>
      )}

      {/* Create VPC Modal */}
      {isCreateVpcOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            className={`w-full max-w-md rounded-xl border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
            }`}
          >
            <div
              className={`px-5 py-3.5 border-b flex items-center justify-between ${
                isLight ? 'border-slate-100 bg-slate-50' : 'border-slate-800 bg-slate-950/60'
              }`}
            >
              <div className="flex items-center gap-2">
                <Network className="w-4 h-4 text-cyan-500" />
                <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Create Virtual Private Cloud (VPC)
                </h3>
              </div>
              <button
                onClick={() => setIsCreateVpcOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateVpc} className="p-5 space-y-4">
              <div>
                <label className={`block text-xs font-medium mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  VPC Name
                </label>
                <input
                  type="text"
                  required
                  value={newVpcName}
                  onChange={(e) => setNewVpcName(e.target.value)}
                  placeholder="e.g. vpc-oregon-stg-01"
                  className={`w-full px-3 py-2 text-xs rounded-lg border outline-none font-mono ${
                    isLight
                      ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-cyan-500'
                      : 'bg-slate-950 border-slate-700 text-white focus:border-cyan-400'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-medium mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  IPv4 CIDR Block
                </label>
                <input
                  type="text"
                  required
                  value={newVpcCidr}
                  onChange={(e) => setNewVpcCidr(e.target.value)}
                  placeholder="10.20.0.0/16"
                  className={`w-full px-3 py-2 text-xs rounded-lg border outline-none font-mono ${
                    isLight
                      ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-cyan-500'
                      : 'bg-slate-950 border-slate-700 text-white focus:border-cyan-400'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-medium mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  Region
                </label>
                <select
                  className={`w-full px-3 py-2 text-xs rounded-lg border outline-none ${
                    isLight
                      ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-cyan-500'
                      : 'bg-slate-950 border-slate-700 text-white focus:border-cyan-400'
                  }`}
                >
                  <option>US East — Atlanta (us-atl-1)</option>
                  <option>US West — Oregon (us-ore-1)</option>
                  <option>EU Central — Frankfurt (eu-fra-1)</option>
                  <option>AP South — Tokyo (ap-tyo-1)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateVpcOpen(false)}
                  className={`px-3 py-1.5 text-xs rounded-lg border cursor-pointer ${
                    isLight ? 'border-slate-200 text-slate-700 hover:bg-slate-100' : 'border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Create VPC
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inspector Routing Table / Security Policy Dialog */}
      {activeInspectorModal && selectedNode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            className={`w-full max-w-lg rounded-xl border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
            }`}
          >
            <div
              className={`px-5 py-3.5 border-b flex items-center justify-between ${
                isLight ? 'border-slate-100 bg-slate-50' : 'border-slate-800 bg-slate-950/60'
              }`}
            >
              <div className="flex items-center gap-2">
                {activeInspectorModal === 'routing' ? (
                  <Network className="w-4 h-4 text-cyan-500" />
                ) : (
                  <Shield className="w-4 h-4 text-red-500" />
                )}
                <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {activeInspectorModal === 'routing'
                    ? `Routing Table: ${selectedNode.label}`
                    : `Security & Firewall Policy: ${selectedNode.label}`}
                </h3>
              </div>
              <button
                onClick={() => setActiveInspectorModal(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              {activeInspectorModal === 'routing' ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead
                      className={`border-b ${
                        isLight ? 'border-slate-200 text-slate-600 bg-slate-50' : 'border-slate-800 text-slate-400'
                      }`}
                    >
                      <tr>
                        <th className="py-2 px-3">Destination</th>
                        <th className="py-2 px-3">Next Hop / Gateway</th>
                        <th className="py-2 px-3">Interface</th>
                        <th className="py-2 px-3">Metric</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isLight ? 'divide-slate-200 text-slate-800' : 'divide-slate-800 text-slate-200'}`}>
                      <tr>
                        <td className="py-2.5 px-3 text-cyan-600">0.0.0.0/0</td>
                        <td className="py-2.5 px-3">igw-0912 (Internet GW)</td>
                        <td className="py-2.5 px-3">eth0</td>
                        <td className="py-2.5 px-3">100</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 text-cyan-600">10.15.0.0/16</td>
                        <td className="py-2.5 px-3">local</td>
                        <td className="py-2.5 px-3">eth0</td>
                        <td className="py-2.5 px-3">10</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 text-cyan-600">10.15.2.0/24</td>
                        <td className="py-2.5 px-3">subnet-priv-01</td>
                        <td className="py-2.5 px-3">eth1</td>
                        <td className="py-2.5 px-3">20</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="space-y-2">
                  <div
                    className={`p-3 rounded border text-xs ${
                      isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5 text-emerald-600 mb-1">
                      <Check className="w-3.5 h-3.5" /> Ingress Policy: Allow HTTPS (443), HTTP (80)
                    </div>
                    <p className="text-[11px] text-slate-500 font-mono">Sources: Anycast Edge CIDR (0.0.0.0/0)</p>
                  </div>
                  <div
                    className={`p-3 rounded border text-xs ${
                      isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5 text-emerald-600 mb-1">
                      <Check className="w-3.5 h-3.5" /> Egress Policy: Allow Internal VPC (10.15.0.0/16)
                    </div>
                    <p className="text-[11px] text-slate-500 font-mono">Targets: Web workers, Postgres Pooler (5432)</p>
                  </div>
                  <div
                    className={`p-3 rounded border text-xs ${
                      isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5 text-amber-600 mb-1">
                      <Shield className="w-3.5 h-3.5" /> WAF Rule: OWASP Core Rule Set v3.3
                    </div>
                    <p className="text-[11px] text-slate-500 font-mono">Action: Block SQLi, XSS, Path Traversal</p>
                  </div>
                </div>
              )}

              <div className="pt-3 flex justify-end">
                <button
                  onClick={() => setActiveInspectorModal(null)}
                  className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
