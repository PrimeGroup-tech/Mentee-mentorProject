import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { sanitizeString, sanitizeLongText, sanitizeNumber, validateEnum } from '@/lib/security';
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// GET - Fetch sessions for the current user (mentor or mentee)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { mentee: true, mentor: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const where: any = { OR: [] };
    if (user.mentee) where.OR.push({ menteeId: user.mentee.id });
    if (user.mentor) where.OR.push({ mentorId: user.mentor.id });

    if (where.OR.length === 0) {
      return NextResponse.json([]);
    }

    const sessions = await prisma.mentoringSession.findMany({
      where,
      include: {
        mentee: { include: { user: { select: { name: true, email: true } } } },
        mentor: { include: { user: { select: { name: true, email: true } } } },
      },
      orderBy: { scheduledDate: 'desc' },
    });

    return NextResponse.json(sessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}

// POST - Book a new mentoring session (mentee books with their assigned mentor)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { mentee: { include: { assignment: true } } },
    });

    if (!user?.mentee) {
      return NextResponse.json({ error: 'Only mentees can book sessions' }, { status: 403 });
    }

    if (!user.mentee.assignment) {
      return NextResponse.json({ error: 'You must be assigned to a mentor to book a session' }, { status: 400 });
    }

    // Rate limit session creation
    const rateLimitResp = applyRateLimit(request, 'session-create', RATE_LIMITS.WRITE);
    if (rateLimitResp) return rateLimitResp;

    const raw = await request.json();
    const title = sanitizeString(raw.title);
    const description = sanitizeLongText(raw.description, 2000);
    const scheduledDate = raw.scheduledDate;
    const scheduledTime = sanitizeString(raw.scheduledTime);
    const duration = sanitizeNumber(raw.duration, 15, 480, 60);
    const meetingFormat = validateEnum(raw.meetingFormat, ['IN_PERSON', 'VIRTUAL', 'HYBRID'], 'VIRTUAL');
    const meetingLink = raw.meetingLink ? sanitizeString(raw.meetingLink) : null;
    const location = raw.location ? sanitizeString(raw.location) : null;

    if (!title || !scheduledDate || !scheduledTime) {
      return NextResponse.json({ error: 'Title, date, and time are required' }, { status: 400 });
    }

    const newSession = await prisma.mentoringSession.create({
      data: {
        menteeId: user.mentee.id,
        mentorId: user.mentee.assignment.mentorId,
        title,
        description: description || null,
        scheduledDate: new Date(scheduledDate),
        scheduledTime,
        duration: duration || 60,
        meetingFormat: meetingFormat || 'VIRTUAL',
        meetingLink: meetingLink || null,
        location: location || null,
        status: 'PENDING',
      },
      include: {
        mentee: { include: { user: { select: { name: true, email: true } } } },
        mentor: { include: { user: { select: { name: true, email: true } } } },
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'SESSION_BOOKED',
        description: `${user.name} booked a mentoring session: "${title}"`,
        performedByEmail: user.email,
        menteeId: user.mentee.id,
        mentorId: user.mentee.assignment.mentorId,
      },
    });

    return NextResponse.json(newSession);
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}
