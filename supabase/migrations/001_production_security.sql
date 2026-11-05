-- =============================================================================
-- Shameer & Associates CRM — production security & data model
-- Run once in the Supabase SQL Editor (after schema.sql). Safe to re-run.
--
-- What it does
--   1. Links profiles to Supabase Auth users (passwords are stored by Supabase
--      Auth as bcrypt hashes — never in our tables, never in the browser).
--   2. Replaces every "anon can do anything" policy with authenticated,
--      role-aware Row Level Security. Anonymous visitors can read nothing.
--   3. Adds the tables/columns the app now uses: app_settings, gst_returns,
--      monthly debtor history (ledger JSONB), richer billing register.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. Identity helpers
-- -----------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS profiles_auth_user_id_key ON public.profiles(auth_user_id) WHERE auth_user_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.profiles
  WHERE (auth_user_id = auth.uid() OR id = auth.uid()) AND status = 'Active'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.current_profile_id() IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE (auth_user_id = auth.uid() OR id = auth.uid()) AND status = 'Active' AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_financials()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE (auth_user_id = auth.uid() OR id = auth.uid()) AND status = 'Active'
      AND (role = 'admin' OR can_access_financials = TRUE)
  );
$$;

CREATE OR REPLACE FUNCTION public.can_edit_payments()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE (auth_user_id = auth.uid() OR id = auth.uid()) AND status = 'Active'
      AND (role = 'admin' OR can_edit_payments = TRUE)
  );
$$;

