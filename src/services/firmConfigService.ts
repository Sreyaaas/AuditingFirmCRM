/**
 * Firm-wide settings: firm details & bank, WhatsApp templates and preferences.
 *
 * Source of truth is the Supabase `app_settings` table (admins write, active
 * staff read). A localStorage copy is kept so synchronous readers (e.g. the
 * WhatsApp composer) have the latest values without a round trip.
 */
import { supabase, isSupabaseConfigured } from './supabaseClient';

export interface WhatsAppTemplateSettings {
  docRequest: string;
  paymentReminder: string;
  filingAck: string;
}

export interface FirmProfileSettings {
  legalName: string;
  category: string;
  address: string;
  gstin: string;
  pan: string;
  phone: string;
  email: string;
  beneficiaryName: string;
  bankName: string;
  branch: string;
  accountNumber: string;
  ifscCode: string;
  upiId: string;
}

/** Admin-configurable behaviour of the CRM. */
export interface AppPreferences {
  /** Financial year label shown across the app, e.g. "2026-27". */
  financialYear: string;
  /** GST/TDS tasks due within this many days are flagged as due soon. */
  dueSoonDays: number;
  /** ITR returns due within this many days are flagged as due soon. */
  itrDueSoonDays: number;
  /** Country calling code prefixed to 10-digit numbers for WhatsApp. */
  whatsappCountryCode: string;
  /** Invoice numbers for new bills: prefix + running number. */
  invoicePrefix: string;
  nextInvoiceNumber: number;
  /** Sign users out after this many minutes without activity. 0 = never. */
  idleTimeoutMinutes: number;
  /** Defaults applied when a new staff member is added. */
  newStaffCanViewFees: boolean;
  newStaffCanRecordPayments: boolean;
}

const STORAGE_KEY_WHATSAPP = 'sa_crm_whatsapp_templates';
const STORAGE_KEY_FIRM_PROFILE = 'sa_crm_firm_profile';
const STORAGE_KEY_PREFERENCES = 'sa_crm_preferences';

export const DEFAULT_WHATSAPP_TEMPLATES: WhatsAppTemplateSettings = {
  docRequest: `Hello {{clientName}},\n\nPlease share your sales invoices, purchase bills and bank statements for {{period}}.\n\nDue date: {{dueDate}}.\n\nYou can send them here on WhatsApp.\n\nThank you,\nShameer & Associates`,

  paymentReminder: `Dear {{clientName}},\n\nThis is a reminder that ₹{{amount}} is outstanding towards our professional fees.\n\nYou can pay by UPI ({{upiId}}) or bank transfer:\nBank: {{bankName}}\nA/C No: {{accountNumber}}\nIFSC: {{ifscCode}}\n\nPlease let us know once paid.\n\nRegards,\nShameer & Associates`,

  filingAck: `Dear {{clientName}},\n\nYour {{period}} return has been filed.\n\nAcknowledgement / ARN: {{arn}}\n\nWe have kept a copy of the acknowledgement for your records.\n\nThank you,\nShameer & Associates`,
};

/** Only the firm name is pre-filled; tax IDs and bank details must be entered by an admin. */
export const DEFAULT_FIRM_PROFILE: FirmProfileSettings = {
  legalName: 'Shameer & Associates',
  category: 'Accountants and Tax Practitioners',
  address: '',
  gstin: '',
  pan: '',
  phone: '',
  email: '',
  beneficiaryName: 'Shameer & Associates',
  bankName: '',
  branch: '',
  accountNumber: '',
  ifscCode: '',
  upiId: '',
};

const fyFor = (d = new Date()) => {
  const start = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
};

export const DEFAULT_PREFERENCES: AppPreferences = {
  financialYear: fyFor(),
  dueSoonDays: 5,
  itrDueSoonDays: 10,
  whatsappCountryCode: '91',
  invoicePrefix: 'SA/',
  nextInvoiceNumber: 1,
  idleTimeoutMinutes: 30,
  newStaffCanViewFees: false,
  newStaffCanRecordPayments: false,
};

const readLocal = <T>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw) return { ...fallback, ...JSON.parse(raw) };
  } catch {
    /* ignore malformed cache */
  }
  return fallback;
};

const writeLocal = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or unavailable */
  }
};

export const getStoredWhatsAppTemplates = () => readLocal(STORAGE_KEY_WHATSAPP, DEFAULT_WHATSAPP_TEMPLATES);
export const getStoredFirmProfile = () => readLocal(STORAGE_KEY_FIRM_PROFILE, DEFAULT_FIRM_PROFILE);
export const getStoredPreferences = () => readLocal(STORAGE_KEY_PREFERENCES, DEFAULT_PREFERENCES);

const saveRemote = async (key: string, value: unknown): Promise<{ error?: string }> => {
  if (!isSupabaseConfigured()) return {};
  const { error } = await supabase.from('app_settings').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  return error ? { error: error.message } : {};
};

export const saveStoredWhatsAppTemplates = async (templates: WhatsAppTemplateSettings) => {
  writeLocal(STORAGE_KEY_WHATSAPP, templates);
  return saveRemote('whatsapp_templates', templates);
};

export const saveStoredFirmProfile = async (profile: FirmProfileSettings) => {
  writeLocal(STORAGE_KEY_FIRM_PROFILE, profile);
  return saveRemote('firm_profile', profile);
};

export const savePreferences = async (prefs: AppPreferences) => {
  writeLocal(STORAGE_KEY_PREFERENCES, prefs);
  return saveRemote('preferences', prefs);
};

/** Loads all settings from Supabase into the local cache. Call after sign-in. */
export const loadRemoteSettings = async (): Promise<{
  firmProfile: FirmProfileSettings;
  templates: WhatsAppTemplateSettings;
  preferences: AppPreferences;
}> => {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase.from('app_settings').select('key, value');
    if (!error && data) {
      const byKey = Object.fromEntries(data.map((r: any) => [r.key, r.value]));
      if (byKey.firm_profile) writeLocal(STORAGE_KEY_FIRM_PROFILE, { ...DEFAULT_FIRM_PROFILE, ...byKey.firm_profile });
      if (byKey.whatsapp_templates) writeLocal(STORAGE_KEY_WHATSAPP, { ...DEFAULT_WHATSAPP_TEMPLATES, ...byKey.whatsapp_templates });
      if (byKey.preferences) writeLocal(STORAGE_KEY_PREFERENCES, { ...DEFAULT_PREFERENCES, ...byKey.preferences });
    }
  }
  return { firmProfile: getStoredFirmProfile(), templates: getStoredWhatsAppTemplates(), preferences: getStoredPreferences() };
};

export function renderTemplate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, val] of Object.entries(vars)) {
    result = result.split(`{{${key}}}`).join(val ?? '');
  }
  return result;
}

/** Normalises a phone number for wa.me links using the configured country code. */
export const toWhatsAppNumber = (raw: string, countryCode = getStoredPreferences().whatsappCountryCode): string => {
  const digits = (raw || '').replace(/\D/g, '');
  if (digits.length === 10) return `${countryCode}${digits}`;
  return digits;
};
