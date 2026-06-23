import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { isValidId } from '@/lib/security';

export const dynamic = 'force-dynamic';

// GET mentor profile for viewing (accessible to any authenticated user)
export async function GET(
  request: Request,
  { params }: { params: { mentorId: string } }
) {
  try {
    if (!isValidId(params.mentorId)) {
      return NextResponse.json({ error: 'Invalid mentor ID' }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const mentor = await prisma.mentor.findUnique({
      where: { id: params.mentorId },
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
    });

    if (!mentor) {
      return NextResponse.json({ error: 'Mentor not found' }, { status: 404 });
    }

    // Return full public profile (no sensitive data)
    return NextResponse.json({
      id: mentor.id,
      name: mentor.user?.name || 'Unknown',
      role: mentor.role,
      businessUnit: mentor.businessUnit,
      yearsOfExperience: mentor.yearsOfExperience,
      areasOfExpertise: mentor.areasOfExpertise,
      leadershipStyle: mentor.leadershipStyle,
      coachingGoals: mentor.coachingGoals,
      personalInterests: mentor.personalInterests,
      shadowSkills: mentor.shadowSkills,
      commitmentAvailability: mentor.commitmentAvailability,
      organizationalChallenge: mentor.organizationalChallenge,
      shortBio: mentor.shortBio,
      profilePhotoUrl: mentor.profilePhotoUrl,
      tier: mentor.tier,
      level: mentor.level,
      currentMenteeCount: mentor.currentMenteeCount,
      maxMentees: mentor.maxMentees,
      profileComplete: mentor.profileComplete,
    });
  } catch (error) {
    console.error('Error fetching mentor profile:', error);
    return NextResponse.json({ error: 'Failed to fetch mentor profile' }, { status: 500 });
  }
}
