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
  const rateLimitResp = applyRateLimit(request, 'export-audit', RATE_LIMITS.HEAVY);
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

    const auditLogs = await prisma.auditLog.findMany({
      include: {
        mentee: {
          include: { user: true },
        },
        mentor: {
          include: { user: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });

    const excelData = auditLogs.map((log) => ({
      'Timestamp': log.createdAt ? new Date(log.createdAt).toLocaleString() : '',
      'Action': log.action || '',
      'Description': log.description || '',
      'Performed By': log.performedByEmail || '',
      'Mentee': log.mentee?.user?.name || '',
      'Mentor': log.mentor?.user?.name || '',
      'Metadata': log.metadata || '',
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Audit Logs');

    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const base64Excel = Buffer.from(excelBuffer).toString('base64');

    const timestamp = new Date().toLocaleString();

    let tableRows = auditLogs.slice(0, 30).map(log => `
      <tr>
        <td style="padding: 8px; border: 1px solid #e5e7eb; font-size: 12px;">${log.createdAt ? new Date(log.createdAt).toLocaleString() : ''}</td>
        <td style="padding: 8px; border: 1px solid #e5e7eb;">${log.action || ''}</td>
        <td style="padding: 8px; border: 1px solid #e5e7eb;">${log.performedByEmail || ''}</td>
        <td style="padding: 8px; border: 1px solid #e5e7eb;">${log.description?.substring(0, 80) || ''}${(log.description?.length || 0) > 80 ? '...' : ''}</td>
      </tr>
    `).join('');

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto;">
        <h2 style="color: #333; border-bottom: 2px solid #4F46E5; padding-bottom: 10px;">
          Audit Logs Report
        </h2>
        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 10px 0;"><strong>Report Type:</strong> Audit Logs (Last 1000)</p>
          <p style="margin: 10px 0;"><strong>Generated At:</strong> ${timestamp}</p>
          <p style="margin: 10px 0;"><strong>Total Logs:</strong> ${auditLogs.length}</p>
          <p style="margin: 10px 0;"><strong>Actions Tracked:</strong> Profile Updates, Submissions, Assignments</p>
        </div>
        <h3 style="color: #333;">Recent Activity (Last 30)</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
          <thead>
            <tr style="background: #4F46E5; color: white;">
              <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: left;">Time</th>
              <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: left;">Action</th>
              <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: left;">By</th>
              <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: left;">Description</th>
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
              subject: `Audit Logs Report - ${new Date().toLocaleDateString()}`,
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
      recordCount: auditLogs.length,
      excelBase64: base64Excel,
      filename: `Audit_Logs_${new Date().toISOString().split('T')[0]}.xlsx`,
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to generate export' },
      { status: 500 }
    );
  }
}
