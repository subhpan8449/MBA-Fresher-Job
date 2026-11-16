import { GoogleGenAI, Type } from '@google/genai';
import type {
  ApplicationAssistantOutput,
  CandidateProfile,
  JobCategory,
  JobListing,
  JobMatchResult,
  ResumeAnalysisOutput,
  VerificationStatus,
} from '../src/types.ts';
import {
  classifyJobCategory,
  classifyRegionAndLocation,
  computeDuplicateKey,
  computeFeedBucket,
  detectExperienceEligibility,
  detectMbaEligibility,
  sanitizeId,
  verifyJobUrlHealth,
} from './jobConnectors.ts';

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in server environment.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export interface AiProviderStatus {
  id: string;
  name: string;
  models: string[];
  configured: boolean;
  active: boolean;
}

const usageStats = {
  requestsToday: 0,
  estimatedSpendUsd: 0,
  dailyCapUsd: 25,
  lastResetDate: new Date().toISOString().slice(0, 10),
};

function trackAiUsage(estimatedCostUsd: number): void {
  const today = new Date().toISOString().slice(0, 10);
  if (usageStats.lastResetDate !== today) {
    usageStats.requestsToday = 0;
    usageStats.estimatedSpendUsd = 0;
    usageStats.lastResetDate = today;
  }
  if (usageStats.estimatedSpendUsd + estimatedCostUsd > usageStats.dailyCapUsd) {
    throw new Error('Daily AI spend cap reached. Owner approval required to raise limit.');
  }
  usageStats.requestsToday += 1;
  usageStats.estimatedSpendUsd = Number((usageStats.estimatedSpendUsd + estimatedCostUsd).toFixed(4));
}

export function getAiSystemTelemetry() {
  const providers: AiProviderStatus[] = [
    {
      id: 'gemini',
      name: 'Google Gemini (Primary)',
      models: ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'],
      configured: Boolean(process.env.GEMINI_API_KEY),
      active: true,
    },
    {
      id: 'openai',
      name: 'OpenAI (Optional Adapter)',
      models: ['gpt-4o', 'gpt-4o-mini'],
      configured: Boolean(process.env.OPENAI_API_KEY),
      active: false,
    },
    {
      id: 'anthropic',
      name: 'Anthropic Claude (Optional Adapter)',
      models: ['claude-3-7-sonnet'],
      configured: Boolean(process.env.ANTHROPIC_API_KEY),
      active: false,
    },
  ];
  return {
    providers,
    usage: { ...usageStats },
  };
}

export function updateDailySpendCap(newCapUsd: number): void {
  if (newCapUsd >= 1 && newCapUsd <= 5000) {
    usageStats.dailyCapUsd = newCapUsd;
  }
}

