import type {
  ExperienceCheck,
  ExperienceTier,
  FeedBucket,
  JobCategory,
  JobListing,
  JobRegion,
  QualificationCheck,
  VerificationStatus,
  WorkMode,
} from '../src/types.ts';

function stripHtml(html: string): string {
  const decoded = html
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  return decoded
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function sanitizeId(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 96) || `job_${Date.now()}`
  );
}

export function computeDuplicateKey(company: string, title: string, country: string): string {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .split(/\s+/)
      .slice(0, 5)
      .join('-');
  return `${norm(company)}__${norm(title)}__${norm(country || 'india')}`.slice(0, 180);
}

const NON_MBA_TECH_TITLE_EXCLUDES = [
  /\bbackend\b/i,
  /\bfrontend\b/i,
  /\bfull[\s-]?stack\b/i,
  /\bsoftware engineer\b/i,
  /\bdevops\b/i,
  /\bsite reliability\b/i,
  /\bsre\b/i,
  /\baccount executive\b/i,
  /\bsales representative\b/i,
  /\bios engineer\b/i,
  /\bandroid engineer\b/i,
  /\bmachine learning engineer\b/i,
  /\bplatform engineer\b/i,
];

const FINANCE_REGEXES = [
  /\bfinancial analyst\b/i,
  /\bfinance analyst\b/i,
  /\bfp&a\b/i,
  /\bfp\s*&\s*a\b/i,
  /\bcorporate finance\b/i,
  /\binvestment banking\b/i,
  /\bequity research\b/i,
  /\bcredit analyst\b/i,
  /\brisk analyst\b/i,
  /\btreasury\b/i,
  /\bbanking operations\b/i,
  /\bfinance operations\b/i,
  /\baccounts payable\b/i,
  /\baccounts receivable\b/i,
  /\baccounts executive\b/i,
  /\baccounting\b/i,
  /\baccountant\b/i,
  /\bgeneral ledger\b/i,
  /\breconciliation\b/i,
  /\btax analyst\b/i,
  /\btax associate\b/i,
  /\bgst analyst\b/i,
  /\baudit associate\b/i,
  /\binternal audit\b/i,
  /\bexternal audit\b/i,
  /\brevenue analyst\b/i,
  /\bbilling analyst\b/i,
  /\bpayroll analyst\b/i,
  /\bfund accountant\b/i,
  /\bportfolio analyst\b/i,
  /\bwealth management\b/i,
  /\bmutual fund\b/i,
  /\bvaluation\b/i,
  /\bpricing analyst\b/i,
  /\bfinancial controller\b/i,
  /\bbudget analyst\b/i,
  /\bmis executive\b/i,
  /\bfinance mis\b/i,
  /\bkyc\b/i,
  /\baml\b/i,
  /\btransaction monitoring\b/i,
  /\bloan operations\b/i,
  /\bmortgage analyst\b/i,
  /\bunderwriting\b/i,
  /\btransfer pricing\b/i,
  /\bm&a\b/i,
  /\bdue diligence\b/i,
  /\bfinance\b/i,
];

const SAP_FICO_REGEXES = [
  /\bsap fico\b/i,
  /\bsap fi\b/i,
  /\bsap co\b/i,
  /\bs\/4hana finance\b/i,
  /\bsap s\/4hana\b/i,
  /\bsap finance\b/i,
  /\berp finance\b/i,
  /\bsap functional\b/i,
  /\bsap consultant\b/i,
  /\bsap mm\b/i,
  /\bsap sd\b/i,
];

const ANALYTICS_REGEXES = [
  /\bbusiness analyst\b/i,
  /\bbusiness intelligence\b/i,
  /\bdata analyst\b/i,
  /\breporting analyst\b/i,
  /\boperations analyst\b/i,
  /\bstrategy analyst\b/i,
  /\bresearch analyst\b/i,
  /\bproduct analyst\b/i,
  /\bprocess analyst\b/i,
  /\bbusiness operations\b/i,
  /\bdecision science\b/i,
  /\bbi analyst\b/i,
  /\banalytics\b/i,
];

