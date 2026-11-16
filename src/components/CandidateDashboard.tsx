import React from 'react';
import { ArrowRight, Loader2, Sparkles } from 'lucide-react';
import type {
  AiRecommendation,
  AppPage,
  CandidateNotification,
  CandidateProfile,
  JobApplication,
  JobListing,
  SavedJob,
} from '../types';
import { JobCard } from './JobCard';

interface CandidateDashboardProps {
  profile: CandidateProfile | null;
  jobs: JobListing[];
  recommendations: AiRecommendation[];
  savedJobs: SavedJob[];
  applications: JobApplication[];
  notifications: CandidateNotification[];
  matchingLoading: boolean;
  onRunMatching: () => Promise<void>;
  onNavigate: (page: AppPage) => void;
  onSelectJob: (job: JobListing, tab?: 'details' | 'assistant') => void;
  onToggleSave: (job: JobListing) => void;
  onApplyClick: (job: JobListing) => void;
}

export const CandidateDashboard: React.FC<CandidateDashboardProps> = ({
  profile,
  jobs,
  recommendations,
  savedJobs,
  applications,
  notifications,
  matchingLoading,
  onRunMatching,
  onNavigate,
  onSelectJob,
  onToggleSave,
  onApplyClick,
}) => {
  const recMap = new Map(recommendations.map((r) => [r.jobId, r]));
  const savedSet = new Set(savedJobs.map((s) => s.jobId));
  const appMap = new Map(applications.map((a) => [a.jobId, a.status]));

  const fresherJobs = jobs.filter(
    (j) =>
      j.mbaEligible &&
      j.experienceCheck !== 'Exceeds 1 Yr' &&
      j.verificationStatus !== 'Expired'
  );
  const topMatched = [...fresherJobs]
    .sort((a, b) => {
      if (a.region === 'India' && b.region !== 'India') return -1;
      if (b.region === 'India' && a.region !== 'India') return 1;
      return (recMap.get(b.jobId)?.matchScore || 0) - (recMap.get(a.jobId)?.matchScore || 0);
    })
    .slice(0, 6);

  const highMatchesCount = recommendations.filter((r) => r.matchScore >= 75).length;
  const unreadNotifs = notifications.filter((n) => !n.read).length;

  const categories = [
    'Finance Jobs',
    'SAP FICO Jobs',
    'Business Analytics Jobs',
    'Marketing Jobs',
  ] as const;
  const catCounts = categories.map((cat) => ({
    cat,
    count: fresherJobs.filter((j) => j.category === cat).length,
  }));
  const maxCount = Math.max(1, ...catCounts.map((c) => c.count));

  return (
    <div className="space-y-8">
      {/* Header & Primary Action */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            Welcome back, {profile?.name || 'MBA Candidate'}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Specialization: {profile?.mbaSpecialization || 'Finance Jobs'} · Target: {profile?.experienceYears || '0-1 Years'} · {profile?.country || 'India'}
          </p>
        </div>

        <button
          type="button"
          disabled={matchingLoading}
          onClick={() => void onRunMatching()}
          className="inline-flex items-center gap-2 rounded-lg bg-[#0B192C] px-4 py-2.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-700 whitespace-nowrap shrink-0"
        >
          {matchingLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          <span>{matchingLoading ? 'Scoring Matches...' : 'Refresh AI Match Scores'}</span>
        </button>
      </div>

      {/* 4-Column KPI Strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Active MBA Fresher Jobs', value: fresherJobs.length, action: () => onNavigate('jobs') },
          { label: 'High Profile Matches (≥75%)', value: highMatchesCount, action: () => onNavigate('finance') },
          { label: 'Saved & Tracked Roles', value: savedJobs.length + applications.length, action: () => onNavigate('applications') },
          { label: 'Unread Match Alerts', value: unreadNotifs, action: () => onNavigate('notifications') },
        ].map((kpi) => (
          <button
            key={kpi.label}
            type="button"
            onClick={kpi.action}
            className="rounded-xl border border-slate-200 bg-white p-5 text-left transition-colors hover:border-blue-400 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-600"
          >
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{kpi.label}</p>
            <p className="mt-2 font-mono tabular-nums text-2xl font-semibold text-slate-900 dark:text-white">
              {kpi.value}
            </p>
          </button>
        ))}
      </div>

      {/* Category Distribution & Quick Shortcuts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 lg:col-span-7">
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
            Discovered 0–1 Year MBA Opportunities Across 4 Hubs
          </h2>
          <div className="mt-5 space-y-3.5">
            {catCounts.map((item) => {
              const pct = Math.round((item.count / maxCount) * 100);
              return (
                <div key={item.cat}>
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {item.cat}
                    </span>
                    <span className="font-mono tabular-nums text-slate-600 dark:text-slate-400">
                      {item.count}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className={`h-full rounded-full ${
                        item.cat === 'Finance Jobs' ? 'bg-blue-700 dark:bg-blue-500' : 'bg-slate-500 dark:bg-slate-400'
                      }`}
                      style={{ width: `${Math.max(item.count > 0 ? 6 : 0, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 lg:col-span-5">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
              Career Readiness Next Steps
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Keep your MBA specialization, skills, and resume synced so the AI Matching Agent alerts you immediately when verified Finance or SAP openings go live.
            </p>
          </div>
          <div className="mt-5 space-y-2">
            <button
              type="button"
              onClick={() => onNavigate('resume')}
              className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-4 py-2.5 text-xs font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <span>Analyze & Sync Resume</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('finance')}
              className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-4 py-2.5 text-xs font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <span>Open Priority Finance Hub</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('profile')}
              className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-4 py-2.5 text-xs font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <span>Update Profile & Location Preferences</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </section>
      </div>

      {/* Top Matched Recommendations */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
            Recommended Early-Career Roles
          </h2>
          <button
            type="button"
            onClick={() => onNavigate('jobs')}
            className="text-xs font-medium text-blue-700 hover:underline dark:text-blue-400"
          >
            View all jobs
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {topMatched.map((job) => (
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
      </section>
    </div>
  );
};
