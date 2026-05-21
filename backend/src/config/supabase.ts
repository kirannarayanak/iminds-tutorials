import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Service-role client — used only on the backend, never exposed to clients
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

export const STORAGE_BUCKETS = {
  MATERIALS: 'materials',
  VIDEOS: 'videos',
  AVATARS: 'avatars',
} as const;
