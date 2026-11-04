import React from 'react';
import { 
  MonthlyTask, 
  StaffMember, 
  DebtorRecord, 
  ITRFiling, 
  UserProfile 
} from '../types/crm';
import { 
  ArrowRight
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

  // Metric tallies
  const recurringTotal = relevantTasks.length;
  const filedCount = relevantTasks.filter((t) => t.status === 'Filed').length;
  const docsPendingTasks = relevantTasks.filter((t) => !t.docsReceived || t.status === 'Docs Pending');
  const docsPendingCount = docsPendingTasks.length;
  const overdueTasks = relevantTasks.filter((t) => t.status === 'Overdue');
  const overdueCount = overdueTasks.length;

  // Fee Receivables
  const totalReceivables = relevantDebtors.reduce((acc, d) => acc + (d.currentBalance || 0), 0);
  const overdueDebtors = relevantDebtors.filter((d) => d.currentBalance > 0);
  const overdueDebtorsCount = overdueDebtors.length;

  const today = new Date();
  const formattedToday = today.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  // Statutory Cutoffs Countdown with Live Client Completion
  const statutoryDeadlines = [
    {
      code: 'TDS Payment',
      title: 'TDS Payment',
      targetDate: new Date(2026, 10, 7),
      formattedCutoff: '07 Nov 2026',
      period: 'October 2026 Deductions',
      returnTypeFilter: 'TDS Payment',
    },
    {
      code: 'GSTR-1',
      title: 'GSTR-1 (Sales Return)',
      targetDate: new Date(2026, 10, 11),
      formattedCutoff: '11 Nov 2026',
      period: 'October 2026 Invoices',
      returnTypeFilter: 'GSTR-1 (Sales)',
    },
    {
      code: 'PF & ESI',
      title: 'PF & ESI',
      targetDate: new Date(2026, 10, 15),
      formattedCutoff: '15 Nov 2026',
      period: 'October 2026 Payroll',
      returnTypeFilter: 'PF & ESI',
    },
    {
      code: 'GSTR-3B',
      title: 'Monthly Summary & Tax Payment',
      targetDate: new Date(2026, 10, 20),
      formattedCutoff: '20 Nov 2026',
      period: 'October 2026 Summary',
      returnTypeFilter: 'GSTR-3B (Summary)',
    },
  ];

  // Helper to calculate live filed vs total for each deadline type
  const getDeadlineCompletion = (filingType: string) => {
    const matching = relevantTasks.filter((t) => 
      t.filingType.toLowerCase().includes(filingType.toLowerCase()) || 
      filingType.toLowerCase().includes(t.filingType.toLowerCase())
    );
    const filed = matching.filter((t) => t.status === 'Filed').length;
    return { filed, total: matching.length };
  };

  // Immediate Statutory Risks (< 3 days and not filed)
  const immediateRisks = relevantTasks.filter(
    (t) => t.status !== 'Filed' && t.daysRemaining <= 3
  );

  return (
    <div className="space-y-6">
      {/* 1. In-page Header: Compact date & quarter without shell repetition */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 border-b border-[#E5E5EA] dark:border-[#2C2C2E] pb-3">
        <div>
          <h1 className="text-[18px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight">
            {isAdmin ? 'Practice Operations' : `Work Desk — ${currentUser.name}`}
          </h1>
          <p className="text-[12.5px] text-[#6E6E73] dark:text-[#8E8E93] mt-0.5">
            {totalClients} active clients
          </p>
        </div>
        <div className="text-left sm:text-right text-[12.5px]">
          <span className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">{formattedToday}</span>
          <span className="text-[#86868B] dark:text-[#6E6E73] ml-1.5">• Q3 • FY 2026–27</span>
        </div>
      </div>

      {/* 2. Refined 4-Column KPI Strip: Standard dark tabular text, clean titles, clickable */}
      <div className="bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-[6px] overflow-hidden">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[#E5E5EA] dark:divide-[#2C2C2E]">
          {/* KPI 1: Fee Receivables */}
          <button
            onClick={() => onNavigateTab('debtors')}
            className="text-left p-3.5 sm:p-4 hover:bg-[#FBFBFD] dark:hover:bg-[#242426] transition-colors group focus:outline-none"
          >
            <div className="text-[12px] font-medium text-[#6E6E73] dark:text-[#8E8E93] truncate">
              Fee Receivables
            </div>
            <div className="font-mono tabular-nums text-[22px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] mt-0.5">
              ₹{totalReceivables.toLocaleString('en-IN')}
            </div>
            <div className="text-[11.5px] text-[#6E6E73] dark:text-[#8E8E93] mt-1 group-hover:text-[#0071E3] dark:group-hover:text-[#2997FF] flex items-center gap-1 transition-colors">
              <span>{overdueDebtorsCount} {overdueDebtorsCount === 1 ? 'account' : 'accounts'} pending</span>
              <ArrowRight className="w-3 h-3 stroke-[1.5]" />
            </div>
          </button>

          {/* KPI 2: Monthly Returns */}
          <button
            onClick={() => onNavigateTab('monthly')}
            className="text-left p-3.5 sm:p-4 hover:bg-[#FBFBFD] dark:hover:bg-[#242426] transition-colors group focus:outline-none"
          >
            <div className="text-[12px] font-medium text-[#6E6E73] dark:text-[#8E8E93] truncate">
              Monthly Returns
            </div>
            <div className="font-mono tabular-nums text-[22px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] mt-0.5">
              {recurringTotal}
            </div>
            <div className="text-[11.5px] text-[#6E6E73] dark:text-[#8E8E93] mt-1 group-hover:text-[#0071E3] dark:group-hover:text-[#2997FF] flex items-center gap-1 transition-colors">
              <span>{filedCount} / {recurringTotal} filed</span>
              <ArrowRight className="w-3 h-3 stroke-[1.5]" />
            </div>
          </button>

          {/* KPI 3: Overdue Filings */}
          <button
            onClick={() => onNavigateTab('gst-tracker')}
            className="text-left p-3.5 sm:p-4 hover:bg-[#FBFBFD] dark:hover:bg-[#242426] transition-colors group focus:outline-none"
          >
            <div className="text-[12px] font-medium text-[#6E6E73] dark:text-[#8E8E93] truncate">
              Overdue Filings
            </div>
            <div className="font-mono tabular-nums text-[22px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] mt-0.5">
              {overdueCount}
            </div>
            <div className="text-[11.5px] text-[#6E6E73] dark:text-[#8E8E93] mt-1 group-hover:text-[#0071E3] dark:group-hover:text-[#2997FF] flex items-center gap-1 transition-colors">
              <span>{overdueCount > 0 ? `${overdueCount} critical` : 'All on track'}</span>
              <ArrowRight className="w-3 h-3 stroke-[1.5]" />
            </div>
          </button>

          {/* KPI 4: Pending Client Docs */}
          <button
            onClick={() => onNavigateTab('monthly', 'Docs Pending')}
            className="text-left p-3.5 sm:p-4 hover:bg-[#FBFBFD] dark:hover:bg-[#242426] transition-colors group focus:outline-none"
          >
            <div className="text-[12px] font-medium text-[#6E6E73] dark:text-[#8E8E93] truncate">
              Pending Client Docs
            </div>
            <div className="font-mono tabular-nums text-[22px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] mt-0.5">
              {docsPendingCount}
            </div>
            <div className="text-[11.5px] text-[#6E6E73] dark:text-[#8E8E93] mt-1 group-hover:text-[#0071E3] dark:group-hover:text-[#2997FF] flex items-center gap-1 transition-colors">
              <span>{docsPendingCount === 1 ? '1 client awaiting' : `${docsPendingCount} clients awaiting`}</span>
              <ArrowRight className="w-3 h-3 stroke-[1.5]" />
            </div>
          </button>
        </div>
      </div>

      {/* 3. Entity-Specific Items Requiring Action (No decorative icons, real client bottlenecks) */}
      <div className="bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-[6px] overflow-hidden">
        <div className="px-4 py-2.5 border-b border-[#E5E5EA] dark:border-[#2C2C2E] flex items-center justify-between">
          <span className="text-[12px] uppercase tracking-[0.04em] font-semibold text-[#6E6E73] dark:text-[#8E8E93]">
            Needs Attention
          </span>
          <span className="font-mono tabular-nums text-[11px] text-[#86868B]">
            {immediateRisks.length + (docsPendingCount > 0 ? 1 : 0) + (overdueDebtorsCount > 0 ? 1 : 0)} Active Bottlenecks
          </span>
        </div>

        <div className="divide-y divide-[#E5E5EA] dark:divide-[#2C2C2E]">
          {/* Bottleneck 1: Immediate Statutory Risk */}
          {immediateRisks.length > 0 ? (
            immediateRisks.map((task) => (
              <div
                key={task.id}
                onClick={() => onNavigateTab('monthly')}
                className="w-full text-left px-4 py-3 hover:bg-[#F2F2F7] dark:hover:bg-[#242426] flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors cursor-pointer group"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono tabular-nums text-[11px] font-medium px-1.5 py-0.2 rounded-[4px] bg-[#D97706]/10 text-[#D97706] dark:text-[#FF9F0A]">
                      {task.daysRemaining === 0 ? 'Due Today' : `Due in ${task.daysRemaining}d`}
                    </span>
                    <span className="font-medium text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7]">
                      {task.filingType} — {task.tradeName}
                    </span>
                    <span className="text-[11.5px] text-[#6E6E73] dark:text-[#8E8E93]">
                      ({task.status})
                    </span>
                  </div>
                  <div className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93] mt-0.5">
                    Assigned to {staffList.find((s) => s.id === task.assignedStaffId)?.name || 'Staff'} • Cutoff {task.dueDate}
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[12px] text-[#0071E3] dark:text-[#2997FF] font-medium shrink-0">
                  <span>Review Filing</span>
                  <ArrowRight className="w-3.5 h-3.5 stroke-[1.5]" />
                </div>
              </div>
            ))
          ) : (
            <div
              onClick={() => onNavigateTab('monthly')}
              className="w-full text-left px-4 py-3 hover:bg-[#F2F2F7] dark:hover:bg-[#242426] flex items-center justify-between transition-colors cursor-pointer group"
            >
              <div>
                <span className="font-medium text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7]">
                  Statutory Filings on Schedule
                </span>
                <span className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93] ml-2">
                  No filings due in the next 48 hours.
                </span>
              </div>
              <div className="flex items-center gap-1 text-[12px] text-[#0071E3] dark:text-[#2997FF] font-medium shrink-0">
                <span>View Queue</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[1.5]" />
              </div>
            </div>
          )}

          {/* Bottleneck 2: Client Document Blockers */}
          {docsPendingCount > 0 && (
            <div
              onClick={() => onNavigateTab('monthly', 'Docs Pending')}
              className="w-full text-left px-4 py-3 hover:bg-[#F2F2F7] dark:hover:bg-[#242426] flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors cursor-pointer group"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono tabular-nums text-[11px] font-medium px-1.5 py-0.2 rounded-[4px] bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#6E6E73] dark:text-[#8E8E93]">
                    Docs Pending
                  </span>
                  <span className="font-medium text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7]">
                    {docsPendingTasks.map((t) => t.tradeName).join(', ')}
                  </span>
                </div>
                <div className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93] mt-0.5">
                  Missing October 2026 purchase/sales bills required for GSTR-1 and GSTR-3B preparation
                </div>
              </div>

              <div className="flex items-center gap-1 text-[12px] text-[#0071E3] dark:text-[#2997FF] font-medium shrink-0">
                <span>Send Reminder</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[1.5]" />
              </div>
            </div>
          )}

          {/* Bottleneck 3: Aged Receivables (90+ Days) */}
          {overdueDebtorsCount > 0 && (
            <div
              onClick={() => onNavigateTab('debtors')}
              className="w-full text-left px-4 py-3 hover:bg-[#F2F2F7] dark:hover:bg-[#242426] flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors cursor-pointer group"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono tabular-nums text-[11px] font-medium px-1.5 py-0.2 rounded-[4px] bg-[#DC2626]/10 text-[#DC2626]">
                    Aged Receivables
                  </span>
                  <span className="font-medium text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7]">
                    {overdueDebtorsCount} {overdueDebtorsCount === 1 ? 'client account' : 'client accounts'} with outstanding fee balance
                  </span>
                </div>
                <div className="font-mono tabular-nums text-[12px] text-[#6E6E73] dark:text-[#8E8E93] mt-0.5">
                  Total pending: ₹{totalReceivables.toLocaleString('en-IN')} • {overdueDebtors.map(d => d.clientName).slice(0, 3).join(', ')}
                </div>
              </div>

              <div className="flex items-center gap-1 text-[12px] text-[#0071E3] dark:text-[#2997FF] font-medium shrink-0">
                <span>View Debtors →</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Two-Column Section: Deadlines with Live Progress & Clean Staff Workload */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Statutory Deadlines (November 2026) with Live Completion Pill */}
        <div className="bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-[6px] overflow-hidden">
          <div className="px-4 py-2.5 border-b border-[#E5E5EA] dark:border-[#2C2C2E] flex items-center justify-between">
            <span className="text-[12px] uppercase tracking-[0.04em] font-semibold text-[#6E6E73] dark:text-[#8E8E93]">
              Statutory Deadlines (November 2026)
            </span>
            <button
              onClick={() => onNavigateTab('gst-tracker')}
              className="text-[12px] text-[#0071E3] dark:text-[#2997FF] hover:underline"
            >
              Full Schedule
            </button>
          </div>

          <div className="divide-y divide-[#E5E5EA] dark:divide-[#2C2C2E]">
            {statutoryDeadlines.map((d, index) => {
              const diffTime = d.targetDate.getTime() - today.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              const isUrgent = diffDays <= 3;
              const { filed, total } = getDeadlineCompletion(d.returnTypeFilter);

              return (
                <div 
                  key={index} 
                  onClick={() => onNavigateTab('monthly')}
                  className="px-4 py-2.5 flex items-center justify-between text-[13px] hover:bg-[#F2F2F7] dark:hover:bg-[#242426] transition-colors cursor-pointer group"
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7] truncate">{d.title}</span>
                      <span className="font-mono text-[10px] text-[#6E6E73] dark:text-[#8E8E93] bg-[#F2F2F7] dark:bg-[#2C2C2E] px-1.5 py-0.2 rounded-[4px] shrink-0">
                        {d.code}
                      </span>
                    </div>
                    <div className="text-[11.5px] text-[#6E6E73] dark:text-[#8E8E93] mt-0.5">
                      {d.period}
                    </div>
                  </div>

                  <div className="text-right shrink-0 flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1.5">
                      {total > 0 && (
                        <span className="font-mono tabular-nums text-[11px] font-medium px-1.5 py-0.2 rounded-[4px] bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7]">
                          {filed} / {total} Filed
                        </span>
                      )}
                      <span className={`font-mono tabular-nums text-[11px] font-medium px-1.5 py-0.2 rounded-[4px] ${
                        isUrgent
                          ? 'bg-[#D97706]/10 text-[#D97706] dark:text-[#FF9F0A]'
                          : 'text-[#6E6E73] dark:text-[#8E8E93]'
                      }`}>
                        {diffDays <= 0 ? 'Due Today' : `In ${diffDays}d`}
                      </span>
                    </div>
                    <span className="font-mono tabular-nums text-[11.5px] text-[#86868B]">
                      {d.formattedCutoff}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Staff Workload with Compact Badges and Segmented Breakdown */}
        <div className="bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-[6px] overflow-hidden flex flex-col justify-between">
          <div className="px-4 py-2.5 border-b border-[#E5E5EA] dark:border-[#2C2C2E] flex items-center justify-between">
            <span className="text-[12px] uppercase tracking-[0.04em] font-semibold text-[#6E6E73] dark:text-[#8E8E93]">
              October Filings Completion by Staff
            </span>
            <button
              onClick={() => onNavigateTab('staff')}
              className="text-[12px] text-[#0071E3] dark:text-[#2997FF] hover:underline"
            >
              View Calls
            </button>
          </div>

          <div className="p-4 space-y-4">
            {staffList.map((staff) => {
              const staffTasks = monthlyTasks.filter((t) => t.assignedStaffId === staff.id);
              const staffFiled = staffTasks.filter((t) => t.status === 'Filed').length;
              const staffDocsPending = staffTasks.filter((t) => t.status === 'Docs Pending').length;
              const staffInProgress = staffTasks.filter((t) => t.status === 'In Progress').length;
              const staffDraftReady = staffTasks.filter((t) => t.status === 'Draft Ready').length;
              const percent = staffTasks.length > 0 ? Math.round((staffFiled / staffTasks.length) * 100) : 0;

              // Compact role badge
              const compactRole = staff.role.includes('Partner') ? 'Partner' : 'Tax Executive';

              return (
                <div key={staff.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-[13px]">
                    <button
                      onClick={() => {
                        onFilterStaff(staff.id);
                        onNavigateTab('monthly');
                      }}
                      className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7] hover:underline text-left flex items-center gap-1.5"
                    >
                      <span>{staff.name}</span>
                      <span className="text-[11px] font-mono px-1.5 py-0.2 rounded-[4px] bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#6E6E73] dark:text-[#8E8E93]">
                        {compactRole}
                      </span>
                    </button>

                    <div className="text-[12px] font-mono tabular-nums text-[#6E6E73] dark:text-[#8E8E93]">
                      {staffTasks.length > 0 ? (
                        <span>{staffFiled} / {staffTasks.length} ({percent}%)</span>
                      ) : (
                        <span className="text-[#86868B]">No filings assigned</span>
                      )}
                    </div>
                  </div>

                  {/* Segmented status breakdown text */}
                  {staffTasks.length > 0 && (
                    <div className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93] flex items-center gap-2">
                      {staffFiled > 0 && <span>{staffFiled} Filed</span>}
                      {staffDraftReady > 0 && <span>• {staffDraftReady} Draft Ready</span>}
                      {staffInProgress > 0 && <span>• {staffInProgress} In Progress</span>}
                      {staffDocsPending > 0 && <span>• {staffDocsPending} Docs Pending</span>}
                    </div>
                  )}

                  {/* Thin hairline progress track */}
                  {staffTasks.length > 0 && (
                    <div className="h-1 w-full bg-[#E5E5EA] dark:bg-[#2C2C2E] rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${percent === 100 ? 'bg-[#16A34A] dark:bg-[#34C759]' : 'bg-[#0071E3]'}`}
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  )}
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
