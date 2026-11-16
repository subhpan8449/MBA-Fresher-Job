import React, { useState } from 'react';
import { ImageUp, Loader2, X } from 'lucide-react';
import { extractJobFromScreenshotViaAi } from '../services/apiClient';
import type { JobListing } from '../types';

interface ScreenshotOcrModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJobExtracted: (job: JobListing, notes: string) => Promise<void>;
}

export const ScreenshotOcrModal: React.FC<ScreenshotOcrModalProps> = ({
  isOpen,
  onClose,
  onJobExtracted,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [extracted, setExtracted] = useState<{ job: JobListing; notes: string } | null>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setExtracted(null);

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
        setExtracted({ job: res.job, notes: res.unverifiedNotes });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'OCR extraction failed');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!extracted) return;
    setLoading(true);
    try {
      await onJobExtracted(extracted.job, extracted.notes);
      setExtracted(null);
      setPreviewUrl('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save extracted job');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
              Job Screenshot & Document OCR Ingestion
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Upload a public LinkedIn post screenshot, WhatsApp job flyer, or campus notice. Unverified details are flagged transparently.
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

        <div className="mt-5">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center transition-colors hover:border-blue-500 dark:border-slate-700 dark:bg-slate-800/50">
            <ImageUp className="h-8 w-8 text-blue-600" />
            <span className="mt-2 text-sm font-medium text-slate-900 dark:text-white">
              Select job screenshot (PNG, JPG, WEBP)
            </span>
            <span className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              AI extracts title, company, experience, skills, deadline & URL without fabricating missing fields
            </span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => void handleFileChange(e)}
              className="hidden"
            />
          </label>

          {loading && (
            <div className="mt-4 flex items-center gap-2 text-sm text-blue-700 dark:text-blue-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Running multimodal OCR extraction and experience audit...</span>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          )}

          {previewUrl && (
            <div className="mt-4">
              <img
                src={previewUrl}
                alt="Uploaded job screenshot preview"
                className="max-h-48 w-full rounded-lg border border-slate-200 object-contain dark:border-slate-700"
              />
            </div>
          )}

          {extracted && (
            <div className="mt-5 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                  {extracted.job.title} — {extracted.job.company}
                </h3>
                <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                  {extracted.job.verificationStatus}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Category: {extracted.job.category} · Experience: {extracted.job.experienceRequired} · Location: {extracted.job.country}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400">{extracted.job.description}</p>
              <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                Verification Note: {extracted.notes}
              </p>
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
                  onClick={() => void handleSave()}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Save to Job Catalog
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
