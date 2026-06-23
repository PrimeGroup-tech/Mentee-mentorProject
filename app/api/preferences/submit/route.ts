// @ts-nocheck
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { isValidId } from '@/lib/security';
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

import { sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit preference submissions
    const rateLimitResp = applyRateLimit(request, 'pref-submit', RATE_LIMITS.WRITE);
    if (rateLimitResp) return rateLimitResp;

    const { menteeId, preferences } = await request.json();

    // Validate IDs
    if (!menteeId || !isValidId(menteeId)) {
      return NextResponse.json({ error: 'Invalid mentee ID' }, { status: 400 });
    }
    if (preferences && Array.isArray(preferences)) {
      for (const pref of preferences) {
        if (!pref.mentorId || !isValidId(pref.mentorId)) {
          return NextResponse.json({ error: 'Invalid mentor ID in preferences' }, { status: 400 });
        }
      }
    }

    if (!menteeId || !preferences || preferences.length === 0) {
      return NextResponse.json(
        { error: 'Mentee ID and at least one preference are required' },
        { status: 400 }
      );
    }

    if (preferences.length > 3) {
      return NextResponse.json(
        { error: 'You can select a maximum of 3 mentors' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const mentee = await prisma.mentee.findUnique({
      where: { id: menteeId },
    });

    if (!mentee || mentee.userId !== user.id) {
      return NextResponse.json(
        { error: 'Mentee not found or access denied' },
        { status: 404 }
      );
    }

    // Delete existing preferences
    await prisma.menteePreference.deleteMany({
      where: { menteeId },
    });

    // Create new preferences with rank
    for (let i = 0; i < preferences.length; i++) {
      await prisma.menteePreference.create({
        data: {
          menteeId,
          mentorId: preferences[i].mentorId,
          preferenceRank: i + 1,
          matchingScore: preferences[i].matchingScore,
        },
      });
    }

    // Update mentee profile to mark as submitted
    await prisma.mentee.update({
      where: { id: menteeId },
      data: {
        profileComplete: true,
        submittedAt: new Date(),
      },
    });

    // Log the submission
    await prisma.auditLog.create({
      data: {
        action: 'SUBMITTED_PREFERENCES',
        description: `Mentee submitted preferences with top 3 mentors`,
        performedByEmail: user.email,
        menteeId,
      },
    });

    // Send notification to HR admin
    const hrAdmins = await prisma.user.findMany({
      where: { role: 'HR_ADMIN' },
    });

    for (const admin of hrAdmins) {
      if (admin.email) {
        try {
          const htmlBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333; border-bottom: 2px solid #4F46E5; padding-bottom: 10px;">
                New Mentee Preferences Submitted
              </h2>
              <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 10px 0;"><strong>Mentee Name:</strong> ${mentee.user?.name || 'Unknown'}</p>
                <p style="margin: 10px 0;"><strong>Mentee Email:</strong> <a href="mailto:${mentee.user?.email}">${mentee.user?.email}</a></p>
                <p style="margin: 10px 0;"><strong>Business Unit:</strong> ${mentee.businessUnit}</p>
                <p style="margin: 10px 0;"><strong>Submitted At:</strong> ${new Date().toLocaleString()}</p>
              </div>
              <p style="color: #666; font-size: 12px;">
                Please log in to the HR Dashboard to review preferences and calibrate assignments.
              </p>
            </div>
          `;

          await sendEmail({
            to: admin.email,
            subject: `New Mentee Preferences: ${mentee.user?.name || 'Unknown'}`,
            html: htmlBody,
          });
        } catch (emailError) {
          console.error('Failed to send HR notification:', emailError);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Preferences submitted successfully',
    });
  } catch (error) {
    console.error('Preference submission error:', error);
    return NextResponse.json(
      { error: 'Failed to submit preferences' },
      { status: 500 }
    );
  }
}