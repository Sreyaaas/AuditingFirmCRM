import React, { useMemo, useRef, useState } from 'react';
import { Download, MessageSquare, Plus, Upload, FileSpreadsheet, AlertTriangle, UserPlus, CalendarPlus, ReceiptText, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { DebtorRecord, GSTComplianceItem, OfficeBillingEntry, StaffMember, Client, EntityType, DebtorMonth } from '../types/crm';
import { AppPreferences, FirmProfileSettings } from '../services/firmConfigService';
import { exportDebtorsAndGSTWorkbook } from '../utils/excelExport';
import { closingOf, collectMonths, currentMonthKey, monthLabel, monthOf, nextMonthKey, recalcDebtor } from '../utils/debtors';
import { DebtorWorkbookResult, parseDebtorWorkbookFile } from '../utils/debtorWorkbook';
import { Badge, Button, ConfirmDialog, EmptyState, Field, IconButton, Input, Metric, MetricGrid, Modal, PageHeader, SearchInput, Segmented, Select, TableCard, Tabs, Toolbar, Tone, cn, formatDate, formatINR, Avatar, nameInitials } from './ui';
import { InvoiceGeneratorModal } from './InvoiceGeneratorModal';

interface DebtorsManagerProps {
  debtors: DebtorRecord[];
  billings: OfficeBillingEntry[];
  staffList: StaffMember[];
  selectedStaffId: string | null;
  clients?: Client[];
  preferences?: AppPreferences;
  firmProfile?: FirmProfileSettings;
  /** May record payments and bills. */
  canEdit: boolean;
  /** May replace data from an Excel workbook (admins). */
  canImport: boolean;
  gstCompliance: GSTComplianceItem[];
  onOpenWhatsApp: (debtor: DebtorRecord) => void;
  onRecordPayment: (debtorId: string, amountCleared: number, mode?: string, reference?: string, bankAccount?: string) => void;
  onAddBilling?: (
    debtorId: string,
    billingAmount: number,
    description: string,
    oopExpenses?: number,
    invoiceNoOverride?: string,
    oneDriveSynced?: boolean,
    oneDriveUrl?: string,
    lineItems?: Array<{ id: string; description: string; amount: number; sacCode?: string }>
  ) => void;
  onAddAccount?: (newDebtor: DebtorRecord) => void;
  onImport: (result: DebtorWorkbookResult) => Promise<{ error?: string }>;
  /** Administrators only: permanently delete a fee account. */
  onDelete?: (debtorId: string) => void;
  /** Administrators only: open the next month on every account, carrying balances forward. */
  onStartMonth?: (monthKey: string) => Promise<{ error?: string }>;
}

type View = string; // a 'YYYY-MM' month, 'all' or 'register'

const statusTone: Record<DebtorRecord['status'], Tone> = {
  Cleared: 'success',
  Advance: 'success',
  'Partially Paid': 'warning',
  Pending: 'neutral',
  Overdue: 'danger',
};

/** Status of one month in isolation (for past months). */
const monthStatus = (opening: number, received: number, billed: number): DebtorRecord['status'] => {
  const closing = opening - received + billed;
  if (closing < 0) return 'Advance';
  if (closing === 0) return 'Cleared';
  if (received > 0) return 'Partially Paid';
  return opening > 0 ? 'Overdue' : 'Pending';
};

const amt = (n?: number) => (n ? formatINR(n) : <span className="text-fg-faint">—</span>);
const signedINR = (n: number) => (n < 0 ? `−${formatINR(Math.abs(n))}` : formatINR(n));

type DebtorSortField = 'sNo' | 'client' | 'opening' | 'received' | 'billed' | 'closing' | 'balance' | 'status';
type BillingSortField = 'serialNo' | 'date' | 'client' | 'service' | 'fee' | 'oop' | 'invoice' | 'status' | 'user';

const SortHeader = <T extends string>({
  field,
  label,
  align = 'left',
  currentField,
  currentDir,
  onSort,
  rowSpan,
  colSpan,
  className,
}: {
  field: T;
  label: string;
  align?: 'left' | 'right' | 'center';
  currentField: T | null;
  currentDir: 'asc' | 'desc';
  onSort: (f: T) => void;
  rowSpan?: number;
  colSpan?: number;
  className?: string;
}) => {
  const active = currentField === field;
  return (
    <th
      rowSpan={rowSpan}
      colSpan={colSpan}
      onClick={() => onSort(field)}
      className={cn(
        'cursor-pointer select-none transition-colors hover:text-fg group',
        align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left',
        active ? 'text-fg font-semibold' : 'text-fg-subtle',
        className
      )}
    >
      <div
        className={cn(
          'inline-flex items-center gap-1',
          align === 'right' ? 'justify-end w-full' : align === 'center' ? 'justify-center w-full' : 'justify-start'
        )}
      >
        <span>{label}</span>
        {active ? (
          currentDir === 'asc' ? (
            <ArrowUp className="w-3 h-3 text-accent shrink-0" strokeWidth={2.5} />
          ) : (
            <ArrowDown className="w-3 h-3 text-accent shrink-0" strokeWidth={2.5} />
          )
        ) : (
          <ArrowUpDown className="w-3 h-3 text-fg-faint opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        )}
      </div>
    </th>
  );
};

export const DebtorsManager: React.FC<DebtorsManagerProps> = ({
  debtors,
  billings,
  staffList,
  selectedStaffId,
  clients = [],
  preferences,
  firmProfile,
  canEdit,
  canImport,
  gstCompliance,
  onOpenWhatsApp,
  onRecordPayment,
  onAddBilling,
  onAddAccount,
  onImport,
  onDelete,
  onStartMonth,
}) => {
  const [confirmDelete, setConfirmDelete] = useState<DebtorRecord | null>(null);
  const months = useMemo(() => collectMonths(debtors), [debtors]);
  const latestMonth = months[months.length - 1];
  const [view, setView] = useState<View>(latestMonth || 'register');

  // A new month can be opened up to one month ahead of today (so December can be
  // started at the end of November), never further.
  const nextMonth = latestMonth ? nextMonthKey(latestMonth) : null;
  const canStartMonth = !!(onStartMonth && nextMonth && nextMonth <= nextMonthKey(currentMonthKey()));
  const [confirmStart, setConfirmStart] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const runStartMonth = async () => {
    if (!nextMonth || !onStartMonth) return;
    setStartError(null);
    const res = await onStartMonth(nextMonth);
    if (res.error) setStartError(res.error);
    else setView(nextMonth);
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [balanceFilter, setBalanceFilter] = useState<'all' | 'due' | 'cleared'>('all');
  const [agingFilter, setAgingFilter] = useState<string>('all');
  const [staffFilter, setStaffFilter] = useState<string>('all');
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('all');
  const [registerPeriod, setRegisterPeriod] = useState<string>('all');
  const [registerStatusFilter, setRegisterStatusFilter] = useState<string>('all');
  const [registerStaffFilter, setRegisterStaffFilter] = useState<string>('all');

  const [debtorSortField, setDebtorSortField] = useState<DebtorSortField | null>(null);
  const [debtorSortDir, setDebtorSortDir] = useState<'asc' | 'desc'>('asc');
  const [billingSortField, setBillingSortField] = useState<BillingSortField>('date');
  const [billingSortDir, setBillingSortDir] = useState<'asc' | 'desc'>('desc');

  const handleDebtorSort = (field: DebtorSortField) => {
    if (debtorSortField === field) {
      setDebtorSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setDebtorSortField(field);
      setDebtorSortDir(['opening', 'received', 'billed', 'closing', 'balance'].includes(field) ? 'desc' : 'asc');
    }
  };

  const handleBillingSort = (field: BillingSortField) => {
    if (billingSortField === field) {
      setBillingSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setBillingSortField(field);
      setBillingSortDir(['date', 'fee', 'oop'].includes(field) ? 'desc' : 'asc');
    }
  };

  const [statementFor, setStatementFor] = useState<DebtorRecord | null>(null);
  const [paymentFor, setPaymentFor] = useState<DebtorRecord | null>(null);
  const [isQuickPayOpen, setIsQuickPayOpen] = useState(false);
  const [quickPayId, setQuickPayId] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [paymentMode, setPaymentMode] = useState('Bank transfer');
  const [destinationBank, setDestinationBank] = useState<'Office BOB' | 'Office IDFC' | 'Shameer HDFC'>('Office BOB');
  const [paymentRef, setPaymentRef] = useState('');
  const [billingFor, setBillingFor] = useState<DebtorRecord | null>(null);
  const [billingService, setBillingService] = useState('GST filing');
  const [invoiceFor, setInvoiceFor] = useState<DebtorRecord | null>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);

  // Add Account
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('custom');
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('+91 ');
  const [newEntityType, setNewEntityType] = useState<EntityType | ''>('Private Limited');
  const [newAssignedStaff, setNewAssignedStaff] = useState('');
  const [newOpeningBalance, setNewOpeningBalance] = useState('');
  const [addAccountError, setAddAccountError] = useState<string | null>(null);

  // Import
  const fileRef = useRef<HTMLInputElement>(null);
  const [importPreview, setImportPreview] = useState<DebtorWorkbookResult | null>(null);
  const [importFileName, setImportFileName] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  // Keep the selected tab valid when data changes (e.g. after an import).
  const activeView = view === 'all' || view === 'register' || months.includes(view) ? view : latestMonth || 'register';
  const isMonthView = activeView !== 'all' && activeView !== 'register';

  const staffName = selectedStaffId ? staffList.find((s) => s.id === selectedStaffId)?.name : null;

  const uniqueStaff = useMemo(() => {
    const set = new Set<string>();
    staffList.forEach((s) => {
      if (s.name) set.add(s.name);
    });
    debtors.forEach((d) => {
      if (d.assignedStaff) set.add(d.assignedStaff);
    });
    return Array.from(set).sort();
  }, [staffList, debtors]);

  const uniqueEntityTypes = useMemo(() => {
    const set = new Set<string>();
    debtors.forEach((d) => {
      if (d.entityType) set.add(d.entityType);
    });
    return Array.from(set).sort();
  }, [debtors]);

  const uniqueBillingUsers = useMemo(() => {
    const set = new Set<string>();
    billings.forEach((b) => {
      if (b.user) set.add(b.user);
    });
    return Array.from(set).sort();
  }, [billings]);

  const filteredDebtors = debtors.filter((d) => {
    // 1. Staff Filter
    const effectiveStaff = staffFilter !== 'all' ? staffFilter : staffName;
    if (effectiveStaff && d.assignedStaff && d.assignedStaff !== effectiveStaff) return false;

    // 2. Balance Filter (Owing vs Settled)
    if (balanceFilter !== 'all') {
      const balance = isMonthView
        ? (monthOf(d, activeView) ? closingOf(monthOf(d, activeView)!) : 0)
        : d.currentBalance;
      if (balanceFilter === 'due' && balance <= 0) return false;
      if (balanceFilter === 'cleared' && balance > 0) return false;
    }

    // 3. Aging Bucket Filter
    if (agingFilter !== 'all') {
      if (d.agingBucket !== agingFilter) return false;
    }

    // 4. Entity Type Filter
    if (entityTypeFilter !== 'all') {
      if (d.entityType !== entityTypeFilter) return false;
    }

    // 5. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return [d.clientName, d.assignedStaff, d.phone, d.entityType, d.agingBucket, d.status].some((v) =>
        (v || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const periods = useMemo(() => Array.from(new Set(billings.map((b) => b.period).filter(Boolean) as string[])).sort().reverse(), [billings]);
  const filteredBillings = billings.filter((b) => {
    if (registerPeriod !== 'all' && b.period !== registerPeriod) return false;
    if (registerStatusFilter !== 'all') {
      const status = b.billingStatus || 'Billed';
      if (status !== registerStatusFilter) return false;
    }
    if (registerStaffFilter !== 'all' && b.user !== registerStaffFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return [b.clientName, b.natureOfService, b.user, b.invoiceNumber, b.billingStatus].some((v) =>
        (v || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const monthTotals = isMonthView
    ? filteredDebtors.reduce(
        (acc, d) => {
          const m = monthOf(d, activeView);
          if (!m) return acc;
          const closing = closingOf(m);
          return {
            opening: acc.opening + m.opening,
            received: acc.received + m.received,
            billed: acc.billed + m.billed,
            closing: acc.closing + closing,
            outstanding: acc.outstanding + (closing > 0 ? 1 : 0),
          };
        },
        { opening: 0, received: 0, billed: 0, closing: 0, outstanding: 0 }
      )
    : null;

  const totalOutstanding = filteredDebtors.reduce((a, d) => a + d.currentBalance, 0);
  const totalFees = filteredBillings.reduce((a, b) => a + (b.professionalIncome || 0), 0);
  const totalOOP = filteredBillings.reduce((a, b) => a + (b.oopExpenses || 0), 0);

  const sortedDebtors = useMemo(() => {
    if (!debtorSortField) return filteredDebtors;

    return [...filteredDebtors].sort((a, b) => {
      let cmp = 0;
      if (debtorSortField === 'sNo') {
        cmp = (a.sNo || 0) - (b.sNo || 0);
      } else if (debtorSortField === 'client') {
        cmp = a.clientName.localeCompare(b.clientName, undefined, { sensitivity: 'base' });
      } else if (debtorSortField === 'balance') {
        cmp = (a.currentBalance || 0) - (b.currentBalance || 0);
      } else if (debtorSortField === 'status') {
        cmp = (a.status || '').localeCompare(b.status || '');
      } else if (debtorSortField === 'opening') {
        const aVal = isMonthView ? (monthOf(a, activeView)?.opening || 0) : (a.months[0]?.opening || 0);
        const bVal = isMonthView ? (monthOf(b, activeView)?.opening || 0) : (b.months[0]?.opening || 0);
        cmp = aVal - bVal;
      } else if (debtorSortField === 'received') {
        const aVal = monthOf(a, activeView)?.received || 0;
        const bVal = monthOf(b, activeView)?.received || 0;
        cmp = aVal - bVal;
      } else if (debtorSortField === 'billed') {
        const aVal = monthOf(a, activeView)?.billed || 0;
        const bVal = monthOf(b, activeView)?.billed || 0;
        cmp = aVal - bVal;
      } else if (debtorSortField === 'closing') {
        const aMonth = monthOf(a, activeView);
        const bMonth = monthOf(b, activeView);
        const aVal = aMonth ? closingOf(aMonth) : 0;
        const bVal = bMonth ? closingOf(bMonth) : 0;
        cmp = aVal - bVal;
      }
      return debtorSortDir === 'asc' ? cmp : -cmp;
    });
  }, [filteredDebtors, debtorSortField, debtorSortDir, isMonthView, activeView]);

  const sortedBillings = useMemo(() => {
    return [...filteredBillings].sort((a, b) => {
      let cmp = 0;
      if (billingSortField === 'serialNo') {
        cmp = (a.serialNo || 0) - (b.serialNo || 0);
      } else if (billingSortField === 'date') {
        const aTime = a.date ? new Date(a.date).getTime() : 0;
        const bTime = b.date ? new Date(b.date).getTime() : 0;
        cmp = aTime - bTime;
      } else if (billingSortField === 'client') {
        cmp = a.clientName.localeCompare(b.clientName, undefined, { sensitivity: 'base' });
      } else if (billingSortField === 'service') {
        cmp = (a.natureOfService || '').localeCompare(b.natureOfService || '');
      } else if (billingSortField === 'fee') {
        cmp = (a.professionalIncome || 0) - (b.professionalIncome || 0);
      } else if (billingSortField === 'oop') {
        cmp = (a.oopExpenses || 0) - (b.oopExpenses || 0);
      } else if (billingSortField === 'invoice') {
        cmp = (a.invoiceNumber || '').localeCompare(b.invoiceNumber || '');
      } else if (billingSortField === 'status') {
        cmp = (a.billingStatus || '').localeCompare(b.billingStatus || '');
      } else if (billingSortField === 'user') {
        cmp = (a.user || '').localeCompare(b.user || '');
      }
      return billingSortDir === 'asc' ? cmp : -cmp;
    });
  }, [filteredBillings, billingSortField, billingSortDir]);

  // ----------------------------------------------------------- actions
  const openPayment = (d: DebtorRecord) => {
    setPaymentFor(d);
    setAmountInput(d.currentBalance > 0 ? String(d.currentBalance) : '');
    setPaymentRef('');
  };

  const submitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const target = paymentFor || debtors.find((d) => d.id === quickPayId);
    const amount = parseFloat(amountInput);
    if (!target || !(amount > 0)) return;
    onRecordPayment(
      target.id,
      amount,
      paymentMode,
      paymentRef.trim() || undefined,
      paymentMode !== 'Cash' ? destinationBank : undefined
    );
    setPaymentFor(null);
    setIsQuickPayOpen(false);
    setAmountInput('');
    setPaymentRef('');
  };

  const submitBilling = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(amountInput);
    if (!billingFor || !(amount > 0) || !onAddBilling) return;
    onAddBilling(billingFor.id, amount, billingService.trim() || 'Professional fees');
    setBillingFor(null);
    setAmountInput('');
  };

  const submitAddAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newClientName.trim();
    if (!name || !onAddAccount) return;

    const openingAmt = Number(newOpeningBalance) || 0;
    // One month entry carrying the opening balance. Earlier months are simply absent
    // (shown as —), so recalculation never resets the balance to zero.
    const startMonth = latestMonth || currentMonthKey();
    const debtorMonths: DebtorMonth[] = [{ month: startMonth, opening: openingAmt, received: 0, billed: 0 }];

    const newRecord: DebtorRecord = recalcDebtor({
      sNo: debtors.reduce((max, d) => Math.max(max, d.sNo), 0) + 1,
      id: `deb-${Date.now()}`,
      clientName: name,
      phone: newClientPhone.trim() === '+91' ? '' : newClientPhone.trim(),
      entityType: newEntityType,
      assignedStaff: newAssignedStaff,
      currentBalance: openingAmt,
      status: 'Pending',
      agingBucket: '0-30 Days',
      months: debtorMonths,
    });

    if (debtors.some((d) => d.clientName.trim().toLowerCase() === name.toLowerCase())) {
      setAddAccountError(`${name} already has a fee account.`);
      return;
    }

    onAddAccount(newRecord);
    setIsAddAccountOpen(false);
    setNewClientName('');
    setNewClientPhone('+91 ');
    setNewOpeningBalance('');
    setSelectedClientId('custom');
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setImportError(null);
    setImportFileName(file.name);
    try {
      const result = await parseDebtorWorkbookFile(file);
      if (result.records.length === 0) {
        setImportError(result.warnings[0] || 'No debtor accounts were found in this file.');
        setImportPreview(null);
      } else {
        setImportPreview(result);
      }
    } catch (err: any) {
      setImportError(`Could not read the file: ${err?.message || err}`);
      setImportPreview(null);
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const confirmImport = async () => {
    if (!importPreview) return;
    setImporting(true);
    const res = await onImport(importPreview);
    setImporting(false);
    if (res.error) return setImportError(res.error);
    setImportPreview(null);
    setImportFileName('');
    setView(importPreview.months[importPreview.months.length - 1] || 'all');
  };

  // ----------------------------------------------------------- render
  const hasData = debtors.length > 0;

  return (
    <div className="space-y-4">
      <PageHeader
        section="debtors" title="Debtors"
        description={latestMonth ? `Fees owed by clients, month by month · up to ${monthLabel(latestMonth)}` : 'Fees owed by clients, month by month'}
        actions={
          <>
            {canEdit && onAddAccount && (
              <Button icon={Plus} onClick={() => { setAddAccountError(null); setIsAddAccountOpen(true); }}>
                Add Account
              </Button>
            )}
            {hasData && (
              <Button icon={Download} onClick={() => exportDebtorsAndGSTWorkbook(debtors, billings, gstCompliance)}>
                Export
              </Button>
            )}
            {canEdit && hasData && (
              <>
                <Button
                  variant="secondary"
                  icon={ReceiptText}
                  onClick={() => {
                    const defaultTarget = debtors.find((d) => d.currentBalance > 0) || debtors[0] || null;
                    setInvoiceFor(defaultTarget);
                    setIsInvoiceOpen(true);
                  }}
                >
                  Create Invoice
                </Button>
                <Button
                  variant="primary"
                  icon={Plus}
                  onClick={() => {
                    setQuickPayId(debtors.find((d) => d.currentBalance > 0)?.id || debtors[0]?.id || '');
                    setAmountInput('');
                    setIsQuickPayOpen(true);
                  }}
                >
                  Record Payment
                </Button>
              </>
            )}
          </>
        }
      />

      {importError && !importPreview && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg border border-danger/25 text-sm text-danger">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" strokeWidth={1.75} />
          {importError}
        </div>
      )}

      {!hasData ? (
        <div className="bg-surface border border-line rounded-lg">
          <EmptyState
            icon={FileSpreadsheet}
            title="No fee accounts yet"
            description={
              canImport
                ? 'Import the office debtors workbook (.xlsx). The Debtors sheet and the monthly billing sheets are read automatically.'
                : 'An administrator needs to import the debtors workbook.'
            }
            action={
              canImport && (
                <Button variant="primary" icon={Upload} onClick={() => fileRef.current?.click()}>
                  Import Excel
                </Button>
              )
            }
          />
        </div>
      ) : (
        <>
          <Tabs
            value={activeView}
            onChange={setView}
            options={[
              ...[...months].reverse().map((m) => ({ value: m, label: monthLabel(m, true) })),
              { value: 'all', label: 'All months' },
              { value: 'register', label: 'Billing register', count: billings.length },
            ]}
          />

          {monthTotals && (
            <MetricGrid className="grid-cols-2 lg:grid-cols-4">
              <Metric label="Opening balance" value={signedINR(monthTotals.opening)} hint={`Brought forward into ${monthLabel(activeView)}`} />
              <Metric label="Received" value={formatINR(monthTotals.received)} hint="Payments this month" />
              <Metric label="Billed" value={formatINR(monthTotals.billed)} hint="Fees invoiced this month" />
              <Metric
                label="Closing balance"
                value={signedINR(monthTotals.closing)}
                tone={monthTotals.closing > 0 ? 'danger' : undefined}
                hint={`${monthTotals.outstanding} ${monthTotals.outstanding === 1 ? 'client owes' : 'clients owe'} fees`}
              />
            </MetricGrid>
          )}

          <TableCard
            toolbar={
              <div className="space-y-2.5 px-3 py-2.5 border-b border-line">
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
                  <SearchInput
                    placeholder={activeView === 'register' ? 'Search client, service, invoice or staff…' : 'Search clients, phone, staff…'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    wrapperClassName="w-full lg:w-64"
                    className="h-8 text-xs"
                  />

                  {/* Filter Controls */}
                  <div className="flex flex-wrap items-center gap-2">
                    {activeView !== 'register' && (
                      <>
                        <Segmented
                          size="sm"
                          value={balanceFilter}
                          onChange={setBalanceFilter}
                          options={[
                            { value: 'all', label: 'All' },
                            { value: 'due', label: 'Owing' },
                            { value: 'cleared', label: 'Settled' },
                          ]}
                        />

                        <Select
                          value={agingFilter}
                          onChange={(e) => setAgingFilter(e.target.value)}
                          className="h-8 text-xs w-auto min-w-[105px]"
                        >
                          <option value="all">All aging</option>
                          <option value="Current">Current (&lt; 30d)</option>
                          <option value="1-30 Days">1–30 Days</option>
                          <option value="31-60 Days">31–60 Days</option>
                          <option value="61-90 Days">61–90 Days</option>
                          <option value="90+ Days">90+ Days (Critical)</option>
                        </Select>

                        <Select
                          value={staffFilter}
                          onChange={(e) => setStaffFilter(e.target.value)}
                          className="h-8 text-xs w-auto min-w-[105px]"
                        >
                          <option value="all">All Staff</option>
                          {uniqueStaff.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </Select>

                        {uniqueEntityTypes.length > 0 && (
                          <Select
                            value={entityTypeFilter}
                            onChange={(e) => setEntityTypeFilter(e.target.value)}
                            className="h-8 text-xs w-auto min-w-[105px]"
                          >
                            <option value="all">All entities</option>
                            {uniqueEntityTypes.map((et) => (
                              <option key={et} value={et}>
                                {et}
                              </option>
                            ))}
                          </Select>
                        )}
                      </>
                    )}

                    {activeView === 'register' && (
                      <>
                        <Select
                          value={registerPeriod}
                          onChange={(e) => setRegisterPeriod(e.target.value)}
                          className="h-8 text-xs w-auto min-w-[110px]"
                        >
                          <option value="all">All months</option>
                          {periods.map((p) => (
                            <option key={p} value={p}>
                              {monthLabel(p)}
                            </option>
                          ))}
                        </Select>

                        <Select
                          value={registerStatusFilter}
                          onChange={(e) => setRegisterStatusFilter(e.target.value)}
                          className="h-8 text-xs w-auto min-w-[110px]"
                        >
                          <option value="all">All statuses</option>
                          <option value="Billed">Billed</option>
                          <option value="Received">Received</option>
                          <option value="Pending">Pending</option>
                        </Select>

                        <Select
                          value={registerStaffFilter}
                          onChange={(e) => setRegisterStaffFilter(e.target.value)}
                          className="h-8 text-xs w-auto min-w-[110px]"
                        >
                          <option value="all">All Staff</option>
                          {uniqueBillingUsers.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </Select>
                      </>
                    )}

                    {(balanceFilter !== 'all' ||
                      agingFilter !== 'all' ||
                      staffFilter !== 'all' ||
                      entityTypeFilter !== 'all' ||
                      registerPeriod !== 'all' ||
                      registerStatusFilter !== 'all' ||
                      registerStaffFilter !== 'all' ||
                      debtorSortField !== null ||
                      billingSortField !== 'date' ||
                      billingSortDir !== 'desc' ||
                      searchQuery.trim()) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setBalanceFilter('all');
                          setAgingFilter('all');
                          setStaffFilter('all');
                          setEntityTypeFilter('all');
                          setRegisterPeriod('all');
                          setRegisterStatusFilter('all');
                          setRegisterStaffFilter('all');
                          setDebtorSortField(null);
                          setDebtorSortDir('asc');
                          setBillingSortField('date');
                          setBillingSortDir('desc');
                          setSearchQuery('');
                        }}
                        className="h-8 text-xs text-fg-subtle hover:text-fg"
                      >
                        Reset
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            }
            footer={
              <div className="flex items-center justify-between px-3 h-11 border-t border-line text-xs text-fg-subtle num">
                {activeView === 'register' ? (
                  <>
                    <span>{filteredBillings.length} entries</span>
                    <span>
                      Fees <span className="text-fg font-medium">{formatINR(totalFees)}</span>
                      <span className="mx-2 text-fg-faint">·</span>
                      Out-of-pocket <span className="text-fg font-medium">{formatINR(totalOOP)}</span>
                    </span>
                  </>
                ) : (
                  <>
                    <span>{filteredDebtors.length} accounts</span>
                    <span>
                      Outstanding today <span className="text-fg font-medium">{signedINR(totalOutstanding)}</span>
                    </span>
                  </>
                )}
              </div>
            }
          >
            {isMonthView && (
              <table className="data-table">
                <thead>
                  <tr>
                    <SortHeader field="sNo" label="#" align="right" currentField={debtorSortField} currentDir={debtorSortDir} onSort={handleDebtorSort} className="w-10" />
                    <SortHeader field="client" label="Client" align="left" currentField={debtorSortField} currentDir={debtorSortDir} onSort={handleDebtorSort} className="min-w-[220px]" />
                    <SortHeader field="opening" label="Opening" align="right" currentField={debtorSortField} currentDir={debtorSortDir} onSort={handleDebtorSort} />
                    <SortHeader field="received" label="Received" align="right" currentField={debtorSortField} currentDir={debtorSortDir} onSort={handleDebtorSort} />
                    <SortHeader field="billed" label="Billed" align="right" currentField={debtorSortField} currentDir={debtorSortDir} onSort={handleDebtorSort} />
                    <SortHeader field="closing" label="Closing" align="right" currentField={debtorSortField} currentDir={debtorSortDir} onSort={handleDebtorSort} />
                    <SortHeader field="status" label="Status" align="left" currentField={debtorSortField} currentDir={debtorSortDir} onSort={handleDebtorSort} />
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedDebtors.length === 0 && (
                    <tr>
                      <td colSpan={8} className="!h-auto">
                        <EmptyState title="No accounts match these filters" />
                      </td>
                    </tr>
                  )}
                  {sortedDebtors.map((d) => {
                    const m = monthOf(d, activeView) || { month: activeView, opening: 0, received: 0, billed: 0 };
                    const closing = closingOf(m);
                    const isLatest = activeView === latestMonth;
                    const status = isLatest ? d.status : monthStatus(m.opening, m.received, m.billed);
                    return (
                      <tr key={d.id}>
                        <td className="num text-right text-fg-faint text-xs">{d.sNo}</td>
                        <td className="py-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Avatar initials={nameInitials(d.clientName)} seed={d.clientName} size="md" className="rounded-lg" />
                            <div className="min-w-0">
                              <button onClick={() => setStatementFor(d)} className="block max-w-xs truncate text-left font-medium text-fg hover:underline underline-offset-2">
                                {d.clientName}
                              </button>
                              {(d.assignedStaff || d.entityType) && (
                                <div className="text-xs text-fg-subtle mt-0.5">{[d.entityType, d.assignedStaff].filter(Boolean).join(' · ')}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="num text-right text-fg-muted whitespace-nowrap">{signedINR(m.opening)}</td>
                        <td className="num text-right text-fg whitespace-nowrap">{amt(m.received)}</td>
                        <td className="num text-right text-fg whitespace-nowrap">{amt(m.billed)}</td>
                        <td className={cn('num text-right font-medium whitespace-nowrap', closing < 0 ? 'text-success' : 'text-fg')}>{signedINR(closing)}</td>
                        <td>
                          <Badge tone={statusTone[status]} dot>
                            {status === 'Advance' ? 'Paid in advance' : status}
                          </Badge>
                          {isLatest && closing > 0 && <div className="text-2xs text-fg-subtle mt-1">{d.agingBucket}</div>}
                        </td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {closing > 0 && (
                              <Button
                                size="sm"
                                variant="secondary"
                                icon={MessageSquare}
                                onClick={() => onOpenWhatsApp(d)}
                                className="h-7 text-xs font-medium"
                              >
                                WhatsApp
                              </Button>
                            )}
                            {canEdit && isLatest && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setInvoiceFor(d);
                                    setIsInvoiceOpen(true);
                                  }}
                                >
                                  Bill
                                </Button>
                                <Button size="sm" variant="primary" onClick={() => openPayment(d)}>
                                  Receive
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {activeView === 'all' && (
              <table className="data-table text-xs num [&_td]:!h-10 [&_td]:!px-2.5 [&_th]:!px-2.5">
                <thead>
                  <tr>
                    <SortHeader field="sNo" label="#" align="right" currentField={debtorSortField} currentDir={debtorSortDir} onSort={handleDebtorSort} rowSpan={2} className="w-8 align-bottom" />
                    <SortHeader field="client" label="Client" align="left" currentField={debtorSortField} currentDir={debtorSortDir} onSort={handleDebtorSort} rowSpan={2} className="min-w-[180px] align-bottom" />
                    <SortHeader field="opening" label="Opening" align="right" currentField={debtorSortField} currentDir={debtorSortDir} onSort={handleDebtorSort} rowSpan={2} className="align-bottom" />
                    {months.map((m) => (
                      <th key={m} colSpan={2} className="text-center !border-l !border-line">
                        {monthLabel(m, true)}
                      </th>
                    ))}
                    <SortHeader field="balance" label="Balance" align="right" currentField={debtorSortField} currentDir={debtorSortDir} onSort={handleDebtorSort} rowSpan={2} className="align-bottom !border-l !border-line" />
                  </tr>
                  <tr>
                    {months.map((m) => (
                      <React.Fragment key={m}>
                        <th className="text-right !border-l !border-line">Recd</th>
                        <th className="text-right">Billed</th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedDebtors.map((d) => (
                    <tr key={d.id} className="cursor-pointer" onClick={() => setStatementFor(d)}>
                      <td className="text-right text-fg-faint">{d.sNo}</td>
                      <td className="font-medium text-fg text-sm truncate max-w-[220px]">{d.clientName}</td>
                      <td className="text-right text-fg-muted">{amt(d.months[0]?.opening)}</td>
                      {months.map((key) => {
                        const m = monthOf(d, key);
                        return (
                          <React.Fragment key={key}>
                            <td className="text-right border-l border-line">{amt(m?.received)}</td>
                            <td className="text-right text-fg-muted">{amt(m?.billed)}</td>
                          </React.Fragment>
                        );
                      })}
                      <td className={cn('text-right font-semibold border-l border-line', d.currentBalance < 0 ? 'text-success' : 'text-fg')}>{signedINR(d.currentBalance)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-subtle font-medium [&_td]:h-10 [&_td]:px-2.5 [&_td]:border-t [&_td]:border-line">
                    <td />
                    <td className="text-fg">Total</td>
                    <td className="text-right text-fg-muted">{formatINR(filteredDebtors.reduce((a, d) => a + (d.months[0]?.opening || 0), 0))}</td>
                    {months.map((key) => (
                      <React.Fragment key={key}>
                        <td className="text-right border-l border-line">{formatINR(filteredDebtors.reduce((a, d) => a + (monthOf(d, key)?.received || 0), 0))}</td>
                        <td className="text-right text-fg-muted">{formatINR(filteredDebtors.reduce((a, d) => a + (monthOf(d, key)?.billed || 0), 0))}</td>
                      </React.Fragment>
                    ))}
                    <td className="text-right font-semibold text-fg border-l border-line">{signedINR(totalOutstanding)}</td>
                  </tr>
                </tfoot>
              </table>
            )}

            {activeView === 'register' && (
              <table className="data-table">
                <thead>
                  <tr>
                    <SortHeader field="serialNo" label="#" align="right" currentField={billingSortField} currentDir={billingSortDir} onSort={handleBillingSort} className="w-10" />
                    <SortHeader field="date" label="Date" align="left" currentField={billingSortField} currentDir={billingSortDir} onSort={handleBillingSort} />
                    <SortHeader field="client" label="Client" align="left" currentField={billingSortField} currentDir={billingSortDir} onSort={handleBillingSort} />
                    <SortHeader field="service" label="Service" align="left" currentField={billingSortField} currentDir={billingSortDir} onSort={handleBillingSort} />
                    <th>For</th>
                    <SortHeader field="fee" label="Fee" align="right" currentField={billingSortField} currentDir={billingSortDir} onSort={handleBillingSort} />
                    <SortHeader field="oop" label="OOP" align="right" currentField={billingSortField} currentDir={billingSortDir} onSort={handleBillingSort} />
                    <SortHeader field="invoice" label="Invoice" align="left" currentField={billingSortField} currentDir={billingSortDir} onSort={handleBillingSort} />
                    <SortHeader field="status" label="Status" align="left" currentField={billingSortField} currentDir={billingSortDir} onSort={handleBillingSort} />
                    <SortHeader field="user" label="Staff" align="left" currentField={billingSortField} currentDir={billingSortDir} onSort={handleBillingSort} />
                  </tr>
                </thead>
                <tbody>
                  {sortedBillings.length === 0 && (
                    <tr>
                      <td colSpan={10} className="!h-auto">
                        <EmptyState title="No billing entries found" />
                      </td>
                    </tr>
                  )}
                  {sortedBillings.map((b, i) => (
                    <tr key={b.id || `${b.period}-${b.serialNo}-${i}`}>
                      <td className="num text-right text-fg-faint text-xs">{b.serialNo}</td>
                      <td className="num text-fg-muted whitespace-nowrap">{b.date ? formatDate(b.date) : <span className="text-fg-faint">—</span>}</td>
                      <td className="font-medium text-fg">{b.clientName}</td>
                      <td className="text-fg-muted">{b.natureOfService || '—'}</td>
                      <td className="text-fg-muted whitespace-nowrap">{b.filingMonth || (b.period ? monthLabel(b.period, true) : '—')}</td>
                      <td className="num text-right text-fg whitespace-nowrap">{amt(b.professionalIncome)}</td>
                      <td className="num text-right text-fg-muted whitespace-nowrap">{amt(b.oopExpenses)}</td>
                      <td className="ident text-fg-muted">{b.invoiceNumber || <span className="text-fg-faint">—</span>}</td>
                      <td>
                        {b.billingStatus ? (
                          <Badge tone={b.billingStatus === 'Pending' ? 'warning' : b.billingStatus === 'Received' ? 'success' : 'neutral'} dot>
                            {b.billingStatus}
                          </Badge>
                        ) : (
                          <span className="text-fg-faint">—</span>
                        )}
                      </td>
                      <td className="text-fg-muted">{b.user || <span className="text-fg-faint">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </TableCard>
        </>
      )}

      {/* Client statement */}
      <Modal
        isOpen={!!statementFor}
        onClose={() => setStatementFor(null)}
        size="md"
        title={statementFor?.clientName}
        description={statementFor ? [statementFor.entityType, statementFor.assignedStaff && `Follow-up: ${statementFor.assignedStaff}`].filter(Boolean).join(' · ') || 'Fee statement' : undefined}
        footer={
          statementFor && (
            <>
              <Button variant="ghost" icon={MessageSquare} onClick={() => onOpenWhatsApp(statementFor)} className="mr-auto">
                WhatsApp
              </Button>
              {onDelete && (
                <Button
                  variant="ghost"
                  className="text-danger hover:text-danger"
                  onClick={() => {
                    const target = statementFor;
                    setStatementFor(null);
                    setConfirmDelete(target);
                  }}
                >
                  Delete Account
                </Button>
              )}
              <Button variant="ghost" onClick={() => setStatementFor(null)}>
                Close
              </Button>
              {canEdit && (
                <Button
                  variant="primary"
                  onClick={() => {
                    const target = statementFor;
                    setStatementFor(null);
                    openPayment(target);
                  }}
                >
                  Record Payment
                </Button>
              )}
            </>
          )
        }
      >
        {statementFor && (
          <div className="space-y-5">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-xs font-medium text-fg-subtle">Balance today</div>
                <div className={cn('num text-2xl font-semibold mt-1', statementFor.currentBalance < 0 ? 'text-success' : 'text-fg')}>{signedINR(statementFor.currentBalance)}</div>
              </div>
              <Badge tone={statusTone[statementFor.status]} dot>
                {statementFor.status === 'Advance' ? 'Paid in advance' : statementFor.currentBalance > 0 ? `${statementFor.status} · ${statementFor.agingBucket}` : statementFor.status}
              </Badge>
            </div>
            <div className="border border-line rounded-lg overflow-hidden">
              <table className="data-table num">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th className="text-right">Opening</th>
                    <th className="text-right">Received</th>
                    <th className="text-right">Billed</th>
                    <th className="text-right">Closing</th>
                  </tr>
                </thead>
                <tbody>
                  {statementFor.months.map((m, i) => (
                    <tr key={m.month} className={cn(i === statementFor.months.length - 1 && 'bg-subtle font-medium')}>
                      <td className="text-fg">{monthLabel(m.month)}</td>
                      <td className="text-right text-fg-muted">{signedINR(m.opening)}</td>
                      <td className="text-right">{amt(m.received)}</td>
                      <td className="text-right text-fg-muted">{amt(m.billed)}</td>
                      <td className="text-right text-fg">{signedINR(closingOf(m))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {billings.some((b) => b.clientName.toLowerCase() === statementFor.clientName.toLowerCase()) && (
              <div>
                <div className="text-xs font-medium text-fg-subtle mb-2">Billing entries</div>
                <div className="border border-line rounded-lg divide-y divide-line">
                  {billings
                    .filter((b) => b.clientName.toLowerCase() === statementFor.clientName.toLowerCase())
                    .slice(0, 8)
                    .map((b, i) => (
                      <div key={b.id || i} className="flex items-center justify-between gap-3 px-3 h-10 text-sm">
                        <span className="text-fg truncate">{b.natureOfService || 'Fees'}</span>
                        <span className="text-xs text-fg-subtle">{b.period ? monthLabel(b.period, true) : ''}</span>
                        <span className="num text-fg">{amt(b.professionalIncome)}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Payment (from a row or the header) */}
      <Modal
        isOpen={!!paymentFor || isQuickPayOpen}
        onClose={() => {
          setPaymentFor(null);
          setIsQuickPayOpen(false);
        }}
        size="sm"
        title="Record Client Payment"
        description={latestMonth ? `Credited to ${monthLabel(latestMonth)}` : undefined}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setPaymentFor(null);
                setIsQuickPayOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="debtor-payment-form">
              Save Payment
            </Button>
          </>
        }
      >
        <form id="debtor-payment-form" onSubmit={submitPayment} className="space-y-4">
          {paymentFor ? (
            <div className="flex items-center justify-between h-10 px-3 rounded-md border border-line bg-subtle text-sm">
              <span className="text-fg truncate">{paymentFor.clientName}</span>
              <span className="num font-medium text-fg">{signedINR(paymentFor.currentBalance)} due</span>
            </div>
          ) : (
            <Field label="Client">
              <Select
                value={quickPayId}
                onChange={(e) => {
                  setQuickPayId(e.target.value);
                  const d = debtors.find((x) => x.id === e.target.value);
                  setAmountInput(d && d.currentBalance > 0 ? String(d.currentBalance) : '');
                }}
              >
                {debtors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.clientName} — {signedINR(d.currentBalance)}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <Field label="Amount received (₹)" required>
            <Input type="number" step="any" min="1" required autoFocus value={amountInput} onChange={(e) => setAmountInput(e.target.value)} className="num" />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Mode">
              <Select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
                <option value="Bank transfer">Bank transfer</option>
                <option value="UPI">UPI</option>
                <option value="Cheque">Cheque</option>
                <option value="Cash">Cash</option>
              </Select>
            </Field>
            {paymentMode !== 'Cash' ? (
              <Field label="Landed in Bank" required>
                <Select value={destinationBank} onChange={(e) => setDestinationBank(e.target.value as any)}>
                  <option value="Office BOB">Office BOB</option>
                  <option value="Office IDFC">Office IDFC</option>
                  <option value="Shameer HDFC">Shameer HDFC</option>
                </Select>
              </Field>
            ) : null}
            <Field label="Reference" className={paymentMode === 'Cash' ? 'sm:col-span-1' : 'sm:col-span-2'}>
              <Input placeholder={paymentMode === 'Cash' ? 'Receipt / note' : 'UTR / Transaction / Cheque no.'} value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} />
            </Field>
          </div>
        </form>
      </Modal>

      {/* Bill */}
      <Modal
        isOpen={!!billingFor}
        onClose={() => setBillingFor(null)}
        size="sm"
        title="Bill client"
        description={billingFor && latestMonth ? `${billingFor.clientName} · added to ${monthLabel(latestMonth)}` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setBillingFor(null)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="debtor-billing-form">
              Create Invoice
            </Button>
          </>
        }
      >
        <form id="debtor-billing-form" onSubmit={submitBilling} className="space-y-4">
          <Field label="Amount (₹)" required>
            <Input type="number" step="any" min="1" required autoFocus value={amountInput} onChange={(e) => setAmountInput(e.target.value)} className="num" />
          </Field>
          <Field label="Service" required hint="An invoice number is assigned automatically.">
            <Input required list="debtor-services" value={billingService} onChange={(e) => setBillingService(e.target.value)} />
            <datalist id="debtor-services">
              {Array.from(new Set(billings.map((b) => b.natureOfService).filter(Boolean))).map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </Field>
        </form>
      </Modal>

      {/* Full A4 Invoice Generator */}
      <InvoiceGeneratorModal
        isOpen={isInvoiceOpen}
        onClose={() => {
          setIsInvoiceOpen(false);
          setInvoiceFor(null);
        }}
        initialClient={invoiceFor}
        clients={clients}
        debtors={debtors}
        preferences={preferences}
        firmProfile={firmProfile}
        onRecordBilling={async (billingData) => {
          if (billingData.debtorId && onAddBilling) {
            onAddBilling(
              billingData.debtorId,
              billingData.amount,
              billingData.description,
              billingData.oopExpenses,
              billingData.invoiceNumber,
              billingData.oneDriveSynced,
              billingData.oneDriveUrl,
              billingData.lineItems
            );
          }
        }}
      />

      {/* Import preview */}
      <Modal
        isOpen={!!importPreview}
        onClose={() => setImportPreview(null)}
        size="md"
        icon={FileSpreadsheet}
        title="Import debtors workbook"
        description={importFileName}
        footer={
          <>
            <Button variant="ghost" onClick={() => setImportPreview(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={confirmImport} disabled={importing}>
              {importing ? 'Importing…' : 'Import'}
            </Button>
          </>
        }
      >
        {importPreview && (
          <div className="space-y-4">
            {importError && <p className="text-sm text-danger">{importError}</p>}
            <MetricGrid className="grid-cols-2 sm:grid-cols-4 shadow-none">
              <Metric label="Accounts" value={importPreview.records.length} className="py-3" />
              <Metric label="Billing entries" value={importPreview.billings.length} className="py-3" />
              <Metric
                label="Months"
                value={importPreview.months.length}
                hint={importPreview.months.length ? `${monthLabel(importPreview.months[0], true)} – ${monthLabel(importPreview.months[importPreview.months.length - 1], true)}` : undefined}
                className="py-3"
              />
              <Metric label="Outstanding" value={signedINR(importPreview.records.reduce((a, r) => a + r.currentBalance, 0))} className="py-3" />
            </MetricGrid>
            <p className="text-sm text-fg-muted">
              Accounts are matched by client name, so existing accounts are updated and new ones added. Re-importing the same file does not create duplicates.
            </p>
            {importPreview.warnings.length > 0 && (
              <div>
                <div className="text-xs font-medium text-warning mb-1.5">Check {importPreview.warnings.length === 1 ? 'this row' : `these ${importPreview.warnings.length} rows`} in the workbook</div>
                <ul className="text-sm text-fg-muted space-y-1 max-h-40 overflow-y-auto">
                  {importPreview.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Add Account Modal */}
      <Modal
        isOpen={isAddAccountOpen}
        onClose={() => setIsAddAccountOpen(false)}
        size="md"
        title="Add debtor account"
        description="Start a fee account with the amount the client owes today."
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsAddAccountOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="add-debtor-account-form">
              Add Account
            </Button>
          </>
        }
      >
        <form id="add-debtor-account-form" onSubmit={submitAddAccount} className="space-y-4">
          {addAccountError && <p className="text-sm text-danger">{addAccountError}</p>}
          {clients && clients.length > 0 && (
            <Field label="Existing client" hint="Optional — fills in the details below.">
              <Select
                value={selectedClientId}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedClientId(val);
                  if (val !== 'custom') {
                    const found = clients.find((c) => c.id === val);
                    if (found) {
                      setNewClientName(found.name);
                      setNewClientPhone(found.phone || '+91 ');
                      setNewEntityType(found.entityType);
                      const staff = staffList.find((s) => s.id === found.assignedStaffId);
                      if (staff) setNewAssignedStaff(staff.name);
                    }
                  }
                }}
              >
                <option value="custom">Not in the client list</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.entityType})
                  </option>
                ))}
              </Select>
            </Field>
          )}

          <Field label="Client name" required>
            <Input
              required
              autoFocus
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
              placeholder="e.g. Malabar Spices LLP"
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Phone">
              <Input
                value={newClientPhone}
                onChange={(e) => setNewClientPhone(e.target.value)}
                placeholder="+91 98470 12345"
                className="ident"
              />
            </Field>

            <Field label="Entity type">
              <Select
                value={newEntityType}
                onChange={(e) => setNewEntityType(e.target.value as any)}
              >
                <option value="Private Limited">Private Limited</option>
                <option value="Partnership">Partnership</option>
                <option value="LLP">LLP</option>
                <option value="Proprietorship">Proprietorship</option>
                <option value="Individual">Individual</option>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Follow-up by">
              <Select
                value={newAssignedStaff}
                onChange={(e) => setNewAssignedStaff(e.target.value)}
              >
                <option value="">Nobody yet</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name} ({s.role})
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Amount owed today (₹)" hint="Leave blank if nothing is owed yet.">
              <Input
                type="number"
                step="any"
                min="0"
                value={newOpeningBalance}
                onChange={(e) => setNewOpeningBalance(e.target.value)}
                placeholder="0"
                className="num font-mono tabular-nums"
              />
            </Field>
          </div>
        </form>
      </Modal>

      {startError && (
        <div role="alert" className="text-sm text-danger">Could not start the month: {startError}</div>
      )}

      <ConfirmDialog
        isOpen={confirmStart}
        onClose={() => setConfirmStart(false)}
        title={nextMonth ? `Start ${monthLabel(nextMonth)}?` : 'Start next month?'}
        description={
          nextMonth && latestMonth
            ? `Each of the ${debtors.length} accounts gets a ${monthLabel(nextMonth)} column. The ${monthLabel(latestMonth)} closing balance becomes the opening balance, with nothing received or billed yet. ${monthLabel(latestMonth)} stays as it is.`
            : undefined
        }
        confirmLabel={nextMonth ? `Start ${monthLabel(nextMonth, true)}` : 'Start'}
        onConfirm={runStartMonth}
      />

      <ConfirmDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title={`Delete ${confirmDelete?.clientName ?? "account"}?`}
        description="This permanently removes the fee account and its month-by-month history. Billing register entries are kept."
        confirmLabel="Delete Account"
        danger
        onConfirm={() => confirmDelete && onDelete?.(confirmDelete.id)}
      />
    </div>
  );
};
