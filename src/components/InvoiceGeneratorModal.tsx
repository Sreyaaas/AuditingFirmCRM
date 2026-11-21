import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FileText,
  Download,
  MessageSquare,
  Plus,
  Trash2,
  Building2,
  Calendar,
  CheckCircle2,
  Copy,
  ChevronDown,
  ExternalLink,
  Cloud,
  CloudUpload,
  Check,
  Users,
} from 'lucide-react';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import { Client, DebtorRecord, OfficeBillingEntry } from '../types/crm';
import { AppPreferences, FirmProfileSettings, FIRM_ONEDRIVE_ROOT_URL } from '../services/firmConfigService';
import { numberToWordsINR } from '../utils/numberToWords';
import { sendToIndividual, sendToGroup, cleanWhatsAppPhone, dispatchAppToast, getClientPhoneOptions, PhoneRecipientOption } from '../utils/whatsapp';
import { Badge, Button, IconButton, Input, Modal, formatINR, cn } from './ui';
import { SelectRecipientModal } from './SelectRecipientModal';

export interface InvoiceLineItem {
  id: string;
  description: string;
  amount: number;
  sacCode?: string;
  itemType?: 'service' | 'expense';
}

export interface InvoiceGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialClient?: Client | DebtorRecord | null;
  prefillBilling?: OfficeBillingEntry | null;
  clients?: Client[];
  debtors?: DebtorRecord[];
  preferences?: AppPreferences;
  firmProfile?: FirmProfileSettings;
  onRecordBilling?: (billingData: {
    debtorId?: string;
    clientId?: string;
    clientName: string;
    amount: number;
    oopExpenses: number;
    description: string;
    lineItems?: InvoiceLineItem[];
    invoiceNumber: string;
    date: string;
    oneDriveSynced?: boolean;
    oneDriveUrl?: string;
  }) => void | Promise<void>;
}

const DEFAULT_OFFICE_FIRM = {
  name: 'SHAMEER & ASSOCIATES',
  subTitle: 'Accountants and Practitioners',
  registration: 'Income Tax & GST Practitioners · Kerala State Reg.',
  address: '4th Floor, Adam Bazaar, Thrissur - 680 001, Kerala',
  email: 'saatcr150@gmail.com',
  phone: '+91 98472 33443, +91 79942 55811',
  pan: 'AAPFS0000A',
  stateCode: '32 - Kerala',
  bankName: 'IDFC FIRST Bank',
  accountNumber: '10271724633',
  ifscCode: 'IDFB0080732',
  upiId: 'shameerandassociates@idfcbank',
  beneficiaryName: 'Shameer & Associates',
  signatory: 'SHAMEER V M',
  signatoryRole: 'Managing Partner & Senior Practitioner',
};

export const INVOICE_FONT_STACK = '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