// 1. India-First Global MBA Fresher Job Discovery via Google Search Grounding
export async function discoverJobsWithGemini(params: {
  category: JobCategory | 'All';
  country: string;
  city?: string;
  roleQuery?: string;
  actorUid: string;
}): Promise<{ jobs: JobListing[]; groundingSources: Array<{ title: string; url: string }> }> {
  trackAiUsage(0.015);
  const ai = getGeminiClient();

  const focusCategory =
    params.category === 'All'
      ? 'Finance Jobs (Financial Analyst, FP&A, Corporate Finance, Audit, Treasury, Banking Ops, Risk)'
      : params.category;

  const targetRegion =
    params.country && params.country !== 'Global'
      ? `${params.country}${params.city && params.city !== 'All India' ? ` (${params.city})` : ''}`
      : 'India FIRST (Mumbai, Delhi NCR, Bengaluru, Hyderabad, Pune, Gurugram, Noida, Chennai, Kolkata, Haldwani), plus select International opportunities';

  const prompt = `Search for real, currently open MBA Fresher (0 to 1 year experience ONLY, freshers, or MBA Graduate Trainee) job postings.
Category Priority: ${focusCategory}
Target Location Priority: ${targetRegion}
Specific Role Focus: ${params.roleQuery || 'MBA fresher'}

CRITICAL RULES:
1. STRICT MBA ELIGIBILITY: Find roles open to MBA / PGDM graduates (Finance, Marketing, Business Analytics, SAP FICO, HR, Operations, International Business). EXCLUDE undergraduate-only roles.
2. STRICT EXPERIENCE LIMIT: ONLY include 0 years, freshers, 0-1 years, or MBA graduate trainee positions. HARD EXCLUDE anything requiring > 1 year (2+ years, 2-3 years, mid-level, senior, managerial).
3. REAL JOBS ONLY: Only extract genuine postings found in Google Search results (Naukri, LinkedIn public jobs, Indeed, Foundit, Internshala, Workday, Greenhouse, Lever, company career pages). NEVER invent URLs, salaries, recruiter names, or deadlines.
4. Preserve the original job URL and official application URL.
5. If discovered on social media (e.g. LinkedIn public post), explicitly set sourceName to "Social Media Public Post" and mark unverified details transparently.
6. Return up to 8 listings in JSON.`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          jobs: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                company: { type: Type.STRING },
                country: { type: Type.STRING },
                city: { type: Type.STRING },
                workMode: { type: Type.STRING },
                experienceRequired: { type: Type.STRING },
                educationRequired: { type: Type.STRING },
                mbaSpecialization: { type: Type.STRING },
                skills: { type: Type.ARRAY, items: { type: Type.STRING } },
                salary: { type: Type.STRING },
                employmentType: { type: Type.STRING },
                description: { type: Type.STRING },
                deadline: { type: Type.STRING },
                postedDate: { type: Type.STRING },
                sourceName: { type: Type.STRING },
                originalJobUrl: { type: Type.STRING },
                applyUrl: { type: Type.STRING },
                recruiterInfo: { type: Type.STRING },
                visaSponsorship: { type: Type.STRING },
              },
              required: ['title', 'company', 'country', 'experienceRequired', 'educationRequired', 'applyUrl'],
            },
          },
        },
      },
    },
  });

  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const groundingSources = chunks
    .map((c) => ({
      title: c.web?.title || 'Search Source',
      url: c.web?.uri || '',
    }))
    .filter((s) => s.url.startsWith('http'));

  let parsed: { jobs?: Array<Record<string, unknown>> } = {};
  try {
    parsed = JSON.parse((response.text || '{}').trim());
  } catch {
    parsed = { jobs: [] };
  }

  const nowIso = new Date().toISOString();
  const normalizedJobs: JobListing[] = [];

  for (const raw of parsed.jobs || []) {
    const applyUrl = typeof raw.applyUrl === 'string' ? raw.applyUrl.trim() : '';
    const originalJobUrl =
      typeof raw.originalJobUrl === 'string' && raw.originalJobUrl.startsWith('http')
        ? raw.originalJobUrl.trim()
        : applyUrl;
    if (!applyUrl.startsWith('http')) continue;

    const title = String(raw.title || 'MBA Analyst').slice(0, 195);
    const company = String(raw.company || 'Employer').slice(0, 155);
    const desc = String(raw.description || '').slice(0, 4000);
    const expReqRaw = String(raw.experienceRequired || '');
    const eduReqRaw = String(raw.educationRequired || '');

    const exp = detectExperienceEligibility(title, `${expReqRaw} ${desc}`);
    // HARD EXCLUSION: Exclude > 1 year experience
    if (exp.experienceCheck === 'Exceeds 1 Yr') continue;

    const mba = detectMbaEligibility(title, eduReqRaw, desc);
    if (mba.qualificationCheck === 'Not MBA Eligible') continue;

    const regionInfo = classifyRegionAndLocation(
      String(raw.country || params.country || 'India'),
      String(raw.city || params.city || ''),
      desc
    );

    const detectedCategory =
      classifyJobCategory(title, desc) ||
      (params.category !== 'All' ? params.category : 'Finance Jobs');

    const workModeRaw = String(raw.workMode || 'Unspecified');
    const workMode =
      workModeRaw === 'Remote' || workModeRaw === 'Hybrid' || workModeRaw === 'On-site'
        ? workModeRaw
        : 'Unspecified';

    const sourceName = String(raw.sourceName || 'Google Search Grounding').slice(0, 115);
    const isSocialPost = sourceName.toLowerCase().includes('social') || applyUrl.includes('/posts/');
    const hasGroundingMatch = groundingSources.some(
      (s) => s.url === applyUrl || s.url === originalJobUrl || applyUrl.includes('greenhouse') || applyUrl.includes('lever')
    );

    // Never label an unverified social media post as a confirmed vacancy
    const verificationStatus: VerificationStatus = isSocialPost
      ? 'Unverified'
      : hasGroundingMatch
        ? 'Verified'
        : 'Partially Verified';

    const feedBucket = computeFeedBucket({
      verificationStatus,
      mbaEligible: mba.mbaEligible,
      experienceCheck: exp.experienceCheck,
    });

    const jobId = sanitizeId(`ai_${company}_${title}_${Date.now().toString(36).slice(-4)}`);

    normalizedJobs.push({
      jobId,
      title,
      company,
      region: regionInfo.region,
      country: regionInfo.country.slice(0, 95),
      city: regionInfo.city.slice(0, 95),
      workMode,
      experienceRequired: expReqRaw || exp.experienceRequired,
      isFresherFriendly: exp.isFresherFriendly && mba.mbaEligible,
      experienceTier: exp.experienceTier,
      experienceCheck: exp.experienceCheck,
      mbaEligible: mba.mbaEligible,
      qualificationCheck: mba.qualificationCheck,
      feedBucket,
      educationRequired: mba.educationRequired,
      category: detectedCategory,
      mbaSpecialization: String(raw.mbaSpecialization || detectedCategory).slice(0, 115),
      skills: Array.isArray(raw.skills) ? raw.skills.map(String).slice(0, 15) : [],
      salary: String(raw.salary || 'Not specified').slice(0, 115),
      employmentType: String(raw.employmentType || 'Full-time').slice(0, 75),
      description: desc || 'Discovered via live Search Grounding. Inspect original link for full details.',
      deadline: String(raw.deadline || 'Not specified').slice(0, 75),
      postedDate: String(raw.postedDate || nowIso.slice(0, 10)).slice(0, 75),
      lastVerifiedDate: nowIso.slice(0, 10),
      sourceName,
      originalJobUrl,
      sourceUrls: Array.from(new Set([originalJobUrl, applyUrl, ...groundingSources.slice(0, 3).map((s) => s.url)])),
      applyUrl,
      recruiterInfo: String(raw.recruiterInfo || 'Not publicly listed').slice(0, 290),
      visaSponsorship:
        regionInfo.region === 'India'
          ? 'Domestic India Role'
          : String(raw.visaSponsorship || 'Work authorization required unless stated').slice(0, 150),
      verificationStatus,
      duplicateKey: computeDuplicateKey(company, title, regionInfo.country),
      visibility: 'public',
      createdBy: params.actorUid,
    });
  }

  return { jobs: normalizedJobs, groundingSources };
}

