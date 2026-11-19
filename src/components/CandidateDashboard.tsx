import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  Bell,
  Briefcase,
  Calendar,
  CheckCircle2,
  Circle,
  Compass,
  Globe2,
  ImageUp,
  Layers,
  Loader2,
  Search,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import {
  DISCOVERY_PORTALS,
  type AiRecommendation,
  type AppPage,
  type CandidateNotification,
  type CandidateProfile,
  type JobApplication,
  type JobCategory,
  type JobListing,
  type SavedJob,
} from '../types';
import { JobCard } from './JobCard';
import { VfxBackdrop } from './VfxBackdrop';

interface CandidateDashboardProps {
  profile: CandidateProfile | null;
  jobs: JobListing[];
  totalLiveJobsCount: number;
  connectedSourcesCount: number;
  sourceBreakdown: Record<string, number>;
  countsByRegion?: { India: number; International: number };
  countsByCategory?: Record<JobCategory, number>;
  recommendations: AiRecommendation[];
  savedJobs: SavedJob[];
  applications: JobApplication[];
  notifications: CandidateNotification[];
  matchingLoading: boolean;
  discoveringEverywhere: boolean;
  onRunMatching: () => Promise<void>;
  onDiscoverEverywhere: () => Promise<void>;
  onOpenOcr: () => void;
  onNavigate: (page: AppPage) => void;
  onSelectJob: (job: JobListing, tab?: 'details' | 'assistant') => void;
  onToggleSave: (job: JobListing) => void;
  onApplyClick: (job: JobListing) => void;
}

type ExplorerTab =
  | 'All Priority'
  | 'India First'
  | 'Finance Jobs'
  | 'SAP FICO Jobs'
  | 'Business Analytics Jobs'
  | 'Marketing Jobs'
  | 'International';

const CATEGORY_TO_PAGE: Record<JobCategory, AppPage> = {
  'Finance Jobs': 'finance',
  'SAP FICO Jobs': 'sap-fico',
  'Business Analytics Jobs': 'analytics',
  'Marketing Jobs': 'marketing',
};

