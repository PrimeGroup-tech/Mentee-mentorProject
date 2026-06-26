'use client';

import { SessionProvider } from 'next-auth/react';
import type { Session } from 'next-auth';
import { IdleTimeout } from '@/components/idle-timeout';
import { ForcePasswordChange } from '@/components/force-password-change';

export function Providers({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session | null;
}) {
  return (
    <SessionProvider session={session}>
      <IdleTimeout />
      <ForcePasswordChange />
      {children}
    </SessionProvider>
  );
}
