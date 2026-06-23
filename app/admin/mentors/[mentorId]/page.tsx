// @ts-nocheck
'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Upload, User, Save, Users } from 'lucide-react';
import Image from 'next/image';
import { BrandedHeader } from '@/components/branded-header';
import { LEVEL_OPTIONS } from '@/lib/level-config';

const BUSINESS_UNITS = ['PACE', 'PASS', 'WAEL', 'CINALT', 'MILE SQUARE', 'WESTON', 'PAL', 'PAGES'];

const EXPERTISE_AREAS = [
  'Strategic Thinking & Visioning', 'Financial Oversight & Acumen', 'Stakeholder Management',
  'Leading Diverse Teams', 'Emotional Intelligence', 'Change Management & Resilience',
  'Technology & AI Integration', 'Communication & Public Speaking', 'Team Building',
  'People Management', 'Problem Solving', 'Technical Acumen',
  'Industry Knowledge', 'Functional Knowledge', 'Conflict Resolution',
  'Executive Presence', 'Culture Building'
];

const INTERESTS = [
  'Technology', 'Reading', 'Photography', 'Cooking',
  'Travel', 'Music', 'Sports', 'Volunteering',
  'Content Creation', 'Wellness', 'Politics', 'Dancing',
  'Golf', 'Hiking', 'Negotiation', 'Networking',
  'Current Affairs', 'Movies', 'Geography', 'Socializing', 'Animals'
];

const SOFT_SKILLS = [
  'Active Listening', 'Constructive Conflict Resolution', 'Emotional Intelligence',
  'Adaptability', 'Constructive Feedback Reception', 'Time Management & Organisation',
  'Mentoring & Coaching', 'Negotiation & Influence', 'Cross-functional Collaboration',
  'Strategic Networking', 'Innovation & Creative Thinking',
  'Empathy', 'Assertiveness', 'Collaboration', 'Critical Thinking',
  'Creativity & Innovation', 'Resilience'
];

const LEADERSHIP_STYLES = [
  { value: 'DIRECT', label: 'Direct' },
  { value: 'COLLABORATIVE', label: 'Collaborative' },
  { value: 'ANALYTICAL', label: 'Analytical' },
  { value: 'SUPPORTIVE', label: 'Supportive' },
  { value: 'VISIONARY', label: 'Visionary' },
];

