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
import { Users, Search, KeyRound, ArrowLeftRight, Shield, ShieldCheck, UserCheck, GraduationCap, AlertTriangle, Trash2, Ban, CheckCircle, UserPlus, Edit, MoreVertical, Lock, Unlock, Briefcase, RotateCcw } from 'lucide-react';
import { LEVEL_OPTIONS } from '@/lib/level-config';

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  adminLevel?: string;
  isActive: boolean;
  hasDualRole: boolean;
  createdAt: string;
  mustChangePassword?: boolean;
  failedLoginAttempts?: number;
  lockedAt?: string | null;
  mentee?: { id: string; profileComplete: boolean; businessUnit: string; role: string; gradeLevel?: number | null } | null;
  mentor?: { id: string; profileComplete: boolean; businessUnit: string; role: string } | null;
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
  const iAmSuperAdmin = (session?.user as any)?.adminLevel === 'SUPER_ADMIN';

  // Dialogs
  const [pwdDialog, setPwdDialog] = useState(false);
  const [pwdUser, setPwdUser] = useState<UserItem | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);

  const [roleDialog, setRoleDialog] = useState(false);
  const [roleUser, setRoleUser] = useState<UserItem | null>(null);
  const [targetRole, setTargetRole] = useState('');
  const [roleLoading, setRoleLoading] = useState(false);

  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleteUser, setDeleteUser] = useState<UserItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [editDialog, setEditDialog] = useState(false);
  const [editUser, setEditUser] = useState<UserItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const [menteeEditDialog, setMenteeEditDialog] = useState(false);
  const [menteeEditUser, setMenteeEditUser] = useState<UserItem | null>(null);
  const [menteeRole, setMenteeRole] = useState('');
  const [menteeGradeLevel, setMenteeGradeLevel] = useState('');
  const [menteeEditLoading, setMenteeEditLoading] = useState(false);

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionsOpen, setActionsOpen] = useState<string | null>(null);

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

  useEffect(() => { fetchUsers(); }, []);

  const doAction = async (userId: string, action: string, extra: any = {}) => {
    setActionLoading(userId);
    setMessage({ type: '', text: '' });
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action, ...extra }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: data.message });
        fetchUsers();
      } else {
        setMessage({ type: 'error', text: data.error || 'Operation failed' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setActionLoading(null);
      setActionsOpen(null);
    }
  };

  const handlePasswordChange = async () => {
    if (!pwdUser || !newPassword) return;
    setPwdLoading(true);
    await doAction(pwdUser.id, 'change_password', { newPassword });
    setPwdLoading(false);
    setPwdDialog(false);
    setNewPassword('');
  };

  const handleRoleConvert = async () => {
    if (!roleUser || !targetRole) return;
    setRoleLoading(true);
    await doAction(roleUser.id, 'convert_role', { newRole: targetRole });
    setRoleLoading(false);
    setRoleDialog(false);
    setTargetRole('');
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    setDeleteLoading(true);
    await doAction(deleteUser.id, 'delete_user');
    setDeleteLoading(false);
    setDeleteDialog(false);
  };

  const handleEditProfile = async () => {
    if (!editUser) return;
    setEditLoading(true);
    await doAction(editUser.id, 'update_profile', { name: editName, email: editEmail });
    setEditLoading(false);
    setEditDialog(false);
  };

  const handleMenteeProfileEdit = async () => {
    if (!menteeEditUser) return;
    setMenteeEditLoading(true);
    await doAction(menteeEditUser.id, 'update_mentee_profile', {
      role: menteeRole || undefined,
      gradeLevel: menteeGradeLevel ? parseInt(menteeGradeLevel) : undefined,
    });
    setMenteeEditLoading(false);
    setMenteeEditDialog(false);
  };

  const filtered = users.filter(u => {
    const matchSearch = !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === 'ALL' || u.role === filterRole || (u.hasDualRole && (filterRole === 'MENTOR' || filterRole === 'MENTEE'));
    return matchSearch && matchRole;
  });

  if (loading) {
    return (<div><BrandedHeader title="User Management" /><div className="max-w-5xl mx-auto p-6"><p className="text-center text-muted-foreground">Loading users...</p></div></div>);
  }

  return (
    <div>
      <BrandedHeader title="User Management" subtitle="Manage all user accounts, roles, and permissions" />
      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-4">
        {message.text && (
          <Alert className={message.type === 'success' ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}>
            <AlertDescription className={message.type === 'success' ? 'text-emerald-800' : 'text-red-800'}>{message.text}</AlertDescription>
          </Alert>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Roles</SelectItem>
              <SelectItem value="HR_ADMIN">Admin</SelectItem>
              <SelectItem value="MENTOR">Mentor</SelectItem>
              <SelectItem value="MENTEE">Mentee</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <p className="text-sm text-muted-foreground">{filtered.length} user{filtered.length !== 1 ? 's' : ''} found</p>

        {/* User Cards */}
        <div className="space-y-3">
          {filtered.map((u) => (
            <Card key={u.id} className={`border ${!u.isActive ? 'opacity-60 border-red-200 bg-red-50/30' : ''}`}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-[#08172E] truncate">{u.name || 'Unnamed'}</h3>
                      {roleBadge(u.role)}
                      {u.role === 'HR_ADMIN' && (
                        u.adminLevel === 'SUPER_ADMIN'
                          ? <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200"><ShieldCheck className="w-3 h-3 mr-1" />Super Admin</Badge>
                          : <Badge className="bg-slate-100 text-slate-700 border-slate-200"><Shield className="w-3 h-3 mr-1" />Standard Admin</Badge>
                      )}
                      {u.hasDualRole && <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">Dual Role</Badge>}
                      {!u.isActive && <Badge className="bg-red-100 text-red-700 border-red-200"><Ban className="w-3 h-3 mr-1" />Deactivated</Badge>}
                      {u.lockedAt && <Badge className="bg-orange-100 text-orange-700 border-orange-200"><Lock className="w-3 h-3 mr-1" />Locked</Badge>}
                      {u.mustChangePassword && <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200"><KeyRound className="w-3 h-3 mr-1" />Must Change Pwd</Badge>}
                      {u.mentor && u.role !== 'MENTOR' && <Badge variant="outline" className="text-xs">+Mentor</Badge>}
                      {u.mentee && u.role !== 'MENTEE' && <Badge variant="outline" className="text-xs">+Mentee</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Joined {new Date(u.createdAt).toLocaleDateString('en-GB')}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-4 relative">
                    {/* Quick actions */}
                    <Button variant="ghost" size="sm" title="Edit Profile" onClick={() => { setEditUser(u); setEditName(u.name || ''); setEditEmail(u.email); setEditDialog(true); }}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" title="Change Password" onClick={() => { setPwdUser(u); setPwdDialog(true); }}>
                      <KeyRound className="w-4 h-4" />
                    </Button>

                    {/* More actions dropdown */}
                    <div className="relative">
                      <Button variant="ghost" size="sm" onClick={() => setActionsOpen(actionsOpen === u.id ? null : u.id)}>
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                      {actionsOpen === u.id && (
                        <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-lg shadow-lg border z-50 py-1">
                          {/* Restore Access — one-click for blocked/locked/deactivated users */}
                          {(!u.isActive || u.lockedAt) && (
                            <button
                              type="button"
                              disabled={actionLoading === u.id}
                              className="w-full px-3 py-2 text-left text-sm font-semibold flex items-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-70 disabled:cursor-not-allowed"
                              onClick={() => doAction(u.id, 'unlock_account')}
                            >
                              <RotateCcw className="w-4 h-4 text-white" />
                              {actionLoading === u.id ? 'Restoring...' : 'Restore Access'}
                            </button>
                          )}

                          {/* Revoke Login (only when currently active) */}
                          {u.isActive && (
                            <button className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2" onClick={() => doAction(u.id, 'toggle_active')}>
                              <Ban className="w-4 h-4 text-red-500" />Revoke Login
                            </button>
                          )}

                          {/* Edit Mentee Profile */}
                          {u.mentee && (
                            <button className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2" onClick={() => { setMenteeEditUser(u); setMenteeRole(u.mentee?.role || ''); setMenteeGradeLevel(u.mentee?.gradeLevel ? String(u.mentee.gradeLevel) : ''); setMenteeEditDialog(true); setActionsOpen(null); }}>
                              <Briefcase className="w-4 h-4 text-teal-500" />Edit Mentee Job/Level
                            </button>
                          )}

                          {/* Convert role */}
                          {u.role !== 'HR_ADMIN' && (
                            <button className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2" onClick={() => { setRoleUser(u); setRoleDialog(true); setActionsOpen(null); }}>
                              <ArrowLeftRight className="w-4 h-4 text-blue-500" />Convert Role
                            </button>
                          )}

                          {/* Grant dual role */}
                          {u.role !== 'HR_ADMIN' && (
                            <>
                              {!u.mentor && (
                                <button className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2" onClick={() => doAction(u.id, 'grant_dual_role', { additionalRole: 'MENTOR' })}>
                                  <UserPlus className="w-4 h-4 text-blue-500" />Add Mentor Profile
                                </button>
                              )}
                              {!u.mentee && (
                                <button className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2" onClick={() => doAction(u.id, 'grant_dual_role', { additionalRole: 'MENTEE' })}>
                                  <UserPlus className="w-4 h-4 text-emerald-500" />Add Mentee Profile
                                </button>
                              )}
                            </>
                          )}

                          {/* Make/Demote Admin — Super Admin only */}
                          {iAmSuperAdmin && (
                            u.role !== 'HR_ADMIN' ? (
                              <button className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2" onClick={() => doAction(u.id, 'make_admin')}>
                                <Shield className="w-4 h-4 text-purple-500" />Promote to Admin
                              </button>
                            ) : (
                              <>
                                {/* Set privilege level */}
                                {u.adminLevel === 'SUPER_ADMIN' ? (
                                  u.id !== session?.user?.id && (
                                    <button className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2" onClick={() => doAction(u.id, 'set_admin_level', { adminLevel: 'STANDARD_ADMIN' })}>
                                      <Shield className="w-4 h-4 text-slate-500" />Set as Standard Admin
                                    </button>
                                  )
                                ) : (
                                  <button className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2" onClick={() => doAction(u.id, 'set_admin_level', { adminLevel: 'SUPER_ADMIN' })}>
                                    <ShieldCheck className="w-4 h-4 text-indigo-600" />Set as Super Admin
                                  </button>
                                )}
                                {u.id !== session?.user?.id && (
                                  <button className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2" onClick={() => doAction(u.id, 'demote_admin', { demoteTo: 'MENTEE' })}>
                                    <ArrowLeftRight className="w-4 h-4 text-amber-500" />Demote from Admin
                                  </button>
                                )}
                              </>
                            )
                          )}

                          {/* Delete — Super Admin only */}
                          {iAmSuperAdmin && (
                            <>
                              <hr className="my-1" />
                              <button className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2" onClick={() => { setDeleteUser(u); setDeleteDialog(true); setActionsOpen(null); }}>
                                <Trash2 className="w-4 h-4" />Delete User
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Edit className="w-5 h-5 text-blue-600" />Edit Profile</DialogTitle>
            <DialogDescription>Update profile for <strong>{editUser?.email}</strong></DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Name</label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Full Name" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Email</label>
              <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="Email" type="email" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)} disabled={editLoading}>Cancel</Button>
            <Button onClick={handleEditProfile} disabled={editLoading} className="bg-blue-600 hover:bg-blue-700 text-white">
              {editLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Change Dialog */}
      <Dialog open={pwdDialog} onOpenChange={setPwdDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><KeyRound className="w-5 h-5 text-amber-600" />Change Password</DialogTitle>
            <DialogDescription>Set a new password for <strong>{pwdUser?.name || pwdUser?.email}</strong></DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm font-medium mb-1 block">New Password</label>
              <PasswordInput placeholder="Min 6 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwdDialog(false)} disabled={pwdLoading}>Cancel</Button>
            <Button onClick={handlePasswordChange} disabled={pwdLoading || newPassword.length < 6} className="bg-amber-600 hover:bg-amber-700 text-white">
              {pwdLoading ? 'Updating...' : 'Update Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Conversion Dialog */}
      <Dialog open={roleDialog} onOpenChange={setRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ArrowLeftRight className="w-5 h-5 text-blue-600" />Convert User Role</DialogTitle>
            <DialogDescription>Convert <strong>{roleUser?.name || roleUser?.email}</strong> from {roleUser?.role} to a different role.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Alert className="border-amber-200 bg-amber-50">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <strong>Warning:</strong> Converting a user's role will delete their current profile data (assignments, preferences, sessions). This cannot be undone.
              </AlertDescription>
            </Alert>
            <div>
              <label className="text-sm font-medium mb-1 block">Current Role</label>
              <div className="flex items-center gap-2 py-2">{roleBadge(roleUser?.role || '')}</div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Convert To</label>
              <Select value={targetRole} onValueChange={setTargetRole}>
                <SelectTrigger><SelectValue placeholder="Select new role" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MENTOR">Mentor</SelectItem>
                  <SelectItem value="MENTEE">Mentee</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialog(false)} disabled={roleLoading}>Cancel</Button>
            <Button onClick={handleRoleConvert} disabled={roleLoading || !targetRole || targetRole === roleUser?.role} className="bg-blue-600 hover:bg-blue-700 text-white">
              {roleLoading ? 'Converting...' : 'Confirm Conversion'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600"><Trash2 className="w-5 h-5" />Delete User</DialogTitle>
            <DialogDescription>Are you sure you want to permanently delete <strong>{deleteUser?.name || deleteUser?.email}</strong>? This will remove all their data including profiles, assignments, and sessions.</DialogDescription>
          </DialogHeader>
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <AlertDescription className="text-red-800">This action cannot be undone.</AlertDescription>
          </Alert>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(false)} disabled={deleteLoading}>Cancel</Button>
            <Button onClick={handleDelete} disabled={deleteLoading} className="bg-red-600 hover:bg-red-700 text-white">
              {deleteLoading ? 'Deleting...' : 'Delete Permanently'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Mentee Profile Dialog */}
      <Dialog open={menteeEditDialog} onOpenChange={setMenteeEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Briefcase className="w-5 h-5 text-teal-600" />Edit Mentee Profile</DialogTitle>
            <DialogDescription>Update job role and grade level for <strong>{menteeEditUser?.name || menteeEditUser?.email}</strong></DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Job Role / Title</label>
              <Input value={menteeRole} onChange={(e) => setMenteeRole(e.target.value)} placeholder="e.g. Software Engineer" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Grade Level</label>
              <Select value={menteeGradeLevel} onValueChange={setMenteeGradeLevel}>
                <SelectTrigger><SelectValue placeholder="Select grade level" /></SelectTrigger>
                <SelectContent>
                  {LEVEL_OPTIONS.map((lvl) => (
                    <SelectItem key={lvl.value} value={String(lvl.value)}>{lvl.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMenteeEditDialog(false)} disabled={menteeEditLoading}>Cancel</Button>
            <Button onClick={handleMenteeProfileEdit} disabled={menteeEditLoading} className="bg-teal-600 hover:bg-teal-700 text-white">
              {menteeEditLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Click outside to close actions */}
      {actionsOpen && <div className="fixed inset-0 z-40" onClick={() => setActionsOpen(null)} />}
    </div>
  );
}
