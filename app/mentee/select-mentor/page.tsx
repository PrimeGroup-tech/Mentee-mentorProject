// @ts-nocheck
'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, User, Eye, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import { BrandedHeader } from '@/components/branded-header';
import { getLevelBadge } from '@/lib/level-config';

interface Mentor {
  id: string;
  name: string;
  role: string;
  businessUnit: string;
  yearsOfExperience: number;
  areasOfExpertise: string[];
  shortBio: string;
  currentMenteeCount: number;
  profilePhotoUrl?: string;
  maxMentees: number;
  totalScore?: number;
  tier?: number;
  level?: number;
}

export default function SelectMentorPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [mentee, setMentee] = useState<any>(null);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [selectedMentors, setSelectedMentors] = useState<string[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const menteeRes = await fetch('/api/mentees/profile');
        const menteeData = await menteeRes.json();
        setMentee(menteeData);

        const mentorsRes = await fetch('/api/mentors/list');
        const mentorsData = await mentorsRes.json();
        setMentors(mentorsData);

        // Calculate matches (used internally, not shown to mentee)
        setCalculating(true);
        const matchRes = await fetch('/api/matching/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ menteeId: menteeData.id }),
        });
        const matchData = await matchRes.json();
        const scoreMap: Record<string, number> = {};
        matchData.topMatches?.forEach((m: any) => {
          scoreMap[m.mentorId] = m.totalScore;
        });
        setScores(scoreMap);
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
        setCalculating(false);
      }
    };

    fetchData();
  }, []);

  const MAX_MENTORS = 3;

  const toggleMentor = (mentorId: string) => {
    setSelectedMentors(prev => {
      if (prev.includes(mentorId)) {
        return prev.filter(id => id !== mentorId);
      }
      if (prev.length >= MAX_MENTORS) {
        setError(`You can select a maximum of ${MAX_MENTORS} mentors`);
        return prev;
      }
      setError('');
      return [...prev, mentorId];
    });
  };

  const handleSubmit = async () => {
    setError('');
    if (selectedMentors.length === 0) {
      setError('Please select at least one mentor');
      return;
    }

    setSubmitting(true);
    try {
      const prefs = selectedMentors.map((id) => ({
        mentorId: id,
        matchingScore: scores[id] || 0,
      }));

      const res = await fetch('/api/preferences/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          menteeId: mentee.id,
          preferences: prefs,
        }),
      });

      if (res.ok) {
        router.push('/mentee/dashboard');
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to submit preferences');
      }
    } catch (err) {
      setError('Error submitting preferences');
    } finally {
      setSubmitting(false);
    }
  };

  const MIN_MATCH_PERCENT = 50;

  const filteredMentors = mentors.filter(m => {
    // Only show mentors with 50%+ match score
    const scorePercent = scores[m.id] || 0;
    if (Object.keys(scores).length > 0 && scorePercent < MIN_MATCH_PERCENT) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      m.role.toLowerCase().includes(q) ||
      m.businessUnit.toLowerCase().includes(q) ||
      m.areasOfExpertise?.some(a => a.toLowerCase().includes(q))
    );
  });

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-[hsl(210,20%,97%)]">
      <BrandedHeader title="Select Mentors" subtitle="Mentee Portal" />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 text-[hsl(216,70%,11%)]">Select Your Preferred Mentors</h1>
          <p className="text-muted-foreground">Browse available mentors (50%+ match) and select up to <strong>3 mentors</strong>. Click <strong>"View Profile"</strong> to see full details before selecting.</p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Selected count */}
        {selectedMentors.length > 0 && (
          <div className="mb-4 p-3 rounded-lg bg-[#0C4DA2]/10 border border-[#0C4DA2]/20 flex items-center justify-between">
            <span className="text-sm font-medium text-[#0C4DA2]">
              {selectedMentors.length} of {MAX_MENTORS} mentor{selectedMentors.length !== 1 ? 's' : ''} selected
            </span>
            <Button variant="ghost" size="sm" className="text-xs text-red-600" onClick={() => setSelectedMentors([])}>
              <X className="w-3 h-3 mr-1" />Clear all
            </Button>
          </div>
        )}

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, role, business unit, or expertise..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Mentor list */}
        <div className="space-y-3">
          {filteredMentors.map((mentor) => {
            const isSelected = selectedMentors.includes(mentor.id);
            const levelBadge = getLevelBadge(mentor.level);
            return (
              <Card
                key={mentor.id}
                className={`transition-all cursor-pointer ${
                  isSelected
                    ? 'border-[#0C4DA2] bg-[#0C4DA2]/5 shadow-md'
                    : 'border-border hover:border-[#0C4DA2]/40 hover:shadow-sm'
                }`}
                onClick={() => toggleMentor(mentor.id)}
              >
                <CardContent className="py-4">
                  <div className="flex items-start gap-3">
                    {/* Profile Picture */}
                    <div className="relative w-14 h-14 rounded-full overflow-hidden bg-muted flex items-center justify-center border flex-shrink-0">
                      {mentor.profilePhotoUrl ? (
                        <Image
                          src={mentor.profilePhotoUrl}
                          alt={mentor.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <User className="w-7 h-7 text-muted-foreground" />
                      )}
                    </div>

                    {/* Mentor Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-[#08172E]">{mentor.name}</span>
                        {levelBadge && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${levelBadge.bgColor} ${levelBadge.color}`}>
                            Level {mentor.level}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">{mentor.role} • {mentor.businessUnit}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{mentor.yearsOfExperience}yr exp • {mentor.areasOfExpertise?.slice(0, 3).join(', ')}</div>
                      {mentor.shortBio && (
                        <div className="text-xs mt-1 line-clamp-2 text-muted-foreground">{mentor.shortBio}</div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/mentee/mentor-profile/${mentor.id}`);
                          }}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View Profile
                        </Button>
                        <Button
                          variant={isSelected ? 'default' : 'outline'}
                          size="sm"
                          className={`text-xs h-7 ${isSelected ? 'bg-[#0C4DA2] hover:bg-[#00458E]' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleMentor(mentor.id);
                          }}
                        >
                          {isSelected ? (
                            <><CheckCircle2 className="w-3 h-3 mr-1" /> Selected</>
                          ) : 'Select'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-8 flex gap-4">
          <Button variant="outline" onClick={() => router.back()}>
            Back
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || selectedMentors.length === 0}
            className="flex-1 bg-[#0C4DA2] hover:bg-[#00458E]"
          >
            {submitting ? 'Submitting...' : `Submit ${selectedMentors.length} Mentor Preference${selectedMentors.length !== 1 ? 's' : ''}`}
          </Button>
        </div>
      </div>
    </div>
  );
}