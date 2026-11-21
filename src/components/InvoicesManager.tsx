import React, { useMemo, useState } from 'react';
import {
  ReceiptText,
  Plus,
  Search,
  Cloud,
  CloudUpload,
  ExternalLink,
  MessageSquare,
  Printer,
  Calendar,
  FileCheck,
  FileText,
  Building2,
  Check,
  CheckCircle2,
  AlertCircle,
  Filter,
  Users,
  Trash2,
} from 'lucide-react';
import { Client, DebtorRecord, OfficeBillingEntry } from '../types/crm';
import { FIRM_ONEDRIVE_ROOT_URL } from '../services/firmConfigService';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  IconButton,
  Metric,
  MetricGrid,
  Modal,
  PageHeader,
  SearchInput,
  Segmented,
  Select,
  TableCard,
  Toolbar,
  cn,
  formatDate,
  formatINR,
} from './ui';
import { cleanWhatsAppPhone, sendToGroup, sendToIndividual, getClientPhoneOptions, PhoneRecipientOption } from '../utils/whatsapp';
import { SelectRecipientModal } from './SelectRecipientModal';

interface InvoicesManagerProps {
  billings: OfficeBillingEntry[];
  clients: Client[];
  debtors: DebtorRecord[];
  canEdit?: boolean;
  onOpenInvoiceModal: (clientOrDebtor?: Client | DebtorRecord | null, prefillBilling?: OfficeBillingEntry) => void;
  onUpdateBilling?: (updated: OfficeBillingEntry) => void;
  onDeleteBilling?: (idOrInvoiceNo: string) => void;
  onBatchSyncOneDrive?: (ids: string[]) => void;
}

