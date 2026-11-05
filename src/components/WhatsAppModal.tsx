import React, { useState, useEffect } from 'react';
import { Send, Copy, Check, MessageSquare } from 'lucide-react';
import { Button, Field, Input, Label, Modal, Segmented, Textarea, formatINR } from './ui';
import { MonthlyTask, ITRFiling, StaffTicket, DebtorRecord, GSTComplianceItem } from '../types/crm';
import { 
  getStoredWhatsAppTemplates, 
  getStoredFirmProfile, 
  renderTemplate, 
  WhatsAppTemplateSettings, 
  FirmProfileSettings 
} from '../services/firmConfigService';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  task?: MonthlyTask | null;
  itrFiling?: ITRFiling | null;
  debtor?: DebtorRecord | any | null;
  ticket?: StaffTicket | null;
  gstItem?: GSTComplianceItem | null;
  staffName?: string;
  customTemplates?: WhatsAppTemplateSettings;
  firmProfile?: FirmProfileSettings;
}

const WhatsAppModalForm: React.FC<WhatsAppModalProps> = ({
  onClose,
  task,
  itrFiling,
  debtor,
  ticket,
  gstItem,
  staffName = 'Ameen',
  customTemplates,
  firmProfile: propFirmProfile,
}) => {
  const storedTemplates = customTemplates || getStoredWhatsAppTemplates();
  const profile = propFirmProfile || getStoredFirmProfile();

  const clientName = gstItem?.clientName || task?.clientName || itrFiling?.clientName || debtor?.clientName || ticket?.clientName || 'Client';
  const tradeName = gstItem?.tradeName || task?.tradeName || debtor?.tradeName || ticket?.tradeName || clientName;
  const rawPhone = gstItem?.phone || task?.phone || itrFiling?.phone || debtor?.phone || ticket?.callerPhone || '+91 98200 00000';
  const cleanPhone = rawPhone.replace(/\D/g, '');

  const standardTemplates = [
    {
      id: 'doc_request',
      label: 'Document Request',
      text: renderTemplate(storedTemplates.docRequest, {
        clientName: tradeName,
        period: task?.period || 'the current period',
        dueDate: task?.dueDate || 'upcoming deadline',
        amount: '',
        upiId: profile.upiId,
        arn: '',
        bankName: profile.bankName,
        accountNumber: profile.accountNumber,
        ifscCode: profile.ifscCode,
      }),
    },
    {
      id: 'tax_confirmation',
      label: 'Tax Approval',
      text: `Hello ${tradeName},\n\nYour ${task?.filingType || 'tax return'} computation for ${task?.period || 'AY 2026-27'} is ready for approval.\n\nNet Tax Payable: ₹${task?.taxPayable ? task.taxPayable.toLocaleString('en-IN') : '14,250'}\nCutoff Date: ${task?.dueDate || 'Upcoming'}\n\nPlease reply with your confirmation so we can generate the challan and proceed with portal submission.\n\nRegards,\n${staffName}\nShameer & Associates`,
    },
    {
      id: 'deadline_alert',
      label: 'Urgent Deadline',
      text: `Notice for ${tradeName}:\n\nThe statutory filing cutoff for ${task?.filingType || itrFiling?.itrForm || 'statutory return'} (${task?.period || itrFiling?.assessmentYear}) is tomorrow, ${task?.dueDate}.\n\nPlease share the pending records or portal OTP today to prevent late fees under GST/Income Tax rules.\n\nContact: ${staffName} | Shameer & Associates`,
    },
    {
      id: 'arn_delivery',
      label: 'Acknowledgment',
      text: renderTemplate(storedTemplates.filingAck, {
        clientName: tradeName,
        period: task?.filingType || itrFiling?.itrForm || 'return',
        arn: task?.arnNumber || itrFiling?.acknowledgmentNo || 'AA321126048192Z',
        dueDate: '',
        amount: '',
        upiId: profile.upiId,
        bankName: profile.bankName,
        accountNumber: profile.accountNumber,
        ifscCode: profile.ifscCode,
      }),
    },
  ];

  const debtorTemplates = debtor ? [
    {
      id: 'fee_reminder',
      label: 'Fee Reminder',
      text: renderTemplate(storedTemplates.paymentReminder, {
        clientName: tradeName,
        amount: (debtor.currentBalance ?? debtor.outstandingBalance ?? 0).toLocaleString('en-IN'),
        period: 'FY 2026-27',
        dueDate: 'Immediate',
        upiId: profile.upiId,
        arn: '',
        bankName: profile.bankName,
        accountNumber: profile.accountNumber,
        ifscCode: profile.ifscCode,
      }),
    },
    {
      id: 'overdue_notice',
      label: 'Overdue Notice',
      text: `URGENT NOTICE: ${tradeName}\n\nOur accounts ledger indicates an outstanding balance of ₹${(debtor.currentBalance ?? debtor.outstandingBalance ?? 0).toLocaleString('en-IN')} pending clearance with Shameer & Associates.\n\nKindly release the payment today via UPI (${profile.upiId}) or transfer to ${profile.bankName} Account (${profile.accountNumber}, IFSC: ${profile.ifscCode}) and share transaction UTR.\n\nContact: ${debtor.assignedStaff || staffName} | Shameer & Associates`,
    },
    {
      id: 'bank_details',
      label: 'Bank Details',
      text: `Dear ${tradeName},\n\nHere are our payment details for settling your outstanding account balance (₹${(debtor.currentBalance ?? debtor.outstandingBalance ?? 0).toLocaleString('en-IN')}):\n\nBank: ${profile.bankName}\nAccount Name: ${profile.beneficiaryName}\nA/C No: ${profile.accountNumber}\nIFSC: ${profile.ifscCode}\nUPI ID: ${profile.upiId}\n\nPlease share the payment screenshot once transferred.\n\nThank you,\nShameer & Associates`,
    },
    {
      id: 'receipt_ack',
      label: 'Receipt Ack',
      text: `Dear ${tradeName},\n\nWe acknowledge receipt of your payment towards professional audit and filing services.\n\nYour account ledger has been updated.\n\nThank you for partnering with Shameer & Associates.`,
    },
  ] : [];

  const gstTemplates = gstItem ? [
    {
      id: 'gst_doc_request',
      label: 'Request Data',
      text: `Hello ${tradeName},\n\nThis is ${gstItem.assignedStaff || staffName} from Shameer & Associates.\n\nPlease share your sales invoices, purchase registers, and e-way bills for ${gstItem.filingMonth} (${gstItem.returnType}).\n\nStatutory portal cutoff: ${gstItem.dueDate}.\n\nPlease share at the earliest to allow time for ITC reconciliation.\n\nThank you,\nShameer & Associates`,
    },
    {
      id: 'gst_urgent_deadline',
      label: 'Urgent Cutoff',
      text: `CRITICAL GST NOTICE: ${tradeName}\n\nThe deadline for filing ${gstItem.returnType} (${gstItem.filingMonth}) is ${gstItem.dueDate}.\n\nGSTIN: ${gstItem.gstin}\n\nPlease confirm OTP or finalize computation today to avoid late fees (₹50/day) and interest on output tax.\n\nContact: ${gstItem.assignedStaff || staffName} | Shameer & Associates`,
    },
    {
      id: 'gst_challan_approval',
      label: 'Tax Challan',
      text: `Dear ${tradeName},\n\nYour ${gstItem.returnType} for ${gstItem.filingMonth} is computed and ready for submission.\n\nNet Tax Payable: ₹${(gstItem.taxPayable || 0).toLocaleString('en-IN')}\nDue Date: ${gstItem.dueDate}\n\nPlease approve or make payment so we can submit and generate the ARN.\n\nRegards,\n${gstItem.assignedStaff || staffName}\nShameer & Associates`,
    },
    {
      id: 'gst_arn_confirmation',
      label: 'Return Filed',
      text: `Dear ${tradeName},\n\nYour ${gstItem.returnType} for ${gstItem.filingMonth} has been filed successfully on the GST portal.\n\nGSTIN: ${gstItem.gstin}\nARN Number: ${gstItem.arnNumber || 'AA321126' + Math.floor(100000 + Math.random() * 900000) + 'Z'}\nFiled on: ${gstItem.filedDate || new Date().toLocaleDateString('en-IN')}\n\nAcknowledgment receipt is generated and filed for your records.\n\nRegards,\nShameer & Associates`,
    },
  ] : [];

  const ticketTemplates = ticket ? [
    {
      id: 'ticket_ack',
      label: 'Acknowledged',
      text: `Hello ${ticket.callerName},\n\nWe have recorded your inquiry regarding "${ticket.subject}" (Ticket ${ticket.ticketNo}).\n\nOur team at Shameer & Associates is reviewing the details. An auditor will update you shortly.\n\nRegards,\nShameer & Associates`,
    },
    {
      id: 'ticket_update',
      label: 'Request Details',
      text: `Hello ${ticket.callerName},\n\nRegarding Ticket ${ticket.ticketNo} (${ticket.subject}):\n\nPlease share the relevant documents/vouchers so our team can complete the review.\n\nThank you,\n${staffName}\nShameer & Associates`,
    },
    {
      id: 'ticket_resolved',
      label: 'Resolved',
      text: `Dear ${ticket.callerName},\n\nYour request regarding "${ticket.subject}" (Ticket ${ticket.ticketNo}) has been addressed and completed by our audit staff.\n\nResolution Summary: ${ticket.resolutionNotes || 'Processed on statutory portal'}.\n\nPlease let us know if you require any further assistance.\n\nRegards,\nShameer & Associates`,
    },
  ] : [];

  const itrTemplates = itrFiling ? [
    {
      id: 'itr_doc_request',
      label: 'Document Checklist',
      text: `Hello ${tradeName},\n\nThis is ${staffName} from Shameer & Associates.\n\nTo prepare your Annual Income Tax Return (${itrFiling.itrForm} for ${itrFiling.assessmentYear}), please share the following records:\n1. Form 16 / Form 16A (if TDS deducted)\n2. Bank Account Statements (all active accounts)\n3. Capital gains summary / Mutual fund P&L\n4. AIS / TIS OTP confirmation\n\nFiling Target Date: ${itrFiling.dueDate}.\n\nPlease share the records directly here on WhatsApp.\n\nThank you,\nShameer & Associates`,
    },
    {
      id: 'itr_urgent_deadline',
      label: 'Cutoff Warning',
      text: `URGENT TAX DEADLINE NOTICE: ${tradeName}\n\nYour Annual Income Tax Return (${itrFiling.itrForm} for ${itrFiling.assessmentYear}) is due for filing on ${itrFiling.dueDate}.\n\nPAN: ${itrFiling.pan}\nStatus: ${itrFiling.status}\n\nPlease confirm OTP or approve computation today to prevent late filing penalties under Section 234F (up to ₹5,000) and interest charges.\n\nContact: ${staffName} | Shameer & Associates`,
    },
    {
      id: 'itr_tax_computation',
      label: 'Tax Approval',
      text: `Dear ${tradeName},\n\nYour Annual ITR computation (${itrFiling.itrForm}) for ${itrFiling.assessmentYear} has been prepared.\n\nRegime: ${itrFiling.regime}\nTax Position: ${itrFiling.taxLiabilityOrRefund < 0 ? `Refund Claimable: ₹${Math.abs(itrFiling.taxLiabilityOrRefund).toLocaleString('en-IN')}` : `Net Tax Payable: ₹${itrFiling.taxLiabilityOrRefund.toLocaleString('en-IN')}`}\nTarget Filing Date: ${itrFiling.dueDate}\n\nPlease review and confirm your approval so our team can generate the challan and upload the return.\n\nRegards,\n${staffName}\nShameer & Associates`,
    },
    {
      id: 'itr_ack_confirmation',
      label: 'Filing Acknowledgment',
      text: `Dear ${tradeName},\n\nYour Income Tax Return (${itrFiling.itrForm}) for Assessment Year ${itrFiling.assessmentYear} has been filed on the Income Tax e-filing portal.\n\nPAN: ${itrFiling.pan}\nITR-V Acknowledgment No: ${itrFiling.acknowledgmentNo || 'ACK98200' + Math.floor(100000 + Math.random() * 900000)}\nStatus: Filed & e-Verified\n\nThe ITR-V acknowledgment receipt is ready for your records.\n\nThank you for choosing Shameer & Associates.`,
    },
  ] : [];

  const activeTemplates = gstItem 
    ? gstTemplates 
    : (itrFiling ? itrTemplates : (ticket ? ticketTemplates : (debtor ? debtorTemplates : standardTemplates)));

  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState(0);
  const [message, setMessage] = useState(activeTemplates[0]?.text || '');
  const [copied, setCopied] = useState(false);
  const [phone, setPhone] = useState(cleanPhone);

  useEffect(() => {
    setSelectedTemplateIndex(0);
    setMessage(activeTemplates[0]?.text || '');
    setPhone(cleanPhone);
  }, [task, itrFiling, debtor, ticket, gstItem]);

  const handleSelectTemplate = (idx: number) => {
    setSelectedTemplateIndex(idx);
    setMessage(activeTemplates[idx].text);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenWhatsApp = () => {
    const encoded = encodeURIComponent(message);
    const targetUrl = `https://wa.me/${phone}?text=${encoded}`;
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  const contextLabel = ticket
    ? ticket.ticketNo
    : debtor
      ? `${formatINR(debtor.currentBalance ?? debtor.outstandingBalance ?? 0)} outstanding`
      : gstItem
        ? `${gstItem.returnType} · ${gstItem.filingMonth}`
        : task
          ? `${task.filingType} · ${task.period}`
          : `${itrFiling?.itrForm} · ${itrFiling?.assessmentYear}`;

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="md"
      icon={MessageSquare}
      title={ticket ? 'Call follow-up' : debtor ? 'Fee reminder' : 'WhatsApp message'}
      description={`${tradeName}${clientName !== tradeName ? ` · ${clientName}` : ''}`}
      footer={
        <>
          <Button variant="ghost" icon={copied ? Check : Copy} onClick={handleCopy} className="mr-auto">
            {copied ? 'Copied' : 'Copy Text'}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" icon={Send} onClick={handleOpenWhatsApp} disabled={!phone || !message.trim()}>
            Open in WhatsApp
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Recipient number" hint="Country code included, digits only">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="font-mono" />
          </Field>
          <div>
            <Label>Regarding</Label>
            <div className="h-8 px-2.5 flex items-center rounded-md border border-line bg-subtle text-sm text-fg num truncate">{contextLabel}</div>
          </div>
        </div>

        <div>
          <Label>Template</Label>
          <Segmented
            size="sm"
            value={String(selectedTemplateIndex)}
            onChange={(v) => handleSelectTemplate(Number(v))}
            options={activeTemplates.map((tpl, idx) => ({ value: String(idx), label: tpl.label }))}
            className="w-full"
          />
        </div>

        <Field label="Message">
          <Textarea rows={9} value={message} onChange={(e) => setMessage(e.target.value)} className="leading-6" />
        </Field>
        <div className="text-xs text-fg-subtle num text-right -mt-2">{message.length} characters</div>
      </div>
    </Modal>
  );
};

/** Mounts only while open with a subject, so hooks never run conditionally. */
export const WhatsAppModal: React.FC<WhatsAppModalProps> = (props) =>
  props.isOpen && (props.task || props.itrFiling || props.debtor || props.ticket || props.gstItem) ? <WhatsAppModalForm {...props} /> : null;
