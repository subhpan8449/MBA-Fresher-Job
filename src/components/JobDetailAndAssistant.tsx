import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Bookmark,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  ExternalLink,
  FileText,
  Globe2,
  Loader2,
  Mail,
  MessageSquare,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { getApplicationAssistantViaAi, verifyJobViaAi } from '../services/apiClient';
import type {
  AiRecommendation,
  ApplicationAssistantOutput,
  ApplicationStatus,
  CandidateProfile,
  JobListing,
} from '../types';
import { renderVerificationSignal } from './JobCard';

interface JobDetailAndAssistantProps {
  job: JobListing;
  profile: CandidateProfile | null;
  recommendation?: AiRecommendation;
  isSaved: boolean;
  applicationStatus?: ApplicationStatus;
  initialTab?: 'details' | 'assistant';
  isSignedIn: boolean;
  onSignIn: () => void;
  onBack: () => void;
  onToggleSave: (job: JobListing) => void;
  onUpdateApplicationStatus: (job: JobListing, status: ApplicationStatus) => Promise<void>;
  onJobVerified: (jobId: string, updates: Partial<JobListing>) => Promise<void>;
}

export const JobDetailAndAssistant: React.FC<JobDetailAndAssistantProps> = ({
  job,
  profile,
  recommendation,
  isSaved,
  applicationStatus,
  initialTab = 'details',
  isSignedIn,
  onSignIn,
  onBack,
  onToggleSave,
  onUpdateApplicationStatus,
  onJobVerified,
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'assistant'>(initialTab);
  const [assistant, setAssistant] = useState<ApplicationAssistantOutput | null>(null);
  const [loadingAssistant, setLoadingAssistant] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState('');
  const [error, setError] = useState('');
  const [copiedKey, setCopiedKey] = useState('');
  const [assistantSection, setAssistantSection] = useState<
    'all' | 'resume' | 'cover' | 'recruiter' | 'interview'
  >('all');

  const handleGenerateAssistant = async (focus: typeof assistantSection = 'all') => {
    setActiveTab('assistant');
    setAssistantSection(focus);
    if (!isSignedIn) {
      onSignIn();
      return;
    }
    if (assistant) return;
    setLoadingAssistant(true);
    setError('');
    try {
      const result = await getApplicationAssistantViaAi(job, profile || {});
      setAssistant(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate application guidance');
    } finally {
      setLoadingAssistant(false);
    }
  };

  const handleLiveVerify = async () => {
    if (!isSignedIn) {
      onSignIn();
      return;
    }
    setVerifying(true);
    setVerifyMessage('');
    try {
      const res = await verifyJobViaAi(job);
      setVerifyMessage(
        `Status: ${res.verificationStatus} (HTTP ${res.httpStatus || 'N/A'}) — ${res.auditNotes}`
      );
      await onJobVerified(job.jobId, {
        verificationStatus: res.verificationStatus,
        isFresherFriendly: res.isFresherFriendly,
        mbaEligible: res.mbaEligible,
        qualificationCheck: res.qualificationCheck,
        experienceCheck: res.experienceCheck,
        experienceTier: res.experienceTier,
        feedBucket: res.feedBucket,
        scamWarning: res.scamWarning || undefined,
        lastVerifiedDate: new Date().toISOString().slice(0, 10),
      });
    } catch (err) {
      setVerifyMessage(err instanceof Error ? err.message : 'Live URL audit failed');
    } finally {
      setVerifying(false);
    }
  };

  const copyText = (key: string, text: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 1800);
  };

  return (
    <div className="space-y-6">
      {/* Top Bar Back & Primary Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Opportunities</span>
        </button>

        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors ${
              activeTab === 'details'
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            Job Details & Verification
          </button>
          <button
            type="button"
            onClick={() => void handleGenerateAssistant('all')}
            className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors ${
              activeTab === 'assistant'
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            Application Intelligence
          </button>
        </div>
      </div>

      {/* Main Header Card */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-blue-700 dark:text-blue-400">{job.category}</span>
            <span aria-hidden="true">·</span>
            <span>{job.region}</span>
            <span aria-hidden="true">·</span>
            <span>{job.experienceTier}</span>
            <span aria-hidden="true">·</span>
            {renderVerificationSignal(job.verificationStatus)}
            <span aria-hidden="true">·</span>
            <span>{job.feedBucket}</span>
          </div>
          {recommendation && (
            <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-white">
              {recommendation.matchScore}% Profile Match
            </span>
          )}
        </div>

        <h1 className="mt-3 font-display text-2xl font-bold text-slate-900 dark:text-white">
          {job.title}
        </h1>
        <p className="mt-1 text-base font-medium text-slate-700 dark:text-slate-300">
          {job.company} · {[job.city, job.country].filter(Boolean).join(', ')} · {job.workMode}
        </p>

        {/* Scam or International Visa Callouts */}
        {(job.scamWarning || assistant?.scamWarning) && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <strong>Safety & Scam Check:</strong> {job.scamWarning || assistant?.scamWarning}
            </span>
          </div>
        )}

        {job.region === 'International' && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200">
            <Globe2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <strong>International Work Authorization Note:</strong>{' '}
              {job.visaSponsorship || 'Candidates must verify local work authorization or employer visa sponsorship directly on the official application page.'}
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex flex-wrap items-center gap-2.5 border-t border-slate-100 pt-5 dark:border-slate-800">
          <a
            href={job.applyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-medium text-white hover:bg-blue-800 whitespace-nowrap shrink-0"
          >
            <span>Apply Now (Official Link)</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>

          {job.originalJobUrl && job.originalJobUrl !== job.applyUrl && (
            <a
              href={job.originalJobUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 whitespace-nowrap shrink-0"
            >
              <span>Original Source</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}

          <button
            type="button"
            onClick={() => void handleGenerateAssistant('resume')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 whitespace-nowrap shrink-0"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Prepare Resume</span>
          </button>

          <button
            type="button"
            onClick={() => void handleGenerateAssistant('cover')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 whitespace-nowrap shrink-0"
          >
            <Mail className="h-3.5 w-3.5" />
            <span>Cover Letter</span>
          </button>

          <button
            type="button"
            onClick={() => void handleGenerateAssistant('recruiter')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 whitespace-nowrap shrink-0"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Recruiter Message</span>
          </button>

          <button
            type="button"
            onClick={() => void handleGenerateAssistant('interview')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 whitespace-nowrap shrink-0"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Interview Prep</span>
          </button>

          <button
            type="button"
            onClick={() => onToggleSave(job)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-medium whitespace-nowrap shrink-0 ${
              isSaved
                ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                : 'border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-200'
            }`}
          >
            <Bookmark className={`h-3.5 w-3.5 ${isSaved ? 'fill-current' : ''}`} />
            <span>{isSaved ? 'Saved' : 'Save Job'}</span>
          </button>

          <button
            type="button"
            onClick={() => void onUpdateApplicationStatus(job, 'Applied')}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-medium whitespace-nowrap shrink-0 ${
              applicationStatus === 'Applied'
                ? 'border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                : 'border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-200'
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>{applicationStatus === 'Applied' ? 'Marked Applied' : 'Mark as Applied'}</span>
          </button>
        </div>
      </section>

      {activeTab === 'details' ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Job Description & Provenance */}
          <div className="space-y-6 lg:col-span-2">
            {job.extractedClaims && (
              <section className="rounded-xl border border-amber-200 bg-amber-50/70 p-5 dark:border-amber-900/50 dark:bg-amber-950/20">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="h-4 w-4" />
                  <span>OCR Extracted Claims (Not Independently Verified)</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-amber-900 dark:text-amber-200">
                  {job.extractedClaims}
                </p>
              </section>
            )}

            <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
                Extracted Role Description
              </h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                {job.description || 'Full role details are available on the verified official employer link.'}
              </p>

              {job.skills && job.skills.length > 0 && (
                <div className="mt-6 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Required Skills & Keywords
                  </p>
                  <p className="mt-2 text-sm text-slate-800 dark:text-slate-200">
                    {job.skills.join(' · ')}
                  </p>
                </div>
              )}
            </section>

            {recommendation && (
              <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
                  Transparent AI Match Breakdown ({recommendation.matchScore}%)
                </h2>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      Why Your Profile Matches
                    </p>
                    <ul className="mt-2 space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
                      {(recommendation.reasons || []).map((r, i) => (
                        <li key={i}>• {r}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                      Missing / Gap Requirements
                    </p>
                    <ul className="mt-2 space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
                      {(recommendation.missingRequirements || ['None identified']).map((m, i) => (
                        <li key={i}>• {m}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>
            )}
          </div>

          {/* Structured Verification Metadata */}
          <aside className="space-y-4">
            <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                  Verification Metadata
                </h2>
                <button
                  type="button"
                  disabled={verifying}
                  onClick={() => void handleLiveVerify()}
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline disabled:opacity-50 dark:text-blue-400"
                >
                  {verifying ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-3.5 w-3.5" />
                  )}
                  <span>Re-Verify Live</span>
                </button>
              </div>

              {verifyMessage && (
                <p className="mt-3 rounded-lg bg-slate-100 p-2.5 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {verifyMessage}
                </p>
              )}

              <dl className="mt-4 space-y-3 text-xs">
                {[
                  ['MBA Eligibility', job.qualificationCheck],
                  ['Experience Audit', `${job.experienceRequired} (${job.experienceCheck})`],
                  ['Feed Bucket', job.feedBucket],
                  ['Region Priority', `${job.region} (${job.country})`],
                  ['Education', job.educationRequired || 'MBA / PGDM'],
                  ['Salary / Stipend', job.salary || 'Not disclosed'],
                  ['Employment Type', job.employmentType || 'Full-time'],
                  ['Application Deadline', job.deadline || 'Open / Rolling'],
                  ['Original Posting Date', job.postedDate || 'Recent'],
                  ['Last Verified Date', job.lastVerifiedDate || 'Today'],
                  ['Recruiter Info', job.recruiterInfo || 'Not publicly listed'],
                  ['Work Authorization', job.visaSponsorship || 'Not specified'],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-3 border-b border-slate-100 pb-2 dark:border-slate-800">
                    <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
                    <dd className="text-right font-medium text-slate-900 dark:text-slate-100">{value}</dd>
                  </div>
                ))}
              </dl>

              {job.sourceUrls && job.sourceUrls.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Original & Source URLs
                  </p>
                  <ul className="mt-1.5 space-y-1">
                    {job.sourceUrls.map((u) => (
                      <li key={u}>
                        <a
                          href={u}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block truncate text-xs text-blue-700 hover:underline dark:text-blue-400"
                        >
                          {u}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          </aside>
        </div>
      ) : (
        /* Application Intelligence */
        <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          {loadingAssistant ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="mt-3 font-display text-base font-medium text-slate-900 dark:text-white">
                Preparing your personalized Application Intelligence...
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Auditing MBA eligibility, ≤1 yr experience check, ATS keywords, cover letter, and scam signals.
              </p>
            </div>
          ) : error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          ) : assistant ? (
            <div className="space-y-6">
              {/* Explicit Candidate Review & Approval Gate */}
              <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-3.5 text-xs text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200">
                <strong>Candidate Review Gate:</strong> MBA Fresher Blessing AI never auto-submits applications or sends recruiter messages without your review and explicit click on the official portal.
              </div>

              <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 pb-4 dark:border-slate-800">
                {(
                  [
                    ['all', 'Full Intelligence Brief'],
                    ['resume', 'Eligibility & Resume ATS'],
                    ['cover', 'Cover Letter & Email'],
                    ['recruiter', 'Recruiter Outreach'],
                    ['interview', 'Interview Prep'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setAssistantSection(key)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      assistantSection === key
                        ? 'bg-[#0B192C] text-white dark:bg-blue-600'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {(assistantSection === 'all' || assistantSection === 'resume') && (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                        1. MBA Eligibility & ≤1 Yr Analysis
                      </h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                        {assistant.eligibilityAnalysis || assistant.relevanceExplanation}
                      </p>
                    </div>
                    <div>
                      <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                        2. Why This Job Fits Your Profile
                      </h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                        {assistant.relevanceExplanation}
                      </p>
                    </div>
                    <div>
                      <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                        3. Eligibility & Required Documents
                      </h3>
                      <ul className="mt-1.5 space-y-1 text-sm text-slate-600 dark:text-slate-300">
                        {assistant.eligibilityRequirements.map((item, idx) => (
                          <li key={`el-${idx}`}>• {item}</li>
                        ))}
                        {assistant.requiredDocuments.map((item, idx) => (
                          <li key={`doc-${idx}`}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                        4. Required Core Skills
                      </h3>
                      <p className="mt-1.5 text-sm text-slate-700 dark:text-slate-300">
                        {(assistant.requiredSkills || job.skills || []).join(' · ') || 'See job description'}
                      </p>
                    </div>
                    <div>
                      <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                        5. Truthful Resume Modifications Needed
                      </h3>
                      <ul className="mt-1.5 space-y-1 text-sm text-slate-600 dark:text-slate-300">
                        {assistant.resumeModifications.map((item, idx) => (
                          <li key={idx}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                        6. ATS Resume Keywords
                      </h3>
                      <p className="mt-1.5 text-sm font-medium text-blue-700 dark:text-blue-400">
                        {assistant.atsKeywords.join(' · ')}
                      </p>
                    </div>
                    <div>
                      <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                        7. Deadline & Safety Check
                      </h3>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                        Deadline: <span className="font-mono">{assistant.importantDeadline}</span>
                      </p>
                      {assistant.scamWarning && (
                        <p className="mt-1 text-xs text-red-700 dark:text-red-400">
                          Safety note: {assistant.scamWarning}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {(assistantSection === 'all' || assistantSection === 'cover') && (
                <div className="space-y-4 border-t border-slate-100 pt-5 dark:border-slate-800">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                        8. Tailored Cover Letter & Email Subject
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {assistant.coverLetterRequired} · Subject: <strong>{assistant.suggestedEmailSubject}</strong>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyText('cover', assistant.coverLetterDraft)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
                    >
                      {copiedKey === 'cover' ? <ClipboardCheck className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedKey === 'cover' ? 'Copied' : 'Copy Cover Letter'}</span>
                    </button>
                  </div>
                  <pre className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-4 font-sans text-sm leading-relaxed text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                    {assistant.coverLetterDraft}
                  </pre>
                </div>
              )}

              {(assistantSection === 'all' || assistantSection === 'recruiter') && (
                <div className="space-y-4 border-t border-slate-100 pt-5 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                      9. Suggested Recruiter Message (Review Before Sending)
                    </h3>
                    <button
                      type="button"
                      onClick={() => copyText('recruiter', assistant.recruiterMessage)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
                    >
                      {copiedKey === 'recruiter' ? <ClipboardCheck className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedKey === 'recruiter' ? 'Copied' : 'Copy Message'}</span>
                    </button>
                  </div>
                  <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                    {assistant.recruiterMessage}
                  </p>

                  <div>
                    <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                      10. Official Application Procedure
                    </h3>
                    <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-slate-600 dark:text-slate-300">
                      {assistant.stepByStepGuide.map((step, idx) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ol>
                  </div>
                </div>
              )}

              {(assistantSection === 'all' || assistantSection === 'interview') && (
                <div className="space-y-5 border-t border-slate-100 pt-5 dark:border-slate-800">
                  <div>
                    <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                      11. Likely Application Form Questions & Truthful Answers
                    </h3>
                    <div className="mt-3 space-y-3">
                      {assistant.likelyFormQuestions.map((item, idx) => (
                        <div key={idx} className="rounded-lg border border-slate-200 p-3.5 dark:border-slate-800">
                          <p className="text-sm font-medium text-slate-900 dark:text-white">{item.question}</p>
                          <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                            {item.truthfulAnswerGuidance}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                      12. Interview Preparation & Frameworks
                    </h3>
                    <div className="mt-3 space-y-3">
                      {assistant.interviewPrep.map((item, idx) => (
                        <div key={idx} className="rounded-lg border border-slate-200 p-3.5 dark:border-slate-800">
                          <p className="text-sm font-medium text-slate-900 dark:text-white">{item.question}</p>
                          <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                            {item.strategy}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </section>
      )}
    </div>
  );
};
