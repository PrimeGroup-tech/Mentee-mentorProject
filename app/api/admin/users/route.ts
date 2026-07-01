// @ts-nocheck
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { isValidId, sanitizeString, sanitizeEmail } from '@/lib/security';
import { sendProfileChangeNotification } from '@/lib/email';
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { isSuperAdmin, requiresSuperAdmin, SUPER_ADMIN, STANDARD_ADMIN } from '@/lib/admin-permissions';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!admin || admin.role !== 'HR_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        adminLevel: true,
        isActive: true,
        hasDualRole: true,
        createdAt: true,
        mustChangePassword: true,
        failedLoginAttempts: true,
        lockedAt: true,
        mentee: { select: { id: true, profileComplete: true, businessUnit: true, role: true, gradeLevel: true } },
        mentor: { select: { id: true, profileComplete: true, businessUnit: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!admin || admin.role !== 'HR_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const rateLimitResp = applyRateLimit(request, 'admin-users', RATE_LIMITS.WRITE);
    if (rateLimitResp) return rateLimitResp;

    const body = await request.json();
    const { userId, action } = body;

    // ACTION: Restore ALL locked/deactivated accounts in one click (bulk).
    // Handled before the single-user userId validation since it targets many users.
    if (action === 'restore_all_locked') {
      const result = await prisma.user.updateMany({
        where: { OR: [{ isActive: false }, { NOT: { lockedAt: null } }] },
        data: { isActive: true, lockedAt: null, failedLoginAttempts: 0 },
      });
      await prisma.auditLog.create({
        data: { action: 'BULK_ACCOUNTS_RESTORED', description: `Admin restored access for ${result.count} locked/deactivated account(s)`, performedByEmail: admin.email },
      });
      return NextResponse.json({ success: true, message: `Restored access for ${result.count} account(s)`, count: result.count });
    }

    if (!userId || !isValidId(userId)) {
      return NextResponse.json({ error: 'Valid User ID is required' }, { status: 400 });
    }

    // Enforce admin privilege levels: only super admins may perform sensitive actions
    if (requiresSuperAdmin(action) && !isSuperAdmin(admin)) {
      return NextResponse.json({ error: 'This action requires Super Admin privileges.' }, { status: 403 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { mentee: true, mentor: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // ACTION: Change password
    if (action === 'change_password') {
      const { newPassword } = body;
      if (!newPassword || newPassword.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
      }
      const hashed = await bcrypt.hash(newPassword, 12);
      await prisma.user.update({ where: { id: userId }, data: { password: hashed, mustChangePassword: true } });
      await prisma.auditLog.create({
        data: { action: 'PASSWORD_CHANGED', description: `Admin changed password for ${targetUser.email}`, performedByEmail: admin.email },
      });
      sendProfileChangeNotification({ userEmail: targetUser.email, userName: targetUser.name || '', changes: 'Your password has been changed by an administrator.', adminEmail: admin.email }).catch(console.error);
      return NextResponse.json({ success: true, message: 'Password updated successfully' });
    }

    // ACTION: Unlock account (reset failed login attempts)
    if (action === 'unlock_account') {
      await prisma.user.update({ where: { id: userId }, data: { failedLoginAttempts: 0, lockedAt: null, isActive: true } });
      await prisma.auditLog.create({
        data: { action: 'ACCOUNT_UNLOCKED', description: `Admin unlocked account for ${targetUser.email}`, performedByEmail: admin.email },
      });
      sendProfileChangeNotification({ userEmail: targetUser.email, userName: targetUser.name || '', changes: 'Your account has been unlocked. You can now log in again.', adminEmail: admin.email }).catch(console.error);
      return NextResponse.json({ success: true, message: 'Account unlocked successfully' });
    }

    // ACTION: Update mentee job role and level
    if (action === 'update_mentee_profile') {
      const { role: menteeRole, gradeLevel } = body;
      if (!targetUser.mentee) {
        return NextResponse.json({ error: 'User does not have a mentee profile' }, { status: 400 });
      }
      const updateData: any = {};
      if (menteeRole !== undefined) updateData.role = sanitizeString(menteeRole);
      if (gradeLevel !== undefined) updateData.gradeLevel = gradeLevel ? parseInt(String(gradeLevel), 10) || null : null;
      if (Object.keys(updateData).length === 0) {
        return NextResponse.json({ error: 'No changes provided' }, { status: 400 });
      }
      await prisma.mentee.update({ where: { id: targetUser.mentee.id }, data: updateData });
      await prisma.auditLog.create({
        data: { action: 'MENTEE_PROFILE_UPDATED_BY_ADMIN', description: `Admin updated mentee profile for ${targetUser.email}: ${JSON.stringify(updateData)}`, performedByEmail: admin.email },
      });
      sendProfileChangeNotification({ userEmail: targetUser.email, userName: targetUser.name || '', changes: `Your mentee profile has been updated: ${Object.entries(updateData).map(([k,v]) => `${k}: ${v}`).join(', ')}.`, adminEmail: admin.email }).catch(console.error);
      return NextResponse.json({ success: true, message: 'Mentee profile updated' });
    }

    // ACTION: Toggle active status (revoke/restore login)
    if (action === 'toggle_active') {
      const newStatus = !targetUser.isActive;
      // Prevent deactivating yourself
      if (targetUser.id === admin.id) {
        return NextResponse.json({ error: 'Cannot deactivate your own account' }, { status: 400 });
      }
      await prisma.user.update({ where: { id: userId }, data: { isActive: newStatus } });
      await prisma.auditLog.create({
        data: {
          action: newStatus ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
          description: `Admin ${newStatus ? 'activated' : 'deactivated'} account for ${targetUser.email}`,
          performedByEmail: admin.email,
        },
      });
      sendProfileChangeNotification({ userEmail: targetUser.email, userName: targetUser.name || '', changes: newStatus ? 'Your account has been reactivated.' : 'Your account has been deactivated. You will no longer be able to log in.', adminEmail: admin.email }).catch(console.error);
      return NextResponse.json({ success: true, message: `User ${newStatus ? 'activated' : 'deactivated'} successfully` });
    }

    // ACTION: Delete user
    if (action === 'delete_user') {
      if (targetUser.id === admin.id) {
        return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
      }
      // Cascade deletes will handle related records
      await prisma.user.delete({ where: { id: userId } });
      await prisma.auditLog.create({
        data: { action: 'USER_DELETED', description: `Admin deleted user ${targetUser.email} (${targetUser.role})`, performedByEmail: admin.email },
      });
      return NextResponse.json({ success: true, message: 'User deleted successfully' });
    }

    // ACTION: Grant dual role (add mentee or mentor profile)
    if (action === 'grant_dual_role') {
      const { additionalRole } = body;
      if (!additionalRole || !['MENTOR', 'MENTEE'].includes(additionalRole)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }
      if (additionalRole === 'MENTOR' && targetUser.mentor) {
        return NextResponse.json({ error: 'User already has a Mentor profile' }, { status: 400 });
      }
      if (additionalRole === 'MENTEE' && targetUser.mentee) {
        return NextResponse.json({ error: 'User already has a Mentee profile' }, { status: 400 });
      }

      if (additionalRole === 'MENTOR') {
        await prisma.mentor.create({
          data: {
            userId, role: targetUser.mentee?.role || 'Staff', businessUnit: targetUser.mentee?.businessUnit || 'PASS',
            yearsOfExperience: 0, areasOfExpertise: [], leadershipStyle: 'COLLABORATIVE',
            personalInterests: [], shadowSkills: [], maxMentees: 5, profileComplete: false,
          },
        });
      } else {
        await prisma.mentee.create({
          data: {
            userId, role: targetUser.mentor?.role || 'Staff', businessUnit: targetUser.mentor?.businessUnit || 'PASS',
            yearsOfExperience: 0, tenure: 0, competencyGaps: [], careerGoals: '',
            personalInterests: [], preferredMeetingFormat: 'HYBRID', profileComplete: false,
          },
        });
      }
      await prisma.user.update({ where: { id: userId }, data: { hasDualRole: true } });
      await prisma.auditLog.create({
        data: { action: 'DUAL_ROLE_GRANTED', description: `Admin granted ${additionalRole} role to ${targetUser.email}`, performedByEmail: admin.email },
      });
      sendProfileChangeNotification({ userEmail: targetUser.email, userName: targetUser.name || '', changes: `You have been granted an additional ${additionalRole} profile. You can now log in as a ${additionalRole}.`, adminEmail: admin.email }).catch(console.error);
      return NextResponse.json({ success: true, message: `${additionalRole} profile added successfully` });
    }

    // ACTION: Convert role (replaces existing role)
    if (action === 'convert_role') {
      const { newRole } = body;
      if (!newRole || !['MENTOR', 'MENTEE'].includes(newRole)) {
        return NextResponse.json({ error: 'Invalid role. Must be MENTOR or MENTEE' }, { status: 400 });
      }
      if (targetUser.role === newRole) {
        return NextResponse.json({ error: `User is already a ${newRole}` }, { status: 400 });
      }
      if (targetUser.role === 'HR_ADMIN') {
        return NextResponse.json({ error: 'Cannot convert an HR Admin via role conversion. Demote first.' }, { status: 400 });
      }

      // Clean up old profile data
      if (targetUser.mentee) {
        await prisma.menteePreference.deleteMany({ where: { menteeId: targetUser.mentee.id } });
        await prisma.matchingScore.deleteMany({ where: { menteeId: targetUser.mentee.id } });
        await prisma.mentoringSession.deleteMany({ where: { menteeId: targetUser.mentee.id } });
        const assignment = await prisma.mentorMenteeAssignment.findUnique({ where: { menteeId: targetUser.mentee.id } });
        if (assignment) await prisma.mentorMenteeAssignment.delete({ where: { id: assignment.id } });
        await prisma.mentee.delete({ where: { id: targetUser.mentee.id } });
      }
      if (targetUser.mentor) {
        await prisma.menteePreference.deleteMany({ where: { mentorId: targetUser.mentor.id } });
        await prisma.matchingScore.deleteMany({ where: { mentorId: targetUser.mentor.id } });
        await prisma.mentoringSession.deleteMany({ where: { mentorId: targetUser.mentor.id } });
        await prisma.mentorMenteeAssignment.deleteMany({ where: { mentorId: targetUser.mentor.id } });
        await prisma.mentor.delete({ where: { id: targetUser.mentor.id } });
      }

      await prisma.user.update({ where: { id: userId }, data: { role: newRole, hasDualRole: false } });

      if (newRole === 'MENTOR') {
        await prisma.mentor.create({ data: { userId, role: 'New Mentor', businessUnit: 'PASS', yearsOfExperience: 0, areasOfExpertise: [], leadershipStyle: 'COLLABORATIVE', personalInterests: [], shadowSkills: [], maxMentees: 5, profileComplete: false } });
      } else {
        await prisma.mentee.create({ data: { userId, role: 'New Mentee', businessUnit: 'PASS', yearsOfExperience: 0, tenure: 0, competencyGaps: [], careerGoals: '', personalInterests: [], preferredMeetingFormat: 'HYBRID', profileComplete: false } });
      }

      await prisma.auditLog.create({
        data: { action: 'ROLE_CONVERTED', description: `Admin converted ${targetUser.email} from ${targetUser.role} to ${newRole}`, performedByEmail: admin.email },
      });
      sendProfileChangeNotification({ userEmail: targetUser.email, userName: targetUser.name || '', changes: `Your role has been changed from ${targetUser.role} to ${newRole}.`, adminEmail: admin.email }).catch(console.error);
      return NextResponse.json({ success: true, message: `User converted to ${newRole} successfully` });
    }

    // ACTION: Make admin
    if (action === 'make_admin') {
      if (targetUser.role === 'HR_ADMIN') {
        return NextResponse.json({ error: 'User is already an Admin' }, { status: 400 });
      }
      await prisma.user.update({ where: { id: userId }, data: { role: 'HR_ADMIN', adminLevel: STANDARD_ADMIN } });
      await prisma.auditLog.create({
        data: { action: 'PROMOTED_TO_ADMIN', description: `Admin promoted ${targetUser.email} to HR_ADMIN (Standard Admin)`, performedByEmail: admin.email },
      });
      sendProfileChangeNotification({ userEmail: targetUser.email, userName: targetUser.name || '', changes: 'You have been promoted to Admin role.', adminEmail: admin.email }).catch(console.error);
      return NextResponse.json({ success: true, message: 'User promoted to Admin' });
    }

    // ACTION: Demote from admin
    if (action === 'demote_admin') {
      if (targetUser.role !== 'HR_ADMIN') {
        return NextResponse.json({ error: 'User is not an Admin' }, { status: 400 });
      }
      if (targetUser.id === admin.id) {
        return NextResponse.json({ error: 'Cannot demote yourself' }, { status: 400 });
      }
      const { demoteTo } = body;
      const newRole = demoteTo || 'MENTEE';
      if (!['MENTOR', 'MENTEE'].includes(newRole)) {
        return NextResponse.json({ error: 'Invalid demotion role' }, { status: 400 });
      }
      await prisma.user.update({ where: { id: userId }, data: { role: newRole } });
      // Create profile stub if doesn't exist
      if (newRole === 'MENTOR' && !targetUser.mentor) {
        await prisma.mentor.create({ data: { userId, role: 'Staff', businessUnit: 'PASS', yearsOfExperience: 0, areasOfExpertise: [], leadershipStyle: 'COLLABORATIVE', personalInterests: [], shadowSkills: [], maxMentees: 5, profileComplete: false } });
      } else if (newRole === 'MENTEE' && !targetUser.mentee) {
        await prisma.mentee.create({ data: { userId, role: 'Staff', businessUnit: 'PASS', yearsOfExperience: 0, tenure: 0, competencyGaps: [], careerGoals: '', personalInterests: [], preferredMeetingFormat: 'HYBRID', profileComplete: false } });
      }
      await prisma.auditLog.create({
        data: { action: 'DEMOTED_FROM_ADMIN', description: `Admin demoted ${targetUser.email} from HR_ADMIN to ${newRole}`, performedByEmail: admin.email },
      });
      return NextResponse.json({ success: true, message: `User demoted to ${newRole}` });
    }

    // ACTION: Set admin privilege level (super admin only)
    if (action === 'set_admin_level') {
      const { adminLevel } = body;
      if (![SUPER_ADMIN, STANDARD_ADMIN].includes(adminLevel)) {
        return NextResponse.json({ error: 'Invalid privilege level' }, { status: 400 });
      }
      if (targetUser.role !== 'HR_ADMIN') {
        return NextResponse.json({ error: 'User is not an Admin' }, { status: 400 });
      }
      // Prevent a super admin from demoting their own privilege (avoid lockout)
      if (targetUser.id === admin.id && adminLevel !== SUPER_ADMIN) {
        return NextResponse.json({ error: 'You cannot lower your own privilege level' }, { status: 400 });
      }
      await prisma.user.update({ where: { id: userId }, data: { adminLevel } });
      await prisma.auditLog.create({
        data: { action: 'ADMIN_LEVEL_CHANGED', description: `Admin set privilege level of ${targetUser.email} to ${adminLevel}`, performedByEmail: admin.email },
      });
      sendProfileChangeNotification({ userEmail: targetUser.email, userName: targetUser.name || '', changes: `Your admin privilege level has been set to ${adminLevel === SUPER_ADMIN ? 'Super Admin' : 'Standard Admin'}.`, adminEmail: admin.email }).catch(console.error);
      return NextResponse.json({ success: true, message: `Privilege level updated to ${adminLevel === SUPER_ADMIN ? 'Super Admin' : 'Standard Admin'}` });
    }

    // ACTION: Update user profile (name, email, basic info)
    if (action === 'update_profile') {
      const { name, email: newEmail } = body;
      const updateData: any = {};
      if (name) updateData.name = sanitizeString(name);
      if (newEmail && newEmail !== targetUser.email) {
        const existing = await prisma.user.findUnique({ where: { email: sanitizeEmail(newEmail) } });
        if (existing) return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
        updateData.email = sanitizeEmail(newEmail);
      }
      if (Object.keys(updateData).length === 0) {
        return NextResponse.json({ error: 'No changes provided' }, { status: 400 });
      }
      await prisma.user.update({ where: { id: userId }, data: updateData });
      await prisma.auditLog.create({
        data: { action: 'PROFILE_UPDATED_BY_ADMIN', description: `Admin updated profile for ${targetUser.email}: ${JSON.stringify(updateData)}`, performedByEmail: admin.email },
      });
      sendProfileChangeNotification({ userEmail: targetUser.email, userName: targetUser.name || '', changes: `Your profile has been updated: ${Object.entries(updateData).map(([k,v]) => `${k} changed`).join(', ')}.`, adminEmail: admin.email }).catch(console.error);
      return NextResponse.json({ success: true, message: 'Profile updated successfully' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error managing user:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Operation failed: ${message}` }, { status: 500 });
  }
}
