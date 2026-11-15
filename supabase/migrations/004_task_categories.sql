-- ==============================================================================
-- 004_task_categories.sql
-- Add service taxonomy & historical financial year columns to tasks table
-- Shameer & Associates CRM
-- ==============================================================================

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS category text DEFAULT 'monthly';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS financial_year text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS assignment_title text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS estimated_fee numeric DEFAULT 0;

COMMENT ON COLUMN public.tasks.category IS 'Service taxonomy category: monthly, quarterly, annual, weekly, other';
COMMENT ON COLUMN public.tasks.financial_year IS 'Applicable financial year (e.g. 2026-27, 2021-22)';
COMMENT ON COLUMN public.tasks.assignment_title IS 'Title for ad-hoc or special client assignments';
COMMENT ON COLUMN public.tasks.estimated_fee IS 'Estimated professional fee in INR';
