// @ts-nocheck
import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';
import { checkRateLimit, RATE_LIMITS } from './rate-limit';
import { loginSchema, AUTH_ERRORS } from './auth-schemas';
import { checkLoginThrottle, recordFailedLogin, resetLoginThrottle, isAccountLockoutTriggered } from './login-throttle';
import { sendEmail } from './email';

const BCRYPT_ROUNDS = 12;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
        loginAs: { label: 'Login As', type: 'text' },
      },
      async authorize(credentials, req) {
        // --- Zod validation ---
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          throw new Error(AUTH_ERRORS.INVALID_CREDENTIALS);
        }
        const { email, password, loginAs } = parsed.data;

        // --- IP-based rate limit: max 10 per minute ---
        const loginKey = `login:${email}`;
        const rateCheck = checkRateLimit(loginKey, { maxRequests: 10, windowSizeSeconds: 60 });
        if (!rateCheck.allowed) {
          // Same generic message — never reveal throttling vs wrong creds
          throw new Error(AUTH_ERRORS.INVALID_CREDENTIALS);
        }

        // --- Progressive delay check ---
        const throttle = checkLoginThrottle(email);
        if (throttle.blocked) {
          // Return same generic error — never reveal lockout
          throw new Error(AUTH_ERRORS.INVALID_CREDENTIALS);
        }

        const user = await prisma.user.findUnique({
          where: { email },
          include: { mentee: true, mentor: true },
        });

        // User not found — same generic error
        if (!user || !user.password) {
          throw new Error(AUTH_ERRORS.INVALID_CREDENTIALS);
        }

        // Check if deactivated — same generic error
        if (user.isActive === false) {
          throw new Error(AUTH_ERRORS.INVALID_CREDENTIALS);
        }

        // Check DB-level lockout (persisted across server restarts)
        if (user.lockedAt) {
          if (Date.now() - new Date(user.lockedAt).getTime() < LOCKOUT_DURATION_MS) {
            // Still locked — same generic error
            throw new Error(AUTH_ERRORS.INVALID_CREDENTIALS);
          } else {
            // Lock expired, reset in DB
            await prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: 0, lockedAt: null } });
          }
        }

        // --- Constant-time password comparison via bcrypt.compare ---
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
          // Record failure in both in-memory throttle and DB
          const inMemFailures = recordFailedLogin(email);
          const newDbAttempts = (user.failedLoginAttempts || 0) + 1;
          const updateData: any = { failedLoginAttempts: newDbAttempts };

          if (newDbAttempts >= 5) {
            updateData.lockedAt = new Date();
            updateData.isActive = false;

            // Send lockout notification email (fire-and-forget)
            sendEmail({
              to: user.email,
              subject: 'Account Security Alert',
              html: `<p>Hi ${user.name || 'User'},</p>
                <p>Your account has been temporarily locked due to multiple unsuccessful login attempts.</p>
                <p>Please contact your administrator to unlock your account or wait 15 minutes and try again.</p>
                <p>If you did not attempt to log in, please contact your administrator immediately.</p>
                <p>— PASS Mentoring System</p>`,
            }).catch(() => { /* swallow email errors silently */ });
          }

          await prisma.user.update({ where: { id: user.id }, data: updateData });

          // Always same generic error — never reveal lockout vs wrong password
          throw new Error(AUTH_ERRORS.INVALID_CREDENTIALS);
        }

        // --- Successful login ---
        resetLoginThrottle(email);

        // Reset DB failure counters
        if (user.failedLoginAttempts > 0) {
          await prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: 0, lockedAt: null } });
        }

        // Re-hash password if stored with fewer rounds (migration on login)
        try {
          const rounds = bcrypt.getRounds(user.password);
          if (rounds < BCRYPT_ROUNDS) {
            const rehashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
            await prisma.user.update({ where: { id: user.id }, data: { password: rehashed } });
          }
        } catch {
          // If getRounds fails (non-bcrypt hash), rehash immediately
          const rehashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
          await prisma.user.update({ where: { id: user.id }, data: { password: rehashed } });
        }

        // Determine the effective role based on portal selection
        const requestedRole = loginAs || user.role;

        if (requestedRole === 'MENTEE') {
          if (!user.mentee && user.role !== 'MENTEE') {
            throw new Error('NO_MENTEE_PROFILE');
          }
        } else if (requestedRole === 'MENTOR') {
          if (!user.mentor && user.role !== 'MENTOR') {
            throw new Error('NO_MENTOR_PROFILE');
          }
        } else if (requestedRole === 'HR_ADMIN') {
          if (user.role !== 'HR_ADMIN') {
            throw new Error('NOT_ADMIN');
          }
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: requestedRole,
          adminLevel: user.adminLevel || 'STANDARD_ADMIN',
          mustChangePassword: user.mustChangePassword || false,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.adminLevel = (user as any).adminLevel || 'STANDARD_ADMIN';
        token.mustChangePassword = (user as any).mustChangePassword || false;
      } else if (token?.id) {
        // Refresh privileges from DB on each token refresh so role/admin-level
        // changes take effect immediately without requiring a re-login.
        try {
          const fresh = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { role: true, adminLevel: true, mustChangePassword: true },
          });
          if (fresh) {
            token.role = fresh.role;
            token.adminLevel = fresh.adminLevel || 'STANDARD_ADMIN';
            token.mustChangePassword = fresh.mustChangePassword || false;
          }
        } catch (e) {
          // Keep existing token values if the lookup fails.
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        (session.user as any).adminLevel = token.adminLevel || 'STANDARD_ADMIN';
        (session.user as any).mustChangePassword = token.mustChangePassword || false;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
};