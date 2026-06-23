'use client';

import { signIn } from 'next-auth/react';
import { FormEvent, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, Lock, ArrowRight, Shield, Users, Target, UserCog, GraduationCap, ArrowLeft } from 'lucide-react';

type PortalType = 'admin' | 'mentor' | 'mentee' | null;

const PORTALS: { key: PortalType; label: string; subtitle: string; icon: any; color: string; hoverColor: string; bgGradient: string; borderColor: string; redirect: string }[] = [
  {
    key: 'admin',
    label: 'Admin',
    subtitle: 'Manage mentors, mentees & assignments',
    icon: UserCog,
    color: 'text-amber-700',
    hoverColor: 'hover:border-amber-400 hover:bg-amber-50/50',
    bgGradient: 'from-amber-500 to-orange-500',
    borderColor: 'border-amber-200',
    redirect: '/admin/dashboard',
  },
  {
    key: 'mentor',
    label: 'Mentor',
    subtitle: 'Guide & develop emerging talent',
    icon: Shield,
    color: 'text-blue-700',
    hoverColor: 'hover:border-blue-400 hover:bg-blue-50/50',
    bgGradient: 'from-blue-500 to-indigo-600',
    borderColor: 'border-blue-200',
    redirect: '/mentor/dashboard',
  },
  {
    key: 'mentee',
    label: 'Mentee',
    subtitle: 'Connect with experienced leaders',
    icon: GraduationCap,
    color: 'text-emerald-700',
    hoverColor: 'hover:border-emerald-400 hover:bg-emerald-50/50',
    bgGradient: 'from-emerald-500 to-teal-600',
    borderColor: 'border-emerald-200',
    redirect: '/mentee/dashboard',
  },
];

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedPortal, setSelectedPortal] = useState<PortalType>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const loginRole = selectedPortal === 'admin' ? 'HR_ADMIN' : selectedPortal === 'mentor' ? 'MENTOR' : 'MENTEE';

      const result = await signIn('credentials', {
        email,
        password,
        loginAs: loginRole,
        redirect: false,
      });

      if (result?.error) {
        if (result.error.includes('NO_MENTEE_PROFILE')) {
          setError('You do not have a mentee profile. Please log in via the correct portal for your role.');
        } else if (result.error.includes('NO_MENTOR_PROFILE')) {
          setError('You do not have a mentor profile. Please log in via the correct portal for your role.');
        } else if (result.error.includes('NOT_ADMIN')) {
          setError('You do not have admin access. Please use the correct portal.');
        } else {
          setError('Invalid email or password');
        }
      } else if (result?.ok) {
        // Redirect to the portal-specific dashboard, or fallback to root (which auto-redirects by role)
        const portal = PORTALS.find(p => p.key === selectedPortal);
        router.push(searchParams?.get('callbackUrl') || portal?.redirect || '/');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const activePortal = PORTALS.find(p => p.key === selectedPortal);

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Brand Showcase */}
      <div className="hidden lg:flex lg:w-[55%] relative bg-[hsl(216,70%,11%)] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(211,100%,28%)] via-[hsl(216,70%,11%)] to-[hsl(216,70%,8%)]" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-[hsl(22,100%,58%)]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-[hsl(211,100%,28%)]/20 rounded-full blur-3xl" />
        
        <div className="absolute inset-0 opacity-5">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="diag" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M0 40L40 0" stroke="white" strokeWidth="0.5" fill="none" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#diag)" />
          </svg>
        </div>

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div>
            <div className="relative w-56 h-14">
              <Image
                src="/logo.png"
                alt="Prime Atlantic"
                fill
                className="object-contain brightness-0 invert"
                priority
              />
            </div>
          </div>

          <div className="space-y-8">
            <div>
              <div className="inline-block px-3 py-1 rounded-full bg-[hsl(22,100%,58%)]/20 text-[hsl(22,100%,70%)] text-xs font-semibold mb-4 border border-[hsl(22,100%,58%)]/30">
                MENTORING PROGRAMME
              </div>
              <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight">
                Building Leaders<br />
                <span className="text-[hsl(22,100%,65%)]">Through Mentorship</span>
              </h1>
              <p className="mt-4 text-white/60 text-lg max-w-md">
                Connecting experienced leaders with emerging talent across the Prime Atlantic Group.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                  <Target className="w-5 h-5 text-[hsl(22,100%,65%)]" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">Smart Matching</p>
                  <p className="text-white/50 text-xs">Mentor-mentee matching system</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-[hsl(22,100%,65%)]" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">Across Prime Atlantic Group</p>
                  <p className="text-white/50 text-xs">Mentoring across all business units</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-[hsl(22,100%,65%)]" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">Secure & Private</p>
                  <p className="text-white/50 text-xs">Confidential mentoring relationships</p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-white/30 text-xs">
            © {new Date().getFullYear()} Prime Atlantic Limited. All rights reserved.
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex flex-col">
        {/* Mobile logo */}
        <div className="lg:hidden bg-[hsl(216,70%,11%)] px-6 py-4">
          <div className="relative w-44 h-10">
            <Image
              src="/logo.png"
              alt="Prime Atlantic"
              fill
              className="object-contain brightness-0 invert"
              priority
            />
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 py-12 bg-gradient-to-b from-white to-[hsl(210,20%,97%)]">
          <div className="w-full max-w-sm">
            {!selectedPortal ? (
              /* ───── Portal Selection ───── */
              <>
                <div className="h-1 w-16 bg-[hsl(22,100%,58%)] rounded-full mb-8" />
                <h2 className="text-2xl font-bold text-[hsl(216,70%,11%)]">
                  Welcome Back
                </h2>
                <p className="text-muted-foreground mt-1 mb-8">
                  Choose your portal to sign in
                </p>

                <div className="space-y-3">
                  {PORTALS.map((portal) => {
                    const Icon = portal.icon;
                    return (
                      <button
                        key={portal.key}
                        onClick={() => setSelectedPortal(portal.key)}
                        className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 ${portal.borderColor} ${portal.hoverColor} bg-white transition-all duration-200 text-left group`}
                      >
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${portal.bgGradient} flex items-center justify-center shadow-lg flex-shrink-0`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className={`font-bold text-base ${portal.color}`}>{portal.label}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">{portal.subtitle}</p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0" />
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3 p-3 rounded-lg bg-blue-50 border border-blue-100">
                  <p className="text-xs text-blue-700">
                    <span className="font-semibold">Note:</span> If you are both a mentor and a mentee, you can log in through either portal. Your account works across roles.
                  </p>
                </div>

                <div className="mt-6 text-center text-sm text-muted-foreground">
                  Don&apos;t have an account?{' '}
                  <Link href="/signup" className="text-[hsl(22,100%,50%)] hover:text-[hsl(22,100%,40%)] font-semibold">
                    Sign up as Mentee
                  </Link>
                  {' · '}
                  <Link href="/signup/mentor" className="text-[hsl(211,100%,28%)] hover:text-[hsl(211,100%,22%)] font-semibold">
                    Sign up as Mentor
                  </Link>
                </div>
              </>
            ) : (
              /* ───── Login Form ───── */
              <>
                <button
                  onClick={() => { setSelectedPortal(null); setError(''); }}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-[hsl(216,70%,11%)] mb-6 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to portal selection
                </button>

                {activePortal && (
                  <div className="flex items-center gap-3 mb-6">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${activePortal.bgGradient} flex items-center justify-center shadow-md`}>
                      <activePortal.icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-[hsl(216,70%,11%)]">
                        {activePortal.label} Login
                      </h2>
                      <p className="text-xs text-muted-foreground">{activePortal.subtitle}</p>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  {error && (
                    <Alert variant="destructive" className="border-red-200 bg-red-50">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="space-y-1.5">
                    <label htmlFor="email" className="text-sm font-medium text-[hsl(216,70%,11%)]">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="pl-10 h-11 border-gray-200 focus:border-[hsl(211,100%,28%)] focus:ring-[hsl(211,100%,28%)]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="password" className="text-sm font-medium text-[hsl(216,70%,11%)]">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                      <PasswordInput
                        id="password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="pl-10 h-11 border-gray-200 focus:border-[hsl(211,100%,28%)] focus:ring-[hsl(211,100%,28%)] pr-10"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className={`w-full h-11 bg-gradient-to-r ${activePortal?.bgGradient || 'from-blue-600 to-blue-700'} hover:opacity-90 text-white font-semibold shadow-lg`}
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                        Signing in...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        Sign In as {activePortal?.label}
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    )}
                  </Button>
                </form>

                <div className="mt-6 text-center text-sm text-muted-foreground">
                  Don&apos;t have an account?{' '}
                  <Link href="/signup" className="text-[hsl(22,100%,50%)] hover:text-[hsl(22,100%,40%)] font-semibold">
                    Sign up
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
