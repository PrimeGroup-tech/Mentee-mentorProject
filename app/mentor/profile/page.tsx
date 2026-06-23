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
import {
  ArrowLeft, Upload, User, Briefcase, Building2, Star, Heart,
  Shield, CalendarDays, Target, Camera, Loader2, AlertCircle, Save
} from 'lucide-react';
import Image from 'next/image';
import { BrandedHeader } from '@/components/branded-header';
import { LEVEL_OPTIONS } from '@/lib/level-config';

const BUSINESS_UNITS = [
  'PACE', 'PASS', 'WAEL', 'CINALT', 'MILE SQUARE', 'WESTON', 'PAL', 'PAGES'
];

const EXPERTISE_AND_SKILLS = [
  'Strategic Thinking & Visioning', 'Financial Oversight & Acumen', 'Stakeholder Management',
  'Leading Diverse Teams', 'Emotional Intelligence', 'Change Management & Resilience',
  'Technology & AI Integration', 'Communication & Public Speaking', 'Team Building',
  'People Management', 'Problem Solving', 'Technical Acumen',
  'Industry Knowledge', 'Functional Knowledge', 'Conflict Resolution',
  'Executive Presence', 'Culture Building',
  'Active Listening', 'Constructive Conflict Resolution',
  'Adaptability', 'Constructive Feedback Reception', 'Time Management & Organisation',
  'Empathy', 'Assertiveness', 'Collaboration', 'Critical Thinking',
  'Creativity & Innovation', 'Resilience'
];

const INTERESTS = [
  'Technology', 'Reading', 'Photography', 'Cooking',
  'Travel', 'Music', 'Sports', 'Volunteering',
  'Content Creation', 'Wellness', 'Politics', 'Dancing',
  'Art & Design', 'Entrepreneurship',
  'Gardening', 'Gaming', 'Podcasts',
  'Negotiation', 'Networking', 'Current Affairs', 'Movies',
  'Geography', 'Socializing', 'Animals'
];

const PREFERRED_DAYS = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

