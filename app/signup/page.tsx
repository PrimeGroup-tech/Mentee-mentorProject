'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { signIn } from 'next-auth/react';
import { Mail, Lock, UserPlus, ArrowRight, User, Shield } from 'lucide-react';
import { isAllowedDomain, ALLOWED_DOMAINS } from '@/lib/allowed-domains';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!isAllowedDomain(email)) {
      setError('Please use your company email address. Only Prime Atlantic Group email domains are allowed.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, role: 'MENTEE' }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to create account');
        return;
      }

      // If a new role was added to an existing account, redirect to login
      if (data.roleAdded) {
        setSuccess(data.message || 'Mentee profile added! Please log in via the Mentee portal.');
        setTimeout(() => router.push('/login'), 3000);
        return;
      }

      const result = await signIn('credentials', {
        email,
        password,
        loginAs: 'MENTEE',
        redirect: false,
      });

      if (result?.ok) {
        router.push('/mentee/dashboard');
      } else {
        setError('Account created but login failed. Please try signing in.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
                JOIN THE PROGRAMME
              </div>
              <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight">
                Start Your<br />
                <span className="text-[hsl(22,100%,65%)]">Mentoring Journey</span>
              </h1>
              <p className="mt-4 text-white/60 text-lg max-w-md">
                Register as a mentee to get matched with experienced leaders who will guide your professional development.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-white">50+</div>
                <div className="text-white/50 text-xs mt-1">Expert Mentors</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-[hsl(22,100%,65%)]">8</div>
                <div className="text-white/50 text-xs mt-1">Business Units</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white">3</div>
                <div className="text-white/50 text-xs mt-1">Mentor Tiers</div>
              </div>
            </div>
          </div>

          <div className="text-white/60 text-xs">
            © {new Date().getFullYear()} Prime Atlantic Limited. All rights reserved.
          </div>
        </div>
      </div>

      {/* Right Panel - Signup Form */}
      <div className="flex-1 flex flex-col">
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
            <div className="h-1 w-16 bg-[hsl(22,100%,58%)] rounded-full mb-8" />
            
            <h2 className="text-2xl font-bold text-[hsl(216,70%,11%)]">
              Create Account
            </h2>
            <p className="text-muted-foreground mt-1 mb-6">
              Join the mentoring programme
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {success && (
                <Alert className="border-green-200 bg-green-50">
                  <AlertDescription className="text-green-800">{success}</AlertDescription>
                </Alert>
              )}

              {error && (
                <Alert variant="destructive" className="border-red-200 bg-red-50">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-1.5">
                <label htmlFor="name" className="text-sm font-medium text-[hsl(216,70%,11%)]">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="pl-10 h-11 border-gray-200"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-medium text-[hsl(216,70%,11%)]">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@primeatlanticnigeria.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10 h-11 border-gray-200"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Use your company email ({ALLOWED_DOMAINS.slice(0, 3).map(d => `@${d}`).join(', ')}...)</p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-medium text-[hsl(216,70%,11%)]">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                  <PasswordInput
                    id="password"
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-10 h-11 border-gray-200 pr-10"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-[hsl(216,70%,11%)]">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                  <PasswordInput
                    id="confirmPassword"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="pl-10 h-11 border-gray-200 pr-10"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-[hsl(22,100%,58%)] hover:bg-[hsl(22,100%,48%)] text-white font-semibold shadow-lg shadow-[hsl(22,100%,58%)]/25"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Creating account...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Create Account
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </form>

            <div className="mt-6 space-y-3 text-center text-sm">
              <div className="text-muted-foreground">
                Want to register as a mentor?{' '}
                <Link href="/signup/mentor" className="text-[hsl(22,100%,58%)] hover:text-[hsl(22,100%,48%)] font-semibold inline-flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5" />
                  Mentor Signup
                </Link>
              </div>
              <div className="text-muted-foreground">
                Already have an account?{' '}
                <Link href="/login" className="text-[hsl(211,100%,28%)] hover:text-[hsl(211,100%,22%)] font-semibold">
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
