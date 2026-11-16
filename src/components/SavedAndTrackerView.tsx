import React, { useState } from 'react';
import {
  BookmarkMinus,
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  Plus,
  Sparkles,
  Video,
} from 'lucide-react';
import type { ApplicationProcessUpdates } from '../services/firestoreService';
import type {
  ApplicationStatus,
  InterviewMode,
  JobApplication,
  JobListing,
  SavedJob,
} from '../types';

interface SavedAndTrackerViewProps {
  mode: 'saved' | 'applications';
  savedJobs: SavedJob[];
  applications: JobApplication[];
  jobs: JobListing[];
  filterCategory?: string;
  onOpenJobById: (
    jobId: string,
    fallback: { title: string; company: string; applyUrl: string },
    tab?: 'details' | 'assistant'
  ) => void;
  onRemoveSaved: (savedId: string) => Promise<void>;
  onUpdateApplication: (
    app: JobApplication,
    status: ApplicationStatus,
    notes: string,
    extra?: ApplicationProcessUpdates
  ) => Promise<void>;
}

const APPLICATION_STAGES: ApplicationStatus[] = [
  'Preparing',
  'Applied',
  'Assessment',
  'Interview Scheduled',
  'Offer',
  'Closed',
  'Rejected',
];

const INTERVIEW_MODES: InterviewMode[] = [
  'None',
  'Video Call',
  'In-Person',
  'Phone',
  'Online Assessment',
];

