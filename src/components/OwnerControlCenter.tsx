import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  Check,
  CheckCircle2,
  Database,
  Loader2,
  Play,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import {
  fetchSystemTelemetry,
  runAutonomousDiscoveryCycle,
  updateServerSpendCap,
} from '../services/apiClient';
import type {
  AiActivityLog,
  ApprovalRequest,
  CandidateProfile,
  DataSourceConfig,
  JobListing,
  PlatformSetting,
} from '../types';

interface OwnerControlCenterProps {
  activeSection: 'owner' | 'ai-control' | 'sources' | 'settings';
  isOwner: boolean;
  ownerUid: string;
  jobs: JobListing[];
  candidates: CandidateProfile[];
  dataSources: DataSourceConfig[];
  aiLogs: AiActivityLog[];
  approvals: ApprovalRequest[];
  settings: PlatformSetting | null;
  onSyncDiscoveredJobs: (jobs: JobListing[]) => Promise<void>;
  onLogAiAction: (log: Omit<AiActivityLog, 'logId' | 'createdAt'>) => Promise<void>;
  onUpdateApproval: (requestId: string, status: 'Approved' | 'Rejected') => Promise<void>;
  onToggleSource: (sourceId: string, enabled: boolean) => Promise<void>;
  onUpdateSettings: (updates: Partial<PlatformSetting>) => Promise<void>;
  onVerifyOrFlagJob: (jobId: string, status: JobListing['verificationStatus']) => Promise<void>;
  onDeleteJob: (jobId: string) => Promise<void>;
}

const SPECIALIZED_AGENTS = [
  { name: 'Job Discovery Agent', task: 'Queries Greenhouse, Arbeitnow, Remotive & Search Grounding' },
  { name: 'Job Verification Agent', task: 'Probes HTTP status, detects closed pages & scam redirects' },
  { name: 'Job Classification Agent', task: 'Categorizes Finance (Priority), Marketing, BA, SAP & MBA' },
  { name: 'Resume Analysis Agent', task: 'Extracts candidate skills, certifications & ATS readiness' },
  { name: 'Candidate Matching Agent', task: 'Calculates fair 0–100 compatibility scores & skill gaps' },
  { name: 'Application Assistant Agent', task: 'Builds 14-point guidance, cover letters & recruiter messages' },
  { name: 'Notification Agent', task: 'Delivers deduplicated personalized alerts across channels' },
  { name: 'Interview Preparation Agent', task: 'Generates domain questions & truthful answer strategies' },
  { name: 'Duplicate Detection Agent', task: 'Normalizes company + role keys and merges source links' },
  { name: 'Platform Monitoring Agent', task: 'Tracks AI spend caps, rate limits, and source health' },
];

