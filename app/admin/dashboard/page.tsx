'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';

import { FileSpreadsheet, Users, UserCheck, ClipboardList, Download, CheckCircle2, Clock, AlertCircle, Search, X } from 'lucide-react';
import { BrandedHeader } from '@/components/branded-header';
import { StatCard } from '@/components/stat-card';

export default function AdminDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMentee, setSelectedMentee] = useState<string | null>(null);
  const [selectedMentor, setSelectedMentor] = useState<string | null>(null);
  const [submissionSearch, setSubmissionSearch] = useState('');


  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);

  const handleExport = async (exportType: string) => {
    setExporting(exportType);
    try {
      const res = await fetch(`/api/admin/export/${exportType}`);
      if (res.ok) {
        const data = await res.json();
        if (data.excelBase64 && data.filename) {
          try {
            const byteCharacters = atob(data.excelBase64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = data.filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
          } catch (dlErr) {
            console.error('Download error:', dlErr);
          }
        }
        const emailMsg = data.emailSent
          ? 'Email sent to tobiloba.obadara@Primeatlanticnigeria.com'
          : 'Email notification may be delayed';
        alert(`Report downloaded! ${emailMsg}. Records: ${data.recordCount || 0}`);
      } else {
        alert('Failed to generate report');
      }
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to generate report');
    } finally {
      setExporting(null);
    }
  };

  useEffect(() => {
    if ((session?.user as any)?.role !== 'HR_ADMIN') {
      router.push('/');
      return;
    }

    const fetchSubmissions = async () => {
      try {
        const res = await fetch('/api/admin/submissions');
        if (res.ok) setSubmissions(await res.json());
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissions();
  }, [session, router]);

  const handleConfirmAssignment = async () => {
    if (!selectedMentee || !selectedMentor) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/assignments/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          menteeId: selectedMentee,
          mentorId: selectedMentor,

        }),
      });
      if (res.ok) {
        setSelectedMentee(null);
        setSelectedMentor(null);

        const refreshRes = await fetch('/api/admin/submissions');
        if (refreshRes.ok) setSubmissions(await refreshRes.json());
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <BrandedHeader title="Admin" subtitle="Mentoring Dashboard" />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="flex items-center gap-3 text-muted-foreground">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            Loading dashboard...
          </div>
        </div>
      </div>
    );
  }

  const assignedCount = submissions.filter(s => s.assignment).length;
  const pendingCount = submissions.filter(s => !s.assignment).length;
  const currentMentee = selectedMentee ? submissions.find((m) => m.id === selectedMentee) : null;

  const filteredSubmissions = submissions.filter((mentee) => {
    const q = submissionSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      (mentee.user?.name || '').toLowerCase().includes(q) ||
      (mentee.user?.email || '').toLowerCase().includes(q) ||
      (mentee.role || '').toLowerCase().includes(q) ||
      (mentee.businessUnit || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-[hsl(210,20%,97%)]">
      <BrandedHeader title="Admin" subtitle="Mentoring Dashboard" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard title="Total Submissions" value={submissions.length} icon={ClipboardList} color="navy" />
          <StatCard title="Assigned" value={assignedCount} subtitle="Mentor-Mentee pairs" icon={CheckCircle2} color="green" />
          <StatCard title="Pending" value={pendingCount} subtitle="Awaiting assignment" icon={Clock} color="orange" />
          <div onClick={() => router.push('/admin/mentors')} className="cursor-pointer">
            <StatCard title="Manage Mentors" value="→" subtitle="View all mentors" icon={Users} color="blue" />
          </div>
        </div>

        {/* Export Reports */}
        <Card className="mb-8 border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-[hsl(22,100%,58%)]" />
              Export Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {[
                { key: 'mentee-submissions', label: 'Mentee Submissions' },
                { key: 'mentor-profiles', label: 'Mentor Profiles' },
                { key: 'assignments', label: 'Assignments' },
                { key: 'sessions', label: 'Sessions & Feedback' },
                { key: 'users', label: 'Users Report' },
                { key: 'audit-logs', label: 'Audit Logs' },
              ].map((report) => (
                <Button
                  key={report.key}
                  onClick={() => handleExport(report.key)}
                  disabled={exporting === report.key}
                  variant="outline"
                  className="border-[hsl(211,100%,28%)]/20 hover:bg-[hsl(211,100%,28%)]/5 hover:border-[hsl(211,100%,28%)]/40"
                >
                  <Download className="w-4 h-4 mr-2 text-[hsl(211,100%,28%)]" />
                  {exporting === report.key ? 'Exporting...' : report.label}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Excel reports download automatically. Email summary sent to: tobiloba.obadara@Primeatlanticnigeria.com
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Submissions List */}
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3 space-y-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-[hsl(211,100%,28%)]" />
                  Mentee Submissions ({filteredSubmissions.length}{submissionSearch.trim() ? ` of ${submissions.length}` : ''})
                </CardTitle>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Search by name, role or business unit..."
                    value={submissionSearch}
                    onChange={(e) => setSubmissionSearch(e.target.value)}
                    className="pl-10 pr-9"
                  />
                  {submissionSearch && (
                    <button
                      type="button"
                      onClick={() => setSubmissionSearch('')}
                      aria-label="Clear search"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {filteredSubmissions.length === 0 ? (
                    <div className="text-center py-10 text-sm text-muted-foreground">
                      No mentees match your search.
                    </div>
                  ) : filteredSubmissions.map((mentee) => (
                    <button
                      key={mentee.id}
                      onClick={() => setSelectedMentee(mentee.id)}
                      className={`w-full p-4 text-left rounded-xl transition-all duration-200 border ${
                        selectedMentee === mentee.id
                          ? 'border-[hsl(211,100%,28%)] bg-[hsl(211,100%,28%)]/5 shadow-sm'
                          : 'border-gray-100 hover:border-[hsl(211,100%,28%)]/30 hover:shadow-sm bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-[hsl(216,70%,11%)]">{mentee.user?.name}</div>
                          <div className="text-sm text-muted-foreground mt-0.5">
                            {mentee.role} • <span className="font-medium text-[hsl(211,100%,28%)]">{mentee.businessUnit}</span>
                          </div>
                        </div>
                        {mentee.assignment ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
                            <CheckCircle2 className="w-3 h-3" /> Assigned
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium">
                            <Clock className="w-3 h-3" /> Pending
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Assignment Panel */}
          <div>
            <Card className="border-0 shadow-sm sticky top-4">
              <CardHeader className="bg-gradient-to-r from-[hsl(211,100%,28%)] to-[hsl(213,87%,34%)] text-white rounded-t-xl">
                <CardTitle className="text-lg flex items-center gap-2">
                  <UserCheck className="w-5 h-5" />
                  Assign Mentor
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                {currentMentee ? (
                  <>
                    <div className="p-3 rounded-lg bg-[hsl(211,100%,28%)]/5 border border-[hsl(211,100%,28%)]/10">
                      <p className="text-xs text-muted-foreground">Selected Mentee</p>
                      <p className="font-semibold text-[hsl(216,70%,11%)]">{currentMentee.user?.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{currentMentee.role} • {currentMentee.businessUnit}</p>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-[hsl(216,70%,11%)]">Select Mentor</label>
                      <Select value={selectedMentor || ''} onValueChange={setSelectedMentor}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Choose a mentor" />
                        </SelectTrigger>
                        <SelectContent>
                          {currentMentee.preferences?.map((pref: any) => (
                            <SelectItem key={pref.mentorId} value={pref.mentorId}>
                              {pref.mentor?.user?.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>



                    <Button
                      onClick={handleConfirmAssignment}
                      disabled={!selectedMentor || submitting}
                      className="w-full h-11 bg-[hsl(22,100%,58%)] hover:bg-[hsl(22,100%,48%)] text-white font-semibold shadow-lg shadow-[hsl(22,100%,58%)]/25"
                    >
                      {submitting ? 'Confirming...' : 'Confirm Assignment'}
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <UserCheck className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">Select a mentee from the list to assign a mentor</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
