import React, { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Moon,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
} from 'lucide-react';
import type { AppPage, JobCategory, JobListing } from '../types';
import { renderVerificationSignal } from './JobCard';
import { PWAInstallButton } from './PWAInstallButton';

interface LandingPageProps {
  liveJobs: JobListing[];
  loadingJobs: boolean;
  isSignedIn: boolean;
  isDark: boolean;
  onToggleTheme: () => void;
  onSignIn: () => void;
  onNavigate: (page: AppPage, category?: JobCategory | 'All') => void;
  onSelectJob: (job: JobListing) => void;
  onOpenPrivacy: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  liveJobs,
  loadingJobs,
  isSignedIn,
  isDark,
  onToggleTheme,
  onSignIn,
  onNavigate,
  onSelectJob,
  onOpenPrivacy,
}) => {
  const [heroImgError, setHeroImgError] = useState(false);
  const [featureImgError, setFeatureImgError] = useState(false);
  const [founderImgError, setFounderImgError] = useState(false);
  const [quickQuery, setQuickQuery] = useState('');

  const indiaFinanceJobs = liveJobs
    .filter((j) => j.category === 'Finance Jobs' && j.region === 'India')
    .slice(0, 4);
  const financeJobs = liveJobs
    .filter((j) => j.category === 'Finance Jobs')
    .slice(0, 4);
  const showcaseJobs =
    indiaFinanceJobs.length > 0
      ? indiaFinanceJobs
      : financeJobs.length > 0
        ? financeJobs
        : liveJobs.slice(0, 4);

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onNavigate('jobs');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#070E1A] dark:text-slate-100">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur-sm dark:border-slate-800 dark:bg-[#0B192C]/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-6 py-4">
          <button
            type="button"
            onClick={() => onNavigate('landing')}
            className="font-display text-lg font-bold tracking-tight text-[#0B192C] dark:text-white whitespace-nowrap shrink-0"
          >
            MBA Fresher Blessing AI
          </button>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
            <button
              type="button"
              onClick={() => onNavigate('finance', 'Finance Jobs')}
              className="hover:text-blue-700 hover:underline underline-offset-4 dark:hover:text-blue-400 whitespace-nowrap shrink-0"
            >
              Finance Jobs
            </button>
            <button
              type="button"
              onClick={() => onNavigate('sap-fico', 'SAP FICO Jobs')}
              className="hover:text-blue-700 hover:underline underline-offset-4 dark:hover:text-blue-400 whitespace-nowrap shrink-0"
            >
              SAP FICO Jobs
            </button>
            <button
              type="button"
              onClick={() => onNavigate('analytics', 'Business Analytics Jobs')}
              className="hover:text-blue-700 hover:underline underline-offset-4 dark:hover:text-blue-400 whitespace-nowrap shrink-0"
            >
              Business Analytics
            </button>
            <button
              type="button"
              onClick={() => onNavigate('marketing', 'Marketing Jobs')}
              className="hover:text-blue-700 hover:underline underline-offset-4 dark:hover:text-blue-400 whitespace-nowrap shrink-0"
            >
              Marketing Jobs
            </button>
            <button
              type="button"
              onClick={() => onNavigate('jobs')}
              className="hover:text-blue-700 hover:underline underline-offset-4 dark:hover:text-blue-400 whitespace-nowrap shrink-0"
            >
              All India & Global
            </button>
          </nav>

          <div className="shrink-0">
            {isSignedIn ? (
              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                className="rounded-lg bg-[#0B192C] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 whitespace-nowrap shrink-0"
              >
                Open Workspace
              </button>
            ) : (
              <button
                type="button"
                onClick={onSignIn}
                className="rounded-lg bg-[#0B192C] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 whitespace-nowrap shrink-0"
              >
                Sign in with Google
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section (Split Architecture with items-stretch) */}
      <section className="mx-auto max-w-7xl px-6 py-12 lg:py-16">
        <div className="grid grid-cols-1 items-stretch gap-10 lg:grid-cols-12">
          <div className="flex flex-col justify-between lg:col-span-6">
            <div>
              <p className="text-xs font-semibold tracking-wider text-blue-700 dark:text-blue-400">
                India First · Global Second · Strict MBA & 0–1 Year Fresher Intelligence
              </p>
              <h1
                className="mt-4 font-display font-bold tracking-tight text-slate-900 dark:text-white"
                style={{ fontSize: 'clamp(2.25rem, 4vw, 3.5rem)', lineHeight: 1.08, textWrap: 'balance' }}
              >
                Verified MBA fresher jobs across India and worldwide, guided by AI.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 dark:text-slate-300">
                Exclusively built for MBA freshers (0–1 years experience). Dedicated hubs for Finance Jobs, SAP FICO Jobs, Business Analytics Jobs, and Marketing Jobs—with strict MBA eligibility checks, scam warnings, and interview tracking.
              </p>

              <form onSubmit={handleQuickSearch} className="mt-7 flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={quickQuery}
                    onChange={(e) => setQuickQuery(e.target.value)}
                    placeholder="Search Financial Analyst, FP&A, SAP FICO, Management Trainee..."
                    className="w-full rounded-lg border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-800 whitespace-nowrap shrink-0"
                >
                  <span>Explore Live Jobs</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-slate-200 pt-5 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-400">
              <span>Founded by Subhashish Pandey</span>
              <span aria-hidden="true">·</span>
              <span>Priority 1: India · Finance Jobs</span>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={onToggleTheme}
                className="inline-flex items-center gap-1.5 font-medium text-slate-800 hover:text-blue-700 dark:text-slate-200 dark:hover:text-blue-400"
              >
                {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                <span>{isDark ? 'Light Theme' : 'Dark Theme'}</span>
              </button>
              <PWAInstallButton compact />
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="relative h-full min-h-[320px] overflow-hidden rounded-xl border border-slate-200 bg-[#0B192C] dark:border-slate-800">
              {!heroImgError ? (
                <img
                  src="/src/assets/images/hero_finance_hub_1794839953722.jpg"
                  alt="Global financial district glass boardroom hub"
                  referrerPolicy="no-referrer"
                  onError={() => setHeroImgError(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full min-h-[320px] flex-col justify-end bg-gradient-to-br from-[#0B192C] via-[#12294A] to-[#1E3A8A] p-8 text-white">
                  <Sparkles className="h-8 w-8 text-blue-300" />
                  <p className="mt-3 font-display text-xl font-semibold">Global MBA Career Hub</p>
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 via-slate-950/50 to-transparent p-6 text-white">
                <p className="text-xs font-medium text-blue-200">
                  Real ATS & Search Grounded Verification
                </p>
                <p className="mt-1 font-display text-lg font-semibold">
                  Zero fabricated listings. Official company career links only.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Full-Width 4-Column Capability Strip Below Hero Split */}
        <div className="mt-10 grid grid-cols-1 gap-4 border-t border-slate-200 pt-8 sm:grid-cols-2 lg:grid-cols-4 dark:border-slate-800">
          {[
            {
              num: '01.',
              title: 'Finance-First Discovery',
              desc: 'FP&A, Equity Research, Corporate Finance, Audit, Treasury, KYC/AML & Banking Ops.',
            },
            {
              num: '02.',
              title: '0–1 Year Experience Guard',
              desc: 'Separates genuine fresher and management trainee roles from mislabeled senior listings.',
            },
            {
              num: '03.',
              title: 'Live Link & Scam Audit',
              desc: 'Checks official career URLs, expiry codes, duplicate postings, and suspicious redirects.',
            },
            {
              num: '04.',
              title: '14-Point Apply Assistant',
              desc: 'Generates ATS keywords, truthful resume edits, cover letters, and interview prep.',
            },
          ].map((item) => (
            <div
              key={item.num}
              className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
            >
              <p className="font-mono tabular-nums text-xs font-semibold text-blue-700 dark:text-blue-400">
                {item.num}
              </p>
              <h2 className="mt-2 font-display text-base font-semibold text-slate-900 dark:text-white">
                {item.title}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Live Verified Jobs Feed Preview */}
      <section className="border-y border-slate-200 bg-white py-14 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                Live Public ATS Feed
              </p>
              <h2 className="mt-1 font-display text-2xl font-bold text-slate-900 dark:text-white">
                Active Early-Career Openings
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('finance', 'Finance Jobs')}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:underline dark:text-blue-400"
            >
              <span>Open Priority Finance Jobs Hub</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {loadingJobs ? (
            <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="h-44 animate-pulse rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800"
                />
              ))}
            </div>
          ) : showcaseJobs.length === 0 ? (
            <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-8 text-center dark:border-slate-800 dark:bg-slate-900">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Sign in to trigger live Google Search Grounded discovery across global career boards.
              </p>
              <button
                type="button"
                onClick={onSignIn}
                className="mt-4 rounded-lg bg-blue-700 px-4 py-2 text-xs font-medium text-white hover:bg-blue-800"
              >
                Sign in & Discover Jobs
              </button>
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
              {showcaseJobs.map((job) => (
                <div
                  key={job.jobId}
                  className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-900"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-medium text-blue-700 dark:text-blue-400">
                        {job.category}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{job.experienceTier}</span>
                      <span aria-hidden="true">·</span>
                      {renderVerificationSignal(job.verificationStatus)}
                    </div>
                    <h3 className="mt-2 font-display text-lg font-semibold text-slate-900 dark:text-white">
                      {job.title}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      {job.company} · {[job.city, job.country].filter(Boolean).join(', ')} · {job.workMode}
                    </p>
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                      {job.description}
                    </p>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => onSelectJob(job)}
                      className="text-xs font-semibold text-blue-700 hover:underline dark:text-blue-400"
                    >
                      Inspect & Open AI Assistant
                    </button>
                    <a
                      href={job.applyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                    >
                      <span>Official Link</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* AI Application Assistant & Founder Mission */}
      <section className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:col-span-5">
            {!featureImgError ? (
              <img
                src="/src/assets/images/feature_ai_intelligence_1794839954239.jpg"
                alt="Financial analysis portfolio and application intelligence desk"
                referrerPolicy="no-referrer"
                onError={() => setFeatureImgError(true)}
                className="h-64 w-full object-cover lg:h-full"
              />
            ) : (
              <div className="flex h-64 items-center justify-center bg-slate-100 dark:bg-slate-800">
                <ShieldCheck className="h-10 w-10 text-blue-600" />
              </div>
            )}
          </div>

          <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900 lg:col-span-7">
            <div>
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                Autonomous Career Intelligence
              </p>
              <h2 className="mt-2 font-display text-2xl font-bold text-slate-900 dark:text-white">
                Built to turn job search chaos into verified action
              </h2>
              <ul className="mt-5 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>
                    <strong>Screenshot & Flyer OCR:</strong> Upload WhatsApp or LinkedIn hiring screenshots to extract structured requirements and flag unverified links.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>
                    <strong>Transparent 0–100 Matching:</strong> See exact skill compatibility and missing requirements—never biased by college tier or protected traits.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>
                    <strong>Human-in-the-Loop Governance:</strong> Owner approval controls protect candidate outreach, spending limits, and external integrations.
                  </span>
                </li>
              </ul>
            </div>

            {/* Founder Attribution */}
            <div className="mt-8 flex flex-col gap-4 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
              <div className="flex items-center gap-3.5">
                {!founderImgError ? (
                  <img
                    src="/src/assets/images/avatar_founder_subhashish_1794839954798.jpg"
                    alt="Subhashish Pandey, Founder and Owner"
                    referrerPolicy="no-referrer"
                    onError={() => setFounderImgError(true)}
                    className="h-12 w-12 rounded-full border border-slate-200 object-cover dark:border-slate-700"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0B192C] font-display text-sm font-bold text-white">
                    SP
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Subhashish Pandey
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Founder & Platform Owner · MBA Fresher Blessing AI
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={isSignedIn ? () => onNavigate('dashboard') : onSignIn}
                className="rounded-lg bg-[#0B192C] px-5 py-2.5 text-xs font-medium text-white hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 whitespace-nowrap shrink-0"
              >
                {isSignedIn ? 'Go to Dashboard' : 'Start Candidate Setup'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 dark:border-slate-800 dark:bg-[#0B192C]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 text-xs text-slate-500 sm:flex-row dark:text-slate-400">
          <p>
            © {new Date().getFullYear()} MBA Fresher Blessing AI · Founded by Subhashish Pandey
          </p>
          <div className="flex items-center gap-5">
            <button type="button" onClick={onOpenPrivacy} className="hover:text-slate-900 dark:hover:text-white">
              Privacy Policy & Data Governance
            </button>
            <button
              type="button"
              onClick={() => onNavigate('jobs')}
              className="hover:text-slate-900 dark:hover:text-white"
            >
              Job Directory
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
