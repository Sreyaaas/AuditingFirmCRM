import React, { useState } from 'react';
import { 
  MessageSquare, 
  ChevronLeft, 
  ChevronRight, 
  ArrowUpRight,
  Search
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
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 12;

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    if (selectedStaffId && task.assignedStaffId !== selectedStaffId) return false;
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

  const getStatusBadge = (status: FilingStatus) => {
    switch (status) {
      case 'Filed':
        return (
          <span className="inline-block px-2 py-0.5 text-[11px] font-medium text-[#34C759] bg-[#34C759]/10 rounded-[4px]">
            Filed
          </span>
        );
      case 'Draft Ready':
        return (
          <span className="inline-block px-2 py-0.5 text-[11px] font-medium text-[#0071E3] dark:text-[#2997FF] bg-[#0071E3]/10 rounded-[4px]">
            Draft Ready
          </span>
        );
      case 'In Progress':
        return (
          <span className="inline-block px-2 py-0.5 text-[11px] font-medium text-[#6E6E73] dark:text-[#8E8E93] bg-[#F2F2F7] dark:bg-[#2C2C2E] rounded-[4px]">
            In Progress
          </span>
        );
      case 'Docs Pending':
        return (
          <span className="inline-block px-2 py-0.5 text-[11px] font-medium text-[#FF9500] bg-[#FF9500]/10 rounded-[4px]">
            Docs Pending
          </span>
        );
      case 'Overdue':
        return (
          <span className="inline-block px-2 py-0.5 text-[11px] font-medium text-[#FF3B30] bg-[#FF3B30]/10 rounded-[4px]">
            Overdue
          </span>
        );
    }
  };

  const getDueDateCell = (task: MonthlyTask) => {
    if (task.status === 'Filed') {
      return (
        <div>
          <span className="font-tabular text-[12px] text-[#6E6E73] dark:text-[#8E8E93]">{task.dueDate}</span>
          <span className="font-tabular text-[11px] text-[#34C759] block">
            {task.arnNumber ? `ARN: ${task.arnNumber.slice(-8)}` : 'Completed'}
          </span>
        </div>
      );
    }

    if (task.daysRemaining < 0) {
      return (
        <div>
          <span className="font-tabular text-[12px] font-semibold text-[#FF3B30]">{task.dueDate}</span>
          <span className="font-tabular text-[11px] text-[#FF3B30] block">
            {Math.abs(task.daysRemaining)}d overdue
          </span>
        </div>
      );
    }

    if (task.daysRemaining <= 3) {
      return (
        <div>
          <span className="font-tabular text-[12px] font-semibold text-[#FF9500]">{task.dueDate}</span>
          <span className="font-tabular text-[11px] text-[#FF9500] block">
            Due in {task.daysRemaining}d
          </span>
        </div>
      );
    }

    return (
      <div>
        <span className="font-tabular text-[12px] text-[#1D1D1F] dark:text-[#F5F5F7]">{task.dueDate}</span>
        <span className="font-tabular text-[11px] text-[#6E6E73] dark:text-[#8E8E93] block">
          In {task.daysRemaining}d
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E5EA] dark:border-[#2C2C2E] pb-3">
        <div>
          <h1 className="text-[22px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight">
            Monthly Work (GST &amp; Audit)
          </h1>
          <p className="text-[13px] text-[#6E6E73] dark:text-[#8E8E93] mt-0.5">
            {tasks.length} client accounts • October 2026 filings
          </p>
        </div>

        <div className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93] font-tabular">
          {filteredTasks.length} accounts in queue
        </div>
      </div>

      {/* Segmented Filter Control */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#F2F2F7] dark:bg-[#1C1C1E] p-1 rounded-[8px]">
        <div className="flex flex-wrap items-center gap-1">
          {[
            { id: 'all', label: 'All Accounts' },
            { id: 'Filed', label: 'Filed' },
            { id: 'Draft Ready', label: 'Draft Ready' },
            { id: 'In Progress', label: 'In Progress' },
            { id: 'Docs Pending', label: 'Docs Pending' },
            { id: 'Overdue', label: 'Overdue' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setStatusFilter(tab.id);
                setCurrentPage(1);
              }}
              className={`px-3 py-1 text-[13px] rounded-[6px] transition-all ${
                statusFilter === tab.id
                  ? 'bg-[#FFFFFF] dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] font-semibold shadow-sm'
                  : 'text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#1D1D1F]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filingTypeFilter}
            onChange={(e) => {
              setFilingTypeFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-2.5 py-1 bg-[#FFFFFF] dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] text-[#1D1D1F] dark:text-[#F5F5F7] text-[12px] focus:outline-none"
          >
            <option value="all">All Filing Types</option>
            {filingTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          <div className="flex items-center gap-1.5 bg-[#FFFFFF] dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#3A3A3C] px-2 py-1 rounded-[6px]">
            <Search className="w-3.5 h-3.5 text-[#6E6E73] dark:text-[#8E8E93] stroke-[1.5]" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="text-[12px] bg-transparent focus:outline-none placeholder:text-[#86868B] text-[#1D1D1F] dark:text-[#F5F5F7] w-28 sm:w-36"
            />
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-[8px] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[14px] border-collapse">
            <thead>
              <tr className="bg-[#FBFBFD] dark:bg-[#161618] text-[#6E6E73] dark:text-[#8E8E93] text-[11px] uppercase tracking-[0.04em] border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
                <th className="py-2 px-3.5 font-semibold min-w-[200px]">Client / GSTIN</th>
                <th className="py-2 px-3.5 font-semibold">Filing &amp; Period</th>
                <th className="py-2 px-3.5 font-semibold">Staff</th>
                <th className="py-2 px-3.5 font-semibold">Due Date</th>
                <th className="py-2 px-3.5 font-semibold">Status</th>
                <th className="py-2 px-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5EA] dark:divide-[#2C2C2E]">
              {paginatedTasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#6E6E73] dark:text-[#8E8E93] text-[13px]">
                    No monthly tasks match the current filter.
                  </td>
                </tr>
              ) : (
                paginatedTasks.map((task) => {
                  const staff = getStaff(task.assignedStaffId);
                  return (
                    <tr 
                      key={task.id} 
                      className="hover:bg-[#F2F2F7] dark:hover:bg-[#242426] transition-colors group"
                    >
                      <td className="py-2.5 px-3.5">
                        <button
                          onClick={() => onSelectClient(task.clientId)}
                          className="font-semibold text-[13.5px] text-[#1D1D1F] dark:text-[#F5F5F7] hover:text-[#0071E3] dark:hover:text-[#2997FF] hover:underline text-left block truncate max-w-xs"
                        >
                          {task.tradeName}
                        </button>
                        <div className="font-mono tabular-nums text-[12px] text-[#6E6E73] dark:text-[#8E8E93] mt-0.5">
                          {task.gstin}
                        </div>
                      </td>

                      <td className="py-2.5 px-3.5">
                        <span className="font-medium text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7] block">
                          {task.filingType}
                        </span>
                        <span className="text-[11.5px] text-[#6E6E73] dark:text-[#8E8E93] block mt-0.5">
                          {task.period}
                        </span>
                      </td>

                      <td className="py-2.5 px-3.5 text-[12.5px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
                        {staff?.name || 'Unassigned'}
                      </td>

                      <td className="py-2.5 px-3.5">
                        {getDueDateCell(task)}
                      </td>

                      <td className="py-2.5 px-3.5">
                        <div className="flex items-center gap-1.5">
                          {getStatusBadge(task.status)}
                          <select
                            value={task.status}
                            onChange={(e) => onUpdateStatus(task.id, e.target.value as FilingStatus)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-[11px] bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded px-1 py-0.5 text-[#1D1D1F] dark:text-[#F5F5F7] focus:outline-none"
                            title="Update status"
                          >
                            <option value="Docs Pending">Docs Pending</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Draft Ready">Draft Ready</option>
                            <option value="Filed">Filed</option>
                            <option value="Overdue">Overdue</option>
                          </select>
                        </div>
                      </td>

                      <td className="py-2.5 px-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onOpenWhatsApp(task)}
                            className="h-7 px-2 border border-[#E5E5EA] dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] hover:bg-[#F2F2F7] dark:hover:bg-[#242426] text-[#1D1D1F] dark:text-[#F5F5F7] rounded-[5px] flex items-center gap-1 transition-colors text-[11px] font-medium"
                            title="Send WhatsApp update"
                          >
                            <MessageSquare className="w-3 h-3 text-[#16A34A] dark:text-[#34C759]" strokeWidth={1.5} />
                            <span className="hidden sm:inline">Notice</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onSelectClient(task.clientId)}
                            className="p-1 text-[#6E6E73] hover:text-[#0071E3] dark:hover:text-[#2997FF] rounded transition-colors"
                            title="View account"
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
        <div className="px-3 py-2 border-t border-[#E5E5EA] dark:border-[#2C2C2E] bg-[#FBFBFD] dark:bg-[#161618] flex items-center justify-between text-[12px] text-[#6E6E73] dark:text-[#8E8E93]">
          <span className="font-tabular">
            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredTasks.length)} of {filteredTasks.length}
          </span>

          <div className="flex items-center gap-1 font-tabular">
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
