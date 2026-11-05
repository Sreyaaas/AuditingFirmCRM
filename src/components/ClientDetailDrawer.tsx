import React, { useState } from 'react';
import { Download, ExternalLink, Copy, Check, RefreshCw, MessageSquare } from 'lucide-react';
import { Client, MonthlyTask, ITRFiling, StaffMember, StaffTicket, DebtorRecord } from '../types/crm';
import { Avatar, Badge, Button, DescriptionList, EmptyState, Modal, SearchInput, Segmented, StatusDot, Tabs, cn, formatDate, formatINR, statusTone } from './ui';

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

interface ClientDocument {
  id: string;
  name: string;
  extension: 'pdf' | 'xlsx' | 'json';
  category: 'GST Return' | 'Accounts & Books' | 'Banking' | 'ITR Filing' | 'Statutory';
  size: string;
  date: string;
  uploadedBy: string;
  url: string;
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
  const [fileFilter, setFileFilter] = useState<'all' | 'pdf' | 'xlsx' | 'json'>('all');
  const [fileSearch, setFileSearch] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

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

  const defaultOneDriveFiles: ClientDocument[] = [
    {
      id: 'doc-1',
      name: `GSTR-3B_Acknowledgment_Oct2026.pdf`,
      extension: 'pdf',
      category: 'GST Return',
      size: '248 KB',
      date: '20 Oct 2026',
      uploadedBy: 'Susmi',
      url: client.oneDriveFolderUrl,
    },
    {
      id: 'doc-2',
      name: `Sales_Register_B2B_October_2026.xlsx`,
      extension: 'xlsx',
      category: 'Accounts & Books',
      size: '1.4 MB',
      date: '18 Oct 2026',
      uploadedBy: 'Client Upload',
      url: client.oneDriveFolderUrl,
    },
    {
      id: 'doc-3',
      name: `GSTR1_Offline_Utility_Payload.json`,
      extension: 'json',
      category: 'GST Return',
      size: '42 KB',
      date: '11 Oct 2026',
      uploadedBy: 'Ameen',
      url: client.oneDriveFolderUrl,
    },
    {
      id: 'doc-4',
      name: `Bank_Statement_Federal_Bank_Sep2026.pdf`,
      extension: 'pdf',
      category: 'Banking',
      size: '890 KB',
      date: '02 Oct 2026',
      uploadedBy: 'Susmi',
      url: client.oneDriveFolderUrl,
    },
    {
      id: 'doc-5',
      name: `Purchase_Inward_Register_Q2_FY26.xlsx`,
      extension: 'xlsx',
      category: 'Accounts & Books',
      size: '2.8 MB',
      date: '28 Sep 2026',
      uploadedBy: 'Ameen',
      url: client.oneDriveFolderUrl,
    },
    {
      id: 'doc-6',
      name: `ITR_Draft_AY2026-27_Computation.pdf`,
      extension: 'pdf',
      category: 'ITR Filing',
      size: '512 KB',
      date: '14 Sep 2026',
      uploadedBy: 'Shameer',
      url: client.oneDriveFolderUrl,
    },
    {
      id: 'doc-7',
      name: `GST_Registration_Certificate_REG06.pdf`,
      extension: 'pdf',
      category: 'Statutory',
      size: '340 KB',
      date: '12 Jan 2025',
      uploadedBy: 'Shameer',
      url: client.oneDriveFolderUrl,
    },
  ];

