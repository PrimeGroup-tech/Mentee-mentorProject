import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { sanitizeString, sanitizeStringArray, sanitizeNumber, validateEnum, sanitizeLongText } from '@/lib/security';
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const mentor = await prisma.mentor.findUnique({
      where: { userId: user.id },
      include: {
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

    if (!mentor) {
      return NextResponse.json({ error: 'Mentor profile not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: mentor.id,
      userId: mentor.userId,
      role: mentor.role,
      businessUnit: mentor.businessUnit,
      yearsOfExperience: mentor.yearsOfExperience,
      areasOfExpertise: mentor.areasOfExpertise,
      leadershipStyle: mentor.leadershipStyle,
      coachingGoals: mentor.coachingGoals,
      personalInterests: mentor.personalInterests,
      shadowSkills: mentor.shadowSkills,
      commitmentAvailability: mentor.commitmentAvailability,
      maxMentees: mentor.maxMentees,
      currentMenteeCount: mentor.currentMenteeCount,
      tier: mentor.tier,
      level: mentor.level,
      profileComplete: mentor.profileComplete,
      profilePhotoUrl: mentor.profilePhotoUrl,
      shortBio: mentor.shortBio,
      assignments: mentor.assignments,
    });
  } catch (error) {
    console.error('Error fetching mentor profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch mentor profile' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check session role (portal-based), not DB role, to support dual-role users
    const sessionRole = session.user.role;
    if (sessionRole !== 'MENTOR') {
      return NextResponse.json(
        { error: `You are currently logged in as ${sessionRole}. Please sign out and log in via the Mentor portal to update your mentor profile.` },
        { status: 403 }
      );
    }

    const raw = await request.json();

    // Sanitize all inputs
    const data = {
      role: sanitizeString(raw.role),
      businessUnit: sanitizeString(raw.businessUnit),
      yearsOfExperience: sanitizeNumber(raw.yearsOfExperience, 0, 50),
      areasOfExpertise: sanitizeStringArray(raw.areasOfExpertise, undefined, 30),
      leadershipStyle: validateEnum(raw.leadershipStyle, ['DIRECT', 'COLLABORATIVE', 'ANALYTICAL', 'SUPPORTIVE', 'VISIONARY'], 'COLLABORATIVE'),
      coachingGoals: sanitizeLongText(raw.coachingGoals, 2000),
      personalInterests: sanitizeStringArray(raw.personalInterests, undefined, 20),
      shadowSkills: sanitizeStringArray(raw.shadowSkills, undefined, 20),
      commitmentAvailability: sanitizeLongText(raw.commitmentAvailability, 1000),
      maxMentees: sanitizeNumber(raw.maxMentees, 1, 20, 5),
      shortBio: sanitizeLongText(raw.shortBio, 1000),
      level: raw.level != null ? sanitizeNumber(raw.level, 1, 10, 1) : null,
    };

    const mentor = await prisma.mentor.upsert({
      where: { userId: user.id },
      update: {
        role: data.role,
        businessUnit: data.businessUnit,
        yearsOfExperience: data.yearsOfExperience,
        areasOfExpertise: data.areasOfExpertise,
        leadershipStyle: data.leadershipStyle,
        coachingGoals: data.coachingGoals,
        personalInterests: data.personalInterests,
        shadowSkills: data.shadowSkills,
        commitmentAvailability: data.commitmentAvailability,
        maxMentees: data.maxMentees,
        profileComplete: true,
        shortBio: data.shortBio,
        level: data.level || null,
      },
      create: {
        userId: user.id,
        role: data.role,
        businessUnit: data.businessUnit,
        yearsOfExperience: data.yearsOfExperience,
        areasOfExpertise: data.areasOfExpertise,
        leadershipStyle: data.leadershipStyle,
        coachingGoals: data.coachingGoals,
        personalInterests: data.personalInterests,
        shadowSkills: data.shadowSkills,
        commitmentAvailability: data.commitmentAvailability,
        maxMentees: data.maxMentees || 5,
        profileComplete: true,
        shortBio: data.shortBio,
        level: data.level || null,
      },
    });

    // Log the profile update
    await prisma.auditLog.create({
      data: {
        action: 'PROFILE_UPDATED',
        description: 'Mentor updated their profile',
        performedByEmail: user.email,
        mentorId: mentor.id,
      },
    });

    return NextResponse.json({
      success: true,
      mentor,
    });
  } catch (error) {
    console.error('Error updating mentor profile:', error);
    const message = error instanceof Error ? error.message : 'Failed to update mentor profile';
    return NextResponse.json(
      { error: `Failed to save profile: ${message}` },
      { status: 500 }
    );
  }
}