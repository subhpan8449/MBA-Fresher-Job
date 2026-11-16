import React from 'react';
import { RotateCcw, Search } from 'lucide-react';
import {
  INDIA_CITIES,
  type FeedBucket,
  type JobCategory,
  type JobRegion,
  type VerificationStatus,
  type WorkMode,
} from '../types';

export interface JobFilterState {
  search: string;
  region: JobRegion | 'All';
  country: string;
  city: string;
  category: JobCategory | 'All';
  bucket: FeedBucket | 'All';
  specialization: string;
  experience: 'Confirmed 0-1 Yr Only' | '0 Years / Fresher' | 'MBA Graduate Trainee' | 'All Eligible (Incl. Verification)';
  salaryOnly: boolean;
  company: string;
  workMode: WorkMode | 'All';
  postedWindow: 'All' | '7d' | '30d';
  deadlineSetOnly: boolean;
  employmentType: string;
  verificationStatus: VerificationStatus | 'All';
  minMatchScore: number;
}

export const DEFAULT_FILTERS: JobFilterState = {
  search: '',
  region: 'India',
  country: '',
  city: 'All India',
  category: 'All',
  bucket: 'All',
  specialization: '',
  experience: 'All Eligible (Incl. Verification)',
  salaryOnly: false,
  company: '',
  workMode: 'All',
  postedWindow: 'All',
  deadlineSetOnly: false,
  employmentType: 'All',
  verificationStatus: 'All',
  minMatchScore: 0,
};

interface JobFiltersProps {
  filters: JobFilterState;
  onChange: (next: JobFilterState) => void;
  totalMatching: number;
  lockCategory?: boolean;
  countsByBucket?: Record<FeedBucket, number>;
  countsByRegion?: Record<JobRegion, number>;
}

const FEED_BUCKETS: Array<FeedBucket | 'All'> = [
  'All',
  'Verified MBA Fresher Jobs',
  'Partially Verified Jobs',
  'Needs Eligibility Verification',
  'Expired or Closed Jobs',
];

const CATEGORIES: Array<JobCategory | 'All'> = [
  'All',
  'Finance Jobs',
  'SAP FICO Jobs',
  'Business Analytics Jobs',
  'Marketing Jobs',
];

