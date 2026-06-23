'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { BrandedHeader } from '@/components/branded-header';
import { StatCard } from '@/components/stat-card';
import {
  Users, UserCheck, Search, ChevronDown, ChevronUp,
  BarChart3, Target, ArrowLeft, AlertTriangle, Download
} from 'lucide-react';

interface CalibrationMentor {
  mentorId: string;
  mentorName: string;
  mentorEmail: string;
  mentorBusinessUnit: string;
  mentorRole: string;
  areasOfExpertise: string[];
  leadershipStyle: string;
  level: number | null;
  tier: number | null;
  maxMentees: number;
  currentMenteeCount: number;
  selectionCount: number;
  selectedByMentees: {
    menteeId: string;
    menteeName: string;
    menteeEmail: string;
    menteeBusinessUnit: string;
    menteeRole: string;
    matchingScore: number;
    preferenceRank: number;
    competencyGaps: string[];
  }[];
  assignedMentees: {
    menteeId: string;
    menteeName: string;
    status: string;
  }[];
}

export default function CalibrationDashboard() {
  const { data: session } = useSession() || {};
  const router = useRouter();
  const [data, setData] = useState<CalibrationMentor[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedMentor, setExpandedMentor] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'selections' | 'capacity'>('selections');
  const [exporting, setExporting] = useState(false);

  const handleExportCalibration = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/admin/export/calibration');
      if (res.ok) {
        const data = await res.json();
        if (data.excelBase64 && data.filename) {
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
        }
      }
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/admin/calibration');
        if (res.ok) {
          const result = await res.json();
          setData(result.calibrationData);
          setSummary(result.summary);
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredData = data
    .filter((m) =>
      m.mentorName.toLowerCase().includes(search.toLowerCase()) ||
      m.mentorBusinessUnit.toLowerCase().includes(search.toLowerCase()) ||
      m.mentorRole.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'selections') return b.selectionCount - a.selectionCount;
      if (sortBy === 'capacity') return (b.maxMentees - b.currentMenteeCount) - (a.maxMentees - a.currentMenteeCount);
      return a.mentorName.localeCompare(b.mentorName);
    });

  if (loading) {
    return (
      <div className="min-h-screen">
        <BrandedHeader title="Calibration Dashboard" subtitle="Admin" />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="flex items-center gap-3 text-muted-foreground">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            Loading calibration data...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(210,20%,97%)]">
      <BrandedHeader title="Calibration Dashboard" subtitle="Admin" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <Button
          variant="ghost"
          className="mb-4 text-[hsl(211,100%,28%)]"
          onClick={() => router.push('/admin/dashboard')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        {/* Summary Stats */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
            <StatCard title="Total Mentors" value={summary.totalMentors} icon={Users} color="navy" />
            <StatCard title="Mentors Selected" value={summary.mentorsWithSelections} icon={UserCheck} color="green" />
            <StatCard title="Total Mentees" value={summary.totalMentees} icon={Users} color="blue" />
            <StatCard title="Assigned" value={summary.assignedMentees} icon={UserCheck} color="emerald" />
            <StatCard title="Pending" value={summary.pendingMentees} icon={Target} color="amber" />
          </div>
        )}

        {/* Download Report */}
        <div className="flex justify-end mb-4">
          <Button
            onClick={handleExportCalibration}
            disabled={exporting}
            variant="outline"
            className="border-[hsl(211,100%,28%)]/20 hover:bg-[hsl(211,100%,28%)]/5 hover:border-[hsl(211,100%,28%)]/40"
          >
            <Download className="w-4 h-4 mr-2 text-[hsl(211,100%,28%)]" />
            {exporting ? 'Exporting...' : 'Download Calibration Report'}
          </Button>
        </div>

        {/* Search & Sort */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search mentors by name, business unit, or role..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={sortBy === 'selections' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortBy('selections')}
            >
              <BarChart3 className="w-4 h-4 mr-1" /> By Selections
            </Button>
            <Button
              variant={sortBy === 'name' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortBy('name')}
            >
              By Name
            </Button>
            <Button
              variant={sortBy === 'capacity' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortBy('capacity')}
            >
              By Capacity
            </Button>
          </div>
        </div>

        {/* Mentor Cards */}
        <div className="space-y-4">
          {filteredData.map((mentor) => {
            const isExpanded = expandedMentor === mentor.mentorId;
            const isOverCapacity = mentor.selectionCount > mentor.maxMentees;

            return (
              <Card key={mentor.mentorId} className="border-0 shadow-sm overflow-hidden">
                <div
                  className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedMentor(isExpanded ? null : mentor.mentorId)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[hsl(211,100%,28%)] to-[hsl(213,87%,34%)] flex items-center justify-center text-white font-bold text-lg">
                        {mentor.mentorName.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{mentor.mentorName}</h3>
                        <p className="text-sm text-muted-foreground">
                          {mentor.mentorRole} &bull; {mentor.mentorBusinessUnit}
                          {mentor.level && <span className="ml-2">Level {mentor.level}</span>}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Selection count badge */}
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${mentor.selectionCount > 0 ? 'text-[hsl(211,100%,28%)]' : 'text-gray-400'}`}>
                          {mentor.selectionCount}
                        </div>
                        <p className="text-xs text-muted-foreground">Selected by</p>
                      </div>

                      {/* Capacity indicator */}
                      <div className="text-center">
                        <div className="flex items-center gap-1">
                          <span className={`text-lg font-bold ${isOverCapacity ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {mentor.currentMenteeCount}
                          </span>
                          <span className="text-muted-foreground">/</span>
                          <span className="text-lg text-muted-foreground">{mentor.maxMentees}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Capacity</p>
                      </div>

                      {isOverCapacity && (
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                      )}

                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {/* Expertise tags */}
                  <div className="flex flex-wrap gap-1.5 mt-3 ml-16">
                    {mentor.areasOfExpertise.slice(0, 5).map((area) => (
                      <Badge key={area} variant="secondary" className="text-xs">
                        {area}
                      </Badge>
                    ))}
                    {mentor.areasOfExpertise.length > 5 && (
                      <Badge variant="secondary" className="text-xs">+{mentor.areasOfExpertise.length - 5} more</Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {mentor.leadershipStyle ? mentor.leadershipStyle.charAt(0) + mentor.leadershipStyle.slice(1).toLowerCase().replace(/_/g, ' ') : 'N/A'}
                    </Badge>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t bg-muted/20 p-4">
                    <h4 className="font-semibold text-sm mb-3 text-[hsl(211,100%,28%)]">
                      Mentees Who Selected This Mentor ({mentor.selectionCount})
                    </h4>

                    {mentor.selectedByMentees.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">No mentees have selected this mentor yet.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2 px-3 font-medium text-muted-foreground">Mentee</th>
                              <th className="text-left py-2 px-3 font-medium text-muted-foreground">Role</th>
                              <th className="text-left py-2 px-3 font-medium text-muted-foreground">Business Unit</th>
                              <th className="text-left py-2 px-3 font-medium text-muted-foreground">Development Areas</th>
                              <th className="text-center py-2 px-3 font-medium text-muted-foreground">Match Score</th>
                              <th className="text-center py-2 px-3 font-medium text-muted-foreground">Pref. Rank</th>
                            </tr>
                          </thead>
                          <tbody>
                            {mentor.selectedByMentees.map((mentee) => (
                              <tr key={mentee.menteeId} className="border-b last:border-0 hover:bg-muted/30">
                                <td className="py-2 px-3">
                                  <p className="font-medium">{mentee.menteeName}</p>
                                  <p className="text-xs text-muted-foreground">{mentee.menteeEmail}</p>
                                </td>
                                <td className="py-2 px-3">{mentee.menteeRole}</td>
                                <td className="py-2 px-3">{mentee.menteeBusinessUnit}</td>
                                <td className="py-2 px-3">
                                  <div className="flex flex-wrap gap-1">
                                    {mentee.competencyGaps.slice(0, 3).map((gap) => (
                                      <Badge key={gap} variant="outline" className="text-xs">{gap}</Badge>
                                    ))}
                                    {mentee.competencyGaps.length > 3 && (
                                      <Badge variant="outline" className="text-xs">+{mentee.competencyGaps.length - 3}</Badge>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2 px-3 text-center">
                                  <Badge className={`${mentee.matchingScore >= 70 ? 'bg-emerald-100 text-emerald-800' : mentee.matchingScore >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
                                    {mentee.matchingScore?.toFixed(1)}%
                                  </Badge>
                                </td>
                                <td className="py-2 px-3 text-center">
                                  <span className="font-medium">#{mentee.preferenceRank}</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Currently assigned */}
                    {mentor.assignedMentees.length > 0 && (
                      <div className="mt-4 pt-3 border-t">
                        <h4 className="font-semibold text-sm mb-2 text-emerald-700">Currently Assigned Mentees</h4>
                        <div className="flex flex-wrap gap-2">
                          {mentor.assignedMentees.map((am) => (
                            <Badge key={am.menteeId} className="bg-emerald-100 text-emerald-800">
                              {am.menteeName} ({am.status})
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}

          {filteredData.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No mentors found matching your search.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
