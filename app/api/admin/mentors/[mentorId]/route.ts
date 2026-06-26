import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { createS3Client, getBucketConfig } from '@/lib/aws-config';
import { isValidId } from '@/lib/security';
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const s3Client = createS3Client();
const { bucketName, folderPrefix } = getBucketConfig();

async function verifyAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) return null;
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user || user.role !== 'HR_ADMIN') return null;
  return user;
}

// GET single mentor profile
export async function GET(
  request: Request,
  { params }: { params: { mentorId: string } }
) {
  try {
    if (!isValidId(params.mentorId)) {
      return NextResponse.json({ error: 'Invalid mentor ID' }, { status: 400 });
    }

    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const mentor = await prisma.mentor.findUnique({
      where: { id: params.mentorId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        assignments: {
          include: {
            mentee: {
              include: {
                user: { select: { name: true, email: true } },
              },
            },
          },
        },
      },
    });

    if (!mentor) {
      return NextResponse.json({ error: 'Mentor not found' }, { status: 404 });
    }

    return NextResponse.json(mentor);
  } catch (error) {
    console.error('Error fetching mentor:', error);
    return NextResponse.json({ error: 'Failed to fetch mentor' }, { status: 500 });
  }
}

// PUT update mentor profile
export async function PUT(
  request: Request,
  { params }: { params: { mentorId: string } }
) {
  try {
    if (!isValidId(params.mentorId)) {
      return NextResponse.json({ error: 'Invalid mentor ID' }, { status: 400 });
    }

    // Rate limit profile updates
    const rateLimitResp = applyRateLimit(request, 'admin-mentor-update', RATE_LIMITS.WRITE);
    if (rateLimitResp) return rateLimitResp;

    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const contentType = request.headers.get('content-type') || '';
    let updateData: any = {};
    let photoUrl: string | undefined;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const photo = formData.get('photo') as File | null;
      const profileDataStr = formData.get('profileData') as string | null;

      if (profileDataStr) {
        updateData = JSON.parse(profileDataStr);
      }

      if (photo && photo.size > 0) {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(photo.type)) {
          return NextResponse.json({ error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' }, { status: 400 });
        }
        if (photo.size > 10 * 1024 * 1024) {
          return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
        }

        const ext = photo.name.split('.').pop();
        const key = `${folderPrefix}public/mentors/${params.mentorId}/${uuidv4()}.${ext}`;
        const bytes = await photo.arrayBuffer();

        await s3Client.send(new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          Body: Buffer.from(bytes),
          ContentType: photo.type,
        }));

        photoUrl = `https://${bucketName}.s3.${process.env.AWS_REGION || 'us-west-2'}.amazonaws.com/${key}`;
      }
    } else {
      updateData = await request.json();
    }

    // Build prisma update object
    const prismaUpdate: any = {};
    const allowedFields = [
      'role', 'businessUnit', 'yearsOfExperience', 'areasOfExpertise',
      'leadershipStyle', 'coachingGoals', 'personalInterests', 'shadowSkills',
      'commitmentAvailability', 'maxMentees', 'organizationalChallenge', 'shortBio',
      'profileComplete', 'tier', 'level',
    ];

    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        prismaUpdate[field] = updateData[field];
      }
    }

    // Get mentor to find userId
    const mentor = await prisma.mentor.findUnique({
      where: { id: params.mentorId },
      select: { userId: true, user: { select: { email: true } } },
    });

    if (!mentor) {
      return NextResponse.json({ error: 'Mentor not found' }, { status: 404 });
    }

    // Update user name and/or email if provided
    const userUpdate: any = {};
    if (updateData.userName) {
      userUpdate.name = updateData.userName;
    }
    if (updateData.userEmail && updateData.userEmail !== mentor.user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email: updateData.userEmail },
      });
      if (existingUser && existingUser.id !== mentor.userId) {
        return NextResponse.json(
          { error: 'Email address is already in use by another user' },
          { status: 400 }
        );
      }
      userUpdate.email = updateData.userEmail;
    }

    if (Object.keys(userUpdate).length > 0) {
      await prisma.user.update({
        where: { id: mentor.userId },
        data: userUpdate,
      });
    }

    if (photoUrl) {
      prismaUpdate.profilePhotoUrl = photoUrl;
    }

    const updated = await prisma.mentor.update({
      where: { id: params.mentorId },
      data: prismaUpdate,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'ADMIN_MENTOR_PROFILE_UPDATED',
        description: `HR Admin updated mentor profile for ${updated.user?.name || 'Unknown'}`,
        performedByEmail: admin.email,
        mentorId: params.mentorId,
      },
    });

    return NextResponse.json({ success: true, mentor: updated });
  } catch (error: any) {
    console.error('Error updating mentor:', error);
    const errorMessage = error?.message || error?.toString() || 'Failed to update mentor';
    return NextResponse.json(
      { error: `Failed to update mentor: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// DELETE deactivate mentor (set profileComplete to false)
export async function DELETE(
  request: Request,
  { params }: { params: { mentorId: string } }
) {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const mentor = await prisma.mentor.findUnique({
      where: { id: params.mentorId },
      include: { user: { select: { name: true } } },
    });

    if (!mentor) {
      return NextResponse.json({ error: 'Mentor not found' }, { status: 404 });
    }

    // Toggle active status
    await prisma.mentor.update({
      where: { id: params.mentorId },
      data: { profileComplete: !mentor.profileComplete },
    });

    const action = mentor.profileComplete ? 'DEACTIVATED' : 'REACTIVATED';
    await prisma.auditLog.create({
      data: {
        action: `ADMIN_MENTOR_${action}`,
        description: `HR Admin ${action.toLowerCase()} mentor: ${mentor.user?.name}`,
        performedByEmail: admin.email,
        mentorId: params.mentorId,
      },
    });

    return NextResponse.json({ success: true, active: !mentor.profileComplete });
  } catch (error) {
    console.error('Error toggling mentor:', error);
    return NextResponse.json({ error: 'Failed to update mentor' }, { status: 500 });
  }
}