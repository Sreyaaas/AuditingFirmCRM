import { createClient } from '@supabase/supabase-js';

// Read from Vite environment variables (or provide placeholders for local offline mode)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://shameer-associates.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'dummy-anon-key-shameer-crm';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export const isSupabaseConfigured = (): boolean => {
  return (
    !!import.meta.env.VITE_SUPABASE_URL &&
    !!import.meta.env.VITE_SUPABASE_ANON_KEY &&
    import.meta.env.VITE_SUPABASE_URL !== 'https://shameer-associates.supabase.co'
  );
};

