/**
 * WhatsApp integration utilities for Shameer & Associates CRM.
 * Adheres to Apple & Vercel design principles with understated, functional actions.
 */

export const cleanWhatsAppPhone = (phone?: string, defaultCountry = '91'): string => {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10) return `${defaultCountry}${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `${defaultCountry}${digits.slice(1)}`;
  return digits;
};

export const dispatchAppToast = (message: string, error = false) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('app-toast', { detail: { message, error } }));
  }
};

/**
 * Copies the message to the clipboard and opens the general WhatsApp link (group picker)
 */
export const sendToGroup = async (message: string, onToast?: (msg: string) => void): Promise<void> => {
  try {
    await navigator.clipboard.writeText(message);
  } catch (err) {
    console.warn('Clipboard write error:', err);
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  const toastMsg = 'Message copied & opening WhatsApp group picker';
  if (onToast) onToast(toastMsg);
  else dispatchAppToast(toastMsg);
};

/**
 * Cleans the recipient's phone number, copies backup text, and opens direct WhatsApp chat
 */
export const sendToIndividual = async (
  phone: string,
  message: string,
  onToast?: (msg: string) => void
): Promise<void> => {
  const clean = cleanWhatsAppPhone(phone);
  try {
    await navigator.clipboard.writeText(message);
  } catch (err) {
    console.warn('Clipboard write error:', err);
  }
  if (!clean) {
    const errorMsg = 'No phone number available for client';
    if (onToast) onToast(errorMsg);
    else dispatchAppToast(errorMsg, true);
    return;
  }
  window.open(`https://wa.me/${clean}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
};

/**
 * Copies message text directly to clipboard without opening WhatsApp
 */
export const copyMessageOnly = async (message: string, onToast?: (msg: string) => void): Promise<void> => {
  try {
    await navigator.clipboard.writeText(message);
  } catch (err) {
    console.warn('Clipboard write error:', err);
  }
  const toastMsg = 'Reminder copied to clipboard';
  if (onToast) onToast(toastMsg);
  else dispatchAppToast(toastMsg);
};

/**
 * Standard message composer for Debtor fee reminders
 */
export const formatDebtorReminderMessage = (debtor: {
  clientName: string;
  currentBalance?: number;
}): string => {
  const balance = (debtor.currentBalance || 0).toLocaleString('en-IN');
  return `Hello ${debtor.clientName},\n\nThis is a friendly reminder from Shameer & Associates regarding your outstanding professional fee balance of ₹${balance}.\n\nKindly arrange the payment at your earliest convenience. If you have already transferred the fee, please share the acknowledgment receipt.\n\nThank you,\nShameer & Associates`;
};

/**
 * Standard message composer for Compliance / Audit tasks
 */
export const formatTaskReminderMessage = (task: {
  clientName?: string;
  tradeName?: string;
  filingType: string;
  period: string;
  dueDate: string;
  status: string;
  arnNumber?: string;
  taxPayable?: number;
}): string => {
  const name = task.tradeName || task.clientName || 'Client';
  if (task.status === 'Filed') {
    return `Hello ${name},\n\nYour ${task.filingType} for ${task.period} has been filed successfully with the department.\n\nFiling Acknowledgment (ARN): ${task.arnNumber || '[Filed]'}\n\nThank you,\nShameer & Associates`;
  }
  if (task.status === 'Draft Ready') {
    const tax = task.taxPayable ? `\nNet Tax Payable: ₹${task.taxPayable.toLocaleString('en-IN')}` : '';
    return `Hello ${name},\n\nYour draft computation for ${task.filingType} (${task.period}) is ready for confirmation.${tax}\nDue Date: ${task.dueDate}\n\nPlease review and confirm so we can proceed with portal submission.\n\nThank you,\nShameer & Associates`;
  }
  return `Hello ${name},\n\nThis is a reminder from Shameer & Associates regarding your ${task.filingType} for ${task.period}.\n\nDue Date: ${task.dueDate}\n\nPlease share the pending records and bills at your earliest convenience to complete the filing on time.\n\nThank you,\nShameer & Associates`;
};

/**
 * Standard message composer for ITR returns
 */
export const formatItrReminderMessage = (itr: {
  clientName: string;
  itrForm: string;
  assessmentYear: string;
  dueDate: string;
  status: string;
  acknowledgmentNo?: string;
}): string => {
  if (itr.status === 'Filed & e-Verified') {
    return `Hello ${itr.clientName},\n\nYour Annual Income Tax Return (${itr.itrForm} for ${itr.assessmentYear}) has been filed and verified.\n\nAcknowledgment No: ${itr.acknowledgmentNo || '[Filed]'}\n\nThank you,\nShameer & Associates`;
  }
  return `Hello ${itr.clientName},\n\nThis is a reminder from Shameer & Associates regarding your Annual Income Tax Return (${itr.itrForm} for ${itr.assessmentYear}).\n\nFiling Target Date: ${itr.dueDate}\n\nPlease share your pending financial statements and documents directly so we can complete the draft computation.\n\nThank you,\nShameer & Associates`;
};

/**
 * Standard message composer for GST deadlines
 */
export const formatGstReminderMessage = (item: {
  clientName: string;
  tradeName?: string;
  returnType: string;
  filingMonth: string;
  dueDate: string;
  filingStatus: string;
  arnNumber?: string;
}): string => {
  const name = item.tradeName || item.clientName;
  if (item.filingStatus === 'Filed' || item.arnNumber) {
    return `Hello ${name},\n\nYour ${item.returnType} for ${item.filingMonth} has been filed successfully.\n\nARN: ${item.arnNumber || '[Filed]'}\n\nThank you,\nShameer & Associates`;
  }
  return `Hello ${name},\n\nThis is a reminder from Shameer & Associates regarding your ${item.returnType} return for ${item.filingMonth}.\n\nStatutory Due Date: ${item.dueDate}\n\nPlease share sales and purchase bills to avoid late filing penalties.\n\nThank you,\nShameer & Associates`;
};

