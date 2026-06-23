import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { uploadFile } from '@/lib/blob-storage';

export const dynamic = 'force-dynamic';

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!admin || admin.role !== 'HR_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const mentorEmail = formData.get('email') as string;
    const photo = formData.get('photo') as File;

    if (!mentorEmail || !photo) {
      return NextResponse.json({ error: 'Email and photo are required' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(photo.type)) {
      return NextResponse.json({ error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' }, { status: 400 });
    }

    if (photo.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum size is 5MB.' }, { status: 400 });
    }

    // Find the mentor by email
    const user = await prisma.user.findUnique({
      where: { email: mentorEmail.toLowerCase() },
      include: { mentor: true },
    });

    if (!user || !user.mentor) {
      return NextResponse.json({ error: `No mentor found with email: ${mentorEmail}` }, { status: 404 });
    }

    // Upload to Vercel Blob
    const ext = photo.name.split('.').pop() || 'jpg';
    const pathname = `mentors/${user.mentor.id}.${ext}`;

    const arrayBuffer = await photo.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const photoUrl = await uploadFile(pathname, buffer, photo.type);

    // Update mentor profile
    await prisma.mentor.update({
      where: { id: user.mentor.id },
      data: { profilePhotoUrl: photoUrl },
    });

    return NextResponse.json({
      success: true,
      email: mentorEmail,
      photoUrl,
    });
  } catch (error) {
    console.error('Photo upload error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Photo upload failed: ${msg}` }, { status: 500 });
  }
}
