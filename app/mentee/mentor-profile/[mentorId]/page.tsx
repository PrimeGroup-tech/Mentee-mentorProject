// @ts-nocheck
'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Briefcase, Clock, Users, Star, Target, Heart, Shield, MessageCircle, User } from 'lucide-react';
import Image from 'next/image';
import { getLevelBadge } from '@/lib/level-config';

const LEADERSHIP_LABELS: Record<string, string> = {
  DIRECT: 'Direct',
  COLLABORATIVE: 'Collaborative',
  ANALYTICAL: 'Analytical',
  SUPPORTIVE: 'Supportive',
  VISIONARY: 'Visionary',
};

const TIER_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Tier 1 — Executive Leadership', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  2: { label: 'Tier 2 — Senior Management', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  3: { label: 'Tier 3 — Mid-Level / Emerging Leaders', color: 'bg-green-100 text-green-800 border-green-300' },
};

export default function MentorProfileViewPage() {
  const { data: session } = useSession() || {};
  const router = useRouter();
  const params = useParams();
  const mentorId = params?.mentorId as string;

  const [mentor, setMentor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!mentorId) return;
    const fetchMentor = async () => {
      try {
        const res = await fetch(`/api/mentors/${mentorId}`);
        if (res.ok) {
          const data = await res.json();
          setMentor(data);
        } else {
          setError('Mentor profile not found');
        }
      } catch (err) {
        setError('Failed to load mentor profile');
      } finally {
        setLoading(false);
      }
    };
    fetchMentor();
  }, [mentorId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading mentor profile...</div>
      </div>
    );
  }

  if (error || !mentor) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground mb-4">{error || 'Mentor not found'}</p>
            <Button onClick={() => router.back()}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tierInfo = mentor.tier ? TIER_LABELS[mentor.tier] : null;
  const levelInfo = getLevelBadge(mentor.level);
  const availableSlots = Math.max(0, mentor.maxMentees - mentor.currentMenteeCount);

  return (
    <div className="min-h-screen bg-[hsl(210,20%,97%)]">
      {/* Hero section */}
      <div className="bg-gradient-to-r from-[hsl(211,100%,28%)]/10 via-[hsl(211,100%,28%)]/5 to-[hsl(210,20%,97%)]">
        <div className="max-w-4xl mx-auto px-6 pt-6 pb-10">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-6 text-[hsl(211,100%,28%)]">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <div className="flex flex-col sm:flex-row items-start gap-6">
            {/* Profile Photo */}
            <div className="relative w-32 h-32 rounded-2xl overflow-hidden bg-muted flex items-center justify-center border-2 border-background shadow-lg flex-shrink-0">
              {mentor.profilePhotoUrl ? (
                <Image
                  src={mentor.profilePhotoUrl}
                  alt={mentor.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <User className="w-16 h-16 text-muted-foreground" />
              )}
            </div>

            {/* Name & Key Info */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-1">{mentor.name}</h1>
              <p className="text-lg text-muted-foreground mb-3">{mentor.role}</p>

              <div className="flex flex-wrap gap-2 mb-3">
                {tierInfo && (
                  <span className={`text-sm px-3 py-1 rounded-full border font-medium ${tierInfo.color}`}>
                    {tierInfo.label}
                  </span>
                )}
                {levelInfo && (
                  <span className={`text-sm px-3 py-1 rounded-full border font-medium ${levelInfo.bgColor} ${levelInfo.color}`}>
                    Level {mentor.level}
                  </span>
                )}
                <span className="text-sm px-3 py-1 rounded-full bg-secondary text-secondary-foreground">
                  {mentor.businessUnit}
                </span>
                <span className="text-sm px-3 py-1 rounded-full bg-secondary text-secondary-foreground">
                  {mentor.yearsOfExperience} years experience
                </span>
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{availableSlots} slot{availableSlots !== 1 ? 's' : ''} available</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4" />
                  <span>{LEADERSHIP_LABELS[mentor.leadershipStyle] || mentor.leadershipStyle} style</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Content */}
      <div className="max-w-4xl mx-auto px-6 -mt-4 pb-12 space-y-6">

        {/* About */}
        {mentor.shortBio && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-primary" />
                About
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">{mentor.shortBio}</p>
            </CardContent>
          </Card>
        )}

        {/* Expertise & Skills */}
        <div className="grid md:grid-cols-2 gap-6">
          {mentor.areasOfExpertise?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-primary" />
                  Areas of Expertise
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {mentor.areasOfExpertise.map((area: string) => (
                    <span key={area} className="px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium">
                      {area}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {mentor.shadowSkills?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  Soft Skills
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">Intangible leadership strengths</p>
                <div className="flex flex-wrap gap-2">
                  {mentor.shadowSkills.map((skill: string) => (
                    <span key={skill} className="px-3 py-1.5 bg-violet-50 text-violet-700 rounded-full text-sm font-medium">
                      {skill}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Coaching & Commitment */}
        <div className="grid md:grid-cols-2 gap-6">
          {mentor.coachingGoals && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  Mentoring Goals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">{mentor.coachingGoals}</p>
              </CardContent>
            </Card>
          )}

          {mentor.commitmentAvailability && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Commitment & Availability
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">{mentor.commitmentAvailability}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Personal Interests */}
        {mentor.personalInterests?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Heart className="w-5 h-5 text-primary" />
                Personal Interests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {mentor.personalInterests.map((interest: string) => (
                  <span key={interest} className="px-3 py-1.5 bg-rose-50 text-rose-700 rounded-full text-sm font-medium">
                    {interest}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Back Button */}
        <div className="pt-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Mentor Selection
          </Button>
        </div>
      </div>
    </div>
  );
}
