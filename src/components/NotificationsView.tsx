import React, { useState } from 'react';
import { BellRing, Check, ExternalLink, Sparkles } from 'lucide-react';
import type { CandidateNotification, CandidateProfile } from '../types';

interface NotificationsViewProps {
  notifications: CandidateNotification[];
  profile: CandidateProfile | null;
  onMarkRead: (id: string) => Promise<void>;
  onOpenJobById: (
    jobId: string,
    fallback: { title: string; company: string; applyUrl: string },
    tab?: 'details' | 'assistant'
  ) => void;
  onUpdatePrefs: (updates: Partial<CandidateProfile>) => Promise<void>;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  notifications,
  profile,
  onMarkRead,
  onOpenJobById,
  onUpdatePrefs,
}) => {
  const [pushStatus, setPushStatus] = useState('');

  const handleEnableBrowserPush = async () => {
    if (!('Notification' in window)) {
      setPushStatus('Browser push notifications are not supported on this device.');
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      await onUpdatePrefs({ notifyPush: true });
      setPushStatus('Web push notifications enabled for matched job alerts.');
    } else {
      setPushStatus('Browser notification permission was declined.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
          Smart Notification Engine
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Personalized alerts for high-match Finance, SAP, Marketing & Analytics roles and approaching deadlines. Duplicate notifications for the same job are suppressed.
        </p>
      </div>

      {/* Notification Channel Preferences */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
          Channel & Consent Preferences
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-xs dark:border-slate-700 cursor-pointer">
            <span className="font-medium text-slate-800 dark:text-slate-200">In-App Alerts</span>
            <input
              type="checkbox"
              checked={profile?.notifyInApp ?? true}
              onChange={(e) => void onUpdatePrefs({ notifyInApp: e.target.checked })}
              className="h-4 w-4 text-blue-600"
            />
          </label>

          <button
            type="button"
            onClick={() => void handleEnableBrowserPush()}
            className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-xs hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            <span className="font-medium text-slate-800 dark:text-slate-200">
              Web Push ({profile?.notifyPush ? 'Enabled' : 'Enable'})
            </span>
            <BellRing className="h-4 w-4 text-blue-600" />
          </button>

          <label className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-xs dark:border-slate-700 cursor-pointer">
            <span className="font-medium text-slate-800 dark:text-slate-200">Email Digest</span>
            <input
              type="checkbox"
              checked={profile?.notifyEmail ?? true}
              onChange={(e) => void onUpdatePrefs({ notifyEmail: e.target.checked })}
              className="h-4 w-4 text-blue-600"
            />
          </label>

          <label className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-xs dark:border-slate-700 cursor-pointer">
            <span className="font-medium text-slate-800 dark:text-slate-200">
              WhatsApp Opt-In (Requires Approved API)
            </span>
            <input
              type="checkbox"
              checked={profile?.notifyWhatsApp ?? false}
              onChange={(e) => void onUpdatePrefs({ notifyWhatsApp: e.target.checked })}
              className="h-4 w-4 text-blue-600"
            />
          </label>
        </div>
        {pushStatus && (
          <p className="mt-3 text-xs text-blue-700 dark:text-blue-400">{pushStatus}</p>
        )}
      </section>

      {/* Personalized Alerts Feed */}
      <section className="space-y-3">
        {notifications.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              No alerts yet. Click "Refresh AI Match Scores" on your Dashboard to generate personalized notifications for ≥70% matches.
            </p>
          </div>
        ) : (
          notifications.map((n) => (
            <article
              key={n.id || n.jobId}
              className={`rounded-xl border p-5 transition-colors ${
                n.read
                  ? 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                  : 'border-blue-300 bg-blue-50/40 dark:border-blue-800 dark:bg-blue-950/20'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>
                  {n.verificationStatus} · Posted {n.postedDate || 'Recent'} · {n.experienceRequired}
                </span>
                <span className="font-mono tabular-nums font-semibold text-blue-700 dark:text-blue-400">
                  {n.matchScore}% Match
                </span>
              </div>

              <h3 className="mt-2 font-display text-base font-semibold text-slate-900 dark:text-white">
                {n.title}
              </h3>
              <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                {n.jobTitle} · {n.company} · {n.location || 'Global'}
                {n.salary && n.salary !== 'Not disclosed' ? ` · ${n.salary}` : ''}
              </p>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onOpenJobById(
                        n.jobId,
                        { title: n.jobTitle, company: n.company, applyUrl: n.applyUrl },
                        'assistant'
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B192C] px-3 py-1.5 text-xs font-medium text-white dark:bg-blue-600"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Open Job & Apply Assistant</span>
                  </button>
                  {!n.read && n.id && (
                    <button
                      type="button"
                      onClick={() => void onMarkRead(n.id!)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Mark Read</span>
                    </button>
                  )}
                </div>

                <a
                  href={n.applyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline dark:text-blue-400"
                >
                  <span>Apply Now</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
};
