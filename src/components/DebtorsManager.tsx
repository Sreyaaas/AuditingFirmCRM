import React, { useMemo, useRef, useState } from 'react';
import { Download, MessageSquare, Plus, Upload, FileSpreadsheet, AlertTriangle } from 'lucide-react';
import { DebtorRecord, GSTComplianceItem, OfficeBillingEntry, StaffMember } from '../types/crm';
import { exportDebtorsAndGSTWorkbook } from '../utils/excelExport';
import { closingOf, collectMonths, monthLabel, monthOf } from '../utils/debtors';
import { DebtorWorkbookResult, parseDebtorWorkbookFile } from '../utils/debtorWorkbook';
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  Field,
  IconButton,
  Input,
  Metric,
  MetricGrid,
  Modal,
  PageHeader,
  SearchInput,
  Segmented,
  Select,
  TableCard,
  Tabs,
  Toolbar,
  Tone,
  cn,
  formatDate,
  formatINR,
} from './ui';

interface DebtorsManagerProps {
  debtors: DebtorRecord[];
  billings: OfficeBillingEntry[];
  staffList: StaffMember[];
  selectedStaffId: string | null;
  /** May record payments and bills. */
  canEdit: boolean;
  /** May replace data from an Excel workbook (admins). */
  canImport: boolean;
  gstCompliance: GSTComplianceItem[];
  onOpenWhatsApp: (debtor: DebtorRecord) => void;
  onRecordPayment: (debtorId: string, amountCleared: number) => void;
  onAddBilling?: (debtorId: string, billingAmount: number, description: string) => void;
  onImport: (result: DebtorWorkbookResult) => Promise<{ error?: string }>;
  /** Administrators only: permanently delete a fee account. */
  onDelete?: (debtorId: string) => void;
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

export const DebtorsManager: React.FC<DebtorsManagerProps> = ({
  debtors,
  billings,
  staffList,
  selectedStaffId,
  canEdit,
  canImport,
  gstCompliance,
  onOpenWhatsApp,
  onRecordPayment,
  onAddBilling,
  onImport,
  onDelete,
}) => {
  const [confirmDelete, setConfirmDelete] = useState<DebtorRecord | null>(null);
  const months = useMemo(() => collectMonths(debtors), [debtors]);
  const latestMonth = months[months.length - 1];
  const [view, setView] = useState<View>(latestMonth || 'register');
  const [searchQuery, setSearchQuery] = useState('');
  const [balanceFilter, setBalanceFilter] = useState<'all' | 'due' | 'cleared'>('all');
  const [registerPeriod, setRegisterPeriod] = useState<string>('all');

  const [statementFor, setStatementFor] = useState<DebtorRecord | null>(null);
  const [paymentFor, setPaymentFor] = useState<DebtorRecord | null>(null);
  const [isQuickPayOpen, setIsQuickPayOpen] = useState(false);
  const [quickPayId, setQuickPayId] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [paymentMode, setPaymentMode] = useState('Bank transfer');
  const [paymentRef, setPaymentRef] = useState('');
  const [billingFor, setBillingFor] = useState<DebtorRecord | null>(null);
  const [billingService, setBillingService] = useState('GST filing');

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

  const filteredDebtors = debtors.filter((d) => {
    if (staffName && d.assignedStaff && d.assignedStaff !== staffName) return false;
    if (isMonthView && balanceFilter !== 'all') {
      const m = monthOf(d, activeView);
      const closing = m ? closingOf(m) : 0;
      if (balanceFilter === 'due' && closing <= 0) return false;
      if (balanceFilter === 'cleared' && closing > 0) return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return [d.clientName, d.assignedStaff, d.phone, d.entityType].some((v) => (v || '').toLowerCase().includes(q));
    }
    return true;
  });

  const periods = useMemo(() => Array.from(new Set(billings.map((b) => b.period).filter(Boolean) as string[])).sort().reverse(), [billings]);
  const filteredBillings = billings.filter((b) => {
    if (registerPeriod !== 'all' && b.period !== registerPeriod) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return [b.clientName, b.natureOfService, b.user, b.invoiceNumber].some((v) => (v || '').toLowerCase().includes(q));
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
    onRecordPayment(target.id, amount);
    setPaymentFor(null);
    setIsQuickPayOpen(false);
    setAmountInput('');
  };

  const submitBilling = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(amountInput);
    if (!billingFor || !(amount > 0) || !onAddBilling) return;
    onAddBilling(billingFor.id, amount, billingService.trim() || 'Professional fees');
    setBillingFor(null);
    setAmountInput('');
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
        title="Debtors"
        description={latestMonth ? `Fees owed by clients, month by month · up to ${monthLabel(latestMonth)}` : 'Fees owed by clients, month by month'}
        actions={
          <>
            {canImport && (
              <>
                <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
                <Button icon={Upload} onClick={() => fileRef.current?.click()}>
                  Import Excel
                </Button>
              </>
            )}
            {hasData && (
              <Button icon={Download} onClick={() => exportDebtorsAndGSTWorkbook(debtors, billings, gstCompliance)}>
                Export
              </Button>
            )}
            {canEdit && hasData && (
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
              <Toolbar className="justify-between">
                <SearchInput
                  placeholder={activeView === 'register' ? 'Client, service, invoice or staff' : 'Client name'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  wrapperClassName="w-full sm:w-64"
                  className="h-7 text-xs"
                />
                {isMonthView && (
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
                )}
                {activeView === 'register' && (
                  <Select value={registerPeriod} onChange={(e) => setRegisterPeriod(e.target.value)} className="h-7 text-xs w-auto">
                    <option value="all">All months</option>
                    {periods.map((p) => (
                      <option key={p} value={p}>
                        {monthLabel(p)}
                      </option>
                    ))}
                  </Select>
                )}
              </Toolbar>
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
                    <th className="w-10 text-right">#</th>
                    <th className="min-w-[220px]">Client</th>
                    <th className="text-right">Opening</th>
                    <th className="text-right">Received</th>
                    <th className="text-right">Billed</th>
                    <th className="text-right">Closing</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDebtors.length === 0 && (
                    <tr>
                      <td colSpan={8} className="!h-auto">
                        <EmptyState title="No accounts match these filters" />
                      </td>
                    </tr>
                  )}
                  {filteredDebtors.map((d) => {
                    const m = monthOf(d, activeView) || { month: activeView, opening: 0, received: 0, billed: 0 };
                    const closing = closingOf(m);
                    const isLatest = activeView === latestMonth;
                    const status = isLatest ? d.status : monthStatus(m.opening, m.received, m.billed);
                    return (
                      <tr key={d.id}>
                        <td className="num text-right text-fg-faint text-xs">{d.sNo}</td>
                        <td className="py-2">
                          <button onClick={() => setStatementFor(d)} className="block max-w-xs truncate text-left font-medium text-fg hover:underline underline-offset-2">
                            {d.clientName}
                          </button>
                          {(d.assignedStaff || d.entityType) && (
                            <div className="text-xs text-fg-subtle mt-0.5">{[d.entityType, d.assignedStaff].filter(Boolean).join(' · ')}</div>
                          )}
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
                            {closing > 0 && <IconButton icon={MessageSquare} label="Send WhatsApp reminder" size="sm" onClick={() => onOpenWhatsApp(d)} />}
                            {canEdit && isLatest && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setBillingFor(d);
                                    setAmountInput('');
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
                    <th rowSpan={2} className="w-8 text-right align-bottom">#</th>
                    <th rowSpan={2} className="min-w-[180px] align-bottom">Client</th>
                    <th rowSpan={2} className="text-right align-bottom">Opening</th>
                    {months.map((m) => (
                      <th key={m} colSpan={2} className="text-center !border-l !border-line">
                        {monthLabel(m, true)}
                      </th>
                    ))}
                    <th rowSpan={2} className="text-right align-bottom !border-l !border-line">Balance</th>
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
                  {filteredDebtors.map((d) => (
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
                    <th className="w-10 text-right">#</th>
                    <th>Date</th>
                    <th>Client</th>
                    <th>Service</th>
                    <th>For</th>
                    <th className="text-right">Fee</th>
                    <th className="text-right">OOP</th>
                    <th>Invoice</th>
                    <th>Status</th>
                    <th>Staff</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBillings.length === 0 && (
                    <tr>
                      <td colSpan={10} className="!h-auto">
                        <EmptyState title="No billing entries found" />
                      </td>
                    </tr>
                  )}
                  {filteredBillings.map((b, i) => (
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
          <div className="grid grid-cols-2 gap-4">
            <Field label="Mode">
              <Select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
                <option>Bank transfer</option>
                <option>UPI</option>
                <option>Cheque</option>
                <option>Cash</option>
              </Select>
            </Field>
            <Field label="Reference">
              <Input placeholder="UTR / cheque no." value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} />
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
