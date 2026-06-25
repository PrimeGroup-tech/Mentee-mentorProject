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
import { Mail, Lock, UserPlus, ArrowRight, User, Shield, Building2 } from 'lucide-react';
import { ALLOWED_DOMAINS, isAllowedDomain } from '@/lib/allowed-domains';

export default function MentorSignupPage() {
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
        body: JSON.stringify({ email, password, name, role: 'MENTOR' }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to create account');
        return;
      }

      // If a new role was added to an existing account, redirect to login
      if (data.roleAdded) {
        setSuccess(data.message || 'Mentor profile added! Please log in via the Mentor portal.');
        setTimeout(() => router.push('/login'), 3000);
        return;
      }

      const result = await signIn('credentials', {
        email,
        password,
        loginAs: 'MENTOR',
        redirect: false,
      });

      if (result?.ok) {
        router.push('/mentor/dashboard');
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
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
        {/* Vibrant gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0C4DA2] via-[#00458E] to-[#08172E]" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#FF6F2B]/15 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#0C4DA2]/30 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/3 w-72 h-72 bg-[#FF6F2B]/10 rounded-full blur-[80px]" />
        
        {/* Decorative pattern */}
        <div className="absolute inset-0 opacity-[0.03]">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="hexagons" width="56" height="100" patternUnits="userSpaceOnUse">
                <path d="M28 66L0 50L0 16L28 0L56 16L56 50L28 66L28 100" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hexagons)" />
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
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FF6F2B]/20 text-[#FF6F2B] text-xs font-bold mb-4 border border-[#FF6F2B]/30">
                <Shield className="w-3.5 h-3.5" />
                MENTOR REGISTRATION
              </div>
              <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight">
                Shape the<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF6F2B] to-[#FFB088]">Next Generation</span>
              </h1>
              <p className="mt-4 text-white/60 text-lg max-w-md">
                Register as a mentor to guide and develop emerging talent across Prime Atlantic Group of Companies.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-6">
              <div className="text-center p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="text-3xl font-bold text-white">50+</div>
                <div className="text-white/50 text-xs mt-1">Active Mentors</div>
              </div>
              <div className="text-center p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="text-3xl font-bold text-[#FF6F2B]">8</div>
                <div className="text-white/50 text-xs mt-1">Business Units</div>
              </div>
              <div className="text-center p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="text-3xl font-bold text-white">100+</div>
                <div className="text-white/50 text-xs mt-1">Mentees Matched</div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-[#FF6F2B]" />
                <div>
                  <p className="text-white/80 text-sm font-medium">Company Email Required</p>
                  <p className="text-white/70 text-xs mt-0.5">Only Prime Atlantic Group email addresses are accepted</p>
                </div>
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
        <div className="lg:hidden bg-[#08172E] px-6 py-4">
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
            <div className="h-1 w-16 bg-gradient-to-r from-[#FF6F2B] to-[#0C4DA2] rounded-full mb-8" />
            
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-5 h-5 text-[#0C4DA2]" />
              <h2 className="text-2xl font-bold text-[#08172E]">
                Mentor Registration
              </h2>
            </div>
            <p className="text-muted-foreground mt-1 mb-6">
              Create your mentor account to start guiding mentees
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
                <label htmlFor="name" className="text-sm font-medium text-[#08172E]">
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
                <label htmlFor="email" className="text-sm font-medium text-[#08172E]">
                  Company Email Address
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
                <div className="text-xs text-muted-foreground mt-1">
                  <span className="font-medium">Allowed domains:</span>{' '}
                  {ALLOWED_DOMAINS.map((d, i) => (
                    <span key={d}>
                      <span className="text-[#0C4DA2]">@{d}</span>
                      {i < ALLOWED_DOMAINS.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-medium text-[#08172E]">
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
                <label htmlFor="confirmPassword" className="text-sm font-medium text-[#08172E]">
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
                className="w-full h-11 bg-gradient-to-r from-[#0C4DA2] to-[#00458E] hover:from-[#00458E] hover:to-[#08172E] text-white font-semibold shadow-lg shadow-[#0C4DA2]/25"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Creating account...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Register as Mentor
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </form>

            <div className="mt-6 space-y-3 text-center text-sm">
              <div className="text-muted-foreground">
                Want to register as a mentee?{' '}
                <Link href="/signup" className="text-[#FF6F2B] hover:text-[#e55a1a] font-semibold">
                  Mentee Signup
                </Link>
              </div>
              <div className="text-muted-foreground">
                Already have an account?{' '}
                <Link href="/login" className="text-[#0C4DA2] hover:text-[#00458E] font-semibold">
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