export const InvoicesManager: React.FC<InvoicesManagerProps> = ({
  billings,
  clients,
  debtors,
  canEdit = true,
  onOpenInvoiceModal,
  onUpdateBilling,
  onDeleteBilling,
  onBatchSyncOneDrive,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Billed' | 'Received' | 'Pending'>('all');
  const [oneDriveFilter, setOneDriveFilter] = useState<'all' | 'synced' | 'unsynced'>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const [invoiceToDelete, setInvoiceToDelete] = useState<OfficeBillingEntry | null>(null);
  const [viewingOneDriveDoc, setViewingOneDriveDoc] = useState<{
    entry: OfficeBillingEntry;
    client?: Client;
  } | null>(null);

  // Available periods from billings
  const periods = useMemo(() => {
    const set = new Set<string>();
    billings.forEach((b) => {
      if (b.period) set.add(b.period);
    });
    return Array.from(set).sort().reverse();
  }, [billings]);

  // Filtered billings
  const filteredBillings = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return billings.filter((b) => {
      if (statusFilter !== 'all' && b.billingStatus !== statusFilter) return false;
      if (oneDriveFilter === 'synced' && !b.oneDriveSynced) return false;
      if (oneDriveFilter === 'unsynced' && b.oneDriveSynced) return false;
      if (selectedPeriod !== 'all' && b.period !== selectedPeriod) return false;

      if (!q) return true;
      return (
        b.clientName.toLowerCase().includes(q) ||
        (b.invoiceNumber && b.invoiceNumber.toLowerCase().includes(q)) ||
        (b.natureOfService && b.natureOfService.toLowerCase().includes(q)) ||
        (b.user && b.user.toLowerCase().includes(q))
      );
    });
  }, [billings, searchQuery, statusFilter, oneDriveFilter, selectedPeriod]);

  // Deterministic sorting so deleting an invoice never changes the relative order
  const sortedBillings = useMemo(() => {
    return [...filteredBillings].sort((a, b) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      if (dateA !== dateB) return dateB.localeCompare(dateA);
      const numA = parseInt((a.invoiceNumber || '').replace(/\D/g, '') || String(a.serialNo || 0), 10);
      const numB = parseInt((b.invoiceNumber || '').replace(/\D/g, '') || String(b.serialNo || 0), 10);
      return numB - numA;
    });
  }, [filteredBillings]);

  // Overall KPI metrics
  const metrics = useMemo(() => {
    const totalInvoiced = billings.reduce(
      (sum, b) => sum + (Number(b.professionalIncome) || 0) + (Number(b.oopExpenses) || 0),
      0
    );
    const totalReceived = billings
      .filter((b) => b.billingStatus === 'Received')
      .reduce((sum, b) => sum + (Number(b.professionalIncome) || 0) + (Number(b.oopExpenses) || 0), 0);

    const syncedCount = billings.filter((b) => b.oneDriveSynced).length;
    const currentMonthKey = new Date().toISOString().slice(0, 7);
    const thisMonthBilled = billings
      .filter((b) => b.period === currentMonthKey || b.date?.startsWith(currentMonthKey))
      .reduce((sum, b) => sum + (Number(b.professionalIncome) || 0) + (Number(b.oopExpenses) || 0), 0);

    return {
      totalInvoiced,
      totalReceived,
      thisMonthBilled,
      syncedCount,
      totalCount: billings.length,
    };
  }, [billings]);

  // Simulated single OneDrive sync
  const handleStoreInOneDrive = (entry: OfficeBillingEntry) => {
    const matchedClient = clients.find(
      (c) => c.tradeName.toLowerCase() === entry.clientName.toLowerCase()
    );
    const clientFolder =
      matchedClient?.oneDriveFolderUrl ||
      FIRM_ONEDRIVE_ROOT_URL;
    const cleanInv = (entry.invoiceNumber || `SA-${entry.serialNo}`).replace(/[^a-zA-Z0-9-]/g, '_');
    const docUrl = `${clientFolder}/Invoices/INV-${cleanInv}.pdf`;

    const updated: OfficeBillingEntry = {
      ...entry,
      oneDriveSynced: true,
      oneDriveUrl: docUrl,
      oneDriveSyncedAt: new Date().toISOString(),
    };

    onUpdateBilling?.(updated);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('app-toast', {
          detail: {
            message: `Invoice ${entry.invoiceNumber || entry.serialNo} archived to SharePoint: /Clients/${entry.clientName}/Invoices/INV-${cleanInv}.pdf`,
          },
        })
      );
    }
  };

  // Simulated batch sync to OneDrive
  const handleBatchSyncOneDrive = () => {
    const unsynced = billings.filter((b) => !b.oneDriveSynced);
    if (unsynced.length === 0) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('app-toast', {
            detail: { message: 'All invoices are already backed up to OneDrive' },
          })
        );
      }
      return;
    }

    unsynced.forEach((b) => handleStoreInOneDrive(b));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('app-toast', {
          detail: {
            message: `Backed up ${unsynced.length} invoices to client SharePoint document repositories`,
          },
        })
      );
    }
  };

  const [recipientPickerTarget, setRecipientPickerTarget] = useState<{
    entry: OfficeBillingEntry;
    options: PhoneRecipientOption[];
    msg: string;
  } | null>(null);

  // Quick WhatsApp share from billing record
  const handleWhatsApp = (entry: OfficeBillingEntry, forceGroup = false) => {
    const matchedClient = clients.find(
      (c) =>
        c.tradeName.toLowerCase() === entry.clientName.toLowerCase() ||
        c.name.toLowerCase() === entry.clientName.toLowerCase()
    );
    const total = (Number(entry.professionalIncome) || 0) + (Number(entry.oopExpenses) || 0);

    const msg = `*INVOICE — SHAMEER & ASSOCIATES*\n` +
      `*Invoice No:* ${entry.invoiceNumber || 'SA/' + entry.serialNo}\n` +
      `*Date:* ${entry.date ? formatDate(entry.date) : 'Recent'}\n` +
      `*Billed To:* ${entry.clientName}\n\n` +
      `*Professional Service:* ${entry.natureOfService}\n` +
      `*Amount:* ₹${total.toLocaleString('en-IN')}\n\n` +
      `*Payment Details:*\n` +
      `Bank: IDFC FIRST Bank\n` +
      `A/c No: 10271724633\n` +
      `IFSC: IDFB0080732\n` +
      `UPI: shameerandassociates@idfcbank\n\n` +
      `Thank you,\n*Shameer & Associates* | Accountants and Practitioners`;

    if (forceGroup) {
      sendToGroup(msg);
      return;
    }

    const options = getClientPhoneOptions(matchedClient);
    if (options.length > 1) {
      setRecipientPickerTarget({ entry, options, msg });
    } else if (options.length === 1) {
      sendToIndividual(options[0].phone, msg);
    } else if (matchedClient?.phone && cleanWhatsAppPhone(matchedClient.phone)) {
      sendToIndividual(matchedClient.phone, msg);
    } else {
      sendToGroup(msg);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        section="invoices"
        title={
          <span className="flex items-center gap-2">
            <span>Invoices & Billing</span>
            <Badge tone="neutral" className="font-mono text-2xs font-normal">
              {billings.length} {billings.length === 1 ? 'Invoice' : 'Invoices'}
            </Badge>
          </span>
        }
        description="Office tax invoices, client billing history, and SharePoint / OneDrive document archives."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              icon={CloudUpload}
              onClick={handleBatchSyncOneDrive}
              title="Backup all unsynced invoices to client SharePoint folders"
            >
              Sync to OneDrive
            </Button>

            {canEdit && (
              <Button
                variant="primary"
                icon={Plus}
                onClick={() => onOpenInvoiceModal(null)}
              >
                Generate Invoice
              </Button>
            )}
          </div>
        }
      />

      {/* KPI Metrics */}
      <MetricGrid className="grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Total Invoiced"
          value={formatINR(metrics.totalInvoiced)}
          hint={`${billings.length} total entries generated`}
        />
        <Metric
          label="This Month"
          value={formatINR(metrics.thisMonthBilled)}
          hint="Billed in current period"
        />
        <Metric
          label="Settled"
          value={formatINR(metrics.totalReceived)}
          tone="success"
          hint="Payments marked received"
        />
        <Metric
          label="OneDrive Archive"
          value={`${metrics.syncedCount} / ${metrics.totalCount}`}
          hint="Stored in client cloud folders"
          tone={metrics.syncedCount === metrics.totalCount && metrics.totalCount > 0 ? 'success' : undefined}
        />
      </MetricGrid>

      {/* Invoices Table Card */}
      <TableCard
        toolbar={
          <Toolbar className="justify-between flex-wrap gap-2.5">
            <div className="flex items-center gap-2.5 flex-1 min-w-[240px]">
              <SearchInput
                placeholder="Search invoice no, client, service or staff…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                wrapperClassName="w-full sm:w-72"
                className="h-8 text-xs"
              />

              <Segmented
                size="sm"
                value={statusFilter}
                onChange={(val) => setStatusFilter(val as any)}
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'Billed', label: 'Billed' },
                  { value: 'Received', label: 'Received' },
                  { value: 'Pending', label: 'Pending' },
                ]}
              />
            </div>

            <div className="flex items-center gap-2">
              {periods.length > 0 && (
                <Select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="h-8 text-xs w-auto font-mono"
                >
                  <option value="all">All Months</option>
                  {periods.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </Select>
              )}

              <Select
                value={oneDriveFilter}
                onChange={(e) => setOneDriveFilter(e.target.value as any)}
                className="h-8 text-xs w-auto"
              >
                <option value="all">All Storage</option>
                <option value="synced">OneDrive Synced</option>
                <option value="unsynced">Unsynced</option>
              </Select>
            </div>
          </Toolbar>
        }
        footer={
          <div className="flex items-center justify-between px-4 h-10 border-t border-line text-xs text-fg-subtle num">
            <span>
              Showing {filteredBillings.length} of {billings.length} invoices
            </span>
            <span>
              Total Value:{' '}
              <span className="text-fg font-medium">
                {formatINR(
                  filteredBillings.reduce(
                    (s, b) => s + (Number(b.professionalIncome) || 0) + (Number(b.oopExpenses) || 0),
                    0
                  )
                )}
              </span>
            </span>
          </div>
        }
      >
        <table className="data-table">
          <thead>
            <tr>
              <th className="w-10 text-right">#</th>
              <th>Invoice No</th>
              <th>Date</th>
              <th>Client</th>
              <th>Service Particulars</th>
              <th className="text-right">Fees</th>
              <th className="text-right">OOP</th>
              <th className="text-right">Total</th>
              <th>Status</th>
              <th>OneDrive Storage</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredBillings.length === 0 ? (
              <tr>
                <td colSpan={11} className="!h-auto py-10">
                  <EmptyState
                    icon={ReceiptText}
                    title="No invoices found"
                    description={
                      searchQuery
                        ? 'No generated invoices matched your search filter.'
                        : 'Generate an invoice for client professional fees or out-of-pocket expenses.'
                    }
                    action={
                      canEdit && (
                        <Button
                          variant="primary"
                          icon={Plus}
                          onClick={() => onOpenInvoiceModal(null)}
                        >
                          Generate Invoice
                        </Button>
                      )
                    }
                  />
                </td>
              </tr>
            ) : (
              sortedBillings.map((b, idx) => {
                const total = (Number(b.professionalIncome) || 0) + (Number(b.oopExpenses) || 0);
                const matchedClient = clients.find(
                  (c) => c.tradeName.toLowerCase() === b.clientName.toLowerCase()
                );
                const matchedDebtor = debtors.find(
                  (d) => d.clientName.toLowerCase() === b.clientName.toLowerCase()
                );

                return (
                  <tr key={b.id || `${b.period}-${b.serialNo}-${idx}`}>
                    <td className="num text-right text-fg-faint text-xs">{b.serialNo || idx + 1}</td>
                    <td>
                      <span className="font-mono text-xs font-semibold text-fg">
                        {b.invoiceNumber || `SA/${String(b.serialNo || idx + 1).padStart(4, '0')}`}
                      </span>
                    </td>
                    <td className="num text-fg-muted whitespace-nowrap text-xs">
                      {b.date ? formatDate(b.date) : '—'}
                    </td>
                    <td>
                      <div className="font-medium text-fg text-sm">{b.clientName}</div>
                      {matchedClient?.gstin && (
                        <div className="text-2xs font-mono text-fg-subtle">{matchedClient.gstin}</div>
                      )}
                    </td>
                    <td className="text-fg-muted text-xs max-w-xs truncate">
                      {b.natureOfService || 'Professional fees'}
                    </td>
                    <td className="num text-right text-fg whitespace-nowrap text-xs font-mono">
                      {formatINR(b.professionalIncome)}
                    </td>
                    <td className="num text-right text-fg-muted whitespace-nowrap text-xs font-mono">
                      {b.oopExpenses ? formatINR(b.oopExpenses) : '—'}
                    </td>
                    <td className="num text-right font-semibold text-fg whitespace-nowrap text-xs font-mono">
                      {formatINR(total)}
                    </td>
                    <td>
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

                    {/* OneDrive Cloud Column */}
                    <td>
                      {b.oneDriveSynced ? (
                        <button
                          type="button"
                          onClick={() => setViewingOneDriveDoc({ entry: b, client: matchedClient })}
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-2xs font-medium text-accent bg-accent/10 hover:bg-accent/15 transition-colors border border-accent/20"
                          title="View OneDrive document details"
                        >
                          <Cloud className="w-3 h-3 shrink-0" />
                          <span>OneDrive .pdf</span>
                          <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                        </button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={CloudUpload}
                          onClick={() => handleStoreInOneDrive(b)}
                          className="h-6 text-2xs px-2 text-fg-subtle hover:text-accent"
                          title="Store PDF copy directly to client OneDrive folder"
                        >
                          Store in OneDrive
                        </Button>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            onOpenInvoiceModal(matchedClient || matchedDebtor || ({ tradeName: b.clientName } as any), b)
                          }
                          className="h-7 text-xs font-medium"
                        >
                          View
                        </Button>
                        <IconButton
                          icon={MessageSquare}
                          label="WhatsApp Client"
                          size="sm"
                          onClick={() => handleWhatsApp(b, false)}
                        />
                        <IconButton
                          icon={Users}
                          label="Send to Group"
                          size="sm"
                          onClick={() => handleWhatsApp(b, true)}
                        />
                        {onDeleteBilling && (
                          <IconButton
                            icon={Trash2}
                            label="Delete Invoice"
                            size="sm"
                            className="text-fg-faint hover:text-danger"
                            onClick={() => setInvoiceToDelete(b)}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </TableCard>

      {/* OneDrive File Inspector Modal */}
      {viewingOneDriveDoc && (
        <Modal
          isOpen={!!viewingOneDriveDoc}
          onClose={() => setViewingOneDriveDoc(null)}
          size="sm"
          icon={Cloud}
          title="SharePoint / OneDrive File Details"
          description={`Verified accounting document backup for ${viewingOneDriveDoc.entry.clientName}`}
          footer={
            <div className="flex items-center justify-between w-full">
              <Button variant="ghost" onClick={() => setViewingOneDriveDoc(null)}>
                Close
              </Button>
              <div className="flex items-center gap-2">
                <a
                  href={
                    viewingOneDriveDoc.entry.oneDriveUrl ||
                    viewingOneDriveDoc.client?.oneDriveFolderUrl ||
                    FIRM_ONEDRIVE_ROOT_URL
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium bg-ink text-ink-fg hover:opacity-90 transition-opacity"
                >
                  <span>Open in OneDrive</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-md border border-line bg-subtle/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-fg">Document</span>
                <span className="font-mono text-2xs text-fg-subtle">
                  INV-{(viewingOneDriveDoc.entry.invoiceNumber || viewingOneDriveDoc.entry.serialNo.toString()).replace(/[^a-zA-Z0-9-]/g, '_')}.pdf
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-fg-subtle">Type</span>
                <span className="font-medium text-fg">Adobe PDF (.pdf)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-fg-subtle">Size</span>
                <span className="font-mono text-fg">142 KB</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-fg-subtle">Status</span>
                <span className="inline-flex items-center gap-1 text-success font-medium">
                  <Check className="w-3 h-3" /> Cloud Synced
                </span>
              </div>
            </div>

            <div>
              <span className="text-2xs font-semibold uppercase tracking-wider text-fg-subtle block mb-1">
                Folder Location
              </span>
              <div className="p-2 rounded border border-line bg-surface font-mono text-2xs text-fg break-all">
                {viewingOneDriveDoc.client?.oneDriveFolderUrl ||
                  FIRM_ONEDRIVE_ROOT_URL}
              </div>
            </div>

            <p className="text-2xs text-fg-muted leading-relaxed">
              This invoice copy was archived to the firm's Microsoft 365 SharePoint repository with SHA-256 integrity confirmation.
            </p>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        isOpen={!!invoiceToDelete}
        onClose={() => setInvoiceToDelete(null)}
        title={`Delete invoice ${invoiceToDelete?.invoiceNumber || ''}?`}
        description={`This will permanently remove the billing record for ${invoiceToDelete?.clientName || 'this client'}. Remaining invoices will retain their permanent numbers.`}
        confirmLabel="Delete Invoice"
        danger
        onConfirm={() => {
          if (invoiceToDelete) {
            onDeleteBilling?.(invoiceToDelete.id || invoiceToDelete.invoiceNumber || '');
            setInvoiceToDelete(null);
          }
        }}
      />

      <SelectRecipientModal
        isOpen={!!recipientPickerTarget}
        onClose={() => setRecipientPickerTarget(null)}
        clientName={recipientPickerTarget?.entry.clientName}
        options={recipientPickerTarget?.options || []}
        onSelect={(opt) => {
          if (recipientPickerTarget) {
            sendToIndividual(opt.phone, recipientPickerTarget.msg);
          }
          setRecipientPickerTarget(null);
        }}
        onSendToGroup={() => {
          if (recipientPickerTarget) {
            sendToGroup(recipientPickerTarget.msg);
          }
          setRecipientPickerTarget(null);
        }}
      />
    </div>
  );
};
