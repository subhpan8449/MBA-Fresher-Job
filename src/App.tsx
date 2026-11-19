import React, { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ImageUp,
  Loader2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { auth, googleProvider, OWNER_EMAIL } from './firebase';
import { useDebounce } from './hooks/useDebounce';
import {
  discoverJobsViaAi,
  fetchJobsSummary,
  fetchLivePublicJobs,
  matchJobsViaAi,
  type JobsSummaryResponse,
} from './services/apiClient';
import {
  bootstrapOwnerControls,
  createPersonalizedNotification,
  deleteAllCandidateData,
  deleteJobFromFirestore,
  ensureCandidateProfile,
  logAiActivity,
  markNotificationRead,
  saveAiRecommendations,
  saveDiscoveredJobsToFirestore,
  subscribeAiRecommendations,
  subscribeApplications,
  subscribeCandidateProfile,
  subscribeNotifications,
  subscribeOwnerCollections,
  subscribePublicJobs,
  subscribeSavedJobs,
  syncUserOnSignIn,
  toggleDataSource,
  toggleSaveJob,
  updateApprovalRequestStatus,
  updateCandidateProfile,
  updateJobVerificationInFirestore,
  updatePlatformSettings,
  upsertApplication,
  type ApplicationProcessUpdates,
} from './services/firestoreService';
import {
  DISCOVERY_PORTALS,
  type AiActivityLog,
  type AiRecommendation,
  type ApplicationStatus,
  type AppPage,
  type ApprovalRequest,
  type CandidateNotification,
  type CandidateProfile,
  type DataSourceConfig,
  type DiscoveryPortal,
  type JobApplication,
  type JobCategory,
  type JobListing,
  type PaginatedJobsResponse,
  type PlatformSetting,
  type SavedJob,
} from './types';
import { GoogleAuthGate } from './components/GoogleAuthGate';
import { JobCard } from './components/JobCard';
import { DEFAULT_FILTERS, JobFilters, type JobFilterState } from './components/JobFilters';
import { OfflineIndicator } from './components/PWAInstallButton';
import { WorkspaceShell } from './components/WorkspaceShell';

// Lazy-loaded heavy workspace modules for smooth performance
const CandidateDashboard = lazy(() =>
  import('./components/CandidateDashboard').then((m) => ({ default: m.CandidateDashboard }))
);
const CategoryHubView = lazy(() =>
  import('./components/CategoryHubView').then((m) => ({ default: m.CategoryHubView }))
);
const JobDetailAndAssistant = lazy(() =>
  import('./components/JobDetailAndAssistant').then((m) => ({ default: m.JobDetailAndAssistant }))
);
const ResumeAnalyzerView = lazy(() =>
  import('./components/ResumeAnalyzerView').then((m) => ({ default: m.ResumeAnalyzerView }))
);
const SavedAndTrackerView = lazy(() =>
  import('./components/SavedAndTrackerView').then((m) => ({ default: m.SavedAndTrackerView }))
);
const NotificationsView = lazy(() =>
  import('./components/NotificationsView').then((m) => ({ default: m.NotificationsView }))
);
const CandidateProfileView = lazy(() =>
  import('./components/CandidateProfileView').then((m) => ({ default: m.CandidateProfileView }))
);
const OwnerControlCenter = lazy(() =>
  import('./components/OwnerControlCenter').then((m) => ({ default: m.OwnerControlCenter }))
);
const ScreenshotOcrModal = lazy(() =>
  import('./components/ScreenshotOcrModal').then((m) => ({ default: m.ScreenshotOcrModal }))
);
const PrivacyModal = lazy(() =>
  import('./components/PrivacyModal').then((m) => ({ default: m.PrivacyModal }))
);

const PageSkeleton = () => (
  <div className="space-y-4">
    <div className="h-10 w-64 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="h-44 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
      <div className="h-44 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
    </div>
  </div>
);

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState('');
  const [currentPage, setCurrentPage] = useState<AppPage>('dashboard');
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('mba_blessing_theme') === 'dark';
  });

  // Paginated & Live ATS State
  const [liveAtsPageResp, setLiveAtsPageResp] = useState<PaginatedJobsResponse | null>(null);
  const [summaryResp, setSummaryResp] = useState<JobsSummaryResponse | null>(null);
  const [bootShowcaseJobs, setBootShowcaseJobs] = useState<JobListing[]>([]);
  const [discoveredSessionJobs, setDiscoveredSessionJobs] = useState<JobListing[]>([]);
  const [firestoreJobs, setFirestoreJobs] = useState<JobListing[]>([]);
  const [loadingLiveJobs, setLoadingLiveJobs] = useState(true);
  const [liveJobsError, setLiveJobsError] = useState('');
  const [discoveringAi, setDiscoveringAi] = useState(false);
  const [matchingLoading, setMatchingLoading] = useState(false);

  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [notifications, setNotifications] = useState<CandidateNotification[]>([]);
  const [recommendations, setRecommendations] = useState<AiRecommendation[]>([]);

  // Owner State
  const [allCandidates, setAllCandidates] = useState<CandidateProfile[]>([]);
  const [dataSources, setDataSources] = useState<DataSourceConfig[]>([]);
  const [aiLogs, setAiLogs] = useState<AiActivityLog[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [platformSettings, setPlatformSettings] = useState<PlatformSetting | null>(null);

  // UI, Pagination & Filter State
  const [filters, setFilters] = useState<JobFilterState>(DEFAULT_FILTERS);
  const debouncedSearch = useDebounce(filters.search, 300);
  const [jobsPage, setJobsPage] = useState(1);

  const [selectedJob, setSelectedJob] = useState<JobListing | null>(null);
  const [detailTab, setDetailTab] = useState<'details' | 'assistant'>('details');
  const [discoveryCountry, setDiscoveryCountry] = useState('India');
  const [discoveryRole, setDiscoveryRole] = useState('');
  const [selectedPortals, setSelectedPortals] = useState<DiscoveryPortal[]>([...DISCOVERY_PORTALS]);
  const [toastMsg, setToastMsg] = useState('');
  const [ocrOpen, setOcrOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);

  const toggleDiscoveryPortal = (portal: DiscoveryPortal) => {
    setSelectedPortals((prev) =>
      prev.includes(portal)
        ? prev.length > 1
          ? prev.filter((p) => p !== portal)
          : prev
        : [...prev, portal]
    );
  };

  const isOwner = Boolean(user?.email === OWNER_EMAIL && user?.emailVerified);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4200);
  };

  // Theme Sync
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('mba_blessing_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('mba_blessing_theme', 'light');
    }
  }, [isDark]);

  // Initial India-first showcase + platform summary fetch once authenticated
  useEffect(() => {
    if (!user) return;
    fetchLivePublicJobs({ page: 1, limit: 30 })
      .then((res) => setBootShowcaseJobs(res.jobs || []))
      .catch(() => {});
    fetchJobsSummary()
      .then((sum) => setSummaryResp(sum))
      .catch(() => {});
  }, [user]);

  // Reset pagination when global feed filters change
  useEffect(() => {
    setJobsPage(1);
  }, [
    filters.category,
    filters.region,
    filters.city,
    filters.bucket,
    filters.workMode,
    debouncedSearch,
  ]);

  // Server-Side Paginated Fetch for "All India & Global Feed"
  const loadPaginatedJobs = useCallback(
    async (refresh = false) => {
      setLoadingLiveJobs(true);
      setLiveJobsError('');
      try {
        const res = await fetchLivePublicJobs({
          page: jobsPage,
          limit: 10,
          category: filters.category,
          region: filters.region,
          city: filters.region === 'India' ? filters.city : undefined,
          bucket: filters.bucket,
          workMode: filters.workMode,
          q: debouncedSearch,
          refresh,
        });
        setLiveAtsPageResp(res);
      } catch (err) {
        setLiveJobsError(
          err instanceof Error ? err.message : 'Unable to connect to live job feed.'
        );
      } finally {
        setLoadingLiveJobs(false);
      }
    },
    [
      jobsPage,
      filters.category,
      filters.region,
      filters.city,
      filters.bucket,
      filters.workMode,
      debouncedSearch,
    ]
  );

  useEffect(() => {
    if (!user) return;
    void loadPaginatedJobs(false);
  }, [user, loadPaginatedJobs]);

  // Subscribe to Public Firestore Jobs (bounded) once signed in
  useEffect(() => {
    if (!user) return;
    const unsub = subscribePublicJobs((items) => {
      setFirestoreJobs(items);
    });
    return () => unsub();
  }, [user]);

  // Firebase Auth Lifecycle
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setAuthReady(true);
      if (firebaseUser && firebaseUser.email) {
        try {
          await syncUserOnSignIn({
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName || 'MBA Candidate',
            email: firebaseUser.email,
            photoURL: firebaseUser.photoURL || undefined,
          });
          await ensureCandidateProfile({
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || 'MBA Candidate',
            email: firebaseUser.email,
          });
          if (firebaseUser.email === OWNER_EMAIL && firebaseUser.emailVerified) {
            await bootstrapOwnerControls(firebaseUser.uid);
          }
        } catch (err) {
          console.error('Profile sync warning:', err);
        }
      }
    });
    return () => unsub();
  }, []);

  // Authenticated User Subscriptions
  useEffect(() => {
    if (!authReady || !user) {
      setProfile(null);
      setSavedJobs([]);
      setApplications([]);
      setNotifications([]);
      setRecommendations([]);
      return;
    }

    const unsubs = [
      subscribeCandidateProfile(user.uid, setProfile),
      subscribeSavedJobs(user.uid, setSavedJobs),
      subscribeApplications(user.uid, setApplications),
      subscribeNotifications(user.uid, setNotifications),
      subscribeAiRecommendations(user.uid, setRecommendations),
    ];

    if (user.email === OWNER_EMAIL && user.emailVerified) {
      unsubs.push(
        ...subscribeOwnerCollections({
          onCandidates: setAllCandidates,
          onDataSources: setDataSources,
          onLogs: setAiLogs,
          onApprovals: setApprovals,
          onSettings: setPlatformSettings,
        })
      );
    }

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [authReady, user]);

  // Combined pool for Dashboard / Showcase / Fallback lookups (India first, Finance priority)
  const mergedOverviewJobs = useMemo(() => {
    const map = new Map<string, JobListing>();
    for (const j of liveAtsPageResp?.jobs || []) {
      map.set(j.duplicateKey || j.jobId, j);
    }
    for (const j of bootShowcaseJobs) {
      map.set(j.duplicateKey || j.jobId, j);
    }
    for (const j of discoveredSessionJobs) {
      map.set(j.duplicateKey || j.jobId, j);
    }
    for (const j of firestoreJobs) {
      map.set(j.duplicateKey || j.jobId, j);
    }
    const list = Array.from(map.values()).filter((j) => j.experienceCheck !== 'Exceeds 1 Yr');
    list.sort((a, b) => {
      if (a.region === 'India' && b.region !== 'India') return -1;
      if (b.region === 'India' && a.region !== 'India') return 1;
      if (a.category === 'Finance Jobs' && b.category !== 'Finance Jobs') return -1;
      if (b.category === 'Finance Jobs' && a.category !== 'Finance Jobs') return 1;
      return (b.postedDate || '').localeCompare(a.postedDate || '');
    });
    return list;
  }, [liveAtsPageResp, bootShowcaseJobs, discoveredSessionJobs, firestoreJobs]);

  const recMap = useMemo(
    () => new Map(recommendations.map((r) => [r.jobId, r])),
    [recommendations]
  );

  // Merge current server-paginated page + matching session/Firestore jobs for page 1
  const currentFeedJobs = useMemo(() => {
    const map = new Map<string, JobListing>();
    for (const j of liveAtsPageResp?.jobs || []) {
      map.set(j.duplicateKey || j.jobId, j);
    }
    if (jobsPage === 1) {
      for (const j of [...discoveredSessionJobs, ...firestoreJobs]) {
        if (j.experienceCheck === 'Exceeds 1 Yr') continue;
        if (filters.category !== 'All' && j.category !== filters.category) continue;
        if (filters.region !== 'All' && j.region !== filters.region) continue;
        if (filters.bucket !== 'All' && j.feedBucket !== filters.bucket) continue;
        if (filters.workMode !== 'All' && j.workMode !== filters.workMode) continue;
        map.set(j.duplicateKey || j.jobId, j);
      }
    }

    return Array.from(map.values()).filter((job) => {
      if (filters.verificationStatus !== 'All' && job.verificationStatus !== filters.verificationStatus) {
        return false;
      }
      if (filters.experience === 'Confirmed 0-1 Yr Only' && job.experienceCheck !== 'Confirmed 0-1 Yr') {
        return false;
      }
      if (filters.experience === '0 Years / Fresher' && job.experienceTier !== '0 Years / Fresher') {
        return false;
      }
      if (filters.experience === 'MBA Graduate Trainee' && job.experienceTier !== 'MBA Graduate Trainee') {
        return false;
      }
      if (filters.region === 'International' && filters.country.trim()) {
        const cQ = filters.country.trim().toLowerCase();
        if (!job.country.toLowerCase().includes(cQ)) return false;
      }
      if (filters.company.trim()) {
        if (!job.company.toLowerCase().includes(filters.company.trim().toLowerCase())) return false;
      }
      if (filters.salaryOnly) {
        const sal = (job.salary || '').toLowerCase();
        if (!sal || sal.includes('not disclosed') || sal.includes('not specified')) return false;
      }
      if (filters.postedWindow !== 'All' && job.postedDate) {
        const postedTs = Date.parse(job.postedDate);
        if (!Number.isNaN(postedTs)) {
          const days = (Date.now() - postedTs) / (1000 * 60 * 60 * 24);
          if (filters.postedWindow === '7d' && days > 7) return false;
          if (filters.postedWindow === '30d' && days > 30) return false;
        }
      }
      if (filters.minMatchScore > 0) {
        const score = recMap.get(job.jobId)?.matchScore || 0;
        if (score < filters.minMatchScore) return false;
      }
      return true;
    });
  }, [liveAtsPageResp, discoveredSessionJobs, firestoreJobs, jobsPage, filters, recMap]);

  const handleSignIn = async () => {
    setSigningIn(true);
    setAuthError('');
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      if (cred.user) {
        showToast(`Welcome, ${cred.user.displayName || cred.user.email}`);
        setCurrentPage('dashboard');
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Google sign-in popup was closed. Please allow popups and try again.';
      setAuthError(msg);
      showToast(msg);
    } finally {
      setSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setCurrentPage('dashboard');
    setDiscoveredSessionJobs([]);
    showToast('Signed out.');
  };

  const handleNavigate = (page: AppPage, category?: JobCategory | 'All') => {
    setCurrentPage(page);
    if (category) {
      setFilters((f) => ({ ...f, category }));
    } else if (page === 'finance') {
      setFilters((f) => ({ ...f, category: 'Finance Jobs' }));
    } else if (page === 'sap-fico') {
      setFilters((f) => ({ ...f, category: 'SAP FICO Jobs' }));
    } else if (page === 'analytics') {
      setFilters((f) => ({ ...f, category: 'Business Analytics Jobs' }));
    } else if (page === 'marketing') {
      setFilters((f) => ({ ...f, category: 'Marketing Jobs' }));
    } else if (page === 'jobs') {
      setFilters((f) => ({ ...f, category: 'All' }));
    }
  };

  const handleSelectJob = (job: JobListing, tab: 'details' | 'assistant' = 'details') => {
    setSelectedJob(job);
    setDetailTab(tab);
    setCurrentPage(tab === 'assistant' ? 'assistant' : 'job-detail');
  };

  const handleToggleSave = async (job: JobListing) => {
    if (!user) {
      await handleSignIn();
      return;
    }
    const existing = savedJobs.find((s) => s.jobId === job.jobId);
    await toggleSaveJob(user.uid, job, existing?.id);
    showToast(existing ? 'Removed from Saved Jobs.' : `Saved ${job.title}`);
  };

  const handleApplyClick = async (job: JobListing) => {
    if (!user) return;
    const existing = applications.find((a) => a.jobId === job.jobId);
    if (!existing) {
      await upsertApplication(user.uid, job, 'Preparing', 'Opened official application portal');
    }
  };

  const handleAiDiscovery = async (overrideParams?: {
    category?: JobCategory | 'All';
    country?: string;
    city?: string;
    roleQuery?: string;
    portals?: DiscoveryPortal[];
  }) => {
    if (!user) {
      await handleSignIn();
      return;
    }
    setDiscoveringAi(true);
    try {
      const targetPortals = overrideParams?.portals || selectedPortals;
      const targetCategory = overrideParams?.category ?? filters.category;
      const targetCountry = overrideParams?.country ?? discoveryCountry;
      const res = await discoverJobsViaAi({
        category: targetCategory,
        country: targetCountry,
        city: overrideParams?.city ?? filters.city,
        roleQuery: overrideParams?.roleQuery ?? (discoveryRole || debouncedSearch),
        portals: targetPortals,
      });

      if (res.jobs.length > 0) {
        setDiscoveredSessionJobs((prev) => {
          const map = new Map<string, JobListing>();
          for (const j of [...res.jobs, ...prev]) {
            map.set(j.duplicateKey || j.jobId, j);
          }
          return Array.from(map.values());
        });
      }

      const savedCount = await saveDiscoveredJobsToFirestore(res.jobs, user.uid, isOwner);
      await logAiActivity({
        agentName: 'Job Discovery Agent',
        action: `Discovered ${targetCategory} jobs in ${targetCountry} (${targetPortals.length} apps)`,
        status: 'Completed',
        summary: `Found ${res.jobs.length} real listings (${savedCount} newly synced to Firestore).`,
        modelUsed: 'gemini-4-hydrogen',
        actorUid: user.uid,
      }).catch(() => {});

      // Refresh server summary counters
      fetchJobsSummary()
        .then((sum) => setSummaryResp(sum))
        .catch(() => {});

      showToast(
        res.warning
          ? `Found ${res.jobs.length} live opportunities (${savedCount} new synced). ${res.warning}`
          : `Found ${res.jobs.length} live opportunities across ${targetPortals.length} apps + ATS (${savedCount} new synced).`
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Discovery failed');
    } finally {
      setDiscoveringAi(false);
    }
  };

  const handleDiscoverEverywhere = async () => {
    await handleAiDiscovery({
      category: 'All',
      country: 'India',
      city: 'All India',
      roleQuery: 'MBA fresher Financial Analyst FP&A SAP FICO Business Analyst Marketing India',
      portals: [...DISCOVERY_PORTALS],
    });
  };

  const handleRunMatching = async () => {
    if (!user || !profile) {
      await handleSignIn();
      return;
    }
    setMatchingLoading(true);
    try {
      const verifiedTargets = mergedOverviewJobs.filter(
        (j) => j.mbaEligible && j.experienceCheck !== 'Exceeds 1 Yr' && j.verificationStatus !== 'Expired'
      );
      const broaderTargets = mergedOverviewJobs.filter(
        (j) => j.experienceCheck !== 'Exceeds 1 Yr' && j.verificationStatus !== 'Expired'
      );
      const targets = (verifiedTargets.length >= 6 ? verifiedTargets : broaderTargets).slice(0, 18);
      if (targets.length === 0) {
        showToast('No active jobs loaded yet. Click "Find Jobs Everywhere (16+ Apps)" first.');
        return;
      }
      const res = await matchJobsViaAi(profile, targets);
      await saveAiRecommendations(user.uid, res.matches);

      let alertCount = 0;
      for (const m of res.matches) {
        if (m.matchScore >= 70) {
          const job = targets.find((t) => t.jobId === m.jobId);
          if (job) {
            await createPersonalizedNotification({
              uid: user.uid,
              job,
              matchScore: m.matchScore,
              title: `New ${job.category} opportunity (${job.region})! Your profile matches ${Math.round(m.matchScore)}%.`,
              channel: profile.notifyPush ? 'push' : 'in_app',
            });
            alertCount += 1;
          }
        }
      }

      await logAiActivity({
        agentName: 'Candidate Matching Agent',
        action: 'Scored candidate profile against active MBA fresher jobs',
        status: 'Completed',
        summary: `Evaluated ${targets.length} roles; created ${alertCount} high-match notifications.`,
        modelUsed: 'gemini-4-hydrogen',
        actorUid: user.uid,
      });
      showToast(`Evaluated ${targets.length} jobs and updated your personalized match scores.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Matching failed');
    } finally {
      setMatchingLoading(false);
    }
  };

  const buildFallbackJob = (
    jobId: string,
    fallback: { title: string; company: string; applyUrl: string },
    category: JobCategory = 'Finance Jobs'
  ): JobListing => ({
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
    feedBucket: 'Partially Verified Jobs',
    category,
    originalJobUrl: fallback.applyUrl,
    applyUrl: fallback.applyUrl,
    verificationStatus: 'Partially Verified',
    visibility: 'public',
    createdBy: user?.uid || 'system',
  });

  // Smooth Session Boot Screen while checking Firebase Auth state
  if (!authReady) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#06101F] px-6 text-white">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-sky-400" />
          <span className="font-display text-sm font-semibold tracking-wide">
            Initializing MBA Fresher Blessing AI...
          </span>
        </div>
      </div>
    );
  }

  // COMPULSORY GOOGLE LOGIN GATE — Unauthenticated users must sign in with Google before accessing workspace
  if (!user) {
    return (
      <MotionConfig reducedMotion="user">
        <GoogleAuthGate
          isDark={isDark}
          signingIn={signingIn}
          authError={authError}
          onToggleTheme={() => setIsDark((d) => !d)}
          onSignIn={handleSignIn}
          onOpenPrivacy={() => setPrivacyOpen(true)}
        />
        <Suspense fallback={null}>
          {privacyOpen && (
            <PrivacyModal
              isOpen={privacyOpen}
              onClose={() => setPrivacyOpen(false)}
              isSignedIn={false}
            />
          )}
        </Suspense>
        <OfflineIndicator />
      </MotionConfig>
    );
  }

  const savedSet = new Set(savedJobs.map((s) => s.jobId));
  const appMap = new Map(applications.map((a) => [a.jobId, a.status]));
  const unreadNotifs = notifications.filter((n) => !n.read).length;

  const activeCategoryHub: JobCategory | null =
    currentPage === 'finance'
      ? 'Finance Jobs'
      : currentPage === 'sap-fico'
        ? 'SAP FICO Jobs'
        : currentPage === 'analytics'
          ? 'Business Analytics Jobs'
          : currentPage === 'marketing'
            ? 'Marketing Jobs'
            : null;

  const effectivePage: AppPage =
    currentPage === 'landing' || currentPage === 'login' || currentPage === 'register'
      ? 'dashboard'
      : currentPage;

  return (
    <MotionConfig reducedMotion="user">
      <WorkspaceShell
        currentPage={effectivePage}
        userEmail={user.email || ''}
        userName={user.displayName || 'MBA Candidate'}
        isOwner={isOwner}
        isSignedIn={true}
        isDark={isDark}
        unreadNotifications={unreadNotifs}
        onToggleTheme={() => setIsDark((d) => !d)}
        onNavigate={(p) => handleNavigate(p)}
        onOpenOcr={() => setOcrOpen(true)}
        onSignIn={() => void handleSignIn()}
        onSignOut={() => void handleSignOut()}
      >
        {toastMsg && (
          <div
            role="status"
            className="mb-5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs font-medium text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300"
          >
            {toastMsg}
          </div>
        )}

        <Suspense fallback={<PageSkeleton />}>
          <AnimatePresence mode="wait">
            <motion.div
              key={effectivePage}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
            >
              {effectivePage === 'dashboard' && (
                <CandidateDashboard
                  profile={profile}
                  jobs={mergedOverviewJobs}
                  totalLiveJobsCount={summaryResp?.total ?? liveAtsPageResp?.total ?? mergedOverviewJobs.length}
                  connectedSourcesCount={
                    summaryResp?.connectedSourcesCount ??
                    liveAtsPageResp?.connectedSourcesCount ??
                    DISCOVERY_PORTALS.length + 7
                  }
                  sourceBreakdown={
                    summaryResp?.sourceBreakdown ?? liveAtsPageResp?.sourceBreakdown ?? {}
                  }
                  countsByRegion={summaryResp?.countsByRegion ?? liveAtsPageResp?.countsByRegion}
                  countsByCategory={
                    summaryResp?.countsByCategory ?? liveAtsPageResp?.countsByCategory
                  }
                  recommendations={recommendations}
                  savedJobs={savedJobs}
                  applications={applications}
                  notifications={notifications}
                  matchingLoading={matchingLoading}
                  discoveringEverywhere={discoveringAi}
                  onRunMatching={handleRunMatching}
                  onDiscoverEverywhere={handleDiscoverEverywhere}
                  onOpenOcr={() => setOcrOpen(true)}
                  onNavigate={(p) => handleNavigate(p)}
                  onSelectJob={handleSelectJob}
                  onToggleSave={(j) => void handleToggleSave(j)}
                  onApplyClick={(j) => void handleApplyClick(j)}
                />
              )}

          {activeCategoryHub && (
            <CategoryHubView
              category={activeCategoryHub}
              firestoreJobs={firestoreJobs}
              profile={profile}
              recommendations={recommendations}
              savedJobs={savedJobs}
              applications={applications}
              notifications={notifications}
              isSignedIn={Boolean(user)}
              isOwner={isOwner}
              matchingLoading={matchingLoading}
              onSignIn={() => void handleSignIn()}
              onRunMatching={handleRunMatching}
              onSelectJob={handleSelectJob}
              onToggleSave={(j) => void handleToggleSave(j)}
              onApplyClick={(j) => void handleApplyClick(j)}
              onOpenOcr={() => {
                if (!user) void handleSignIn();
                else setOcrOpen(true);
              }}
              onRemoveSaved={async (savedId) => {
                if (!user) return;
                const match = savedJobs.find((s) => s.id === savedId);
                if (match) {
                  await toggleSaveJob(
                    user.uid,
                    buildFallbackJob(
                      match.jobId,
                      { title: match.jobTitle, company: match.company, applyUrl: match.applyUrl },
                      (match.category as JobCategory) || activeCategoryHub
                    ),
                    savedId
                  );
                }
              }}
              onUpdateApplication={async (app, status, notes, extra) => {
                if (!user) return;
                await upsertApplication(
                  user.uid,
                  buildFallbackJob(
                    app.jobId,
                    { title: app.jobTitle, company: app.company, applyUrl: app.applyUrl },
                    (app.category as JobCategory) || activeCategoryHub
                  ),
                  status,
                  notes,
                  extra
                );
                showToast(`Updated ${app.jobTitle} (${status}).`);
              }}
              onMarkNotifRead={markNotificationRead}
              onSyncDiscoveredJobs={async (discovered) => {
                if (!user) return 0;
                return saveDiscoveredJobsToFirestore(discovered, user.uid, isOwner);
              }}
              onToast={showToast}
            />
          )}

          {currentPage === 'jobs' && (
            <div className="space-y-6">
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
                <div>
                  <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                    All India First & Global MBA Fresher Feed
                  </h1>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    Strict MBA + 0–1 Yr Experience filter. Server-paginated live ATS feeds & Google Search Grounding.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!user) void handleSignIn();
                      else setOcrOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    <ImageUp className="h-3.5 w-3.5" />
                    <span>Ingest: Screenshot / Post / Mail</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void loadPaginatedJobs(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${loadingLiveJobs ? 'animate-spin' : ''}`} />
                    <span>Refresh Live ATS</span>
                  </button>
                </div>
              </div>

              {/* AI Multi-Portal Search Grounding Discovery Bar */}
              <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="mr-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Search Portals ({selectedPortals.length}/{DISCOVERY_PORTALS.length}):
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedPortals([...DISCOVERY_PORTALS])}
                    className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    All 16 Apps
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedPortals([
                        'LinkedIn',
                        'Naukri',
                        'Internshala',
                        'Foundit',
                        'IIMJobs',
                        'Unstop',
                        'Shine',
                        'Apna',
                        'Freshersworld',
                      ])
                    }
                    className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    Top Indian Apps
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedPortals(['Wellfound', 'Cutshort', 'Instahyre', 'Hirist', 'Company ATS'])
                    }
                    className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    Startups &amp; ATS
                  </button>
                  {DISCOVERY_PORTALS.map((portal) => {
                    const active = selectedPortals.includes(portal);
                    return (
                      <button
                        key={portal}
                        type="button"
                        onClick={() => toggleDiscoveryPortal(portal)}
                        className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                          active
                            ? 'bg-blue-700 text-white'
                            : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                        }`}
                      >
                        {portal}
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <input
                    type="text"
                    value={discoveryRole}
                    onChange={(e) => setDiscoveryRole(e.target.value)}
                    placeholder="Role focus (e.g., FP&A Analyst, Credit Analyst, SAP FICO Trainee)..."
                    className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                  <input
                    type="text"
                    value={discoveryCountry}
                    onChange={(e) => setDiscoveryCountry(e.target.value)}
                    placeholder="Country (Default: India)..."
                    className="sm:w-52 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                  <button
                    type="button"
                    disabled={discoveringAi}
                    onClick={() => void handleAiDiscovery()}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-medium text-white hover:bg-blue-800 disabled:opacity-50 whitespace-nowrap shrink-0"
                  >
                    {discoveringAi ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    <span>{discoveringAi ? 'Searching Live Portals...' : 'Discover Live Jobs with AI'}</span>
                  </button>
                </div>
              </div>

              <JobFilters
                filters={filters}
                onChange={setFilters}
                totalMatching={liveAtsPageResp?.total ?? currentFeedJobs.length}
                countsByBucket={liveAtsPageResp?.countsByBucket}
                countsByRegion={liveAtsPageResp?.countsByRegion}
              />

              {liveJobsError && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{liveJobsError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void loadPaginatedJobs(false)}
                    className="rounded-lg border border-red-300 bg-white px-3 py-1.5 font-medium text-red-700 hover:bg-red-50 dark:border-red-800 dark:bg-slate-900 dark:text-red-300"
                  >
                    Retry
                  </button>
                </div>
              )}

              {loadingLiveJobs && currentFeedJobs.length === 0 ? (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {[1, 2, 3, 4].map((n) => (
                    <div
                      key={n}
                      className="h-48 animate-pulse rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800"
                    />
                  ))}
                </div>
              ) : currentFeedJobs.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    No jobs match your current filter combination. Try switching region between India and International, or click "Discover Live Jobs with AI".
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {currentFeedJobs.map((job) => (
                      <JobCard
                        key={job.jobId}
                        job={job}
                        recommendation={recMap.get(job.jobId)}
                        isSaved={savedSet.has(job.jobId)}
                        applicationStatus={appMap.get(job.jobId)}
                        onSelect={(j) => handleSelectJob(j, 'details')}
                        onOpenAssistant={(j) => handleSelectJob(j, 'assistant')}
                        onToggleSave={(j) => void handleToggleSave(j)}
                        onApplyClick={(j) => void handleApplyClick(j)}
                      />
                    ))}
                  </div>

                  {liveAtsPageResp && liveAtsPageResp.totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-slate-200 pt-4 dark:border-slate-800">
                      <span className="font-mono tabular-nums text-xs text-slate-500 dark:text-slate-400">
                        Page {liveAtsPageResp.page} of {liveAtsPageResp.totalPages} ({liveAtsPageResp.total} total)
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={jobsPage <= 1}
                          onClick={() => setJobsPage((p) => Math.max(1, p - 1))}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                          <span>Previous</span>
                        </button>
                        <button
                          type="button"
                          disabled={jobsPage >= liveAtsPageResp.totalPages}
                          onClick={() => setJobsPage((p) => p + 1)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                        >
                          <span>Next</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {(currentPage === 'job-detail' || currentPage === 'assistant') && selectedJob && (
            <JobDetailAndAssistant
              job={selectedJob}
              profile={profile}
              recommendation={recMap.get(selectedJob.jobId)}
              isSaved={savedSet.has(selectedJob.jobId)}
              applicationStatus={appMap.get(selectedJob.jobId)}
              initialTab={detailTab}
              isSignedIn={Boolean(user)}
              onSignIn={() => void handleSignIn()}
              onBack={() => handleNavigate('jobs')}
              onToggleSave={(j) => void handleToggleSave(j)}
              onUpdateApplicationStatus={async (j, status) => {
                if (!user) {
                  await handleSignIn();
                  return;
                }
                await upsertApplication(user.uid, j, status);
                showToast(`Application marked as ${status}.`);
              }}
              onJobVerified={async (jobId, updates) => {
                setSelectedJob((prev) => (prev ? { ...prev, ...updates } : prev));
                if (firestoreJobs.some((fj) => fj.jobId === jobId)) {
                  await updateJobVerificationInFirestore(jobId, updates);
                }
              }}
            />
          )}

          {currentPage === 'resume' && (
            <ResumeAnalyzerView
              profile={profile}
              onApplyExtractedToProfile={async (updates) => {
                if (!user) {
                  await handleSignIn();
                  return;
                }
                await updateCandidateProfile(user.uid, updates);
              }}
            />
          )}

          {(currentPage === 'saved' || currentPage === 'applications') && (
            <SavedAndTrackerView
              mode={currentPage}
              savedJobs={savedJobs}
              applications={applications}
              jobs={mergedOverviewJobs}
              onOpenJobById={(jobId, fallback, tab) => {
                const found = mergedOverviewJobs.find((j) => j.jobId === jobId);
                if (found) {
                  handleSelectJob(found, tab || 'details');
                } else {
                  handleSelectJob(buildFallbackJob(jobId, fallback), tab || 'details');
                }
              }}
              onRemoveSaved={async (savedId) => {
                if (!user) return;
                const match = savedJobs.find((s) => s.id === savedId);
                if (match) {
                  await toggleSaveJob(
                    user.uid,
                    buildFallbackJob(
                      match.jobId,
                      { title: match.jobTitle, company: match.company, applyUrl: match.applyUrl },
                      (match.category as JobCategory) || 'Finance Jobs'
                    ),
                    savedId
                  );
                }
              }}
              onUpdateApplication={async (app, status, notes, extra) => {
                if (!user) return;
                await upsertApplication(
                  user.uid,
                  buildFallbackJob(
                    app.jobId,
                    { title: app.jobTitle, company: app.company, applyUrl: app.applyUrl },
                    (app.category as JobCategory) || 'Finance Jobs'
                  ),
                  status,
                  notes,
                  extra
                );
                showToast(`Updated ${app.jobTitle} (${status}).`);
              }}
            />
          )}

          {currentPage === 'notifications' && (
            <NotificationsView
              notifications={notifications}
              profile={profile}
              onMarkRead={markNotificationRead}
              onOpenJobById={(jobId, fallback, tab) => {
                const found = mergedOverviewJobs.find((j) => j.jobId === jobId);
                if (found) {
                  handleSelectJob(found, tab || 'assistant');
                } else {
                  handleSelectJob(buildFallbackJob(jobId, fallback), tab || 'assistant');
                }
              }}
              onUpdatePrefs={async (updates) => {
                if (user) await updateCandidateProfile(user.uid, updates);
              }}
            />
          )}

          {currentPage === 'profile' && (
            <CandidateProfileView
              profile={profile}
              onSaveProfile={async (updates) => {
                if (!user) {
                  await handleSignIn();
                  return;
                }
                await updateCandidateProfile(user.uid, updates);
              }}
              onOpenPrivacy={() => setPrivacyOpen(true)}
            />
          )}

          {(currentPage === 'owner' ||
            currentPage === 'ai-control' ||
            currentPage === 'sources' ||
            (currentPage === 'settings' && isOwner)) && (
            <OwnerControlCenter
              activeSection={currentPage as 'owner' | 'ai-control' | 'sources' | 'settings'}
              isOwner={isOwner}
              ownerUid={user?.uid || ''}
              jobs={mergedOverviewJobs}
              candidates={allCandidates}
              dataSources={dataSources}
              aiLogs={aiLogs}
              approvals={approvals}
              settings={platformSettings}
              onSyncDiscoveredJobs={async (discovered) => {
                if (user) {
                  await saveDiscoveredJobsToFirestore(discovered, user.uid, isOwner);
                }
              }}
              onLogAiAction={logAiActivity}
              onUpdateApproval={async (requestId, status) => {
                if (user) {
                  await updateApprovalRequestStatus(requestId, status, user.uid);
                }
              }}
              onToggleSource={async (sourceId, enabled) => {
                if (user) {
                  await toggleDataSource(sourceId, enabled, user.uid);
                }
              }}
              onUpdateSettings={async (updates) => {
                if (user) {
                  await updatePlatformSettings(updates, user.uid);
                }
              }}
              onVerifyOrFlagJob={async (jobId, status) => {
                await updateJobVerificationInFirestore(jobId, {
                  verificationStatus: status,
                  lastVerifiedDate: new Date().toISOString().slice(0, 10),
                });
              }}
              onDeleteJob={deleteJobFromFirestore}
            />
          )}

          {currentPage === 'settings' && !isOwner && (
            <div className="space-y-6">
              <div>
                <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                  Platform & Account Settings
                </h1>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Manage appearance, notification channels, and privacy controls.
                </p>
              </div>
              <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Color Theme
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Switch between crisp Light mode and Deep Navy Dark mode.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsDark((d) => !d)}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-800 dark:border-slate-700 dark:text-slate-200"
                  >
                    {isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                  </button>
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Privacy & Data Deletion
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Review data governance terms or permanently erase your stored profile.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPrivacyOpen(true)}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-800 dark:border-slate-700 dark:text-slate-200"
                  >
                    Open Privacy Controls
                  </button>
                </div>
              </section>
            </div>
          )}
            </motion.div>
          </AnimatePresence>
        </Suspense>
      </WorkspaceShell>

      <Suspense fallback={null}>
        {ocrOpen && (
          <ScreenshotOcrModal
            isOpen={ocrOpen}
            onClose={() => setOcrOpen(false)}
            onJobExtracted={async (job, notes) => {
              if (!user) return;
              setDiscoveredSessionJobs((prev) => [job, ...prev]);
              await saveDiscoveredJobsToFirestore([job], user.uid, isOwner);
              await logAiActivity({
                agentName: 'Job Verification Agent',
                action: 'OCR Job Screenshot Extraction',
                status: 'Completed',
                summary: `${job.title} at ${job.company}. ${notes}`,
                modelUsed: 'gemini-4-hydrogen',
                actorUid: user.uid,
              }).catch(() => {});
              showToast(`Extracted and saved "${job.title}" (${job.verificationStatus}).`);
            }}
            onJobsExtracted={async (jobs, summary, sourceLabel) => {
              if (!user || jobs.length === 0) return;
              setDiscoveredSessionJobs((prev) => [...jobs, ...prev]);
              const saved = await saveDiscoveredJobsToFirestore(jobs, user.uid, isOwner);
              await logAiActivity({
                agentName: 'Job Verification Agent',
                action: `Ingested ${sourceLabel}`,
                status: 'Completed',
                summary: `Saved ${saved} job(s). ${summary}`.slice(0, 950),
                modelUsed: 'gemini-4-hydrogen',
                actorUid: user.uid,
              }).catch(() => {});
              showToast(`Extracted and saved ${jobs.length} real job(s) from ${sourceLabel}.`);
            }}
          />
        )}

        {privacyOpen && (
          <PrivacyModal
            isOpen={privacyOpen}
            onClose={() => setPrivacyOpen(false)}
            isSignedIn={Boolean(user)}
            onDeleteAccountData={
              user
                ? async () => {
                    await deleteAllCandidateData(user.uid);
                    await handleSignOut();
                    showToast('All your candidate records have been permanently deleted.');
                  }
                : undefined
            }
          />
        )}
      </Suspense>

      <OfflineIndicator />
    </MotionConfig>
  );
}
