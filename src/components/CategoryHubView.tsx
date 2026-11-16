import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Bell,
  Bookmark,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Globe2,
  ImageUp,
  LayoutDashboard,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
} from 'lucide-react';
import { useDebounce } from '../hooks/useDebounce';
import { discoverJobsViaAi, fetchLivePublicJobs } from '../services/apiClient';
import type { ApplicationProcessUpdates } from '../services/firestoreService';
import {
  INDIA_CITIES,
  type AiRecommendation,
  type ApplicationStatus,
  type CandidateNotification,
  type CandidateProfile,
  type FeedBucket,
  type JobApplication,
  type JobCategory,
  type JobListing,
  type PaginatedJobsResponse,
  type SavedJob,
  type WorkMode,
} from '../types';
import { JobCard } from './JobCard';
import { SavedAndTrackerView } from './SavedAndTrackerView';

interface CategoryHubViewProps {
  category: JobCategory;
  firestoreJobs: JobListing[];
  profile: CandidateProfile | null;
  recommendations: AiRecommendation[];
  savedJobs: SavedJob[];
  applications: JobApplication[];
  notifications: CandidateNotification[];
  isSignedIn: boolean;
  isOwner: boolean;
  matchingLoading: boolean;
  onSignIn: () => void;
  onRunMatching: () => Promise<void>;
  onSelectJob: (job: JobListing, tab?: 'details' | 'assistant') => void;
  onToggleSave: (job: JobListing) => void;
  onApplyClick: (job: JobListing) => void;
  onOpenOcr: () => void;
  onRemoveSaved: (savedId: string) => Promise<void>;
  onUpdateApplication: (
    app: JobApplication,
    status: ApplicationStatus,
    notes: string,
    extra?: ApplicationProcessUpdates
  ) => Promise<void>;
  onMarkNotifRead: (id: string) => Promise<void>;
  onSyncDiscoveredJobs: (jobs: JobListing[]) => Promise<number>;
  onToast: (msg: string) => void;
}

const CATEGORY_META: Record<
  JobCategory,
  { subtitle: string; focusPlaceholder: string; defaultQuery: string }
> = {
  'Finance Jobs': {
    subtitle:
      'Highest Priority · Financial Analyst, FP&A, Corporate Finance, Audit, Treasury, Valuation, Risk & Banking Ops (0–1 Yr MBA).',
    focusPlaceholder: 'e.g., FP&A Analyst, Credit Analyst, Investment Banking, Audit Associate...',
    defaultQuery: 'MBA Finance fresher Financial Analyst FP&A Audit Treasury India',
  },
  'SAP FICO Jobs': {
    subtitle:
      'Dedicated SAP Finance & Controlling Hub · SAP FICO Trainee, S/4HANA Finance Associate, ERP Finance Functional Consultant (0–1 Yr).',
    focusPlaceholder: 'e.g., SAP FICO Trainee, S/4HANA Finance, SAP FI Associate...',
    defaultQuery: 'MBA fresher SAP FICO Trainee S/4HANA Finance consultant India',
  },
  'Business Analytics Jobs': {
    subtitle:
      'Dedicated Analytics & BI Hub · Business Analyst, BI Analyst, Financial Data Analyst, Reporting & SQL/Power BI Roles (0–1 Yr).',
    focusPlaceholder: 'e.g., Junior Business Analyst, Power BI, SQL, Reporting Analyst...',
    defaultQuery: 'MBA Business Analytics fresher Junior Business Analyst BI India',
  },
  'Marketing Jobs': {
    subtitle:
      'Dedicated Brand & Growth Hub · Brand Management Trainee, Marketing Analyst, Performance Marketing, CRM & Market Research (0–1 Yr).',
    focusPlaceholder: 'e.g., Brand Management Trainee, Performance Marketing, Market Research...',
    defaultQuery: 'MBA Marketing fresher Brand Trainee Marketing Analyst India',
  },
};

const FEED_BUCKETS: Array<FeedBucket | 'All'> = [
  'All',
  'Verified MBA Fresher Jobs',
  'Partially Verified Jobs',
  'Needs Eligibility Verification',
  'Expired or Closed Jobs',
];

