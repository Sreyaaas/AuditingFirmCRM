import React, { useState } from 'react';
import { History } from 'lucide-react';
import { ActivityLog } from '../types/crm';
import { Badge, EmptyState, PageHeader, SearchInput, Select, TableCard, Toolbar, Tone } from './ui';

interface ActivityHistoryProps {
  logs: ActivityLog[];
}

export const ActivityHistory: React.FC<ActivityHistoryProps> = ({ logs }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const filteredLogs = logs.filter((log) => {
    if (categoryFilter !== 'all' && log.category !== categoryFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        log.userName.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q) ||
        (log.clientName && log.clientName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const categoryTone: Record<string, Tone> = {
    Payment: 'success',
    Filing: 'info',
    Account: 'warning',
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Audit Trail"
        description="Every filing, payment and account change, with who made it and when"
      />

      <TableCard
        toolbar={
          <Toolbar className="justify-between">
            <SearchInput
              placeholder="Member, action, details or client"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              wrapperClassName="w-full sm:w-72"
              className="h-7 text-xs"
            />
            <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="h-7 text-xs w-auto">
              <option value="all">All categories</option>
              <option value="Payment">Payments</option>
              <option value="Filing">Filings</option>
              <option value="Task">Tasks</option>
              <option value="Client">Clients &amp; calls</option>
              <option value="Account">Account &amp; security</option>
            </Select>
          </Toolbar>
        }
        footer={
          <div className="flex items-center px-3 h-11 border-t border-line text-xs text-fg-subtle num">
            {filteredLogs.length} of {logs.length} events
          </div>
        }
      >
        <table className="data-table">
          <thead>
            <tr>
              <th className="w-44">Time</th>
              <th>Member</th>
              <th>Category</th>
              <th>Event</th>
              <th className="min-w-[280px]">Details</th>
              <th>Client</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length === 0 && (
              <tr>
                <td colSpan={6} className="!h-auto">
                  <EmptyState icon={History} title="No events found" description="Adjust the category or search term." />
                </td>
              </tr>
            )}
            {filteredLogs.map((log) => (
              <tr key={log.id}>
                <td className="num text-xs text-fg-subtle whitespace-nowrap">{log.timestamp}</td>
                <td className="whitespace-nowrap">
                  <span className="text-fg">{log.userName}</span>
                  <span className="text-xs text-fg-subtle ml-1.5 capitalize">{log.userRole}</span>
                </td>
                <td>
                  <Badge tone={categoryTone[log.category] || 'neutral'}>{log.category}</Badge>
                </td>
                <td className="font-medium text-fg">{log.action}</td>
                <td className="text-fg-muted py-2">{log.details}</td>
                <td className="text-fg whitespace-nowrap">{log.clientName || <span className="text-fg-faint">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableCard>
    </div>
  );
};
