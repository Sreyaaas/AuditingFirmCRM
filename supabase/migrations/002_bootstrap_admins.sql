-- =============================================================================
-- First-time setup: make the first administrators.
--
-- Before running this:
--   1. Run 001_production_security.sql.
--   2. Supabase Dashboard → Authentication → Users → "Add user" → "Create new user"
--      for each administrator. Enter their email and a strong password and tick
--      "Auto Confirm User". Supabase stores only a bcrypt hash of the password.
--   3. Then run this script. Emails with no login yet are skipped, so it is safe
--      to re-run after adding someone to the list.
--
-- Every other account should be created from the app (Team → Add Member),
-- which calls the admin-users Edge Function.
-- =============================================================================

UPDATE public.profiles
SET role = 'admin',
    status = 'Active',
    can_access_financials = TRUE,
    can_edit_payments = TRUE,
    designation = 'Administrator',
    updated_at = NOW()
WHERE lower(email) IN (
  'sreyassai7@gmail.com',
  'ameenshameer007@gmail.com'
);

-- Check: each administrator row should show role = admin, status = Active and an auth_user_id.
SELECT name, email, role, status, auth_user_id FROM public.profiles ORDER BY role, name;