// 2. Job Verification, MBA Eligibility & <=1 Yr Experience Audit Agent
export async function verifyJobWithGemini(job: Partial<JobListing>): Promise<{
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
  trackAiUsage(0.008);
  const url = job.applyUrl || '';
  const health = url.startsWith('http')
    ? await verifyJobUrlHealth(url)
    : {
        reachable: false,
        httpStatus: 0,
        finalUrl: url,
        redirected: false,
        suspiciousRedirect: false,
        pageSnippet: '',
      };

  const ai = getGeminiClient();
  const prompt = `Audit this job posting strictly for MBA Eligibility, <=1 Year Experience, Expiry, and Scam Signals.
Title: ${job.title || ''}
Company: ${job.company || ''}
Apply URL: ${url}
HTTP Reachable: ${health.reachable} (status ${health.httpStatus})
Suspicious Redirect: ${health.suspiciousRedirect}
Page Text Snippet: ${health.pageSnippet.slice(0, 1500)}
Description: ${(job.description || '').slice(0, 1500)}

Rules:
- If HTTP 404/410 or text says "closed", "expired", "no longer accepting", status MUST be "Expired".
- If scam cues (registration fee, security deposit, WhatsApp-only personal Gmail asking for money, suspicious redirect), status MUST be "Suspicious" and explain in scamWarning.
- If confirmed open & matches company/role, status is "Verified".
- Check MBA eligibility and whether required experience is strictly <= 1 year.`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          verificationStatus: { type: Type.STRING },
          scamWarning: { type: Type.STRING },
          auditNotes: { type: Type.STRING },
        },
        required: ['verificationStatus', 'auditNotes'],
      },
    },
  });

  let parsed: { verificationStatus?: string; scamWarning?: string; auditNotes?: string } = {};
  try {
    parsed = JSON.parse((response.text || '{}').trim());
  } catch {
    parsed = {};
  }

  const combinedText = `${job.description || ''} ${health.pageSnippet}`;
  const exp = detectExperienceEligibility(job.title || '', combinedText);
  const mba = detectMbaEligibility(job.title || '', job.educationRequired || '', combinedText);

  const allowed: VerificationStatus[] = ['Verified', 'Partially Verified', 'Unverified', 'Expired', 'Suspicious'];
  let status: VerificationStatus = allowed.includes(parsed.verificationStatus as VerificationStatus)
    ? (parsed.verificationStatus as VerificationStatus)
    : health.reachable
      ? 'Verified'
      : 'Partially Verified';

  if (health.httpStatus === 404 || health.httpStatus === 410) status = 'Expired';
  if (health.suspiciousRedirect) status = 'Suspicious';

  const feedBucket = computeFeedBucket({
    verificationStatus: status,
    mbaEligible: mba.mbaEligible,
    experienceCheck: exp.experienceCheck,
  });

  return {
    verificationStatus: status,
    httpStatus: health.httpStatus,
    isFresherFriendly: exp.isFresherFriendly && mba.mbaEligible,
    mbaEligible: mba.mbaEligible,
    qualificationCheck: mba.qualificationCheck,
    experienceCheck: exp.experienceCheck,
    experienceTier: exp.experienceTier,
    feedBucket,
    scamWarning: parsed.scamWarning || (status === 'Suspicious' ? 'Suspicious redirect or fee warning detected.' : ''),
    auditNotes: parsed.auditNotes || `HTTP ${health.httpStatus} check completed.`,
    finalUrl: health.finalUrl,
  };
}