const MARKETING_REGEXES = [
  /\bmarketing\b/i,
  /\bdigital marketing\b/i,
  /\bseo\b/i,
  /\bsem\b/i,
  /\bperformance marketing\b/i,
  /\bbrand management\b/i,
  /\bbrand associate\b/i,
  /\bproduct marketing\b/i,
  /\bmarket research\b/i,
  /\bconsumer insights\b/i,
  /\bsocial media\b/i,
  /\bgrowth marketing\b/i,
  /\bcrm analyst\b/i,
  /\bcampaign analyst\b/i,
  /\bbusiness development\b/i,
];

export function classifyJobCategory(title: string, description = ''): JobCategory | null {
  if (NON_MBA_TECH_TITLE_EXCLUDES.some((rx) => rx.test(title))) {
    return null;
  }
  const haystack = `${title} ${description.slice(0, 700)}`;

  if (SAP_FICO_REGEXES.some((rx) => rx.test(haystack))) {
    return 'SAP FICO Jobs';
  }
  if (FINANCE_REGEXES.some((rx) => rx.test(title))) {
    return 'Finance Jobs';
  }
  if (ANALYTICS_REGEXES.some((rx) => rx.test(title))) {
    return 'Business Analytics Jobs';
  }
  if (MARKETING_REGEXES.some((rx) => rx.test(title))) {
    return 'Marketing Jobs';
  }
  if (FINANCE_REGEXES.some((rx) => rx.test(haystack))) {
    return 'Finance Jobs';
  }
  if (ANALYTICS_REGEXES.some((rx) => rx.test(haystack))) {
    return 'Business Analytics Jobs';
  }
  if (MARKETING_REGEXES.some((rx) => rx.test(haystack))) {
    return 'Marketing Jobs';
  }
  return null;
}

const INDIA_LOCATION_REGEXES = [
  /\bindia\b/i,
  /\bdelhi\b/i,
  /\bncr\b/i,
  /\bmumbai\b/i,
  /\bbengaluru\b/i,
  /\bbangalore\b/i,
  /\bhyderabad\b/i,
  /\bpune\b/i,
  /\bchennai\b/i,
  /\bkolkata\b/i,
  /\bnoida\b/i,
  /\bgurugram\b/i,
  /\bgurgaon\b/i,
  /\bahmedabad\b/i,
  /\bjaipur\b/i,
  /\blucknow\b/i,
  /\bhaldwani\b/i,
  /\buttarakhand\b/i,
  /\bmaharashtra\b/i,
  /\bkarnataka\b/i,
  /\btelangana\b/i,
  /\btamil nadu\b/i,
];

export function classifyRegionAndLocation(
  countryRaw: string,
  cityRaw = '',
  _text = ''
): { region: JobRegion; country: string; city: string } {
  const locationOnly = `${countryRaw} ${cityRaw}`;
  const isIndia = INDIA_LOCATION_REGEXES.some((rx) => rx.test(locationOnly));
  if (isIndia) {
    return {
      region: 'India',
      country: 'India',
      city: cityRaw.trim() || countryRaw.trim() || 'India',
    };
  }
  return {
    region: 'International',
    country: countryRaw.trim() || 'Global / Remote',
    city: cityRaw.trim(),
  };
}

// STRICT MBA ELIGIBILITY CHECK (Requirement A)
export function detectMbaEligibility(
  title: string,
  educationText: string,
  description: string
): { mbaEligible: boolean; qualificationCheck: QualificationCheck; educationRequired: string } {
  const combined = `${title} ${educationText} ${description}`.toLowerCase();

  // Explicit non-MBA undergrad-only exclusions
  const undergradOnlySignals = [
    'b.tech only',
    'btech only',
    'be/b.tech only',
    'only undergraduate',
    'high school diploma only',
    'no postgraduates',
    'diploma holders only',
  ];
  if (undergradOnlySignals.some((s) => combined.includes(s)) && !combined.includes('mba')) {
    return {
      mbaEligible: false,
      qualificationCheck: 'Not MBA Eligible',
      educationRequired: educationText || 'Undergraduate / Non-MBA',
    };
  }

  const mbaSignals = [
    'mba',
    'master of business administration',
    'pgdm',
    'post graduate diploma in management',
    'mba finance',
    'mba marketing',
    'mba business analytics',
    'mba hr',
    'mba operations',
    'mba international business',
    'management trainee',
    'master degree in finance',
    "master's degree in finance",
    "master's in business",
    'masters in finance',
  ];

  if (mbaSignals.some((s) => combined.includes(s))) {
    return {
      mbaEligible: true,
      qualificationCheck: 'Confirmed MBA Eligible',
      educationRequired: educationText || 'MBA / PGDM (Finance, Marketing, Analytics, Operations, or HR)',
    };
  }

  // If neither explicitly MBA nor explicitly excluded -> Needs MBA Verification
  return {
    mbaEligible: false,
    qualificationCheck: 'Needs MBA Verification',
    educationRequired: educationText || 'MBA Eligibility Needs Verification',
  };
}

