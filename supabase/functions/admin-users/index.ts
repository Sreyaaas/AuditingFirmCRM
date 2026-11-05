// Supabase Edge Function: admin-users
// Lets an active admin create staff logins, set passwords and enable/disable access.
// Runs server-side with the service-role key, which never reaches the browser.
//
// Deploy:  npx supabase functions deploy admin-users --project-ref <project-ref>
// (SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are provided automatically.)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const MIN_PASSWORD = 10;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // 1. Identify the caller from their own session token.
  const authHeader = req.headers.get('Authorization') ?? '';
  const asCaller = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: userData, error: userErr } = await asCaller.auth.getUser();
  if (userErr || !userData.user) return json({ error: 'Not signed in' }, 401);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  // 2. Caller must be an active admin.
  const { data: caller } = await admin
    .from('profiles')
    .select('id, role, status')
    .or(`auth_user_id.eq.${userData.user.id},id.eq.${userData.user.id}`)
    .maybeSingle();
  if (!caller || caller.role !== 'admin' || caller.status !== 'Active') return json({ error: 'Administrator access required' }, 403);

  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid request body' }, 400);
  }

  const findAuthId = async (profileId: string): Promise<string | null> => {
    const { data } = await admin.from('profiles').select('auth_user_id, id').eq('id', profileId).maybeSingle();
    return data?.auth_user_id ?? null;
  };

  switch (body.action) {
    case 'create': {
      const email = String(body.email ?? '').trim().toLowerCase();
      const password = String(body.password ?? '');
      const name = String(body.name ?? '').trim();
      const role = body.role === 'admin' ? 'admin' : 'employee';
      if (!email || !name) return json({ error: 'Name and email are required' }, 400);
      if (password.length < MIN_PASSWORD) return json({ error: `Password must be at least ${MIN_PASSWORD} characters` }, 400);

      const { data: created, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
      });
      if (error || !created.user) return json({ error: error?.message ?? 'Could not create user' }, 400);

      // The database trigger has already created (or linked) a profile; set its details.
      const { data: profile, error: pErr } = await admin
        .from('profiles')
        .update({
          name,
          role,
          designation: String(body.designation ?? 'Staff'),
          phone: String(body.phone ?? ''),
          status: 'Active',
          can_access_financials: role === 'admin' || Boolean(body.canAccessFinancials),
          can_edit_payments: role === 'admin' || Boolean(body.canEditPayments),
          auth_user_id: created.user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('email', email)
        .select('*')
        .single();
      if (pErr) return json({ error: pErr.message }, 400);
      return json({ profile });
    }

    case 'set_password': {
      const password = String(body.password ?? '');
      if (password.length < MIN_PASSWORD) return json({ error: `Password must be at least ${MIN_PASSWORD} characters` }, 400);
      const authId = await findAuthId(String(body.profileId));
      if (!authId) return json({ error: 'This member has no login yet' }, 404);
      const { error } = await admin.auth.admin.updateUserById(authId, { password });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    case 'set_status': {
      const active = Boolean(body.active);
      const profileId = String(body.profileId);
      if (profileId === caller.id && !active) return json({ error: 'You cannot deactivate your own account' }, 400);
      const authId = await findAuthId(profileId);
      if (authId) {
        // A ban blocks sign-in and token refresh immediately.
        const { error } = await admin.auth.admin.updateUserById(authId, { ban_duration: active ? 'none' : '876000h' });
        if (error) return json({ error: error.message }, 400);
      }
      const { error: pErr } = await admin.from('profiles').update({ status: active ? 'Active' : 'Inactive', updated_at: new Date().toISOString() }).eq('id', profileId);
      if (pErr) return json({ error: pErr.message }, 400);
      return json({ ok: true });
    }

    default:
      return json({ error: 'Unknown action' }, 400);
  }
});
