/**
 * Storage Service Abstraction
 *
 * Currently backed by Supabase Storage.
 * To switch to Cloudflare R2 or S3:
 *   1. Set STORAGE_PROVIDER=r2 (or 's3') in .env
 *   2. Implement the R2/S3 branch below
 *   3. No other code changes needed
 */

import { supabase, STORAGE_BUCKETS } from '../config/supabase';

type BucketKey = keyof typeof STORAGE_BUCKETS;

export interface UploadResult {
  storagePath: string;
  provider: string;
  publicUrl?: string;
}

const PROVIDER = process.env.STORAGE_PROVIDER || 'supabase';

export async function uploadFile(
  bucket: BucketKey,
  filePath: string,
  fileBuffer: Buffer,
  mimeType: string
): Promise<UploadResult> {
  if (PROVIDER === 'supabase') {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKETS[bucket])
      .upload(filePath, fileBuffer, { contentType: mimeType, upsert: true });

    if (error) throw new Error(`Supabase upload failed: ${error.message}`);

    return {
      storagePath: data.path,
      provider: 'supabase',
    };
  }

  // Placeholder for Cloudflare R2 / AWS S3
  if (PROVIDER === 'r2') {
    // TODO: implement with @aws-sdk/client-s3 + R2 endpoint
    throw new Error('R2 storage not yet implemented — set STORAGE_PROVIDER=supabase');
  }

  throw new Error(`Unknown storage provider: ${PROVIDER}`);
}

export async function getSignedUrl(
  bucket: BucketKey,
  storagePath: string,
  expiresInSeconds = 3600
): Promise<string> {
  if (PROVIDER === 'supabase') {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKETS[bucket])
      .createSignedUrl(storagePath, expiresInSeconds);

    if (error) throw new Error(`Failed to create signed URL: ${error.message}`);
    return data.signedUrl;
  }

  throw new Error(`Signed URL not implemented for provider: ${PROVIDER}`);
}

export async function deleteFile(bucket: BucketKey, storagePath: string): Promise<void> {
  if (PROVIDER === 'supabase') {
    const { error } = await supabase.storage
      .from(STORAGE_BUCKETS[bucket])
      .remove([storagePath]);
    if (error) throw new Error(`Delete failed: ${error.message}`);
    return;
  }
  throw new Error(`Delete not implemented for provider: ${PROVIDER}`);
}
