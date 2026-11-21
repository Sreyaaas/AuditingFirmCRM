-- 005_client_partner_contacts.sql
-- Add partner and secondary phone numbers to clients table

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS partner_name TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS partner_phone TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS secondary_phone TEXT;
