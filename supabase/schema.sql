-- ==============================================================================
-- SHAMEER AND ASSOCIATES - ACCOUNTANTS AND PRACTITIONERS
-- Production Supabase Database Schema with Row Level Security (RLS)
-- Roles: 'admin' (Managing Partner/Firm Admin) and 'employee' (Audit Staff)
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. User Profiles Table (Optionally linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'employee')),
    designation TEXT NOT NULL,
    phone TEXT,
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    joined_date DATE NOT NULL DEFAULT CURRENT_DATE,
    can_edit_payments BOOLEAN DEFAULT FALSE,
    can_access_financials BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Clients Master Table
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    trade_name TEXT NOT NULL,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('Private Limited', 'LLP', 'Partnership', 'Proprietorship', 'Individual')),
    gstin TEXT,
    pan TEXT,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    is_recurring_gst BOOLEAN DEFAULT TRUE,
    is_recurring_statutory BOOLEAN DEFAULT FALSE,
    assigned_staff_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    monthly_audit_fee NUMERIC(12, 2) DEFAULT 0.00,
    city TEXT DEFAULT 'Kochi',
    onedrive_folder_url TEXT,
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Archived', 'On Hold')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Monthly Recurring Compliance Tasks
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    filing_type TEXT NOT NULL CHECK (filing_type IN ('GSTR-1', 'GSTR-3B', 'Statutory Audit', 'TDS Payment', 'PF/ESI', 'CMP-08', 'IFF')),
    period TEXT NOT NULL,
    assigned_staff_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'Docs Pending' CHECK (status IN ('Docs Pending', 'In Progress', 'Draft Ready', 'Filed', 'Overdue')),
    due_date DATE NOT NULL,
    arn_number TEXT,
    tax_payable NUMERIC(12, 2) DEFAULT 0.00,
    turnover_reported NUMERIC(14, 2) DEFAULT 0.00,
    docs_received BOOLEAN DEFAULT FALSE,
    phone TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Annual Income Tax Returns (ITR)
CREATE TABLE IF NOT EXISTS public.itr_filings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    pan TEXT NOT NULL,
    itr_form TEXT NOT NULL CHECK (itr_form IN ('ITR-1', 'ITR-2', 'ITR-3', 'ITR-5', 'ITR-6', 'ITR-7')),
    assessment_year TEXT NOT NULL,
    financial_year TEXT NOT NULL,
    assigned_staff_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'Docs Pending' CHECK (status IN ('Docs Pending', '26AS Reconciled', 'Draft Computation', 'Client Confirmed', 'Filed & e-Verified')),
    due_date DATE NOT NULL,
    regime TEXT DEFAULT 'New Regime (115BAC)',
    tax_liability_or_refund NUMERIC(12, 2) DEFAULT 0.00,
    acknowledgment_no TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Debtors & Money Owed Ledger (Rolling 4-Month Accounts)
CREATE TABLE IF NOT EXISTS public.debtor_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    client_name TEXT NOT NULL,
    phone TEXT,
    assigned_staff TEXT NOT NULL,
    -- Monthly reconciliation amounts
    aug_outstanding NUMERIC(12, 2) DEFAULT 0.00,
    aug_cleared NUMERIC(12, 2) DEFAULT 0.00,
    aug_billing NUMERIC(12, 2) DEFAULT 0.00,
    sep_outstanding NUMERIC(12, 2) DEFAULT 0.00,
    sep_cleared NUMERIC(12, 2) DEFAULT 0.00,
    sep_billing NUMERIC(12, 2) DEFAULT 0.00,
    oct_outstanding NUMERIC(12, 2) DEFAULT 0.00,
    oct_cleared NUMERIC(12, 2) DEFAULT 0.00,
    oct_billing NUMERIC(12, 2) DEFAULT 0.00,
    nov_outstanding NUMERIC(12, 2) DEFAULT 0.00,
    nov_cleared NUMERIC(12, 2) DEFAULT 0.00,
    nov_billing NUMERIC(12, 2) DEFAULT 0.00,
    current_balance NUMERIC(12, 2) DEFAULT 0.00,
    aging_bucket TEXT DEFAULT '0-30 Days' CHECK (aging_bucket IN ('0-30 Days', '31-60 Days', '61-90 Days', '90+ Days')),
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Partially Paid', 'Overdue', 'Cleared')),
    last_reminder_sent TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Office Billing Registers
