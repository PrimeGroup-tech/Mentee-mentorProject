import { put, del } from '@vercel/blob';

/**
 * Upload a file to Vercel Blob storage.
 * Returns the public URL of the uploaded file.
 * 
 * On Vercel deployments, authentication is automatic via OIDC.
 * For local development, set BLOB_READ_WRITE_TOKEN in .env.local
 */
export async function uploadFile(
  pathname: string,
  body: Buffer | ArrayBuffer | ReadableStream | string,
  contentType: string
): Promise<string> {
  const { url } = await put(pathname, body, {
    access: 'public',
    contentType,
  });
  return url;
}

/**
 * Delete a file from Vercel Blob storage by URL.
 */
export async function deleteFile(url: string): Promise<void> {
  await del(url);
}
