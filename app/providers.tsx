'use client';

import { SessionProvider } from 'next-auth/react';
import type { Session } from 'next-auth';
import { IdleTimeout } from '@/components/idle-timeout';

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
      {children}
    </SessionProvider>
  );
}
