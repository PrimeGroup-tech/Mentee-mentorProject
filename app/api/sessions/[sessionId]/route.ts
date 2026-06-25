import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { isValidId, sanitizeLongText } from '@/lib/security';
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// PATCH - Update session (accept, decline, confirm completion, cancel)
export async function PATCH(
  request: Request,
  { params }: { params: { sessionId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate session ID format
    if (!isValidId(params.sessionId)) {
      return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { mentee: true, mentor: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const mentoringSession = await prisma.mentoringSession.findUnique({
      where: { id: params.sessionId },
    });

    if (!mentoringSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Verify user is part of this session
    const isMentee = user.mentee?.id === mentoringSession.menteeId;
    const isMentor = user.mentor?.id === mentoringSession.mentorId;
    if (!isMentee && !isMentor) {
      return NextResponse.json({ error: 'Not authorized for this session' }, { status: 403 });
    }

    const data = await request.json();
    const { action, sessionNotes, sessionHeld, feedback } = data;

    const updateData: any = {};
    let auditAction = '';
    let auditDescription = '';

    switch (action) {
      case 'accept':
        if (!isMentor) return NextResponse.json({ error: 'Only mentors can accept sessions' }, { status: 403 });
        updateData.status = 'ACCEPTED';
        auditAction = 'SESSION_ACCEPTED';
        auditDescription = `${user.name} accepted mentoring session: "${mentoringSession.title}"`;
        break;

      case 'decline':
        if (!isMentor) return NextResponse.json({ error: 'Only mentors can decline sessions' }, { status: 403 });
        updateData.status = 'DECLINED';
        auditAction = 'SESSION_DECLINED';
        auditDescription = `${user.name} declined mentoring session: "${mentoringSession.title}"`;
        break;

      case 'cancel':
        updateData.status = 'CANCELLED';
        auditAction = 'SESSION_CANCELLED';
        auditDescription = `${user.name} cancelled mentoring session: "${mentoringSession.title}"`;
        break;

      case 'reschedule':
        updateData.status = 'RESCHEDULED';
        if (sessionNotes) updateData.sessionNotes = mentoringSession.sessionNotes
          ? `${mentoringSession.sessionNotes}\n---\nReschedule reason: ${sessionNotes}`
          : `Reschedule reason: ${sessionNotes}`;
        auditAction = 'SESSION_RESCHEDULED';
        auditDescription = `${user.name} rescheduled mentoring session: "${mentoringSession.title}"`;
        break;

      case 'confirm_mentee':
        if (!isMentee) return NextResponse.json({ error: 'Only mentees can confirm as mentee' }, { status: 403 });
        updateData.menteeConfirmed = true;
        if (typeof sessionHeld === 'boolean') updateData.sessionHeldMentee = sessionHeld;
        if (feedback) updateData.menteeFeedback = sanitizeLongText(feedback);
        if (sessionNotes) updateData.sessionNotes = sessionNotes;
        auditAction = 'SESSION_CONFIRMED_MENTEE';
        auditDescription = `${user.name} confirmed session attendance: "${mentoringSession.title}"`;
        // If both confirm, mark completed
        if (mentoringSession.mentorConfirmed) {
          updateData.status = 'COMPLETED';
        }
        break;

      case 'mark_complete':
        updateData.status = 'COMPLETED';
        updateData.menteeConfirmed = true;
        updateData.mentorConfirmed = true;
        if (typeof sessionHeld === 'boolean') {
          if (isMentee) updateData.sessionHeldMentee = sessionHeld;
          if (isMentor) updateData.sessionHeldMentor = sessionHeld;
        }
        if (feedback) {
          if (isMentee) updateData.menteeFeedback = sanitizeLongText(feedback);
          if (isMentor) updateData.mentorFeedback = sanitizeLongText(feedback);
        }
        if (sessionNotes) updateData.sessionNotes = sessionNotes;
        auditAction = 'SESSION_COMPLETED';
        auditDescription = `${user.name} marked mentoring session as completed: "${mentoringSession.title}"`;
        break;

      case 'confirm_mentor':
        if (!isMentor) return NextResponse.json({ error: 'Only mentors can confirm as mentor' }, { status: 403 });
        updateData.mentorConfirmed = true;
        if (typeof sessionHeld === 'boolean') updateData.sessionHeldMentor = sessionHeld;
        if (feedback) updateData.mentorFeedback = sanitizeLongText(feedback);
        if (sessionNotes) updateData.sessionNotes = mentoringSession.sessionNotes
          ? `${mentoringSession.sessionNotes}\n---\nMentor notes: ${sessionNotes}`
          : `Mentor notes: ${sessionNotes}`;
        auditAction = 'SESSION_CONFIRMED_MENTOR';
        auditDescription = `${user.name} confirmed session held: "${mentoringSession.title}"`;
        // If both confirm, mark completed
        if (mentoringSession.menteeConfirmed) {
          updateData.status = 'COMPLETED';
        }
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const updated = await prisma.mentoringSession.update({
      where: { id: params.sessionId },
      data: updateData,
      include: {
        mentee: { include: { user: { select: { name: true, email: true } } } },
        mentor: { include: { user: { select: { name: true, email: true } } } },
      },
    });

    await prisma.auditLog.create({
      data: {
        action: auditAction,
        description: auditDescription,
        performedByEmail: user.email,
        menteeId: mentoringSession.menteeId,
        mentorId: mentoringSession.mentorId,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating session:', error);
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
  }
}
