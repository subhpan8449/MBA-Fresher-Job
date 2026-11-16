import React from 'react';
import {
  AlertTriangle,
  Bookmark,
  CheckCircle2,
  Clock,
  ExternalLink,
  Globe2,
  ShieldAlert,
  ShieldQuestion,
  Sparkles,
} from 'lucide-react';
import type { AiRecommendation, JobListing, VerificationStatus } from '../types';

interface JobCardProps {
  job: JobListing;
  recommendation?: AiRecommendation;
  isSaved: boolean;
  applicationStatus?: string;
  onSelect: (job: JobListing) => void;
  onOpenAssistant: (job: JobListing) => void;
  onToggleSave: (job: JobListing) => void;
  onApplyClick: (job: JobListing) => void;
}

export function renderVerificationSignal(status: VerificationStatus) {
  switch (status) {
    case 'Verified':
      return (
        <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          <span>Verified</span>
        </span>
      );
    case 'Partially Verified':
      return (
        <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 font-medium">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          <span>Partially Verified</span>
        </span>
      );
    case 'Expired':
      return (
        <span className="inline-flex items-center gap-1 text-red-700 dark:text-red-400 font-medium">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>Expired</span>
        </span>
      );
    case 'Suspicious':
      return (
        <span className="inline-flex items-center gap-1 text-red-700 dark:text-red-400 font-medium">
          <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
          <span>Suspicious</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400 font-medium">
          <ShieldQuestion className="h-3.5 w-3.5 shrink-0" />
          <span>Unverified</span>
        </span>
      );
  }
}

export const JobCard: React.FC<JobCardProps> = ({
  job,
  recommendation,
  isSaved,
  applicationStatus,
  onSelect,
  onOpenAssistant,
  onToggleSave,
  onApplyClick,
}) => {
  const locationText = [job.city, job.country].filter(Boolean).join(', ') || 'Global';
  const score = recommendation?.matchScore;

  return (
    <article className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 transition-colors hover:border-blue-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-700">
      <div>
        {/* Unboxed top metadata line (Zero-pill discipline) */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-blue-700 dark:text-blue-400">{job.category}</span>
            <span aria-hidden="true">·</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">{job.region}</span>
            <span aria-hidden="true">·</span>
            <span>{job.experienceTier || job.experienceRequired}</span>
            <span aria-hidden="true">·</span>
            {renderVerificationSignal(job.verificationStatus)}
          </div>
          {typeof score === 'number' && (
            <span className="font-mono tabular-nums text-xs font-semibold text-slate-900 dark:text-slate-100">
              {score}% Match
            </span>
          )}
        </div>

        {/* Title & Company */}
        <button
          type="button"
          onClick={() => onSelect(job)}
          className="mt-2.5 block text-left group focus-visible:outline-2 focus-visible:outline-blue-600"
        >
          <h3 className="font-display text-lg font-semibold leading-snug text-slate-900 group-hover:text-blue-700 dark:text-white dark:group-hover:text-blue-400">
            {job.title}
          </h3>
        </button>

        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <span className="font-medium">{job.company}</span>
          <span aria-hidden="true" className="text-slate-400">·</span>
          <span>{locationText}</span>
          <span aria-hidden="true" className="text-slate-400">·</span>
          <span>{job.workMode}</span>
        </div>

        {/* Strict MBA + Experience Eligibility Line */}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
          <span
            className={
              job.qualificationCheck === 'Confirmed MBA Eligible'
                ? 'font-medium text-emerald-700 dark:text-emerald-400'
                : 'font-medium text-amber-700 dark:text-amber-400'
            }
          >
            {job.qualificationCheck}
          </span>
          <span aria-hidden="true">·</span>
          <span>{job.experienceCheck}</span>
          <span aria-hidden="true">·</span>
          <span className="text-slate-500 dark:text-slate-400">{job.feedBucket}</span>
        </div>

        {/* International Visa / Work Authorization Reminder */}
        {job.region === 'International' && (
          <div className="mt-2.5 flex items-start gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
            <Globe2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
            <span>
              <strong>Work Authorization:</strong>{' '}
              {job.visaSponsorship || 'Requires valid work authorization for destination country unless sponsorship is confirmed.'}
            </span>
          </div>
        )}

        {/* Scam Warning / Unverified OCR Claims */}
        {job.scamWarning && (
          <div className="mt-2.5 flex items-start gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{job.scamWarning}</span>
          </div>
        )}

        {job.extractedClaims && (
          <p className="mt-2 line-clamp-2 text-xs text-amber-700 dark:text-amber-400">
            OCR Claims (Unverified): {job.extractedClaims}
          </p>
        )}

        {/* Description Excerpt */}
        {job.description && (
          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            {job.description}
          </p>
        )}

        {/* Unboxed Secondary Metadata */}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
          <span>Source: {job.sourceName || 'Verified ATS'}</span>
          {job.salary && job.salary !== 'Not specified' && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{job.salary}</span>
            </>
          )}
          {job.postedDate && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">Posted {job.postedDate}</span>
            </>
          )}
          {applicationStatus && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-medium text-blue-700 dark:text-blue-400">
                Status: {applicationStatus}
              </span>
            </>
          )}
        </div>

        {job.skills && job.skills.length > 0 && (
          <p className="mt-2.5 truncate text-xs text-slate-500 dark:text-slate-400">
            Skills: {job.skills.slice(0, 6).join(' · ')}
          </p>
        )}
      </div>

      {/* Action Bar */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenAssistant(job)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B192C] px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 whitespace-nowrap shrink-0"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI Apply Assistant</span>
          </button>

          <button
            type="button"
            onClick={() => onSelect(job)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            <span>Inspect</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onToggleSave(job)}
            aria-label={isSaved ? 'Remove from saved jobs' : 'Save job'}
            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              isSaved
                ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            <Bookmark className={`h-3.5 w-3.5 ${isSaved ? 'fill-current' : ''}`} />
            <span>{isSaved ? 'Saved' : 'Save'}</span>
          </button>

          {job.originalJobUrl && job.originalJobUrl !== job.applyUrl && (
            <a
              href={job.originalJobUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
            >
              <span>Source</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          )}

          <a
            href={job.applyUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onApplyClick(job)}
            className="inline-flex items-center gap-1 rounded-lg border border-blue-600 px-3 py-2 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/50 whitespace-nowrap shrink-0"
          >
            <span>Apply</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </article>
  );
};
