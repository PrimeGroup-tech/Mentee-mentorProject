import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { sanitizeString, sanitizeStringArray, sanitizeNumber, validateEnum, isValidDateString, sanitizeLongText } from '@/lib/security';
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

    const mentee = await prisma.mentee.findUnique({
      where: { userId: user.id },
      include: {
        preferences: {
          include: {
            mentor: {
              select: {
                id: true,
                role: true,
                businessUnit: true,
              },
            },
          },
        },
        assignment: {
          include: {
            mentor: {
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

    if (!mentee) {
      return NextResponse.json({ error: 'Mentee profile not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: mentee.id,
      userId: mentee.userId,
      role: mentee.role,
      businessUnit: mentee.businessUnit,
      yearsOfExperience: mentee.yearsOfExperience,
      tenure: mentee.tenure,
      employmentDate: mentee.employmentDate || '',
      competencyGaps: mentee.competencyGaps,
      careerGoals: mentee.careerGoals,
      personalInterests: mentee.personalInterests,
      preferredMeetingFormat: mentee.preferredMeetingFormat,
      organizationalChallenge: mentee.organizationalChallenge,
      softSkillsGap: mentee.softSkillsGap || [],
      gradeLevel: mentee.gradeLevel || null,
      profileComplete: mentee.profileComplete,
      submittedAt: mentee.submittedAt,
      preferences: mentee.preferences,
      assignment: mentee.assignment,
    });
  } catch (error) {
    console.error('Error fetching mentee profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch mentee profile' },
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
    if (sessionRole !== 'MENTEE') {
      return NextResponse.json(
        { error: `You are currently logged in as ${sessionRole}. Please sign out and log in via the Mentee portal to update your mentee profile.` },
        { status: 403 }
      );
    }

    const raw = await request.json();

    // Sanitize all inputs
    const data = {
      ...raw,
      role: sanitizeString(raw.role),
      businessUnit: sanitizeString(raw.businessUnit),
      yearsOfExperience: sanitizeNumber(raw.yearsOfExperience, 0, 50),
      employmentDate: raw.employmentDate,
      competencyGaps: sanitizeStringArray(raw.competencyGaps, undefined, 4),
      careerGoals: sanitizeLongText(raw.careerGoals, 2000),
      personalInterests: sanitizeStringArray(raw.personalInterests, undefined, 20),
      preferredMeetingFormat: validateEnum(raw.preferredMeetingFormat, ['IN_PERSON', 'VIRTUAL', 'HYBRID'], 'HYBRID'),
      organizationalChallenge: sanitizeLongText(raw.organizationalChallenge, 2000),
      softSkillsGap: sanitizeStringArray(raw.softSkillsGap, undefined, 10),
      gradeLevel: raw.gradeLevel ? sanitizeString(raw.gradeLevel) : null,
    };

    // Validate required fields
    const missing: string[] = [];
    if (!data.role) missing.push('Role');
    if (!data.businessUnit) missing.push('Business Unit');
    if (data.yearsOfExperience === undefined || data.yearsOfExperience === null || data.yearsOfExperience === '') missing.push('Years of Experience');
    if (!data.employmentDate) missing.push('Date of Employment');
    // Auto-calculate tenure from employment date
    if (data.employmentDate) {
      const empDate = new Date(data.employmentDate);
      const now = new Date();
      data.tenure = Math.max(0, Math.floor((now.getTime() - empDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)));
    }
    if (!data.careerGoals) missing.push('Career Goals');
    if (!data.competencyGaps || data.competencyGaps.length < 3) missing.push('Development Areas (select at least 3)');
    if (data.competencyGaps && data.competencyGaps.length > 4) missing.push('Development Areas (maximum 4 allowed)');
    if (!data.personalInterests || data.personalInterests.length === 0) missing.push('Personal Interests (select at least one)');

    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Please fill in the following required fields: ${missing.join(', ')}` },
        { status: 400 }
      );
    }

    const mentee = await prisma.mentee.upsert({
      where: { userId: user.id },
      update: {
        role: data.role,
        businessUnit: data.businessUnit,
        yearsOfExperience: data.yearsOfExperience,
        tenure: data.tenure || 0,
        employmentDate: data.employmentDate || null,
        competencyGaps: data.competencyGaps,
        careerGoals: data.careerGoals,
        personalInterests: data.personalInterests,
        preferredMeetingFormat: data.preferredMeetingFormat,
        organizationalChallenge: data.organizationalChallenge,
        softSkillsGap: data.softSkillsGap || [],
        gradeLevel: data.gradeLevel || null,
      },
      create: {
        userId: user.id,
        role: data.role,
        businessUnit: data.businessUnit,
        yearsOfExperience: data.yearsOfExperience,
        tenure: data.tenure || 0,
        employmentDate: data.employmentDate || null,
        competencyGaps: data.competencyGaps,
        careerGoals: data.careerGoals,
        personalInterests: data.personalInterests,
        preferredMeetingFormat: data.preferredMeetingFormat,
        organizationalChallenge: data.organizationalChallenge,
        softSkillsGap: data.softSkillsGap || [],
        gradeLevel: data.gradeLevel || null,
      },
    });

    // Log the profile update
    await prisma.auditLog.create({
      data: {
        action: 'PROFILE_UPDATED',
        description: 'Mentee updated their profile',
        performedByEmail: user.email,
        menteeId: mentee.id,
      },
    });

    return NextResponse.json({
      success: true,
      mentee,
    });
  } catch (error) {
    console.error('Error updating mentee profile:', error);
    const message = error instanceof Error ? error.message : 'Failed to update mentee profile';
    return NextResponse.json(
      { error: `Failed to save profile: ${message}` },
      { status: 500 }
    );
  }
}