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

    const rateLimitResp = applyRateLimit(request, 'export-users', RATE_LIMITS.HEAVY);
    if (rateLimitResp) return rateLimitResp;

    const users = await prisma.user.findMany({
      include: {
        mentee: { select: { businessUnit: true, role: true, profileComplete: true } },
        mentor: { select: { businessUnit: true, role: true, profileComplete: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const rows = users.map(u => ({
      'Name': u.name || '',
      'Email': u.email,
      'Primary Role': u.role,
      'Account Active': u.isActive ? 'Yes' : 'No',
      'Dual Role': u.hasDualRole ? 'Yes' : 'No',
      'Has Mentee Profile': u.mentee ? 'Yes' : 'No',
      'Has Mentor Profile': u.mentor ? 'Yes' : 'No',
      'Business Unit': u.mentee?.businessUnit || u.mentor?.businessUnit || '',
      'Job Role': u.mentee?.role || u.mentor?.role || '',
      'Mentee Profile Complete': u.mentee?.profileComplete ? 'Yes' : u.mentee ? 'No' : 'N/A',
      'Mentor Profile Complete': u.mentor?.profileComplete ? 'Yes' : u.mentor ? 'No' : 'N/A',
      'Created At': new Date(u.createdAt).toLocaleDateString('en-GB'),
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Users');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const base64 = Buffer.from(buf).toString('base64');
    const filename = `users-report-${new Date().toISOString().split('T')[0]}.xlsx`;

    return NextResponse.json({ excelBase64: base64, filename, count: users.length });
  } catch (error) {
    console.error('Error exporting users:', error);
    return NextResponse.json({ error: 'Failed to export users' }, { status: 500 });
  }
}
