import React, { useState, useMemo } from 'react';
import {
  Briefcase,
  Plus,
  MessageSquare,
  Trash2,
  ChevronDown,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { MonthlyTask, StaffMember, FilingStatus } from '../types/crm';
import {
  Avatar,
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  IconButton,
  Menu,
  Metric,
  MetricGrid,
  PageHeader,
  Pagination,
  SearchInput,
  Select,
  TableCard,
  Tabs,
  cn,
  formatDate,
  formatINR,
  statusTone,
} from './ui';

export interface OtherAssignmentsManagerProps {
  tasks: MonthlyTask[];
  staffList: StaffMember[];
  selectedStaffId?: string | null;
  isAdmin?: boolean;
  onUpdateStatus: (taskId: string, newStatus: FilingStatus) => void;
  onDelete?: (taskId: string) => void;
  onOpenWhatsApp: (task: MonthlyTask) => void;
  onSelectClient: (clientId: string) => void;
  onNewAssignment?: () => void;
}

const ASSIGNMENT_STATUSES: FilingStatus[] = [
  'Docs Pending',
  'In Progress',
  'Under Review',
  'Completed',
];

const FINANCIAL_YEARS = [
  'all',
  '2026-27',
  '2025-26',
  '2024-25',
  '2023-24',
  '2022-23',
  '2021-22',
];

export const OtherAssignmentsManager: React.FC<OtherAssignmentsManagerProps> = ({
  tasks,
  staffList,
  selectedStaffId,
  isAdmin,
  onUpdateStatus,
  onDelete,
  onOpenWhatsApp,
  onSelectClient,
  onNewAssignment,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [fyFilter, setFyFilter] = useState<string>('all');
  const [staffFilterState, setStaffFilterState] = useState<string>(selectedStaffId || 'all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [openStatusMenuId, setOpenStatusMenuId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<MonthlyTask | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 12;

  // Filter tasks
  const effectiveStaffFilter = selectedStaffId || (staffFilterState !== 'all' ? staffFilterState : null);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (effectiveStaffFilter && task.assignedStaffId !== effectiveStaffFilter) return false;
      if (statusFilter !== 'all') {
        if (statusFilter === 'Completed' && (task.status === 'Completed' || task.status === 'Filed')) {
          // match
        } else if (task.status !== statusFilter) {
          return false;
        }
      }
      if (fyFilter !== 'all') {
        const taskFY = task.financialYear || '2026-27';
        if (taskFY !== fyFilter) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const clientMatch = task.clientName.toLowerCase().includes(q) || task.tradeName.toLowerCase().includes(q);
        const titleMatch = (task.assignmentTitle || '').toLowerCase().includes(q) || task.filingType.toLowerCase().includes(q);
        const gstinMatch = task.gstin.toLowerCase().includes(q);
        const notesMatch = (task.notes || '').toLowerCase().includes(q);
        if (!clientMatch && !titleMatch && !gstinMatch && !notesMatch) return false;
      }
      return true;
    });
  }, [tasks, effectiveStaffFilter, statusFilter, fyFilter, searchQuery]);

  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage) || 1;
  const paginatedTasks = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTasks.slice(start, start + itemsPerPage);
  }, [filteredTasks, currentPage, itemsPerPage]);

  // Metrics
  const inProgressCount = useMemo(() => tasks.filter((t) => t.status === 'In Progress').length, [tasks]);
  const underReviewCount = useMemo(() => tasks.filter((t) => t.status === 'Under Review').length, [tasks]);
  const completedCount = useMemo(
    () => tasks.filter((t) => t.status === 'Completed' || t.status === 'Filed').length,
    [tasks]
  );
  const totalEstimatedFees = useMemo(
    () => tasks.reduce((sum, t) => sum + (t.estimatedFee || 0), 0),
    [tasks]
  );

  const getStaff = (id: string) => staffList.find((s) => s.id === id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        section="assignments"
        title="Other Assignments"
        description={`${tasks.length} client assignments · Secretarial, incorporation, deed amendments, and ad-hoc filings`}
        actions={
          <div className="flex items-center gap-2">
            {!selectedStaffId && (
              <Select
                value={staffFilterState}
                onChange={(e) => {
                  setStaffFilterState(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-auto min-w-[130px] h-8 text-xs"
              >
                <option value="all">All Staff</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            )}

            <Select
              value={fyFilter}
              onChange={(e) => {
                setFyFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-auto min-w-[120px] h-8 text-xs font-mono"
            >
              <option value="all">All FYs</option>
              {FINANCIAL_YEARS.filter((y) => y !== 'all').map((fy) => (
                <option key={fy} value={fy}>
                  FY {fy}
                </option>
              ))}
            </Select>

            {onNewAssignment && (
              <Button variant="primary" icon={Plus} onClick={onNewAssignment}>
                Add Assignment
              </Button>
            )}
          </div>
        }
      />

      {/* KPI Metric Strip */}
      <MetricGrid className="grid-cols-2 lg:grid-cols-5">
        <Metric label="Total Assignments" value={tasks.length} hint="All active & historical" />
        <Metric label="In Progress" value={inProgressCount} hint="Active assignment execution" tone="warning" />
        <Metric label="Under Review" value={underReviewCount} hint="Partner review pending" tone="info" />
        <Metric label="Completed" value={completedCount} hint="Assignments fulfilled" tone="success" />
        <Metric label="Total Value" value={formatINR(totalEstimatedFees)} hint="Estimated professional fees" />
      </MetricGrid>

      {/* Table Card */}
      <TableCard
        toolbar={
          <div className="space-y-2.5 px-3 py-2.5 border-b border-line">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <Tabs
                className="border-b-0 -mb-px"
                value={statusFilter}
                onChange={(v) => {
                  setStatusFilter(v);
                  setCurrentPage(1);
                }}
                options={[
                  { value: 'all', label: 'All', count: tasks.length },
                  {
                    value: 'Docs Pending',
                    label: 'Docs Pending',
                    count: tasks.filter((t) => t.status === 'Docs Pending').length || undefined,
                  },
                  {
                    value: 'In Progress',
                    label: 'In Progress',
                    count: inProgressCount || undefined,
                  },
                  {
                    value: 'Under Review',
                    label: 'Under Review',
                    count: underReviewCount || undefined,
                  },
                  {
                    value: 'Completed',
                    label: 'Completed',
                    count: completedCount || undefined,
                  },
                ]}
              />

              <div className="w-full lg:w-72">
                <SearchInput
                  placeholder="Search assignment or client…"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
            </div>
          </div>
        }
        footer={
          filteredTasks.length > 0 && (
            <Pagination
              page={currentPage}
              totalPages={totalPages}
              totalItems={filteredTasks.length}
              pageSize={itemsPerPage}
              onChange={setCurrentPage}
              noun="assignments"
            />
          )
        }
      >
        <table className="data-table">
          <thead>
            <tr>
              <th className="w-10 text-center">#</th>
              <th className="w-40">Due Date</th>
              <th className="w-56">Client</th>
              <th>Assignment Work / Scope</th>
              <th className="w-28 text-center">Financial Year</th>
              <th className="w-40">Owner</th>
              <th className="w-36 text-center">Status</th>
              <th className="w-32 text-right">Est. Fee</th>
              <th className="w-24 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedTasks.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12">
                  <EmptyState
                    icon={Briefcase}
                    title="No assignments found"
                    description={
                      searchQuery || statusFilter !== 'all' || fyFilter !== 'all'
                        ? 'Try clearing the search query or status filters.'
                        : 'No ad-hoc client assignments have been added yet.'
                    }
                    action={
                      onNewAssignment && (
                        <Button variant="primary" icon={Plus} onClick={onNewAssignment}>
                          Add First Assignment
                        </Button>
                      )
                    }
                  />
                </td>
              </tr>
            ) : (
              paginatedTasks.map((task, idx) => {
                const staff = getStaff(task.assignedStaffId);
                const isOverdue = task.daysRemaining < 0 && task.status !== 'Completed' && task.status !== 'Filed';
                const isDueSoon = task.daysRemaining >= 0 && task.daysRemaining <= 5 && task.status !== 'Completed' && task.status !== 'Filed';
                const isDone = task.status === 'Completed' || task.status === 'Filed';

                return (
                  <tr key={task.id} className="hover:bg-hover transition-colors">
                    {/* Index */}
                    <td className="text-center font-mono text-fg-subtle text-xs">
                      {(currentPage - 1) * itemsPerPage + idx + 1}
                    </td>

                    {/* Due Date */}
                    <td>
                      <div className="flex flex-col">
                        <span className="font-mono text-xs text-fg">{formatDate(task.dueDate)}</span>
                        <div className="mt-0.5">
                          {isDone ? (
                            <span className="text-3xs font-medium text-success">Fulfilled</span>
                          ) : isOverdue ? (
                            <span className="num text-3xs font-bold text-danger">Overdue ({Math.abs(task.daysRemaining)}d)</span>
                          ) : isDueSoon ? (
                            <span className="num text-3xs font-semibold text-warning">Due in {task.daysRemaining}d</span>
                          ) : (
                            <span className="num text-3xs text-fg-subtle">In {task.daysRemaining} days</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Client */}
                    <td>
                      <button
                        type="button"
                        onClick={() => onSelectClient(task.clientId)}
                        className="text-left group flex flex-col min-w-0"
                      >
                        <span className="text-sm font-semibold text-fg group-hover:text-accent truncate">
                          {task.tradeName}
                        </span>
                        <span className="ident text-2xs text-fg-subtle truncate">{task.gstin || 'Unregistered'}</span>
                      </button>
                    </td>

                    {/* Work / Scope */}
                    <td>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-fg truncate">
                          {task.assignmentTitle || task.filingType}
                        </div>
                        {task.notes && (
                          <div className="text-xs text-fg-subtle mt-0.5 truncate max-w-md">
                            {task.notes}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Financial Year */}
                    <td className="text-center">
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-subtle border border-line text-fg font-medium">
                        {task.financialYear || '2026-27'}
                      </span>
                    </td>

                    {/* Owner */}
                    <td>
                      <div className="flex items-center gap-2">
                        {staff ? (
                          <>
                            <Avatar initials={staff.initials} seed={staff.name} size="xs" />
                            <span className="text-xs font-medium text-fg truncate">{staff.name}</span>
                          </>
                        ) : (
                          <span className="text-xs text-fg-faint">—</span>
                        )}
                      </div>
                    </td>

                    {/* Status Dropdown */}
                    <td className="text-center">
                      <div className="relative inline-block">
                        <button
                          type="button"
                          onClick={() => setOpenStatusMenuId(openStatusMenuId === task.id ? null : task.id)}
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-line hover:border-line-strong bg-surface text-xs transition-colors"
                        >
                          <Badge tone={statusTone(task.status)} dot>
                            {task.status}
                          </Badge>
                          <ChevronDown className="w-3 h-3 text-fg-subtle" />
                        </button>

                        <Menu
                          open={openStatusMenuId === task.id}
                          onClose={() => setOpenStatusMenuId(null)}
                          items={ASSIGNMENT_STATUSES.map((st) => ({
                            value: st,
                            label: st,
                            selected: task.status === st,
                          }))}
                          onSelect={(val) => {
                            onUpdateStatus(task.id, val as FilingStatus);
                            setOpenStatusMenuId(null);
                          }}
                          align="right"
                          width="w-36"
                        />
                      </div>
                    </td>

                    {/* Estimated Fee */}
                    <td className="text-right num font-mono text-xs font-medium text-fg">
                      {task.estimatedFee && task.estimatedFee > 0 ? formatINR(task.estimatedFee) : '—'}
                    </td>

                    {/* Actions */}
                    <td className="text-right">
                      <div className="inline-flex items-center gap-1 justify-end">
                        <IconButton
                          icon={MessageSquare}
                          label="WhatsApp client"
                          size="sm"
                          onClick={() => onOpenWhatsApp(task)}
                          className="text-fg-subtle hover:text-success"
                        />
                        {isAdmin && onDelete && (
                          <IconButton
                            icon={Trash2}
                            label="Delete assignment"
                            size="sm"
                            onClick={() => setConfirmDelete(task)}
                            className="text-fg-subtle hover:text-danger"
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </TableCard>

      {/* Delete Confirmation */}
      {confirmDelete && (
        <ConfirmDialog
          isOpen
          title="Delete assignment"
          description={`Are you sure you want to delete assignment "${confirmDelete.assignmentTitle || confirmDelete.filingType}" for ${confirmDelete.tradeName}? This action cannot be undone.`}
          confirmLabel="Delete assignment"
          danger
          onClose={() => setConfirmDelete(null)}
          onConfirm={() => {
            if (onDelete) onDelete(confirmDelete.id);
            setConfirmDelete(null);
          }}
        />
      )}
    </div>
  );
};
