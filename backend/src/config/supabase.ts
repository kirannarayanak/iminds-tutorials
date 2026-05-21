import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabaseServiceKey && !supabaseUrl.includes('your-project')
);

let _client: SupabaseClient | null = null;

/** Lazy Supabase client — only created when env vars are set */
export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, or use STORAGE_PROVIDER=mock'
    );
  }
  if (!_client) {
    _client = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });
  }
  return _client;
}

export const STORAGE_BUCKETS = {
  MATERIALS: 'materials',
  VIDEOS: 'videos',
  AVATARS: 'avatars',
} as const;
