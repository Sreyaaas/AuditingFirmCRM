// Practice Settings & Configuration Storage Service
// Manages Custom WhatsApp Templates, Firm Legal Profile & Bank Payment Details

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

const STORAGE_KEY_WHATSAPP = 'shameer_crm_whatsapp_templates';
const STORAGE_KEY_FIRM_PROFILE = 'shameer_crm_firm_profile';

export const DEFAULT_WHATSAPP_TEMPLATES: WhatsAppTemplateSettings = {
  docRequest: `Hello {{clientName}},\n\nThis is Shameer & Associates.\n\nPlease share your sales invoices, purchase registers, and bank statements for {{period}}.\n\nStatutory deadline: {{dueDate}}.\n\nPlease share the records directly here on WhatsApp so our audit team can review.\n\nThank you,\nShameer & Associates`,

  paymentReminder: `Dear {{clientName}},\n\nGentle reminder from Shameer & Associates regarding professional accounting and compliance fees.\n\nTotal Pending Amount: ₹{{amount}}\nAccount Ledger Status: Overdue\n\nPlease transfer to our bank account or via UPI ({{upiId}}):\nBank: {{bankName}}\nA/C No: {{accountNumber}}\nIFSC: {{ifscCode}}\n\nLet us know once completed so we can update your ledger.\n\nRegards,\nShameer & Associates`,

  filingAck: `Dear {{clientName}},\n\nYour {{period}} return has been filed successfully on the government portal.\n\nFiling Reference / ARN: {{arn}}\nFiled by: Shameer & Associates\n\nThe official acknowledgment receipt has been saved for your records.\n\nThank you,\nShameer & Associates`,
};

export const DEFAULT_FIRM_PROFILE: FirmProfileSettings = {
  legalName: 'Shameer & Associates | Accountants and Practitioners',
  category: 'Accountants & Tax Practitioners',
  address: 'Mavoor Road Commercial Complex, Calicut & MG Road, Kochi, Kerala, India',
  gstin: '32AABCS9821L1Z0',
  pan: 'AABCS9821L',
  phone: '+91 98470 12345',
  email: 'contact@shameerassociates.in',
  beneficiaryName: 'Shameer & Associates',
  bankName: 'Federal Bank',
  branch: 'Calicut Main Branch',
  accountNumber: '12450200045612',
  ifscCode: 'FDRL0001245',
  upiId: 'shameerassociates@okaxis',
};

export const getStoredWhatsAppTemplates = (): WhatsAppTemplateSettings => {
  if (typeof window === 'undefined') return DEFAULT_WHATSAPP_TEMPLATES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_WHATSAPP);
    if (raw) {
      return { ...DEFAULT_WHATSAPP_TEMPLATES, ...JSON.parse(raw) };
    }
  } catch {
    // fallback
  }
  return DEFAULT_WHATSAPP_TEMPLATES;
};

export const saveStoredWhatsAppTemplates = (templates: WhatsAppTemplateSettings): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_WHATSAPP, JSON.stringify(templates));
  } catch (err) {
    console.error('Failed to save whatsapp templates:', err);
  }
};

export const getStoredFirmProfile = (): FirmProfileSettings => {
  if (typeof window === 'undefined') return DEFAULT_FIRM_PROFILE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FIRM_PROFILE);
    if (raw) {
      return { ...DEFAULT_FIRM_PROFILE, ...JSON.parse(raw) };
    }
  } catch {
    // fallback
  }
  return DEFAULT_FIRM_PROFILE;
};

export const saveStoredFirmProfile = (profile: FirmProfileSettings): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_FIRM_PROFILE, JSON.stringify(profile));
  } catch (err) {
    console.error('Failed to save firm profile:', err);
  }
};

export function renderTemplate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, val] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, val ?? '');
  }
  return result;
}
