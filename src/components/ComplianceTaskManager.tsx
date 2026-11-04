import React, { useState } from 'react';
import { 
  MessageSquare, 
  ChevronLeft, 
  ChevronRight, 
  ArrowUpRight, 
  Search, 
  Copy, 
  Check, 
  ChevronDown 
} from 'lucide-react';
import { MonthlyTask, StaffMember, FilingStatus } from '../types/crm';

interface ComplianceTaskManagerProps {
  tasks: MonthlyTask[];
  staffList: StaffMember[];
  selectedStaffId: string | null;
  filingTypes?: string[];
  onUpdateStatus: (taskId: string, newStatus: FilingStatus) => void;
  onOpenWhatsApp: (task: MonthlyTask) => void;
  onSelectClient: (clientId: string) => void;
}

const ALL_STATUSES: FilingStatus[] = [
  'Docs Pending',
  'In Progress',
  'Draft Ready',
  'Filed',
  'Overdue',
];

export const ComplianceTaskManager: React.FC<ComplianceTaskManagerProps> = ({
  tasks,
  staffList,
  selectedStaffId,
  filingTypes = ['GSTR-1 (Sales)', 'GSTR-3B (Summary)', 'Statutory Audit', 'TDS Payment', 'PF & ESI', 'CMP-08', 'IFF'],
  onUpdateStatus,
  onOpenWhatsApp,
  onSelectClient,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [filingTypeFilter, setFilingTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('Oct 2026');
  const [staffFilterState, setStaffFilterState] = useState<string>(selectedStaffId || 'all');
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [openStatusMenuId, setOpenStatusMenuId] = useState<string | null>(null);
  const [copiedArn, setCopiedArn] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 12;

  const periods = ['Aug 2026', 'Sep 2026', 'Oct 2026', 'Nov 2026'];

  const handlePeriodPrev = () => {
    const idx = periods.indexOf(selectedPeriod);
    if (idx > 0) setSelectedPeriod(periods[idx - 1]);
  };

  const handlePeriodNext = () => {
    const idx = periods.indexOf(selectedPeriod);
    if (idx < periods.length - 1) setSelectedPeriod(periods[idx + 1]);
  };

  // Filter tasks
  const effectiveStaffFilter = selectedStaffId || (staffFilterState !== 'all' ? staffFilterState : null);

  const filteredTasks = tasks.filter((task) => {
    if (effectiveStaffFilter && task.assignedStaffId !== effectiveStaffFilter) return false;
    if (statusFilter !== 'all' && task.status !== statusFilter) return false;
    if (filingTypeFilter !== 'all') {
      const fNorm = filingTypeFilter.toLowerCase();
      const tNorm = task.filingType.toLowerCase();
      if (tNorm !== fNorm && !fNorm.includes(tNorm) && !tNorm.includes(fNorm)) return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        task.clientName.toLowerCase().includes(q) ||
        task.tradeName.toLowerCase().includes(q) ||
        task.gstin.toLowerCase().includes(q) ||
        task.filingType.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage) || 1;
  const paginatedTasks = filteredTasks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getStaff = (id: string) => staffList.find((s) => s.id === id);

  // Tab counts
  const countForStatus = (status: string) => {
    return tasks.filter((t) => {
      if (effectiveStaffFilter && t.assignedStaffId !== effectiveStaffFilter) return false;
      if (status === 'all') return true;
      return t.status === status;
    }).length;
  };

  const tabs = [
    { id: 'all', label: 'All', count: countForStatus('all') },
    { id: 'Docs Pending', label: 'Docs Pending', count: countForStatus('Docs Pending') },
    { id: 'In Progress', label: 'In Progress', count: countForStatus('In Progress') },
    { id: 'Draft Ready', label: 'Draft Ready', count: countForStatus('Draft Ready') },
    { id: 'Filed', label: 'Filed', count: countForStatus('Filed') },
    { id: 'Overdue', label: 'Overdue', count: countForStatus('Overdue') },
  ];

  // Bulk Selection
  const allCurrentSelected = paginatedTasks.length > 0 && paginatedTasks.every((t) => selectedTaskIds.includes(t.id));

  const toggleSelectAll = () => {
    if (allCurrentSelected) {
      setSelectedTaskIds((prev) => prev.filter((id) => !paginatedTasks.some((t) => t.id === id)));
    } else {
      const pageIds = paginatedTasks.map((t) => t.id);
      setSelectedTaskIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const toggleSelectRow = (taskId: string) => {
    setSelectedTaskIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  const handleBulkStatusUpdate = (status: FilingStatus) => {
    selectedTaskIds.forEach((id) => onUpdateStatus(id, status));
    setSelectedTaskIds([]);
  };

  const handleCopyArn = (arn: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(arn);
    setCopiedArn(arn);
    setTimeout(() => setCopiedArn(null), 1800);
  };

  const formatHumanReadableDate = (dateStr: string) => {
    if (!dateStr) return '';
    if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const d = new Date(year, month, day);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        }
      }
    }
    return dateStr;
  };

  const getStatusBadge = (status: FilingStatus) => {
    switch (status) {
      case 'Filed':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 text-[11px] font-medium text-[#16A34A] dark:text-[#34C759] bg-[#16A34A]/10 rounded-[4px]">
            Filed
          </span>
        );
      case 'Draft Ready':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 text-[11px] font-medium text-[#0071E3] dark:text-[#2997FF] bg-[#0071E3]/10 rounded-[4px]">
            Draft Ready
          </span>
        );
      case 'In Progress':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 text-[11px] font-medium text-[#6E6E73] dark:text-[#8E8E93] bg-[#F2F2F7] dark:bg-[#2C2C2E] rounded-[4px]">
            In Progress
          </span>
        );
      case 'Docs Pending':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 text-[11px] font-medium text-[#D97706] dark:text-[#FF9F0A] bg-[#D97706]/10 rounded-[4px]">
            Docs Pending
          </span>
        );
      case 'Overdue':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 text-[11px] font-medium text-[#DC2626] bg-[#DC2626]/10 rounded-[4px]">
            Overdue
          </span>
        );
    }
  };

  const renderDueDateCell = (task: MonthlyTask) => {
    const formatted = formatHumanReadableDate(task.dueDate);

    if (task.status === 'Filed') {
      return (
        <span className="text-[13px] font-medium text-[#8E8E93] dark:text-[#6E6E73]">
          {formatted}
        </span>
      );
    }

    if (task.daysRemaining < 0) {
      return (
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] font-medium text-[#18181B] dark:text-[#F5F5F7]">
            {formatted}
          </span>
          <span className="font-mono tabular-nums text-[11px] font-medium px-1.5 py-0.2 rounded-[4px] bg-[#DC2626]/10 text-[#DC2626]">
            {Math.abs(task.daysRemaining)}d late
          </span>
        </div>
      );
    }

    if (task.daysRemaining <= 5) {
      return (
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] font-medium text-[#18181B] dark:text-[#F5F5F7]">
            {formatted}
          </span>
          <span className="font-mono tabular-nums text-[11px] font-medium px-1.5 py-0.2 rounded-[4px] bg-[#D97706]/10 text-[#D97706] dark:text-[#FF9F0A]">
            Due in {task.daysRemaining}d
          </span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1.5">
        <span className="text-[13px] font-medium text-[#18181B] dark:text-[#F5F5F7]">
          {formatted}
        </span>
        <span className="font-mono tabular-nums text-[11px] text-[#6E6E73] dark:text-[#8E8E93]">
          In {task.daysRemaining}d
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* 1. Direct Page Header (Starts directly with Monthly Work, no outer wrapper) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <h1 className="text-[18px] font-semibold text-[#09090B] dark:text-[#F5F5F7] tracking-tight">
            Monthly Work (GST &amp; Audit)
          </h1>
          <p className="text-[12.5px] text-[#4B5563] dark:text-[#8E8E93] mt-0.5">
            {tasks.length} clients • Monthly GST and TDS filings
          </p>
        </div>

        {/* Top-Right: Compact Period Switcher & Clean Staff Dropdown */}
        <div className="flex items-center gap-2">
          {/* Period Switcher */}
          <div className="flex items-center border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-[6px] bg-white dark:bg-[#1C1C1E] h-8 px-1 text-[12px]">
            <button
              onClick={handlePeriodPrev}
              disabled={periods.indexOf(selectedPeriod) === 0}
              className="p-1 text-[#6E6E73] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Previous period"
            >
              <ChevronLeft className="w-3.5 h-3.5 stroke-[1.5]" />
            </button>
            <span className="font-mono tabular-nums px-2 font-medium text-[#09090B] dark:text-[#F5F5F7]">
              {selectedPeriod}
            </span>
            <button
              onClick={handlePeriodNext}
              disabled={periods.indexOf(selectedPeriod) === periods.length - 1}
              className="p-1 text-[#6E6E73] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Next period"
            >
              <ChevronRight className="w-3.5 h-3.5 stroke-[1.5]" />
            </button>
          </div>

          {/* Clean Staff Dropdown: "All Staff", "Susmi", "Ameen" */}
          {!selectedStaffId && (
            <select
              value={staffFilterState}
              onChange={(e) => {
                setStaffFilterState(e.target.value);
                setCurrentPage(1);
              }}
              className="h-8 px-2.5 bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-[6px] text-[#09090B] dark:text-[#F5F5F7] text-[12px] font-medium focus:outline-none"
            >
              <option value="all">All Staff</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Bulk Action Strip (Appears when checkboxes are selected) */}
      {selectedTaskIds.length > 0 && (
        <div className="px-3.5 py-2 rounded-[6px] bg-[#F2F2F7] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#2C2C2E] flex items-center justify-between text-[12px] animate-in fade-in duration-100">
          <span className="font-medium text-[#09090B] dark:text-[#F5F5F7]">
            {selectedTaskIds.length} {selectedTaskIds.length === 1 ? 'task' : 'tasks'} selected
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[#6E6E73] dark:text-[#8E8E93]">Mark selected as:</span>
            <button
              onClick={() => handleBulkStatusUpdate('Draft Ready')}
              className="px-2 py-1 text-[11px] font-medium bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-[4px] hover:bg-[#E5E5EA] dark:hover:bg-[#3A3A3C] transition-colors"
            >
              Draft Ready
            </button>
            <button
              onClick={() => handleBulkStatusUpdate('Filed')}
              className="px-2 py-1 text-[11px] font-medium bg-[#0071E3] hover:bg-[#0077ED] text-white rounded-[4px] transition-colors"
            >
              Filed
            </button>
            <button
              onClick={() => setSelectedTaskIds([])}
              className="px-2 py-1 text-[11px] text-[#6E6E73] hover:text-[#09090B] dark:hover:text-[#F5F5F7]"
            >
              Deselect
            </button>
          </div>
        </div>
      )}

      {/* 2 & 6. Flush Toolbar & Table Container */}
      <div className="bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-[8px] overflow-hidden shadow-sm">
        {/* Flush Toolbar inside Card Header */}
        <div className="px-3.5 pt-2 flex flex-col lg:flex-row lg:items-center justify-between gap-2 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
          {/* Underline Tabs */}
          <div className="flex items-center gap-5 text-[13px] overflow-x-auto -mb-[1px]">
            {tabs.map((tab) => {
              const isActive = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setStatusFilter(tab.id);
                    setCurrentPage(1);
                  }}
                  className={`pb-2.5 font-medium transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                    isActive
                      ? 'border-[#09090B] dark:border-[#F5F5F7] text-[#09090B] dark:text-[#F5F5F7]'
                      : 'border-transparent text-[#6E6E73] hover:text-[#09090B] dark:hover:text-[#F5F5F7]'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className="font-mono tabular-nums text-[11px] px-1.5 py-0.2 rounded-[4px] bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#6E6E73] dark:text-[#8E8E93]">
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search & Filing Type Filter */}
          <div className="flex items-center gap-2 pb-2 lg:pb-0">
            <select
              value={filingTypeFilter}
              onChange={(e) => {
                setFilingTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="h-7 px-2 bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-[5px] text-[#18181B] dark:text-[#F5F5F7] text-[11.5px] font-medium focus:outline-none"
            >
              <option value="all">All Returns</option>
              {filingTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>

            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 absolute left-2 text-[#86868B] stroke-[1.5]" />
              <input
                type="text"
                placeholder="Search clients..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-7 pl-7 pr-2.5 text-[11.5px] bg-[#F2F2F7] dark:bg-[#242426] border border-transparent focus:border-[#0071E3] rounded-[5px] text-[#09090B] dark:text-[#F5F5F7] placeholder-[#86868B] focus:outline-none w-32 sm:w-40 font-medium"
              />
            </div>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px] border-collapse">
            <thead>
              <tr className="bg-[#FBFBFD] dark:bg-[#161618] text-[#6E6E73] dark:text-[#8E8E93] text-[11px] uppercase tracking-[0.04em] border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
                <th className="py-2 pl-3.5 pr-2 w-8 text-center">
                  <input
                    type="checkbox"
                    checked={allCurrentSelected}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded-[4px] border border-[#D1D1D6] bg-white accent-[#0071E3] cursor-pointer focus:ring-0"
                  />
                </th>
                <th className="py-2 px-3.5 font-semibold min-w-[200px]">Client / GSTIN</th>
                <th className="py-2 px-3.5 font-semibold">Return Type</th>
                <th className="py-2 px-3.5 font-semibold">Staff</th>
                <th className="py-2 px-3.5 font-semibold">Due Date</th>
                <th className="py-2 px-3.5 font-semibold">Status</th>
                <th className="py-2 px-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5EA] dark:divide-[#2C2C2E]">
              {paginatedTasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#6E6E73] dark:text-[#8E8E93] text-[13px]">
                    No monthly tasks match the current filter.
                  </td>
                </tr>
              ) : (
                paginatedTasks.map((task) => {
                  const staff = getStaff(task.assignedStaffId);
                  const isSelected = selectedTaskIds.includes(task.id);
                  const isFiled = task.status === 'Filed';

                  return (
                    <tr 
                      key={task.id} 
                      className={`hover:bg-[#F2F2F7] dark:hover:bg-[#242426] transition-colors group ${
                        isSelected ? 'bg-[#0071E3]/5 dark:bg-[#0071E3]/10' : ''
                      }`}
                    >
                      {/* 3. Explicit Checkbox styling (clean white with grey border, accent blue) */}
                      <td className="py-2 pl-3.5 pr-2 text-center align-middle">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRow(task.id)}
                          className="h-4 w-4 rounded-[4px] border border-[#D1D1D6] bg-white accent-[#0071E3] cursor-pointer focus:ring-0"
                        />
                      </td>

                      {/* 5. Calibrated Client Name & GSTIN Typography */}
                      <td className="py-2 px-3.5 align-middle">
                        <button
                          onClick={() => onSelectClient(task.clientId)}
                          className="font-semibold text-[13.5px] text-[#09090B] dark:text-[#F5F5F7] hover:text-[#0071E3] dark:hover:text-[#2997FF] hover:underline text-left block truncate max-w-xs"
                        >
                          {task.tradeName}
                        </button>
                        <div className="font-mono text-[11.5px] text-[#6E6E73] dark:text-[#8E8E93] tracking-tight mt-0.5">
                          {task.gstin}
                        </div>
                      </td>

                      {/* 4. Return Type Only (No duplicate "October 2026") */}
                      <td className="py-2 px-3.5 align-middle">
                        <span className="text-[13px] font-medium text-[#18181B] dark:text-[#F5F5F7]">
                          {task.filingType}
                        </span>
                      </td>

                      {/* Staff */}
                      <td className="py-2 px-3.5 align-middle text-[12.5px] font-medium text-[#18181B] dark:text-[#F5F5F7]">
                        {staff?.name || 'Unassigned'}
                      </td>

                      {/* 5. Human-readable Due Date (e.g. 20 Nov 2026, muted if filed) */}
                      <td className="py-2 px-3.5 align-middle">
                        {renderDueDateCell(task)}
                      </td>

                      {/* Status & Portal ARN */}
                      <td className="py-2 px-3.5 align-middle">
                        <div className="flex flex-wrap items-center gap-1.5 relative">
                          {/* Inline Clickable Status Badge */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setOpenStatusMenuId(openStatusMenuId === task.id ? null : task.id)}
                              className="inline-flex items-center gap-1 hover:opacity-80 transition-opacity"
                              title="Click to update status"
                            >
                              {getStatusBadge(task.status)}
                              <ChevronDown className="w-2.5 h-2.5 text-[#86868B] opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>

                            {/* Compact Popover */}
                            {openStatusMenuId === task.id && (
                              <>
                                <div 
                                  className="fixed inset-0 z-30" 
                                  onClick={() => setOpenStatusMenuId(null)}
                                />
                                <div className="absolute left-0 mt-1 w-32 bg-white dark:bg-[#1C1C1E] rounded-[6px] border border-[#E5E5EA] dark:border-[#2C2C2E] shadow-xl z-40 p-1 text-[11.5px] animate-in fade-in duration-75">
                                  {ALL_STATUSES.map((st) => (
                                    <button
                                      key={st}
                                      onClick={() => {
                                        onUpdateStatus(task.id, st);
                                        setOpenStatusMenuId(null);
                                      }}
                                      className={`w-full text-left px-2 py-1 rounded-[4px] transition-colors flex items-center justify-between ${
                                        task.status === st 
                                          ? 'bg-[#F2F2F7] dark:bg-[#2C2C2E] font-semibold text-[#09090B] dark:text-[#F5F5F7]' 
                                          : 'text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#09090B] dark:hover:text-[#F5F5F7] hover:bg-[#F2F2F7] dark:hover:bg-[#242426]'
                                      }`}
                                    >
                                      <span>{st}</span>
                                      {task.status === st && <Check className="w-3 h-3 text-[#0071E3]" />}
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>

                          {/* Portal ARN Badge */}
                          {task.arnNumber && (
                            <div 
                              onClick={(e) => handleCopyArn(task.arnNumber!, e)}
                              className="group/arn inline-flex items-center gap-1 font-mono tabular-nums text-[11px] text-[#6E6E73] dark:text-[#8E8E93] bg-[#F2F2F7] dark:bg-[#2C2C2E] px-1.5 py-0.5 rounded-[4px] cursor-pointer hover:text-[#09090B] dark:hover:text-[#F5F5F7] transition-colors"
                              title={`Click to copy: ${task.arnNumber}`}
                            >
                              <span>ARN: {task.arnNumber.slice(-8)}</span>
                              {copiedArn === task.arnNumber ? (
                                <Check className="w-3 h-3 text-[#16A34A]" />
                              ) : (
                                <Copy className="w-3 h-3 opacity-0 group-hover/arn:opacity-100 transition-opacity" />
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Contextual Row Actions */}
                      <td className="py-2 px-3.5 align-middle text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onOpenWhatsApp(task)}
                            className="h-7 px-2 border border-[#E5E5EA] dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] hover:bg-[#F2F2F7] dark:hover:bg-[#242426] text-[#18181B] dark:text-[#F5F5F7] rounded-[5px] flex items-center gap-1 transition-colors text-[11px] font-medium"
                            title={isFiled ? 'Share filing acknowledgment via WhatsApp' : 'Send WhatsApp reminder'}
                          >
                            <MessageSquare className="w-3 h-3 text-[#16A34A] dark:text-[#34C759]" strokeWidth={1.5} />
                            <span>{isFiled ? 'Send Receipt' : 'Remind'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onSelectClient(task.clientId)}
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

        {/* Pagination Bar */}
        <div className="px-3.5 py-2 border-t border-[#E5E5EA] dark:border-[#2C2C2E] bg-[#FBFBFD] dark:bg-[#161618] flex items-center justify-between text-[12px] text-[#6E6E73] dark:text-[#8E8E93]">
          <span className="font-mono tabular-nums">
            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredTasks.length)} of {filteredTasks.length}
          </span>

          <div className="flex items-center gap-1 font-mono tabular-nums">
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
    </div>
  );
};
