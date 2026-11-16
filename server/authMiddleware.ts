import type { NextFunction, Request, Response } from 'express';
import * as jose from 'jose';
import fs from 'node:fs';
import path from 'node:path';

export interface AuthenticatedUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  isOwner: boolean;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

const OWNER_EMAIL = 'subhpan8449@gmail.com';

function loadFirebaseProjectId(): string {
  try {
    const cfgPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    const raw = fs.readFileSync(cfgPath, 'utf8');
    const parsed = JSON.parse(raw) as { projectId?: string };
    return parsed.projectId || '';
  } catch {
    return '';
  }
}

const FIREBASE_PROJECT_ID = loadFirebaseProjectId();

let cachedCerts: Record<string, string> = {};
let certsExpiresAt = 0;

async function getFirebasePublicCerts(): Promise<Record<string, string>> {
  const now = Date.now();
  if (now < certsExpiresAt && Object.keys(cachedCerts).length > 0) {
    return cachedCerts;
  }
  const resp = await fetch(
    'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
  );
  if (!resp.ok) {
    throw new Error('Failed to fetch Firebase auth certificates');
  }
  const cacheControl = resp.headers.get('cache-control') || '';
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
  const maxAgeSec = maxAgeMatch ? Number(maxAgeMatch[1]) : 3600;
  cachedCerts = (await resp.json()) as Record<string, string>;
  certsExpiresAt = now + maxAgeSec * 1000;
  return cachedCerts;
}

export async function verifyFirebaseIdToken(token: string): Promise<AuthenticatedUser> {
  if (!FIREBASE_PROJECT_ID) {
    throw new Error('Firebase projectId is not configured');
  }
  const header = jose.decodeProtectedHeader(token);
  if (!header.kid) {
    throw new Error('Missing key id in token header');
  }
  const certs = await getFirebasePublicCerts();
  const certPem = certs[header.kid];
  if (!certPem) {
    throw new Error('Invalid token key id');
  }
  const publicKey = await jose.importX509(certPem, 'RS256');
  const { payload } = await jose.jwtVerify(token, publicKey, {
    issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
    audience: FIREBASE_PROJECT_ID,
  });

  const uid = typeof payload.sub === 'string' ? payload.sub : '';
  const email = typeof payload.email === 'string' ? payload.email : '';
  const emailVerified = payload.email_verified === true;
  if (!uid || !email) {
    throw new Error('Invalid Firebase token claims');
  }
  return {
    uid,
    email,
    emailVerified,
    isOwner: email === OWNER_EMAIL && emailVerified,
  };
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!token) {
      res.status(401).json({ error: 'Authentication required. Please sign in.' });
      return;
    }
    const user = await verifyFirebaseIdToken(token);
    if (!user.emailVerified) {
      res.status(403).json({ error: 'Verified email required.' });
      return;
    }
    req.user = user;
    next();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid token';
    res.status(401).json({ error: `Authentication failed: ${message}` });
  }
}

export async function requireOwner(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  await requireAuth(req, res, () => {
    if (!req.user?.isOwner) {
      res.status(403).json({ error: 'Owner authorization required.' });
      return;
    }
    next();
  });
}

// Simple sliding window rate limiter for API cost & abuse protection
const rateWindows = new Map<string, number[]>();

export function createRateLimiter(maxRequests: number, windowMs: number) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const key = `${req.user?.uid || req.ip || 'anon'}:${req.path}`;
    const now = Date.now();
    const history = (rateWindows.get(key) || []).filter((ts) => now - ts < windowMs);
    if (history.length >= maxRequests) {
      res.status(429).json({
        error: 'Rate limit exceeded for AI discovery requests. Please wait a minute and retry.',
      });
      return;
    }
    history.push(now);
    rateWindows.set(key, history);
    next();
  };
}
