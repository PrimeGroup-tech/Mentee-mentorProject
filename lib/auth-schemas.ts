/**
 * Zod validation schemas for all auth-related routes.
 * Centralised so every route uses the same rules.
 */
import { z } from 'zod';

// Shared password rules
const passwordSchema = z
  .string()
  .min(6, 'Invalid input')
  .max(128, 'Invalid input');

const emailSchema = z
  .string()
  .email('Invalid input')
  .max(254, 'Invalid input')
  .transform((v) => v.toLowerCase().trim());

// --- Login ---
export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  loginAs: z.enum(['MENTEE', 'MENTOR', 'HR_ADMIN']).optional(),
});

// --- Signup ---
export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().max(200, 'Invalid input').optional(),
  role: z.string().max(20).optional(),
});

// --- Change password ---
export const changePasswordSchema = z.object({
  currentPassword: passwordSchema,
  newPassword: passwordSchema,
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: 'New password must be different from current password',
  path: ['newPassword'],
});

/**
 * Generic error message constants.
 * NEVER reveal specifics about account existence, lockout state, etc.
 */
export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: 'Incorrect email or password',
  GENERIC_REGISTRATION: 'Unable to process registration. Please try again.',
  RESET_LINK_SENT: "If that email is registered, you'll receive a reset link",
  VALIDATION_FAILED: 'Invalid input provided',
  RATE_LIMITED: 'Too many requests. Please try again later.',
  UNAUTHORIZED: 'Unauthorized',
} as const;
