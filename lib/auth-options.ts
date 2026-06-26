// @ts-nocheck
import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';
import { checkRateLimit, RATE_LIMITS } from './rate-limit';

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
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Invalid credentials');
        }

        // Rate limit login attempts per email
        const loginKey = `login:${credentials.email.toLowerCase()}`;
        const rateCheck = checkRateLimit(loginKey, RATE_LIMITS.AUTH);
        if (!rateCheck.allowed) {
          throw new Error('Too many login attempts. Please try again later.');
        }

        // Sanitize email input
        const email = credentials.email.toLowerCase().trim();
        if (!/^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/.test(email)) {
          throw new Error('Invalid credentials');
        }

        // Limit password length to prevent bcrypt DoS
        if (credentials.password.length > 128) {
          throw new Error('Invalid credentials');
        }

        const user = await prisma.user.findUnique({
          where: { email },
          include: { mentee: true, mentor: true },
        });

        if (!user || !user.password) {
          throw new Error('Invalid credentials');
        }

        // Check if account is active
        if (user.isActive === false) {
          throw new Error('Account has been deactivated. Contact your administrator.');
        }

        // Check if account is locked (5 failed attempts, locked for 30 minutes)
        if (user.lockedAt) {
          const lockDuration = 30 * 60 * 1000; // 30 minutes
          if (Date.now() - new Date(user.lockedAt).getTime() < lockDuration) {
            throw new Error('Account is locked due to too many failed login attempts. Please try again in 30 minutes or contact your administrator.');
          } else {
            // Lock expired, reset
            await prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: 0, lockedAt: null } });
          }
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          // Increment failed attempts
          const newAttempts = (user.failedLoginAttempts || 0) + 1;
          const updateData: any = { failedLoginAttempts: newAttempts };
          if (newAttempts >= 5) {
            updateData.lockedAt = new Date();
            updateData.isActive = false;
          }
          await prisma.user.update({ where: { id: user.id }, data: updateData });
          if (newAttempts >= 5) {
            throw new Error('Account has been locked due to 5 failed login attempts. Contact your administrator.');
          }
          throw new Error('Invalid credentials');
        }

        // Reset failed attempts on successful login
        if (user.failedLoginAttempts > 0) {
          await prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: 0, lockedAt: null } });
        }

        // Determine the effective role based on portal selection
        const requestedRole = credentials.loginAs || user.role;

        if (requestedRole === 'MENTEE') {
          // User must have a mentee profile or be a MENTEE by role
          if (!user.mentee && user.role !== 'MENTEE') {
            throw new Error('NO_MENTEE_PROFILE');
          }
        } else if (requestedRole === 'MENTOR') {
          // User must have a mentor profile or be a MENTOR by role
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
          mustChangePassword: user.mustChangePassword || false,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // Store the role chosen at login (portal selection)
        token.role = (user as any).role;
        token.mustChangePassword = (user as any).mustChangePassword || false;
      }
      // Note: We no longer refresh role from DB on every token check
      // because the session role is determined by the portal the user chose at login.
      // If an admin changes a user's primary role, the user simply logs in again
      // via the appropriate portal.
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
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
