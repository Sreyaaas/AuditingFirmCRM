import React, { useState } from 'react';
import { X, PhoneCall } from 'lucide-react';
import { StaffTicket, Client, StaffMember, TicketCategory, TicketPriority } from '../types/crm';

interface NewTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  staffList: StaffMember[];
  onAddTicket: (ticket: StaffTicket) => void;
  currentStaffId?: string | null;
}

export const NewTicketModal: React.FC<NewTicketModalProps> = ({
  isOpen,
  onClose,
  clients,
  staffList,
  onAddTicket,
  currentStaffId,
}) => {
  if (!isOpen) return null;

  const [selectedClientId, setSelectedClientId] = useState<string>(clients[0]?.id || '');
  const [callerName, setCallerName] = useState('');
  const [callerPhone, setCallerPhone] = useState(clients[0]?.phone || '');
  const [callType, setCallType] = useState<StaffTicket['callType']>('Inbound Phone Call');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TicketCategory>('GST & Return Query');
  const [priority, setPriority] = useState<TicketPriority>('Normal');
  const [assignedStaffId, setAssignedStaffId] = useState<string>('unassigned');
  const [loggedByStaffId, setLoggedByStaffId] = useState<string>(currentStaffId || staffList[0]?.id || '');

  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    const found = clients.find((c) => c.id === clientId);
    if (found) {
      setCallerPhone(found.phone);
      setCallerName(found.contactPerson);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const client = clients.find((c) => c.id === selectedClientId);
    if (!client || !subject.trim()) return;

    const newTicket: StaffTicket = {
      id: `ticket-${Date.now()}`,
      ticketNo: `TK-${Math.floor(1089 + Math.random() * 900)}`,
      clientId: client.id,
      clientName: client.name,
      tradeName: client.tradeName,
      callerName: callerName || client.contactPerson,
      callerPhone: callerPhone || client.phone,
      callType,
      subject,
      description,
      category,
      priority,
      status: assignedStaffId === 'unassigned' ? 'Unassigned' : 'In Progress',
      loggedByStaffId,
      loggedAt: 'Just now',
      assignedStaffId: assignedStaffId === 'unassigned' ? null : assignedStaffId,
      assignedAt: assignedStaffId !== 'unassigned' ? 'Just now' : undefined,
    };

    onAddTicket(newTicket);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="w-full max-w-xl bg-[#FFFFFF] dark:bg-[#1C1C1E] rounded-[8px] border border-[#E5E5EA] dark:border-[#2C2C2E] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
          <div>
            <h3 className="text-[15px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">Log Client Call / Ticket</h3>
            <p className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93]">Record client inquiry and assign executive</p>
          </div>
          <button onClick={onClose} className="p-1 text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]">
            <X className="w-4 h-4 stroke-[1.5]" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-[13px]">
          <div>
            <label className="text-[12px] font-medium text-[#6E6E73] dark:text-[#8E8E93] block mb-1">
              Client Account
            </label>
            <select
              value={selectedClientId}
              onChange={(e) => handleClientChange(e.target.value)}
              className="w-full px-3 py-1.5 bg-[#F2F2F7] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] text-[#1D1D1F] dark:text-[#F5F5F7] focus:outline-none"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.tradeName} ({c.name} • {c.clientCode})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[12px] font-medium text-[#6E6E73] dark:text-[#8E8E93] block mb-1">Caller Name</label>
              <input
                type="text"
                placeholder="e.g. Director / Accountant"
                value={callerName}
                onChange={(e) => setCallerName(e.target.value)}
                className="w-full px-3 py-1.5 bg-[#F2F2F7] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] focus:outline-none focus:border-[#0071E3] text-[#1D1D1F] dark:text-[#F5F5F7]"
              />
            </div>
            <div>
              <label className="text-[12px] font-medium text-[#6E6E73] dark:text-[#8E8E93] block mb-1">Phone Number</label>
              <input
                type="text"
                value={callerPhone}
                onChange={(e) => setCallerPhone(e.target.value)}
                className="w-full px-3 py-1.5 font-tabular bg-[#F2F2F7] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] focus:outline-none focus:border-[#0071E3] text-[#1D1D1F] dark:text-[#F5F5F7]"
              />
            </div>
            <div>
              <label className="text-[12px] font-medium text-[#6E6E73] dark:text-[#8E8E93] block mb-1">Channel</label>
              <select
                value={callType}
                onChange={(e) => setCallType(e.target.value as any)}
                className="w-full px-3 py-1.5 bg-[#F2F2F7] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] focus:outline-none text-[#1D1D1F] dark:text-[#F5F5F7]"
              >
                <option value="Inbound Phone Call">Inbound Call</option>
                <option value="WhatsApp Query">WhatsApp</option>
                <option value="Office Visit">Office Visit</option>
                <option value="Email Inquiry">Email</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-[12px] font-medium text-[#6E6E73] dark:text-[#8E8E93] block mb-1">
                Subject / Request Topic
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Bank Sanction: Provisional Balance Sheet"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-1.5 bg-[#F2F2F7] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] focus:outline-none focus:border-[#0071E3] text-[#1D1D1F] dark:text-[#F5F5F7]"
              />
            </div>
            <div>
              <label className="text-[12px] font-medium text-[#6E6E73] dark:text-[#8E8E93] block mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TicketCategory)}
                className="w-full px-3 py-1.5 bg-[#F2F2F7] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] focus:outline-none text-[#1D1D1F] dark:text-[#F5F5F7]"
              >
                <option value="GST & Return Query">GST Query</option>
                <option value="Income Tax Notice">Tax Notice</option>
                <option value="Bank Loan / Computation">Bank Loan</option>
                <option value="Accounting & Books">Accounting</option>
                <option value="DSC & Portal Access">DSC &amp; Portal</option>
                <option value="General Inquiry">General</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[12px] font-medium text-[#6E6E73] dark:text-[#8E8E93] block mb-1">
              Call Notes / Details
            </label>
            <textarea
              rows={3}
              placeholder="What did the client request? Deadlines mentioned?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2.5 bg-[#F2F2F7] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] leading-relaxed focus:outline-none focus:border-[#0071E3] text-[#1D1D1F] dark:text-[#F5F5F7]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-[#F2F2F7] dark:bg-[#242426] rounded-[6px]">
            <div>
              <label className="text-[11px] font-medium text-[#6E6E73] dark:text-[#8E8E93] block mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TicketPriority)}
                className="w-full px-2 py-1 bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[4px] focus:outline-none text-[#1D1D1F] dark:text-[#F5F5F7]"
              >
                <option value="Urgent">Urgent</option>
                <option value="High">High</option>
                <option value="Normal">Normal</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-medium text-[#6E6E73] dark:text-[#8E8E93] block mb-1">Assign To</label>
              <select
                value={assignedStaffId}
                onChange={(e) => setAssignedStaffId(e.target.value)}
                className="w-full px-2 py-1 bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[4px] focus:outline-none text-[#1D1D1F] dark:text-[#F5F5F7]"
              >
                <option value="unassigned">Unassigned (Pool)</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-medium text-[#6E6E73] dark:text-[#8E8E93] block mb-1">Logged By</label>
              <select
                value={loggedByStaffId}
                onChange={(e) => setLoggedByStaffId(e.target.value)}
                className="w-full px-2 py-1 bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[4px] focus:outline-none text-[#1D1D1F] dark:text-[#F5F5F7]"
              >
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-[#E5E5EA] dark:border-[#2C2C2E] flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-[13px] text-[#6E6E73] hover:text-[#1D1D1F]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-[13px] font-medium text-white bg-[#0071E3] hover:bg-[#0077ED] rounded-[6px]"
            >
              Log Ticket
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
