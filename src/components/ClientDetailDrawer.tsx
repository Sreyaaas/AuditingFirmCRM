import React, { useState } from 'react';
import { ExternalLink, Copy, Check, MessageSquare, ReceiptText } from 'lucide-react';
import { Client, MonthlyTask, ITRFiling, StaffMember, StaffTicket, DebtorRecord, OfficeBillingEntry } from '../types/crm';
import { FIRM_ONEDRIVE_ROOT_URL } from '../services/firmConfigService';
import { Avatar, Badge, Button, DescriptionList, EmptyState, Modal, SearchInput, Segmented, Tabs, cn, formatDate, formatINR, statusTone } from './ui';

interface ClientDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client | null;
  task?: MonthlyTask | null;
  itrFiling?: ITRFiling | null;
  debtor?: DebtorRecord | null;
  staff?: StaffMember | null;
  tickets?: StaffTicket[];
  staffList?: StaffMember[];
  billings?: OfficeBillingEntry[];
  onOpenWhatsApp: (taskOrItr: any) => void;
  onGenerateInvoice?: (client: Client) => void;
  onViewInvoice?: (billing: OfficeBillingEntry) => void;
}


export const ClientDetailDrawer: React.FC<ClientDetailDrawerProps> = ({
  isOpen,
  onClose,
  client,
  task,
  itrFiling,
  debtor,
  staff,
  tickets = [],
  staffList = [],
  billings = [],
  onOpenWhatsApp,
  onGenerateInvoice,
  onViewInvoice,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'compliance' | 'billings' | 'onedrive' | 'tickets'>('profile');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!isOpen || !client) return null;

  const clientTickets = tickets.filter((t) => t.clientId === client.id);

  const clientBillings = (billings || []).filter((b) => {
    const bName = (b.clientName || '').trim().toLowerCase();
    const cName = (client.name || '').trim().toLowerCase();
    const cTrade = (client.tradeName || '').trim().toLowerCase();
    return bName === cName || bName === cTrade || (cTrade && bName.includes(cTrade)) || (cName && bName.includes(cName));
  });

  const totalBilled = clientBillings.reduce(
    (sum, b) => sum + (Number(b.professionalIncome) || 0) + (Number(b.oopExpenses) || 0),
    0
  );
  const totalReceived = clientBillings
    .filter((b) => b.billingStatus === 'Received')
    .reduce((sum, b) => sum + (Number(b.professionalIncome) || 0) + (Number(b.oopExpenses) || 0), 0);
  const totalPending = totalBilled - totalReceived;

  const getStaff = (id: string | null) => {
    if (!id) return null;
    return staffList.find((s) => s.id === id);
  };

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };




  const CopyValue: React.FC<{ label: string; value: string; field: string }> = ({ label, value, field }) => (
    <div className="group min-w-0">
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-1 flex items-center gap-1.5">
        <span className="ident text-sm text-fg">{value || '—'}</span>
        {value && (
          <button
            onClick={() => handleCopy(value, field)}
            className="text-fg-faint hover:text-fg opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
            title={`Copy ${label}`}
            aria-label={`Copy ${label}`}
          >
            {copiedField === field ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        )}
      </dd>
    </div>
  );

  const SectionTitle: React.FC<{ children: React.ReactNode; right?: React.ReactNode }> = ({ children, right }) => (
    <div className="flex items-center justify-between mb-3">
      <span className="eyebrow">{children}</span>
      {right}
    </div>
  );

  const hasBalance = !!debtor && debtor.currentBalance > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      backdropClassName="print:hidden"
      className="print:hidden"
      title={client.tradeName}
      description={
        <div className="flex flex-wrap items-center gap-1.5 mt-1">
          <Badge className="ident">{client.clientCode}</Badge>
          <Badge tone={client.isRecurringGST ? 'info' : 'neutral'}>{client.isRecurringGST ? 'Monthly GST' : 'Annual ITR'}</Badge>
          <span className="text-xs text-fg-subtle ml-0.5">
            {client.entityType} · {client.city}, Kerala
          </span>
        </div>
      }
      subheader={
        <Tabs
          className="border-b-0 -mb-px"
          value={activeTab}
          onChange={setActiveTab}
          options={[
            { value: 'profile', label: 'Profile' },
            { value: 'compliance', label: 'Filings & fees' },
            { value: 'billings', label: 'Bill records', count: clientBillings.length || undefined },
            { value: 'onedrive', label: 'Documents' },
            { value: 'tickets', label: 'Calls', count: clientTickets.length || undefined },
          ]}
        />
      }
      bodyClassName="py-5"
      footer={
        <>
          <a
            href={client.oneDriveFolderUrl || FIRM_ONEDRIVE_ROOT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mr-auto inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg transition-colors"
          >
            OneDrive folder
            <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.75} />
          </a>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          {onGenerateInvoice && (
            <Button
              variant="secondary"
              icon={ReceiptText}
              onClick={() => {
                onClose();
                onGenerateInvoice(client);
              }}
            >
              Generate Invoice
            </Button>
          )}
          <Button variant="primary" icon={MessageSquare} onClick={() => onOpenWhatsApp(task || client)}>
            Message on WhatsApp
          </Button>
        </>
      }
    >
      {activeTab === 'profile' && (
        <div className="space-y-6">
          <section>
            <SectionTitle>Tax registration</SectionTitle>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
              <CopyValue label="GSTIN" value={client.gstin} field="gstin" />
              <CopyValue label="PAN" value={client.pan} field="pan" />
              <div>
                <dt className="eyebrow">Constitution</dt>
                <dd className="mt-1 text-sm text-fg">{client.entityType}</dd>
              </div>
              <div>
                <dt className="eyebrow">Location</dt>
                <dd className="mt-1 text-sm text-fg">{client.city}, Kerala, India</dd>
              </div>
            </dl>
          </section>

          <section className="pt-5 border-t border-line">
            <SectionTitle>Contact & Partners</SectionTitle>
            <DescriptionList
              columns={3}
              items={[
                { label: 'Primary contact', value: client.contactPerson || '—' },
                { label: 'Phone / WhatsApp', value: client.phone || '—', mono: true },
                { label: 'Email', value: client.email || '—' },
                ...(client.partnerName || client.partnerPhone
                  ? [
                      { label: 'Partner / Director', value: client.partnerName || 'Partner' },
                      { label: 'Partner WhatsApp', value: client.partnerPhone || '—', mono: true },
                    ]
                  : []),
                ...(client.secondaryPhone
                  ? [{ label: 'Secondary / Office phone', value: client.secondaryPhone, mono: true }]
                  : []),
              ]}
            />
          </section>

          <section className="pt-5 border-t border-line">
            <SectionTitle>Work & fees</SectionTitle>
            <dl className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-4">
              <div className="min-w-0">
                <dt className="eyebrow">Owner</dt>
                <dd className="mt-1 flex items-center gap-2">
                  {staff && <Avatar initials={staff.initials} seed={staff.name} size="xs" />}
                  <span className="text-sm text-fg">{staff?.name || 'Ameen'}</span>
                </dd>
                <dd className="text-xs text-fg-subtle mt-0.5 truncate">{staff?.role || 'Partner & Senior Practitioner'}</dd>
              </div>
              <div>
                <dt className="eyebrow">Monthly fee</dt>
                <dd className="mt-1 num text-sm text-fg">{formatINR(client.monthlyAuditFee)}</dd>
                <dd className="text-xs text-fg-subtle mt-0.5">Per month</dd>
              </div>
              <div>
                <dt className="eyebrow">Outstanding</dt>
                <dd className="mt-1 flex items-center gap-2">
                  <span className="num text-sm font-medium text-fg">{formatINR(debtor?.currentBalance)}</span>
                  {hasBalance ? (
                    <Badge tone="danger">{debtor!.agingBucket || 'Overdue'}</Badge>
                  ) : (
                    <Badge tone="success">Cleared</Badge>
                  )}
                </dd>
              </div>
            </dl>
          </section>

          <section className="pt-5 border-t border-line">
            <SectionTitle
              right={
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('billings')}
                    className="text-xs text-accent hover:underline font-medium"
                  >
                    View tab ({clientBillings.length})
                  </button>
                  {onGenerateInvoice && (
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={ReceiptText}
                      onClick={() => {
                        onClose();
                        onGenerateInvoice(client);
                      }}
                      className="h-6 text-2xs px-2"
                    >
                      Generate Invoice
                    </Button>
                  )}
                </div>
              }
            >
              Bill records
            </SectionTitle>

            {clientBillings.length === 0 ? (
              <div className="py-3 px-3.5 rounded-[6px] border border-line bg-subtle/40 text-xs text-fg-subtle flex items-center justify-between">
                <span>No bills recorded for this client yet.</span>
                {onGenerateInvoice && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onGenerateInvoice(client);
                    }}
                    className="text-accent hover:underline font-medium text-xs"
                  >
                    + Create first bill
                  </button>
                )}
              </div>
            ) : (
              <div className="border border-line rounded-[6px] overflow-hidden bg-surface">
                <table className="w-full text-left text-xs">
                  <thead className="bg-subtle text-fg-subtle border-b border-line text-2xs uppercase tracking-wider">
                    <tr>
                      <th className="px-3 py-2 font-medium">Inv #</th>
                      <th className="px-3 py-2 font-medium">Date</th>
                      <th className="px-3 py-2 font-medium">Nature of Service</th>
                      <th className="px-3 py-2 font-medium text-right">Fee (₹)</th>
                      <th className="px-3 py-2 font-medium text-center">Status</th>
                      <th className="px-3 py-2 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {clientBillings.map((b) => {
                      const invNo = b.invoiceNumber || `SA/${String(b.serialNo).padStart(4, '0')}`;
                      return (
                        <tr key={b.id || b.serialNo} className="hover:bg-hover transition-colors">
                          <td className="px-3 py-2 font-mono font-medium text-fg">{invNo}</td>
                          <td className="px-3 py-2 font-mono text-fg-muted">{formatDate(b.date)}</td>
                          <td className="px-3 py-2 text-fg truncate max-w-[220px]" title={b.natureOfService}>
                            {b.natureOfService}
                          </td>
                          <td className="px-3 py-2 num font-medium text-right text-fg">
                            {formatINR(b.professionalIncome)}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <Badge
                              tone={
                                b.billingStatus === 'Received'
                                ? 'success'
                                : b.billingStatus === 'Pending'
                                ? 'warning'
                                : 'info'
                              }
                              dot
                            >
                              {b.billingStatus || 'Billed'}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-right">
                            {onViewInvoice && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 text-2xs px-2"
                                onClick={() => {
                                  onClose();
                                  onViewInvoice(b);
                                }}
                              >
                                View
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {activeTab === 'billings' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-fg">Bill records & invoices</h4>
              <p className="text-xs text-fg-subtle mt-0.5">
                {clientBillings.length === 1 ? '1 invoice recorded' : `${clientBillings.length} invoices recorded`} for {client.tradeName}
              </p>
            </div>
            {onGenerateInvoice && (
              <Button
                size="sm"
                variant="primary"
                icon={ReceiptText}
                onClick={() => {
                  onClose();
                  onGenerateInvoice(client);
                }}
              >
                Generate Invoice
              </Button>
            )}
          </div>

          {clientBillings.length > 0 && (
            <div className="grid grid-cols-3 gap-3 p-3 rounded-lg border border-line bg-subtle/40">
              <div>
                <span className="text-2xs uppercase tracking-wider text-fg-subtle font-medium block">Total Invoiced</span>
                <span className="num text-sm font-semibold text-fg mt-0.5 block">{formatINR(totalBilled)}</span>
              </div>
              <div>
                <span className="text-2xs uppercase tracking-wider text-fg-subtle font-medium block">Total Settled</span>
                <span className="num text-sm font-semibold text-success mt-0.5 block">{formatINR(totalReceived)}</span>
              </div>
              <div>
                <span className="text-2xs uppercase tracking-wider text-fg-subtle font-medium block">Pending Balance</span>
                <span className={cn('num text-sm font-semibold mt-0.5 block', totalPending > 0 ? 'text-warning' : 'text-fg-muted')}>
                  {formatINR(totalPending)}
                </span>
              </div>
            </div>
          )}

          {clientBillings.length === 0 ? (
            <EmptyState
              icon={ReceiptText}
              title="No bills recorded yet"
              description={`No office tax invoices or bills have been generated for ${client.tradeName}.`}
              action={
                onGenerateInvoice && (
                  <Button
                    variant="primary"
                    icon={ReceiptText}
                    onClick={() => {
                      onClose();
                      onGenerateInvoice(client);
                    }}
                  >
                    Create First Invoice
                  </Button>
                )
              }
            />
          ) : (
            <div className="border border-line rounded-[6px] overflow-hidden bg-surface">
              <table className="w-full text-left text-xs">
                <thead className="bg-subtle text-fg-subtle border-b border-line text-2xs uppercase tracking-wider">
                  <tr>
                    <th className="px-3 py-2 font-medium">Inv #</th>
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium">Nature of Service</th>
                    <th className="px-3 py-2 font-medium text-right">Fee (₹)</th>
                    <th className="px-3 py-2 font-medium text-right">OOP (₹)</th>
                    <th className="px-3 py-2 font-medium text-right">Total (₹)</th>
                    <th className="px-3 py-2 font-medium text-center">Status</th>
                    <th className="px-3 py-2 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {clientBillings.map((b) => {
                    const invNo = b.invoiceNumber || `SA/${String(b.serialNo).padStart(4, '0')}`;
                    const fee = Number(b.professionalIncome) || 0;
                    const oop = Number(b.oopExpenses) || 0;
                    const total = fee + oop;
                    return (
                      <tr key={b.id || b.serialNo} className="hover:bg-hover transition-colors">
                        <td className="px-3 py-2.5 font-mono font-medium text-fg">{invNo}</td>
                        <td className="px-3 py-2.5 font-mono text-fg-muted">{b.date ? formatDate(b.date) : '—'}</td>
                        <td className="px-3 py-2.5 text-fg truncate max-w-[200px]" title={b.natureOfService}>
                          {b.natureOfService || 'Professional fees'}
                        </td>
                        <td className="px-3 py-2.5 num font-medium text-right text-fg">
                          {formatINR(fee)}
                        </td>
                        <td className="px-3 py-2.5 num text-right text-fg-muted">
                          {oop ? formatINR(oop) : '—'}
                        </td>
                        <td className="px-3 py-2.5 num font-semibold text-right text-fg">
                          {formatINR(total)}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <Badge
                            tone={
                              b.billingStatus === 'Received'
                                ? 'success'
                                : b.billingStatus === 'Pending'
                                ? 'warning'
                                : 'neutral'
                            }
                            dot
                          >
                            {b.billingStatus || 'Billed'}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          {onViewInvoice && (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-6 text-2xs px-2"
                              onClick={() => {
                                onClose();
                                onViewInvoice(b);
                              }}
                            >
                              View
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'onedrive' && (
        <EmptyState
          title="Client documents & records"
          description="Returns, workings, portal filings, and statements are kept in the firm's OneDrive."
          action={
            <a href={client.oneDriveFolderUrl || FIRM_ONEDRIVE_ROOT_URL} target="_blank" rel="noopener noreferrer">
              <Button icon={ExternalLink}>Open in OneDrive</Button>
            </a>
          }
        />
      )}

      {activeTab === 'compliance' && (
        <div className="space-y-6">
          {task && (
            <section>
              <SectionTitle right={<Badge tone={statusTone(task.status)} dot>{task.status}</Badge>}>Current monthly filing</SectionTitle>
              <DescriptionList
                columns={2}
                className="sm:grid-cols-4"
                items={[
                  { label: 'Return', value: task.filingType },
                  { label: 'Period', value: task.period },
                  { label: 'Due', value: <span className="num">{formatDate(task.dueDate)}</span> },
                  { label: 'Tax payable', value: <span className="num">{formatINR(task.taxPayable)}</span> },
                ]}
              />
              {task.arnNumber && (
                <div className="mt-4 flex items-center justify-between h-9 px-3 rounded-md bg-subtle border border-line text-xs">
                  <span className="text-fg-subtle">Portal ARN</span>
                  <span className="ident text-fg">{task.arnNumber}</span>
                </div>
              )}
            </section>
          )}

          {itrFiling && (
            <section className={cn(task && 'pt-5 border-t border-line')}>
              <SectionTitle right={<Badge tone={statusTone(itrFiling.status)} dot>{itrFiling.status}</Badge>}>Income tax return</SectionTitle>
              <DescriptionList
                columns={2}
                className="sm:grid-cols-4"
                items={[
                  { label: 'Form', value: itrFiling.itrForm },
                  { label: 'Assessment year', value: <span className="num">{itrFiling.assessmentYear}</span> },
                  { label: 'Regime', value: itrFiling.regime },
                  {
                    label: itrFiling.taxLiabilityOrRefund < 0 ? 'Refund' : 'Tax payable',
                    value: <span className="num">{formatINR(Math.abs(itrFiling.taxLiabilityOrRefund))}</span>,
                  },
                ]}
              />
            </section>
          )}

          {debtor && (
            <section className={cn((task || itrFiling) && 'pt-5 border-t border-line')}>
              <SectionTitle
                right={
                  <div className="flex items-center gap-2">
                    <Badge tone={statusTone(debtor.status)} dot>{debtor.status}</Badge>
                    {onGenerateInvoice && (
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={ReceiptText}
                        onClick={() => {
                          onClose();
                          onGenerateInvoice(client);
                        }}
                        className="h-6 text-2xs px-2"
                      >
                        Invoice
                      </Button>
                    )}
                  </div>
                }
              >
                Fees
              </SectionTitle>
              <DescriptionList
                columns={3}
                items={[
                  { label: 'Outstanding', value: <span className="num font-medium">{formatINR(debtor.currentBalance)}</span> },
                  { label: 'Ageing', value: debtor.agingBucket },
                  { label: 'Received this month', value: <span className="num">{formatINR(debtor.months[debtor.months.length - 1]?.received)}</span> },
                ]}
              />
            </section>
          )}

          {!task && !itrFiling && !debtor && <EmptyState title="No filings or fee records yet" />}
        </div>
      )}

      {activeTab === 'tickets' && (
        <div>
          {clientTickets.length === 0 ? (
            <EmptyState title="No calls logged" description="Inbound calls and follow-ups for this client will appear here." />
          ) : (
            <div className="divide-y divide-line">
              {clientTickets.map((t) => {
                const assignedTo = getStaff(t.assignedStaffId);
                return (
                  <div key={t.id} className="py-3.5 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="ident text-fg-subtle">{t.ticketNo}</span>
                        <span className="text-sm font-medium text-fg truncate">{t.subject}</span>
                      </div>
                      <Badge tone={statusTone(t.status)} dot>
                        {t.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-fg-muted mt-1">{t.description}</p>
                    <div className="mt-1.5 text-xs text-fg-subtle">
                      {t.callerName} · Assigned to {assignedTo?.name || 'nobody yet'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};
