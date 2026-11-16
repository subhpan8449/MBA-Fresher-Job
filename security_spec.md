# Security Specification — MBA Fresher Blessing AI

## 1. Data Invariants
1. **Identity Integrity**: A candidate can only read, create, update, or delete their own `users/{userId}`, `candidateProfiles/{userId}`, `savedJobs/{savedId}`, `applications/{applicationId}`, and `notifications/{notificationId}` documents.
2. **Privilege Isolation**: A candidate cannot self-assign `role: 'owner'` or elevate privileges in `users/{userId}` or write to `admins/{uid}`, `platformSettings/{settingId}`, `dataSources/{sourceId}`, or `approvalRequests/{requestId}`.
3. **Admin / Owner Gate**: Only the verified owner account (`request.auth.token.email == 'subhpan8449@gmail.com' && request.auth.token.email_verified == true`) or explicitly registered admins in `admins/{uid}` have owner administration access.
4. **Temporal & Immutable Fields**: `createdAt` must equal `request.time` on creation and cannot be modified on update. `uid` / `createdBy` cannot be reassigned on update.
5. **Path & Size Hardening**: Every document ID must match `^[a-zA-Z0-9_-]+$` (`<= 128` chars) and every string/array field enforces strict `.size()` bounds.

## 2. The "Dirty Dozen" Attack Payloads (All Must Return PERMISSION_DENIED)
1. **Unverified Admin Email Spoof**: Write to `platformSettings/global` with `email: "subhpan8449@gmail.com"` and `email_verified: false`.
2. **Self-Assigned Owner Role**: Candidate creates `users/{uid}` with `role: "owner"`.
3. **Ghost Field Injection (Shadow Update)**: Candidate updates `candidateProfiles/{uid}` with extra field `isAdmin: true`.
4. **Cross-User PII Read**: Candidate A attempts `get` on `candidateProfiles/{candidateB_uid}`.
5. **Blanket List Query Scraping**: Candidate A runs `list` on `notifications` without `where('uid', '==', uid)`.
6. **Orphan / Cross-Owner SavedJob**: Candidate A creates `savedJobs/s1` with `uid: "{candidateB_uid}"`.
7. **Timestamp Forgery**: Candidate creates `applications/a1` with backdated `createdAt`.
8. **ID Poisoning**: Write to `jobs/{1500_char_string}`.
9. **Array Flood (Denial of Wallet)**: Candidate updates `candidateProfiles/{uid}` with `skills` array of 500 items.
10. **String Size Exhaustion**: Candidate submits `resumeSummary` of 50,000 chars.
11. **Terminal Application Tampering**: Updating `uid` or `createdAt` on an existing `applications/{id}`.
12. **Unauthorized Data Source Modification**: Non-admin user attempts to disable `dataSources/greenhouse`.
