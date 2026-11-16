import React, { useState } from 'react';
import { CheckCircle2, FileUp, Loader2, Sparkles } from 'lucide-react';
import { analyzeResumeViaAi } from '../services/apiClient';
import type { CandidateProfile, ResumeAnalysisOutput } from '../types';

interface ResumeAnalyzerViewProps {
  profile: CandidateProfile | null;
  onApplyExtractedToProfile: (updates: Partial<CandidateProfile>) => Promise<void>;
}

export const ResumeAnalyzerView: React.FC<ResumeAnalyzerViewProps> = ({
  profile,
  onApplyExtractedToProfile,
}) => {
  const [resumeText, setResumeText] = useState(profile?.resumeSummary || '');
  const [fileName, setFileName] = useState(profile?.resumeFileName || '');
  const [targetSpec, setTargetSpec] = useState(
    profile?.mbaSpecialization || 'Finance Jobs'
  );
  const [fileBase64, setFileBase64] = useState('');
  const [fileMimeType, setFileMimeType] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState('');
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState<ResumeAnalysisOutput | null>(null);

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError('');

    if (file.type === 'text/plain') {
      const reader = new FileReader();
      reader.onload = () => {
        setResumeText(String(reader.result || ''));
        setFileBase64('');
        setFileMimeType('');
      };
      reader.readAsText(file);
      return;
    }

    if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result || '');
        setFileBase64(dataUrl.split(',')[1] || '');
        setFileMimeType(file.type);
      };
      reader.readAsDataURL(file);
      return;
    }

    setError('Supported formats: PDF, PNG, JPG, or TXT. You can also paste your resume text below.');
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSavedNotice('');
    try {
      const res = await analyzeResumeViaAi({
        resumeText,
        fileBase64: fileBase64 || undefined,
        fileMimeType: fileMimeType || undefined,
        targetSpecialization: targetSpec,
      });
      setAnalysis(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Resume analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncProfile = async () => {
    if (!analysis) return;
    setSaving(true);
    try {
      await onApplyExtractedToProfile({
        mbaSpecialization: analysis.detectedSpecialization || targetSpec,
        skills: analysis.extractedSkills,
        certifications: analysis.extractedCertifications,
        resumeSummary: resumeText || analysis.candidateSummary,
        resumeFileName: fileName || 'Uploaded Resume',
      });
      setSavedNotice('Extracted skills, certifications, and specialization synced to your Firestore profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
          AI Resume Analyzer & ATS Readiness Lab
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Upload your MBA resume (PDF, Image, or TXT) or paste text. AI extracts verified skills and identifies honest ATS improvements without inventing experience.
        </p>
      </div>

      <form
        onSubmit={(e) => void handleAnalyze(e)}
        className="rounded-xl border border-slate-200 bg-white p-6 space-y-5 dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Upload Resume File (PDF / Image / TXT)
            </label>
            <label className="mt-1.5 flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700 hover:border-blue-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
              <FileUp className="h-4 w-4 text-blue-600 shrink-0" />
              <span className="truncate">{fileName || 'Choose resume PDF, screenshot, or .txt'}</span>
              <input
                type="file"
                accept=".pdf,.txt,image/png,image/jpeg,image/webp"
                onChange={handleFilePick}
                className="hidden"
              />
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Target MBA Specialization
            </label>
            <select
              value={targetSpec}
              onChange={(e) => setTargetSpec(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="Finance Jobs">Finance Jobs (MBA Finance)</option>
              <option value="SAP FICO Jobs">SAP FICO Jobs (ERP Finance)</option>
              <option value="Business Analytics Jobs">Business Analytics Jobs</option>
              <option value="Marketing Jobs">Marketing Jobs (MBA Marketing)</option>
              <option value="MBA Operations">MBA Operations</option>
              <option value="MBA HR">MBA HR</option>
              <option value="MBA International Business">MBA International Business</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Or Paste Resume Content
          </label>
          <textarea
            rows={7}
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            placeholder="Paste education, MBA coursework, summer internship projects, Excel/SQL/SAP skills, and certifications..."
            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </div>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </p>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0B192C] px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-700"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            <span>{loading ? 'Analyzing Resume...' : 'Run AI Resume Analysis'}</span>
          </button>
        </div>
      </form>

      {analysis && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
                Extracted Candidate Profile & ATS Audit
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Detected Track: {analysis.detectedSpecialization} · Level: {analysis.experienceLevel}
              </p>
            </div>

            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSyncProfile()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-medium text-white hover:bg-blue-800 disabled:opacity-50"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{saving ? 'Syncing...' : 'Sync Skills to My Profile'}</span>
            </button>
          </div>

          {savedNotice && (
            <p className="rounded-lg bg-emerald-50 p-3 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              {savedNotice}
            </p>
          )}

          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            {analysis.candidateSummary}
          </p>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Extracted Skills
              </h3>
              <p className="mt-2 text-sm text-slate-900 dark:text-slate-100">
                {analysis.extractedSkills.join(' · ') || 'None detected'}
              </p>

              <h3 className="mt-5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                Recommended Target Job Titles
              </h3>
              <ul className="mt-2 space-y-1 text-sm text-blue-700 dark:text-blue-400">
                {analysis.recommendedJobTitles.map((t, i) => (
                  <li key={i}>• {t}</li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                ATS Readiness & Honest Improvements
              </h3>
              <ul className="mt-2 space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
                {analysis.atsReadinessNotes.map((n, i) => (
                  <li key={i}>• {n}</li>
                ))}
              </ul>

              {analysis.missingFresherSignals && analysis.missingFresherSignals.length > 0 && (
                <>
                  <h3 className="mt-5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                    Missing Role Keywords to Highlight (If True)
                  </h3>
                  <ul className="mt-2 space-y-1 text-sm text-slate-700 dark:text-slate-300">
                    {analysis.missingFresherSignals.map((m, i) => (
                      <li key={i}>• {m}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
