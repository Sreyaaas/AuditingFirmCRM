import React, { useState } from 'react';
import { 
  MessageSquare, 
  ChevronLeft, 
  ChevronRight, 
  ArrowUpRight,
  Search,
  Plus,
  AlertCircle,
  Clock,
  CheckCircle2,
  Calendar,
  X,
  RotateCw,
  RefreshCw,
  FileCheck,
  ShieldCheck
} from 'lucide-react';
import { ITRFiling, StaffMember, ITRStatus, EntityType, Client } from '../types/crm';

interface ITRFilingsManagerProps {
  itrFilings: ITRFiling[];
  staffList: StaffMember[];
  clients?: Client[];
  selectedStaffId: string | null;
  onOpenWhatsApp: (itr: ITRFiling) => void;
  onSelectClient: (clientId: string) => void;
  onUpdateITRStatus: (id: string, newStatus: ITRStatus, ackNo?: string) => void;
  onAddITR?: (newITR: Omit<ITRFiling, 'id' | 'lastActivity'>) => void;
  onResetToDefault?: () => void;
}

export const ITRFilingsManager: React.FC<ITRFilingsManagerProps> = ({
  itrFilings,
  staffList,
  clients = [],
  selectedStaffId,
  onOpenWhatsApp,
  onSelectClient,
  onUpdateITRStatus,
  onAddITR,
  onResetToDefault,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [ackModalItem, setAckModalItem] = useState<ITRFiling | null>(null);
  const [ackInput, setAckInput] = useState('');

  // Add Form State
  const [formClientName, setFormClientName] = useState('');
  const [formPAN, setFormPAN] = useState('');
  const [formEntityType, setFormEntityType] = useState<EntityType>('Private Limited');
  const [formITRForm, setFormITRForm] = useState<'ITR-1' | 'ITR-2' | 'ITR-3' | 'ITR-4' | 'ITR-5' | 'ITR-6'>('ITR-6');
  const [formAY, setFormAY] = useState('AY 2026-27');
  const [formDueDate, setFormDueDate] = useState('2026-11-16');
  const [formIsRefund, setFormIsRefund] = useState(false);
  const [formTaxAmount, setFormTaxAmount] = useState('25000');
  const [formRegime, setFormRegime] = useState<'New Regime (115BAC)' | 'Old Regime'>('New Regime (115BAC)');
  const [formStaffId, setFormStaffId] = useState(staffList[0]?.id || 'staff-ameen');
  const [formPhone, setFormPhone] = useState('+91 98470 12345');
  const [formStatus, setFormStatus] = useState<ITTRStatus | ITRStatus>('Draft Computation');
  const [formAckNo, setFormAckNo] = useState('');

  const itemsPerPage = 10;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Helper: Compute countdown & priority
  const getDeadlineMeta = (dueDateStr: string, status: ITRStatus) => {
    if (status === 'Filed & e-Verified') {
      return {
        daysLeft: 0,
        level: 'completed' as const,
        score: 4,
        label: 'Filed & Verified',
        badgeClass: 'bg-[#34C759]/10 text-[#34C759] border-[#34C759]/20',
        textClass: 'text-[#34C759]',
      };
    }

    try {
      const [y, m, d] = dueDateStr.split('-').map(Number);
      const target = new Date(y, m - 1, d);
      target.setHours(0, 0, 0, 0);
      const diffTime = target.getTime() - today.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        return {
          daysLeft: diffDays,
          level: 'overdue' as const,
          score: 1, // Highest priority: comes on top
          label: `Overdue by ${Math.abs(diffDays)}d`,
          badgeClass: 'bg-[#FF3B30]/10 text-[#FF3B30] border-[#FF3B30]/30 font-semibold',
          textClass: 'text-[#FF3B30]',
        };
      }

      if (diffDays <= 10) {
        return {
          daysLeft: diffDays,
          level: 'urgent' as const,
          score: 2, // High priority: due within 10 days
          label: diffDays === 0 ? 'Due Today' : `Due in ${diffDays} days`,
          badgeClass: 'bg-[#FF9500]/10 text-[#FF9500] border-[#FF9500]/30 font-semibold',
          textClass: 'text-[#FF9500]',
        };
      }

      return {
        daysLeft: diffDays,
        level: 'upcoming' as const,
        score: 3,
        label: `Due in ${diffDays} days`,
        badgeClass: 'bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#6E6E73] dark:text-[#8E8E93] border-transparent',
        textClass: 'text-[#6E6E73] dark:text-[#8E8E93]',
      };
    } catch {
      return {
        daysLeft: 999,
        level: 'upcoming' as const,
        score: 3,
        label: 'Pending',
        badgeClass: 'bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#6E6E73]',
        textClass: 'text-[#6E6E73]',
      };
    }
  };

  // Format date readable
  const formatReadableDate = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Filter and sort items:
  // 1. Overdue on top (score 1)
  // 2. Due within 10 days (score 2)
  // 3. Upcoming (score 3)
  // 4. Completed / Filed (score 4)
  const processedList = itrFilings.map((item) => ({
    ...item,
    meta: getDeadlineMeta(item.dueDate, item.status),
  }));

  const filteredList = processedList
    .filter((item) => {
      if (selectedStaffId && item.assignedStaffId !== selectedStaffId) return false;
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && item.meta.level !== priorityFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          item.clientName.toLowerCase().includes(q) ||
          item.pan.toLowerCase().includes(q) ||
          item.entityType.toLowerCase().includes(q) ||
          item.itrForm.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      // Sort primarily by priority score (overdue -> urgent -> upcoming -> completed)
      if (a.meta.score !== b.meta.score) {
        return a.meta.score - b.meta.score;
      }
      // If same score, sort by days left ascending (earliest deadline first)
      return a.meta.daysLeft - b.meta.daysLeft;
    });

  const totalPages = Math.ceil(filteredList.length / itemsPerPage) || 1;
  const paginatedList = filteredList.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getStaff = (id: string) => staffList.find((s) => s.id === id);

  // Quick Metric Tallies
  const overdueCount = processedList.filter((i) => i.meta.level === 'overdue').length;
  const urgentCount = processedList.filter((i) => i.meta.level === 'urgent').length;
  const filedCount = processedList.filter((i) => i.status === 'Filed & e-Verified').length;
  const docsPendingCount = processedList.filter((i) => i.status === 'Docs Pending').length;

  // Handle Quick Client Autocomplete in Add Form
  const handleSelectPredefinedClient = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    if (!selectedId) return;
    const client = clients.find((c) => c.id === selectedId);
    if (client) {
      setFormClientName(client.name);
      setFormPAN(client.pan);
      setFormEntityType(client.entityType);
      setFormPhone(client.phone);
      if (client.entityType === 'Private Limited') setFormITRForm('ITR-6');
      else if (client.entityType === 'LLP' || client.entityType === 'Partnership') setFormITRForm('ITR-5');
      else setFormITRForm('ITR-3');
    }
  };

  // Submit New ITR Entry
  const handleSubmitAddITR = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formClientName.trim()) return;

    const taxAmountNumber = parseFloat(formTaxAmount) || 0;
    const finalTaxPosition = formIsRefund ? -Math.abs(taxAmountNumber) : Math.abs(taxAmountNumber);

    const newRecord: Omit<ITRFiling, 'id' | 'lastActivity'> = {
      clientId: `client-${Date.now()}`,
      clientName: formClientName.trim(),
      pan: formPAN.trim().toUpperCase() || 'AABCA0000A',
      entityType: formEntityType,
      itrForm: formITRForm,
      assessmentYear: formAY,
      financialYear: 'FY 2025-26',
      assignedStaffId: formStaffId,
      status: formStatus as ITRStatus,
      dueDate: formDueDate,
      regime: formRegime,
      taxLiabilityOrRefund: finalTaxPosition,
      acknowledgmentNo: formStatus === 'Filed & e-Verified' ? (formAckNo || `ACK982${Math.floor(100000000 + Math.random() * 900000000)}`) : undefined,
      phone: formPhone.trim() || '+91 98200 00000',
    };

    if (onAddITR) {
      onAddITR(newRecord);
    }

    // Reset Form
    setIsAddModalOpen(false);
    setFormClientName('');
    setFormPAN('');
    setFormTaxAmount('25000');
    setFormDueDate('2026-11-16');
  };

  // Submit Ack Modal
  const handleSubmitAck = (e: React.FormEvent) => {
    e.preventDefault();
    if (ackModalItem) {
      onUpdateITRStatus(ackModalItem.id, 'Filed & e-Verified', ackInput.trim() || undefined);
      setAckModalItem(null);
      setAckInput('');
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E5EA] dark:border-[#2C2C2E] pb-3">
        <div>
          <h1 className="text-[22px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight">
            Annual Tax Returns (ITR)
          </h1>
          <p className="text-[13px] text-[#6E6E73] dark:text-[#8E8E93] mt-0.5">
            Assessment Year 2026-27 • Statutory Deadline Tracking &amp; WhatsApp Coordination
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onResetToDefault && (
            <button
              onClick={onResetToDefault}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] bg-[#F2F2F7] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-[6px] transition-colors"
              title="Reset to the 6 Excel accounts"
            >
              <RefreshCw className="w-3.5 h-3.5 stroke-[1.5]" />
              <span className="hidden sm:inline">Reset 6 Records</span>
            </button>
          )}

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-white bg-[#0071E3] hover:bg-[#0077ED] rounded-[6px] transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2]" />
            <span>Add Return</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Strip - 4 Columns Across */}
      <div className="bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-[8px] overflow-hidden">
        <div className="grid grid-cols-4 divide-x divide-[#E5E5EA] dark:divide-[#2C2C2E] p-4">
          {/* Total Filings */}
          <button
            onClick={() => { setPriorityFilter('all'); setStatusFilter('all'); }}
            className="text-left group focus:outline-none pr-3 sm:pr-4"
          >
            <div className="text-[11px] sm:text-[12px] font-medium text-[#6E6E73] dark:text-[#8E8E93] truncate">Total Accounts</div>
            <div className="font-tabular text-[18px] sm:text-[22px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] mt-0.5">
              {itrFilings.length}
            </div>
            <div className="text-[11px] sm:text-[12px] text-[#6E6E73] dark:text-[#8E8E93] mt-1 group-hover:text-[#0071E3] dark:group-hover:text-[#2997FF] flex items-center gap-1 transition-colors truncate">
              <span>AY 2026-27 Master</span>
            </div>
          </button>

          {/* Overdue Filings */}
          <button
            onClick={() => { setPriorityFilter('overdue'); setStatusFilter('all'); }}
            className="text-left group focus:outline-none px-3 sm:px-4"
          >
            <div className="text-[11px] sm:text-[12px] font-medium text-[#FF3B30] truncate flex items-center gap-1">
              <span>Overdue Filings</span>
              {overdueCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-[#FF3B30] animate-pulse"></span>}
            </div>
            <div className={`font-tabular text-[18px] sm:text-[22px] font-semibold mt-0.5 ${overdueCount > 0 ? 'text-[#FF3B30]' : 'text-[#1D1D1F] dark:text-[#F5F5F7]'}`}>
              {overdueCount}
            </div>
            <div className="text-[11px] sm:text-[12px] text-[#FF3B30] mt-1 flex items-center gap-1 transition-colors truncate">
              <span>{overdueCount > 0 ? 'Top Priority • Action' : 'None overdue'}</span>
            </div>
          </button>

          {/* Due in <= 10 Days */}
          <button
            onClick={() => { setPriorityFilter('urgent'); setStatusFilter('all'); }}
            className="text-left group focus:outline-none px-3 sm:px-4"
          >
            <div className="text-[11px] sm:text-[12px] font-medium text-[#FF9500] truncate">Due in ≤ 10 Days</div>
            <div className="font-tabular text-[18px] sm:text-[22px] font-semibold text-[#FF9500] mt-0.5">
              {urgentCount}
            </div>
            <div className="text-[11px] sm:text-[12px] text-[#6E6E73] dark:text-[#8E8E93] mt-1 group-hover:text-[#0071E3] dark:group-hover:text-[#2997FF] flex items-center gap-1 transition-colors truncate">
              <span>Approaching cutoff</span>
            </div>
          </button>

          {/* Filed & Verified */}
          <button
            onClick={() => { setStatusFilter('Filed & e-Verified'); setPriorityFilter('all'); }}
            className="text-left group focus:outline-none pl-3 sm:pl-4"
          >
            <div className="text-[11px] sm:text-[12px] font-medium text-[#34C759] truncate">Filed &amp; Verified</div>
            <div className="font-tabular text-[18px] sm:text-[22px] font-semibold text-[#34C759] mt-0.5">
              {filedCount}
            </div>
            <div className="text-[11px] sm:text-[12px] text-[#34C759] mt-1 group-hover:text-[#0071E3] dark:group-hover:text-[#2997FF] flex items-center gap-1 transition-colors truncate">
              <span>{docsPendingCount} docs pending</span>
            </div>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#FFFFFF] dark:bg-[#1C1C1E] p-2.5 border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-[8px]">
        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-1">
          {[
            { id: 'all', label: 'All Accounts' },
            { id: 'Docs Pending', label: 'Docs Pending' },
            { id: 'Draft Computation', label: 'In Computation' },
            { id: 'Client Confirmed', label: 'Approved' },
            { id: 'Filed & e-Verified', label: 'Filed & Ack' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setStatusFilter(tab.id);
                setPriorityFilter('all');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 text-[12px] rounded-[5px] transition-colors ${
                statusFilter === tab.id && priorityFilter === 'all'
                  ? 'bg-[#0071E3] text-white font-medium'
                  : 'text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] hover:bg-[#F2F2F7] dark:hover:bg-[#242426]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Priority filter */}
          <select
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-2.5 py-1 bg-[#F2F2F7] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] text-[#1D1D1F] dark:text-[#F5F5F7] text-[12px] focus:outline-none"
          >
            <option value="all">All Priorities</option>
            <option value="overdue">🔴 Overdue First</option>
            <option value="urgent">🟠 Due in ≤ 10 Days</option>
            <option value="upcoming">Upcoming Filings</option>
            <option value="completed">🟢 Filed Returns</option>
          </select>

          {/* Search box */}
          <div className="flex items-center gap-1.5 bg-[#F2F2F7] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] px-2 py-1 rounded-[6px]">
            <Search className="w-3.5 h-3.5 text-[#6E6E73] dark:text-[#8E8E93] stroke-[1.5]" />
            <input
              type="text"
              placeholder="Search client, PAN, form..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="text-[12px] bg-transparent focus:outline-none placeholder:text-[#86868B] text-[#1D1D1F] dark:text-[#F5F5F7] w-32 sm:w-44"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-[#6E6E73]">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Table: Auto-Prioritized (Overdue on Top -> Due in 10 Days -> Upcoming -> Filed) */}
      <div className="bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-[8px] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px] border-collapse">
            <thead>
              <tr className="bg-[#FBFBFD] dark:bg-[#161618] text-[#6E6E73] dark:text-[#8E8E93] text-[12px] border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
                <th className="py-2.5 px-3 font-semibold min-w-[200px]">Client Account &amp; PAN</th>
                <th className="py-2.5 px-3 font-semibold">Entity &amp; Form</th>
                <th className="py-2.5 px-3 font-semibold">Target Cutoff &amp; Urgency</th>
                <th className="py-2.5 px-3 font-semibold">Tax Position</th>
                <th className="py-2.5 px-3 font-semibold">Assigned Staff</th>
                <th className="py-2.5 px-3 font-semibold">Filing Status</th>
                <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5EA] dark:divide-[#2C2C2E]">
              {paginatedList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#6E6E73] dark:text-[#8E8E93] text-[13px]">
                    No ITR returns match the selected filter.
                  </td>
                </tr>
              ) : (
                paginatedList.map((itr) => {
                  const staff = getStaff(itr.assignedStaffId);
                  const isRefund = itr.taxLiabilityOrRefund < 0;
                  const isOverdue = itr.meta.level === 'overdue';
                  const isUrgent = itr.meta.level === 'urgent';
                  const isFiled = itr.status === 'Filed & e-Verified';

                  return (
                    <tr 
                      key={itr.id} 
                      className={`transition-colors ${
                        isOverdue 
                          ? 'bg-[#FF3B30]/[0.03] hover:bg-[#FF3B30]/[0.06]' 
                          : isUrgent 
                          ? 'bg-[#FF9500]/[0.02] hover:bg-[#FF9500]/[0.05]' 
                          : 'hover:bg-[#F2F2F7] dark:hover:bg-[#242426]'
                      }`}
                    >
                      {/* Client Name & PAN */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          {isOverdue && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#FF3B30] shrink-0" title="Overdue return"></span>
                          )}
                          {isUrgent && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#FF9500] shrink-0" title="Due within 10 days"></span>
                          )}
                          <button
                            onClick={() => onSelectClient(itr.clientId)}
                            className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7] hover:text-[#0071E3] dark:hover:text-[#2997FF] hover:underline text-left truncate max-w-xs"
                          >
                            {itr.clientName}
                          </button>
                        </div>
                        <div className="font-tabular text-[11px] text-[#6E6E73] dark:text-[#8E8E93] ml-3.5">
                          PAN: <span className="font-mono">{itr.pan}</span> • {itr.assessmentYear}
                        </div>
                      </td>

                      {/* Entity & Form */}
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] block">
                          {itr.itrForm}
                        </span>
                        <span className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93]">
                          {itr.entityType}
                        </span>
                      </td>

                      {/* Target Cutoff & Dynamic Countdown */}
                      <td className="py-2.5 px-3 font-tabular">
                        <div className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
                          {formatReadableDate(itr.dueDate)}
                        </div>
                        <span className={`inline-block px-1.5 py-0.5 text-[10px] rounded border mt-0.5 ${itr.meta.badgeClass}`}>
                          {itr.meta.label}
                        </span>
                      </td>

                      {/* Tax Position */}
                      <td className="py-2.5 px-3 font-tabular">
                        {isRefund ? (
                          <span className="font-semibold text-[#34C759] block">
                            Refund: ₹{Math.abs(itr.taxLiabilityOrRefund).toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7] block">
                            Tax: ₹{itr.taxLiabilityOrRefund.toLocaleString('en-IN')}
                          </span>
                        )}
                        <span className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93]">
                          {itr.regime.includes('New') ? '115BAC (New)' : 'Old Regime'}
                        </span>
                      </td>

                      {/* Staff */}
                      <td className="py-2.5 px-3 text-[12px] text-[#1D1D1F] dark:text-[#F5F5F7]">
                        <div className="font-medium">{staff?.name || 'Unassigned'}</div>
                        <div className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93]">{itr.phone}</div>
                      </td>

                      {/* Filing Status Dropdown */}
                      <td className="py-2.5 px-3">
                        <select
                          value={itr.status}
                          onChange={(e) => {
                            const newSt = e.target.value as ITRStatus;
                            if (newSt === 'Filed & e-Verified') {
                              setAckModalItem(itr);
                              setAckInput(itr.acknowledgmentNo || `ACK982${Math.floor(100000000 + Math.random() * 900000000)}`);
                            } else {
                              onUpdateITRStatus(itr.id, newSt);
                            }
                          }}
                          className={`text-[12px] font-medium px-2 py-1 rounded-[5px] border focus:outline-none transition-colors ${
                            isFiled
                              ? 'bg-[#34C759]/10 text-[#34C759] border-[#34C759]/20'
                              : itr.status === 'Client Confirmed'
                              ? 'bg-[#0071E3]/10 text-[#0071E3] border-[#0071E3]/20'
                              : itr.status === 'Docs Pending'
                              ? 'bg-[#FF9500]/10 text-[#FF9500] border-[#FF9500]/20'
                              : 'bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] border-[#E5E5EA] dark:border-[#3A3A3C]'
                          }`}
                        >
                          <option value="Docs Pending">Docs Pending</option>
                          <option value="26AS Reconciled">26AS Done</option>
                          <option value="Draft Computation">In Computation</option>
                          <option value="Client Confirmed">Approved</option>
                          <option value="Filed & e-Verified">Filed &amp; Verified</option>
                        </select>

                        {itr.acknowledgmentNo && (
                          <div className="font-mono text-[10px] text-[#6E6E73] dark:text-[#8E8E93] mt-1 truncate max-w-[140px]" title={itr.acknowledgmentNo}>
                            Ack: {itr.acknowledgmentNo}
                          </div>
                        )}
                      </td>

                      {/* WhatsApp CTA & Actions */}
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* WhatsApp CTA Button */}
                          <button
                            type="button"
                            onClick={() => onOpenWhatsApp(itr)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-[#25D366] bg-[#25D366]/10 hover:bg-[#25D366]/20 rounded-[5px] transition-colors"
                            title="Open WhatsApp templates for this client"
                          >
                            <MessageSquare className="w-3.5 h-3.5 stroke-[1.5]" />
                            <span>WhatsApp</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onSelectClient(itr.clientId)}
                            className="p-1 text-[#6E6E73] hover:text-[#0071E3] dark:hover:text-[#2997FF] rounded transition-colors"
                            title="View client account"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5 stroke-[1.5]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination & Status Footer */}
        <div className="px-3 py-2.5 border-t border-[#E5E5EA] dark:border-[#2C2C2E] bg-[#FBFBFD] dark:bg-[#161618] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[12px] text-[#6E6E73] dark:text-[#8E8E93]">
          <div className="flex items-center gap-2">
            <span className="font-tabular font-medium">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredList.length)} of {filteredList.length} accounts
            </span>
            <span className="hidden sm:inline">• Automatically prioritized by urgency (Overdue &rarr; Due in 10 Days &rarr; Upcoming)</span>
          </div>

          <div className="flex items-center gap-1 font-tabular self-end sm:self-auto">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="p-1 border border-[#E5E5EA] dark:border-[#2C2C2E] rounded hover:bg-white dark:hover:bg-[#2C2C2E] disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-3.5 h-3.5 stroke-[1.5]" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-5 h-5 rounded text-[11px] font-medium ${
                  currentPage === page
                    ? 'bg-[#0071E3] text-white'
                    : 'text-[#6E6E73] dark:text-[#8E8E93] hover:bg-white dark:hover:bg-[#2C2C2E]'
                }`}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1 border border-[#E5E5EA] dark:border-[#2C2C2E] rounded hover:bg-white dark:hover:bg-[#2C2C2E] disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-3.5 h-3.5 stroke-[1.5]" />
            </button>
          </div>
        </div>
      </div>

      {/* MODAL: Add New Annual Return (Saved to local DB & state) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div 
            className="w-full max-w-lg bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-[10px] shadow-2xl p-5 space-y-4 text-[13px] animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E5E5EA] dark:border-[#2C2C2E] pb-3">
              <div>
                <h3 className="text-[16px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                  Add Annual Return (ITR)
                </h3>
                <p className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93] mt-0.5">
                  Creates an annual filing entry with dynamic countdown and WhatsApp notifications
                </p>
              </div>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="text-[#6E6E73] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]"
              >
                <X className="w-4 h-4 stroke-[1.5]" />
              </button>
            </div>

            <form onSubmit={handleSubmitAddITR} className="space-y-3.5">
              {/* Client Pre-select or Manual Name */}
              {clients.length > 0 && (
                <div>
                  <label className="block text-[11px] font-semibold text-[#86868B] uppercase mb-1">
                    Select Registered Client (Optional autofill)
                  </label>
                  <select
                    onChange={handleSelectPredefinedClient}
                    className="w-full px-2.5 py-1.5 bg-[#F2F2F7] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] text-[#1D1D1F] dark:text-[#F5F5F7] text-[13px] focus:outline-none"
                  >
                    <option value="">-- Choose from existing clients --</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.pan})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#86868B] uppercase mb-1">
                    Client / Trade Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Havos (P) Ltd"
                    value={formClientName}
                    onChange={(e) => setFormClientName(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#F2F2F7] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] text-[#1D1D1F] dark:text-[#F5F5F7] text-[13px] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#86868B] uppercase mb-1">
                    PAN Number *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    placeholder="e.g. AABCH4910K"
                    value={formPAN}
                    onChange={(e) => setFormPAN(e.target.value.toUpperCase())}
                    className="w-full px-2.5 py-1.5 bg-[#F2F2F7] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] text-[#1D1D1F] dark:text-[#F5F5F7] text-[13px] font-mono uppercase focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#86868B] uppercase mb-1">
                    Entity Type
                  </label>
                  <select
                    value={formEntityType}
                    onChange={(e) => setFormEntityType(e.target.value as EntityType)}
                    className="w-full px-2.5 py-1.5 bg-[#F2F2F7] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] text-[#1D1D1F] dark:text-[#F5F5F7] text-[12px] focus:outline-none"
                  >
                    <option value="Private Limited">Private Limited</option>
                    <option value="Partnership">Partnership</option>
                    <option value="LLP">LLP</option>
                    <option value="Proprietorship">Proprietorship</option>
                    <option value="Individual">Individual</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#86868B] uppercase mb-1">
                    ITR Form
                  </label>
                  <select
                    value={formITRForm}
                    onChange={(e) => setFormITRForm(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 bg-[#F2F2F7] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] text-[#1D1D1F] dark:text-[#F5F5F7] text-[12px] focus:outline-none"
                  >
                    <option value="ITR-6">ITR-6 (Company)</option>
                    <option value="ITR-5">ITR-5 (LLP/Firm)</option>
                    <option value="ITR-4">ITR-4 (Presumptive)</option>
                    <option value="ITR-3">ITR-3 (Business)</option>
                    <option value="ITR-2">ITR-2 (Capital Gains)</option>
                    <option value="ITR-1">ITR-1 (Salaried)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#86868B] uppercase mb-1">
                    Assessment Year
                  </label>
                  <select
                    value={formAY}
                    onChange={(e) => setFormAY(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#F2F2F7] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] text-[#1D1D1F] dark:text-[#F5F5F7] text-[12px] focus:outline-none"
                  >
                    <option value="AY 2026-27">AY 2026-27</option>
                    <option value="AY 2027-28">AY 2027-28 (Next Year)</option>
                  </select>
                </div>
              </div>

              {/* Target Cutoff Date (e.g. Nov 16) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#86868B] uppercase mb-1 flex items-center justify-between">
                    <span>Target Filing Date *</span>
                    <span className="text-[10px] text-[#0071E3] font-normal">e.g. 2026-11-16</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#F2F2F7] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] text-[#1D1D1F] dark:text-[#F5F5F7] text-[13px] focus:outline-none font-tabular"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#86868B] uppercase mb-1">
                    WhatsApp Phone
                  </label>
                  <input
                    type="text"
                    placeholder="+91 98470 12345"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#F2F2F7] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] text-[#1D1D1F] dark:text-[#F5F5F7] text-[13px] focus:outline-none font-tabular"
                  />
                </div>
              </div>

              {/* Tax Position & Regime */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-[#86868B] uppercase">
                      Tax Position (₹)
                    </label>
                    <div className="flex items-center gap-1 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setFormIsRefund(false)}
                        className={`px-1.5 py-0.2 rounded text-[10px] ${!formIsRefund ? 'bg-[#0071E3] text-white' : 'text-[#6E6E73]'}`}
                      >
                        Tax
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormIsRefund(true)}
                        className={`px-1.5 py-0.2 rounded text-[10px] ${formIsRefund ? 'bg-[#34C759] text-white' : 'text-[#6E6E73]'}`}
                      >
                        Refund
                      </button>
                    </div>
                  </div>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formTaxAmount}
                    onChange={(e) => setFormTaxAmount(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#F2F2F7] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] text-[#1D1D1F] dark:text-[#F5F5F7] text-[13px] font-tabular focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#86868B] uppercase mb-1">
                    Tax Regime
                  </label>
                  <select
                    value={formRegime}
                    onChange={(e) => setFormRegime(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 bg-[#F2F2F7] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] text-[#1D1D1F] dark:text-[#F5F5F7] text-[12px] focus:outline-none"
                  >
                    <option value="New Regime (115BAC)">New Regime (Sec 115BAC)</option>
                    <option value="Old Regime">Old Tax Regime</option>
                  </select>
                </div>
              </div>

              {/* Staff & Initial Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#86868B] uppercase mb-1">
                    Assign Staff Member
                  </label>
                  <select
                    value={formStaffId}
                    onChange={(e) => setFormStaffId(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#F2F2F7] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] text-[#1D1D1F] dark:text-[#F5F5F7] text-[12px] focus:outline-none"
                  >
                    {staffList.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#86868B] uppercase mb-1">
                    Initial Workflow Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 bg-[#F2F2F7] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] text-[#1D1D1F] dark:text-[#F5F5F7] text-[12px] focus:outline-none"
                  >
                    <option value="Draft Computation">In Computation</option>
                    <option value="Docs Pending">Docs Pending</option>
                    <option value="26AS Reconciled">26AS Done</option>
                    <option value="Client Confirmed">Approved</option>
                    <option value="Filed & e-Verified">Filed &amp; Verified</option>
                  </select>
                </div>
              </div>

              {formStatus === 'Filed & e-Verified' && (
                <div>
                  <label className="block text-[11px] font-semibold text-[#86868B] uppercase mb-1">
                    ITR-V Acknowledgment Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ACK982001245901"
                    value={formAckNo}
                    onChange={(e) => setFormAckNo(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#F2F2F7] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] text-[#1D1D1F] dark:text-[#F5F5F7] text-[13px] font-mono focus:outline-none"
                  />
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#E5E5EA] dark:border-[#2C2C2E]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 text-[13px] text-[#6E6E73] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-[13px] font-medium text-white bg-[#0071E3] hover:bg-[#0077ED] rounded-[6px] transition-colors"
                >
                  Save to Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Record Filing Acknowledgment */}
      {ackModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div 
            className="w-full max-w-md bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-[10px] shadow-2xl p-5 space-y-4 text-[13px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E5E5EA] dark:border-[#2C2C2E] pb-3">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-[#34C759]" strokeWidth={2} />
                <h3 className="text-[15px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                  Mark Return as Filed &amp; e-Verified
                </h3>
              </div>
              <button onClick={() => setAckModalItem(null)} className="text-[#6E6E73]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitAck} className="space-y-3">
              <p className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93]">
                Enter the official Income Tax portal ITR-V acknowledgment reference for <strong className="text-[#1D1D1F] dark:text-[#F5F5F7]">{ackModalItem.clientName}</strong>.
              </p>

              <div>
                <label className="block text-[11px] font-semibold text-[#86868B] uppercase mb-1">
                  ITR-V Acknowledgment Number
                </label>
                <input
                  type="text"
                  required
                  value={ackInput}
                  onChange={(e) => setAckInput(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#F2F2F7] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] text-[#1D1D1F] dark:text-[#F5F5F7] text-[13px] font-mono focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#E5E5EA] dark:border-[#2C2C2E]">
                <button
                  type="button"
                  onClick={() => setAckModalItem(null)}
                  className="px-3 py-1.5 text-[12px] text-[#6E6E73]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 text-[12px] font-medium text-white bg-[#34C759] hover:bg-[#30B753] rounded-[6px] transition-colors"
                >
                  Confirm &amp; Complete
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