-- New Auth users get a profile automatically. It starts INACTIVE with the
-- 'employee' role; only an admin (via the admin-users function or SQL) can
-- activate it or grant admin. Sign-up metadata can never grant privileges.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE lower(email) = lower(NEW.email)) THEN
    UPDATE public.profiles SET auth_user_id = NEW.id, updated_at = NOW()
    WHERE lower(email) = lower(NEW.email) AND auth_user_id IS NULL;
  ELSE
    INSERT INTO public.profiles (id, auth_user_id, name, email, role, designation, status)
    VALUES (
      NEW.id, NEW.id,
      COALESCE(NULLIF(NEW.raw_user_meta_data->>'name', ''), split_part(NEW.email, '@', 1)),
      lower(NEW.email), 'employee', 'Staff', 'Inactive'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Link any existing Auth users to existing profiles with the same email.
UPDATE public.profiles p SET auth_user_id = u.id
FROM auth.users u
WHERE lower(u.email) = lower(p.email) AND p.auth_user_id IS NULL;

-- -----------------------------------------------------------------------------
-- 2. Data model changes
-- -----------------------------------------------------------------------------
-- Lists (filing types, entity types…) are admin-configurable, so drop fixed CHECKs.
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_entity_type_check;
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_filing_type_check;
ALTER TABLE public.itr_filings DROP CONSTRAINT IF EXISTS itr_filings_itr_form_check;

-- Debtors: monthly history as JSONB so the account is not tied to four fixed months.
ALTER TABLE public.debtor_records ALTER COLUMN client_id DROP NOT NULL;
ALTER TABLE public.debtor_records ALTER COLUMN assigned_staff DROP NOT NULL;
ALTER TABLE public.debtor_records ALTER COLUMN assigned_staff SET DEFAULT '';
ALTER TABLE public.debtor_records ADD COLUMN IF NOT EXISTS s_no INT;
ALTER TABLE public.debtor_records ADD COLUMN IF NOT EXISTS entity_type TEXT DEFAULT '';
ALTER TABLE public.debtor_records ADD COLUMN IF NOT EXISTS ledger JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.debtor_records DROP CONSTRAINT IF EXISTS debtor_records_status_check;
ALTER TABLE public.debtor_records ADD CONSTRAINT debtor_records_status_check
  CHECK (status IN ('Pending', 'Partially Paid', 'Overdue', 'Cleared', 'Advance'));
CREATE UNIQUE INDEX IF NOT EXISTS debtor_records_client_name_key ON public.debtor_records (lower(client_name));

-- Office billing register: match the columns kept in the office workbook.
ALTER TABLE public.office_billings ALTER COLUMN date DROP NOT NULL;
ALTER TABLE public.office_billings ALTER COLUMN date DROP DEFAULT;
ALTER TABLE public.office_billings ALTER COLUMN user_name DROP NOT NULL;
ALTER TABLE public.office_billings ALTER COLUMN user_name SET DEFAULT '';
ALTER TABLE public.office_billings ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE public.office_billings ADD COLUMN IF NOT EXISTS period TEXT;
ALTER TABLE public.office_billings ADD COLUMN IF NOT EXISTS rcm NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE public.office_billings ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE public.office_billings ADD COLUMN IF NOT EXISTS billing_status TEXT DEFAULT '';
ALTER TABLE public.office_billings ADD COLUMN IF NOT EXISTS invoice_number TEXT DEFAULT '';
CREATE UNIQUE INDEX IF NOT EXISTS office_billings_external_id_key ON public.office_billings (external_id) WHERE external_id IS NOT NULL;

-- GST return calendar (previously only held in the browser).
CREATE TABLE IF NOT EXISTS public.gst_returns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_name TEXT NOT NULL,
  trade_name TEXT,
  gstin TEXT,
  return_type TEXT NOT NULL,
  filing_month TEXT NOT NULL,
  due_date DATE NOT NULL,
  assigned_staff TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Pending',
  arn_number TEXT,
  filed_date DATE,
  phone TEXT,
  tax_payable NUMERIC(12, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dropdown lists (kept from earlier versions of the app).
CREATE TABLE IF NOT EXISTS public.practice_configs (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Firm-wide settings edited by admins (firm profile, templates, preferences).
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_by UUID,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 3. Row Level Security — drop every existing policy, then recreate
-- -----------------------------------------------------------------------------
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN (
      'profiles', 'clients', 'tasks', 'itr_filings', 'debtor_records', 'office_billings',
      'tickets', 'activity_logs', 'gst_returns', 'practice_configs', 'app_settings')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itr_filings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debtor_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.office_billings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gst_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Profiles: every active user may read the team (and always their own row).
CREATE POLICY profiles_select ON public.profiles FOR SELECT TO authenticated
  USING (public.is_active_user() OR auth_user_id = auth.uid() OR id = auth.uid());
CREATE POLICY profiles_admin_write ON public.profiles FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Day-to-day work: active staff read and write; only admins delete.
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['clients', 'tasks', 'itr_filings', 'tickets', 'gst_returns'] LOOP
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.is_active_user())', t || '_select', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_active_user())', t || '_insert', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.is_active_user()) WITH CHECK (public.is_active_user())', t || '_update', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.is_admin())', t || '_delete', t);
  END LOOP;
END $$;

-- Fees: visible to admins and staff granted financial access; editable by those
-- allowed to record payments.
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['debtor_records', 'office_billings'] LOOP
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.can_access_financials())', t || '_select', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.can_edit_payments())', t || '_insert', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.can_edit_payments()) WITH CHECK (public.can_edit_payments())', t || '_update', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.is_admin())', t || '_delete', t);
  END LOOP;
END $$;

-- Audit trail: anyone active may append; only admins read; nobody edits or deletes.
CREATE POLICY activity_logs_insert ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (public.is_active_user());
CREATE POLICY activity_logs_select ON public.activity_logs FOR SELECT TO authenticated USING (public.is_admin());

-- Settings and lists: readable by active staff, changed by admins.
CREATE POLICY practice_configs_select ON public.practice_configs FOR SELECT TO authenticated USING (public.is_active_user());
CREATE POLICY practice_configs_admin ON public.practice_configs FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY app_settings_select ON public.app_settings FOR SELECT TO authenticated USING (public.is_active_user());
CREATE POLICY app_settings_admin ON public.app_settings FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Belt and braces: the anon role gets no table privileges at all.
REVOKE ALL ON public.profiles, public.clients, public.tasks, public.itr_filings, public.debtor_records,
  public.office_billings, public.tickets, public.activity_logs, public.gst_returns,
  public.practice_configs, public.app_settings FROM anon;