export const OwnerControlCenter: React.FC<OwnerControlCenterProps> = ({
  activeSection,
  isOwner,
  ownerUid,
  jobs,
  candidates,
  dataSources,
  aiLogs,
  approvals,
  settings,
  onSyncDiscoveredJobs,
  onLogAiAction,
  onUpdateApproval,
  onToggleSource,
  onUpdateSettings,
  onVerifyOrFlagJob,
  onDeleteJob,
}) => {
  const [telemetry, setTelemetry] = useState<{
    providers: Array<{ id: string; name: string; models: string[]; configured: boolean; active: boolean }>;
    usage: { requestsToday: number; estimatedSpendUsd: number; dailyCapUsd: number; lastResetDate: string };
  } | null>(null);
  const [runningCycle, setRunningCycle] = useState(false);
  const [cycleNotice, setCycleNotice] = useState('');
  const [spendCapInput, setSpendCapInput] = useState(String(settings?.dailyAiSpendCapUsd || 25));
  const [freqInput, setFreqInput] = useState(String(settings?.monitoringFrequencyMinutes || 60));

  useEffect(() => {
    fetchSystemTelemetry()
      .then((res) => setTelemetry(res))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (settings) {
      setSpendCapInput(String(settings.dailyAiSpendCapUsd));
      setFreqInput(String(settings.monitoringFrequencyMinutes));
    }
  }, [settings]);

  if (!isOwner) {
    return (
      <div className="rounded-xl border border-red-200 bg-white p-8 text-center dark:border-red-900/50 dark:bg-slate-900">
        <ShieldCheck className="mx-auto h-10 w-10 text-red-600" />
        <h1 className="mt-3 font-display text-xl font-bold text-slate-900 dark:text-white">
          Protected Owner Administration
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          This area is restricted exclusively to Platform Owner Subhashish Pandey (`subhpan8449@gmail.com`).
        </p>
      </div>
    );
  }

  const handleRunCycle = async () => {
    setRunningCycle(true);
    setCycleNotice('');
    try {
      const res = await runAutonomousDiscoveryCycle();
      await onSyncDiscoveredJobs(res.jobs);
      await onLogAiAction({
        agentName: 'Job Discovery Agent',
        action: 'Autonomous Finance & Global ATS Discovery Cycle',
        status: 'Completed',
        summary: `Discovered & deduplicated ${res.discoveredCount} real opportunities across ATS APIs and Search Grounding.`,
        modelUsed: 'gemini-4-hydrogen',
        actorUid: ownerUid,
      });
      setCycleNotice(`Autonomous cycle completed: ${res.discoveredCount} verified/checked opportunities synced.`);
      const freshTel = await fetchSystemTelemetry();
      setTelemetry(freshTel);
    } catch (err) {
      setCycleNotice(err instanceof Error ? err.message : 'Autonomous cycle failed');
    } finally {
      setRunningCycle(false);
    }
  };

  const handleSaveGovernanceSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const cap = Number(spendCapInput);
    const freq = Number(freqInput);
    await updateServerSpendCap(cap);
    await onUpdateSettings({
      dailyAiSpendCapUsd: cap,
      monitoringFrequencyMinutes: freq,
    });
    await onLogAiAction({
      agentName: 'Platform Monitoring Agent',
      action: 'Updated AI Spend Cap & Monitoring Frequency',
      status: 'Completed',
      summary: `Owner set daily cap to $${cap} USD and monitoring frequency to ${freq} minutes.`,
      modelUsed: 'gemini-4-hydrogen',
      actorUid: ownerUid,
    });
    const freshTel = await fetchSystemTelemetry();
    setTelemetry(freshTel);
    setCycleNotice('Platform governance settings updated.');
  };

  const verifiedCount = jobs.filter((j) => j.verificationStatus === 'Verified').length;
  const unverifiedCount = jobs.filter(
    (j) => j.verificationStatus === 'Unverified' || j.verificationStatus === 'Partially Verified'
  ).length;
  const expiredCount = jobs.filter((j) => j.verificationStatus === 'Expired').length;
  const suspiciousJobs = jobs.filter(
    (j) => j.verificationStatus === 'Suspicious' || j.verificationStatus === 'Unverified'
  );
  const financeCount = jobs.filter((j) => j.category === 'Finance Jobs').length;
  const sapCount = jobs.filter((j) => j.category === 'SAP FICO Jobs').length;
  const baCount = jobs.filter((j) => j.category === 'Business Analytics Jobs').length;
  const marketingCount = jobs.filter((j) => j.category === 'Marketing Jobs').length;
  const indiaCount = jobs.filter((j) => j.region === 'India').length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">
            Owner Administration · Subhashish Pandey
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold text-slate-900 dark:text-white">
            {activeSection === 'ai-control'
              ? 'Autonomous AI Control Center'
              : activeSection === 'sources'
                ? 'Data Source & Connector Health'
                : activeSection === 'settings'
                  ? 'Platform Governance & AI Model Settings'
                  : 'Owner Executive Dashboard'}
          </h1>
        </div>

        <button
          type="button"
          disabled={runningCycle}
          onClick={() => void handleRunCycle()}
          className="inline-flex items-center gap-2 rounded-lg bg-[#0B192C] px-4 py-2.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-700 whitespace-nowrap shrink-0"
        >
          {runningCycle ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          <span>{runningCycle ? 'Running Discovery Cycle...' : 'Run Autonomous AI Cycle'}</span>
        </button>
      </div>

      {cycleNotice && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3.5 text-xs font-medium text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300">
          {cycleNotice}
        </div>
      )}

      {/* Executive Metrics Grid */}
      {(activeSection === 'owner' || activeSection === 'ai-control') && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            ['Candidates', candidates.length],
            ['Total Jobs', jobs.length],
            ['India Jobs', indiaCount],
            ['Verified Jobs', verifiedCount],
            ['Unverified / Partial', unverifiedCount],
            ['Expired Jobs', expiredCount],
            ['Finance Jobs', financeCount],
            ['SAP FICO Jobs', sapCount],
            ['Analytics Jobs', baCount],
            ['Marketing Jobs', marketingCount],
            ['AI Requests Today', telemetry?.usage.requestsToday ?? 0],
            ['AI Spend Today', `$${(telemetry?.usage.estimatedSpendUsd ?? 0).toFixed(3)}`],
          ].map(([label, val]) => (
            <div
              key={String(label)}
              className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
            >
              <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
              <p className="mt-1.5 font-mono tabular-nums text-xl font-semibold text-slate-900 dark:text-white">
                {val}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Owner Approval Queue */}
      {(activeSection === 'owner' || activeSection === 'ai-control') && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
            Owner Approval Queue (High-Risk Action Governance)
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            AI requires explicit approval from Subhashish Pandey before changing notification policies, AI spend caps, external integrations, or outreach automation.
          </p>

          <div className="mt-4 space-y-3">
            {approvals.length === 0 ? (
              <p className="text-sm text-slate-500">No pending approval requests.</p>
            ) : (
              approvals.map((req) => (
                <div
                  key={req.requestId}
                  className="flex flex-col justify-between gap-4 rounded-lg border border-slate-200 p-4 sm:flex-row sm:items-center dark:border-slate-800"
                >
                  <div>
                    <p className="text-xs font-medium text-blue-700 dark:text-blue-400">
                      {req.actionType} · {req.requestedByAgent} · Status: {req.status}
                    </p>
                    <h3 className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                      {req.title}
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                      {req.description}
                    </p>
                  </div>

                  {req.status === 'Pending' && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => void onUpdateApproval(req.requestId, 'Approved')}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Approve</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => void onUpdateApproval(req.requestId, 'Rejected')}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400"
                      >
                        <X className="h-3.5 w-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* 10 Specialized AI Agents Roster */}
      {activeSection === 'ai-control' && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
            10 Autonomous Specialized Agents
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            {SPECIALIZED_AGENTS.map((agent) => (
              <div
                key={agent.name}
                className="flex items-start gap-3 rounded-lg border border-slate-200 p-4 dark:border-slate-800"
              >
                <Bot className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{agent.name}</p>
                  <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">{agent.task}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Data Sources Management */}
      {(activeSection === 'sources' || activeSection === 'owner') && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-600" />
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
              Legitimate Data Source Connectors
            </h2>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="py-2.5 pr-4 font-semibold">Source Name</th>
                  <th className="py-2.5 pr-4 font-semibold">Integration Type</th>
                  <th className="py-2.5 pr-4 font-semibold">Health</th>
                  <th className="py-2.5 text-right font-semibold">Control</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {dataSources.map((src) => (
                  <tr key={src.sourceId}>
                    <td className="py-3 pr-4 font-medium text-slate-900 dark:text-white">{src.name}</td>
                    <td className="py-3 pr-4 text-slate-600 dark:text-slate-400">{src.sourceType}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={
                          src.enabled
                            ? 'font-medium text-emerald-700 dark:text-emerald-400'
                            : 'text-slate-500'
                        }
                      >
                        {src.healthStatus}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() => void onToggleSource(src.sourceId, !src.enabled)}
                        className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
                      >
                        {src.enabled ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Suspicious & Unverified Jobs Review Queue */}
      {activeSection === 'owner' && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
              Suspicious & Unverified Job Moderation ({suspiciousJobs.length})
            </h2>
          </div>
          <div className="mt-4 space-y-3">
            {suspiciousJobs.length === 0 ? (
              <p className="text-sm text-slate-500">All cataloged jobs are verified or partially verified.</p>
            ) : (
              suspiciousJobs.slice(0, 10).map((job) => (
                <div
                  key={job.jobId}
                  className="flex flex-col justify-between gap-3 rounded-lg border border-slate-200 p-4 sm:flex-row sm:items-center dark:border-slate-800"
                >
                  <div>
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                      {job.verificationStatus} · {job.sourceName}
                    </p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {job.title} — {job.company}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => void onVerifyOrFlagJob(job.jobId, 'Verified')}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Mark Verified</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void onDeleteJob(job.jobId)}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 dark:border-red-900 dark:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* AI Provider Abstraction & Platform Governance Settings */}
      {(activeSection === 'settings' || activeSection === 'ai-control') && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-6 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
              AI Provider Abstraction & Spending Controls
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              {(telemetry?.providers || []).map((prov) => (
                <div
                  key={prov.id}
                  className="rounded-lg border border-slate-200 p-4 dark:border-slate-800"
                >
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{prov.name}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Models: {prov.models.join(', ')}
                  </p>
                  <p className="mt-2 text-xs font-medium text-blue-700 dark:text-blue-400">
                    {prov.configured ? 'Server Key Configured' : 'Optional Server Key Not Set'}
                    {prov.active ? ' · Active Primary' : ''}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <form
            onSubmit={(e) => void handleSaveGovernanceSettings(e)}
            className="grid grid-cols-1 gap-4 border-t border-slate-100 pt-5 md:grid-cols-3 dark:border-slate-800"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Daily AI Spend Cap (USD)
              </label>
              <input
                type="number"
                min={1}
                max={5000}
                value={spendCapInput}
                onChange={(e) => setSpendCapInput(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-mono dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Monitoring Cycle Frequency (Minutes)
              </label>
              <input
                type="number"
                min={5}
                max={1440}
                value={freqInput}
                onChange={(e) => setFreqInput(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-mono dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full rounded-lg bg-[#0B192C] px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-blue-600"
              >
                Save Governance Settings
              </button>
            </div>
          </form>
        </section>
      )}

      {/* AI Activity Logs */}
      {(activeSection === 'ai-control' || activeSection === 'owner') && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
            AI Activity Audit Log
          </h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="py-2 pr-4 font-semibold">Agent</th>
                  <th className="py-2 pr-4 font-semibold">Action</th>
                  <th className="py-2 pr-4 font-semibold">Model</th>
                  <th className="py-2 pr-4 font-semibold">Status</th>
                  <th className="py-2 font-semibold">Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {aiLogs.map((log) => (
                  <tr key={log.logId}>
                    <td className="py-2.5 pr-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                      {log.agentName}
                    </td>
                    <td className="py-2.5 pr-4 text-slate-700 dark:text-slate-300">{log.action}</td>
                    <td className="py-2.5 pr-4 font-mono text-slate-500">{log.modelUsed}</td>
                    <td className="py-2.5 pr-4 font-medium text-emerald-700 dark:text-emerald-400">
                      {log.status}
                    </td>
                    <td className="py-2.5 text-slate-600 dark:text-slate-400">{log.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};
