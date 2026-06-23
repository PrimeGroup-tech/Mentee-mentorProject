import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { isAllowedDomain, getAllowedDomainsDisplay } from '@/lib/allowed-domains';
import { sanitizeString, sanitizeEmail } from '@/lib/security';
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    // Rate limit: prevent brute-force account creation
    const rateLimitResp = applyRateLimit(request, 'signup', RATE_LIMITS.AUTH);
    if (rateLimitResp) return rateLimitResp;

    const body = await request.json();
    const email = sanitizeEmail(body.email);
    const password = body.password ? String(body.password) : '';
    const name = sanitizeString(body.name);
    const role = body.role;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (password.length > 128) {
      return NextResponse.json(
        { error: 'Password is too long' },
        { status: 400 }
      );
    }

    const userRole = role === 'MENTOR' ? 'MENTOR' : 'MENTEE';

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
      include: { mentee: true, mentor: true },
    });

    if (existingUser) {
      // Verify password first
      if (!existingUser.password) {
        return NextResponse.json(
          { error: 'This account cannot be modified. Please contact your administrator.' },
          { status: 400 }
        );
      }

      const isPasswordValid = await bcrypt.compare(password, existingUser.password);
      if (!isPasswordValid) {
        return NextResponse.json(
          { error: 'An account with this email already exists. If this is your account, please enter your correct password to add the new role.' },
          { status: 409 }
        );
      }

      // User exists and password is correct — try to add the second role
      if (userRole === 'MENTEE' && existingUser.mentee) {
        return NextResponse.json(
          { error: 'You already have a mentee profile. Please log in via the Mentee portal.' },
          { status: 409 }
        );
      }

      if (userRole === 'MENTOR' && existingUser.mentor) {
        return NextResponse.json(
          { error: 'You already have a mentor profile. Please log in via the Mentor portal.' },
          { status: 409 }
        );
      }

      // Add the second role profile
      await prisma.$transaction(async (tx) => {
        if (userRole === 'MENTEE') {
          await tx.mentee.create({
            data: {
              userId: existingUser.id,
              role: '',
              businessUnit: '',
              yearsOfExperience: 0,
              tenure: 0,
              competencyGaps: [],
              careerGoals: '',
              personalInterests: [],
              preferredMeetingFormat: 'HYBRID',
              profileComplete: false,
            },
          });
        } else {
          await tx.mentor.create({
            data: {
              userId: existingUser.id,
              role: '',
              businessUnit: '',
              yearsOfExperience: 0,
              areasOfExpertise: [],
              leadershipStyle: 'COLLABORATIVE',
              personalInterests: [],
              shadowSkills: [],
              profileComplete: false,
            },
          });
        }

        await tx.auditLog.create({
          data: {
            action: 'ROLE_ADDED',
            description: `Existing user added ${userRole.toLowerCase()} role: ${email}`,
            performedByEmail: email,
          },
        });
      });

      return NextResponse.json(
        { message: `${userRole === 'MENTEE' ? 'Mentee' : 'Mentor'} profile added to your account. You can now log in via the ${userRole === 'MENTEE' ? 'Mentee' : 'Mentor'} portal.`, user: { id: existingUser.id, email: existingUser.email, role: userRole }, roleAdded: true },
        { status: 201 }
      );
    }

    // New user signup flow
    // Validate email domain (skip in test mode for automated testing)
    if (!isAllowedDomain(email!) && !process.env.__NEXT_TEST_MODE) {
      return NextResponse.json(
        { error: `Only company email addresses are allowed. Accepted domains: ${getAllowedDomainsDisplay()}` },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user and associated profile in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: email!,
          name: name || email!.split('@')[0],
          password: hashedPassword,
          role: userRole,
        },
      });

      // Create associated profile
      if (userRole === 'MENTOR') {
        await tx.mentor.create({
          data: {
            userId: user.id,
            role: '',
            businessUnit: '',
            yearsOfExperience: 0,
            areasOfExpertise: [],
            leadershipStyle: 'COLLABORATIVE',
            personalInterests: [],
            shadowSkills: [],
            profileComplete: false,
          },
        });
      } else {
        await tx.mentee.create({
          data: {
            userId: user.id,
            role: '',
            businessUnit: '',
            yearsOfExperience: 0,
            tenure: 0,
            competencyGaps: [],
            careerGoals: '',
            personalInterests: [],
            preferredMeetingFormat: 'HYBRID',
            profileComplete: false,
          },
        });
      }

      // Log the signup
      await tx.auditLog.create({
        data: {
          action: 'USER_SIGNUP',
          description: `New ${userRole.toLowerCase()} registered: ${email}`,
          performedByEmail: email,
        },
      });

      return user;
    });

    return NextResponse.json(
      { message: 'Account created successfully', user: { id: result.id, email: result.email, role: userRole } },
      { status: 201 }
    );
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    );
  }
}
