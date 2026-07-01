// @ts-nocheck
'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BrandedHeader } from '@/components/branded-header';
import { ScrollText, Search, RefreshCw, Download } from 'lucide-react';

interface LogItem {
  id: string;
  action: string;
  description: string;
  performedByEmail: string | null;
  createdAt: string;
  mentee?: { user?: { name?: string; email?: string } } | null;
  mentor?: { user?: { name?: string; email?: string } } | null;
}

// Deterministic date formatter (explicit locale + timezone) to avoid hydration mismatches.
const fmtDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleString('en-GB', {
      timeZone: 'Africa/Lagos',
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
};

const actionColor = (action: string) => {
  const a = (action || '').toUpperCase();
  if (a.includes('DELETE') || a.includes('DEMOTE') || a.includes('DEACTIVAT') || a.includes('LOCK')) return 'bg-red-100 text-red-800 border-red-200';
  if (a.includes('CREATE') || a.includes('PROMOTE') || a.includes('UNLOCK') || a.includes('RESTORE') || a.includes('ACTIVAT')) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  if (a.includes('UPDATE') || a.includes('EDIT') || a.includes('RESET') || a.includes('CHANGE') || a.includes('ASSIGN')) return 'bg-blue-100 text-blue-800 border-blue-200';
  if (a.includes('LOGIN') || a.includes('AUTH')) return 'bg-amber-100 text-amber-800 border-amber-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
};

export default function AdminLogsPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('ALL');
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/admin/export/audit-logs');
      if (res.ok) {
        const data = await res.json();
        if (data.excelBase64 && data.filename) {
          const byteCharacters = atob(data.excelBase64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
          const blob = new Blob([new Uint8Array(byteNumbers)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
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

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/audit-logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(Array.isArray(data) ? data : (data.logs || []));
      }
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, []);

  const actionTypes = Array.from(new Set(logs.map((l) => l.action).filter(Boolean))).sort();

  const filtered = logs.filter((l) => {
    if (filterAction !== 'ALL' && l.action !== filterAction) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (l.description || '').toLowerCase().includes(q) ||
      (l.action || '').toLowerCase().includes(q) ||
      (l.performedByEmail || '').toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <BrandedHeader title="Activity Logs" subtitle="Audit trail of all administrative actions across the system" />
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by action, description or user..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={filterAction} onValueChange={setFilterAction}>
            <SelectTrigger className="w-full sm:w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Actions</SelectItem>
              {actionTypes.map((a) => (
                <SelectItem key={a} value={a}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchLogs} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />Refresh
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={exporting}>
            <Download className="w-4 h-4 mr-2" />{exporting ? 'Exporting...' : 'Export'}
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">{filtered.length} log entr{filtered.length !== 1 ? 'ies' : 'y'} shown</p>

        {loading ? (
          <p className="text-center text-muted-foreground py-10">Loading logs...</p>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <ScrollText className="w-10 h-10 mx-auto mb-3 opacity-40" />
              No activity logs found.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left">
                      <th className="px-4 py-3 font-semibold whitespace-nowrap">Date &amp; Time</th>
                      <th className="px-4 py-3 font-semibold">Action</th>
                      <th className="px-4 py-3 font-semibold">Description</th>
                      <th className="px-4 py-3 font-semibold whitespace-nowrap">Performed By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((l) => (
                      <tr key={l.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{fmtDate(l.createdAt)}</td>
                        <td className="px-4 py-3"><Badge className={actionColor(l.action)}>{l.action}</Badge></td>
                        <td className="px-4 py-3">{l.description || '—'}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{l.performedByEmail || 'System'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile cards */}
              <div className="md:hidden divide-y">
                {filtered.map((l) => (
                  <div key={l.id} className="p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Badge className={actionColor(l.action)}>{l.action}</Badge>
                      <span className="text-xs text-muted-foreground">{fmtDate(l.createdAt)}</span>
                    </div>
                    <p className="text-sm">{l.description || '—'}</p>
                    <p className="text-xs text-muted-foreground">By: {l.performedByEmail || 'System'}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
