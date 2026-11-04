import React from 'react';
import { 
  MonthlyTask, 
  StaffMember, 
  DebtorRecord, 
  ITRFiling, 
  UserProfile 
} from '../types/crm';
import { 
  AlertCircle, 
  Clock, 
  Receipt, 
  ArrowRight,
  CheckCircle2,
  Calendar,
  FileText
} from 'lucide-react';

interface OverviewStatsProps {
  currentUser: UserProfile;
  totalClients: number;
  monthlyTasks: MonthlyTask[];
  itrFilings?: ITRFiling[];
  debtors?: DebtorRecord[];
  staffList: StaffMember[];
  onNavigateTab: (tab: string, filter?: string) => void;
  onFilterStaff: (staffId: string | null) => void;
}

export const OverviewStats: React.FC<OverviewStatsProps> = ({
  currentUser,
  totalClients,
  monthlyTasks,
  itrFilings = [],
  debtors = [],
  staffList,
  onNavigateTab,
  onFilterStaff,
}) => {
  const isAdmin = currentUser.role === 'admin';

  // Filter tasks if regular employee
  const relevantTasks = isAdmin
    ? monthlyTasks
    : monthlyTasks.filter((t) => {
        const staff = staffList.find((s) => s.name === currentUser.name);
        return staff ? t.assignedStaffId === staff.id : true;
      });

  const relevantDebtors = isAdmin
    ? debtors
    : debtors.filter((d) => d.assignedStaff === currentUser.name);

  // Real-time metric tallies
  const recurringTotal = relevantTasks.length;
  const filedCount = relevantTasks.filter((t) => t.status === 'Filed').length;
  const docsPendingCount = relevantTasks.filter((t) => !t.docsReceived || t.status === 'Docs Pending').length;
  const overdueCount = relevantTasks.filter((t) => t.status === 'Overdue').length;

  // Real-time Money Owed calculation
  const totalMoneyOwed = relevantDebtors.reduce((acc, d) => acc + (d.currentBalance || 0), 0);
  const overdueDebtorsCount = relevantDebtors.filter((d) => d.currentBalance > 0 && d.status === 'Overdue').length;

  const today = new Date();
  const formattedToday = today.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  // Statutory Cutoffs Countdown
  const deadlines = [
    {
      code: 'TDS Challan',
      title: 'TDS Challan 281 Deposit',
      targetDate: new Date(2026, 10, 7),
      formattedCutoff: '07 Nov 2026',
      period: 'October 2026 Deductions',
    },
    {
      code: 'GSTR-1',
      title: 'Monthly Outward Supplies',
      targetDate: new Date(2026, 10, 11),
      formattedCutoff: '11 Nov 2026',
      period: 'October 2026 Invoices',
    },
    {
      code: 'PF / ESI',
      title: 'Provident Fund & ESI Deposit',
      targetDate: new Date(2026, 10, 15),
      formattedCutoff: '15 Nov 2026',
      period: 'October 2026 Payroll',
    },
    {
      code: 'GSTR-3B',
      title: 'Monthly Summary & Tax Payment',
      targetDate: new Date(2026, 10, 20),
      formattedCutoff: '20 Nov 2026',
      period: 'October 2026 Summary',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 border-b border-[#E5E5EA] dark:border-[#2C2C2E] pb-3">
        <div>
          <h1 className="text-[22px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight">
            {isAdmin ? 'Firm Overview' : `Work Desk — ${currentUser.name}`}
          </h1>
          <p className="text-[13px] text-[#6E6E73] dark:text-[#8E8E93] mt-0.5">
            {isAdmin 
              ? `Shameer & Associates • Practice Operations (${totalClients} Accounts)`
              : `${currentUser.designation} • Showing assigned accounts and tasks`}
          </p>
        </div>
        <div className="text-left sm:text-right">
          <div className="text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7] font-medium">{formattedToday}</div>
          <span className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93]">Statutory Quarter Q3 (FY 2026-27)</span>
        </div>
      </div>

      {/* Primary KPI Row - 4 Options Fixed in One Normal Row */}
      <div className="bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-[8px] overflow-hidden">
        <div className="grid grid-cols-4 divide-x divide-[#E5E5EA] dark:divide-[#2C2C2E] p-4">
          {/* Option 1: Money Owed */}
          <button
            onClick={() => onNavigateTab('debtors')}
            className="text-left group focus:outline-none pr-3 sm:pr-4"
          >
            <div className="text-[11px] sm:text-[12px] font-medium text-[#6E6E73] dark:text-[#8E8E93] truncate">Money Owed</div>
            <div className="font-tabular text-[17px] sm:text-[22px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] mt-0.5 truncate">
              ₹{totalMoneyOwed.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] sm:text-[12px] text-[#6E6E73] dark:text-[#8E8E93] mt-1 group-hover:text-[#0071E3] dark:group-hover:text-[#2997FF] flex items-center gap-1 transition-colors truncate">
              <span>{overdueDebtorsCount} pending</span>
              <ArrowRight className="w-3 h-3 stroke-[1.5] shrink-0 hidden sm:inline" />
            </div>
          </button>

          {/* Option 2: Monthly Returns */}
          <button
            onClick={() => onNavigateTab('monthly')}
            className="text-left group focus:outline-none px-3 sm:px-4"
          >
            <div className="text-[11px] sm:text-[12px] font-medium text-[#6E6E73] dark:text-[#8E8E93] truncate">Monthly Returns</div>
            <div className="font-tabular text-[17px] sm:text-[22px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] mt-0.5">
              {recurringTotal}
            </div>
            <div className="text-[11px] sm:text-[12px] text-[#34C759] mt-1 group-hover:text-[#0071E3] dark:group-hover:text-[#2997FF] flex items-center gap-1 transition-colors truncate">
              <span>{filedCount} filed</span>
              <ArrowRight className="w-3 h-3 stroke-[1.5] shrink-0 hidden sm:inline" />
            </div>
          </button>

          {/* Option 3: Overdue Filings */}
          <button
            onClick={() => onNavigateTab('gst-tracker')}
            className="text-left group focus:outline-none px-3 sm:px-4"
          >
            <div className="text-[11px] sm:text-[12px] font-medium text-[#6E6E73] dark:text-[#8E8E93] truncate">Overdue Filings</div>
            <div className={`font-tabular text-[17px] sm:text-[22px] font-semibold mt-0.5 ${overdueCount > 0 ? 'text-[#FF3B30]' : 'text-[#1D1D1F] dark:text-[#F5F5F7]'}`}>
              {overdueCount}
            </div>
            <div className="text-[11px] sm:text-[12px] text-[#6E6E73] dark:text-[#8E8E93] mt-1 group-hover:text-[#0071E3] dark:group-hover:text-[#2997FF] flex items-center gap-1 transition-colors truncate">
              <span>{overdueCount > 0 ? 'Action needed' : 'All clear'}</span>
              <ArrowRight className="w-3 h-3 stroke-[1.5] shrink-0 hidden sm:inline" />
            </div>
          </button>

          {/* Option 4: Missing Invoices */}
          <button
            onClick={() => onNavigateTab('monthly', 'docs-pending')}
            className="text-left group focus:outline-none pl-3 sm:pl-4"
          >
            <div className="text-[11px] sm:text-[12px] font-medium text-[#6E6E73] dark:text-[#8E8E93] truncate">Missing Invoices</div>
            <div className="font-tabular text-[17px] sm:text-[22px] font-semibold text-[#FF9500] mt-0.5">
              {docsPendingCount}
            </div>
            <div className="text-[11px] sm:text-[12px] text-[#6E6E73] dark:text-[#8E8E93] mt-1 group-hover:text-[#0071E3] dark:group-hover:text-[#2997FF] flex items-center gap-1 transition-colors truncate">
              <span>Awaiting docs</span>
              <ArrowRight className="w-3 h-3 stroke-[1.5] shrink-0 hidden sm:inline" />
            </div>
          </button>
        </div>
      </div>

      {/* Immediate Attention List (Clean Flat List) */}
      {(overdueCount > 0 || docsPendingCount > 0 || overdueDebtorsCount > 0) && (
        <div className="bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-[8px] overflow-hidden">
          <div className="px-4 py-2.5 border-b border-[#E5E5EA] dark:border-[#2C2C2E] flex items-center justify-between">
            <span className="text-[13px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">Items Requiring Action</span>
            <span className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93]">Sorted by urgency</span>
          </div>

          <div className="divide-y divide-[#E5E5EA] dark:divide-[#2C2C2E]">
            {overdueCount > 0 && (
              <button
                onClick={() => onNavigateTab('gst-tracker')}
                className="w-full text-left px-4 py-2.5 hover:bg-[#F2F2F7] dark:hover:bg-[#242426] flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-4 h-4 text-[#FF3B30] shrink-0 stroke-[1.5]" />
                  <div>
                    <span className="text-[13px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
                      {overdueCount} GST Filings Overdue
                    </span>
                    <span className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93] ml-2">
                      Statutory cutoff passed. Clients incurring daily late fees.
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[12px] text-[#0071E3] dark:text-[#2997FF] font-medium shrink-0">
                  <span>Open tracker</span>
                  <ArrowRight className="w-3 h-3 stroke-[1.5]" />
                </div>
              </button>
            )}

            {docsPendingCount > 0 && (
              <button
                onClick={() => onNavigateTab('monthly', 'docs-pending')}
                className="w-full text-left px-4 py-2.5 hover:bg-[#F2F2F7] dark:hover:bg-[#242426] flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-[#FF9500] shrink-0 stroke-[1.5]" />
                  <div>
                    <span className="text-[13px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
                      {docsPendingCount} Clients Missing Purchase &amp; Sales Bills
                    </span>
                    <span className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93] ml-2">
                      Required for GSTR-1 preparation.
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[12px] text-[#0071E3] dark:text-[#2997FF] font-medium shrink-0">
                  <span>Send reminders</span>
                  <ArrowRight className="w-3 h-3 stroke-[1.5]" />
                </div>
              </button>
            )}

            {overdueDebtorsCount > 0 && (
              <button
                onClick={() => onNavigateTab('debtors')}
                className="w-full text-left px-4 py-2.5 hover:bg-[#F2F2F7] dark:hover:bg-[#242426] flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Receipt className="w-4 h-4 text-[#6E6E73] dark:text-[#8E8E93] shrink-0 stroke-[1.5]" />
                  <div>
                    <span className="text-[13px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
                      {overdueDebtorsCount} Outstanding Invoices Past 30 Days
                    </span>
                    <span className="font-tabular text-[12px] text-[#6E6E73] dark:text-[#8E8E93] ml-2">
                      ₹{totalMoneyOwed.toLocaleString('en-IN')} total balance
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[12px] text-[#0071E3] dark:text-[#2997FF] font-medium shrink-0">
                  <span>View balance ledger</span>
                  <ArrowRight className="w-3 h-3 stroke-[1.5]" />
                </div>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Two Column Section: Upcoming Deadlines & Staff Workload */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Upcoming Deadlines */}
        <div className="bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-[8px] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E5E5EA] dark:border-[#2C2C2E] flex items-center justify-between">
            <span className="text-[13px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
              Statutory Deadlines (November 2026)
            </span>
            <button
              onClick={() => onNavigateTab('gst-tracker')}
              className="text-[12px] text-[#0071E3] dark:text-[#2997FF] hover:underline"
            >
              All Deadlines
            </button>
          </div>

          <div className="divide-y divide-[#E5E5EA] dark:divide-[#2C2C2E]">
            {deadlines.map((d, index) => {
              const diffTime = d.targetDate.getTime() - today.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              const isUrgent = diffDays <= 3;

              return (
                <div key={index} className="px-4 py-2.5 flex items-center justify-between text-[13px]">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">{d.title}</span>
                      <span className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93]">({d.code})</span>
                    </div>
                    <div className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93] mt-0.5">
                      {d.period}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-tabular font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
                      {d.formattedCutoff}
                    </div>
                    <span className={`inline-block font-tabular text-[11px] font-medium px-1.5 py-0.2 rounded mt-0.5 ${
                      isUrgent
                        ? 'bg-[#FF3B30]/10 text-[#FF3B30] dark:bg-[#FF453A]/20 dark:text-[#FF453A]'
                        : 'text-[#6E6E73] dark:text-[#8E8E93]'
                    }`}>
                      {diffDays <= 0 ? 'Due Today' : `In ${diffDays} days`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Staff Progress */}
        <div className="bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-[8px] overflow-hidden flex flex-col justify-between">
          <div className="px-4 py-3 border-b border-[#E5E5EA] dark:border-[#2C2C2E] flex items-center justify-between">
            <span className="text-[13px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
              October Filings Completion by Staff
            </span>
            <button
              onClick={() => onNavigateTab('staff')}
              className="text-[12px] text-[#0071E3] dark:text-[#2997FF] hover:underline"
            >
              Staff Desk
            </button>
          </div>

          <div className="p-4 space-y-3">
            {staffList.map((staff) => {
              const staffTasks = monthlyTasks.filter((t) => t.assignedStaffId === staff.id);
              const staffFiled = staffTasks.filter((t) => t.status === 'Filed').length;
              const percent = staffTasks.length > 0 ? Math.round((staffFiled / staffTasks.length) * 100) : 0;

              return (
                <div key={staff.id} className="space-y-1">
                  <div className="flex justify-between text-[13px]">
                    <button
                      onClick={() => {
                        onFilterStaff(staff.id);
                        onNavigateTab('monthly');
                      }}
                      className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7] hover:underline text-left flex items-center gap-1.5"
                    >
                      <span>{staff.name}</span>
                      <span className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93]">({staff.role})</span>
                    </button>
                    <span className="font-tabular text-[#6E6E73] dark:text-[#8E8E93] text-[12px]">
                      {staffFiled} / {staffTasks.length} ({percent}%)
                    </span>
                  </div>
                  {/* Apple-style thin hairline progress indicator */}
                  <div className="h-1 w-full bg-[#E5E5EA] dark:bg-[#2C2C2E] rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${percent === 100 ? 'bg-[#34C759]' : 'bg-[#0071E3]'}`}
                      style={{ width: `${percent}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="px-4 py-2.5 bg-[#FBFBFD] dark:bg-[#161618] border-t border-[#E5E5EA] dark:border-[#2C2C2E] flex items-center justify-between text-[12px]">
            <span className="text-[#6E6E73] dark:text-[#8E8E93]">
              Need to reassign monthly accounts?
            </span>
            <button
              onClick={() => onNavigateTab('staff')}
              className="text-[#0071E3] dark:text-[#2997FF] font-medium hover:underline flex items-center gap-1"
            >
              <span>Assign Staff</span>
              <ArrowRight className="w-3 h-3 stroke-[1.5]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
