// @ts-nocheck
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

import { sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Rate limit export operations
  const rateLimitResp = applyRateLimit(request, 'export-assignments', RATE_LIMITS.HEAVY);
  if (rateLimitResp) return rateLimitResp;
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || user.role !== 'HR_ADMIN') {
      return NextResponse.json(
        { error: 'Only HR admins can export data' },
        { status: 403 }
      );
    }

    const assignments = await prisma.mentorMenteeAssignment.findMany({
      where: { status: 'CONFIRMED' },
      include: {
        mentee: {
          include: { user: true },
        },
        mentor: {
          include: { user: true },
        },
      },
      orderBy: { confirmedAt: 'desc' },
    });

    const excelData = assignments.map((assignment) => ({
      'Mentee Name': assignment.mentee?.user?.name || '',
      'Mentee Email': assignment.mentee?.user?.email || '',
      'Mentee Business Unit': assignment.mentee?.businessUnit || '',
      'Mentor Name': assignment.mentor?.user?.name || '',
      'Mentor Email': assignment.mentor?.user?.email || '',
      'Mentor Business Unit': assignment.mentor?.businessUnit || '',
      'Assignment Date': assignment.confirmedAt
        ? new Date(assignment.confirmedAt).toLocaleDateString()
        : '',
      'Assigned By': assignment.assignedByHrEmail || '',
      'Status': assignment.status || '',
      'Is Override': assignment.isOverride ? 'Yes' : 'No',
      'Original System Rank': assignment.originalSystemRank || '',
      'Assignment Reason': assignment.assignmentReason || '',
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Confirmed Assignments');

    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const base64Excel = Buffer.from(excelBuffer).toString('base64');

    const timestamp = new Date().toLocaleString();

    let tableRows = assignments.slice(0, 50).map(a => `
      <tr>
        <td style="padding: 8px; border: 1px solid #e5e7eb;">${a.mentee?.user?.name || ''}</td>
        <td style="padding: 8px; border: 1px solid #e5e7eb;">${a.mentee?.businessUnit || ''}</td>
        <td style="padding: 8px; border: 1px solid #e5e7eb;">${a.mentor?.user?.name || ''}</td>
        <td style="padding: 8px; border: 1px solid #e5e7eb;">${a.mentor?.businessUnit || ''}</td>
        <td style="padding: 8px; border: 1px solid #e5e7eb;">${a.isOverride ? 'Override' : 'System'}</td>
        <td style="padding: 8px; border: 1px solid #e5e7eb;">${a.confirmedAt ? new Date(a.confirmedAt).toLocaleDateString() : ''}</td>
      </tr>
    `).join('');

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto;">
        <h2 style="color: #333; border-bottom: 2px solid #4F46E5; padding-bottom: 10px;">
          Confirmed Assignments Report
        </h2>
        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 10px 0;"><strong>Report Type:</strong> All Confirmed Assignments</p>
          <p style="margin: 10px 0;"><strong>Generated At:</strong> ${timestamp}</p>
          <p style="margin: 10px 0;"><strong>Total Assignments:</strong> ${assignments.length}</p>
          <p style="margin: 10px 0;"><strong>Manual Overrides:</strong> ${assignments.filter(a => a.isOverride).length}</p>
          <p style="margin: 10px 0;"><strong>System Matches:</strong> ${assignments.filter(a => !a.isOverride).length}</p>
        </div>
        <h3 style="color: #333;">Assignments Summary${assignments.length > 50 ? ' (First 50)' : ''}</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
          <thead>
            <tr style="background: #4F46E5; color: white;">
              <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: left;">Mentee</th>
              <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: left;">Mentee BU</th>
              <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: left;">Mentor</th>
              <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: left;">Mentor BU</th>
              <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: left;">Type</th>
              <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: left;">Date</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
        <p style="color: #666; font-size: 14px; margin-top: 20px;">
          To download the full Excel report, please use the Export button on the HR Dashboard.
        </p>
      </div>
    `;

    let emailSent = false;
    try {
      await sendEmail({
              to: 'tobiloba.obadara@Primeatlanticnigeria.com',
              subject: `Confirmed Assignments Report - ${new Date().toLocaleDateString()}`,
              html: htmlBody,
            });
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
    }

    return NextResponse.json({
      success: true,
      message: emailSent
        ? 'Report generated and emailed to tobiloba.obadara@Primeatlanticnigeria.com'
        : 'Report generated. Email notification may be delayed.',
      emailSent,
      recordCount: assignments.length,
      excelBase64: base64Excel,
      filename: `Confirmed_Assignments_${new Date().toISOString().split('T')[0]}.xlsx`,
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to generate export' },
      { status: 500 }
    );
  }
}
