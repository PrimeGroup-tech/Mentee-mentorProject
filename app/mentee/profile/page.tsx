'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BrandedHeader } from '@/components/branded-header';
import { LEVEL_OPTIONS } from '@/lib/level-config';
import {
  Briefcase, Building2, Clock, Target, Heart,
  Monitor, ChevronRight, Loader2, AlertCircle
} from 'lucide-react';

const BUSINESS_UNITS = [
  'PACE', 'PASS', 'WAEL', 'CINALT', 'MILE SQUARE', 'WESTON', 'PAL', 'PAGES'
];

const DEVELOPMENT_AREAS = [
  'Strategic Thinking & Execution', 'Financial Oversight & Acumen', 'Stakeholder Management',
  'Leading Diverse Teams', 'Emotional Intelligence', 'Change Management & Resilience',
  'Technology & AI Integration', 'Communication', 'Team Building',
  'People Management', 'Problem Solving', 'Technical Acumen',
  'Decision Making', 'Project Management', 'Networking & Relationship Building',
  'Presentation Skills', 'Delegation', 'Coaching & Mentoring Others',
  'Active Listening', 'Constructive Conflict Resolution',
  'Adaptability', 'Constructive Feedback Reception', 'Time Management & Organisation',
  'Empathy', 'Assertiveness', 'Collaboration', 'Critical Thinking',
  'Creativity & Innovation', 'Resilience'
];

const INTERESTS = [
  'Technology', 'Reading', 'Photography', 'Cooking', 'Travel',
  'Sports', 'Content Creation', 'Wellness', 'Politics', 'Dancing',
  'Music', 'Volunteering', 'Art & Design',
  'Entrepreneurship', 'Gardening', 'Gaming', 'Podcasts',
  'Negotiation', 'Networking', 'Current Affairs', 'Movies',
  'Geography', 'Socializing', 'Animals'
];

