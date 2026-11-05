/**
 * Authentication — Supabase Auth only.
 *
 * Passwords are sent over HTTPS to Supabase Auth, which stores a bcrypt hash.
 * The app never stores, logs or compares passwords itself. Sessions are JWTs
 * kept by supabase-js and refreshed automatically, so a user can sign in from
 * any device.
 *
 * Staff accounts are created by admins through the `admin-users` Edge Function
 * (supabase/functions/admin-users), which holds the service-role key server-side.
 */
import type { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { UserProfile, UserRole } from '../types/crm';

export const MIN_PASSWORD_LENGTH = 10;

export const passwordProblem = (pw: string): string | null => {
  if (pw.length < MIN_PASSWORD_LENGTH) return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return 'Include both letters and numbers.';
  return null;
};

export const getSession = async (): Promise<Session | null> => {
  if (!isSupabaseConfigured()) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
};

export const onAuthChange = (cb: (event: string, session: Session | null) => void) => {
  const { data } = supabase.auth.onAuthStateChange((event, session) => cb(event, session));
  return () => data.subscription.unsubscribe();
};

const friendly = (message: string): string => {
  if (/invalid login credentials/i.test(message)) return 'Incorrect email or password.';
  if (/email not confirmed/i.test(message)) return 'This account has not been confirmed yet. Ask an administrator.';
  if (/banned/i.test(message)) return 'This account has been deactivated. Ask an administrator.';
  if (/rate limit|too many/i.test(message)) return 'Too many attempts. Wait a minute and try again.';
  return message;
};

export const signIn = async (email: string, password: string): Promise<{ error?: string }> => {
  if (!isSupabaseConfigured()) return { error: 'The database is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.' };
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  return error ? { error: friendly(error.message) } : {};
};

export const signOut = async () => {
  await supabase.auth.signOut();
};

export const sendPasswordReset = async (email: string): Promise<{ error?: string }> => {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: window.location.origin,
  });
  return error ? { error: friendly(error.message) } : {};
};

/** Changes the signed-in user's password. Re-verifies the current one first. */
export const changePassword = async (email: string, currentPassword: string | null, newPassword: string): Promise<{ error?: string }> => {
  const problem = passwordProblem(newPassword);
  if (problem) return { error: problem };
  if (currentPassword !== null) {
    const { error } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
    if (error) return { error: 'Current password is incorrect.' };
  }
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  return error ? { error: friendly(error.message) } : {};
};

/** Finds the profile that belongs to the signed-in Auth user. */
export const profileForSession = (session: Session | null, profiles: UserProfile[]): UserProfile | null => {
  if (!session) return null;
  const uid = session.user.id;
  const email = (session.user.email || '').toLowerCase();
  return profiles.find((p) => p.authUserId === uid || p.id === uid) || profiles.find((p) => p.email.toLowerCase() === email) || null;
};

// ---------------------------------------------------------------- admin actions

const invokeAdmin = async <T = unknown>(body: Record<string, unknown>): Promise<{ data?: T; error?: string }> => {
  const { data, error } = await supabase.functions.invoke('admin-users', { body });
  if (error) {
    // Surface the function's own error message when there is one.
    let message = error.message;
    try {
      const ctx = (error as any).context;
      if (ctx && typeof ctx.json === 'function') message = (await ctx.json()).error || message;
    } catch {
      /* keep generic message */
    }
    if (/failed to send|not found|404/i.test(message)) {
      message = 'The admin-users function is not deployed. See docs/CHANGES.md → Setup.';
    }
    return { error: message };
  }
  if (data && (data as any).error) return { error: (data as any).error };
  return { data: data as T };
};

export interface NewMemberInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  designation: string;
  phone: string;
  canAccessFinancials: boolean;
  canEditPayments: boolean;
}

export const adminCreateMember = (input: NewMemberInput) => invokeAdmin<{ profile: any }>({ action: 'create', ...input });

export const adminSetPassword = (profileId: string, password: string) => invokeAdmin({ action: 'set_password', profileId, password });

export const adminSetActive = (profileId: string, active: boolean) => invokeAdmin({ action: 'set_status', profileId, active });
