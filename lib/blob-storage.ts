import { put, del } from '@vercel/blob';

/**
 * Upload a file to Vercel Blob storage.
 * Requires a PUBLIC blob store and BLOB_READ_WRITE_TOKEN env var.
 */
export async function uploadFile(
  pathname: string,
  body: Buffer | ArrayBuffer | ReadableStream | string,
  contentType: string
): Promise<string> {
  const { url } = await put(pathname, body, {
    access: 'public',
    contentType,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  return url;
}

/**
 * Delete a file from Vercel Blob storage by URL.
 */
export async function deleteFile(url: string): Promise<void> {
  await del(url, { token: process.env.BLOB_READ_WRITE_TOKEN });
}
