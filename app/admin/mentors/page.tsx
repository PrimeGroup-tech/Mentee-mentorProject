// @ts-nocheck
'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Edit, User, Search, UserCheck, UserX, Users, Plus, X, Eye, EyeOff } from 'lucide-react';
import Image from 'next/image';
import { BrandedHeader } from '@/components/branded-header';
import { getLevelBadge } from '@/lib/level-config';

const BUSINESS_UNITS = ['PACE', 'PASS', 'WAEL', 'CINALT', 'MILE SQUARE', 'WESTON', 'PAL', 'PAGES', 'SYNERPET'];

const TIER_BADGES: Record<number, { label: string; color: string }> = {
  1: { label: 'Tier 1', color: 'bg-amber-100 text-amber-800' },
  2: { label: 'Tier 2', color: 'bg-blue-100 text-blue-800' },
  3: { label: 'Tier 3', color: 'bg-green-100 text-green-800' },
};

export default function AdminMentorsPage() {
  const { data: session } = useSession() || {};
  const router = useRouter();
  const [mentors, setMentors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterUnit, setFilterUnit] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [toggling, setToggling] = useState<string | null>(null);

  // Create mentor modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [newMentor, setNewMentor] = useState({
    name: '',
    email: '',
    password: '',
    role: '',
    businessUnit: '',
  });

  useEffect(() => {
    fetchMentors();
  }, []);

  const fetchMentors = async () => {
    try {
      const res = await fetch('/api/admin/mentors');
      if (res.ok) {
        const data = await res.json();
        setMentors(data);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleMentorStatus = async (mentorId: string) => {
    setToggling(mentorId);
    try {
      const res = await fetch(`/api/admin/mentors/${mentorId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchMentors();
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setToggling(null);
    }
  };

  const handleCreateMentor = async () => {
    setCreateError('');
    setCreateSuccess('');

    if (!newMentor.name.trim()) {
      setCreateError('Full name is required');
      return;
    }
    if (!newMentor.email.trim()) {
      setCreateError('Email is required');
      return;
    }
    if (!newMentor.password || newMentor.password.length < 6) {
      setCreateError('Password must be at least 6 characters');
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/admin/mentors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMentor),
      });

      const data = await res.json();

      if (res.ok) {
        setCreateSuccess(`Mentor "${data.mentor.name}" created successfully! They can now log in with their email and password.`);
        setNewMentor({ name: '', email: '', password: '', role: '', businessUnit: '' });
        fetchMentors();
        setTimeout(() => {
          setShowCreateModal(false);
          setCreateSuccess('');
        }, 3000);
      } else {
        setCreateError(data.error || 'Failed to create mentor');
      }
    } catch (err) {
      console.error('Error creating mentor:', err);
      setCreateError('Network error. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const filtered = mentors.filter(m => {
    const nameMatch = (m.user?.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (m.user?.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (m.role || '').toLowerCase().includes(search.toLowerCase());
    const unitMatch = filterUnit === 'ALL' || m.businessUnit === filterUnit;
    const statusMatch = filterStatus === 'ALL' ||
      (filterStatus === 'ACTIVE' && m.profileComplete) ||
      (filterStatus === 'INACTIVE' && !m.profileComplete);
    return nameMatch && unitMatch && statusMatch;
  });

  const activeCount = mentors.filter(m => m.profileComplete).length;
  const inactiveCount = mentors.filter(m => !m.profileComplete).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-[hsl(210,20%,97%)]">
        <BrandedHeader title="Mentor Management" subtitle="Admin Portal" />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-muted-foreground">Loading mentors...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(210,20%,97%)]">
      <BrandedHeader title="Mentor Management" subtitle="Admin Portal" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[hsl(216,70%,11%)]">Mentor Management</h1>
            <p className="text-sm text-muted-foreground">View, edit, and manage all mentor profiles</p>
          </div>
          <Button onClick={() => { setShowCreateModal(true); setCreateError(''); setCreateSuccess(''); }} className="bg-[hsl(22,100%,58%)] hover:bg-[hsl(22,100%,48%)] text-white shadow-lg shadow-[hsl(22,100%,58%)]/25">
            <Plus className="w-4 h-4 mr-2" />
            Create New Mentor
          </Button>
        </div>

        {/* Create Mentor Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-lg">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Create New Mentor</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowCreateModal(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {createError && (
                  <Alert variant="destructive">
                    <AlertDescription>{createError}</AlertDescription>
                  </Alert>
                )}
                {createSuccess && (
                  <Alert>
                    <AlertDescription className="text-green-700">{createSuccess}</AlertDescription>
                  </Alert>
                )}

                <div>
                  <label className="text-sm font-medium">Full Name *</label>
                  <Input
                    value={newMentor.name}
                    onChange={(e) => setNewMentor({ ...newMentor, name: e.target.value })}
                    placeholder="e.g., John Smith"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Email Address *</label>
                  <Input
                    type="email"
                    value={newMentor.email}
                    onChange={(e) => setNewMentor({ ...newMentor, email: e.target.value })}
                    placeholder="mentor@primeatlanticnigeria.com"
                  />
                  <p className="text-xs text-muted-foreground mt-1">This will be used for login</p>
                </div>

                <div>
                  <label className="text-sm font-medium">Password *</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={newMentor.password}
                      onChange={(e) => setNewMentor({ ...newMentor, password: e.target.value })}
                      placeholder="Minimum 6 characters"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Mentor will use this to log in</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Role / Title</label>
                    <Input
                      value={newMentor.role}
                      onChange={(e) => setNewMentor({ ...newMentor, role: e.target.value })}
                      placeholder="e.g., Senior Manager"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Business Unit</label>
                    <Select
                      value={newMentor.businessUnit}
                      onValueChange={(v) => setNewMentor({ ...newMentor, businessUnit: v })}
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

                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateMentor} disabled={creating}>
                    {creating ? 'Creating...' : 'Create Mentor'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{mentors.length}</p>
                  <p className="text-xs text-muted-foreground">Total Mentors</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <UserCheck className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">{activeCount}</p>
                  <p className="text-xs text-muted-foreground">Active Mentors</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <UserX className="w-8 h-8 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">{inactiveCount}</p>
                  <p className="text-xs text-muted-foreground">Inactive/Incomplete</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or role..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterUnit} onValueChange={setFilterUnit}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Business Unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Units</SelectItem>
                  {BUSINESS_UNITS.map(u => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Mentor List */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No mentors found matching your filters.
              </CardContent>
            </Card>
          ) : (
            filtered.map(mentor => (
              <Card key={mentor.id} className={!mentor.profileComplete ? 'opacity-70 border-dashed' : ''}>
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    {/* Photo */}
                    <div className="relative w-14 h-14 rounded-full overflow-hidden bg-muted flex items-center justify-center border flex-shrink-0">
                      {mentor.profilePhotoUrl ? (
                        <Image src={mentor.profilePhotoUrl} alt={mentor.user?.name || 'Mentor'} fill className="object-cover" />
                      ) : (
                        <User className="w-7 h-7 text-muted-foreground" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold truncate">{mentor.user?.name || 'Unnamed'}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          mentor.profileComplete
                            ? 'bg-green-100 text-green-700'
                            : 'bg-orange-100 text-orange-700'
                        }`}>
                          {mentor.profileComplete ? 'Active' : 'Inactive'}
                        </span>
                        {mentor.tier && TIER_BADGES[mentor.tier] && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIER_BADGES[mentor.tier].color}`}>
                            {TIER_BADGES[mentor.tier].label}
                          </span>
                        )}
                        {(() => {
                          const lvl = getLevelBadge(mentor.level);
                          return lvl ? (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${lvl.bgColor} ${lvl.color}`}>
                              Level {mentor.level}
                            </span>
                          ) : null;
                        })()}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{mentor.user?.email}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {mentor.businessUnit && <span className="bg-secondary px-2 py-0.5 rounded">{mentor.businessUnit}</span>}
                        {mentor.role && <span>{mentor.role}</span>}
                        <span>{mentor.currentMenteeCount}/{mentor.maxMentees} mentees</span>
                        {mentor.yearsOfExperience > 0 && <span>{mentor.yearsOfExperience}yr exp</span>}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/admin/mentors/${mentor.id}`)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant={mentor.profileComplete ? 'destructive' : 'default'}
                        size="sm"
                        disabled={toggling === mentor.id}
                        onClick={() => toggleMentorStatus(mentor.id)}
                      >
                        {toggling === mentor.id
                          ? '...'
                          : mentor.profileComplete
                            ? 'Deactivate'
                            : 'Activate'
                        }
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
