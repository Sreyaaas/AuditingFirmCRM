import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  MessageSquare, 
  Check, 
  X
} from 'lucide-react';
import { StaffTicket, StaffMember, TicketStatus, TicketPriority } from '../types/crm';

interface StaffTicketDeskProps {
  tickets: StaffTicket[];
  staffList: StaffMember[];
  selectedStaffId: string | null;
  onAssignToStaff: (ticketId: string, staffId: string) => void;
  onUpdateStatus: (ticketId: string, newStatus: TicketStatus, notes?: string) => void;
  onOpenNewTicketModal: () => void;
  onOpenWhatsAppForTicket: (ticket: StaffTicket) => void;
  onSelectClient: (clientId: string) => void;
}

export const StaffTicketDesk: React.FC<StaffTicketDeskProps> = ({
  tickets,
  staffList,
  selectedStaffId,
  onAssignToStaff,
  onUpdateStatus,
  onOpenNewTicketModal,
  onOpenWhatsAppForTicket,
  onSelectClient,
}) => {
  const [filterTab, setFilterTab] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [resolvingTicketId, setResolvingTicketId] = useState<string | null>(null);
  const [resolutionInput, setResolutionInput] = useState<string>('');

  const activeStaff = selectedStaffId ? staffList.find((s) => s.id === selectedStaffId) : null;

  const filteredTickets = tickets.filter((ticket) => {
    if (selectedStaffId && filterTab === 'my-tickets' && ticket.assignedStaffId !== selectedStaffId) {
      return false;
    }
    if (filterTab === 'unassigned' && ticket.status !== 'Unassigned') return false;
    if (filterTab === 'in-progress' && ticket.status !== 'In Progress') return false;
    if (filterTab === 'waiting' && ticket.status !== 'Waiting on Client') return false;
    if (filterTab === 'resolved' && ticket.status !== 'Resolved') return false;

    if (categoryFilter !== 'all' && ticket.category !== categoryFilter) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        ticket.ticketNo.toLowerCase().includes(q) ||
        ticket.clientName.toLowerCase().includes(q) ||
        ticket.tradeName.toLowerCase().includes(q) ||
        ticket.subject.toLowerCase().includes(q) ||
        ticket.callerName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getStaff = (id: string | null) => {
    if (!id) return null;
    return staffList.find((s) => s.id === id);
  };

  const getStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case 'Unassigned':
        return (
          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-[#FF9500]/10 text-[#FF9500]">
            Unassigned
          </span>
        );
      case 'In Progress':
        return (
          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-[#0071E3]/10 text-[#0071E3] dark:text-[#2997FF]">
            In Progress
          </span>
        );
      case 'Waiting on Client':
        return (
          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#6E6E73] dark:text-[#8E8E93]">
            Waiting on Client
          </span>
        );
      case 'Resolved':
        return (
          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-[#34C759]/10 text-[#34C759]">
            Resolved
          </span>
        );
    }
  };

  const handleResolveSubmit = (ticketId: string) => {
    if (!resolutionInput.trim()) return;
    onUpdateStatus(ticketId, 'Resolved', resolutionInput);
    setResolvingTicketId(null);
    setResolutionInput('');
  };

  const unassignedCount = tickets.filter((t) => t.status === 'Unassigned').length;
  const inProgressCount = tickets.filter((t) => t.status === 'In Progress').length;
  const resolvedCount = tickets.filter((t) => t.status === 'Resolved').length;

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E5EA] dark:border-[#2C2C2E] pb-3">
        <div>
          <h1 className="text-[22px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight">
            Client Calls &amp; Follow-ups
          </h1>
          <p className="text-[13px] text-[#6E6E73] dark:text-[#8E8E93] mt-0.5">
            Log incoming inquiries, assign ownership, and resolve client calls
          </p>
        </div>

        <button
          onClick={onOpenNewTicketModal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-white bg-[#0071E3] hover:bg-[#0077ED] rounded-[6px] transition-colors self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5 stroke-[1.5]" />
          <span>Log Inbound Call</span>
        </button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-[8px]">
        <div>
          <div className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93]">Total Inquiries</div>
          <div className="font-tabular text-[22px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] mt-0.5">
            {tickets.length}
          </div>
          <div className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93] mt-0.5">Calls logged</div>
        </div>

        <div className="border-l border-[#E5E5EA] dark:border-[#2C2C2E] pl-4">
          <div className="text-[12px] text-[#FF9500]">Unassigned Pool</div>
          <div className="font-tabular text-[22px] font-semibold text-[#FF9500] mt-0.5">
            {unassignedCount}
          </div>
          <div className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93] mt-0.5">Needs owner</div>
        </div>

        <div className="border-l border-[#E5E5EA] dark:border-[#2C2C2E] pl-4">
          <div className="text-[12px] text-[#0071E3] dark:text-[#2997FF]">In Progress</div>
          <div className="font-tabular text-[22px] font-semibold text-[#0071E3] dark:text-[#2997FF] mt-0.5">
            {inProgressCount}
          </div>
          <div className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93] mt-0.5">Active handling</div>
        </div>

        <div className="border-l border-[#E5E5EA] dark:border-[#2C2C2E] pl-4">
          <div className="text-[12px] text-[#34C759]">Resolved</div>
          <div className="font-tabular text-[22px] font-semibold text-[#34C759] mt-0.5">
            {resolvedCount}
          </div>
          <div className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93] mt-0.5">Recorded</div>
        </div>
      </div>

      {/* Segmented Filter Control */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#F2F2F7] dark:bg-[#1C1C1E] p-1 rounded-[8px]">
        <div className="flex flex-wrap items-center gap-1">
          {[
            { id: 'all', label: `All (${tickets.length})` },
            { id: 'unassigned', label: `Unassigned (${unassignedCount})` },
            { id: 'in-progress', label: `In Progress (${inProgressCount})` },
            { id: 'waiting', label: 'Waiting on Client' },
            { id: 'resolved', label: `Resolved (${resolvedCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id)}
              className={`px-3 py-1 text-[13px] rounded-[6px] transition-all ${
                filterTab === tab.id
                  ? 'bg-[#FFFFFF] dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] font-semibold shadow-sm'
                  : 'text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#1D1D1F]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1 bg-[#FFFFFF] dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] text-[#1D1D1F] dark:text-[#F5F5F7] text-[12px] focus:outline-none"
          >
            <option value="all">All Categories</option>
            <option value="GST & Return Query">GST &amp; Return Query</option>
            <option value="Income Tax Notice">Income Tax Notice</option>
            <option value="Bank Loan / Computation">Bank Loan / Computation</option>
            <option value="Accounting & Books">Accounting &amp; Books</option>
            <option value="DSC & Portal Access">DSC &amp; Portal Access</option>
            <option value="General Inquiry">General Inquiry</option>
          </select>

          <div className="flex items-center gap-1.5 bg-[#FFFFFF] dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#3A3A3C] px-2 py-1 rounded-[6px]">
            <Search className="w-3.5 h-3.5 text-[#6E6E73] dark:text-[#8E8E93] stroke-[1.5]" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-[12px] bg-transparent focus:outline-none placeholder:text-[#86868B] text-[#1D1D1F] dark:text-[#F5F5F7] w-28 sm:w-36"
            />
          </div>
        </div>
      </div>

      {/* Main Ticket List */}
      <div className="space-y-3">
        {filteredTickets.length === 0 ? (
          <div className="bg-[#FFFFFF] dark:bg-[#1C1C1E] rounded-[8px] border border-[#E5E5EA] dark:border-[#2C2C2E] p-8 text-center text-[13px] text-[#6E6E73] dark:text-[#8E8E93]">
            No client call tickets found matching current filters.
          </div>
        ) : (
          filteredTickets.map((ticket) => {
            const loggedBy = getStaff(ticket.loggedByStaffId);
            const assignedTo = getStaff(ticket.assignedStaffId);
            const isResolved = ticket.status === 'Resolved';
            const isUnassigned = ticket.status === 'Unassigned' || !ticket.assignedStaffId;

            return (
              <div
                key={ticket.id}
                className="bg-[#FFFFFF] dark:bg-[#1C1C1E] rounded-[8px] border border-[#E5E5EA] dark:border-[#2C2C2E] p-4 text-[13px] space-y-2.5 transition-colors"
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-tabular font-medium text-[12px] text-[#0071E3] dark:text-[#2997FF]">
                      {ticket.ticketNo}
                    </span>
                    <button 
                      onClick={() => onSelectClient(ticket.clientId)}
                      className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7] hover:underline"
                    >
                      {ticket.tradeName}
                    </button>
                    <span className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93]">
                      ({ticket.clientName})
                    </span>
                    <span className="text-[11px] px-1.5 py-0.2 rounded bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#6E6E73] dark:text-[#8E8E93]">
                      {ticket.category}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {getStatusBadge(ticket.status)}
                    <span className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93] font-tabular">
                      {ticket.loggedAt}
                    </span>
                  </div>
                </div>

                {/* Subject & Description */}
                <div>
                  <div className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
                    {ticket.subject}
                  </div>
                  <p className="text-[#6E6E73] dark:text-[#8E8E93] mt-0.5 leading-relaxed text-[13px]">
                    {ticket.description}
                  </p>
                </div>

                {/* Resolution Notes If Any */}
                {ticket.resolutionNotes && (
                  <div className="p-2.5 bg-[#34C759]/10 rounded-[6px] text-[12px] text-[#34C759]">
                    <span className="font-medium">Resolution Note:</span> {ticket.resolutionNotes}
                  </div>
                )}

                {/* Inline Resolver Input */}
                {resolvingTicketId === ticket.id && (
                  <div className="p-3 bg-[#F2F2F7] dark:bg-[#242426] rounded-[6px] space-y-2">
                    <label className="font-medium text-[12px] text-[#1D1D1F] dark:text-[#F5F5F7] block">
                      Resolution Summary
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Verified mismatch on GST portal and notified client."
                      value={resolutionInput}
                      onChange={(e) => setResolutionInput(e.target.value)}
                      className="w-full p-2 text-[13px] bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] focus:outline-none focus:border-[#0071E3] text-[#1D1D1F] dark:text-[#F5F5F7]"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setResolvingTicketId(null)}
                        className="px-3 py-1 text-[12px] text-[#6E6E73] hover:text-[#1D1D1F]"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleResolveSubmit(ticket.id)}
                        className="px-3 py-1 text-[12px] font-medium text-white bg-[#0071E3] hover:bg-[#0077ED] rounded-[6px]"
                      >
                        Save Resolution
                      </button>
                    </div>
                  </div>
                )}

                {/* Footer Line */}
                <div className="pt-2 border-t border-[#E5E5EA] dark:border-[#2C2C2E] flex flex-col md:flex-row md:items-center justify-between gap-2 text-[12px]">
                  <div className="text-[#6E6E73] dark:text-[#8E8E93]">
                    <span>Caller: <strong className="text-[#1D1D1F] dark:text-[#F5F5F7]">{ticket.callerName}</strong> ({ticket.callerPhone})</span>
                    <span className="mx-2">•</span>
                    <span>Logged by: {loggedBy?.name || 'Reception Staff'}</span>
                  </div>

                  <div className="flex items-center gap-2 justify-end flex-wrap">
                    {isUnassigned ? (
                      <button
                        type="button"
                        onClick={() => onAssignToStaff(ticket.id, selectedStaffId || staffList[0].id)}
                        className="px-2.5 py-1 bg-[#0071E3] hover:bg-[#0077ED] text-white text-[12px] font-medium rounded-[5px] transition-colors"
                      >
                        Assign to {activeStaff ? activeStaff.name.split(' ')[0] : 'Me'}
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#6E6E73] dark:text-[#8E8E93]">Assigned:</span>
                        <span className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">{assignedTo?.name || 'Staff'}</span>
                        <select
                          value={ticket.assignedStaffId || ''}
                          onChange={(e) => onAssignToStaff(ticket.id, e.target.value)}
                          className="text-[11px] bg-[#F2F2F7] dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded px-1.5 py-0.5 text-[#1D1D1F] dark:text-[#F5F5F7] focus:outline-none"
                        >
                          {staffList.map((s) => (
                            <option key={s.id} value={s.id}>
                              Reassign to {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {!isResolved && (
                      <button
                        type="button"
                        onClick={() => {
                          setResolvingTicketId(ticket.id);
                          setResolutionInput('');
                        }}
                        className="px-2.5 py-1 text-[12px] font-medium text-[#34C759] hover:bg-[#34C759]/10 rounded-[5px] transition-colors"
                      >
                        Resolve
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onOpenWhatsAppForTicket(ticket)}
                      className="p-1 text-[#34C759] hover:bg-[#34C759]/10 rounded transition-colors"
                      title="Send WhatsApp update"
                    >
                      <MessageSquare className="w-3.5 h-3.5 stroke-[1.5]" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