export const CandidateDashboard: React.FC<CandidateDashboardProps> = ({
  profile,
  jobs,
  totalLiveJobsCount,
  connectedSourcesCount,
  sourceBreakdown,
  countsByRegion,
  countsByCategory,
  recommendations,
  savedJobs,
  applications,
  notifications,
  matchingLoading,
  discoveringEverywhere,
  onRunMatching,
  onDiscoverEverywhere,
  onOpenOcr,
  onNavigate,
  onSelectJob,
  onToggleSave,
  onApplyClick,
}) => {
  const [activeTab, setActiveTab] = useState<ExplorerTab>('All Priority');
  const [quickQuery, setQuickQuery] = useState('');

  const recMap = useMemo(
    () => new Map(recommendations.map((r) => [r.jobId, r])),
    [recommendations]
  );
  const savedSet = useMemo(() => new Set(savedJobs.map((s) => s.jobId)), [savedJobs]);
  const appMap = useMemo(
    () => new Map(applications.map((a) => [a.jobId, a.status])),
    [applications]
  );

  // Include all active non-expired roles within <=1 yr limit (both Verified MBA & Needs MBA Verification) so feed never falsely shows 0
  const activeJobs = useMemo(
    () =>
      jobs.filter(
        (j) =>
          j.experienceCheck !== 'Exceeds 1 Yr' &&
          j.verificationStatus !== 'Expired'
      ),
    [jobs]
  );

  const indiaCount =
    countsByRegion?.India ?? activeJobs.filter((j) => j.region === 'India').length;
  const intlCount =
    countsByRegion?.International ?? activeJobs.filter((j) => j.region === 'International').length;
  const displayTotalJobs = Math.max(totalLiveJobsCount, activeJobs.length);

  const highMatchesCount = recommendations.filter((r) => r.matchScore >= 75).length;
  const unreadNotifs = notifications.filter((n) => !n.read).length;

  const categories: JobCategory[] = [
    'Finance Jobs',
    'SAP FICO Jobs',
    'Business Analytics Jobs',
    'Marketing Jobs',
  ];

  const catCounts = categories.map((cat) => ({
    cat,
    count: Math.max(
      countsByCategory?.[cat] || 0,
      activeJobs.filter((j) => j.category === cat).length
    ),
  }));
  const maxCatCount = Math.max(1, ...catCounts.map((c) => c.count));

  const topSources = useMemo(() => {
    return Object.entries(sourceBreakdown)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [sourceBreakdown]);

  // Application Pipeline Breakdown
  const pipelineStats = useMemo(() => {
    const preparing = applications.filter((a) => a.status === 'Preparing').length;
    const applied = applications.filter((a) => a.status === 'Applied').length;
    const interviewing = applications.filter(
      (a) => a.status === 'Interview Scheduled' || a.status === 'Assessment'
    ).length;
    const offers = applications.filter((a) => a.status === 'Offer').length;
    const nextInterview = applications.find((a) => a.interviewDateTime);
    return { preparing, applied, interviewing, offers, nextInterview };
  }, [applications]);

  // 3-Step Guided Career Launchpad Progress
  const step1Done = Boolean(profile?.resumeSummary && profile.resumeSummary.trim().length > 40);
  const step2Done = displayTotalJobs > 0;
  const step3Done = recommendations.length > 0 || applications.length > 0 || savedJobs.length > 0;
  const completedSteps = [step1Done, step2Done, step3Done].filter(Boolean).length;

  // Quick-Filtered Dashboard Opportunities
  const filteredExplorerJobs = useMemo(() => {
    const q = quickQuery.trim().toLowerCase();
    return [...activeJobs]
      .filter((job) => {
        if (activeTab === 'India First' && job.region !== 'India') return false;
        if (activeTab === 'International' && job.region !== 'International') return false;
        if (
          (activeTab === 'Finance Jobs' ||
            activeTab === 'SAP FICO Jobs' ||
            activeTab === 'Business Analytics Jobs' ||
            activeTab === 'Marketing Jobs') &&
          job.category !== activeTab
        ) {
          return false;
        }
        if (q) {
          const hay = `${job.title} ${job.company} ${job.city || ''} ${job.country} ${job.sourceName || ''} ${(job.skills || []).join(' ')}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (a.region === 'India' && b.region !== 'India') return -1;
        if (b.region === 'India' && a.region !== 'India') return 1;
        const scoreDiff =
          (recMap.get(b.jobId)?.matchScore || 0) - (recMap.get(a.jobId)?.matchScore || 0);
        if (scoreDiff !== 0) return scoreDiff;
        if (a.category === 'Finance Jobs' && b.category !== 'Finance Jobs') return -1;
        if (b.category === 'Finance Jobs' && a.category !== 'Finance Jobs') return 1;
        return (b.postedDate || '').localeCompare(a.postedDate || '');
      })
      .slice(0, 8);
  }, [activeJobs, activeTab, quickQuery, recMap]);

  const kpiCards = [
    {
      label: 'Active MBA Fresher Roles',
      value: displayTotalJobs,
      sub: `${indiaCount} India · ${intlCount} International`,
      icon: <Briefcase className="h-4 w-4 text-blue-600 dark:text-sky-400" />,
      action: () => onNavigate('jobs'),
    },
    {
      label: 'Connected Apps & Live ATS',
      value: `${connectedSourcesCount}+`,
      sub: `${DISCOVERY_PORTALS.length} Job Portals + Direct ATS`,
      icon: <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />,
      action: () => void onDiscoverEverywhere(),
    },
    {
      label: 'High AI Profile Matches',
      value: highMatchesCount,
      sub:
        recommendations.length > 0
          ? `${recommendations.length} total scored`
          : 'Click Refresh AI Match',
      icon: <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />,
      action: () => onNavigate('finance'),
    },
    {
      label: 'Tracked Apps & Alerts',
      value: applications.length + savedJobs.length,
      sub: `${unreadNotifs} unread match alerts`,
      icon: <Bell className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
      action: () => onNavigate('applications'),
    },
  ];

  const explorerTabs: ExplorerTab[] = [
    'All Priority',
    'India First',
    'Finance Jobs',
    'SAP FICO Jobs',
    'Business Analytics Jobs',
    'Marketing Jobs',
    'International',
  ];

  return (
    <div className="space-y-7">
      {/* Executive VFX Hero Command Header */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-800 bg-[#0B192C] p-6 text-white shadow-lg sm:p-7">
        <VfxBackdrop variant="hero" />

        <div className="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="max-w-2xl space-y-2">
            <p className="text-xs font-semibold tracking-wide text-sky-400">
              EXECUTIVE CAREER COMMAND CENTER · INDIA-FIRST MBA INTELLIGENCE
            </p>
            <h1 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Welcome back, {profile?.name || 'MBA Candidate'}
            </h1>
            <p className="text-xs leading-relaxed text-slate-300 sm:text-sm">
              Track: <strong className="text-white">{profile?.mbaSpecialization || 'Finance Jobs'}</strong> ·
              Experience Filter: <strong className="text-white">{profile?.experienceYears || '0-1 Years'}</strong> ·
              Priority Region: <strong className="text-white">{profile?.country || 'India'}</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={discoveringEverywhere}
              onClick={() => void onDiscoverEverywhere()}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-transform duration-150 hover:-translate-y-0.5 hover:bg-blue-500 disabled:opacity-60 whitespace-nowrap shrink-0"
            >
              {discoveringEverywhere ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Compass className="h-4 w-4" />
              )}
              <span>
                {discoveringEverywhere
                  ? 'Scanning 16+ Apps...'
                  : 'Find Jobs Everywhere (16+ Apps)'}
              </span>
            </button>

            <button
              type="button"
              disabled={matchingLoading}
              onClick={() => void onRunMatching()}
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/15 disabled:opacity-60 whitespace-nowrap shrink-0"
            >
              {matchingLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 text-sky-300" />
              )}
              <span>{matchingLoading ? 'Scoring...' : 'Refresh AI Match Scores'}</span>
            </button>

            <button
              type="button"
              onClick={onOpenOcr}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-xs font-medium text-slate-200 transition-colors hover:bg-white/10 whitespace-nowrap shrink-0"
            >
              <ImageUp className="h-4 w-4 text-sky-300" />
              <span>Ingest Screenshot / Post / Mail</span>
            </button>
          </div>
        </div>
      </section>

      {/* 4-Column Animated Executive KPI Strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpiCards.map((kpi) => (
          <motion.button
            key={kpi.label}
            type="button"
            whileHover={{ y: -2 }}
            transition={{ duration: 0.15 }}
            onClick={kpi.action}
            className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 text-left transition-colors hover:border-blue-400 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-600"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{kpi.label}</p>
              {kpi.icon}
            </div>
            <p className="mt-2.5 font-mono tabular-nums text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
              {kpi.value}
            </p>
            <p className="mt-1 truncate text-[11px] text-slate-500 dark:text-slate-400">
              {kpi.sub}
            </p>
          </motion.button>
        ))}
      </div>

      {/* 3-Step Ultra-Easy Guided Launchpad */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
              Quick-Start Career Launchpad
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              3 simple steps to maximize MBA fresher interview calls.
            </p>
          </div>
          <span className="font-mono tabular-nums text-xs font-semibold text-blue-700 dark:text-sky-400">
            {completedSteps} / 3 Ready
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <button
            type="button"
            onClick={() => onNavigate('resume')}
            className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 text-left transition-colors hover:border-blue-400 hover:bg-white dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-blue-600"
          >
            {step1Done ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-900 dark:text-white">
                1. Sync MBA Resume &amp; Skills
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                {step1Done ? 'Resume synced for ATS scoring' : 'Upload PDF/text for instant AI audit'}
              </p>
            </div>
          </button>

          <button
            type="button"
            disabled={discoveringEverywhere}
            onClick={() => void onDiscoverEverywhere()}
            className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 text-left transition-colors hover:border-blue-400 hover:bg-white dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-blue-600"
          >
            {step2Done ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-900 dark:text-white">
                2. Scan 16+ Hiring Apps &amp; ATS
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                LinkedIn, Naukri, Internshala, Foundit, Unstop &amp; live company boards
              </p>
            </div>
          </button>

          <button
            type="button"
            disabled={matchingLoading}
            onClick={() => void onRunMatching()}
            className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 text-left transition-colors hover:border-blue-400 hover:bg-white dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-blue-600"
          >
            {step3Done ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-900 dark:text-white">
                3. Score Matches &amp; Apply Smart
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                Rank best-fit roles and generate cover letters &amp; interview prep
              </p>
            </div>
          </button>
        </div>
      </section>

      {/* Intelligence Breakdown: 4 Hubs + Live Sources & Application Pipeline */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* 4 Specialization Hubs + Live Source Breakdown */}
        <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 lg:col-span-7">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                4 Dedicated MBA Specialization Hubs
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Click any hub to open its dedicated India-first &amp; Global dashboard.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('jobs')}
              className="text-xs font-medium text-blue-700 hover:underline dark:text-sky-400 whitespace-nowrap shrink-0"
            >
              All Feed
            </button>
          </div>

          <div className="space-y-3">
            {catCounts.map((item) => {
              const pct = Math.round((item.count / maxCatCount) * 100);
              return (
                <button
                  key={item.cat}
                  type="button"
                  onClick={() => onNavigate(CATEGORY_TO_PAGE[item.cat])}
                  className="group block w-full text-left"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-800 group-hover:text-blue-700 dark:text-slate-200 dark:group-hover:text-sky-400">
                      {item.cat}
                      {item.cat === 'Finance Jobs' && (
                        <span className="ml-2 text-[11px] font-semibold text-blue-700 dark:text-sky-400">
                          · Priority 1
                        </span>
                      )}
                    </span>
                    <span className="font-mono tabular-nums font-semibold text-slate-700 dark:text-slate-300">
                      {item.count} roles
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(item.count > 0 ? 8 : 0, pct)}%` }}
                      transition={{ duration: 0.35, ease: 'easeOut' }}
                      className={`h-full rounded-full ${
                        item.cat === 'Finance Jobs'
                          ? 'bg-blue-600 dark:bg-sky-500'
                          : 'bg-slate-500 group-hover:bg-blue-500 dark:bg-slate-400'
                      }`}
                    />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Live Connected Source Breakdown */}
          {topSources.length > 0 && (
            <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Live Indexed Source Engines (Real-Time APIs)
              </p>
              <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {topSources.map(([srcName, count]) => (
                  <div
                    key={srcName}
                    className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-950/60"
                  >
                    <span className="truncate font-medium text-slate-700 dark:text-slate-300">
                      {srcName}
                    </span>
                    <span className="ml-2 font-mono tabular-nums font-semibold text-blue-700 dark:text-sky-400">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Application & Interview Pipeline + Quick Shortcuts */}
        <section className="flex flex-col justify-between space-y-5 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 lg:col-span-5">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                Application &amp; Interview Pipeline
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('applications')}
                className="text-xs font-medium text-blue-700 hover:underline dark:text-sky-400"
              >
                Open Tracker
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                ['Preparing', pipelineStats.preparing],
                ['Applied', pipelineStats.applied],
                ['Interviewing', pipelineStats.interviewing],
                ['Offers', pipelineStats.offers],
              ].map(([stage, count]) => (
                <div
                  key={String(stage)}
                  className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/60"
                >
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    {stage}
                  </p>
                  <p className="mt-1 font-mono tabular-nums text-xl font-bold text-slate-900 dark:text-white">
                    {count}
                  </p>
                </div>
              ))}
            </div>

            {pipelineStats.nextInterview && (
              <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200">
                <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-blue-700 dark:text-sky-400" />
                <div>
                  <p className="font-semibold">
                    Upcoming: {pipelineStats.nextInterview.interviewRound || 'Interview'} ·{' '}
                    {pipelineStats.nextInterview.company}
                  </p>
                  <p className="mt-0.5 font-mono text-[11px]">
                    {pipelineStats.nextInterview.interviewDateTime}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={() => onNavigate('finance')}
              className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3.5 py-2.5 text-xs font-medium text-slate-800 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <span>Open Priority Finance Hub</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('resume')}
              className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3.5 py-2.5 text-xs font-medium text-slate-800 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <span>Analyze &amp; Optimize MBA Resume</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('profile')}
              className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3.5 py-2.5 text-xs font-medium text-slate-800 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <span>Update Cities, Skills &amp; Alert Channels</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </section>
      </div>

      {/* Built-in Quick-Filter Opportunities Explorer */}
      <section className="space-y-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
              Live Top Opportunities Explorer
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              India-first ranking · Filter instantly by hub, region, or keyword right from your dashboard.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={quickQuery}
                onChange={(e) => setQuickQuery(e.target.value)}
                placeholder="Quick filter title, company, city..."
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
            <button
              type="button"
              onClick={() => onNavigate('jobs')}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-blue-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-sky-400 whitespace-nowrap shrink-0"
            >
              <span>Full Feed</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Category / Region Quick Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          {explorerTabs.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-[#0B192C] text-white dark:bg-blue-600'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                }`}
              >
                {tab === 'International' && <Globe2 className="h-3.5 w-3.5" />}
                <span>{tab}</span>
              </button>
            );
          })}
        </div>

        {filteredExplorerJobs.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
              No cached jobs matched "{activeTab}"{quickQuery ? ` + "${quickQuery}"` : ''} yet.
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Click below to scan LinkedIn, Naukri, Internshala, Foundit, IIMJobs, Unstop &amp; 10+ other apps live.
            </p>
            <button
              type="button"
              disabled={discoveringEverywhere}
              onClick={() => void onDiscoverEverywhere()}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
            >
              {discoveringEverywhere ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Compass className="h-3.5 w-3.5" />
              )}
              <span>Find Live Jobs Across 16+ Apps</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {filteredExplorerJobs.map((job) => (
              <JobCard
                key={job.jobId}
                job={job}
                recommendation={recMap.get(job.jobId)}
                isSaved={savedSet.has(job.jobId)}
                applicationStatus={appMap.get(job.jobId)}
                onSelect={(j) => onSelectJob(j, 'details')}
                onOpenAssistant={(j) => onSelectJob(j, 'assistant')}
                onToggleSave={onToggleSave}
                onApplyClick={onApplyClick}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
