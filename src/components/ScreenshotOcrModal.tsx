import React, { useState } from 'react';
import {
  AlertTriangle,
  FileText,
  ImageUp,
  Loader2,
  Mail,
  MessageSquareText,
  X,
} from 'lucide-react';
import {
  extractJobFromScreenshotViaAi,
  extractJobsFromPostOrEmailViaAi,
} from '../services/apiClient';
import type { JobListing } from '../types';

type IngestTab = 'screenshot' | 'social_post' | 'email_alert';

interface ScreenshotOcrModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJobExtracted: (job: JobListing, notes: string) => Promise<void>;
  onJobsExtracted?: (jobs: JobListing[], summary: string, sourceLabel: string) => Promise<void>;
}

export const ScreenshotOcrModal: React.FC<ScreenshotOcrModalProps> = ({
  isOpen,
  onClose,
  onJobExtracted,
  onJobsExtracted,
}) => {
  const [activeTab, setActiveTab] = useState<IngestTab>('screenshot');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Tab 1: Screenshot OCR
  const [previewUrl, setPreviewUrl] = useState('');

  // Tab 2: Social Post
  const [postText, setPostText] = useState('');
  const [postUrl, setPostUrl] = useState('');
  const [postPlatform, setPostPlatform] = useState('LinkedIn Post');

  // Tab 3: Job Alert Mail / Email Text
  const [emailText, setEmailText] = useState('');
  const [emailSourceApp, setEmailSourceApp] = useState('Naukri / LinkedIn / Internshala Mail');

  // Shared Extraction Preview State
  const [extractedJobs, setExtractedJobs] = useState<JobListing[]>([]);
  const [auditSummary, setAuditSummary] = useState('');

  if (!isOpen) return null;

  const resetResults = () => {
    setError('');
    setExtractedJobs([]);
    setAuditSummary('');
  };

  const handleTabChange = (tab: IngestTab) => {
    setActiveTab(tab);
    resetResults();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    resetResults();

    if (!file.type.startsWith('image/')) {
      setError('Please upload a PNG, JPG, or WEBP screenshot of a job announcement.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result || '');
      setPreviewUrl(dataUrl);
      const base64Data = dataUrl.split(',')[1] || '';
      setLoading(true);
      try {
        const res = await extractJobFromScreenshotViaAi({
          base64Data,
          mimeType: file.type,
        });
        setExtractedJobs([res.job]);
        setAuditSummary(res.unverifiedNotes);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'OCR extraction failed');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleEmailFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    try {
      const text = await file.text();
      setEmailText(text.slice(0, 18000));
    } catch {
      setError('Could not read the uploaded email/text file.');
    }
  };

  const handleExtractTextJobs = async (mode: 'social_post' | 'email_alert') => {
    resetResults();
    const rawText = mode === 'social_post' ? postText : emailText;
    if (rawText.trim().length < 20) {
      setError('Please paste at least 20 characters from the job post or job alert email.');
      return;
    }

    setLoading(true);
    try {
      const res = await extractJobsFromPostOrEmailViaAi({
        inputType: mode,
        rawText,
        postOrSourceUrl: mode === 'social_post' ? postUrl : undefined,
        portalHint: mode === 'social_post' ? postPlatform : emailSourceApp,
      });
      setExtractedJobs(res.jobs);
      setAuditSummary(res.auditSummary);
      if (res.jobs.length === 0) {
        setError(
          res.skippedOverExpCount > 0
            ? `Filtered out ${res.skippedOverExpCount} listing(s) requiring >1 year experience. No eligible 0–1 yr MBA roles found.`
            : 'No valid job postings could be extracted from that text.'
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI extraction failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAll = async () => {
    if (extractedJobs.length === 0) return;
    setLoading(true);
    try {
      if (onJobsExtracted) {
        const label =
          activeTab === 'screenshot'
            ? 'Screenshot OCR'
            : activeTab === 'social_post'
              ? `Social Post (${postPlatform})`
              : `Job Alert Mail (${emailSourceApp})`;
        await onJobsExtracted(extractedJobs, auditSummary, label);
      } else {
        for (const job of extractedJobs) {
          await onJobExtracted(job, auditSummary);
        }
      }
      setExtractedJobs([]);
      setPreviewUrl('');
      setPostText('');
      setPostUrl('');
      setEmailText('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save extracted jobs');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
              Real-Job Ingest: Screenshot, Social Post & Job Alert Mail
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Extract genuine MBA fresher (0–1 yr) openings from screenshots, LinkedIn/WhatsApp/Telegram posts, or pasted Naukri/Internshala/Foundit/placement emails.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Source Type Tabs */}
        <div className="mt-4 flex flex-wrap gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
          <button
            type="button"
            onClick={() => handleTabChange('screenshot')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-medium transition-colors ${
              activeTab === 'screenshot'
                ? 'bg-[#0B192C] text-white dark:bg-blue-600'
                : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            <ImageUp className="h-3.5 w-3.5" />
            <span>Screenshot / Flyer OCR</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('social_post')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-medium transition-colors ${
              activeTab === 'social_post'
                ? 'bg-[#0B192C] text-white dark:bg-blue-600'
                : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            <MessageSquareText className="h-3.5 w-3.5" />
            <span>Social Post (LinkedIn / WhatsApp / Telegram)</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('email_alert')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-medium transition-colors ${
              activeTab === 'email_alert'
                ? 'bg-[#0B192C] text-white dark:bg-blue-600'
                : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            <Mail className="h-3.5 w-3.5" />
            <span>Job Alert Mail / Email Text</span>
          </button>
        </div>

        {/* Tab 1: Screenshot OCR */}
        {activeTab === 'screenshot' && (
          <div className="mt-5">
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center transition-colors hover:border-blue-500 dark:border-slate-700 dark:bg-slate-800/50">
              <ImageUp className="h-8 w-8 text-blue-600" />
              <span className="mt-2 text-sm font-medium text-slate-900 dark:text-white">
                Select job screenshot or flyer (PNG, JPG, WEBP)
              </span>
              <span className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Extracts title, company, experience, skills, deadline & URL while flagging unverified claims
              </span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => void handleFileChange(e)}
                className="hidden"
              />
            </label>

            {previewUrl && (
              <div className="mt-4">
                <img
                  src={previewUrl}
                  alt="Uploaded job screenshot preview"
                  className="max-h-48 w-full rounded-lg border border-slate-200 object-contain dark:border-slate-700"
                />
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Social Media Post */}
        {activeTab === 'social_post' && (
          <div className="mt-5 space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Source App / Platform
                </label>
                <select
                  value={postPlatform}
                  onChange={(e) => setPostPlatform(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  <option value="LinkedIn Post">LinkedIn Hiring Post</option>
                  <option value="WhatsApp Job Group">WhatsApp Job Forward</option>
                  <option value="Telegram Job Channel">Telegram Job Channel</option>
                  <option value="Campus Placement Notice">Campus Placement Group</option>
                  <option value="Instagram / X Post">Instagram / X Hiring Post</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Original Post URL (Optional)
                </label>
                <input
                  type="url"
                  value={postUrl}
                  onChange={(e) => setPostUrl(e.target.value)}
                  placeholder="https://www.linkedin.com/posts/..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                Paste Full Hiring Post Text
              </label>
              <textarea
                rows={6}
                value={postText}
                onChange={(e) => setPostText(e.target.value)}
                placeholder="Paste the LinkedIn hiring post, recruiter note, or WhatsApp/Telegram job message here. AI will verify MBA & <=1 yr eligibility and flag any scam cues..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                disabled={loading}
                onClick={() => void handleExtractTextJobs('social_post')}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-medium text-white hover:bg-blue-800 disabled:opacity-50"
              >
                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Extract & Audit Social Post</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Job Alert Mail / Email Text */}
        {activeTab === 'email_alert' && (
          <div className="mt-5 space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Mail Source / Portal Alert
                </label>
                <select
                  value={emailSourceApp}
                  onChange={(e) => setEmailSourceApp(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  <option value="Naukri Job Alert Mail">Naukri Job Alert Email</option>
                  <option value="LinkedIn Job Alert Mail">LinkedIn Job Alert Email</option>
                  <option value="Internshala Job Digest">Internshala Opportunity Mail</option>
                  <option value="Foundit / IIMJobs Mail">Foundit / IIMJobs Alert Mail</option>
                  <option value="Campus Placement Cell Email">Campus Placement / Recruiter Mail</option>
                </select>
              </div>
              <div className="flex items-end">
                <label className="inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  <FileText className="h-3.5 w-3.5" />
                  <span>Or Load Saved .eml / .txt Email</span>
                  <input
                    type="file"
                    accept=".eml,.txt,text/plain"
                    onChange={(e) => void handleEmailFileUpload(e)}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                Paste Job Alert Email Content (Supports multi-job digests — no Gmail access required)
              </label>
              <textarea
                rows={6}
                value={emailText}
                onChange={(e) => setEmailText(e.target.value)}
                placeholder="Copy & paste the body and job links from any Naukri, LinkedIn, Internshala, Foundit, or Placement Cell email. Multiple jobs inside a single digest will be extracted cleanly..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                disabled={loading}
                onClick={() => void handleExtractTextJobs('email_alert')}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-medium text-white hover:bg-blue-800 disabled:opacity-50"
              >
                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Extract Jobs from Email Text</span>
              </button>
            </div>
          </div>
        )}

        {loading && (
          <div className="mt-4 flex items-center gap-2 text-sm text-blue-700 dark:text-blue-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Running AI extraction, strict MBA + 0–1 yr audit & scam inspection...</span>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}

        {extractedJobs.length > 0 && (
          <div className="mt-5 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                Extracted {extractedJobs.length} Job Opportunity{extractedJobs.length > 1 ? 'ies' : ''}
              </h3>
              <span className="text-xs text-amber-800 dark:text-amber-300">{auditSummary}</span>
            </div>

            <div className="max-h-64 space-y-2.5 overflow-y-auto pr-1">
              {extractedJobs.map((job) => (
                <div
                  key={job.jobId}
                  className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                      {job.title} — {job.company}
                    </p>
                    <span
                      className={`text-xs font-medium ${
                        job.verificationStatus === 'Suspicious'
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-amber-700 dark:text-amber-400'
                      }`}
                    >
                      {job.verificationStatus} · {job.sourceName}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                    {job.category} · {job.experienceRequired} · {job.city ? `${job.city}, ` : ''}
                    {job.country} · {job.qualificationCheck}
                  </p>
                  {job.extractedClaims && (
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Claims: {job.extractedClaims}
                    </p>
                  )}
                  {job.scamWarning && (
                    <p className="mt-1 flex items-center gap-1 text-xs font-medium text-red-700 dark:text-red-400">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      <span>{job.scamWarning}</span>
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 dark:border-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => void handleSaveAll()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Save {extractedJobs.length} Job{extractedJobs.length > 1 ? 's' : ''} to Catalog
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
