import React, { useState } from 'react';
import { Download, MessageSquare, Plus } from 'lucide-react';
import { DebtorRecord, OfficeBillingEntry, StaffMember, MonthDebtorLedger } from '../types/crm';
import { exportDebtorsAndGSTWorkbook } from '../utils/excelExport';
import { ACTUAL_GST_COMPLIANCE } from '../data/actualClientData';
import { Badge, Button, EmptyState, Field, IconButton, Input, Metric, MetricGrid, Modal, PageHeader, SearchInput, Segmented, Select, TableCard, Tabs, Toolbar, cn, formatINR } from './ui';

type SelectedMonthKey = 'november' | 'october' | 'september' | 'august' | 'full-ledger' | 'billing-log';

interface DebtorsManagerProps {
  debtors: DebtorRecord[];
  billings: OfficeBillingEntry[];
  staffList: StaffMember[];
  selectedStaffId: string | null;
  onOpenWhatsApp: (debtor: DebtorRecord) => void;
  onRecordPayment: (debtorId: string, amountCleared: number) => void;
  onAddBilling?: (debtorId: string, billingAmount: number, description: string) => void;
}

export const DebtorsManager: React.FC<DebtorsManagerProps> = ({
  debtors,
  billings,
  staffList,
  selectedStaffId,
  onOpenWhatsApp,
  onRecordPayment,
  onAddBilling,
}) => {
  const [activeMonth, setActiveMonth] = useState<SelectedMonthKey>('november');
  const [searchQuery, setSearchQuery] = useState('');
  const [staffFilter, setStaffFilter] = useState('all');
  const [balanceFilter, setBalanceFilter] = useState<'all' | 'due' | 'cleared'>('all');

  // Modals & Drawers
  const [paymentModalRecord, setPaymentModalRecord] = useState<DebtorRecord | null>(null);
  const [paymentInput, setPaymentInput] = useState('');
  const [paymentMode, setPaymentMode] = useState('Bank Transfer (NEFT/RTGS)');
  const [paymentNote, setPaymentNote] = useState('');

  const [billingModalRecord, setBillingModalRecord] = useState<DebtorRecord | null>(null);
  const [billingInput, setBillingInput] = useState('');
  const [billingService, setBillingService] = useState('Monthly GST Compliance & Accounting');

  // Inspect Client Drawer
  const [inspectClient, setInspectClient] = useState<DebtorRecord | null>(null);

  // Quick Pay Modal
  const [isQuickPayOpen, setIsQuickPayOpen] = useState(false);
  const [quickPayClientId, setQuickPayClientId] = useState('');

  const activeStaffMember = staffList.find((s) => s.id === selectedStaffId);
  const effectiveStaffFilter = activeStaffMember ? activeStaffMember.name : staffFilter;

  const monthLabels: Record<string, { label: string; period: string }> = {
    november: { label: 'November 2026', period: 'FY 2026-27 (Current)' },
    october: { label: 'October 2026', period: 'FY 2026-27' },
    september: { label: 'September 2026', period: 'FY 2026-27' },
    august: { label: 'August 2026', period: 'FY 2026-27' },
  };

  const getClientMonthData = (client: DebtorRecord, month: SelectedMonthKey) => {
    let ledger: MonthDebtorLedger = { outstanding: 0, paymentCleared: 0, currentBilling: 0 };
    if (month === 'november') ledger = client.november || ledger;
    else if (month === 'october') ledger = client.october || ledger;
    else if (month === 'september') ledger = client.september || ledger;
    else if (month === 'august') ledger = client.august || ledger;

    const opening = ledger.outstanding || 0;
    const paid = ledger.paymentCleared || 0;
    const billed = ledger.currentBilling || 0;
    const closing = Math.max(0, opening - paid + billed);

    let status: 'Cleared' | 'Partially Paid' | 'Unpaid' = 'Unpaid';
    if (closing === 0) status = 'Cleared';
    else if (paid > 0 && closing > 0) status = 'Partially Paid';
    else status = 'Unpaid';

    return { opening, paid, billed, closing, status };
  };

  // Filter debtors
  const filteredDebtors = debtors.filter((item) => {
    if (effectiveStaffFilter !== 'all' && item.assignedStaff !== effectiveStaffFilter) return false;
    
    if (balanceFilter !== 'all' && activeMonth !== 'full-ledger' && activeMonth !== 'billing-log') {
      const { closing } = getClientMonthData(item, activeMonth);
      if (balanceFilter === 'due' && closing <= 0) return false;
      if (balanceFilter === 'cleared' && closing > 0) return false;
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        item.clientName.toLowerCase().includes(q) ||
        item.assignedStaff.toLowerCase().includes(q) ||
        item.phone.toLowerCase().includes(q) ||
        item.entityType.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Filter billings
  const filteredBillings = billings.filter((b) => {
    if (effectiveStaffFilter !== 'all' && b.user !== effectiveStaffFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        b.clientName.toLowerCase().includes(q) ||
        b.natureOfService.toLowerCase().includes(q) ||
        b.user.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Summary figures
  const activeMonthTotals = (() => {
    if (activeMonth === 'full-ledger' || activeMonth === 'billing-log') {
      return { opening: 0, paid: 0, billed: 0, closing: 0, clearedCount: 0, pendingCount: 0 };
    }
    let totalOpening = 0;
    let totalPaid = 0;
    let totalBilled = 0;
    let totalClosing = 0;
    let clearedCount = 0;
    let pendingCount = 0;

    filteredDebtors.forEach((d) => {
      const data = getClientMonthData(d, activeMonth);
      totalOpening += data.opening;
      totalPaid += data.paid;
      totalBilled += data.billed;
      totalClosing += data.closing;
      if (data.closing === 0) clearedCount++;
      else pendingCount++;
    });

    return {
      opening: totalOpening,
      paid: totalPaid,
      billed: totalBilled,
      closing: totalClosing,
      clearedCount,
      pendingCount,
    };
  })();

  const totalAugOut = filteredDebtors.reduce((acc, d) => acc + (d.august?.outstanding || 0), 0);
  const totalAugClr = filteredDebtors.reduce((acc, d) => acc + (d.august?.paymentCleared || 0), 0);
  const totalAugBil = filteredDebtors.reduce((acc, d) => acc + (d.august?.currentBilling || 0), 0);

  const totalSepOut = filteredDebtors.reduce((acc, d) => acc + (d.september?.outstanding || 0), 0);
  const totalSepClr = filteredDebtors.reduce((acc, d) => acc + (d.september?.paymentCleared || 0), 0);
  const totalSepBil = filteredDebtors.reduce((acc, d) => acc + (d.september?.currentBilling || 0), 0);

  const totalOctOut = filteredDebtors.reduce((acc, d) => acc + (d.october?.outstanding || 0), 0);
  const totalOctClr = filteredDebtors.reduce((acc, d) => acc + (d.october?.paymentCleared || 0), 0);
  const totalOctBil = filteredDebtors.reduce((acc, d) => acc + (d.october?.currentBilling || 0), 0);

  const totalNovOut = filteredDebtors.reduce((acc, d) => acc + (d.november?.outstanding || 0), 0);
  const totalNovClr = filteredDebtors.reduce((acc, d) => acc + (d.november?.paymentCleared || 0), 0);
  const totalNovBil = filteredDebtors.reduce((acc, d) => acc + (d.november?.currentBilling || 0), 0);

  const grandClosingBalance = filteredDebtors.reduce((acc, d) => acc + (d.currentBalance || 0), 0);

  const totalProfIncome = filteredBillings.reduce((acc, b) => acc + (b.professionalIncome || 0), 0);
  const totalOOP = filteredBillings.reduce((acc, b) => acc + (b.oopExpenses || 0), 0);

  const handleExportExcel = () => {
    exportDebtorsAndGSTWorkbook(debtors, billings, ACTUAL_GST_COMPLIANCE);
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalRecord || !paymentInput) return;
    const amount = parseFloat(paymentInput);
    if (isNaN(amount) || amount <= 0) return;
    onRecordPayment(paymentModalRecord.id, amount);
    setPaymentModalRecord(null);
    setPaymentInput('');
    setPaymentNote('');
  };

  const handleQuickPaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPayClientId || !paymentInput) return;
    const amount = parseFloat(paymentInput);
    if (isNaN(amount) || amount <= 0) return;
    onRecordPayment(quickPayClientId, amount);
    setIsQuickPayOpen(false);
    setQuickPayClientId('');
    setPaymentInput('');
  };

  const handleBillingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!billingModalRecord || !billingInput) return;
    const amount = parseFloat(billingInput);
    if (isNaN(amount) || amount <= 0) return;
    if (onAddBilling) {
      onAddBilling(billingModalRecord.id, amount, billingService);
    }
    setBillingModalRecord(null);
    setBillingInput('');
  };

  const isMonthView = activeMonth !== 'full-ledger' && activeMonth !== 'billing-log';
  const amt = (n?: number) => (n ? formatINR(n) : <span className="text-fg-faint">—</span>);
  const statusToneMap = { Cleared: 'success', 'Partially Paid': 'warning', Unpaid: 'danger' } as const;

  const statementRows = inspectClient
    ? (
        [
          ['August 2026', inspectClient.august],
          ['September 2026', inspectClient.september],
          ['October 2026', inspectClient.october],
          ['November 2026', inspectClient.november],
        ] as [string, MonthDebtorLedger | undefined][]
      ).map(([label, l]) => {
        const opening = l?.outstanding || 0;
        const paid = l?.paymentCleared || 0;
        const billed = l?.currentBilling || 0;
        return { label, opening, paid, billed, closing: Math.max(0, opening - paid + billed) };
      })
    : [];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Debtors"
        description="Client fee ledgers, collections and the office billing register"
        actions={
          <>
            <Button icon={Download} onClick={handleExportExcel}>
              Export
            </Button>
            <Button
              variant="primary"
              icon={Plus}
              onClick={() => {
                setQuickPayClientId(debtors[0]?.id || '');
                setPaymentInput('');
                setIsQuickPayOpen(true);
              }}
            >
              Record Payment
            </Button>
          </>
        }
      />

      <Tabs
        value={activeMonth}
        onChange={setActiveMonth}
        options={[
          { value: 'november', label: 'November' },
          { value: 'october', label: 'October' },
          { value: 'september', label: 'September' },
          { value: 'august', label: 'August' },
          { value: 'full-ledger', label: 'Four-month ledger' },
          { value: 'billing-log', label: 'Billing register' },
        ]}
      />

      {isMonthView && (
        <MetricGrid className="grid-cols-2 lg:grid-cols-4">
          <Metric label="Opening balance" value={formatINR(activeMonthTotals.opening)} hint={`Brought forward · ${monthLabels[activeMonth]?.label}`} />
          <Metric label="Received" value={formatINR(activeMonthTotals.paid)} tone="success" hint="Collected this month" />
          <Metric label="Billed" value={formatINR(activeMonthTotals.billed)} tone="info" hint="Fees invoiced" />
          <Metric
            label="Closing balance"
            value={formatINR(activeMonthTotals.closing)}
            tone={activeMonthTotals.closing > 0 ? 'danger' : 'success'}
            hint={`${activeMonthTotals.pendingCount} ${activeMonthTotals.pendingCount === 1 ? 'client' : 'clients'} outstanding`}
          />
        </MetricGrid>
      )}

      <TableCard
        toolbar={
          <Toolbar className="justify-between">
            <SearchInput
              placeholder={activeMonth === 'billing-log' ? 'Client, service or staff' : 'Client, staff or entity'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              wrapperClassName="w-full sm:w-64"
              className="h-7 text-xs"
            />
            <div className="flex flex-wrap items-center gap-2">
              {isMonthView && (
                <Segmented
                  size="sm"
                  value={balanceFilter}
                  onChange={setBalanceFilter}
                  options={[
                    { value: 'all', label: 'All' },
                    { value: 'due', label: 'Outstanding' },
                    { value: 'cleared', label: 'Cleared' },
                  ]}
                />
              )}
              {!activeStaffMember && (
                <Select value={staffFilter} onChange={(e) => setStaffFilter(e.target.value)} className="h-7 text-xs w-auto">
                  <option value="all">All staff</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              )}
            </div>
          </Toolbar>
        }
        footer={
          <div className="flex items-center justify-between px-3 h-11 border-t border-line text-xs text-fg-subtle num">
            {activeMonth === 'billing-log' ? (
              <>
                <span>{filteredBillings.length} entries</span>
                <span>
                  Professional fees <span className="text-fg font-medium">{formatINR(totalProfIncome)}</span>
                  <span className="mx-2 text-fg-faint">·</span>
                  Out-of-pocket <span className="text-fg font-medium">{formatINR(totalOOP)}</span>
                </span>
              </>
            ) : (
              <>
                <span>{filteredDebtors.length} accounts</span>
                <span>
                  Total outstanding <span className="text-fg font-medium">{formatINR(grandClosingBalance)}</span>
                </span>
              </>
            )}
          </div>
        }
      >
        {/* Month view */}
        {isMonthView && (
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-10 text-right">#</th>
                <th className="min-w-[220px]">Client</th>
                <th>Owner</th>
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
                  <td colSpan={9} className="!h-auto">
                    <EmptyState title="No accounts match these filters" />
                  </td>
                </tr>
              )}
              {filteredDebtors.map((client, index) => {
                const { opening, paid, billed, closing, status } = getClientMonthData(client, activeMonth);
                return (
                  <tr key={client.id}>
                    <td className="num text-right text-fg-faint text-xs">{client.sNo || index + 1}</td>
                    <td className="py-2">
                      <button
                        onClick={() => setInspectClient(client)}
                        className="block max-w-xs truncate text-left font-medium text-fg hover:underline underline-offset-2"
                      >
                        {client.clientName}
                      </button>
                      <div className="text-xs text-fg-subtle mt-0.5">
                        {client.entityType} · <span className="ident text-2xs">{client.phone}</span>
                      </div>
                    </td>
                    <td className="text-fg-muted whitespace-nowrap">{client.assignedStaff}</td>
                    <td className="num text-right text-fg-muted whitespace-nowrap">{formatINR(opening)}</td>
                    <td className="num text-right text-success whitespace-nowrap">{amt(paid)}</td>
                    <td className="num text-right text-fg-muted whitespace-nowrap">{amt(billed)}</td>
                    <td className="num text-right font-medium text-fg whitespace-nowrap">{formatINR(closing)}</td>
                    <td>
                      <Badge tone={statusToneMap[status]} dot>
                        {status}
                      </Badge>
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {closing > 0 && (
                          <IconButton icon={MessageSquare} label="Send WhatsApp reminder" size="sm" onClick={() => onOpenWhatsApp(client)} />
                        )}
                        <Button
                          size="sm"
                          onClick={() => {
                            setBillingModalRecord(client);
                            setBillingInput('');
                          }}
                        >
                          Bill
                        </Button>
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => {
                            setPaymentModalRecord(client);
                            setPaymentInput(closing > 0 ? closing.toString() : '');
                          }}
                        >
                          Receive
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Four-month ledger */}
        {activeMonth === 'full-ledger' && (
          <table className="data-table text-xs num [&_td]:!h-10 [&_td]:!px-2.5 [&_th]:!px-2.5">
            <thead>
              <tr>
                <th rowSpan={2} className="w-8 text-right align-bottom">#</th>
                <th rowSpan={2} className="min-w-[160px] align-bottom">Client</th>
                <th rowSpan={2} className="align-bottom">Owner</th>
                <th colSpan={2} className="text-center !border-l !border-line">Aug</th>
                <th colSpan={2} className="text-center !border-l !border-line">Sep</th>
                <th colSpan={2} className="text-center !border-l !border-line">Oct</th>
                <th colSpan={3} className="text-center !border-l !border-line">Nov</th>
                <th rowSpan={2} className="text-right align-bottom !border-l !border-line">Balance</th>
                <th rowSpan={2} className="align-bottom" />
              </tr>
              <tr>
                {['Due', 'Recd', 'Due', 'Recd', 'Due', 'Recd', 'Due', 'Recd', 'Billed'].map((h, i) => (
                  <th key={i} className={cn('text-right', (i === 0 || i === 2 || i === 4 || i === 6) && '!border-l !border-line')}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredDebtors.map((client) => (
                <tr key={client.id}>
                  <td className="text-right text-fg-faint">{client.sNo}</td>
                  <td className="font-medium text-fg text-sm truncate max-w-[180px]">{client.clientName}</td>
                  <td className="text-fg-muted">{client.assignedStaff}</td>
                  <td className="text-right text-fg-muted border-l border-line">{amt(client.august?.outstanding)}</td>
                  <td className="text-right text-success">{amt(client.august?.paymentCleared)}</td>
                  <td className="text-right text-fg-muted border-l border-line">{amt(client.september?.outstanding)}</td>
                  <td className="text-right text-success">{amt(client.september?.paymentCleared)}</td>
                  <td className="text-right text-fg-muted border-l border-line">{amt(client.october?.outstanding)}</td>
                  <td className="text-right text-success">{amt(client.october?.paymentCleared)}</td>
                  <td className="text-right text-fg border-l border-line">{amt(client.november?.outstanding)}</td>
                  <td className="text-right text-success">{amt(client.november?.paymentCleared)}</td>
                  <td className="text-right text-fg-muted">{amt(client.november?.currentBilling)}</td>
                  <td className="text-right font-semibold text-fg border-l border-line">{formatINR(client.currentBalance)}</td>
                  <td className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => setInspectClient(client)}>
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-subtle font-medium [&_td]:h-10 [&_td]:px-2.5 [&_td]:border-t [&_td]:border-line">
                <td />
                <td className="text-fg">Total</td>
                <td />
                <td className="text-right text-fg-muted border-l border-line">{formatINR(totalAugOut)}</td>
                <td className="text-right text-success">{formatINR(totalAugClr)}</td>
                <td className="text-right text-fg-muted border-l border-line">{formatINR(totalSepOut)}</td>
                <td className="text-right text-success">{formatINR(totalSepClr)}</td>
                <td className="text-right text-fg-muted border-l border-line">{formatINR(totalOctOut)}</td>
                <td className="text-right text-success">{formatINR(totalOctClr)}</td>
                <td className="text-right text-fg border-l border-line">{formatINR(totalNovOut)}</td>
                <td className="text-right text-success">{formatINR(totalNovClr)}</td>
                <td className="text-right text-fg-muted">{formatINR(totalNovBil)}</td>
                <td className="text-right font-semibold text-fg border-l border-line">{formatINR(grandClosingBalance)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}

        {/* Billing register */}
        {activeMonth === 'billing-log' && (
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-10 text-right">#</th>
                <th>Date</th>
                <th>Client</th>
                <th>Service</th>
                <th>Period</th>
                <th className="text-right">Professional fee</th>
                <th className="text-right">OOP</th>
                <th className="text-right">Total</th>
                <th>Billed by</th>
              </tr>
            </thead>
            <tbody>
              {filteredBillings.length === 0 && (
                <tr>
                  <td colSpan={9} className="!h-auto">
                    <EmptyState title="No billing entries found" />
                  </td>
                </tr>
              )}
              {filteredBillings.map((b) => {
                const prof = b.professionalIncome || 0;
                const oop = b.oopExpenses || 0;
                return (
                  <tr key={`${b.serialNo}-${b.date}`}>
                    <td className="num text-right text-fg-faint text-xs">{b.serialNo}</td>
                    <td className="num text-fg-muted whitespace-nowrap">{b.date}</td>
                    <td className="font-medium text-fg">{b.clientName}</td>
                    <td className="text-fg-muted">{b.natureOfService}</td>
                    <td className="num text-fg-muted whitespace-nowrap">{b.filingMonth || '—'}</td>
                    <td className="num text-right text-fg whitespace-nowrap">{formatINR(prof)}</td>
                    <td className="num text-right text-fg-muted whitespace-nowrap">{amt(oop)}</td>
                    <td className="num text-right font-medium text-fg whitespace-nowrap">{formatINR(prof + oop)}</td>
                    <td className="text-fg-muted">{b.user}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </TableCard>

      {/* Client statement */}
      <Modal
        isOpen={!!inspectClient}
        onClose={() => setInspectClient(null)}
        size="md"
        title={inspectClient?.clientName}
        description={inspectClient ? `${inspectClient.entityType} · Owner ${inspectClient.assignedStaff}` : undefined}
        footer={
          inspectClient && (
            <>
              <Button variant="ghost" icon={MessageSquare} onClick={() => onOpenWhatsApp(inspectClient)} className="mr-auto">
                WhatsApp
              </Button>
              <Button variant="ghost" onClick={() => setInspectClient(null)}>
                Close
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  const target = inspectClient;
                  setInspectClient(null);
                  setPaymentModalRecord(target);
                  setPaymentInput(target.currentBalance > 0 ? target.currentBalance.toString() : '');
                }}
              >
                Record Payment
              </Button>
            </>
          )
        }
      >
        {inspectClient && (
          <div className="space-y-5">
            <div className="flex items-end justify-between">
              <div>
                <div className="eyebrow">Current balance</div>
                <div className={cn('num text-2xl font-semibold mt-1', inspectClient.currentBalance > 0 ? 'text-fg' : 'text-success')}>
                  {formatINR(inspectClient.currentBalance)}
                </div>
              </div>
              <Badge tone={inspectClient.currentBalance > 0 ? 'danger' : 'success'} dot>
                {inspectClient.currentBalance > 0 ? inspectClient.agingBucket || 'Outstanding' : 'Cleared'}
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
                  {statementRows.map((r, i) => {
                    const isCurrent = i === statementRows.length - 1;
                    return (
                      <tr key={r.label} className={cn(isCurrent && 'bg-subtle font-medium')}>
                        <td className="text-fg">{r.label}</td>
                        <td className="text-right text-fg-muted">{formatINR(r.opening)}</td>
                        <td className="text-right text-success">{amt(r.paid)}</td>
                        <td className="text-right text-fg-muted">{amt(r.billed)}</td>
                        <td className="text-right text-fg">{formatINR(isCurrent ? inspectClient.currentBalance : r.closing)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>

      {/* Record payment (row) */}
      <Modal
        isOpen={!!paymentModalRecord}
        onClose={() => setPaymentModalRecord(null)}
        size="sm"
        title="Record Client Payment"
        description={paymentModalRecord ? `Credit a receipt to ${paymentModalRecord.clientName}` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPaymentModalRecord(null)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="debtor-payment-form">
              Save Payment
            </Button>
          </>
        }
      >
        {paymentModalRecord && (
          <form id="debtor-payment-form" onSubmit={handlePaymentSubmit} className="space-y-4">
            <div className="flex items-center justify-between h-10 px-3 rounded-md border border-line bg-subtle text-sm">
              <span className="text-fg-subtle">Outstanding · {paymentModalRecord.assignedStaff}</span>
              <span className="num font-medium text-fg">{formatINR(paymentModalRecord.currentBalance)}</span>
            </div>
            <Field label="Amount received (₹)" required>
              <Input type="number" step="any" required autoFocus placeholder="5000" value={paymentInput} onChange={(e) => setPaymentInput(e.target.value)} className="num" />
            </Field>
            <Field label="Payment mode">
              <Select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
                <option value="Bank Transfer (NEFT/RTGS)">Bank transfer (NEFT/RTGS)</option>
                <option value="UPI / QR Code">UPI</option>
                <option value="Cheque Deposit">Cheque</option>
                <option value="Cash Receipt">Cash</option>
              </Select>
            </Field>
            <Field label="Reference" hint="Optional — UTR, cheque number or note.">
              <Input placeholder="UTR 123456" value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} />
            </Field>
          </form>
        )}
      </Modal>

      {/* Record payment (header) */}
      <Modal
        isOpen={isQuickPayOpen}
        onClose={() => setIsQuickPayOpen(false)}
        size="sm"
        title="Record Client Payment"
        description="Select the client and enter the amount received."
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsQuickPayOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="debtor-quickpay-form">
              Save Payment
            </Button>
          </>
        }
      >
        <form id="debtor-quickpay-form" onSubmit={handleQuickPaySubmit} className="space-y-4">
          <Field label="Client">
            <Select
              value={quickPayClientId}
              onChange={(e) => {
                setQuickPayClientId(e.target.value);
                const selected = debtors.find((d) => d.id === e.target.value);
                if (selected && selected.currentBalance > 0) setPaymentInput(selected.currentBalance.toString());
              }}
            >
              {debtors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.clientName} — {formatINR(d.currentBalance)} due
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Amount received (₹)" required>
            <Input type="number" step="any" required placeholder="10000" value={paymentInput} onChange={(e) => setPaymentInput(e.target.value)} className="num" />
          </Field>
        </form>
      </Modal>

      {/* Add billing */}
      <Modal
        isOpen={!!billingModalRecord}
        onClose={() => setBillingModalRecord(null)}
        size="sm"
        title="Add billing entry"
        description={billingModalRecord ? `Debit a fee to ${billingModalRecord.clientName}` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setBillingModalRecord(null)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="debtor-billing-form">
              Post Entry
            </Button>
          </>
        }
      >
        <form id="debtor-billing-form" onSubmit={handleBillingSubmit} className="space-y-4">
          <Field label="Amount (₹)" required>
            <Input type="number" step="any" required autoFocus placeholder="3000" value={billingInput} onChange={(e) => setBillingInput(e.target.value)} className="num" />
          </Field>
          <Field label="Service" required>
            <Input required value={billingService} onChange={(e) => setBillingService(e.target.value)} />
          </Field>
        </form>
      </Modal>
    </div>
  );
};
