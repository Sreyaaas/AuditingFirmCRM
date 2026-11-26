-- Master Data recurring compliance registers (Monthly GST, Annual ITR, Quarterly/TDS, Tax Audit, Company/ROC)
CREATE TABLE IF NOT EXISTS public.master_data_records (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('monthly-gst', 'annual-itr', 'quarterly-tds', 'tax-audit', 'company-roc')),
  client_name TEXT NOT NULL,
  legal_constitution TEXT NOT NULL DEFAULT '',
  itr_type TEXT DEFAULT '',
  username TEXT DEFAULT '',
  password TEXT DEFAULT '',
  email TEXT DEFAULT '',
  reference TEXT DEFAULT '',
  nature_of_service TEXT DEFAULT '',
  effective_from TEXT NOT NULL,
  removed_from TEXT,
  period_values JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS master_data_category_idx ON public.master_data_records (category);

ALTER TABLE public.master_data_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS master_data_select ON public.master_data_records;
DROP POLICY IF EXISTS master_data_insert ON public.master_data_records;
DROP POLICY IF EXISTS master_data_update ON public.master_data_records;
DROP POLICY IF EXISTS master_data_delete ON public.master_data_records;

CREATE POLICY master_data_select ON public.master_data_records FOR SELECT TO authenticated
  USING (public.is_active_user());

CREATE POLICY master_data_insert ON public.master_data_records FOR INSERT TO authenticated
  WITH CHECK (public.is_active_user());

CREATE POLICY master_data_update ON public.master_data_records FOR UPDATE TO authenticated
  USING (public.is_active_user()) WITH CHECK (public.is_active_user());

CREATE POLICY master_data_delete ON public.master_data_records FOR DELETE TO authenticated
  USING (public.is_active_user());
