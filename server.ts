import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import type {
  CandidateProfile,
  FeedBucket,
  JobCategory,
  JobListing,
  JobRegion,
  PaginatedJobsResponse,
} from './src/types.ts';
import {
  analyzeResumeWithGemini,
  discoverJobsWithGemini,
  extractJobFromScreenshot,
  generateApplicationAssistant,
  getAiSystemTelemetry,
  scoreCandidateJobMatches,
  updateDailySpendCap,
  verifyJobWithGemini,
} from './server/aiEngine.ts';
import {
  createRateLimiter,
  requireAuth,
  requireOwner,
  type AuthenticatedRequest,
} from './server/authMiddleware.ts';
import {
  deduplicateAndRankJobs,
  fetchArbeitnowJobs,
  fetchGreenhouseJobs,
  fetchRemotiveJobs,
} from './server/jobConnectors.ts';

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

// Cached server-side ATS pool + background refresh state
let liveJobsCache: JobListing[] = [];
let liveJobsCacheUpdatedAt = 0;
let refreshInFlight: Promise<JobListing[]> | null = null;

async function refreshLivePublicAtsJobs(force = false): Promise<JobListing[]> {
  const now = Date.now();
  if (!force && liveJobsCache.length > 0 && now - liveJobsCacheUpdatedAt < 10 * 60 * 1000) {
    return liveJobsCache;
  }
  if (refreshInFlight) {
    return refreshInFlight;
  }
  refreshInFlight = (async () => {
    try {
      const [gh, an, rm] = await Promise.all([
        fetchGreenhouseJobs(8),
        fetchArbeitnowJobs(15),
        fetchRemotiveJobs(12),
      ]);
      const ranked = deduplicateAndRankJobs([...gh, ...an, ...rm]);
      liveJobsCache = ranked;
      liveJobsCacheUpdatedAt = Date.now();
      return ranked;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

// Background warm-up on boot (non-blocking)
void refreshLivePublicAtsJobs(false).catch(() => {});

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  const aiLimiter = createRateLimiter(15, 60 * 1000);

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
  });

  // Server-side Paginated, Cached, India-First Job Query API
  app.get('/api/jobs/live', async (req, res) => {
    try {
      const force = req.query.refresh === 'true';
      const allJobs = await refreshLivePublicAtsJobs(force);

      const category = typeof req.query.category === 'string' ? req.query.category : 'All';
      const region = typeof req.query.region === 'string' ? req.query.region : 'All';
      const city = typeof req.query.city === 'string' ? req.query.city : '';
      const bucket = typeof req.query.bucket === 'string' ? req.query.bucket : 'All';
      const workMode = typeof req.query.workMode === 'string' ? req.query.workMode : 'All';
      const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';
      const page = Math.max(1, Number(req.query.page || 1));
      const limit = Math.min(30, Math.max(4, Number(req.query.limit || 12)));

      const countsByBucket: Record<FeedBucket, number> = {
        'Verified MBA Fresher Jobs': 0,
        'Partially Verified Jobs': 0,
        'Needs Eligibility Verification': 0,
        'Expired or Closed Jobs': 0,
      };
      const countsByRegion: Record<JobRegion, number> = {
        India: 0,
        International: 0,
      };
      const countsByCategory: Record<JobCategory, number> = {
        'Finance Jobs': 0,
        'SAP FICO Jobs': 0,
        'Business Analytics Jobs': 0,
        'Marketing Jobs': 0,
      };

      for (const job of allJobs) {
        countsByBucket[job.feedBucket] = (countsByBucket[job.feedBucket] || 0) + 1;
        countsByRegion[job.region] = (countsByRegion[job.region] || 0) + 1;
        countsByCategory[job.category] = (countsByCategory[job.category] || 0) + 1;
      }

      const filtered = allJobs.filter((job) => {
        if (category !== 'All' && job.category !== category) return false;
        if (region !== 'All' && job.region !== region) return false;
        if (bucket !== 'All' && job.feedBucket !== bucket) return false;
        if (workMode !== 'All' && job.workMode !== workMode) return false;

        if (city && city !== 'All India') {
          if (city === 'Other Indian cities') {
            const major = [
              'delhi',
              'ncr',
              'mumbai',
              'bengaluru',
              'bangalore',
              'hyderabad',
              'pune',
              'chennai',
              'kolkata',
              'noida',
              'gurugram',
              'gurgaon',
              'ahmedabad',
              'jaipur',
              'lucknow',
              'haldwani',
            ];
            const cLower = (job.city || '').toLowerCase();
            if (major.some((m) => cLower.includes(m))) return false;
          } else if (city === 'Delhi NCR') {
            const cLower = (job.city || '').toLowerCase();
            if (!cLower.includes('delhi') && !cLower.includes('ncr') && !cLower.includes('noida') && !cLower.includes('gurugram')) {
              return false;
            }
          } else if (!(job.city || '').toLowerCase().includes(city.toLowerCase())) {
            return false;
          }
        }

        if (q) {
          const hay = `${job.title} ${job.company} ${job.category} ${job.city || ''} ${job.country} ${(job.skills || []).join(' ')}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });

      const total = filtered.length;
      const totalPages = Math.max(1, Math.ceil(total / limit));
      const safePage = Math.min(page, totalPages);
      const start = (safePage - 1) * limit;
      const pageItems = filtered.slice(start, start + limit);

      const responsePayload: PaginatedJobsResponse = {
        jobs: pageItems,
        total,
        page: safePage,
        limit,
        totalPages,
        countsByBucket,
        countsByRegion,
        countsByCategory,
        cachedAt: new Date(liveJobsCacheUpdatedAt || Date.now()).toISOString(),
      };
      res.json(responsePayload);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch live public jobs';
      res.status(500).json({ error: message });
    }
  });

  // AI Global Job Discovery via Gemini Search Grounding + Live ATS (India First)
  app.post('/api/ai/discover-jobs', requireAuth, aiLimiter, async (req: AuthenticatedRequest, res) => {
    try {
      const {
        category = 'All',
        country = 'India',
        city = 'All India',
        roleQuery = '',
      } = req.body as {
        category?: JobCategory | 'All';
        country?: string;
        city?: string;
        roleQuery?: string;
      };
      const [atsJobs, grounded] = await Promise.all([
        refreshLivePublicAtsJobs(false),
        discoverJobsWithGemini({
          category,
          country,
          city,
          roleQuery,
          actorUid: req.user?.uid || 'system',
        }),
      ]);
      const filteredAts = atsJobs.filter((j) => {
        const catOk = category === 'All' || j.category === category;
        const countryOk =
          !country ||
          country.toLowerCase() === 'global' ||
          j.country.toLowerCase().includes(country.toLowerCase()) ||
          j.workMode === 'Remote';
        return catOk && countryOk;
      });
      const merged = deduplicateAndRankJobs([...grounded.jobs, ...filteredAts]);
      res.json({
        jobs: merged,
        groundingSources: grounded.groundingSources,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Job discovery error';
      res.status(500).json({ error: message });
    }
  });

  // AI Job Verification & Eligibility Audit Agent
  app.post('/api/ai/verify-job', requireAuth, aiLimiter, async (req, res) => {
    try {
      const { job } = req.body as { job?: Partial<JobListing> };
      if (!job || !job.applyUrl) {
        res.status(400).json({ error: 'Job payload with applyUrl is required.' });
        return;
      }
      const verification = await verifyJobWithGemini(job);
      res.json(verification);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Verification failed';
      res.status(500).json({ error: message });
    }
  });

  // Screenshot / Flyer OCR Extraction
  app.post('/api/ai/ocr-job', requireAuth, aiLimiter, async (req: AuthenticatedRequest, res) => {
    try {
      const { base64Data, mimeType } = req.body as { base64Data?: string; mimeType?: string };
      if (!base64Data || !mimeType) {
        res.status(400).json({ error: 'Image base64Data and mimeType are required.' });
        return;
      }
      const result = await extractJobFromScreenshot({
        base64Data,
        mimeType,
        actorUid: req.user?.uid || 'candidate',
      });
      res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'OCR extraction failed';
      res.status(500).json({ error: message });
    }
  });

  // Resume Analyzer Agent
  app.post('/api/ai/analyze-resume', requireAuth, aiLimiter, async (req, res) => {
    try {
      const { resumeText, fileBase64, fileMimeType, targetSpecialization } = req.body as {
        resumeText?: string;
        fileBase64?: string;
        fileMimeType?: string;
        targetSpecialization?: string;
      };
      if (!resumeText && !fileBase64) {
        res.status(400).json({ error: 'Please upload a resume file or paste resume text.' });
        return;
      }
      const analysis = await analyzeResumeWithGemini({
        resumeText,
        fileBase64,
        fileMimeType,
        targetSpecialization,
      });
      res.json(analysis);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Resume analysis failed';
      res.status(500).json({ error: message });
    }
  });

  // Candidate-Job Matching Agent
  app.post('/api/ai/match-jobs', requireAuth, aiLimiter, async (req, res) => {
    try {
      const { profile, jobs } = req.body as {
        profile?: Partial<CandidateProfile>;
        jobs?: JobListing[];
      };
      if (!profile || !Array.isArray(jobs)) {
        res.status(400).json({ error: 'Candidate profile and jobs array are required.' });
        return;
      }
      const matches = await scoreCandidateJobMatches(profile, jobs);
      res.json({ matches });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Matching failed';
      res.status(500).json({ error: message });
    }
  });

  // Application Intelligence Agent
  app.post('/api/ai/application-assistant', requireAuth, aiLimiter, async (req, res) => {
    try {
      const { job, profile } = req.body as {
        job?: JobListing;
        profile?: Partial<CandidateProfile>;
      };
      if (!job) {
        res.status(400).json({ error: 'Job details are required.' });
        return;
      }
      const guidance = await generateApplicationAssistant(job, profile || {});
      res.json(guidance);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Application assistant failed';
      res.status(500).json({ error: message });
    }
  });

  // Owner-Exclusive AI Telemetry, Spend Cap, & Autonomous Discovery Cycle
  app.get('/api/system/providers', requireAuth, (_req, res) => {
    res.json(getAiSystemTelemetry());
  });

  app.post('/api/system/spend-cap', requireOwner, (req, res) => {
    const { dailyCapUsd } = req.body as { dailyCapUsd?: number };
    if (typeof dailyCapUsd !== 'number' || dailyCapUsd < 1 || dailyCapUsd > 5000) {
      res.status(400).json({ error: 'Invalid spend cap (must be 1 - 5000 USD).' });
      return;
    }
    updateDailySpendCap(dailyCapUsd);
    res.json(getAiSystemTelemetry());
  });

  app.post('/api/ai/autonomous-cycle', requireOwner, aiLimiter, async (req: AuthenticatedRequest, res) => {
    try {
      const atsJobs = await refreshLivePublicAtsJobs(true);
      const financeDiscovery = await discoverJobsWithGemini({
        category: 'Finance Jobs',
        country: 'India',
        roleQuery: 'MBA Finance fresher Financial Analyst FP&A Management Trainee India',
        actorUid: req.user?.uid || 'owner',
      });
      const merged = deduplicateAndRankJobs([...financeDiscovery.jobs, ...atsJobs]);
      res.json({
        discoveredCount: merged.length,
        jobs: merged,
        groundingSources: financeDiscovery.groundingSources,
        telemetry: getAiSystemTelemetry(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Autonomous cycle failed';
      res.status(500).json({ error: message });
    }
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MBA Fresher Blessing AI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
