// @ts-nocheck
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!admin || admin.role !== 'HR_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const rateLimitResp = applyRateLimit(request, 'export-sessions', RATE_LIMITS.HEAVY);
    if (rateLimitResp) return rateLimitResp;

    const sessions = await prisma.mentoringSession.findMany({
      include: {
        mentee: { include: { user: { select: { name: true, email: true } } } },
        mentor: { include: { user: { select: { name: true, email: true } } } },
      },
      orderBy: { scheduledDate: 'desc' },
    });

    const rows = sessions.map(s => ({
      'Session Title': s.title,
      'Mentee Name': s.mentee?.user?.name || '',
      'Mentee Email': s.mentee?.user?.email || '',
      'Mentor Name': s.mentor?.user?.name || '',
      'Mentor Email': s.mentor?.user?.email || '',
      'Scheduled Date': new Date(s.scheduledDate).toLocaleDateString('en-GB'),
      'Time': s.scheduledTime,
      'Duration (min)': s.duration,
      'Format': s.meetingFormat,
      'Status': s.status,
      'Session Held (Mentee)': s.sessionHeldMentee === true ? 'Yes' : s.sessionHeldMentee === false ? 'No' : 'N/A',
      'Session Held (Mentor)': s.sessionHeldMentor === true ? 'Yes' : s.sessionHeldMentor === false ? 'No' : 'N/A',
      'Mentee Feedback': s.menteeFeedback || '',
      'Mentor Feedback': s.mentorFeedback || '',
      'Session Notes': s.sessionNotes || '',
      'Mentee Confirmed': s.menteeConfirmed ? 'Yes' : 'No',
      'Mentor Confirmed': s.mentorConfirmed ? 'Yes' : 'No',
      'Created At': new Date(s.createdAt).toLocaleDateString('en-GB'),
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sessions');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const base64 = Buffer.from(buf).toString('base64');
    const filename = `sessions-report-${new Date().toISOString().split('T')[0]}.xlsx`;

    return NextResponse.json({ excelBase64: base64, filename, count: sessions.length });
  } catch (error) {
    console.error('Error exporting sessions:', error);
    return NextResponse.json({ error: 'Failed to export sessions' }, { status: 500 });
  }
}
