'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, AlertCircle, User, Clock, ArrowRight, UserCheck, RefreshCw, Users, FileEdit } from 'lucide-react';
import { BrandedHeader } from '@/components/branded-header';
import { StatCard } from '@/components/stat-card';
import { Badge } from '@/components/ui/badge';

export default function MenteeDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if ((session?.user as any)?.role && (session?.user as any)?.role !== 'MENTEE') {
      router.push('/');
      return;
    }

    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/mentees/profile');
        if (res.ok) setProfile(await res.json());
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (session) fetchProfile();
  }, [session, router]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <BrandedHeader title="Mentee Portal" subtitle="Your mentoring dashboard" />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="flex items-center gap-3 text-muted-foreground">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            Loading...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(210,20%,97%)]">
      <BrandedHeader title="Mentee Portal" subtitle="Your mentoring dashboard" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Welcome Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-[hsl(211,100%,28%)] to-[hsl(213,87%,34%)] p-8 mb-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-1/2 w-40 h-40 bg-[hsl(22,100%,58%)]/10 rounded-full translate-y-1/2" />
          <div className="relative">
            <h1 className="text-3xl font-bold mb-2">Welcome, {session?.user?.name}!</h1>
            <p className="text-white/70 max-w-lg">Track your mentoring journey, connect with experienced leaders, and develop your professional skills.</p>
          </div>
        </div>

        {/* Status Indicator Banner */}
        <div className="mb-8">
          {profile?.assignment ? (
            <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center">
                  <UserCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <Badge className="bg-emerald-500 text-white text-xs mb-1">Matched</Badge>
                  <p className="text-lg font-bold text-emerald-900">Your Mentor is {profile.assignment.mentor.user?.name}</p>
                </div>
              </div>
              <p className="text-sm text-emerald-700 ml-[52px]">{profile.assignment.mentor?.role} • {profile.assignment.mentor?.businessUnit}</p>
            </div>
          ) : profile?.preferences && profile.preferences.length > 0 ? (
            <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <Badge className="bg-amber-500 text-white text-xs mb-1">Awaiting Match</Badge>
                  <p className="text-lg font-bold text-amber-900">Mentor Selected — Awaiting HR Confirmation</p>
                </div>
              </div>
              <p className="text-sm text-amber-700 ml-[52px]">You have selected {profile.preferences.length} mentor{profile.preferences.length > 1 ? 's' : ''}. HR will review and confirm your assignment.</p>
            </div>
          ) : (
            <div className="rounded-xl border-2 border-sky-200 bg-sky-50 p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-sky-500 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <Badge className="bg-sky-500 text-white text-xs mb-1">Awaiting Match</Badge>
                  <p className="text-lg font-bold text-sky-900">No Mentor Selected</p>
                </div>
              </div>
              <p className="text-sm text-sky-700 ml-[52px]">{profile?.profileComplete ? 'Complete your mentor selection to proceed.' : 'Complete your profile first, then select a mentor.'}</p>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <StatCard
            title="Profile Status"
            value={profile?.profileComplete ? 'Complete' : 'Incomplete'}
            icon={profile?.profileComplete ? CheckCircle2 : AlertCircle}
            color={profile?.profileComplete ? 'green' : 'orange'}
          />
          <StatCard
            title="Mentor Status"
            value={profile?.assignment ? 'Matched' : profile?.preferences?.length > 0 ? 'Selected' : 'Pending'}
            subtitle={profile?.assignment?.mentor?.user?.name || (profile?.preferences?.length > 0 ? `${profile.preferences.length} mentor(s) selected` : 'No mentor selected')}
            icon={profile?.assignment ? UserCheck : Clock}
            color={profile?.assignment ? 'navy' : 'amber'}
          />
          <StatCard
            title="Mentors Selected"
            value={profile?.preferences?.length || 0}
            subtitle={profile?.assignment ? 'Assignment confirmed' : 'Awaiting HR review'}
            icon={Users}
            color="blue"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Profile Card */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-5 h-5 text-[hsl(211,100%,28%)]" />
                Your Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              {profile?.profileComplete ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-emerald-800 text-sm">Profile Complete</p>
                      <p className="text-xs text-emerald-600">Your information is visible to HR for matching</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => router.push('/mentee/profile')}
                    variant="outline"
                    className="w-full border-[hsl(211,100%,28%)]/20 hover:bg-[hsl(211,100%,28%)]/5"
                  >
                    Edit Profile
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-100">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-amber-800 text-sm">Profile Incomplete</p>
                      <p className="text-xs text-amber-600">Complete your profile to begin mentor selection</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => router.push('/mentee/profile')}
                    className="w-full bg-[hsl(22,100%,58%)] hover:bg-[hsl(22,100%,48%)] text-white shadow-lg shadow-[hsl(22,100%,58%)]/25"
                  >
                    Complete Profile
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Mentor Assignment Card */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-[hsl(22,100%,58%)]" />
                Mentor Assignment
              </CardTitle>
            </CardHeader>
            <CardContent>
              {profile?.assignment ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-gradient-to-r from-[hsl(211,100%,28%)]/5 to-[hsl(22,100%,58%)]/5 border border-[hsl(211,100%,28%)]/10">
                    <p className="text-xs text-muted-foreground mb-1">Your Mentor</p>
                    <p className="font-bold text-lg text-[hsl(216,70%,11%)]">{profile.assignment.mentor.user?.name}</p>
                    <p className="text-sm text-muted-foreground">{profile.assignment.mentor?.role} • {profile.assignment.mentor?.businessUnit}</p>
                  </div>
                  <Button
                    onClick={() => router.push(`/mentee/mentor-profile/${profile.assignment.mentorId}`)}
                    variant="outline"
                    className="w-full border-[hsl(211,100%,28%)]/20 hover:bg-[hsl(211,100%,28%)]/5"
                  >
                    View Mentor Profile
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              ) : profile?.profileComplete ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-sky-50 border border-sky-100">
                    <Clock className="w-5 h-5 text-sky-600 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-sky-800 text-sm">Ready for Matching</p>
                      <p className="text-xs text-sky-600">Select your preferred mentors to proceed</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => router.push('/mentee/select-mentor')}
                    className="w-full bg-[hsl(211,100%,28%)] hover:bg-[hsl(211,100%,22%)] text-white shadow-lg shadow-[hsl(211,100%,28%)]/25"
                  >
                    Select Mentors
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                    <User className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-sm text-muted-foreground">Complete your profile first to begin the mentor matching process.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
