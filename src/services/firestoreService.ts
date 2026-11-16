import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, OWNER_EMAIL } from '../firebase';
import type {
  AiActivityLog,
  AiRecommendation,
  ApplicationStatus,
  ApprovalRequest,
  CandidateNotification,
  CandidateProfile,
  DataSourceConfig,
  InterviewMode,
  JobApplication,
  JobListing,
  PlatformSetting,
  SavedJob,
  UserAccount,
} from '../types';

function cleanId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120) || `id_${Date.now()}`;
}

export async function syncUserOnSignIn(params: {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
}): Promise<UserAccount> {
  const path = `users/${params.uid}`;
  const ref = doc(db, 'users', params.uid);
  const isOwner = params.email === OWNER_EMAIL;
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      const account: UserAccount = {
        uid: params.uid,
        displayName: (params.displayName || 'MBA Candidate').slice(0, 120),
        email: params.email.slice(0, 180),
        ...(params.photoURL ? { photoURL: params.photoURL.slice(0, 500) } : {}),
        role: isOwner ? 'owner' : 'candidate',
        consentAccepted: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(ref, account);
      return account;
    }
    const existing = snap.data() as UserAccount;
    const desiredRole = isOwner ? 'owner' : existing.role;
    await updateDoc(ref, {
      displayName: (params.displayName || existing.displayName).slice(0, 120),
      ...(params.photoURL ? { photoURL: params.photoURL.slice(0, 500) } : {}),
      ...(isOwner && existing.role !== 'owner' ? { role: 'owner' } : {}),
      updatedAt: serverTimestamp(),
    });
    return { ...existing, role: desiredRole };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function ensureCandidateProfile(params: {
  uid: string;
  name: string;
  email: string;
}): Promise<CandidateProfile> {
  const path = `candidateProfiles/${params.uid}`;
  const ref = doc(db, 'candidateProfiles', params.uid);
  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data() as CandidateProfile;
    }
    const profile: CandidateProfile = {
      uid: params.uid,
      name: (params.name || 'MBA Fresher').slice(0, 120),
      email: params.email.slice(0, 180),
      phone: '',
      country: 'India',
      preferredLocations: ['Mumbai', 'Delhi NCR', 'Bengaluru', 'Pune', 'Haldwani'],
      mbaSpecialization: 'Finance Jobs',
      college: '',
      graduationYear: '2026',
      experienceYears: '0-1 Years',
      skills: ['Financial Modeling', 'Excel', 'Corporate Finance', 'FP&A', 'SQL'],
      certifications: [],
      resumeSummary: '',
      resumeFileName: '',
      preferredSalary: 'Competitive / Entry MBA',
      preferredEmploymentType: 'Full-time',
      remotePreference: 'Any',
      visaStatus: 'Authorized to work in India',
      notifyInApp: true,
      notifyPush: false,
      notifyEmail: true,
      notifyWhatsApp: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(ref, profile);
    return profile;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateCandidateProfile(
  uid: string,
  updates: Partial<CandidateProfile>
): Promise<void> {
  const path = `candidateProfiles/${uid}`;
  try {
    const sanitized: Record<string, unknown> = { updatedAt: serverTimestamp() };
    if (updates.name !== undefined) sanitized.name = updates.name.slice(0, 120);
    if (updates.email !== undefined) sanitized.email = updates.email.slice(0, 180);
    if (updates.phone !== undefined) sanitized.phone = updates.phone.slice(0, 40);
    if (updates.country !== undefined) sanitized.country = updates.country.slice(0, 80);
    if (updates.preferredLocations !== undefined)
      sanitized.preferredLocations = updates.preferredLocations.slice(0, 15).map((s) => s.slice(0, 60));
    if (updates.mbaSpecialization !== undefined)
      sanitized.mbaSpecialization = updates.mbaSpecialization.slice(0, 80);
    if (updates.college !== undefined) sanitized.college = updates.college.slice(0, 160);
    if (updates.graduationYear !== undefined)
      sanitized.graduationYear = updates.graduationYear.slice(0, 16);
    if (updates.experienceYears !== undefined)
      sanitized.experienceYears = updates.experienceYears.slice(0, 40);
    if (updates.skills !== undefined)
      sanitized.skills = updates.skills.slice(0, 30).map((s) => s.slice(0, 60));
    if (updates.certifications !== undefined)
      sanitized.certifications = updates.certifications.slice(0, 20).map((s) => s.slice(0, 100));
    if (updates.resumeSummary !== undefined)
      sanitized.resumeSummary = updates.resumeSummary.slice(0, 12000);
    if (updates.resumeFileName !== undefined)
      sanitized.resumeFileName = updates.resumeFileName.slice(0, 180);
    if (updates.preferredSalary !== undefined)
      sanitized.preferredSalary = updates.preferredSalary.slice(0, 80);
    if (updates.preferredEmploymentType !== undefined)
      sanitized.preferredEmploymentType = updates.preferredEmploymentType.slice(0, 60);
    if (updates.remotePreference !== undefined) sanitized.remotePreference = updates.remotePreference;
    if (updates.visaStatus !== undefined) sanitized.visaStatus = updates.visaStatus.slice(0, 120);
    if (updates.notifyInApp !== undefined) sanitized.notifyInApp = Boolean(updates.notifyInApp);
    if (updates.notifyPush !== undefined) sanitized.notifyPush = Boolean(updates.notifyPush);
    if (updates.notifyEmail !== undefined) sanitized.notifyEmail = Boolean(updates.notifyEmail);
    if (updates.notifyWhatsApp !== undefined)
      sanitized.notifyWhatsApp = Boolean(updates.notifyWhatsApp);

    await updateDoc(doc(db, 'candidateProfiles', uid), sanitized);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function saveDiscoveredJobsToFirestore(
  jobs: JobListing[],
  actorUid: string,
  isAdmin: boolean
): Promise<number> {
  if (jobs.length === 0) return 0;
  const batch = writeBatch(db);
  let count = 0;
  for (const job of jobs.slice(0, 25)) {
    const jobId = cleanId(job.jobId);
    const ref = doc(db, 'jobs', jobId);
    const status = isAdmin
      ? job.verificationStatus
      : job.verificationStatus === 'Verified'
        ? 'Partially Verified'
        : job.verificationStatus;

    const validCategory =
      job.category === 'Finance Jobs' ||
      job.category === 'SAP FICO Jobs' ||
      job.category === 'Business Analytics Jobs' ||
      job.category === 'Marketing Jobs'
        ? job.category
        : 'Finance Jobs';

    const payload: Record<string, unknown> = {
      jobId,
      title: (job.title || 'MBA Analyst').slice(0, 200),
      company: (job.company || 'Company').slice(0, 160),
      region: job.region === 'India' || (job.country || '').toLowerCase().includes('india') ? 'India' : 'International',
      country: (job.country || 'India').slice(0, 100),
      city: (job.city || '').slice(0, 100),
      workMode: job.workMode || 'Unspecified',
      experienceRequired: (job.experienceRequired || '0-1 Years').slice(0, 100),
      isFresherFriendly: Boolean(job.isFresherFriendly),
      experienceTier: job.experienceTier || '0-1 Years',
      experienceCheck: job.experienceCheck || 'Confirmed 0-1 Yr',
      mbaEligible: Boolean(job.mbaEligible ?? true),
      qualificationCheck: job.qualificationCheck || 'Confirmed MBA Eligible',
      feedBucket: job.feedBucket || (status === 'Verified' ? 'Verified MBA Fresher Jobs' : 'Partially Verified Jobs'),
      educationRequired: (job.educationRequired || 'MBA').slice(0, 200),
      category: validCategory,
      mbaSpecialization: (job.mbaSpecialization || validCategory).slice(0, 120),
      skills: (job.skills || []).slice(0, 25).map((s) => s.slice(0, 60)),
      salary: (job.salary || 'Not specified').slice(0, 120),
      employmentType: (job.employmentType || 'Full-time').slice(0, 80),
      description: (job.description || '').slice(0, 15000),
      deadline: (job.deadline || 'Open').slice(0, 80),
      postedDate: (job.postedDate || new Date().toISOString().slice(0, 10)).slice(0, 80),
      lastVerifiedDate: (job.lastVerifiedDate || new Date().toISOString().slice(0, 10)).slice(0, 80),
      sourceName: (job.sourceName || 'Verified ATS').slice(0, 120),
      originalJobUrl: (job.originalJobUrl || job.applyUrl).slice(0, 1000),
      sourceUrls: (job.sourceUrls || [job.originalJobUrl || job.applyUrl]).slice(0, 10).map((u) => u.slice(0, 500)),
      applyUrl: job.applyUrl.slice(0, 1000),
      recruiterInfo: (job.recruiterInfo || 'Not specified').slice(0, 300),
      visaSponsorship: (job.visaSponsorship || 'Not specified').slice(0, 160),
      verificationStatus: status,
      duplicateKey: (job.duplicateKey || jobId).slice(0, 200),
      visibility: job.visibility || 'public',
      createdBy: actorUid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (job.extractedClaims) {
      payload.extractedClaims = job.extractedClaims.slice(0, 1500);
    }
    if (job.scamWarning) {
      payload.scamWarning = job.scamWarning.slice(0, 500);
    }

    batch.set(ref, payload);
    count += 1;
  }
  try {
    await batch.commit();
    return count;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'jobs');
  }
}

export async function updateJobVerificationInFirestore(
  jobId: string,
  updates: Partial<
    Pick<
      JobListing,
      | 'verificationStatus'
      | 'lastVerifiedDate'
      | 'visibility'
      | 'isFresherFriendly'
      | 'experienceTier'
      | 'experienceCheck'
      | 'mbaEligible'
      | 'qualificationCheck'
      | 'feedBucket'
      | 'scamWarning'
    >
  >
): Promise<void> {
  const id = cleanId(jobId);
  try {
    await updateDoc(doc(db, 'jobs', id), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `jobs/${id}`);
  }
}

export async function deleteJobFromFirestore(jobId: string): Promise<void> {
  const id = cleanId(jobId);
  try {
    await deleteDoc(doc(db, 'jobs', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `jobs/${id}`);
  }
}

export async function toggleSaveJob(uid: string, job: JobListing, alreadySavedId?: string): Promise<void> {
  if (alreadySavedId) {
    try {
      await deleteDoc(doc(db, 'savedJobs', alreadySavedId));
      return;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `savedJobs/${alreadySavedId}`);
    }
  }
  const savedId = cleanId(`${uid}_${job.jobId}`);
  try {
    await setDoc(doc(db, 'savedJobs', savedId), {
      uid,
      jobId: cleanId(job.jobId),
      jobTitle: job.title.slice(0, 200),
      company: job.company.slice(0, 160),
      category: job.category.slice(0, 80),
      applyUrl: job.applyUrl.slice(0, 1000),
      verificationStatus: job.verificationStatus,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `savedJobs/${savedId}`);
  }
}

export interface ApplicationProcessUpdates {
  status?: ApplicationStatus;
  notes?: string;
  deadline?: string;
  appliedDate?: string;
  applicationRefId?: string;
  nextActionDate?: string;
  interviewRound?: string;
  interviewDateTime?: string;
  interviewMode?: InterviewMode;
  interviewerName?: string;
  interviewLink?: string;
  interviewPrepChecklist?: string[];
  processTimeline?: string[];
}

export async function upsertApplication(
  uid: string,
  job: Pick<JobListing, 'jobId' | 'title' | 'company' | 'category' | 'applyUrl' | 'deadline'>,
  status: ApplicationStatus,
  notes = '',
  extraUpdates?: ApplicationProcessUpdates
): Promise<void> {
  const appId = cleanId(`${uid}_${job.jobId}`);
  const ref = doc(db, 'applications', appId);
  try {
    const existingSnap = await getDoc(ref);
    const today = new Date().toISOString().slice(0, 10);

    const sanitizedExtra: Record<string, unknown> = {};
    if (extraUpdates?.deadline !== undefined) sanitizedExtra.deadline = extraUpdates.deadline.slice(0, 80);
    if (extraUpdates?.appliedDate !== undefined)
      sanitizedExtra.appliedDate = extraUpdates.appliedDate.slice(0, 40);
    if (extraUpdates?.applicationRefId !== undefined)
      sanitizedExtra.applicationRefId = extraUpdates.applicationRefId.slice(0, 120);
    if (extraUpdates?.nextActionDate !== undefined)
      sanitizedExtra.nextActionDate = extraUpdates.nextActionDate.slice(0, 40);
    if (extraUpdates?.interviewRound !== undefined)
      sanitizedExtra.interviewRound = extraUpdates.interviewRound.slice(0, 120);
    if (extraUpdates?.interviewDateTime !== undefined)
      sanitizedExtra.interviewDateTime = extraUpdates.interviewDateTime.slice(0, 60);
    if (extraUpdates?.interviewMode !== undefined) sanitizedExtra.interviewMode = extraUpdates.interviewMode;
    if (extraUpdates?.interviewerName !== undefined)
      sanitizedExtra.interviewerName = extraUpdates.interviewerName.slice(0, 120);
    if (extraUpdates?.interviewLink !== undefined)
      sanitizedExtra.interviewLink = extraUpdates.interviewLink.slice(0, 500);
    if (extraUpdates?.interviewPrepChecklist !== undefined) {
      sanitizedExtra.interviewPrepChecklist = extraUpdates.interviewPrepChecklist
        .slice(0, 10)
        .map((s) => s.slice(0, 200));
    }
    if (extraUpdates?.processTimeline !== undefined) {
      sanitizedExtra.processTimeline = extraUpdates.processTimeline
        .slice(0, 15)
        .map((s) => s.slice(0, 240));
    }

    if (!existingSnap.exists()) {
      const initialTimeline =
        extraUpdates?.processTimeline || [`${today}: Added as ${status}`];
      await setDoc(ref, {
        uid,
        jobId: cleanId(job.jobId),
        jobTitle: job.title.slice(0, 200),
        company: job.company.slice(0, 160),
        category: (job.category || 'Finance Jobs').slice(0, 80),
        applyUrl: job.applyUrl.slice(0, 1000),
        status,
        notes: notes.slice(0, 3000),
        deadline: (extraUpdates?.deadline || job.deadline || 'Open').slice(0, 80),
        ...(status === 'Applied' && !extraUpdates?.appliedDate ? { appliedDate: today } : {}),
        interviewMode: extraUpdates?.interviewMode || 'None',
        processTimeline: initialTimeline,
        ...sanitizedExtra,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const existingData = existingSnap.data() as JobApplication;
      const timeline =
        (sanitizedExtra.processTimeline as string[] | undefined) ??
        existingData.processTimeline ??
        [];
      const statusChanged = existingData.status !== status;
      const nextTimeline = statusChanged
        ? [...timeline, `${today}: Stage moved to ${status}`].slice(-15)
        : timeline;

      await updateDoc(ref, {
        status,
        notes: notes.slice(0, 3000),
        ...(status === 'Applied' && !existingData.appliedDate && !extraUpdates?.appliedDate
          ? { appliedDate: today }
          : {}),
        ...sanitizedExtra,
        processTimeline: nextTimeline,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `applications/${appId}`);
  }
}

export async function createPersonalizedNotification(params: {
  uid: string;
  job: JobListing;
  matchScore: number;
  title: string;
  channel?: 'in_app' | 'push' | 'email' | 'whatsapp';
}): Promise<void> {
  const notifId = cleanId(`${params.uid}_${params.job.jobId}`);
  const ref = doc(db, 'notifications', notifId);
  try {
    const existing = await getDoc(ref);
    if (existing.exists()) {
      return;
    }
    await setDoc(ref, {
      uid: params.uid,
      jobId: cleanId(params.job.jobId),
      category: params.job.category.slice(0, 80),
      title: params.title.slice(0, 240),
      jobTitle: params.job.title.slice(0, 200),
      company: params.job.company.slice(0, 160),
      location: `${params.job.city ? `${params.job.city}, ` : ''}${params.job.country}`.slice(0, 140),
      experienceRequired: params.job.experienceRequired.slice(0, 100),
      salary: (params.job.salary || 'Not disclosed').slice(0, 100),
      matchScore: Math.max(0, Math.min(100, Math.round(params.matchScore))),
      verificationStatus: params.job.verificationStatus,
      postedDate: (params.job.postedDate || new Date().toISOString().slice(0, 10)).slice(0, 80),
      applyUrl: params.job.applyUrl.slice(0, 1000),
      channel: params.channel || 'in_app',
      read: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `notifications/${notifId}`);
  }
}

export async function markNotificationRead(notifId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'notifications', notifId), {
      read: true,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `notifications/${notifId}`);
  }
}

export async function saveAiRecommendations(
  uid: string,
  matches: Array<{ jobId: string; matchScore: number; reasons: string[]; missingRequirements: string[] }>
): Promise<void> {
  const batch = writeBatch(db);
  for (const m of matches.slice(0, 25)) {
    const recId = cleanId(`${uid}_${m.jobId}`);
    batch.set(doc(db, 'aiRecommendations', recId), {
      recId,
      uid,
      jobId: cleanId(m.jobId),
      matchScore: Math.max(0, Math.min(100, Math.round(m.matchScore))),
      reasons: (m.reasons || []).slice(0, 10).map((s) => s.slice(0, 240)),
      missingRequirements: (m.missingRequirements || []).slice(0, 10).map((s) => s.slice(0, 240)),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'aiRecommendations');
  }
}

export async function logAiActivity(params: {
  agentName: string;
  action: string;
  status: AiActivityLog['status'];
  summary: string;
  modelUsed: string;
  actorUid: string;
}): Promise<void> {
  const logId = cleanId(`log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`);
  try {
    await setDoc(doc(db, 'aiLogs', logId), {
      logId,
      agentName: params.agentName.slice(0, 100),
      action: params.action.slice(0, 160),
      status: params.status,
      summary: params.summary.slice(0, 1000),
      modelUsed: params.modelUsed.slice(0, 80),
      actorUid: params.actorUid,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `aiLogs/${logId}`);
  }
}

export async function bootstrapOwnerControls(ownerUid: string): Promise<void> {
  try {
    const settingsRef = doc(db, 'platformSettings', 'global');
    const settingsSnap = await getDoc(settingsRef);
    if (!settingsSnap.exists()) {
      await setDoc(settingsRef, {
        settingId: 'global',
        monitoringFrequencyMinutes: 60,
        dailyAiSpendCapUsd: 25,
        primaryAiProvider: 'Google Gemini',
        primaryAiModel: 'gemini-4-hydrogen',
        autoVerifyUrls: true,
        autoArchiveExpired: true,
        requireOwnerApprovalForOutreach: true,
        updatedBy: ownerUid,
        updatedAt: serverTimestamp(),
      });
    }

    const defaultSources: Array<Omit<DataSourceConfig, 'createdAt' | 'updatedAt'>> = [
      {
        sourceId: 'greenhouse_boards',
        name: 'Greenhouse Official ATS Boards',
        sourceType: 'Official ATS JSON API',
        baseUrl: 'https://boards-api.greenhouse.io',
        enabled: true,
        healthStatus: 'Healthy',
        jobsDiscovered: 0,
        lastSyncAt: new Date().toISOString(),
        updatedBy: ownerUid,
      },
      {
        sourceId: 'arbeitnow_board',
        name: 'Arbeitnow Global & Remote Board',
        sourceType: 'Public Job API',
        baseUrl: 'https://www.arbeitnow.com/api/job-board-api',
        enabled: true,
        healthStatus: 'Healthy',
        jobsDiscovered: 0,
        lastSyncAt: new Date().toISOString(),
        updatedBy: ownerUid,
      },
      {
        sourceId: 'remotive_remote',
        name: 'Remotive Finance & Marketing Feed',
        sourceType: 'Public Remote Feed',
        baseUrl: 'https://remotive.com/api/remote-jobs',
        enabled: true,
        healthStatus: 'Healthy',
        jobsDiscovered: 0,
        lastSyncAt: new Date().toISOString(),
        updatedBy: ownerUid,
      },
      {
        sourceId: 'google_search_grounding',
        name: 'Google Search Grounded Discovery (LinkedIn / Naukri / Workday / Indeed)',
        sourceType: 'AI Search Grounding',
        baseUrl: 'https://www.google.com',
        enabled: true,
        healthStatus: 'Healthy',
        jobsDiscovered: 0,
        lastSyncAt: new Date().toISOString(),
        updatedBy: ownerUid,
      },
      {
        sourceId: 'ocr_screenshot_ingest',
        name: 'User Screenshot & Flyer OCR Pipeline',
        sourceType: 'Multimodal OCR',
        baseUrl: 'internal://ocr',
        enabled: true,
        healthStatus: 'Healthy',
        jobsDiscovered: 0,
        lastSyncAt: new Date().toISOString(),
        updatedBy: ownerUid,
      },
    ];

    for (const src of defaultSources) {
      const ref = doc(db, 'dataSources', src.sourceId);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, {
          ...src,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    }

    const reqId = 'req_initial_policy';
    const reqRef = doc(db, 'approvalRequests', reqId);
    const reqSnap = await getDoc(reqRef);
    if (!reqSnap.exists()) {
      await setDoc(reqRef, {
        requestId: reqId,
        actionType: 'Notification Policy',
        title: 'Enable Automated WhatsApp Digest Channel',
        description:
          'Notification Agent requests owner approval before activating WhatsApp Business webhook delivery for opted-in Finance candidates.',
        requestedByAgent: 'Notification Agent',
        status: 'Pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'platformSettings/global');
  }
}

export async function updateApprovalRequestStatus(
  requestId: string,
  status: 'Approved' | 'Rejected',
  reviewerUid: string
): Promise<void> {
  try {
    await updateDoc(doc(db, 'approvalRequests', requestId), {
      status,
      reviewedBy: reviewerUid,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `approvalRequests/${requestId}`);
  }
}

export async function toggleDataSource(sourceId: string, enabled: boolean, uid: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'dataSources', sourceId), {
      enabled,
      healthStatus: enabled ? 'Healthy' : 'Disabled',
      updatedBy: uid,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `dataSources/${sourceId}`);
  }
}

export async function updatePlatformSettings(
  updates: Partial<PlatformSetting>,
  ownerUid: string
): Promise<void> {
  try {
    await updateDoc(doc(db, 'platformSettings', 'global'), {
      ...updates,
      updatedBy: ownerUid,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, 'platformSettings/global');
  }
}

export async function deleteAllCandidateData(uid: string): Promise<void> {
  try {
    const batch = writeBatch(db);
    const collectionsToClean = ['savedJobs', 'applications', 'notifications', 'aiRecommendations'];
    for (const colName of collectionsToClean) {
      const q = query(collection(db, colName), where('uid', '==', uid));
      const snap = await getDocs(q);
      snap.forEach((d) => batch.delete(d.ref));
    }
    batch.delete(doc(db, 'candidateProfiles', uid));
    batch.delete(doc(db, 'users', uid));
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${uid}`);
  }
}

// --- Real-time Bounded Subscriptions ---

export function subscribePublicJobs(onData: (jobs: JobListing[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'jobs'),
    where('visibility', '==', 'public'),
    limit(60)
  );
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => d.data() as JobListing));
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'jobs')
  );
}

export function subscribeCandidateProfile(
  uid: string,
  onData: (profile: CandidateProfile | null) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, 'candidateProfiles', uid),
    (snap) => {
      onData(snap.exists() ? (snap.data() as CandidateProfile) : null);
    },
    (error) => handleFirestoreError(error, OperationType.GET, `candidateProfiles/${uid}`)
  );
}

export function subscribeSavedJobs(uid: string, onData: (items: SavedJob[]) => void): Unsubscribe {
  const q = query(collection(db, 'savedJobs'), where('uid', '==', uid), limit(100));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SavedJob, 'id'>) })));
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'savedJobs')
  );
}

export function subscribeApplications(
  uid: string,
  onData: (items: JobApplication[]) => void
): Unsubscribe {
  const q = query(collection(db, 'applications'), where('uid', '==', uid), limit(100));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<JobApplication, 'id'>) })));
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'applications')
  );
}

export function subscribeNotifications(
  uid: string,
  onData: (items: CandidateNotification[]) => void
): Unsubscribe {
  const q = query(collection(db, 'notifications'), where('uid', '==', uid), limit(60));
  return onSnapshot(
    q,
    (snap) => {
      onData(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CandidateNotification, 'id'>) }))
      );
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'notifications')
  );
}

export function subscribeAiRecommendations(
  uid: string,
  onData: (items: AiRecommendation[]) => void
): Unsubscribe {
  const q = query(collection(db, 'aiRecommendations'), where('uid', '==', uid), limit(100));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => d.data() as AiRecommendation));
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'aiRecommendations')
  );
}

export function subscribeOwnerCollections(callbacks: {
  onCandidates: (profiles: CandidateProfile[]) => void;
  onDataSources: (sources: DataSourceConfig[]) => void;
  onLogs: (logs: AiActivityLog[]) => void;
  onApprovals: (requests: ApprovalRequest[]) => void;
  onSettings: (settings: PlatformSetting | null) => void;
}): Unsubscribe[] {
  const unsubs: Unsubscribe[] = [];

  unsubs.push(
    onSnapshot(
      query(collection(db, 'candidateProfiles'), limit(100)),
      (snap) => callbacks.onCandidates(snap.docs.map((d) => d.data() as CandidateProfile)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'candidateProfiles')
    )
  );
  unsubs.push(
    onSnapshot(
      collection(db, 'dataSources'),
      (snap) => callbacks.onDataSources(snap.docs.map((d) => d.data() as DataSourceConfig)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'dataSources')
    )
  );
  unsubs.push(
    onSnapshot(
      query(collection(db, 'aiLogs'), orderBy('createdAt', 'desc'), limit(50)),
      (snap) => callbacks.onLogs(snap.docs.map((d) => d.data() as AiActivityLog)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'aiLogs')
    )
  );
  unsubs.push(
    onSnapshot(
      collection(db, 'approvalRequests'),
      (snap) => callbacks.onApprovals(snap.docs.map((d) => d.data() as ApprovalRequest)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'approvalRequests')
    )
  );
  unsubs.push(
    onSnapshot(
      doc(db, 'platformSettings', 'global'),
      (snap) => callbacks.onSettings(snap.exists() ? (snap.data() as PlatformSetting) : null),
      (err) => handleFirestoreError(err, OperationType.GET, 'platformSettings/global')
    )
  );

  return unsubs;
}
