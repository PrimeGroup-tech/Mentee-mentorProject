/**
 * In-memory progressive delay & lockout store for login attempts.
 * - Tracks failed attempts per email
 * - Implements progressive delay: 0s, 1s, 2s, 4s, 8s... (doubles each time)
 * - After 5 consecutive failures: 15-minute lockout
 * - Resets on successful login
 */

interface LoginAttempt {
  failures: number;
  lockedUntil: number | null; // timestamp
  lastAttemptAt: number;
}

const store = new Map<string, LoginAttempt>();

const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const BASE_DELAY_MS = 1000; // 1 second base

// Cleanup stale entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    // Remove entries that haven't been touched in 30 minutes
    if (now - entry.lastAttemptAt > 30 * 60 * 1000) {
      store.delete(key);
    }
  }
}, 10 * 60 * 1000);

/**
 * Check whether a login attempt is currently blocked.
 * Returns { blocked: true, retryAfterMs } if blocked.
 */
export function checkLoginThrottle(email: string): { blocked: boolean; retryAfterMs: number } {
  const key = email.toLowerCase();
  const entry = store.get(key);
  if (!entry) return { blocked: false, retryAfterMs: 0 };

  const now = Date.now();

  // Check hard lockout
  if (entry.lockedUntil && now < entry.lockedUntil) {
    return { blocked: true, retryAfterMs: entry.lockedUntil - now };
  }

  // Check progressive delay
  if (entry.failures > 0 && entry.failures < LOCKOUT_THRESHOLD) {
    const delay = BASE_DELAY_MS * Math.pow(2, entry.failures - 1); // 1s, 2s, 4s, 8s
    const unblockAt = entry.lastAttemptAt + delay;
    if (now < unblockAt) {
      return { blocked: true, retryAfterMs: unblockAt - now };
    }
  }

  return { blocked: false, retryAfterMs: 0 };
}

/**
 * Record a failed login attempt. Returns current failure count.
 */
export function recordFailedLogin(email: string): number {
  const key = email.toLowerCase();
  const existing = store.get(key);
  const failures = (existing?.failures || 0) + 1;
  const now = Date.now();

  const entry: LoginAttempt = {
    failures,
    lockedUntil: failures >= LOCKOUT_THRESHOLD ? now + LOCKOUT_DURATION_MS : null,
    lastAttemptAt: now,
  };

  store.set(key, entry);
  return failures;
}

/**
 * Reset login throttle on successful login.
 */
export function resetLoginThrottle(email: string): void {
  store.delete(email.toLowerCase());
}

/**
 * Check if account should be locked (>= 5 failures).
 */
export function isAccountLockoutTriggered(email: string): boolean {
  const entry = store.get(email.toLowerCase());
  return !!entry && entry.failures >= LOCKOUT_THRESHOLD;
}
