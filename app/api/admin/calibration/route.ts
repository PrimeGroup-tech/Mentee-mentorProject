import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user || user.role !== 'HR_ADMIN') {
      return NextResponse.json({ error: 'Only HR admins can access calibration data' }, { status: 403 });
    }

    // Get all mentors with their selection counts and assigned mentees
    const mentors = await prisma.mentor.findMany({
      include: {
        user: { select: { name: true, email: true } },
        preferences: {
          include: {
            mentee: {
              include: {
                user: { select: { name: true, email: true } },
              },
            },
          },
          orderBy: { matchingScore: 'desc' },
        },
        assignments: {
          include: {
            mentee: {
              include: { user: { select: { name: true, email: true } } },
            },
          },
        },
      },
      orderBy: { user: { name: 'asc' } },
    });

    // Get all mentees with their preferences for cross-reference
    const mentees = await prisma.mentee.findMany({
      where: { profileComplete: true },
      include: {
        user: { select: { name: true, email: true } },
        preferences: {
          include: {
            mentor: {
              include: { user: { select: { name: true, email: true } } },
            },
          },
          orderBy: { preferenceRank: 'asc' },
        },
        assignment: {
          include: {
            mentor: { include: { user: { select: { name: true, email: true } } } },
          },
        },
      },
    });

    // Build calibration data
    const calibrationData = mentors.map((mentor) => {
      const selectedByMentees = (mentor as any).preferences.map((pref: any) => ({
        menteeId: pref.mentee.id,
        menteeName: pref.mentee.user?.name || '',
        menteeEmail: pref.mentee.user?.email || '',
        menteeBusinessUnit: pref.mentee.businessUnit || '',
        menteeRole: pref.mentee.role || '',
        matchingScore: pref.matchingScore,
        preferenceRank: pref.preferenceRank,
        competencyGaps: pref.mentee.competencyGaps || [],
      }));

      const assignedMentees = (mentor as any).assignments.map((a: any) => ({
        menteeId: a.mentee.id,
        menteeName: a.mentee.user?.name || '',
        status: a.status,
      }));

      return {
        mentorId: mentor.id,
        mentorName: (mentor as any).user?.name || '',
        mentorEmail: (mentor as any).user?.email || '',
        mentorBusinessUnit: mentor.businessUnit || '',
        mentorRole: mentor.role || '',
        areasOfExpertise: mentor.areasOfExpertise || [],
        leadershipStyle: mentor.leadershipStyle || '',
        level: mentor.level,
        tier: mentor.tier,
        maxMentees: mentor.maxMentees,
        currentMenteeCount: mentor.currentMenteeCount,
        selectionCount: selectedByMentees.length,
        selectedByMentees,
        assignedMentees,
      };
    });

    // Summary stats
    const totalMentors = mentors.length;
    const mentorsWithSelections = calibrationData.filter((m) => m.selectionCount > 0).length;
    const totalMentees = mentees.length;
    const assignedMentees = mentees.filter((m) => m.assignment).length;
    const pendingMentees = totalMentees - assignedMentees;

    return NextResponse.json({
      calibrationData,
      summary: {
        totalMentors,
        mentorsWithSelections,
        totalMentees,
        assignedMentees,
        pendingMentees,
      },
    });
  } catch (error) {
    console.error('Calibration data error:', error);
    return NextResponse.json({ error: 'Failed to fetch calibration data' }, { status: 500 });
  }
}
