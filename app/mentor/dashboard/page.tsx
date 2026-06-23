'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Edit, Users, User, Briefcase, Clock, ArrowRight, Star, Award, TrendingUp, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { BrandedHeader } from '@/components/branded-header';
import { StatCard } from '@/components/stat-card';
import { getLevelBadge } from '@/lib/level-config';

export default function MentorDashboard() {
  const { data: session } = useSession() || {};
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if ((session?.user as any)?.role !== 'MENTOR') {
      router.push('/');
      return;
    }

    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/mentors/profile');
        if (res.ok) setProfile(await res.json());
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [session, router]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <BrandedHeader title="Mentor Portal" subtitle="Your mentoring dashboard" />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="flex items-center gap-3 text-muted-foreground">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            Loading...
          </div>
        </div>
      </div>
    );
  }

  const availableSlots = Math.max(0, (profile?.maxMentees || 5) - (profile?.currentMenteeCount || 0));

  return (
    <div className="min-h-screen bg-[hsl(210,20%,97%)]">
      <BrandedHeader title="Mentor Portal" subtitle="Your mentoring dashboard" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Welcome Banner — Vibrant */}
        <div className="rounded-2xl bg-gradient-to-br from-[#0C4DA2] via-[#00458E] to-[#08172E] p-8 mb-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#FF6F2B]/15 rounded-full -translate-y-1/3 translate-x-1/4 blur-2xl" />
          <div className="absolute bottom-0 left-0 w-60 h-60 bg-[#0C4DA2]/40 rounded-full translate-y-1/3 -translate-x-1/4 blur-2xl" />
          <div className="absolute top-1/2 right-1/4 w-40 h-40 bg-[#FF6F2B]/10 rounded-full blur-xl" />
          <div className="relative flex items-start gap-6">
            {/* Profile Photo */}
            <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-white/10 flex items-center justify-center flex-shrink-0 border-2 border-white/20 shadow-lg shadow-black/20">
              {profile?.profilePhotoUrl ? (
                <Image src={profile.profilePhotoUrl} alt="Profile" fill className="object-cover" />
              ) : (
                <User className="w-10 h-10 text-white/50" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-bold">Welcome, {session?.user?.name}!</h1>
                <Sparkles className="w-6 h-6 text-[#FF6F2B]" />
              </div>
              <p className="text-white/60">{profile?.role} • {profile?.businessUnit}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                {profile?.tier && (
                  <span className="text-xs px-3 py-1 rounded-full bg-amber-500/20 text-amber-200 font-medium border border-amber-500/30">
                    Tier {profile.tier}
                  </span>
                )}
                {(() => {
                  const lvl = getLevelBadge(profile?.level);
                  return lvl ? (
                    <span className="text-xs px-3 py-1 rounded-full bg-violet-500/20 text-violet-200 font-medium border border-violet-500/30">
                      Level {profile.level}
                    </span>
                  ) : null;
                })()}
                <span className="text-xs px-3 py-1 rounded-full bg-white/10 text-white/70 font-medium border border-white/10">
                  {profile?.yearsOfExperience || 0} yrs experience
                </span>
              </div>
              {profile?.shortBio && (
                <p className="text-white/50 text-sm mt-3 line-clamp-2 max-w-lg">{profile.shortBio}</p>
              )}
            </div>
          </div>
        </div>

        {!profile?.profileComplete ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6">
              <Alert className="border-amber-200 bg-amber-50">
                <AlertDescription>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                        <Edit className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-amber-800">Profile Incomplete</p>
                        <p className="text-sm text-amber-600">Complete your profile to be visible to mentees.</p>
                      </div>
                    </div>
                    <Button onClick={() => router.push('/mentor/profile')} className="bg-[hsl(22,100%,58%)] hover:bg-[hsl(22,100%,48%)] text-white">
                      Complete Profile <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard title="Current Mentees" value={profile?.currentMenteeCount || 0} icon={Users} color="navy" />
              <StatCard title="Available Slots" value={availableSlots} icon={Clock} color={availableSlots > 0 ? 'green' : 'orange'} />
              <StatCard title="Experience" value={`${profile?.yearsOfExperience || 0} yrs`} icon={Briefcase} color="blue" />
              <StatCard title="Leadership" value={profile?.leadershipStyle ? profile.leadershipStyle.charAt(0) + profile.leadershipStyle.slice(1).toLowerCase().replace(/_/g, ' ') : 'N/A'} icon={Star} color="purple" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Profile Info */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="w-5 h-5 text-[hsl(211,100%,28%)]" />
                      Profile
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => router.push('/mentor/profile')} className="text-[hsl(22,100%,58%)]">
                      <Edit className="w-4 h-4 mr-1" /> Edit
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { label: 'Business Unit', value: profile?.businessUnit },
                      { label: 'Role', value: profile?.role },
                      { label: 'Experience', value: `${profile?.yearsOfExperience} years` },
                      { label: 'Leadership Style', value: profile?.leadershipStyle ? profile.leadershipStyle.charAt(0) + profile.leadershipStyle.slice(1).toLowerCase().replace(/_/g, ' ') : undefined },
                    ].map((item) => (
                      <div key={item.label} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                        <span className="text-sm text-muted-foreground">{item.label}</span>
                        <span className="text-sm font-medium text-[hsl(216,70%,11%)]">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Capacity */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="w-5 h-5 text-[hsl(22,100%,58%)]" />
                    Mentee Capacity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-4">
                    <div className="relative inline-flex items-center justify-center w-28 h-28 mb-4">
                      <svg className="w-28 h-28 transform -rotate-90">
                        <circle cx="56" cy="56" r="48" stroke="hsl(210,20%,92%)" strokeWidth="8" fill="none" />
                        <circle
                          cx="56" cy="56" r="48"
                          stroke={availableSlots > 0 ? 'hsl(211,100%,28%)' : 'hsl(22,100%,58%)'}
                          strokeWidth="8"
                          fill="none"
                          strokeLinecap="round"
                          strokeDasharray={`${((profile?.currentMenteeCount || 0) / (profile?.maxMentees || 5)) * 301.6} 301.6`}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-bold text-[hsl(216,70%,11%)]">{profile?.currentMenteeCount || 0}</span>
                        <span className="text-xs text-muted-foreground">of {profile?.maxMentees || 5}</span>
                      </div>
                    </div>
                    <p className={`text-sm font-medium ${availableSlots > 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {availableSlots > 0 ? `${availableSlots} slot${availableSlots > 1 ? 's' : ''} available` : 'At full capacity'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    onClick={() => router.push('/mentor/profile')}
                    variant="outline"
                    className="w-full justify-start border-[hsl(211,100%,28%)]/20 hover:bg-[hsl(211,100%,28%)]/5"
                  >
                    <Edit className="w-4 h-4 mr-3 text-[hsl(211,100%,28%)]" />
                    Edit Profile
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Assigned Mentees */}
            <Card className="border-0 shadow-sm mt-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-[hsl(211,100%,28%)]" />
                  Your Mentees
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!profile?.assignments || profile.assignments.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-[hsl(211,100%,28%)]/5 flex items-center justify-center mx-auto mb-4">
                      <Users className="w-8 h-8 text-[hsl(211,100%,28%)]/30" />
                    </div>
                    <p className="font-medium text-[hsl(216,70%,11%)]]">No mentees assigned yet</p>
                    <p className="text-sm text-muted-foreground mt-1">HR will assign mentees based on the matching algorithm.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {profile.assignments.map((assignment: any, idx: number) => {
                      const colors = [
                        { bg: 'from-blue-50 to-indigo-50', border: 'border-blue-200', icon: 'bg-blue-100 text-blue-600', tag: 'bg-blue-100 text-blue-700' },
                        { bg: 'from-emerald-50 to-teal-50', border: 'border-emerald-200', icon: 'bg-emerald-100 text-emerald-600', tag: 'bg-emerald-100 text-emerald-700' },
                        { bg: 'from-violet-50 to-purple-50', border: 'border-violet-200', icon: 'bg-violet-100 text-violet-600', tag: 'bg-violet-100 text-violet-700' },
                        { bg: 'from-amber-50 to-orange-50', border: 'border-amber-200', icon: 'bg-amber-100 text-amber-600', tag: 'bg-amber-100 text-amber-700' },
                      ];
                      const c = colors[idx % colors.length];
                      return (
                        <div
                          key={assignment.id}
                          className={`rounded-xl border ${c.border} p-5 bg-gradient-to-br ${c.bg} hover:shadow-md transition-all duration-200`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-full ${c.icon} flex items-center justify-center flex-shrink-0`}>
                              <User className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-[#08172E]">{assignment.mentee?.user?.name}</h3>
                              <p className="text-xs text-muted-foreground">{assignment.mentee?.user?.email}</p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <span className={`px-2 py-0.5 rounded-full ${c.tag} text-xs font-medium`}>
                                  {assignment.mentee?.businessUnit}
                                </span>
                                <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs">
                                  {assignment.mentee?.role}
                                </span>
                              </div>
                              {assignment.assignmentReason && (
                                <p className="mt-2 text-xs text-muted-foreground italic">
                                  &ldquo;{assignment.assignmentReason}&rdquo;
                                </p>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(assignment.confirmedAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