// STRICT <= 1 YEAR EXPERIENCE CHECK (Requirement B)
export function detectExperienceEligibility(
  title: string,
  description: string
): {
  isFresherFriendly: boolean;
  experienceTier: ExperienceTier;
  experienceCheck: ExperienceCheck;
  experienceRequired: string;
} {
  const full = `${title} ${description}`.toLowerCase();
  const titleLower = title.toLowerCase();

  // Hard exclusion for senior/mid/managerial roles
  const seniorTitleSignals = [
    'senior',
    'sr.',
    'lead ',
    'principal',
    'director',
    'vp ',
    'vice president',
    'head of',
    'staff ',
    'architect',
    'manager',
  ];
  const isTraineeTitle =
    titleLower.includes('management trainee') || titleLower.includes('graduate trainee');

  if (!isTraineeTitle && seniorTitleSignals.some((s) => titleLower.includes(s))) {
    return {
      isFresherFriendly: false,
      experienceTier: 'Exceeds 1 Year (Excluded)',
      experienceCheck: 'Exceeds 1 Yr',
      experienceRequired: 'Senior / Managerial (Excluded)',
    };
  }

  // Parse explicit year ranges like "2-4 years", "3+ years", "minimum 2 years", "1-3 years"
  const expMatches = [
    ...full.matchAll(
      /(?:minimum\s+|at\s+least\s+)?(\d+)\s*(?:\+|to|-|–)?\s*(\d+)?\s*(?:years?|yrs?)\s*(?:of\s+)?(?:relevant\s+)?(?:work\s+)?(?:experience|exp)?/gi
    ),
  ];

  let minYears: number | null = null;
  let maxYears: number | null = null;
  for (const m of expMatches) {
    const first = Number(m[1]);
    const second = m[2] ? Number(m[2]) : first;
    if (!Number.isNaN(first) && first <= 25) {
      if (minYears === null || first < minYears) minYears = first;
      if (maxYears === null || second > maxYears) maxYears = second;
    }
  }

  // Hard exclusion: anything requiring > 1 year (e.g., 2+ years, 2-3 years, or minYears >= 2)
  if (minYears !== null && minYears > 1) {
    return {
      isFresherFriendly: false,
      experienceTier: 'Exceeds 1 Year (Excluded)',
      experienceCheck: 'Exceeds 1 Yr',
      experienceRequired: `${minYears}${maxYears && maxYears > minYears ? `–${maxYears}` : '+'} Years (Excluded >1 Yr)`,
    };
  }

  // Also exclude ranges like "1-3 years" or "1-4 years" where upper bound clearly targets >1 yr mid-level
  if (minYears === 1 && maxYears !== null && maxYears >= 3) {
    return {
      isFresherFriendly: false,
      experienceTier: 'Exceeds 1 Year (Excluded)',
      experienceCheck: 'Exceeds 1 Yr',
      experienceRequired: `1–${maxYears} Years (Excluded >1 Yr)`,
    };
  }

  // Confirmed 0 to 1 year or Fresher / MBA Graduate Trainee
  if (
    full.includes('freshers can apply') ||
    full.includes('no experience required') ||
    full.includes('0 years') ||
    full.includes('0-1 year') ||
    full.includes('0–1 year') ||
    full.includes('0 - 1 year') ||
    full.includes('recent mba') ||
    full.includes('mba fresher') ||
    full.includes('campus hiring')
  ) {
    return {
      isFresherFriendly: true,
      experienceTier:
        full.includes('0-1') || full.includes('0–1') ? '0-1 Years' : '0 Years / Fresher',
      experienceCheck: 'Confirmed 0-1 Yr',
      experienceRequired:
        full.includes('0-1') || full.includes('0–1') ? '0–1 Years' : '0 Years / Fresher',
    };
  }

  if (isTraineeTitle || full.includes('mba graduate trainee') || full.includes('graduate trainee program')) {
    return {
      isFresherFriendly: true,
      experienceTier: 'MBA Graduate Trainee',
      experienceCheck: 'Confirmed 0-1 Yr',
      experienceRequired: '0–1 Years (MBA Graduate Trainee)',
    };
  }

  if (minYears !== null && minYears <= 1 && (maxYears === null || maxYears <= 1)) {
    return {
      isFresherFriendly: true,
      experienceTier: minYears === 0 ? '0 Years / Fresher' : '0-1 Years',
      experienceCheck: 'Confirmed 0-1 Yr',
      experienceRequired: `${minYears}–1 Years`,
    };
  }

  // Missing or unclear experience requirement -> separate Needs Eligibility Verification bucket
  return {
    isFresherFriendly: false,
    experienceTier: 'Missing Experience Info',
    experienceCheck: 'Missing Experience Info',
    experienceRequired: 'Experience Not Stated (Needs Verification)',
  };
}