// 3. Screenshot OCR Extractor (Distinguishes extractedClaims from verified facts)
export async function extractJobFromScreenshot(params: {
  base64Data: string;
  mimeType: string;
  actorUid: string;
}): Promise<{ job: JobListing; unverifiedNotes: string }> {
  trackAiUsage(0.012);
  const ai = getGeminiClient();

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: params.mimeType,
            data: params.base64Data,
          },
        },
        {
          text: `Perform strict OCR on this job screenshot/flyer.
Distinguish what was extracted from the image vs what cannot be independently verified.
NEVER invent a URL, salary, recruiter name, or deadline. If an official apply URL is missing, leave applyUrl empty.`,
        },
      ],
    },
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          company: { type: Type.STRING },
          country: { type: Type.STRING },
          city: { type: Type.STRING },
          workMode: { type: Type.STRING },
          experienceRequired: { type: Type.STRING },
          educationRequired: { type: Type.STRING },
          skills: { type: Type.ARRAY, items: { type: Type.STRING } },
          salary: { type: Type.STRING },
          deadline: { type: Type.STRING },
          applyUrl: { type: Type.STRING },
          recruiterInfo: { type: Type.STRING },
          description: { type: Type.STRING },
          extractedClaims: { type: Type.STRING },
          unverifiedNotes: { type: Type.STRING },
        },
        required: ['title', 'company', 'description', 'extractedClaims', 'unverifiedNotes'],
      },
    },
  });

  const parsed = JSON.parse((response.text || '{}').trim()) as Record<string, unknown>;
  const title = String(parsed.title || 'Extracted Role').slice(0, 195);
  const company = String(parsed.company || 'Unverified Employer').slice(0, 155);
  const desc = String(parsed.description || '').slice(0, 4000);
  const eduRaw = String(parsed.educationRequired || '');
  const expRaw = String(parsed.experienceRequired || '');

  const category = classifyJobCategory(title, desc) || 'Finance Jobs';
  const exp = detectExperienceEligibility(title, `${expRaw} ${desc}`);
  const mba = detectMbaEligibility(title, eduRaw, desc);
  const regionInfo = classifyRegionAndLocation(
    String(parsed.country || 'India'),
    String(parsed.city || ''),
    desc
  );

  const rawUrl = String(parsed.applyUrl || '').trim();
  const hasRealUrl = rawUrl.startsWith('http');
  const verificationStatus: VerificationStatus = 'Unverified';
  const feedBucket = computeFeedBucket({
    verificationStatus,
    mbaEligible: mba.mbaEligible,
    experienceCheck: exp.experienceCheck,
  });

  const nowIso = new Date().toISOString();
  const job: JobListing = {
    jobId: sanitizeId(`ocr_${company}_${title}_${Date.now().toString(36).slice(-4)}`),
    title,
    company,
    region: regionInfo.region,
    country: regionInfo.country.slice(0, 95),
    city: regionInfo.city.slice(0, 95),
    workMode:
      parsed.workMode === 'Remote' || parsed.workMode === 'Hybrid' || parsed.workMode === 'On-site'
        ? (parsed.workMode as JobListing['workMode'])
        : 'Unspecified',
    experienceRequired: expRaw || exp.experienceRequired,
    isFresherFriendly: exp.isFresherFriendly && mba.mbaEligible,
    experienceTier: exp.experienceTier,
    experienceCheck: exp.experienceCheck,
    mbaEligible: mba.mbaEligible,
    qualificationCheck: mba.qualificationCheck,
    feedBucket,
    educationRequired: mba.educationRequired,
    category,
    mbaSpecialization: category,
    skills: Array.isArray(parsed.skills) ? parsed.skills.map(String).slice(0, 15) : [],
    salary: String(parsed.salary || 'Not visible in screenshot').slice(0, 115),
    employmentType: 'Full-time',
    description: desc,
    deadline: String(parsed.deadline || 'Not visible in screenshot').slice(0, 75),
    postedDate: nowIso.slice(0, 10),
    lastVerifiedDate: nowIso.slice(0, 10),
    sourceName: 'Screenshot OCR (Unverified Claim)',
    originalJobUrl: hasRealUrl ? rawUrl : 'https://unverified-screenshot-upload.invalid',
    sourceUrls: hasRealUrl ? [rawUrl] : [],
    applyUrl: hasRealUrl ? rawUrl : 'https://unverified-screenshot-upload.invalid',
    recruiterInfo: String(parsed.recruiterInfo || 'Not specified').slice(0, 290),
    visaSponsorship: regionInfo.region === 'India' ? 'Domestic India Role' : 'Not specified',
    extractedClaims: String(parsed.extractedClaims || 'Extracted from uploaded screenshot; awaiting independent URL verification.').slice(0, 1400),
    verificationStatus,
    duplicateKey: computeDuplicateKey(company, title, regionInfo.country),
    visibility: 'public',
    createdBy: params.actorUid,
  };

  return {
    job,
    unverifiedNotes: String(parsed.unverifiedNotes || 'Extracted via OCR; verify directly on official company website.'),
  };
}

