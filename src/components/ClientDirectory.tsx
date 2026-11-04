import React, { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight,
  MessageSquare,
  Search,
  ArrowUpRight,
  Plus
} from 'lucide-react';
import { Client, StaffMember } from '../types/crm';
import { NewClientModal } from './NewClientModal';

interface ClientDirectoryProps {
  clients: Client[];
  staffList: StaffMember[];
  isAdmin?: boolean;
  entityTypes?: string[];
  onSelectClient: (clientId: string) => void;
  onOpenWhatsAppForClient: (client: Client) => void;
  onAddClient?: (newClient: Client) => Promise<void>;
}

export const ClientDirectory: React.FC<ClientDirectoryProps> = ({
  clients,
  staffList,
  isAdmin = false,
  entityTypes = ['Private Limited', 'LLP', 'Partnership', 'Proprietorship', 'Individual'],
  onSelectClient,
  onOpenWhatsAppForClient,
  onAddClient,
}) => {
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const itemsPerPage = 12;

  // Auto-generate next sequential code e.g. C-007
  const nextClientCode = `C-00${clients.length + 1}`;

  const filteredClients = clients.filter((c) => {
    if (entityFilter !== 'all' && c.entityType !== entityFilter) return false;
    if (typeFilter === 'recurring' && !c.isRecurringGST) return false;
    if (typeFilter === 'itr-only' && c.isRecurringGST) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.tradeName.toLowerCase().includes(q) ||
        c.gstin.toLowerCase().includes(q) ||
        c.pan.toLowerCase().includes(q) ||
        c.clientCode.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPages = Math.ceil(filteredClients.length / itemsPerPage) || 1;
  const paginatedClients = filteredClients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getStaff = (id: string) => staffList.find((s) => s.id === id);

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E5EA] dark:border-[#2C2C2E] pb-3">
        <div>
          <h1 className="text-[22px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight">
            Client Accounts
          </h1>
          <p className="text-[13px] text-[#6E6E73] dark:text-[#8E8E93] mt-0.5">
            {clients.length} registered companies, firms, and individual accounts
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93] font-tabular hidden sm:block">
            {filteredClients.length} accounts listed
          </div>

          {isAdmin && onAddClient && (
            <button
              onClick={() => setIsNewClientModalOpen(true)}
              className="h-8 px-3 rounded-[6px] bg-[#0071E3] hover:bg-[#0077ED] text-white text-[13px] font-medium flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2]" />
              <span>Add Client</span>
            </button>
          )}
        </div>
      </div>

      {/* Segmented Filter Control */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#F2F2F7] dark:bg-[#1C1C1E] p-1 rounded-[8px]">
        <div className="flex flex-wrap items-center gap-1">
          <button
            onClick={() => { setTypeFilter('all'); setCurrentPage(1); }}
            className={`px-3 py-1 text-[13px] rounded-[6px] transition-all ${
              typeFilter === 'all'
                ? 'bg-[#FFFFFF] dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] font-semibold shadow-sm'
                : 'text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#1D1D1F]'
            }`}
          >
            All Accounts ({clients.length})
          </button>
          <button
            onClick={() => { setTypeFilter('recurring'); setCurrentPage(1); }}
            className={`px-3 py-1 text-[13px] rounded-[6px] transition-all ${
              typeFilter === 'recurring'
                ? 'bg-[#FFFFFF] dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] font-semibold shadow-sm'
                : 'text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#1D1D1F]'
            }`}
          >
            Monthly Recurring ({clients.filter(c => c.isRecurringGST || c.isRecurringStatutory).length})
          </button>
          <button
            onClick={() => { setTypeFilter('itr-only'); setCurrentPage(1); }}
            className={`px-3 py-1 text-[13px] rounded-[6px] transition-all ${
              typeFilter === 'itr-only'
                ? 'bg-[#FFFFFF] dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] font-semibold shadow-sm'
                : 'text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#1D1D1F]'
            }`}
          >
            Annual ITR Only ({clients.filter(c => !c.isRecurringGST && !c.isRecurringStatutory).length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={entityFilter}
            onChange={(e) => {
              setEntityFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-2.5 py-1 bg-[#FFFFFF] dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] text-[#1D1D1F] dark:text-[#F5F5F7] text-[12px] focus:outline-none"
          >
            <option value="all">All Entities</option>
            {entityTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          <div className="flex items-center gap-1.5 bg-[#FFFFFF] dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#3A3A3C] px-2 py-1 rounded-[6px]">
            <Search className="w-3.5 h-3.5 text-[#6E6E73] dark:text-[#8E8E93] stroke-[1.5]" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="text-[12px] bg-transparent focus:outline-none placeholder:text-[#86868B] text-[#1D1D1F] dark:text-[#F5F5F7] w-28 sm:w-36"
            />
          </div>
        </div>
      </div>

      {/* Directory Table */}
      <div className="bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-[8px] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[14px] border-collapse">
            <thead>
              <tr className="bg-[#FBFBFD] dark:bg-[#161618] text-[#6E6E73] dark:text-[#8E8E93] text-[11px] uppercase tracking-[0.04em] border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
                <th className="py-2 px-3.5 font-semibold min-w-[200px]">Client Code &amp; Legal Name</th>
                <th className="py-2 px-3.5 font-semibold">Entity Type</th>
                <th className="py-2 px-3.5 font-semibold">GSTIN / PAN</th>
                <th className="py-2 px-3.5 font-semibold">Staff</th>
                <th className="py-2 px-3.5 font-semibold">Filing Plan</th>
                <th className="py-2 px-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5EA] dark:divide-[#2C2C2E]">
              {paginatedClients.map((client) => {
                const staff = getStaff(client.assignedStaffId);
                return (
                  <tr key={client.id} className="hover:bg-[#F2F2F7] dark:hover:bg-[#242426] transition-colors group">
                    <td className="py-2.5 px-3.5">
                      <button
                        onClick={() => onSelectClient(client.id)}
                        className="font-semibold text-[13.5px] text-[#1D1D1F] dark:text-[#F5F5F7] hover:text-[#0071E3] dark:hover:text-[#2997FF] hover:underline text-left block truncate max-w-xs"
                      >
                        {client.tradeName}
                      </button>
                      <div className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93] flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono tabular-nums font-medium">{client.clientCode}</span>
                        <span>•</span>
                        <span className="truncate">{client.name}</span>
                      </div>
                    </td>

                    <td className="py-2.5 px-3.5">
                      <span className="text-[#1D1D1F] dark:text-[#F5F5F7] font-medium block">{client.entityType}</span>
                      <span className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93]">{client.city}</span>
                    </td>

                    <td className="py-2.5 px-3.5 font-mono tabular-nums text-[12px]">
                      <span className="text-[#1D1D1F] dark:text-[#F5F5F7] block">{client.gstin}</span>
                      <span className="text-[#6E6E73] dark:text-[#8E8E93] block">{client.pan}</span>
                    </td>

                    <td className="py-2.5 px-3.5 text-[12.5px] text-[#1D1D1F] dark:text-[#F5F5F7]">
                      {staff?.name || 'Unassigned'}
                    </td>

                    <td className="py-2.5 px-3.5">
                      <span className={`inline-block px-1.5 py-0.2 rounded-[4px] text-[11px] font-medium ${
                        client.isRecurringGST 
                          ? 'bg-[#0071E3]/10 text-[#0071E3] dark:text-[#2997FF]' 
                          : 'bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#6E6E73] dark:text-[#8E8E93]'
                      }`}>
                        {client.isRecurringGST ? 'Monthly GST' : 'Annual ITR'}
                      </span>
                      <div className="font-mono tabular-nums text-[11px] text-[#6E6E73] dark:text-[#8E8E93] mt-0.5">
                        ₹{client.monthlyAuditFee.toLocaleString('en-IN')}/mo
                      </div>
                    </td>

                    <td className="py-2.5 px-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onOpenWhatsAppForClient(client)}
                          title="Message on WhatsApp"
                          className="h-7 px-2 border border-[#E5E5EA] dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] hover:bg-[#F2F2F7] dark:hover:bg-[#242426] text-[#1D1D1F] dark:text-[#F5F5F7] rounded-[5px] flex items-center gap-1 transition-colors text-[11px] font-medium"
                        >
                          <MessageSquare className="w-3 h-3 text-[#16A34A] dark:text-[#34C759]" strokeWidth={1.5} />
                          <span className="hidden sm:inline">Notice</span>
                        </button>
                        <button
                          onClick={() => onSelectClient(client.id)}
                          className="h-7 px-2 text-[11px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7] bg-[#F2F2F7] dark:bg-[#2C2C2E] hover:bg-[#E5E5EA] dark:hover:bg-[#3A3A3C] rounded-[5px] transition-colors"
                        >
                          View Account
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-3 py-2 border-t border-[#E5E5EA] dark:border-[#2C2C2E] bg-[#FBFBFD] dark:bg-[#161618] flex items-center justify-between text-[12px] text-[#6E6E73] dark:text-[#8E8E93]">
          <span className="font-tabular">
            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredClients.length)} of {filteredClients.length}
          </span>

          <div className="flex items-center gap-1 font-tabular">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="p-1 border border-[#E5E5EA] dark:border-[#2C2C2E] rounded hover:bg-white dark:hover:bg-[#2C2C2E] disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-3.5 h-3.5 stroke-[1.5]" />
            </button>
            <span className="px-2">
              {currentPage} / {totalPages}
            </span>
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

      {/* Admin New Client Registration Modal */}
      {isAdmin && onAddClient && (
        <NewClientModal
          isOpen={isNewClientModalOpen}
          onClose={() => setIsNewClientModalOpen(false)}
          staffList={staffList}
          entityTypes={entityTypes}
          nextClientCode={nextClientCode}
          onAddClient={onAddClient}
        />
      )}
    </div>
  );
};
