import React, { useState, useEffect } from 'react';
import {
  Rocket,
  Plus,
  GitBranch,
  Boxes,
  Layers,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Terminal,
  Server,
  Globe,
  Lock,
  Cpu,
  Shield,
  Activity,
  X,
} from 'lucide-react';
import { ApplicationItem } from '../../types';

interface ApplicationsViewProps {
  applications: ApplicationItem[];
  themeMode: 'dark' | 'light';
  launchWizardDirectly?: boolean;
  onNavigateToAi?: () => void;
  activeSubTab?: string;
  onTabChange?: (tab: string) => void;
}

export const ApplicationsView: React.FC<ApplicationsViewProps> = ({
  applications: initialApplications = [],
  themeMode,
  launchWizardDirectly = false,
  onNavigateToAi,
  activeSubTab,
  onTabChange,
}) => {
  const [apps, setApps] = useState<ApplicationItem[]>(initialApplications);
  const [isDeploying, setIsDeploying] = useState(
    launchWizardDirectly || activeSubTab === 'deploy'
  );
  const [currentSubView, setCurrentSubView] = useState<'workloads' | 'domains'>(
    activeSubTab === 'domains' ? 'domains' : 'workloads'
  );

  useEffect(() => {
    if (activeSubTab === 'deploy') {
      setIsDeploying(true);
      setDeployStep(1);
    } else if (activeSubTab === 'domains') {
      setIsDeploying(false);
      setCurrentSubView('domains');
    } else if (activeSubTab === 'workloads') {
      setIsDeploying(false);
      setCurrentSubView('workloads');
    }
  }, [activeSubTab]);

  const handleSubTabChange = (tab: 'workloads' | 'deploy' | 'domains') => {
    if (tab === 'deploy') {
      setIsDeploying(true);
      setDeployStep(1);
    } else if (tab === 'domains') {
      setIsDeploying(false);
      setCurrentSubView('domains');
    } else {
      setIsDeploying(false);
      setCurrentSubView('workloads');
    }
    onTabChange?.(tab);
  };
  const [deployStep, setDeployStep] = useState(1);
  const [sourceType, setSourceType] = useState<'git' | 'container' | 'template'>('git');
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [buildCommand, setBuildCommand] = useState('npm run build');
  const [outputDir, setOutputDir] = useState('dist');
  const [envVars, setEnvVars] = useState('NODE_ENV=production\nPORT=3000');
  const [cpuSize, setCpuSize] = useState('2 vCPU / 4 GB RAM');
  const [domainName, setDomainName] = useState('');
  const [deployStatus, setDeployStatus] = useState<'idle' | 'building' | 'deployed'>('idle');
  const [logs, setLogs] = useState<string[]>([]);
  const [redeployingId, setRedeployingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isLight = themeMode === 'light';

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleRedeploy = (_appId: string, _appName: string) => {
    showToast('Redeploy is disabled until a real application provider is connected.');
  };

  const startDeploymentSimulation = () => {
    setDeployStatus('idle');
    setLogs([]);
    showToast('Deployment is disabled until a real application provider is connected.');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Feedback */}
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
            <Rocket className="w-5 h-5 text-cyan-500" />
            <h1 className={`text-xl font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Applications & Microservices
            </h1>
          </div>
          <p className={`text-xs mt-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            Zero-config Git deploys, container workloads, Kubernetes pods, and automated SSL routing.
          </p>
        </div>

        {!isDeploying && (
          <button
            id="launch-deploy-workflow-btn"
            onClick={() => handleSubTabChange('deploy')}
            className="flex items-center gap-2 px-3.5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg shadow-sm hover:shadow-cyan-500/25 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Deploy Application (6-Step)</span>
          </button>
        )}
      </div>

      {/* Applications Submenu Tab Bar */}
      <div
        className={`flex items-center gap-1 border-b pb-px overflow-x-auto ${
          isLight ? 'border-slate-200' : 'border-slate-800'
        }`}
      >
        <button
          id="tab-app-workloads"
          onClick={() => handleSubTabChange('workloads')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 cursor-pointer whitespace-nowrap ${
            !isDeploying && currentSubView === 'workloads'
              ? isLight
                ? 'border-cyan-600 text-cyan-700 bg-cyan-50/50'
                : 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
              : isLight
              ? 'border-transparent text-slate-500 hover:text-slate-800'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Boxes className="w-3.5 h-3.5" />
          <span>Deployed Workloads</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
              !isDeploying && currentSubView === 'workloads'
                ? isLight
                  ? 'bg-cyan-200 text-cyan-900'
                  : 'bg-cyan-500/30 text-cyan-200'
                : isLight
                ? 'bg-slate-200 text-slate-700'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {apps.length}
          </span>
        </button>

        <button
          id="tab-app-deploy"
          onClick={() => handleSubTabChange('deploy')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 cursor-pointer whitespace-nowrap ${
            isDeploying
              ? isLight
                ? 'border-cyan-600 text-cyan-700 bg-cyan-50/50'
                : 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
              : isLight
              ? 'border-transparent text-slate-500 hover:text-slate-800'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Rocket className="w-3.5 h-3.5" />
          <span>Deploy Application (Pipeline)</span>
        </button>

        <button
          id="tab-app-domains"
          onClick={() => handleSubTabChange('domains')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 cursor-pointer whitespace-nowrap ${
            !isDeploying && currentSubView === 'domains'
              ? isLight
                ? 'border-cyan-600 text-cyan-700 bg-cyan-50/50'
                : 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
              : isLight
              ? 'border-transparent text-slate-500 hover:text-slate-800'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Custom Domains & SSL</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold bg-emerald-500/20 text-emerald-400">
            3 Active
          </span>
        </button>
      </div>

      {/* GUIDED 6-STEP APPLICATION DEPLOYMENT WORKFLOW */}
      {isDeploying ? (
        <div
          id="guided-deployment-wizard"
          className={`rounded-xl border shadow-xl overflow-hidden transition-colors ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900/95 border-slate-800'
          }`}
        >
          {/* Stepper Header Bar */}
          <div
            className={`px-6 py-4 border-b flex items-center justify-between transition-colors ${
              isLight ? 'border-slate-200 bg-slate-50' : 'border-slate-800 bg-slate-950/80'
            }`}
          >
            <div>
              <div className="flex items-center gap-2 text-cyan-600 font-mono text-xs font-bold uppercase tracking-wider">
                <Rocket className="w-4 h-4" />
                <span>Cyverax Deployment Pipeline</span>
              </div>
              <h2 className={`text-base font-bold mt-0.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Step {deployStep} of 6:{' '}
                {deployStep === 1 && 'Source Selection'}
                {deployStep === 2 && 'Build & Environment Configuration'}
                {deployStep === 3 && 'Resource Sizing & Replicas'}
                {deployStep === 4 && 'Networking & SSL Routing'}
                {deployStep === 5 && 'Monitoring & Health Probes'}
                {deployStep === 6 && 'Deploy & Live Logs'}
              </h2>
            </div>

            <button
              onClick={() => setIsDeploying(false)}
              className={`text-xs px-2.5 py-1 rounded transition-colors cursor-pointer ${
                isLight ? 'text-slate-600 hover:text-slate-900 bg-slate-200/70' : 'text-slate-400 hover:text-white bg-slate-800'
              }`}
            >
              Exit Pipeline
            </button>
          </div>

          {/* Stepper Progress Indicator */}
          <div
            className={`grid grid-cols-6 border-b text-[11px] font-mono text-center transition-colors ${
              isLight ? 'border-slate-200 bg-slate-50/50' : 'border-slate-800 bg-slate-950/50'
            }`}
          >
            {[
              '1. Source',
              '2. Build Settings',
              '3. Sizing',
              '4. Networking',
              '5. Monitoring',
              '6. Deploy',
            ].map((stepLabel, idx) => {
              const stepNum = idx + 1;
              const isPassed = deployStep > stepNum;
              const isCurrent = deployStep === stepNum;
              return (
                <div
                  key={stepNum}
                  className={`py-2 border-r last:border-r-0 transition-colors ${
                    isLight ? 'border-slate-200' : 'border-slate-800'
                  } ${
                    isCurrent
                      ? 'bg-cyan-500/10 text-cyan-600 font-bold border-b-2 border-b-cyan-500'
                      : isPassed
                      ? 'text-emerald-500 bg-emerald-500/5 font-semibold'
                      : isLight ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  {isPassed ? '✓ ' : ''}
                  {stepLabel}
                </div>
              );
            })}
          </div>

          {/* Stepper Body */}
          <div className="p-6">
            {/* STEP 1: SOURCE SELECTION */}
            {deployStep === 1 && (
              <div className="space-y-4 max-w-2xl">
                <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Choose Deployment Source
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <div
                    onClick={() => setSourceType('git')}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      sourceType === 'git'
                        ? 'bg-cyan-500/15 border-cyan-500 shadow-xs'
                        : isLight
                        ? 'bg-slate-50 border-slate-200 hover:border-slate-300'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <GitBranch className="w-5 h-5 text-cyan-500 mb-2" />
                    <div className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Git Repository</div>
                    <div className={`text-[11px] mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      GitHub, GitLab, or Bitbucket
                    </div>
                  </div>

                  <div
                    onClick={() => setSourceType('container')}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      sourceType === 'container'
                        ? 'bg-cyan-500/15 border-cyan-500 shadow-xs'
                        : isLight
                        ? 'bg-slate-50 border-slate-200 hover:border-slate-300'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <Boxes className="w-5 h-5 text-indigo-500 mb-2" />
                    <div className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Container Image</div>
                    <div className={`text-[11px] mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      Docker Hub or OCI Registry
                    </div>
                  </div>

                  <div
                    onClick={() => setSourceType('template')}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      sourceType === 'template'
                        ? 'bg-cyan-500/15 border-cyan-500 shadow-xs'
                        : isLight
                        ? 'bg-slate-50 border-slate-200 hover:border-slate-300'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <Layers className="w-5 h-5 text-emerald-500 mb-2" />
                    <div className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Template</div>
                    <div className={`text-[11px] mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      Pre-configured blueprints
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div>
                    <label className={`text-xs block mb-1 font-medium ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                      Repository URL
                    </label>
                    <input
                      type="text"
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                      className={`w-full rounded px-3 py-2 text-xs font-mono border focus:outline-none focus:border-cyan-500 ${
                        isLight
                          ? 'bg-white border-slate-300 text-slate-900'
                          : 'bg-slate-950 border-slate-800 text-white'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`text-xs block mb-1 font-medium ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                      Production Branch
                    </label>
                    <input
                      type="text"
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      className={`w-full rounded px-3 py-2 text-xs font-mono border focus:outline-none focus:border-cyan-500 ${
                        isLight
                          ? 'bg-white border-slate-300 text-slate-900'
                          : 'bg-slate-950 border-slate-800 text-white'
                      }`}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: BUILD SETTINGS */}
            {deployStep === 2 && (
              <div className="space-y-4 max-w-2xl">
                <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Build & Environment Settings
                </h3>
                <div
                  className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                    isLight
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Detected Framework: <strong>Node.js / React 19 (Vite)</strong></span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`text-xs block mb-1 font-medium ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                      Build Command
                    </label>
                    <input
                      type="text"
                      value={buildCommand}
                      onChange={(e) => setBuildCommand(e.target.value)}
                      className={`w-full rounded px-3 py-2 text-xs font-mono border ${
                        isLight
                          ? 'bg-white border-slate-300 text-slate-900'
                          : 'bg-slate-950 border-slate-800 text-white'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`text-xs block mb-1 font-medium ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                      Output Directory
                    </label>
                    <input
                      type="text"
                      value={outputDir}
                      onChange={(e) => setOutputDir(e.target.value)}
                      className={`w-full rounded px-3 py-2 text-xs font-mono border ${
                        isLight
                          ? 'bg-white border-slate-300 text-slate-900'
                          : 'bg-slate-950 border-slate-800 text-white'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className={`text-xs block mb-1 font-medium ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    Environment Variables (KEY=VALUE)
                  </label>
                  <textarea
                    rows={4}
                    value={envVars}
                    onChange={(e) => setEnvVars(e.target.value)}
                    className={`w-full rounded p-3 text-xs font-mono border focus:outline-none focus:border-cyan-500 ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900'
                        : 'bg-slate-950 border-slate-800 text-cyan-300'
                    }`}
                  />
                </div>
              </div>
            )}

            {/* STEP 3: RESOURCE SIZING */}
            {deployStep === 3 && (
              <div className="space-y-4 max-w-2xl">
                <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Resource Allocation & Scaling Limits
                </h3>
                <div className="space-y-2">
                  {[
                    { name: 'Standard (1 vCPU / 2 GB RAM)', cost: '$18 / mo', note: 'Ideal for small APIs & dev prototypes' },
                    { name: 'Performance (2 vCPU / 4 GB RAM)', cost: 'Provider pricing', note: 'General application workload' },
                    { name: 'High-Compute (4 vCPU / 8 GB RAM)', cost: '$72 / mo', note: 'Large workloads & heavy background jobs' },
                  ].map((tier) => (
                    <div
                      key={tier.name}
                      onClick={() => setCpuSize(tier.name)}
                      className={`p-3 rounded-lg border cursor-pointer flex items-center justify-between transition-all ${
                        cpuSize.includes(tier.name.split(' ')[0])
                          ? 'bg-cyan-500/15 border-cyan-500 shadow-xs'
                          : isLight
                          ? 'bg-slate-50 border-slate-200 hover:border-slate-300'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{tier.name}</div>
                        <div className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{tier.note}</div>
                      </div>
                      <span className="font-mono text-xs font-bold text-cyan-600">{tier.cost}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 4: NETWORKING */}
            {deployStep === 4 && (
              <div className="space-y-4 max-w-2xl">
                <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Networking, Custom Domains & SSL
                </h3>
                <div>
                  <label className={`text-xs block mb-1 font-medium ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    Public Custom Domain / Hostname
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={domainName}
                      onChange={(e) => setDomainName(e.target.value)}
                      className={`flex-1 rounded px-3 py-2 text-xs font-mono border ${
                        isLight
                          ? 'bg-white border-slate-300 text-slate-900'
                          : 'bg-slate-950 border-slate-800 text-white'
                      }`}
                    />
                  </div>
                  <div className="text-[11px] text-emerald-600 flex items-center gap-1 mt-1 font-mono">
                    <Lock className="w-3 h-3" /> Automatic wildcard SSL (Let's Encrypt / Cyverax Edge) enabled.
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className={`text-xs block mb-1 font-medium ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                      Container Port
                    </label>
                    <input
                      type="text"
                      defaultValue="3000"
                      className={`w-full rounded px-3 py-2 text-xs font-mono border ${
                        isLight
                          ? 'bg-white border-slate-300 text-slate-900'
                          : 'bg-slate-950 border-slate-800 text-white'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`text-xs block mb-1 font-medium ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                      VPC Network
                    </label>
                    <input
                      type="text"
                      disabled
                      value="vpc-atl-prod-01 (10.15.0.0/16)"
                      className={`w-full rounded px-3 py-2 text-xs font-mono border ${
                        isLight
                          ? 'bg-slate-100 border-slate-300 text-slate-600'
                          : 'bg-slate-950 border-slate-800 text-slate-500'
                      }`}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 5: MONITORING */}
            {deployStep === 5 && (
              <div className="space-y-4 max-w-2xl">
                <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Monitoring & Health Probing
                </h3>
                <div>
                  <label className={`text-xs block mb-1 font-medium ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    Health Check Path
                  </label>
                  <input
                    type="text"
                    defaultValue="/api/health"
                    className={`w-full rounded px-3 py-2 text-xs font-mono border ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900'
                        : 'bg-slate-950 border-slate-800 text-white'
                    }`}
                  />
                  <span className={`text-[11px] font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    ALB probes every 15s. Expected HTTP 200.
                  </span>
                </div>

                <div>
                  <label className={`text-xs block mb-1 font-medium ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    Log Retention Period
                  </label>
                  <select
                    className={`w-full rounded px-3 py-2 text-xs border ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900'
                        : 'bg-slate-950 border-slate-800 text-white'
                    }`}
                  >
                    <option>30 Days (Standard Audit)</option>
                    <option>90 Days (Compliance Extended)</option>
                    <option>365 Days (Archival)</option>
                  </select>
                </div>
              </div>
            )}

            {/* STEP 6: DEPLOY & LIVE LOGS */}
            {deployStep === 6 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      Real-Time Build & Deploy Stream
                    </h3>
                    <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      Target: {domainName}
                    </p>
                  </div>

                  {deployStatus === 'idle' && (
                    <button
                      onClick={startDeploymentSimulation}
                      className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg shadow cursor-pointer flex items-center gap-1.5"
                    >
                      <Rocket className="w-4 h-4 stroke-[3]" />
                      <span>Execute Deployment</span>
                    </button>
                  )}

                  {deployStatus === 'building' && (
                    <div className="flex items-center gap-2 text-xs font-mono text-cyan-600">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Building container image...</span>
                    </div>
                  )}

                  {deployStatus === 'deployed' && (
                    <div className="flex items-center gap-2 text-xs font-mono text-emerald-600 font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>LIVE & HEALTHY</span>
                    </div>
                  )}
                </div>

                {/* Console Log Window */}
                <div
                  className={`p-4 rounded-xl font-mono text-xs h-64 overflow-y-auto space-y-1 border ${
                    isLight
                      ? 'bg-slate-900 text-slate-200 border-slate-300 shadow-inner'
                      : 'bg-slate-950 text-slate-300 border-slate-800'
                  }`}
                >
                  {logs.length === 0 ? (
                    <div className="text-slate-500 py-20 text-center">
                      Click "Execute Deployment" above to begin automated pipeline.
                    </div>
                  ) : (
                    logs.map((log, i) => (
                      <div
                        key={i}
                        className={
                          log.includes('LIVE')
                            ? 'text-emerald-400 font-bold'
                            : log.includes('Executing')
                            ? 'text-cyan-300'
                            : 'text-slate-300'
                        }
                      >
                        {log}
                      </div>
                    ))
                  )}
                </div>

                {deployStatus === 'deployed' && (
                  <div
                    className={`p-4 rounded-lg border flex items-center justify-between ${
                      isLight
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-emerald-500/10 border-emerald-500/30'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-emerald-700">Deployment Complete</div>
                      <div className={`text-xs font-mono mt-0.5 ${isLight ? 'text-slate-900 font-semibold' : 'text-white'}`}>
                        https://{domainName}
                      </div>
                    </div>
                    <button
                      onClick={() => setIsDeploying(false)}
                      className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded transition-colors cursor-pointer"
                    >
                      Return to Applications List
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Stepper Navigation Footer */}
          {deployStep < 6 && (
            <div
              className={`px-6 py-4 border-t flex items-center justify-between ${
                isLight ? 'border-slate-200 bg-slate-50' : 'border-slate-800 bg-slate-950/80'
              }`}
            >
              <button
                disabled={deployStep === 1}
                onClick={() => setDeployStep((s) => s - 1)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs disabled:opacity-30 cursor-pointer ${
                  isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-300 hover:text-white'
                }`}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <button
                onClick={() => setDeployStep((s) => s + 1)}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded transition-colors cursor-pointer"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      ) : currentSubView === 'domains' ? (
        /* Custom Domains & SSL Management Table */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Edge Anycast DNS routing, automated Let's Encrypt TLS 1.3 certificates, and zero-downtime canonical redirection.
            </p>
            <button
              onClick={() => showToast('Opening Custom Domain verification wizard...')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Connect New Domain</span>
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
                  <th className="py-3 px-4">Domain Name</th>
                  <th className="py-3 px-3">Target Workload</th>
                  <th className="py-3 px-3">DNS Status</th>
                  <th className="py-3 px-3">SSL / TLS Status</th>
                  <th className="py-3 px-3">Edge Routing</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800/60'}`}>
                {[
                  
                ].map((d, i) => (
                  <tr key={i} className={`transition-colors ${isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/40'}`}>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-200 flex items-center gap-2">
                        <Globe className="w-4 h-4 text-cyan-400 shrink-0" />
                        <span>{d.domain}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-cyan-400">{d.target}</td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/25">
                        <CheckCircle2 className="w-3 h-3" />
                        {d.dns}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-300">
                        <Lock className="w-3 h-3 text-emerald-400" />
                        {d.ssl}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">{d.edge}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => showToast(`Triggered DNS validation check for ${d.domain}`)}
                        className="px-2.5 py-1 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded transition-colors cursor-pointer"
                      >
                        Verify DNS
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Applications List Table */
        <div
          className={`rounded-xl border overflow-hidden transition-colors ${
            isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-900/80 border-slate-800'
          }`}
        >
          <div
            className={`px-5 py-3.5 border-b flex items-center justify-between ${
              isLight ? 'border-slate-200 bg-slate-50/50' : 'border-slate-800'
            }`}
          >
            <h2 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Active Applications & Services
            </h2>
            <span className={`text-xs font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              Total: {apps.length} Workloads
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead
                className={`border-b text-[11px] font-mono uppercase ${
                  isLight
                    ? 'border-slate-200 text-slate-600 bg-slate-50'
                    : 'border-slate-800 text-slate-400 bg-slate-950/60'
                }`}
              >
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Application</th>
                  <th className="py-2.5 px-3 font-semibold">Type</th>
                  <th className="py-2.5 px-3 font-semibold">Status</th>
                  <th className="py-2.5 px-3 font-semibold">Live URL</th>
                  <th className="py-2.5 px-3 font-semibold">Git Branch</th>
                  <th className="py-2.5 px-3 font-semibold">Replicas</th>
                  <th className="py-2.5 px-3 font-semibold">Last Deployed</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800/40'}`}>
                {apps.map((app) => {
                  const appUrl = app.url || app.domain || '';
                  const appBranch = app.branch || app.gitBranch || 'main';
                  const appDeploy = app.lastDeploy || app.lastDeployment || 'Recently';
                  const appType = app.type || app.infrastructure || 'Web Service';
                  const replicaDisplay =
                    typeof app.replicas === 'object' && app.replicas !== null
                      ? `${app.replicas.current}/${app.replicas.desired}`
                      : `${app.replicas ?? 1}`;
                  const isRedeploying = redeployingId === app.id;

                  return (
                    <tr
                      key={app.id}
                      className={`transition-colors ${
                        isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-850/50'
                      }`}
                    >
                      <td className={`py-3 px-4 font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        <div className="flex items-center gap-2">
                          <Boxes className="w-4 h-4 text-cyan-500" />
                          <div>
                            <div>{app.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{app.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className={`py-3 px-3 font-mono ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                        {appType}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium ${
                            app.status === 'Running'
                              ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-600 border border-amber-500/30'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              app.status === 'Running' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                            }`}
                          />
                          {app.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-cyan-600">
                        {appUrl ? (
                          <a
                            href={appUrl.startsWith('http') ? appUrl : `https://${appUrl}`}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:underline flex items-center gap-1"
                          >
                            <span>{appUrl}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-slate-400 font-mono">—</span>
                        )}
                      </td>
                      <td className={`py-3 px-3 font-mono ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                        {appBranch}
                      </td>
                      <td className={`py-3 px-3 font-mono ${isLight ? 'text-slate-700' : 'text-slate-200'}`}>
                        {replicaDisplay} Pods
                      </td>
                      <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">{appDeploy}</td>
                      <td className="py-3 px-4 text-right">
                        {app.status === 'Degraded' && onNavigateToAi ? (
                          <button
                            onClick={onNavigateToAi}
                            className="px-2.5 py-1 bg-purple-500/15 hover:bg-purple-500/25 text-purple-700 font-semibold rounded text-[11px] border border-purple-300 cursor-pointer"
                          >
                            Heal with AI
                          </button>
                        ) : (
                          <button
                            disabled={isRedeploying}
                            onClick={() => handleRedeploy(app.id, app.name)}
                            className={`px-2.5 py-1 font-semibold rounded text-[11px] cursor-pointer transition-colors flex items-center gap-1.5 ml-auto ${
                              isLight
                                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                            }`}
                          >
                            {isRedeploying && <RefreshCw className="w-3 h-3 animate-spin text-cyan-500" />}
                            <span>{isRedeploying ? 'Deploying...' : 'Redeploy'}</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