CREATE TABLE IF NOT EXISTS public.office_billings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    serial_no INT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    client_name TEXT NOT NULL,
    nature_of_service TEXT NOT NULL,
    filing_month TEXT,
    professional_income NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    oop_expenses NUMERIC(12, 2) DEFAULT 0.00,
    user_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Client Calls & Inbound Follow-ups (Desk Tickets)
CREATE TABLE IF NOT EXISTS public.tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_no TEXT UNIQUE NOT NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    client_name TEXT NOT NULL,
    caller_name TEXT NOT NULL,
    caller_phone TEXT NOT NULL,
    call_type TEXT DEFAULT 'Inbound Phone Call',
    subject TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'Normal' CHECK (priority IN ('Urgent', 'High', 'Normal', 'Low')),
    status TEXT NOT NULL DEFAULT 'Unassigned' CHECK (status IN ('Unassigned', 'In Progress', 'Waiting on Client', 'Resolved')),
    logged_by_staff_id UUID REFERENCES public.profiles(id),
    assigned_staff_id UUID REFERENCES public.profiles(id),
    assigned_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Activity Log & Audit Trail (Strict Audit History)
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL CHECK (user_role IN ('admin', 'employee')),
    action TEXT NOT NULL,
    details TEXT NOT NULL,
    client_name TEXT,
    category TEXT NOT NULL CHECK (category IN ('Filing', 'Payment', 'Account', 'Task', 'Client', 'Security')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itr_filings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debtor_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.office_billings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Helper function: Is current user an administrator?
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin' AND status = 'Active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Can current user edit payments?
CREATE OR REPLACE FUNCTION public.can_edit_payments()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND (role = 'admin' OR can_edit_payments = TRUE) AND status = 'Active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- 1. Profiles Policies
-- -----------------------------------------------------------------------------
-- Anyone authenticated can view active profiles (staff roster)
CREATE POLICY "Allow authenticated read profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (status = 'Active' OR public.is_admin());

-- Only admins can insert, update, or deactivate profiles
CREATE POLICY "Admins full manage profiles"
ON public.profiles FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- -----------------------------------------------------------------------------
-- 2. Clients Policies
-- -----------------------------------------------------------------------------
-- Admins can view all clients; Employees can view their assigned clients
CREATE POLICY "Read clients policy"
ON public.clients FOR SELECT
TO authenticated
USING (public.is_admin() OR assigned_staff_id = auth.uid() OR assigned_staff_id IS NULL);

-- Admins can insert/update/delete clients
CREATE POLICY "Admins manage clients"
ON public.clients FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- -----------------------------------------------------------------------------
-- 3. Tasks Policies (Monthly Work)
-- -----------------------------------------------------------------------------
-- Admins can view all tasks; Employees can view tasks assigned to them or unassigned
CREATE POLICY "Read tasks policy"
ON public.tasks FOR SELECT
TO authenticated
USING (public.is_admin() OR assigned_staff_id = auth.uid() OR assigned_staff_id IS NULL);

-- Employees can update progress/status of their assigned tasks
CREATE POLICY "Employees update assigned tasks"
ON public.tasks FOR UPDATE
TO authenticated
USING (public.is_admin() OR assigned_staff_id = auth.uid())
WITH CHECK (public.is_admin() OR assigned_staff_id = auth.uid());

-- Admins can insert and delete tasks
CREATE POLICY "Admins manage tasks"
ON public.tasks FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- -----------------------------------------------------------------------------
-- 4. Debtors & Money Owed Ledger Policies
-- -----------------------------------------------------------------------------
-- Admins see all debtors; Employees with financial permission can view
CREATE POLICY "Read debtors policy"
ON public.debtor_records FOR SELECT
TO authenticated
USING (public.is_admin() OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (can_access_financials = TRUE OR role = 'admin')
));

