import { createClient } from '@supabase/supabase-js';

/**
 * Creates a fresh Supabase client for use in API routes (server-side).
 * Uses the public anon key — all payroll tables have open RLS policies.
 * Never import this from client components; use lib/supabase.ts instead.
 */
export function createServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Missing Supabase env vars');
  return createClient(url, key);
}
