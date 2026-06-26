// @ts-nocheck
'use client';

import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

const ALLOWED_PATHS = ['/change-password', '/api/', '/login', '/signup'];

export function ForcePasswordChange() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status !== 'authenticated') return;
    if (!session?.user) return;

    const mustChange = (session.user as any).mustChangePassword;
    if (!mustChange) return;

    // Don't redirect if already on change-password page or API/auth routes
    const isAllowed = ALLOWED_PATHS.some(p => pathname?.startsWith(p));
    if (isAllowed) return;

    router.replace('/change-password');
  }, [session, status, pathname, router]);

  return null;
}
