// @ts-nocheck
'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BrandedHeader } from '@/components/branded-header';
import {
  Calendar, Clock, Plus, Video, MapPin, CheckCircle2,
  XCircle, Loader2, MessageSquare, ArrowLeft, Send
} from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  PENDING: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
  ACCEPTED: { label: 'Accepted', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: CheckCircle2 },
  DECLINED: { label: 'Declined', color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
  COMPLETED: { label: 'Conducted', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle2 },
  CANCELLED: { label: 'Cancelled', color: 'bg-gray-100 text-gray-600 border-gray-200', icon: XCircle },
  RESCHEDULED: { label: 'Rescheduled', color: 'bg-orange-100 text-orange-800 border-orange-200', icon: Clock },
};

export default function MenteeSessionsPage() {
  const { data: session } = useSession() || {};
  const router = useRouter();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBooking, setShowBooking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [confirmNotes, setConfirmNotes] = useState('');
  const [sessionHeld, setSessionHeld] = useState(true);
  const [feedbackText, setFeedbackText] = useState('');

  const [form, setForm] = useState({
    title: '',
    description: '',
    scheduledDate: '',
    scheduledTime: '',
    duration: '60',
    meetingFormat: 'VIRTUAL',
    meetingLink: '',
    location: '',
  });

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

  const handleBook = async () => {
    setError('');
    setSuccess('');
    if (!form.title || !form.scheduledDate || !form.scheduledTime) {
      setError('Please fill in the title, date, and time');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          duration: parseInt(form.duration),
        }),
      });
      if (res.ok) {
        setSuccess('Session booked successfully! Your mentor will be notified.');
        setShowBooking(false);
        setForm({ title: '', description: '', scheduledDate: '', scheduledTime: '', duration: '60', meetingFormat: 'VIRTUAL', meetingLink: '', location: '' });
        fetchSessions();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to book session');
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirm = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm_mentee', sessionNotes: confirmNotes, sessionHeld, feedback: feedbackText }),
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

  const handleMarkComplete = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_complete', sessionNotes: confirmNotes, sessionHeld, feedback: feedbackText }),
      });
      if (res.ok) {
        setConfirmingId(null);
        setConfirmNotes('');
        setFeedbackText('');
        setSessionHeld(true);
        setSuccess('Session marked as completed!');
        fetchSessions();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCancel = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      });
      if (res.ok) fetchSessions();
    } catch (err) {
      console.error(err);
    }
  };

  const upcomingSessions = sessions.filter(s => ['PENDING', 'ACCEPTED'].includes(s.status));
  const pastSessions = sessions.filter(s => ['COMPLETED', 'DECLINED', 'CANCELLED'].includes(s.status));

  return (
    <div className="min-h-screen bg-[hsl(210,20%,97%)]">
      <BrandedHeader title="Mentoring Sessions" subtitle="Mentee Portal" />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push('/mentee/dashboard')} className="text-[#0C4DA2]">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-[#08172E]">My Sessions</h1>
              <p className="text-sm text-muted-foreground">Book and manage mentoring sessions</p>
            </div>
          </div>
          <Button
            onClick={() => { setShowBooking(!showBooking); setError(''); setSuccess(''); }}
            className="bg-gradient-to-r from-[#FF6F2B] to-[#e55a1a] hover:opacity-90 text-white shadow-lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            Book Session
          </Button>
        </div>

        {success && (
          <Alert className="mb-4 border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}
        {error && !showBooking && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Booking Form */}
        {showBooking && (
          <Card className="mb-6 border-2 border-[#FF6F2B]/20 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-[#FF6F2B]/5 to-transparent">
              <CardTitle className="text-lg flex items-center gap-2 text-[#FF6F2B]">
                <Calendar className="w-5 h-5" />
                Book a Mentoring Session
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {error && showBooking && (
                <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
              )}
              <div>
                <label className="text-sm font-medium">Session Title *</label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g., Career Development Discussion"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Topics you'd like to discuss..."
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium">Date *</label>
                  <Input type="date" value={form.scheduledDate} onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium">Time *</label>
                  <Input type="time" value={form.scheduledTime} onChange={(e) => setForm({ ...form, scheduledTime: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium">Duration (min)</label>
                  <Select value={form.duration} onValueChange={(v) => setForm({ ...form, duration: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 min</SelectItem>
                      <SelectItem value="60">60 min</SelectItem>
                      <SelectItem value="90">90 min</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Format</label>
                  <Select value={form.meetingFormat} onValueChange={(v) => setForm({ ...form, meetingFormat: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VIRTUAL">Virtual</SelectItem>
                      <SelectItem value="IN_PERSON">In-Person</SelectItem>
                      <SelectItem value="HYBRID">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {form.meetingFormat !== 'IN_PERSON' && (
                <div>
                  <label className="text-sm font-medium">Meeting Link</label>
                  <Input value={form.meetingLink} onChange={(e) => setForm({ ...form, meetingLink: e.target.value })} placeholder="https://teams.microsoft.com/..." />
                </div>
              )}
              {form.meetingFormat !== 'VIRTUAL' && (
                <div>
                  <label className="text-sm font-medium">Location</label>
                  <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g., Office B, 3rd Floor" />
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setShowBooking(false)}>Cancel</Button>
                <Button onClick={handleBook} disabled={submitting} className="bg-[#FF6F2B] hover:bg-[#e55a1a] text-white">
                  {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Booking...</> : <><Send className="w-4 h-4 mr-2" />Book Session</>}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upcoming Sessions */}
        <h2 className="text-lg font-bold text-[#08172E] mb-3 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[#0C4DA2]" /> Upcoming Sessions ({upcomingSessions.length})
        </h2>
        {upcomingSessions.length === 0 ? (
          <Card className="mb-8">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Calendar className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No upcoming sessions</p>
              <p className="text-sm mt-1">Book a session with your mentor to get started</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3 mb-8">
            {upcomingSessions.map((s) => {
              const sc = STATUS_CONFIG[s.status];
              const Icon = sc?.icon || Clock;
              return (
                <Card key={s.id} className="border-l-4 border-l-[#0C4DA2]">
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-semibold text-[#08172E]">{s.title}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${sc?.color}`}>
                            <Icon className="w-3 h-3 inline mr-1" />{sc?.label}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">with {s.mentor?.user?.name}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{new Date(s.scheduledDate).toLocaleDateString('en-GB')}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{s.scheduledTime}</span>
                          <span>{s.duration} min</span>
                          <span className="flex items-center gap-1">{s.meetingFormat === 'VIRTUAL' ? <Video className="w-3.5 h-3.5" /> : <MapPin className="w-3.5 h-3.5" />}{s.meetingFormat}</span>
                        </div>
                        {s.description && <p className="text-xs text-muted-foreground mt-2 italic">{s.description}</p>}
                      </div>
                      <div className="flex gap-2 flex-shrink-0 ml-4">
                        {s.status === 'ACCEPTED' && (
                          confirmingId === s.id ? (
                            <div className="space-y-2 w-56">
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
                                placeholder="Additional notes (optional)"
                                rows={2}
                                className="text-xs"
                              />
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={() => { setConfirmingId(null); setFeedbackText(''); }}>Cancel</Button>
                                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleMarkComplete(s.id)}>
                                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />Complete
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setConfirmingId(s.id)}>
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />Mark Completed
                            </Button>
                          )
                        )}
                        {s.status !== 'CANCELLED' && (
                          <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleCancel(s.id)}>Cancel</Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Past Sessions */}
        <h2 className="text-lg font-bold text-[#08172E] mb-3 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Past Sessions ({pastSessions.length})
        </h2>
        {pastSessions.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <p>No past sessions yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {pastSessions.map((s) => {
              const sc = STATUS_CONFIG[s.status];
              const Icon = sc?.icon || Clock;
              const needsConfirm = s.status === 'COMPLETED' || (s.status === 'ACCEPTED' && new Date(s.scheduledDate) < new Date() && !s.menteeConfirmed);
              return (
                <Card key={s.id} className={s.status === 'COMPLETED' ? 'border-l-4 border-l-emerald-500' : 'opacity-80'}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-semibold text-[#08172E]">{s.title}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${sc?.color}`}>
                            <Icon className="w-3 h-3 inline mr-1" />{sc?.label}
                          </span>
                          {s.menteeConfirmed && <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">You confirmed</span>}
                          {s.mentorConfirmed && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Mentor confirmed</span>}
                        </div>
                        <p className="text-sm text-muted-foreground">with {s.mentor?.user?.name}</p>
                        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                          <span>{new Date(s.scheduledDate).toLocaleDateString('en-GB')}</span>
                          <span>{s.scheduledTime}</span>
                          <span>{s.duration} min</span>
                        </div>
                        {s.menteeFeedback && <p className="text-xs mt-2 bg-emerald-50 p-2 rounded"><strong>Your feedback:</strong> {s.menteeFeedback}</p>}
                        {s.mentorFeedback && <p className="text-xs mt-1 bg-blue-50 p-2 rounded"><strong>Mentor feedback:</strong> {s.mentorFeedback}</p>}
                        {s.sessionNotes && <p className="text-xs text-muted-foreground mt-1 bg-gray-50 p-2 rounded italic">{s.sessionNotes}</p>}
                      </div>
                      <div className="flex flex-col gap-2 flex-shrink-0 ml-4">
                        {(s.status === 'ACCEPTED' && !s.menteeConfirmed) && (
                          confirmingId === s.id ? (
                            <div className="space-y-2 w-56">
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
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={() => { setConfirmingId(null); setFeedbackText(''); }}>Cancel</Button>
                                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleConfirm(s.id)}>
                                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />Confirm
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setConfirmingId(s.id)}>
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />Confirm Held
                            </Button>
                          )
                        )}
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