function SectionHeader({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-[#00458E] to-[#0C4DA2] flex items-center justify-center shadow-sm">
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <h3 className="text-base font-bold text-[#08172E] tracking-tight">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function CheckboxGrid({ items, selected, onChange, columns = 2, maxSelections }: {
  items: string[]; selected: string[]; onChange: (items: string[]) => void; columns?: number; maxSelections?: number;
}) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-${columns} gap-2`}>
      {items.map((item) => {
        const isChecked = selected.includes(item);
        const isDisabled = !isChecked && maxSelections !== undefined && selected.length >= maxSelections;
        return (
          <div
            key={item}
            onClick={() => {
              if (isDisabled) return;
              if (isChecked) {
                onChange(selected.filter((i) => i !== item));
              } else {
                onChange([...selected, item]);
              }
            }}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border transition-all duration-150 select-none ${
              isChecked
                ? 'border-[#0C4DA2] bg-[#0C4DA2]/5 shadow-sm cursor-pointer'
                : isDisabled
                  ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 cursor-pointer'
            }`}
          >
            <Checkbox
              checked={isChecked}
              disabled={isDisabled}
              tabIndex={-1}
              className="pointer-events-none"
            />
            <span className={`text-sm ${isChecked ? 'font-medium text-[#08172E]' : isDisabled ? 'text-gray-400' : 'text-gray-600'}`}>{item}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function ProfilePage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role && session.user.role !== 'MENTEE') {
      if (session.user.role === 'MENTOR') router.replace('/mentor/profile');
      else if (session.user.role === 'HR_ADMIN') router.replace('/admin/dashboard');
    }
  }, [status, session, router]);

  const [formData, setFormData] = useState({
    role: '',
    businessUnit: '',
    yearsOfExperience: 0,
    tenure: 0,
    employmentDate: '',
    competencyGaps: [] as string[],
    careerGoals: '',
    personalInterests: [] as string[],
    preferredMeetingFormat: 'HYBRID' as const,
    gradeLevel: '' as string | number,
  });

  const calculateTenure = (dateStr: string) => {
    if (!dateStr) return { years: 0, months: 0 };
    const empDate = new Date(dateStr);
    const now = new Date();
    let years = now.getFullYear() - empDate.getFullYear();
    let months = now.getMonth() - empDate.getMonth();
    if (now.getDate() < empDate.getDate()) months--;
    if (months < 0) { years--; months += 12; }
    return { years: Math.max(0, years), months: Math.max(0, months) };
  };

  const formatTenure = (dateStr: string) => {
    const { years, months } = calculateTenure(dateStr);
    const parts: string[] = [];
    if (years > 0) parts.push(`${years} year${years !== 1 ? 's' : ''}`);
    parts.push(`${months} month${months !== 1 ? 's' : ''}`);
    return parts.join(', ');
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/mentees/profile');
        if (res.ok) {
          const profile = await res.json();
          // Filter competencyGaps to only include items in current DEVELOPMENT_AREAS list
          if (profile.competencyGaps) {
            profile.competencyGaps = profile.competencyGaps.filter((g: string) => DEVELOPMENT_AREAS.includes(g));
          }
          setFormData(profile);
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };
    setLoading(true);
    fetchProfile();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/mentees/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        router.push('/mentee/select-mentor');
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to save profile');
      }
    } catch (err) {
      setError('Network error — please check your connection and try again');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <BrandedHeader title="Your Profile" subtitle="Mentee Portal" />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#0C4DA2]" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <BrandedHeader title="Your Profile" subtitle="Mentee Portal" />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#08172E]">Complete Your Profile</h1>
          <p className="text-muted-foreground mt-1">Help us find the best mentor match for you</p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          {/* Professional Information */}
          <Card className="border-0 shadow-md rounded-xl overflow-hidden">
            <CardContent className="p-6">
              <SectionHeader icon={Briefcase} title="Professional Information" subtitle="Your current role and experience" />
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-[#08172E] mb-1.5 block">Job Role</label>
                    <Input
                      value={formData.role}
                      disabled
                      className="h-11 bg-gray-50 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-[#08172E] mb-1.5 block">Grade Level</label>
                    <Select value={formData.gradeLevel ? String(formData.gradeLevel) : ''} onValueChange={(value) => setFormData({ ...formData, gradeLevel: parseInt(value) })}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select your grade level" />
                      </SelectTrigger>
                      <SelectContent>
                        {LEVEL_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-[#08172E] mb-1.5 block">Business Unit</label>
                  <Select value={formData.businessUnit} onValueChange={(value) => setFormData({ ...formData, businessUnit: value })}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select your business unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {BUSINESS_UNITS.map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-[#08172E] mb-1.5 block">Total Years of Experience</label>
                    <Input
                      type="number"
                      value={formData.yearsOfExperience}
                      onChange={(e) => setFormData({ ...formData, yearsOfExperience: parseInt(e.target.value) })}
                      className="h-11"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-[#08172E] mb-1.5 block">Date of Employment (in Prime Atlantic Group)</label>
                    <Input
                      type="date"
                      value={formData.employmentDate}
                      onChange={(e) => {
                        const date = e.target.value;
                        setFormData({ ...formData, employmentDate: date, tenure: calculateTenure(date).years });
                      }}
                      max={new Date().toISOString().split('T')[0]}
                      className="h-11"
                    />
                    {formData.employmentDate && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Tenure: {formatTenure(formData.employmentDate)} in Prime Atlantic Group
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Development Areas */}
          <Card className="border-0 shadow-md rounded-xl overflow-hidden">
            <CardContent className="p-6">
              <SectionHeader icon={Target} title="Development Areas" subtitle="Select 3 to 4 areas you want to develop" />
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                  formData.competencyGaps.length >= 3 && formData.competencyGaps.length <= 4
                    ? 'bg-emerald-100 text-emerald-700'
                    : formData.competencyGaps.length > 4
                      ? 'bg-red-100 text-red-700'
                      : 'bg-amber-100 text-amber-700'
                }`}>
                  {formData.competencyGaps.length} of 4 selected
                </span>
                {formData.competencyGaps.length >= 4 && (
                  <span className="text-xs text-amber-600 font-medium">Maximum reached — deselect one to choose another</span>
                )}
              </div>
              {formData.competencyGaps.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {formData.competencyGaps.map((gap) => (
                    <span
                      key={gap}
                      onClick={() => setFormData({ ...formData, competencyGaps: formData.competencyGaps.filter(g => g !== gap) })}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#0C4DA2]/10 text-[#0C4DA2] border border-[#0C4DA2]/20 cursor-pointer hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                    >
                      {gap}
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </span>
                  ))}
                </div>
              )}
              <CheckboxGrid
                items={DEVELOPMENT_AREAS}
                selected={formData.competencyGaps}
                onChange={(items) => setFormData({ ...formData, competencyGaps: items })}
                maxSelections={4}
              />
            </CardContent>
          </Card>

          {/* Career Goals */}
          <Card className="border-0 shadow-md rounded-xl overflow-hidden">
            <CardContent className="p-6">
              <SectionHeader icon={ChevronRight} title="Career Goals" subtitle="Where do you see yourself heading?" />
              <Textarea
                value={formData.careerGoals}
                onChange={(e) => setFormData({ ...formData, careerGoals: e.target.value })}
                placeholder="Describe your career aspirations and what you hope to achieve through mentoring..."
                rows={4}
                className="resize-none"
              />
            </CardContent>
          </Card>

          {/* Personal Interests */}
          <Card className="border-0 shadow-md rounded-xl overflow-hidden">
            <CardContent className="p-6">
              <SectionHeader icon={Heart} title="Personal Interests" subtitle="Helps us find mentors with shared passions" />
              <CheckboxGrid
                items={INTERESTS}
                selected={formData.personalInterests}
                onChange={(items) => setFormData({ ...formData, personalInterests: items })}
                columns={3}
              />
            </CardContent>
          </Card>

          {/* Meeting Preferences */}
          <Card className="border-0 shadow-md rounded-xl overflow-hidden">
            <CardContent className="p-6">
              <SectionHeader icon={Monitor} title="Meeting Preferences" subtitle="How would you like to meet your mentor?" />
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'IN_PERSON', label: 'In Person', emoji: '🏢' },
                  { value: 'VIRTUAL', label: 'Virtual', emoji: '💻' },
                  { value: 'HYBRID', label: 'Hybrid', emoji: '🔄' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, preferredMeetingFormat: option.value as any })}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-150 ${
                      formData.preferredMeetingFormat === option.value
                        ? 'border-[#0C4DA2] bg-[#0C4DA2]/5 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-2xl">{option.emoji}</span>
                    <span className={`text-sm font-medium ${
                      formData.preferredMeetingFormat === option.value ? 'text-[#0C4DA2]' : 'text-gray-600'
                    }`}>{option.label}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3 pt-2 pb-8">
            <Button variant="outline" onClick={() => router.back()} className="px-6 h-12">
              Back
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 h-12 bg-gradient-to-r from-[#00458E] to-[#0C4DA2] hover:from-[#003670] hover:to-[#0a3d82] text-white font-semibold shadow-lg"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
              ) : (
                <>Continue to Mentor Selection <ChevronRight className="w-4 h-4 ml-2" /></>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