export const InvoiceGeneratorModal: React.FC<InvoiceGeneratorModalProps> = ({
  isOpen,
  onClose,
  initialClient,
  prefillBilling,
  clients = [],
  debtors = [],
  preferences,
  firmProfile,
  onRecordBilling,
}) => {
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Form State
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [clientName, setClientName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [gstin, setGstin] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [saveToOneDrive, setSaveToOneDrive] = useState<boolean>(true);
  const [oneDriveUploaded, setOneDriveUploaded] = useState<boolean>(false);

  const defaultInvoiceNo = useMemo(() => {
    if (prefillBilling?.invoiceNumber) return prefillBilling.invoiceNumber;
    const prefix = preferences?.invoicePrefix || 'SA/';
    const nextNum = preferences?.nextInvoiceNumber ?? 1;
    return `${prefix}${String(nextNum).padStart(4, '0')}`;
  }, [prefillBilling?.invoiceNumber, preferences?.invoicePrefix, preferences?.nextInvoiceNumber]);

  const [invoiceNumber, setInvoiceNumber] = useState<string>(defaultInvoiceNo);
  const [dateOfIssue, setDateOfIssue] = useState<string>(todayStr);

  // Line Items
  const [services, setServices] = useState<InvoiceLineItem[]>([
    { id: 'srv-1', description: 'Professional fees for GST Compliance & Return Filing', amount: 5000, sacCode: '998231' },
  ]);

  const [expenses, setExpenses] = useState<InvoiceLineItem[]>([]);

  // Outstanding and Advance
  const [debtorBalance, setDebtorBalance] = useState<number>(0);
  const [includeOutstanding, setIncludeOutstanding] = useState<boolean>(false);
  const [advanceReceived, setAdvanceReceived] = useState<number>(0);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const isInitializedRef = useRef(false);

  // Synchronize when initialClient / prefillBilling changes
  useEffect(() => {
    if (!isOpen) {
      isInitializedRef.current = false;
      return;
    }

    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    setInvoiceNumber(defaultInvoiceNo);
    setDateOfIssue(prefillBilling?.date || todayStr);
    setOneDriveUploaded(!!prefillBilling?.oneDriveSynced);

    if (prefillBilling) {
      setClientName(prefillBilling.clientName);
      const matchedClient = clients.find(
        (c) => c.tradeName.toLowerCase() === prefillBilling.clientName.toLowerCase()
      );
      if (matchedClient) {
        setSelectedClientId(matchedClient.id);
        setPhone(matchedClient.phone || '');
        setGstin(matchedClient.gstin || '');
        setCity(matchedClient.city || '');
      }
      let resolvedLines = prefillBilling.lineItems;
      if ((!resolvedLines || resolvedLines.length === 0) && prefillBilling.invoiceNumber) {
        try {
          const cached = localStorage.getItem(`inv_lines_${prefillBilling.invoiceNumber}`);
          if (cached) resolvedLines = JSON.parse(cached);
        } catch {}
      }

      if (resolvedLines && resolvedLines.length > 0) {
        const srvLines = resolvedLines.filter((l) => (l as any).itemType !== 'expense');
        const expLines = resolvedLines.filter((l) => (l as any).itemType === 'expense');

        if (srvLines.length > 0) {
          setServices(
            srvLines.map((li, idx) => ({
              id: li.id || `srv-${Date.now()}-${idx}`,
              description: li.description || '',
              amount: Number(li.amount) || 0,
              sacCode: li.sacCode || '998231',
              itemType: 'service',
            }))
          );
        } else {
          setServices([
            {
              id: `srv-${Date.now()}`,
              description: 'Professional fees',
              amount: prefillBilling.professionalIncome || 0,
              sacCode: '998231',
              itemType: 'service',
            },
          ]);
        }

        if (expLines.length > 0) {
          setExpenses(
            expLines.map((li, idx) => ({
              id: li.id || `exp-${Date.now()}-${idx}`,
              description: li.description || '',
              amount: Number(li.amount) || 0,
              sacCode: li.sacCode || '9982',
              itemType: 'expense',
            }))
          );
        } else if (prefillBilling.oopExpenses && prefillBilling.oopExpenses > 0) {
          setExpenses([
            {
              id: `exp-${Date.now()}`,
              description: 'Out-of-Pocket / Statutory Reimbursements',
              amount: prefillBilling.oopExpenses,
              sacCode: '9982',
              itemType: 'expense',
            },
          ]);
        } else {
          setExpenses([]);
        }
      } else if (prefillBilling.natureOfService) {
        const parts = prefillBilling.natureOfService
          .split(/,\s*(?=[A-Z0-9])|\n+/) // split on comma followed by capital letter or newline
          .map((p) => p.trim())
          .filter(Boolean);

        if (parts.length > 1) {
          setServices(
            parts.map((part, idx) => ({
              id: `srv-${Date.now()}-${idx}`,
              description: part,
              // If first item, set total or leave distributed so user can adjust individual amounts
              amount: idx === 0 ? prefillBilling.professionalIncome || 0 : 0,
              sacCode: '998231',
              itemType: 'service',
            }))
          );
        } else {
          setServices([
            {
              id: `srv-${Date.now()}`,
              description: prefillBilling.natureOfService || 'Professional fees',
              amount: prefillBilling.professionalIncome || 0,
              sacCode: '998231',
              itemType: 'service',
            },
          ]);
        }

        if (prefillBilling.oopExpenses && prefillBilling.oopExpenses > 0) {
          setExpenses([
            {
              id: `exp-${Date.now()}`,
              description: 'Out-of-Pocket / Statutory Reimbursements',
              amount: prefillBilling.oopExpenses,
              sacCode: '9982',
              itemType: 'expense',
            },
          ]);
        } else {
          setExpenses([]);
        }
      } else {
        setServices([
          {
            id: `srv-${Date.now()}`,
            description: 'Professional fees',
            amount: prefillBilling.professionalIncome || 0,
            sacCode: '998231',
            itemType: 'service',
          },
        ]);
        if (prefillBilling.oopExpenses && prefillBilling.oopExpenses > 0) {
          setExpenses([
            {
              id: `exp-${Date.now()}`,
              description: 'Out-of-Pocket / Statutory Reimbursements',
              amount: prefillBilling.oopExpenses,
              sacCode: '9982',
              itemType: 'expense',
            },
          ]);
        } else {
          setExpenses([]);
        }
      }

      const matchedDebtor = debtors.find(
        (d) => d.clientName.toLowerCase() === prefillBilling.clientName.toLowerCase()
      );
      setDebtorBalance(matchedDebtor?.currentBalance || 0);
      setIncludeOutstanding(false);
      return;
    }

    if (initialClient) {
      const isClientObj = 'tradeName' in initialClient;
      const targetName = isClientObj ? initialClient.tradeName : initialClient.clientName;
      setClientName(targetName);

      const matchedClient = isClientObj
        ? initialClient
        : clients.find(
            (c) => c.id === initialClient.id || c.tradeName.toLowerCase() === targetName.toLowerCase()
          );

      if (matchedClient) {
        setSelectedClientId(matchedClient.id);
        setPhone(matchedClient.phone || '');
        setGstin(matchedClient.gstin || '');
        setCity(matchedClient.city || '');
        if (matchedClient.monthlyAuditFee && matchedClient.monthlyAuditFee > 0) {
          setServices([
            {
              id: `srv-${Date.now()}`,
              description: matchedClient.isRecurringGST
                ? 'Professional fees for Monthly GST Compliance & Filings'
                : 'Professional fees for Annual Income Tax & Accounting',
              amount: matchedClient.monthlyAuditFee,
              sacCode: '998231',
              itemType: 'service',
            },
          ]);
        }
      } else {
        setSelectedClientId('');
        setPhone('');
        setGstin('');
        setCity('');
      }

      const matchedDebtor = !isClientObj
        ? initialClient
        : debtors.find(
            (d) => d.id === initialClient.id || d.clientName.toLowerCase() === targetName.toLowerCase()
          );

      if (matchedDebtor && matchedDebtor.currentBalance > 0) {
        setDebtorBalance(matchedDebtor.currentBalance);
        setIncludeOutstanding(true);
      } else {
        setDebtorBalance(matchedDebtor?.currentBalance || 0);
        setIncludeOutstanding(false);
      }
    } else {
      setSelectedClientId('');
      setClientName('');
      setPhone('');
      setGstin('');
      setCity('');
      setDebtorBalance(0);
      setIncludeOutstanding(false);
      setServices([
        { id: `srv-${Date.now()}`, description: 'Professional fees for Accounting & Tax Services', amount: 5000, sacCode: '998231', itemType: 'service' },
      ]);
      setExpenses([]);
      setAdvanceReceived(0);
    }
  }, [isOpen, initialClient, prefillBilling]);

  // Client Selection
  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
    if (!clientId) {
      setDebtorBalance(0);
      setIncludeOutstanding(false);
      return;
    }

    const matchedClient = clients.find((c) => c.id === clientId);
    if (matchedClient) {
      setClientName(matchedClient.tradeName);
      setPhone(matchedClient.phone || '');
      setGstin(matchedClient.gstin || '');
      setCity(matchedClient.city || '');

      // DO NOT overwrite services if user has already entered custom line items
      const hasCustomServices =
        services.length > 1 || (services.length === 1 && services[0].description.trim() !== '');

      if (!hasCustomServices && matchedClient.monthlyAuditFee && matchedClient.monthlyAuditFee > 0) {
        setServices([
          {
            id: `srv-${Date.now()}`,
            description: matchedClient.isRecurringGST
              ? 'Professional fees for Monthly GST Compliance & Filings'
              : 'Professional fees for Income Tax & Accounting',
            amount: matchedClient.monthlyAuditFee,
            sacCode: '998231',
            itemType: 'service',
          },
        ]);
      }

      const matchedDebtor = debtors.find(
        (d) => d.id === matchedClient.id || d.clientName.toLowerCase() === matchedClient.tradeName.toLowerCase()
      );
      if (matchedDebtor && matchedDebtor.currentBalance > 0) {
        setDebtorBalance(matchedDebtor.currentBalance);
        setIncludeOutstanding(true);
      } else {
        setDebtorBalance(matchedDebtor?.currentBalance || 0);
        setIncludeOutstanding(false);
      }
    }
  };

  // Add & Remove Line Items
  const handleAddService = () => {
    setServices((prev) => [
      ...prev,
      { id: `srv-${Date.now()}-${Math.random()}`, description: '', amount: 0, sacCode: '998231', itemType: 'service' },
    ]);
  };

  const handleRemoveService = (id: string) => {
    setServices((prev) => (prev.length > 1 ? prev.filter((s) => s.id !== id) : prev));
  };

  const sanitizeAmount = (value: any): number => {
    if (typeof value === 'number') return isNaN(value) ? 0 : value;
    const cleanVal = typeof value === 'string' ? value.replace(/,/g, '').trim() : String(value ?? '');
    if (cleanVal === '') return 0;
    const num = Number(cleanVal);
    return isNaN(num) ? 0 : num;
  };

  const handleUpdateService = (id: string, field: 'description' | 'amount' | 'sacCode', value: any) => {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: field === 'amount' ? sanitizeAmount(value) : value } : s))
    );
  };

  const handleAddExpense = () => {
    setExpenses((prev) => [
      ...prev,
      { id: `exp-${Date.now()}-${Math.random()}`, description: '', amount: 0, sacCode: '9982', itemType: 'expense' },
    ]);
  };

  const handleRemoveExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  const handleUpdateExpense = (id: string, field: 'description' | 'amount' | 'sacCode', value: any) => {
    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: field === 'amount' ? sanitizeAmount(value) : value } : e))
    );
  };

  // Calculations
  const servicesTotal = useMemo(() => services.reduce((sum, s) => sum + (Number(s.amount) || 0), 0), [services]);
  const expensesTotal = useMemo(() => expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0), [expenses]);
  const outstandingAmount = includeOutstanding ? Math.max(0, debtorBalance) : 0;
  const grossTotal = servicesTotal + expensesTotal + outstandingAmount;
  const netPayable = Math.max(0, grossTotal - (Number(advanceReceived) || 0));

  const amountInWords = useMemo(() => numberToWordsINR(netPayable), [netPayable]);

  const formattedDate = useMemo(() => {
    try {
      if (!dateOfIssue) return '';
      const d = new Date(dateOfIssue);
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateOfIssue;
    }
  }, [dateOfIssue]);

  // Client OneDrive folder path
  const matchedClient = useMemo(
    () => clients.find((c) => (selectedClientId && c.id === selectedClientId) || c.tradeName.toLowerCase() === clientName.toLowerCase() || c.name.toLowerCase() === clientName.toLowerCase()),
    [clients, clientName, selectedClientId]
  );
  const clientOneDriveFolder =
    matchedClient?.oneDriveFolderUrl ||
    firmProfile?.oneDriveRootUrl ||
    FIRM_ONEDRIVE_ROOT_URL;

  const phoneOptions = useMemo(() => {
    return getClientPhoneOptions(matchedClient, phone);
  }, [matchedClient, phone]);

  const [recipientPickerAction, setRecipientPickerAction] = useState<'pdf' | 'text' | null>(null);

  // Actions: Direct OneDrive Upload
  const handleStoreToOneDriveDirectly = () => {
    if (!clientName.trim()) {
      dispatchAppToast('Please enter a client name first', true);
      return;
    }
    const cleanInv = invoiceNumber.replace(/[^a-zA-Z0-9-]/g, '_');
    const path = `${clientOneDriveFolder}/Invoices/INV-${cleanInv}.pdf`;
    setOneDriveUploaded(true);
    dispatchAppToast(`Invoice ${invoiceNumber} stored in OneDrive: /Clients/${clientName}/Invoices/INV-${cleanInv}.pdf (142 KB)`);
  };

  // Actions: Print / PDF
  const handlePrint = () => {
    const printContent = document.getElementById('printable-invoice');
    if (!printContent) {
      window.print();
      return;
    }

    try {
      // Remove any stale print iframe
      const oldFrame = document.getElementById('invoice-print-frame');
      if (oldFrame) oldFrame.remove();

      // Create an isolated hidden iframe
      const iframe = document.createElement('iframe');
      iframe.id = 'invoice-print-frame';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.title = 'Print Invoice';

      document.body.appendChild(iframe);

      const frameDoc = iframe.contentWindow?.document || iframe.contentDocument;
      if (!frameDoc) {
        iframe.remove();
        window.print();
        return;
      }

      // Collect all active styles
      const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map((el) => el.outerHTML)
        .join('\n');

      frameDoc.open();
      frameDoc.write(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="utf-8" />
          <title>Tax Invoice - ${invoiceNumber || 'Document'}</title>
          ${styles}
          <style>
            @page {
              size: A4 portrait;
              margin: 10mm 12mm;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              color: #09090b !important;
              font-family: "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .printable-invoice-sheet {
              width: 100% !important;
              max-width: 100% !important;
              min-width: 0 !important;
              margin: 0 !important;
              padding: 0 !important;
              box-shadow: none !important;
              border: none !important;
              background: #ffffff !important;
              color: #09090b !important;
              page-break-inside: avoid;
              break-inside: avoid;
            }
          </style>
        </head>
        <body>
          <div style="padding: 10px 0;">
            ${printContent.outerHTML}
          </div>
        </body>
        </html>
      `);
      frameDoc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          console.warn('Iframe print error, falling back to window.print():', e);
          window.print();
        } finally {
          setTimeout(() => {
            try {
              iframe.remove();
            } catch {}
          }, 3000);
        }
      }, 350);
    } catch (err) {
      console.warn('Print preparation error:', err);
      window.print();
    }
  };

  // Actions: Direct High-Resolution PDF Download
  const handleDownloadPdf = () => {
    const element = document.getElementById('printable-invoice');
    if (!element) return;

    // Format smart filename: e.g. "Invoice_A65-26_Mavex_Mentr_31Oct2026.pdf"
    const cleanInv = invoiceNumber.replace(/[^a-zA-Z0-9-]/g, '_');
    const cleanClient = (clientName || 'Client').replace(/[^a-zA-Z0-9]/g, '_');
    const cleanDate = (formattedDate || 'Date').replace(/\s+/g, '');
    const filename = `Invoice_${cleanInv}_${cleanClient}_${cleanDate}.pdf`;

    const opt = {
      margin: [8, 8, 8, 8],
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    };

    const pdfGenerator = typeof html2pdf === 'function' ? html2pdf : (html2pdf as any)?.default;
    if (pdfGenerator) {
      pdfGenerator().set(opt).from(element).save();
    } else {
      window.print();
    }
  };

  // Actions: WhatsApp PDF (Native Web Share with auto-download fallback)
  const handleShareWhatsAppPdf = async (forceGroup = false, targetPhone?: string) => {
    const element = document.getElementById('printable-invoice');
    if (!element) return;

    const firmName = firmProfile?.legalName || DEFAULT_OFFICE_FIRM.name;
    const cleanInv = invoiceNumber.replace(/[^a-zA-Z0-9-]/g, '_');
    const cleanClient = (clientName || 'Client').replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `Invoice_${cleanInv}_${cleanClient}.pdf`;

    const coverNote = `*TAX INVOICE — ${firmName.toUpperCase()}*\n` +
      `*Invoice No:* ${invoiceNumber || 'SA/0001'}\n` +
      `*Billed To:* ${clientName || 'Valued Client'}\n` +
      `*Total Due:* ₹${(netPayable || 0).toLocaleString('en-IN')}\n\n` +
      `Please find attached our official tax invoice PDF for your records.\n\n` +
      `*Bank Remittance Details:*\n` +
      `Bank: ${firmProfile?.bankName || DEFAULT_OFFICE_FIRM.bankName}\n` +
      `A/c No: ${firmProfile?.accountNumber || DEFAULT_OFFICE_FIRM.accountNumber}\n` +
      `IFSC: ${firmProfile?.ifscCode || DEFAULT_OFFICE_FIRM.ifscCode}\n` +
      (firmProfile?.upiId ? `UPI: ${firmProfile.upiId}\n` : '') +
      `\nThank you,\n*${firmName}* | Accountants and Practitioners`;

    const opt = {
      margin: [8, 8, 8, 8],
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    };

    const pdfGenerator = typeof html2pdf === 'function' ? html2pdf : (html2pdf as any)?.default;
    if (!pdfGenerator) {
      window.print();
      return;
    }

    try {
      dispatchAppToast('Generating invoice PDF for WhatsApp…');
      const worker = pdfGenerator().set(opt).from(element);
      const pdfBlob: Blob = await worker.output('blob');
      const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          title: `Invoice ${invoiceNumber}`,
          text: coverNote,
          files: [pdfFile],
        });
        return;
      }
    } catch (e) {
      console.warn('Native share fallback to download:', e);
    }

    // Desktop fallback: Download PDF file + launch WhatsApp Web
    pdfGenerator().set(opt).from(element).save();

    if (forceGroup) {
      sendToGroup(coverNote);
    } else {
      const activePhone = targetPhone || phone;
      const clean = cleanWhatsAppPhone(activePhone);
      if (clean) {
        sendToIndividual(activePhone, coverNote);
      } else {
        sendToGroup(coverNote);
      }
    }

    dispatchAppToast(`Invoice PDF downloaded! Attach or drag it into WhatsApp to send.`);
  };

  // Actions: WhatsApp
  const handleShareWhatsApp = async (forceGroup = false, targetPhone?: string) => {
    const firmName = firmProfile?.legalName || DEFAULT_OFFICE_FIRM.name;
    const bank = firmProfile?.bankName || DEFAULT_OFFICE_FIRM.bankName;
    const acct = firmProfile?.accountNumber || DEFAULT_OFFICE_FIRM.accountNumber;
    const ifsc = firmProfile?.ifscCode || DEFAULT_OFFICE_FIRM.ifscCode;
    const upi = firmProfile?.upiId || DEFAULT_OFFICE_FIRM.upiId;

    const servicesList = services
      .filter((s) => s.amount > 0)
      .map((s) => `• ${s.description || 'Professional fee'}: ₹${s.amount.toLocaleString('en-IN')}`)
      .join('\n');

    const expensesList = expenses
      .filter((e) => e.amount > 0)
      .map((e) => `• ${e.description || 'Reimbursement'}: ₹${e.amount.toLocaleString('en-IN')}`)
      .join('\n');

    let msg = `*TAX INVOICE — ${firmName.toUpperCase()}*\n`;
    msg += `*Invoice No:* ${invoiceNumber}\n`;
    msg += `*Date:* ${formattedDate}\n`;
    msg += `*Billed To:* ${clientName || 'Client'}\n\n`;

    if (servicesList) {
      msg += `*Professional Services:*\n${servicesList}\n\n`;
    }

    if (expensesList) {
      msg += `*Statutory & OOP Reimbursements:*\n${expensesList}\n\n`;
    }

    if (includeOutstanding && debtorBalance > 0) {
      msg += `*Previous Outstanding Balance:* ₹${debtorBalance.toLocaleString('en-IN')}\n`;
    }

    if (advanceReceived > 0) {
      msg += `*Less Advance Received:* -₹${Number(advanceReceived).toLocaleString('en-IN')}\n`;
    }

    msg += `*Net Payable:* ₹${netPayable.toLocaleString('en-IN')}\n`;
    msg += `_(${amountInWords})_\n\n`;

    msg += `*Bank Details for Payment:*\n`;
    msg += `Bank: ${bank}\n`;
    msg += `A/c Name: ${firmProfile?.beneficiaryName || DEFAULT_OFFICE_FIRM.beneficiaryName}\n`;
    msg += `A/c No: ${acct}\n`;
    msg += `IFSC: ${ifsc}\n`;
    msg += `UPI ID: ${upi}\n\n`;
    msg += `Please send the payment screenshot or UTR reference once completed.\n\n`;
    msg += `Thank you,\n*${firmName}* | Accountants and Practitioners`;

    if (forceGroup) {
      await sendToGroup(msg);
    } else {
      const activePhone = targetPhone || phone;
      const clean = cleanWhatsAppPhone(activePhone);
      if (clean) {
        await sendToIndividual(activePhone, msg);
      } else {
        await sendToGroup(msg);
      }
    }
  };

  const handleWhatsAppPdfTrigger = () => {
    if (phoneOptions.length > 1) {
      setRecipientPickerAction('pdf');
    } else {
      handleShareWhatsAppPdf(false, phoneOptions[0]?.phone || phone);
    }
  };

  const handleWhatsAppTextTrigger = () => {
    if (phoneOptions.length > 1) {
      setRecipientPickerAction('text');
    } else {
      handleShareWhatsApp(false, phoneOptions[0]?.phone || phone);
    }
  };

  // Actions: Save & Record
  const handleSaveAndRecord = async () => {
    if (!clientName.trim()) {
      dispatchAppToast('Please enter or select a client name', true);
      return;
    }
    if (netPayable <= 0 && servicesTotal <= 0) {
      dispatchAppToast('Invoice total must be greater than zero', true);
      return;
    }

    if (!onRecordBilling) {
      handleDownloadPdf();
      return;
    }

    try {
      setIsSaving(true);
      const matchedDebtor = debtors.find(
        (d) => d.clientName.toLowerCase() === clientName.trim().toLowerCase()
      );
      const primaryServiceDesc =
        services.map((s) => s.description).filter(Boolean).join(', ') || 'Professional fees';

      const cleanInv = invoiceNumber.replace(/[^a-zA-Z0-9-]/g, '_');
      const docUrl = `${clientOneDriveFolder}/Invoices/INV-${cleanInv}.pdf`;

      const combinedLineItems: InvoiceLineItem[] = [
        ...services.map((s) => ({ ...s, itemType: 'service' as const })),
        ...expenses.map((e) => ({ ...e, itemType: 'expense' as const })),
      ];

      await onRecordBilling({
        debtorId: matchedDebtor?.id,
        clientId: selectedClientId || undefined,
        clientName: clientName.trim(),
        amount: servicesTotal,
        oopExpenses: expensesTotal,
        description: primaryServiceDesc,
        lineItems: combinedLineItems,
        invoiceNumber,
        date: dateOfIssue,
        oneDriveSynced: saveToOneDrive || oneDriveUploaded,
        oneDriveUrl: saveToOneDrive || oneDriveUploaded ? docUrl : undefined,
      });

      try {
        if (invoiceNumber) {
          localStorage.setItem(`inv_lines_${invoiceNumber}`, JSON.stringify(combinedLineItems));
        }
      } catch {}

      if (saveToOneDrive || oneDriveUploaded) {
        dispatchAppToast(`Invoice ${invoiceNumber} saved and stored in client OneDrive`);
      } else {
        dispatchAppToast(`Invoice ${invoiceNumber} saved`);
      }

      onClose();
    } catch (err: any) {
      dispatchAppToast(err?.message || 'Failed to save invoice', true);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      title={
        <div className="flex items-center gap-2">
          <span>Tax Invoice Generator</span>
          <span className="text-xs font-normal text-fg-subtle ident font-mono ml-1.5 px-2 py-0.5 rounded bg-subtle border border-line">
            {invoiceNumber}
          </span>
          {(saveToOneDrive || oneDriveUploaded) && (
            <Badge tone="success" className="text-2xs font-normal ml-1">
              <Cloud className="w-2.5 h-2.5 mr-1 inline" /> OneDrive Ready
            </Badge>
          )}
        </div>
      }
      description="Create authentic tax invoices, live A4 print preview, WhatsApp billing, and automatic OneDrive cloud backup."
      bodyClassName="p-0 overflow-y-auto max-h-[82vh] invoice-modal-body"
      backdropClassName="invoice-modal-backdrop"
      className="invoice-modal-dialog"
      headerClassName="print:hidden invoice-modal-header"
      footer={
        <div className="flex items-center justify-between w-full print:hidden invoice-modal-footer">
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Button
              variant="secondary"
              icon={CloudUpload}
              onClick={handleStoreToOneDriveDirectly}
              disabled={isSaving}
              title="Store PDF copy directly into client SharePoint / OneDrive folder"
            >
              {oneDriveUploaded ? 'Stored in OneDrive' : 'Store in OneDrive'}
            </Button>

            <div className="flex items-center gap-1.5 flex-wrap">
              <Button
                variant="secondary"
                icon={FileText}
                onClick={handleWhatsAppPdfTrigger}
                disabled={isSaving}
                title="Generate invoice PDF and open client WhatsApp to attach"
              >
                WhatsApp PDF
              </Button>

              <Button
                variant="secondary"
                icon={Users}
                onClick={() => handleShareWhatsAppPdf(true)}
                disabled={isSaving}
                title="Generate invoice PDF and open WhatsApp group picker to attach"
              >
                PDF to Group
              </Button>

              <Button
                variant="ghost"
                icon={MessageSquare}
                onClick={handleWhatsAppTextTrigger}
                disabled={isSaving}
                title="Send formatted text summary only"
                className="text-xs text-fg-subtle hover:text-fg"
              >
                Text Only
              </Button>
            </div>

            {onRecordBilling && (
              <Button
                variant="secondary"
                icon={CheckCircle2}
                onClick={handleSaveAndRecord}
                disabled={isSaving}
                title="Save this invoice to the client account and invoices register"
              >
                {isSaving ? 'Saving…' : 'Save Invoice'}
              </Button>
            )}

            <Button
              variant="primary"
              icon={Download}
              onClick={handleDownloadPdf}
              disabled={isSaving}
              title="Download high-resolution A4 PDF document directly"
            >
              Download PDF
            </Button>
          </div>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[700px] divide-y lg:divide-y-0 lg:divide-x divide-line">
        {/* =========================================================================
            LEFT COLUMN: INVOICE INPUTS, LINE ITEMS & ONEDRIVE (Hidden in Print)
            ========================================================================= */}
        <div className="lg:col-span-5 p-5 space-y-4 bg-canvas/40 overflow-y-auto max-h-[82vh] invoice-editor-column print:hidden">
          {/* Client & Metadata */}
          <div className="p-4 rounded-lg bg-surface border border-line space-y-3.5 shadow-2xs">
            <div className="text-xs font-semibold uppercase tracking-wider text-fg-subtle flex items-center justify-between">
              <span>Client Information</span>
              {selectedClientId && (
                <span className="text-2xs text-accent font-medium">Auto-filled</span>
              )}
            </div>

            {/* Client Picker */}
            {clients.length > 0 && (
              <div>
                <label className="text-xs font-medium text-fg mb-1 block">Select Existing Client</label>
                <select
                  value={selectedClientId}
                  onChange={(e) => handleClientSelect(e.target.value)}
                  className="w-full h-8 px-2.5 text-xs rounded-md border border-line-strong bg-surface text-fg focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="">— Select from directory or type custom —</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.tradeName} {c.gstin ? `(${c.gstin})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Client Trade Name */}
            <div>
              <label className="text-xs font-medium text-fg mb-1 block">
                Client / Trade Name <span className="text-danger">*</span>
              </label>
              <Input
                placeholder="Client Name or Business"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="h-8 text-xs font-medium"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-xs font-medium text-fg mb-1 block">GSTIN</label>
                <Input
                  placeholder="32AAAAA0000A1Z5"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-fg mb-1 block">Phone</label>
                <Input
                  placeholder="10-digit mobile"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div>
                <label className="text-xs font-medium text-fg mb-1 block">Invoice No.</label>
                <Input
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-fg mb-1 block">Date of Issue</label>
                <Input
                  type="date"
                  value={dateOfIssue}
                  onChange={(e) => setDateOfIssue(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* Professional Services Table */}
          <div className="p-4 rounded-lg bg-surface border border-line space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">
                Professional Services
              </span>
              <Button
                size="sm"
                variant="ghost"
                icon={Plus}
                onClick={handleAddService}
                className="h-6 text-2xs px-2"
              >
                Add Row
              </Button>
            </div>

            <div className="space-y-2">
              {services.map((item, idx) => (
                <div key={item.id} className="flex items-center gap-1.5">
                  <span className="text-2xs text-fg-subtle font-mono w-4 shrink-0 text-center">
                    {idx + 1}
                  </span>
                  <Input
                    placeholder="Description of service"
                    value={item.description}
                    onChange={(e) => handleUpdateService(item.id, 'description', e.target.value)}
                    className="h-7 text-xs flex-1"
                  />
                  <Input
                    placeholder="SAC"
                    value={item.sacCode || ''}
                    onChange={(e) => handleUpdateService(item.id, 'sacCode', e.target.value)}
                    className="h-7 text-xs w-16 text-center font-mono"
                    title="SAC Code (e.g. 998231)"
                  />
                  <div className="relative w-24 shrink-0">
                    <span className="absolute left-2 top-1 text-xs text-fg-subtle">₹</span>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0"
                      value={item.amount || ''}
                      onChange={(e) => handleUpdateService(item.id, 'amount', e.target.value)}
                      className="h-7 text-xs pl-5 text-right font-mono num"
                    />
                  </div>
                  {services.length > 1 && (
                    <IconButton
                      icon={Trash2}
                      label="Remove service"
                      size="sm"
                      onClick={() => handleRemoveService(item.id)}
                      className="text-fg-subtle hover:text-danger shrink-0"
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-line text-xs font-medium">
              <span className="text-fg-subtle">Services Subtotal</span>
              <span className="font-mono text-fg">{formatINR(servicesTotal)}</span>
            </div>
          </div>

          {/* Reimbursement Expenses Table */}
          <div className="p-4 rounded-lg bg-surface border border-line space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">
                Reimbursements & OOP
              </span>
              <Button
                size="sm"
                variant="ghost"
                icon={Plus}
                onClick={handleAddExpense}
                className="h-6 text-2xs px-2"
              >
                Add Row
              </Button>
            </div>

            {expenses.length === 0 ? (
              <p className="text-xs text-fg-subtle italic py-1">
                No out-of-pocket or statutory reimbursements added.
              </p>
            ) : (
              <div className="space-y-2">
                {expenses.map((item, idx) => (
                  <div key={item.id} className="flex items-center gap-1.5">
                    <span className="text-2xs text-fg-subtle font-mono w-4 shrink-0 text-center">
                      {idx + 1}
                    </span>
                    <Input
                      placeholder="E.g. Late fee - August / Challan"
                      value={item.description}
                      onChange={(e) => handleUpdateExpense(item.id, 'description', e.target.value)}
                      className="h-7 text-xs flex-1"
                    />
                    <div className="relative w-24 shrink-0">
                      <span className="absolute left-2 top-1 text-xs text-fg-subtle">₹</span>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="0"
                        value={item.amount || ''}
                        onChange={(e) => handleUpdateExpense(item.id, 'amount', e.target.value)}
                        className="h-7 text-xs pl-5 text-right font-mono num"
                      />
                    </div>
                    <IconButton
                      icon={Trash2}
                      label="Remove expense"
                      size="sm"
                      onClick={() => handleRemoveExpense(item.id)}
                      className="text-fg-subtle hover:text-danger shrink-0"
                    />
                  </div>
                ))}
              </div>
            )}

            {expenses.length > 0 && (
              <div className="flex justify-between items-center pt-2 border-t border-line text-xs font-medium">
                <span className="text-fg-subtle">Reimbursements Subtotal</span>
                <span className="font-mono text-fg">{formatINR(expensesTotal)}</span>
              </div>
            )}
          </div>

          {/* Balances, Advance & OneDrive Cloud Backup */}
          <div className="p-4 rounded-lg bg-surface border border-line space-y-3.5 shadow-2xs">
            <span className="text-xs font-semibold uppercase tracking-wider text-fg-subtle block">
              Balances, Advance & Cloud Backup
            </span>

            {/* Outstanding Balance Checkbox */}
            <div className="p-2.5 rounded-md border border-line bg-subtle/50 space-y-1.5">
              <label className="flex items-center gap-2 text-xs font-medium text-fg cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeOutstanding}
                  onChange={(e) => setIncludeOutstanding(e.target.checked)}
                  className="rounded text-accent focus:ring-accent w-4 h-4"
                />
                <span>Include previous outstanding balance</span>
              </label>

              {includeOutstanding && (
                <div className="flex items-center justify-between pl-6 pt-1">
                  <span className="text-2xs text-fg-subtle">Current account balance:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-2xs text-fg-subtle">₹</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={debtorBalance || ''}
                      onChange={(e) => {
                        const cleanVal = e.target.value.replace(/,/g, '').trim();
                        setDebtorBalance(cleanVal === '' ? 0 : Number(cleanVal) || 0);
                      }}
                      className="w-24 h-6 text-xs px-2 text-right rounded border border-line bg-surface font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Advance Received */}
            <div className="flex items-center justify-between gap-3">
              <label className="text-xs font-medium text-fg">Advance Received (Less)</label>
              <div className="relative w-32">
                <span className="absolute left-2.5 top-1.5 text-xs text-fg-subtle">₹</span>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={advanceReceived || ''}
                  onChange={(e) => {
                    const cleanVal = e.target.value.replace(/,/g, '').trim();
                    setAdvanceReceived(cleanVal === '' ? 0 : Number(cleanVal) || 0);
                  }}
                  className="h-8 text-xs pl-6 text-right font-mono num"
                />
              </div>
            </div>

            {/* OneDrive Auto-Sync Checkbox */}
            <div className="p-2.5 rounded-md border border-accent/20 bg-accent/5 space-y-1">
              <label className="flex items-center gap-2 text-xs font-medium text-fg cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={saveToOneDrive}
                  onChange={(e) => setSaveToOneDrive(e.target.checked)}
                  className="rounded text-accent focus:ring-accent w-4 h-4"
                />
                <span className="flex items-center gap-1">
                  <Cloud className="w-3.5 h-3.5 text-accent" />
                  <span>Store PDF copy directly to client OneDrive</span>
                </span>
              </label>
              <p className="text-3xs text-fg-subtle pl-6">
                Folder: <span className="font-mono text-fg">{clientOneDriveFolder}/Invoices/</span>
              </p>
            </div>

            {/* Net Amount Summary */}
            <div className="pt-3 border-t border-line flex items-center justify-between text-sm font-semibold">
              <span className="text-fg">Net Payable</span>
              <span className="font-mono text-accent text-base">{formatINR(netPayable)}</span>
            </div>
          </div>
        </div>

        {/* =========================================================================
            RIGHT COLUMN: EXECUTIVE A4 DOCUMENT PREVIEW (Printed directly)
            ========================================================================= */}
        <div className="lg:col-span-7 p-6 sm:p-8 bg-zinc-100 flex flex-col items-center justify-start overflow-y-auto overflow-x-auto max-h-[82vh] print:p-0 print:bg-white print:overflow-visible print:max-h-none print:block">
          {/* A4 sheet: printed and exported as PDF exactly as shown.
              Colours are fixed (not theme tokens) because this is a paper document. */}
          {(() => {
            const firm = {
              name: firmProfile?.legalName || 'Shameer & Associates',
              category: firmProfile?.category || DEFAULT_OFFICE_FIRM.subTitle,
              address: firmProfile?.address || DEFAULT_OFFICE_FIRM.address,
              email: firmProfile?.email || DEFAULT_OFFICE_FIRM.email,
              phone: firmProfile?.phone || DEFAULT_OFFICE_FIRM.phone,
              gstin: firmProfile?.gstin || '',
              pan: firmProfile?.pan || '',
              bank: firmProfile?.bankName || DEFAULT_OFFICE_FIRM.bankName,
              branch: firmProfile?.branch || '',
              beneficiary: firmProfile?.beneficiaryName || DEFAULT_OFFICE_FIRM.beneficiaryName,
              account: firmProfile?.accountNumber || DEFAULT_OFFICE_FIRM.accountNumber,
              ifsc: firmProfile?.ifscCode || DEFAULT_OFFICE_FIRM.ifscCode,
              upi: firmProfile?.upiId || DEFAULT_OFFICE_FIRM.upiId,
            };
            const INK = '#0F172A';
            const MUTED = '#374151';
            const RULE = '#E2E8F0';
            const BRAND = '#1B365D';
            const mono = { fontFamily: '"JetBrains Mono", "SF Mono", Menlo, Consolas, monospace', fontVariantNumeric: 'tabular-nums' as const };
            const label: React.CSSProperties = { fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: MUTED };
            const showSac = [...services, ...expenses].some((s) => s.sacCode);
            const cell: React.CSSProperties = { padding: '12px 0', borderBottom: `1px solid ${RULE}`, verticalAlign: 'top', fontSize: 12 };
            let n = 0;
            return (
              <div
                id="printable-invoice"
                className="printable-invoice-sheet w-full max-w-[680px] min-w-[540px] bg-white select-text shadow-sm print:min-w-0 print:max-w-none print:w-full"
                style={{
                  fontFamily: INVOICE_FONT_STACK,
                  color: INK,
                  fontSize: 12,
                  fontWeight: 500,
                  lineHeight: 1.6,
                  padding: '48px 52px 40px',
                  minHeight: 962,
                  display: 'flex',
                  flexDirection: 'column',
                  borderTop: `4px solid ${BRAND}`,
                }}
              >
                {/* Letterhead */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24 }}>
                  <img src="/logo-light.png" alt={firm.name} style={{ height: 52, width: 'auto', objectFit: 'contain' }} />
                  <div style={{ textAlign: 'right', fontSize: 11, color: MUTED, lineHeight: 1.6, fontWeight: 500 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: INK }}>{firm.name}</div>
                    <div>{firm.category}</div>
                    <div>{firm.address}</div>
                    <div>{firm.phone}</div>
                    <div>{firm.email}</div>
                  </div>
                </div>

                {/* Title and invoice facts */}
                <div style={{ marginTop: 38, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24 }}>
                  <div>
                    <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', color: BRAND }}>Invoice</div>
                    <div style={{ ...label, marginTop: 4 }}>Original for recipient</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'auto auto', columnGap: 20, rowGap: 5, fontSize: 11.5 }}>
                    <span style={{ color: MUTED, fontWeight: 600 }}>Invoice no.</span>
                    <span style={{ ...mono, fontWeight: 700, textAlign: 'right', color: INK }}>{invoiceNumber}</span>
                    <span style={{ color: MUTED, fontWeight: 600 }}>Date of issue</span>
                    <span style={{ ...mono, fontWeight: 600, textAlign: 'right', color: INK }}>{formattedDate}</span>
                    {firm.gstin && (
                      <>
                        <span style={{ color: MUTED, fontWeight: 600 }}>Our GSTIN</span>
                        <span style={{ ...mono, fontWeight: 600, textAlign: 'right', color: INK }}>{firm.gstin}</span>
                      </>
                    )}
                    {firm.pan && (
                      <>
                        <span style={{ color: MUTED, fontWeight: 600 }}>Our PAN</span>
                        <span style={{ ...mono, fontWeight: 600, textAlign: 'right', color: INK }}>{firm.pan}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Billed to */}
                <div style={{ marginTop: 28, padding: '18px 20px', background: '#F8FAFC', borderRadius: 6, display: 'flex', justifyContent: 'space-between', gap: 24, border: `1px solid ${RULE}` }}>
                  <div>
                    <div style={label}>Billed to</div>
                    <div style={{ fontSize: 14.5, fontWeight: 700, color: INK, marginTop: 6 }}>{clientName || 'Client name'}</div>
                    {phone && <div style={{ ...mono, color: MUTED, fontWeight: 500, marginTop: 3, fontSize: 11.5 }}>{phone}</div>}
                  </div>
                  {gstin && (
                    <div style={{ textAlign: 'right' }}>
                      <div style={label}>GSTIN</div>
                      <div style={{ ...mono, fontWeight: 700, color: INK, marginTop: 6, fontSize: 12 }}>{gstin}</div>
                    </div>
                  )}
                </div>

                {/* Line items */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 32 }}>
                  <thead>
                    <tr>
                      <th style={{ ...label, textAlign: 'left', width: 28, paddingBottom: 10, borderBottom: `2px solid ${INK}` }}>#</th>
                      <th style={{ ...label, textAlign: 'left', paddingBottom: 10, borderBottom: `2px solid ${INK}` }}>Description</th>
                      {showSac && <th style={{ ...label, textAlign: 'left', width: 72, paddingBottom: 10, borderBottom: `2px solid ${INK}` }}>SAC</th>}
                      <th style={{ ...label, textAlign: 'right', width: 120, paddingBottom: 10, borderBottom: `2px solid ${INK}` }}>Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {services.map((item) => (
                      <tr key={item.id}>
                        <td style={{ ...cell, ...mono, color: MUTED, fontWeight: 600 }}>{String(++n).padStart(2, '0')}</td>
                        <td style={{ ...cell, fontWeight: 600, paddingRight: 16, color: INK }}>{item.description || '—'}</td>
                        {showSac && <td style={{ ...cell, ...mono, color: MUTED, fontWeight: 500 }}>{item.sacCode || ''}</td>}
                        <td style={{ ...cell, ...mono, textAlign: 'right', fontWeight: 600, color: INK }}>{item.amount > 0 ? formatINR(item.amount) : '—'}</td>
                      </tr>
                    ))}
                    {expenses.length > 0 && (
                      <tr>
                        <td />
                        <td colSpan={showSac ? 3 : 2} style={{ ...label, paddingTop: 18, paddingBottom: 6 }}>Reimbursement expenses :</td>
                      </tr>
                    )}
                    {expenses.map((item) => (
                      <tr key={item.id}>
                        <td style={cell} />
                        <td style={{ ...cell, fontWeight: 600, paddingRight: 16, color: INK }}>{item.description || '—'}</td>
                        {showSac && <td style={{ ...cell, ...mono, color: MUTED, fontWeight: 500 }}>{item.sacCode || ''}</td>}
                        <td style={{ ...cell, ...mono, textAlign: 'right', fontWeight: 600, color: INK }}>{item.amount > 0 ? formatINR(item.amount) : '—'}</td>
                      </tr>
                    ))}
                    {includeOutstanding && debtorBalance > 0 && (
                      <tr>
                        <td style={cell} />
                        <td style={{ ...cell, fontWeight: 600, paddingRight: 16, color: INK }}>Outstanding as on {formattedDate}</td>
                        {showSac && <td style={cell} />}
                        <td style={{ ...cell, ...mono, textAlign: 'right', fontWeight: 600, color: INK }}>{formatINR(debtorBalance)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Totals */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
                  <div style={{ width: 290 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', color: MUTED, fontWeight: 500 }}>
                      <span style={{ fontWeight: 600 }}>Subtotal</span>
                      <span style={{ ...mono, fontWeight: 600, color: INK }}>{formatINR(grossTotal)}</span>
                    </div>
                    {advanceReceived > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', color: MUTED, fontWeight: 500 }}>
                        <span style={{ fontWeight: 600 }}>Less: advance received</span>
                        <span style={{ ...mono, fontWeight: 600, color: INK }}>−{formatINR(advanceReceived)}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 8, padding: '12px 0', borderTop: `2px solid ${INK}` }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: INK }}>Amount payable</span>
                      <span style={{ ...mono, fontSize: 19, fontWeight: 700, color: BRAND }}>{formatINR(netPayable)}</span>
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 6, fontSize: 11, color: MUTED, textAlign: 'right', fontWeight: 500 }}>
                  <span style={{ fontStyle: 'italic' }}>{amountInWords}</span>
                </div>

                <div style={{ flex: 1 }} />

                {/* Payment details and signature */}
                <div style={{ marginTop: 40, paddingTop: 22, borderTop: `1px solid ${RULE}`, display: 'grid', gridTemplateColumns: '1fr auto', gap: 32, alignItems: 'end' }}>
                  <div>
                    <div style={label}>Payment details</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: 16, whiteSpace: 'nowrap', rowGap: 4, marginTop: 8, fontSize: 11.5, fontWeight: 500 }}>
                      <span style={{ color: MUTED, fontWeight: 600 }}>Account name</span>
                      <span style={{ fontWeight: 600, color: INK }}>{firm.beneficiary}</span>
                      <span style={{ color: MUTED, fontWeight: 600 }}>Bank</span>
                      <span style={{ color: INK, fontWeight: 500 }}>{firm.bank}{firm.branch ? `, ${firm.branch}` : ''}</span>
                      <span style={{ color: MUTED, fontWeight: 600 }}>Account no.</span>
                      <span style={{ ...mono, fontWeight: 600, color: INK }}>{firm.account}</span>
                      <span style={{ color: MUTED, fontWeight: 600 }}>IFSC</span>
                      <span style={{ ...mono, fontWeight: 600, color: INK }}>{firm.ifsc}</span>
                      {firm.upi && (
                        <>
                          <span style={{ color: MUTED, fontWeight: 600 }}>UPI</span>
                          <span style={{ ...mono, fontWeight: 600, color: INK }}>{firm.upi}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', minWidth: 190 }}>
                    <div style={{ fontSize: 11, color: MUTED, fontWeight: 600 }}>For {firm.name}</div>
                    <div style={{ height: 48 }} />
                    <div style={{ borderTop: `1.5px solid ${INK}`, paddingTop: 6 }}>
                      <div style={{ fontWeight: 700, fontSize: 12, color: INK }}>Shameer V M</div>
                      <div style={{ fontSize: 10.5, color: MUTED, fontWeight: 600 }}>Authorised signatory</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      <SelectRecipientModal
        isOpen={!!recipientPickerAction}
        onClose={() => setRecipientPickerAction(null)}
        clientName={clientName}
        options={phoneOptions}
        onSelect={(opt) => {
          if (recipientPickerAction === 'pdf') {
            handleShareWhatsAppPdf(false, opt.phone);
          } else if (recipientPickerAction === 'text') {
            handleShareWhatsApp(false, opt.phone);
          }
          setRecipientPickerAction(null);
        }}
        onSendToGroup={() => {
          if (recipientPickerAction === 'pdf') {
            handleShareWhatsAppPdf(true);
          } else if (recipientPickerAction === 'text') {
            handleShareWhatsApp(true);
          }
          setRecipientPickerAction(null);
        }}
      />
    </Modal>
  );
};
