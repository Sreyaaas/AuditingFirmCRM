import React, { useState } from 'react';
import { 
  Receipt, 
  Search, 
  Download, 
  MessageSquare, 
  Plus, 
  Check, 
  Clock, 
  AlertCircle,
  X,
  History
} from 'lucide-react';
import { DebtorRecord, OfficeBillingEntry, StaffMember, MonthDebtorLedger } from '../types/crm';
import { exportDebtorsAndGSTWorkbook } from '../utils/excelExport';
import { ACTUAL_GST_COMPLIANCE } from '../data/actualClientData';

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

  return (
    <div className="space-y-5">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E5EA] dark:border-[#2C2C2E] pb-3">
        <div>
          <h1 className="text-[22px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight">
            Money Owed to Us
          </h1>
          <p className="text-[13px] text-[#6E6E73] dark:text-[#8E8E93] mt-0.5">
            Client fee accounts, payment collections, and billing registers
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7] bg-[#FFFFFF] dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] hover:bg-[#F2F2F7] dark:hover:bg-[#3A3A3C] transition-colors"
          >
            <Download className="w-3.5 h-3.5 stroke-[1.5]" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={() => {
              setQuickPayClientId(debtors[0]?.id || '');
              setPaymentInput('');
              setIsQuickPayOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-white bg-[#0071E3] hover:bg-[#0077ED] rounded-[6px] transition-colors"
          >
            <Plus className="w-3.5 h-3.5 stroke-[1.5]" />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* Segmented Control - Month Tabs (macOS style) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#F2F2F7] dark:bg-[#1C1C1E] p-1 rounded-[8px]">
        <div className="flex flex-wrap items-center gap-1">
          {(['november', 'october', 'september', 'august'] as SelectedMonthKey[]).map((key) => {
            const isActive = activeMonth === key;
            return (
              <button
                key={key}
                onClick={() => setActiveMonth(key)}
                className={`px-3 py-1 text-[13px] rounded-[6px] transition-all ${
                  isActive
                    ? 'bg-[#FFFFFF] dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] font-semibold shadow-sm'
                    : 'text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]'
                }`}
              >
                <span>{key.charAt(0).toUpperCase() + key.slice(1)} 2026</span>
                {key === 'november' && (
                  <span className="ml-1.5 font-tabular text-[10px] text-[#34C759]">Current</span>
                )}
              </button>
            );
          })}

          <div className="h-4 w-[1px] bg-[#E5E5EA] dark:bg-[#2C2C2E] mx-1"></div>

          <button
            onClick={() => setActiveMonth('full-ledger')}
            className={`px-3 py-1 text-[13px] rounded-[6px] transition-all ${
              activeMonth === 'full-ledger'
                ? 'bg-[#FFFFFF] dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] font-semibold shadow-sm'
                : 'text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]'
            }`}
          >
            4-Month Master
          </button>

          <button
            onClick={() => setActiveMonth('billing-log')}
            className={`px-3 py-1 text-[13px] rounded-[6px] transition-all ${
              activeMonth === 'billing-log'
                ? 'bg-[#FFFFFF] dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] font-semibold shadow-sm'
                : 'text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]'
            }`}
          >
            Office Billing
          </button>
        </div>

        <div className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93] px-2 font-tabular">
          {filteredDebtors.length} accounts
        </div>
      </div>

      {/* KPI Summary for Single Month View */}
      {activeMonth !== 'full-ledger' && activeMonth !== 'billing-log' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-[8px]">
          <div>
            <div className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93]">Opening Dues</div>
            <div className="font-tabular text-[22px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] mt-0.5">
              ₹{activeMonthTotals.opening.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93] mt-0.5">Brought forward</div>
          </div>

          <div className="border-l border-[#E5E5EA] dark:border-[#2C2C2E] pl-4">
            <div className="text-[12px] text-[#34C759]">Payments Cleared</div>
            <div className="font-tabular text-[22px] font-semibold text-[#34C759] mt-0.5">
              ₹{activeMonthTotals.paid.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93] mt-0.5">Credited to firm</div>
          </div>

          <div className="border-l border-[#E5E5EA] dark:border-[#2C2C2E] pl-4">
            <div className="text-[12px] text-[#0071E3] dark:text-[#2997FF]">New Billing</div>
            <div className="font-tabular text-[22px] font-semibold text-[#0071E3] dark:text-[#2997FF] mt-0.5">
              ₹{activeMonthTotals.billed.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93] mt-0.5">Fees invoiced</div>
          </div>

          <div className="border-l border-[#E5E5EA] dark:border-[#2C2C2E] pl-4">
            <div className="text-[12px] text-[#FF3B30]">Net Outstanding</div>
            <div className="font-tabular text-[22px] font-semibold text-[#FF3B30] mt-0.5">
              ₹{activeMonthTotals.closing.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93] mt-0.5 font-tabular">
              {activeMonthTotals.pendingCount} clients due
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FFFFFF] dark:bg-[#1C1C1E] p-3 border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-[8px]">
        <div className="flex items-center gap-2 flex-1 max-w-sm bg-[#F2F2F7] dark:bg-[#242426] px-2.5 py-1.5 rounded-[6px]">
          <Search className="w-3.5 h-3.5 text-[#6E6E73] dark:text-[#8E8E93] shrink-0 stroke-[1.5]" />
          <input
            type="text"
            placeholder="Search by client name, staff, or entity..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-[13px] bg-transparent focus:outline-none placeholder:text-[#86868B] text-[#1D1D1F] dark:text-[#F5F5F7]"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-[#6E6E73] hover:text-[#1D1D1F]">
              <X className="w-3.5 h-3.5 stroke-[1.5]" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          {activeMonth !== 'full-ledger' && activeMonth !== 'billing-log' && (
            <div className="inline-flex rounded-[6px] bg-[#F2F2F7] dark:bg-[#242426] p-0.5">
              <button
                onClick={() => setBalanceFilter('all')}
                className={`px-2.5 py-1 rounded-[5px] text-[12px] transition-colors ${
                  balanceFilter === 'all'
                    ? 'bg-[#FFFFFF] dark:bg-[#3A3A3C] text-[#1D1D1F] dark:text-[#F5F5F7] font-semibold shadow-sm'
                    : 'text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#1D1D1F]'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setBalanceFilter('due')}
                className={`px-2.5 py-1 rounded-[5px] text-[12px] transition-colors ${
                  balanceFilter === 'due'
                    ? 'bg-[#FFFFFF] dark:bg-[#3A3A3C] text-[#FF3B30] font-semibold shadow-sm'
                    : 'text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#1D1D1F]'
                }`}
              >
                Due Only
              </button>
              <button
                onClick={() => setBalanceFilter('cleared')}
                className={`px-2.5 py-1 rounded-[5px] text-[12px] transition-colors ${
                  balanceFilter === 'cleared'
                    ? 'bg-[#FFFFFF] dark:bg-[#3A3A3C] text-[#34C759] font-semibold shadow-sm'
                    : 'text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#1D1D1F]'
                }`}
              >
                Cleared
              </button>
            </div>
          )}

          {!activeStaffMember && (
            <select
              value={staffFilter}
              onChange={(e) => setStaffFilter(e.target.value)}
              className="px-2.5 py-1 bg-[#F2F2F7] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] text-[#1D1D1F] dark:text-[#F5F5F7] text-[12px] focus:outline-none"
            >
              <option value="all">All Staff</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* VIEW 1: MONTH-WISE TABLE */}
      {activeMonth !== 'full-ledger' && activeMonth !== 'billing-log' && (
        <div className="bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-[8px] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px] border-collapse">
              <thead>
                <tr className="bg-[#FBFBFD] dark:bg-[#161618] text-[#6E6E73] dark:text-[#8E8E93] text-[12px] border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
                  <th className="py-2.5 px-3 font-semibold text-center w-10">#</th>
                  <th className="py-2.5 px-3 font-semibold min-w-[200px]">Client Account</th>
                  <th className="py-2.5 px-3 font-semibold">Staff</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Opening Dues</th>
                  <th className="py-2.5 px-3 font-semibold text-right text-[#34C759]">Cleared</th>
                  <th className="py-2.5 px-3 font-semibold text-right text-[#0071E3] dark:text-[#2997FF]">New Billing</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Closing Balance</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Status</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5EA] dark:divide-[#2C2C2E]">
                {filteredDebtors.map((client, index) => {
                  const { opening, paid, billed, closing, status } = getClientMonthData(client, activeMonth);
                  const isPositiveBalance = closing > 0;

                  return (
                    <tr key={client.id} className="hover:bg-[#F2F2F7] dark:hover:bg-[#242426] transition-colors">
                      <td className="py-2.5 px-3 text-center font-tabular text-[12px] text-[#86868B]">
                        {client.sNo || index + 1}
                      </td>

                      <td className="py-2.5 px-3">
                        <button
                          onClick={() => setInspectClient(client)}
                          className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7] hover:text-[#0071E3] dark:hover:text-[#2997FF] hover:underline text-left truncate block max-w-xs"
                        >
                          {client.clientName}
                        </button>
                        <div className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93] mt-0.5">
                          {client.entityType} • {client.phone}
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-[#6E6E73] dark:text-[#8E8E93] text-[12px]">
                        {client.assignedStaff}
                      </td>

                      <td className="py-2.5 px-3 text-right font-tabular text-[#6E6E73] dark:text-[#8E8E93]">
                        {opening > 0 ? `₹${opening.toLocaleString('en-IN')}` : '₹0'}
                      </td>

                      <td className="py-2.5 px-3 text-right font-tabular text-[#34C759]">
                        {paid > 0 ? `₹${paid.toLocaleString('en-IN')}` : '—'}
                      </td>

                      <td className="py-2.5 px-3 text-right font-tabular text-[#0071E3] dark:text-[#2997FF]">
                        {billed > 0 ? `₹${billed.toLocaleString('en-IN')}` : '—'}
                      </td>

                      <td className="py-2.5 px-3 text-right font-tabular font-semibold">
                        {isPositiveBalance ? (
                          <span className="text-[#FF3B30]">₹{closing.toLocaleString('en-IN')}</span>
                        ) : (
                          <span className="text-[#34C759]">Cleared</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-[4px] ${
                          status === 'Cleared'
                            ? 'bg-[#34C759]/10 text-[#34C759] dark:bg-[#34C759]/20'
                            : status === 'Partially Paid'
                            ? 'bg-[#FF9500]/10 text-[#FF9500] dark:bg-[#FF9500]/20'
                            : 'bg-[#FF3B30]/10 text-[#FF3B30] dark:bg-[#FF3B30]/20'
                        }`}>
                          {status}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPositiveBalance && (
                            <button
                              onClick={() => onOpenWhatsApp(client)}
                              title="Send WhatsApp Reminder"
                              className="p-1 text-[#34C759] hover:bg-[#34C759]/10 rounded transition-colors"
                            >
                              <MessageSquare className="w-3.5 h-3.5 stroke-[1.5]" />
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setPaymentModalRecord(client);
                              setPaymentInput(closing > 0 ? closing.toString() : '');
                            }}
                            className="px-2 py-1 text-[11px] font-medium text-white bg-[#0071E3] hover:bg-[#0077ED] rounded-[4px] transition-colors"
                          >
                            Pay
                          </button>

                          <button
                            onClick={() => {
                              setBillingModalRecord(client);
                              setBillingInput('');
                            }}
                            className="px-2 py-1 text-[11px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7] bg-[#F2F2F7] dark:bg-[#2C2C2E] hover:bg-[#E5E5EA] dark:hover:bg-[#3A3A3C] rounded-[4px] transition-colors"
                          >
                            Bill
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: 4-MONTH MASTER SHEET */}
      {activeMonth === 'full-ledger' && (
        <div className="bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-[8px] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12px] border-collapse font-tabular">
              <thead>
                <tr className="bg-[#FBFBFD] dark:bg-[#161618] text-[#6E6E73] dark:text-[#8E8E93] text-[11px] border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
                  <th className="py-2 px-2 text-center w-8">#</th>
                  <th className="py-2 px-3 min-w-[160px]">Client</th>
                  <th className="py-2 px-2">Staff</th>
                  <th className="py-2 px-2 text-right">Aug Out</th>
                  <th className="py-2 px-2 text-right text-[#34C759]">Aug Clr</th>
                  <th className="py-2 px-2 text-right">Sep Out</th>
                  <th className="py-2 px-2 text-right text-[#34C759]">Sep Clr</th>
                  <th className="py-2 px-2 text-right">Oct Out</th>
                  <th className="py-2 px-2 text-right text-[#34C759]">Oct Clr</th>
                  <th className="py-2 px-2 text-right font-semibold">Nov Out</th>
                  <th className="py-2 px-2 text-right font-semibold text-[#34C759]">Nov Clr</th>
                  <th className="py-2 px-2 text-right font-semibold text-[#0071E3]">Nov Bil</th>
                  <th className="py-2 px-3 text-right font-semibold text-[#FF3B30]">Balance</th>
                  <th className="py-2 px-2 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5EA] dark:divide-[#2C2C2E]">
                {filteredDebtors.map((client) => (
                  <tr key={client.id} className="hover:bg-[#F2F2F7] dark:hover:bg-[#242426]">
                    <td className="py-1.5 px-2 text-center text-[#86868B]">{client.sNo}</td>
                    <td className="py-1.5 px-3 font-medium text-[#1D1D1F] dark:text-[#F5F5F7] truncate max-w-[160px]">
                      {client.clientName}
                    </td>
                    <td className="py-1.5 px-2 text-[#6E6E73] dark:text-[#8E8E93]">{client.assignedStaff}</td>
                    <td className="py-1.5 px-2 text-right text-[#86868B]">{client.august?.outstanding ? `₹${client.august.outstanding.toLocaleString('en-IN')}` : '—'}</td>
                    <td className="py-1.5 px-2 text-right text-[#34C759]">{client.august?.paymentCleared ? `₹${client.august.paymentCleared.toLocaleString('en-IN')}` : '—'}</td>
                    <td className="py-1.5 px-2 text-right text-[#86868B]">{client.september?.outstanding ? `₹${client.september.outstanding.toLocaleString('en-IN')}` : '—'}</td>
                    <td className="py-1.5 px-2 text-right text-[#34C759]">{client.september?.paymentCleared ? `₹${client.september.paymentCleared.toLocaleString('en-IN')}` : '—'}</td>
                    <td className="py-1.5 px-2 text-right text-[#86868B]">{client.october?.outstanding ? `₹${client.october.outstanding.toLocaleString('en-IN')}` : '—'}</td>
                    <td className="py-1.5 px-2 text-right text-[#34C759]">{client.october?.paymentCleared ? `₹${client.october.paymentCleared.toLocaleString('en-IN')}` : '—'}</td>
                    <td className="py-1.5 px-2 text-right font-medium">{client.november?.outstanding ? `₹${client.november.outstanding.toLocaleString('en-IN')}` : '—'}</td>
                    <td className="py-1.5 px-2 text-right font-medium text-[#34C759]">{client.november?.paymentCleared ? `₹${client.november.paymentCleared.toLocaleString('en-IN')}` : '—'}</td>
                    <td className="py-1.5 px-2 text-right font-medium text-[#0071E3]">{client.november?.currentBilling ? `₹${client.november.currentBilling.toLocaleString('en-IN')}` : '—'}</td>
                    <td className="py-1.5 px-3 text-right font-semibold text-[#FF3B30]">₹{client.currentBalance.toLocaleString('en-IN')}</td>
                    <td className="py-1.5 px-2 text-center">
                      <button onClick={() => setInspectClient(client)} className="text-[11px] text-[#0071E3] hover:underline">
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: OFFICE BILLING REGISTER */}
      {activeMonth === 'billing-log' && (
        <div className="bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-[8px] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px] border-collapse">
              <thead>
                <tr className="bg-[#FBFBFD] dark:bg-[#161618] text-[#6E6E73] dark:text-[#8E8E93] text-[12px] border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
                  <th className="py-2.5 px-3 font-semibold w-10 text-center">#</th>
                  <th className="py-2.5 px-3 font-semibold">Date</th>
                  <th className="py-2.5 px-3 font-semibold">Client Name</th>
                  <th className="py-2.5 px-3 font-semibold">Service</th>
                  <th className="py-2.5 px-3 font-semibold">Period</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Prof. Fee</th>
                  <th className="py-2.5 px-3 font-semibold text-right">OOP</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Total</th>
                  <th className="py-2.5 px-3 font-semibold">Auditor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5EA] dark:divide-[#2C2C2E]">
                {filteredBillings.map((b) => {
                  const prof = b.professionalIncome || 0;
                  const oop = b.oopExpenses || 0;
                  return (
                    <tr key={`${b.serialNo}-${b.date}`} className="hover:bg-[#F2F2F7] dark:hover:bg-[#242426]">
                      <td className="py-2 px-3 text-center text-[#86868B] font-tabular">{b.serialNo}</td>
                      <td className="py-2 px-3 text-[#6E6E73] dark:text-[#8E8E93] font-tabular">{b.date}</td>
                      <td className="py-2 px-3 font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">{b.clientName}</td>
                      <td className="py-2 px-3 text-[#6E6E73] dark:text-[#8E8E93]">{b.natureOfService}</td>
                      <td className="py-2 px-3 text-[#6E6E73] dark:text-[#8E8E93] font-tabular">{b.filingMonth || '—'}</td>
                      <td className="py-2 px-3 text-right font-tabular font-medium">₹{prof.toLocaleString('en-IN')}</td>
                      <td className="py-2 px-3 text-right font-tabular text-[#86868B]">{oop > 0 ? `₹${oop.toLocaleString('en-IN')}` : '—'}</td>
                      <td className="py-2 px-3 text-right font-tabular font-semibold text-[#0071E3]">₹{(prof + oop).toLocaleString('en-IN')}</td>
                      <td className="py-2 px-3 text-[#1D1D1F] dark:text-[#F5F5F7]">{b.user}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CLIENT STATEMENT SHEET */}
      {inspectClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div 
            className="w-full max-w-lg bg-[#FFFFFF] dark:bg-[#1C1C1E] rounded-[8px] border border-[#E5E5EA] dark:border-[#2C2C2E] shadow-2xl p-5 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
              <div>
                <h3 className="text-[15px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                  {inspectClient.clientName}
                </h3>
                <p className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93]">
                  {inspectClient.entityType} • Assigned: {inspectClient.assignedStaff}
                </p>
              </div>
              <button onClick={() => setInspectClient(null)} className="text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]">
                <X className="w-4 h-4 stroke-[1.5]" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              <div className="p-3 bg-[#F2F2F7] dark:bg-[#242426] rounded-[6px] flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93] block">Current Balance</span>
                  <span className="text-[20px] font-semibold font-tabular text-[#FF3B30]">₹{inspectClient.currentBalance.toLocaleString('en-IN')}</span>
                </div>
                <button
                  onClick={() => onOpenWhatsApp(inspectClient)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-white bg-[#34C759] hover:bg-[#30B753] rounded-[6px] transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5 stroke-[1.5]" />
                  WhatsApp
                </button>
              </div>

              <div>
                <div className="text-[12px] font-semibold text-[#6E6E73] dark:text-[#8E8E93] mb-2 uppercase tracking-wide">
                  Month-by-Month Statement
                </div>

                <div className="border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-[6px] overflow-hidden">
                  <table className="w-full text-[12px] font-tabular">
                    <thead>
                      <tr className="bg-[#FBFBFD] dark:bg-[#161618] text-[#6E6E73] dark:text-[#8E8E93] border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
                        <th className="py-2 px-3 text-left">Month</th>
                        <th className="py-2 px-2 text-right">Opening</th>
                        <th className="py-2 px-2 text-right text-[#34C759]">Paid</th>
                        <th className="py-2 px-2 text-right text-[#0071E3]">Billed</th>
                        <th className="py-2 px-3 text-right font-semibold">Closing</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E5EA] dark:divide-[#2C2C2E]">
                      <tr>
                        <td className="py-2 px-3 font-sans">August 2026</td>
                        <td className="py-2 px-2 text-right text-[#86868B]">₹{(inspectClient.august?.outstanding || 0).toLocaleString('en-IN')}</td>
                        <td className="py-2 px-2 text-right text-[#34C759]">₹{(inspectClient.august?.paymentCleared || 0).toLocaleString('en-IN')}</td>
                        <td className="py-2 px-2 text-right text-[#0071E3]">₹{(inspectClient.august?.currentBilling || 0).toLocaleString('en-IN')}</td>
                        <td className="py-2 px-3 text-right font-medium">
                          ₹{Math.max(0, (inspectClient.august?.outstanding || 0) - (inspectClient.august?.paymentCleared || 0) + (inspectClient.august?.currentBilling || 0)).toLocaleString('en-IN')}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-sans">September 2026</td>
                        <td className="py-2 px-2 text-right text-[#86868B]">₹{(inspectClient.september?.outstanding || 0).toLocaleString('en-IN')}</td>
                        <td className="py-2 px-2 text-right text-[#34C759]">₹{(inspectClient.september?.paymentCleared || 0).toLocaleString('en-IN')}</td>
                        <td className="py-2 px-2 text-right text-[#0071E3]">₹{(inspectClient.september?.currentBilling || 0).toLocaleString('en-IN')}</td>
                        <td className="py-2 px-3 text-right font-medium">
                          ₹{Math.max(0, (inspectClient.september?.outstanding || 0) - (inspectClient.september?.paymentCleared || 0) + (inspectClient.september?.currentBilling || 0)).toLocaleString('en-IN')}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-sans">October 2026</td>
                        <td className="py-2 px-2 text-right text-[#86868B]">₹{(inspectClient.october?.outstanding || 0).toLocaleString('en-IN')}</td>
                        <td className="py-2 px-2 text-right text-[#34C759]">₹{(inspectClient.october?.paymentCleared || 0).toLocaleString('en-IN')}</td>
                        <td className="py-2 px-2 text-right text-[#0071E3]">₹{(inspectClient.october?.currentBilling || 0).toLocaleString('en-IN')}</td>
                        <td className="py-2 px-3 text-right font-medium">
                          ₹{Math.max(0, (inspectClient.october?.outstanding || 0) - (inspectClient.october?.paymentCleared || 0) + (inspectClient.october?.currentBilling || 0)).toLocaleString('en-IN')}
                        </td>
                      </tr>
                      <tr className="bg-[#F2F2F7] dark:bg-[#242426] font-semibold">
                        <td className="py-2 px-3 font-sans text-[#1D1D1F] dark:text-[#F5F5F7]">November 2026</td>
                        <td className="py-2 px-2 text-right text-[#86868B]">₹{(inspectClient.november?.outstanding || 0).toLocaleString('en-IN')}</td>
                        <td className="py-2 px-2 text-right text-[#34C759]">₹{(inspectClient.november?.paymentCleared || 0).toLocaleString('en-IN')}</td>
                        <td className="py-2 px-2 text-right text-[#0071E3]">₹{(inspectClient.november?.currentBilling || 0).toLocaleString('en-IN')}</td>
                        <td className="py-2 px-3 text-right text-[#FF3B30]">
                          ₹{inspectClient.currentBalance.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E5EA] dark:border-[#2C2C2E]">
              <button
                onClick={() => setInspectClient(null)}
                className="px-3 py-1.5 text-[13px] text-[#6E6E73] hover:text-[#1D1D1F]"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const target = inspectClient;
                  setInspectClient(null);
                  setPaymentModalRecord(target);
                  setPaymentInput(target.currentBalance > 0 ? target.currentBalance.toString() : '');
                }}
                className="px-3 py-1.5 text-[13px] font-medium text-white bg-[#0071E3] hover:bg-[#0077ED] rounded-[6px] transition-colors"
              >
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECORD PAYMENT MODAL */}
      {paymentModalRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div 
            className="w-full max-w-md bg-[#FFFFFF] dark:bg-[#1C1C1E] rounded-[8px] border border-[#E5E5EA] dark:border-[#2C2C2E] shadow-2xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
              <div>
                <h3 className="text-[15px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                  Record Client Payment
                </h3>
                <p className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93]">
                  Credit payment for {paymentModalRecord.clientName}
                </p>
              </div>
              <button onClick={() => setPaymentModalRecord(null)} className="text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]">
                <X className="w-4 h-4 stroke-[1.5]" />
              </button>
            </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-4 pt-4">
              <div className="p-3 bg-[#F2F2F7] dark:bg-[#242426] rounded-[6px] text-[13px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-[#6E6E73] dark:text-[#8E8E93]">Current Balance:</span>
                  <span className="font-tabular font-semibold text-[#FF3B30]">
                    ₹{paymentModalRecord.currentBalance.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6E6E73] dark:text-[#8E8E93]">Staff:</span>
                  <span className="text-[#1D1D1F] dark:text-[#F5F5F7]">{paymentModalRecord.assignedStaff}</span>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#6E6E73] dark:text-[#8E8E93] mb-1">
                  Amount Received (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  autoFocus
                  placeholder="e.g. 5000"
                  value={paymentInput}
                  onChange={(e) => setPaymentInput(e.target.value)}
                  className="w-full px-3 py-1.5 text-[14px] font-tabular bg-[#F2F2F7] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] focus:outline-none focus:border-[#0071E3] text-[#1D1D1F] dark:text-[#F5F5F7]"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#6E6E73] dark:text-[#8E8E93] mb-1">
                  Payment Mode
                </label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full px-3 py-1.5 text-[13px] bg-[#F2F2F7] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] focus:outline-none text-[#1D1D1F] dark:text-[#F5F5F7]"
                >
                  <option value="Bank Transfer (NEFT/RTGS)">Bank Transfer (NEFT/RTGS)</option>
                  <option value="UPI / QR Code">UPI / QR Code</option>
                  <option value="Cheque Deposit">Cheque Deposit</option>
                  <option value="Cash Receipt">Cash Receipt</option>
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#6E6E73] dark:text-[#8E8E93] mb-1">
                  Reference Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. UTR #123456"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  className="w-full px-3 py-1.5 text-[13px] bg-[#F2F2F7] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] focus:outline-none text-[#1D1D1F] dark:text-[#F5F5F7]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E5EA] dark:border-[#2C2C2E]">
                <button
                  type="button"
                  onClick={() => setPaymentModalRecord(null)}
                  className="px-3 py-1.5 text-[13px] text-[#6E6E73] hover:text-[#1D1D1F]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-[13px] font-medium text-white bg-[#0071E3] hover:bg-[#0077ED] rounded-[6px] transition-colors"
                >
                  Save Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK PAY MODAL */}
      {isQuickPayOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div 
            className="w-full max-w-md bg-[#FFFFFF] dark:bg-[#1C1C1E] rounded-[8px] border border-[#E5E5EA] dark:border-[#2C2C2E] shadow-2xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
              <div>
                <h3 className="text-[15px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                  Record Client Payment
                </h3>
                <p className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93]">
                  Select client and enter payment amount
                </p>
              </div>
              <button onClick={() => setIsQuickPayOpen(false)} className="text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]">
                <X className="w-4 h-4 stroke-[1.5]" />
              </button>
            </div>

            <form onSubmit={handleQuickPaySubmit} className="space-y-4 pt-4">
              <div>
                <label className="block text-[12px] font-medium text-[#6E6E73] dark:text-[#8E8E93] mb-1">
                  Select Client
                </label>
                <select
                  value={quickPayClientId}
                  onChange={(e) => {
                    setQuickPayClientId(e.target.value);
                    const selected = debtors.find((d) => d.id === e.target.value);
                    if (selected && selected.currentBalance > 0) {
                      setPaymentInput(selected.currentBalance.toString());
                    }
                  }}
                  className="w-full px-3 py-1.5 text-[13px] bg-[#F2F2F7] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] focus:outline-none text-[#1D1D1F] dark:text-[#F5F5F7]"
                >
                  {debtors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.clientName} (Due: ₹{d.currentBalance.toLocaleString('en-IN')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#6E6E73] dark:text-[#8E8E93] mb-1">
                  Amount Received (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="e.g. 10000"
                  value={paymentInput}
                  onChange={(e) => setPaymentInput(e.target.value)}
                  className="w-full px-3 py-1.5 text-[14px] font-tabular bg-[#F2F2F7] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] focus:outline-none focus:border-[#0071E3] text-[#1D1D1F] dark:text-[#F5F5F7]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E5EA] dark:border-[#2C2C2E]">
                <button
                  type="button"
                  onClick={() => setIsQuickPayOpen(false)}
                  className="px-3 py-1.5 text-[13px] text-[#6E6E73] hover:text-[#1D1D1F]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-[13px] font-medium text-white bg-[#0071E3] hover:bg-[#0077ED] rounded-[6px] transition-colors"
                >
                  Save Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD BILLING MODAL */}
      {billingModalRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div 
            className="w-full max-w-md bg-[#FFFFFF] dark:bg-[#1C1C1E] rounded-[8px] border border-[#E5E5EA] dark:border-[#2C2C2E] shadow-2xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
              <div>
                <h3 className="text-[15px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                  Add Billing Entry
                </h3>
                <p className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93]">
                  Debit fee to {billingModalRecord.clientName}
                </p>
              </div>
              <button onClick={() => setBillingModalRecord(null)} className="text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]">
                <X className="w-4 h-4 stroke-[1.5]" />
              </button>
            </div>

            <form onSubmit={handleBillingSubmit} className="space-y-4 pt-4">
              <div>
                <label className="block text-[12px] font-medium text-[#6E6E73] dark:text-[#8E8E93] mb-1">
                  Billing Amount (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  autoFocus
                  placeholder="Enter fee amount"
                  value={billingInput}
                  onChange={(e) => setBillingInput(e.target.value)}
                  className="w-full px-3 py-1.5 text-[14px] font-tabular bg-[#F2F2F7] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] focus:outline-none focus:border-[#0071E3] text-[#1D1D1F] dark:text-[#F5F5F7]"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#6E6E73] dark:text-[#8E8E93] mb-1">
                  Service Description
                </label>
                <input
                  type="text"
                  required
                  value={billingService}
                  onChange={(e) => setBillingService(e.target.value)}
                  className="w-full px-3 py-1.5 text-[13px] bg-[#F2F2F7] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] focus:outline-none text-[#1D1D1F] dark:text-[#F5F5F7]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E5EA] dark:border-[#2C2C2E]">
                <button
                  type="button"
                  onClick={() => setBillingModalRecord(null)}
                  className="px-3 py-1.5 text-[13px] text-[#6E6E73] hover:text-[#1D1D1F]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-[13px] font-medium text-white bg-[#0071E3] hover:bg-[#0077ED] rounded-[6px] transition-colors"
                >
                  Post Billing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
