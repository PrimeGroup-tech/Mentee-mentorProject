// @ts-nocheck
'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { BrandedHeader } from '@/components/branded-header';
import {
  Download, Upload, FileSpreadsheet, Users, GraduationCap,
  CheckCircle2, XCircle, AlertTriangle, Image as ImageIcon, Loader2, Trash2, Plus,
} from 'lucide-react';

interface UploadResult {
  row: number;
  name: string;
  email: string;
  status: 'created' | 'skipped' | 'error';
  message: string;
}

interface PhotoEntry {
  id: string;
  email: string;
  file: File | null;
  preview: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  message?: string;
}

// Resize image client-side if it exceeds maxSizeBytes
async function resizeImage(file: File, maxSizeBytes: number, maxDimension = 1200): Promise<File> {
  if (file.size <= maxSizeBytes) return file;

  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      let { width, height } = img;

      // Scale down to maxDimension
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);

      // Try quality levels until under maxSizeBytes
      let quality = 0.8;
      const tryCompress = () => {
        canvas.toBlob(
          (blob) => {
            if (blob && (blob.size <= maxSizeBytes || quality <= 0.3)) {
              const resizedFile = new File([blob], file.name, { type: 'image/jpeg' });
              resolve(resizedFile);
            } else {
              quality -= 0.1;
              tryCompress();
            }
          },
          'image/jpeg',
          quality
        );
      };
      tryCompress();
    };
    img.src = URL.createObjectURL(file);
  });
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

  // Multi-photo upload state
  const [photoEntries, setPhotoEntries] = useState<PhotoEntry[]>([]);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkMessage, setBulkMessage] = useState({ type: '', text: '' });
  const [uploadedPhotos, setUploadedPhotos] = useState<{ email: string; url: string }[]>([]);
  const multiPhotoRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = async (type: 'mentor' | 'mentee') => {
    try {
      const res = await fetch(`/api/admin/bulk-upload/template?type=${type}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}_template.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      setError('Failed to download template');
    }
  };

  const handleUpload = async () => {
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
        setResults(data.results || []);
        setSummary(data.summary || null);
      } else {
        setError(data.error || 'Upload failed');
      }
    } catch (err) {
      setError('Network error during upload');
    } finally {
      setUploading(false);
    }
  };

  // Add a new empty photo entry row
  const addPhotoEntry = () => {
    setPhotoEntries(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      email: '',
      file: null,
      preview: '',
      status: 'pending',
    }]);
  };

  // Update email for a photo entry
  const updateEntryEmail = (id: string, email: string) => {
    setPhotoEntries(prev => prev.map(e => e.id === id ? { ...e, email } : e));
  };

  // Set file for a photo entry
  const updateEntryFile = (id: string, file: File | null) => {
    const preview = file ? URL.createObjectURL(file) : '';
    setPhotoEntries(prev => prev.map(e => e.id === id ? { ...e, file, preview } : e));
  };

  // Remove a photo entry
  const removeEntry = (id: string) => {
    setPhotoEntries(prev => {
      const entry = prev.find(e => e.id === id);
      if (entry?.preview) URL.revokeObjectURL(entry.preview);
      return prev.filter(e => e.id !== id);
    });
  };

  // Handle bulk file selection — auto-creates entries
  const handleBulkFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newEntries: PhotoEntry[] = files.map(file => {
      // Try to extract email from filename (e.g., john@company.com.jpg)
      const nameWithoutExt = file.name.replace(/\.(jpeg|jpg|png|webp)$/i, '');
      const isEmail = /^[^@]+@[^@]+\.[^@]+$/.test(nameWithoutExt);

      return {
        id: Math.random().toString(36).substr(2, 9),
        email: isEmail ? nameWithoutExt.toLowerCase() : '',
        file,
        preview: URL.createObjectURL(file),
        status: 'pending' as const,
      };
    });

    setPhotoEntries(prev => [...prev, ...newEntries]);
    if (multiPhotoRef.current) multiPhotoRef.current.value = '';
  };

  // Upload all entries
  const handleBulkUpload = async () => {
    const validEntries = photoEntries.filter(e => e.file && e.email);
    if (validEntries.length === 0) return;

    setBulkUploading(true);
    setBulkMessage({ type: '', text: '' });

    // Mark all as uploading
    setPhotoEntries(prev => prev.map(e =>
      validEntries.find(v => v.id === e.id) ? { ...e, status: 'uploading' } : e
    ));

    const MAX_SIZE = 10 * 1024 * 1024; // 10MB

    // Upload one by one (more reliable than bulk FormData for large files)
    let successCount = 0;
    let failCount = 0;

    for (const entry of validEntries) {
      try {
        // Auto-resize if over 10MB
        const resizedFile = await resizeImage(entry.file!, MAX_SIZE);

        const formData = new FormData();
        formData.append('photo', resizedFile);
        formData.append('email', entry.email.trim());

        const res = await fetch('/api/admin/bulk-upload/photos', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();

        if (res.ok) {
          successCount++;
          setPhotoEntries(prev => prev.map(e =>
            e.id === entry.id ? { ...e, status: 'success', message: 'Uploaded' } : e
          ));
          setUploadedPhotos(prev => [...prev, { email: entry.email, url: data.photoUrl }]);
        } else {
          failCount++;
          setPhotoEntries(prev => prev.map(e =>
            e.id === entry.id ? { ...e, status: 'error', message: data.error || 'Failed' } : e
          ));
        }
      } catch (err) {
        failCount++;
        setPhotoEntries(prev => prev.map(e =>
          e.id === entry.id ? { ...e, status: 'error', message: 'Network error' } : e
        ));
      }
    }

    setBulkMessage({
      type: failCount === 0 ? 'success' : 'warning',
      text: `Uploaded ${successCount} of ${validEntries.length} photos${failCount > 0 ? ` (${failCount} failed)` : ''}`,
    });
    setBulkUploading(false);
  };

  // Clear completed entries
  const clearCompleted = () => {
    setPhotoEntries(prev => {
      prev.filter(e => e.status === 'success').forEach(e => { if (e.preview) URL.revokeObjectURL(e.preview); });
      return prev.filter(e => e.status !== 'success');
    });
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

        {/* Step 1: Download Template */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="bg-gradient-to-r from-[#0C4DA2] to-[#00458E] text-white rounded-t-xl">
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              Step 1: Download Template
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground mb-4">
              Download the Excel template and fill in the required information.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => handleDownloadTemplate('mentor')}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                <GraduationCap className="w-4 h-4" />
                Mentor Template
              </Button>
              <Button
                variant="outline"
                onClick={() => handleDownloadTemplate('mentee')}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                <Users className="w-4 h-4" />
                Mentee Template
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Upload Data */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="bg-gradient-to-r from-[#0C4DA2] to-[#00458E] text-white rounded-t-xl">
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Step 2: Upload Data
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <select
                value={uploadType || ''}
                onChange={(e) => setUploadType(e.target.value as 'mentor' | 'mentee')}
                className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00458E]"
              >
                <option value="">Select upload type...</option>
                <option value="mentor">Mentor Data</option>
                <option value="mentee">Mentee Data</option>
              </select>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="text-sm text-gray-500 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 file:cursor-pointer"
              />
              <Button
                onClick={handleUpload}
                disabled={uploading || !uploadType}
                className="bg-[#0C4DA2] hover:bg-[#00458E] text-white"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span className="flex items-center gap-2"><Upload className="w-4 h-4" />Upload</span>
                )}
              </Button>
            </div>

            {summary && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex gap-4 text-sm">
                  <Badge className="bg-green-100 text-green-700"><CheckCircle2 className="w-3 h-3 mr-1" />{summary.created || 0} Created</Badge>
                  <Badge className="bg-yellow-100 text-yellow-700"><AlertTriangle className="w-3 h-3 mr-1" />{summary.skipped || 0} Skipped</Badge>
                  <Badge className="bg-red-100 text-red-700"><XCircle className="w-3 h-3 mr-1" />{summary.errors || 0} Errors</Badge>
                </div>
              </div>
            )}

            {results && results.length > 0 && (
              <div className="max-h-60 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="pb-2">Row</th>
                      <th className="pb-2">Name</th>
                      <th className="pb-2">Email</th>
                      <th className="pb-2">Status</th>
                      <th className="pb-2">Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r, i) => (
                      <tr key={i} className="border-b">
                        <td className="py-1.5">{r.row}</td>
                        <td className="py-1.5">{r.name}</td>
                        <td className="py-1.5">{r.email}</td>
                        <td className="py-1.5">
                          {r.status === 'created' && <Badge className="bg-green-100 text-green-700">Created</Badge>}
                          {r.status === 'skipped' && <Badge className="bg-yellow-100 text-yellow-700">Skipped</Badge>}
                          {r.status === 'error' && <Badge className="bg-red-100 text-red-700">Error</Badge>}
                        </td>
                        <td className="py-1.5 text-muted-foreground">{r.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 3: Upload Mentor Photos (Multiple) */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="bg-gradient-to-r from-[#0C4DA2] to-[#00458E] text-white rounded-t-xl">
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              Step 3: Upload Mentor Photos (Optional)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground mb-2">
              Upload photos for multiple mentors at once. Add entries below and assign each photo to a mentor email.
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              <strong>Tip:</strong> Name your files as the mentor&apos;s email (e.g. <code>john@company.com.jpg</code>) and they will be auto-matched. Images over 10MB are automatically compressed.
            </p>

            {bulkMessage.text && (
              <Alert variant={bulkMessage.type === 'error' ? 'destructive' : 'default'} className={`mb-4 ${bulkMessage.type === 'success' ? 'border-green-500 bg-green-50 text-green-800' : bulkMessage.type === 'warning' ? 'border-yellow-500 bg-yellow-50 text-yellow-800' : ''}`}>
                <AlertDescription>{bulkMessage.text}</AlertDescription>
              </Alert>
            )}

            {/* Bulk file selector */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <input
                ref={multiPhotoRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                multiple
                onChange={handleBulkFileSelect}
                className="flex-1 text-sm text-gray-500 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 file:cursor-pointer"
              />
              <Button variant="outline" onClick={addPhotoEntry} className="flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add Entry Manually
              </Button>
            </div>

            {/* Photo entries list */}
            {photoEntries.length > 0 && (
              <div className="space-y-3 mb-4">
                {photoEntries.map((entry) => (
                  <div key={entry.id} className={`flex items-center gap-3 p-3 rounded-lg border ${
                    entry.status === 'success' ? 'bg-green-50 border-green-200' :
                    entry.status === 'error' ? 'bg-red-50 border-red-200' :
                    entry.status === 'uploading' ? 'bg-blue-50 border-blue-200' :
                    'bg-gray-50 border-gray-200'
                  }`}>
                    {/* Preview */}
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                      {entry.preview ? (
                        <img src={entry.preview} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <ImageIcon className="w-5 h-5" />
                        </div>
                      )}
                    </div>

                    {/* Email input */}
                    <input
                      type="email"
                      placeholder="mentor@company.com"
                      value={entry.email}
                      onChange={(e) => updateEntryEmail(entry.id, e.target.value)}
                      disabled={entry.status === 'uploading' || entry.status === 'success'}
                      className="flex-1 px-3 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#00458E] disabled:opacity-50"
                    />

                    {/* File picker for manual entries */}
                    {!entry.file && (
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={(e) => updateEntryFile(entry.id, e.target.files?.[0] || null)}
                        className="text-xs w-32 text-gray-500"
                      />
                    )}

                    {/* File name display */}
                    {entry.file && (
                      <span className="text-xs text-muted-foreground truncate max-w-[120px]" title={entry.file.name}>
                        {entry.file.name}
                      </span>
                    )}

                    {/* Status indicator */}
                    {entry.status === 'success' && <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />}
                    {entry.status === 'error' && (
                      <span className="text-xs text-red-600 flex-shrink-0 max-w-[150px] truncate" title={entry.message}>
                        {entry.message}
                      </span>
                    )}
                    {entry.status === 'uploading' && <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />}

                    {/* Remove button */}
                    {entry.status !== 'uploading' && (
                      <button onClick={() => removeEntry(entry.id)} className="text-gray-400 hover:text-red-500 flex-shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Action buttons */}
            {photoEntries.length > 0 && (
              <div className="flex gap-3">
                <Button
                  onClick={handleBulkUpload}
                  disabled={bulkUploading || photoEntries.filter(e => e.file && e.email && e.status === 'pending').length === 0}
                  className="bg-[#0C4DA2] hover:bg-[#00458E] text-white"
                >
                  {bulkUploading ? (
                    <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      Upload All ({photoEntries.filter(e => e.file && e.email && e.status === 'pending').length})
                    </span>
                  )}
                </Button>
                {photoEntries.some(e => e.status === 'success') && (
                  <Button variant="outline" onClick={clearCompleted}>
                    Clear Completed
                  </Button>
                )}
              </div>
            )}

            {/* Previously uploaded photos */}
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
