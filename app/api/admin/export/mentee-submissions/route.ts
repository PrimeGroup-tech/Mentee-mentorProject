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
  const rateLimitResp = applyRateLimit(request, 'export-mentees', RATE_LIMITS.HEAVY);
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

    // Fetch all mentee submissions
    const mentees = await prisma.mentee.findMany({
      where: { profileComplete: true },
      include: {
        user: true,
        preferences: {
          include: {
            mentor: {
              include: { user: true },
            },
          },
          orderBy: { preferenceRank: 'asc' },
        },
        assignment: {
          include: {
            mentor: {
              include: { user: true },
            },
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });

    // Transform data for Excel — include ALL selected mentors
    const excelData = mentees.map((mentee) => {
      // Build a list of all selected mentors
      const selectedMentors = mentee.preferences
        .map((p: any, i: number) => p.mentor?.user?.name || '')
        .filter(Boolean)
        .join(', ');
      const selectedMentorScores = mentee.preferences
        .map((p: any) => p.mentor?.user?.name ? `${p.mentor.user.name} (${p.matchingScore?.toFixed(2) || 'N/A'})` : '')
        .filter(Boolean)
        .join('; ');

      return {
        'Mentee Name': mentee.user?.name || '',
        'Mentee Email': mentee.user?.email || '',
        'Role': mentee.role || '',
        'Business Unit': mentee.businessUnit || '',
        'Years of Experience': mentee.yearsOfExperience || 0,
        'Employment Date': mentee.employmentDate || '',
        'Tenure (years)': mentee.tenure || 0,
        'Development Areas': mentee.competencyGaps?.join(', ') || '',
        'Career Goals': mentee.careerGoals || '',
        'Personal Interests': mentee.personalInterests?.join(', ') || '',
        'Preferred Meeting Format': mentee.preferredMeetingFormat || '',
        'Selected Mentors': selectedMentors,
        'Selected Mentors (with Scores)': selectedMentorScores,
        'Total Mentors Selected': mentee.preferences.length,
        'Assigned Mentor': mentee.assignment?.mentor?.user?.name || 'Pending',
        'Assignment Status': mentee.assignment?.status || 'Pending',
        'Assignment Date': mentee.assignment?.confirmedAt
          ? new Date(mentee.assignment.confirmedAt).toLocaleDateString()
          : '',
        'Submitted At': mentee.submittedAt
          ? new Date(mentee.submittedAt).toLocaleString()
          : '',
      };
    });

    // Create workbook and worksheet
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Mentee Submissions');

    // Generate Excel buffer
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const base64Excel = Buffer.from(excelBuffer).toString('base64');

    // Send email notification
    const appUrl = process.env.NEXTAUTH_URL || '';
    const timestamp = new Date().toLocaleString();
    const assignedCount = mentees.filter(m => m.assignment).length;
    const pendingCount = mentees.filter(m => !m.assignment).length;

    // Build HTML table with key data
    let tableRows = mentees.slice(0, 50).map(mentee => `
      <tr>
        <td style="padding: 8px; border: 1px solid #e5e7eb;">${mentee.user?.name || ''}</td>
        <td style="padding: 8px; border: 1px solid #e5e7eb;">${mentee.businessUnit || ''}</td>
        <td style="padding: 8px; border: 1px solid #e5e7eb;">${mentee.role || ''}</td>
        <td style="padding: 8px; border: 1px solid #e5e7eb;">${mentee.preferences.map((p: any) => p.mentor?.user?.name).filter(Boolean).join(', ') || '-'}</td>
        <td style="padding: 8px; border: 1px solid #e5e7eb;">${mentee.assignment?.mentor?.user?.name || 'Pending'}</td>
        <td style="padding: 8px; border: 1px solid #e5e7eb;">${mentee.assignment?.status || 'Pending'}</td>
      </tr>
    `).join('');

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto;">
        <h2 style="color: #333; border-bottom: 2px solid #4F46E5; padding-bottom: 10px;">
          Mentee Submissions Report
        </h2>
        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 10px 0;"><strong>Report Type:</strong> All Mentee Submissions</p>
          <p style="margin: 10px 0;"><strong>Generated At:</strong> ${timestamp}</p>
          <p style="margin: 10px 0;"><strong>Total Submissions:</strong> ${mentees.length}</p>
          <p style="margin: 10px 0;"><strong>Assigned:</strong> ${assignedCount}</p>
          <p style="margin: 10px 0;"><strong>Pending:</strong> ${pendingCount}</p>
        </div>
        <h3 style="color: #333;">Submissions Summary${mentees.length > 50 ? ' (First 50)' : ''}</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
          <thead>
            <tr style="background: #4F46E5; color: white;">
              <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: left;">Name</th>
              <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: left;">Business Unit</th>
              <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: left;">Role</th>
              <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: left;">Selected Mentors</th>
              <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: left;">Assigned Mentor</th>
              <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: left;">Status</th>
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
      const emailResponse = await fetch('https://apps.abacus.ai/api/sendNotificationEmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deployment_token: process.env.ABACUSAI_API_KEY,
          app_id: process.env.WEB_APP_ID,
          notification_id: process.env.NOTIF_ID_EXCEL_REPORT_EXPORT,
          subject: `Mentee Submissions Report - ${new Date().toLocaleDateString()}`,
          body: htmlBody,
          is_html: true,
          recipient_email: 'tobiloba.obadara@Primeatlanticnigeria.com',
          sender_email: `noreply@${new URL(appUrl).hostname}`,
          sender_alias: 'PASS Mentoring System',
        }),
      });

      const emailResult = await emailResponse.json();
      console.log('Email API response:', JSON.stringify(emailResult));

      if (emailResult.success) {
        emailSent = true;
      } else if (emailResult.notification_disabled) {
        console.log('Notification disabled by user, skipping email');
      } else {
        console.error('Email API error:', emailResult.message || 'Unknown error');
      }
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
    }

    return NextResponse.json({
      success: true,
      message: emailSent
        ? 'Report generated and emailed to tobiloba.obadara@Primeatlanticnigeria.com'
        : 'Report generated. Email notification may be delayed.',
      emailSent,
      recordCount: mentees.length,
      excelBase64: base64Excel,
      filename: `Mentee_Submissions_${new Date().toISOString().split('T')[0]}.xlsx`,
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to generate export' },
      { status: 500 }
    );
  }
}
