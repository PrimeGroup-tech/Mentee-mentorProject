import type { Metadata } from 'next';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mentoring Matching System',
  description: 'Advanced mentoring matching for leadership development',
  icons: { icon: '/favicon.svg' },
};

export const dynamic = 'force-dynamic';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let session = null;
  try {
    const { getServerSession } = await import('next-auth');
    const { authOptions } = await import('@/lib/auth-options');
    session = await getServerSession(authOptions);
  } catch (error) {
    console.error('Session fetch error (DB may not be initialized):', error);
  }

  return (
    <html lang="en">
      <head />
      <body className="bg-background text-foreground">
        <Providers session={session}>{children}</Providers>
      </body>
    </html>
  );
}
