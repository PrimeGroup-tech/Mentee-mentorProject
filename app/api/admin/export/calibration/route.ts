// @ts-nocheck
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Rate limit export operations
  const rateLimitResp = applyRateLimit(request, 'export-calibration', RATE_LIMITS.HEAVY);
  if (rateLimitResp) return rateLimitResp;
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user || user.role !== 'HR_ADMIN') {
      return NextResponse.json({ error: 'Only HR admins can export data' }, { status: 403 });
    }

    const mentors = await prisma.mentor.findMany({
      include: {
        user: { select: { name: true, email: true } },
        preferences: {
          include: {
            mentee: {
              include: { user: { select: { name: true, email: true } } },
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

    // Build rows: one row per mentor-mentee selection pair
    const rows: any[] = [];

    for (const mentor of mentors) {
      const assignedMenteeIds = (mentor as any).assignments.map((a: any) => a.mentee?.id);

      if ((mentor as any).preferences.length === 0) {
        // Mentor with no selections
        rows.push({
          'Mentor Name': (mentor as any).user?.name || '',
          'Mentor Email': (mentor as any).user?.email || '',
          'Mentor Business Unit': mentor.businessUnit || '',
          'Mentor Role': mentor.role || '',
          'Areas of Expertise': (mentor.areasOfExpertise || []).join(', '),
          'Max Mentees': mentor.maxMentees,
          'Current Mentees': mentor.currentMenteeCount,
          'Available Slots': Math.max(0, mentor.maxMentees - mentor.currentMenteeCount),
          'Selected By Mentee': '',
          'Mentee Email': '',
          'Mentee Business Unit': '',
          'Mentee Role': '',
          'Match Score': '',
          'Preference Rank': '',
          'Development Areas': '',
          'Assignment Status': 'No selections',
        });
      } else {
        for (const pref of (mentor as any).preferences) {
          const isAssigned = assignedMenteeIds.includes(pref.mentee?.id);
          rows.push({
            'Mentor Name': (mentor as any).user?.name || '',
            'Mentor Email': (mentor as any).user?.email || '',
            'Mentor Business Unit': mentor.businessUnit || '',
            'Mentor Role': mentor.role || '',
            'Areas of Expertise': (mentor.areasOfExpertise || []).join(', '),
            'Max Mentees': mentor.maxMentees,
            'Current Mentees': mentor.currentMenteeCount,
            'Available Slots': Math.max(0, mentor.maxMentees - mentor.currentMenteeCount),
            'Selected By Mentee': pref.mentee?.user?.name || '',
            'Mentee Email': pref.mentee?.user?.email || '',
            'Mentee Business Unit': pref.mentee?.businessUnit || '',
            'Mentee Role': pref.mentee?.role || '',
            'Match Score': pref.matchingScore ? `${pref.matchingScore}%` : '',
            'Preference Rank': pref.preferenceRank || '',
            'Development Areas': (pref.mentee?.competencyGaps || []).join(', '),
            'Assignment Status': isAssigned ? 'Assigned' : 'Pending',
          });
        }
      }
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Calibration Report');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const excelBase64 = Buffer.from(buf).toString('base64');
    const filename = `calibration-report-${new Date().toISOString().split('T')[0]}.xlsx`;

    return NextResponse.json({ excelBase64, filename });
  } catch (error) {
    console.error('Calibration export error:', error);
    return NextResponse.json({ error: 'Failed to export calibration data' }, { status: 500 });
  }
}
