import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { createS3Client, getBucketConfig } from '@/lib/aws-config';
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const s3Client = createS3Client();
const { bucketName, folderPrefix } = getBucketConfig();

export async function POST(request: Request) {
  try {
    // Rate limit photo uploads
    const rateLimitResp = applyRateLimit(request, 'photo-upload', RATE_LIMITS.UPLOAD);
    if (rateLimitResp) return rateLimitResp;

    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    // Check session role for portal-based auth (supports dual-role users)
    if (!user || session.user.role !== 'MENTOR') {
      return NextResponse.json(
        { error: 'Only mentors can upload profile photos' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('photo') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const fileExtension = file.name.split('.').pop();
    const fileName = `${folderPrefix}public/mentors/${user.id}/${uuidv4()}.${fileExtension}`;

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to S3
    await s3Client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: fileName,
      Body: buffer,
      ContentType: file.type,
    }));

    // Generate public URL
    const photoUrl = `https://${bucketName}.s3.${process.env.AWS_REGION || 'us-west-2'}.amazonaws.com/${fileName}`;

    // Update mentor profile with photo URL
    const mentor = await prisma.mentor.findUnique({
      where: { userId: user.id },
    });

    if (!mentor) {
      return NextResponse.json(
        { error: 'Mentor profile not found' },
        { status: 404 }
      );
    }

    await prisma.mentor.update({
      where: { userId: user.id },
      data: { profilePhotoUrl: photoUrl },
    });

    // Log the update
    await prisma.auditLog.create({
      data: {
        action: 'PROFILE_PHOTO_UPDATED',
        description: 'Mentor uploaded a new profile photo',
        performedByEmail: user.email,
        mentorId: mentor.id,
      },
    });

    return NextResponse.json({
      success: true,
      photoUrl,
    });
  } catch (error: any) {
    console.error('Error uploading photo:', error);
    return NextResponse.json(
      { error: `Failed to upload photo: ${error?.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}