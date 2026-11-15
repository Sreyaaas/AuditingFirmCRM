import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Printer,
  Download,
  MessageSquare,
  Plus,
  Trash2,
  Building2,
  Calendar,
  Receipt,
  CheckCircle2,
  Copy,
  ChevronDown,
  ExternalLink,
  Cloud,
  CloudUpload,
  Check,
} from 'lucide-react';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import { Client, DebtorRecord, OfficeBillingEntry } from '../types/crm';
import { AppPreferences, FirmProfileSettings } from '../services/firmConfigService';
import { numberToWordsINR } from '../utils/numberToWords';
import { sendToIndividual, sendToGroup, cleanWhatsAppPhone, dispatchAppToast } from '../utils/whatsapp';
import { Badge, Button, IconButton, Input, Modal, formatINR, cn } from './ui';

export interface InvoiceLineItem {
  id: string;
  description: string;
  amount: number;
  sacCode?: string;
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

  // Synchronize when initialClient / prefillBilling changes
  useEffect(() => {
    if (!isOpen) return;

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
      setServices([
        {
          id: `srv-${Date.now()}`,
          description: prefillBilling.natureOfService || 'Professional fees',
          amount: prefillBilling.professionalIncome || 0,
          sacCode: '998231',
        },
      ]);
      if (prefillBilling.oopExpenses && prefillBilling.oopExpenses > 0) {
        setExpenses([
          {
            id: `exp-${Date.now()}`,
            description: 'Out-of-Pocket / Statutory Reimbursements',
            amount: prefillBilling.oopExpenses,
            sacCode: '9982',
          },
        ]);
      } else {
        setExpenses([]);
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
        { id: `srv-${Date.now()}`, description: 'Professional fees for Accounting & Tax Services', amount: 5000, sacCode: '998231' },
      ]);
      setExpenses([]);
      setAdvanceReceived(0);
    }
  }, [isOpen, initialClient, prefillBilling, defaultInvoiceNo, todayStr, clients, debtors]);

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

      if (matchedClient.monthlyAuditFee && matchedClient.monthlyAuditFee > 0) {
        setServices([
          {
            id: `srv-${Date.now()}`,
            description: matchedClient.isRecurringGST
              ? 'Professional fees for Monthly GST Compliance & Filings'
              : 'Professional fees for Income Tax & Accounting',
            amount: matchedClient.monthlyAuditFee,
            sacCode: '998231',
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
      { id: `srv-${Date.now()}-${Math.random()}`, description: '', amount: 0, sacCode: '998231' },
    ]);
  };

  const handleRemoveService = (id: string) => {
    setServices((prev) => (prev.length > 1 ? prev.filter((s) => s.id !== id) : prev));
  };

  const handleUpdateService = (id: string, field: 'description' | 'amount' | 'sacCode', value: any) => {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: field === 'amount' ? Number(value) || 0 : value } : s))
    );
  };

  const handleAddExpense = () => {
    setExpenses((prev) => [
      ...prev,
      { id: `exp-${Date.now()}-${Math.random()}`, description: '', amount: 0, sacCode: '9982' },
    ]);
  };

  const handleRemoveExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  const handleUpdateExpense = (id: string, field: 'description' | 'amount' | 'sacCode', value: any) => {
    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: field === 'amount' ? Number(value) || 0 : value } : e))
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
    () => clients.find((c) => c.tradeName.toLowerCase() === clientName.toLowerCase()),
    [clients, clientName]
  );
  const clientOneDriveFolder =
    matchedClient?.oneDriveFolderUrl ||
    `https://shameerassociates.sharepoint.com/clients/${clientName.replace(/\s+/g, '') || 'General'}`;

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
              font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, sans-serif !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .printable-invoice-sheet {
              width: 100% !important;
              max-width: 100% !important;
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

  // Actions: WhatsApp
  const handleShareWhatsApp = async () => {
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

    const clean = cleanWhatsAppPhone(phone);
    if (clean) {
      await sendToIndividual(phone, msg);
    } else {
      await sendToGroup(msg);
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
      handlePrint();
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

      await onRecordBilling({
        debtorId: matchedDebtor?.id,
        clientId: selectedClientId || undefined,
        clientName: clientName.trim(),
        amount: servicesTotal,
        oopExpenses: expensesTotal,
        description: primaryServiceDesc,
        invoiceNumber,
        date: dateOfIssue,
        oneDriveSynced: saveToOneDrive || oneDriveUploaded,
        oneDriveUrl: saveToOneDrive || oneDriveUploaded ? docUrl : undefined,
      });

      if (saveToOneDrive || oneDriveUploaded) {
        dispatchAppToast(`Invoice ${invoiceNumber} recorded and stored in client OneDrive archive`);
      }

      onClose();
    } catch (err: any) {
      dispatchAppToast(err?.message || 'Failed to record invoice', true);
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
          <Receipt className="w-5 h-5 text-accent" strokeWidth={1.75} />
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

            <Button
              variant="secondary"
              icon={MessageSquare}
              onClick={handleShareWhatsApp}
              disabled={isSaving}
              title="Copy formatted invoice and send on WhatsApp"
            >
              WhatsApp Invoice
            </Button>

            <Button
              variant="secondary"
              icon={Printer}
              onClick={handlePrint}
              disabled={isSaving}
              title="Print document on office printer"
            >
              Print (Office Printer)
            </Button>

            <Button
              variant="primary"
              icon={Download}
              onClick={handleDownloadPdf}
              disabled={isSaving}
              title="Download high-resolution A4 PDF document directly"
            >
              Download PDF
            </Button>

            {onRecordBilling && (
              <Button
                variant="secondary"
                icon={CheckCircle2}
                onClick={handleSaveAndRecord}
                disabled={isSaving}
                title="Record billing entry in practice ledger"
              >
                {isSaving ? 'Recording…' : 'Record in Ledger'}
              </Button>
            )}
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
                      type="number"
                      step="any"
                      min="0"
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
                        type="number"
                        step="any"
                        min="0"
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
                  <span className="text-2xs text-fg-subtle">Debtor ledger balance:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-2xs text-fg-subtle">₹</span>
                    <input
                      type="number"
                      step="any"
                      value={debtorBalance || ''}
                      onChange={(e) => setDebtorBalance(Number(e.target.value) || 0)}
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
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0"
                  value={advanceReceived || ''}
                  onChange={(e) => setAdvanceReceived(Number(e.target.value) || 0)}
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
        <div className="lg:col-span-7 p-6 sm:p-8 bg-zinc-100 flex items-start justify-center overflow-y-auto max-h-[82vh] print:p-0 print:bg-white print:overflow-visible print:max-h-none print:block">
          {/* A4 Sheet Container */}
          <div
            id="printable-invoice"
            className="w-full max-w-[650px] bg-white text-black p-8 font-sans text-xs select-text border border-zinc-300 shadow-sm"
            style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif' }}
          >
            {/* 1. Header: Firm Legal Identity */}
            <div className="flex justify-between items-start border-b-2 border-black pb-3">
              <div>
                <h1 className="text-base font-bold uppercase tracking-wide text-black">
                  SHAMEER &amp; ASSOCIATES
                </h1>
                <p className="text-2xs font-semibold uppercase tracking-wider text-zinc-700">
                  Accountants and Practitioners
                </p>
                <p className="text-3xs text-zinc-600 mt-1">
                  4th Floor, Adam Bazaar, Thrissur, Kerala - 680 001
                </p>
                <p className="text-3xs text-zinc-600">
                  Email: saatcr150@gmail.com | Tel: +91 98472 33443, +91 79942 55811
                </p>
              </div>
              <div className="text-right">
                <h2 className="text-lg font-black tracking-widest text-black">INVOICE</h2>
                <p className="text-3xs uppercase tracking-wider text-zinc-500 font-medium">Original for Recipient</p>
                <div className="mt-2 text-2xs space-y-0.5">
                  <div><span className="text-zinc-600">Invoice No:</span> <strong className="font-mono text-black">{invoiceNumber}</strong></div>
                  <div><span className="text-zinc-600">Date:</span> <span className="font-mono text-black">{formattedDate}</span></div>
                </div>
              </div>
            </div>

            {/* 2. Bill To Section */}
            <div className="py-3 border-b border-black flex justify-between items-start">
              <div>
                <span className="text-3xs font-bold uppercase tracking-wider text-zinc-500 block mb-0.5">Bill To:</span>
                <div className="text-sm font-bold text-black uppercase">{clientName || 'Client'}</div>
                {phone && <div className="text-2xs text-zinc-600 mt-0.5">Phone: {phone}</div>}
              </div>
              {gstin && (
                <div className="text-right">
                  <span className="text-3xs font-bold uppercase tracking-wider text-zinc-500 block mb-0.5">Client GSTIN:</span>
                  <span className="font-mono font-bold text-xs text-black">{gstin}</span>
                </div>
              )}
            </div>

            {/* 3. Formal Ledger Grid Table */}
            <table className="w-full border-collapse border border-black mt-3 text-2xs">
              <thead>
                <tr className="border-b border-black bg-zinc-100 font-bold uppercase">
                  <th className="border-r border-black p-1.5 w-8 text-center">Item</th>
                  <th className="border-r border-black p-1.5 text-left">Particulars</th>
                  <th className="p-1.5 text-right w-28">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {/* Professional Services */}
                {services.map((item, idx) => (
                  <tr key={item.id} className="border-b border-zinc-300">
                    <td className="border-r border-black p-1.5 text-center font-mono">{idx + 1}</td>
                    <td className="border-r border-black p-1.5 font-medium">{item.description}</td>
                    <td className="p-1.5 text-right font-mono font-semibold">{item.amount > 0 ? formatINR(item.amount) : '—'}</td>
                  </tr>
                ))}

                {/* Reimbursement Expenses */}
                {expenses.length > 0 && (
                  <>
                    <tr className="border-b border-black bg-zinc-50">
                      <td className="border-r border-black p-1"></td>
                      <td colSpan={2} className="p-1 text-3xs font-bold uppercase tracking-wider text-zinc-700">
                        Reimbursement expenses :
                      </td>
                    </tr>
                    {expenses.map((item) => (
                      <tr key={item.id} className="border-b border-zinc-300">
                        <td className="border-r border-black p-1.5 text-center font-mono">—</td>
                        <td className="border-r border-black p-1.5 text-zinc-800">{item.description}</td>
                        <td className="p-1.5 text-right font-mono">{item.amount > 0 ? formatINR(item.amount) : '—'}</td>
                      </tr>
                    ))}
                  </>
                )}

                {/* Previous Outstanding */}
                {includeOutstanding && debtorBalance > 0 && (
                  <tr className="border-b border-black">
                    <td className="border-r border-black p-1.5 text-center font-mono">•</td>
                    <td className="border-r border-black p-1.5 font-medium">Outstanding as on {formattedDate}</td>
                    <td className="p-1.5 text-right font-mono font-bold">{formatINR(debtorBalance)}</td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="border-t border-black font-bold">
                  <td colSpan={2} className="border-r border-black p-1.5 text-right uppercase">Total</td>
                  <td className="p-1.5 text-right font-mono">{formatINR(grossTotal)}</td>
                </tr>
                {advanceReceived > 0 && (
                  <tr className="border-t border-zinc-300">
                    <td colSpan={2} className="border-r border-black p-1 text-right text-zinc-600">Less: Advance received</td>
                    <td className="p-1 text-right font-mono font-medium text-zinc-700">- {formatINR(advanceReceived)}</td>
                  </tr>
                )}
                <tr className="border-t-2 border-black font-black text-xs bg-zinc-50">
                  <td colSpan={2} className="border-r border-black p-2 text-right uppercase">Net Amount Payable</td>
                  <td className="p-2 text-right font-mono">{formatINR(netPayable)}</td>
                </tr>
              </tfoot>
            </table>

            {/* 4. Amount in Words */}
            <div className="mt-2.5 p-1.5 border border-black text-2xs leading-relaxed">
              <span className="font-bold">Amount in words: </span>
              <span className="font-medium italic">{amountInWords}</span>
            </div>

            {/* 5. Bank Details & Signatory */}
            <div className="mt-4 pt-3 border-t border-black grid grid-cols-2 gap-4">
              <div className="text-3xs space-y-0.5">
                <span className="font-bold uppercase tracking-wider block mb-1">Bank Account details</span>
                <div><span className="text-zinc-500">Bank:</span> <strong>IDFC Bank</strong></div>
                <div><span className="text-zinc-500">Beneficiary:</span> <strong>SHAMEER AND ASSOCIATES</strong></div>
                <div><span className="text-zinc-500">Account number:</span> <strong className="font-mono">10271724633</strong></div>
                <div><span className="text-zinc-500">IFSC:</span> <strong className="font-mono">IDFB0080732</strong></div>
                <div><span className="text-zinc-500">UPI Id:</span> <strong className="font-mono">shameerandassociates@idfcbank</strong></div>
              </div>
              <div className="text-right flex flex-col justify-end">
                <div className="w-36 border-b border-black ml-auto mb-1" />
                <p className="text-xs font-bold uppercase text-black">SHAMEER V M</p>
                <p className="text-3xs font-medium text-zinc-600">Authorised Signatory</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
