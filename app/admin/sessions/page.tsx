'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BrandedHeader } from '@/components/branded-header';
import { StatCard } from '@/components/stat-card';
import {
  Calendar, Clock, CheckCircle2, XCircle, Search, Loader2,
  RefreshCw, Users, FileText, ArrowUpDown
} from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; color: string; bgClass: string; icon: any }> = {
  PENDING: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', bgClass: 'bg-yellow-50', icon: Clock },
  ACCEPTED: { label: 'Accepted', color: 'bg-blue-100 text-blue-800 border-blue-200', bgClass: 'bg-blue-50', icon: CheckCircle2 },
  DECLINED: { label: 'Declined', color: 'bg-red-100 text-red-800 border-red-200', bgClass: 'bg-red-50', icon: XCircle },
  COMPLETED: { label: 'Conducted', color: 'bg-green-100 text-green-800 border-green-200', bgClass: 'bg-green-50', icon: CheckCircle2 },
  CANCELLED: { label: 'Cancelled', color: 'bg-gray-100 text-gray-600 border-gray-200', bgClass: 'bg-gray-50', icon: XCircle },
  RESCHEDULED: { label: 'Rescheduled', color: 'bg-orange-100 text-orange-800 border-orange-200', bgClass: 'bg-orange-50', icon: RefreshCw },
};

interface SessionData {
  id: string;
  title: string;
  description: string | null;
  scheduledDate: string;
  meetingType: string;
  status: string;
  sessionNotes: string | null;
  menteeConfirmed: boolean;
  mentorConfirmed: boolean;
  mentee: { user: { name: string; email: string }; businessUnit?: string };
  mentor: { user: { name: string; email: string }; businessUnit?: string };
}

export default function AdminSessionsPage() {
  const { data: session, status: authStatus } = useSession() || {};
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  useEffect(() => {
    if (authStatus === 'authenticated' && session?.user?.role !== 'HR_ADMIN') {
      router.replace('/');
    }
  }, [authStatus, session, router]);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const res = await fetch('/api/admin/sessions');
        if (res.ok) {
          const data = await res.json();
          setSessions(data.sessions || []);
          setStatusCounts(data.statusCounts || {});
        }
      } catch (err) {
        console.error('Error fetching sessions:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, []);

  const totalSessions = sessions.length;
  const conductedCount = statusCounts['COMPLETED'] || 0;
  const rescheduledCount = statusCounts['RESCHEDULED'] || 0;
  const cancelledCount = statusCounts['CANCELLED'] || 0;
  const pendingCount = (statusCounts['PENDING'] || 0) + (statusCounts['ACCEPTED'] || 0);

  const filteredSessions = sessions
    .filter((s) => {
      if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          s.title.toLowerCase().includes(q) ||
          s.mentee.user.name.toLowerCase().includes(q) ||
          s.mentor.user.name.toLowerCase().includes(q) ||
          s.mentee.user.email.toLowerCase().includes(q) ||
          s.mentor.user.email.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(a.scheduledDate).getTime();
      const dateB = new Date(b.scheduledDate).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <BrandedHeader title="Sessions Report" subtitle="Admin Portal" />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#0C4DA2]" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <BrandedHeader title="Sessions Report" subtitle="Admin Portal" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#08172E]">All Sessions Report</h1>
          <p className="text-muted-foreground mt-1">Overview of all mentoring sessions across the programme</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          <StatCard title="Total Sessions" value={totalSessions} icon={Calendar} color="navy" />
          <StatCard title="Conducted" value={conductedCount} icon={CheckCircle2} color="green" />
          <StatCard title="Upcoming" value={pendingCount} icon={Clock} color="blue" />
          <StatCard title="Rescheduled" value={rescheduledCount} icon={RefreshCw} color="orange" />
          <StatCard title="Cancelled" value={cancelledCount} icon={XCircle} color="purple" />
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-md rounded-xl mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by title, mentee, or mentor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px] h-11">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
                className="flex items-center gap-1.5 px-4 h-11 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <ArrowUpDown className="w-4 h-4" />
                {sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Results count */}
        <p className="text-sm text-muted-foreground mb-4">
          Showing {filteredSessions.length} of {totalSessions} sessions
        </p>

        {/* Sessions Table */}
        {filteredSessions.length === 0 ? (
          <Card className="border-0 shadow-md rounded-xl">
            <CardContent className="py-12 text-center">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium text-gray-600">No sessions found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {searchQuery || statusFilter !== 'ALL' ? 'Try adjusting your filters' : 'No sessions have been booked yet'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredSessions.map((s) => {
              const sc = STATUS_CONFIG[s.status];
              const Icon = sc?.icon || Clock;
              const scheduledDate = new Date(s.scheduledDate);
              const isPast = scheduledDate < new Date();

              return (
                <Card key={s.id} className={`border-0 shadow-sm rounded-xl overflow-hidden hover:shadow-md transition-shadow`}>
                  <CardContent className="p-0">
                    <div className="flex">
                      {/* Status indicator bar */}
                      <div className={`w-1.5 flex-shrink-0 ${sc?.color?.split(' ')[0] || 'bg-gray-200'}`} />
                      <div className="flex-1 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            {/* Title and status */}
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                              <h3 className="font-semibold text-[#08172E] truncate">{s.title}</h3>
                              <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium ${sc?.color}`}>
                                <Icon className="w-3 h-3" />{sc?.label}
                              </span>
                            </div>

                            {/* Participants */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 mb-2">
                              <div className="flex items-center gap-1.5 text-sm">
                                <Users className="w-3.5 h-3.5 text-[#0C4DA2]" />
                                <span className="text-muted-foreground">Mentee:</span>
                                <span className="font-medium text-[#08172E] truncate">{s.mentee.user.name}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-sm">
                                <Users className="w-3.5 h-3.5 text-[#FF6F2B]" />
                                <span className="text-muted-foreground">Mentor:</span>
                                <span className="font-medium text-[#08172E] truncate">{s.mentor.user.name}</span>
                              </div>
                            </div>

                            {/* Date and meeting type */}
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {scheduledDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {scheduledDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <Badge variant="outline" className="text-xs font-normal">
                                {s.meetingType === 'VIRTUAL' ? '💻 Virtual' : s.meetingType === 'IN_PERSON' ? '🏢 In Person' : '🔄 Hybrid'}
                              </Badge>
                              {isPast && s.status === 'ACCEPTED' && (
                                <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700 border-amber-200">Overdue</Badge>
                              )}
                            </div>

                            {/* Session notes */}
                            {s.sessionNotes && (
                              <div className="mt-2 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1">
                                  <FileText className="w-3 h-3" /> Notes
                                </div>
                                <p className="text-xs text-gray-600 line-clamp-2">{s.sessionNotes}</p>
                              </div>
                            )}
                          </div>

                          {/* Confirmation indicators */}
                          <div className="flex-shrink-0 flex flex-col items-end gap-1">
                            <div className={`flex items-center gap-1 text-xs ${s.menteeConfirmed ? 'text-green-600' : 'text-gray-400'}`}>
                              <div className={`w-2 h-2 rounded-full ${s.menteeConfirmed ? 'bg-green-500' : 'bg-gray-300'}`} />
                              Mentee
                            </div>
                            <div className={`flex items-center gap-1 text-xs ${s.mentorConfirmed ? 'text-green-600' : 'text-gray-400'}`}>
                              <div className={`w-2 h-2 rounded-full ${s.mentorConfirmed ? 'bg-green-500' : 'bg-gray-300'}`} />
                              Mentor
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
