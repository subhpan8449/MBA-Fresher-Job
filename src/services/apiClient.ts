import { auth } from '../firebase';
import type {
  ApplicationAssistantOutput,
  CandidateProfile,
  FeedBucket,
  JobCategory,
  JobListing,
  JobMatchResult,
  JobRegion,
  PaginatedJobsResponse,
  ResumeAnalysisOutput,
  VerificationStatus,
  WorkMode,
} from '../types';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Please sign in with Google to use AI Intelligence features.');
  }
  const token = await user.getIdToken();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  retries = 2,
  delayMs = 500
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const resp = await fetch(input, init);
      if (resp.status >= 500 && attempt < retries) {
        await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
        continue;
      }
      return resp;
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Network request failed');
}

async function handleApiResponse<T>(resp: Response): Promise<T> {
  const data = (await resp.json().catch(() => ({}))) as { error?: string } & T;
  if (!resp.ok) {
    throw new Error(data.error || `Request failed (${resp.status})`);
  }
  return data;
}

export interface LiveJobsQueryParams {
  page?: number;
  limit?: number;
  category?: JobCategory | 'All';
  region?: JobRegion | 'All';
  city?: string;
  bucket?: FeedBucket | 'All';
  workMode?: WorkMode | 'All';
  q?: string;
  refresh?: boolean;
}

export async function fetchLivePublicJobs(
  params: LiveJobsQueryParams | boolean = {}
): Promise<PaginatedJobsResponse> {
  const opts: LiveJobsQueryParams =
    typeof params === 'boolean' ? { refresh: params, limit: 12, page: 1 } : params;

  const qs = new URLSearchParams();
  if (opts.page) qs.set('page', String(opts.page));
  if (opts.limit) qs.set('limit', String(opts.limit));
  if (opts.category && opts.category !== 'All') qs.set('category', opts.category);
  if (opts.region && opts.region !== 'All') qs.set('region', opts.region);
  if (opts.city && opts.city !== 'All India') qs.set('city', opts.city);
  if (opts.bucket && opts.bucket !== 'All') qs.set('bucket', opts.bucket);
  if (opts.workMode && opts.workMode !== 'All') qs.set('workMode', opts.workMode);
  if (opts.q && opts.q.trim()) qs.set('q', opts.q.trim());
  if (opts.refresh) qs.set('refresh', 'true');

  const queryStr = qs.toString();
  const resp = await fetchWithRetry(`/api/jobs/live${queryStr ? `?${queryStr}` : ''}`);
  return handleApiResponse<PaginatedJobsResponse>(resp);
}

export async function discoverJobsViaAi(params: {
  category: JobCategory | 'All';
  country: string;
  city?: string;
  roleQuery?: string;
}): Promise<{
  jobs: JobListing[];
  groundingSources: Array<{ title: string; url: string }>;
}> {
  const headers = await getAuthHeaders();
  const resp = await fetchWithRetry('/api/ai/discover-jobs', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });
  return handleApiResponse(resp);
}

export async function verifyJobViaAi(job: Partial<JobListing>): Promise<{
  verificationStatus: VerificationStatus;
  httpStatus: number;
  isFresherFriendly: boolean;
  mbaEligible: boolean;
  qualificationCheck: JobListing['qualificationCheck'];
  experienceCheck: JobListing['experienceCheck'];
  experienceTier: JobListing['experienceTier'];
  feedBucket: JobListing['feedBucket'];
  scamWarning: string;
  auditNotes: string;
  finalUrl: string;
}> {
  const headers = await getAuthHeaders();
  const resp = await fetchWithRetry('/api/ai/verify-job', {
    method: 'POST',
    headers,
    body: JSON.stringify({ job }),
  });
  return handleApiResponse(resp);
}

export async function extractJobFromScreenshotViaAi(params: {
  base64Data: string;
  mimeType: string;
}): Promise<{ job: JobListing; unverifiedNotes: string }> {
  const headers = await getAuthHeaders();
  const resp = await fetchWithRetry('/api/ai/ocr-job', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });
  return handleApiResponse(resp);
}

export async function analyzeResumeViaAi(params: {
  resumeText?: string;
  fileBase64?: string;
  fileMimeType?: string;
  targetSpecialization?: string;
}): Promise<ResumeAnalysisOutput> {
  const headers = await getAuthHeaders();
  const resp = await fetchWithRetry('/api/ai/analyze-resume', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });
  return handleApiResponse(resp);
}

export async function matchJobsViaAi(
  profile: Partial<CandidateProfile>,
  jobs: JobListing[]
): Promise<{ matches: JobMatchResult[] }> {
  const headers = await getAuthHeaders();
  const resp = await fetchWithRetry('/api/ai/match-jobs', {
    method: 'POST',
    headers,
    body: JSON.stringify({ profile, jobs }),
  });
  return handleApiResponse(resp);
}

export async function getApplicationAssistantViaAi(
  job: JobListing,
  profile: Partial<CandidateProfile>
): Promise<ApplicationAssistantOutput> {
  const headers = await getAuthHeaders();
  const resp = await fetchWithRetry('/api/ai/application-assistant', {
    method: 'POST',
    headers,
    body: JSON.stringify({ job, profile }),
  });
  return handleApiResponse(resp);
}

export async function fetchSystemTelemetry(): Promise<{
  providers: Array<{ id: string; name: string; models: string[]; configured: boolean; active: boolean }>;
  usage: { requestsToday: number; estimatedSpendUsd: number; dailyCapUsd: number; lastResetDate: string };
}> {
  const headers = await getAuthHeaders();
  const resp = await fetchWithRetry('/api/system/providers', { headers });
  return handleApiResponse(resp);
}

export async function updateServerSpendCap(dailyCapUsd: number): Promise<unknown> {
  const headers = await getAuthHeaders();
  const resp = await fetchWithRetry('/api/system/spend-cap', {
    method: 'POST',
    headers,
    body: JSON.stringify({ dailyCapUsd }),
  });
  return handleApiResponse(resp);
}

export async function runAutonomousDiscoveryCycle(): Promise<{
  discoveredCount: number;
  jobs: JobListing[];
  groundingSources: Array<{ title: string; url: string }>;
  telemetry: unknown;
}> {
  const headers = await getAuthHeaders();
  const resp = await fetchWithRetry('/api/ai/autonomous-cycle', {
    method: 'POST',
    headers,
    body: JSON.stringify({}),
  });
  return handleApiResponse(resp);
}