export const SavedAndTrackerView: React.FC<SavedAndTrackerViewProps> = ({
  mode,
  savedJobs,
  applications,
  filterCategory,
  onOpenJobById,
  onRemoveSaved,
  onUpdateApplication,
}) => {
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Partial<JobApplication>>>({});
  const [newTimelineNote, setNewTimelineNote] = useState<Record<string, string>>({});
  const [newChecklistItem, setNewChecklistItem] = useState<Record<string, string>>({});

  const visibleSaved = filterCategory
    ? savedJobs.filter((s) => s.category === filterCategory)
    : savedJobs;
  const visibleApps = filterCategory
    ? applications.filter((a) => a.category === filterCategory)
    : applications;

  const getDraft = (app: JobApplication): JobApplication => ({
    ...app,
    ...(drafts[app.jobId] || {}),
  });

  const patchDraft = (jobId: string, patch: Partial<JobApplication>) => {
    setDrafts((prev) => ({
      ...prev,
      [jobId]: { ...(prev[jobId] || {}), ...patch },
    }));
  };

  if (mode === 'saved') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            {filterCategory ? `${filterCategory} — Saved Jobs` : 'Saved MBA Opportunities'}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Bookmarked opportunities synced across your devices via Cloud Firestore.
          </p>
        </div>

        {visibleSaved.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              No saved jobs yet. Bookmark opportunities from Finance Jobs, SAP FICO, Analytics, or Marketing to review them here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {visibleSaved.map((item) => (
              <div
                key={item.id || item.jobId}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
              >
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {item.category || 'Finance Jobs'} · {item.verificationStatus || 'Verified'}
                  </p>
                  <h2 className="mt-1.5 font-display text-lg font-semibold text-slate-900 dark:text-white">
                    {item.jobTitle}
                  </h2>
                  <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">{item.company}</p>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() =>
                      onOpenJobById(
                        item.jobId,
                        { title: item.jobTitle, company: item.company, applyUrl: item.applyUrl },
                        'assistant'
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B192C] px-3 py-1.5 text-xs font-medium text-white dark:bg-blue-600"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Open Apply Assistant</span>
                  </button>
                  <div className="flex items-center gap-2">
                    {item.id && (
                      <button
                        type="button"
                        onClick={() => void onRemoveSaved(item.id!)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                      >
                        <BookmarkMinus className="h-3.5 w-3.5" />
                        <span>Remove</span>
                      </button>
                    )}
                    <a
                      href={item.applyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline dark:text-blue-400"
                    >
                      <span>Apply</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const scheduledInterviews = visibleApps.filter(
    (a) => a.status === 'Interview Scheduled' || Boolean(a.interviewDateTime)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            {filterCategory
              ? `${filterCategory} — Applied Process & Interview Tracker`
              : 'Applied Job Process Update & Interview Schedule'}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Update application stages, confirmation IDs, interview rounds, dates/times, meeting links, and prep checklists.
          </p>
        </div>
        <div className="font-mono tabular-nums text-xs text-slate-600 dark:text-slate-300">
          {visibleApps.length} tracked · {scheduledInterviews.length} scheduled interviews
        </div>
      </div>

      {/* Upcoming Interview Schedule Summary */}
      {scheduledInterviews.length > 0 && (
        <section className="rounded-xl border border-blue-200 bg-blue-50/50 p-5 dark:border-blue-900/50 dark:bg-blue-950/20">
          <div className="flex items-center gap-2 text-sm font-semibold text-blue-900 dark:text-blue-200">
            <CalendarClock className="h-4 w-4" />
            <span>Upcoming Interview & Assessment Schedule</span>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            {scheduledInterviews.map((item) => (
              <div
                key={`sched-${item.jobId}`}
                className="rounded-lg border border-blue-200 bg-white p-3.5 text-xs dark:border-slate-800 dark:bg-slate-900"
              >
                <p className="font-semibold text-slate-900 dark:text-white">
                  {item.jobTitle} — {item.company}
                </p>
                <p className="mt-1 text-slate-600 dark:text-slate-300">
                  {item.interviewRound || 'Interview Round'} ·{' '}
                  <span className="font-mono">{item.interviewDateTime || 'Time TBD'}</span> ·{' '}
                  {item.interviewMode || 'Video Call'}
                </p>
                {item.interviewerName && (
                  <p className="mt-0.5 text-slate-500 dark:text-slate-400">
                    Panel / Contact: {item.interviewerName}
                  </p>
                )}
                {item.interviewLink && (
                  <a
                    href={item.interviewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1.5 inline-flex items-center gap-1 font-medium text-blue-700 hover:underline dark:text-blue-400"
                  >
                    <Video className="h-3.5 w-3.5" />
                    <span>Join / Open Interview Link</span>
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {visibleApps.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            No tracked applications yet. Open any job and click "Mark as Applied" or "Apply" to track your application process and interview schedule.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleApps.map((app) => {
            const draft = getDraft(app);
            const isEditing = editingJobId === app.jobId;
            const inputClass =
              'mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100';

            return (
              <div
                key={app.id || app.jobId}
                className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {app.category || 'Finance Jobs'} · Applied: {app.appliedDate || 'Pending'} · Deadline: {app.deadline || 'Open'}
                      {app.applicationRefId ? ` · Ref: ${app.applicationRefId}` : ''}
                    </p>
                    <h2 className="mt-1 font-display text-lg font-semibold text-slate-900 dark:text-white">
                      {app.jobTitle} — {app.company}
                    </h2>
                    {app.interviewDateTime && (
                      <p className="mt-1 text-xs font-medium text-blue-700 dark:text-blue-400">
                        Scheduled: {app.interviewRound || 'Interview'} on{' '}
                        <span className="font-mono">{app.interviewDateTime}</span> ({app.interviewMode || 'Video Call'})
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={draft.status}
                      onChange={(e) => {
                        const nextStatus = e.target.value as ApplicationStatus;
                        patchDraft(app.jobId, { status: nextStatus });
                        void onUpdateApplication(app, nextStatus, draft.notes || '', {
                          appliedDate: draft.appliedDate,
                          applicationRefId: draft.applicationRefId,
                          nextActionDate: draft.nextActionDate,
                          interviewRound: draft.interviewRound,
                          interviewDateTime: draft.interviewDateTime,
                          interviewMode: draft.interviewMode,
                          interviewerName: draft.interviewerName,
                          interviewLink: draft.interviewLink,
                          interviewPrepChecklist: draft.interviewPrepChecklist,
                          processTimeline: draft.processTimeline,
                        });
                      }}
                      aria-label={`Application status for ${app.jobTitle}`}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      {APPLICATION_STAGES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => setEditingJobId(isEditing ? null : app.jobId)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
                    >
                      <CalendarClock className="h-3.5 w-3.5" />
                      <span>{isEditing ? 'Close Schedule Editor' : 'Process & Interview Schedule'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        onOpenJobById(
                          app.jobId,
                          { title: app.jobTitle, company: app.company, applyUrl: app.applyUrl },
                          'assistant'
                        )
                      }
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
                    >
                      Prep Assistant
                    </button>

                    <a
                      href={app.applyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-blue-600 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-400"
                    >
                      <span>Portal</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>

                {/* Expanded Apply Process & Interview Schedule Editor */}
                {isEditing && (
                  <div className="mt-5 space-y-5 border-t border-slate-100 pt-5 dark:border-slate-800">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                          Applied Date
                        </label>
                        <input
                          type="date"
                          value={draft.appliedDate || ''}
                          onChange={(e) => patchDraft(app.jobId, { appliedDate: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                          Application Reference ID
                        </label>
                        <input
                          type="text"
                          value={draft.applicationRefId || ''}
                          onChange={(e) => patchDraft(app.jobId, { applicationRefId: e.target.value })}
                          placeholder="e.g., REQ-2026-4812"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                          Next Follow-up / Action Date
                        </label>
                        <input
                          type="date"
                          value={draft.nextActionDate || ''}
                          onChange={(e) => patchDraft(app.jobId, { nextActionDate: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                          Interview Round
                        </label>
                        <input
                          type="text"
                          value={draft.interviewRound || ''}
                          onChange={(e) => patchDraft(app.jobId, { interviewRound: e.target.value })}
                          placeholder="e.g., Round 1: Technical Finance / Case"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                          Interview Date & Time
                        </label>
                        <input
                          type="datetime-local"
                          value={draft.interviewDateTime || ''}
                          onChange={(e) => patchDraft(app.jobId, { interviewDateTime: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                          Interview Mode
                        </label>
                        <select
                          value={draft.interviewMode || 'None'}
                          onChange={(e) =>
                            patchDraft(app.jobId, { interviewMode: e.target.value as InterviewMode })
                          }
                          className={inputClass}
                        >
                          {INTERVIEW_MODES.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                          Interviewer / HR Contact
                        </label>
                        <input
                          type="text"
                          value={draft.interviewerName || ''}
                          onChange={(e) => patchDraft(app.jobId, { interviewerName: e.target.value })}
                          placeholder="Name or panel role"
                          className={inputClass}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                          Meeting Link / Venue Address
                        </label>
                        <input
                          type="text"
                          value={draft.interviewLink || ''}
                          onChange={(e) => patchDraft(app.jobId, { interviewLink: e.target.value })}
                          placeholder="https://meet... or office address"
                          className={inputClass}
                        />
                      </div>
                    </div>

                    {/* Interview Prep Checklist & Process Timeline */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="rounded-lg border border-slate-200 p-3.5 dark:border-slate-800">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          Interview Prep Checklist
                        </p>
                        <ul className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                          {(draft.interviewPrepChecklist || []).map((item, idx) => (
                            <li key={idx} className="flex items-center justify-between gap-2">
                              <span>• {item}</span>
                              <button
                                type="button"
                                onClick={() =>
                                  patchDraft(app.jobId, {
                                    interviewPrepChecklist: (draft.interviewPrepChecklist || []).filter(
                                      (_, i) => i !== idx
                                    ),
                                  })
                                }
                                className="text-[11px] text-red-600 hover:underline"
                              >
                                Remove
                              </button>
                            </li>
                          ))}
                        </ul>
                        <div className="mt-2 flex gap-2">
                          <input
                            type="text"
                            value={newChecklistItem[app.jobId] || ''}
                            onChange={(e) =>
                              setNewChecklistItem((prev) => ({ ...prev, [app.jobId]: e.target.value }))
                            }
                            placeholder="Add prep item (e.g., 3-statement model)..."
                            className="flex-1 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const val = (newChecklistItem[app.jobId] || '').trim();
                              if (!val) return;
                              patchDraft(app.jobId, {
                                interviewPrepChecklist: [
                                  ...(draft.interviewPrepChecklist || []),
                                  val,
                                ].slice(0, 10),
                              });
                              setNewChecklistItem((prev) => ({ ...prev, [app.jobId]: '' }));
                            }}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium dark:border-slate-700"
                          >
                            <Plus className="h-3 w-3" />
                            <span>Add</span>
                          </button>
                        </div>
                      </div>

                      <div className="rounded-lg border border-slate-200 p-3.5 dark:border-slate-800">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          Process Timeline Updates
                        </p>
                        <ul className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                          {(draft.processTimeline || []).map((entry, idx) => (
                            <li key={idx}>• {entry}</li>
                          ))}
                        </ul>
                        <div className="mt-2 flex gap-2">
                          <input
                            type="text"
                            value={newTimelineNote[app.jobId] || ''}
                            onChange={(e) =>
                              setNewTimelineNote((prev) => ({ ...prev, [app.jobId]: e.target.value }))
                            }
                            placeholder="Log update (e.g., Assessment completed)..."
                            className="flex-1 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const val = (newTimelineNote[app.jobId] || '').trim();
                              if (!val) return;
                              const stamp = new Date().toISOString().slice(0, 10);
                              patchDraft(app.jobId, {
                                processTimeline: [
                                  ...(draft.processTimeline || []),
                                  `${stamp}: ${val}`,
                                ].slice(-15),
                              });
                              setNewTimelineNote((prev) => ({ ...prev, [app.jobId]: '' }));
                            }}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium dark:border-slate-700"
                          >
                            <Plus className="h-3 w-3" />
                            <span>Log</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Quick Notes & Save Process Button */}
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <input
                    type="text"
                    value={draft.notes || ''}
                    onChange={(e) => patchDraft(app.jobId, { notes: e.target.value })}
                    placeholder="Add recruiter notes, salary expectations, or follow-up reminders..."
                    className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      void onUpdateApplication(app, draft.status, draft.notes || '', {
                        appliedDate: draft.appliedDate,
                        applicationRefId: draft.applicationRefId,
                        nextActionDate: draft.nextActionDate,
                        interviewRound: draft.interviewRound,
                        interviewDateTime: draft.interviewDateTime,
                        interviewMode: draft.interviewMode,
                        interviewerName: draft.interviewerName,
                        interviewLink: draft.interviewLink,
                        interviewPrepChecklist: draft.interviewPrepChecklist,
                        processTimeline: draft.processTimeline,
                      })
                    }
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#0B192C] px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 dark:bg-blue-600 whitespace-nowrap shrink-0"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Save Process & Schedule</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
