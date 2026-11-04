import React, { useState } from 'react';
import { 
  AlertCircle, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  MessageSquare, 
  Search, 
  Download, 
  Check, 
  X,
  FileCheck
} from 'lucide-react';
import { GSTComplianceItem, StaffMember } from '../types/crm';
import { exportDebtorsAndGSTWorkbook } from '../utils/excelExport';
import { ACTUAL_DEBTOR_RECORDS, ACTUAL_OFFICE_BILLINGS } from '../data/actualClientData';

interface GSTComplianceTrackerProps {
  complianceItems: GSTComplianceItem[];
  staffList: StaffMember[];
  selectedStaffId: string | null;
  returnTypes?: string[];
  onOpenWhatsApp: (item: GSTComplianceItem) => void;
  onMarkAsFiled: (id: string, arn: string) => void;
}

export const GSTComplianceTracker: React.FC<GSTComplianceTrackerProps> = ({
  complianceItems,
  staffList,
  selectedStaffId,
  returnTypes = ['GSTR-1', 'GSTR-3B', 'CMP-08', 'GSTR-9', 'GSTR-9C'],
  onOpenWhatsApp,
  onMarkAsFiled,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [returnTypeFilter, setReturnTypeFilter] = useState<string>('all');
  const [staffFilter, setStaffFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [activeTabSection, setActiveTabSection] = useState<'all' | 'overdue' | 'due-2-days' | 'upcoming' | 'filed'>('all');

  // Modal for Mark as Filed
  const [filingModalItem, setFilingModalItem] = useState<GSTComplianceItem | null>(null);
  const [arnInput, setArnInput] = useState('');

  const activeStaffMember = staffList.find((s) => s.id === selectedStaffId);
  const effectiveStaffFilter = activeStaffMember ? activeStaffMember.name : staffFilter;

  // Filter items
  const filteredItems = complianceItems.filter((item) => {
    if (effectiveStaffFilter !== 'all' && item.assignedStaff !== effectiveStaffFilter) {
      return false;
    }
    if (returnTypeFilter !== 'all' && item.returnType !== returnTypeFilter) {
      return false;
    }
    if (monthFilter !== 'all' && item.filingMonth !== monthFilter) {
      return false;
    }
    if (activeTabSection !== 'all' && item.priorityLevel !== activeTabSection) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        item.clientName.toLowerCase().includes(q) ||
        item.gstin.toLowerCase().includes(q) ||
        item.returnType.toLowerCase().includes(q) ||
        (item.arnNumber && item.arnNumber.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Strict Prioritization Groups
  const overdueFilings = filteredItems.filter((i) => i.priorityLevel === 'overdue');
  const dueIn2DaysFilings = filteredItems.filter((i) => i.priorityLevel === 'due-2-days');
  const upcomingFilings = filteredItems.filter((i) => i.priorityLevel === 'upcoming');
  const filedFilings = filteredItems.filter((i) => i.priorityLevel === 'filed');

  // Overall counts for badges
  const overdueCount = complianceItems.filter((i) => i.priorityLevel === 'overdue').length;
  const due2DaysCount = complianceItems.filter((i) => i.priorityLevel === 'due-2-days').length;
  const upcomingCount = complianceItems.filter((i) => i.priorityLevel === 'upcoming').length;
  const filedCount = complianceItems.filter((i) => i.priorityLevel === 'filed').length;

  const handleOpenFilingModal = (item: GSTComplianceItem) => {
    setFilingModalItem(item);
    const mockArn = `AA321126${Math.floor(100000 + Math.random() * 900000)}Z`;
    setArnInput(mockArn);
  };

  const handleSubmitFiling = (e: React.FormEvent) => {
    e.preventDefault();
    if (!filingModalItem || !arnInput.trim()) return;
    onMarkAsFiled(filingModalItem.id, arnInput.trim());
    setFilingModalItem(null);
    setArnInput('');
  };

  const handleExportToExcel = () => {
    exportDebtorsAndGSTWorkbook(ACTUAL_DEBTOR_RECORDS, ACTUAL_OFFICE_BILLINGS, complianceItems);
  };

  const renderTableRows = (items: GSTComplianceItem[], showOverdueHighlight = false) => {
    return items.map((item) => (
      <tr key={item.id} className="hover:bg-[#F2F2F7] dark:hover:bg-[#242426] transition-colors">
        <td className="py-2.5 px-3">
          <div className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7] text-[13px]">{item.clientName}</div>
          {item.tradeName !== item.clientName && (
            <div className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93]">{item.tradeName}</div>
          )}
        </td>
        <td className="py-2.5 px-3.5 font-mono tabular-nums text-[12px] text-[#6E6E73] dark:text-[#8E8E93]">{item.gstin}</td>
        <td className="py-2.5 px-3.5">
          <span className="font-mono tabular-nums text-[11px] font-medium px-1.5 py-0.5 rounded-[4px] bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7]">
            {item.returnType}
          </span>
        </td>
        <td className="py-2.5 px-3.5 text-[12px] text-[#6E6E73] dark:text-[#8E8E93]">{item.filingMonth}</td>
        <td className="py-2.5 px-3.5 font-mono tabular-nums text-[12px] text-[#1D1D1F] dark:text-[#F5F5F7]">{item.dueDate}</td>
        <td className="py-2.5 px-3.5">
          {item.priorityLevel === 'overdue' ? (
            <span className="font-mono tabular-nums text-[11px] text-[#DC2626] font-medium bg-[#DC2626]/10 px-1.5 py-0.5 rounded-[4px]">
              {Math.abs(item.daysRemaining)}d late
            </span>
          ) : item.priorityLevel === 'due-2-days' ? (
            <span className="font-mono tabular-nums text-[11px] text-[#D97706] font-medium bg-[#D97706]/10 px-1.5 py-0.5 rounded-[4px]">
              {item.daysRemaining === 1 ? 'Due tomorrow' : `In ${item.daysRemaining}d`}
            </span>
          ) : item.priorityLevel === 'filed' ? (
            <span className="font-mono tabular-nums text-[11px] text-[#16A34A] dark:text-[#34C759] font-medium bg-[#16A34A]/10 px-1.5 py-0.5 rounded-[4px]">
              Filed ({item.filedDate || 'Recorded'})
            </span>
          ) : (
            <span className="font-mono tabular-nums text-[11px] text-[#6E6E73] dark:text-[#8E8E93]">
              In {item.daysRemaining}d
            </span>
          )}
        </td>
        <td className="py-2.5 px-3.5 text-[12.5px] text-[#1D1D1F] dark:text-[#F5F5F7]">{item.assignedStaff}</td>
        <td className="py-2.5 px-3.5 font-mono tabular-nums text-[12.5px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7] text-right">
          ₹{(item.taxPayable || 0).toLocaleString('en-IN')}
        </td>
        <td className="py-2.5 px-3.5 text-right">
          <div className="flex items-center justify-end gap-1.5">
            <button
              onClick={() => onOpenWhatsApp(item)}
              title="Send WhatsApp Notice"
              className="h-7 px-2 border border-[#E5E5EA] dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] hover:bg-[#F2F2F7] dark:hover:bg-[#242426] text-[#1D1D1F] dark:text-[#F5F5F7] rounded-[5px] flex items-center gap-1 transition-colors text-[11px] font-medium"
            >
              <MessageSquare className="w-3 h-3 text-[#16A34A] dark:text-[#34C759]" strokeWidth={1.5} />
              <span className="hidden sm:inline">Notice</span>
            </button>
            {item.priorityLevel !== 'filed' ? (
              <button
                onClick={() => handleOpenFilingModal(item)}
                className="h-7 px-2 text-[11px] font-medium text-white bg-[#0071E3] hover:bg-[#0077ED] rounded-[5px] transition-colors"
              >
                Mark Filed
              </button>
            ) : (
              <span className="font-mono tabular-nums text-[11px] text-[#16A34A] dark:text-[#34C759] font-medium truncate max-w-[90px]" title={item.arnNumber}>
                {item.arnNumber || 'ARN Logged'}
              </span>
            )}
          </div>
        </td>
      </tr>
    ));
  };

  return (
    <div className="space-y-5">
      {/* Top Header & Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E5EA] dark:border-[#2C2C2E] pb-3">
        <div>
          <h1 className="text-[22px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight">
            Upcoming Deadlines &amp; Filings
          </h1>
          <p className="text-[13px] text-[#6E6E73] dark:text-[#8E8E93] mt-0.5">
            GST compliance tracker, cutoff schedules, and ARN records
          </p>
        </div>

        <button
          onClick={handleExportToExcel}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7] bg-[#FFFFFF] dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] hover:bg-[#F2F2F7] dark:hover:bg-[#3A3A3C] transition-colors self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5 stroke-[1.5]" />
          <span>Export Excel</span>
        </button>
      </div>

      {/* Priority Segmented Control (macOS style) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#F2F2F7] dark:bg-[#1C1C1E] p-1 rounded-[8px]">
        <div className="flex flex-wrap items-center gap-1">
          <button
            onClick={() => setActiveTabSection('all')}
            className={`px-3 py-1 text-[13px] rounded-[6px] transition-all ${
              activeTabSection === 'all'
                ? 'bg-[#FFFFFF] dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] font-semibold shadow-sm'
                : 'text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#1D1D1F]'
            }`}
          >
            All Deadlines ({complianceItems.length})
          </button>

          <button
            onClick={() => setActiveTabSection('overdue')}
            className={`px-3 py-1 text-[13px] rounded-[6px] transition-all ${
              activeTabSection === 'overdue'
                ? 'bg-[#FFFFFF] dark:bg-[#2C2C2E] text-[#FF3B30] font-semibold shadow-sm'
                : 'text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#FF3B30]'
            }`}
          >
            <span>Overdue</span>
            <span className="ml-1.5 font-tabular text-[11px] px-1.5 py-0.2 bg-[#FF3B30]/10 text-[#FF3B30] rounded font-semibold">
              {overdueCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTabSection('due-2-days')}
            className={`px-3 py-1 text-[13px] rounded-[6px] transition-all ${
              activeTabSection === 'due-2-days'
                ? 'bg-[#FFFFFF] dark:bg-[#2C2C2E] text-[#FF9500] font-semibold shadow-sm'
                : 'text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#FF9500]'
            }`}
          >
            <span>Due in 2 Days</span>
            <span className="ml-1.5 font-tabular text-[11px] px-1.5 py-0.2 bg-[#FF9500]/10 text-[#FF9500] rounded font-semibold">
              {due2DaysCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTabSection('upcoming')}
            className={`px-3 py-1 text-[13px] rounded-[6px] transition-all ${
              activeTabSection === 'upcoming'
                ? 'bg-[#FFFFFF] dark:bg-[#2C2C2E] text-[#0071E3] dark:text-[#2997FF] font-semibold shadow-sm'
                : 'text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#0071E3]'
            }`}
          >
            <span>Upcoming</span>
            <span className="ml-1.5 font-tabular text-[11px] text-[#6E6E73]">
              {upcomingCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTabSection('filed')}
            className={`px-3 py-1 text-[13px] rounded-[6px] transition-all ${
              activeTabSection === 'filed'
                ? 'bg-[#FFFFFF] dark:bg-[#2C2C2E] text-[#34C759] font-semibold shadow-sm'
                : 'text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#34C759]'
            }`}
          >
            <span>Filed</span>
            <span className="ml-1.5 font-tabular text-[11px] text-[#34C759]">
              {filedCount}
            </span>
          </button>
        </div>

        <div className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93] px-2 font-tabular">
          {filteredItems.length} records shown
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FFFFFF] dark:bg-[#1C1C1E] p-3 border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-[8px]">
        <div className="flex items-center gap-2 flex-1 max-w-sm bg-[#F2F2F7] dark:bg-[#242426] px-2.5 py-1.5 rounded-[6px]">
          <Search className="w-3.5 h-3.5 text-[#6E6E73] dark:text-[#8E8E93] shrink-0 stroke-[1.5]" />
          <input
            type="text"
            placeholder="Search by client, GSTIN, or ARN..."
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
          <select
            value={returnTypeFilter}
            onChange={(e) => setReturnTypeFilter(e.target.value)}
            className="px-2.5 py-1 bg-[#F2F2F7] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] text-[#1D1D1F] dark:text-[#F5F5F7] text-[12px] focus:outline-none"
          >
            <option value="all">All Returns ({returnTypes.slice(0, 3).join(', ')})</option>
            {returnTypes.map((ret) => (
              <option key={ret} value={ret}>{ret}</option>
            ))}
          </select>

          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="px-2.5 py-1 bg-[#F2F2F7] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] text-[#1D1D1F] dark:text-[#F5F5F7] text-[12px] focus:outline-none"
          >
            <option value="all">All Periods</option>
            <option value="October 2026">October 2026</option>
            <option value="September 2026">September 2026</option>
            <option value="August 2026">August 2026</option>
          </select>

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

      {/* Main Table */}
      <div className="bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-[8px] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px] border-collapse">
            <thead>
              <tr className="bg-[#FBFBFD] dark:bg-[#161618] text-[#6E6E73] dark:text-[#8E8E93] text-[11px] uppercase tracking-[0.04em] border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
                <th className="py-2 px-3.5 font-semibold min-w-[200px]">Client Account</th>
                <th className="py-2 px-3.5 font-semibold">GSTIN</th>
                <th className="py-2 px-3.5 font-semibold">Return</th>
                <th className="py-2 px-3.5 font-semibold">Period</th>
                <th className="py-2 px-3.5 font-semibold">Due Date</th>
                <th className="py-2 px-3.5 font-semibold">Timeline</th>
                <th className="py-2 px-3.5 font-semibold">Staff</th>
                <th className="py-2 px-3.5 font-semibold text-right">Tax Payable</th>
                <th className="py-2 px-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5EA] dark:divide-[#2C2C2E]">
              {/* If viewing all, prioritize sections in clean blocks */}
              {activeTabSection === 'all' ? (
                <>
                  {overdueFilings.length > 0 && renderTableRows(overdueFilings, true)}
                  {dueIn2DaysFilings.length > 0 && renderTableRows(dueIn2DaysFilings)}
                  {upcomingFilings.length > 0 && renderTableRows(upcomingFilings)}
                  {filedFilings.length > 0 && renderTableRows(filedFilings)}
                </>
              ) : (
                renderTableRows(filteredItems)
              )}

              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-[#6E6E73] dark:text-[#8E8E93] text-[13px]">
                    No compliance filings found matching current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Filing Modal */}
      {filingModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div 
            className="w-full max-w-md bg-[#FFFFFF] dark:bg-[#1C1C1E] rounded-[8px] border border-[#E5E5EA] dark:border-[#2C2C2E] shadow-2xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
              <div>
                <h3 className="text-[15px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                  Record GST Portal Filing
                </h3>
                <p className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93]">
                  {filingModalItem.clientName} • {filingModalItem.returnType} ({filingModalItem.filingMonth})
                </p>
              </div>
              <button onClick={() => setFilingModalItem(null)} className="text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]">
                <X className="w-4 h-4 stroke-[1.5]" />
              </button>
            </div>

            <form onSubmit={handleSubmitFiling} className="space-y-4 pt-4">
              <div>
                <label className="block text-[12px] font-medium text-[#6E6E73] dark:text-[#8E8E93] mb-1">
                  ARN (Application Reference Number)
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. AA321126109845Z"
                  value={arnInput}
                  onChange={(e) => setArnInput(e.target.value)}
                  className="w-full px-3 py-1.5 text-[14px] font-tabular bg-[#F2F2F7] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] focus:outline-none focus:border-[#0071E3] text-[#1D1D1F] dark:text-[#F5F5F7]"
                />
                <p className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93] mt-1">
                  Generated upon OTP/DSC submission on gst.gov.in
                </p>
              </div>

              <div className="p-3 bg-[#F2F2F7] dark:bg-[#242426] rounded-[6px] text-[13px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-[#6E6E73] dark:text-[#8E8E93]">GSTIN:</span>
                  <span className="font-tabular text-[#1D1D1F] dark:text-[#F5F5F7]">{filingModalItem.gstin}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6E6E73] dark:text-[#8E8E93]">Filing Staff:</span>
                  <span className="text-[#1D1D1F] dark:text-[#F5F5F7]">{filingModalItem.assignedStaff}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6E6E73] dark:text-[#8E8E93]">Tax Payable:</span>
                  <span className="font-tabular font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">₹{(filingModalItem.taxPayable || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E5EA] dark:border-[#2C2C2E]">
                <button
                  type="button"
                  onClick={() => setFilingModalItem(null)}
                  className="px-3 py-1.5 text-[13px] text-[#6E6E73] hover:text-[#1D1D1F]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-[13px] font-medium text-white bg-[#0071E3] hover:bg-[#0077ED] rounded-[6px] transition-colors"
                >
                  Save Filing Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
