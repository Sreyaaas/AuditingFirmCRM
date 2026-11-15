import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Printer,
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
} from 'lucide-react';
import { Client, DebtorRecord } from '../types/crm';
import { AppPreferences, FirmProfileSettings } from '../services/firmConfigService';
import { numberToWordsINR } from '../utils/numberToWords';
import { sendToIndividual, sendToGroup, cleanWhatsAppPhone, dispatchAppToast } from '../utils/whatsapp';
import { Button, IconButton, Input, Modal, formatINR, cn } from './ui';

export interface InvoiceLineItem {
  id: string;
  description: string;
  amount: number;
}

export interface InvoiceGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialClient?: Client | DebtorRecord | null;
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
  }) => void | Promise<void>;
}

const DEFAULT_OFFICE_FIRM = {
  name: 'SHAMEER & ASSOCIATES',
  subTitle: 'Accountants and Practitioners',
  address: '4th Floor, Adam Bazaar, Thrissur - 680 001',
  email: 'saatcr150@gmail.com',
  phone: '9847233443, 7994255811',
  bankName: 'IDFC FIRST Bank',
  accountNumber: '10271724633',
  ifscCode: 'IDFB0080732',
  upiId: 'shameerandassociates@idfcbank',
  beneficiaryName: 'Shameer & Associates',
  signatory: 'SHAMEER V M',
  signatoryRole: 'Authorised Signatory',
};

