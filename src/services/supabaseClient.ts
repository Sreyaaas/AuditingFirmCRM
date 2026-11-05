import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase connection, configured only through build-time environment variables:
 *   VITE_SUPABASE_URL       https://<project-ref>.supabase.co
 *   VITE_SUPABASE_ANON_KEY  the project's anon (public) key
 *
 * The anon key is safe in the browser: every table is protected by Row Level
 * Security (supabase/migrations/001_production_security.sql), so it can only
 * reach data once a user has signed in. The service-role key must never be
 * placed here — it lives only in the admin-users Edge Function.
 */
const PLACEHOLDER_URL = 'https://placeholder.supabase.co';
const PLACEHOLDER_KEY = 'placeholder-anon-key';

export const getSupabaseConfig = () => {
  const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || '';
  const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || '';
  const isLive = /^https:\/\/.+\.supabase\.(co|in)$/.test(url) && anonKey.length > 20;
  return { url: isLive ? url : PLACEHOLDER_URL, anonKey: isLive ? anonKey : PLACEHOLDER_KEY, isLive };
};

const config = getSupabaseConfig();

// Clear runtime overrides written by older versions of the app.
try {
  localStorage.removeItem('shameer_crm_supabase_url');
  localStorage.removeItem('shameer_crm_supabase_anon_key');
} catch {
  /* storage unavailable */
}

export const supabase: SupabaseClient = createClient(config.url, config.anonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

export const isSupabaseConfigured = (): boolean => config.isLive;
