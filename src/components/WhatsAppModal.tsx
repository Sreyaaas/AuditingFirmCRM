import React, { useState, useEffect } from 'react';
import { X, Send, Copy, Check } from 'lucide-react';
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

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({
  isOpen,
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
  if (!isOpen || (!task && !itrFiling && !debtor && !ticket && !gstItem)) return null;

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="w-full max-w-lg bg-[#FFFFFF] dark:bg-[#1C1C1E] rounded-[8px] border border-[#E5E5EA] dark:border-[#2C2C2E] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
          <div>
            <h3 className="text-[15px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
              {ticket 
                ? 'Follow-up Call' 
                : (debtor ? 'Fee Reminder' : 'Message on WhatsApp')}
            </h3>
            <p className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93] mt-0.5">
              Recipient: {clientName} ({tradeName})
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-1 text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] rounded"
          >
            <X className="w-4 h-4 stroke-[1.5]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-[13px]">
          {/* Recipient Details Bar */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-[#F2F2F7] dark:bg-[#242426] rounded-[6px]">
            <div>
              <span className="text-[#6E6E73] dark:text-[#8E8E93] block text-[11px]">Phone number</span>
              <input 
                type="text" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
                className="mt-1 w-full bg-[#FFFFFF] dark:bg-[#3A3A3C] px-2 py-1 rounded-[4px] border border-[#E5E5EA] dark:border-[#48484A] font-tabular text-[12px] focus:outline-none focus:border-[#0071E3] text-[#1D1D1F] dark:text-[#F5F5F7]"
              />
            </div>
            <div>
              <span className="text-[#6E6E73] dark:text-[#8E8E93] block text-[11px]">Context</span>
              <span className="font-tabular text-[#1D1D1F] dark:text-[#F5F5F7] block mt-1 font-medium truncate">
                {ticket 
                  ? `${ticket.ticketNo}`
                  : (debtor 
                    ? `Due: ₹${debtor.outstandingBalance.toLocaleString('en-IN')}` 
                    : (task ? `${task.filingType}` : `${itrFiling?.itrForm}`))}
              </span>
            </div>
          </div>

          {/* Template Selector */}
          <div>
            <label className="text-[11px] font-semibold text-[#86868B] dark:text-[#6E6E73] uppercase tracking-wider mb-1.5 block">
              Message Template
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {activeTemplates.map((tpl, idx) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => handleSelectTemplate(idx)}
                  className={`px-2 py-1 text-[12px] rounded-[5px] text-center transition-colors ${
                    selectedTemplateIndex === idx
                      ? 'bg-[#0071E3] text-white font-medium'
                      : 'bg-[#F2F2F7] dark:bg-[#242426] text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#1D1D1F]'
                  }`}
                >
                  {tpl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Message Area */}
          <div>
            <label className="text-[11px] font-semibold text-[#86868B] dark:text-[#6E6E73] uppercase tracking-wider mb-1.5 block">
              Message Text
            </label>
            <textarea
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-3 text-[13px] bg-[#F2F2F7] dark:bg-[#242426] rounded-[6px] border border-[#E5E5EA] dark:border-[#3A3A3C] focus:outline-none focus:border-[#0071E3] leading-relaxed text-[#1D1D1F] dark:text-[#F5F5F7]"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#E5E5EA] dark:border-[#2C2C2E] flex items-center justify-between">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7] bg-[#F2F2F7] dark:bg-[#242426] rounded-[6px] hover:bg-[#E5E5EA] dark:hover:bg-[#3A3A3C] transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#34C759]" /> : <Copy className="w-3.5 h-3.5 text-[#6E6E73] stroke-[1.5]" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-[13px] text-[#6E6E73] hover:text-[#1D1D1F]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-[13px] font-medium text-white bg-[#34C759] hover:bg-[#30B753] rounded-[6px] transition-colors"
            >
              <Send className="w-3 h-3 stroke-[1.5]" />
              <span>Send WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
