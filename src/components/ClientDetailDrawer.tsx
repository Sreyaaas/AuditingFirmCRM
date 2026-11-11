import React, { useState } from 'react';
import { ExternalLink, Copy, Check, MessageSquare } from 'lucide-react';
import { Client, MonthlyTask, ITRFiling, StaffMember, StaffTicket, DebtorRecord } from '../types/crm';
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
  onOpenWhatsApp: (taskOrItr: any) => void;
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
  onOpenWhatsApp,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'onedrive' | 'compliance' | 'tickets'>('profile');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!isOpen || !client) return null;

  const clientTickets = tickets.filter((t) => t.clientId === client.id);

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
      size="md"
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
            { value: 'onedrive', label: 'Documents' },
            { value: 'tickets', label: 'Calls', count: clientTickets.length || undefined },
          ]}
        />
      }
      bodyClassName="py-5"
      footer={
        <>
          <a
            href={client.oneDriveFolderUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mr-auto inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg transition-colors"
          >
            SharePoint folder
            <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.75} />
          </a>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
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
            <SectionTitle>Contact</SectionTitle>
            <DescriptionList
              columns={3}
              items={[
                { label: 'Contact person', value: client.contactPerson || '—' },
                { label: 'Phone / WhatsApp', value: client.phone || '—', mono: true },
                { label: 'Email', value: client.email || '—' },
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
        </div>
      )}

      {activeTab === 'onedrive' && (
        <EmptyState
          title="Client documents"
          description={client.oneDriveFolderUrl ? 'Returns, workings and statements are kept in the client folder.' : 'No document folder has been linked for this client yet.'}
          action={
            client.oneDriveFolderUrl && (
              <a href={client.oneDriveFolderUrl} target="_blank" rel="noopener noreferrer">
                <Button icon={ExternalLink}>Open Folder</Button>
              </a>
            )
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
              <SectionTitle right={<Badge tone={statusTone(debtor.status)} dot>{debtor.status}</Badge>}>Fees</SectionTitle>
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
