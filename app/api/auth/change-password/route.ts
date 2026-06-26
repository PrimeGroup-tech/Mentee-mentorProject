import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { changePasswordSchema, AUTH_ERRORS } from '@/lib/auth-schemas';
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const BCRYPT_ROUNDS = 12;

export async function POST(request: Request) {
  try {
    // Rate limit password changes
    const rateLimitResp = applyRateLimit(request, 'change-password', RATE_LIMITS.AUTH);
    if (rateLimitResp) return rateLimitResp;

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: AUTH_ERRORS.UNAUTHORIZED }, { status: 401 });
    }

    const body = await request.json();

    // Zod validation
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      // Log validation failures server-side
      console.error('[change-password] Validation failure:', parsed.error.issues.map(i => i.path.join('.')));
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || AUTH_ERRORS.VALIDATION_FAILED },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user || !user.password) {
      return NextResponse.json({ error: AUTH_ERRORS.INVALID_CREDENTIALS }, { status: 400 });
    }

    // Constant-time comparison via bcrypt.compare
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return NextResponse.json({ error: AUTH_ERRORS.INVALID_CREDENTIALS }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword, mustChangePassword: false },
    });

    await prisma.auditLog.create({
      data: {
        action: 'PASSWORD_CHANGED',
        description: `User changed their password`,
        performedByEmail: user.email,
      },
    });

    return NextResponse.json({ success: true, message: 'Password changed successfully' });
  } catch (error: any) {
    console.error('[change-password] Error');
    return NextResponse.json({ error: 'Failed to change password' }, { status: 500 });
  }
}