export const InvoiceGeneratorModal: React.FC<InvoiceGeneratorModalProps> = ({
  isOpen,
  onClose,
  initialClient,
  clients = [],
  debtors = [],
  preferences,
  firmProfile,
  onRecordBilling,
}) => {
  // Format today's date for input
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Form State
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [clientName, setClientName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [gstin, setGstin] = useState<string>('');
  const [city, setCity] = useState<string>('');

  const defaultInvoiceNo = useMemo(() => {
    const prefix = preferences?.invoicePrefix || 'SA/';
    const nextNum = preferences?.nextInvoiceNumber ?? 1;
    return `${prefix}${String(nextNum).padStart(4, '0')}`;
  }, [preferences?.invoicePrefix, preferences?.nextInvoiceNumber]);

  const [invoiceNumber, setInvoiceNumber] = useState<string>(defaultInvoiceNo);
  const [dateOfIssue, setDateOfIssue] = useState<string>(todayStr);

  // Line Items
  const [services, setServices] = useState<InvoiceLineItem[]>([
    { id: 'srv-1', description: 'Professional fees for GST Compliance & Return Filing', amount: 5000 },
  ]);

  const [expenses, setExpenses] = useState<InvoiceLineItem[]>([]);

  // Outstanding and Advance
  const [debtorBalance, setDebtorBalance] = useState<number>(0);
  const [includeOutstanding, setIncludeOutstanding] = useState<boolean>(false);
  const [advanceReceived, setAdvanceReceived] = useState<number>(0);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Synchronize when initialClient changes or modal opens
  useEffect(() => {
    if (!isOpen) return;

    setInvoiceNumber(defaultInvoiceNo);
    setDateOfIssue(todayStr);

    if (initialClient) {
      const isClientObj = 'tradeName' in initialClient;
      const targetName = isClientObj ? initialClient.tradeName : initialClient.clientName;
      setClientName(targetName);

      // Locate matching client record if any
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
                ? 'Professional fees for Monthly GST Compliance'
                : 'Professional fees for Income Tax & Accounting',
              amount: matchedClient.monthlyAuditFee,
            },
          ]);
        }
      } else {
        setSelectedClientId('');
        setPhone('');
        setGstin('');
        setCity('');
      }

      // Locate matching debtor record if any
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
        { id: `srv-${Date.now()}`, description: 'Professional fees for Accounting & Tax Services', amount: 5000 },
      ]);
      setExpenses([]);
      setAdvanceReceived(0);
    }
  }, [isOpen, initialClient, defaultInvoiceNo, todayStr, clients, debtors]);

  // Handle client selection from dropdown
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
              ? 'Professional fees for Monthly GST Compliance'
              : 'Professional fees for Income Tax & Accounting',
            amount: matchedClient.monthlyAuditFee,
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
      { id: `srv-${Date.now()}-${Math.random()}`, description: '', amount: 0 },
    ]);
  };

  const handleRemoveService = (id: string) => {
    setServices((prev) => (prev.length > 1 ? prev.filter((s) => s.id !== id) : prev));
  };

  const handleUpdateService = (id: string, field: 'description' | 'amount', value: any) => {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: field === 'amount' ? Number(value) || 0 : value } : s))
    );
  };

  const handleAddExpense = () => {
    setExpenses((prev) => [
      ...prev,
      { id: `exp-${Date.now()}-${Math.random()}`, description: '', amount: 0 },
    ]);
  };

  const handleRemoveExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  const handleUpdateExpense = (id: string, field: 'description' | 'amount', value: any) => {
    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: field === 'amount' ? Number(value) || 0 : value } : e))
    );
  };

  // Totals
  const servicesTotal = useMemo(() => services.reduce((sum, s) => sum + (Number(s.amount) || 0), 0), [services]);
  const expensesTotal = useMemo(() => expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0), [expenses]);
  const outstandingAmount = includeOutstanding ? Math.max(0, debtorBalance) : 0;
  const grossTotal = servicesTotal + expensesTotal + outstandingAmount;
  const netPayable = Math.max(0, grossTotal - (Number(advanceReceived) || 0));

  // Words
  const amountInWords = useMemo(() => numberToWordsINR(netPayable), [netPayable]);

  // Formatted date for preview
  const formattedDate = useMemo(() => {
    try {
      if (!dateOfIssue) return '';
      const d = new Date(dateOfIssue);
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateOfIssue;
    }
  }, [dateOfIssue]);

  // Actions: Print / PDF
  const handlePrint = () => {
    window.print();
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

    let msg = `*INVOICE — ${firmName.toUpperCase()}*\n`;
    msg += `*Invoice No:* ${invoiceNumber}\n`;
    msg += `*Date:* ${formattedDate}\n`;
    msg += `*Billed To:* ${clientName || 'Client'}\n\n`;

    if (servicesList) {
      msg += `*Professional Services:*\n${servicesList}\n\n`;
    }

    if (expensesList) {
      msg += `*Reimbursement Expenses / OOP:*\n${expensesList}\n\n`;
    }

    if (includeOutstanding && debtorBalance > 0) {
      msg += `*Previous Outstanding Balance:* ₹${debtorBalance.toLocaleString('en-IN')}\n`;
    }

    if (advanceReceived > 0) {
      msg += `*Less Advance Received:* -₹${Number(advanceReceived).toLocaleString('en-IN')}\n`;
    }

    msg += `*Net Payable:* ₹${netPayable.toLocaleString('en-IN')}\n`;
    msg += `_(${amountInWords})_\n\n`;

    msg += `*Bank Account for Payment:*\n`;
    msg += `Bank: ${bank}\n`;
    msg += `A/c: ${acct}\n`;
    msg += `IFSC: ${ifsc}\n`;
    msg += `UPI ID: ${upi}\n\n`;
    msg += `Please send the payment screenshot or UTR once paid.\n\n`;
    msg += `Thank you,\n*${firmName}* | Accountants and Practitioners`;

    const clean = cleanWhatsAppPhone(phone);
    if (clean) {
      await sendToIndividual(phone, msg);
    } else {
      await sendToGroup(msg);
    }
  };

  // Actions: Record in Database
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

      await onRecordBilling({
        debtorId: matchedDebtor?.id,
        clientId: selectedClientId || undefined,
        clientName: clientName.trim(),
        amount: servicesTotal,
        oopExpenses: expensesTotal,
        description: primaryServiceDesc,
        invoiceNumber,
        date: dateOfIssue,
      });

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
          <span>Generate Invoice</span>
          <span className="text-xs font-normal text-fg-subtle ident font-mono ml-1.5 px-2 py-0.5 rounded bg-subtle border border-line">
            {invoiceNumber}
          </span>
        </div>
      }
      description="Create, preview, print A4 PDF or send invoice directly via WhatsApp."
      bodyClassName="p-0 overflow-y-auto max-h-[82vh] invoice-modal-body"
      className="invoice-modal-dialog"
      footer={
        <div className="flex items-center justify-between w-full print:hidden invoice-modal-footer">
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>
            Close
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              icon={MessageSquare}
              onClick={handleShareWhatsApp}
              disabled={isSaving}
              title="Copy message and open WhatsApp"
            >
              WhatsApp Invoice
            </Button>

            <Button
              variant="secondary"
              icon={Printer}
              onClick={handlePrint}
              disabled={isSaving}
              title="Open browser print dialog for A4 PDF"
            >
              Print / Save PDF
            </Button>

            {onRecordBilling && (
              <Button
                variant="primary"
                icon={CheckCircle2}
                onClick={handleSaveAndRecord}
                disabled={isSaving}
              >
                {isSaving ? 'Recording…' : 'Record & Close'}
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[700px] divide-y lg:divide-y-0 lg:divide-x divide-line">
        {/* =========================================================================
            LEFT COLUMN: INVOICE INPUTS & LINE ITEMS (Hidden in Print)
            ========================================================================= */}
        <div className="lg:col-span-5 p-5 space-y-5 bg-canvas/40 overflow-y-auto max-h-[82vh] invoice-editor-column print:hidden">
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
                <div key={item.id} className="flex items-center gap-2">
                  <span className="text-2xs text-fg-subtle font-mono w-4 shrink-0 text-center">
                    {idx + 1}
                  </span>
                  <Input
                    placeholder="Description of service"
                    value={item.description}
                    onChange={(e) => handleUpdateService(item.id, 'description', e.target.value)}
                    className="h-7 text-xs flex-1"
                  />
                  <div className="relative w-28 shrink-0">
                    <span className="absolute left-2 top-1.5 text-xs text-fg-subtle">₹</span>
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
                No out-of-pocket or reimbursement expenses added.
              </p>
            ) : (
              <div className="space-y-2">
                {expenses.map((item, idx) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <span className="text-2xs text-fg-subtle font-mono w-4 shrink-0 text-center">
                      {idx + 1}
                    </span>
                    <Input
                      placeholder="E.g. Late fee - August / Challan"
                      value={item.description}
                      onChange={(e) => handleUpdateExpense(item.id, 'description', e.target.value)}
                      className="h-7 text-xs flex-1"
                    />
                    <div className="relative w-28 shrink-0">
                      <span className="absolute left-2 top-1.5 text-xs text-fg-subtle">₹</span>
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

          {/* Adjustments: Previous Outstanding & Advance Received */}
          <div className="p-4 rounded-lg bg-surface border border-line space-y-3.5 shadow-2xs">
            <span className="text-xs font-semibold uppercase tracking-wider text-fg-subtle block">
              Balances & Advance
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

            {/* Net Amount Summary */}
            <div className="pt-3 border-t border-line flex items-center justify-between text-sm font-semibold">
              <span className="text-fg">Net Payable</span>
              <span className="font-mono text-accent text-base">{formatINR(netPayable)}</span>
            </div>
          </div>
        </div>

        {/* =========================================================================
            RIGHT COLUMN: LIVE A4 DOCUMENT PREVIEW (Printed directly)
            ========================================================================= */}
        <div className="lg:col-span-7 p-6 sm:p-8 bg-zinc-100 flex items-start justify-center overflow-y-auto max-h-[82vh]">
          {/* A4 Sheet Container */}
          <div
            id="printable-invoice"
            className="printable-invoice-sheet w-full max-w-[620px] bg-white text-zinc-900 border border-zinc-200 shadow-md rounded-[2px] p-7 sm:p-9 font-sans text-xs relative select-text"
          >
            {/* Header: Office Branding & Invoice Meta */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-zinc-200">
              <div className="min-w-0">
                <h1 className="text-base font-bold uppercase tracking-tight text-zinc-950 leading-tight">
                  {firmProfile?.legalName || DEFAULT_OFFICE_FIRM.name}
                </h1>
                <p className="text-2xs font-medium uppercase tracking-wider text-zinc-600 mt-0.5">
                  {firmProfile?.category || DEFAULT_OFFICE_FIRM.subTitle}
                </p>
                <p className="text-2xs text-zinc-500 mt-1.5 leading-relaxed">
                  {firmProfile?.address || DEFAULT_OFFICE_FIRM.address}
                </p>
                <p className="text-2xs text-zinc-500 mt-0.5">
                  Email: {firmProfile?.email || DEFAULT_OFFICE_FIRM.email} · Phone:{' '}
                  {firmProfile?.phone || DEFAULT_OFFICE_FIRM.phone}
                </p>
                {firmProfile?.gstin && (
                  <p className="text-2xs font-mono text-zinc-500 mt-0.5">
                    GSTIN: {firmProfile.gstin}
                  </p>
                )}
              </div>

              <div className="text-right shrink-0">
                <span className="text-lg font-bold uppercase tracking-widest text-zinc-900 block">
                  INVOICE
                </span>
                <div className="mt-2 space-y-0.5 text-2xs">
                  <div>
                    <span className="text-zinc-500">Invoice No: </span>
                    <span className="font-mono font-semibold text-zinc-900">{invoiceNumber}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500">Date: </span>
                    <span className="font-mono font-medium text-zinc-800">{formattedDate}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bill To Section */}
            <div className="py-4 border-b border-zinc-100 flex justify-between items-start gap-4">
              <div>
                <span className="text-3xs font-semibold uppercase tracking-wider text-zinc-400 block mb-1">
                  Billed To
                </span>
                <div className="text-sm font-bold text-zinc-950">
                  {clientName || 'Client Name / Trade Name'}
                </div>
                {phone && <div className="text-2xs text-zinc-600 mt-0.5">Phone: {phone}</div>}
                {city && <div className="text-2xs text-zinc-600">{city}, Kerala</div>}
              </div>

              {gstin && (
                <div className="text-right">
                  <span className="text-3xs font-semibold uppercase tracking-wider text-zinc-400 block mb-1">
                    GSTIN / Tax ID
                  </span>
                  <div className="text-xs font-mono font-semibold text-zinc-900 px-2 py-0.5 rounded bg-zinc-50 border border-zinc-200 inline-block">
                    {gstin}
                  </div>
                </div>
              )}
            </div>

            {/* Table of Line Items */}
            <div className="mt-4">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-y border-zinc-300 bg-zinc-50 text-2xs font-semibold uppercase tracking-wider text-zinc-700">
                    <th className="py-2 px-2 w-8 text-center">#</th>
                    <th className="py-2 px-2">Particulars / Description of Services</th>
                    <th className="py-2 px-2 text-right w-28">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {/* Services */}
                  {services.map((item, idx) => (
                    <tr key={item.id} className="align-top">
                      <td className="py-2.5 px-2 text-center text-zinc-400 font-mono text-2xs">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-2 text-zinc-900 font-medium leading-relaxed">
                        {item.description || 'Professional services'}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-zinc-900">
                        {item.amount > 0 ? formatINR(item.amount) : '—'}
                      </td>
                    </tr>
                  ))}

                  {/* Expenses (if any) */}
                  {expenses.length > 0 && (
                    <>
                      <tr className="bg-zinc-50/70 border-t border-zinc-200">
                        <td colSpan={3} className="py-1 px-2 text-3xs font-semibold uppercase tracking-wider text-zinc-500">
                          Reimbursement Expenses & Out-of-Pocket
                        </td>
                      </tr>
                      {expenses.map((item, idx) => (
                        <tr key={item.id} className="align-top">
                          <td className="py-2 px-2 text-center text-zinc-400 font-mono text-2xs">
                            {services.length + idx + 1}
                          </td>
                          <td className="py-2 px-2 text-zinc-700 leading-relaxed">
                            {item.description || 'Reimbursement'}
                          </td>
                          <td className="py-2 px-2 text-right font-mono text-zinc-900">
                            {item.amount > 0 ? formatINR(item.amount) : '—'}
                          </td>
                        </tr>
                      ))}
                    </>
                  )}

                  {/* Previous Outstanding Balance (if included) */}
                  {includeOutstanding && debtorBalance > 0 && (
                    <tr className="bg-zinc-50/40">
                      <td className="py-2.5 px-2 text-center text-zinc-400 font-mono text-2xs">•</td>
                      <td className="py-2.5 px-2 text-zinc-800 font-medium">
                        Previous Outstanding Fee Balance (Brought Forward)
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono font-medium text-zinc-900">
                        {formatINR(debtorBalance)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Totals Summary */}
              <div className="mt-3 border-t-2 border-zinc-900 pt-2 space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-600">Subtotal / Gross Amount</span>
                  <span className="font-mono text-zinc-900 font-semibold">{formatINR(grossTotal)}</span>
                </div>

                {advanceReceived > 0 && (
                  <div className="flex justify-between items-center text-xs text-zinc-600">
                    <span>Less: Advance Received</span>
                    <span className="font-mono text-danger font-medium">- {formatINR(advanceReceived)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-sm font-bold pt-1.5 border-t border-zinc-200">
                  <span className="text-zinc-950 uppercase tracking-wide">Net Amount Payable</span>
                  <span className="font-mono text-base text-zinc-950 font-bold">{formatINR(netPayable)}</span>
                </div>
              </div>
            </div>

            {/* Amount In Words Box */}
            <div className="mt-4 p-2.5 rounded bg-zinc-50 border border-zinc-200 text-2xs text-zinc-800 leading-relaxed">
              <span className="font-bold text-zinc-900">Amount in Words: </span>
              <span className="font-medium italic">{amountInWords}</span>
            </div>

            {/* Payment & Signatory Footer */}
            <div className="mt-6 pt-4 border-t border-zinc-200 grid grid-cols-2 gap-6 items-end">
              {/* Bank Details */}
              <div className="text-2xs space-y-0.5">
                <span className="text-3xs font-semibold uppercase tracking-wider text-zinc-500 block mb-1">
                  Bank Details for Payment
                </span>
                <div>
                  <span className="text-zinc-500">Bank: </span>
                  <span className="font-medium text-zinc-900">
                    {firmProfile?.bankName || DEFAULT_OFFICE_FIRM.bankName}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500">A/c Name: </span>
                  <span className="font-medium text-zinc-900">
                    {firmProfile?.beneficiaryName || DEFAULT_OFFICE_FIRM.beneficiaryName}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500">Account No: </span>
                  <span className="font-mono font-semibold text-zinc-900">
                    {firmProfile?.accountNumber || DEFAULT_OFFICE_FIRM.accountNumber}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500">IFSC Code: </span>
                  <span className="font-mono font-medium text-zinc-900">
                    {firmProfile?.ifscCode || DEFAULT_OFFICE_FIRM.ifscCode}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500">UPI ID: </span>
                  <span className="font-mono text-zinc-900">
                    {firmProfile?.upiId || DEFAULT_OFFICE_FIRM.upiId}
                  </span>
                </div>
              </div>

              {/* Authorised Signatory */}
              <div className="text-right">
                <p className="text-3xs uppercase tracking-wider text-zinc-500 mb-9">
                  For {firmProfile?.legalName || DEFAULT_OFFICE_FIRM.name}
                </p>
                <p className="text-xs font-bold uppercase tracking-tight text-zinc-950">
                  {DEFAULT_OFFICE_FIRM.signatory}
                </p>
                <p className="text-3xs font-medium text-zinc-600">
                  {DEFAULT_OFFICE_FIRM.signatoryRole}
                </p>
              </div>
            </div>

            {/* Bottom Note */}
            <div className="mt-6 pt-2 border-t border-zinc-100 text-center text-3xs text-zinc-400">
              This is a computer generated invoice · Shameer & Associates, Accountants and Practitioners
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
