import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { uploadFile } from '@/lib/blob-storage';

export const dynamic = 'force-dynamic';

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

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
    
    // Support both single and bulk modes
    // Single mode: email + photo fields
    // Bulk mode: multiple photo_N + email_N pairs, or photos named as email
    const entries = formData.getAll('photo');
    const emailField = formData.get('email') as string | null;
    
    // Single photo mode (backward compatible)
    if (entries.length <= 1 && emailField) {
      const photo = formData.get('photo') as File;
      if (!photo) {
        return NextResponse.json({ error: 'No photo provided' }, { status: 400 });
      }
      const result = await processPhoto(photo, emailField.toLowerCase().trim());
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: result.status || 400 });
      }
      return NextResponse.json({ success: true, email: emailField, photoUrl: result.photoUrl });
    }

    // Bulk mode: photos[] and emails[] arrays
    const photos = formData.getAll('photos') as File[];
    const emails = formData.getAll('emails') as string[];
    
    if (photos.length === 0) {
      return NextResponse.json({ error: 'No photos provided' }, { status: 400 });
    }
    
    if (photos.length !== emails.length) {
      return NextResponse.json({ error: 'Mismatch between number of photos and emails' }, { status: 400 });
    }

    const results: { email: string; success: boolean; error?: string; photoUrl?: string }[] = [];

    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      const email = emails[i].toLowerCase().trim();
      
      try {
        const result = await processPhoto(photo, email);
        if (result.error) {
          results.push({ email, success: false, error: result.error });
        } else {
          results.push({ email, success: true, photoUrl: result.photoUrl });
        }
      } catch (err: any) {
        results.push({ email, success: false, error: err.message || 'Unknown error' });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      summary: { total: results.length, uploaded: successCount, failed: failCount },
      results,
    });
  } catch (error) {
    console.error('Bulk photo upload error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Upload failed: ${msg}` }, { status: 500 });
  }
}

async function processPhoto(photo: File, email: string): Promise<{ photoUrl?: string; error?: string; status?: number }> {
  if (!ALLOWED_TYPES.includes(photo.type)) {
    return { error: `Invalid file type for ${email}. Only JPEG, PNG, and WebP allowed.`, status: 400 };
  }

  // No size limit here — client resizes before upload
  // But still cap at 10MB as safety net
  if (photo.size > 10 * 1024 * 1024) {
    return { error: `File too large for ${email}. Maximum 10MB after resize.`, status: 400 };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { mentor: true },
  });

  if (!user || !user.mentor) {
    return { error: `No mentor found with email: ${email}`, status: 404 };
  }

  const ext = photo.name.split('.').pop() || 'jpg';
  const pathname = `mentors/${user.mentor.id}.${ext}`;
  const arrayBuffer = await photo.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const photoUrl = await uploadFile(pathname, buffer, photo.type);

  await prisma.mentor.update({
    where: { id: user.mentor.id },
    data: { profilePhotoUrl: photoUrl },
  });

  return { photoUrl };
}
