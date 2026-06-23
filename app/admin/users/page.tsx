// @ts-nocheck
'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BrandedHeader } from '@/components/branded-header';
import { PasswordInput } from '@/components/password-input';
import { Users, Search, KeyRound, ArrowLeftRight, Shield, UserCheck, GraduationCap, AlertTriangle } from 'lucide-react';

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

const roleBadge = (role: string) => {
  switch (role) {
    case 'HR_ADMIN':
      return <Badge className="bg-purple-100 text-purple-800 border-purple-200"><Shield className="w-3 h-3 mr-1" />Admin</Badge>;
    case 'MENTOR':
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200"><UserCheck className="w-3 h-3 mr-1" />Mentor</Badge>;
    case 'MENTEE':
      return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200"><GraduationCap className="w-3 h-3 mr-1" />Mentee</Badge>;
    default:
      return <Badge variant="outline">{role}</Badge>;
  }
};

export default function AdminUsersPage() {
  const { data: session } = useSession() || {};
  const router = useRouter();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('ALL');
  const [message, setMessage] = useState({ type: '', text: '' });

  // Password dialog
  const [pwdDialog, setPwdDialog] = useState(false);
  const [pwdUser, setPwdUser] = useState<UserItem | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);

  // Role conversion dialog
  const [roleDialog, setRoleDialog] = useState(false);
  const [roleUser, setRoleUser] = useState<UserItem | null>(null);
  const [targetRole, setTargetRole] = useState('');
  const [roleLoading, setRoleLoading] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handlePasswordChange = async () => {
    if (!pwdUser || !newPassword) return;
    setPwdLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: pwdUser.id, action: 'change_password', newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: `Password updated for ${pwdUser.email}` });
        setPwdDialog(false);
        setNewPassword('');
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to change password' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setPwdLoading(false);
    }
  };

  const handleRoleConvert = async () => {
    if (!roleUser || !targetRole) return;
    setRoleLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: roleUser.id, action: 'convert_role', newRole: targetRole }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: data.message });
        setRoleDialog(false);
        setTargetRole('');
        fetchUsers();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to convert role' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setRoleLoading(false);
    }
  };

  const filtered = users.filter((u) => {
    const matchSearch = u.name?.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === 'ALL' || u.role === filterRole;
    return matchSearch && matchRole;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[hsl(210,20%,97%)]">
        <BrandedHeader title="User Management" subtitle="Admin Portal" />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00458E]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(210,20%,97%)]">
      <BrandedHeader title="User Management" subtitle="Admin Portal" />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {message.text && (
          <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className={`mb-4 ${message.type === 'success' ? 'border-green-500 bg-green-50 text-green-800' : ''}`}>
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        <Card className="border-0 shadow-sm">
          <CardHeader className="bg-gradient-to-r from-[#00458E] to-[#0C4DA2] text-white rounded-t-xl">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              All Users ({users.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Roles</SelectItem>
                  <SelectItem value="HR_ADMIN">Admin</SelectItem>
                  <SelectItem value="MENTOR">Mentor</SelectItem>
                  <SelectItem value="MENTEE">Mentee</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Users list */}
            <div className="space-y-2">
              {filtered.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No users found</p>
              ) : (
                filtered.map((user) => (
                  <div
                    key={user.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border bg-white hover:shadow-sm transition-shadow"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-[#08172E] truncate">{user.name || 'No Name'}</span>
                        {roleBadge(user.role)}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-amber-700 border-amber-200 hover:bg-amber-50"
                        onClick={() => {
                          setPwdUser(user);
                          setNewPassword('');
                          setPwdDialog(true);
                        }}
                      >
                        <KeyRound className="w-3.5 h-3.5 mr-1" />
                        Password
                      </Button>
                      {user.role !== 'HR_ADMIN' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-blue-700 border-blue-200 hover:bg-blue-50"
                          onClick={() => {
                            setRoleUser(user);
                            setTargetRole(user.role === 'MENTOR' ? 'MENTEE' : 'MENTOR');
                            setRoleDialog(true);
                          }}
                        >
                          <ArrowLeftRight className="w-3.5 h-3.5 mr-1" />
                          Convert
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Password Change Dialog */}
      <Dialog open={pwdDialog} onOpenChange={setPwdDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-amber-600" />
              Change Password
            </DialogTitle>
            <DialogDescription>
              Set a new password for <strong>{pwdUser?.name || pwdUser?.email}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm font-medium mb-1 block">New Password</label>
              <PasswordInput
                placeholder="Min 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwdDialog(false)} disabled={pwdLoading}>
              Cancel
            </Button>
            <Button
              onClick={handlePasswordChange}
              disabled={pwdLoading || newPassword.length < 6}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {pwdLoading ? 'Updating...' : 'Update Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Conversion Dialog */}
      <Dialog open={roleDialog} onOpenChange={setRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-blue-600" />
              Convert User Role
            </DialogTitle>
            <DialogDescription>
              Convert <strong>{roleUser?.name || roleUser?.email}</strong> from {roleUser?.role} to a different role.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Alert className="border-amber-200 bg-amber-50">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <strong>Warning:</strong> Converting a user's role will delete their current profile data (assignments, preferences, sessions). This cannot be undone. A new empty profile will be created for their new role.
              </AlertDescription>
            </Alert>
            <div>
              <label className="text-sm font-medium mb-1 block">Current Role</label>
              <div className="flex items-center gap-2 py-2">{roleBadge(roleUser?.role || '')}</div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Convert To</label>
              <Select value={targetRole} onValueChange={setTargetRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select new role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MENTOR">Mentor</SelectItem>
                  <SelectItem value="MENTEE">Mentee</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialog(false)} disabled={roleLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleRoleConvert}
              disabled={roleLoading || !targetRole || targetRole === roleUser?.role}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {roleLoading ? 'Converting...' : 'Confirm Conversion'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