-- Only admins or authorized employees can record payment or update debtor ledger
CREATE POLICY "Manage debtor records"
ON public.debtor_records FOR ALL
TO authenticated
USING (public.can_edit_payments())
WITH CHECK (public.can_edit_payments());

-- -----------------------------------------------------------------------------
-- 5. Tickets (Client Calls & Follow-ups) Policies
-- -----------------------------------------------------------------------------
-- All authenticated staff can view and create tickets
CREATE POLICY "Read tickets policy"
ON public.tickets FOR SELECT
TO authenticated
USING (TRUE);

CREATE POLICY "Insert tickets policy"
ON public.tickets FOR INSERT
TO authenticated
WITH CHECK (TRUE);

-- Employees can claim or update tickets assigned to them; Admins can update any
CREATE POLICY "Update tickets policy"
ON public.tickets FOR UPDATE
TO authenticated
USING (public.is_admin() OR assigned_staff_id = auth.uid() OR assigned_staff_id IS NULL)
WITH CHECK (public.is_admin() OR assigned_staff_id = auth.uid() OR assigned_staff_id IS NULL);

-- -----------------------------------------------------------------------------
-- 6. Activity Logs Policies
-- -----------------------------------------------------------------------------
-- All staff can insert audit logs
CREATE POLICY "Insert activity logs"
ON public.activity_logs FOR INSERT
TO authenticated
WITH CHECK (TRUE);

-- Only admins can read full activity logs
CREATE POLICY "Admins read activity logs"
ON public.activity_logs FOR SELECT
TO authenticated
USING (public.is_admin());

-- Strict restriction: NO ONE can delete or mutate activity logs (Tamper-proof)
-- No DELETE or UPDATE policies defined on activity_logs.

-- ==============================================================================
-- 7. INITIAL MASTER SEED DATA (Shameer & Associates - 6 Authentic Clients)
-- ==============================================================================

-- 1. Firm Practitioners & Staff
INSERT INTO public.profiles (id, name, email, role, designation, phone, status, can_edit_payments, can_access_financials)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'Shameer', 'shameer@shameerassociates.in', 'admin', 'Managing Partner & Senior Practitioner', '+91 98200 11000', 'Active', TRUE, TRUE),
    ('a0000000-0000-0000-0000-000000000002', 'Ameen', 'ameen@shameerassociates.in', 'admin', 'Partner & Senior Practitioner', '+91 98201 11001', 'Active', TRUE, TRUE),
    ('a0000000-0000-0000-0000-000000000003', 'Susmi', 'susmi@shameerassociates.in', 'employee', 'Audit & Tax Executive', '+91 98201 11002', 'Active', FALSE, FALSE)
ON CONFLICT (email) DO NOTHING;

