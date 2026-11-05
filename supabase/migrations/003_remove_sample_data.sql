-- =============================================================================
-- Remove the sample rows that the original schema.sql inserted.
--
-- Deletes ONLY rows with the fixed sample IDs below (a000…, c000…, d000…):
--   3 placeholder team members (Shameer / Ameen / Susmi @shameerassociates.in)
--   6 sample clients and their sample tasks / ITR rows
--   6 sample debtor accounts
-- Real logins, clients and imported debtors are not affected. Safe to re-run.
-- =============================================================================

-- Preview what will be removed.
SELECT 'profile' AS kind, name AS label FROM public.profiles WHERE id::text LIKE 'a0000000-0000-0000-0000-00000000000_' AND auth_user_id IS NULL
UNION ALL
SELECT 'client', name FROM public.clients WHERE id::text LIKE 'c0000000-0000-0000-0000-00000000000_'
UNION ALL
SELECT 'debtor', client_name FROM public.debtor_records WHERE id::text LIKE 'd0000000-0000-0000-0000-00000000000_';

DELETE FROM public.debtor_records WHERE id::text LIKE 'd0000000-0000-0000-0000-00000000000_';
DELETE FROM public.tasks WHERE client_id::text LIKE 'c0000000-0000-0000-0000-00000000000_';
DELETE FROM public.itr_filings WHERE client_id::text LIKE 'c0000000-0000-0000-0000-00000000000_';
DELETE FROM public.clients WHERE id::text LIKE 'c0000000-0000-0000-0000-00000000000_';

-- Placeholder team members: only those that were never linked to a real login.
UPDATE public.clients SET assigned_staff_id = NULL WHERE assigned_staff_id::text LIKE 'a0000000-0000-0000-0000-00000000000_';
UPDATE public.tasks SET assigned_staff_id = NULL WHERE assigned_staff_id::text LIKE 'a0000000-0000-0000-0000-00000000000_';
UPDATE public.itr_filings SET assigned_staff_id = NULL WHERE assigned_staff_id::text LIKE 'a0000000-0000-0000-0000-00000000000_';
UPDATE public.tickets SET assigned_staff_id = NULL WHERE assigned_staff_id::text LIKE 'a0000000-0000-0000-0000-00000000000_';
UPDATE public.tickets SET logged_by_staff_id = NULL WHERE logged_by_staff_id::text LIKE 'a0000000-0000-0000-0000-00000000000_';
DELETE FROM public.profiles WHERE id::text LIKE 'a0000000-0000-0000-0000-00000000000_' AND auth_user_id IS NULL;

-- Check: the team should now list only real logins.
SELECT name, email, role, status FROM public.profiles ORDER BY role, name;
