// @ts-nocheck
'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { BrandedHeader } from '@/components/branded-header';
import {
  Download, Upload, FileSpreadsheet, Users, GraduationCap,
  CheckCircle2, XCircle, AlertTriangle, Image as ImageIcon, Loader2,
} from 'lucide-react';

interface UploadResult {
  row: number;
  name: string;
  email: string;
  status: 'created' | 'skipped' | 'error';
  message: string;
}

export default function BulkUploadPage() {
  const { data: session } = useSession() || {};
  const router = useRouter();

  // Data upload state
  const [uploadType, setUploadType] = useState<'mentor' | 'mentee' | null>(null);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<UploadResult[] | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // Photo upload state
  const [photoEmail, setPhotoEmail] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoMessage, setPhotoMessage] = useState({ type: '', text: '' });
  const [uploadedPhotos, setUploadedPhotos] = useState<{ email: string; url: string }[]>([]);
  const photoRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = async (type: 'mentor' | 'mentee') => {
    try {
      const res = await fetch(`/api/admin/bulk-upload/template?type=${type}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}_upload_template.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        setError('Failed to download template');
      }
    } catch (err) {
      setError('Error downloading template');
    }
  };

  const handleFileUpload = async () => {
    if (!fileRef.current?.files?.[0] || !uploadType) return;

    const file = fileRef.current.files[0];
    setUploading(true);
    setError('');
    setResults(null);
    setSummary(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', uploadType);

      const res = await fetch('/api/admin/bulk-upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setResults(data.results);
        setSummary(data.summary);
      } else {
        setError(data.error || 'Upload failed');
      }
    } catch (err) {
      setError('Network error during upload');
    } finally {
      setUploading(false);
    }
  };

  const handlePhotoUpload = async () => {
    if (!photoRef.current?.files?.[0] || !photoEmail) return;

    const file = photoRef.current.files[0];
    setPhotoUploading(true);
    setPhotoMessage({ type: '', text: '' });

    try {
      const formData = new FormData();
      formData.append('photo', file);
      formData.append('email', photoEmail.trim());

      const res = await fetch('/api/admin/bulk-upload/photos', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setPhotoMessage({ type: 'success', text: `Photo uploaded for ${photoEmail}` });
        setUploadedPhotos(prev => [...prev, { email: photoEmail, url: data.photoUrl }]);
        setPhotoEmail('');
        if (photoRef.current) photoRef.current.value = '';
      } else {
        setPhotoMessage({ type: 'error', text: data.error || 'Upload failed' });
      }
    } catch (err) {
      setPhotoMessage({ type: 'error', text: 'Network error' });
    } finally {
      setPhotoUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(210,20%,97%)]">
      <BrandedHeader title="Bulk Upload" subtitle="Admin Portal" />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Step 1: Download Templates */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="bg-gradient-to-r from-[#00458E] to-[#0C4DA2] text-white rounded-t-xl">
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              Step 1: Download Templates
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground mb-4">
              Download the Excel template, fill in the data following the instructions sheet, then upload the completed file.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => handleDownloadTemplate('mentor')}
                className="flex items-center gap-4 p-4 rounded-lg border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 hover:border-blue-300 transition-all text-left"
              >
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Users className="w-6 h-6 text-blue-700" />
                </div>
                <div>
                  <p className="font-semibold text-blue-900">Mentor Template</p>
                  <p className="text-xs text-blue-600">Includes: name, email, expertise, leadership style, tier, level & more</p>
                </div>
                <Download className="w-5 h-5 text-blue-500 ml-auto flex-shrink-0" />
              </button>

              <button
                onClick={() => handleDownloadTemplate('mentee')}
                className="flex items-center gap-4 p-4 rounded-lg border-2 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-300 transition-all text-left"
              >
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <GraduationCap className="w-6 h-6 text-emerald-700" />
                </div>
                <div>
                  <p className="font-semibold text-emerald-900">Mentee Template</p>
                  <p className="text-xs text-emerald-600">Includes: name, email, competency gaps, career goals, interests & more</p>
                </div>
                <Download className="w-5 h-5 text-emerald-500 ml-auto flex-shrink-0" />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Upload Data */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="bg-gradient-to-r from-[#FF6F2B] to-[#e85d1a] text-white rounded-t-xl">
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Step 2: Upload Data
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Upload type selection */}
              <div>
                <label className="text-sm font-medium mb-2 block">What are you uploading?</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setUploadType('mentor'); setResults(null); setSummary(null); }}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-all font-medium ${
                      uploadType === 'mentor'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-blue-300 text-gray-600'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    Mentor Data
                  </button>
                  <button
                    onClick={() => { setUploadType('mentee'); setResults(null); setSummary(null); }}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-all font-medium ${
                      uploadType === 'mentee'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-gray-200 hover:border-emerald-300 text-gray-600'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4" />
                    Mentee Data
                  </button>
                </div>
              </div>

              {/* File input */}
              {uploadType && (
                <div className="space-y-3">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                    <FileSpreadsheet className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground mb-2">Select your completed <strong>{uploadType}</strong> Excel file (.xlsx)</p>
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".xlsx,.xls"
                      className="block mx-auto text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#00458E] file:text-white hover:file:bg-[#003670] file:cursor-pointer"
                    />
                  </div>
                  <Button
                    onClick={handleFileUpload}
                    disabled={uploading}
                    className="w-full bg-[#00458E] hover:bg-[#003670] text-white"
                  >
                    {uploading ? (
                      <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Processing Upload...</span>
                    ) : (
                      <span className="flex items-center gap-2"><Upload className="w-4 h-4" />Upload {uploadType === 'mentor' ? 'Mentor' : 'Mentee'} Data</span>
                    )}
                  </Button>
                </div>
              )}

              {/* Results */}
              {summary && (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-3">
                    <Badge className="bg-gray-100 text-gray-800 border-gray-200 px-3 py-1 text-sm">
                      Total: {summary.total}
                    </Badge>
                    <Badge className="bg-green-100 text-green-800 border-green-200 px-3 py-1 text-sm">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      Created: {summary.created}
                    </Badge>
                    <Badge className="bg-amber-100 text-amber-800 border-amber-200 px-3 py-1 text-sm">
                      <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                      Skipped: {summary.skipped}
                    </Badge>
                    <Badge className="bg-red-100 text-red-800 border-red-200 px-3 py-1 text-sm">
                      <XCircle className="w-3.5 h-3.5 mr-1" />
                      Errors: {summary.errors}
                    </Badge>
                  </div>

                  <div className="max-h-64 overflow-y-auto border rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left">Row</th>
                          <th className="px-3 py-2 text-left">Name</th>
                          <th className="px-3 py-2 text-left">Email</th>
                          <th className="px-3 py-2 text-left">Status</th>
                          <th className="px-3 py-2 text-left">Message</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results?.map((r, idx) => (
                          <tr key={idx} className={`border-t ${
                            r.status === 'created' ? 'bg-green-50/50' :
                            r.status === 'skipped' ? 'bg-amber-50/50' : 'bg-red-50/50'
                          }`}>
                            <td className="px-3 py-2">{r.row}</td>
                            <td className="px-3 py-2 font-medium">{r.name}</td>
                            <td className="px-3 py-2 text-muted-foreground">{r.email}</td>
                            <td className="px-3 py-2">
                              {r.status === 'created' && <Badge className="bg-green-100 text-green-700 text-xs">Created</Badge>}
                              {r.status === 'skipped' && <Badge className="bg-amber-100 text-amber-700 text-xs">Skipped</Badge>}
                              {r.status === 'error' && <Badge className="bg-red-100 text-red-700 text-xs">Error</Badge>}
                            </td>
                            <td className="px-3 py-2 text-xs text-muted-foreground">{r.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Step 3: Upload Mentor Photos */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="bg-gradient-to-r from-[#0C4DA2] to-[#00458E] text-white rounded-t-xl">
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              Step 3: Upload Mentor Photos (Optional)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground mb-4">
              After uploading mentor data, you can add profile photos one at a time by entering the mentor's email and selecting their photo.
            </p>

            {photoMessage.text && (
              <Alert variant={photoMessage.type === 'error' ? 'destructive' : 'default'} className={`mb-4 ${photoMessage.type === 'success' ? 'border-green-500 bg-green-50 text-green-800' : ''}`}>
                <AlertDescription>{photoMessage.text}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                placeholder="Mentor's email address"
                value={photoEmail}
                onChange={(e) => setPhotoEmail(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00458E]"
              />
              <input
                ref={photoRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                className="text-sm text-gray-500 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 file:cursor-pointer"
              />
              <Button
                onClick={handlePhotoUpload}
                disabled={photoUploading || !photoEmail}
                className="bg-[#0C4DA2] hover:bg-[#00458E] text-white"
              >
                {photoUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span className="flex items-center gap-2"><Upload className="w-4 h-4" />Upload Photo</span>
                )}
              </Button>
            </div>

            {uploadedPhotos.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">Uploaded Photos:</p>
                <div className="flex flex-wrap gap-2">
                  {uploadedPhotos.map((p, i) => (
                    <Badge key={i} className="bg-green-100 text-green-700 border-green-200">
                      <CheckCircle2 className="w-3 h-3 mr-1" />{p.email}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
