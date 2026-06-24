// @ts-nocheck
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Simple secret check to prevent unauthorized access
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  
  if (secret !== process.env.NEXTAUTH_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Check if admin already exists
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'HR_ADMIN' }
    });

    if (existingAdmin) {
      return NextResponse.json({ 
        message: 'Database already seeded',
        adminEmail: existingAdmin.email 
      });
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 12);
    const admin = await prisma.user.create({
      data: {
        name: 'HR Administrator',
        email: 'admin@primeatlanticnigeria.com',
        password: hashedPassword,
        role: 'HR_ADMIN',
      },
    });

    return NextResponse.json({ 
      success: true,
      message: 'Database seeded successfully!',
      admin: {
        email: admin.email,
        name: admin.name,
        defaultPassword: 'admin123'
      },
      note: 'Please change the admin password after first login. DELETE this /api/setup route after setup is complete.'
    });
  } catch (error: any) {
    console.error('Setup error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