export const JobFilters: React.FC<JobFiltersProps> = ({
  filters,
  onChange,
  totalMatching,
  lockCategory = false,
  countsByBucket,
  countsByRegion,
}) => {
  const update = <K extends keyof JobFilterState>(key: K, value: JobFilterState[K]) => {
    onChange({ ...filters, [key]: value });
  };

  const inputClass =
    'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';

  return (
    <section
      aria-label="Job search and filters"
      className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
    >
      {/* Search Bar & Reset */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => update('search', e.target.value)}
            placeholder="Search MBA fresher role, skills (FP&A, SAP FICO, SQL, Valuation, Brand)..."
            className={`${inputClass} pl-9`}
          />
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="font-mono tabular-nums text-xs text-slate-600 dark:text-slate-300">
            {totalMatching} opportunities
          </span>
          <button
            type="button"
            onClick={() =>
              onChange({
                ...DEFAULT_FILTERS,
                category: lockCategory ? filters.category : 'All',
              })
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* India First, Global Second Region Switcher + 4 Category Tabs */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Region priority">
          {(
            [
              ['India', `1. India First${countsByRegion ? ` (${countsByRegion.India})` : ''}`],
              ['International', `2. International${countsByRegion ? ` (${countsByRegion.International})` : ''}`],
              ['All', 'All Regions'],
            ] as const
          ).map(([reg, label]) => {
            const active = filters.region === reg;
            return (
              <button
                key={reg}
                type="button"
                onClick={() =>
                  onChange({
                    ...filters,
                    region: reg,
                    city: reg === 'India' ? filters.city || 'All India' : '',
                  })
                }
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-blue-700 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {!lockCategory && (
          <div className="flex flex-wrap items-center gap-1.5">
            {CATEGORIES.map((cat) => {
              const active = filters.category === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => update('category', cat)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-[#0B192C] text-white dark:bg-blue-600'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  {cat === 'Finance Jobs' ? 'Finance Jobs (Priority)' : cat}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Transparent 4-Bucket Verification Feed Tabs */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5 border-b border-slate-100 pb-4 dark:border-slate-800">
        {FEED_BUCKETS.map((bucket) => {
          const active = filters.bucket === bucket;
          const count =
            bucket !== 'All' && countsByBucket ? ` (${countsByBucket[bucket] ?? 0})` : '';
          return (
            <button
              key={bucket}
              type="button"
              onClick={() => update('bucket', bucket)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                active
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              {bucket === 'All' ? 'All Feed Buckets' : `${bucket}${count}`}
            </button>
          );
        })}
      </div>

      {/* Multi-Attribute Grid */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {filters.region !== 'International' ? (
          <select
            value={filters.city || 'All India'}
            onChange={(e) => update('city', e.target.value)}
            className={inputClass}
            aria-label="India city filter"
          >
            {INDIA_CITIES.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={filters.country}
            onChange={(e) => update('country', e.target.value)}
            placeholder="Country (UK, USA, UAE, Germany, Singapore...)"
            className={inputClass}
          />
        )}

        <select
          value={filters.experience}
          onChange={(e) => update('experience', e.target.value as JobFilterState['experience'])}
          className={inputClass}
          aria-label="Strict <= 1 Year Experience Filter"
        >
          <option value="All Eligible (Incl. Verification)">0–1 Yr + Needs Exp Verification</option>
          <option value="Confirmed 0-1 Yr Only">Confirmed 0–1 Yr Fresher Only</option>
          <option value="0 Years / Fresher">0 Years / Freshers Only</option>
          <option value="MBA Graduate Trainee">MBA Graduate Trainee Programs</option>
        </select>

        <select
          value={filters.workMode}
          onChange={(e) => update('workMode', e.target.value as JobFilterState['workMode'])}
          className={inputClass}
          aria-label="Work mode filter"
        >
          <option value="All">All Work Modes</option>
          <option value="Remote">Remote</option>
          <option value="Hybrid">Hybrid</option>
          <option value="On-site">On-site</option>
        </select>

        <input
          type="text"
          value={filters.company}
          onChange={(e) => update('company', e.target.value)}
          placeholder="Filter by company..."
          className={inputClass}
        />

        <select
          value={filters.verificationStatus}
          onChange={(e) =>
            update('verificationStatus', e.target.value as JobFilterState['verificationStatus'])
          }
          className={inputClass}
          aria-label="Verification status filter"
        >
          <option value="All">All Verification Statuses</option>
          <option value="Verified">Verified Only</option>
          <option value="Partially Verified">Partially Verified</option>
          <option value="Unverified">Unverified</option>
          <option value="Expired">Expired</option>
          <option value="Suspicious">Suspicious</option>
        </select>

        <select
          value={filters.postedWindow}
          onChange={(e) => update('postedWindow', e.target.value as JobFilterState['postedWindow'])}
          className={inputClass}
          aria-label="Posted date window"
        >
          <option value="All">Any Posting Date</option>
          <option value="7d">Posted Last 7 Days</option>
          <option value="30d">Posted Last 30 Days</option>
        </select>

        <select
          value={String(filters.minMatchScore)}
          onChange={(e) => update('minMatchScore', Number(e.target.value))}
          className={inputClass}
          aria-label="Minimum AI match score"
        >
          <option value="0">Any AI Match Score</option>
          <option value="60">Match Score ≥ 60%</option>
          <option value="75">Match Score ≥ 75%</option>
          <option value="85">Match Score ≥ 85%</option>
        </select>

        <div className="flex items-center gap-3">
          <label className="flex flex-1 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 dark:border-slate-700 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.salaryOnly}
              onChange={(e) => update('salaryOnly', e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600"
            />
            <span>Salary Disclosed</span>
          </label>
        </div>
      </div>
    </section>
  );
};
