import { put, del, head } from '@vercel/blob';

/**
 * Upload a file to Vercel Blob storage (private store).
 * Returns the blob URL (not publicly accessible — use /api/blob/serve to access).
 */
export async function uploadFile(
  pathname: string,
  body: Buffer | ArrayBuffer | ReadableStream | string,
  contentType: string
): Promise<string> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const { url } = await put(pathname, body, {
    access: 'private',
    contentType,
    token,
  });
  return url;
}

/**
 * Delete a file from Vercel Blob storage by URL.
 */
export async function deleteFile(url: string): Promise<void> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  await del(url, { token });
}

/**
 * Get a downloadable URL for a private blob.
 * Returns a time-limited signed URL.
 */
export async function getBlobUrl(url: string): Promise<string> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const blobDetails = await head(url, { token });
  return blobDetails.url;
}
