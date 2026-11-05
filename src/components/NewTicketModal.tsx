import React, { useState } from 'react';
import { PhoneCall } from 'lucide-react';
import { Button, Field, Input, Modal, Select, Textarea } from './ui';
import { StaffTicket, Client, StaffMember, TicketCategory, TicketPriority } from '../types/crm';

interface NewTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  staffList: StaffMember[];
  onAddTicket: (ticket: StaffTicket) => void;
  currentStaffId?: string | null;
}

const NewTicketModalForm: React.FC<NewTicketModalProps> = ({
  isOpen,
  onClose,
  clients,
  staffList,
  onAddTicket,
  currentStaffId,
}) => {
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
    <Modal
      isOpen
      onClose={onClose}
      size="md"
      icon={PhoneCall}
      title="Log client call"
      description="Record the request and route it to an owner."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="new-ticket-form">
            Log Call
          </Button>
        </>
      }
    >
      <form id="new-ticket-form" onSubmit={handleSubmit} className="space-y-4">
        <Field label="Client">
          <Select value={selectedClientId} onChange={(e) => handleClientChange(e.target.value)}>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.tradeName} · {c.clientCode}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Caller">
            <Input placeholder="Director, accountant…" value={callerName} onChange={(e) => setCallerName(e.target.value)} />
          </Field>
          <Field label="Phone">
            <Input value={callerPhone} onChange={(e) => setCallerPhone(e.target.value)} className="font-mono" />
          </Field>
          <Field label="Channel">
            <Select value={callType} onChange={(e) => setCallType(e.target.value as any)}>
              <option value="Inbound Phone Call">Phone</option>
              <option value="WhatsApp Query">WhatsApp</option>
              <option value="Office Visit">Office visit</option>
              <option value="Email Inquiry">Email</option>
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Subject" required className="sm:col-span-2">
            <Input required placeholder="Provisional balance sheet for bank sanction" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </Field>
          <Field label="Category">
            <Select value={category} onChange={(e) => setCategory(e.target.value as TicketCategory)}>
              <option value="GST & Return Query">GST query</option>
              <option value="Income Tax Notice">Tax notice</option>
              <option value="Bank Loan / Computation">Bank loan</option>
              <option value="Accounting & Books">Accounting</option>
              <option value="DSC & Portal Access">DSC &amp; portal</option>
              <option value="General Inquiry">General</option>
            </Select>
          </Field>
        </div>

        <Field label="Notes">
          <Textarea rows={3} placeholder="What was requested, and by when?" value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-line">
          <Field label="Priority">
            <Select value={priority} onChange={(e) => setPriority(e.target.value as TicketPriority)}>
              <option value="Urgent">Urgent</option>
              <option value="High">High</option>
              <option value="Normal">Normal</option>
              <option value="Low">Low</option>
            </Select>
          </Field>
          <Field label="Assign to">
            <Select value={assignedStaffId} onChange={(e) => setAssignedStaffId(e.target.value)}>
              <option value="unassigned">Unassigned</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Logged by">
            <Select value={loggedByStaffId} onChange={(e) => setLoggedByStaffId(e.target.value)}>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </form>
    </Modal>
  );
};

/** Mounts the form only while open, so its state resets on every open. */
export const NewTicketModal: React.FC<NewTicketModalProps> = (props) => (props.isOpen ? <NewTicketModalForm {...props} /> : null);
