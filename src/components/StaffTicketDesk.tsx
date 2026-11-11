import React, { useState } from 'react';
import { Plus, MessageSquare, Check, PhoneCall, Trash2 } from 'lucide-react';
import { StaffTicket, StaffMember, TicketStatus, TicketPriority } from '../types/crm';
import { Avatar, Badge, Button, Card, ConfirmDialog, EmptyState, IconButton, Metric, MetricGrid, PageHeader, SearchInput, Segmented, Select, Textarea, Toolbar, Tone } from './ui';

interface StaffTicketDeskProps {
  tickets: StaffTicket[];
  staffList: StaffMember[];
  selectedStaffId: string | null;
  onAssignToStaff: (ticketId: string, staffId: string) => void;
  onUpdateStatus: (ticketId: string, newStatus: TicketStatus, notes?: string) => void;
  /** Administrators only. */
  onDelete?: (ticketId: string) => void;
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
  onDelete,
  onOpenNewTicketModal,
  onOpenWhatsAppForTicket,
  onSelectClient,
}) => {
  const [filterTab, setFilterTab] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [resolvingTicketId, setResolvingTicketId] = useState<string | null>(null);
  const [resolutionInput, setResolutionInput] = useState<string>('');
  const [confirmDelete, setConfirmDelete] = useState<StaffTicket | null>(null);

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

  const ticketTone: Record<TicketStatus, Tone> = {
    Unassigned: 'warning',
    'In Progress': 'info',
    'Waiting on Client': 'neutral',
    Resolved: 'success',
  };

  const handleResolveSubmit = (ticketId: string) => {
    if (!resolutionInput.trim()) return;
    onUpdateStatus(ticketId, 'Resolved', resolutionInput);
    setResolvingTicketId(null);
    setResolutionInput('');
  };

  const unassignedCount = tickets.filter((t) => t.status === 'Unassigned').length;
  const inProgressCount = tickets.filter((t) => t.status === 'In Progress').length;
  const waitingCount = tickets.filter((t) => t.status === 'Waiting on Client').length;
  const resolvedCount = tickets.filter((t) => t.status === 'Resolved').length;

  return (
    <div className="space-y-4">
      <PageHeader
        section="staff" title="Calls & Tickets"
        description="Log inbound client calls, assign an owner and record the resolution"
        actions={
          <Button variant="primary" icon={Plus} onClick={onOpenNewTicketModal}>
            Log Call
          </Button>
        }
      />

      <MetricGrid className="grid-cols-2 lg:grid-cols-4">
        <Metric label="Total calls" value={tickets.length} onClick={() => setFilterTab('all')} />
        <Metric label="Unassigned" value={unassignedCount} tone={unassignedCount ? 'warning' : undefined} hint="Needs an owner" onClick={() => setFilterTab('unassigned')} />
        <Metric label="In progress" value={inProgressCount} tone="info" onClick={() => setFilterTab('in-progress')} />
        <Metric label="Resolved" value={resolvedCount} tone="success" onClick={() => setFilterTab('resolved')} />
      </MetricGrid>

      <Card className="overflow-hidden">
        <Toolbar className="justify-between">
          <Segmented
            size="sm"
            value={filterTab}
            onChange={setFilterTab}
            options={[
              { value: 'all', label: 'All', count: tickets.length },
              { value: 'unassigned', label: 'Unassigned', count: unassignedCount },
              { value: 'in-progress', label: 'In progress', count: inProgressCount },
              { value: 'waiting', label: 'Waiting', count: waitingCount },
              { value: 'resolved', label: 'Resolved', count: resolvedCount },
            ]}
          />
          <div className="flex items-center gap-2">
            <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="h-7 text-xs w-auto">
              <option value="all">All categories</option>
              <option value="GST & Return Query">GST &amp; return query</option>
              <option value="Income Tax Notice">Income tax notice</option>
              <option value="Bank Loan / Computation">Bank loan / computation</option>
              <option value="Accounting & Books">Accounting &amp; books</option>
              <option value="DSC & Portal Access">DSC &amp; portal access</option>
              <option value="General Inquiry">General inquiry</option>
            </Select>
            <SearchInput
              placeholder="Ticket, client or caller"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              wrapperClassName="w-40 sm:w-52"
              className="h-7 text-xs"
            />
          </div>
        </Toolbar>

        {filteredTickets.length === 0 ? (
          <EmptyState icon={PhoneCall} title="No calls match these filters" description="Logged calls will appear here with their owner and status." />
        ) : (
          <ul className="divide-y divide-line">
            {filteredTickets.map((ticket) => {
              const loggedBy = getStaff(ticket.loggedByStaffId);
              const assignedTo = getStaff(ticket.assignedStaffId);
              const isResolved = ticket.status === 'Resolved';
              const isUnassigned = ticket.status === 'Unassigned' || !ticket.assignedStaffId;

              return (
                <li key={ticket.id} className="px-4 py-3.5 hover:bg-subtle/60 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="ident text-fg-subtle">{ticket.ticketNo}</span>
                        <span className="text-sm font-medium text-fg">{ticket.subject}</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap mt-1 text-xs text-fg-subtle">
                        <button onClick={() => onSelectClient(ticket.clientId)} className="text-fg-muted hover:text-fg hover:underline underline-offset-2">
                          {ticket.tradeName}
                        </button>
                        <span className="text-fg-faint">·</span>
                        <span>{ticket.category}</span>
                        <span className="text-fg-faint">·</span>
                        <span className="num">{ticket.loggedAt}</span>
                      </div>
                    </div>
                    <Badge tone={ticketTone[ticket.status]} dot className="self-start">
                      {ticket.status}
                    </Badge>
                  </div>

                  <p className="text-sm text-fg-muted mt-2 max-w-3xl">{ticket.description}</p>

                  {ticket.resolutionNotes && (
                    <div className="mt-2.5 flex gap-2 pl-3 border-l-2 border-success/40 text-sm text-fg-muted max-w-3xl">
                      <span>
                        <span className="font-medium text-fg">Resolution</span> — {ticket.resolutionNotes}
                      </span>
                    </div>
                  )}

                  {resolvingTicketId === ticket.id && (
                    <div className="mt-3 max-w-3xl space-y-2 animate-fade-in">
                      <Textarea
                        rows={2}
                        autoFocus
                        placeholder="Verified the mismatch on the GST portal and informed the client."
                        value={resolutionInput}
                        onChange={(e) => setResolutionInput(e.target.value)}
                        className="min-h-[64px]"
                      />
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" variant="ghost" onClick={() => setResolvingTicketId(null)}>
                          Cancel
                        </Button>
                        <Button size="sm" variant="primary" onClick={() => handleResolveSubmit(ticket.id)} disabled={!resolutionInput.trim()}>
                          Save Resolution
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="mt-3 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
                    <div className="text-fg-subtle">
                      <span className="text-fg-muted">{ticket.callerName}</span>
                      <span className="ident text-2xs ml-1.5">{ticket.callerPhone}</span>
                      <span className="mx-2 text-fg-faint">·</span>
                      Logged by {loggedBy?.name || 'reception'}
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {isUnassigned ? (
                        <Button size="sm" onClick={() => onAssignToStaff(ticket.id, selectedStaffId || staffList[0].id)}>
                          Assign to {activeStaff ? activeStaff.name.split(' ')[0] : 'Me'}
                        </Button>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          {assignedTo && <Avatar initials={assignedTo.initials} seed={assignedTo.name} size="xs" />}
                          <Select
                            value={ticket.assignedStaffId || ''}
                            onChange={(e) => onAssignToStaff(ticket.id, e.target.value)}
                            className="h-7 text-xs w-auto"
                            aria-label="Owner"
                          >
                            {staffList.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </Select>
                        </div>
                      )}
                      {!isResolved && (
                        <Button
                          size="sm"
                          icon={Check}
                          onClick={() => {
                            setResolvingTicketId(ticket.id);
                            setResolutionInput('');
                          }}
                        >
                          Resolve
                        </Button>
                      )}
                      <IconButton icon={MessageSquare} label="Send WhatsApp update" size="sm" onClick={() => onOpenWhatsAppForTicket(ticket)} />
                      {onDelete && <IconButton icon={Trash2} label="Delete call" size="sm" className="hover:text-danger" onClick={() => setConfirmDelete(ticket)} />}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <ConfirmDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete this call?"
        description="This permanently removes the call and its notes."
        confirmLabel="Delete Call"
        danger
        onConfirm={() => confirmDelete && onDelete?.(confirmDelete.id)}
      />
    </div>
  );
};
