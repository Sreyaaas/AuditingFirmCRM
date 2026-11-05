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
import { Avatar, Badge, Button, Card, CardHeader, Metric, MetricGrid, PageHeader, Progress, StatusDot, Tone, cn, formatDate } from './ui';

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

  const attentionCount =
    immediateRisks.length + (docsPendingCount > 0 ? 1 : 0) + (overdueDebtorsCount > 0 ? 1 : 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={isAdmin ? 'Practice overview' : `Good day, ${currentUser.name}`}
        description={
          <span className="num">
            {formattedToday} · Q3 FY 2026–27 · {totalClients} active clients
          </span>
        }
      />

      {/* KPI strip */}
      <MetricGrid className="grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Fee receivables"
          value={`₹${totalReceivables.toLocaleString('en-IN')}`}
          hint={`${overdueDebtorsCount} ${overdueDebtorsCount === 1 ? 'account' : 'accounts'} outstanding`}
          onClick={() => onNavigateTab('debtors')}
        />
        <Metric
          label="Monthly returns"
          value={recurringTotal}
          hint={`${filedCount} of ${recurringTotal} filed`}
          onClick={() => onNavigateTab('monthly')}
        />
        <Metric
          label="Overdue filings"
          value={overdueCount}
          tone={overdueCount > 0 ? 'danger' : undefined}
          hint={overdueCount > 0 ? 'Requires immediate action' : 'All on schedule'}
          onClick={() => onNavigateTab('gst-tracker')}
        />
        <Metric
          label="Awaiting documents"
          value={docsPendingCount}
          tone={docsPendingCount > 0 ? 'warning' : undefined}
          hint={docsPendingCount === 1 ? '1 client' : `${docsPendingCount} clients`}
          onClick={() => onNavigateTab('monthly', 'Docs Pending')}
        />
      </MetricGrid>

      {/* Needs attention */}
      <Card className="overflow-hidden">
        <CardHeader
          title="Needs attention"
          actions={<span className="num text-xs text-fg-subtle">{attentionCount} open</span>}
        />
        <div className="divide-y divide-line">
          {immediateRisks.length > 0 ? (
            immediateRisks.map((task) => (
              <AttentionRow
                key={task.id}
                tone="warning"
                title={`${task.filingType} · ${task.tradeName}`}
                tag={
                  <Badge tone="warning" className="num">
                    {task.daysRemaining === 0 ? 'Due today' : `Due in ${task.daysRemaining}d`}
                  </Badge>
                }
                meta={`${staffList.find((s) => s.id === task.assignedStaffId)?.name || 'Unassigned'} · ${task.status} · Due ${formatDate(task.dueDate)}`}
                action="Review"
                onClick={() => onNavigateTab('monthly')}
              />
            ))
          ) : (
            <AttentionRow
              tone="success"
              title="Filings on schedule"
              meta="Nothing due in the next 48 hours."
              action="Open queue"
              onClick={() => onNavigateTab('monthly')}
            />
          )}

          {docsPendingCount > 0 && (
            <AttentionRow
              tone="neutral"
              title={docsPendingTasks.map((t) => t.tradeName).join(', ')}
              tag={<Badge>Documents pending</Badge>}
              meta="October 2026 sales and purchase bills required for GSTR-1 and GSTR-3B."
              action="Send reminder"
              onClick={() => onNavigateTab('monthly', 'Docs Pending')}
            />
          )}

          {overdueDebtorsCount > 0 && (
            <AttentionRow
              tone="danger"
              title={`${overdueDebtorsCount} ${overdueDebtorsCount === 1 ? 'account' : 'accounts'} with outstanding fees`}
              tag={<Badge tone="danger">Receivables</Badge>}
              meta={`₹${totalReceivables.toLocaleString('en-IN')} · ${overdueDebtors.map((d) => d.clientName).slice(0, 3).join(', ')}`}
              action="View debtors"
              onClick={() => onNavigateTab('debtors')}
            />
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Statutory calendar */}
        <Card className="overflow-hidden">
          <CardHeader
            title="Statutory calendar"
            description="November 2026"
            actions={
              <Button size="sm" variant="ghost" onClick={() => onNavigateTab('gst-tracker')}>
                Full Schedule
              </Button>
            }
          />
          <div className="divide-y divide-line">
            {statutoryDeadlines.map((d, index) => {
              const diffDays = Math.ceil((d.targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              const isUrgent = diffDays <= 3;
              const { filed, total } = getDeadlineCompletion(d.returnTypeFilter);
              const [day, mon] = d.formattedCutoff.split(' ');

              return (
                <button
                  key={index}
                  onClick={() => onNavigateTab('monthly')}
                  className="w-full text-left px-4 py-2.5 flex items-center gap-4 hover:bg-subtle transition-colors"
                >
                  <div className="w-10 shrink-0 text-center">
                    <div className="num text-lg font-semibold text-fg leading-6">{day}</div>
                    <div className="text-2xs uppercase tracking-wider text-fg-subtle">{mon}</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-fg truncate">{d.title}</div>
                    <div className="text-xs text-fg-subtle truncate">{d.period}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={cn('num text-xs font-medium', isUrgent ? 'text-warning' : 'text-fg-muted')}>
                      {diffDays <= 0 ? 'Due today' : `In ${diffDays} days`}
                    </span>
                    {total > 0 && (
                      <span className="num text-2xs text-fg-subtle">
                        {filed}/{total} filed
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Team progress */}
        <Card className="overflow-hidden flex flex-col">
          <CardHeader
            title="Team progress"
            description="October filings"
            actions={
              <Button size="sm" variant="ghost" onClick={() => onNavigateTab('staff')}>
                Reassign Work
              </Button>
            }
          />
          <div className="px-4 py-4 space-y-5 flex-1">
            {staffList.map((staff) => {
              const staffTasks = monthlyTasks.filter((t) => t.assignedStaffId === staff.id);
              const staffFiled = staffTasks.filter((t) => t.status === 'Filed').length;
              const staffDocsPending = staffTasks.filter((t) => t.status === 'Docs Pending').length;
              const staffInProgress = staffTasks.filter((t) => t.status === 'In Progress').length;
              const staffDraftReady = staffTasks.filter((t) => t.status === 'Draft Ready').length;
              const percent = staffTasks.length > 0 ? Math.round((staffFiled / staffTasks.length) * 100) : 0;
              const breakdown = [
                staffFiled > 0 && `${staffFiled} filed`,
                staffDraftReady > 0 && `${staffDraftReady} draft ready`,
                staffInProgress > 0 && `${staffInProgress} in progress`,
                staffDocsPending > 0 && `${staffDocsPending} awaiting docs`,
              ].filter(Boolean);

              return (
                <div key={staff.id}>
                  <div className="flex items-center justify-between gap-3">
                    <button
                      onClick={() => {
                        onFilterStaff(staff.id);
                        onNavigateTab('monthly');
                      }}
                      className="flex items-center gap-2.5 min-w-0 text-left group"
                    >
                      <Avatar initials={staff.initials} size="sm" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-fg group-hover:underline underline-offset-2 truncate">{staff.name}</div>
                        <div className="text-xs text-fg-subtle truncate">
                          {staff.role.includes('Partner') ? 'Partner' : 'Audit & Tax Executive'}
                        </div>
                      </div>
                    </button>
                    <div className="text-right shrink-0">
                      {staffTasks.length > 0 ? (
                        <>
                          <div className="num text-sm font-medium text-fg">{percent}%</div>
                          <div className="num text-2xs text-fg-subtle">
                            {staffFiled}/{staffTasks.length}
                          </div>
                        </>
                      ) : (
                        <span className="text-xs text-fg-faint">No filings</span>
                      )}
                    </div>
                  </div>
                  {staffTasks.length > 0 && (
                    <div className="mt-2.5 pl-[34px]">
                      <Progress value={percent} tone={percent === 100 ? 'success' : 'neutral'} />
                      <div className="text-2xs text-fg-subtle mt-1.5">{breakdown.join(' · ')}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
};

const AttentionRow: React.FC<{
  tone: Tone;
  tag?: React.ReactNode;
  title: React.ReactNode;
  meta: React.ReactNode;
  action: string;
  onClick: () => void;
}> = ({ tone, tag, title, meta, action, onClick }) => (
  <button
    onClick={onClick}
    className="group w-full text-left px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-subtle transition-colors"
  >
    <div className="min-w-0 flex items-start gap-3">
      <StatusDot tone={tone} className="mt-[7px]" />
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-fg">{title}</span>
          {tag}
        </div>
        <div className="text-xs text-fg-subtle mt-0.5 num">{meta}</div>
      </div>
    </div>
    <span className="pl-[18px] sm:pl-0 inline-flex items-center gap-1 text-xs font-medium text-fg-muted group-hover:text-fg shrink-0 transition-colors">
      {action}
      <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.75} />
    </span>
  </button>
);