export function computeFeedBucket(params: {
  verificationStatus: VerificationStatus;
  mbaEligible: boolean;
  experienceCheck: ExperienceCheck;
}): FeedBucket {
  if (params.verificationStatus === 'Expired' || params.verificationStatus === 'Suspicious') {
    return 'Expired or Closed Jobs';
  }
  if (
    !params.mbaEligible ||
    params.experienceCheck !== 'Confirmed 0-1 Yr' ||
    params.verificationStatus === 'Unverified'
  ) {
    return 'Needs Eligibility Verification';
  }
  if (params.verificationStatus === 'Verified') {
    return 'Verified MBA Fresher Jobs';
  }
  return 'Partially Verified Jobs';
}

function inferWorkMode(location: string, text: string): WorkMode {
  const combined = `${location} ${text}`.toLowerCase();
  if (combined.includes('remote')) return 'Remote';
  if (combined.includes('hybrid')) return 'Hybrid';
  if (location.trim().length > 0) return 'On-site';
  return 'Unspecified';
}

function extractSkills(text: string): string[] {
  const knownSkills = [
    'Financial Modeling',
    'Excel',
    'SQL',
    'Python',
    'Power BI',
    'Tableau',
    'FP&A',
    'SAP FICO',
    'SAP S/4HANA',
    'Accounting',
    'GAAP',
    'IFRS',
    'Valuation',
    'DCF',
    'Credit Analysis',
    'Risk Management',
    'KYC',
    'AML',
    'Treasury',
    'Audit',
    'Taxation',
    'GST',
    'SEO',
    'SEM',
    'Google Analytics',
    'CRM',
    'Market Research',
  ];
  const lower = text.toLowerCase();
  return knownSkills.filter((skill) => lower.includes(skill.toLowerCase())).slice(0, 12);
}

