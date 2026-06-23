/**
 * In-memory rate limiter for API routes.
 * Tracks request counts per IP with sliding window.
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

interface RateLimitConfig {
  /** Max requests allowed in the window */
  maxRequests: number;
  /** Window size in seconds */
  windowSizeSeconds: number;
}

// Preset configurations
export const RATE_LIMITS = {
  /** Login / signup: 10 attempts per 15 minutes */
  AUTH: { maxRequests: 10, windowSizeSeconds: 900 } as RateLimitConfig,
  /** General API: 60 requests per minute */
  API: { maxRequests: 60, windowSizeSeconds: 60 } as RateLimitConfig,
  /** Write operations: 30 requests per minute */
  WRITE: { maxRequests: 30, windowSizeSeconds: 60 } as RateLimitConfig,
  /** Export/heavy operations: 5 per 5 minutes */
  HEAVY: { maxRequests: 5, windowSizeSeconds: 300 } as RateLimitConfig,
  /** File uploads: 10 per 5 minutes */
  UPLOAD: { maxRequests: 10, windowSizeSeconds: 300 } as RateLimitConfig,
} as const;

/**
 * Check rate limit for a given key (typically IP + route).
 * Returns { allowed, remaining, retryAfterSeconds }.
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    // New window
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowSizeSeconds * 1000,
    });
    return { allowed: true, remaining: config.maxRequests - 1, retryAfterSeconds: 0 };
  }

  if (entry.count >= config.maxRequests) {
    const retryAfterSeconds = Math.ceil((entry.resetTime - now) / 1000);
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }

  entry.count++;
  return { allowed: true, remaining: config.maxRequests - entry.count, retryAfterSeconds: 0 };
}

/**
 * Extract client IP from request headers.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || 'unknown';
}

/**
 * Helper to create a rate-limited 429 response.
 */
export function rateLimitResponse(retryAfterSeconds: number) {
  return new Response(
    JSON.stringify({ error: 'Too many requests. Please try again later.' }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfterSeconds),
      },
    }
  );
}

/**
 * Convenience: check rate limit and return a 429 Response if exceeded, or null if allowed.
 */
export function applyRateLimit(
  request: Request,
  routeKey: string,
  config: RateLimitConfig
): Response | null {
  const ip = getClientIp(request);
  const key = `${routeKey}:${ip}`;
  const result = checkRateLimit(key, config);

  if (!result.allowed) {
    return rateLimitResponse(result.retryAfterSeconds);
  }
  return null;
}
