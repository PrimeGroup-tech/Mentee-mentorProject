import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env file
config({ path: resolve(__dirname, '../.env') });

import { prisma } from '../lib/prisma';

/**
 * Script to promote a user to HR_ADMIN role
 * Usage: npx tsx scripts/make-admin.ts user@email.com
 */

async function makeUserAdmin() {
  const email = process.argv[2];

  if (!email) {
    console.error('❌ Please provide an email address');
    console.log('Usage: npx ts-node scripts/make-admin.ts user@email.com');
    process.exit(1);
  }

  try {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.error(`❌ User not found: ${email}`);
      process.exit(1);
    }

    if (user.role === 'HR_ADMIN') {
      console.log(`✓ User ${email} is already an HR Admin`);
      process.exit(0);
    }

    // Update user role to HR_ADMIN
    const updatedUser = await prisma.user.update({
      where: { email },
      data: { role: 'HR_ADMIN' },
    });

    console.log(`✅ Successfully promoted ${email} to HR_ADMIN`);
    console.log(`   Previous role: ${user.role}`);
    console.log(`   New role: ${updatedUser.role}`);
    console.log(`\nThey can now log in and access the admin dashboard at /admin/dashboard`);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

makeUserAdmin();
