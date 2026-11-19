export type JobCategory =
  | 'Finance Jobs'
  | 'SAP FICO Jobs'
  | 'Business Analytics Jobs'
  | 'Marketing Jobs';

export type WorkMode = 'Remote' | 'Hybrid' | 'On-site' | 'Unspecified';

export type JobRegion = 'India' | 'International';

export type DiscoveryPortal =
  | 'LinkedIn'
  | 'Naukri'
  | 'Internshala'
  | 'Foundit'
  | 'IIMJobs'
  | 'Indeed'
  | 'Glassdoor'
  | 'Hirist'
  | 'Unstop'
  | 'Shine'
  | 'Apna'
  | 'Wellfound'
  | 'Cutshort'
  | 'Instahyre'
  | 'Freshersworld'
  | 'Company ATS';

export const DISCOVERY_PORTALS: DiscoveryPortal[] = [
  'LinkedIn',
  'Naukri',
  'Internshala',
  'Foundit',
  'IIMJobs',
  'Indeed',
  'Glassdoor',
  'Hirist',
  'Unstop',
  'Shine',
  'Apna',
  'Wellfound',
  'Cutshort',
  'Instahyre',
  'Freshersworld',
  'Company ATS',
];

export type ExperienceTier =
  | '0 Years / Fresher'
  | '0-1 Years'
  | 'MBA Graduate Trainee'
  | 'Missing Experience Info'
  | 'Exceeds 1 Year (Excluded)';

export type QualificationCheck =
  | 'Confirmed MBA Eligible'
  | 'Needs MBA Verification'
  | 'Not MBA Eligible';

export type ExperienceCheck =
  | 'Confirmed 0-1 Yr'
  | 'Missing Experience Info'
  | 'Exceeds 1 Yr';

export type FeedBucket =
  | 'Verified MBA Fresher Jobs'
  | 'Partially Verified Jobs'
  | 'Needs Eligibility Verification'
  | 'Expired or Closed Jobs';

export type VerificationStatus =
  | 'Verified'
  | 'Partially Verified'
  | 'Unverified'
  | 'Expired'
  | 'Suspicious';

export type ApplicationStatus =
  | 'Preparing'
  | 'Applied'
  | 'Assessment'
  | 'Interview Scheduled'
  | 'Offer'
  | 'Closed'
  | 'Rejected';

export type InterviewMode = 'Video Call' | 'In-Person' | 'Phone' | 'Online Assessment' | 'None';

export const INDIA_CITIES = [
  'All India',
  'Delhi NCR',
  'Mumbai',
  'Bengaluru',
  'Hyderabad',
  'Pune',
  'Chennai',
  'Kolkata',
  'Noida',
  'Gurugram',
  'Ahmedabad',
  'Jaipur',
  'Lucknow',
  'Haldwani',
  'Other Indian cities',
] as const;

export type IndiaCityFilter = (typeof INDIA_CITIES)[number];

