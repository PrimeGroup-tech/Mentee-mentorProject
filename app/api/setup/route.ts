// @ts-nocheck
import { NextResponse } from 'next/server';
import { execSync } from 'child_process';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');

  if (secret !== process.env.NEXTAUTH_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: string[] = [];

  try {
    // Step 1: Run prisma db push to create tables
    results.push('Running prisma db push...');
    const dbPushOutput = execSync('npx prisma db push --skip-generate', {
      env: { ...process.env },
      timeout: 30000,
    }).toString();
    results.push('DB push output: ' + dbPushOutput.substring(0, 500));

    // Step 2: Create admin user
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const bcrypt = require('bcryptjs');

    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'HR_ADMIN' }
    });

    if (existingAdmin) {
      await prisma.$disconnect();
      return NextResponse.json({
        success: true,
        message: 'Database tables created. Admin already exists.',
        adminEmail: existingAdmin.email,
        steps: results,
      });
    }

    const hashedPassword = await bcrypt.hash('admin123', 12);
    const admin = await prisma.user.create({
      data: {
        name: 'HR Administrator',
        email: 'admin@primeatlanticnigeria.com',
        password: hashedPassword,
        role: 'HR_ADMIN',
      },
    });

    await prisma.$disconnect();

    return NextResponse.json({
      success: true,
      message: 'Database initialized and admin created!',
      admin: {
        email: admin.email,
        name: admin.name,
        defaultPassword: 'admin123',
      },
      steps: results,
      note: 'Change the admin password after first login. Remove /api/setup route when done.',
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      steps: results,
      stack: error.stack?.substring(0, 500),
    }, { status: 500 });
  }
}
