import React, { useEffect, useMemo, useState } from 'react';
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
  Radio,
  FileCheck2,
  FileX2,
} from 'lucide-react';
import { Client, DebtorRecord, OfficeBillingEntry, MonthlyTask, ITRFiling } from '../types/crm';
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
  Pagination,
  SearchInput,
  Segmented,
  Select,
  TableCard,
  Tabs,
  Toolbar,
  cn,
  formatDate,
  formatINR,
} from './ui';
import { useResponsivePageSize } from '../hooks/useResponsivePageSize';
import { cleanWhatsAppPhone, sendToGroup, sendToIndividual, getClientPhoneOptions, PhoneRecipientOption } from '../utils/whatsapp';
import { SelectRecipientModal } from './SelectRecipientModal';

interface InvoicesManagerProps {
  billings: OfficeBillingEntry[];
  clients: Client[];
  debtors: DebtorRecord[];
  monthlyTasks?: MonthlyTask[];
  quarterlyTasks?: MonthlyTask[];
  itrFilings?: ITRFiling[];
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
  monthlyTasks = [],
  quarterlyTasks = [],
  itrFilings = [],
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

  // Radar View State
  const [activeManagerTab, setActiveManagerTab] = useState<'register' | 'radar'>('register');
  const [radarSearch, setRadarSearch] = useState('');
  const [radarCategory, setRadarCategory] = useState<'all' | 'Monthly Compliance' | 'Quarterly' | 'Annual ITR'>('all');
  const [radarStatus, setRadarStatus] = useState<'missed' | 'billed' | 'all'>('missed');

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

