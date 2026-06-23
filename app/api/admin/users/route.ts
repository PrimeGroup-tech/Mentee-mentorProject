import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { isValidId } from '@/lib/security';
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!admin || admin.role !== 'HR_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!admin || admin.role !== 'HR_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Rate limit admin user management
    const rateLimitResp = applyRateLimit(request, 'admin-users', RATE_LIMITS.WRITE);
    if (rateLimitResp) return rateLimitResp;

    const { userId, action, newPassword, newRole } = await request.json();

    if (!userId || !isValidId(userId)) {
      return NextResponse.json({ error: 'Valid User ID is required' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { mentee: true, mentor: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Action: change password
    if (action === 'change_password') {
      if (!newPassword || newPassword.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
      }
      const hashed = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({ where: { id: userId }, data: { password: hashed } });

      await prisma.auditLog.create({
        data: {
          action: 'PASSWORD_CHANGED',
          description: `Admin changed password for ${targetUser.email}`,
          performedByEmail: admin.email,
        },
      });

      return NextResponse.json({ success: true, message: 'Password updated successfully' });
    }

    // Action: convert role
    if (action === 'convert_role') {
      if (!newRole || !['MENTOR', 'MENTEE'].includes(newRole)) {
        return NextResponse.json({ error: 'Invalid role. Must be MENTOR or MENTEE' }, { status: 400 });
      }

      if (targetUser.role === newRole) {
        return NextResponse.json({ error: `User is already a ${newRole}` }, { status: 400 });
      }

      if (targetUser.role === 'HR_ADMIN') {
        return NextResponse.json({ error: 'Cannot convert an HR Admin' }, { status: 400 });
      }

      // Check for active assignments that would block conversion
      if (targetUser.role === 'MENTEE' && targetUser.mentee) {
        const activeAssignment = await prisma.mentorMenteeAssignment.findUnique({
          where: { menteeId: targetUser.mentee.id },
        });
        if (activeAssignment) {
          // Delete the assignment first
          await prisma.mentorMenteeAssignment.delete({ where: { id: activeAssignment.id } });
        }
        // Delete mentee preferences
        await prisma.menteePreference.deleteMany({ where: { menteeId: targetUser.mentee.id } });
        // Delete matching scores
        await prisma.matchingScore.deleteMany({ where: { menteeId: targetUser.mentee.id } });
        // Delete mentoring sessions
        await prisma.mentoringSession.deleteMany({ where: { menteeId: targetUser.mentee.id } });
        // Delete mentee profile
        await prisma.mentee.delete({ where: { id: targetUser.mentee.id } });
      }

      if (targetUser.role === 'MENTOR' && targetUser.mentor) {
        // Check for active assignments
        const assignments = await prisma.mentorMenteeAssignment.findMany({
          where: { mentorId: targetUser.mentor.id },
        });
        if (assignments.length > 0) {
          await prisma.mentorMenteeAssignment.deleteMany({ where: { mentorId: targetUser.mentor.id } });
        }
        // Delete mentee preferences pointing to this mentor
        await prisma.menteePreference.deleteMany({ where: { mentorId: targetUser.mentor.id } });
        // Delete matching scores
        await prisma.matchingScore.deleteMany({ where: { mentorId: targetUser.mentor.id } });
        // Delete mentoring sessions
        await prisma.mentoringSession.deleteMany({ where: { mentorId: targetUser.mentor.id } });
        // Delete mentor profile
        await prisma.mentor.delete({ where: { id: targetUser.mentor.id } });
      }

      // Update role
      await prisma.user.update({ where: { id: userId }, data: { role: newRole } });

      // Create new profile stub
      if (newRole === 'MENTOR') {
        await prisma.mentor.create({
          data: {
            userId: userId,
            role: 'New Mentor',
            businessUnit: 'PASS',
            yearsOfExperience: 0,
            areasOfExpertise: [],
            leadershipStyle: 'COLLABORATIVE',
            coachingGoals: '',
            personalInterests: [],
            shadowSkills: [],
            commitmentAvailability: '',
            maxMentees: 5,
            profileComplete: false,
          },
        });
      } else if (newRole === 'MENTEE') {
        await prisma.mentee.create({
          data: {
            userId: userId,
            role: 'New Mentee',
            businessUnit: 'PASS',
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

      await prisma.auditLog.create({
        data: {
          action: 'ROLE_CONVERTED',
          description: `Admin converted ${targetUser.email} from ${targetUser.role} to ${newRole}`,
          performedByEmail: admin.email,
        },
      });

      return NextResponse.json({ success: true, message: `User converted to ${newRole} successfully` });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error managing user:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Operation failed: ${message}` }, { status: 500 });
  }
}
