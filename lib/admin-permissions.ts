// Admin privilege levels for HR admins.
// SUPER_ADMIN: full control, including managing other admins and destructive actions.
// STANDARD_ADMIN: day-to-day operations (restore access, reset passwords, edit profiles,
//                 manage roles) but NOT admin management or user deletion.

export const SUPER_ADMIN = 'SUPER_ADMIN';
export const STANDARD_ADMIN = 'STANDARD_ADMIN';

// Actions that only a SUPER_ADMIN may perform.
export const SUPER_ADMIN_ONLY_ACTIONS = [
  'delete_user',
  'make_admin',
  'demote_admin',
  'set_admin_level',
];

export function isSuperAdmin(user?: { role?: string; adminLevel?: string } | null): boolean {
  return !!user && user.role === 'HR_ADMIN' && user.adminLevel === SUPER_ADMIN;
}

export function requiresSuperAdmin(action: string): boolean {
  return SUPER_ADMIN_ONLY_ACTIONS.includes(action);
}