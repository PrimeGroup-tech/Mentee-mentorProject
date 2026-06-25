import { NextResponse } from 'next/server';
import { get } from '@vercel/blob';

export const dynamic = 'force-dynamic';

/**
 * Serves private blob files by proxying them through this API route.
 * Usage: /api/blob/serve?url=<blob-url>
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const blobUrl = searchParams.get('url');

    if (!blobUrl) {
      return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      return NextResponse.json({ error: 'Blob storage not configured' }, { status: 500 });
    }

    const blob = await get(blobUrl, { token });
    if (!blob) {
      return NextResponse.json({ error: 'Blob not found' }, { status: 404 });
    }

    // Stream the blob content
    const response = new NextResponse(blob.body as ReadableStream, {
      headers: {
        'Content-Type': blob.contentType || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Length': String(blob.size),
      },
    });

    return response;
  } catch (error: any) {
    console.error('Blob serve error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve file' },
      { status: 500 }
    );
  }
}
