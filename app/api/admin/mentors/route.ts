import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { sanitizeString, sanitizeEmail } from '@/lib/security';
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// POST create new mentor
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!admin || admin.role !== 'HR_ADMIN') {
      return NextResponse.json({ error: 'Only HR admins can create mentors' }, { status: 403 });
    }

    // Rate limit mentor creation
    const rateLimitResp = applyRateLimit(request, 'admin-create-mentor', RATE_LIMITS.WRITE);
    if (rateLimitResp) return rateLimitResp;

    const body = await request.json();
    const name = sanitizeString(body.name);
    const email = sanitizeEmail(body.email);
    const password = body.password ? String(body.password) : '';
    const role = sanitizeString(body.role);
    const businessUnit = sanitizeString(body.businessUnit);

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6 || password.length > 128) {
      return NextResponse.json(
        { error: 'Password must be between 6 and 128 characters' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user and mentor profile in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: 'MENTOR',
        },
      });

      const newMentor = await tx.mentor.create({
        data: {
          userId: newUser.id,
          role: role || '',
          businessUnit: businessUnit || '',
          yearsOfExperience: 0,
          areasOfExpertise: [],
          leadershipStyle: 'COLLABORATIVE',
          coachingGoals: '',
          personalInterests: [],
          shadowSkills: [],
          commitmentAvailability: '',
          maxMentees: 5,
          currentMenteeCount: 0,
          organizationalChallenge: '',
          shortBio: '',
          profileComplete: false,
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'ADMIN_MENTOR_CREATED',
          description: `HR Admin created new mentor account for ${name} (${email})`,
          performedByEmail: admin.email,
          mentorId: newMentor.id,
        },
      });

      return { user: newUser, mentor: newMentor };
    });

    return NextResponse.json({
      success: true,
      mentor: {
        id: result.mentor.id,
        userId: result.user.id,
        name: result.user.name,
        email: result.user.email,
      },
    });
  } catch (error: any) {
    console.error('Error creating mentor:', error);
    return NextResponse.json(
      { error: `Failed to create mentor: ${error?.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || user.role !== 'HR_ADMIN') {
      return NextResponse.json(
        { error: 'Only HR admins can access this resource' },
        { status: 403 }
      );
    }

    const mentors = await prisma.mentor.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignments: {
          include: {
            mentee: {
              include: {
                user: {
                  select: {
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return NextResponse.json(mentors);
  } catch (error) {
    console.error('Error fetching mentors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch mentors' },
      { status: 500 }
    );
  }
}
