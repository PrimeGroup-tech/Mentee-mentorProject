// @ts-nocheck
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { calculateMatchingScore } from '@/lib/matching-algorithm';
import { isValidId } from '@/lib/security';
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit match calculations
    const rateLimitResp = applyRateLimit(request, 'match-calc', RATE_LIMITS.WRITE);
    if (rateLimitResp) return rateLimitResp;

    const { menteeId } = await request.json();

    if (!menteeId || !isValidId(menteeId)) {
      return NextResponse.json({ error: 'Valid Mentee ID is required' }, { status: 400 });
    }

    // Verify the user is the mentee or is HR admin
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    const sessionRole = session.user.role;
    if (!user || (sessionRole !== 'MENTEE' && sessionRole !== 'HR_ADMIN')) {
      return NextResponse.json(
        { error: 'Only mentees or HR admins can calculate matches' },
        { status: 403 }
      );
    }

    const mentee = await prisma.mentee.findUnique({
      where: { id: menteeId },
      include: { preferences: true },
    });

    if (!mentee) {
      return NextResponse.json({ error: 'Mentee not found' }, { status: 404 });
    }

    // Get all available mentors
    const mentors = await prisma.mentor.findMany({
      include: { assignments: true },
    });

    // Calculate scores for all mentors
    const scores = mentors.map(mentor => {
      const score = calculateMatchingScore(mentee, mentor);
      return {
        mentorId: mentor.id,
        mentorName: mentor.user?.name || 'Unknown',
        mentorRole: mentor.role,
        mentorBusinessUnit: mentor.businessUnit,
        yearsOfExperience: mentor.yearsOfExperience,
        areasOfExpertise: mentor.areasOfExpertise,
        leadershipStyle: mentor.leadershipStyle,
        shortBio: mentor.shortBio,
        profilePhotoUrl: mentor.profilePhotoUrl,
        currentMenteeCount: mentor.currentMenteeCount,
        maxMentees: mentor.maxMentees,
        ...score,
      };
    });

    // Sort by total score descending and return top matches
    const topMatches = scores
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 20);

    // Save matching scores to database
    for (const match of topMatches) {
      await prisma.matchingScore.upsert({
        where: {
          menteeId_mentorId: {
            menteeId: menteeId,
            mentorId: match.mentorId,
          },
        },
        update: {
          competencyAlignmentScore: match.competencyAlignmentScore,
          experienceGapScore: match.experienceGapScore,
          crossFunctionalScore: match.crossFunctionalScore,
          careerAspirationScore: match.careerAspirationScore,
          leadershipStyleScore: match.leadershipStyleScore,
          personalInterestsScore: match.personalInterestsScore,
          wildcardAlignmentScore: match.wildcardAlignmentScore,
          availabilityFormatScore: match.availabilityFormatScore,
          preferenceScore: match.preferenceScore,
          totalScore: match.totalScore,
        },
        create: {
          menteeId: menteeId,
          mentorId: match.mentorId,
          competencyAlignmentScore: match.competencyAlignmentScore,
          experienceGapScore: match.experienceGapScore,
          crossFunctionalScore: match.crossFunctionalScore,
          careerAspirationScore: match.careerAspirationScore,
          leadershipStyleScore: match.leadershipStyleScore,
          personalInterestsScore: match.personalInterestsScore,
          wildcardAlignmentScore: match.wildcardAlignmentScore,
          availabilityFormatScore: match.availabilityFormatScore,
          preferenceScore: match.preferenceScore,
          totalScore: match.totalScore,
        },
      });
    }

    return NextResponse.json({
      success: true,
      topMatches,
    });
  } catch (error) {
    console.error('Matching calculation error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate matches' },
      { status: 500 }
    );
  }
}