export default function AdminEditMentorPage() {
  const { data: session } = useSession() || {};
  const router = useRouter();
  const params = useParams();
  const mentorId = params?.mentorId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [mentorEmail, setMentorEmail] = useState('');
  const [assignedMentees, setAssignedMentees] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    userName: '',
    userEmail: '',
    role: '',
    businessUnit: '',
    yearsOfExperience: 0,
    areasOfExpertise: [] as string[],
    leadershipStyle: 'COLLABORATIVE',
    coachingGoals: '',
    personalInterests: [] as string[],
    shadowSkills: [] as string[],
    commitmentAvailability: '',
    maxMentees: 5,
    organizationalChallenge: '',
    shortBio: '',
    tier: null as number | null,
    level: null as number | null,
    profileComplete: false,
  });

  useEffect(() => {
    if (!mentorId) return;
    const fetchMentor = async () => {
      try {
        const res = await fetch(`/api/admin/mentors/${mentorId}`);
        if (res.ok) {
          const data = await res.json();
          setFormData({
            userName: data.user?.name || '',
            userEmail: data.user?.email || '',
            role: data.role || '',
            businessUnit: data.businessUnit || '',
            yearsOfExperience: data.yearsOfExperience || 0,
            areasOfExpertise: data.areasOfExpertise || [],
            leadershipStyle: data.leadershipStyle || 'COLLABORATIVE',
            coachingGoals: data.coachingGoals || '',
            personalInterests: data.personalInterests || [],
            shadowSkills: data.shadowSkills || [],
            commitmentAvailability: data.commitmentAvailability || '',
            maxMentees: data.maxMentees || 5,
            organizationalChallenge: data.organizationalChallenge || '',
            shortBio: data.shortBio || '',
            tier: data.tier || null,
            level: data.level || null,
            profileComplete: data.profileComplete || false,
          });
          setProfilePhotoUrl(data.profilePhotoUrl || null);
          setMentorEmail(data.user?.email || '');
          setAssignedMentees(
            (data.assignments || []).map((a: any) => ({
              name: a.mentee?.user?.name || 'Unknown',
              email: a.mentee?.user?.email || '',
              status: a.status,
            }))
          );
        } else {
          setError('Mentor not found');
        }
      } catch (err) {
        console.error('Error:', err);
        setError('Failed to load mentor data');
      } finally {
        setLoading(false);
      }
    };
    fetchMentor();
  }, [mentorId]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Only JPEG, PNG, and WebP are allowed.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File size too large. Maximum 5MB.');
      return;
    }

    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
    setError('');
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const fd = new FormData();
      fd.append('profileData', JSON.stringify(formData));
      if (photoFile) {
        fd.append('photo', photoFile);
      }

      const res = await fetch(`/api/admin/mentors/${mentorId}`, {
        method: 'PUT',
        body: fd,
      });

      if (res.ok) {
        const data = await res.json();
        setSuccess('Mentor profile updated successfully!');
        setPhotoFile(null);
        setPhotoPreview(null);
        if (data.mentor?.profilePhotoUrl) {
          setProfilePhotoUrl(data.mentor.profilePhotoUrl);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to save');
      }
    } catch (err) {
      console.error('Save error:', err);
      setError('Error saving mentor profile');
    } finally {
      setSaving(false);
    }
  };

  const toggleArrayItem = (field: string, item: string) => {
    setFormData(prev => {
      const arr = (prev as any)[field] as string[];
      return {
        ...prev,
        [field]: arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item],
      };
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[hsl(210,20%,97%)]">
        <BrandedHeader title="Edit Mentor" subtitle="Admin Portal" />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-muted-foreground">Loading mentor profile...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(210,20%,97%)]">
      <BrandedHeader title="Edit Mentor" subtitle="Admin Portal" />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => router.push('/admin/mentors')} className="text-[hsl(211,100%,28%)]">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-[hsl(216,70%,11%)]">Edit Mentor Profile</h1>
            <p className="text-sm text-muted-foreground">{mentorEmail}</p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert className="mb-4 border-green-300 bg-green-50">
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {/* Profile Photo */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Profile Picture</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="relative w-28 h-28 rounded-full overflow-hidden bg-muted flex items-center justify-center border-2 border-border">
                {photoPreview ? (
                  <Image src={photoPreview} alt="Preview" fill className="object-cover" />
                ) : profilePhotoUrl ? (
                  <Image src={profilePhotoUrl} alt="Profile" fill className="object-cover" />
                ) : (
                  <User className="w-14 h-14 text-muted-foreground" />
                )}
              </div>
              <div>
                <input
                  type="file"
                  id="admin-photo-upload"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('admin-photo-upload')?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {profilePhotoUrl || photoPreview ? 'Change Photo' : 'Upload Photo'}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">JPG, PNG or WebP. Max 5MB.</p>
                {photoFile && (
                  <p className="text-xs text-primary mt-1">New photo selected — will upload on save.</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Basic Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Full Name *</label>
              <Input
                value={formData.userName}
                onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                placeholder="Mentor's full name"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Email Address *</label>
              <Input
                type="email"
                value={formData.userEmail}
                onChange={(e) => setFormData({ ...formData, userEmail: e.target.value })}
                placeholder="mentor@example.com"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Used for login and system notifications
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Role / Title *</label>
                <Input
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  placeholder="e.g., Senior Manager"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Business Unit *</label>
                <Select
                  value={formData.businessUnit}
                  onValueChange={(v) => setFormData({ ...formData, businessUnit: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {BUSINESS_UNITS.map(u => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium">Years of Experience</label>
                <Input
                  type="number"
                  min="0"
                  max="50"
                  value={formData.yearsOfExperience}
                  onChange={(e) => setFormData({ ...formData, yearsOfExperience: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Max Mentees (1-10)</label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.maxMentees}
                  onChange={(e) => setFormData({ ...formData, maxMentees: parseInt(e.target.value) || 5 })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Mentor Tier</label>
                <Select
                  value={formData.tier ? String(formData.tier) : 'none'}
                  onValueChange={(v) => setFormData({ ...formData, tier: v === 'none' ? null : parseInt(v) })}
                >
                  <SelectTrigger><SelectValue placeholder="Assign tier" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Tier</SelectItem>
                    <SelectItem value="1">Tier 1 — Executive Leadership</SelectItem>
                    <SelectItem value="2">Tier 2 — Senior Management</SelectItem>
                    <SelectItem value="3">Tier 3 — Mid-Level / Emerging Leaders</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">Visible to mentees on profiles</p>
              </div>
              <div>
                <label className="text-sm font-medium">Mentor Level</label>
                <Select
                  value={formData.level ? String(formData.level) : 'none'}
                  onValueChange={(v) => setFormData({ ...formData, level: v === 'none' ? null : parseInt(v) })}
                >
                  <SelectTrigger><SelectValue placeholder="Assign level" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Level</SelectItem>
                    {LEVEL_OPTIONS.map(l => (
                      <SelectItem key={l.value} value={String(l.value)}>{l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">Level 11-22</p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Short Bio</label>
              <Textarea
                value={formData.shortBio}
                onChange={(e) => setFormData({ ...formData, shortBio: e.target.value })}
                rows={3}
                placeholder="Brief introduction about the mentor"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Leadership Style</label>
              <Select
                value={formData.leadershipStyle}
                onValueChange={(v) => setFormData({ ...formData, leadershipStyle: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEADERSHIP_STYLES.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="profileComplete"
                checked={formData.profileComplete}
                onCheckedChange={(checked) => setFormData({ ...formData, profileComplete: !!checked })}
              />
              <label htmlFor="profileComplete" className="text-sm font-medium">
                Profile Active (visible to mentees)
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Expertise & Skills */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Expertise & Skills</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Areas of Expertise & Skills</label>
              <div className="grid grid-cols-3 gap-2">
                {[...EXPERTISE_AREAS, ...SOFT_SKILLS].map(item => {
                  const isExpertise = EXPERTISE_AREAS.includes(item);
                  const field = isExpertise ? 'areasOfExpertise' : 'shadowSkills';
                  const checked = isExpertise ? formData.areasOfExpertise.includes(item) : formData.shadowSkills.includes(item);
                  return (
                    <div key={item} className="flex items-center gap-2">
                      <Checkbox
                        id={`skill-${item}`}
                        checked={checked}
                        onCheckedChange={() => toggleArrayItem(field, item)}
                      />
                      <label htmlFor={`skill-${item}`} className="text-sm">{item}</label>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mentoring Preferences */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Mentoring Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Commitment & Availability</label>
              <Textarea
                value={formData.commitmentAvailability}
                onChange={(e) => setFormData({ ...formData, commitmentAvailability: e.target.value })}
                rows={2}
                placeholder="e.g., Available weekly on Tuesdays"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Organizational Challenge</label>
              <Textarea
                value={formData.organizationalChallenge}
                onChange={(e) => setFormData({ ...formData, organizationalChallenge: e.target.value })}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Personal Interests */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Personal Interests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {INTERESTS.map(interest => (
                <div key={interest} className="flex items-center gap-2">
                  <Checkbox
                    id={`int-${interest}`}
                    checked={formData.personalInterests.includes(interest)}
                    onCheckedChange={() => toggleArrayItem('personalInterests', interest)}
                  />
                  <label htmlFor={`int-${interest}`} className="text-sm">{interest}</label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Assigned Mentees */}
        {assignedMentees.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5" />
                Assigned Mentees ({assignedMentees.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {assignedMentees.map((m, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{m.email}</p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary">{m.status}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Save Button */}
        <div className="flex gap-4 mb-12">
          <Button variant="outline" onClick={() => router.push('/admin/mentors')}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="min-w-[140px]">
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
