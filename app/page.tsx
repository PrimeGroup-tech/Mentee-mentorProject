'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/login');
    } else if ((session.user as any)?.role === 'HR_ADMIN') {
      router.push('/admin/dashboard');
    } else if ((session.user as any)?.role === 'MENTOR') {
      router.push('/mentor/dashboard');
    } else {
      router.push('/mentee/dashboard');
    }
  }, [session, status, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">Mentoring Matching System</h1>
        <p className="text-muted-foreground">Redirecting...</p>
      </div>
    </div>
  );
}
