// @ts-nocheck
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { isValidId, sanitizeLongText } from '@/lib/security';
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

import { sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
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
        { error: 'Only HR admins can confirm assignments' },
        { status: 403 }
      );
    }

    // Rate limit assignment operations
    const rateLimitResp = applyRateLimit(request, 'assignment-confirm', RATE_LIMITS.WRITE);
    if (rateLimitResp) return rateLimitResp;

    const body = await request.json();
    const menteeId = body.menteeId;
    const mentorId = body.mentorId;
    const assignmentReason = body.assignmentReason ? sanitizeLongText(body.assignmentReason, 1000) : undefined;
    const isOverride = Boolean(body.isOverride);
    const originalSystemRank = body.originalSystemRank ? Number(body.originalSystemRank) : undefined;

    if (!menteeId || !mentorId || !isValidId(menteeId) || !isValidId(mentorId)) {
      return NextResponse.json(
        { error: 'Valid Mentee ID and Mentor ID are required' },
        { status: 400 }
      );
    }

    const mentee = await prisma.mentee.findUnique({
      where: { id: menteeId },
      include: { user: true },
    });
    const mentor = await prisma.mentor.findUnique({
      where: { id: mentorId },
      include: { user: true },
    });

    if (!mentee || !mentor) {
      return NextResponse.json(
        { error: 'Mentee or Mentor not found' },
        { status: 404 }
      );
    }

    // Capacity is informational only — HR admin can assign beyond maxMentees
    // (No hard block on capacity)

    // Create or update assignment
    const assignment = await prisma.mentorMenteeAssignment.upsert({
      where: { menteeId },
      update: {
        mentorId,
        assignedByHrEmail: user.email,
        assignmentReason: assignmentReason || undefined,
        isOverride: isOverride || false,
        originalSystemRank: originalSystemRank || undefined,
        status: 'CONFIRMED',
        confirmedAt: new Date(),
      },
      create: {
        menteeId,
        mentorId,
        assignedByHrEmail: user.email,
        assignmentReason: assignmentReason || undefined,
        isOverride: isOverride || false,
        originalSystemRank: originalSystemRank || undefined,
        status: 'CONFIRMED',
      },
    });

    // Update mentor's current mentee count
    await prisma.mentor.update({
      where: { id: mentorId },
      include: { user: true },
      data: {
        currentMenteeCount: {
          increment: 1,
        },
      },
    });

    // Log the assignment
    await prisma.auditLog.create({
      data: {
        action: 'CONFIRMED_ASSIGNMENT',
        description: `HR assigned ${mentee.user?.name} to ${mentor.user?.name}`,
        performedByEmail: user.email,
        menteeId,
        mentorId,
        assignmentId: assignment.id,
        metadata: JSON.stringify({
          isOverride,
          assignmentReason,
          originalSystemRank,
        }),
      },
    });

    // Send notifications

    // Notify mentee
    if (mentee.user?.email) {
      try {
        const menteeHtmlBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333; border-bottom: 2px solid #4F46E5; padding-bottom: 10px;">
              Your Mentor Assignment Confirmed
            </h2>
            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 10px 0;"><strong>Congratulations!</strong> Your mentor has been assigned.</p>
              <p style="margin: 10px 0;"><strong>Mentor Name:</strong> ${mentor.user?.name || 'Unknown'}</p>
              <p style="margin: 10px 0;"><strong>Role:</strong> ${mentor.role}</p>
              <p style="margin: 10px 0;"><strong>Business Unit:</strong> ${mentor.businessUnit}</p>
              <p style="margin: 20px 0; color: #666; font-size: 14px;">
                Your mentor will contact you shortly to schedule your first meeting.
              </p>
            </div>
          </div>
        `;

        await sendEmail({
          to: mentee.user.email,
          subject: `Your Mentor Assignment Confirmed: ${mentor.user?.name || 'Unknown'}`,
          html: menteeHtmlBody,
        });
      } catch (emailError) {
        console.error('Failed to send mentee notification:', emailError);
      }
    }

    // Notify mentor
    if (mentor.user?.email) {
      try {
        const mentorHtmlBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333; border-bottom: 2px solid #4F46E5; padding-bottom: 10px;">
              New Mentee Assignment
            </h2>
            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 10px 0;"><strong>You have a new mentee!</strong></p>
              <p style="margin: 10px 0;"><strong>Mentee Name:</strong> ${mentee.user?.name || 'Unknown'}</p>
              <p style="margin: 10px 0;"><strong>Mentee Email:</strong> <a href="mailto:${mentee.user?.email}">${mentee.user?.email}</a></p>
              <p style="margin: 10px 0;"><strong>Business Unit:</strong> ${mentee.businessUnit}</p>
              <p style="margin: 20px 0; color: #666; font-size: 14px;">
                Please reach out to your mentee to schedule your first meeting.
              </p>
            </div>
          </div>
        `;

        await sendEmail({
          to: mentor.user.email,
          subject: `New Mentee Assignment: ${mentee.user?.name || 'Unknown'}`,
          html: mentorHtmlBody,
        });
      } catch (emailError) {
        console.error('Failed to send mentor notification:', emailError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Assignment confirmed successfully',
      assignment,
    });
  } catch (error) {
    console.error('Assignment confirmation error:', error);
    return NextResponse.json(
      { error: 'Failed to confirm assignment' },
      { status: 500 }
    );
  }
}