  const handleSyncOneDrive = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setSyncNotice('SharePoint index updated');
      setTimeout(() => setSyncNotice(null), 3000);
    }, 800);
  };

  const filteredFiles = defaultOneDriveFiles.filter((file) => {
    if (fileFilter !== 'all' && file.extension !== fileFilter) return false;
    if (fileSearch) {
      const q = fileSearch.toLowerCase();
      return (
        file.name.toLowerCase().includes(q) ||
        file.category.toLowerCase().includes(q) ||
        file.uploadedBy.toLowerCase().includes(q)
      );
    }
    return true;
  });

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

  const extTone: Record<ClientDocument['extension'], string> = {
    pdf: 'text-danger',
    xlsx: 'text-success',
    json: 'text-accent',
  };

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
          <Badge tone={client.isRecurringGST ? 'info' : 'neutral'}>{client.isRecurringGST ? 'Monthly retainer' : 'Annual ITR'}</Badge>
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
            { value: 'onedrive', label: 'Documents', count: defaultOneDriveFiles.length },
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
            <SectionTitle>Engagement</SectionTitle>
            <dl className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-4">
              <div className="min-w-0">
                <dt className="eyebrow">Owner</dt>
                <dd className="mt-1 flex items-center gap-2">
                  {staff && <Avatar initials={staff.initials} size="xs" />}
                  <span className="text-sm text-fg">{staff?.name || 'Ameen'}</span>
                </dd>
                <dd className="text-xs text-fg-subtle mt-0.5 truncate">{staff?.role || 'Partner & Senior Practitioner'}</dd>
              </div>
              <div>
                <dt className="eyebrow">Monthly fee</dt>
                <dd className="mt-1 num text-sm text-fg">{formatINR(client.monthlyAuditFee)}</dd>
                <dd className="text-xs text-fg-subtle mt-0.5">Retainer</dd>
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
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <SearchInput
              value={fileSearch}
              onChange={(e) => setFileSearch(e.target.value)}
              placeholder="Filter documents"
              wrapperClassName="w-full sm:w-64"
              className="h-7 text-xs"
            />
            <div className="flex items-center gap-1.5">
              <Segmented
                size="sm"
                value={fileFilter}
                onChange={setFileFilter}
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'pdf', label: 'PDF' },
                  { value: 'xlsx', label: 'XLSX' },
                  { value: 'json', label: 'JSON' },
                ]}
              />
              <Button size="sm" variant="ghost" icon={RefreshCw} onClick={handleSyncOneDrive} disabled={isSyncing} className={isSyncing ? '[&_svg]:animate-spin' : ''}>
                {isSyncing ? 'Syncing' : 'Sync'}
              </Button>
            </div>
          </div>

          {syncNotice && (
            <div className="flex items-center gap-2 h-8 px-3 rounded-md border border-line bg-subtle text-xs text-fg-muted animate-fade-in">
              <StatusDot tone="success" />
              {syncNotice}
            </div>
          )}

          <div className="border border-line rounded-lg overflow-hidden divide-y divide-line">
            {filteredFiles.length === 0 ? (
              <EmptyState title="No documents found" description="Try another file type or search term." className="py-8" />
            ) : (
              filteredFiles.map((file) => (
                <div key={file.id} className="flex items-center gap-3 px-3 h-12 hover:bg-subtle transition-colors group">
                  <span className={cn('ident text-2xs uppercase w-9 shrink-0 font-medium', extTone[file.extension])}>{file.extension}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-fg truncate">{file.name}</div>
                    <div className="text-xs text-fg-subtle truncate">
                      {file.category} · {file.uploadedBy}
                    </div>
                  </div>
                  <span className="num text-xs text-fg-subtle shrink-0 w-14 text-right">{file.size}</span>
                  <span className="num text-xs text-fg-subtle shrink-0 w-20 text-right hidden sm:inline">{file.date}</span>
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-7 w-7 inline-flex items-center justify-center rounded-md text-fg-subtle hover:text-fg hover:bg-hover transition-colors"
                    title="Download"
                    aria-label={`Download ${file.name}`}
                  >
                    <Download className="w-3.5 h-3.5" strokeWidth={1.75} />
                  </a>
                </div>
              ))
            )}
          </div>
        </div>
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
              <SectionTitle right={<Badge tone={statusTone(debtor.status)} dot>{debtor.status}</Badge>}>Fee ledger</SectionTitle>
              <DescriptionList
                columns={3}
                items={[
                  { label: 'Outstanding', value: <span className="num font-medium">{formatINR(debtor.currentBalance)}</span> },
                  { label: 'Ageing', value: debtor.agingBucket },
                  { label: 'Received this month', value: <span className="num">{formatINR(debtor.november.paymentCleared)}</span> },
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
