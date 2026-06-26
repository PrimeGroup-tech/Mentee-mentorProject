import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { isAllowedDomain, getAllowedDomainsDisplay } from '@/lib/allowed-domains';
import { sanitizeString, sanitizeEmail } from '@/lib/security';
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { signupSchema, AUTH_ERRORS } from '@/lib/auth-schemas';

const BCRYPT_ROUNDS = 12;

export async function POST(request: Request) {
  try {
    // Rate limit: prevent brute-force account creation
    const rateLimitResp = applyRateLimit(request, 'signup', RATE_LIMITS.AUTH);
    if (rateLimitResp) return rateLimitResp;

    const body = await request.json();
    
    // Zod validation
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) {
      console.error('[signup] Validation failure:', parsed.error.issues.map(i => i.path.join('.')));
      return NextResponse.json(
        { error: AUTH_ERRORS.VALIDATION_FAILED },
        { status: 400 }
      );
    }

    const email = parsed.data.email;
    const password = parsed.data.password;
    const name = sanitizeString(parsed.data.name || '');
    const role = parsed.data.role;

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
        // Generic message — never confirm email exists
        return NextResponse.json(
          { error: AUTH_ERRORS.GENERIC_REGISTRATION },
          { status: 400 }
        );
      }

      // User exists and password is correct — try to add the second role
      if (userRole === 'MENTEE' && existingUser.mentee) {
        return NextResponse.json(
          { error: 'This profile already exists. Please log in.' },
          { status: 409 }
        );
      }

      if (userRole === 'MENTOR' && existingUser.mentor) {
        return NextResponse.json(
          { error: 'This profile already exists. Please log in.' },
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

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

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
    console.error('[signup] Error');
    return NextResponse.json(
      { error: AUTH_ERRORS.GENERIC_REGISTRATION },
      { status: 500 }
    );
  }
}
