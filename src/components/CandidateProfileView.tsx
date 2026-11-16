import React, { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Shield } from 'lucide-react';
import type { CandidateProfile } from '../types';

interface CandidateProfileViewProps {
  profile: CandidateProfile | null;
  onSaveProfile: (updates: Partial<CandidateProfile>) => Promise<void>;
  onOpenPrivacy: () => void;
}

export const CandidateProfileView: React.FC<CandidateProfileViewProps> = ({
  profile,
  onSaveProfile,
  onOpenPrivacy,
}) => {
  const [name, setName] = useState(profile?.name || '');
  const [email, setEmail] = useState(profile?.email || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [country, setCountry] = useState(profile?.country || 'India');
  const [locationsText, setLocationsText] = useState((profile?.preferredLocations || []).join(', '));
  const [mbaSpecialization, setMbaSpecialization] = useState(
    profile?.mbaSpecialization || 'Finance Jobs'
  );
  const [college, setCollege] = useState(profile?.college || '');
  const [graduationYear, setGraduationYear] = useState(profile?.graduationYear || '2026');
  const [experienceYears, setExperienceYears] = useState(profile?.experienceYears || '0-1 Years');
  const [skillsText, setSkillsText] = useState((profile?.skills || []).join(', '));
  const [certsText, setCertsText] = useState((profile?.certifications || []).join(', '));
  const [preferredSalary, setPreferredSalary] = useState(profile?.preferredSalary || '');
  const [preferredEmploymentType, setPreferredEmploymentType] = useState(
    profile?.preferredEmploymentType || 'Full-time'
  );
  const [remotePreference, setRemotePreference] = useState<CandidateProfile['remotePreference']>(
    profile?.remotePreference || 'Any'
  );
  const [visaStatus, setVisaStatus] = useState(profile?.visaStatus || '');
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    if (!profile) return;
    setName(profile.name || '');
    setEmail(profile.email || '');
    setPhone(profile.phone || '');
    setCountry(profile.country || 'India');
    setLocationsText((profile.preferredLocations || []).join(', '));
    setMbaSpecialization(profile.mbaSpecialization || 'Finance Jobs');
    setCollege(profile.college || '');
    setGraduationYear(profile.graduationYear || '2026');
    setExperienceYears(profile.experienceYears || '0-1 Years');
    setSkillsText((profile.skills || []).join(', '));
    setCertsText((profile.certifications || []).join(', '));
    setPreferredSalary(profile.preferredSalary || '');
    setPreferredEmploymentType(profile.preferredEmploymentType || 'Full-time');
    setRemotePreference(profile.remotePreference || 'Any');
    setVisaStatus(profile.visaStatus || '');
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedMsg('');
    try {
      await onSaveProfile({
        name,
        email,
        phone,
        country,
        preferredLocations: locationsText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        mbaSpecialization,
        college,
        graduationYear,
        experienceYears,
        skills: skillsText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        certifications: certsText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        preferredSalary,
        preferredEmploymentType,
        remotePreference,
        visaStatus,
      });
      setSavedMsg('Candidate profile saved to Cloud Firestore.');
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            Candidate Profile & Matching Preferences
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Stored securely in your private Firestore document. Matching never discriminates by college tier or protected traits.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenPrivacy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Shield className="h-3.5 w-3.5" />
          <span>Privacy & Data Deletion</span>
        </button>
      </div>

      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="rounded-xl border border-slate-200 bg-white p-6 space-y-6 dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Full Name
            </label>
            <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Email Address
            </label>
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Phone Number (Optional)
            </label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91..." className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Current Country
            </label>
            <input required value={country} onChange={(e) => setCountry(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Preferred Job Locations (comma-separated)
            </label>
            <input
              value={locationsText}
              onChange={(e) => setLocationsText(e.target.value)}
              placeholder="Mumbai, Bengaluru, London, Dubai, Remote"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              MBA Specialization
            </label>
            <select
              value={mbaSpecialization}
              onChange={(e) => setMbaSpecialization(e.target.value)}
              className={inputClass}
            >
              <option value="Finance Jobs">MBA Finance</option>
              <option value="SAP FICO Jobs">MBA Finance / SAP FICO</option>
              <option value="Business Analytics Jobs">MBA Business Analytics</option>
              <option value="Marketing Jobs">MBA Marketing</option>
              <option value="MBA Operations">MBA Operations</option>
              <option value="MBA HR">MBA HR</option>
              <option value="MBA International Business">MBA International Business</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              College / University
            </label>
            <input value={college} onChange={(e) => setCollege(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Graduation Year
            </label>
            <input value={graduationYear} onChange={(e) => setGraduationYear(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Work Experience
            </label>
            <select
              value={experienceYears}
              onChange={(e) => setExperienceYears(e.target.value)}
              className={inputClass}
            >
              <option value="0 Years (Fresher)">0 Years (Fresher)</option>
              <option value="0-1 Years">0–1 Years</option>
              <option value="MBA Graduate Trainee">MBA Graduate Trainee</option>
              <option value="Internship Only">MBA Internship Only</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Preferred Salary / Compensation
            </label>
            <input
              value={preferredSalary}
              onChange={(e) => setPreferredSalary(e.target.value)}
              placeholder="e.g., 6-12 LPA or $65k+"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Preferred Employment Type
            </label>
            <select
              value={preferredEmploymentType}
              onChange={(e) => setPreferredEmploymentType(e.target.value)}
              className={inputClass}
            >
              <option value="Full-time">Full-time</option>
              <option value="Management Trainee">Management Trainee</option>
              <option value="Internship">Internship / Stipend</option>
              <option value="Contract">Contract</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Remote Work Preference
            </label>
            <select
              value={remotePreference}
              onChange={(e) =>
                setRemotePreference(e.target.value as CandidateProfile['remotePreference'])
              }
              className={inputClass}
            >
              <option value="Any">Any (Remote / Hybrid / On-site)</option>
              <option value="Remote">Remote</option>
              <option value="Hybrid">Hybrid</option>
              <option value="On-site">On-site</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Skills (comma-separated)
            </label>
            <input
              value={skillsText}
              onChange={(e) => setSkillsText(e.target.value)}
              placeholder="Financial Modeling, Excel, FP&A, SQL, SAP FICO, Valuation"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Certifications (comma-separated)
            </label>
            <input
              value={certsText}
              onChange={(e) => setCertsText(e.target.value)}
              placeholder="CFA Level 1, NISM, SAP FICO Associate, Power BI"
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Visa / Work Authorization Details
          </label>
          <input
            value={visaStatus}
            onChange={(e) => setVisaStatus(e.target.value)}
            placeholder="e.g., Indian Citizen (No sponsorship needed in India), Seeking UK/UAE sponsorship"
            className={inputClass}
          />
        </div>

        {savedMsg && (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{savedMsg}</span>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0B192C] px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-700"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>{saving ? 'Saving...' : 'Save Candidate Profile'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