// 4. Resume Analysis Agent
export async function analyzeResumeWithGemini(params: {
  resumeText?: string;
  fileBase64?: string;
  fileMimeType?: string;
  targetSpecialization?: string;
}): Promise<ResumeAnalysisOutput> {
  trackAiUsage(0.01);
  const ai = getGeminiClient();

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
  if (params.fileBase64 && params.fileMimeType) {
    parts.push({
      inlineData: {
        mimeType: params.fileMimeType,
        data: params.fileBase64,
      },
    });
  }
  parts.push({
    text: `Analyze this MBA fresher candidate resume honestly for target category: ${params.targetSpecialization || 'Finance Jobs'}.
Resume Text:
${(params.resumeText || '').slice(0, 10000)}

RULES:
- NEVER fabricate qualifications, internships, or certifications not present in the resume.
- Extract true skills, certifications, MBA specialization, and honest ATS readiness notes.`,
  });

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: { parts },
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          candidateSummary: { type: Type.STRING },
          detectedSpecialization: { type: Type.STRING },
          experienceLevel: { type: Type.STRING },
          extractedSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
          extractedCertifications: { type: Type.ARRAY, items: { type: Type.STRING } },
          atsReadinessNotes: { type: Type.ARRAY, items: { type: Type.STRING } },
          missingFresherSignals: { type: Type.ARRAY, items: { type: Type.STRING } },
          recommendedJobTitles: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: [
          'candidateSummary',
          'detectedSpecialization',
          'experienceLevel',
          'extractedSkills',
          'atsReadinessNotes',
          'recommendedJobTitles',
        ],
      },
    },
  });

  return JSON.parse((response.text || '{}').trim()) as ResumeAnalysisOutput;
}

