import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Database,
  Globe2,
  Loader2,
  Lock,
  Megaphone,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
  TrendingUp,
} from 'lucide-react';
import { fetchJobsSummary, type JobsSummaryResponse } from '../services/apiClient';
import { DISCOVERY_PORTALS } from '../types';
import { VfxBackdrop } from './VfxBackdrop';

interface GoogleAuthGateProps {
  isDark: boolean;
  signingIn: boolean;
  authError: string;
  onToggleTheme: () => void;
  onSignIn: () => Promise<void>;
  onOpenPrivacy: () => void;
}

export const GoogleAuthGate: React.FC<GoogleAuthGateProps> = ({
  isDark,
  signingIn,
  authError,
  onToggleTheme,
  onSignIn,
  onOpenPrivacy,
}) => {
  const [summary, setSummary] = useState<JobsSummaryResponse | null>(null);

  useEffect(() => {
    fetchJobsSummary()
      .then((data) => setSummary(data))
      .catch(() => {});
  }, []);

  const hubs = [
    {
      name: 'Finance Jobs',
      note: 'Priority 1 · FP&A, Corporate Finance, Audit, Risk & Banking',
      count: summary?.countsByCategory['Finance Jobs'],
      icon: <TrendingUp className="h-4 w-4 text-sky-400" />,
    },
    {
      name: 'SAP FICO Jobs',
      note: 'S/4HANA Finance, SAP FI/CO Trainee & ERP Consulting',
      count: summary?.countsByCategory['SAP FICO Jobs'],
      icon: <Database className="h-4 w-4 text-indigo-400" />,
    },
    {
      name: 'Business Analytics',
      note: 'BI Analyst, SQL, Power BI & Financial Data Roles',
      count: summary?.countsByCategory['Business Analytics Jobs'],
      icon: <BarChart3 className="h-4 w-4 text-cyan-400" />,
    },
    {
      name: 'Marketing Jobs',
      note: 'Brand Management Trainee, Growth & Market Research',
      count: summary?.countsByCategory['Marketing Jobs'],
      icon: <Megaphone className="h-4 w-4 text-blue-400" />,
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#06101F] text-slate-100">
      <VfxBackdrop variant="hero" />

      {/* Top Navigation Bar */}
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 font-display text-sm font-bold text-white shadow-sm">
            MB
          </div>
          <div>
            <p className="font-display text-base font-bold tracking-tight text-white">
              MBA Fresher Blessing AI
            </p>
            <p className="text-[11px] text-slate-400">
              Founder: Subhashish Pandey · India-First Global Career Intelligence
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenPrivacy}
            className="text-xs font-medium text-slate-300 transition-colors hover:text-white"
          >
            Privacy & Security
          </button>
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label="Toggle color theme"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:bg-white/10"
          >
            {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            <span>{isDark ? 'Light' : 'Dark'}</span>
          </button>
        </div>
      </header>

      {/* Main Split Viewport */}
      <main className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-6 pb-14 pt-4 lg:grid-cols-12 lg:pt-10">
        {/* Left Executive Showcase */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="space-y-7 lg:col-span-7"
        >
          <div className="space-y-4">
            <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-sky-400">
              <Sparkles className="h-3.5 w-3.5" />
              <span>REAL-TIME MULTI-APP MBA FRESHER DISCOVERY · STRICT 0–1 YR FILTER</span>
            </p>
            <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
              Discover Genuine MBA Fresher Jobs Across{' '}
              <span className="text-sky-400">16+ Hiring Apps</span> &amp; Live Company ATS
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
              Built exclusively for MBA &amp; PGDM freshers (0–1 year experience). Automated verification removes senior roles, surfaces India-first openings alongside international opportunities, and generates honest AI application intelligence.
            </p>
          </div>

          {/* Live Platform Numbers Strip */}
          <div className="grid grid-cols-3 gap-4 border-y border-white/10 py-5">
            <div>
              <p className="font-mono tabular-nums text-2xl font-bold text-white sm:text-3xl">
                {summary ? summary.total : '—'}
              </p>
              <p className="mt-1 text-xs text-slate-400">Live Indexed Roles Now</p>
            </div>
            <div>
              <p className="font-mono tabular-nums text-2xl font-bold text-sky-400 sm:text-3xl">
                {summary ? `${summary.connectedSourcesCount}+` : '22+'}
              </p>
              <p className="mt-1 text-xs text-slate-400">Connected Apps &amp; ATS APIs</p>
            </div>
            <div>
              <p className="font-mono tabular-nums text-2xl font-bold text-emerald-400 sm:text-3xl">
                {summary ? summary.countsByRegion.India : '—'}
              </p>
              <p className="mt-1 text-xs text-slate-400">India Priority Openings</p>
            </div>
          </div>

          {/* 4 Dedicated Specialization Hubs */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {hubs.map((hub) => (
              <div
                key={hub.name}
                className="rounded-xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {hub.icon}
                    <h2 className="font-display text-sm font-semibold text-white">{hub.name}</h2>
                  </div>
                  {typeof hub.count === 'number' && (
                    <span className="font-mono tabular-nums text-xs font-semibold text-sky-300">
                      {hub.count} live
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{hub.note}</p>
              </div>
            ))}
          </div>

          {/* Connected 16-Portal Network Strip (Unboxed typographic list) */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Active Multi-Portal Discovery Coverage ({DISCOVERY_PORTALS.length} Apps + Direct ATS)
            </p>
            <p className="text-xs leading-relaxed text-slate-300">
              {DISCOVERY_PORTALS.join(' · ')} · Greenhouse · Lever · SmartRecruiters · Remotive · Jobicy · Himalayas · Arbeitnow
            </p>
          </div>
        </motion.div>

        {/* Right Compulsory Google Sign-In Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, delay: 0.06, ease: 'easeOut' }}
          className="lg:col-span-5"
        >
          <div className="rounded-2xl border border-slate-200/90 bg-white p-7 text-slate-900 shadow-2xl dark:border-slate-700/80 dark:bg-slate-900/95 dark:text-white sm:p-8">
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 dark:text-sky-400">
              <Lock className="h-4 w-4" />
              <span>GOOGLE SIGN-IN REQUIRED</span>
            </div>

            <h2 className="mt-3 font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Sign in to Access Your Career Command Center
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Google authentication is mandatory to protect real-time AI discovery, sync your MBA profile &amp; resume insights, and track your saved roles and interviews securely.
            </p>

            {/* Compulsory Google Sign-In Button */}
            <button
              type="button"
              disabled={signingIn}
              onClick={() => void onSignIn()}
              className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl bg-[#0B192C] px-5 py-3.5 text-sm font-semibold text-white shadow-md transition-transform duration-150 hover:-translate-y-0.5 hover:bg-slate-800 disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              {signingIn ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#EA4335"
                    d="M12 5.04c1.68 0 3.19.58 4.38 1.71l3.28-3.28C17.67 1.62 15.08.5 12 .5 7.42.5 3.47 3.13 1.54 6.96l3.83 2.97C6.28 7.12 8.91 5.04 12 5.04z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.49 12.27c0-.82-.07-1.61-.21-2.36H12v4.48h6.45c-.28 1.49-1.12 2.75-2.38 3.6l3.69 2.86c2.16-1.99 3.73-4.92 3.73-8.58z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.37 14.07A6.96 6.96 0 0 1 5 12c0-.72.13-1.42.37-2.07L1.54 6.96A11.48 11.48 0 0 0 .5 12c0 1.85.44 3.6 1.04 5.04l3.83-2.97z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23.5c3.08 0 5.67-1.02 7.56-2.77l-3.69-2.86c-1.02.69-2.33 1.1-3.87 1.1-3.09 0-5.72-2.08-6.63-4.9l-3.83 2.97C3.47 20.87 7.42 23.5 12 23.5z"
                  />
                </svg>
              )}
              <span>{signingIn ? 'Authenticating with Google...' : 'Continue with Google'}</span>
            </button>

            {authError && (
              <div
                role="alert"
                className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {/* Trust & Value Checklist */}
            <div className="mt-6 space-y-2.5 border-t border-slate-100 pt-5 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-300">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>100% real verified ATS &amp; Search-Grounded jobs — zero fabricated listings.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>AI Resume Analyzer, personalized match scoring &amp; 1-click screenshot/post/mail extraction.</span>
              </div>
              <div className="flex items-start gap-2">
                <Globe2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-sky-400" />
                <span>India-first priority ranking (Mumbai, Delhi NCR, Bengaluru, Haldwani &amp; more) + Global feed.</span>
              </div>
              <div className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-sky-400" />
                <span>No Gmail OAuth required. Your data stays private and deletable anytime.</span>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <span>Founded by Subhashish Pandey</span>
              <button
                type="button"
                onClick={onOpenPrivacy}
                className="font-medium text-blue-700 hover:underline dark:text-sky-400"
              >
                Privacy Policy
              </button>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};
