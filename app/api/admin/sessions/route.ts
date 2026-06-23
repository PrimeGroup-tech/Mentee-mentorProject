import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user || user.role !== 'HR_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const sessions = await prisma.mentoringSession.findMany({
      include: {
        mentee: { include: { user: { select: { name: true, email: true } } } },
        mentor: { include: { user: { select: { name: true, email: true } } } },
      },
      orderBy: { scheduledDate: 'desc' },
    });

    // Build summary stats
    const statusCounts: Record<string, number> = {};
    for (const s of sessions) {
      statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;
    }

    return NextResponse.json({ sessions, statusCounts });
  } catch (error) {
    console.error('Error fetching admin sessions:', error);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}