export const CategoryHubView: React.FC<CategoryHubViewProps> = ({
  category,
  firestoreJobs,
  recommendations,
  savedJobs,
  applications,
  notifications,
  isSignedIn,
  matchingLoading,
  onSignIn,
  onRunMatching,
  onSelectJob,
  onToggleSave,
  onApplyClick,
  onOpenOcr,
  onRemoveSaved,
  onUpdateApplication,
  onMarkNotifRead,
  onSyncDiscoveredJobs,
  onToast,
}) => {
  const [subTab, setSubTab] = useState<'feed' | 'saved' | 'applications' | 'notifications'>('feed');
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 300);

  const [selectedCity, setSelectedCity] = useState<string>('All India');
  const [selectedBucket, setSelectedBucket] = useState<FeedBucket | 'All'>('All');
  const [selectedWorkMode, setSelectedWorkMode] = useState<WorkMode | 'All'>('All');
  const [indiaPage, setIndiaPage] = useState(1);
  const [intlPage, setIntlPage] = useState(1);

  const [indiaResp, setIndiaResp] = useState<PaginatedJobsResponse | null>(null);
  const [intlResp, setIntlResp] = useState<PaginatedJobsResponse | null>(null);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [feedError, setFeedError] = useState('');

  const [discoverRole, setDiscoverRole] = useState('');
  const [discoverCountry, setDiscoverCountry] = useState('India');
  const [discovering, setDiscovering] = useState(false);

  const meta = CATEGORY_META[category];

  // Reset pagination when category or filters change
  useEffect(() => {
    setIndiaPage(1);
    setIntlPage(1);
    setSubTab('feed');
  }, [category]);

  useEffect(() => {
    setIndiaPage(1);
    setIntlPage(1);
  }, [debouncedSearch, selectedCity, selectedBucket, selectedWorkMode]);

  const loadCategoryFeeds = useCallback(
    async (forceRefresh = false) => {
      setLoadingFeed(true);
      setFeedError('');
      try {
        const [indiaData, intlData] = await Promise.all([
          fetchLivePublicJobs({
            category,
            region: 'India',
            city: selectedCity,
            bucket: selectedBucket,
            workMode: selectedWorkMode,
            q: debouncedSearch,
            page: indiaPage,
            limit: 6,
            refresh: forceRefresh,
          }),
          fetchLivePublicJobs({
            category,
            region: 'International',
            bucket: selectedBucket,
            workMode: selectedWorkMode,
            q: debouncedSearch,
            page: intlPage,
            limit: 4,
            refresh: false,
          }),
        ]);
        setIndiaResp(indiaData);
        setIntlResp(intlData);
      } catch (err) {
        setFeedError(err instanceof Error ? err.message : 'Unable to load category jobs');
      } finally {
        setLoadingFeed(false);
      }
    },
    [category, selectedCity, selectedBucket, selectedWorkMode, debouncedSearch, indiaPage, intlPage]
  );

  useEffect(() => {
    void loadCategoryFeeds(false);
  }, [loadCategoryFeeds]);

  const recMap = useMemo(() => new Map(recommendations.map((r) => [r.jobId, r])), [recommendations]);
  const savedSet = useMemo(() => new Set(savedJobs.map((s) => s.jobId)), [savedJobs]);
  const appMap = useMemo(() => new Map(applications.map((a) => [a.jobId, a.status])), [applications]);

  // Merge Firestore category jobs matching current filters into India/International views
  const firestoreCatJobs = useMemo(
    () => firestoreJobs.filter((j) => j.category === category),
    [firestoreJobs, category]
  );

  const indiaJobs = useMemo(() => {
    const map = new Map<string, JobListing>();
    for (const j of indiaResp?.jobs || []) map.set(j.duplicateKey || j.jobId, j);
    if (indiaPage === 1) {
      for (const j of firestoreCatJobs.filter((f) => f.region === 'India')) {
        if (selectedBucket !== 'All' && j.feedBucket !== selectedBucket) continue;
        if (selectedWorkMode !== 'All' && j.workMode !== selectedWorkMode) continue;
        if (debouncedSearch) {
          const hay = `${j.title} ${j.company} ${j.city || ''} ${(j.skills || []).join(' ')}`.toLowerCase();
          if (!hay.includes(debouncedSearch.toLowerCase())) continue;
        }
        map.set(j.duplicateKey || j.jobId, j);
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => (recMap.get(b.jobId)?.matchScore || 0) - (recMap.get(a.jobId)?.matchScore || 0)
    );
  }, [indiaResp, firestoreCatJobs, indiaPage, selectedBucket, selectedWorkMode, debouncedSearch, recMap]);

  const intlJobs = useMemo(() => {
    const map = new Map<string, JobListing>();
    for (const j of intlResp?.jobs || []) map.set(j.duplicateKey || j.jobId, j);
    if (intlPage === 1) {
      for (const j of firestoreCatJobs.filter((f) => f.region === 'International')) {
        if (selectedBucket !== 'All' && j.feedBucket !== selectedBucket) continue;
        if (selectedWorkMode !== 'All' && j.workMode !== selectedWorkMode) continue;
        if (debouncedSearch) {
          const hay = `${j.title} ${j.company} ${j.country} ${(j.skills || []).join(' ')}`.toLowerCase();
          if (!hay.includes(debouncedSearch.toLowerCase())) continue;
        }
        map.set(j.duplicateKey || j.jobId, j);
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => (recMap.get(b.jobId)?.matchScore || 0) - (recMap.get(a.jobId)?.matchScore || 0)
    );
  }, [intlResp, firestoreCatJobs, intlPage, selectedBucket, selectedWorkMode, debouncedSearch, recMap]);

  const topAiMatches = useMemo(() => {
    return [...indiaJobs, ...intlJobs]
      .filter((j) => (recMap.get(j.jobId)?.matchScore || 0) >= 60)
      .slice(0, 2);
  }, [indiaJobs, intlJobs, recMap]);

  const categorySaved = useMemo(
    () => savedJobs.filter((s) => s.category === category),
    [savedJobs, category]
  );
  const categoryApps = useMemo(
    () => applications.filter((a) => a.category === category),
    [applications, category]
  );
  const categoryNotifs = useMemo(
    () => notifications.filter((n) => n.category === category || !n.category),
    [notifications, category]
  );

  const handleCategoryDiscovery = async () => {
    if (!isSignedIn) {
      onSignIn();
      return;
    }
    setDiscovering(true);
    try {
      const res = await discoverJobsViaAi({
        category,
        country: discoverCountry,
        city: selectedCity,
        roleQuery: discoverRole || debouncedSearch || meta.defaultQuery,
      });
      const synced = await onSyncDiscoveredJobs(res.jobs);
      onToast(`Discovered ${res.jobs.length} ${category} opportunities (${synced} synced to catalog).`);
      void loadCategoryFeeds(false);
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Discovery failed');
    } finally {
      setDiscovering(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Category Header */}
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">
            Dedicated MBA Specialization Hub · Strict 0–1 Yr Filter
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold text-slate-900 dark:text-white">
            {category}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{meta.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={matchingLoading}
            onClick={() => void onRunMatching()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B192C] px-3.5 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-blue-600 whitespace-nowrap shrink-0"
          >
            {matchingLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            <span>{matchingLoading ? 'Scoring...' : 'AI Match Scores'}</span>
          </button>

          <button
            type="button"
            onClick={onOpenOcr}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 whitespace-nowrap shrink-0"
          >
            <ImageUp className="h-3.5 w-3.5" />
            <span>OCR Screenshot</span>
          </button>

          <button
            type="button"
            onClick={() => void loadCategoryFeeds(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 whitespace-nowrap shrink-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingFeed ? 'animate-spin' : ''}`} />
            <span>Refresh Live</span>
          </button>
        </div>
      </div>

      {/* Category Dedicated KPI Dashboard */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[
          ['India Priority Jobs', indiaResp?.total ?? indiaJobs.length],
          ['International Jobs', intlResp?.total ?? intlJobs.length],
          ['Saved in Category', categorySaved.length],
          ['Tracked Applications', categoryApps.length],
          ['Unread Alerts', categoryNotifs.filter((n) => !n.read).length],
        ].map(([label, val]) => (
          <div
            key={String(label)}
            className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
          >
            <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
            <p className="mt-1 font-mono tabular-nums text-xl font-semibold text-slate-900 dark:text-white">
              {val}
            </p>
          </div>
        ))}
      </div>

      {/* Category Sub-Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
        {(
          [
            ['feed', 'Dashboard & Jobs Feed', <LayoutDashboard className="h-3.5 w-3.5" key="f" />],
            ['saved', `Saved Jobs (${categorySaved.length})`, <Bookmark className="h-3.5 w-3.5" key="s" />],
            [
              'applications',
              `Applications & Interviews (${categoryApps.length})`,
              <CheckSquare className="h-3.5 w-3.5" key="a" />,
            ],
            [
              'notifications',
              `Notifications (${categoryNotifs.length})`,
              <Bell className="h-3.5 w-3.5" key="n" />,
            ],
          ] as const
        ).map(([id, label, icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => setSubTab(id)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              subTab === id
                ? 'bg-[#0B192C] text-white dark:bg-blue-600'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
            }`}
          >
            {icon}
            <span>{label}</span>
          </button>
        ))}
      </div>

      {subTab === 'feed' && (
        <div className="space-y-6">
          {/* AI Recommendations Banner (if scored) */}
          {topAiMatches.length > 0 && (
            <section className="rounded-xl border border-blue-200 bg-blue-50/50 p-5 dark:border-blue-900/50 dark:bg-blue-950/20">
              <div className="flex items-center gap-2 text-sm font-semibold text-blue-900 dark:text-blue-200">
                <Sparkles className="h-4 w-4" />
                <span>Top AI Recommended {category} Roles for Your Profile</span>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
                {topAiMatches.map((job) => (
                  <JobCard
                    key={`rec-${job.jobId}`}
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
          )}

          {/* Category Search + Filters + Live AI Search Grounding */}
          <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
              <div className="relative md:col-span-6">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder={`Search inside ${category} (debounced)...`}
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>

              <div className="md:col-span-3">
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  aria-label="India city filter"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                >
                  {INDIA_CITIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3">
                <select
                  value={selectedWorkMode}
                  onChange={(e) => setSelectedWorkMode(e.target.value as WorkMode | 'All')}
                  aria-label="Work mode filter"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                >
                  <option value="All">All Work Modes</option>
                  <option value="Remote">Remote</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="On-site">On-site</option>
                </select>
              </div>
            </div>

            {/* 4 Transparent Buckets */}
            <div className="flex flex-wrap items-center gap-1.5">
              {FEED_BUCKETS.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setSelectedBucket(b)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    selectedBucket === b
                      ? 'bg-[#0B192C] text-white dark:bg-blue-600'
                      : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {b === 'All' ? 'All Feed Buckets' : b}
                </button>
              ))}
            </div>

            {/* Category AI Discovery Bar */}
            <div className="flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:items-center dark:border-slate-800">
              <input
                type="text"
                value={discoverRole}
                onChange={(e) => setDiscoverRole(e.target.value)}
                placeholder={meta.focusPlaceholder}
                className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
              <select
                value={discoverCountry}
                onChange={(e) => setDiscoverCountry(e.target.value)}
                aria-label="Discovery country priority"
                className="sm:w-44 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                <option value="India">India (Priority 1)</option>
                <option value="Global">International + India</option>
                <option value="United Kingdom">United Kingdom</option>
                <option value="United States">United States</option>
                <option value="UAE">UAE / Dubai</option>
                <option value="Singapore">Singapore</option>
              </select>
              <button
                type="button"
                disabled={discovering}
                onClick={() => void handleCategoryDiscovery()}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-medium text-white hover:bg-blue-800 disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                {discovering ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                <span>{discovering ? 'Searching...' : `Discover ${category}`}</span>
              </button>
            </div>
          </section>

          {feedError && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{feedError}</span>
              </div>
              <button
                type="button"
                onClick={() => void loadCategoryFeeds(false)}
                className="rounded-lg border border-red-300 bg-white px-3 py-1.5 font-medium text-red-700 hover:bg-red-50 dark:border-red-800 dark:bg-slate-900 dark:text-red-300"
              >
                Retry
              </button>
            </div>
          )}

          {/* Section 1: India First (Default Priority) */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
                1. India {category} ({selectedCity})
              </h2>
              {indiaResp && (
                <span className="font-mono tabular-nums text-xs text-slate-500 dark:text-slate-400">
                  Page {indiaResp.page} of {indiaResp.totalPages} ({indiaResp.total} total)
                </span>
              )}
            </div>

            {loadingFeed && indiaJobs.length === 0 ? (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {[1, 2, 3, 4].map((n) => (
                  <div
                    key={n}
                    className="h-48 animate-pulse rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800"
                  />
                ))}
              </div>
            ) : indiaJobs.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  No India {category} openings matched this filter yet. Try switching city to "All India" or click "Discover {category}" above to fetch live Google Search Grounded openings.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {indiaJobs.map((job) => (
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

            {indiaResp && indiaResp.totalPages > 1 && (
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={indiaPage <= 1}
                  onClick={() => setIndiaPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Prev</span>
                </button>
                <button
                  type="button"
                  disabled={indiaPage >= indiaResp.totalPages}
                  onClick={() => setIndiaPage((p) => p + 1)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  <span>Next</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </section>

          {/* Section 2: International Opportunities (Separate Section with Work Auth Notice) */}
          <section className="space-y-4 border-t border-slate-200 pt-6 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Globe2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
                  2. International {category} (Work Authorization & Sponsorship Shown)
                </h2>
              </div>
              {intlResp && (
                <span className="font-mono tabular-nums text-xs text-slate-500 dark:text-slate-400">
                  Page {intlResp.page} of {intlResp.totalPages} ({intlResp.total} total)
                </span>
              )}
            </div>

            {intlJobs.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                No international {category} roles match your current filter.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {intlJobs.map((job) => (
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

            {intlResp && intlResp.totalPages > 1 && (
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={intlPage <= 1}
                  onClick={() => setIntlPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Prev</span>
                </button>
                <button
                  type="button"
                  disabled={intlPage >= intlResp.totalPages}
                  onClick={() => setIntlPage((p) => p + 1)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  <span>Next</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </section>
        </div>
      )}

      {subTab === 'saved' && (
        <SavedAndTrackerView
          mode="saved"
          savedJobs={savedJobs}
          applications={applications}
          jobs={firestoreCatJobs}
          filterCategory={category}
          onOpenJobById={(jobId, fallback, tab) => {
            const found = [...indiaJobs, ...intlJobs, ...firestoreCatJobs].find(
              (j) => j.jobId === jobId
            );
            if (found) {
              onSelectJob(found, tab || 'assistant');
            } else {
              onSelectJob(
                {
                  jobId,
                  title: fallback.title,
                  company: fallback.company,
                  region: 'India',
                  country: 'India',
                  workMode: 'Unspecified',
                  experienceRequired: '0-1 Years',
                  isFresherFriendly: true,
                  experienceTier: '0-1 Years',
                  experienceCheck: 'Confirmed 0-1 Yr',
                  mbaEligible: true,
                  qualificationCheck: 'Confirmed MBA Eligible',
                  feedBucket: 'Verified MBA Fresher Jobs',
                  category,
                  originalJobUrl: fallback.applyUrl,
                  applyUrl: fallback.applyUrl,
                  verificationStatus: 'Partially Verified',
                  visibility: 'public',
                  createdBy: 'system',
                },
                tab || 'assistant'
              );
            }
          }}
          onRemoveSaved={onRemoveSaved}
          onUpdateApplication={onUpdateApplication}
        />
      )}

      {subTab === 'applications' && (
        <SavedAndTrackerView
          mode="applications"
          savedJobs={savedJobs}
          applications={applications}
          jobs={firestoreCatJobs}
          filterCategory={category}
          onOpenJobById={(jobId, fallback, tab) => {
            const found = [...indiaJobs, ...intlJobs, ...firestoreCatJobs].find(
              (j) => j.jobId === jobId
            );
            if (found) {
              onSelectJob(found, tab || 'assistant');
            } else {
              onSelectJob(
                {
                  jobId,
                  title: fallback.title,
                  company: fallback.company,
                  region: 'India',
                  country: 'India',
                  workMode: 'Unspecified',
                  experienceRequired: '0-1 Years',
                  isFresherFriendly: true,
                  experienceTier: '0-1 Years',
                  experienceCheck: 'Confirmed 0-1 Yr',
                  mbaEligible: true,
                  qualificationCheck: 'Confirmed MBA Eligible',
                  feedBucket: 'Verified MBA Fresher Jobs',
                  category,
                  originalJobUrl: fallback.applyUrl,
                  applyUrl: fallback.applyUrl,
                  verificationStatus: 'Verified',
                  visibility: 'public',
                  createdBy: 'system',
                },
                tab || 'assistant'
              );
            }
          }}
          onRemoveSaved={onRemoveSaved}
          onUpdateApplication={onUpdateApplication}
        />
      )}

      {subTab === 'notifications' && (
        <div className="space-y-3">
          {categoryNotifs.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              No notifications yet for {category}. Click "AI Match Scores" to generate alerts for ≥70% matches.
            </div>
          ) : (
            categoryNotifs.map((n) => (
              <article
                key={n.id || n.jobId}
                className={`rounded-xl border p-4 ${
                  n.read
                    ? 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                    : 'border-blue-300 bg-blue-50/40 dark:border-blue-800 dark:bg-blue-950/20'
                }`}
              >
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>
                    {n.verificationStatus} · {n.experienceRequired}
                  </span>
                  <span className="font-mono font-semibold text-blue-700 dark:text-blue-400">
                    {n.matchScore}% Match
                  </span>
                </div>
                <p className="mt-1 font-display text-sm font-semibold text-slate-900 dark:text-white">
                  {n.title}
                </p>
                <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                  {n.jobTitle} · {n.company} · {n.location || 'India'}
                </p>
                {!n.read && n.id && (
                  <button
                    type="button"
                    onClick={() => void onMarkNotifRead(n.id!)}
                    className="mt-2 text-xs font-medium text-blue-700 hover:underline dark:text-blue-400"
                  >
                    Mark Read
                  </button>
                )}
              </article>
            ))
          )}
        </div>
      )}
    </div>
  );
};
