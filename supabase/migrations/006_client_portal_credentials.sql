-- Migration 006: Client Government Portal Access Credentials
-- Adds GST, Income Tax e-Filing, and TRACES login credential columns to the clients table

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS gst_username TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS gst_password TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS it_username TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS it_password TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS traces_password TEXT;
