-- ==============================================================================
-- SHAMEER & ASSOCIATES CRM — ENABLE FULL SUPABASE READ/WRITE SYNC
-- Run this in your Supabase SQL Editor to grant the CRM web app
-- permission to read, insert, and update practice data.
-- ==============================================================================

-- 1. Practice Configurations Table (Dynamic Filing Types, Return Types, Entity Types)
CREATE TABLE IF NOT EXISTS public.practice_configs (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    options JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.practice_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for practice configs" ON public.practice_configs;
CREATE POLICY "Enable all access for practice configs"
ON public.practice_configs FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Seed initial customizable options if not already present
INSERT INTO public.practice_configs (id, category, options)
VALUES
    ('filing_types', 'Filing Types', '["GSTR-1 (Sales)", "GSTR-3B (Summary)", "Statutory Audit", "TDS Payment", "PF & ESI", "CMP-08", "IFF"]'::jsonb),
    ('return_types', 'Return Types', '["GSTR-1", "GSTR-3B", "CMP-08", "GSTR-9", "GSTR-9C"]'::jsonb),
    ('entity_types', 'Entity Types', '["Private Limited", "LLP", "Partnership", "Proprietorship", "Individual"]'::jsonb),
    ('service_types', 'Service Types', '["GST Filing", "Statutory Audit Advance", "GST & MCA Advisory", "ITR-2 Filing & Computation", "ITR-3 Business Return"]'::jsonb)
ON CONFLICT (id) DO UPDATE 
SET options = EXCLUDED.options, updated_at = NOW();

-- 2. Clients Table RLS: Allow CRM Web App full read/write
DROP POLICY IF EXISTS "Read clients policy" ON public.clients;
DROP POLICY IF EXISTS "Admins manage clients" ON public.clients;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.clients;
DROP POLICY IF EXISTS "Enable all access for CRM clients" ON public.clients;

CREATE POLICY "Enable all access for CRM clients" 
ON public.clients FOR ALL 
TO anon, authenticated 
USING (true) 
WITH CHECK (true);

-- 3. Tasks Table RLS: Allow CRM Web App full read/write
DROP POLICY IF EXISTS "Read tasks policy" ON public.tasks;
DROP POLICY IF EXISTS "Employees update assigned tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins manage tasks" ON public.tasks;
DROP POLICY IF EXISTS "Enable all access for CRM tasks" ON public.tasks;

CREATE POLICY "Enable all access for CRM tasks" 
ON public.tasks FOR ALL 
TO anon, authenticated 
USING (true) 
WITH CHECK (true);

-- 4. User Profiles Table RLS
DROP POLICY IF EXISTS "Allow authenticated read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins full manage profiles" ON public.profiles;
DROP POLICY IF EXISTS "Enable all access for CRM profiles" ON public.profiles;

CREATE POLICY "Enable all access for CRM profiles" 
ON public.profiles FOR ALL 
TO anon, authenticated 
USING (true) 
WITH CHECK (true);

-- 5. Debtors Ledger Table RLS
DROP POLICY IF EXISTS "Read debtors policy" ON public.debtor_records;
DROP POLICY IF EXISTS "Manage debtor records" ON public.debtor_records;
DROP POLICY IF EXISTS "Enable all access for CRM debtors" ON public.debtor_records;

CREATE POLICY "Enable all access for CRM debtors" 
ON public.debtor_records FOR ALL 
TO anon, authenticated 
USING (true) 
WITH CHECK (true);

-- 6. ITR Filings Table RLS
DROP POLICY IF EXISTS "Enable all access for CRM itr" ON public.itr_filings;

CREATE POLICY "Enable all access for CRM itr" 
ON public.itr_filings FOR ALL 
TO anon, authenticated 
USING (true) 
WITH CHECK (true);

-- 7. Call Desk Tickets Table RLS
DROP POLICY IF EXISTS "Read tickets policy" ON public.tickets;
DROP POLICY IF EXISTS "Insert tickets policy" ON public.tickets;
DROP POLICY IF EXISTS "Update tickets policy" ON public.tickets;
DROP POLICY IF EXISTS "Enable all access for CRM tickets" ON public.tickets;

CREATE POLICY "Enable all access for CRM tickets" 
ON public.tickets FOR ALL 
TO anon, authenticated 
USING (true) 
WITH CHECK (true);

-- 8. Activity Logs Table RLS
DROP POLICY IF EXISTS "Insert activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Admins read activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Enable all access for CRM logs" ON public.activity_logs;

CREATE POLICY "Enable all access for CRM logs" 
ON public.activity_logs FOR ALL 
TO anon, authenticated 
USING (true) 
WITH CHECK (true);