async function fetchJsonWithTimeout(url: string, timeoutMs = 8000): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'MBAFresherBlessingAI/1.0 (Official Public Job Aggregator)',
        Accept: 'application/json',
      },
    });
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status} from ${url}`);
    }
    return await resp.json();
  } finally {
    clearTimeout(timer);
  }
}

const GREENHOUSE_BOARDS = [
  { slug: 'stripe', company: 'Stripe' },
  { slug: 'wise', company: 'Wise' },
  { slug: 'adyen', company: 'Adyen' },
  { slug: 'brex', company: 'Brex' },
  { slug: 'plaid', company: 'Plaid' },
  { slug: 'coinbase', company: 'Coinbase' },
  { slug: 'databricks', company: 'Databricks' },
  { slug: 'browserstack', company: 'BrowserStack' },
  { slug: 'postman', company: 'Postman' },
  { slug: 'chargebee', company: 'Chargebee' },
];

export async function fetchGreenhouseJobs(limitPerBoard = 8): Promise<JobListing[]> {
  const results: JobListing[] = [];
  const nowIso = new Date().toISOString();

  await Promise.allSettled(
    GREENHOUSE_BOARDS.map(async ({ slug, company }) => {
      try {
        const data = (await fetchJsonWithTimeout(
          `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`,
          7500
        )) as {
          jobs?: Array<{
            id: number;
            title: string;
            location?: { name?: string };
            absolute_url: string;
            updated_at?: string;
            content?: string;
          }>;
        };
        let added = 0;
        for (const item of data.jobs || []) {
          if (added >= limitPerBoard) break;
          const desc = stripHtml(item.content || '');
          const category = classifyJobCategory(item.title, desc);
          if (!category) continue;

          const exp = detectExperienceEligibility(item.title, desc);
          if (exp.experienceCheck === 'Exceeds 1 Yr') continue; // Hard exclusion >1 yr

          const mba = detectMbaEligibility(item.title, '', desc);
          if (mba.qualificationCheck === 'Not MBA Eligible') continue;

          const locRaw = item.location?.name || 'Global';
          const parts = locRaw.split(',').map((s) => s.trim());
          const regionInfo = classifyRegionAndLocation(
            parts.length > 1 ? parts[parts.length - 1] : locRaw,
            parts[0] || '',
            desc
          );
          const verificationStatus: VerificationStatus = 'Verified';
          const feedBucket = computeFeedBucket({
            verificationStatus,
            mbaEligible: mba.mbaEligible,
            experienceCheck: exp.experienceCheck,
          });

          results.push({
            jobId: sanitizeId(`gh_${slug}_${item.id}`),
            title: item.title.slice(0, 195),
            company,
            region: regionInfo.region,
            country: regionInfo.country.slice(0, 95),
            city: regionInfo.city.slice(0, 95),
            workMode: inferWorkMode(locRaw, desc),
            experienceRequired: exp.experienceRequired,
            isFresherFriendly: exp.isFresherFriendly && mba.mbaEligible,
            experienceTier: exp.experienceTier,
            experienceCheck: exp.experienceCheck,
            mbaEligible: mba.mbaEligible,
            qualificationCheck: mba.qualificationCheck,
            feedBucket,
            educationRequired: mba.educationRequired,
            category,
            mbaSpecialization: category,
            skills: extractSkills(`${item.title} ${desc}`),
            salary: 'Not disclosed on public board',
            employmentType: 'Full-time',
            description: desc.slice(0, 3000),
            deadline: 'Rolling / Open',
            postedDate: (item.updated_at || nowIso).slice(0, 10),
            lastVerifiedDate: nowIso.slice(0, 10),
            sourceName: `Greenhouse (${company} Official)`,
            originalJobUrl: item.absolute_url,
            sourceUrls: [item.absolute_url],
            applyUrl: item.absolute_url,
            recruiterInfo: 'Official Company ATS Portal',
            visaSponsorship:
              regionInfo.region === 'India'
                ? 'Domestic India Role'
                : desc.toLowerCase().includes('visa')
                  ? 'See official posting for work authorization details'
                  : 'Work authorization required in host country',
            verificationStatus,
            duplicateKey: computeDuplicateKey(company, item.title, regionInfo.country),
            visibility: 'public',
            createdBy: 'system',
          });
          added += 1;
        }
      } catch {
        // Skip unreachable board cleanly
      }
    })
  );

  return results;
}

export async function fetchArbeitnowJobs(limit = 12): Promise<JobListing[]> {
  const results: JobListing[] = [];
  const nowIso = new Date().toISOString();
  try {
    const data = (await fetchJsonWithTimeout(
      'https://www.arbeitnow.com/api/job-board-api',
      8000
    )) as {
      data?: Array<{
        slug: string;
        company_name: string;
        title: string;
        description: string;
        remote: boolean;
        url: string;
        tags?: string[];
        job_types?: string[];
        location?: string;
        created_at?: number;
      }>;
    };
    for (const item of data.data || []) {
      if (results.length >= limit) break;
      const desc = stripHtml(item.description || '');
      const category = classifyJobCategory(item.title, desc);
      if (!category) continue;

      const exp = detectExperienceEligibility(item.title, desc);
      if (exp.experienceCheck === 'Exceeds 1 Yr') continue;

      const mba = detectMbaEligibility(item.title, '', desc);
      if (mba.qualificationCheck === 'Not MBA Eligible') continue;

      const loc = item.location || 'Europe / Remote';
      const regionInfo = classifyRegionAndLocation(loc, loc, desc);
      const posted = item.created_at
        ? new Date(item.created_at * 1000).toISOString().slice(0, 10)
        : nowIso.slice(0, 10);

      const verificationStatus: VerificationStatus = 'Partially Verified';
      const feedBucket = computeFeedBucket({
        verificationStatus,
        mbaEligible: mba.mbaEligible,
        experienceCheck: exp.experienceCheck,
      });

      results.push({
        jobId: sanitizeId(`an_${item.slug}`),
        title: item.title.slice(0, 195),
        company: item.company_name.slice(0, 155),
        region: regionInfo.region,
        country: regionInfo.country.slice(0, 95),
        city: regionInfo.city.slice(0, 95),
        workMode: item.remote ? 'Remote' : inferWorkMode(loc, desc),
        experienceRequired: exp.experienceRequired,
        isFresherFriendly: exp.isFresherFriendly && mba.mbaEligible,
        experienceTier: exp.experienceTier,
        experienceCheck: exp.experienceCheck,
        mbaEligible: mba.mbaEligible,
        qualificationCheck: mba.qualificationCheck,
        feedBucket,
        educationRequired: mba.educationRequired,
        category,
        mbaSpecialization: category,
        skills: (item.tags && item.tags.length > 0 ? item.tags : extractSkills(desc)).slice(0, 12),
        salary: 'Not specified on listing',
        employmentType: item.job_types?.[0] || 'Full-time',
        description: desc.slice(0, 3000),
        deadline: 'Open until filled',
        postedDate: posted,
        lastVerifiedDate: nowIso.slice(0, 10),
        sourceName: 'Arbeitnow Public Board',
        originalJobUrl: item.url,
        sourceUrls: [item.url],
        applyUrl: item.url,
        recruiterInfo: 'Listed on Arbeitnow',
        visaSponsorship: desc.toLowerCase().includes('visa sponsorship')
          ? 'Visa sponsorship mentioned in listing'
          : 'Work authorization required unless stated',
        verificationStatus,
        duplicateKey: computeDuplicateKey(item.company_name, item.title, regionInfo.country),
        visibility: 'public',
        createdBy: 'system',
      });
    }
  } catch {
    // Graceful fallback
  }
  return results;
}

export async function fetchRemotiveJobs(limit = 10): Promise<JobListing[]> {
  const results: JobListing[] = [];
  const nowIso = new Date().toISOString();
  const endpoints = [
    'https://remotive.com/api/remote-jobs?category=finance-legal&limit=20',
    'https://remotive.com/api/remote-jobs?category=marketing&limit=15',
    'https://remotive.com/api/remote-jobs?category=data&limit=15',
  ];

  await Promise.allSettled(
    endpoints.map(async (url) => {
      try {
        const data = (await fetchJsonWithTimeout(url, 8000)) as {
          jobs?: Array<{
            id: number;
            url: string;
            title: string;
            company_name: string;
            category: string;
            job_type?: string;
            publication_date?: string;
            candidate_required_location?: string;
            salary?: string;
            description?: string;
          }>;
        };
        for (const item of data.jobs || []) {
          if (results.length >= limit) break;
          const desc = stripHtml(item.description || '');
          const category = classifyJobCategory(item.title, desc);
          if (!category) continue;
          const exp = detectExperienceEligibility(item.title, desc);
          if (exp.experienceCheck === 'Exceeds 1 Yr') continue;

          const mba = detectMbaEligibility(item.title, '', desc);
          if (mba.qualificationCheck === 'Not MBA Eligible') continue;

          const loc = item.candidate_required_location || 'Worldwide';
          const regionInfo = classifyRegionAndLocation(loc, 'Remote', desc);
          const verificationStatus: VerificationStatus = 'Partially Verified';
          const feedBucket = computeFeedBucket({
            verificationStatus,
            mbaEligible: mba.mbaEligible,
            experienceCheck: exp.experienceCheck,
          });

          results.push({
            jobId: sanitizeId(`rm_${item.id}`),
            title: item.title.slice(0, 195),
            company: item.company_name.slice(0, 155),
            region: regionInfo.region,
            country: regionInfo.country.slice(0, 95),
            city: regionInfo.city || 'Remote',
            workMode: 'Remote',
            experienceRequired: exp.experienceRequired,
            isFresherFriendly: exp.isFresherFriendly && mba.mbaEligible,
            experienceTier: exp.experienceTier,
            experienceCheck: exp.experienceCheck,
            mbaEligible: mba.mbaEligible,
            qualificationCheck: mba.qualificationCheck,
            feedBucket,
            educationRequired: mba.educationRequired,
            category,
            mbaSpecialization: category,
            skills: extractSkills(`${item.title} ${desc}`),
            salary: item.salary || 'Not specified',
            employmentType: item.job_type || 'Full-time',
            description: desc.slice(0, 3000),
            deadline: 'Open',
            postedDate: (item.publication_date || nowIso).slice(0, 10),
            lastVerifiedDate: nowIso.slice(0, 10),
            sourceName: 'Remotive Remote API',
            originalJobUrl: item.url,
            sourceUrls: [item.url],
            applyUrl: item.url,
            recruiterInfo: 'Verified Remote Board Listing',
            visaSponsorship: `Remote eligibility: ${loc}`,
            verificationStatus,
            duplicateKey: computeDuplicateKey(item.company_name, item.title, regionInfo.country),
            visibility: 'public',
            createdBy: 'system',
          });
        }
      } catch {
        // Continue resiliently
      }
    })
  );

  return results;
}

export async function verifyJobUrlHealth(url: string): Promise<{
  reachable: boolean;
  httpStatus: number;
  finalUrl: string;
  redirected: boolean;
  suspiciousRedirect: boolean;
  pageSnippet: string;
}> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const resp = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MBAFresherBlessingVerifier/1.0)',
      },
    });
    const finalUrl = resp.url || url;
    const initialHost = new URL(url).hostname.replace(/^www\./, '');
    const finalHost = new URL(finalUrl).hostname.replace(/^www\./, '');
    const suspiciousRedirect =
      initialHost !== finalHost &&
      !finalHost.includes(initialHost) &&
      !finalHost.includes('greenhouse.io') &&
      !finalHost.includes('lever.co') &&
      !finalHost.includes('myworkdayjobs.com') &&
      !finalHost.includes('ashbyhq.com') &&
      !finalHost.includes('naukri.com') &&
      !finalHost.includes('linkedin.com');

    const text = resp.ok ? stripHtml((await resp.text()).slice(0, 12000)).slice(0, 2500) : '';
    return {
      reachable: resp.ok,
      httpStatus: resp.status,
      finalUrl,
      redirected: finalUrl !== url,
      suspiciousRedirect,
      pageSnippet: text,
    };
  } catch {
    return {
      reachable: false,
      httpStatus: 0,
      finalUrl: url,
      redirected: false,
      suspiciousRedirect: false,
      pageSnippet: '',
    };
  } finally {
    clearTimeout(timer);
  }
}

export function deduplicateAndRankJobs(jobs: JobListing[]): JobListing[] {
  const byKey = new Map<string, JobListing>();
  for (const job of jobs) {
    const key = job.duplicateKey || computeDuplicateKey(job.company, job.title, job.country);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, job);
    } else {
      const mergedUrls = Array.from(
        new Set([...(existing.sourceUrls || []), ...(job.sourceUrls || []), job.originalJobUrl, job.applyUrl])
      )
        .filter(Boolean)
        .slice(0, 8);
      const preferNew =
        job.verificationStatus === 'Verified' && existing.verificationStatus !== 'Verified';
      byKey.set(key, {
        ...(preferNew ? job : existing),
        sourceUrls: mergedUrls,
      });
    }
  }

  // Ranking: 1. India First, 2. Finance Jobs Priority, 3. Verified Bucket, 4. Newest Posted Date
  const bucketWeight: Record<FeedBucket, number> = {
    'Verified MBA Fresher Jobs': 4,
    'Partially Verified Jobs': 3,
    'Needs Eligibility Verification': 2,
    'Expired or Closed Jobs': 1,
  };
  const categoryWeight: Record<JobCategory, number> = {
    'Finance Jobs': 4,
    'SAP FICO Jobs': 3,
    'Business Analytics Jobs': 2,
    'Marketing Jobs': 1,
  };

  return Array.from(byKey.values()).sort((a, b) => {
    if (a.region !== b.region) return a.region === 'India' ? -1 : 1;
    const bwDiff = (bucketWeight[b.feedBucket] || 0) - (bucketWeight[a.feedBucket] || 0);
    if (bwDiff !== 0) return bwDiff;
    const cwDiff = (categoryWeight[b.category] || 0) - (categoryWeight[a.category] || 0);
    if (cwDiff !== 0) return cwDiff;
    return (b.postedDate || '').localeCompare(a.postedDate || '');
  });
}
