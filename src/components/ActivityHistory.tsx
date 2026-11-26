import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Download, History, Trash2 } from 'lucide-react';
import { ActivityLog } from '../types/crm';
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  PageHeader,
  Pagination,
  SearchInput,
  Segmented,
  Select,
  TableCard,
  Toolbar,
  Tone,
} from './ui';
import { useResponsivePageSize } from '../hooks/useResponsivePageSize';

interface ActivityHistoryProps {
  logs: ActivityLog[];
  onPruneOldLogs?: () => Promise<number> | number;
}

const getLogDateObj = (log: ActivityLog): Date | null => {
  if (log.rawTimestamp) {
    const d = new Date(log.rawTimestamp);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const parsed = new Date(log.timestamp);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const monthKeyOf = (d: Date): string => {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
    }).formatToParts(d);
    const y = parts.find((p) => p.type === 'year')?.value;
    const m = parts.find((p) => p.type === 'month')?.value;
    if (y && m) return `${y}-${m}`;
  } catch {}
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const dateKeyOf = (d: Date): string => {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return d.toDateString();
  }
};

const timeOnlyOf = (d: Date, fallback: string): string => {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(d);
  } catch {
    return fallback;
  }
};

const monthLabelOf = (key: string): string => {
  if (key === 'all') return 'All Months';
  const [y, m] = key.split('-').map(Number);
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${names[(m || 1) - 1] || key} ${y}`;
};

export const ActivityHistory: React.FC<ActivityHistoryProps> = ({ logs, onPruneOldLogs }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [memberFilter, setMemberFilter] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [confirmPrune, setConfirmPrune] = useState(false);
  const pageSize = useResponsivePageSize({ reservedHeight: 420, min: 8, max: 25 });

  // Distinct months (newest first) & members
  const monthOptions = useMemo(() => {
    const set = new Set<string>();
    for (const l of logs) {
      const d = getLogDateObj(l);
      if (d) set.add(monthKeyOf(d));
    }
    return ['all', ...Array.from(set).sort().reverse()];
  }, [logs]);

  const memberOptions = useMemo(() => {
    const set = new Set<string>();
    for (const l of logs) if (l.userName) set.add(l.userName);
    return Array.from(set).sort();
  }, [logs]);

  // Distinct dates inside the selected month
  const dateOptions = useMemo(() => {
    const set = new Set<string>();
    for (const l of logs) {
      const d = getLogDateObj(l);
      if (!d) continue;
      if (selectedMonth !== 'all' && monthKeyOf(d) !== selectedMonth) continue;
      set.add(dateKeyOf(d));
    }
    return Array.from(set);
  }, [logs, selectedMonth]);

  useEffect(() => {
    setSelectedDate('all');
    setPage(1);
  }, [selectedMonth]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, categoryFilter, memberFilter, selectedDate]);

  // Count entries older than 6 months
  const oldLogsCount = useMemo(() => {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 6);
    const cutoffMs = cutoff.getTime();
    return logs.filter((l) => {
      const d = getLogDateObj(l);
      return d ? d.getTime() < cutoffMs : false;
    }).length;
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return logs.filter((log) => {
      if (categoryFilter !== 'all' && log.category !== categoryFilter) return false;
      if (memberFilter !== 'all' && log.userName !== memberFilter) return false;

      const d = getLogDateObj(log);
      if (selectedMonth !== 'all' && (!d || monthKeyOf(d) !== selectedMonth)) return false;
      if (selectedDate !== 'all' && (!d || dateKeyOf(d) !== selectedDate)) return false;

      if (q) {
        return (
          log.userName.toLowerCase().includes(q) ||
          log.action.toLowerCase().includes(q) ||
          log.details.toLowerCase().includes(q) ||
          (log.clientName && log.clientName.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [logs, categoryFilter, memberFilter, selectedMonth, selectedDate, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const paginatedLogs = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, page, pageSize]);

  // Group paginated rows by date for clean visual hierarchy
  const groupedPage = useMemo(() => {
    const groups: { dateLabel: string; items: { log: ActivityLog; timeLabel: string }[] }[] = [];
    for (const log of paginatedLogs) {
      const d = getLogDateObj(log);
      const dateLabel = d ? dateKeyOf(d) : 'Earlier';
      const timeLabel = d ? timeOnlyOf(d, log.timestamp) : log.timestamp;
      const last = groups[groups.length - 1];
      if (last && last.dateLabel === dateLabel) {
        last.items.push({ log, timeLabel });
      } else {
        groups.push({ dateLabel, items: [{ log, timeLabel }] });
      }
    }
    return groups;
  }, [paginatedLogs]);

  const handleDownloadBackup = () => {
    const rows = filteredLogs.map((l) => ({
      Timestamp: l.timestamp,
      Member: l.userName,
      Role: l.userRole,
      Category: l.category,
      Event: l.action,
      Details: l.details,
      Client: l.clientName || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Audit Trail');
    const stamp = new Date().toISOString().slice(0, 10);
    const suffix = selectedMonth === 'all' ? 'all' : selectedMonth;
    XLSX.writeFile(wb, `Audit_Trail_${suffix}_${stamp}.xlsx`);
  };

  const categoryTone: Record<string, Tone> = {
    Payment: 'success',
    Filing: 'info',
    Account: 'warning',
    Security: 'danger',
  };

  return (
    <div className="space-y-4">
      <PageHeader
        section="activity"
        title="Audit Trail"
        description="Organized month-by-month and grouped by date. Automatically retains 6 months of active history."
        actions={
          <>
            <Button
              variant="secondary"
              icon={Download}
              onClick={handleDownloadBackup}
              disabled={filteredLogs.length === 0}
              title="Download Audit Trail backup as Excel (.xlsx)"
            >
              Download Audit Backup
            </Button>
            {onPruneOldLogs && oldLogsCount > 0 && (
              <Button
                variant="danger"
                icon={Trash2}
                onClick={() => setConfirmPrune(true)}
                title="Remove audit logs older than 6 months to keep the database lean"
              >
                Prune &gt; 6 Months ({oldLogsCount})
              </Button>
            )}
          </>
        }
      />

      {monthOptions.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto max-w-full">
          <span className="text-xs font-medium text-fg-subtle shrink-0">Month:</span>
          <Segmented
            value={selectedMonth}
            onChange={setSelectedMonth}
            options={monthOptions.map((m) => ({
              value: m,
              label: monthLabelOf(m),
            }))}
          />
        </div>
      )}

      <TableCard
        toolbar={
          <Toolbar>
            <SearchInput
              placeholder="Search member, event, details or client…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              wrapperClassName="w-full sm:w-64"
              className="h-7 text-xs"
            />
            {dateOptions.length > 1 && (
              <Select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="h-7 text-xs w-auto"
                aria-label="Filter by date"
              >
                <option value="all">All Dates</option>
                {dateOptions.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </Select>
            )}
            <Select
              value={memberFilter}
              onChange={(e) => setMemberFilter(e.target.value)}
              className="h-7 text-xs w-auto"
              aria-label="Filter by team member"
            >
              <option value="all">All Members</option>
              {memberOptions.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-7 text-xs w-auto"
              aria-label="Filter by category"
            >
              <option value="all">All Categories</option>
              <option value="Payment">Payments</option>
              <option value="Filing">Filings</option>
              <option value="Task">Tasks</option>
              <option value="Client">Clients &amp; calls</option>
              <option value="Account">Account</option>
              <option value="Security">Security</option>
            </Select>
          </Toolbar>
        }
        footer={
          filteredLogs.length > 0 ? (
            <Pagination
              page={page}
              totalPages={totalPages}
              totalItems={filteredLogs.length}
              pageSize={pageSize}
              onChange={setPage}
              noun="events"
            />
          ) : undefined
        }
      >
        <table className="data-table">
          <thead>
            <tr>
              <th className="w-28">Time</th>
              <th>Member</th>
              <th>Category</th>
              <th>Event</th>
              <th className="min-w-[260px]">Details</th>
              <th>Client</th>
            </tr>
          </thead>
          <tbody>
            {paginatedLogs.length === 0 ? (
              <tr>
                <td colSpan={6} className="!h-auto py-10">
                  <EmptyState
                    icon={History}
                    title="No events found"
                    description="Try clearing your search, month, date, or category filters."
                  />
                </td>
              </tr>
            ) : (
              groupedPage.map((group) => (
                <React.Fragment key={group.dateLabel}>
                  <tr className="bg-subtle/70">
                    <td colSpan={6} className="!h-8 py-1.5 px-4 text-2xs font-semibold uppercase tracking-wider text-fg-subtle">
                      {group.dateLabel} · {group.items.length} {group.items.length === 1 ? 'event' : 'events'}
                    </td>
                  </tr>
                  {group.items.map(({ log, timeLabel }) => (
                    <tr key={log.id}>
                      <td className="num text-xs text-fg-subtle whitespace-nowrap">{timeLabel}</td>
                      <td className="whitespace-nowrap">
                        <span className="text-fg">{log.userName}</span>
                        <span className="text-xs text-fg-subtle ml-1.5 capitalize">{log.userRole}</span>
                      </td>
                      <td>
                        <Badge tone={categoryTone[log.category] || 'neutral'}>{log.category}</Badge>
                      </td>
                      <td className="font-medium text-fg whitespace-nowrap">{log.action}</td>
                      <td className="text-fg-muted py-2">{log.details}</td>
                      <td className="text-fg whitespace-nowrap">
                        {log.clientName || <span className="text-fg-faint">—</span>}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </TableCard>

      {onPruneOldLogs && (
        <ConfirmDialog
          isOpen={confirmPrune}
          onClose={() => setConfirmPrune(false)}
          title={`Prune ${oldLogsCount} audit logs older than 6 months?`}
          description="We recommend clicking 'Download Audit Backup' first to keep an Excel archive. Pruning permanently removes logs older than 6 months from Supabase."
          confirmLabel="Prune Old Logs"
          danger
          onConfirm={() => {
            onPruneOldLogs();
            setConfirmPrune(false);
          }}
        />
      )}
    </div>
  );
};
