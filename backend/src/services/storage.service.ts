/**
 * Storage Service Abstraction
 * mock — no external storage (API starts without Supabase; uploads store path only)
 * supabase — Supabase Storage (requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)
 */

import { getSupabase, isSupabaseConfigured, STORAGE_BUCKETS } from '../config/supabase';

type BucketKey = keyof typeof STORAGE_BUCKETS;

export interface UploadResult {
  storagePath: string;
  provider: string;
  publicUrl?: string;
}

function resolveProvider(): string {
  const configured = process.env.STORAGE_PROVIDER;
  if (configured) return configured;
  return isSupabaseConfigured ? 'supabase' : 'mock';
}

const PROVIDER = resolveProvider();

export async function uploadFile(
  bucket: BucketKey,
  filePath: string,
  fileBuffer: Buffer,
  mimeType: string
): Promise<UploadResult> {
  if (PROVIDER === 'mock') {
    return {
      storagePath: filePath,
      provider: 'mock',
      publicUrl: undefined,
    };
  }

  if (PROVIDER === 'supabase') {
    const supabase = getSupabase();
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKETS[bucket])
      .upload(filePath, fileBuffer, { contentType: mimeType, upsert: true });

    if (error) throw new Error(`Supabase upload failed: ${error.message}`);

    return {
      storagePath: data.path,
      provider: 'supabase',
    };
  }

  if (PROVIDER === 'r2') {
    throw new Error('R2 storage not yet implemented — set STORAGE_PROVIDER=mock or supabase');
  }

  throw new Error(`Unknown storage provider: ${PROVIDER}`);
}

export async function getSignedUrl(
  bucket: BucketKey,
  storagePath: string,
  expiresInSeconds = 3600
): Promise<string> {
  if (PROVIDER === 'mock') {
    return storagePath;
  }

  if (PROVIDER === 'supabase') {
    const supabase = getSupabase();
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKETS[bucket])
      .createSignedUrl(storagePath, expiresInSeconds);

    if (error) throw new Error(`Failed to create signed URL: ${error.message}`);
    return data.signedUrl;
  }

  throw new Error(`Signed URL not implemented for provider: ${PROVIDER}`);
}

export async function deleteFile(bucket: BucketKey, storagePath: string): Promise<void> {
  if (PROVIDER === 'mock') return;

  if (PROVIDER === 'supabase') {
    const supabase = getSupabase();
    const { error } = await supabase.storage
      .from(STORAGE_BUCKETS[bucket])
      .remove([storagePath]);
    if (error) throw new Error(`Delete failed: ${error.message}`);
    return;
  }

  throw new Error(`Delete not implemented for provider: ${PROVIDER}`);
}