// 5. Candidate Matching Agent
export async function scoreCandidateJobMatches(
  profile: Partial<CandidateProfile>,
  jobs: JobListing[]
): Promise<JobMatchResult[]> {
  if (jobs.length === 0) return [];
  trackAiUsage(0.01);
  const ai = getGeminiClient();

  const compactJobs = jobs.slice(0, 20).map((j) => ({
    jobId: j.jobId,
    title: j.title,
    company: j.company,
    category: j.category,
    region: j.region,
    country: j.country,
    city: j.city,
    workMode: j.workMode,
    experienceRequired: j.experienceRequired,
    qualificationCheck: j.qualificationCheck,
    skills: j.skills || [],
    visaSponsorship: j.visaSponsorship,
    postedDate: j.postedDate,
  }));

  const prompt = `Score how well this MBA candidate matches each job from 0 to 100.
Candidate:
- Specialization: ${profile.mbaSpecialization || 'Finance'}
- Experience: ${profile.experienceYears || '0-1 Years'}
- Skills: ${(profile.skills || []).join(', ')}
- Certifications: ${(profile.certifications || []).join(', ')}
- Country & Preferred Cities: ${profile.country || 'India'} / ${(profile.preferredLocations || []).join(', ')}
- Remote Preference: ${profile.remotePreference || 'Any'}
- Work Authorization: ${profile.visaStatus || 'Standard'}
- Resume Summary: ${(profile.resumeSummary || '').slice(0, 1200)}

Jobs:
${JSON.stringify(compactJobs)}

STRICT FAIRNESS RULES:
- Score ONLY on MBA specialization, <=1 yr experience fit, skills, location/work authorization, and freshness.
- NEVER penalize on college ranking, age, gender, religion, caste, or disability.`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            jobId: { type: Type.STRING },
            matchScore: { type: Type.NUMBER },
            reasons: { type: Type.ARRAY, items: { type: Type.STRING } },
            missingRequirements: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['jobId', 'matchScore', 'reasons', 'missingRequirements'],
        },
      },
    },
  });

  return JSON.parse((response.text || '[]').trim()) as JobMatchResult[];
}

