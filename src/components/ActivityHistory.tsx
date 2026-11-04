import React, { useState } from 'react';
import { 
  Search, 
  X
} from 'lucide-react';
import { ActivityLog } from '../types/crm';

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

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'Payment':
        return (
          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium text-[#34C759] bg-[#34C759]/10">
            Payment
          </span>
        );
      case 'Filing':
        return (
          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium text-[#0071E3] dark:text-[#2997FF] bg-[#0071E3]/10">
            Filing
          </span>
        );
      case 'Account':
        return (
          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium text-[#FF9500] bg-[#FF9500]/10">
            Account
          </span>
        );
      default:
        return (
          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium text-[#6E6E73] dark:text-[#8E8E93] bg-[#F2F2F7] dark:bg-[#2C2C2E]">
            {category}
          </span>
        );
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E5EA] dark:border-[#2C2C2E] pb-3">
        <div>
          <h1 className="text-[22px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight">
            Activity History &amp; Audit Trail
          </h1>
          <p className="text-[13px] text-[#6E6E73] dark:text-[#8E8E93] mt-0.5">
            Immutable log of client filings, payments, and staff operations
          </p>
        </div>

        <div className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93] font-tabular">
          {filteredLogs.length} actions logged
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FFFFFF] dark:bg-[#1C1C1E] p-3 border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-[8px]">
        <div className="flex items-center gap-2 flex-1 max-w-sm bg-[#F2F2F7] dark:bg-[#242426] px-2.5 py-1.5 rounded-[6px]">
          <Search className="w-3.5 h-3.5 text-[#6E6E73] dark:text-[#8E8E93] shrink-0 stroke-[1.5]" />
          <input
            type="text"
            placeholder="Search activity by employee, action, details..."
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

        <div className="flex items-center gap-2 text-[13px]">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1 bg-[#F2F2F7] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] text-[#1D1D1F] dark:text-[#F5F5F7] text-[12px] focus:outline-none"
          >
            <option value="all">All Categories</option>
            <option value="Payment">Payments &amp; Collections</option>
            <option value="Filing">GST &amp; Tax Filings</option>
            <option value="Task">Tasks &amp; Workload</option>
            <option value="Client">Client Calls &amp; Tickets</option>
            <option value="Account">Account &amp; Security</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-[8px] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px] border-collapse">
            <thead>
              <tr className="bg-[#FBFBFD] dark:bg-[#161618] text-[#6E6E73] dark:text-[#8E8E93] text-[12px] border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
                <th className="py-2.5 px-3 font-semibold w-40">Timestamp</th>
                <th className="py-2.5 px-3 font-semibold">User</th>
                <th className="py-2.5 px-3 font-semibold text-center">Category</th>
                <th className="py-2.5 px-3 font-semibold">Action</th>
                <th className="py-2.5 px-3 font-semibold min-w-[280px]">Details</th>
                <th className="py-2.5 px-3 font-semibold">Associated Account</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5EA] dark:divide-[#2C2C2E]">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-[#F2F2F7] dark:hover:bg-[#242426] transition-colors">
                  <td className="py-2.5 px-3 font-tabular text-[12px] text-[#6E6E73] dark:text-[#8E8E93]">
                    {log.timestamp}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">{log.userName}</span>
                    <span className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93] ml-1.5">({log.userRole})</span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {getCategoryBadge(log.category)}
                  </td>
                  <td className="py-2.5 px-3 font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
                    {log.action}
                  </td>
                  <td className="py-2.5 px-3 text-[#6E6E73] dark:text-[#8E8E93]">
                    {log.details}
                  </td>
                  <td className="py-2.5 px-3 text-[#1D1D1F] dark:text-[#F5F5F7]">
                    {log.clientName || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
