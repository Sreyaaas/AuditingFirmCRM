import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEY_URL = 'shameer_crm_supabase_url';
const STORAGE_KEY_KEY = 'shameer_crm_supabase_anon_key';

// Check runtime config first (from settings modal in browser), then Vite env
export const getSupabaseConfig = () => {
  const localUrl = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_URL) : null;
  const localKey = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_KEY) : null;

  const url = localUrl || import.meta.env.VITE_SUPABASE_URL || 'https://shameer-associates.supabase.co';
  const anonKey = localKey || import.meta.env.VITE_SUPABASE_ANON_KEY || 'dummy-anon-key-shameer-crm';

  const isLive = Boolean(
    url &&
    anonKey &&
    !url.includes('shameer-associates.supabase.co') &&
    !anonKey.includes('dummy-anon-key')
  );

  return { url, anonKey, isLive };
};

let currentConfig = getSupabaseConfig();

export let supabase: SupabaseClient = createClient(currentConfig.url, currentConfig.anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export const isSupabaseConfigured = (): boolean => {
  return getSupabaseConfig().isLive;
};

// Allows instant connection in-app when client provides credentials
export const updateSupabaseCredentials = (url: string, anonKey: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_URL, url.trim());
    localStorage.setItem(STORAGE_KEY_KEY, anonKey.trim());
  }

  currentConfig = getSupabaseConfig();
  supabase = createClient(currentConfig.url, currentConfig.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
};

// Reverts to simulated dummy database
export const disconnectSupabase = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY_URL);
    localStorage.removeItem(STORAGE_KEY_KEY);
  }
  currentConfig = getSupabaseConfig();
  supabase = createClient(currentConfig.url, currentConfig.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
};

// Tests whether the provided credentials can reach a live Supabase project
export const testSupabaseConnection = async (
  testUrl: string, 
  testKey: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const tempClient = createClient(testUrl.trim(), testKey.trim());
    // Quick test ping against the profiles or clients table, or auth health check
    const { error } = await tempClient.from('profiles').select('id').limit(1);

    // If table doesn't exist yet, it will return code 42P01 (relation does not exist) or PGRST204/PGRST200
    // But that still confirms the connection reached Supabase successfully!
    if (error && error.code !== '42P01' && !error.message.includes('relation') && !error.message.includes('schema')) {
      if (error.message.includes('Invalid API key') || error.message.includes('JWT')) {
        return { success: false, message: 'Invalid Supabase Anon Key. Please check the API key in your project settings.' };
      }
      return { success: false, message: `Connection error: ${error.message}` };
    }

    return { 
      success: true, 
      message: 'Successfully connected to Supabase live instance! PostgreSQL backend is ready.' 
    };
  } catch (err: any) {
    return { 
      success: false, 
      message: err?.message || 'Could not reach Supabase. Check URL format (https://[id].supabase.co).' 
    };
  }
};
