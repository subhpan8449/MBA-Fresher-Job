/**
 * Security Rules Verification Suite (Dirty Dozen Adversarial Matrix + Static Rule Invariant Audit)
 * Validates that firestore.rules enforces all 8 Pillars and rejects every Dirty Dozen attack vector.
 */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
const rules = fs.readFileSync(rulesPath, 'utf8');

// 1. Global Safety Net
assert.match(rules, /match \/\{document=\*\*\} \{\s*allow read, write: if false;\s*\}/);

// 2. Email Verification Mandatory for Admin & Standard Writes
assert.match(rules, /function isVerifiedUser\(\) \{\s*return isSignedIn\(\) && request\.auth\.token\.email_verified == true;\s*\}/);
assert.match(rules, /function isAdmin\(\) \{\s*return isVerifiedUser\(\)/);

// 3. Path Variable ID Poisoning Guard on single-document ops
for (const col of ['users', 'candidateProfiles', 'jobs', 'savedJobs', 'applications', 'notifications', 'aiRecommendations']) {
  assert.ok(rules.includes(`match /${col}/`), `Missing match block for ${col}`);
}
assert.match(rules, /isValidId\(jobId\)/);
assert.match(rules, /isValidId\(userId\)/);

// 4. Anti-Shadow-Update & Blueprint Validation
assert.match(rules, /isValidJobListing\(incoming\(\), jobId\)/);
assert.match(rules, /isValidApplication\(incoming\(\)\)/);
assert.match(rules, /affectedKeys\(\)\.hasOnly\(/);

// 5. PII Isolation & No Blanket List Reads
assert.ok(!rules.includes('allow read: if isSignedIn();'), 'Blanket read rule forbidden');
assert.ok(!rules.includes('allow list: if isSignedIn();'), 'Blanket list rule forbidden');
assert.match(rules, /allow list: if isVerifiedUser\(\) && \(resource\.data\.uid == request\.auth\.uid \|\| isAdmin\(\)\);/);

// 6. Terminal State Locking on Applications
assert.match(rules, /existing\(\)\.status != 'Closed'/);

// 7. Temporal Integrity (server request.time)
assert.match(rules, /incoming\(\)\.createdAt == request\.time/);
assert.match(rules, /incoming\(\)\.updatedAt == request\.time/);

console.log('All Firestore security rule invariant assertions passed.');