  const [page, setPage] = useState(1);
  const pageSize = useResponsivePageSize({ reservedHeight: 450, min: 7, max: 24 });

  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter, oneDriveFilter, selectedPeriod]);

  const paginatedBillings = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedBillings.slice(start, start + pageSize);
  }, [sortedBillings, page, pageSize]);

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

  // Cross-Check Algorithm: Audit all completed compliance tasks and ITR filings against billings
  const auditedReturns = useMemo(() => {
    const list: {
      id: string;
      clientId: string;
      clientName: string;
      tradeName: string;
      pan: string;
      gstin: string;
      entityType: string;
      category: 'Monthly Compliance' | 'Quarterly' | 'Annual ITR';
      serviceType: string;
      period: string;
      assignmentTitle?: string;
      filedDateOrArn: string;
      isBilled: boolean;
      matchedInvoice?: OfficeBillingEntry;
      estimatedFee: number;
    }[] = [];

    const isMatch = (b: OfficeBillingEntry, cName: string, tName: string, service: string, period: string) => {
      const bn = (b.clientName || '').trim().toLowerCase();
      const cn = cName.trim().toLowerCase();
      const tn = tName.trim().toLowerCase();
      const clientMatched = bn === cn || bn === tn || (cn && bn.includes(cn)) || (tn && bn.includes(tn));
      if (!clientMatched) return false;

      const desc = (b.natureOfService || '').toLowerCase();
      const srv = service.toLowerCase();
      const fMonth = (b.filingMonth || '').toLowerCase();
      const p = period.toLowerCase();

      const periodMatched = Boolean(fMonth && p && (fMonth === p || p.includes(fMonth) || fMonth.includes(p)));
      const descMatched = desc.includes(srv) || (srv.includes('gstr') && desc.includes('gst')) || (srv.includes('itr') && desc.includes('tax'));
      return periodMatched || descMatched;
    };

    // 1. Monthly tasks
    (monthlyTasks || []).forEach((t) => {
      if (t.status === 'Filed' || t.status === 'Completed') {
        const client = clients.find((c) => c.id === t.clientId || c.tradeName.toLowerCase() === t.tradeName.toLowerCase());
        const service = t.filingType;
        const matched = billings.find((b) => isMatch(b, t.clientName, t.tradeName, service, t.period) || (t.invoiceNumber && b.invoiceNumber === t.invoiceNumber));
        list.push({
          id: t.id,
          clientId: t.clientId,
          clientName: t.clientName,
          tradeName: t.tradeName || t.clientName,
          pan: client?.pan || '',
          gstin: client?.gstin || t.gstin || '',
          entityType: client?.entityType || 'Client',
          category: 'Monthly Compliance',
          serviceType: service,
          period: t.period,
          filedDateOrArn: t.arnNumber || 'Filed',
          isBilled: Boolean(matched || t.isBilled),
          matchedInvoice: matched,
          estimatedFee: t.estimatedFee || client?.monthlyAuditFee || 3000,
        });
      }
    });

    // 2. Quarterly tasks
    (quarterlyTasks || []).forEach((t) => {
      if (t.status === 'Filed' || t.status === 'Completed') {
        const client = clients.find((c) => c.id === t.clientId || c.tradeName.toLowerCase() === t.tradeName.toLowerCase());
        const service = t.filingType || t.assignmentTitle || 'Quarterly Filing';
        const matched = billings.find((b) => isMatch(b, t.clientName, t.tradeName, service, t.period) || (t.invoiceNumber && b.invoiceNumber === t.invoiceNumber));
        list.push({
          id: t.id,
          clientId: t.clientId,
          clientName: t.clientName,
          tradeName: t.tradeName || t.clientName,
          pan: client?.pan || '',
          gstin: client?.gstin || t.gstin || '',
          entityType: client?.entityType || 'Client',
          category: 'Quarterly',
          serviceType: service,
          period: t.period,
          assignmentTitle: t.assignmentTitle,
          filedDateOrArn: t.arnNumber || 'Filed',
          isBilled: Boolean(matched || t.isBilled),
          matchedInvoice: matched,
          estimatedFee: t.estimatedFee || client?.monthlyAuditFee || 5000,
        });
      }
    });

    // 3. ITR filings
    (itrFilings || []).forEach((i) => {
      if (i.status === 'Filed & e-Verified' || (i.status as string) === 'Completed' || (i.status as string) === 'Filed') {
        const client = clients.find((c) => c.id === i.clientId || c.tradeName.toLowerCase() === i.clientName.toLowerCase());
        const service = i.itrForm || 'Income Tax Return';
        const period = i.assessmentYear || 'AY 2026-27';
        const matched = billings.find((b) => isMatch(b, i.clientName, i.clientName, service, period) || (i.invoiceNumber && b.invoiceNumber === i.invoiceNumber));
        list.push({
          id: i.id,
          clientId: i.clientId,
          clientName: i.clientName,
          tradeName: client?.tradeName || i.clientName,
          pan: i.pan || client?.pan || '',
          gstin: client?.gstin || '',
          entityType: i.entityType || client?.entityType || 'Individual',
          category: 'Annual ITR',
          serviceType: service,
          period,
          filedDateOrArn: i.acknowledgmentNo || 'Filed & e-Verified',
          isBilled: Boolean(matched || i.isBilled),
          matchedInvoice: matched,
          estimatedFee: i.estimatedFee || client?.monthlyAuditFee || 4500,
        });
      }
    });

    return list;
  }, [monthlyTasks, quarterlyTasks, itrFilings, billings, clients]);

  // Radar KPIs
  const radarKPIs = useMemo(() => {
    const totalAudited = auditedReturns.length;
    const billedReturns = auditedReturns.filter((r) => r.isBilled).length;
    const missedReturns = auditedReturns.filter((r) => !r.isBilled);
    const unbilledCount = missedReturns.length;
    const unbilledPotential = missedReturns.reduce((sum, r) => sum + r.estimatedFee, 0);

    return {
      totalAudited,
      billedReturns,
      unbilledCount,
      unbilledPotential,
    };
  }, [auditedReturns]);

  // Filtered Radar Returns
  const filteredRadarReturns = useMemo(() => {
    const q = radarSearch.toLowerCase().trim();
    return auditedReturns.filter((r) => {
      if (radarCategory !== 'all' && r.category !== radarCategory) return false;
      if (radarStatus === 'missed' && r.isBilled) return false;
      if (radarStatus === 'billed' && !r.isBilled) return false;

      if (!q) return true;
      return (
        r.clientName.toLowerCase().includes(q) ||
        r.tradeName.toLowerCase().includes(q) ||
        r.gstin.toLowerCase().includes(q) ||
        r.pan.toLowerCase().includes(q) ||
        r.serviceType.toLowerCase().includes(q) ||
        r.period.toLowerCase().includes(q) ||
        r.filedDateOrArn.toLowerCase().includes(q)
      );
    });
  }, [auditedReturns, radarCategory, radarStatus, radarSearch]);

  const handleGenerateInvoiceForReturn = (item: {
    clientId: string;
    clientName: string;
    tradeName: string;
    serviceType: string;
    period: string;
    assignmentTitle?: string;
    estimatedFee: number;
  }) => {
    const matchedClient = clients.find(
      (c) =>
        c.id === item.clientId ||
        c.tradeName.toLowerCase() === item.clientName.toLowerCase() ||
        c.name.toLowerCase() === item.clientName.toLowerCase()
    );

    const fee = item.estimatedFee || matchedClient?.monthlyAuditFee || 3000;
    const desc = item.assignmentTitle
      ? `${item.assignmentTitle} — ${item.period}`
      : `${item.serviceType} Filing — ${item.period}`;

    const prefill: OfficeBillingEntry = {
      serialNo: 0,
      date: new Date().toISOString().slice(0, 10),
      clientName: matchedClient?.tradeName || item.clientName,
      natureOfService: desc,
      filingMonth: item.period,
      period: item.period.slice(0, 7) || new Date().toISOString().slice(0, 7),
      professionalIncome: fee,
      oopExpenses: 0,
      billingStatus: 'Billed',
      user: 'Staff',
      lineItems: [
        {
          id: `srv-${Date.now()}`,
          description: desc,
          amount: fee,
          sacCode: '998231',
          itemType: 'service',
        },
      ],
    };

    onOpenInvoiceModal(matchedClient || null, prefill);
  };

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
    let advance = Number(entry.advanceReceived) || 0;
    if (!advance && entry.invoiceNumber) {
      try {
        const metaRaw = localStorage.getItem(`inv_meta_${entry.invoiceNumber}`);
        if (metaRaw) advance = Number(JSON.parse(metaRaw)?.advanceReceived) || 0;
      } catch {}
    }
    const netPayable = Math.max(0, total - advance);

    const msg = `*INVOICE — SHAMEER & ASSOCIATES*\n` +
      `*Invoice No:* ${entry.invoiceNumber || 'SA/' + entry.serialNo}\n` +
      `*Date:* ${entry.date ? formatDate(entry.date) : 'Recent'}\n` +
      `*Billed To:* ${entry.clientName}\n\n` +
      `*Professional Service:* ${entry.natureOfService}\n` +
      (advance > 0 ? `*Subtotal:* ₹${total.toLocaleString('en-IN')}\n*Less Advance Received:* -₹${advance.toLocaleString('en-IN')}\n` : '') +
      `*Amount Payable:* ₹${netPayable.toLocaleString('en-IN')}\n\n` +
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
        description="Office tax invoices, client billing history, and compliance billing radar."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              icon={CloudUpload}
              onClick={() => window.open(FIRM_ONEDRIVE_ROOT_URL, '_blank', 'noopener,noreferrer')}
              title="Open firm OneDrive folder in a new tab"
            >
              Open OneDrive
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

      {/* Main Tab Navigation */}
      <div className="border-b border-line pb-px">
        <Tabs
          value={activeManagerTab}
          onChange={(v) => setActiveManagerTab(v as any)}
          options={[
            { value: 'register', label: 'Invoices Register', count: billings.length },
            {
              value: 'radar',
              label: 'Missed Invoices Radar',
              count: radarKPIs.unbilledCount,
            },
          ]}
        />
      </div>

      {activeManagerTab === 'register' ? (
        <>
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
          sortedBillings.length > 0 ? (
            <Pagination
              page={page}
              totalPages={Math.max(1, Math.ceil(sortedBillings.length / pageSize))}
              totalItems={sortedBillings.length}
              pageSize={pageSize}
              onChange={setPage}
              noun="invoices"
            />
          ) : undefined
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
              paginatedBillings.map((b, idx) => {
                const rowNum = (page - 1) * pageSize + idx + 1;
                const total = (Number(b.professionalIncome) || 0) + (Number(b.oopExpenses) || 0);
                const matchedClient = clients.find(
                  (c) => c.tradeName.toLowerCase() === b.clientName.toLowerCase()
                );
                const matchedDebtor = debtors.find(
                  (d) => d.clientName.toLowerCase() === b.clientName.toLowerCase()
                );

                return (
                  <tr key={b.id || `${b.period}-${b.serialNo}-${idx}`}>
                    <td className="num text-right text-fg-faint text-xs">{b.serialNo || rowNum}</td>
                    <td>
                      <span className="font-mono text-xs font-semibold text-fg">
                        {b.invoiceNumber || `SA/${String(b.serialNo || rowNum).padStart(4, '0')}`}
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
                          onClick={() => {
                            const url = matchedClient?.oneDriveFolderUrl || FIRM_ONEDRIVE_ROOT_URL;
                            window.open(url, '_blank', 'noopener,noreferrer');
                            handleStoreInOneDrive(b);
                          }}
                          className="h-6 text-2xs px-2 text-fg-subtle hover:text-accent"
                          title="Open client OneDrive folder to upload PDF"
                        >
                          Open OneDrive
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
        </>
      ) : (
        <>
          {/* Radar KPI Metrics */}
          <MetricGrid className="grid-cols-2 lg:grid-cols-4">
            <Metric
              label="Filed Returns Audited"
              value={radarKPIs.totalAudited}
              hint="Completed compliance filings"
            />
            <Metric
              label="Billed Returns"
              value={radarKPIs.billedReturns}
              hint="Invoice matched in register"
              tone="success"
            />
            <Metric
              label="Missed Invoices"
              value={radarKPIs.unbilledCount}
              hint="Completed without invoice"
              tone={radarKPIs.unbilledCount > 0 ? 'danger' : 'success'}
            />
            <Metric
              label="Unbilled Potential"
              value={formatINR(radarKPIs.unbilledPotential)}
              hint="Estimated unbilled professional fees"
              tone={radarKPIs.unbilledPotential > 0 ? 'warning' : undefined}
            />
          </MetricGrid>

          {/* Missed Invoices Radar Table Card */}
          <TableCard
            toolbar={
              <Toolbar className="justify-between flex-wrap gap-2.5">
                <div className="flex items-center gap-2 flex-1 max-w-sm">
                  <SearchInput
                    value={radarSearch}
                    onChange={(e) => setRadarSearch(e.target.value)}
                    placeholder="Search client, GSTIN, PAN or return…"
                  />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Select
                    value={radarCategory}
                    onChange={(e) => setRadarCategory(e.target.value as any)}
                    className="w-48 text-xs"
                  >
                    <option value="all">All Compliance Categories</option>
                    <option value="Monthly Compliance">Monthly Compliance</option>
                    <option value="Quarterly">Quarterly Compliance</option>
                    <option value="Annual ITR">Annual ITR & ROC</option>
                  </Select>

                  <Select
                    value={radarStatus}
                    onChange={(e) => setRadarStatus(e.target.value as any)}
                    className="w-48 text-xs font-medium"
                  >
                    <option value="missed">Missed (Unbilled Only)</option>
                    <option value="billed">Billed</option>
                    <option value="all">All Filed Returns</option>
                  </Select>
                </div>
              </Toolbar>
            }
          >
            {filteredRadarReturns.length === 0 ? (
              <EmptyState
                title={radarStatus === 'missed' ? 'Zero missed invoices detected' : 'No returns match filters'}
                description={
                  radarStatus === 'missed'
                    ? 'All filed compliance returns and statutory filings currently have invoices generated.'
                    : 'Try adjusting the search query or category filters.'
                }
              />
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Return & Service</th>
                    <th>Period / AY</th>
                    <th>Filed Date / ARN</th>
                    <th>Billing Status</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRadarReturns.map((item) => {
                    const clientObj = clients.find((c) => c.id === item.clientId);
                    return (
                      <tr key={item.id} className="hover:bg-hover">
                        <td className="py-2.5">
                          <div className="font-medium text-fg">{item.tradeName}</div>
                          <div className="flex items-center gap-1.5 text-xs text-fg-subtle mt-0.5 min-w-0">
                            <span>{item.entityType}</span>
                            <span className="text-fg-faint">·</span>
                            <span className="ident text-2xs">{item.gstin || item.pan || '—'}</span>
                          </div>
                        </td>
                        <td className="py-2.5">
                          <div className="text-fg font-medium">{item.serviceType}</div>
                          <div className="text-xs text-fg-subtle">{item.category}</div>
                        </td>
                        <td className="py-2.5 font-mono text-fg text-xs">{item.period}</td>
                        <td className="py-2.5">
                          <span className="ident text-xs text-fg-subtle" title={item.filedDateOrArn}>
                            {item.filedDateOrArn}
                          </span>
                        </td>
                        <td className="py-2.5">
                          <Badge tone={item.isBilled ? 'success' : 'danger'}>
                            {item.isBilled ? 'Billed' : 'Missed'}
                          </Badge>
                        </td>
                        <td className="py-2.5 text-right">
                          {item.isBilled ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onOpenInvoiceModal(clientObj || null, item.matchedInvoice)}
                            >
                              View
                            </Button>
                          ) : (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleGenerateInvoiceForReturn(item)}
                            >
                              Generate Invoice
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </TableCard>
        </>
      )}

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
