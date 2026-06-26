/**
 * Security utilities — input validation, sanitization, and XSS prevention
 */

// Strip HTML tags to prevent XSS in stored text
export function sanitizeString(input: unknown): string {
  if (input === null || input === undefined) return '';
  return String(input)
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove script tags and content
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove inline event handlers
    .replace(/<[^>]*>/g, '') // Strip all HTML tags
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '') // Strip control characters
    .replace(/javascript\s*:/gi, '') // Remove javascript: protocol
    .trim();
}

// Sanitize but allow empty — returns undefined if falsy
export function sanitizeOptionalString(input: unknown): string | undefined {
  if (input === null || input === undefined || input === '') return undefined;
  return sanitizeString(input);
}

// Validate and sanitize email format
export function sanitizeEmail(input: unknown): string | null {
  if (!input) return null;
  const email = String(input).toLowerCase().trim();
  // RFC 5322 simplified — no script injection possible
  const emailRegex = /^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/;
  if (!emailRegex.test(email)) return null;
  if (email.length > 254) return null; // RFC max
  return email;
}

// Validate UUID format (for Prisma IDs)
export function isValidId(input: unknown): boolean {
  if (!input || typeof input !== 'string') return false;
  // CUID or UUID pattern
  const idRegex = /^[a-zA-Z0-9_\-]{10,50}$/;
  return idRegex.test(input);
}

// Sanitize a number input within bounds
export function sanitizeNumber(
  input: unknown,
  min: number = 0,
  max: number = 10000,
  fallback: number = 0
): number {
  const num = Number(input);
  if (isNaN(num) || !isFinite(num)) return fallback;
  return Math.min(Math.max(Math.floor(num), min), max);
}

// Validate and sanitize an array of strings (e.g., interests, skills)
export function sanitizeStringArray(
  input: unknown,
  allowedValues?: string[],
  maxItems: number = 50
): string[] {
  if (!Array.isArray(input)) return [];
  let items = input
    .map(item => sanitizeString(item))
    .filter(item => item.length > 0 && item.length <= 200);
  if (allowedValues) {
    items = items.filter(item => allowedValues.includes(item));
  }
  return items.slice(0, maxItems);
}

// Validate enum value
export function validateEnum<T extends string>(
  input: unknown,
  allowedValues: T[],
  fallback: T
): T {
  const val = String(input || '');
  return allowedValues.includes(val as T) ? (val as T) : fallback;
}

// Prevent path traversal in file names
export function sanitizeFileName(input: unknown): string | null {
  if (!input) return null;
  const name = String(input).trim();
  // Block path traversal
  if (name.includes('..') || name.includes('/') || name.includes('\\')) return null;
  // Only allow safe characters
  const safeRegex = /^[a-zA-Z0-9._\-\s]{1,255}$/;
  if (!safeRegex.test(name)) return null;
  return name;
}

// Content length check — prevent oversized payloads from being processed
export function validateContentLength(
  content: string,
  maxLength: number = 10000
): boolean {
  return content.length <= maxLength;
}

// Sanitize textarea / free-text content (longer strings)
export function sanitizeLongText(input: unknown, maxLength: number = 5000): string {
  if (input === null || input === undefined) return '';
  return String(input)
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove script tags
    .replace(/<[^>]*>/g, '') // Strip all HTML tags
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '') // Control chars
    .slice(0, maxLength)
    .trim();
}

// Validate date string format (ISO or common formats)
export function isValidDateString(input: unknown): boolean {
  if (!input || typeof input !== 'string') return false;
  const date = new Date(input);
  return !isNaN(date.getTime()) && date.getFullYear() > 1900 && date.getFullYear() < 2100;
}
