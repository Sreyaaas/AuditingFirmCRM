import React, { useState } from 'react';
import { 
  MessageSquare, 
  ChevronLeft, 
  ChevronRight, 
  ArrowUpRight, 
  Copy, 
  Check, 
  ChevronDown 
} from 'lucide-react';
import { MonthlyTask, StaffMember, FilingStatus } from '../types/crm';
import { Avatar, Badge, Button, EmptyState, IconButton, Menu, PageHeader, Pagination, SearchInput, Select, TableCard, Tabs, Tone, cn } from './ui';

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

  const statusBadgeTone: Record<FilingStatus, Tone> = {
    Filed: 'success',
    'Draft Ready': 'info',
    'In Progress': 'neutral',
    'Docs Pending': 'warning',
    Overdue: 'danger',
  };

  const renderDueDateCell = (task: MonthlyTask) => {
    const formatted = formatHumanReadableDate(task.dueDate);
    let rel: React.ReactNode = null;
    if (task.status !== 'Filed') {
      if (task.daysRemaining < 0) rel = <span className="text-danger">{Math.abs(task.daysRemaining)}d late</span>;
      else if (task.daysRemaining <= 5) rel = <span className="text-warning">{task.daysRemaining === 0 ? 'Today' : `In ${task.daysRemaining}d`}</span>;
      else rel = <span className="text-fg-subtle">In {task.daysRemaining}d</span>;
    }
    return (
      <div className="num">
        <div className={cn('text-sm', task.status === 'Filed' ? 'text-fg-subtle' : 'text-fg')}>{formatted}</div>
        {rel && <div className="text-xs font-medium">{rel}</div>}
      </div>
    );
  };

  const periodIdx = periods.indexOf(selectedPeriod);

  return (
    <div className="space-y-4">
      <PageHeader
        title="GST & Audit"
        description={`${tasks.length} engagements · Monthly GST, TDS and payroll returns`}
        actions={
          <>
            <div className="flex items-center h-8 rounded-md border border-line bg-surface shadow-xs">
              <IconButton icon={ChevronLeft} label="Previous period" size="sm" onClick={handlePeriodPrev} disabled={periodIdx === 0} />
              <span className="num w-[72px] text-center text-sm font-medium text-fg">{selectedPeriod}</span>
              <IconButton icon={ChevronRight} label="Next period" size="sm" onClick={handlePeriodNext} disabled={periodIdx === periods.length - 1} />
            </div>
            {!selectedStaffId && (
              <Select
                value={staffFilterState}
                onChange={(e) => {
                  setStaffFilterState(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-auto min-w-[128px]"
              >
                <option value="all">All Staff</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            )}
          </>
        }
      />

      <TableCard
        toolbar={
          <>
            <div className="px-3 pt-1 flex flex-col lg:flex-row lg:items-end justify-between gap-2 border-b border-line">
              <Tabs
                className="border-b-0 -mb-px"
                value={statusFilter}
                onChange={(v) => {
                  setStatusFilter(v);
                  setCurrentPage(1);
                }}
                options={tabs.map((t) => ({ value: t.id, label: t.label, count: t.count }))}
              />
              <div className="flex items-center gap-2 pb-2">
                <Select
                  value={filingTypeFilter}
                  onChange={(e) => {
                    setFilingTypeFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-7 text-xs w-auto"
                >
                  <option value="all">All returns</option>
                  {filingTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </Select>
                <SearchInput
                  placeholder="Search clients…"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  wrapperClassName="w-40 sm:w-52"
                  className="h-7 text-xs"
                />
              </div>
            </div>
            {selectedTaskIds.length > 0 && (
              <div className="flex items-center justify-between gap-3 px-3 h-10 bg-subtle border-b border-line text-xs animate-fade-in">
                <span className="font-medium text-fg num">{selectedTaskIds.length} selected</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-fg-subtle mr-1">Mark as</span>
                  <Button size="sm" onClick={() => handleBulkStatusUpdate('Draft Ready')}>
                    Draft Ready
                  </Button>
                  <Button size="sm" variant="primary" onClick={() => handleBulkStatusUpdate('Filed')}>
                    Filed
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedTaskIds([])}>
                    Clear
                  </Button>
                </div>
              </div>
            )}
          </>
        }
        footer={
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            totalItems={filteredTasks.length}
            pageSize={itemsPerPage}
            onChange={setCurrentPage}
            noun="tasks"
          />
        }
      >
        <table className="data-table">
          <thead>
            <tr>
              <th className="w-10 !pr-0">
                <input type="checkbox" aria-label="Select all" checked={allCurrentSelected} onChange={toggleSelectAll} className="h-3.5 w-3.5 cursor-pointer align-middle" />
              </th>
              <th className="min-w-[220px]">Client</th>
              <th>Return</th>
              <th>Owner</th>
              <th>Due</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedTasks.length === 0 ? (
              <tr>
                <td colSpan={7} className="!h-auto">
                  <EmptyState title="No tasks match these filters" description="Try another status, return type or search term." />
                </td>
              </tr>
            ) : (
              paginatedTasks.map((task) => {
                const staff = getStaff(task.assignedStaffId);
                const isSelected = selectedTaskIds.includes(task.id);
                const isFiled = task.status === 'Filed';

                return (
                  <tr key={task.id} className={cn('group', isSelected && '!bg-accent/[0.04]')}>
                    <td className="!pr-0">
                      <input type="checkbox" aria-label={`Select ${task.tradeName}`} checked={isSelected} onChange={() => toggleSelectRow(task.id)} className="h-3.5 w-3.5 cursor-pointer align-middle" />
                    </td>
                    <td className="py-2">
                      <button onClick={() => onSelectClient(task.clientId)} className="block max-w-xs truncate text-left font-medium text-fg hover:underline underline-offset-2">
                        {task.tradeName}
                      </button>
                      <div className="ident text-fg-subtle mt-0.5">{task.gstin}</div>
                    </td>
                    <td className="text-fg whitespace-nowrap">{task.filingType}</td>
                    <td>
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        {staff && <Avatar initials={staff.initials} size="xs" />}
                        <span className={staff ? 'text-fg' : 'text-fg-faint'}>{staff?.name || 'Unassigned'}</span>
                      </div>
                    </td>
                    <td className="py-2 whitespace-nowrap">{renderDueDateCell(task)}</td>
                    <td>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setOpenStatusMenuId(openStatusMenuId === task.id ? null : task.id)}
                            className="inline-flex items-center gap-0.5 rounded-sm focus-visible:ring-2 focus-visible:ring-accent/40"
                            title="Click to update status"
                          >
                            <Badge tone={statusBadgeTone[task.status]} dot>
                              {task.status}
                            </Badge>
                            <ChevronDown className="w-3 h-3 text-fg-faint opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                          <Menu
                            open={openStatusMenuId === task.id}
                            onClose={() => setOpenStatusMenuId(null)}
                            title="Set status"
                            items={ALL_STATUSES.map((st) => ({ value: st, label: st, selected: task.status === st }))}
                            onSelect={(v) => onUpdateStatus(task.id, v as FilingStatus)}
                          />
                        </div>

                        {task.arnNumber && (
                          <button
                            type="button"
                            onClick={(e) => handleCopyArn(task.arnNumber!, e)}
                            className="group/arn inline-flex items-center gap-1 h-5 px-1.5 rounded-sm border border-line ident text-2xs text-fg-subtle hover:text-fg transition-colors"
                            title={`Copy ARN ${task.arnNumber}`}
                          >
                            {task.arnNumber}
                            {copiedArn === task.arnNumber ? (
                              <Check className="w-3 h-3 text-success" />
                            ) : (
                              <Copy className="w-3 h-3 opacity-0 group-hover/arn:opacity-100 transition-opacity" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          icon={MessageSquare}
                          onClick={() => onOpenWhatsApp(task)}
                          title={isFiled ? 'Share filing acknowledgment via WhatsApp' : 'Send WhatsApp reminder'}
                        >
                          {isFiled ? 'Send Receipt' : 'Remind'}
                        </Button>
                        <IconButton icon={ArrowUpRight} label="View client account" size="sm" onClick={() => onSelectClient(task.clientId)} />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </TableCard>
    </div>
  );
};