-- 2. Authentic Master Clients (The 6 Real Entities)
INSERT INTO public.clients (id, client_code, name, trade_name, entity_type, gstin, pan, contact_person, phone, email, is_recurring_gst, is_recurring_statutory, assigned_staff_id, monthly_audit_fee, city, onedrive_folder_url, status)
VALUES
    ('c0000000-0000-0000-0000-000000000001', 'C-001', 'Havos (P) Ltd', 'Havos', 'Private Limited', '32AABCH4910K1Z5', 'AABCH4910K', 'Managing Director', '+91 98470 12345', 'accounts@havos.in', TRUE, TRUE, 'a0000000-0000-0000-0000-000000000002', 9000.00, 'Calicut', 'https://shameerassociates.sharepoint.com/clients/C-001-Havos', 'Active'),
    ('c0000000-0000-0000-0000-000000000002', 'C-002', 'KM Traders', 'KM Traders', 'Partnership', '32AACKM8821L1Z2', 'AACKM8821L', 'K. M. Partner', '+91 94471 23456', 'info@kmtraders.in', TRUE, TRUE, 'a0000000-0000-0000-0000-000000000003', 5760.00, 'Kochi', 'https://shameerassociates.sharepoint.com/clients/C-002-KMTraders', 'Active'),
    ('c0000000-0000-0000-0000-000000000003', 'C-003', 'Semicolon Innovations', 'Semicolon Labs', 'LLP', '32AAJCS9102P1Z8', 'AAJCS9102P', 'Managing Partner', '+91 98952 34567', 'contact@semicolon.io', TRUE, TRUE, 'a0000000-0000-0000-0000-000000000002', 4000.00, 'Kozhikode', 'https://shameerassociates.sharepoint.com/clients/C-003-Semicolon', 'Active'),
    ('c0000000-0000-0000-0000-000000000004', 'C-004', 'Rafeek', 'Rafeek Commercials', 'Proprietorship', '32ANPPR5412M1Z3', 'ANPPR5412M', 'M. Rafeek', '+91 97443 45678', 'rafeek@gmail.com', TRUE, FALSE, 'a0000000-0000-0000-0000-000000000003', 4000.00, 'Malappuram', 'https://shameerassociates.sharepoint.com/clients/C-004-Rafeek', 'Active'),
    ('c0000000-0000-0000-0000-000000000005', 'C-005', 'Jinu & Family', 'Jinu & Family Estates', 'Individual', NULL, 'AUPPJ8891D', 'Jinu Mathew', '+91 96334 56789', 'jinumathew@gmail.com', FALSE, FALSE, 'a0000000-0000-0000-0000-000000000002', 8000.00, 'Wayanad', 'https://shameerassociates.sharepoint.com/clients/C-005-JinuFamily', 'Active'),
    ('c0000000-0000-0000-0000-000000000006', 'C-006', 'Spanish Absolute Parlour', 'Spanish Absolute', 'Proprietorship', '32BLWPS3109E1Z4', 'BLWPS3109E', 'Proprietor', '+91 94955 67890', 'absolute.spa@outlook.com', TRUE, FALSE, 'a0000000-0000-0000-0000-000000000003', 2000.00, 'Ernakulam', 'https://shameerassociates.sharepoint.com/clients/C-006-SpanishAbsolute', 'Active')
ON CONFLICT (client_code) DO NOTHING;

-- 3. Debtors Ledger (Rolling 4-Month Accounts from debtors.xlsx)
INSERT INTO public.debtor_records (id, client_id, client_name, phone, assigned_staff, aug_outstanding, aug_cleared, aug_billing, sep_outstanding, sep_cleared, sep_billing, oct_outstanding, oct_cleared, oct_billing, nov_outstanding, nov_cleared, nov_billing, current_balance, aging_bucket, status)
VALUES
    ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Havos (P) Ltd', '+91 98470 12345', 'Ameen', 0, 0, 0, 0, 0, 9000, 9000, 9000, 1500, 1500, 0, 9000, 10500, '31-60 Days', 'Overdue'),
    ('d0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 'KM Traders', '+91 94471 23456', 'Susmi', 4260, 1440, 2940, 5760, 0, 0, 5760, 0, 0, 5760, 0, 0, 5760, '90+ Days', 'Overdue'),
    ('d0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000003', 'Semicolon Innovations', '+91 98952 34567', 'Ameen', 0, 0, 2500, 2500, 0, 1500, 4000, 0, 0, 4000, 0, 0, 4000, '61-90 Days', 'Overdue'),
    ('d0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000004', 'Rafeek', '+91 97443 45678', 'Susmi', 4000, 4000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, '0-30 Days', 'Cleared'),
    ('d0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000005', 'Jinu & Family', '+91 96334 56789', 'Ameen', 8000, 8000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, '0-30 Days', 'Cleared'),
    ('d0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000006', 'Spanish Absolute Parlour', '+91 94955 67890', 'Susmi', 3200, 3200, 0, 0, 0, 2000, 2000, 2000, 0, 0, 0, 0, 0, '0-30 Days', 'Cleared')
ON CONFLICT DO NOTHING;

