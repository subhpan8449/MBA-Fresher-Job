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
    .replace(/&#39;/g, "'")
    .replace(/&#8211;/g, '–')
    .replace(/&#8217;/g, "'");
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
  /\bsoftware developer\b/i,
  /\bdevops\b/i,
  /\bsite reliability\b/i,
  /\bsre\b/i,
  /\bios engineer\b/i,
  /\bandroid engineer\b/i,
  /\bmachine learning engineer\b/i,
  /\bplatform engineer\b/i,
  /\bsecurity engineer\b/i,
  /\bfirmware\b/i,
  /\bembedded\b/i,
  /\bqa engineer\b/i,
  /\bsdet\b/i,
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
  /\bcompliance analyst\b/i,
  /\btransaction monitoring\b/i,
  /\bloan operations\b/i,
  /\bmortgage analyst\b/i,
  /\bunderwriting\b/i,
  /\btransfer pricing\b/i,
  /\bm&a\b/i,
  /\bdue diligence\b/i,
  /\bfinance\b/i,
  /\bfinancial\b/i,
  /\bpayments?\s+ops\b/i,
  /\brisk\s+operations\b/i,
  /\bcredit\s+risk\b/i,
  /\bcollections?\s+analyst\b/i,
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
  /\bsap erp\b/i,
  /\border to cash\b/i,
  /\bprocure to pay\b/i,
  /\brecord to report\b/i,
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
  /\bmanagement trainee\b/i,
  /\bcategory analyst\b/i,
  /\bstrategy\s+&\s+operations\b/i,
  /\bcommercial analyst\b/i,
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
  /\bcontent strategist\b/i,
  /\bcommunications associate\b/i,
  /\bcategory associate\b/i,
];

export function classifyJobCategory(title: string, description = ''): JobCategory | null {
  if (NON_MBA_TECH_TITLE_EXCLUDES.some((rx) => rx.test(title))) {
    return null;
  }
  const haystack = `${title} ${description.slice(0, 900)}`;

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
  /\bchandigarh\b/i,
  /\bindore\b/i,
  /\bkochi\b/i,
  /\bcoimbatore\b/i,
  /\buttarakhand\b/i,
  /\bmaharashtra\b/i,
  /\bkarnataka\b/i,
  /\btelangana\b/i,
  /\btamil nadu\b/i,
  /\bharyana\b/i,
  /\buttar pradesh\b/i,
  /\bgujarat\b/i,
];

export function classifyRegionAndLocation(
  countryRaw: string,
  cityRaw = '',
  _text = ''
): { region: JobRegion; country: string; city: string } {
  const locationOnly = `${countryRaw} ${cityRaw}`;
  const isIndia = INDIA_LOCATION_REGEXES.some((rx) => rx.test(locationOnly));
  if (isIndia) {
    const cleanCity = cityRaw
      .replace(/,?\s*india$/i, '')
      .replace(/\s*\(india\)/i, '')
      .trim();
    return {
      region: 'India',
      country: 'India',
      city: cleanCity || (countryRaw.toLowerCase() === 'india' ? 'Pan India' : countryRaw.trim()),
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
    'graduate trainee',
    'master degree in finance',
    "master's degree in finance",
    "master's in business",
    'masters in finance',
    'postgraduate in finance',
    'post graduate in commerce',
    'business administration',
    'finance / accounting degree',
    'commerce / finance',
  ];

  if (mbaSignals.some((s) => combined.includes(s))) {
    return {
      mbaEligible: true,
      qualificationCheck: 'Confirmed MBA Eligible',
      educationRequired: educationText || 'MBA / PGDM (Finance, Marketing, Analytics, Operations, or HR)',
    };
  }

  return {
    mbaEligible: false,
    qualificationCheck: 'Needs MBA Verification',
    educationRequired: educationText || 'MBA Eligibility Needs Verification',
  };
}

// STRICT <= 1 YEAR EXPERIENCE CHECK (Requirement B) — Fixed to ignore company age / degree duration!
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

  // Hard exclusion for clearly senior/director/executive/managerial titles
  const seniorTitleSignals = [
    'senior',
    'sr.',
    'sr ',
    'lead ',
    'principal',
    'director',
    'vp ',
    'vice president',
    'head of',
    'staff ',
    'architect',
    'chief ',
    'manager',
    'avp',
    'svp',
    'evp',
  ];
  const isTraineeTitle =
    titleLower.includes('management trainee') ||
    titleLower.includes('graduate trainee') ||
    titleLower.includes('assistant manager') && full.includes('fresher');

  if (!isTraineeTitle && seniorTitleSignals.some((s) => titleLower.includes(s))) {
    return {
      isFresherFriendly: false,
      experienceTier: 'Exceeds 1 Year (Excluded)',
      experienceCheck: 'Exceeds 1 Yr',
      experienceRequired: 'Senior / Managerial (Excluded)',
    };
  }

  // Strip degree durations & company history phrases before parsing work experience years
  const sanitizedForExp = full
    .replace(/\b\d+\s*[-–]?\s*year(?:s)?\s+(?:mba|pgdm|degree|bachelor|master|program|diploma|university|college)\b/gi, ' ')
    .replace(/\b(?:founded|established|over|for\s+more\s+than|past|last)\s+\d+\+?\s*(?:years?|yrs?)\b/gi, ' ')
    .replace(/\b\d+\+?\s*(?:years?|yrs?)\s+(?:ago|old|of\s+history|of\s+innovation|in\s+business|serving)\b/gi, ' ');

  // Only match explicit work-experience year phrases (require "experience", "exp", "working", "minimum", "at least", or range like "2-4 yrs")
  const expMatches = [
    ...sanitizedForExp.matchAll(
      /(?:(?:minimum|at\s+least|requires?|with|having)\s+)?(\d+)\s*(?:\+|to|-|–)?\s*(\d+)?\s*(?:years?|yrs?)\s*(?:of\s+)?(?:relevant\s+|prior\s+|hands-on\s+|professional\s+|industry\s+|work\s+|domain\s+|post[- ]?qualification\s+)?(?:experience|exp\b)/gi
    ),
  ];

  let minYears: number | null = null;
  let maxYears: number | null = null;
  for (const m of expMatches) {
    const first = Number(m[1]);
    const second = m[2] ? Number(m[2]) : first;
    if (!Number.isNaN(first) && first <= 20) {
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

  if (minYears === 1 && maxYears !== null && maxYears >= 3) {
    return {
      isFresherFriendly: false,
      experienceTier: 'Exceeds 1 Year (Excluded)',
      experienceCheck: 'Exceeds 1 Yr',
      experienceRequired: `1–${maxYears} Years (Excluded >1 Yr)`,
    };
  }

  // Confirmed 0 to 1 year or Fresher / MBA Graduate Trainee / Junior / Entry Level
  if (
    full.includes('freshers can apply') ||
    full.includes('no experience required') ||
    full.includes('0 years') ||
    full.includes('0-1 year') ||
    full.includes('0–1 year') ||
    full.includes('0 - 1 year') ||
    full.includes('0-1 yr') ||
    full.includes('recent mba') ||
    full.includes('mba fresher') ||
    full.includes('campus hiring') ||
    full.includes('entry level') ||
    full.includes('entry-level') ||
    titleLower.includes('fresher') ||
    titleLower.includes('junior') ||
    titleLower.includes('intern') ||
    titleLower.includes('trainee')
  ) {
    return {
      isFresherFriendly: true,
      experienceTier:
        titleLower.includes('trainee')
          ? 'MBA Graduate Trainee'
          : full.includes('0-1') || full.includes('0–1')
            ? '0-1 Years'
            : '0 Years / Fresher',
      experienceCheck: 'Confirmed 0-1 Yr',
      experienceRequired:
        titleLower.includes('trainee')
          ? '0–1 Years (MBA Graduate Trainee)'
          : full.includes('0-1') || full.includes('0–1')
            ? '0–1 Years'
            : '0 Years / Fresher',
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

  if (minYears !== null && minYears <= 1 && (maxYears === null || maxYears <= 2)) {
    return {
      isFresherFriendly: true,
      experienceTier: minYears === 0 ? '0 Years / Fresher' : '0-1 Years',
      experienceCheck: 'Confirmed 0-1 Yr',
      experienceRequired: `${minYears}–1 Years`,
    };
  }

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
    'Bloomberg',
    'Tally',
  ];
  const lower = text.toLowerCase();
  return knownSkills.filter((skill) => lower.includes(skill.toLowerCase())).slice(0, 12);
}

async function fetchJsonWithTimeout(url: string, timeoutMs = 7000): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'MBAFresherBlessingAI/2.0 (Official Public Job Aggregator)',
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

// 1. GREENHOUSE ATS BOARDS (20+ Verified India & Global Fintech / Enterprise / Analytics Companies)
const GREENHOUSE_BOARDS = [
  // India-First Priority Companies
  { slug: 'razorpaysoftwareprivatelimited', company: 'Razorpay' },
  { slug: 'groww', company: 'Groww' },
  { slug: 'highradius', company: 'HighRadius' },
  { slug: 'inmobi', company: 'InMobi' },
  { slug: 'druva', company: 'Druva' },
  { slug: 'zenoti', company: 'Zenoti' },
  { slug: 'browserstack', company: 'BrowserStack' },
  { slug: 'postman', company: 'Postman' },
  { slug: 'chargebee', company: 'Chargebee' },
  // Global + India Hub Finance / Enterprise Companies
  { slug: 'stripe', company: 'Stripe' },
  { slug: 'wise', company: 'Wise' },
  { slug: 'adyen', company: 'Adyen' },
  { slug: 'brex', company: 'Brex' },
  { slug: 'plaid', company: 'Plaid' },
  { slug: 'coinbase', company: 'Coinbase' },
  { slug: 'databricks', company: 'Databricks' },
  { slug: 'zscaler', company: 'Zscaler' },
  { slug: 'rubrik', company: 'Rubrik' },
  { slug: 'affirm', company: 'Affirm' },
  { slug: 'coursera', company: 'Coursera' },
  { slug: 'cloudflare', company: 'Cloudflare' },
  { slug: 'okta', company: 'Okta' },
];

export async function fetchGreenhouseJobs(limitPerBoard = 10): Promise<JobListing[]> {
  const results: JobListing[] = [];
  const nowIso = new Date().toISOString();

  await Promise.allSettled(
    GREENHOUSE_BOARDS.map(async ({ slug, company }) => {
      try {
        const data = (await fetchJsonWithTimeout(
          `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`,
          7000
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
          if (exp.experienceCheck === 'Exceeds 1 Yr') continue;

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
            sourceName: `Greenhouse (${company})`,
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

// 2. LEVER ATS BOARDS (Paytm, Meesho, Spotify, Palantir, Binance — Huge India Fintech/E-commerce Coverage!)
const LEVER_BOARDS = [
  { slug: 'paytm', company: 'Paytm' },
  { slug: 'meesho', company: 'Meesho' },
  { slug: 'spotify', company: 'Spotify' },
  { slug: 'palantir', company: 'Palantir' },
  { slug: 'binance', company: 'Binance' },
];

export async function fetchLeverJobs(limitPerBoard = 18): Promise<JobListing[]> {
  const results: JobListing[] = [];
  const nowIso = new Date().toISOString();

  await Promise.allSettled(
    LEVER_BOARDS.map(async ({ slug, company }) => {
      try {
        const items = (await fetchJsonWithTimeout(
          `https://api.lever.co/v0/postings/${slug}?mode=json`,
          7000
        )) as Array<{
          id: string;
          text: string;
          hostedUrl?: string;
          applyUrl?: string;
          createdAt?: number;
          descriptionPlain?: string;
          additionalPlain?: string;
          categories?: {
            location?: string;
            commitment?: string;
            department?: string;
            team?: string;
          };
          workplaceType?: string;
          lists?: Array<{ text?: string; content?: string }>;
        }>;
        if (!Array.isArray(items)) return;

        let added = 0;
        for (const item of items) {
          if (added >= limitPerBoard) break;
          const listsText = (item.lists || [])
            .map((l) => `${l.text || ''} ${stripHtml(l.content || '')}`)
            .join(' ');
          const desc = `${item.descriptionPlain || ''} ${listsText} ${item.additionalPlain || ''}`
            .replace(/\s+/g, ' ')
            .trim();
          const title = item.text || 'Associate';
          const deptHint = `${item.categories?.department || ''} ${item.categories?.team || ''}`;
          const category = classifyJobCategory(title, `${deptHint} ${desc}`);
          if (!category) continue;

          const exp = detectExperienceEligibility(title, desc);
          if (exp.experienceCheck === 'Exceeds 1 Yr') continue;

          const mba = detectMbaEligibility(title, '', desc);
          if (mba.qualificationCheck === 'Not MBA Eligible') continue;

          const locRaw = item.categories?.location || (slug === 'paytm' || slug === 'meesho' ? 'India' : 'Global');
          const parts = locRaw.split(',').map((s) => s.trim());
          const regionInfo = classifyRegionAndLocation(
            slug === 'paytm' || slug === 'meesho' ? 'India' : parts[parts.length - 1] || locRaw,
            parts[0] || locRaw,
            desc
          );

          const url = item.hostedUrl || item.applyUrl || '';
          if (!url.startsWith('http')) continue;

          const verificationStatus: VerificationStatus = 'Verified';
          const feedBucket = computeFeedBucket({
            verificationStatus,
            mbaEligible: mba.mbaEligible,
            experienceCheck: exp.experienceCheck,
          });

          const posted = item.createdAt
            ? new Date(item.createdAt).toISOString().slice(0, 10)
            : nowIso.slice(0, 10);

          const wp = (item.workplaceType || '').toLowerCase();
          const workMode: WorkMode =
            wp === 'remote'
              ? 'Remote'
              : wp === 'hybrid'
                ? 'Hybrid'
                : wp === 'on-site' || wp === 'onsite'
                  ? 'On-site'
                  : inferWorkMode(locRaw, desc);

          results.push({
            jobId: sanitizeId(`lv_${slug}_${item.id}`),
            title: title.slice(0, 195),
            company,
            region: regionInfo.region,
            country: regionInfo.country.slice(0, 95),
            city: regionInfo.city.slice(0, 95),
            workMode,
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
            skills: extractSkills(`${title} ${desc}`),
            salary: 'Not disclosed on public board',
            employmentType: item.categories?.commitment || 'Full-time',
            description: desc.slice(0, 3000) || `Official ${company} opening via Lever ATS.`,
            deadline: 'Rolling / Open',
            postedDate: posted,
            lastVerifiedDate: nowIso.slice(0, 10),
            sourceName: `Lever ATS (${company})`,
            originalJobUrl: url,
            sourceUrls: [url],
            applyUrl: item.applyUrl || url,
            recruiterInfo: `${company} Official Talent Portal`,
            visaSponsorship:
              regionInfo.region === 'India'
                ? 'Domestic India Role'
                : 'Work authorization required unless stated',
            verificationStatus,
            duplicateKey: computeDuplicateKey(company, title, regionInfo.country),
            visibility: 'public',
            createdBy: 'system',
          });
          added += 1;
        }
      } catch {
        // Continue resiliently
      }
    })
  );

  return results;
}

// 3. SMARTRECRUITERS PUBLIC ENTERPRISE API (Bosch Group, Experian — India & Global SAP/Finance/Risk)
const SMARTRECRUITERS_COMPANIES = [
  { id: 'BoschGroup', company: 'Bosch' },
  { id: 'Experian', company: 'Experian' },
];

export async function fetchSmartRecruitersJobs(limitPerCompany = 15): Promise<JobListing[]> {
  const results: JobListing[] = [];
  const nowIso = new Date().toISOString();

  await Promise.allSettled(
    SMARTRECRUITERS_COMPANIES.map(async ({ id, company }) => {
      try {
        const data = (await fetchJsonWithTimeout(
          `https://api.smartrecruiters.com/v1/companies/${id}/postings?limit=40`,
          7000
        )) as {
          content?: Array<{
            id: string;
            name: string;
            releasedDate?: string;
            location?: { city?: string; region?: string; country?: string; remote?: boolean };
            department?: { label?: string };
            experienceLevel?: { id?: string; label?: string };
            typeOfEmployment?: { label?: string };
          }>;
        };

        let added = 0;
        for (const item of data.content || []) {
          if (added >= limitPerCompany) break;
          const title = item.name || 'Analyst';
          const dept = item.department?.label || '';
          const expLabel = item.experienceLevel?.label || '';
          const category = classifyJobCategory(title, dept);
          if (!category) continue;

          // Exclude explicit mid-senior/executive SmartRecruiters experience levels
          const expLower = expLabel.toLowerCase();
          if (
            expLower.includes('mid-senior') ||
            expLower.includes('director') ||
            expLower.includes('executive')
          ) {
            continue;
          }

          const syntheticDesc = `${dept} ${expLabel} ${
            expLower.includes('entry') || expLower.includes('intern') ? '0-1 years entry level fresher' : ''
          }`;
          const exp = detectExperienceEligibility(title, syntheticDesc);
          if (exp.experienceCheck === 'Exceeds 1 Yr') continue;

          const mba = detectMbaEligibility(title, '', syntheticDesc);
          if (mba.qualificationCheck === 'Not MBA Eligible') continue;

          const countryCode = (item.location?.country || '').toLowerCase();
          const countryName = countryCode === 'in' ? 'India' : (item.location?.country || 'Global').toUpperCase();
          const regionInfo = classifyRegionAndLocation(
            countryName,
            item.location?.city || '',
            ''
          );

          const applyUrl = `https://jobs.smartrecruiters.com/${id}/${item.id}`;
          const verificationStatus: VerificationStatus = 'Verified';
          const feedBucket = computeFeedBucket({
            verificationStatus,
            mbaEligible: mba.mbaEligible,
            experienceCheck: exp.experienceCheck,
          });

          results.push({
            jobId: sanitizeId(`sr_${id}_${item.id}`),
            title: title.slice(0, 195),
            company,
            region: regionInfo.region,
            country: regionInfo.country.slice(0, 95),
            city: regionInfo.city.slice(0, 95),
            workMode: item.location?.remote ? 'Remote' : 'On-site',
            experienceRequired: expLabel || exp.experienceRequired,
            isFresherFriendly: exp.isFresherFriendly && mba.mbaEligible,
            experienceTier: exp.experienceTier,
            experienceCheck: exp.experienceCheck,
            mbaEligible: mba.mbaEligible,
            qualificationCheck: mba.qualificationCheck,
            feedBucket,
            educationRequired: mba.educationRequired,
            category,
            mbaSpecialization: category,
            skills: extractSkills(`${title} ${dept}`),
            salary: 'Not disclosed on public board',
            employmentType: item.typeOfEmployment?.label || 'Full-time',
            description: `${company} ${dept ? `(${dept}) ` : ''}official SmartRecruiters posting. Experience level: ${expLabel || 'Check official portal'}.`,
            deadline: 'Open / Rolling',
            postedDate: (item.releasedDate || nowIso).slice(0, 10),
            lastVerifiedDate: nowIso.slice(0, 10),
            sourceName: `SmartRecruiters (${company})`,
            originalJobUrl: applyUrl,
            sourceUrls: [applyUrl],
            applyUrl,
            recruiterInfo: `${company} Official Careers`,
            visaSponsorship:
              regionInfo.region === 'India'
                ? 'Domestic India Role'
                : 'Work authorization required unless stated',
            verificationStatus,
            duplicateKey: computeDuplicateKey(company, title, regionInfo.country),
            visibility: 'public',
            createdBy: 'system',
          });
          added += 1;
        }
      } catch {
        // Continue resiliently
      }
    })
  );

  return results;
}

// 4. ARBEITNOW PUBLIC JOB BOARD API
export async function fetchArbeitnowJobs(limit = 16): Promise<JobListing[]> {
  const results: JobListing[] = [];
  const nowIso = new Date().toISOString();
  try {
    const data = (await fetchJsonWithTimeout(
      'https://www.arbeitnow.com/api/job-board-api',
      7500
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
        sourceName: 'Arbeitnow Board',
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

// 5. REMOTIVE PUBLIC REMOTE API
export async function fetchRemotiveJobs(limit = 16): Promise<JobListing[]> {
  const results: JobListing[] = [];
  const nowIso = new Date().toISOString();
  const endpoints = [
    'https://remotive.com/api/remote-jobs?category=finance-legal&limit=25',
    'https://remotive.com/api/remote-jobs?category=marketing&limit=20',
    'https://remotive.com/api/remote-jobs?category=data&limit=20',
    'https://remotive.com/api/remote-jobs?category=business&limit=20',
  ];

  await Promise.allSettled(
    endpoints.map(async (url) => {
      try {
        const data = (await fetchJsonWithTimeout(url, 7500)) as {
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
            sourceName: 'Remotive API',
            originalJobUrl: item.url,
            sourceUrls: [item.url],
            applyUrl: item.url,
            recruiterInfo: 'Remotive Remote Board',
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

// 6. JOBICY PUBLIC REMOTE JOBS API
export async function fetchJobicyJobs(limit = 16): Promise<JobListing[]> {
  const results: JobListing[] = [];
  const nowIso = new Date().toISOString();
  try {
    const data = (await fetchJsonWithTimeout(
      'https://jobicy.com/api/v2/remote-jobs?count=40',
      7500
    )) as {
      jobs?: Array<{
        id: number;
        url: string;
        jobTitle: string;
        companyName: string;
        jobIndustry?: string[];
        jobType?: string[];
        jobGeo?: string;
        jobLevel?: string;
        jobExcerpt?: string;
        jobDescription?: string;
        pubDate?: string;
        annualSalaryMin?: string;
        annualSalaryMax?: string;
        salaryCurrency?: string;
      }>;
    };

    for (const item of data.jobs || []) {
      if (results.length >= limit) break;
      const title = stripHtml(item.jobTitle || '');
      const desc = stripHtml(item.jobDescription || item.jobExcerpt || '');
      const industryText = (item.jobIndustry || []).join(' ');
      const category = classifyJobCategory(title, `${industryText} ${desc}`);
      if (!category) continue;

      const levelText = item.jobLevel || '';
      if (/senior|director|vp|executive|lead/i.test(levelText)) continue;

      const exp = detectExperienceEligibility(title, `${levelText} ${desc}`);
      if (exp.experienceCheck === 'Exceeds 1 Yr') continue;

      const mba = detectMbaEligibility(title, '', desc);
      if (mba.qualificationCheck === 'Not MBA Eligible') continue;

      const geo = item.jobGeo || 'Anywhere / Remote';
      const regionInfo = classifyRegionAndLocation(geo, 'Remote', desc);
      const verificationStatus: VerificationStatus = 'Partially Verified';
      const feedBucket = computeFeedBucket({
        verificationStatus,
        mbaEligible: mba.mbaEligible,
        experienceCheck: exp.experienceCheck,
      });

      const salaryStr =
        item.annualSalaryMin && item.annualSalaryMax
          ? `${item.salaryCurrency || 'USD'} ${item.annualSalaryMin}–${item.annualSalaryMax}`
          : 'Not specified';

      results.push({
        jobId: sanitizeId(`jb_${item.id}`),
        title: title.slice(0, 195),
        company: stripHtml(item.companyName || 'Employer').slice(0, 155),
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
        skills: extractSkills(`${title} ${desc}`),
        salary: salaryStr.slice(0, 115),
        employmentType: item.jobType?.[0] || 'Full-time',
        description: desc.slice(0, 3000),
        deadline: 'Open',
        postedDate: (item.pubDate || nowIso).slice(0, 10),
        lastVerifiedDate: nowIso.slice(0, 10),
        sourceName: 'Jobicy API',
        originalJobUrl: item.url,
        sourceUrls: [item.url],
        applyUrl: item.url,
        recruiterInfo: 'Jobicy Public Job Feed',
        visaSponsorship: `Remote geo: ${geo}`,
        verificationStatus,
        duplicateKey: computeDuplicateKey(item.companyName || 'Employer', title, regionInfo.country),
        visibility: 'public',
        createdBy: 'system',
      });
    }
  } catch {
    // Graceful fallback
  }
  return results;
}

// 7. HIMALAYAS PUBLIC JOBS API
export async function fetchHimalayasJobs(limit = 16): Promise<JobListing[]> {
  const results: JobListing[] = [];
  const nowIso = new Date().toISOString();
  try {
    const data = (await fetchJsonWithTimeout(
      'https://himalayas.app/jobs/api?limit=40',
      7500
    )) as {
      jobs?: Array<{
        guid?: string;
        title: string;
        companyName: string;
        excerpt?: string;
        description?: string;
        locationRestrictions?: string[];
        categories?: string[];
        seniority?: string[];
        employmentType?: string;
        applicationLink?: string;
        pubDate?: number;
        minSalary?: number;
        maxSalary?: number;
        currency?: string;
      }>;
    };

    for (const item of data.jobs || []) {
      if (results.length >= limit) break;
      const title = item.title || '';
      const desc = stripHtml(item.description || item.excerpt || '');
      const catHint = (item.categories || []).join(' ');
      const category = classifyJobCategory(title, `${catHint} ${desc}`);
      if (!category) continue;

      const seniorityText = (item.seniority || []).join(' ');
      if (/senior|manager|director|executive|principal/i.test(seniorityText)) continue;

      const exp = detectExperienceEligibility(title, `${seniorityText} ${desc}`);
      if (exp.experienceCheck === 'Exceeds 1 Yr') continue;

      const mba = detectMbaEligibility(title, '', desc);
      if (mba.qualificationCheck === 'Not MBA Eligible') continue;

      const loc = (item.locationRestrictions || []).join(', ') || 'Worldwide';
      const regionInfo = classifyRegionAndLocation(loc, 'Remote', desc);
      const applyUrl = item.applicationLink || item.guid || '';
      if (!applyUrl.startsWith('http')) continue;

      const verificationStatus: VerificationStatus = 'Partially Verified';
      const feedBucket = computeFeedBucket({
        verificationStatus,
        mbaEligible: mba.mbaEligible,
        experienceCheck: exp.experienceCheck,
      });

      const posted = item.pubDate
        ? new Date(item.pubDate * 1000).toISOString().slice(0, 10)
        : nowIso.slice(0, 10);

      const salaryStr =
        item.minSalary && item.maxSalary
          ? `${item.currency || 'USD'} ${item.minSalary.toLocaleString()}–${item.maxSalary.toLocaleString()}`
          : 'Not specified';

      results.push({
        jobId: sanitizeId(`hm_${item.companyName}_${title}_${posted}`),
        title: title.slice(0, 195),
        company: (item.companyName || 'Employer').slice(0, 155),
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
        skills: extractSkills(`${title} ${desc}`),
        salary: salaryStr.slice(0, 115),
        employmentType: item.employmentType || 'Full-time',
        description: desc.slice(0, 3000),
        deadline: 'Open',
        postedDate: posted,
        lastVerifiedDate: nowIso.slice(0, 10),
        sourceName: 'Himalayas API',
        originalJobUrl: applyUrl,
        sourceUrls: [applyUrl],
        applyUrl,
        recruiterInfo: 'Himalayas Verified Feed',
        visaSponsorship: `Location scope: ${loc}`,
        verificationStatus,
        duplicateKey: computeDuplicateKey(item.companyName || 'Employer', title, regionInfo.country),
        visibility: 'public',
        createdBy: 'system',
      });
    }
  } catch {
    // Graceful fallback
  }
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
      !finalHost.includes('smartrecruiters.com') &&
      !finalHost.includes('ashbyhq.com') &&
      !finalHost.includes('naukri.com') &&
      !finalHost.includes('internshala.com') &&
      !finalHost.includes('foundit.in') &&
      !finalHost.includes('unstop.com') &&
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

  // Ranking: 1. India First, 2. Verified Bucket, 3. Finance Jobs Priority, 4. Newest Posted Date
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
