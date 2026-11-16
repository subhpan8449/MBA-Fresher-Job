import React, { useState } from 'react';
import { ShieldCheck, Trash2, X } from 'lucide-react';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  isSignedIn: boolean;
  onDeleteAccountData?: () => Promise<void>;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({
  isOpen,
  onClose,
  isSignedIn,
  onDeleteAccountData,
}) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!isOpen) return null;

  const handleDelete = async () => {
    if (!onDeleteAccountData) return;
    setDeleting(true);
    try {
      await onDeleteAccountData();
      setConfirmDelete(false);
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
      <div className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
              Privacy Policy, Fairness & Data Governance
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close privacy dialog"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          <p>
            <strong>Data Minimization:</strong> MBA Fresher Blessing AI stores only the career profile fields you explicitly provide (education, specialization, skills, location preferences, and notification consents) in isolated per-user Firestore records.
          </p>
          <p>
            <strong>Fair & Unbiased Matching:</strong> Our AI matching agent evaluates skills, education compatibility, 0–1 year experience alignment, and location preferences. It never ranks or rejects candidates based on college ranking, age, gender, religion, caste, or disability.
          </p>
          <p>
            <strong>No Automated Application Submission:</strong> The platform never submits job applications or contacts recruiters on your behalf without your explicit review and action.
          </p>
          <p>
            <strong>Legal Job Aggregation:</strong> Discovery uses official ATS boards (Greenhouse, Arbeitnow, Remotive) and public web search grounding without bypassing paywalls, logins, or CAPTCHAs.
          </p>
        </div>

        {isSignedIn && onDeleteAccountData && (
          <div className="mt-6 border-t border-slate-200 pt-4 dark:border-slate-800">
            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-red-300 px-3.5 py-2 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Request Complete Data Deletion</span>
              </button>
            ) : (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/30">
                <p className="text-xs font-medium text-red-800 dark:text-red-300">
                  This permanently deletes your candidate profile, saved jobs, applications, notifications, and match history from Firestore. Proceed?
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => void handleDelete()}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {deleting ? 'Deleting...' : 'Confirm Permanent Deletion'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