export interface JobListing {
  jobId: string;
  title: string;
  company: string;
  region: JobRegion;
  country: string;
  city?: string;
  workMode: WorkMode;
  experienceRequired: string;
  isFresherFriendly: boolean;
  experienceTier: ExperienceTier;
  experienceCheck: ExperienceCheck;
  mbaEligible: boolean;
  qualificationCheck: QualificationCheck;
  feedBucket: FeedBucket;
  educationRequired?: string;
  category: JobCategory;
  mbaSpecialization?: string;
  skills?: string[];
  salary?: string;
  employmentType?: string;
  description?: string;
  deadline?: string;
  postedDate?: string;
  lastVerifiedDate?: string;
  sourceName?: string;
  originalJobUrl: string;
  sourceUrls?: string[];
  applyUrl: string;
  recruiterInfo?: string;
  visaSponsorship?: string;
  extractedClaims?: string;
  scamWarning?: string;
  verificationStatus: VerificationStatus;
  duplicateKey?: string;
  visibility: 'public' | 'archived';
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface CandidateProfile {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  country: string;
  preferredLocations?: string[];
  mbaSpecialization: string;
  college?: string;
  graduationYear?: string;
  experienceYears: string;
  skills?: string[];
  certifications?: string[];
  resumeSummary?: string;
  resumeFileName?: string;
  preferredSalary?: string;
  preferredEmploymentType?: string;
  remotePreference: 'Any' | 'Remote' | 'Hybrid' | 'On-site';
  visaStatus?: string;
  notifyInApp?: boolean;
  notifyPush?: boolean;
  notifyEmail?: boolean;
  notifyWhatsApp?: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface UserAccount {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  role: 'candidate' | 'owner';
  consentAccepted: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface SavedJob {
  id?: string;
  uid: string;
  jobId: string;
  jobTitle: string;
  company: string;
  category?: string;
  applyUrl: string;
  verificationStatus?: string;
  createdAt?: unknown;
}

export interface JobApplication {
  id?: string;
  uid: string;
  jobId: string;
  jobTitle: string;
  company: string;
  category?: string;
  applyUrl: string;
  status: ApplicationStatus;
  notes?: string;
  deadline?: string;
  appliedDate?: string;
  applicationRefId?: string;
  nextActionDate?: string;
  interviewRound?: string;
  interviewDateTime?: string;
  interviewMode?: InterviewMode;
  interviewerName?: string;
  interviewLink?: string;
  interviewPrepChecklist?: string[];
  processTimeline?: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface CandidateNotification {
  id?: string;
  uid: string;
  jobId: string;
  category?: string;
  title: string;
  jobTitle: string;
  company: string;
  location?: string;
  experienceRequired?: string;
  salary?: string;
  matchScore: number;
  verificationStatus: string;
  postedDate?: string;
  applyUrl: string;
  channel?: 'in_app' | 'push' | 'email' | 'whatsapp';
  read: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AiRecommendation {
  recId: string;
  uid: string;
  jobId: string;
  matchScore: number;
  reasons?: string[];
  missingRequirements?: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface DataSourceConfig {
  sourceId: string;
  name: string;
  sourceType: string;
  baseUrl?: string;
  enabled: boolean;
  healthStatus: 'Healthy' | 'Degraded' | 'Disabled';
  jobsDiscovered: number;
  lastSyncAt?: string;
  updatedBy?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AiActivityLog {
  logId: string;
  agentName: string;
  action: string;
  status: 'Completed' | 'Pending Approval' | 'Failed' | 'Skipped';
  summary: string;
  modelUsed: string;
  actorUid: string;
  createdAt?: unknown;
}

export interface ApprovalRequest {
  requestId: string;
  actionType: string;
  title: string;
  description: string;
  requestedByAgent: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  reviewedBy?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface PlatformSetting {
  settingId: string;
  monitoringFrequencyMinutes: number;
  dailyAiSpendCapUsd: number;
  primaryAiProvider: string;
  primaryAiModel: string;
  autoVerifyUrls: boolean;
  autoArchiveExpired: boolean;
  requireOwnerApprovalForOutreach: boolean;
  updatedBy: string;
  updatedAt?: unknown;
}

export interface ApplicationAssistantOutput {
  eligibilityAnalysis: string;
  relevanceExplanation: string;
  eligibilityRequirements: string[];
  requiredSkills: string[];
  requiredDocuments: string[];
  resumeModifications: string[];
  atsKeywords: string[];
  coverLetterRequired: string;
  coverLetterDraft: string;
  suggestedEmailSubject: string;
  recruiterMessage: string;
  stepByStepGuide: string[];
  likelyFormQuestions: Array<{ question: string; truthfulAnswerGuidance: string }>;
  interviewPrep: Array<{ question: string; strategy: string }>;
  importantDeadline: string;
  scamWarning: string;
  officialApplyUrl: string;
}

export interface ResumeAnalysisOutput {
  candidateSummary: string;
  detectedSpecialization: string;
  experienceLevel: string;
  extractedSkills: string[];
  extractedCertifications: string[];
  atsReadinessNotes: string[];
  missingFresherSignals: string[];
  recommendedJobTitles: string[];
}

export interface JobMatchResult {
  jobId: string;
  matchScore: number;
  reasons: string[];
  missingRequirements: string[];
}

export interface PaginatedJobsResponse {
  jobs: JobListing[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  countsByBucket: Record<FeedBucket, number>;
  countsByRegion: Record<JobRegion, number>;
  countsByCategory: Record<JobCategory, number>;
  connectedSourcesCount?: number;
  sourceBreakdown?: Record<string, number>;
  cachedAt: string;
}

export type AppPage =
  | 'landing'
  | 'login'
  | 'register'
  | 'dashboard'
  | 'jobs'
  | 'finance'
  | 'sap-fico'
  | 'analytics'
  | 'marketing'
  | 'job-detail'
  | 'assistant'
  | 'resume'
  | 'saved'
  | 'applications'
  | 'notifications'
  | 'profile'
  | 'ai-control'
  | 'owner'
  | 'sources'
  | 'settings';
