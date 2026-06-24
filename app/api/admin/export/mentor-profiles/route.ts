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
  const rateLimitResp = applyRateLimit(request, 'export-mentors', RATE_LIMITS.HEAVY);
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

    const mentors = await prisma.mentor.findMany({
      include: {
        user: true,
        assignments: {
          include: {
            mentee: {
              include: { user: true },
            },
          },
        },
      },
      orderBy: { user: { name: 'asc' } },
    });

    const excelData = mentors.map((mentor) => ({
      'Mentor Name': mentor.user?.name || '',
      'Mentor Email': mentor.user?.email || '',
      'Role': mentor.role || '',
      'Business Unit': mentor.businessUnit || '',
      'Years of Experience': mentor.yearsOfExperience || 0,
      'Areas of Expertise & Skills': [...(mentor.areasOfExpertise || []), ...(mentor.shadowSkills || [])].join(', ') || '',
      'Leadership Style': mentor.leadershipStyle || '',
      'Personal Interests': mentor.personalInterests?.join(', ') || '',
      'Commitment Availability': mentor.commitmentAvailability || '',
      'Organizational Challenge': mentor.keyOrganizationalChallenge || '',
      'Max Mentees': mentor.maxMentees || 0,
      'Current Mentees': mentor.currentMenteeCount || 0,
      'Available Slots': (mentor.maxMentees || 0) - (mentor.currentMenteeCount || 0),
      'Profile Complete': mentor.profileComplete ? 'Yes' : 'No',
      'Assigned Mentees': mentor.assignments
        .map((a) => a.mentee?.user?.name)
        .filter(Boolean)
        .join('; ') || 'None',
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Mentor Profiles');

    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const base64Excel = Buffer.from(excelBuffer).toString('base64');

    const timestamp = new Date().toLocaleString();

    let tableRows = mentors.slice(0, 50).map(mentor => `
      <tr>
        <td style="padding: 8px; border: 1px solid #e5e7eb;">${mentor.user?.name || ''}</td>
        <td style="padding: 8px; border: 1px solid #e5e7eb;">${mentor.businessUnit || ''}</td>
        <td style="padding: 8px; border: 1px solid #e5e7eb;">${mentor.role || ''}</td>
        <td style="padding: 8px; border: 1px solid #e5e7eb;">${mentor.currentMenteeCount || 0}/${mentor.maxMentees || 0}</td>
        <td style="padding: 8px; border: 1px solid #e5e7eb;">${mentor.profileComplete ? 'Yes' : 'No'}</td>
      </tr>
    `).join('');

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto;">
        <h2 style="color: #333; border-bottom: 2px solid #4F46E5; padding-bottom: 10px;">
          Mentor Profiles Report
        </h2>
        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 10px 0;"><strong>Report Type:</strong> All Mentor Profiles</p>
          <p style="margin: 10px 0;"><strong>Generated At:</strong> ${timestamp}</p>
          <p style="margin: 10px 0;"><strong>Total Mentors:</strong> ${mentors.length}</p>
          <p style="margin: 10px 0;"><strong>Active Mentors:</strong> ${mentors.filter(m => m.assignments.length > 0).length}</p>
          <p style="margin: 10px 0;"><strong>Available Mentors:</strong> ${mentors.filter(m => m.currentMenteeCount < m.maxMentees).length}</p>
        </div>
        <h3 style="color: #333;">Mentors Summary${mentors.length > 50 ? ' (First 50)' : ''}</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
          <thead>
            <tr style="background: #4F46E5; color: white;">
              <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: left;">Name</th>
              <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: left;">Business Unit</th>
              <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: left;">Role</th>
              <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: left;">Capacity</th>
              <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: left;">Complete</th>
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
              subject: `Mentor Profiles Report - ${new Date().toLocaleDateString()}`,
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
      recordCount: mentors.length,
      excelBase64: base64Excel,
      filename: `Mentor_Profiles_${new Date().toISOString().split('T')[0]}.xlsx`,
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to generate export' },
      { status: 500 }
    );
  }
}
