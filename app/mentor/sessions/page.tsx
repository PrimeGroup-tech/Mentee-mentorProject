// @ts-nocheck
'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BrandedHeader } from '@/components/branded-header';
import {
  Calendar, Clock, CheckCircle2, XCircle, Video, MapPin,
  ArrowLeft, User, MessageSquare, ThumbsUp, ThumbsDown
} from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  PENDING: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
  ACCEPTED: { label: 'Accepted', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: CheckCircle2 },
  DECLINED: { label: 'Declined', color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
  COMPLETED: { label: 'Conducted', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle2 },
  CANCELLED: { label: 'Cancelled', color: 'bg-gray-100 text-gray-600 border-gray-200', icon: XCircle },
  RESCHEDULED: { label: 'Rescheduled', color: 'bg-orange-100 text-orange-800 border-orange-200', icon: Clock },
};

export default function MentorSessionsPage() {
  const { data: session } = useSession() || {};
  const router = useRouter();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [confirmNotes, setConfirmNotes] = useState('');
  const [confirmAction, setConfirmAction] = useState<string>('mark_complete');
  const [sessionHeld, setSessionHeld] = useState(true);
  const [feedbackText, setFeedbackText] = useState('');

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/sessions');
      if (res.ok) setSessions(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (sessionId: string, action: string, notes?: string) => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, sessionNotes: notes, sessionHeld, feedback: feedbackText }),
      });
      if (res.ok) {
        setConfirmingId(null);
        setConfirmNotes('');
        setFeedbackText('');
        setSessionHeld(true);
        fetchSessions();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const pendingSessions = sessions.filter(s => s.status === 'PENDING');
  const acceptedSessions = sessions.filter(s => s.status === 'ACCEPTED');
  const pastSessions = sessions.filter(s => ['COMPLETED', 'DECLINED', 'CANCELLED'].includes(s.status));

  if (loading) {
    return (
      <div className="min-h-screen bg-[hsl(210,20%,97%)]">
        <BrandedHeader title="Mentoring Sessions" subtitle="Mentor Portal" />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-muted-foreground">Loading sessions...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(210,20%,97%)]">
      <BrandedHeader title="Mentoring Sessions" subtitle="Mentor Portal" />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => router.push('/mentor/dashboard')} className="text-[#0C4DA2]">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-[#08172E]">Session Requests</h1>
            <p className="text-sm text-muted-foreground">Review and manage mentoring sessions</p>
          </div>
        </div>

        {/* Pending Requests */}
        {pendingSessions.length > 0 && (
          <>
            <h2 className="text-lg font-bold text-[#08172E] mb-3 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" /> Pending Requests ({pendingSessions.length})
            </h2>
            <div className="space-y-3 mb-8">
              {pendingSessions.map((s) => (
                <Card key={s.id} className="border-l-4 border-l-amber-400 shadow-md">
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-[#08172E] text-lg">{s.title}</h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <User className="w-3.5 h-3.5" /> Requested by {s.mentee?.user?.name}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{new Date(s.scheduledDate).toLocaleDateString('en-GB')}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{s.scheduledTime}</span>
                          <span>{s.duration} min</span>
                          <span className="flex items-center gap-1">{s.meetingFormat === 'VIRTUAL' ? <Video className="w-3.5 h-3.5" /> : <MapPin className="w-3.5 h-3.5" />}{s.meetingFormat}</span>
                        </div>
                        {s.description && <p className="text-sm text-muted-foreground mt-2 bg-amber-50 p-2 rounded italic">{s.description}</p>}
                      </div>
                      <div className="flex gap-2 flex-shrink-0 ml-4">
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleAction(s.id, 'accept')}>
                          <ThumbsUp className="w-3.5 h-3.5 mr-1" /> Accept
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleAction(s.id, 'decline')}>
                          <ThumbsDown className="w-3.5 h-3.5 mr-1" /> Decline
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* Accepted / Upcoming */}
        <h2 className="text-lg font-bold text-[#08172E] mb-3 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[#0C4DA2]" /> Upcoming Sessions ({acceptedSessions.length})
        </h2>
        {acceptedSessions.length === 0 ? (
          <Card className="mb-8">
            <CardContent className="py-8 text-center text-muted-foreground">
              <Calendar className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p>No upcoming sessions</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3 mb-8">
            {acceptedSessions.map((s) => (
              <Card key={s.id} className="border-l-4 border-l-[#0C4DA2]">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-[#08172E]">{s.title}</h3>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 font-medium">Accepted</span>
                      </div>
                      <p className="text-sm text-muted-foreground">with {s.mentee?.user?.name}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{new Date(s.scheduledDate).toLocaleDateString('en-GB')}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{s.scheduledTime}</span>
                        <span>{s.duration} min</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 flex-shrink-0 ml-4">
                      {confirmingId === s.id ? (
                        <div className="space-y-2 w-64">
                          <div className="flex gap-2 mb-1">
                            <Button size="sm" variant={confirmAction === 'mark_complete' ? 'default' : 'outline'} className={confirmAction === 'mark_complete' ? 'bg-emerald-600 hover:bg-emerald-700 text-white text-xs' : 'text-xs'} onClick={() => { setConfirmAction('mark_complete'); setSessionHeld(true); }}>Conducted</Button>
                            <Button size="sm" variant={confirmAction === 'cancel' ? 'default' : 'outline'} className={confirmAction === 'cancel' ? 'bg-red-600 hover:bg-red-700 text-white text-xs' : 'text-xs'} onClick={() => { setConfirmAction('cancel'); setSessionHeld(false); }}>Not Held</Button>
                          </div>
                          <label className="flex items-center gap-2 text-xs">
                            <input type="checkbox" checked={sessionHeld} onChange={(e) => setSessionHeld(e.target.checked)} className="rounded" />
                            <span>Session was held</span>
                          </label>
                          <Textarea
                            value={feedbackText}
                            onChange={(e) => setFeedbackText(e.target.value)}
                            placeholder="How did the session go? Share your feedback..."
                            rows={3}
                            className="text-xs"
                          />
                          <Textarea
                            value={confirmNotes}
                            onChange={(e) => setConfirmNotes(e.target.value)}
                            placeholder={confirmAction === 'mark_complete' ? 'Additional notes (optional)...' : 'Reason session was not held...'}
                            rows={2}
                            className="text-xs"
                          />
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => { setConfirmingId(null); setConfirmAction('mark_complete'); setFeedbackText(''); }}>Back</Button>
                            <Button size="sm" className={confirmAction === 'mark_complete' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'} onClick={() => handleAction(s.id, confirmAction, confirmNotes)}>
                              {confirmAction === 'mark_complete' ? <><CheckCircle2 className="w-3.5 h-3.5 mr-1" />Confirm</> : <><XCircle className="w-3.5 h-3.5 mr-1" />Cancel Session</>}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setConfirmingId(s.id)}>
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />Update Status
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Past Sessions */}
        <h2 className="text-lg font-bold text-[#08172E] mb-3 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Past Sessions ({pastSessions.length})
        </h2>
        {pastSessions.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <p>No past sessions</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {pastSessions.map((s) => {
              const sc = STATUS_CONFIG[s.status];
              const Icon = sc?.icon || Clock;
              return (
                <Card key={s.id} className={s.status === 'COMPLETED' ? 'border-l-4 border-l-emerald-500' : 'opacity-70'}>
                  <CardContent className="py-4">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-[#08172E]">{s.title}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${sc?.color}`}>
                        <Icon className="w-3 h-3 inline mr-1" />{sc?.label}
                      </span>
                      {s.menteeConfirmed && <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Mentee confirmed</span>}
                      {s.mentorConfirmed && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">You confirmed</span>}
                    </div>
                    <p className="text-sm text-muted-foreground">with {s.mentee?.user?.name} • {new Date(s.scheduledDate).toLocaleDateString('en-GB')}</p>
                    {s.mentorFeedback && <p className="text-xs mt-2 bg-blue-50 p-2 rounded"><strong>Your feedback:</strong> {s.mentorFeedback}</p>}
                    {s.menteeFeedback && <p className="text-xs mt-1 bg-emerald-50 p-2 rounded"><strong>Mentee feedback:</strong> {s.menteeFeedback}</p>}
                    {s.sessionNotes && <p className="text-xs text-muted-foreground mt-1 bg-gray-50 p-2 rounded italic">{s.sessionNotes}</p>}
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