// 6. Comprehensive Job Application Intelligence & Scam Check
export async function generateApplicationAssistant(
  job: JobListing,
  profile: Partial<CandidateProfile>
): Promise<ApplicationAssistantOutput> {
  trackAiUsage(0.014);
  const ai = getGeminiClient();

  const prompt = `Prepare complete, truthful MBA application intelligence for this candidate and job.

JOB:
- Title: ${job.title}
- Company: ${job.company}
- Region & Location: ${job.region} (${job.city ? `${job.city}, ` : ''}${job.country}) · ${job.workMode}
- Category: ${job.category}
- MBA Eligibility Check: ${job.qualificationCheck} (${job.educationRequired || ''})
- Experience Requirement: ${job.experienceRequired} (${job.experienceCheck})
- Skills: ${(job.skills || []).join(', ')}
- Visa / Authorization: ${job.visaSponsorship || 'Not specified'}
- Deadline: ${job.deadline || 'Not specified'}
- Official URL: ${job.applyUrl}
- Description: ${(job.description || '').slice(0, 3000)}

CANDIDATE:
- Name: ${profile.name || 'Candidate'}
- Specialization: ${profile.mbaSpecialization || 'MBA'}
- Experience: ${profile.experienceYears || '0-1 Years'}
- Skills: ${(profile.skills || []).join(', ')}
- Certifications: ${(profile.certifications || []).join(', ')}
- Resume Summary: ${(profile.resumeSummary || '').slice(0, 2000)}

RULES:
- NEVER fabricate qualifications or metrics.
- Include explicit eligibility analysis, required skills, scam warnings (if unverified/social post/fee cues or "No scam signals detected"), work authorization reminder if International, and full interview prep.`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          eligibilityAnalysis: { type: Type.STRING },
          relevanceExplanation: { type: Type.STRING },
          eligibilityRequirements: { type: Type.ARRAY, items: { type: Type.STRING } },
          requiredSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
          requiredDocuments: { type: Type.ARRAY, items: { type: Type.STRING } },
          resumeModifications: { type: Type.ARRAY, items: { type: Type.STRING } },
          atsKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
          coverLetterRequired: { type: Type.STRING },
          coverLetterDraft: { type: Type.STRING },
          suggestedEmailSubject: { type: Type.STRING },
          recruiterMessage: { type: Type.STRING },
          stepByStepGuide: { type: Type.ARRAY, items: { type: Type.STRING } },
          likelyFormQuestions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                truthfulAnswerGuidance: { type: Type.STRING },
              },
              required: ['question', 'truthfulAnswerGuidance'],
            },
          },
          interviewPrep: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                strategy: { type: Type.STRING },
              },
              required: ['question', 'strategy'],
            },
          },
          importantDeadline: { type: Type.STRING },
          scamWarning: { type: Type.STRING },
          officialApplyUrl: { type: Type.STRING },
        },
        required: [
          'eligibilityAnalysis',
          'relevanceExplanation',
          'eligibilityRequirements',
          'requiredSkills',
          'requiredDocuments',
          'resumeModifications',
          'atsKeywords',
          'coverLetterRequired',
          'coverLetterDraft',
          'suggestedEmailSubject',
          'recruiterMessage',
          'stepByStepGuide',
          'likelyFormQuestions',
          'interviewPrep',
          'importantDeadline',
          'scamWarning',
          'officialApplyUrl',
        ],
      },
    },
  });

  const parsed = JSON.parse((response.text || '{}').trim()) as ApplicationAssistantOutput;
  parsed.officialApplyUrl = job.applyUrl;
  return parsed;
}
