import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const mentors = await prisma.mentor.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        assignments: {
          select: {
            menteeId: true,
          },
        },
      },
      where: {
        profileComplete: true,
      },
    });

    const mentorList = mentors.map(mentor => ({
      id: mentor.id,
      name: mentor.user?.name || 'Unknown',
      email: mentor.user?.email,
      role: mentor.role,
      businessUnit: mentor.businessUnit,
      yearsOfExperience: mentor.yearsOfExperience,
      areasOfExpertise: mentor.areasOfExpertise,
      leadershipStyle: mentor.leadershipStyle,
      shortBio: mentor.shortBio,
      profilePhotoUrl: mentor.profilePhotoUrl,
      currentMenteeCount: mentor.currentMenteeCount,
      maxMentees: mentor.maxMentees,
      personalInterests: mentor.personalInterests,
      shadowSkills: mentor.shadowSkills,
      organizationalChallenge: mentor.organizationalChallenge,
      coachingGoals: mentor.coachingGoals,
      commitmentAvailability: mentor.commitmentAvailability,
      tier: mentor.tier,
      level: mentor.level,
    }));

    return NextResponse.json(mentorList);
  } catch (error) {
    console.error('Error fetching mentors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch mentors' },
      { status: 500 }
    );
  }
}