const LEADERSHIP_STYLES = [
  { value: 'DIRECT', label: 'Direct', desc: 'Clear, decisive communication' },
  { value: 'COLLABORATIVE', label: 'Collaborative', desc: 'Team-oriented approach' },
  { value: 'ANALYTICAL', label: 'Analytical', desc: 'Data-driven decisions' },
  { value: 'SUPPORTIVE', label: 'Supportive', desc: 'Empowering & nurturing' },
  { value: 'VISIONARY', label: 'Visionary', desc: 'Big-picture thinking' },
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

function CheckboxGrid({ items, selected, onChange, columns = 2 }: {
  items: string[]; selected: string[]; onChange: (items: string[]) => void; columns?: number;
}) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-${columns} gap-2`}>
      {items.map((item) => {
        const isChecked = selected.includes(item);
        return (
          <label
            key={item}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer transition-all duration-150 ${
              isChecked
                ? 'border-[#0C4DA2] bg-[#0C4DA2]/5 shadow-sm'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Checkbox
              checked={isChecked}
              onCheckedChange={(checked) => {
                onChange(
                  checked ? [...selected, item] : selected.filter((i) => i !== item)
                );
              }}
            />
            <span className={`text-sm ${isChecked ? 'font-medium text-[#08172E]' : 'text-gray-600'}`}>{item}</span>
          </label>
        );
      })}
    </div>
  );
}

export default function MentorProfilePage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role && session.user.role !== 'MENTOR') {
      if (session.user.role === 'MENTEE') router.replace('/mentee/profile');
      else if (session.user.role === 'HR_ADMIN') router.replace('/admin/dashboard');
    }
  }, [status, session, router]);

  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    role: '',
    businessUnit: '',
    yearsOfExperience: 0,
    areasOfExpertise: [] as string[],
    leadershipStyle: 'COLLABORATIVE' as const,
    coachingGoals: '',
    personalInterests: [] as string[],
    shadowSkills: [] as string[],
    commitmentAvailability: '',
    maxMentees: 5,
    organizationalChallenge: '',
    shortBio: '',
    preferredDays: [] as string[],
    level: '' as string | number,
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/mentors/profile');
        if (res.ok) {
          const profile = await res.json();
          setFormData({
            role: profile.role || '',
            businessUnit: profile.businessUnit || '',
            yearsOfExperience: profile.yearsOfExperience || 0,
            areasOfExpertise: profile.areasOfExpertise || [],
            leadershipStyle: profile.leadershipStyle || 'COLLABORATIVE',
            coachingGoals: profile.coachingGoals || '',
            personalInterests: profile.personalInterests || [],
            shadowSkills: profile.shadowSkills || [],
            commitmentAvailability: profile.commitmentAvailability || '',
            maxMentees: profile.maxMentees || 5,
            organizationalChallenge: profile.organizationalChallenge || '',
            shortBio: profile.shortBio || '',
            preferredDays: profile.preferredDays || [],
            level: profile.level || '',
          });
          setProfilePhotoUrl(profile.profilePhotoUrl || null);
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

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Only JPEG, PNG, and WebP are allowed.');
      return;
    }
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('File size too large. Maximum size is 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('photo', file);
      const res = await fetch('/api/mentors/upload-photo', { method: 'POST', body: fd });
      if (res.ok) {
        const data = await res.json();
        setProfilePhotoUrl(data.photoUrl);
        setPhotoPreview(null);
      } else {
        const errorData = await res.json();
        setError(errorData.error || 'Failed to upload photo');
        setPhotoPreview(null);
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError('Error uploading photo');
      setPhotoPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    if (!formData.role || !formData.businessUnit || formData.yearsOfExperience < 0) {
      setError('Please fill in all required fields');
      setSaving(false);
      return;
    }
    if (formData.areasOfExpertise.length === 0) {
      setError('Please select at least one area of expertise');
      setSaving(false);
      return;
    }
    if (!formData.shortBio || formData.shortBio.trim().length === 0) {
      setError('Please provide a short bio');
      setSaving(false);
      return;
    }
    try {
      const res = await fetch('/api/mentors/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        router.push('/mentor/dashboard');
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

  const toggleArrayItem = (field: 'areasOfExpertise' | 'personalInterests' | 'shadowSkills', value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter((item: string) => item !== value)
        : [...prev[field], value]
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <BrandedHeader title="Edit Profile" subtitle="Mentor Portal" />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#0C4DA2]" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <BrandedHeader title="Edit Profile" subtitle="Mentor Portal" />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Button
              variant="ghost"
              className="-ml-2 mb-2 text-[#0C4DA2] hover:text-[#00458E] p-1"
              onClick={() => router.push('/mentor/dashboard')}
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back to Dashboard
            </Button>
            <h1 className="text-2xl font-bold text-[#08172E]">Mentor Profile</h1>
            <p className="text-muted-foreground mt-1">Showcase your experience and mentoring style</p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          {/* Profile Picture */}
          <Card className="border-0 shadow-md rounded-xl overflow-hidden">
            <CardContent className="p-6">
              <SectionHeader icon={Camera} title="Profile Picture" subtitle="Help mentees recognize you" />
              <div className="flex items-center gap-6">
                <div className="relative w-28 h-28 rounded-2xl overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center border-2 border-gray-200 shadow-inner">
                  {photoPreview ? (
                    <div className="relative w-full h-full">
                      <Image src={photoPreview} alt="Preview" fill className="object-cover" />
                      {uploading && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Loader2 className="w-6 h-6 text-white animate-spin" />
                        </div>
                      )}
                    </div>
                  ) : profilePhotoUrl ? (
                    <div className="relative w-full h-full">
                      <Image src={profilePhotoUrl} alt="Profile" fill className="object-cover" />
                    </div>
                  ) : (
                    <User className="w-12 h-12 text-gray-400" />
                  )}
                </div>
                <div>
                  <input type="file" id="photo-upload" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handlePhotoChange} className="hidden" disabled={uploading} />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={uploading}
                    onClick={() => document.getElementById('photo-upload')?.click()}
                    className="mb-2"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading ? 'Uploading...' : profilePhotoUrl ? 'Change Photo' : 'Upload Photo'}
                  </Button>
                  <p className="text-xs text-muted-foreground">JPG, PNG or WebP. Max size 5MB.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Basic Information */}
          <Card className="border-0 shadow-md rounded-xl overflow-hidden">
            <CardContent className="p-6">
              <SectionHeader icon={Briefcase} title="Basic Information" subtitle="Your professional details" />
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-[#08172E] mb-1.5 block">Job Role / Title</label>
                    <Input value={formData.role} disabled className="h-11 bg-gray-50 cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-[#08172E] mb-1.5 block">Grade Level</label>
                    <Select value={formData.level ? String(formData.level) : ''} onValueChange={(val) => setFormData({ ...formData, level: parseInt(val) })}>
                      <SelectTrigger className="h-11"><SelectValue placeholder="Select your grade level" /></SelectTrigger>
                      <SelectContent>
                        {LEVEL_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-[#08172E] mb-1.5 block">Business Unit *</label>
                    <Select value={formData.businessUnit} onValueChange={(val) => setFormData({ ...formData, businessUnit: val })}>
                      <SelectTrigger className="h-11"><SelectValue placeholder="Select business unit" /></SelectTrigger>
                      <SelectContent>
                        {BUSINESS_UNITS.map((unit) => (
                          <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-[#08172E] mb-1.5 block">Total Years of Experience *</label>
                    <Input type="number" min="0" value={formData.yearsOfExperience} onChange={(e) => setFormData({ ...formData, yearsOfExperience: parseInt(e.target.value) || 0 })} className="h-11" />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-[#08172E] mb-1.5 block">Short Bio *</label>
                  <Textarea value={formData.shortBio} onChange={(e) => setFormData({ ...formData, shortBio: e.target.value })} placeholder="Brief description about yourself and your experience" rows={3} className="resize-none" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Expertise & Skills (Merged) */}
          <Card className="border-0 shadow-md rounded-xl overflow-hidden">
            <CardContent className="p-6">
              <SectionHeader icon={Star} title="Areas of Expertise & Skills" subtitle="Your professional strengths and soft skills" />
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-semibold text-[#08172E] mb-3 block">Select your areas of expertise * (at least one)</label>
                  <CheckboxGrid
                    items={EXPERTISE_AND_SKILLS}
                    selected={[...formData.areasOfExpertise, ...formData.shadowSkills]}
                    onChange={(items) => {
                      const expertiseSet = new Set(EXPERTISE_AND_SKILLS.slice(0, 17));
                      const expertise = items.filter(i => expertiseSet.has(i));
                      const skills = items.filter(i => !expertiseSet.has(i));
                      setFormData({ ...formData, areasOfExpertise: expertise, shadowSkills: skills });
                    }}
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-[#08172E] mb-3 block">Leadership Style *</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {LEADERSHIP_STYLES.map((style) => (
                      <button
                        key={style.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, leadershipStyle: style.value as any })}
                        className={`flex flex-col items-start p-4 rounded-xl border-2 transition-all duration-150 text-left ${
                          formData.leadershipStyle === style.value
                            ? 'border-[#0C4DA2] bg-[#0C4DA2]/5 shadow-sm'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span className={`text-sm font-semibold ${
                          formData.leadershipStyle === style.value ? 'text-[#0C4DA2]' : 'text-[#08172E]'
                        }`}>{style.label}</span>
                        <span className="text-xs text-muted-foreground mt-0.5">{style.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mentoring Preferences */}
          <Card className="border-0 shadow-md rounded-xl overflow-hidden">
            <CardContent className="p-6">
              <SectionHeader icon={Target} title="Mentoring Preferences" subtitle="Your availability for mentoring" />
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-[#08172E] mb-3 block">Preferred Days</label>
                  <div className="flex flex-wrap gap-2">
                    {PREFERRED_DAYS.map((day) => {
                      const isSelected = formData.preferredDays?.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              preferredDays: isSelected
                                ? (prev.preferredDays || []).filter((d: string) => d !== day)
                                : [...(prev.preferredDays || []), day]
                            }));
                          }}
                          className={`px-4 py-2 rounded-full text-sm font-medium border transition-all duration-150 ${
                            isSelected
                              ? 'border-[#0C4DA2] bg-[#0C4DA2] text-white shadow-sm'
                              : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {day.slice(0, 3)}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Which days are you available for mentoring sessions?</p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-[#08172E] mb-1.5 block">Commitment & Availability</label>
                  <Textarea value={formData.commitmentAvailability} onChange={(e) => setFormData({ ...formData, commitmentAvailability: e.target.value })} placeholder="e.g., 1 hour per week, flexible schedule" rows={2} className="resize-none" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Personal Interests */}
          <Card className="border-0 shadow-md rounded-xl overflow-hidden">
            <CardContent className="p-6">
              <SectionHeader icon={Heart} title="Personal Interests" subtitle="Build rapport with your mentees" />
              <CheckboxGrid
                items={INTERESTS}
                selected={formData.personalInterests}
                onChange={(items) => setFormData({ ...formData, personalInterests: items })}
                columns={3}
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3 pt-2 pb-8">
            <Button
              variant="outline"
              onClick={() => router.push('/mentor/dashboard')}
              disabled={saving}
              className="px-6 h-12"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 h-12 bg-gradient-to-r from-[#00458E] to-[#0C4DA2] hover:from-[#003670] hover:to-[#0a3d82] text-white font-semibold shadow-lg"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
              ) : (
                <><Save className="w-4 h-4 mr-2" />Save Profile</>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
