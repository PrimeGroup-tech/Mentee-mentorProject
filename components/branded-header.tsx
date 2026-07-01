'use client';

import Image from 'next/image';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LogOut, LayoutDashboard, Users, User, Settings, CalendarDays, UserCog, Upload, BarChart3, KeyRound, ScrollText } from 'lucide-react';

interface BrandedHeaderProps {
  title?: string;
  subtitle?: string;
  showNav?: boolean;
}

export function BrandedHeader({ title, subtitle, showNav = true }: BrandedHeaderProps) {
  const { data: session } = useSession() || {};
  const router = useRouter();
  const userRole = (session?.user as any)?.role;

  return (
    <header className="bg-[hsl(216,70%,11%)] text-white shadow-lg">
      {/* Top accent bar */}
      <div className="h-1 bg-gradient-to-r from-[hsl(22,100%,58%)] via-[hsl(211,100%,28%)] to-[hsl(22,100%,58%)]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo + Title */}
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => router.push('/')}>
            <div className="relative w-40 h-10 flex-shrink-0">
              <Image
                src="/logo.png"
                alt="Prime Atlantic"
                fill
                className="object-contain brightness-0 invert"
                priority
              />
            </div>
            {title && (
              <div className="hidden sm:block border-l border-white/20 pl-4">
                <h1 className="text-sm font-semibold leading-tight">{title}</h1>
                {subtitle && <p className="text-xs text-white/60">{subtitle}</p>}
              </div>
            )}
          </div>

          {/* Navigation */}
          {showNav && session && (
            <nav className="flex items-center gap-2">
              {userRole === 'HR_ADMIN' && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white/80 hover:text-white hover:bg-white/10"
                    onClick={() => router.push('/admin/dashboard')}
                  >
                    <LayoutDashboard className="w-4 h-4 mr-1.5" />
                    <span className="hidden sm:inline">Dashboard</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white/80 hover:text-white hover:bg-white/10"
                    onClick={() => router.push('/admin/mentors')}
                  >
                    <Users className="w-4 h-4 mr-1.5" />
                    <span className="hidden sm:inline">Mentors</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white/80 hover:text-white hover:bg-white/10"
                    onClick={() => router.push('/admin/users')}
                  >
                    <UserCog className="w-4 h-4 mr-1.5" />
                    <span className="hidden sm:inline">Users</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white/80 hover:text-white hover:bg-white/10"
                    onClick={() => router.push('/admin/calibration')}
                  >
                    <BarChart3 className="w-4 h-4 mr-1.5" />
                    <span className="hidden sm:inline">Calibration</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white/80 hover:text-white hover:bg-white/10"
                    onClick={() => router.push('/admin/sessions')}
                  >
                    <CalendarDays className="w-4 h-4 mr-1.5" />
                    <span className="hidden sm:inline">Sessions</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white/80 hover:text-white hover:bg-white/10"
                    onClick={() => router.push('/admin/bulk-upload')}
                  >
                    <Upload className="w-4 h-4 mr-1.5" />
                    <span className="hidden sm:inline">Bulk Upload</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white/80 hover:text-white hover:bg-white/10"
                    onClick={() => router.push('/admin/logs')}
                  >
                    <ScrollText className="w-4 h-4 mr-1.5" />
                    <span className="hidden sm:inline">Logs</span>
                  </Button>
                </>
              )}
              {userRole === 'MENTOR' && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white/80 hover:text-white hover:bg-white/10"
                    onClick={() => router.push('/mentor/dashboard')}
                  >
                    <LayoutDashboard className="w-4 h-4 mr-1.5" />
                    <span className="hidden sm:inline">Dashboard</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white/80 hover:text-white hover:bg-white/10"
                    onClick={() => router.push('/mentor/sessions')}
                  >
                    <CalendarDays className="w-4 h-4 mr-1.5" />
                    <span className="hidden sm:inline">Sessions</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white/80 hover:text-white hover:bg-white/10"
                    onClick={() => router.push('/mentor/profile')}
                  >
                    <User className="w-4 h-4 mr-1.5" />
                    <span className="hidden sm:inline">Profile</span>
                  </Button>
                </>
              )}
              {userRole === 'MENTEE' && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white/80 hover:text-white hover:bg-white/10"
                    onClick={() => router.push('/mentee/dashboard')}
                  >
                    <LayoutDashboard className="w-4 h-4 mr-1.5" />
                    <span className="hidden sm:inline">Dashboard</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white/80 hover:text-white hover:bg-white/10"
                    onClick={() => router.push('/mentee/sessions')}
                  >
                    <CalendarDays className="w-4 h-4 mr-1.5" />
                    <span className="hidden sm:inline">Sessions</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white/80 hover:text-white hover:bg-white/10"
                    onClick={() => router.push('/mentee/profile')}
                  >
                    <User className="w-4 h-4 mr-1.5" />
                    <span className="hidden sm:inline">Profile</span>
                  </Button>
                </>
              )}

              <div className="w-px h-6 bg-white/20 mx-1" />

              <Button
                variant="ghost"
                size="sm"
                className="text-white/80 hover:text-white hover:bg-white/10"
                onClick={() => router.push('/change-password')}
              >
                <KeyRound className="w-4 h-4 mr-1.5" />
                <span className="hidden sm:inline">Change Password</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="text-white/70 hover:text-red-300 hover:bg-white/10"
                onClick={() => signOut({ callbackUrl: '/login' })}
              >
                <LogOut className="w-4 h-4 mr-1.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </nav>
          )}
        </div>
      </div>
    </header>
  );
}
